import React, { useRef, useState, useEffect, useLayoutEffect, useCallback, useMemo, memo } from 'react';
import { 
  Scissors, 
  Trash2, 
  Copy, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Plus,
  Film,
  Music,
  Type,
  Image as ImageIcon,
  Layers,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Magnet,
  Split,
  SkipBack,
  SkipForward,
  ArrowLeftToLine,
  ArrowRightToLine
} from 'lucide-react';
import { formatTimecode } from '../utils/timeFormat';
import AudioWaveform from './AudioWaveform';
import { isTypingTarget } from '../utils/dom';

const formatRulerTime = (seconds) => {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${Math.round(seconds * 10) / 10}s`;
};

// Pista memoizada: solo se re-renderiza cuando cambian sus clips, el zoom o la selección,
// no cuando se mueve el cabezal (que ocurre ~30 veces por segundo al reproducir).
const TrackLane = memo(function TrackLane({
  track,
  zoom,
  selectedClipId,
  onClipMouseDown,
  onTrimStart,
  onAutoExpand
}) {
  return (
    <div
      data-track-id={track.id}
      className="h-14 border-b border-[#1f1f28] relative bg-[#121217]/40 hover:bg-[#15151c]/60 transition-colors"
    >
      {track.clips.map((clip) => {
        const left = clip.start * zoom;
        const actualWidth = clip.duration * zoom;
        const width = Math.max(6, actualWidth);
        const isSelected = selectedClipId === clip.id;

        // Estilo según el tipo de clip dentro de la pista universal
        let clipBg = 'bg-[#1b2b36] hover:bg-[#203442] border-[#294c63] text-gray-200';
        let icon = <Film className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />;

        if (clip.type === 'image') {
          clipBg = 'bg-[#153430] hover:bg-[#1b433e] border-[#235851] text-teal-100';
          icon = <ImageIcon className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />;
        } else if (clip.type === 'audio') {
          clipBg = 'bg-[#0f1f2c] hover:bg-[#132838] border-[#1b435a] text-cyan-200';
          icon = <Music className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />;
        } else if (clip.type === 'text') {
          clipBg = 'bg-purple-900/40 hover:bg-purple-900/60 border-purple-800/60 text-purple-200';
          icon = <Type className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />;
        }

        return (
          <div
            key={clip.id}
            style={{ left: `${left}px`, width: `${width}px` }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => onClipMouseDown(e, clip, track.id)}
            className={`absolute top-2 bottom-2 rounded-lg cursor-grab active:cursor-grabbing border flex items-center px-1 select-none overflow-hidden transition-shadow ${clipBg} ${
              isSelected
                ? 'border-cyan-400 ring-2 ring-cyan-400/50 shadow-lg shadow-cyan-500/20 text-white z-20'
                : ''
            }`}
          >
            {/* Handle izquierdo (solo si hay suficiente espacio para manipularlo) */}
            {width >= 20 && (
              <div
                onMouseDown={(e) => onTrimStart(e, clip, track.id, 'left')}
                className="absolute left-0 top-0 bottom-0 w-2.5 bg-white/10 hover:bg-cyan-400 cursor-ew-resize rounded-l z-20"
              />
            )}

            {/* Forma de onda de audio de alta fidelidad si es clip de sonido */}
            {clip.type === 'audio' && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <AudioWaveform
                  clip={clip}
                  zoom={zoom}
                  height={48}
                  color={isSelected ? '#38bdf8' : '#00F0FF'}
                  muted={track.muted}
                />
              </div>
            )}

            {/* Mini forma de onda de audio en la parte inferior si es un video */}
            {clip.type === 'video' && (
              <div className="absolute bottom-0 left-0 right-0 h-4 opacity-50 pointer-events-none overflow-hidden">
                <AudioWaveform
                  clip={clip}
                  zoom={zoom}
                  height={16}
                  color="#38BDF8"
                  muted={track.muted}
                />
              </div>
            )}

            {/* Contenido del clip con etiquetas responsivas que no se rompen con zoom mínimo */}
            {clip.type === 'text' ? (
              <div className="flex items-center px-1.5 w-full h-full pointer-events-none z-10 select-none overflow-hidden">
                {width >= 75 && (
                  <div className="p-0.5 rounded bg-purple-950/70 border border-purple-500/30 flex-shrink-0 mr-1.5 shadow-sm">
                    <Type className="w-3 h-3 text-purple-300" />
                  </div>
                )}
                <span className="text-[11px] font-semibold text-purple-100 truncate flex-1 drop-shadow-sm tracking-wide">
                  {clip.text || clip.name || 'Subtítulo'}
                </span>
                {width >= 90 && (
                  <span className="text-[9px] font-mono text-purple-300/80 ml-1 flex-shrink-0 bg-purple-950/60 px-1 py-0.5 rounded">
                    {clip.duration.toFixed(1)}s
                  </span>
                )}
              </div>
            ) : width >= 32 ? (
              <div className="flex items-center space-x-1.5 truncate pointer-events-none z-10 flex-1 px-1">
                {clip.thumbnail ? (
                  <img
                    src={clip.thumbnail}
                    alt=""
                    className="w-7 h-7 object-cover rounded flex-shrink-0 border border-black/40 shadow-sm"
                  />
                ) : (
                  <div className="p-0.5 rounded bg-black/50 backdrop-blur-sm flex-shrink-0">
                    {icon}
                  </div>
                )}
                <div className="truncate flex-1">
                  <div className="flex items-center space-x-1 truncate">
                    <span className="text-[11px] font-bold truncate bg-black/60 backdrop-blur-sm px-1 py-0.2 rounded shadow-sm">
                      {clip.name || clip.text || 'Elemento'}
                    </span>
                    {width >= 80 && clip.animIn && clip.animIn !== 'none' && (
                      <span className="px-1 py-0.2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded text-[7px] font-mono uppercase backdrop-blur-sm">
                        In: {clip.animIn}
                      </span>
                    )}
                  </div>
                  {width >= 60 && (
                    <p className="text-[9px] opacity-80 font-mono mt-0.5">
                      <span className="bg-black/60 backdrop-blur-sm px-1 py-0.2 rounded">
                        {clip.duration.toFixed(1)}s
                      </span>
                    </p>
                  )}
                </div>
              </div>
            ) : width >= 14 ? (
              <div className="w-full flex items-center justify-center pointer-events-none z-10 opacity-70">
                {icon}
              </div>
            ) : null}

            {/* Handle derecho (solo si hay suficiente espacio para manipularlo) */}
            {width >= 20 && (
              <div
                title="Arrastra para recortar/expandir. Doble clic para expandir automáticamente hasta el final del audio/video"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onAutoExpand(clip);
                }}
                onMouseDown={(e) => onTrimStart(e, clip, track.id, 'right')}
                className="absolute right-0 top-0 bottom-0 w-2.5 bg-white/10 hover:bg-cyan-400 cursor-ew-resize rounded-r z-20 group-hover:bg-white/20"
              />
            )}
          </div>
        );
      })}
    </div>
  );
});

export default function Timeline({
  currentTime,
  setCurrentTime,
  totalDuration,
  tracks,
  setTracks,
  selectedClipId,
  setSelectedClipId,
  zoom,
  setZoom,
  isPlaying = false
}) {
  const containerRef = useRef(null);

  // Refs con los valores más recientes para handlers de ratón/teclado sin recrearlos en cada frame
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const clipboardRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const leftSidebarRef = useRef(null);
  const pendingScrollAnchorRef = useRef(null);

  // Altura ajustable de la línea de tiempo (por defecto 340px)
  const [timelineHeight, setTimelineHeight] = useState(340);
  const isResizingHeightRef = useRef(false);

  // Estados de navegación y arrastre
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, scrollLeft: 0 });
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [draggingClip, setDraggingClip] = useState(null); // { id, trackId, initialMouseX, initialStart, duration }
  const [trimmingClip, setTrimmingClip] = useState(null); // { id, trackId, edge, initialMouseX, initialStart, initialDuration, initialOffset }

  // Modo Magnético CapCut: pegado automático al cortar, eliminar o mover clips (activo por defecto)
  const [isMagnetic, setIsMagnetic] = useState(true);
  const [isSnappingPlayhead, setIsSnappingPlayhead] = useState(false);
  const [snapGuide, setSnapGuide] = useState(null); // { time, label, type } indicador visual magnético al expandir/mover

  // Duración visual
  const timelineDuration = Math.max(30, totalDuration + 10);
  const totalWidth = timelineDuration * zoom;

  // Zoom Inteligente con Anclaje al Cabezal: la aguja no se pierde ni regresa a 0:00 al cambiar el zoom
  const applyZoomWithAnchor = useCallback(
    (newZoomOrFn) => {
      const container = scrollContainerRef.current;
      const oldZoom = zoom;
      const targetZoom = typeof newZoomOrFn === 'function' ? newZoomOrFn(oldZoom) : newZoomOrFn;
      const clampedZoom = Math.max(1, Math.min(180, targetZoom));
      if (clampedZoom === oldZoom) return;

      if (container) {
        const containerWidth = container.clientWidth;
        const currentScrollLeft = container.scrollLeft;
        const currentPlayheadPx = currentTime * oldZoom;
        const playheadOffsetInViewport = currentPlayheadPx - currentScrollLeft;

        let targetScrollLeft;
        // Si el cabezal está dentro del área visible de la pantalla (o cerca)
        if (playheadOffsetInViewport >= 0 && playheadOffsetInViewport <= containerWidth) {
          targetScrollLeft = currentTime * clampedZoom - playheadOffsetInViewport;
        } else {
          // Si el cabezal estaba fuera, centrar la vista en el cabezal
          targetScrollLeft = currentTime * clampedZoom - containerWidth / 2;
        }

        pendingScrollAnchorRef.current = Math.max(0, targetScrollLeft);
      }

      setZoom(clampedZoom);
    },
    [zoom, currentTime, setZoom]
  );

  // Sincronizar el scrollLeft tras la renderización del nuevo ancho en el DOM
  useLayoutEffect(() => {
    if (pendingScrollAnchorRef.current !== null && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = pendingScrollAnchorRef.current;
      pendingScrollAnchorRef.current = null;
    }
  }, [zoom]);

  // Soporte nativo para Zoom (Ctrl + Rueda) y Desplazamiento Horizontal Fluido (Rueda normal)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        // Zoom con anclaje al puntero
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.18 : 0.82;
        const nextZoom = Math.max(1, Math.min(180, Math.round(zoom * factor)));
        if (nextZoom === zoom) return;

        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const timeAtMouse = (container.scrollLeft + mouseX) / zoom;
        const targetScrollLeft = timeAtMouse * nextZoom - mouseX;

        pendingScrollAnchorRef.current = Math.max(0, targetScrollLeft);
        setZoom(nextZoom);
      } else {
        // Desplazamiento horizontal fluido al girar la rueda del ratón (estilo CapCut / Premiere)
        e.preventDefault();
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        container.scrollLeft += delta * 1.25;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoom, setZoom]);

  // Ajustar el zoom automáticamente para que todo el proyecto entre en pantalla (Fit to Screen)
  const handleFitTimeline = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const containerWidth = scrollContainerRef.current.clientWidth - 50;
    if (containerWidth <= 0 || totalDuration <= 0) return;
    const calculatedZoom = Math.max(1, Math.min(180, Math.floor((containerWidth / Math.max(5, totalDuration + 2)) * 10) / 10));
    setZoom(calculatedZoom);
    scrollContainerRef.current.scrollLeft = 0;
  }, [totalDuration, setZoom]);

  // Intervalo inteligente de marcas en la regla según el zoom para que nunca se amontonen
  const rulerStep = useMemo(() => {
    const targetSeconds = 65 / Math.max(0.5, zoom);
    const standardSteps = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
    const major = standardSteps.find((s) => s >= targetSeconds) || 600;
    
    let minor = major / 5;
    if (major <= 2) minor = 0.5;
    else if (major <= 5) minor = 1;
    else if (major <= 15) minor = 5;
    else if (major <= 60) minor = 15;
    else if (major <= 120) minor = 30;
    else minor = 60;

    return { major, minor };
  }, [zoom]);

  const rulerMarks = useMemo(() => {
    const marks = [];
    const { major, minor } = rulerStep;
    const count = Math.ceil(timelineDuration / minor);
    for (let i = 0; i <= count; i++) {
      const sec = Math.round(i * minor * 100) / 100;
      if (sec > timelineDuration) break;
      const remainder = Math.abs(sec % major);
      const isMajor = remainder < 0.01 || Math.abs(remainder - major) < 0.01;
      marks.push({
        sec,
        posX: sec * zoom,
        isMajor
      });
    }
    return marks;
  }, [timelineDuration, zoom, rulerStep]);

  // Manejo de playhead en la regla y paneo con clic central (botón de rueda)
  const handleTimelineMouseDown = (e) => {
    // Si presiona el botón central (rueda del ratón) o presiona con Shift+clic o con Espacio presionado -> Paneo (Mano)
    if (e.button === 1 || e.shiftKey) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        scrollLeft: scrollContainerRef.current ? scrollContainerRef.current.scrollLeft : 0
      };
      return;
    }

    // Clic izquierdo estándar en la regla o fondo de pista -> Posicionar cabezal
    if (e.button === 0) {
      setSelectedClipId(null);
      setIsScrubbing(true);
      updatePlayheadPosition(e);
    }
  };

  const updatePlayheadPosition = useCallback(
    (e) => {
      if (!scrollContainerRef.current) return;
      const rect = scrollContainerRef.current.getBoundingClientRect();
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const clickX = e.clientX - rect.left + scrollLeft;
      let newTime = Math.max(0, Math.min(timelineDuration, clickX / zoom));

      let snapped = false;

      // Imán de Cabezal (Playhead Snapping): se pega automáticamente al inicio o final de cualquier clip
      if (isMagnetic) {
        const snapThreshold = Math.max(0.12, 14 / zoom); // ~14px en pantalla
        let closestDist = snapThreshold;
        let bestSnapTime = null;

        // Snapping al inicio absoluto (0:00)
        if (newTime < snapThreshold) {
          closestDist = newTime;
          bestSnapTime = 0;
          snapped = true;
        }

        // Snapping a los extremos (start y end) de todos los clips en todas las pistas
        tracks.forEach((tr) => {
          tr.clips.forEach((c) => {
            const cStart = c.start;
            const cEnd = c.start + c.duration;

            const distStart = Math.abs(newTime - cStart);
            if (distStart < closestDist) {
              closestDist = distStart;
              bestSnapTime = cStart;
              snapped = true;
            }

            const distEnd = Math.abs(newTime - cEnd);
            if (distEnd < closestDist) {
              closestDist = distEnd;
              bestSnapTime = cEnd;
              snapped = true;
            }
          });
        });

        if (bestSnapTime !== null) {
          newTime = Math.round(bestSnapTime * 100) / 100;
        }
      }

      setIsSnappingPlayhead(snapped);
      setCurrentTime(newTime);
    },
    [zoom, timelineDuration, tracks, isMagnetic, setCurrentTime]
  );

  // Navegación instantánea al Inicio (0:00)
  const handleGoToStart = useCallback(() => {
    setCurrentTime(0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [setCurrentTime]);

  // Navegación instantánea al Final del proyecto (último clip o duración total)
  const handleGoToEnd = useCallback(() => {
    let maxClipEnd = 0;
    tracks.forEach((t) => {
      t.clips.forEach((c) => {
        const end = c.start + c.duration;
        if (end > maxClipEnd) maxClipEnd = end;
      });
    });
    const targetTime = maxClipEnd > 0 ? maxClipEnd : totalDuration;
    setCurrentTime(Math.round(targetTime * 100) / 100);

    if (scrollContainerRef.current) {
      const containerWidth = scrollContainerRef.current.clientWidth;
      const targetScroll = Math.max(0, targetTime * zoom - containerWidth + 120);
      scrollContainerRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  }, [tracks, totalDuration, zoom, setCurrentTime]);

  // Auto-expandir un clip (ej. foto o subtítulo) exactamente hasta el final del audio o video
  const handleAutoExpandToEnd = useCallback((clipToExpand) => {
    let maxMediaEnd = 0;
    tracksRef.current.forEach((t) => {
      t.clips.forEach((c) => {
        if (c.id === clipToExpand.id) return;
        const end = c.start + c.duration;
        if (end > maxMediaEnd) maxMediaEnd = end;
      });
    });

    if (maxMediaEnd <= clipToExpand.start) {
      maxMediaEnd = totalDuration;
    }

    const newDur = Math.max(0.5, Math.round((maxMediaEnd - clipToExpand.start) * 100) / 100);

    setTracks((prevTracks) =>
      prevTracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => (c.id === clipToExpand.id ? { ...c, duration: newDur } : c))
      }))
    );
  }, [totalDuration, setTracks]);

  // Inicio de arrastre de un clip
  const handleClipMouseDown = useCallback((e, clip, trackId) => {
    if (e.button !== 0) return; // botón central: dejar que el contenedor haga paneo
    e.stopPropagation();
    setSelectedClipId(clip.id);
    setDraggingClip({
      id: clip.id,
      trackId,
      initialMouseX: e.clientX,
      initialStart: clip.start,
      duration: clip.duration
    });
  }, [setSelectedClipId]);

  // Inicio de recorte por el borde izquierdo o derecho
  const handleTrimStart = useCallback((e, clip, trackId, edge) => {
    if (e.button !== 0) return; // botón central: dejar que el contenedor haga paneo
    e.stopPropagation();
    setSelectedClipId(clip.id);
    setTrimmingClip({
      id: clip.id,
      trackId,
      edge,
      initialMouseX: e.clientX,
      initialStart: clip.start,
      initialDuration: clip.duration,
      initialOffset: clip.offset || 0
    });
  }, [setSelectedClipId]);

  // Selección por pista: así solo se re-renderizan las pistas cuya selección cambia
  const trackSelection = useMemo(() => {
    const map = new Map();
    if (!selectedClipId) return map;
    for (const t of tracks) {
      if (t.clips.some((c) => c.id === selectedClipId)) {
        map.set(t.id, selectedClipId);
        break;
      }
    }
    return map;
  }, [tracks, selectedClipId]);

  // Seguir el cabezal durante la reproducción (paginado, como CapCut)
  useEffect(() => {
    if (!isPlaying || isScrubbing) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const playheadPx = currentTime * zoom;
    const viewLeft = container.scrollLeft;
    const viewWidth = container.clientWidth;
    if (playheadPx > viewLeft + viewWidth - 40 || playheadPx < viewLeft) {
      container.scrollLeft = Math.max(0, playheadPx - 60);
    }
  }, [currentTime, zoom, isPlaying, isScrubbing]);

  // Salto inteligente al siguiente corte (clip)
  const handleJumpNextCut = useCallback(() => {
    const cutPoints = [];
    tracks.forEach((t) => {
      t.clips.forEach((c) => {
        cutPoints.push(c.start);
        cutPoints.push(c.start + c.duration);
      });
    });
    const sorted = Array.from(new Set(cutPoints)).sort((a, b) => a - b);
    const nextCut = sorted.find((pt) => pt > currentTime + 0.05);
    if (nextCut !== undefined) {
      setCurrentTime(Math.round(nextCut * 100) / 100);
      if (scrollContainerRef.current) {
        const targetScroll = nextCut * zoom;
        const currentScroll = scrollContainerRef.current.scrollLeft;
        const width = scrollContainerRef.current.clientWidth;
        if (targetScroll < currentScroll + 50 || targetScroll > currentScroll + width - 50) {
          scrollContainerRef.current.scrollTo({ left: Math.max(0, targetScroll - width / 2), behavior: 'smooth' });
        }
      }
    }
  }, [tracks, currentTime, zoom, setCurrentTime]);

  // Salto inteligente al corte anterior (clip)
  const handleJumpPrevCut = useCallback(() => {
    const cutPoints = [0];
    tracks.forEach((t) => {
      t.clips.forEach((c) => {
        cutPoints.push(c.start);
        cutPoints.push(c.start + c.duration);
      });
    });
    const sorted = Array.from(new Set(cutPoints)).sort((a, b) => b - a);
    const prevCut = sorted.find((pt) => pt < currentTime - 0.05);
    if (prevCut !== undefined) {
      setCurrentTime(Math.round(prevCut * 100) / 100);
      if (scrollContainerRef.current) {
        const targetScroll = prevCut * zoom;
        const currentScroll = scrollContainerRef.current.scrollLeft;
        const width = scrollContainerRef.current.clientWidth;
        if (targetScroll < currentScroll + 50 || targetScroll > currentScroll + width - 50) {
          scrollContainerRef.current.scrollTo({ left: Math.max(0, targetScroll - width / 2), behavior: 'smooth' });
        }
      }
    }
  }, [tracks, currentTime, zoom, setCurrentTime]);

  // Añadir una nueva pista universal
  const handleAddTrack = () => {
    const newTrackIndex = tracks.length + 1;
    const newTrack = {
      id: `track_${Date.now()}_${newTrackIndex}`,
      name: `Pista ${newTrackIndex}`,
      muted: false,
      hidden: false,
      clips: []
    };
    setTracks((prev) => [...prev, newTrack]);
  };

  // Eliminar una pista si hay más de una
  const handleDeleteTrack = (trackId) => {
    if (tracks.length <= 1) return;
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    setSelectedClipId(null);
  };

  // Eventos globales de mouse para scrubbing, arrastre y trimming
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isScrubbing) {
        updatePlayheadPosition(e);
      } else if (draggingClip) {
        const deltaX = e.clientX - draggingClip.initialMouseX;
        const deltaTime = deltaX / zoom;
        let newStart = Math.max(0, draggingClip.initialStart + deltaTime);

        const snapThreshold = isMagnetic ? Math.max(0.2, 16 / zoom) : 0.08;

        // Snapping al inicio (0:00)
        if (newStart < snapThreshold) {
          newStart = 0;
        }

        // Snapping al cabezal
        const playheadTime = currentTimeRef.current;
        if (Math.abs(newStart - playheadTime) < snapThreshold) {
          newStart = playheadTime;
        }

        // Snapping Magnético con los extremos de otros clips
        if (isMagnetic) {
          const draggedDuration = draggingClip.duration || 0;
          tracksRef.current.forEach((tr) => {
            tr.clips.forEach((other) => {
              if (other.id === draggingClip.id) return;
              const otherStart = other.start;
              const otherEnd = other.start + other.duration;

              // Pegar inicio con final de otro clip (Left edge to Right edge) -> Se pegan automáticamente
              if (Math.abs(newStart - otherEnd) < snapThreshold) {
                newStart = otherEnd;
              }
              // Pegar inicio con inicio de otro clip (Left edge to Left edge)
              else if (Math.abs(newStart - otherStart) < snapThreshold) {
                newStart = otherStart;
              }
              // Pegar final con inicio de otro clip (Right edge to Left edge)
              else if (Math.abs((newStart + draggedDuration) - otherStart) < snapThreshold) {
                newStart = Math.max(0, otherStart - draggedDuration);
              }
            });
          });
        }

        // Detectar si el puntero se movió verticalmente a otra pista
        const elUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
        const trackContainer = elUnderMouse?.closest('[data-track-id]');
        const targetTrackId = trackContainer?.getAttribute('data-track-id') || draggingClip.trackId;

        setTracks((prevTracks) => {
          const sourceTrack = prevTracks.find((t) => t.clips.some((c) => c.id === draggingClip.id));
          if (!sourceTrack) return prevTracks;
          const clipObj = sourceTrack.clips.find((c) => c.id === draggingClip.id);
          if (!clipObj) return prevTracks;

          const roundedStart = Math.round(newStart * 100) / 100;
          const shift = roundedStart - clipObj.start;
          let updatedWords = clipObj.words;
          if (clipObj.words && Array.isArray(clipObj.words) && Math.abs(shift) > 0.001) {
            updatedWords = clipObj.words.map((w) => {
              if (typeof w === 'object' && w.start !== undefined && w.end !== undefined) {
                return {
                  ...w,
                  start: Math.round((w.start + shift) * 100) / 100,
                  end: Math.round((w.end + shift) * 100) / 100
                };
              }
              return w;
            });
          }
          const updatedClip = { ...clipObj, start: roundedStart, words: updatedWords };

          if (sourceTrack.id === targetTrackId) {
            return prevTracks.map((t) =>
              t.id === sourceTrack.id
                ? { ...t, clips: t.clips.map((c) => (c.id === draggingClip.id ? updatedClip : c)) }
                : t
            );
          } else {
            // Mover de sourceTrack a targetTrackId
            return prevTracks.map((t) => {
              if (t.id === sourceTrack.id) {
                return { ...t, clips: t.clips.filter((c) => c.id !== draggingClip.id) };
              }
              if (t.id === targetTrackId) {
                return { ...t, clips: [...t.clips, updatedClip] };
              }
              return t;
            });
          }
        });
      } else if (trimmingClip) {
        const deltaX = e.clientX - trimmingClip.initialMouseX;
        const deltaTime = deltaX / zoom;

        // Calcular puntos de anclaje magnético con todos los otros clips (audio, video, fotos) y el cabezal
        let snappedGuideData = null;
        const snapThreshold = isMagnetic ? Math.max(0.18, 16 / zoom) : 0;

        let snapPoints = [];
        if (isMagnetic) {
          // Cabezal
          snapPoints.push({ time: currentTimeRef.current, label: 'Cabezal de tiempo', type: 'playhead' });
          // Extremos de todos los otros clips
          tracksRef.current.forEach((tr) => {
            tr.clips.forEach((other) => {
              if (other.id === trimmingClip.id) return;
              const isAudio = other.type === 'audio';
              const isVideo = other.type === 'video';
              const isImg = other.type === 'image';
              const nameTag = isAudio ? 'Audio' : isVideo ? 'Video' : isImg ? 'Foto' : 'Clip';

              snapPoints.push({
                time: other.start,
                label: `Inicio de ${nameTag}`,
                type: other.type
              });
              snapPoints.push({
                time: other.start + other.duration,
                label: `Final de ${nameTag}`,
                type: other.type
              });
            });
          });
        }

        setTracks((prevTracks) =>
          prevTracks.map((t) => {
            if (t.id !== trimmingClip.trackId) return t;
            return {
              ...t,
              clips: t.clips.map((c) => {
                if (c.id !== trimmingClip.id) return c;

                if (trimmingClip.edge === 'left') {
                  const maxDelta = trimmingClip.initialDuration - 0.2;
                  let clampedDelta = Math.min(maxDelta, deltaTime);
                  let newStart = Math.max(0, trimmingClip.initialStart + clampedDelta);

                  // Snapping magnético en el borde izquierdo
                  if (isMagnetic) {
                    let bestDiff = snapThreshold;
                    let bestPoint = null;
                    snapPoints.forEach((sp) => {
                      const diff = Math.abs(newStart - sp.time);
                      if (diff < bestDiff) {
                        bestDiff = diff;
                        bestPoint = sp;
                      }
                    });
                    if (bestPoint && bestPoint.time < trimmingClip.initialStart + trimmingClip.initialDuration - 0.2) {
                      newStart = bestPoint.time;
                      clampedDelta = newStart - trimmingClip.initialStart;
                      snappedGuideData = bestPoint;
                    }
                  }

                  const newDuration = trimmingClip.initialDuration - clampedDelta;
                  const newOffset = (trimmingClip.initialOffset || 0) + clampedDelta;

                  return {
                    ...c,
                    start: Math.round(newStart * 100) / 100,
                    duration: Math.max(0.2, Math.round(newDuration * 100) / 100),
                    offset: Math.max(0, Math.round(newOffset * 100) / 100)
                  };
                } else {
                  // Borde derecho (expandir / contraer)
                  let rawDuration = Math.max(0.2, trimmingClip.initialDuration + deltaTime);
                  let currentEnd = trimmingClip.initialStart + rawDuration;

                  // Snapping magnético al final del audio/video u otro clip
                  if (isMagnetic) {
                    let bestDiff = snapThreshold;
                    let bestPoint = null;
                    snapPoints.forEach((sp) => {
                      const diff = Math.abs(currentEnd - sp.time);
                      if (diff < bestDiff) {
                        bestDiff = diff;
                        bestPoint = sp;
                      }
                    });
                    if (bestPoint && bestPoint.time > trimmingClip.initialStart + 0.2) {
                      currentEnd = bestPoint.time;
                      rawDuration = currentEnd - trimmingClip.initialStart;
                      snappedGuideData = bestPoint;
                    }
                  }

                  return {
                    ...c,
                    duration: Math.round(rawDuration * 100) / 100
                  };
                }
              })
            };
          })
        );

        setSnapGuide(snappedGuideData);
      } else if (isPanning) {
        if (scrollContainerRef.current) {
          const deltaX = e.clientX - panStartRef.current.x;
          scrollContainerRef.current.scrollLeft = panStartRef.current.scrollLeft - deltaX;
        }
      }
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
      setDraggingClip(null);
      setTrimmingClip(null);
      setIsSnappingPlayhead(false);
      setIsPanning(false);
      setSnapGuide(null);
    };

    if (isScrubbing || draggingClip || trimmingClip || isPanning) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing, draggingClip, trimmingClip, isPanning, zoom, isMagnetic, updatePlayheadPosition, setTracks]);

  // Redimensionamiento interactivo de la altura de la línea de tiempo (arrastrando el borde superior)
  const handleStartResizeHeight = useCallback((e) => {
    e.preventDefault();
    isResizingHeightRef.current = true;
    const startY = e.clientY;
    const initialH = timelineHeight;

    const onMouseMove = (moveEvent) => {
      if (!isResizingHeightRef.current) return;
      const deltaY = moveEvent.clientY - startY;
      // Arrastrar hacia arriba (deltaY negativo) aumenta la altura del timeline
      const newH = Math.min(600, Math.max(180, initialH - deltaY));
      setTimelineHeight(newH);
    };

    const onMouseUp = () => {
      isResizingHeightRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [timelineHeight]);

  // Clips que cruzan la aguja del cabezal en cualquier pista
  const clipsUnderPlayhead = useMemo(() => {
    return tracks.flatMap((t) =>
      t.clips.filter((c) => currentTime >= c.start && currentTime <= c.start + c.duration)
    );
  }, [tracks, currentTime]);

  // Función inteligente para dividir cualquier clip (cortando texto y palabras si es subtítulo)
  const splitClipAtTime = (clip, splitPoint) => {
    const firstDuration = Math.max(0.1, Math.round((splitPoint - clip.start) * 100) / 100);
    const secondDuration = Math.max(0.1, Math.round((clip.duration - firstDuration) * 100) / 100);
    const secondClipId = clip.id + '_split_' + Date.now() + '_' + Math.random().toString(36).substring(7);

    let firstClipData = {
      ...clip,
      duration: firstDuration
    };

    let secondClipData = {
      ...clip,
      id: secondClipId,
      start: Math.round(splitPoint * 100) / 100,
      duration: secondDuration,
      offset: Math.round(((clip.offset || 0) + firstDuration) * 100) / 100
    };

    // Si es un subtítulo o clip de texto, dividir sus palabras y su texto visible en las 2 partes
    if (clip.type === 'text' || clip.isSubtitle) {
      const rawWords = (clip.words && Array.isArray(clip.words) && clip.words.length > 0)
        ? clip.words
        : (clip.text || '').trim().split(/\s+/).map((w, idx, arr) => ({
            word: w,
            start: clip.start + (idx / Math.max(1, arr.length)) * clip.duration,
            end: clip.start + ((idx + 1) / Math.max(1, arr.length)) * clip.duration
          }));

      let firstWords = [];
      let secondWords = [];

      rawWords.forEach((w) => {
        const wStart = typeof w === 'object' ? w.start : null;
        const wEnd = typeof w === 'object' ? w.end : null;
        const wMid = (wStart !== null && wEnd !== null) ? (wStart + wEnd) / 2 : (wStart !== null ? wStart : 0);

        if (wMid < splitPoint) {
          firstWords.push(w);
        } else {
          secondWords.push(w);
        }
      });

      // Si todas las palabras quedaron en un solo lado, asegurar al menos una en cada lado si hay >= 2 palabras
      if (firstWords.length === 0 && secondWords.length >= 2) {
        firstWords = [secondWords[0]];
        secondWords = secondWords.slice(1);
      } else if (secondWords.length === 0 && firstWords.length >= 2) {
        secondWords = [firstWords[firstWords.length - 1]];
        firstWords = firstWords.slice(0, -1);
      }

      const getWordStr = (w) => (typeof w === 'object' ? w.word : String(w));

      let firstText = firstWords.map(getWordStr).join(' ').trim();
      let secondText = secondWords.map(getWordStr).join(' ').trim();

      // Si el texto quedó vacío en alguno, dividir el string original
      if (!firstText || !secondText) {
        const allStrWords = (clip.text || '').trim().split(/\s+/).filter(Boolean);
        if (allStrWords.length >= 2) {
          const ratio = firstDuration / clip.duration;
          const splitIdx = Math.max(1, Math.min(allStrWords.length - 1, Math.round(ratio * allStrWords.length)));
          firstText = allStrWords.slice(0, splitIdx).join(' ');
          secondText = allStrWords.slice(splitIdx).join(' ');
        } else {
          firstText = clip.text;
          secondText = clip.text;
        }
      }

      firstClipData.text = firstText;
      firstClipData.words = firstWords;

      secondClipData.text = secondText;
      secondClipData.words = secondWords;
    }

    return { firstClip: firstClipData, secondClip: secondClipData };
  };

  // Dividir clip seleccionado o dividir todas las partes bajo el cabezal
  const handleSplit = (splitAll = false) => {
    setTracks((prevTracks) => {
      let newlyCreatedSplitId = null;

      const next = prevTracks.map((t) => {
        let modified = false;
        const newClips = [];

        t.clips.forEach((clip) => {
          let shouldCutThis = false;
          let cutTime = currentTime;

          if (splitAll) {
            // Dividir todo: si el cabezal cruza el clip
            if (currentTime >= clip.start + 0.01 && currentTime <= clip.start + clip.duration - 0.01) {
              shouldCutThis = true;
              cutTime = currentTime;
            }
          } else if (selectedClipId) {
            // Si hay un clip seleccionado, cortamos ese clip
            if (clip.id === selectedClipId) {
              shouldCutThis = true;
              // Si el cabezal está dentro del clip, cortar en el cabezal
              if (currentTime > clip.start + 0.01 && currentTime < clip.start + clip.duration - 0.01) {
                cutTime = currentTime;
              } else {
                // Si el cabezal está en el borde o fuera del clip (ej. al seleccionarlo desde la lista),
                // cortar a la mitad de su duración
                cutTime = clip.start + clip.duration / 2;
              }
            }
          } else {
            // Si no hay nada seleccionado, cortar todos los clips bajo el cabezal
            if (currentTime >= clip.start + 0.01 && currentTime <= clip.start + clip.duration - 0.01) {
              shouldCutThis = true;
              cutTime = currentTime;
            }
          }

          if (shouldCutThis && cutTime > clip.start && cutTime < clip.start + clip.duration) {
            modified = true;
            const { firstClip, secondClip } = splitClipAtTime(clip, cutTime);
            if (!newlyCreatedSplitId) newlyCreatedSplitId = secondClip.id;
            newClips.push(firstClip, secondClip);
          } else {
            newClips.push(clip);
          }
        });

        return modified ? { ...t, clips: newClips } : t;
      });

      if (newlyCreatedSplitId) {
        setSelectedClipId(newlyCreatedSplitId);
      }
      return next;
    });
  };

  // Eliminar clip seleccionado (los subtítulos, textos y audios se quedan exactamente en su sitio sin retroceder)
  const handleDeleteClip = () => {
    if (!selectedClipId) return;

    setTracks((prevTracks) =>
      prevTracks.map((t) => {
        const clipToDelete = t.clips.find((c) => c.id === selectedClipId);
        if (!clipToDelete) return t;

        const remaining = t.clips.filter((c) => c.id !== selectedClipId);

        // Los subtítulos, textos y audios NUNCA deben retroceder al borrar uno; se quedan exactamente donde están
        if (!isMagnetic || clipToDelete.isSubtitle || clipToDelete.type === 'text' || clipToDelete.type === 'audio') {
          return { ...t, clips: remaining };
        }

        // Modo Magnético CapCut solo para pistas principales de video: los clips posteriores se desplazan hacia la izquierda
        const delStart = clipToDelete.start;
        const delDuration = clipToDelete.duration;
        const rippled = remaining.map((c) => {
          if (c.start > delStart) {
            return {
              ...c,
              start: Math.max(delStart, Math.round((c.start - delDuration) * 100) / 100)
            };
          }
          return c;
        });

        return { ...t, clips: rippled };
      })
    );
    setSelectedClipId(null);
  };

  // Pegar todos los clips de cada pista eliminando huecos vacíos (sin alterar pistas de subtítulos)
  const handleSnapAllGaps = () => {
    setTracks((prevTracks) =>
      prevTracks.map((t) => {
        // No cerrar huecos en pistas que contengan subtítulos para mantener la sincronización con la voz
        if (t.clips.some((c) => c.isSubtitle)) return t;
        if (t.clips.length <= 1) return t;
        const sorted = [...t.clips].sort((a, b) => a.start - b.start);
        let accumulatedEnd = sorted[0].start;
        const closed = sorted.map((c, idx) => {
          if (idx === 0) {
            accumulatedEnd = c.start + c.duration;
            return c;
          }
          const newStart = Math.round(accumulatedEnd * 100) / 100;
          accumulatedEnd = newStart + c.duration;
          return { ...c, start: newStart };
        });
        return { ...t, clips: closed };
      })
    );
  };

  // Duplicar clip
  const handleDuplicateClip = () => {
    if (!selectedClipId) return;
    setTracks((prevTracks) =>
      prevTracks.map((t) => {
        const clip = t.clips.find((c) => c.id === selectedClipId);
        if (!clip) return t;

        const newClip = {
          ...clip,
          id: clip.id + '_copy_' + Date.now(),
          start: clip.start + clip.duration + 0.2
        };
        setSelectedClipId(newClip.id);
        return { ...t, clips: [...t.clips, newClip] };
      })
    );
  };

  // Copiar el clip seleccionado al portapapeles interno
  const handleCopyClip = () => {
    if (!selectedClipId) return;
    for (const t of tracks) {
      const clip = t.clips.find((c) => c.id === selectedClipId);
      if (clip) {
        clipboardRef.current = { clip, trackId: t.id };
        return;
      }
    }
  };

  // Pegar el clip copiado en el cabezal, en su pista original (o la primera si ya no existe)
  const handlePasteClip = () => {
    const entry = clipboardRef.current;
    if (!entry) return;
    const start = Math.round(currentTime * 100) / 100;
    const shift = start - entry.clip.start;
    const newClip = {
      ...entry.clip,
      id: 'clip_' + Date.now() + '_' + Math.random().toString(36).substring(7),
      start,
      words: Array.isArray(entry.clip.words)
        ? entry.clip.words.map((w) =>
            typeof w === 'object' && w.start !== undefined
              ? { ...w, start: Math.round((w.start + shift) * 100) / 100, end: Math.round((w.end + shift) * 100) / 100 }
              : w
          )
        : entry.clip.words
    };
    setTracks((prev) => {
      if (prev.length === 0) return prev;
      const targetId = prev.some((t) => t.id === entry.trackId) ? entry.trackId : prev[0].id;
      return prev.map((t) => (t.id === targetId ? { ...t, clips: [...t.clips, newClip] } : t));
    });
    setSelectedClipId(newClip.id);
  };

  // Recortar el clip seleccionado hasta el cabezal: 'left' elimina lo anterior, 'right' lo posterior (Q / W en CapCut)
  const handleTrimToPlayhead = (side) => {
    if (!selectedClipId) return;
    const t0 = currentTime;
    setTracks((prev) =>
      prev.map((t) => {
        const clip = t.clips.find((c) => c.id === selectedClipId);
        if (!clip) return t;
        const end = clip.start + clip.duration;
        if (t0 <= clip.start + 0.05 || t0 >= end - 0.05) return t;
        const { firstClip, secondClip } = splitClipAtTime(clip, t0);
        const kept = side === 'left' ? { ...secondClip, id: clip.id } : firstClip;
        return { ...t, clips: t.clips.map((c) => (c.id === clip.id ? kept : c)) };
      })
    );
  };

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isTypingTarget(e.target)) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteClip();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        handleSplit(true); // Cortar todas las partes
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        handleSplit(false); // Cortar clip seleccionado o lo que esté bajo el cabezal
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        handleDuplicateClip();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        handleCopyClip();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        handlePasteClip();
      } else if (!e.ctrlKey && !e.metaKey && (e.key === 'q' || e.key === 'Q')) {
        e.preventDefault();
        handleTrimToPlayhead('left');
      } else if (!e.ctrlKey && !e.metaKey && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        handleTrimToPlayhead('right');
      } else if (e.key === 'Escape') {
        setSelectedClipId(null);
      } else if (e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        handleFitTimeline();
      } else if (e.key === 'Home') {
        e.preventDefault();
        handleGoToStart();
      } else if (e.key === 'End') {
        e.preventDefault();
        handleGoToEnd();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleJumpPrevCut();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleJumpNextCut();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, currentTime, tracks, isMagnetic, handleFitTimeline, handleGoToStart, handleGoToEnd, handleJumpNextCut, handleJumpPrevCut]);

  return (
    <div
      ref={containerRef}
      style={{ height: `${timelineHeight}px` }}
      className="bg-[#121215] border-t border-[#23232c] flex flex-col select-none relative z-10 flex-shrink-0"
    >
      {/* Barra de redimensionamiento vertical interactiva (CapCut drag handle) */}
      <div
        onMouseDown={handleStartResizeHeight}
        title="Arrastra para ajustar el alto de la línea de tiempo"
        className="absolute -top-1 left-0 right-0 h-2 cursor-row-resize z-50 group flex items-center justify-center hover:bg-cyan-500/20 transition-colors"
      >
        <div className="w-12 h-1 bg-[#3a3a48] group-hover:bg-cyan-400 rounded-full transition-colors" />
      </div>

      {/* Barra de herramientas superior del Timeline */}
      <div className="h-10 bg-[#16161a] border-b border-[#23232c] flex items-center justify-between px-4 flex-shrink-0">
        {/* Acciones de edición */}
        <div className="flex items-center space-x-1.5">
          {/* Botón Dividir (corta clip seleccionado o lo que esté bajo el cabezal) */}
          <button
            onClick={() => handleSplit(false)}
            disabled={!selectedClipId && clipsUnderPlayhead.length === 0}
            title="Dividir clip en el cabezal (Ctrl+B)"
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#202027] hover:bg-cyan-500 hover:text-black text-gray-300 disabled:opacity-30 disabled:hover:bg-[#202027] disabled:hover:text-gray-300 text-xs font-medium transition-colors"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Dividir</span>
          </button>

          {/* Botón Dividir Todo (corta todas las partes / pistas a la vez) */}
          <button
            onClick={() => handleSplit(true)}
            disabled={clipsUnderPlayhead.length === 0}
            title="Dividir todas las partes / pistas bajo el cabezal a la vez (Ctrl+Shift+B)"
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#202027] hover:bg-cyan-400 hover:text-black text-gray-300 disabled:opacity-30 disabled:hover:bg-[#202027] disabled:hover:text-gray-300 text-xs font-medium transition-colors"
          >
            <Split className="w-3.5 h-3.5" />
            <span>Dividir Todo</span>
          </button>

          <button
            onClick={handleDeleteClip}
            disabled={!selectedClipId}
            title={isMagnetic ? "Eliminar clip y pegar automáticamente los siguientes (Supr)" : "Eliminar clip seleccionado (Supr)"}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#202027] hover:bg-red-500 hover:text-white text-gray-300 disabled:opacity-30 text-xs font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar</span>
          </button>

          <button
            onClick={() => handleTrimToPlayhead('left')}
            disabled={!selectedClipId}
            title="Eliminar la parte del clip antes del cabezal (Q)"
            className="flex items-center px-2 py-1 rounded bg-[#202027] hover:bg-[#2b2b35] text-gray-300 disabled:opacity-30 text-xs font-medium transition-colors"
          >
            <ArrowLeftToLine className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleTrimToPlayhead('right')}
            disabled={!selectedClipId}
            title="Eliminar la parte del clip después del cabezal (W)"
            className="flex items-center px-2 py-1 rounded bg-[#202027] hover:bg-[#2b2b35] text-gray-300 disabled:opacity-30 text-xs font-medium transition-colors"
          >
            <ArrowRightToLine className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleDuplicateClip}
            disabled={!selectedClipId}
            title="Duplicar clip seleccionado (Ctrl+D)"
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#202027] hover:bg-[#2b2b35] text-gray-300 disabled:opacity-30 text-xs font-medium transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicar</span>
          </button>

          <div className="h-4 w-px bg-[#2b2b35] mx-1" />

          {/* Botón Modo Magnético / Pegado Automático CapCut */}
          <button
            onClick={() => setIsMagnetic((prev) => !prev)}
            title="Modo Magnético CapCut: cuando cortas o eliminas, los clips se pegan automáticamente sin dejar huecos vacíos"
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all border ${
              isMagnetic
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 ring-1 ring-cyan-500/30'
                : 'bg-[#202027] text-gray-400 border-[#2b2b35] hover:text-white'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Pegado Automático</span>
          </button>

          {/* Botón Pegar / Cerrar Huecos de las pistas */}
          <button
            onClick={handleSnapAllGaps}
            title="Pegar todos los clips de cada pista eliminando cualquier hueco vacío intermedio"
            className="flex items-center space-x-1 px-2 py-1 rounded bg-[#202027] hover:bg-[#2b2b35] text-gray-300 hover:text-cyan-400 text-xs font-medium transition-colors"
          >
            <span>Cerrar Huecos</span>
          </button>

          <div className="h-4 w-px bg-[#2b2b35] mx-1" />

          {/* Botón Añadir Pista Universal */}
          <button
            onClick={handleAddTrack}
            title="Añadir nueva pista universal (admite cualquier tipo de medio)"
            className="flex items-center space-x-1.5 px-3 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Añadir Pista</span>
          </button>
        </div>

        {/* Zoom Completo con Botones y Ajuste Automático a Pantalla (Con Anclaje al Cabezal) */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => applyZoomWithAnchor((z) => Math.max(1, Math.round(z * 0.75)))}
            title="Alejar zoom (-)"
            className="p-1.5 rounded hover:bg-[#202027] text-gray-400 hover:text-white transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <input
            type="range"
            min="1"
            max="180"
            step="1"
            value={zoom}
            onChange={(e) => applyZoomWithAnchor(Number(e.target.value))}
            className="w-24 h-1.5 bg-[#282833] rounded-lg appearance-none cursor-pointer accent-cyan-400"
            title={`Nivel de zoom: ${zoom} px/s (Anclado al cabezal. Ctrl+Rueda para hacer zoom)`}
          />

          <button
            onClick={() => applyZoomWithAnchor((z) => Math.min(180, Math.max(1, Math.round(z * 1.3))))}
            title="Acercar zoom (+)"
            className="p-1.5 rounded hover:bg-[#202027] text-gray-400 hover:text-white transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Botones de Navegación Rápida: Inicio y Final del proyecto */}
          <div className="h-4 w-px bg-[#2b2b35] mx-1" />

          <button
            onClick={handleGoToStart}
            title="Ir al inicio del proyecto (0:00) [Tecla Inicio / Home]"
            className="flex items-center space-x-1 px-2 py-1 rounded bg-[#202028] hover:bg-[#2c2c38] text-gray-300 hover:text-cyan-400 border border-[#2b2b38] text-[11px] font-semibold transition-colors shadow-sm"
          >
            <SkipBack className="w-3 h-3 text-cyan-400" />
            <span>Inicio</span>
          </button>

          <button
            onClick={handleGoToEnd}
            title="Ir al final de los clips del proyecto [Tecla Fin / End]"
            className="flex items-center space-x-1 px-2 py-1 rounded bg-[#202028] hover:bg-[#2c2c38] text-gray-300 hover:text-cyan-400 border border-[#2b2b38] text-[11px] font-semibold transition-colors shadow-sm"
          >
            <span>Final</span>
            <SkipForward className="w-3 h-3 text-cyan-400" />
          </button>

          {/* Botón Ver Todo / Ajustar a Pantalla */}
          <button
            onClick={handleFitTimeline}
            title="Ajustar zoom para ver toda la línea de tiempo (Shift+Z)"
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#202028] hover:bg-cyan-500/20 text-gray-300 hover:text-cyan-400 border border-[#2b2b38] hover:border-cyan-500/40 text-[11px] font-semibold transition-all ml-0.5 shadow-sm"
          >
            <Maximize2 className="w-3 h-3 text-cyan-400" />
            <span>Ver Todo</span>
          </button>
        </div>
      </div>

      {/* Área del Timeline con pistas universales desplazables */}
      <div className="flex-1 flex overflow-hidden">
        {/* Cabecera fija de pistas universales a la izquierda */}
        <div
          ref={leftSidebarRef}
          className="w-36 bg-[#141418] border-r border-[#23232c] flex flex-col flex-shrink-0 z-10 shadow-lg overflow-y-hidden select-none"
        >
          {/* Espacio para la regla */}
          <div className="h-6 border-b border-[#23232c] flex items-center px-3 text-[10px] text-gray-500 font-bold uppercase tracking-wider flex-shrink-0">
            Pistas ({tracks.length})
          </div>

          {/* Lista de cabeceras de cada pista */}
          {tracks.map((track, idx) => (
            <div
              key={track.id}
              className="h-14 border-b border-[#23232c] flex items-center justify-between px-2 bg-[#17171e]/60 text-xs font-medium flex-shrink-0"
            >
              <div className="flex items-center space-x-1.5 truncate flex-1 min-w-0 mr-1">
                <Layers className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span className={`font-semibold truncate text-[11px] ${track.hidden ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                  {track.name}
                </span>
              </div>

              <div className="flex items-center space-x-0.5 flex-shrink-0">
                {/* Mute Track */}
                <button
                  type="button"
                  onClick={() => {
                    setTracks((prev) => prev.map((t) => t.id === track.id ? { ...t, muted: !t.muted } : t));
                  }}
                  title={track.muted ? 'Activar sonido de la pista' : 'Silenciar pista (Mute)'}
                  className={`p-1 rounded transition-colors ${
                    track.muted
                      ? 'text-red-400 bg-red-500/20 hover:bg-red-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-[#252530]'
                  }`}
                >
                  {track.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>

                {/* Hide / Show Track */}
                <button
                  type="button"
                  onClick={() => {
                    setTracks((prev) => prev.map((t) => t.id === track.id ? { ...t, hidden: !t.hidden } : t));
                  }}
                  title={track.hidden ? 'Mostrar elementos de la pista' : 'Ocultar pista (Hide)'}
                  className={`p-1 rounded transition-colors ${
                    track.hidden
                      ? 'text-amber-400 bg-amber-500/20 hover:bg-amber-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-[#252530]'
                  }`}
                >
                  {track.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>

                {tracks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTrack(track.id)}
                    title="Eliminar esta pista"
                    className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Contenedor desplazable de las pistas */}
        <div
          ref={scrollContainerRef}
          className={`flex-1 overflow-x-auto overflow-y-auto relative bg-[#0e0e11] ${
            isPanning ? 'cursor-grabbing' : 'cursor-default'
          }`}
          onMouseDown={handleTimelineMouseDown}
          onScroll={(e) => {
            if (leftSidebarRef.current) {
              leftSidebarRef.current.scrollTop = e.currentTarget.scrollTop;
            }
          }}
        >
          <div style={{ width: `${Math.max(scrollContainerRef.current?.clientWidth || 800, totalWidth)}px` }} className="relative min-h-full">
            {/* 1. Regla de tiempo inteligente con espaciado adaptable */}
            <div className="h-6 border-b border-[#23232c] relative bg-[#131317]">
              {rulerMarks.map((m, idx) => (
                <div
                  key={idx}
                  style={{ left: `${m.posX}px` }}
                  className="absolute top-0 bottom-0 pointer-events-none flex flex-col justify-end"
                >
                  <div
                    className={`w-px ${m.isMajor ? 'h-3 bg-gray-400' : 'h-1.5 bg-gray-600/70'}`}
                  />
                  {m.isMajor && (
                    <span className="text-[9px] font-mono text-gray-400 -translate-x-1/2 absolute top-0.5 whitespace-nowrap">
                      {formatRulerTime(m.sec)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* 2. Pistas Universales */}
            {tracks.map((track) => (
              <TrackLane
                key={track.id}
                track={track}
                zoom={zoom}
                selectedClipId={trackSelection.get(track.id) || null}
                onClipMouseDown={handleClipMouseDown}
                onTrimStart={handleTrimStart}
                onAutoExpand={handleAutoExpandToEnd}
              />
            ))}

            {/* Guía Magnética Inteligente con Tooltip al llegar exactamente al final del Audio, Video u otro Clip */}
            {snapGuide && (
              <div
                style={{ left: `${snapGuide.time * zoom}px` }}
                className="absolute top-0 bottom-0 pointer-events-none z-40 -translate-x-1/2 flex flex-col items-center"
              >
                {/* Badge flotante en la regla */}
                <div className="bg-gradient-to-r from-cyan-400 to-teal-300 text-black text-[10px] font-extrabold px-2.5 py-0.5 rounded shadow-xl whitespace-nowrap flex items-center space-x-1.5 drop-shadow-[0_0_12px_rgba(0,229,255,0.9)] animate-pulse border border-white/60">
                  <span className="uppercase tracking-wide">{snapGuide.label}</span>
                  <span className="font-mono font-bold bg-black/20 px-1 py-0.2 rounded text-[9px]">
                    {snapGuide.time.toFixed(1)}s
                  </span>
                </div>
                {/* Línea vertical de neón indicando el tope exacto */}
                <div className="w-[2px] flex-1 bg-cyan-400 drop-shadow-[0_0_10px_#00e5ff]" />
              </div>
            )}

            {/* Cabezal de Reproducción (Playhead Needle) con indicador visual de Imán cuando se alinea */}
            <div
              style={{ left: `${currentTime * zoom}px` }}
              className={`absolute top-0 bottom-0 pointer-events-none z-30 -translate-x-1/2 flex flex-col items-center transition-transform ${
                isSnappingPlayhead ? 'scale-110' : ''
              }`}
            >
              <div
                className={`w-3.5 h-4 clip-path-polygon shadow-md transition-all ${
                  isSnappingPlayhead
                    ? 'bg-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.9)]'
                    : 'bg-cyan-400'
                }`}
              />
              <div
                className={`flex-1 shadow-sm transition-all ${
                  isSnappingPlayhead
                    ? 'w-[2px] bg-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]'
                    : 'w-[1.5px] bg-cyan-400'
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
