import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import HomeScreen from './components/HomeScreen';
import Navbar from './components/Navbar';
import MediaPanel from './components/MediaPanel';
import CanvasPlayer from './components/CanvasPlayer';
import Timeline from './components/Timeline';
import PropertiesPanel from './components/PropertiesPanel';
import AutoSubtitleModal from './components/AutoSubtitleModal';
import ExportModal from './components/ExportModal';
import { SUBTITLE_THEMES, SUBTITLE_BG_MODES } from './utils/presets';
import { isTypingTarget } from './utils/dom';

const STORAGE_KEY = 'cortex_projects_v2';
const LEGACY_STORAGE_KEY = 'capcut_projects_v2';
const HISTORY_LIMIT = 50;
const HISTORY_COALESCE_MS = 400;
const SAVE_DEBOUNCE_MS = 600;

const DEFAULT_PROJECTS = [
  {
    id: 'proj_demo_1',
    name: 'Mi Primer Video',
    aspectRatio: '16:9',
    updatedAt: new Date().toISOString(),
    mediaPool: [],
    tracks: [
      { id: 'track_1', name: 'Pista 1', clips: [] },
      { id: 'track_2', name: 'Pista 2', clips: [] },
      { id: 'track_3', name: 'Pista 3', clips: [] }
    ],
    totalDuration: 10,
    clipCount: 0
  }
];

