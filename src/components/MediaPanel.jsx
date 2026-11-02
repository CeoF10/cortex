import React, { useState, useMemo, memo } from 'react';
import { 
  FolderPlus, 
  Film, 
  Image as ImageIcon, 
  Music, 
  Plus, 
  Trash2, 
  Type, 
  Sparkles,
  Search,
  Clock,
  Check,
  Palette,
  Sliders
} from 'lucide-react';
import { formatDuration } from '../utils/timeFormat';
import { TEXT_PRESETS, SUBTITLE_THEMES, SUBTITLE_BG_MODES } from '../utils/presets';

function MediaPanel({
  activeTab,
  setActiveTab,
  mediaPool,
  onImportFiles,
  onAddMediaToTimeline,
  onAddTextToTimeline,
  onDeleteMedia,
  subtitles,
  onOpenAutoSubtitles,
  onSelectSubtitle,
  onApplySubtitleTheme,
  activeThemeId,
  activeBgMode = 'black',
  onChangeBgMode,
  activeSubtitleId
}) {
  const [mediaFilter, setMediaFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMedia = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return mediaPool.filter((item) => {
      if (mediaFilter !== 'all' && item.type !== mediaFilter) return false;
      if (query && !item.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [mediaPool, mediaFilter, searchQuery]);

  return (
    <div className="studio-media w-80 h-full bg-[#16161a] border-r border-[#24242c] flex flex-col select-none">
      {/* Top tabs */}
      <div className="flex border-b border-[#24242c] bg-[#121215]">
        <button
          onClick={() => setActiveTab('media')}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors border-b-2 ${
            activeTab === 'media'
              ? 'text-cyan-400 border-cyan-400 bg-[#16161a]'
              : 'text-gray-400 border-transparent hover:text-gray-200'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Medios ({mediaPool.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors border-b-2 ${
            activeTab === 'text'
              ? 'text-cyan-400 border-cyan-400 bg-[#16161a]'
              : 'text-gray-400 border-transparent hover:text-gray-200'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Texto</span>
        </button>
        <button
          onClick={() => setActiveTab('subtitles')}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors border-b-2 ${
            activeTab === 'subtitles'
              ? 'text-cyan-400 border-cyan-400 bg-[#16161a]'
              : 'text-gray-400 border-transparent hover:text-gray-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-gray-300" />
          <span>Subtítulos</span>
        </button>
      </div>

      {/* Tab 1: MEDIA POOL */}
      {activeTab === 'media' && (
        <div className="flex-1 flex flex-col p-3 overflow-hidden">
          <button
            onClick={onImportFiles}
            className="w-full py-2.5 px-3 bg-[#202028] hover:bg-[#282833] border border-dashed border-[#3c3c4a] hover:border-cyan-500 rounded-xl flex items-center justify-center space-x-2 text-xs font-medium text-gray-200 hover:text-cyan-400 transition-all shadow-sm group mb-3"
          >
            <FolderPlus className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>Importar</span>
          </button>

          <div className="flex items-center space-x-1 mb-2 bg-[#1b1b22] p-1 rounded-lg border border-[#2b2b35]">
            <button
              onClick={() => setMediaFilter('all')}
              className={`flex-1 py-1 text-[11px] font-medium rounded transition-colors ${
                mediaFilter === 'all' ? 'bg-[#2b2b35] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setMediaFilter('video')}
              className={`flex-1 py-1 text-[11px] font-medium rounded transition-colors ${
                mediaFilter === 'video' ? 'bg-[#2b2b35] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Videos
            </button>
            <button
              onClick={() => setMediaFilter('image')}
              className={`flex-1 py-1 text-[11px] font-medium rounded transition-colors ${
                mediaFilter === 'image' ? 'bg-[#2b2b35] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Fotos
            </button>
            <button
              onClick={() => setMediaFilter('audio')}
              className={`flex-1 py-1 text-[11px] font-medium rounded transition-colors ${
                mediaFilter === 'audio' ? 'bg-[#2b2b35] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Audios
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {filteredMedia.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-gray-500">
                <FolderPlus className="w-10 h-10 mb-2 opacity-40 text-cyan-400" />
                <p className="text-xs">No hay archivos en la biblioteca</p>
                <p className="text-[10px] text-gray-600 mt-1">Haz clic en Importar para añadir contenido multimedia</p>
              </div>
            ) : (
              filteredMedia.map((item) => (
                <div
                  key={item.id}
                  className="group relative bg-[#1c1c23] hover:bg-[#23232c] border border-[#272733] hover:border-cyan-500/50 rounded-lg p-2 flex items-center space-x-3 transition-all"
                >
                  <div className="w-16 h-12 rounded bg-black/50 overflow-hidden flex-shrink-0 relative flex items-center justify-center border border-white/5">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
                    ) : item.type === 'image' ? (
                      <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                    ) : item.type === 'audio' ? (
                      <Music className="w-6 h-6 text-gray-300 opacity-80" />
                    ) : (
                      <Film className="w-6 h-6 text-cyan-400 opacity-80" />
                    )}

                    {item.duration && (
                      <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-[9px] font-mono px-1 rounded text-white font-medium">
                        {formatDuration(item.duration)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-200 truncate" title={item.name}>
                      {item.name}
                    </p>
                    <p className="text-[10px] text-gray-400 capitalize flex items-center space-x-1 mt-0.5">
                      <span>{item.type}</span>
                    </p>
                  </div>

                  <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={() => onAddMediaToTimeline(item)}
                      title="Añadir a la línea de tiempo (+)"
                      className="p-1.5 rounded-md bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-black transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteMedia(item.id)}
                      title="Eliminar de la biblioteca"
                      className="p-1.5 rounded-md hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: TEXT & PRESETS */}
      {activeTab === 'text' && (
        <div className="flex-1 flex flex-col p-3 overflow-y-auto">
          <div className="mb-3">
            <button
              onClick={() => onAddTextToTimeline()}
              className="w-full py-2.5 px-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 rounded-xl flex items-center justify-center space-x-2 text-xs font-semibold text-cyan-400 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Texto Básico</span>
            </button>
          </div>

          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Plantillas Virales
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {TEXT_PRESETS.map((preset) => (
              <div
                key={preset.id}
                className="bg-[#1c1c23] hover:bg-[#23232c] border border-[#2a2a35] hover:border-cyan-500/50 rounded-lg p-3 cursor-pointer group transition-all"
                onClick={() => onAddTextToTimeline(preset)}
              >
                <div className="h-12 bg-black/40 rounded flex items-center justify-center mb-2 overflow-hidden border border-white/5">
                  <span
                    style={{
                      color: preset.color,
                      fontSize: '16px',
                      fontFamily: preset.fontFamily,
                      backgroundColor: preset.bgColor,
                      padding: preset.bgColor !== 'transparent' ? '2px 8px' : '0',
                      borderRadius: '4px',
                      textShadow: preset.strokeWidth > 0 ? `0 0 4px ${preset.strokeColor}` : 'none'
                    }}
                    className="font-bold tracking-wide"
                  >
                    {preset.text}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-300">{preset.name}</span>
                  <button
                    className="p-1 rounded bg-cyan-500/10 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Añadir al video"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: SUBTITLES & WHISPER + VIRAL HIGHLIGHT THEMES */}
      {activeTab === 'subtitles' && (
        <div className="flex-1 flex flex-col p-3 overflow-hidden">
          <button
            onClick={onOpenAutoSubtitles}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl flex items-center justify-center space-x-2 text-xs font-bold text-white transition-all shadow-md shadow-purple-500/20 mb-3"
          >
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span>Generar Subtítulos con IA</span>
          </button>

          {/* Selector de Modo de Fondo para los Temas */}
          <div className="mb-3 bg-[#191922] p-2 rounded-xl border border-[#2a2a38]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-gray-200 uppercase tracking-wider flex items-center space-x-1.5">
                <Sliders className="w-3 h-3 text-cyan-400" />
                <span>Fondo de Subtítulos</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {SUBTITLE_BG_MODES.map((bg) => {
                const isSelected = activeBgMode === bg.id;
                return (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => onChangeBgMode && onChangeBgMode(bg.id)}
                    className={`px-2 py-1.5 rounded-lg border text-[10px] font-semibold transition-all flex items-center space-x-1.5 ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-white ring-1 ring-cyan-400/50 shadow-sm'
                        : 'bg-[#14141a] hover:bg-[#1e1e28] border-[#292938] text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/20 flex-shrink-0"
                      style={{
                        backgroundColor: bg.iconColor === 'transparent' ? '#111' : bg.iconColor,
                        borderStyle: bg.iconColor === 'transparent' ? 'dashed' : 'solid'
                      }}
                    />
                    <span className="truncate">{bg.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Galería de Temas Virales Originales (Palabra Resaltada) */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Palette className="w-3 h-3 text-cyan-400" />
                <span>Estilos de Subtítulo</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
              {SUBTITLE_THEMES.map((theme) => {
                const isSelected = activeThemeId === theme.id;
                const currentBg = SUBTITLE_BG_MODES.find((b) => b.id === activeBgMode) || SUBTITLE_BG_MODES[0];
                return (
                  <div
                    key={theme.id}
                    onClick={() => onApplySubtitleTheme(theme, activeBgMode)}
                    className={`p-2 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#222230] border-cyan-400 ring-1 ring-cyan-400/50 shadow-md'
                        : 'bg-[#1b1b22] hover:bg-[#202029] border-[#292936]'
                    }`}
                  >
                    {/* Visual Preview con tipografía del tema y el fondo seleccionado */}
                    <div
                      className="h-9 rounded flex items-center justify-center px-1.5 border border-white/10 mb-1.5 overflow-hidden shadow-inner"
                      style={{
                        backgroundColor: currentBg.bgColor !== 'transparent' ? currentBg.bgColor : 'rgba(255, 255, 255, 0.05)',
                        borderStyle: currentBg.bgColor === 'transparent' ? 'dashed' : 'solid'
                      }}
                    >
                      <span
                        className="text-[11px] font-bold tracking-tight flex items-center space-x-1 uppercase"
                        style={{
                          fontFamily: theme.fontFamily,
                          textShadow: currentBg.bgColor === 'transparent' ? '0 1px 3px rgba(0,0,0,0.9), 0 0 2px #000' : 'none'
                        }}
                      >
                        <span style={{ color: theme.highlightColor }}>
                          {theme.previewText?.split(' ')[0] || 'PALABRA'}
                        </span>
                        <span style={{ color: currentBg.baseColor }}>
                          {theme.previewText?.split(' ').slice(1).join(' ') || 'VIRAL'}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-medium text-gray-300">
                      <span className="truncate">{theme.name}</span>
                      {isSelected && <Check className="w-3 h-3 text-cyan-400 flex-shrink-0" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between mb-2 pt-2 border-t border-[#23232d]">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Líneas generadas ({subtitles.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {subtitles.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center text-center p-4 text-gray-500">
                <Sparkles className="w-8 h-8 mb-1 opacity-40 text-gray-300" />
                <p className="text-xs">Sin subtítulos en este proyecto</p>
                <p className="text-[10px] text-gray-600 mt-0.5">
                  Genera subtítulos con IA o añade texto al video.
                </p>
              </div>
            ) : (
              subtitles.map((sub) => {
                const isActive = sub.id === activeSubtitleId;
                return (
                  <div
                    key={sub.id}
                    onClick={() => onSelectSubtitle(sub)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      isActive
                        ? 'bg-purple-950/40 border-purple-500 text-white'
                        : 'bg-[#1c1c23] hover:bg-[#23232c] border-[#292934] text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1 font-mono">
                      <span className="text-purple-400 font-semibold flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDuration(sub.start)} - {formatDuration(sub.start + sub.duration)}</span>
                      </span>
                    </div>
                    <p className="font-medium">{sub.text}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(MediaPanel);
