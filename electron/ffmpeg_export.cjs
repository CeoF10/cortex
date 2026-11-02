const { spawn, execSync, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Convierte color HEX (#RRGGBB o #RGB) o RGBA a formato ASS (&HAABBGGRR&)
 */
function colorToAss(color, defaultAlpha = 0) {
  if (!color || color === 'transparent') return '&H00FFFFFF&';
  
  if (color.startsWith('rgba')) {
    const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
    if (m) {
      const r = parseInt(m[1]).toString(16).padStart(2, '0');
      const g = parseInt(m[2]).toString(16).padStart(2, '0');
      const b = parseInt(m[3]).toString(16).padStart(2, '0');
      const opacity = m[4] !== undefined ? parseFloat(m[4]) : 1;
      const alphaVal = Math.round((1 - opacity) * 255).toString(16).padStart(2, '0');
      return `&H${alphaVal}${b}${g}${r}&`.toUpperCase();
    }
  }

  let clean = color.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length === 6) {
    const r = clean.substring(0, 2);
    const g = clean.substring(2, 4);
    const b = clean.substring(4, 6);
    const a = defaultAlpha.toString(16).padStart(2, '0');
    return `&H${a}${b}${g}${r}&`.toUpperCase();
  }

  return '&H00FFFFFF&';
}

/**
 * Limpia el nombre de la tipografía para libass
 */
function cleanFontName(fontFamily) {
  if (!fontFamily) return 'Montserrat';
  const first = fontFamily.split(',')[0].replace(/['"]/g, '').trim();
  return first || 'Montserrat';
}

/**
 * Cache y detección de pista de audio en archivos multimedia
 */
const audioStreamCache = new Map();
function hasAudioStream(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return false;
  if (audioStreamCache.has(filePath)) return audioStreamCache.get(filePath);

  try {
    const out = execFileSync(
      'ffprobe',
      ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_type', '-of', 'default=nw=1:nk=1', filePath],
      { encoding: 'utf8', timeout: 3000 }
    );
    const hasAudio = out.trim() === 'audio';
    audioStreamCache.set(filePath, hasAudio);
    return hasAudio;
  } catch (e) {
    audioStreamCache.set(filePath, false);
    return false;
  }
}

/**
 * Detecta aceleración por GPU (NVIDIA NVENC RTX 3060) con fallback automático a CPU
 */
let cachedEncoderInfo = null;
function detectGpuEncoder() {
  if (cachedEncoderInfo) return cachedEncoderInfo;
  try {
    const out = execSync('ffmpeg -encoders 2>/dev/null', { encoding: 'utf8' });
    if (out.includes('h264_nvenc')) {
      // Probar si el encoder NVENC responde correctamente en el hardware actual
      execSync('ffmpeg -y -f lavfi -i color=c=black:s=256x256:d=0.04 -c:v h264_nvenc -f null - 2>/dev/null');
      cachedEncoderInfo = {
        encoder: 'h264_nvenc',
        isGpu: true,
        name: 'NVIDIA NVENC (GeForce RTX 3060)',
        args: [
          '-c:v', 'h264_nvenc',
          '-preset', 'p5',
          '-cq', '18',
          '-spatial-aq', '1',
          '-temporal-aq', '1',
          '-rc-lookahead', '20',
          '-profile:v', 'high',
          '-b:v', '0'
        ]
      };
      return cachedEncoderInfo;
    }
  } catch (e) {}

  cachedEncoderInfo = {
    encoder: 'libx264',
    isGpu: false,
    name: 'CPU Multithread (libx264)',
    args: ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18']
  };
  return cachedEncoderInfo;
}

/**
 * Convierte segundos a formato de tiempo ASS (H:MM:SS.cc)
 */
function formatAssTime(seconds) {
  const safeSec = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(safeSec / 3600);
  const m = Math.floor((safeSec % 3600) / 60);
  const s = Math.floor(safeSec % 60);
  const cs = Math.floor((safeSec % 1) * 100);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

/**
 * Genera filtros de entrada (alpha / fade) y expresiones dinámicas de overlay (X, Y)
 * con soporte para animaciones de entrada/salida (Fade, Slide, Zoom, Bounce) y transformaciones
 */
function buildVisualOverlayConfig(clip, width, height) {
  const start = clip.start;
  const dur = clip.duration;
  const end = start + dur;
  const posX = clip.posX !== undefined ? clip.posX : 0;
  const posY = clip.posY !== undefined ? clip.posY : 0;

  const inDur = Math.max(0.05, Math.min(dur / 2, clip.animInDuration || 0.6));
  const outDur = Math.max(0.05, Math.min(dur / 2, clip.animOutDuration || 0.6));
  const animIn = clip.animIn || 'none';
  const animOut = clip.animOut || 'none';

  // 1. Filtros de transparencia y desvanecimiento (Fade)
  const filters = [];
  const needsAlpha = (clip.opacity !== undefined && clip.opacity < 1) ||
    ['fade', 'zoom_in', 'zoom_out', 'bounce', 'flash'].includes(animIn) ||
    ['fade', 'zoom_in', 'zoom_out', 'bounce'].includes(animOut);

  if (needsAlpha) {
    filters.push('format=rgba');
    if (clip.opacity !== undefined && clip.opacity < 1) {
      const op = Math.max(0, Math.min(1, clip.opacity));
      filters.push(`colorchannelmixer=aa=${op.toFixed(2)}`);
    }
    if (['fade', 'zoom_in', 'zoom_out', 'bounce', 'flash'].includes(animIn)) {
      filters.push(`fade=t=in:st=0:d=${inDur.toFixed(3)}:alpha=1`);
    }
    if (['fade', 'zoom_in', 'zoom_out', 'bounce'].includes(animOut)) {
      const fadeOutStart = Math.max(0, dur - outDur);
      filters.push(`fade=t=out:st=${fadeOutStart.toFixed(3)}:d=${outDur.toFixed(3)}:alpha=1`);
    }
  }

  // 2. Expresiones cinemáticas de posición (X, Y) con curvas de desaceleración cúbica (ease-out cubic)
  let xExpr = `(W-w)/2+(${posX}*${width}/100)`;
  let yExpr = `(H-h)/2+(${posY}*${height}/100)`;

  const inProg = `min(1,max(0,(t-${start.toFixed(3)})/${inDur.toFixed(3)}))`;
  const inFactor = `(1-${inProg})*(1-${inProg})*(1-${inProg})`;

  const outProg = `min(1,max(0,(${end.toFixed(3)}-t)/${outDur.toFixed(3)}))`;
  const outFactor = `(1-${outProg})*(1-${outProg})*(1-${outProg})`;

  const xOffsets = [];
  const yOffsets = [];

  if (animIn === 'slide_up') {
    yOffsets.push(`+(${inFactor}*H)`);
  } else if (animIn === 'slide_down') {
    yOffsets.push(`-(${inFactor}*H)`);
  } else if (animIn === 'slide_left') {
    xOffsets.push(`+(${inFactor}*W)`);
  } else if (animIn === 'slide_right') {
    xOffsets.push(`-(${inFactor}*W)`);
  }

  if (animOut === 'slide_up') {
    yOffsets.push(`-(${outFactor}*H)`);
  } else if (animOut === 'slide_down') {
    yOffsets.push(`+(${outFactor}*H)`);
  } else if (animOut === 'slide_left') {
    xOffsets.push(`-(${outFactor}*W)`);
  } else if (animOut === 'slide_right') {
    xOffsets.push(`+(${outFactor}*W)`);
  }

  if (xOffsets.length > 0) {
    xExpr = `${xExpr}${xOffsets.join('')}`;
  }
  if (yOffsets.length > 0) {
    yExpr = `${yExpr}${yOffsets.join('')}`;
  }

  return { filters, xExpr, yExpr, start, end };
}

/**
 * Sanitiza texto para evitar inyecciones o conflictos con etiquetas de control ASS ({ y })
 */
function sanitizeAssText(str) {
  return String(str || '').replace(/\{/g, '(').replace(/\}/g, ')');
}

// Campos numéricos que acaban dentro del filtergraph de FFmpeg: se fuerzan a número para que
// un proyecto corrupto o manipulado no pueda inyectar filtros (p. ej. movie= para leer archivos).
const NUMERIC_CLIP_FIELDS = [
  'start', 'duration', 'offset', 'scale', 'posX', 'posY', 'opacity', 'volume', 'speed',
  'fadeIn', 'fadeOut', 'animInDuration', 'animOutDuration', 'positionY', 'fontSize', 'strokeWidth',
  'brightness', 'contrast', 'saturate', 'hue', 'blur', 'vignette', 'filterIntensity'
];
const SAFE_ANIM_IDS = new Set(['none', 'fade', 'zoom_in', 'zoom_out', 'bounce', 'slide_right', 'slide_left', 'slide_up', 'slide_down', 'spin', 'shake', 'flash']);

function toFiniteNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function sanitizeClip(clip) {
  const out = { ...clip };
  for (const key of NUMERIC_CLIP_FIELDS) {
    if (out[key] !== undefined && out[key] !== null) {
      const n = toFiniteNumber(out[key]);
      if (n === undefined) delete out[key];
      else out[key] = n;
    }
  }
  out.start = Math.max(0, out.start || 0);
  out.duration = Math.max(0.05, out.duration || 0.05);
  out.offset = Math.max(0, out.offset || 0);
  if (out.scale !== undefined) out.scale = Math.max(0.01, Math.min(20, out.scale));
  if (out.speed !== undefined) out.speed = Math.max(0.5, Math.min(2, out.speed)); // rango de atempo
  out.animIn = SAFE_ANIM_IDS.has(out.animIn) ? out.animIn : 'none';
  out.animOut = SAFE_ANIM_IDS.has(out.animOut) ? out.animOut : 'none';
  if (out.transition) {
    out.transition = {
      type: String(out.transition.type || ''),
      duration: toFiniteNumber(out.transition.duration)
    };
  }
  out.path = typeof out.path === 'string' ? out.path : undefined;
  if (out.path && !path.isAbsolute(out.path)) out.path = undefined;
  return out;
}

/**
 * Exportador NATIVO ultrarrápido con FFmpeg:
 * Renderiza videos, imágenes PNG superpuestas, audios sincronizados y subtítulos vectoriales con Karaoke
 */
function exportProjectNatively(options, onProgress, onFinish, onError, effects) {
  const outputPath = options.outputPath;
  // Dimensiones pares (requisito de yuv420p) y valores acotados
  const even = (v, d) => Math.max(16, Math.min(8192, Math.round((toFiniteNumber(v) || d) / 2) * 2));
  const width = even(options.width, 1920);
  const height = even(options.height, 1080);
  const fps = Math.max(1, Math.min(120, Math.round(toFiniteNumber(options.fps) || 30)));
  const totalDuration = toFiniteNumber(options.totalDuration) || 10;
  const tracks = (Array.isArray(options.tracks) ? options.tracks : []).map((t) => ({
    ...t,
    clips: (Array.isArray(t?.clips) ? t.clips : []).map(sanitizeClip)
  }));

  const safeTotalDuration = Math.max(0.1, Number(totalDuration) || 10);
  const tempAssFile = path.join(os.tmpdir(), `cortex_subs_${Date.now()}_${Math.random().toString(36).substring(7)}.ass`);

  try {
    const scaleFactor = height / 1080;

    // 1. Clasificar clips respetando Mute, Ocultamiento y Volumen por pista
    const visualVideoClips = [];
    const visualImageClips = [];
    const eligibleAudioClips = [];
    const textClips = [];

    tracks.forEach((track, tIdx) => {
      const isTrackMuted = !!track.muted;
      const isTrackHidden = !!track.hidden;

      (track.clips || []).forEach((clip) => {
        if (clip.type === 'video' && clip.path && fs.existsSync(clip.path)) {
          if (!isTrackHidden) {
            visualVideoClips.push({ ...clip, trackMuted: isTrackMuted, trackIndex: tIdx });
          }
          // El audio del video se incluye SOLO SI la pista no está silenciada, el clip no está silenciado y tiene volumen > 0
          if (!isTrackMuted && !clip.muted && (clip.volume === undefined || clip.volume > 0.005)) {
            if (hasAudioStream(clip.path)) {
              eligibleAudioClips.push({ ...clip, isVideoAudio: true });
            }
          }
        } else if (clip.type === 'image' && clip.path && fs.existsSync(clip.path)) {
          if (!isTrackHidden) {
            visualImageClips.push({ ...clip, trackMuted: isTrackMuted, trackIndex: tIdx });
          }
        } else if (clip.type === 'audio' && clip.path && fs.existsSync(clip.path)) {
          if (!isTrackMuted && !clip.muted && (clip.volume === undefined || clip.volume > 0.005)) {
            eligibleAudioClips.push({ ...clip, isVideoAudio: false });
          }
        } else if (clip.type === 'text') {
          if (!isTrackHidden && (clip.text || '').trim().length > 0) {
            textClips.push({ ...clip });
          }
        }
      });
    });

    // 2. Generar archivo de subtítulos ASS dinámico con Karaoke y brillo si hay textos
    let hasSubtitles = false;
    if (textClips.length > 0) {
      textClips.sort((a, b) => a.start - b.start);

      let stylesSection = '';
      let eventsSection = '';

      textClips.forEach((t, idx) => {
        const styleName = `SubStyle_${idx}`;
        const fontName = cleanFontName(t.fontFamily);
        const fontSize = Math.round((t.fontSize || 42) * scaleFactor);
        const baseColor = colorToAss(t.color || '#FFFFFF');
        const strokeColor = colorToAss(t.strokeColor || '#000000');
        const strokeW = Math.max(0, (t.strokeWidth !== undefined ? t.strokeWidth : 4) * scaleFactor);
        const hasBox = t.bgColor && t.bgColor !== 'transparent';
        const backColor = hasBox ? colorToAss(t.bgColor, 64) : '&H80000000';
        const borderStyle = hasBox ? 3 : 1;
        const outlineVal = hasBox ? Math.round(12 * scaleFactor) : strokeW;
        const shadowVal = hasBox ? 0 : Math.round(1.5 * scaleFactor);

        // Alignment 5 (Center-Center), Margins = 0,0,0 para cálculo absoluto idéntico al Canvas
        stylesSection += `Style: ${styleName},${fontName},${fontSize},${baseColor},&H000000FF,${strokeColor},${backColor},-1,0,0,0,100,100,0,0,${borderStyle},${outlineVal},${shadowVal},5,0,0,0,1\n`;

        const posX = Math.round(width / 2);
        const posY = Math.round(height * ((t.positionY !== undefined ? t.positionY : 87) / 100));

        // Procesar palabras para Karaoke
        const rawWords = (t.words && Array.isArray(t.words) && t.words.length > 0)
          ? t.words.map((w) => sanitizeAssText(typeof w === 'object' ? w.word : String(w)))
          : sanitizeAssText(t.text || '').trim().split(/\s+/).filter(Boolean);

        const words = t.uppercase ? rawWords.map((w) => w.toUpperCase()) : rawWords;
        const isKaraoke = (t.isSubtitle || t.karaoke) && words.length > 0;

        const animIn = t.animIn || 'none';
        const inDur = Math.min(t.duration / 2, t.animInDuration || 0.5);
        const animOut = t.animOut || 'none';
        const outDur = Math.min(t.duration / 2, t.animOutDuration || 0.5);

        if (isKaraoke) {
          const activeColor = colorToAss(t.highlightColor || '#00E5FF');
          const clipStart = t.start;
          const clipEnd = t.start + t.duration;

          for (let i = 0; i < words.length; i++) {
            let wStart, wEnd;
            if (t.words && Array.isArray(t.words) && t.words.length === words.length) {
              const currentWordObj = t.words[i];
              const nextWordObj = t.words[i + 1];
              wStart = i === 0 ? clipStart : Math.max(clipStart, Number(currentWordObj.start) || clipStart);
              wEnd = i === words.length - 1
                ? clipEnd
                : Math.max(wStart + 0.05, Math.min(clipEnd, Number(nextWordObj.start) || clipEnd));
            } else {
              const step = t.duration / words.length;
              wStart = clipStart + i * step;
              wEnd = clipStart + (i + 1) * step;
            }

            const wordDur = Math.max(0.05, wEnd - wStart);
            let posAndAnimTag = `{\\an5\\pos(${posX},${posY})}`;

            // Animación de entrada en la primera palabra del clip
            if (i === 0 && animIn !== 'none') {
              const inMs = Math.round(Math.min(wordDur, inDur) * 1000);
              switch (animIn) {
                case 'fade':
                  posAndAnimTag = `{\\an5\\pos(${posX},${posY})\\fad(${inMs},0)}`;
                  break;
                case 'bounce':
                case 'zoom_in':
                  posAndAnimTag = `{\\an5\\pos(${posX},${posY})\\t(0,${inMs},\\fscx100\\fscy100)\\fscx35\\fscy35\\fad(${Math.round(inMs * 0.6)},0)}`;
                  break;
                case 'zoom_out':
                  posAndAnimTag = `{\\an5\\pos(${posX},${posY})\\t(0,${inMs},\\fscx100\\fscy100)\\fscx170\\fscy170\\fad(${Math.round(inMs * 0.6)},0)}`;
                  break;
                case 'slide_up':
                  posAndAnimTag = `{\\an5\\move(${posX},${posY + 100},${posX},${posY},0,${inMs})\\fad(${inMs},0)}`;
                  break;
                case 'slide_down':
                  posAndAnimTag = `{\\an5\\move(${posX},${posY - 100},${posX},${posY},0,${inMs})\\fad(${inMs},0)}`;
                  break;
                case 'slide_left':
                  posAndAnimTag = `{\\an5\\move(${posX + 150},${posY},${posX},${posY},0,${inMs})\\fad(${inMs},0)}`;
                  break;
                case 'slide_right':
                  posAndAnimTag = `{\\an5\\move(${posX - 150},${posY},${posX},${posY},0,${inMs})\\fad(${inMs},0)}`;
                  break;
                case 'spin':
                  posAndAnimTag = `{\\an5\\pos(${posX},${posY})\\t(0,${inMs},\\frz0\\fscx100\\fscy100)\\frz-180\\fscx35\\fscy35\\fad(${inMs},0)}`;
                  break;
                case 'flash':
                  posAndAnimTag = `{\\an5\\pos(${posX},${posY})\\fad(${Math.round(inMs * 0.5)},0)}`;
                  break;
                default:
                  posAndAnimTag = `{\\an5\\pos(${posX},${posY})}`;
                  break;
              }
            } else if (i === words.length - 1 && animOut !== 'none') {
              // Animación de salida en la última palabra del clip
              const outMs = Math.round(Math.min(wordDur, outDur) * 1000);
              const startOutMs = Math.max(0, Math.round((wordDur - Math.min(wordDur, outDur)) * 1000));
              switch (animOut) {
                case 'fade':
                  posAndAnimTag = `{\\an5\\pos(${posX},${posY})\\fad(0,${outMs})}`;
                  break;
                case 'zoom_in':
                  posAndAnimTag = `{\\an5\\pos(${posX},${posY})\\t(${startOutMs},${Math.round(wordDur * 1000)},\\fscx160\\fscy160)\\fad(0,${outMs})}`;
                  break;
                case 'zoom_out':
                  posAndAnimTag = `{\\an5\\pos(${posX},${posY})\\t(${startOutMs},${Math.round(wordDur * 1000)},\\fscx30\\fscy30)\\fad(0,${outMs})}`;
                  break;
                case 'slide_up':
                  posAndAnimTag = `{\\an5\\move(${posX},${posY},${posX},${posY - 100},${startOutMs},${Math.round(wordDur * 1000)})\\fad(0,${outMs})}`;
                  break;
                case 'slide_down':
                  posAndAnimTag = `{\\an5\\move(${posX},${posY},${posX},${posY + 100},${startOutMs},${Math.round(wordDur * 1000)})\\fad(0,${outMs})}`;
                  break;
                case 'slide_left':
                  posAndAnimTag = `{\\an5\\move(${posX},${posY},${posX - 150},${posY},${startOutMs},${Math.round(wordDur * 1000)})\\fad(0,${outMs})}`;
                  break;
                case 'slide_right':
                  posAndAnimTag = `{\\an5\\move(${posX},${posY},${posX + 150},${posY},${startOutMs},${Math.round(wordDur * 1000)})\\fad(0,${outMs})}`;
                  break;
                default:
                  posAndAnimTag = `{\\an5\\pos(${posX},${posY})}`;
                  break;
              }
            }

            // Palabra activa iluminada con resplandor glow (\blur4) sin alteración de escala para estabilidad perfecta
            const formattedWords = words.map((w, wIdx) => {
              if (wIdx === i) {
                return `{\\c${activeColor}\\blur4}${w}{\\c${baseColor}\\blur0}`;
              }
              return w;
            });

            const lineContent = posAndAnimTag + formattedWords.join(' ');
            eventsSection += `Dialogue: 0,${formatAssTime(wStart)},${formatAssTime(wEnd)},${styleName},,0,0,0,,${lineContent}\n`;
          }
        } else {
          // Texto estático o titular estándar
          const durMs = Math.round(t.duration * 1000);
          const inMs = Math.round(inDur * 1000);
          const outMs = Math.round(outDur * 1000);
          let tag = '';

          if (animIn === 'fade' && animOut === 'fade') {
            tag = `{\\an5\\pos(${posX},${posY})\\fad(${inMs},${outMs})}`;
          } else if (animIn === 'fade') {
            tag = `{\\an5\\pos(${posX},${posY})\\fad(${inMs},0)}`;
          } else if (animOut === 'fade') {
            tag = `{\\an5\\pos(${posX},${posY})\\fad(0,${outMs})}`;
          } else if (animIn === 'slide_up') {
            tag = `{\\an5\\move(${posX},${posY + 100},${posX},${posY},0,${inMs})\\fad(${inMs},0)}`;
          } else if (animIn === 'slide_down') {
            tag = `{\\an5\\move(${posX},${posY - 100},${posX},${posY},0,${inMs})\\fad(${inMs},0)}`;
          } else if (animIn === 'slide_left') {
            tag = `{\\an5\\move(${posX + 150},${posY},${posX},${posY},0,${inMs})\\fad(${inMs},0)}`;
          } else if (animIn === 'slide_right') {
            tag = `{\\an5\\move(${posX - 150},${posY},${posX},${posY},0,${inMs})\\fad(${inMs},0)}`;
          } else if (animIn === 'bounce' || animIn === 'zoom_in') {
            tag = `{\\an5\\pos(${posX},${posY})\\t(0,${inMs},\\fscx100\\fscy100)\\fscx35\\fscy35\\fad(${Math.round(inMs * 0.6)},0)}`;
          } else if (animIn === 'zoom_out') {
            tag = `{\\an5\\pos(${posX},${posY})\\t(0,${inMs},\\fscx100\\fscy100)\\fscx170\\fscy170\\fad(${Math.round(inMs * 0.6)},0)}`;
          } else if (animIn === 'spin') {
            tag = `{\\an5\\pos(${posX},${posY})\\t(0,${inMs},\\frz0\\fscx100\\fscy100)\\frz-180\\fscx35\\fscy35\\fad(${inMs},0)}`;
          } else {
            tag = `{\\an5\\pos(${posX},${posY})}`;
          }

          const cleanText = sanitizeAssText(t.text || '').replace(/\r?\n/g, '\\N');
          eventsSection += `Dialogue: 0,${formatAssTime(t.start)},${formatAssTime(t.start + t.duration)},${styleName},,0,0,0,,${tag}${cleanText}\n`;
        }
      });

      const assContent = `[Script Info]
Title: Cortex Export
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
${stylesSection}
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${eventsSection}`;

      fs.writeFileSync(tempAssFile, assContent, 'utf8');
      hasSubtitles = true;
    }

    // 3. Ensamblar inputs multimedia únicos para FFmpeg
    const inputs = [];
    const filterParts = [];

    // Input 0: Fondo base negro del tamaño, FPS y duración exactos
    inputs.push('-f', 'lavfi', '-i', `color=c=black:s=${width}x${height}:r=${fps}:d=${safeTotalDuration}`);
    let currentVideoOut = '0:v';

    let inputIndex = 1;
    const clipInputMap = new Map(); // Mapeo de clip.id -> inputIndex para reutilizar inputs

    const audioInputEntries = [];

    // Videos e imágenes (-loop 1 para que la imagen dure lo que haga falta)
    visualVideoClips.forEach((v) => {
      inputs.push('-i', v.path);
      clipInputMap.set(v.id, inputIndex);
      inputIndex++;
    });
    visualImageClips.forEach((img) => {
      inputs.push('-loop', '1', '-i', img.path);
      clipInputMap.set(img.id, inputIndex);
      inputIndex++;
    });

    // Audios puros (pistas de sonido dedicadas)
    eligibleAudioClips.forEach((a) => {
      if (a.isVideoAudio) {
        // Reutilizar el input index del video si ya fue cargado
        const existingIdx = clipInputMap.get(a.id);
        if (existingIdx !== undefined) {
          audioInputEntries.push({ index: existingIdx, clip: a });
          return;
        }
      }
      inputs.push('-i', a.path);
      audioInputEntries.push({ index: inputIndex, clip: a });
      clipInputMap.set(a.id, inputIndex);
      inputIndex++;
    });

    // 4. Composición de video
    // Unidades visuales: clips sueltos o cadenas de clips unidos por transiciones (xfade)
    const blurScale = Math.min(width, height) / 1080;
    const visualClips = [...visualVideoClips, ...visualImageClips];
    const visualById = new Map(visualClips.map((c) => [c.id, c]));

    const transitionIn = new Map(); // clip.id -> par cuya transición entra en este clip
    const transitionOut = new Map(); // clip.id -> par cuya transición sale de este clip
    if (effects) {
      tracks.forEach((track, tIdx) => {
        if (track.hidden) return;
        const eligible = { clips: (track.clips || []).filter((c) => visualById.has(c.id)) };
        effects.getTrackTransitions(eligible).forEach((pair) => {
          const xf = effects.TRANSITION_BY_ID.get(pair.type);
          if (!xf) return;
          const entry = { ...pair, xfade: xf.xfade, trackIndex: tIdx };
          transitionIn.set(pair.to.id, entry);
          transitionOut.set(pair.from.id, entry);
        });
      });
    }

    const units = [];
    const chained = new Set();
    visualClips.forEach((clip) => {
      if (chained.has(clip.id)) return;
      if (transitionIn.has(clip.id)) return; // se añade desde el inicio de su cadena
      if (!transitionOut.has(clip.id)) {
        units.push({ clips: [clip], type: clip.type, trackIndex: clip.trackIndex });
        return;
      }
      const chain = [clip];
      let cur = clip;
      while (transitionOut.has(cur.id)) {
        cur = visualById.get(transitionOut.get(cur.id).to.id);
        if (!cur || chained.has(cur.id)) break;
        chain.push(cur);
      }
      chain.forEach((c) => chained.add(c.id));
      units.push({ clips: chain, type: clip.type, trackIndex: clip.trackIndex });
    });

    // Mismo orden de capas que la vista previa: videos debajo, imágenes encima, luego por pista
    units.sort((a, b) => {
      if (a.type === 'video' && b.type === 'image') return -1;
      if (a.type === 'image' && b.type === 'video') return 1;
      return a.trackIndex - b.trackIndex;
    });

    // Stream de un clip: recorte, escala, filtro de color y transparencias de animación
    const buildClipStream = (clip, tag, relative) => {
      const index = clipInputMap.get(clip.id);
      const dur = clip.duration;
      const scale = clip.scale || 1;
      const config = buildVisualOverlayConfig(relative ? { ...clip, start: 0 } : clip, width, height);
      const f = [];

      if (clip.type === 'video') {
        f.push(`trim=start=${clip.offset || 0}:duration=${dur}`);
      } else {
        f.push(`trim=duration=${dur}`);
      }
      f.push('setpts=PTS-STARTPTS', `fps=${fps}`);

      if (clip.type === 'video' && scale === 1) {
        f.push(`scale=${width}:${height}:force_original_aspect_ratio=decrease`);
      } else {
        f.push(`scale='min(${width},iw)*${scale}':-1`);
      }

      f.push('format=rgba');
      if (effects) {
        const params = effects.getClipFilterParams(clip);
        f.push(...effects.buildFfmpegFilterChain(params, blurScale));
      }
      f.push(...config.filters);

      filterParts.push(`[${index}:v]${f.join(',')}[${tag}]`);
      return config;
    };

    units.forEach((unit, u) => {
      const outTag = `vis_stage_${u}`;

      if (unit.clips.length === 1) {
        const clip = unit.clips[0];
        const clipTag = `vis_clip_${u}`;
        const shiftedTag = `vis_shift_${u}`;
        const { xExpr, yExpr, start, end } = buildClipStream(clip, clipTag, false);
        // Desplazar los timestamps al inicio del clip para que el overlay muestre el frame correcto
        filterParts.push(`[${clipTag}]setpts=PTS+${start.toFixed(3)}/TB[${shiftedTag}]`);
        filterParts.push(
          `[${currentVideoOut}][${shiftedTag}]overlay=x='${xExpr}':y='${yExpr}':eof_action=pass:enable='between(t,${start},${end})'[${outTag}]`
        );
        currentVideoOut = outTag;
        return;
      }

      // Cadena con transiciones: cada clip a pantalla completa sobre fondo transparente,
      // con medio tiempo de transición congelado a cada lado del corte (tpad clone),
      // y luego xfade entre ellos. La duración total coincide con la línea de tiempo.
      const fullTags = [];
      const lengths = [];
      unit.clips.forEach((clip, i) => {
        const clipTag = `vis_c${u}_${i}`;
        const baseTag = `vis_base${u}_${i}`;
        const fullTag = `vis_full${u}_${i}`;
        const { xExpr, yExpr } = buildClipStream(clip, clipTag, true);
        const pre = transitionIn.has(clip.id) ? transitionIn.get(clip.id).duration / 2 : 0;
        const post = transitionOut.has(clip.id) ? transitionOut.get(clip.id).duration / 2 : 0;

        filterParts.push(`color=c=black@0.0:s=${width}x${height}:r=${fps}:d=${clip.duration.toFixed(3)},format=rgba[${baseTag}]`);
        const pad = (pre > 0 || post > 0)
          ? `,tpad=start_duration=${pre.toFixed(3)}:start_mode=clone:stop_duration=${post.toFixed(3)}:stop_mode=clone`
          : '';
        filterParts.push(
          `[${baseTag}][${clipTag}]overlay=x='${xExpr}':y='${yExpr}':eof_action=pass:format=rgb,format=rgba${pad},settb=AVTB[${fullTag}]`
        );
        fullTags.push(fullTag);
        lengths.push(pre + clip.duration + post);
      });

      let accTag = fullTags[0];
      let accLen = lengths[0];
      for (let i = 1; i < fullTags.length; i++) {
        const tr = transitionIn.get(unit.clips[i].id);
        const xfTag = `vis_xf${u}_${i}`;
        const offset = Math.max(0, accLen - tr.duration);
        filterParts.push(
          `[${accTag}][${fullTags[i]}]xfade=transition=${tr.xfade}:duration=${tr.duration.toFixed(3)}:offset=${offset.toFixed(3)}[${xfTag}]`
        );
        accTag = xfTag;
        accLen = accLen + lengths[i] - tr.duration;
      }

      const first = unit.clips[0];
      const last = unit.clips[unit.clips.length - 1];
      const chainStart = first.start;
      const chainEnd = last.start + last.duration;
      const shiftedTag = `vis_chain${u}`;
      filterParts.push(`[${accTag}]setpts=PTS-STARTPTS+${chainStart.toFixed(3)}/TB[${shiftedTag}]`);
      filterParts.push(
        `[${currentVideoOut}][${shiftedTag}]overlay=x=0:y=0:eof_action=pass:enable='between(t,${chainStart},${chainEnd})'[${outTag}]`
      );
      currentVideoOut = outTag;
    });

    // C) Quemar subtítulos con libass
    if (hasSubtitles) {
      const subTag = 'v_with_subs';
      const escapedAssPath = tempAssFile.replace(/\\/g, '/').replace(/:/g, '\\:');
      filterParts.push(
        `[${currentVideoOut}]ass='${escapedAssPath}'[${subTag}]`
      );
      currentVideoOut = subTag;
    }

    // 5. Composición y mezcla de Audio (SOLO clips no silenciados con volumen > 0)
    const audioSourceTags = [];
    audioInputEntries.forEach(({ index, clip }, idx) => {
      const aTag = `a_track_${idx}`;
      const offset = clip.offset || 0;
      const dur = clip.duration;
      const delayMs = Math.round(clip.start * 1000);
      const vol = clip.volume !== undefined ? clip.volume : 1;

      const audioFilters = [
        `atrim=start=${offset}:duration=${dur}`,
        'asetpts=PTS-STARTPTS'
      ];

      if (vol !== 1) {
        audioFilters.push(`volume=${vol.toFixed(2)}`);
      }

      if (clip.fadeIn && clip.fadeIn > 0) {
        audioFilters.push(`afade=t=in:ss=0:d=${clip.fadeIn}`);
      }

      if (clip.fadeOut && clip.fadeOut > 0) {
        const fadeOutStart = Math.max(0, dur - clip.fadeOut);
        audioFilters.push(`afade=t=out:st=${fadeOutStart.toFixed(2)}:d=${clip.fadeOut}`);
      }

      if (clip.speed && clip.speed !== 1) {
        audioFilters.push(`atempo=${clip.speed}`);
      }

      audioFilters.push(`adelay=${delayMs}|${delayMs}`);

      filterParts.push(`[${index}:a]${audioFilters.join(',')}[${aTag}]`);
      audioSourceTags.push(`[${aTag}]`);
    });

    let currentAudioOut = null;
    if (audioSourceTags.length > 1) {
      currentAudioOut = 'a_mixed';
      // amix normalizado con volume para compensar la atenuación 1/N
      filterParts.push(
        `${audioSourceTags.join('')}amix=inputs=${audioSourceTags.length}:duration=longest:dropout_transition=0,volume=${audioSourceTags.length}[${currentAudioOut}]`
      );
    } else if (audioSourceTags.length === 1) {
      currentAudioOut = audioSourceTags[0].replace(/[\[\]]/g, '');
    }

    // Si todas las pistas están silenciadas o no hay audio, generar pista de silencio
    if (!currentAudioOut) {
      inputs.push('-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo');
      currentAudioOut = `${inputIndex}:a`;
      inputIndex++;
    }

    // 6. Ensamblar argumentos finales de FFmpeg
    const args = ['-y', ...inputs];

    if (filterParts.length > 0) {
      args.push('-filter_complex', filterParts.join(';'));
      args.push('-map', `[${currentVideoOut}]`);
      args.push('-map', currentAudioOut.includes(':') ? currentAudioOut : `[${currentAudioOut}]`);
    } else {
      args.push('-map', currentVideoOut);
      args.push('-map', currentAudioOut);
    }

    const gpuInfo = detectGpuEncoder();
    console.log(`[EXPORT] Motor de renderizado: ${gpuInfo.name}`);

    args.push(
      ...gpuInfo.args,
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '256k',
      '-ar', '48000',
      '-t', safeTotalDuration.toString(),
      outputPath
    );

    console.log('[EXPORT] Ejecutando FFmpeg optimizado...');

    const ffmpegProc = spawn('ffmpeg', args);

    ffmpegProc.stderr.on('data', (data) => {
      const text = data.toString();
      const match = text.match(/time=(\d+):(\d+):(\d+\.\d+)/);
      if (match) {
        const hours = parseFloat(match[1]);
        const mins = parseFloat(match[2]);
        const secs = parseFloat(match[3]);
        const currentSec = hours * 3600 + mins * 60 + secs;
        const percent = Math.min(99, Math.max(1, Math.round((currentSec / safeTotalDuration) * 100)));
        onProgress(percent);
      }
    });

    ffmpegProc.on('close', (code) => {
      try {
        if (fs.existsSync(tempAssFile)) fs.unlinkSync(tempAssFile);
      } catch (e) {}

      if (code === 0) {
        onProgress(100);
        onFinish(outputPath);
      } else {
        onError(new Error(`FFmpeg terminó con código de error ${code}`));
      }
    });

    ffmpegProc.on('error', (err) => {
      try {
        if (fs.existsSync(tempAssFile)) fs.unlinkSync(tempAssFile);
      } catch (e) {}
      onError(err);
    });

    return {
      cancel: () => {
        try {
          ffmpegProc.kill('SIGKILL');
          if (fs.existsSync(tempAssFile)) fs.unlinkSync(tempAssFile);
        } catch (e) {}
      }
    };
  } catch (err) {
    try {
      if (fs.existsSync(tempAssFile)) fs.unlinkSync(tempAssFile);
    } catch (e) {}
    onError(err);
    return { cancel: () => {} };
  }
}

module.exports = {
  exportProjectNatively,
  detectGpuEncoder
};
