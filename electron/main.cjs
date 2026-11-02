const { app, BrowserWindow, ipcMain, dialog, protocol, shell, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');
const { spawn, execFile } = require('child_process');
const { pathToFileURL } = require('url');
const { exportProjectNatively, detectGpuEncoder } = require('./ffmpeg_export.cjs');

// Migrar datos (proyectos guardados en localStorage) de la carpeta del nombre anterior
(function migrateLegacyUserData() {
  try {
    const newDir = app.getPath('userData');
    const legacyDir = path.join(app.getPath('appData'), 'capcut-desktop');
    if (!fs.existsSync(newDir) && fs.existsSync(legacyDir)) {
      fs.cpSync(legacyDir, newDir, { recursive: true });
    }
  } catch (e) {
    console.error('No se pudieron migrar los datos anteriores:', e);
  }
})();

// Permitir reproducción inmediata de audio sin bloqueo por falta de interacción inicial
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow = null;
let currentExportSession = null;

// Convierte "30000/1001" en 29.97 sin usar eval()
function parseFrameRate(rate) {
  if (!rate || typeof rate !== 'string') return 30;
  const [num, den] = rate.split('/').map(Number);
  const fps = den ? num / den : num;
  return isFinite(fps) && fps > 0 ? Math.round(fps * 100) / 100 : 30;
}

// Cache de metadatos por ruta para no relanzar ffprobe en cada importación
const probeCache = new Map();

function getProbeMetadata(filePath) {
  if (probeCache.has(filePath)) return probeCache.get(filePath);
  const promise = probeMetadataUncached(filePath);
  probeCache.set(filePath, promise);
  return promise;
}

function probeMetadataUncached(filePath) {
  return new Promise((resolve) => {
    execFile('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath], (err, stdout) => {
      if (err || !stdout) return resolve({ duration: 30, width: 1920, height: 1080, fps: 30 });
      try {
        const data = JSON.parse(stdout);
        const formatDur = parseFloat(data.format?.duration);
        const streamDur = parseFloat(data.streams?.find((s) => s.duration && parseFloat(s.duration) > 0)?.duration);
        const duration = (!isNaN(formatDur) && formatDur > 0) ? formatDur : ((!isNaN(streamDur) && streamDur > 0) ? streamDur : 30);
        const videoStream = data.streams?.find((s) => s.codec_type === 'video');
        resolve({
          duration: Math.round(duration * 100) / 100,
          width: videoStream?.width || 1920,
          height: videoStream?.height || 1080,
          fps: parseFrameRate(videoStream?.r_frame_rate)
        });
      } catch (e) {
        resolve({ duration: 30, width: 1920, height: 1080, fps: 30 });
      }
    });
  });
}

// Registrar esquema privilegiado para streaming de video/audio local
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true
    }
  }
]);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0f0f12',
    title: 'Cortex',
    icon: path.join(__dirname, '../assets/cortex-cyan.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: false // Permite previsualización nativa de archivos locales
    }
  });

  mainWindow.setMenuBarVisibility(false);

  // La app nunca abre ventanas ni navega fuera de sí misma; los enlaces web van al navegador
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    const isOwnPage = url.startsWith('file://') || (devServerUrl && url.startsWith(devServerUrl)) || url.startsWith('http://localhost:5173/');
    if (!isOwnPage) event.preventDefault();
  });

  mainWindow.webContents.on('console-message', (event, ...args) => {
    if (event && typeof event === 'object' && event.message !== undefined) {
      console.log(`[RENDERER ${event.level}]:`, event.message, event.sourceId ? `(${event.sourceId}:${event.lineNumber})` : '');
    } else {
      console.log('[RENDERER]:', event, ...args);
    }
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[RENDERER PROCESS GONE]:', details);
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  const distPath = path.join(__dirname, '../dist/index.html');

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }
}

