import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize 
} from 'lucide-react';
import { formatTimecode } from '../utils/timeFormat';
import { calculateClipAnimation } from '../utils/animations';
import { isTypingTarget } from '../utils/dom';

export default function CanvasPlayer({
  currentTime,
  setCurrentTime,
  totalDuration,
  isPlaying,
  setIsPlaying,
  aspectRatio,
  tracks,
  canvasRef,
  onUpdateClipDuration
}) {
  const containerRef = useRef(null);
  const internalCanvasRef = useRef(null);
  const activeCanvas = canvasRef || internalCanvasRef;

  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Pool de elementos multimedia (almacenados por clip.id y por url)
  const mediaElementsRef = useRef(new Map());
  const renderFrameRef = useRef(null);

  // Ref que mantiene la posición exacta de tiempo sin provocar re-renders del bucle
  // Durante la reproducción el bucle es la fuente de verdad: sincronizar desde props solo en pausa
  // (si no, un render atrasado puede devolver el cabezal a un frame anterior).
  // Solo se copia cuando la prop cambia de verdad (un seek), no al re-renderizar con un valor viejo.
  const currentTimeRef = useRef(currentTime);
  const lastPropTimeRef = useRef(currentTime);
  if (currentTime !== lastPropTimeRef.current) {
    lastPropTimeRef.current = currentTime;
    // En reproducción, los valores publicados por el propio bucle van como mucho ~1 frame atrasados;
    // un salto mayor es un seek del usuario (clic en la regla, J/L, etc.).
    if (!isPlaying || Math.abs(currentTime - currentTimeRef.current) > 0.25) {
      currentTimeRef.current = currentTime;
    }
  }

  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  const allClips = useMemo(() => {
    return tracks.flatMap((t) => t.clips);
  }, [tracks]);

  // Índice clip -> pista silenciada, para no buscar la pista de cada clip en cada frame
  const mutedClipIds = useMemo(() => {
    const ids = new Set();
    tracks.forEach((t) => {
      if (t.muted) t.clips.forEach((c) => ids.add(c.id));
    });
    return ids;
  }, [tracks]);

  const getCanvasDimensions = useCallback(() => {
    switch (aspectRatio) {
      case '9:16':
        return { width: 1080, height: 1920 };
      case '1:1':
        return { width: 1080, height: 1080 };
      case '16:9':
      default:
        return { width: 1920, height: 1080 };
    }
  }, [aspectRatio]);

  // Carga y precalentamiento de elementos multimedia
  useEffect(() => {
    const map = mediaElementsRef.current;
    const activeKeys = new Set();

    allClips.forEach((clip) => {
      const src = clip.url || (clip.path ? 'file://' + clip.path : null);
      if (!src) return;
      activeKeys.add(clip.id);
      activeKeys.add(src);

      if (!map.has(clip.id)) {
        if (clip.type === 'video') {
          const v = document.createElement('video');
          v.src = src;
          v.crossOrigin = 'anonymous';
          v.preload = 'auto';
          v.muted = isMutedRef.current;
          v.onloadedmetadata = () => {
            if (v.duration && isFinite(v.duration) && onUpdateClipDuration) {
              onUpdateClipDuration(clip.id, v.duration);
            }
          };
          map.set(clip.id, v);
          map.set(src, v);
        } else if (clip.type === 'audio') {
          const a = document.createElement('audio');
          a.src = src;
          a.preload = 'auto';
          a.muted = isMutedRef.current;
          a.onloadedmetadata = () => {
            if (a.duration && isFinite(a.duration) && onUpdateClipDuration) {
              onUpdateClipDuration(clip.id, a.duration);
            }
          };
          map.set(clip.id, a);
          map.set(src, a);
        } else if (clip.type === 'image') {
          const img = new Image();
          if (src.startsWith('http://') || src.startsWith('https://')) {
            img.crossOrigin = 'anonymous';
          }
          img.onload = () => {
            renderFrameRef.current?.();
          };
          img.onerror = () => console.warn('Error cargando imagen en canvas:', src);
          img.src = src;
          map.set(clip.id, img);
          map.set(src, img);
          if (clip.path) {
            map.set(clip.path, img);
            map.set('file://' + clip.path, img);
            try {
              map.set('file://' + encodeURI(clip.path), img);
            } catch (e) {}
          }
          if (clip.url) {
            map.set(clip.url, img);
            try {
              map.set(decodeURI(clip.url), img);
            } catch (e) {}
          }
          if (img.complete) {
            renderFrameRef.current?.();
          }
        }
      }
    });

    // Limpiar clips obsoletos para no acumular memoria
    for (const [key, el] of map.entries()) {
      if (!activeKeys.has(key)) {
        if (el && typeof el.pause === 'function') el.pause();
        map.delete(key);
      }
    }
  }, [allClips, onUpdateClipDuration]);

  // Sincronización de mute
  useEffect(() => {
    mediaElementsRef.current.forEach((el) => {
      if (el) el.muted = isMuted;
    });
  }, [isMuted]);

  // Render loop del Canvas (recibe tiempo opcional para renderizar con precisión atómica)
  const renderFrame = useCallback((timeOverride = null) => {
    const time = timeOverride !== null ? timeOverride : currentTimeRef.current;
    const canvas = activeCanvas.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = getCanvasDimensions();
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, width, height);

    // 1. Renderizar pistas visuales (Videos e Imágenes con Animaciones y Superposiciones)
    const activeVisuals = [];
    tracks.forEach((track, trackIndex) => {
      if (track.hidden) return;
      track.clips.forEach((clip) => {
        if (
          (clip.type === 'video' || clip.type === 'image') &&
          time >= clip.start &&
          time < clip.start + clip.duration
        ) {
          activeVisuals.push({ clip, trackIndex });
        }
      });
    });

    // Orden jerárquico de capas:
    // 1. Videos de fondo se dibujan primero.
    // 2. Imágenes (PNG con transparencias, stickers, logos, marcas de agua) se dibujan ENCIMA del video.
    // 3. Si son del mismo tipo, la pista superior (mayor índice) va encima.
    activeVisuals.sort((a, b) => {
      if (a.clip.type === 'video' && b.clip.type === 'image') return -1;
      if (a.clip.type === 'image' && b.clip.type === 'video') return 1;
      return a.trackIndex - b.trackIndex;
    });

    activeVisuals.forEach(({ clip: activeVisual }) => {
      let mediaEl =
        mediaElementsRef.current.get(activeVisual.id) ||
        mediaElementsRef.current.get(activeVisual.url) ||
        (activeVisual.path ? mediaElementsRef.current.get(activeVisual.path) : null) ||
        (activeVisual.path ? mediaElementsRef.current.get('file://' + activeVisual.path) : null);

      if (!mediaEl && activeVisual.url) {
        try {
          mediaEl = mediaElementsRef.current.get(decodeURI(activeVisual.url));
        } catch (e) {}
      }

      // Auto-crear / cargar imagen si todavía no existe o si no ha terminado de cargar
      if (activeVisual.type === 'image') {
        if (!mediaEl) {
          const src = activeVisual.url || (activeVisual.path ? 'file://' + activeVisual.path : null);
          if (src) {
            mediaEl = new Image();
            if (src.startsWith('http://') || src.startsWith('https://')) {
              mediaEl.crossOrigin = 'anonymous';
            }
            mediaEl.onload = () => renderFrameRef.current?.();
            mediaEl.onerror = () => console.warn('Error cargando imagen:', src);
            mediaEl.src = src;
            mediaElementsRef.current.set(activeVisual.id, mediaEl);
            mediaElementsRef.current.set(src, mediaEl);
            if (activeVisual.path) {
              mediaElementsRef.current.set(activeVisual.path, mediaEl);
              mediaElementsRef.current.set('file://' + activeVisual.path, mediaEl);
            }
          }
        } else if (!mediaEl.complete) {
          mediaEl.onload = () => renderFrameRef.current?.();
        }
      }

      const relTime = time - activeVisual.start;
      const anim = calculateClipAnimation(activeVisual, relTime, activeVisual.duration, width, height);

      if (activeVisual.type === 'image' && mediaEl && (mediaEl.complete || mediaEl.naturalWidth > 0)) {
        const imgAspect = (mediaEl.naturalWidth || 1) / (mediaEl.naturalHeight || 1);
        const canvasAspect = width / height;
        let dw = width;
        let dh = height;

        if (imgAspect > canvasAspect) {
          dw = width;
          dh = width / imgAspect;
        } else {
          dh = height;
          dw = height * imgAspect;
        }

        ctx.save();
        const b = anim.brightness * (activeVisual.brightness || 1);
        const c = activeVisual.contrast || 1;
        const s = activeVisual.saturate || 1;
        if (b !== 1 || c !== 1 || s !== 1) {
          ctx.filter = `brightness(${b}) contrast(${c}) saturate(${s})`;
        } else {
          ctx.filter = 'none';
        }

        const userScale = activeVisual.scale !== undefined ? activeVisual.scale : 1;
        const userPosX = activeVisual.posX !== undefined ? (width * activeVisual.posX / 100) : 0;
        const userPosY = activeVisual.posY !== undefined ? (height * activeVisual.posY / 100) : 0;

        ctx.globalAlpha = Math.max(0, Math.min(1, (activeVisual.opacity ?? 1) * anim.opacity));
        ctx.translate(width / 2 + anim.translateX + userPosX, height / 2 + anim.translateY + userPosY);
        if (anim.rotate) ctx.rotate(anim.rotate);
        const finalScale = anim.scale * userScale;
        if (finalScale !== 1) ctx.scale(finalScale, finalScale);

        ctx.drawImage(mediaEl, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();

      } else if (activeVisual.type === 'video' && mediaEl && mediaEl.readyState >= 2) {
        const vAspect = (mediaEl.videoWidth || 1) / (mediaEl.videoHeight || 1);
        const canvasAspect = width / height;
        let dw = width;
        let dh = height;

        if (vAspect > canvasAspect) {
          dw = width;
          dh = width / vAspect;
        } else {
          dh = height;
          dw = height * vAspect;
        }

        ctx.save();
        const b = anim.brightness * (activeVisual.brightness || 1);
        const c = activeVisual.contrast || 1;
        const s = activeVisual.saturate || 1;
        if (b !== 1 || c !== 1 || s !== 1) {
          ctx.filter = `brightness(${b}) contrast(${c}) saturate(${s})`;
        } else {
          ctx.filter = 'none';
        }

        const userScale = activeVisual.scale !== undefined ? activeVisual.scale : 1;
        const userPosX = activeVisual.posX !== undefined ? (width * activeVisual.posX / 100) : 0;
        const userPosY = activeVisual.posY !== undefined ? (height * activeVisual.posY / 100) : 0;

        ctx.globalAlpha = Math.max(0, Math.min(1, (activeVisual.opacity ?? 1) * anim.opacity));
        ctx.translate(width / 2 + anim.translateX + userPosX, height / 2 + anim.translateY + userPosY);
        if (anim.rotate) ctx.rotate(anim.rotate);
        const finalScale = anim.scale * userScale;
        if (finalScale !== 1) ctx.scale(finalScale, finalScale);

        ctx.drawImage(mediaEl, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();
      }
    });

    // 2. Renderizar Textos y Subtítulos con Karaoke y colores virales
    tracks.forEach((track) => {
      const activeTexts = track.clips.filter(
        (c) => c.type === 'text' && time >= c.start && time < c.start + c.duration
      );

      activeTexts.forEach((t) => {
        const relTime = time - t.start;
        const anim = calculateClipAnimation(t, relTime, t.duration, width, height);

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, anim.opacity));

        const fontSize = (t.fontSize || 42) * (height / 1080);
        ctx.font = `bold ${fontSize}px ${t.fontFamily || 'Montserrat, sans-serif'}`;
        ctx.textBaseline = 'middle';

        const posX = width / 2 + anim.translateX;
        const posY = height * ((t.positionY !== undefined ? t.positionY : 87) / 100) + anim.translateY;

        ctx.translate(posX, posY);
        if (anim.rotate) ctx.rotate(anim.rotate);
        if (anim.scale !== 1) ctx.scale(anim.scale, anim.scale);

        const paddingX = 22 * (height / 1080);
        const paddingY = 12 * (height / 1080);

        if (t.isSubtitle || t.karaoke) {
          const rawWords = (t.words && Array.isArray(t.words) && t.words.length > 0)
            ? t.words.map((w) => (typeof w === 'object' ? w.word : String(w)))
            : (t.text || '').trim().split(/\s+/);

          const words = t.uppercase ? rawWords.map((w) => w.toUpperCase()) : rawWords;

          let activeWordIndex = -1;
          if (t.words && Array.isArray(t.words) && t.words.length > 0) {
            if (time <= t.words[0].end) {
              activeWordIndex = 0;
            } else if (time >= t.words[t.words.length - 1].start) {
              activeWordIndex = t.words.length - 1;
            } else {
              for (let i = 0; i < t.words.length; i++) {
                const w = t.words[i];
                const nextW = t.words[i + 1];
                if (time >= w.start && (!nextW || time < nextW.start)) {
                  activeWordIndex = i;
                  break;
                }
              }
            }
          }
          if (activeWordIndex === -1 && words.length > 0) {
            const progress = Math.max(0, Math.min(0.999, relTime / Math.max(0.1, t.duration)));
            activeWordIndex = Math.floor(progress * words.length);
          }

          const spaceWidth = ctx.measureText(' ').width;
          const wordMetrics = words.map((w) => ({ word: w, width: ctx.measureText(w).width }));
          const totalWidth = wordMetrics.reduce((sum, item) => sum + item.width, 0) + (words.length - 1) * spaceWidth;

          if (t.bgColor && t.bgColor !== 'transparent') {
            ctx.fillStyle = t.bgColor;
            const radius = 8 * (height / 1080);
            const boxW = totalWidth + paddingX * 2;
            const boxH = fontSize + paddingY * 2;
            ctx.beginPath();
            ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, radius);
            ctx.fill();
          }

          let currentX = -totalWidth / 2;
          ctx.textAlign = 'left';

          words.forEach((w, i) => {
            const isHighlight = i === activeWordIndex;
            const wordColor = isHighlight ? (t.highlightColor || '#00E5FF') : (t.color || '#FFFFFF');
            const metrics = wordMetrics[i];

            if (isHighlight) {
              ctx.save();
              ctx.shadowColor = t.highlightColor || '#00E5FF';
              ctx.shadowBlur = 12 * (height / 1080);
            }

            if (t.strokeWidth && t.strokeWidth > 0 && t.strokeColor) {
              ctx.strokeStyle = t.strokeColor;
              ctx.lineWidth = t.strokeWidth * (height / 1080);
              ctx.strokeText(w, currentX, 0);
            }

            ctx.fillStyle = wordColor;
            ctx.fillText(w, currentX, 0);

            if (isHighlight) {
              ctx.restore();
            }

            currentX += metrics.width + spaceWidth;
          });
        } else {
          const displayText = t.uppercase ? (t.text || '').toUpperCase() : (t.text || '');
          ctx.textAlign = 'center';
          const metrics = ctx.measureText(displayText);
          const textWidth = metrics.width;
          const boxHeight = fontSize + paddingY * 2;
          const boxWidth = textWidth + paddingX * 2;

          if (t.bgColor && t.bgColor !== 'transparent') {
            ctx.fillStyle = t.bgColor;
            const radius = 8 * (height / 1080);
            ctx.beginPath();
            ctx.roundRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, radius);
            ctx.fill();
          }

          if (t.strokeWidth && t.strokeWidth > 0 && t.strokeColor && t.strokeColor !== 'transparent') {
            ctx.strokeStyle = t.strokeColor;
            ctx.lineWidth = t.strokeWidth * (height / 1080);
            ctx.strokeText(displayText, 0, 0);
          }

          ctx.fillStyle = t.color || '#FFFFFF';
          ctx.fillText(displayText, 0, 0);
        }

        ctx.restore();
      });
    });
  }, [tracks, getCanvasDimensions, activeCanvas]);

  useEffect(() => {
    renderFrameRef.current = renderFrame;
  }, [renderFrame]);

  // Forzar redibujado instantáneo cuando las fuentes de Google Fonts terminen de cargar
  useEffect(() => {
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        renderFrame(currentTimeRef.current);
      });
    }
  }, [renderFrame]);

  // Sincronización cuando el usuario mueve el cabezal estando en PAUSA
  useEffect(() => {
    if (!isPlaying) {
      allClips.forEach((clip) => {
        if (clip.type !== 'audio' && clip.type !== 'video') return;
        const el = mediaElementsRef.current.get(clip.id) || mediaElementsRef.current.get(clip.url);
        if (!el) return;

        const isInside = currentTime >= clip.start && currentTime < clip.start + clip.duration;
        if (isInside) {
          const targetTime = (currentTime - clip.start) + (clip.offset || 0);
          try {
            if (Math.abs(el.currentTime - targetTime) > 0.05) {
              el.currentTime = targetTime;
            }
          } catch (e) {}
        }
      });
      renderFrame(currentTime);
    }
  }, [currentTime, isPlaying, allClips, renderFrame]);

  // Cálculo dinámico de volumen con soporte para Mute de pista, Mute de clip, Fade In y Fade Out
  const computeClipVolume = useCallback((clip, curTime) => {
    if (clip.muted || mutedClipIds.has(clip.id)) return 0;

    let vol = clip.volume !== undefined ? clip.volume : 1;
    if (vol <= 0.005) return 0;

    const relTime = curTime - clip.start;
    if (clip.fadeIn && clip.fadeIn > 0 && relTime < clip.fadeIn) {
      vol *= Math.max(0, Math.min(1, relTime / clip.fadeIn));
    }
    if (clip.fadeOut && clip.fadeOut > 0 && (clip.duration - relTime) < clip.fadeOut) {
      vol *= Math.max(0, Math.min(1, (clip.duration - relTime) / clip.fadeOut));
    }
    // HTMLMediaElement.volume lanza excepción por encima de 1
    return Math.max(0, Math.min(1, vol));
  }, [mutedClipIds]);

  // Manejo de cambio de estado isPlaying (Play / Pausa)
  useEffect(() => {
    if (!isPlaying) {
      // Publicar la posición exacta (el estado se actualiza con throttle durante la reproducción)
      if (currentTimeRef.current !== lastPropTimeRef.current) {
        setCurrentTime(currentTimeRef.current);
      }
      // Pausar todos los elementos multimedia de inmediato
      mediaElementsRef.current.forEach((el) => {
        if (el && typeof el.pause === 'function') {
          el.pause();
        }
      });
    } else {
      // Iniciar reproducción de los elementos activos en este instante
      const curTime = currentTimeRef.current;
      allClips.forEach((clip) => {
        if (clip.type !== 'audio' && clip.type !== 'video') return;
        const el = mediaElementsRef.current.get(clip.id) || mediaElementsRef.current.get(clip.url);
        if (!el) return;

        const isInside = curTime >= clip.start && curTime < clip.start + clip.duration;
        if (isInside) {
          const targetTime = (curTime - clip.start) + (clip.offset || 0);
          try {
            if (Math.abs(el.currentTime - targetTime) > 0.1) {
              el.currentTime = targetTime;
            }
          } catch (e) {}
          const vol = computeClipVolume(clip, curTime);
          el.volume = vol;
          el.muted = isMuted || vol === 0;
          el.play().catch(() => {});
        }
      });
    }
  }, [isPlaying, allClips, isMuted, computeClipVolume]);

  // Bucle maestro de reproducción a 60 FPS con sincronización al Audio Maestro
  useEffect(() => {
    if (!isPlaying) return;

    let animId;
    let lastTime = performance.now();
    // El canvas se pinta a 60 FPS, pero el estado de React (timeline, contadores) a ~30 FPS
    let lastStateSync = 0;
    const playableClips = allClips.filter((c) => c.type === 'audio' || c.type === 'video');

    const loop = (now) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      let curTime = currentTimeRef.current;

      // 1. Identificar si hay un audio activo para usar como reloj maestro absoluto
      const activeAudioClip = allClips.find(
        (c) => c.type === 'audio' && curTime >= c.start && curTime < c.start + c.duration
      );
      const activeAudioEl = activeAudioClip 
        ? (mediaElementsRef.current.get(activeAudioClip.id) || mediaElementsRef.current.get(activeAudioClip.url))
        : null;

      if (activeAudioEl && !activeAudioEl.paused && activeAudioEl.readyState >= 2) {
        // Reloj maestro guiado por el hardware de sonido
        curTime = activeAudioClip.start + activeAudioEl.currentTime - (activeAudioClip.offset || 0);
      } else {
        // En ausencia de audio o durante buffer, avanzar mediante delta de reloj de alta precisión
        curTime = curTime + delta;
      }

      // Verificación de fin de línea de tiempo
      if (curTime >= totalDuration) {
        setIsPlaying(false);
        currentTimeRef.current = totalDuration;
        setCurrentTime(totalDuration);
        renderFrame(totalDuration);
        return;
      }

      currentTimeRef.current = curTime;
      if (now - lastStateSync >= 33) {
        lastStateSync = now;
        setCurrentTime(curTime);
      }

      // 2. Control dinámico de clips: arrancar o pausar según posición en la línea de tiempo
      playableClips.forEach((clip) => {
        const el = mediaElementsRef.current.get(clip.id) || mediaElementsRef.current.get(clip.url);
        if (!el) return;

        const isInside = curTime >= clip.start && curTime < clip.start + clip.duration;
        const targetMediaTime = (curTime - clip.start) + (clip.offset || 0);

        if (isInside) {
          // Ajustar velocidad de reproducción si está definida
          if (clip.speed && el.playbackRate !== clip.speed) {
            try { el.playbackRate = clip.speed; } catch (e) {}
          }

          const vol = computeClipVolume(clip, curTime);
          el.volume = vol;
          el.muted = isMuted || vol === 0;

          if (el.paused) {
            try {
              if (Math.abs(el.currentTime - targetMediaTime) > 0.1) {
                el.currentTime = targetMediaTime;
              }
            } catch (e) {}
            el.play().catch(() => {});
          } else {
            // Si el clip ya está reproduciéndose y se desvía más de 0.25s (excepto si es el audio maestro), resincronizar suavemente
            if (el !== activeAudioEl && Math.abs(el.currentTime - targetMediaTime) > 0.25) {
              try { el.currentTime = targetMediaTime; } catch (e) {}
            }
          }
        } else {
          if (!el.paused) {
            el.pause();
          }
        }
      });

      renderFrame(curTime);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, totalDuration, allClips, isMuted, renderFrame, setCurrentTime, setIsPlaying, computeClipVolume]);

  // Atajos de teclado profesionales (Espacio, J, K, L, Flechas frame por frame, Mute)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isTypingTarget(e.target)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        // 1 frame atrás (1/30s = ~0.033s)
        setCurrentTime((prev) => Math.max(0, Math.round((prev - 0.0333) * 1000) / 1000));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        // 1 frame adelante
        setCurrentTime((prev) => Math.min(totalDuration, Math.round((prev + 0.0333) * 1000) / 1000));
      } else if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        setCurrentTime((prev) => Math.max(0, prev - 1.0));
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        setIsPlaying(false);
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        setCurrentTime((prev) => Math.min(totalDuration, prev + 1.0));
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setIsMuted((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalDuration, setCurrentTime, setIsPlaying]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-[#0d0d10] flex flex-col items-center justify-center relative overflow-hidden select-none"
    >
      <div className="flex-1 w-full h-full flex items-center justify-center p-4 relative">
        <div
          className={`relative max-w-full max-h-full rounded-lg overflow-hidden shadow-2xl bg-black border border-[#23232c] flex items-center justify-center transition-all ${
            aspectRatio === '9:16'
              ? 'aspect-[9/16] h-[90%]'
              : aspectRatio === '1:1'
              ? 'aspect-square h-[85%]'
              : 'aspect-video w-[90%] max-w-[960px]'
          }`}
        >
          <canvas
            ref={activeCanvas}
            className="w-full h-full object-contain cursor-pointer"
            onClick={() => setIsPlaying(!isPlaying)}
          />

          {!isPlaying && (
            <div
              onClick={() => setIsPlaying(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/10 cursor-pointer group transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-cyan-500/90 text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play className="w-7 h-7 ml-1 fill-black" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Barra de control y transporte del reproductor */}
      <div className="h-12 w-full bg-[#141418] border-t border-[#23232c] flex items-center justify-between px-6 z-10 flex-shrink-0">
        <div className="flex items-center space-x-2 text-xs font-mono text-gray-300">
          <span className="text-cyan-400 font-bold">{formatTimecode(currentTime)}</span>
          <span className="text-gray-600">/</span>
          <span>{formatTimecode(totalDuration)}</span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setCurrentTime(Math.max(0, currentTime - 1))}
            title="Retroceder 1s"
            className="p-1.5 rounded-lg hover:bg-[#25252f] text-gray-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pausar (Espacio)' : 'Reproducir (Espacio)'}
            className="w-9 h-9 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center shadow-md transition-all active:scale-95"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-black" />
            ) : (
              <Play className="w-5 h-5 ml-0.5 fill-black" />
            )}
          </button>

          <button
            onClick={() => setCurrentTime(Math.min(totalDuration, currentTime + 1))}
            title="Adelantar 1s"
            className="p-1.5 rounded-lg hover:bg-[#25252f] text-gray-400 hover:text-white transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Activar sonido' : 'Silenciar'}
            className="p-1.5 rounded-lg hover:bg-[#25252f] text-gray-400 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            className="p-1.5 rounded-lg hover:bg-[#25252f] text-gray-400 hover:text-white transition-colors"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
