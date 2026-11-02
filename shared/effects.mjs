/**
 * Definición única de filtros y transiciones, compartida por la vista previa (canvas)
 * y la exportación (FFmpeg) para que lo que se ve sea exactamente lo que se exporta.
 *
 * Cada filtro se describe con parámetros que tienen equivalente exacto en ambos motores:
 *   brightness, contrast, saturate, sepia, grayscale, hue, invert  -> CSS filter / lutrgb + colorchannelmixer
 *   blur                                                          -> CSS blur / gblur
 *   vignette                                                      -> degradado radial cos^4 / filtro vignette
 */

export const IDENTITY_FILTER = Object.freeze({
  brightness: 1,
  contrast: 1,
  saturate: 1,
  sepia: 0,
  grayscale: 0,
  hue: 0,
  invert: 0,
  blur: 0,
  vignette: 0
});

export const FILTER_PRESETS = [
  { id: 'none', name: 'Original', params: {} },
  { id: 'vivid', name: 'Vívido', params: { contrast: 1.15, saturate: 1.45 } },
  { id: 'warm', name: 'Cálido', params: { brightness: 1.05, saturate: 1.25, sepia: 0.35, hue: -12 } },
  { id: 'cool', name: 'Frío', params: { contrast: 1.05, saturate: 1.1, sepia: 0.3, hue: 170 } },
  { id: 'bw', name: 'B/N', params: { grayscale: 1, contrast: 1.1 } },
  { id: 'noir', name: 'Noir', params: { brightness: 0.9, contrast: 1.5, grayscale: 1, vignette: 0.6 } },
  { id: 'sepia', name: 'Sepia', params: { contrast: 1.05, sepia: 0.85 } },
  { id: 'vintage', name: 'Vintage', params: { brightness: 1.05, contrast: 0.9, saturate: 0.8, sepia: 0.45, vignette: 0.5 } },
  { id: 'cinema', name: 'Cine', params: { contrast: 1.2, saturate: 1.15, sepia: 0.2, hue: -8, vignette: 0.4 } },
  { id: 'faded', name: 'Desvanecido', params: { brightness: 1.1, contrast: 0.8, saturate: 0.75 } },
  { id: 'dramatic', name: 'Dramático', params: { brightness: 0.95, contrast: 1.45, saturate: 0.85, vignette: 0.5 } },
  { id: 'sunset', name: 'Atardecer', params: { brightness: 1.05, saturate: 1.6, sepia: 0.5, hue: -25 } },
  { id: 'ocean', name: 'Océano', params: { saturate: 1.4, sepia: 0.35, hue: 190 } },
  { id: 'neon', name: 'Neón', params: { contrast: 1.25, saturate: 2, hue: 20 } },
  { id: 'pastel', name: 'Pastel', params: { brightness: 1.15, contrast: 0.85, saturate: 0.65 } },
  { id: 'retro80', name: 'Retro 80s', params: { contrast: 1.1, saturate: 1.5, sepia: 0.3, hue: 290 } },
  { id: 'forest', name: 'Bosque', params: { saturate: 1.2, sepia: 0.3, hue: 60 } },
  { id: 'winter', name: 'Invierno', params: { brightness: 1.1, saturate: 0.6, sepia: 0.2, hue: 180 } },
  { id: 'negative', name: 'Negativo', params: { invert: 1 } },
  { id: 'dreamy', name: 'Sueño', params: { brightness: 1.12, contrast: 0.9, saturate: 1.15, blur: 2 } },
  { id: 'film', name: 'Película', params: { contrast: 1.1, saturate: 1.2, sepia: 0.25, hue: -5, vignette: 0.3 } }
];

const PRESET_BY_ID = new Map(FILTER_PRESETS.map((p) => [p.id, p]));

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const num = (v, fallback) => (typeof v === 'number' && isFinite(v) ? v : fallback);

/**
 * Parámetros finales de un clip: preset (escalado por su intensidad) combinado con los ajustes manuales.
 */
export function getClipFilterParams(clip) {
  const preset = PRESET_BY_ID.get(clip?.filterId) || PRESET_BY_ID.get('none');
  const k = clamp(num(clip?.filterIntensity, 1), 0, 1);
  const p = { ...IDENTITY_FILTER };
  for (const key of Object.keys(preset.params)) {
    p[key] = IDENTITY_FILTER[key] + (preset.params[key] - IDENTITY_FILTER[key]) * k;
  }

  p.brightness *= num(clip?.brightness, 1);
  p.contrast *= num(clip?.contrast, 1);
  p.saturate *= num(clip?.saturate, 1);
  p.hue += num(clip?.hue, 0);
  p.blur += num(clip?.blur, 0);
  p.vignette = clamp(p.vignette + num(clip?.vignette, 0), 0, 1);
  p.invert = p.invert >= 0.5 ? 1 : 0;
  return p;
}

