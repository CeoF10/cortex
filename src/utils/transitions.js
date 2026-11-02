/**
 * Renderizado de transiciones en canvas para la vista previa.
 * Cada función imita la transición homónima del filtro xfade de FFmpeg (usado al exportar),
 * con la dirección verificada contra la salida real de FFmpeg.
 *
 * `a` y `b` son canvas a pantalla completa (clip saliente y entrante), `p` el progreso 0..1.
 */

const smooth = (t) => t * t * (3 - 2 * t);

// Canvas auxiliares reutilizables (evita crear canvas en cada frame)
const scratch = new Map();
function getScratch(key, w, h) {
  let c = scratch.get(key);
  if (!c) {
    c = document.createElement('canvas');
    scratch.set(key, c);
  }
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  return c;
}

// Ruido fijo para "Disolver" (misma semilla en cada frame para que no parpadee)
const NOISE_W = 192;
const NOISE_H = 108;
let noiseValues = null;
function getNoise() {
  if (!noiseValues) {
    noiseValues = new Float32Array(NOISE_W * NOISE_H);
    let seed = 1337;
    for (let i = 0; i < noiseValues.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      noiseValues[i] = seed / 4294967296;
    }
  }
  return noiseValues;
}

// Mezcla exacta A·(1-k) + B·k, también con transparencia (suma de alfas premultiplicados)
function crossfade(ctx, a, b, k, w, h) {
  const tmp = getScratch('mix', w, h);
  const t = tmp.getContext('2d');
  t.clearRect(0, 0, w, h);
  t.globalCompositeOperation = 'lighter';
  t.globalAlpha = 1 - k;
  t.drawImage(a, 0, 0);
  t.globalAlpha = k;
  t.drawImage(b, 0, 0);
  t.globalAlpha = 1;
  t.globalCompositeOperation = 'source-over';
  ctx.drawImage(tmp, 0, 0);
}

