import React, { useState, memo } from 'react';
import { 
  Sliders, 
  Type, 
  Film, 
  Music, 
  Image as ImageIcon, 
  Sparkles,
  Sun,
  Eye,
  Clock,
  Zap,
  RotateCw,
  Palette,
  Volume2,
  VolumeX,
  Gauge,
  Move,
  ArrowDown
} from 'lucide-react';
import { formatDuration } from '../utils/timeFormat';
import { ANIMATION_LIST } from '../utils/animations';
import { VIRAL_FONTS, BACKGROUND_PRESETS } from '../utils/presets';

function PropertiesPanel({
  selectedClipId,
  tracks,
  setTracks,
  totalDuration,
  aspectRatio
}) {
  const [activeTab, setActiveTab] = useState('basic'); // 'basic', 'animation', 'filter'

  // Buscar clip seleccionado
  let selectedClip = null;
  let parentTrackId = null;

  for (const track of tracks) {
    const found = track.clips.find((c) => c.id === selectedClipId);
    if (found) {
      selectedClip = found;
      parentTrackId = track.id;
      break;
    }
  }

  const updateSelected = (fields) => {
    if (!selectedClipId || !parentTrackId) return;
    setTracks((prevTracks) =>
      prevTracks.map((t) => {
        if (t.id !== parentTrackId) return t;
        return {
          ...t,
          clips: t.clips.map((c) => (c.id === selectedClipId ? { ...c, ...fields } : c))
        };
      })
    );
  };

  const updateAllSubtitles = (fields) => {
    setTracks((prevTracks) =>
      prevTracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) =>
          c.type === 'text' && c.isSubtitle ? { ...c, ...fields } : c
        )
      }))
    );
  };

  const clipType = selectedClip?.type;
  const isVisual = clipType === 'video' || clipType === 'image' || clipType === 'text';

  return (
    <div className="w-80 h-full bg-[#16161a] border-l border-[#24242c] flex flex-col select-none text-xs">
      {/* Header */}
      <div className="p-3 border-b border-[#24242c] flex items-center justify-between">
        <div className="flex items-center space-x-2 text-gray-200 font-bold uppercase tracking-wider text-[11px]">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>Propiedades</span>
        </div>

        {selectedClip && isVisual && (
          <div className="flex bg-[#202028] p-0.5 rounded-lg border border-[#2e2e3a]">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                activeTab === 'basic' ? 'bg-cyan-500 text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Básico
            </button>
            <button
              onClick={() => setActiveTab('animation')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center space-x-1 transition-colors ${
                activeTab === 'animation' ? 'bg-cyan-500 text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Animar</span>
            </button>
            {(clipType === 'video' || clipType === 'image') && (
              <button
                onClick={() => setActiveTab('filter')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                  activeTab === 'filter' ? 'bg-cyan-500 text-black shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                Filtros
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!selectedClip ? (
          /* Sin selección */
          <div className="space-y-4 text-gray-400">
            <div className="bg-[#1c1c23] p-3.5 rounded-xl border border-[#272733] space-y-2.5">
              <h4 className="font-semibold text-gray-200">Ajustes del Proyecto</h4>
              <div className="flex justify-between">
                <span>Formato:</span>
                <span className="font-mono text-cyan-400 font-bold">{aspectRatio}</span>
              </div>
              <div className="flex justify-between">
                <span>Duración total:</span>
                <span className="font-mono text-white">{formatDuration(totalDuration)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total de Pistas:</span>
                <span className="text-white">{tracks.length}</span>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 text-center px-2">
              Haz clic sobre cualquier video, imagen o texto en la línea de tiempo para configurarlo o añadirle animaciones.
            </p>
          </div>
        ) : activeTab === 'animation' && isVisual ? (
          /* ============================================================ */
          /* PESTAÑA DE ANIMACIONES (ENTRADA Y SALIDA TIPO CAPCUT)        */
          /* ============================================================ */
          <div className="space-y-5">
            {/* 1. ANIMACIÓN DE ENTRADA (IN) */}
            <div className="bg-[#1a1a22] p-3.5 rounded-xl border border-[#292938] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-400 text-xs flex items-center space-x-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Animación de Entrada (In)</span>
                </span>
                <span className="text-[10px] uppercase font-mono text-gray-400">
                  {selectedClip.animIn || 'none'}
                </span>
              </div>

              {/* Selector de Animaciones */}
              <select
                value={selectedClip.animIn || 'none'}
                onChange={(e) => updateSelected({ animIn: e.target.value })}
                className="w-full bg-[#22222d] border border-[#323244] focus:border-cyan-400 rounded-lg p-2 text-white font-medium outline-none text-xs"
              >
                {ANIMATION_LIST.map((anim) => (
                  <option key={anim.id} value={anim.id}>
                    {anim.name}
                  </option>
                ))}
              </select>

              {/* Duración de Entrada */}
              {selectedClip.animIn && selectedClip.animIn !== 'none' && (
                <div>
                  <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                    <span>Duración de Entrada</span>
                    <span className="font-mono text-cyan-400 font-bold">
                      {(selectedClip.animInDuration ?? 0.6).toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max={Math.min(2.0, (selectedClip.duration / 2) || 1.0)}
                    step="0.1"
                    value={selectedClip.animInDuration ?? 0.6}
                    onChange={(e) => updateSelected({ animInDuration: Number(e.target.value) })}
                    className="w-full h-1.5 bg-[#282835] rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              )}
            </div>

            {/* 2. ANIMACIÓN DE SALIDA (OUT) */}
            <div className="bg-[#1a1a22] p-3.5 rounded-xl border border-[#292938] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-pink-400 text-xs flex items-center space-x-1.5">
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Animación de Salida (Out)</span>
                </span>
                <span className="text-[10px] uppercase font-mono text-gray-400">
                  {selectedClip.animOut || 'none'}
                </span>
              </div>

              <select
                value={selectedClip.animOut || 'none'}
                onChange={(e) => updateSelected({ animOut: e.target.value })}
                className="w-full bg-[#22222d] border border-[#323244] focus:border-pink-400 rounded-lg p-2 text-white font-medium outline-none text-xs"
              >
                {ANIMATION_LIST.map((anim) => (
                  <option key={anim.id} value={anim.id}>
                    {anim.name}
                  </option>
                ))}
              </select>

              {/* Duración de Salida */}
              {selectedClip.animOut && selectedClip.animOut !== 'none' && (
                <div>
                  <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                    <span>Duración de Salida</span>
                    <span className="font-mono text-pink-400 font-bold">
                      {(selectedClip.animOutDuration ?? 0.6).toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max={Math.min(2.0, (selectedClip.duration / 2) || 1.0)}
                    step="0.1"
                    value={selectedClip.animOutDuration ?? 0.6}
                    onChange={(e) => updateSelected({ animOutDuration: Number(e.target.value) })}
                    className="w-full h-1.5 bg-[#282835] rounded appearance-none cursor-pointer accent-pink-400"
                  />
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'filter' && (clipType === 'video' || clipType === 'image') ? (
          /* ============================================================ */
          /* PESTAÑA DE FILTROS & COLOR                                   */
          /* ============================================================ */
          <div className="space-y-4">
            <div className="bg-[#1a1a22] p-3.5 rounded-xl border border-[#292938] space-y-3">
              <h4 className="font-bold text-gray-200 text-xs flex items-center space-x-1.5">
                <Sun className="w-3.5 h-3.5 text-yellow-400" />
                <span>Ajustes de Imagen / Video</span>
              </h4>

              {/* Brillo */}
              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Brillo</span>
                  <span className="font-mono text-cyan-400">
                    {Math.round((selectedClip.brightness ?? 1) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.8"
                  step="0.05"
                  value={selectedClip.brightness ?? 1}
                  onChange={(e) => updateSelected({ brightness: Number(e.target.value) })}
                  className="w-full h-1.5 bg-[#282835] rounded appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Contraste */}
              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Contraste</span>
                  <span className="font-mono text-cyan-400">
                    {Math.round((selectedClip.contrast ?? 1) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.8"
                  step="0.05"
                  value={selectedClip.contrast ?? 1}
                  onChange={(e) => updateSelected({ contrast: Number(e.target.value) })}
                  className="w-full h-1.5 bg-[#282835] rounded appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Saturación */}
              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Saturación de Color</span>
                  <span className="font-mono text-cyan-400">
                    {Math.round((selectedClip.saturate ?? 1) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2.5"
                  step="0.05"
                  value={selectedClip.saturate ?? 1}
                  onChange={(e) => updateSelected({ saturate: Number(e.target.value) })}
                  className="w-full h-1.5 bg-[#282835] rounded appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>
          </div>
        ) : clipType === 'text' ? (
          /* ============================================================ */
          /* PESTAÑA BÁSICA DE TEXTO / SUBTÍTULOS                         */
          /* ============================================================ */
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-purple-400 font-bold mb-2">
              <Type className="w-4 h-4" />
              <span>Editar Texto</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                Texto en pantalla
              </label>
              <textarea
                rows={3}
                value={selectedClip.text || ''}
                onChange={(e) => updateSelected({ text: e.target.value })}
                className="w-full bg-[#1f1f27] border border-[#2e2e3d] focus:border-cyan-500 rounded-lg p-2.5 text-white font-medium outline-none resize-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 mb-1">
                <span>Tamaño de fuente</span>
                <div className="flex items-center space-x-1 bg-[#1a1a22] border border-[#2e2e3d] focus-within:border-cyan-400 rounded px-1.5 py-0.5">
                  <input
                    type="number"
                    min="12"
                    max="150"
                    step="1"
                    value={selectedClip.fontSize || 40}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!isNaN(val) && val >= 10) {
                        updateSelected({ fontSize: val });
                      }
                    }}
                    className="w-10 bg-transparent text-right font-mono text-cyan-400 text-xs outline-none font-bold"
                  />
                  <span className="text-[10px] text-gray-500 font-mono">px</span>
                </div>
              </div>
              <input
                type="range"
                min="16"
                max="120"
                value={selectedClip.fontSize || 40}
                onChange={(e) => updateSelected({ fontSize: Number(e.target.value) })}
                className="w-full h-1.5 bg-[#282835] rounded appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 mb-1">
                <span>Posición Vertical (Altura)</span>
                <div className="flex items-center space-x-1 bg-[#1a1a22] border border-[#2e2e3d] focus-within:border-cyan-400 rounded px-1.5 py-0.5">
                  <input
                    type="number"
                    min="10"
                    max="95"
                    step="1"
                    value={Math.round(selectedClip.positionY !== undefined ? selectedClip.positionY : 87)}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!isNaN(val) && val >= 10 && val <= 95) {
                        updateSelected({ positionY: val });
                      }
                    }}
                    className="w-10 bg-transparent text-right font-mono text-cyan-400 text-xs outline-none font-bold"
                  />
                  <span className="text-[10px] text-gray-500 font-mono">%</span>
                </div>
              </div>
              <input
                type="range"
                min="10"
                max="95"
                value={selectedClip.positionY !== undefined ? selectedClip.positionY : 87}
                onChange={(e) => updateSelected({ positionY: Number(e.target.value) })}
                className="w-full h-1.5 bg-[#282835] rounded appearance-none cursor-pointer accent-cyan-400"
              />

              {/* Presets rápidos de altura */}
              <div className="grid grid-cols-3 gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => updateSelected({ positionY: 82 })}
                  className={`py-1 px-1.5 rounded text-[10px] font-medium border transition-colors ${
                    (selectedClip.positionY || 87) === 82
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-[#1e1e27] hover:bg-[#282835] border-[#2e2e3d] text-gray-400 hover:text-white'
                  }`}
                  title="Posición clásica un poco más arriba"
                >
                  82% Clásico
                </button>
                <button
                  type="button"
                  onClick={() => updateSelected({ positionY: 87 })}
                  className={`py-1 px-1.5 rounded text-[10px] font-semibold border transition-colors ${
                    (selectedClip.positionY || 87) === 87
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400/50'
                      : 'bg-[#1e1e27] hover:bg-[#282835] border-[#2e2e3d] text-gray-300 hover:text-white'
                  }`}
                  title="Recomendado: un poco más abajo estilo TikTok / Reels"
                >
                  87% Abajo
                </button>
                <button
                  type="button"
                  onClick={() => updateSelected({ positionY: 91 })}
                  className={`py-1 px-1.5 rounded text-[10px] font-medium border transition-colors ${
                    (selectedClip.positionY || 87) === 91
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-[#1e1e27] hover:bg-[#282835] border-[#2e2e3d] text-gray-400 hover:text-white'
                  }`}
                  title="Muy abajo pegado al borde inferior"
                >
                  91% Fondo
                </button>
              </div>

              {selectedClip.isSubtitle && (
                <button
                  type="button"
                  onClick={() => updateAllSubtitles({ positionY: selectedClip.positionY !== undefined ? selectedClip.positionY : 87 })}
                  className="w-full mt-2 py-1.5 px-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 rounded-lg text-[10px] font-semibold transition-all flex items-center justify-center space-x-1.5"
                  title="Mover todos los subtítulos del video a esta misma posición vertical"
                >
                  <ArrowDown className="w-3 h-3 text-cyan-400" />
                  <span>Aplicar Altura ({selectedClip.positionY !== undefined ? selectedClip.positionY : 87}%) a Todos los Subtítulos</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Color Base</label>
                <div className="flex items-center space-x-2 bg-[#1f1f27] p-1.5 rounded-lg border border-[#2e2e3d]">
                  <input
                    type="color"
                    value={selectedClip.color || '#FFFFFF'}
                    onChange={(e) => updateSelected({ color: e.target.value })}
                    className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                  />
                  <span className="font-mono text-[10px] uppercase text-gray-300">
                    {selectedClip.color || '#FFFFFF'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-cyan-400 mb-1">Palabra Activa</label>
                <div className="flex items-center space-x-2 bg-[#1f1f27] p-1.5 rounded-lg border border-[#2e2e3d]">
                  <input
                    type="color"
                    value={selectedClip.highlightColor || '#00E5FF'}
                    onChange={(e) => updateSelected({ highlightColor: e.target.value, karaoke: true })}
                    className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                  />
                  <span className="font-mono text-[10px] uppercase text-cyan-400 font-bold">
                    {selectedClip.highlightColor || '#00E5FF'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-gray-300">Estilo de Fondo</label>
                <button
                  type="button"
                  onClick={() => updateSelected({
                    bgColor: 'transparent',
                    color: '#FFFFFF',
                    strokeColor: '#000000',
                    strokeWidth: 5
                  })}
                  className="text-[10px] text-cyan-400 hover:underline"
                >
                  Quitar Fondo
                </button>
              </div>

              {/* Botones rápidos de fondo */}
              <div className="grid grid-cols-3 gap-1.5">
                {BACKGROUND_PRESETS.map((bp) => {
                  const isTransparentMatch = bp.value === 'transparent' && (!selectedClip.bgColor || selectedClip.bgColor === 'transparent');
                  const isColorMatch = selectedClip.bgColor === bp.value;
                  const isActive = isTransparentMatch || isColorMatch;

                  return (
                    <button
                      key={bp.id}
                      type="button"
                      onClick={() => updateSelected({
                        bgColor: bp.value,
                        color: bp.defaultTextColor,
                        strokeColor: bp.strokeColor,
                        strokeWidth: bp.strokeWidth
                      })}
                      className={`px-2 py-1.5 rounded-lg border text-[10px] font-semibold transition-all flex items-center justify-center space-x-1.5 truncate ${
                        isActive
                          ? 'border-cyan-400 bg-cyan-500/20 text-white ring-1 ring-cyan-400/50'
                          : 'bg-[#1f1f27] border-[#2e2e3d] text-gray-300 hover:bg-[#282833]'
                      }`}
                      title={bp.name}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-white/20 flex-shrink-0"
                        style={{ backgroundColor: bp.value === 'transparent' ? '#222' : bp.value }}
                      />
                      <span className="truncate">{bp.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Color de Fondo Libre</label>
                  <div className="flex items-center space-x-2 bg-[#1f1f27] p-1.5 rounded-lg border border-[#2e2e3d]">
                    <input
                      type="color"
                      value={
                        selectedClip.bgColor && selectedClip.bgColor !== 'transparent' && selectedClip.bgColor.startsWith('#')
                          ? selectedClip.bgColor
                          : '#000000'
                      }
                      onChange={(e) => updateSelected({ bgColor: e.target.value })}
                      className="w-5 h-5 rounded border-0 cursor-pointer bg-transparent"
                    />
                    <span className="font-mono text-[9px] uppercase text-gray-300 truncate">
                      {selectedClip.bgColor || 'Sin fondo'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Modo Karaoke</label>
                  <button
                    onClick={() => updateSelected({ karaoke: !selectedClip.karaoke })}
                    className={`w-full py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                      selectedClip.karaoke || selectedClip.isSubtitle
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400'
                        : 'bg-[#1f1f27] border-[#2e2e3d] text-gray-400'
                    }`}
                  >
                    {selectedClip.karaoke || selectedClip.isSubtitle ? 'Activo' : 'Inactivo'}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1">Tipografía Viral</label>
              <select
                value={selectedClip.fontFamily || 'Montserrat, sans-serif'}
                onChange={(e) => updateSelected({ fontFamily: e.target.value })}
                className="w-full bg-[#1f1f27] border border-[#2e2e3d] focus:border-cyan-400 rounded-lg p-2 text-white outline-none text-xs"
              >
                {VIRAL_FONTS.map((font) => (
                  <option key={font.id} value={font.id}>
                    {font.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-semibold text-gray-400">Estilo de Texto</span>
              <button
                type="button"
                onClick={() => updateSelected({ uppercase: !selectedClip.uppercase })}
                className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                  selectedClip.uppercase
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400'
                    : 'bg-[#1f1f27] border-[#2e2e3d] text-gray-400 hover:text-white'
                }`}
              >
                {selectedClip.uppercase ? 'AA MAYÚSCULAS' : 'Aa Normal'}
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* PESTAÑA BÁSICA DE VIDEO / IMAGEN / AUDIO                     */
          /* ============================================================ */
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-cyan-400 font-bold mb-2">
              {clipType === 'video' ? (
                <Film className="w-4 h-4" />
              ) : clipType === 'image' ? (
                <ImageIcon className="w-4 h-4 text-teal-400" />
              ) : (
                <Music className="w-4 h-4 text-pink-400" />
              )}
              <span className="truncate">{selectedClip.name}</span>
            </div>

            {(clipType === 'video' || clipType === 'image') && (
              <div className="space-y-3 bg-[#1a1a22] p-3 rounded-xl border border-[#292938]">
                <span className="font-bold text-gray-200 text-xs flex items-center space-x-1.5">
                  <Move className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Transformación Visual</span>
                </span>

                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 mb-1">
                    <span className="flex items-center space-x-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Opacidad</span>
                    </span>
                    <div className="flex items-center space-x-1 bg-[#1a1a22] border border-[#2e2e3d] focus-within:border-cyan-400 rounded px-1.5 py-0.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={Math.round((selectedClip.opacity !== undefined ? selectedClip.opacity : 1) * 100)}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (!isNaN(val)) {
                            updateSelected({ opacity: Math.max(0, Math.min(1, val / 100)) });
                          }
                        }}
                        className="w-10 bg-transparent text-right font-mono text-cyan-400 text-xs outline-none font-bold"
                      />
                      <span className="text-[10px] text-gray-500 font-mono">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedClip.opacity !== undefined ? selectedClip.opacity : 1}
                    onChange={(e) => updateSelected({ opacity: Number(e.target.value) })}
                    className="w-full h-1.5 bg-[#282835] rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 mb-1">
                    <span>Escala (Zoom)</span>
                    <div className="flex items-center space-x-1 bg-[#1a1a22] border border-[#2e2e3d] focus-within:border-cyan-400 rounded px-1.5 py-0.5">
                      <input
                        type="number"
                        min="5"
                        max="400"
                        step="1"
                        value={Math.round((selectedClip.scale !== undefined ? selectedClip.scale : 1) * 100)}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (!isNaN(val) && val >= 1) {
                            updateSelected({ scale: Math.max(0.05, Math.min(4.0, val / 100)) });
                          }
                        }}
                        className="w-12 bg-transparent text-right font-mono text-cyan-400 text-xs outline-none font-bold"
                      />
                      <span className="text-[10px] text-gray-500 font-mono">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="3.0"
                    step="0.01"
                    value={selectedClip.scale !== undefined ? selectedClip.scale : 1}
                    onChange={(e) => updateSelected({ scale: Number(e.target.value) })}
                    className="w-full h-1.5 bg-[#282835] rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                      <span>Pos X</span>
                      <div className="flex items-center space-x-0.5 bg-[#1a1a22] border border-[#2e2e3d] focus-within:border-cyan-400 rounded px-1 py-0.5">
                        <input
                          type="number"
                          min="-100"
                          max="100"
                          step="1"
                          value={Math.round(selectedClip.posX || 0)}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (!isNaN(val)) updateSelected({ posX: val });
                          }}
                          className="w-9 bg-transparent text-right font-mono text-cyan-400 text-[10px] outline-none font-bold"
                        />
                        <span className="text-[9px] text-gray-500 font-mono">%</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="-70"
                      max="70"
                      step="1"
                      value={selectedClip.posX || 0}
                      onChange={(e) => updateSelected({ posX: Number(e.target.value) })}
                      className="w-full h-1.5 bg-[#282835] rounded appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                      <span>Pos Y</span>
                      <div className="flex items-center space-x-0.5 bg-[#1a1a22] border border-[#2e2e3d] focus-within:border-cyan-400 rounded px-1 py-0.5">
                        <input
                          type="number"
                          min="-100"
                          max="100"
                          step="1"
                          value={Math.round(selectedClip.posY || 0)}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (!isNaN(val)) updateSelected({ posY: val });
                          }}
                          className="w-9 bg-transparent text-right font-mono text-cyan-400 text-[10px] outline-none font-bold"
                        />
                        <span className="text-[9px] text-gray-500 font-mono">%</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="-70"
                      max="70"
                      step="1"
                      value={selectedClip.posY || 0}
                      onChange={(e) => updateSelected({ posY: Number(e.target.value) })}
                      className="w-full h-1.5 bg-[#282835] rounded appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                </div>

                {clipType === 'image' && (
                  <div className="space-y-2 pt-2 border-t border-[#292938]">
                    <div className="text-[10px] text-gray-400 font-semibold flex items-center justify-between">
                      <span>Presets de Superposición</span>
                      <span className="text-[9px] text-cyan-400 font-mono">1-Clic</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateSelected({ scale: 0.45, posX: 0, posY: 0 })}
                        className="px-2 py-1.5 rounded-lg bg-[#22222c] hover:bg-[#2b2b38] border border-[#303040] text-cyan-300 text-[10px] font-medium transition-colors"
                        title="Tamaño moderado en el centro sin tapar todo el video"
                      >
                        Centro 45%
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSelected({ scale: 1.0, posX: 0, posY: 0 })}
                        className="px-2 py-1.5 rounded-lg bg-[#22222c] hover:bg-[#2b2b38] border border-[#303040] text-gray-300 hover:text-white text-[10px] font-medium transition-colors"
                        title="Ocupar toda la pantalla"
                      >
                        Pantalla Completa
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSelected({ scale: 0.25, posX: 35, posY: -35 })}
                        className="px-2 py-1.5 rounded-lg bg-[#22222c] hover:bg-[#2b2b38] border border-[#303040] text-gray-300 hover:text-white text-[10px] font-medium transition-colors"
                        title="Marca de agua en esquina superior derecha"
                      >
                        ↗ Logo Arriba Der
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSelected({ scale: 0.25, posX: -35, posY: -35 })}
                        className="px-2 py-1.5 rounded-lg bg-[#22222c] hover:bg-[#2b2b38] border border-[#303040] text-gray-300 hover:text-white text-[10px] font-medium transition-colors"
                        title="Marca de agua en esquina superior izquierda"
                      >
                        ↖ Logo Arriba Izq
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        let maxVideoDur = 0;
                        tracks.forEach((t) =>
                          t.clips.forEach((c) => {
                            if (c.type === 'video' || c.type === 'audio') {
                              maxVideoDur = Math.max(maxVideoDur, c.start + c.duration);
                            }
                          })
                        );
                        const targetDur = maxVideoDur > 0 ? maxVideoDur : totalDuration;
                        updateSelected({ start: 0, duration: Math.max(5, targetDur) });
                      }}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-[10px] font-semibold transition-colors flex items-center justify-center space-x-1"
                    >
                      <Clock className="w-3 h-3" />
                      <span>Extender a Todo el Video ({Math.round(totalDuration)}s)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {(clipType === 'audio' || clipType === 'video') && (
              <div className="space-y-3 bg-[#1a1a22] p-3 rounded-xl border border-[#292938]">
                <span className="font-bold text-gray-200 text-xs flex items-center space-x-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-pink-400" />
                  <span>Ajustes de Sonido</span>
                </span>

                <div>
                  <div className="flex justify-between items-center text-[11px] font-semibold text-gray-400 mb-1">
                    <div className="flex items-center space-x-1.5">
                      <span>Volumen</span>
                      <button
                        type="button"
                        onClick={() => updateSelected({ muted: !selectedClip.muted })}
                        title={selectedClip.muted ? 'Activar sonido del clip' : 'Silenciar este clip'}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors flex items-center space-x-1 ${
                          selectedClip.muted || (selectedClip.volume !== undefined && selectedClip.volume <= 0.005)
                            ? 'bg-red-500/20 border-red-500/40 text-red-400'
                            : 'bg-[#252532] border-[#353545] text-gray-400 hover:text-white'
                        }`}
                      >
                        {selectedClip.muted || (selectedClip.volume !== undefined && selectedClip.volume <= 0.005) ? (
                          <VolumeX className="w-2.5 h-2.5" />
                        ) : (
                          <Volume2 className="w-2.5 h-2.5" />
                        )}
                        <span>{selectedClip.muted || (selectedClip.volume !== undefined && selectedClip.volume <= 0.005) ? 'Silenciado' : 'Mute'}</span>
                      </button>
                    </div>
                    <span className="font-mono text-pink-400">
                      {selectedClip.muted ? '0%' : `${Math.round((selectedClip.volume !== undefined ? selectedClip.volume : 1) * 100)}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    disabled={selectedClip.muted}
                    value={selectedClip.muted ? 0 : (selectedClip.volume !== undefined ? selectedClip.volume : 1)}
                    onChange={(e) => updateSelected({ volume: Number(e.target.value), muted: Number(e.target.value) === 0 })}
                    className="w-full h-1.5 bg-[#282835] rounded appearance-none cursor-pointer accent-pink-400 disabled:opacity-40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                      <span>Fade In</span>
                      <span className="font-mono text-pink-400">{selectedClip.fadeIn || 0}s</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.5"
                      value={selectedClip.fadeIn || 0}
                      onChange={(e) => updateSelected({ fadeIn: Number(e.target.value) })}
                      className="w-full h-1.5 bg-[#282835] rounded appearance-none cursor-pointer accent-pink-400"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                      <span>Fade Out</span>
                      <span className="font-mono text-pink-400">{selectedClip.fadeOut || 0}s</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.5"
                      value={selectedClip.fadeOut || 0}
                      onChange={(e) => updateSelected({ fadeOut: Number(e.target.value) })}
                      className="w-full h-1.5 bg-[#282835] rounded appearance-none cursor-pointer accent-pink-400"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-gray-400 mb-1.5">
                    <span className="flex items-center space-x-1">
                      <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Velocidad de reproducción</span>
                    </span>
                    <span className="font-mono text-cyan-400 font-bold">{selectedClip.speed || 1}x</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {[0.5, 0.75, 1, 1.25, 1.5].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => updateSelected({ speed: spd })}
                        className={`py-1 rounded text-[10px] font-bold border transition-colors ${
                          (selectedClip.speed || 1) === spd
                            ? 'bg-cyan-500 text-black border-cyan-400'
                            : 'bg-[#22222d] text-gray-400 border-[#323244] hover:text-white'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-[#1c1c23] p-2.5 rounded-lg border border-[#272733] space-y-1.5 text-gray-400">
              <div className="flex justify-between">
                <span>Inicio:</span>
                <span className="font-mono text-white">{selectedClip.start.toFixed(2)}s</span>
              </div>
              <div className="flex justify-between">
                <span>Duración:</span>
                <span className="font-mono text-white">{selectedClip.duration.toFixed(2)}s</span>
              </div>
              {selectedClip.offset !== undefined && (
                <div className="flex justify-between">
                  <span>Corte interno (Offset):</span>
                  <span className="font-mono text-white">{selectedClip.offset.toFixed(2)}s</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(PropertiesPanel);
