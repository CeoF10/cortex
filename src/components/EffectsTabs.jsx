import React, { useEffect, useRef, memo } from 'react';
import { Check, Wand2, Layers, X } from 'lucide-react';
import {
  FILTER_PRESETS,
  TRANSITIONS,
  IDENTITY_FILTER,
  buildCssFilter,
  DEFAULT_TRANSITION_DURATION,
  MAX_TRANSITION_DURATION
} from '../../shared/effects.mjs';
import { drawTransition } from '../utils/transitions';

// Paisaje de muestra para las miniaturas cuando el clip no tiene imagen propia
const SAMPLE_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100">
      <defs>
        <linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#fbbf24"/></linearGradient>
      </defs>
      <rect width="160" height="100" fill="url(#s)"/>
      <circle cx="118" cy="38" r="14" fill="#fde68a"/>
      <path d="M0 78 L40 48 L70 70 L104 40 L160 82 L160 100 L0 100 Z" fill="#15803d"/>
      <path d="M0 92 L56 72 L110 90 L160 80 L160 100 L0 100 Z" fill="#166534"/>
    </svg>`
  );

function presetParams(preset) {
  return { ...IDENTITY_FILTER, ...preset.params };
}

const TabHint = ({ children }) => (
  <p className="text-[11px] text-gray-500 leading-snug">{children}</p>
);

export const FiltersTab = memo(function FiltersTab({ selectedClip, onApplyFilter, onApplyFilterToAll }) {
  const canFilter = selectedClip && (selectedClip.type === 'video' || selectedClip.type === 'image');
  const activeId = canFilter ? selectedClip.filterId || 'none' : null;
  const thumb = canFilter && selectedClip.thumbnail ? selectedClip.thumbnail : SAMPLE_IMAGE;

  return (
    <div className="flex-1 flex flex-col p-3 overflow-y-auto gap-3">
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-300 uppercase tracking-wider">
          <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Filtros ({FILTER_PRESETS.length - 1})</span>
        </div>
        {canFilter ? (
          <div className="flex items-center justify-between gap-2">
            <TabHint>Se aplica a «{selectedClip.name || 'clip'}». La intensidad se ajusta en Propiedades → Filtros.</TabHint>
            <span
              role="button"
              tabIndex={0}
              onClick={() => onApplyFilterToAll(activeId)}
              onKeyDown={(e) => e.key === 'Enter' && onApplyFilterToAll(activeId)}
              title="Aplicar este filtro a todos los videos e imágenes"
              className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded bg-[#202028] hover:bg-[#2b2b35] border border-[#2e2e3a] text-[10px] text-gray-300 cursor-pointer"
            >
              <Layers className="w-3 h-3" />
              A todos
            </span>
          </div>
        ) : (
          <TabHint>Selecciona un video o una imagen en la línea de tiempo para aplicarle un filtro.</TabHint>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 content-start">
        {FILTER_PRESETS.map((preset) => {
          const params = presetParams(preset);
          const isActive = preset.id === activeId;
          return (
            <div
              key={preset.id}
              role="button"
              tabIndex={0}
              aria-disabled={!canFilter}
              onClick={() => canFilter && onApplyFilter(preset.id)}
              onKeyDown={(e) => e.key === 'Enter' && canFilter && onApplyFilter(preset.id)}
              className={`min-w-0 flex flex-col gap-1 ${canFilter ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
            >
              <div
                className={`relative w-full aspect-video rounded-md overflow-hidden border-2 transition-colors ${
                  isActive ? 'border-cyan-400' : 'border-transparent hover:border-[#3a4a55]'
                }`}
              >
                <img
                  src={thumb}
                  alt=""
                  draggable={false}
                  className="w-full h-full object-cover"
                  style={{ filter: buildCssFilter(params, 0.3) }}
                />
                {params.vignette > 0 && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,${(0.85 * params.vignette).toFixed(2)}) 100%)`
                    }}
                  />
                )}
                {isActive && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center">
                    <Check className="w-3 h-3 text-black" />
                  </div>
                )}
              </div>
              <span className={`text-[11px] truncate text-center ${isActive ? 'text-cyan-300 font-semibold' : 'text-gray-300'}`}>
                {preset.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// Imágenes A/B sintéticas para previsualizar cada transición
let sampleLayers = null;
function getSampleLayers(w, h) {
  if (sampleLayers && sampleLayers.w === w) return sampleLayers;
  const make = (c1, c2, label) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `bold ${Math.round(h * 0.42)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, w / 2, h / 2);
    return c;
  };
  sampleLayers = { w, a: make('#0e7490', '#164e63', 'A'), b: make('#f59e0b', '#be185d', 'B') };
  return sampleLayers;
}