app.whenReady().then(() => {
  // Protocolo personalizado para reproducir archivos locales si alguna ruta aún usa media://
  protocol.handle('media', (request) => {
    try {
      const rawPath = request.url.replace(/^media:\/\//, '');
      const filePath = decodeURIComponent(rawPath.startsWith('/') ? rawPath : '/' + rawPath);
      if (!isExistingFile(filePath)) {
        return new Response('Not Found', { status: 404 });
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = request.headers.get('range');
      const ext = path.extname(filePath).toLowerCase();

      const mimeType = ext === '.mp3' ? 'audio/mpeg' :
                       ext === '.wav' ? 'audio/wav' :
                       ext === '.ogg' ? 'audio/ogg' :
                       ext === '.m4a' || ext === '.aac' ? 'audio/mp4' :
                       ext === '.mp4' ? 'video/mp4' :
                       ext === '.webm' ? 'video/webm' :
                       ext === '.mov' ? 'video/quicktime' :
                       ext === '.mkv' ? 'video/x-matroska' :
                       ext === '.flac' ? 'audio/flac' :
                       ext === '.webp' ? 'image/webp' :
                       ext === '.gif' ? 'image/gif' :
                       ext === '.png' ? 'image/png' :
                       ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                       'application/octet-stream';

      const match = range ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;
      if (range && !match) {
        return new Response('Range Not Satisfiable', { status: 416, headers: { 'Content-Range': `bytes */${fileSize}` } });
      }
      if (match) {
        let start;
        let end;
        if (match[1] === '') {
          // Rango sufijo: los últimos N bytes
          const suffix = parseInt(match[2], 10) || 0;
          start = Math.max(0, fileSize - suffix);
          end = fileSize - 1;
        } else {
          start = parseInt(match[1], 10);
          end = match[2] ? Math.min(parseInt(match[2], 10), fileSize - 1) : fileSize - 1;
        }
        if (start >= fileSize || start > end) {
          return new Response('Range Not Satisfiable', { status: 416, headers: { 'Content-Range': `bytes */${fileSize}` } });
        }
        const chunkSize = (end - start) + 1;
        const nodeStream = fs.createReadStream(filePath, { start, end });
        const webStream = Readable.toWeb(nodeStream);

        return new Response(webStream, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(chunkSize),
            'Content-Type': mimeType
          }
        });
      } else {
        const nodeStream = fs.createReadStream(filePath);
        const webStream = Readable.toWeb(nodeStream);
        return new Response(webStream, {
          status: 200,
          headers: {
            'Accept-Ranges': 'bytes',
            'Content-Length': String(fileSize),
            'Content-Type': mimeType
          }
        });
      }
    } catch (err) {
      console.error('Error cargando media local con esquema media://:', err);
      return new Response('Error', { status: 500 });
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Solo la ventana propia (archivo local o servidor de desarrollo) puede llamar a la API del sistema
function isTrustedSender(event) {
  const url = event.senderFrame?.url || '';
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  return (
    url.startsWith('file://') ||
    (devServerUrl && url.startsWith(devServerUrl)) ||
    url.startsWith('http://localhost:5173/')
  );
}

function handle(channel, fn) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!isTrustedSender(event)) {
      throw new Error(`IPC bloqueado desde un origen no confiable: ${channel}`);
    }
    return fn(event, ...args);
  });
}

function isExistingFile(p) {
  try {
    return typeof p === 'string' && path.isAbsolute(p) && fs.statSync(p).isFile();
  } catch (e) {
    return false;
  }
}

// IPC: Abrir explorador de archivos
handle('dialog:openFiles', async (event, options = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Seleccionar videos, fotos o audios',
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: 'Archivos Multimedia',
        extensions: ['mp4', 'mov', 'webm', 'mkv', 'avi', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac']
      },
      { name: 'Videos', extensions: ['mp4', 'mov', 'webm', 'mkv', 'avi'] },
      { name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] },
      { name: 'Audios', extensions: ['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac'] }
    ]
  });

  if (result.canceled) return [];

  return describeFiles(result.filePaths);
});

const VIDEO_EXTS = ['mp4', 'mov', 'webm', 'mkv', 'avi'];
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
const AUDIO_EXTS = ['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac'];

