import React, { useState } from 'react';
import { 
  Plus, 
  FolderOpen, 
  Film, 
  Clock, 
  Trash2, 
  Copy, 
  Smartphone, 
  Monitor, 
  Sparkles,
  Layers,
  Search,
  ExternalLink
} from 'lucide-react';
import { formatDuration } from '../utils/timeFormat';

export default function HomeScreen({
  projects,
  onNewProject,
  onOpenProject,
  onDeleteProject,
  onDuplicateProject
}) {
  const [search, setSearch] = useState('');

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full h-full bg-[#0d0d10] text-gray-100 flex flex-col select-none overflow-y-auto">
      {/* Top Banner / Header */}
      <header className="h-16 border-b border-[#202028] bg-[#121217] flex items-center justify-between px-8">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-teal-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Layers className="w-5 h-5 text-black font-black" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                CORTEX
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                PRO DESKTOP
              </span>
            </div>
          </div>
        </div>

        {/* Búsqueda de proyectos */}
        <div className="flex items-center space-x-2 bg-[#1b1b22] px-3 py-1.5 rounded-xl border border-[#2a2a35] w-72">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar proyecto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-0 outline-none text-xs text-white placeholder-gray-500 w-full"
          />
        </div>
      </header>

      {/* Hero: Crear Nuevo Proyecto */}
      <div className="max-w-6xl w-full mx-auto p-8 space-y-8 flex-1">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-100 flex items-center space-x-2">
            <span>Iniciar Nuevo Proyecto</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tarjeta 1: Proyecto Estándar 16:9 */}
            <div
              onClick={() => onNewProject('16:9')}
              className="group relative bg-gradient-to-b from-[#1b1b24] to-[#15151c] hover:from-[#22222e] hover:to-[#1a1a24] border border-[#2a2a38] hover:border-cyan-400/60 rounded-2xl p-6 cursor-pointer transition-all shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4 text-cyan-400 group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Nuevo Proyecto Horizontal</h3>
              <p className="text-xs text-gray-400 mb-3">Formato 16:9 optimizado para YouTube, PC y pantallas horizontales.</p>
              <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-cyan-400 font-mono">
                <Monitor className="w-3.5 h-3.5" />
                <span>1920 × 1080 (16:9)</span>
              </span>
            </div>

            {/* Tarjeta 2: Proyecto Vertical 9:16 (TikTok / Reels) */}
            <div
              onClick={() => onNewProject('9:16')}
              className="group relative bg-gradient-to-b from-[#1b1b24] to-[#15151c] hover:from-[#22222e] hover:to-[#1a1a24] border border-[#2a2a38] hover:border-pink-500/60 rounded-2xl p-6 cursor-pointer transition-all shadow-lg hover:shadow-pink-500/10 hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center mb-4 text-pink-400 group-hover:scale-110 transition-transform">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Nuevo Proyecto Vertical</h3>
              <p className="text-xs text-gray-400 mb-3">Formato 9:16 perfecto para TikTok, Instagram Reels y YouTube Shorts.</p>
              <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-pink-400 font-mono">
                <Smartphone className="w-3.5 h-3.5" />
                <span>1080 × 1920 (9:16)</span>
              </span>
            </div>

            {/* Tarjeta 3: Subtítulos Automáticos Express */}
            <div
              onClick={() => onNewProject('16:9', true)}
              className="group relative bg-gradient-to-b from-[#1b1b24] to-[#15151c] hover:from-[#22222e] hover:to-[#1a1a24] border border-[#2a2a38] hover:border-purple-500/60 rounded-2xl p-6 cursor-pointer transition-all shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-4 text-purple-400 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Editor con IA Whisper</h3>
              <p className="text-xs text-gray-400 mb-3">Inicia con asistencia de subtitulado automático y transcripción local rápida.</p>
              <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-purple-400 font-mono">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Transcripción con IA</span>
              </span>
            </div>
          </div>
        </div>

        {/* Sección: Proyectos Recientes */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-200">
              Proyectos Recientes ({filteredProjects.length})
            </h3>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="bg-[#141419] border border-dashed border-[#272733] rounded-2xl p-12 text-center text-gray-500 flex flex-col items-center justify-center">
              <Film className="w-12 h-12 mb-3 text-cyan-400/40" />
              <p className="text-sm font-semibold text-gray-400">Aún no tienes proyectos guardados</p>
              <p className="text-xs text-gray-600 mt-1">
                Haz clic en una de las tarjetas de arriba para comenzar a editar tu primer video.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => onOpenProject(project.id)}
                  className="group bg-[#16161c] hover:bg-[#1d1d25] border border-[#262633] hover:border-cyan-500/60 rounded-xl p-4 cursor-pointer transition-all shadow-md relative flex flex-col justify-between"
                >
                  <div>
                    {/* Thumbnail o Preview */}
                    <div className="h-32 bg-black/60 rounded-lg mb-3 overflow-hidden flex items-center justify-center border border-white/5 relative">
                      {project.thumbnail ? (
                        <img
                          src={project.thumbnail}
                          alt={project.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Film className="w-10 h-10 text-cyan-400/50" />
                      )}

                      <span className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-400 font-bold border border-cyan-500/20">
                        {project.aspectRatio || '16:9'}
                      </span>

                      <span className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-white font-medium">
                        {formatDuration(project.totalDuration || 0)}
                      </span>
                    </div>

                    {/* Título e Info */}
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-bold text-gray-100 truncate group-hover:text-cyan-400 transition-colors">
                        {project.name}
                      </h4>
                    </div>

                    <div className="flex items-center space-x-3 text-[11px] text-gray-400 font-mono">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-gray-500" />
                        <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                      </span>
                      <span>•</span>
                      <span>{project.clipCount || 0} clips</span>
                    </div>
                  </div>

                  {/* Acciones de la tarjeta */}
                  <div className="flex items-center justify-end space-x-1 pt-3 mt-3 border-t border-[#23232e]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateProject(project.id);
                      }}
                      title="Duplicar Proyecto"
                      className="p-1.5 rounded-lg hover:bg-[#282835] text-gray-400 hover:text-white transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProject(project.id);
                      }}
                      title="Eliminar Proyecto"
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