export function normalizeMediaUrl(url, filePath) {
  if (url && typeof url === 'string') {
    if (url.startsWith('file://')) return url;
    if (url.startsWith('media://')) {
      const raw = url.replace(/^media:\/\//, '');
      const decoded = decodeURIComponent(raw.startsWith('/') ? raw : '/' + raw);
      return 'file://' + decoded;
    }
  }
  if (filePath && typeof filePath === 'string') {
    return 'file://' + (filePath.startsWith('/') ? filePath : '/' + filePath);
  }
  return url || '';
}

export function sanitizeProject(p) {
  if (!p) return p;

  const rawTracks = (p.tracks || []).map((t) => ({
    ...t,
    clips: (t.clips || []).map((c) => ({
      ...c,
      url: normalizeMediaUrl(c.url, c.path),
      positionY: (c.type === 'text' && c.isSubtitle && (!c.positionY || c.positionY === 82)) ? 87 : c.positionY
    }))
  }));

  // Si alguna pista contiene tanto videos como imágenes, separar las imágenes en su propia pista de superposición
  const newTracks = [];
  const extractedImages = [];

  rawTracks.forEach((t) => {
    const hasVideo = t.clips.some((c) => c.type === 'video');
    const hasImage = t.clips.some((c) => c.type === 'image');

    if (hasVideo && hasImage) {
      const remainingClips = t.clips.filter((c) => c.type !== 'image');
      const imgClips = t.clips.filter((c) => c.type === 'image');
      newTracks.push({ ...t, clips: remainingClips });
      extractedImages.push(...imgClips);
    } else {
      newTracks.push(t);
    }
  });

  if (extractedImages.length > 0) {
    newTracks.push({
      id: 'track_' + Date.now() + '_overlay',
      name: 'Pista Superposición (Fotos / Logos)',
      muted: false,
      hidden: false,
      clips: extractedImages
    });
  }

  // Asegurar al menos 2 pistas para comodidad visual
  if (newTracks.length === 1) {
    newTracks.push({
      id: 'track_' + Date.now() + '_2',
      name: 'Pista 2 (Superposición)',
      muted: false,
      hidden: false,
      clips: []
    });
  }

  return {
    ...p,
    mediaPool: (p.mediaPool || []).map((m) => ({
      ...m,
      url: normalizeMediaUrl(m.url, m.path)
    })),
    tracks: newTracks
  };
}

export default function App() {
  // Modo de vista: 'home' (Hub de proyectos) o 'editor' (Área de trabajo)
  const [viewMode, setViewMode] = useState('home');

  // Lista de proyectos almacenados en localStorage con sanitización automática de URLs locales
  const [projects, setProjects] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.map(sanitizeProject);
      }
    } catch (e) {}
    return DEFAULT_PROJECTS;
  });

  // Proyecto activo en edición
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [projectName, setProjectName] = useState('Proyecto sin título');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [mediaPool, setMediaPool] = useState([]);
  const [tracks, setTracks] = useState([
    { id: 'track_1', name: 'Pista 1', clips: [] },
    { id: 'track_2', name: 'Pista 2', clips: [] },
    { id: 'track_3', name: 'Pista 3', clips: [] }
  ]);

  // Navegación interna del editor
  const [activeTab, setActiveTab] = useState('media');
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(60);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [activeThemeId, setActiveThemeId] = useState('theme_blue_electric');
  const [activeBgMode, setActiveBgMode] = useState('black');

  // Historial de cambios para Deshacer / Rehacer (Undo / Redo).
  // Se guarda en refs para no re-renderizar en cada push; solo se expone canUndo/canRedo.
  // Los cambios consecutivos en menos de HISTORY_COALESCE_MS (arrastrar, recortar, sliders)
  // se agrupan en un único paso de deshacer.
  const tracksRef = useRef(tracks);
  const historyRef = useRef({ past: [], future: [], lastPush: 0 });
  const [historyFlags, setHistoryFlags] = useState({ canUndo: false, canRedo: false });

  const syncHistoryFlags = useCallback(() => {
    const { past, future } = historyRef.current;
    setHistoryFlags((prev) =>
      prev.canUndo === past.length > 0 && prev.canRedo === future.length > 0
        ? prev
        : { canUndo: past.length > 0, canRedo: future.length > 0 }
    );
  }, []);

  const resetTracks = useCallback((nextTracks) => {
    tracksRef.current = nextTracks;
    historyRef.current = { past: [], future: [], lastPush: 0 };
    setTracks(nextTracks);
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const updateTracks = useCallback((action, addToHistory = true) => {
    const prevTracks = tracksRef.current;
    const nextTracks = typeof action === 'function' ? action(prevTracks) : action;
    if (nextTracks === prevTracks) return;

    if (addToHistory) {
      const hist = historyRef.current;
      const now = performance.now();
      if (now - hist.lastPush > HISTORY_COALESCE_MS || hist.past.length === 0) {
        hist.past = [...hist.past.slice(-(HISTORY_LIMIT - 1)), prevTracks];
      }
      hist.lastPush = now;
      hist.future = [];
      syncHistoryFlags();
    }

    tracksRef.current = nextTracks;
    setTracks(nextTracks);
  }, [syncHistoryFlags]);

  const handleUndo = useCallback(() => {
    const hist = historyRef.current;
    if (hist.past.length === 0) return;
    const previous = hist.past[hist.past.length - 1];
    hist.past = hist.past.slice(0, -1);
    hist.future = [tracksRef.current, ...hist.future];
    hist.lastPush = 0;
    tracksRef.current = previous;
    setTracks(previous);
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const handleRedo = useCallback(() => {
    const hist = historyRef.current;
    if (hist.future.length === 0) return;
    const nextState = hist.future[0];
    hist.future = hist.future.slice(1);
    hist.past = [...hist.past, tracksRef.current];
    hist.lastPush = 0;
    tracksRef.current = nextState;
    setTracks(nextState);
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  // Ref del cabezal para que los callbacks no cambien de identidad en cada frame
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  // Atajos globales Ctrl+Z y Ctrl+Y
  useEffect(() => {
    const handleUndoRedoKeys = (e) => {
      if (isTypingTarget(e.target)) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleUndoRedoKeys);
    return () => window.removeEventListener('keydown', handleUndoRedoKeys);
  }, [handleUndo, handleRedo]);

  // Modales
  const [isSubtitleModalOpen, setIsSubtitleModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const canvasRef = useRef(null);

  // Guardar proyectos en localStorage con debounce: serializar todo el proyecto
  // en cada mousemove de un arrastre bloqueaba el hilo principal.
  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  const [saveState, setSaveState] = useState('saved'); // 'saved' | 'pending' | 'error'

  const persistProjects = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projectsRef.current));
      setSaveState('saved');
    } catch (e) {
      console.error('No se pudo guardar el proyecto:', e);
      setSaveState('error');
    }
  }, []);

  const isFirstSaveRef = useRef(true);
  useEffect(() => {
    if (isFirstSaveRef.current) {
      isFirstSaveRef.current = false;
      return;
    }
    setSaveState('pending');
    const timer = setTimeout(persistProjects, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [projects, persistProjects]);

  // Asegurar el guardado al cerrar la ventana
  useEffect(() => {
    window.addEventListener('beforeunload', persistProjects);
    return () => window.removeEventListener('beforeunload', persistProjects);
  }, [persistProjects]);

  // Calcular duración total dinámicamente
  const totalDuration = useMemo(() => {
    let maxTime = 10;
    tracks.forEach((track) => {
      track.clips.forEach((c) => {
        maxTime = Math.max(maxTime, c.start + c.duration);
      });
    });
    return Math.round(maxTime * 100) / 100;
  }, [tracks]);

  // Total de clips en el proyecto
  const totalClipCount = useMemo(() => {
    return tracks.reduce((acc, t) => acc + t.clips.length, 0);
  }, [tracks]);

  // Guardar cambios del proyecto activo
  useEffect(() => {
    if (viewMode === 'editor' && currentProjectId) {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== currentProjectId) return p;
          return {
            ...p,
            name: projectName,
            aspectRatio,
            mediaPool,
            tracks,
            totalDuration,
            clipCount: totalClipCount,
            updatedAt: new Date().toISOString()
          };
        })
      );
    }
  }, [projectName, aspectRatio, mediaPool, tracks, totalDuration, totalClipCount, viewMode, currentProjectId]);

  // Crear nuevo proyecto
  const handleNewProject = (ratio = '16:9', openSubtitles = false) => {
    const newId = 'proj_' + Date.now();
    const newProj = {
      id: newId,
      name: `Proyecto ${ratio === '9:16' ? 'TikTok' : 'Video'} ${projects.length + 1}`,
      aspectRatio: ratio,
      updatedAt: new Date().toISOString(),
      mediaPool: [],
      tracks: [
        { id: `track_${Date.now()}_1`, name: 'Pista 1', clips: [] },
        { id: `track_${Date.now()}_2`, name: 'Pista 2', clips: [] },
        { id: `track_${Date.now()}_3`, name: 'Pista 3', clips: [] }
      ],
      totalDuration: 10,
      clipCount: 0
    };

    setProjects([newProj, ...projects]);
    setCurrentProjectId(newId);
    setProjectName(newProj.name);
    setAspectRatio(newProj.aspectRatio);
    setMediaPool([]);
    resetTracks(newProj.tracks);
    setCurrentTime(0);
    setIsPlaying(false);
    setSelectedClipId(null);
    setViewMode('editor');

    if (openSubtitles) {
      setTimeout(() => setIsSubtitleModalOpen(true), 250);
    }
  };

  // Abrir proyecto existente
  const handleOpenProject = (id) => {
    const rawProj = projects.find((p) => p.id === id);
    if (!rawProj) return;
    const proj = sanitizeProject(rawProj);

    setCurrentProjectId(proj.id);
    setProjectName(proj.name);
    setAspectRatio(proj.aspectRatio || '16:9');
    setMediaPool(proj.mediaPool || []);
    resetTracks(
      proj.tracks && proj.tracks.length > 0
        ? proj.tracks
        : [
            { id: `track_${Date.now()}_1`, name: 'Pista 1', clips: [] },
            { id: `track_${Date.now()}_2`, name: 'Pista 2', clips: [] }
          ]
    );
    setCurrentTime(0);
    setIsPlaying(false);
    setSelectedClipId(null);
    setViewMode('editor');
  };

  // Duplicar proyecto
  const handleDuplicateProject = (id) => {
    const proj = projects.find((p) => p.id === id);
    if (!proj) return;

    const dup = {
      ...proj,
      id: 'proj_' + Date.now(),
      name: `${proj.name} (Copia)`,
      updatedAt: new Date().toISOString()
    };
    setProjects([dup, ...projects]);
  };

  // Eliminar proyecto
  const handleDeleteProject = (id) => {
    setProjects(projects.filter((p) => p.id !== id));
  };

  // Volver a la pantalla de proyectos
  const handleGoHome = useCallback(() => {
    setIsPlaying(false);
    persistProjects();
    setViewMode('home');
  }, [persistProjects]);

  // Completar metadatos de los archivos importados. El proceso principal ya calcula la
  // duración con ffprobe, así que aquí solo se generan miniaturas (en paralelo).
  const addFilesToMediaPool = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    const processedFiles = await Promise.all(
      files.map(async (file) => {
        const url = normalizeMediaUrl(file.url, file.path);
        let thumbnail = null;
        if (file.type === 'video') {
          thumbnail = await window.cortexAPI.extractThumbnail(file.path).catch(() => null);
        } else if (file.type === 'image') {
          thumbnail = url;
        }
        return {
          ...file,
          url,
          duration: file.duration || (file.type === 'image' ? 3 : 30),
          thumbnail
        };
      })
    );
    setMediaPool((prev) => {
      // Evitar duplicados del mismo archivo en la biblioteca
      const known = new Set(prev.map((m) => m.path));
      return [...prev, ...processedFiles.filter((f) => !known.has(f.path))];
    });
  }, []);

  // Importar archivos multimedia
  const handleImportFiles = useCallback(async () => {
    if (window.cortexAPI?.openFiles) {
      try {
        const files = await window.cortexAPI.openFiles();
        await addFilesToMediaPool(files);
      } catch (err) {
        console.error('Error importando archivos:', err);
      }
    } else {
      const mockItem = {
        id: 'mock_' + Date.now(),
        name: 'Video_Demo.mp4',
        type: 'video',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        path: '/sample/BigBuckBunny.mp4',
        duration: 15.0,
        thumbnail: null
      };
      setMediaPool((prev) => [...prev, mockItem]);
    }
  }, [addFilesToMediaPool]);

  // Importar arrastrando archivos desde el explorador del sistema
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const dragDepthRef = useRef(0);

  const handleDragEnter = useCallback((e) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDraggingFiles(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDraggingFiles(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
  }, []);

  const handleDrop = useCallback(async (e) => {
    if (!e.dataTransfer?.files?.length) return;
    e.preventDefault();
    dragDepthRef.current = 0;
    setIsDraggingFiles(false);
    const api = window.cortexAPI;
    if (!api?.getPathForFile || !api?.describeFiles) return;
    try {
      const paths = Array.from(e.dataTransfer.files).map((f) => api.getPathForFile(f)).filter(Boolean);
      const files = await api.describeFiles(paths);
      await addFilesToMediaPool(files);
      setActiveTab('media');
    } catch (err) {
      console.error('Error importando archivos arrastrados:', err);
    }
  }, [addFilesToMediaPool]);

  // Cuando el navegador carga los metadatos reales, recortar el clip solo si excede el
  // final del archivo. Antes se sobrescribía la duración y se perdían cortes y recortes.
  const handleUpdateClipDuration = useCallback((clipId, mediaDuration) => {
    if (!mediaDuration || isNaN(mediaDuration) || mediaDuration <= 0) return;
    updateTracks((prevTracks) => {
      let changed = false;
      const next = prevTracks.map((t) => {
        if (!t.clips.some((c) => c.id === clipId)) return t;
        return {
          ...t,
          clips: t.clips.map((c) => {
            if (c.id !== clipId) return c;
            const available = (mediaDuration - (c.offset || 0)) / (c.speed || 1);
            const maxDur = Math.round(available * 100) / 100;
            if (maxDur <= 0.1 || c.duration <= maxDur + 0.05) return c;
            changed = true;
            return { ...c, duration: maxDur };
          })
        };
      });
      return changed ? next : prevTracks;
    }, false);
  }, [updateTracks]);

  // Añadir medio a cualquiera de las pistas universales (con pegado automático y pista de superposición)
  const handleAddMediaToTimeline = useCallback((mediaItem) => {
    const clipDuration = (mediaItem.duration && mediaItem.duration > 0)
      ? mediaItem.duration
      : (mediaItem.type === 'image' ? 5.0 : 30);

    let finalStart = Math.round(currentTimeRef.current * 100) / 100;

    updateTracks((prevTracks) => {
      let workingTracks = [...prevTracks];

      if (workingTracks.length === 0) {
        workingTracks = [{ id: 'track_1', name: 'Pista 1', clips: [] }];
      }

      // Determinar pista destino:
      // Audio -> última pista
      // Video -> pista 0
      // Imagen -> Si alguna pista ya tiene videos, colocar la imagen en una pista de superposición
      let targetTrackIndex = 0;
      if (mediaItem.type === 'audio') {
        targetTrackIndex = workingTracks.length > 1 ? workingTracks.length - 1 : 0;
      } else if (mediaItem.type === 'image') {
        const hasVideo = workingTracks.some((t) => t.clips.some((c) => c.type === 'video'));
        if (hasVideo) {
          let freeTrackIdx = workingTracks.findIndex((t) => !t.clips.some((c) => c.type === 'video'));
          if (freeTrackIdx === -1) {
            workingTracks.push({
              id: 'track_' + Date.now() + '_overlay',
              name: `Pista ${workingTracks.length + 1} (Superposición)`,
              muted: false,
              hidden: false,
              clips: []
            });
            freeTrackIdx = workingTracks.length - 1;
          }
          targetTrackIndex = freeTrackIdx;
        }
      }

      const targetTrack = workingTracks[targetTrackIndex] || workingTracks[0];

      if (targetTrack && targetTrack.clips.length > 0 && mediaItem.type !== 'image') {
        const lastClipEnd = targetTrack.clips.reduce((max, c) => Math.max(max, c.start + c.duration), 0);
        // Pegado automático: si está cerca del final o al final del proyecto, pegar al final del último clip
        if (Math.abs(finalStart - lastClipEnd) < 0.6 || finalStart >= lastClipEnd) {
          finalStart = Math.round(lastClipEnd * 100) / 100;
        } else {
          // Si está cerca del final de algún clip intermedio, pegar a ese clip
          for (const c of targetTrack.clips) {
            const cEnd = c.start + c.duration;
            if (Math.abs(finalStart - cEnd) < 0.4) {
              finalStart = Math.round(cEnd * 100) / 100;
              break;
            }
          }
        }
      }

      // Si es una imagen colocada en modo superposición sobre video, escala por defecto elegante (0.45 = 45%) para no tapar la pantalla
      const isOverlayImage = mediaItem.type === 'image';
      const defaultScale = isOverlayImage ? 0.45 : 1;

      const newClip = {
        id: 'clip_' + Date.now() + '_' + Math.random().toString(36).substring(7),
        mediaId: mediaItem.id,
        name: mediaItem.name,
        type: mediaItem.type,
        path: mediaItem.path,
        url: normalizeMediaUrl(mediaItem.url, mediaItem.path),
        thumbnail: mediaItem.thumbnail || (mediaItem.type === 'image' ? normalizeMediaUrl(mediaItem.url, mediaItem.path) : null),
        start: finalStart,
        duration: clipDuration,
        offset: 0,
        opacity: 1,
        scale: defaultScale,
        posX: 0,
        posY: 0,
        volume: 1
      };

      setSelectedClipId(newClip.id);
      setCurrentTime(Math.round((finalStart + clipDuration) * 100) / 100);

      return workingTracks.map((t, idx) => {
        if (idx === targetTrackIndex) {
          return { ...t, clips: [...t.clips, newClip] };
        }
        return t;
      });
    });
  }, [updateTracks]);

  // Añadir texto a las pistas universales (con pegado automático)
  const handleAddTextToTimeline = useCallback((preset = null) => {
    let finalStart = Math.round(currentTimeRef.current * 100) / 100;
    const duration = 3.0;

    updateTracks((prevTracks) => {
      const targetTrack = prevTracks[0];
      if (targetTrack && targetTrack.clips.length > 0) {
        for (const c of targetTrack.clips) {
          const cEnd = c.start + c.duration;
          if (Math.abs(finalStart - cEnd) < 0.4) {
            finalStart = Math.round(cEnd * 100) / 100;
            break;
          }
        }
      }

      const newText = {
        id: 'text_' + Date.now() + '_' + Math.random().toString(36).substring(7),
        type: 'text',
        text: preset ? preset.text : 'Tu Texto Aquí',
        start: finalStart,
        duration: duration,
        fontSize: preset ? preset.fontSize : 42,
        color: preset ? preset.color : '#FFFFFF',
        bgColor: preset ? preset.bgColor : 'transparent',
        fontFamily: preset ? preset.fontFamily : 'system-ui, sans-serif',
        strokeColor: preset ? preset.strokeColor : '#000000',
        strokeWidth: preset ? preset.strokeWidth : 2,
        positionY: preset ? preset.positionY : 50,
        isSubtitle: false
      };

      setSelectedClipId(newText.id);

      if (prevTracks.length === 0) {
        return [{ id: 'track_1', name: 'Pista 1', clips: [newText] }];
      }
      return prevTracks.map((t, idx) => {
        if (idx === 0) {
          return { ...t, clips: [...t.clips, newText] };
        }
        return t;
      });
    });
  }, [updateTracks]);

  // Eliminar de biblioteca
  const handleDeleteMedia = useCallback((mediaId) => {
    setMediaPool((prev) => prev.filter((m) => m.id !== mediaId));
  }, []);

  // Aplicar tema de subtítulo viral (TikTok Azul, Amarillo, etc.) con el modo de fondo activo o especificado
  const handleApplySubtitleTheme = useCallback((theme, bgMode = activeBgMode) => {
    setActiveThemeId(theme.id);
    const bgConfig = SUBTITLE_BG_MODES.find((b) => b.id === bgMode) || SUBTITLE_BG_MODES[0];
    updateTracks((prevTracks) =>
      prevTracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => {
          if (c.type !== 'text' || !c.isSubtitle) return c;
          return {
            ...c,
            color: bgConfig.baseColor,
            highlightColor: theme.highlightColor,
            bgColor: bgConfig.bgColor,
            fontFamily: theme.fontFamily,
            fontSize: theme.fontSize,
            strokeColor: bgConfig.strokeColor,
            strokeWidth: bgConfig.strokeWidth,
            positionY: theme.positionY,
            uppercase: theme.uppercase ?? c.uppercase ?? true,
            karaoke: true
          };
        })
      }))
    );
  }, [activeBgMode, updateTracks]);

  // Cambiar modo de fondo para todos los subtítulos (Negro, Blanco fácil lectura, Transparente, Azul noche)
  const handleChangeBgMode = useCallback((newBgMode) => {
    setActiveBgMode(newBgMode);
    const activeTheme = SUBTITLE_THEMES.find((th) => th.id === activeThemeId) || SUBTITLE_THEMES[0];
    handleApplySubtitleTheme(activeTheme, newBgMode);
  }, [activeThemeId, handleApplySubtitleTheme]);

  // Aplicar subtítulos automáticos con el tema viral activo y el modo de fondo seleccionado
  const handleApplySubtitles = useCallback((generatedSubtitles) => {
    const activeTheme = SUBTITLE_THEMES.find((th) => th.id === activeThemeId) || SUBTITLE_THEMES[0];
    const bgConfig = SUBTITLE_BG_MODES.find((b) => b.id === activeBgMode) || SUBTITLE_BG_MODES[0];

    const universalSubClips = generatedSubtitles.map((sub) => ({
      ...sub,
      type: 'text',
      isSubtitle: true,
      karaoke: true,
      words: sub.words || [],
      color: bgConfig.baseColor,
      highlightColor: activeTheme.highlightColor,
      bgColor: bgConfig.bgColor,
      fontFamily: activeTheme.fontFamily,
      fontSize: activeTheme.fontSize,
      strokeColor: bgConfig.strokeColor,
      strokeWidth: bgConfig.strokeWidth,
      positionY: activeTheme.positionY,
      uppercase: activeTheme.uppercase !== undefined ? activeTheme.uppercase : true
    }));

    // Insertar en la primera pista
    updateTracks((prevTracks) => {
      if (prevTracks.length === 0) {
        return [{ id: 'track_1', name: 'Pista 1', clips: universalSubClips }];
      }
      return prevTracks.map((t, idx) => {
        if (idx === 0) {
          return { ...t, clips: [...t.clips, ...universalSubClips] };
        }
        return t;
      });
    });

    setActiveTab('subtitles');
  }, [activeThemeId, activeBgMode, updateTracks]);

  // Subtítulos activos
  const allSubtitles = useMemo(() => {
    return tracks.flatMap((t) => t.clips.filter((c) => c.type === 'text' && c.isSubtitle));
  }, [tracks]);

  // Solo el id del subtítulo activo llega al panel lateral, así no se re-renderiza en cada frame
  const activeSubtitleId = useMemo(() => {
    const active = allSubtitles.find((sub) => currentTime >= sub.start && currentTime <= sub.start + sub.duration);
    return active ? active.id : null;
  }, [allSubtitles, currentTime]);

  const handleSelectSubtitle = useCallback((sub) => {
    setSelectedClipId(sub.id);
    setCurrentTime(sub.start);
  }, []);

  const openSubtitleModal = useCallback(() => setIsSubtitleModalOpen(true), []);
  const closeSubtitleModal = useCallback(() => setIsSubtitleModalOpen(false), []);
  const openExportModal = useCallback(() => setIsExportModalOpen(true), []);
  const closeExportModal = useCallback(() => setIsExportModalOpen(false), []);

  // 1. Si estamos en modo 'home', mostrar Hub de Proyectos
  if (viewMode === 'home') {
    return (
      <HomeScreen
        projects={projects}
        onNewProject={handleNewProject}
        onOpenProject={handleOpenProject}
        onDeleteProject={handleDeleteProject}
        onDuplicateProject={handleDuplicateProject}
      />
    );
  }

  // 2. Si estamos en modo 'editor', mostrar editor de Cortex
  return (
    <div
      className="cortex-editor w-screen h-screen flex flex-col bg-[#0e0e11] text-gray-100 overflow-hidden font-sans relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDraggingFiles && (
        <div className="absolute inset-0 z-[100] bg-cyan-500/10 backdrop-blur-sm border-4 border-dashed border-cyan-400/70 flex items-center justify-center pointer-events-none">
          <div className="bg-[#16161a]/95 px-8 py-6 rounded-2xl border border-cyan-500/40 shadow-2xl text-center">
            <p className="text-lg font-bold text-cyan-300">Suelta para importar</p>
            <p className="text-xs text-gray-400 mt-1">Videos, fotos y audios se añadirán a la biblioteca</p>
          </div>
        </div>
      )}

      {/* Barra Superior con botón para volver a Proyectos */}
      <Navbar
        projectName={projectName}
        setProjectName={setProjectName}
        currentTime={currentTime}
        totalDuration={totalDuration}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        onOpenAutoSubtitles={openSubtitleModal}
        onOpenExport={openExportModal}
        onGoHome={handleGoHome}
        saveState={saveState}
        canUndo={historyFlags.canUndo}
        canRedo={historyFlags.canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* Área Central: Medios + Reproductor Canvas + Inspector */}
      <div className="studio-workspace flex-1 flex overflow-hidden">
        <MediaPanel
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mediaPool={mediaPool}
          onImportFiles={handleImportFiles}
          onAddMediaToTimeline={handleAddMediaToTimeline}
          onAddTextToTimeline={handleAddTextToTimeline}
          onDeleteMedia={handleDeleteMedia}
          subtitles={allSubtitles}
          onOpenAutoSubtitles={openSubtitleModal}
          onSelectSubtitle={handleSelectSubtitle}
          onApplySubtitleTheme={handleApplySubtitleTheme}
          activeThemeId={activeThemeId}
          activeBgMode={activeBgMode}
          onChangeBgMode={handleChangeBgMode}
          activeSubtitleId={activeSubtitleId}
        />

        <CanvasPlayer
          currentTime={currentTime}
          setCurrentTime={setCurrentTime}
          totalDuration={totalDuration}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          aspectRatio={aspectRatio}
          tracks={tracks}
          canvasRef={canvasRef}
          onUpdateClipDuration={handleUpdateClipDuration}
        />

        <PropertiesPanel
          selectedClipId={selectedClipId}
          tracks={tracks}
          setTracks={updateTracks}
          totalDuration={totalDuration}
          aspectRatio={aspectRatio}
        />
      </div>

      {/* Línea de Tiempo: Pistas Universales con soporte libre para Video, Audio, Fotos y Texto */}
      <Timeline
        currentTime={currentTime}
        setCurrentTime={setCurrentTime}
        totalDuration={totalDuration}
        tracks={tracks}
        setTracks={updateTracks}
        selectedClipId={selectedClipId}
        setSelectedClipId={setSelectedClipId}
        zoom={zoom}
        setZoom={setZoom}
        isPlaying={isPlaying}
      />

      {/* Modales */}
      <AutoSubtitleModal
        isOpen={isSubtitleModalOpen}
        onClose={closeSubtitleModal}
        mediaPool={mediaPool}
        onApplySubtitles={handleApplySubtitles}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={closeExportModal}
        totalDuration={totalDuration}
        aspectRatio={aspectRatio}
        tracks={tracks}
        canvasRef={canvasRef}
      />
    </div>
  );
}