const THUMB_W = 160;
const THUMB_H = 90;

function TransitionThumb({ type }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  const paint = (p) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { a, b } = getSampleLayers(THUMB_W, THUMB_H);
    ctx.clearRect(0, 0, THUMB_W, THUMB_H);
    drawTransition(ctx, type, a, b, p, THUMB_W, THUMB_H);
  };

  useEffect(() => {
    paint(0.45);
    return () => cancelAnimationFrame(animRef.current);
  }, [type]);

  // Animación en bucle al pasar el ratón
  const start = () => {
    const t0 = performance.now();
    const loop = (now) => {
      const cycle = ((now - t0) / 1400) % 1.3;
      paint(Math.min(1, cycle));
      animRef.current = requestAnimationFrame(loop);
    };
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(loop);
  };
  const stop = () => {
    cancelAnimationFrame(animRef.current);
    paint(0.45);
  };

  return (
    <canvas
      ref={canvasRef}
      width={THUMB_W}
      height={THUMB_H}
      onMouseEnter={start}
      onMouseLeave={stop}
      className="w-full h-full block"
    />
  );
}

export const TransitionsTab = memo(function TransitionsTab({
  transitionTarget,
  onApplyTransition,
  onRemoveTransition,
  onChangeTransitionDuration
}) {
  const current = transitionTarget?.clip.transition || null;
  const duration = current?.duration ?? DEFAULT_TRANSITION_DURATION;
  const maxDuration = transitionTarget
    ? Math.max(0.1, Math.min(MAX_TRANSITION_DURATION, transitionTarget.clip.duration, transitionTarget.prev.duration))
    : MAX_TRANSITION_DURATION;

  return (
    <div className="flex-1 flex flex-col p-3 overflow-y-auto gap-3">
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-300 uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Transiciones ({TRANSITIONS.length})</span>
        </div>
        {transitionTarget ? (
          <TabHint>
            Corte entre «{transitionTarget.prev.name || 'clip'}» y «{transitionTarget.clip.name || 'clip'}». Pasa el
            ratón sobre una transición para verla.
          </TabHint>
        ) : (
          <TabHint>
            Coloca dos videos o imágenes seguidos en la misma pista y selecciona el segundo (o pon el cabezal cerca
            del corte) para añadir una transición.
          </TabHint>
        )}

        {current && (
          <div className="bg-[#1a1f24] border border-[#2a3540] rounded-lg p-2.5 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-400">
                Duración: <span className="font-mono text-cyan-300">{duration.toFixed(1)}s</span>
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={onRemoveTransition}
                onKeyDown={(e) => e.key === 'Enter' && onRemoveTransition()}
                className="flex items-center gap-1 text-red-300 hover:text-red-200 cursor-pointer"
              >
                <X className="w-3 h-3" />
                Quitar
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max={maxDuration}
              step="0.1"
              value={Math.min(duration, maxDuration)}
              onChange={(e) => onChangeTransitionDuration(Number(e.target.value))}
              className="w-full h-1.5 bg-[#282835] rounded appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 content-start">
        {TRANSITIONS.map((tr) => {
          const isActive = current?.type === tr.id;
          return (
            <div
              key={tr.id}
              role="button"
              tabIndex={0}
              aria-disabled={!transitionTarget}
              onClick={() => transitionTarget && onApplyTransition(tr.id)}
              onKeyDown={(e) => e.key === 'Enter' && transitionTarget && onApplyTransition(tr.id)}
              className={`min-w-0 flex flex-col gap-1 ${transitionTarget ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
            >
              <div
                className={`relative w-full aspect-video rounded-md overflow-hidden border-2 bg-black transition-colors ${
                  isActive ? 'border-cyan-400' : 'border-transparent hover:border-[#3a4a55]'
                }`}
              >
                <TransitionThumb type={tr.id} />
                {isActive && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center">
                    <Check className="w-3 h-3 text-black" />
                  </div>
                )}
              </div>
              <span className={`text-[11px] truncate text-center ${isActive ? 'text-cyan-300 font-semibold' : 'text-gray-300'}`}>
                {tr.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
