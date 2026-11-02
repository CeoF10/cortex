import React, { useMemo, useRef, useState } from 'react';
import { Plus, FolderOpen, Film, Clock, Trash2, Copy, Smartphone, Monitor, Sparkles, Search, Home, ArrowUpRight, ChevronRight, Play, HardDrive, LayoutGrid, List, Captions } from 'lucide-react';
import appIcon from '../../assets/cortex-cyan.png';
import { formatDuration } from '../utils/timeFormat';

const launchers = [
  { title: 'Horizontal 16:9', detail: 'Ideal para YouTube, presentaciones y más.', ratio: '16:9', Icon: Monitor, kind: 'horizontal' },
  { title: 'Vertical 9:16', detail: 'Perfecto para TikTok, Reels y Shorts.', ratio: '9:16', Icon: Smartphone, kind: 'vertical' },
  { title: 'Subtítulos con IA', detail: 'Transcribe y genera subtítulos automáticamente.', ratio: '16:9', Icon: Captions, kind: 'captions', subtitles: true },
];

export default function HomeScreen({ projects, onNewProject, onOpenProject, onDeleteProject, onDuplicateProject }) {
  const [search, setSearch] = useState('');
  const [section, setSection] = useState('home');
  const [layout, setLayout] = useState('grid');
  const contentRef = useRef(null);
  const visibleProjects = useMemo(() => {
    const matches = [...projects].filter(p => p.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
    matches.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return section === 'recent' ? matches.slice(0, 8) : matches;
  }, [projects, search, section]);
  const navigate = (next) => {
    setSection(next);
    contentRef.current?.scrollTo({ top: 0 });
  };

  return (
    <div className="cortex-home">
      <aside className="home-sidebar">
        <div className="home-brand"><img src={appIcon} alt="" /><div><strong>CORTEX</strong><span>PRO</span></div></div>
        <nav aria-label="Navegación principal">
          {[['home', Home, 'Inicio'], ['projects', FolderOpen, 'Proyectos'], ['recent', Clock, 'Recientes']].map(([key, Icon, label]) => (
            <button key={key} className={`home-nav-item ${section === key ? 'is-active' : ''}`} aria-current={section === key ? 'page' : undefined} onClick={() => navigate(key)}>
              <Icon size={19} /><span>{label}</span>{key === 'projects' && <small>{projects.length}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-note"><HardDrive size={17} /><div><strong>Tu espacio creativo</strong><span>Proyectos guardados en este equipo</span></div></div>
        <div className="sidebar-signature"><span />Hecho para crear.</div>
      </aside>

      <div className="home-workspace">
        <header className="home-topbar">
          <label className="home-search"><Search size={17} /><input aria-label="Buscar proyectos" placeholder="Buscar proyectos locales…" value={search} onChange={e => setSearch(e.target.value)} />{search && <button onClick={() => setSearch('')} aria-label="Limpiar búsqueda">×</button>}</label>
          <span className="home-topbar-label"><span />CORTEX DESKTOP</span>
        </header>
        <main className="home-content" ref={contentRef}>
          {section === 'home' && !search.trim() && <>
            <section className="home-hero" aria-labelledby="hero-heading">
              <div className="hero-copy"><span className="eyebrow">UN NUEVO DÍA. UNA NUEVA HISTORIA.</span><h1 id="hero-heading">Tu próxima historia<br /><em>empieza aquí</em></h1><p>Edita, da forma y comparte videos increíbles<br />con herramientas profesionales y una interfaz simple.</p><button className="cortex-primary" onClick={() => onNewProject('16:9')}><Plus size={19} />Nuevo proyecto<ArrowUpRight size={17} /></button><span className="hero-footnote">Tú pones la idea. Cortex, las posibilidades.</span></div>
              <div className="reference-hero-art" aria-hidden="true"><div className="reference-preview photo-sunset" /><div className="reference-wave"><span /></div></div>
            </section>
            <section className="home-launchers" aria-label="Crear un proyecto">
              {launchers.map(({ title, detail, ratio, Icon, kind, subtitles }) => <button className="launch-card" key={kind} onClick={() => onNewProject(ratio, !!subtitles)}><div className={`launch-photo photo-${kind}`} aria-hidden="true">{kind === 'captions' && <><strong>Aa</strong><small>Generando subtítulos...</small><span className="mini-wave" /></>}</div><div className="launch-copy"><h2><Icon size={27} strokeWidth={1.6} />{title}</h2><p>{detail}</p></div><ChevronRight size={17} /></button>)}
            </section>
          </>}

          <section className="home-projects" aria-labelledby="projects-heading">
            <div className="projects-heading"><div><span className="eyebrow">SIGUE DONDE LO DEJASTE</span><h2 id="projects-heading">{search.trim() ? 'Resultados de búsqueda' : section === 'projects' ? 'Tus proyectos' : 'Proyectos recientes'}<span>{visibleProjects.length}</span></h2></div><div className="project-view-controls"><button aria-label="Vista de cuadrícula" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')}><LayoutGrid size={16} /></button><button aria-label="Vista de lista" aria-pressed={layout === 'list'} onClick={() => setLayout('list')}><List size={18} /></button>{section === 'home' && <button className="view-all" onClick={() => navigate('projects')}>Ver todos<ChevronRight size={14} /></button>}</div></div>
            {visibleProjects.length === 0 ? <div className="home-empty"><div><Film size={29} strokeWidth={1.4} /></div><h3>{search.trim() ? 'No encontramos ese proyecto' : 'El comienzo de una gran historia'}</h3><p>{search.trim() ? 'Prueba con otro nombre o limpia la búsqueda.' : 'Crea tu primer proyecto y empieza a darle forma a tus ideas.'}</p><button className="cortex-primary" onClick={() => search.trim() ? setSearch('') : onNewProject('16:9')}>{search.trim() ? 'Limpiar búsqueda' : 'Crear proyecto'}<Plus size={16} /></button></div> : <div className={`project-collection ${layout === 'list' ? 'is-list' : ''}`}>
              {visibleProjects.map(project => <article className="project-card" key={project.id}>
                <button className="project-open" onClick={() => onOpenProject(project.id)} aria-label={`Abrir ${project.name}`}><div className="project-thumbnail">{project.thumbnail ? <img src={project.thumbnail} alt="" loading="lazy" /> : <div className="project-placeholder"><Film size={35} strokeWidth={1.2} /></div>}<span className="project-ratio">{project.aspectRatio || '16:9'}</span><span className="project-duration">{formatDuration(project.totalDuration || 0)}</span><span className="project-play"><Play size={19} fill="currentColor" /></span></div><div className="project-info"><h3>{project.name}</h3><p>{new Date(project.updatedAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}<span>·</span>{project.clipCount || 0} clips</p></div></button>
                <div className="project-actions"><button onClick={() => onDuplicateProject(project.id)} aria-label={`Duplicar ${project.name}`} title="Duplicar proyecto"><Copy size={14} /></button><button className="delete-project" onClick={() => onDeleteProject(project.id)} aria-label={`Eliminar ${project.name}`} title="Eliminar proyecto"><Trash2 size={14} /></button></div>
              </article>)}
            </div>}
          </section>
          <footer className="home-footer"><span>CORTEX<span className="footer-divider">/</span>Tu creatividad, en movimiento.</span><span>EDITA. CREA. REPITE.</span></footer>
        </main>
      </div>
    </div>
  );
}
