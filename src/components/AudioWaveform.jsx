import React, { useRef, useEffect, useState, useMemo } from 'react';

// Cache global en memoria para no recalcular ondas de sonido del mismo archivo
const globalWaveformCache = new Map();

// Ancho máximo por canvas para evitar exceder el límite de textura GPU de Chromium (16384px)
const CHUNK_WIDTH = 1200;

function WaveformCanvasChunk({
  chunkWidth,
  chunkHeight,
  chunkStartX,
  totalWidth,
  duration,
  offset,
  peaks,
  clipId,
  color,
  muted
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Ajustar resolución interna al tamaño CSS evitando exceder límites de textura GPU
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.floor(chunkWidth * dpr));
    canvas.height = Math.max(1, Math.floor(chunkHeight * dpr));

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, chunkWidth, chunkHeight);

    const barWidth = 2;
    const gap = 1.5;
    const step = barWidth + gap;
    const numBars = Math.floor(chunkWidth / step);
    if (numBars <= 0) return;

    const centerY = chunkHeight / 2;

    // Línea central de audio (guía sutil)
    ctx.fillStyle = muted ? 'rgba(156, 163, 175, 0.15)' : 'rgba(0, 240, 255, 0.12)';
    ctx.fillRect(0, centerY - 0.5, chunkWidth, 1);

    const hasRealPeaks = peaks && peaks.length > 0;

    // Gradiente vertical para aspecto moderno
    const gradient = ctx.createLinearGradient(0, 2, 0, chunkHeight - 2);
    if (muted) {
      gradient.addColorStop(0, '#64748b');
      gradient.addColorStop(0.5, '#475569');
      gradient.addColorStop(1, '#64748b');
    } else {
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, '#38bdf8');
      gradient.addColorStop(1, color);
    }
    ctx.fillStyle = gradient;

    for (let i = 0; i < numBars; i++) {
      const localX = i * step;
      const globalX = chunkStartX + localX;
      let amp = 0.2;

      if (hasRealPeaks) {
        // Mapear la posición de la barra al segundo exacto dentro del audio
        const timeInAudio = offset + (globalX / Math.max(1, totalWidth)) * duration;
        // Los picos se muestrean a 20Hz (20 muestras por segundo)
        const sampleIdx = Math.floor(timeInAudio * 20);
        if (sampleIdx >= 0 && sampleIdx < peaks.length) {
          amp = peaks[sampleIdx];
        } else {
          amp = 0.05;
        }
      } else {
        // Fallback procedural continuo mientras carga el archivo
        const globalBarIndex = Math.floor(globalX / step);
        const t = (globalBarIndex * 0.15) + (clipId.charCodeAt(clipId.length - 1) || 1);
        amp = 0.15 + 0.35 * Math.abs(Math.sin(t)) + 0.25 * Math.abs(Math.cos(t * 2.3));
      }

      // Altura mínima visible y máxima confinada
      const maxH = Math.max(4, chunkHeight - 6);
      const barH = Math.max(2.5, Math.min(maxH, amp * maxH));
      const y = centerY - barH / 2;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(localX, y, barWidth, barH, 1);
      } else {
        ctx.rect(localX, y, barWidth, barH);
      }
      ctx.fill();
    }
  }, [chunkWidth, chunkHeight, chunkStartX, totalWidth, duration, offset, peaks, clipId, color, muted]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        left: `${chunkStartX}px`,
        top: 0,
        width: `${chunkWidth}px`,
        height: `${chunkHeight}px`
      }}
      className="pointer-events-none select-none"
    />
  );
}

export default function AudioWaveform({ 
  clip, 
  zoom, 
  height = 44,
  color = '#00F0FF',
  muted = false 
}) {
  const [realPeaks, setRealPeaks] = useState(() => {
    return clip?.path && globalWaveformCache.has(clip.path) 
      ? globalWaveformCache.get(clip.path) 
      : null;
  });

  const totalWidth = Math.max(10, Math.floor(clip.duration * zoom));

  // Cargar ondas de sonido reales mediante FFmpeg
  useEffect(() => {
    if (!clip?.path) return;
    if (globalWaveformCache.has(clip.path)) {
      setRealPeaks(globalWaveformCache.get(clip.path));
      return;
    }

    let isMounted = true;
    if (window.cortexAPI?.getWaveform) {
      window.cortexAPI.getWaveform(clip.path).then((peaks) => {
        if (!isMounted) return;
        if (peaks && peaks.length > 0) {
          globalWaveformCache.set(clip.path, peaks);
          setRealPeaks(peaks);
        }
      }).catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [clip?.path]);

  // Dividir en chunks para evitar límites de textura GPU en HTML5 Canvas
  const numChunks = Math.max(1, Math.ceil(totalWidth / CHUNK_WIDTH));
  const chunks = useMemo(() => {
    const list = [];
    for (let i = 0; i < numChunks; i++) {
      const chunkStartX = i * CHUNK_WIDTH;
      const chunkWidth = Math.min(CHUNK_WIDTH, totalWidth - chunkStartX);
      if (chunkWidth > 0) {
        list.push({
          index: i,
          startX: chunkStartX,
          width: chunkWidth
        });
      }
    }
    return list;
  }, [totalWidth, numChunks]);

  return (
    <div
      style={{ width: `${totalWidth}px`, height: `${height}px` }}
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
    >
      {chunks.map((ch) => (
        <WaveformCanvasChunk
          key={`${clip.id}_chunk_${ch.index}`}
          chunkWidth={ch.width}
          chunkHeight={height}
          chunkStartX={ch.startX}
          totalWidth={totalWidth}
          duration={clip.duration}
          offset={clip.offset || 0}
          peaks={realPeaks}
          clipId={clip.id}
          color={color}
          muted={muted}
        />
      ))}
    </div>
  );
}