async function describeFiles(filePaths) {
  const valid = filePaths.filter((p) => {
    const ext = path.extname(p).toLowerCase().replace('.', '');
    return [...VIDEO_EXTS, ...IMAGE_EXTS, ...AUDIO_EXTS].includes(ext) && fs.existsSync(p);
  });

  return Promise.all(
    valid.map(async (filePath) => {
      const ext = path.extname(filePath).toLowerCase().replace('.', '');
      let type = 'video';
      if (IMAGE_EXTS.includes(ext)) type = 'image';
      if (AUDIO_EXTS.includes(ext)) type = 'audio';

      const stats = fs.statSync(filePath);
      const meta = (type === 'video' || type === 'audio') ? await getProbeMetadata(filePath) : { duration: 3 };

      return {
        id: 'media_' + Math.random().toString(36).substring(2, 9),
        name: path.basename(filePath),
        path: filePath,
        url: pathToFileURL(filePath).href,
        type,
        size: stats.size,
        duration: meta.duration || (type === 'image' ? 3 : 30)
      };
    })
  );
}

// IPC: Describir archivos soltados con arrastrar y soltar
handle('media:describeFiles', async (event, filePaths) => {
  if (!Array.isArray(filePaths)) return [];
  return describeFiles(filePaths.filter((p) => typeof p === 'string'));
});

// IPC: Guardar archivo MP4 dialog
handle('dialog:saveFile', async (event, defaultName = 'mi_video_cortex.mp4') => {
  const safeName = path.basename(String(defaultName || 'mi_video_cortex.mp4'));
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Exportar Video',
    defaultPath: path.join(app.getPath('videos'), safeName),
    filters: [{ name: 'Video MP4', extensions: ['mp4'] }]
  });
  return result.canceled ? null : result.filePath;
});

// IPC: Obtener metadatos reales con FFprobe
handle('media:getMetadata', async (event, filePath) => {
  if (!isExistingFile(filePath)) return { duration: 30, width: 1920, height: 1080, fps: 30 };
  return getProbeMetadata(filePath);
});

// Cache en memoria para formas de onda de audio
const waveformCache = new Map();

// IPC: Extraer ondas de sonido (waveform) de audio o video
handle('media:getWaveform', async (event, filePath) => {
  if (!isExistingFile(filePath)) return [];
  if (waveformCache.has(filePath)) return waveformCache.get(filePath);

  return new Promise((resolve) => {
    if (!fs.existsSync(filePath)) return resolve([]);
    // Extraer audio mono remuestreado a 20Hz en float32
    const proc = spawn('ffmpeg', [
      '-v', 'quiet',
      '-i', filePath,
      '-ac', '1',
      '-ar', '20',
      '-f', 'f32le',
      'pipe:1'
    ]);

    const chunks = [];
    proc.stdout.on('data', (d) => chunks.push(d));

    proc.on('close', (code) => {
      if (code !== 0 || chunks.length === 0) return resolve([]);
      const buf = Buffer.concat(chunks);
      const numSamples = Math.floor(buf.length / 4);
      if (numSamples === 0) return resolve([]);

      // Vista Float32 directa sobre el buffer (copiado para garantizar alineación de 4 bytes)
      const raw = new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + numSamples * 4));
      let maxVal = 0.0001;
      for (let i = 0; i < numSamples; i++) {
        const val = Math.abs(raw[i]);
        raw[i] = val;
        if (val > maxVal) maxVal = val;
      }

      // Normalizar picos entre 0.0 y 1.0 con compresión dinámica suave para mejor visualización
      const normalized = new Array(numSamples);
      for (let i = 0; i < numSamples; i++) {
        const ratio = raw[i] / maxVal;
        // Aplicar curva logarítmica/raíz cuadrada ligera para resaltar partes suaves sin saturar
        normalized[i] = Math.round(Math.pow(ratio, 0.7) * 100) / 100;
      }

      waveformCache.set(filePath, normalized);
      resolve(normalized);
    });

    proc.on('error', () => resolve([]));
  });
});