export function isIdentityFilter(p) {
  return (
    Math.abs(p.brightness - 1) < 0.001 &&
    Math.abs(p.contrast - 1) < 0.001 &&
    Math.abs(p.saturate - 1) < 0.001 &&
    p.sepia < 0.001 &&
    p.grayscale < 0.001 &&
    Math.abs(p.hue % 360) < 0.01 &&
    !p.invert &&
    p.blur < 0.01
  );
}

/**
 * Cadena CSS para ctx.filter. El orden coincide con la cadena FFmpeg de buildFfmpegFilterChain.
 * `blurScale` permite reducir el desenfoque en miniaturas pequeñas.
 */
export function buildCssFilter(p, blurScale = 1) {
  const parts = [];
  if (Math.abs(p.brightness - 1) > 0.001) parts.push(`brightness(${p.brightness.toFixed(3)})`);
  if (Math.abs(p.contrast - 1) > 0.001) parts.push(`contrast(${p.contrast.toFixed(3)})`);
  if (Math.abs(p.saturate - 1) > 0.001) parts.push(`saturate(${p.saturate.toFixed(3)})`);
  if (p.sepia > 0.001) parts.push(`sepia(${p.sepia.toFixed(3)})`);
  if (p.grayscale > 0.001) parts.push(`grayscale(${p.grayscale.toFixed(3)})`);
  if (Math.abs(p.hue % 360) > 0.01) parts.push(`hue-rotate(${p.hue.toFixed(2)}deg)`);
  if (p.invert) parts.push('invert(1)');
  if (p.blur > 0.01) parts.push(`blur(${(p.blur * blurScale).toFixed(2)}px)`);
  return parts.length ? parts.join(' ') : 'none';
}

// --- Matrices de color idénticas a la especificación CSS Filter Effects ---

function saturateMatrix(s) {
  return [
    0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s
  ];
}

function sepiaMatrix(a) {
  const k = 1 - clamp(a, 0, 1);
  return [
    0.393 + 0.607 * k, 0.769 - 0.769 * k, 0.189 - 0.189 * k,
    0.349 - 0.349 * k, 0.686 + 0.314 * k, 0.168 - 0.168 * k,
    0.272 - 0.272 * k, 0.534 - 0.534 * k, 0.131 + 0.869 * k
  ];
}

function grayscaleMatrix(a) {
  const k = 1 - clamp(a, 0, 1);
  return [
    0.2126 + 0.7874 * k, 0.7152 - 0.7152 * k, 0.0722 - 0.0722 * k,
    0.2126 - 0.2126 * k, 0.7152 + 0.2848 * k, 0.0722 - 0.0722 * k,
    0.2126 - 0.2126 * k, 0.7152 - 0.7152 * k, 0.0722 + 0.9278 * k
  ];
}

function hueMatrix(deg) {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [
    0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072
  ];
}

/**
 * Filtros FFmpeg equivalentes (el stream debe estar en formato rgba).
 * `scaleFactor` ajusta el desenfoque cuando la exportación no está a la resolución de la vista previa.
 */
export function buildFfmpegFilterChain(p, scaleFactor = 1) {
  const chain = [];
  const hasBright = Math.abs(p.brightness - 1) > 0.001;
  const hasContrast = Math.abs(p.contrast - 1) > 0.001;

  if (hasBright || hasContrast) {
    // CSS: brillo (multiplicar) y luego contraste ((x-0.5)*c+0.5), con recorte tras cada paso
    const b = p.brightness.toFixed(4);
    const c = p.contrast.toFixed(4);
    const expr = `clip((clip(val*${b}\\,0\\,255)-128)*${c}+128\\,0\\,255)`;
    chain.push(`lutrgb=r='${expr}':g='${expr}':b='${expr}'`);
  }

  // Un colorchannelmixer por paso: igual que CSS, cada función recorta a 0..255 antes de la siguiente
  // (multiplicar las matrices sin recortar se desvía mucho con saturación alta + tono).
  const f = (v) => v.toFixed(5);
  const pushMatrix = (m) => {
    chain.push(
      `colorchannelmixer=rr=${f(m[0])}:rg=${f(m[1])}:rb=${f(m[2])}:gr=${f(m[3])}:gg=${f(m[4])}:gb=${f(m[5])}:br=${f(m[6])}:bg=${f(m[7])}:bb=${f(m[8])}`
    );
  };
  if (Math.abs(p.saturate - 1) > 0.001) pushMatrix(saturateMatrix(p.saturate));
  if (p.sepia > 0.001) pushMatrix(sepiaMatrix(p.sepia));
  if (p.grayscale > 0.001) pushMatrix(grayscaleMatrix(p.grayscale));
  if (Math.abs(p.hue % 360) > 0.01) pushMatrix(hueMatrix(p.hue));

  if (p.invert) chain.push('negate');
  if (p.blur > 0.01) chain.push(`gblur=sigma=${(p.blur * scaleFactor).toFixed(2)}`);
  if (p.vignette > 0.001) chain.push(`vignette=angle=${vignetteAngle(p.vignette).toFixed(4)}`);
  return chain;
}