// Dibuja `img` recortado por una forma (función que traza el path)
function drawClipped(ctx, img, tracePath) {
  ctx.save();
  ctx.beginPath();
  tracePath(ctx);
  ctx.clip();
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

function fadeThrough(ctx, a, b, p, w, h, color) {
  const tmp = getScratch('fadecolor', w, h);
  const t = tmp.getContext('2d');
  t.clearRect(0, 0, w, h);
  const showA = p < 0.5;
  const k = showA ? p * 2 : (1 - p) * 2; // 0 -> 1 -> 0 cantidad de color
  t.drawImage(showA ? a : b, 0, 0);
  t.globalCompositeOperation = 'source-atop';
  t.globalAlpha = smooth(Math.min(1, k));
  t.fillStyle = color;
  t.fillRect(0, 0, w, h);
  t.globalAlpha = 1;
  t.globalCompositeOperation = 'source-over';
  ctx.drawImage(tmp, 0, 0);
}

function pixelate(src, size, w, h, key) {
  const sw = Math.max(1, Math.round(w / size));
  const sh = Math.max(1, Math.round(h / size));
  const small = getScratch(key + '_s', sw, sh);
  const sctx = small.getContext('2d');
  sctx.clearRect(0, 0, sw, sh);
  sctx.drawImage(src, 0, 0, sw, sh);
  const big = getScratch(key + '_b', w, h);
  const bctx = big.getContext('2d');
  bctx.clearRect(0, 0, w, h);
  bctx.imageSmoothingEnabled = false;
  bctx.drawImage(small, 0, 0, w, h);
  bctx.imageSmoothingEnabled = true;
  return big;
}

const RENDERERS = {
  fade: (ctx, a, b, p, w, h) => crossfade(ctx, a, b, p, w, h),

  fadeblack: (ctx, a, b, p, w, h) => fadeThrough(ctx, a, b, p, w, h, '#000'),

  fadewhite: (ctx, a, b, p, w, h) => fadeThrough(ctx, a, b, p, w, h, '#fff'),

  dissolve: (ctx, a, b, p, w, h) => {
    // Máscara de bloques aleatorios: cada bloque cambia de A a B en un instante distinto
    const mask = getScratch('dissolve_mask', NOISE_W, NOISE_H);
    const mctx = mask.getContext('2d');
    const img = mctx.createImageData(NOISE_W, NOISE_H);
    const noise = getNoise();
    for (let i = 0; i < noise.length; i++) {
      img.data[i * 4 + 3] = noise[i] < p ? 255 : 0;
    }
    mctx.putImageData(img, 0, 0);

    const layer = getScratch('dissolve_b', w, h);
    const lctx = layer.getContext('2d');
    lctx.clearRect(0, 0, w, h);
    lctx.drawImage(b, 0, 0);
    lctx.globalCompositeOperation = 'destination-in';
    lctx.imageSmoothingEnabled = false;
    lctx.drawImage(mask, 0, 0, w, h);
    lctx.imageSmoothingEnabled = true;
    lctx.globalCompositeOperation = 'source-over';

    const aLayer = getScratch('dissolve_a', w, h);
    const actx = aLayer.getContext('2d');
    actx.clearRect(0, 0, w, h);
    actx.drawImage(a, 0, 0);
    actx.globalCompositeOperation = 'destination-out';
    actx.imageSmoothingEnabled = false;
    actx.drawImage(mask, 0, 0, w, h);
    actx.imageSmoothingEnabled = true;
    actx.globalCompositeOperation = 'source-over';

    ctx.drawImage(aLayer, 0, 0);
    ctx.drawImage(layer, 0, 0);
  },

  // Barridos: B aparece desde el borde opuesto al nombre (igual que xfade)
  wipeleft: (ctx, a, b, p, w, h) => {
    const x = w * (1 - p);
    drawClipped(ctx, a, (c) => c.rect(0, 0, x, h));
    drawClipped(ctx, b, (c) => c.rect(x, 0, w - x, h));
  },
  wiperight: (ctx, a, b, p, w, h) => {
    const x = w * p;
    drawClipped(ctx, b, (c) => c.rect(0, 0, x, h));
    drawClipped(ctx, a, (c) => c.rect(x, 0, w - x, h));
  },
  wipeup: (ctx, a, b, p, w, h) => {
    const y = h * (1 - p);
    drawClipped(ctx, a, (c) => c.rect(0, 0, w, y));
    drawClipped(ctx, b, (c) => c.rect(0, y, w, h - y));
  },
  wipedown: (ctx, a, b, p, w, h) => {
    const y = h * p;
    drawClipped(ctx, b, (c) => c.rect(0, 0, w, y));
    drawClipped(ctx, a, (c) => c.rect(0, y, w, h - y));
  },

  // Empujes: ambos clips se desplazan
  slideleft: (ctx, a, b, p, w) => {
    ctx.drawImage(a, -w * p, 0);
    ctx.drawImage(b, w * (1 - p), 0);
  },
  slideright: (ctx, a, b, p, w) => {
    ctx.drawImage(a, w * p, 0);
    ctx.drawImage(b, -w * (1 - p), 0);
  },
  slideup: (ctx, a, b, p, w, h) => {
    ctx.drawImage(a, 0, -h * p);
    ctx.drawImage(b, 0, h * (1 - p));
  },
  slidedown: (ctx, a, b, p, w, h) => {
    ctx.drawImage(a, 0, h * p);
    ctx.drawImage(b, 0, -h * (1 - p));
  },

  circleopen: (ctx, a, b, p, w, h) => {
    const r = Math.hypot(w / 2, h / 2) * smooth(p);
    ctx.drawImage(a, 0, 0);
    drawClipped(ctx, b, (c) => c.arc(w / 2, h / 2, Math.max(0.1, r), 0, Math.PI * 2));
  },
  circleclose: (ctx, a, b, p, w, h) => {
    const r = Math.hypot(w / 2, h / 2) * smooth(1 - p);
    ctx.drawImage(b, 0, 0);
    drawClipped(ctx, a, (c) => c.arc(w / 2, h / 2, Math.max(0.1, r), 0, Math.PI * 2));
  },

  horzopen: (ctx, a, b, p, w, h) => {
    const half = (h / 2) * p;
    ctx.drawImage(a, 0, 0);
    drawClipped(ctx, b, (c) => c.rect(0, h / 2 - half, w, half * 2));
  },
  vertopen: (ctx, a, b, p, w, h) => {
    const half = (w / 2) * p;
    ctx.drawImage(a, 0, 0);
    drawClipped(ctx, b, (c) => c.rect(w / 2 - half, 0, half * 2, h));
  },

  // Barrido de reloj en sentido horario desde las 12
  radial: (ctx, a, b, p, w, h) => {
    const r = Math.hypot(w, h);
    const startAngle = -Math.PI / 2;
    ctx.drawImage(a, 0, 0);
    if (p <= 0) return;
    drawClipped(ctx, b, (c) => {
      c.moveTo(w / 2, h / 2);
      c.arc(w / 2, h / 2, r, startAngle, startAngle + Math.PI * 2 * p);
      c.closePath();
    });
  },

  // A se acerca y se funde en B
  zoomin: (ctx, a, b, p, w, h) => {
    const zoomed = getScratch('zoom', w, h);
    const z = zoomed.getContext('2d');
    z.clearRect(0, 0, w, h);
    const s = 1 + smooth(Math.min(1, p / 0.6));
    z.drawImage(a, (w - w * s) / 2, (h - h * s) / 2, w * s, h * s);
    crossfade(ctx, zoomed, b, smooth(Math.max(0, (p - 0.4) / 0.6)), w, h);
  },

  // Pixelado creciente hasta la mitad y decreciente después, fundiendo A en B
  pixelize: (ctx, a, b, p, w, h) => {
    const strength = 1 - Math.abs(p * 2 - 1); // 0 -> 1 -> 0
    const size = 1 + strength * 48;
    const pa = size > 1.5 ? pixelate(a, size, w, h, 'pixA') : a;
    const pb = size > 1.5 ? pixelate(b, size, w, h, 'pixB') : b;
    crossfade(ctx, pa, pb, p, w, h);
  },

  // A se comprime verticalmente hacia el centro dejando ver B
  squeeze: (ctx, a, b, p, w, h) => {
    ctx.drawImage(b, 0, 0);
    const sh = h * (1 - p);
    if (sh > 0.5) ctx.drawImage(a, 0, (h - sh) / 2, w, sh);
  }
};

export function drawTransition(ctx, type, a, b, p, w, h) {
  const render = RENDERERS[type] || RENDERERS.fade;
  ctx.save();
  render(ctx, a, b, Math.max(0, Math.min(1, p)), w, h);
  ctx.restore();
}

export function getLayerCanvas(key, w, h) {
  return getScratch('layer_' + key, w, h);
}