// IPC: Extraer thumbnail (execFile evita inyección de comandos con rutas que contengan comillas)
const thumbnailCache = new Map();
handle('media:extractThumbnail', async (event, filePath) => {
  if (!isExistingFile(filePath)) return null;
  if (thumbnailCache.has(filePath)) return thumbnailCache.get(filePath);

  const promise = new Promise((resolve) => {
    execFile(
      'ffmpeg',
      ['-v', 'quiet', '-ss', '1', '-i', filePath, '-frames:v', '1', '-q:v', '3', '-vf', 'scale=320:-1', '-f', 'image2pipe', '-c:v', 'mjpeg', 'pipe:1'],
      { encoding: 'buffer', maxBuffer: 1024 * 1024 * 8 },
      (err, stdout) => {
        if (err || !stdout || stdout.length === 0) return resolve(null);
        resolve(`data:image/jpeg;base64,${stdout.toString('base64')}`);
      }
    );
  });
  thumbnailCache.set(filePath, promise);
  return promise;
});

// IPC: Subtítulos automáticos con Python + Whisper
handle('subtitles:transcribe', async (event, { filePath, model = 'base', language = 'es' }) => {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, '../python/transcribe.py');
    const venvPython = path.join(__dirname, '../python/venv/bin/python');
    const pythonExe = fs.existsSync(venvPython) ? venvPython : 'python3';
    if (!isExistingFile(filePath)) {
      return resolve({ status: 'error', message: 'El archivo a transcribir no existe.' });
    }
    const safeModel = /^[a-z0-9.\-]{1,32}$/i.test(String(model)) ? String(model) : 'base';
    const safeLanguage = /^([a-z]{2,3}|auto)$/i.test(String(language)) ? String(language) : 'es';
    // --opcion=valor evita que una ruta que empiece por "-" se interprete como otra opción
    const args = [scriptPath, `--input=${filePath}`, `--model=${safeModel}`, `--language=${safeLanguage}`];

    execFile(pythonExe, args, { maxBuffer: 1024 * 1024 * 10 }, (err, stdout) => {
      if (stdout) {
        try {
          return resolve(JSON.parse(stdout.trim()));
        } catch (e) {
          // salida no JSON: se informa abajo
        }
      }
      resolve({
        status: 'error',
        message: err ? err.message : 'Error al transcribir el audio con Whisper.'
      });
    });
  });
});

// IPC: Exportación de video nativa ultrarrápida con FFmpeg
// Módulo ES compartido con la interfaz (filtros y transiciones)
let effectsModulePromise = null;
function loadEffects() {
  if (!effectsModulePromise) {
    effectsModulePromise = import(pathToFileURL(path.join(__dirname, '../shared/effects.mjs')).href);
  }
  return effectsModulePromise;
}

handle('export:start', async (event, options) => {
  const outputPath = options?.outputPath;
  if (typeof outputPath !== 'string' || !path.isAbsolute(outputPath) || !/\.mp4$/i.test(outputPath)) {
    throw new Error('Ruta de exportación no válida (debe ser un archivo .mp4 absoluto).');
  }
  const effects = await loadEffects();
  return new Promise((resolve, reject) => {
    try {
      if (currentExportSession) {
        currentExportSession.cancel();
        currentExportSession = null;
      }

      currentExportSession = exportProjectNatively(
        options,
        (progress) => {
          if (mainWindow) mainWindow.webContents.send('export:progress', progress);
        },
        (outputPath) => {
          if (mainWindow) mainWindow.webContents.send('export:completed', outputPath);
          currentExportSession = null;
          resolve({ status: 'completed', outputPath });
        },
        (error) => {
          if (mainWindow) mainWindow.webContents.send('export:error', error.message);
          currentExportSession = null;
          reject(error);
        },
        effects
      );
    } catch (e) {
      reject(e);
    }
  });
});

handle('export:frame', async () => true);
handle('export:finish', async () => true);

handle('export:cancel', async () => {
  if (currentExportSession) {
    currentExportSession.cancel();
    currentExportSession = null;
  }
  return true;
});

handle('shell:showItemInFolder', (event, filePath) => {
  if (!isExistingFile(filePath)) return false;
  shell.showItemInFolder(filePath);
  return true;
});

// IPC: Información de aceleración por GPU
handle('system:getGpuInfo', async () => {
  return detectGpuEncoder();
});