// Intensidad de viñeta 0..1 -> ángulo del filtro vignette de FFmpeg (0..PI/3)
export function vignetteAngle(amount) {
  return clamp(amount, 0, 1) * (Math.PI / 3);
}

/**
 * Oscurecimiento de la viñeta a una distancia normalizada r (0 centro, 1 esquina).
 * Es la misma curva que usa FFmpeg: factor = cos(ángulo · r)^4.
 */
export function vignetteDarkness(amount, r) {
  const f = Math.pow(Math.cos(vignetteAngle(amount) * clamp(r, 0, 1)), 4);
  return 1 - f;
}

// --- Transiciones ---
// `xfade` es el nombre de la transición en el filtro xfade de FFmpeg.

export const TRANSITIONS = [
  { id: 'fade', name: 'Fundido', xfade: 'fade' },
  { id: 'fadeblack', name: 'Fundido a negro', xfade: 'fadeblack' },
  { id: 'fadewhite', name: 'Fundido a blanco', xfade: 'fadewhite' },
  { id: 'dissolve', name: 'Disolver', xfade: 'dissolve' },
  { id: 'wipeleft', name: 'Barrido izquierda', xfade: 'wipeleft' },
  { id: 'wiperight', name: 'Barrido derecha', xfade: 'wiperight' },
  { id: 'wipeup', name: 'Barrido arriba', xfade: 'wipeup' },
  { id: 'wipedown', name: 'Barrido abajo', xfade: 'wipedown' },
  { id: 'slideleft', name: 'Empujar izquierda', xfade: 'slideleft' },
  { id: 'slideright', name: 'Empujar derecha', xfade: 'slideright' },
  { id: 'slideup', name: 'Empujar arriba', xfade: 'slideup' },
  { id: 'slidedown', name: 'Empujar abajo', xfade: 'slidedown' },
  { id: 'circleopen', name: 'Círculo abrir', xfade: 'circleopen' },
  { id: 'circleclose', name: 'Círculo cerrar', xfade: 'circleclose' },
  { id: 'horzopen', name: 'Apertura horizontal', xfade: 'horzopen' },
  { id: 'vertopen', name: 'Apertura vertical', xfade: 'vertopen' },
  { id: 'radial', name: 'Reloj', xfade: 'radial' },
  { id: 'zoomin', name: 'Zoom', xfade: 'zoomin' },
  { id: 'pixelize', name: 'Pixelar', xfade: 'pixelize' },
  { id: 'squeeze', name: 'Comprimir', xfade: 'squeezeh' }
];

export const TRANSITION_BY_ID = new Map(TRANSITIONS.map((t) => [t.id, t]));

export const DEFAULT_TRANSITION_DURATION = 0.8;
export const MAX_TRANSITION_DURATION = 3;
const ADJACENT_EPSILON = 0.05;

export function isTransitionableClip(clip) {
  return clip && (clip.type === 'video' || clip.type === 'image');
}

/**
 * Pares de clips consecutivos de una pista que tienen transición.
 * La transición se guarda en el clip entrante (clip.transition = { type, duration }) y solo es válida
 * si el clip anterior de la misma pista termina justo donde empieza éste.
 * La duración se reparte a ambos lados del corte, así que la línea de tiempo no cambia.
 */
export function getTrackTransitions(track) {
  const clips = (track?.clips || []).filter(isTransitionableClip).slice().sort((a, b) => a.start - b.start);
  const pairs = [];
  for (let i = 1; i < clips.length; i++) {
    const to = clips[i];
    const from = clips[i - 1];
    if (!to.transition || !TRANSITION_BY_ID.has(to.transition.type)) continue;
    const cut = to.start;
    if (Math.abs(from.start + from.duration - cut) > ADJACENT_EPSILON) continue;
    const duration = clamp(
      num(to.transition.duration, DEFAULT_TRANSITION_DURATION),
      0.1,
      Math.min(MAX_TRANSITION_DURATION, from.duration, to.duration)
    );
    pairs.push({ from, to, cut, duration, type: to.transition.type });
  }
  return pairs;
}

/**
 * Clip anterior adyacente (misma pista) al que se puede encadenar una transición.
 */
export function findPreviousAdjacentClip(track, clip) {
  if (!isTransitionableClip(clip)) return null;
  let best = null;
  for (const c of track?.clips || []) {
    if (c.id === clip.id || !isTransitionableClip(c)) continue;
    if (Math.abs(c.start + c.duration - clip.start) <= ADJACENT_EPSILON) best = c;
  }
  return best;
}
