import React, { useState, useEffect } from 'react';
import { Download, X, Check, Loader2, Folder, Film, CheckCircle2, Zap } from 'lucide-react';
import { formatDuration } from '../utils/timeFormat';

export default function ExportModal({
  isOpen,
  onClose,
  totalDuration,
  aspectRatio,
  tracks,
  canvasRef
}) {
  const [resolution, setResolution] = useState('1080p');
  const [fps, setFps] = useState(30);
  const [fileName, setFileName] = useState('mi_video_cortex.mp4');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportedFilePath, setExportedFilePath] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [gpuInfo, setGpuInfo] = useState(null);

  useEffect(() => {
    if (isOpen && window.cortexAPI?.getGpuInfo) {
      window.cortexAPI.getGpuInfo().then((info) => setGpuInfo(info)).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setErrorMsg('');
    setExportedFilePath(null);

    try {
      let targetPath = null;
      if (window.cortexAPI?.saveFileDialog) {
        targetPath = await window.cortexAPI.saveFileDialog(fileName);
        if (!targetPath) {
          setIsExporting(false);
          return;
        }
      } else {
        targetPath = `/tmp/${fileName}`;
      }

      // Determinar dimensiones según aspect ratio
      let width = 1920;
      let height = 1080;
      if (aspectRatio === '9:16') {
        width = 1080;
        height = 1920;
      } else if (aspectRatio === '1:1') {
        width = 1080;
        height = 1080;
      }

      if (resolution === '720p') {
        width = Math.round(width * 0.666);
        height = Math.round(height * 0.666);
      }

      // Buscar audio si existe en las pistas universales
      const allClips = tracks.flatMap((t) => t.clips);
      const primaryAudio = allClips.find((c) => c.type === 'audio')?.path || allClips.find((c) => c.type === 'video')?.path || null;

      // Escuchar progreso nativo de FFmpeg
      let unsubscribeProgress = null;
      if (window.cortexAPI?.onExportProgress) {
        unsubscribeProgress = window.cortexAPI.onExportProgress((p) => {
          setProgress(p);
        });
      }

      // Iniciar exportación nativa ultrarrápida con FFmpeg
      if (window.cortexAPI?.startExport) {
        await window.cortexAPI.startExport({
          outputPath: targetPath,
          width,
          height,
          fps,
          aspectRatio,
          totalDuration,
          tracks
        });

        if (unsubscribeProgress) unsubscribeProgress();
        setProgress(100);
        setExportedFilePath(targetPath);
        setIsExporting(false);
      } else {
        // Simulación visual si se ejecuta en navegador
        let cur = 0;
        const interval = setInterval(() => {
          cur += 10;
          setProgress(cur);
          if (cur >= 100) {
            clearInterval(interval);
            setIsExporting(false);
            setExportedFilePath(targetPath);
          }
        }, 200);
      }
    } catch (err) {
      console.error('Error en exportación nativa:', err);
      setErrorMsg(err.message || 'Error al exportar video');
      setIsExporting(false);
    }
  };

  const handleOpenFolder = () => {
    if (exportedFilePath && window.cortexAPI?.openInFolder) {
      window.cortexAPI.openInFolder(exportedFilePath);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#18181d] border border-[#2c2c38] rounded-2xl p-6 shadow-2xl relative select-none">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#292934] mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-teal-400 flex items-center justify-center text-black shadow-md font-bold">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Exportar Video MP4</h3>
              <p className="text-[11px] text-gray-400">Renderizado de alta calidad con FFmpeg</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 rounded-lg hover:bg-[#25252f] text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido / Opciones */}
        {!exportedFilePath ? (
          <div className="space-y-4 text-xs">
            {/* Indicador de aceleración por GPU */}
            {gpuInfo && (
              <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-950/40 to-teal-950/20 border border-emerald-500/30 text-emerald-300 shadow-sm">
                <Zap className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-pulse" />
                <div className="truncate">
                  <span className="font-bold">Aceleración por Hardware: </span>
                  <span className="text-gray-200">{gpuInfo.name}</span>
                </div>
              </div>
            )}

            {/* Nombre del archivo */}
            <div>
              <label className="block font-semibold text-gray-300 mb-1.5">Nombre del archivo</label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                disabled={isExporting}
                className="w-full bg-[#202028] border border-[#30303e] rounded-lg p-2.5 text-white outline-none"
              />
            </div>

            {/* Resolución y FPS */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-300 mb-1.5">Resolución</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  disabled={isExporting}
                  className="w-full bg-[#202028] border border-[#30303e] rounded-lg p-2 text-white outline-none"
                >
                  <option value="1080p">1080p (Full HD)</option>
                  <option value="720p">720p (HD)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1.5">Cuadros (FPS)</label>
                <select
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  disabled={isExporting}
                  className="w-full bg-[#202028] border border-[#30303e] rounded-lg p-2 text-white outline-none"
                >
                  <option value={30}>30 FPS (Estándar)</option>
                  <option value={60}>60 FPS (Ultra Suave)</option>
                </select>
              </div>
            </div>

            {/* Info del proyecto */}
            <div className="bg-[#141418] p-3 rounded-xl border border-[#272733] space-y-1.5 text-gray-400">
              <div className="flex justify-between">
                <span>Duración estimada:</span>
                <span className="font-mono text-white">{formatDuration(totalDuration)}</span>
              </div>
              <div className="flex justify-between">
                <span>Relación de aspecto:</span>
                <span className="font-mono text-cyan-400">{aspectRatio}</span>
              </div>
              <div className="flex justify-between">
                <span>Códec de video:</span>
                <span className="font-mono text-white">H.264 / AAC (MP4)</span>
              </div>
            </div>

            {/* Barra de progreso */}
            {isExporting && (
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-cyan-400 flex items-center space-x-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Renderizando con FFmpeg...</span>
                  </span>
                  <span className="font-mono text-white">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-[#252533] rounded-full overflow-hidden">
                  <div
                    style={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-150"
                  />
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-[11px]">
                {errorMsg}
              </div>
            )}
          </div>
        ) : (
          /* Pantalla de éxito */
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
            <CheckCircle2 className="w-14 h-14 text-emerald-400" />
            <h4 className="text-base font-bold text-white">¡Video Exportado con Éxito!</h4>
            <p className="text-xs text-gray-400 font-mono max-w-xs truncate" title={exportedFilePath}>
              {exportedFilePath}
            </p>
            <button
              onClick={handleOpenFolder}
              className="mt-2 px-4 py-2 bg-[#252533] hover:bg-[#323244] text-cyan-400 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <Folder className="w-4 h-4" />
              <span>Abrir Carpeta de Destino</span>
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 rounded-lg bg-[#22222a] hover:bg-[#2b2b35] text-gray-300 text-xs font-medium transition-colors"
          >
            {exportedFilePath ? 'Cerrar' : 'Cancelar'}
          </button>
          {!exportedFilePath && (
            <button
              onClick={handleStartExport}
              disabled={isExporting}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-black text-xs font-bold transition-all shadow-md shadow-cyan-500/20 flex items-center space-x-2 disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Exportando {progress}%</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Iniciar Exportación</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
