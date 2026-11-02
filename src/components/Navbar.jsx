import React, { memo } from 'react';
import { 
  Play, 
  Pause, 
  Download, 
  Sparkles, 
  Monitor, 
  Smartphone, 
  Square,
  Undo2,
  Redo2,
  Layers,
  Home,
  Check,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { formatTimecode } from '../utils/timeFormat';

function Navbar({
  projectName,
  setProjectName,
  currentTime,
  totalDuration,
  aspectRatio,
  setAspectRatio,
  onOpenAutoSubtitles,
  onOpenExport,
  onGoHome,
  saveState = 'saved',
  canUndo,
  canRedo,
  onUndo,
  onRedo
}) {
  return (
    <header className="h-14 bg-[#141417] border-b border-[#25252b] flex items-center justify-between px-4 select-none z-20">
      {/* Brand logo & title */}
      <div className="flex items-center space-x-3">
        {/* Botón Home / Proyectos */}
        <button
          onClick={onGoHome}
          title="Volver a la lista de proyectos"
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#202028] hover:bg-[#2b2b35] text-gray-300 hover:text-white border border-[#2d2d3a] text-xs font-semibold transition-colors"
        >
          <Home className="w-3.5 h-3.5 text-cyan-400" />
          <span>Proyectos</span>
        </button>

        <div className="flex items-center space-x-2 pl-2 border-l border-[#2e2e38]">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-teal-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Layers className="w-4 h-4 text-black font-black" />
          </div>
          <span className="font-extrabold text-sm tracking-wider text-white">
            CORTEX
          </span>
        </div>

        {/* Nombre del proyecto editable */}
        <div className="pl-3 border-l border-[#2e2e38] flex items-center space-x-2">
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-transparent border border-transparent hover:border-[#333342] focus:border-cyan-500 rounded px-2 py-1 text-xs font-semibold text-gray-200 outline-none w-44 truncate transition-colors"
            placeholder="Nombre del proyecto..."
            title="Haz clic para renombrar proyecto"
          />

          {/* Botones Deshacer y Rehacer */}
          <div className="flex items-center space-x-1 pl-1 border-l border-[#2e2e38]">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              title="Deshacer (Ctrl+Z)"
              className="p-1 rounded hover:bg-[#25252f] text-gray-400 hover:text-white disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              title="Rehacer (Ctrl+Y)"
              className="p-1 rounded hover:bg-[#25252f] text-gray-400 hover:text-white disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Estado del autoguardado */}
          <div
            className="flex items-center space-x-1 text-[10px] font-medium pl-1"
            title={saveState === 'error' ? 'No se pudo guardar (almacenamiento lleno)' : 'Autoguardado local'}
          >
            {saveState === 'pending' && (
              <>
                <Loader2 className="w-3 h-3 text-gray-500 animate-spin" />
                <span className="text-gray-500">Guardando…</span>
              </>
            )}
            {saveState === 'saved' && (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-gray-500">Guardado</span>
              </>
            )}
            {saveState === 'error' && (
              <>
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span className="text-amber-400">Error al guardar</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Centro: Relación de aspecto & Timecode */}
      <div className="flex items-center space-x-4">
        {/* Selector de aspecto */}
        <div className="flex items-center bg-[#1c1c22] rounded-lg p-0.5 border border-[#2b2b35]">
          <button
            onClick={() => setAspectRatio('16:9')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
              aspectRatio === '16:9'
                ? 'bg-cyan-500 text-black shadow font-bold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Horizontal (16:9 - YouTube / PC)"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>16:9</span>
          </button>
          <button
            onClick={() => setAspectRatio('9:16')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
              aspectRatio === '9:16'
                ? 'bg-cyan-500 text-black shadow font-bold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Vertical (9:16 - TikTok / Reels / Shorts)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>9:16</span>
          </button>
          <button
            onClick={() => setAspectRatio('1:1')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
              aspectRatio === '1:1'
                ? 'bg-cyan-500 text-black shadow font-bold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Cuadrado (1:1 - Instagram Feed)"
          >
            <Square className="w-3.5 h-3.5" />
            <span>1:1</span>
          </button>
        </div>

        {/* Contador de tiempo */}
        <div className="flex items-center space-x-2 bg-[#1c1c22] px-3 py-1 rounded-lg border border-[#2b2b35] font-mono text-xs">
          <span className="text-cyan-400 font-semibold">{formatTimecode(currentTime)}</span>
          <span className="text-gray-500">/</span>
          <span className="text-gray-400">{formatTimecode(totalDuration)}</span>
        </div>
      </div>

      {/* Derecha: Subtítulos IA + Exportar */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenAutoSubtitles}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 text-purple-300 hover:text-purple-100 border border-purple-500/30 text-xs font-medium transition-all shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>Subtítulos IA</span>
        </button>

        <button
          onClick={onOpenExport}
          className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-black text-xs font-bold transition-all shadow-md shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Download className="w-4 h-4" />
          <span>Exportar</span>
        </button>
      </div>
    </header>
  );
}

export default memo(Navbar);
