/**
 * Motor de Animaciones
 * Soporta animaciones de Entrada (In) y Salida (Out) con interpolaciones fluidas
 */

// Funciones de Easing
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t) => t * t * t;
const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeOutElastic = (t) => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
};

export const ANIMATION_LIST = [
  { id: 'none', name: 'Ninguna', icon: 'Off', description: 'Sin animación' },
  { id: 'fade', name: 'Desvanecer (Fade)', icon: 'Eye', description: 'Aparece suavemente' },
  { id: 'zoom_in', name: 'Zoom In (Acercar)', icon: 'ZoomIn', description: 'Crece desde el centro' },
  { id: 'zoom_out', name: 'Zoom Out (Alejar)', icon: 'ZoomOut', description: 'Se aleja hasta su tamaño normal' },
  { id: 'bounce', name: 'Rebote Pop (Viral)', icon: 'Sparkles', description: 'Efecto elástico dinámico' },
  { id: 'slide_right', name: 'Deslizar Derecha', icon: 'ArrowRight', description: 'Entra desde la izquierda' },
  { id: 'slide_left', name: 'Deslizar Izquierda', icon: 'ArrowLeft', description: 'Entra desde la derecha' },
  { id: 'slide_up', name: 'Deslizar Arriba', icon: 'ArrowUp', description: 'Sube desde abajo' },
  { id: 'slide_down', name: 'Deslizar Abajo', icon: 'ArrowDown', description: 'Baja desde arriba' },
  { id: 'spin', name: 'Giro Espiral', icon: 'RotateCw', description: 'Gira al entrar' },
  { id: 'shake', name: 'Sacudida Glitch', icon: 'Zap', description: 'Vibración rápida enérgica' },
  { id: 'flash', name: 'Destello Flash', icon: 'Sun', description: 'Brillo blanco inicial' }
];

/**
 * Calcula los multiplicadores de transformación para un clip en el tiempo actual
 * @param {Object} clip - Clip con animIn, animInDuration, animOut, animOutDuration
 * @param {number} relTime - Tiempo transcurrido dentro del clip (currentTime - clip.start)
 * @param {number} clipDuration - Duración total del clip
 * @param {number} canvasWidth - Ancho del lienzo
 * @param {number} canvasHeight - Alto del lienzo
 */
export function calculateClipAnimation(clip, relTime, clipDuration, canvasWidth, canvasHeight) {
  let transform = {
    opacity: 1,
    scale: 1,
    translateX: 0,
    translateY: 0,
    rotate: 0,
    brightness: 1
  };

  const animIn = clip.animIn || 'none';
  const inDuration = Math.min(clipDuration / 2, clip.animInDuration || 0.6);

  const animOut = clip.animOut || 'none';
  const outDuration = Math.min(clipDuration / 2, clip.animOutDuration || 0.6);
  const timeUntilEnd = clipDuration - relTime;

  // 1. Animación de Entrada (In)
  if (animIn !== 'none' && relTime < inDuration && inDuration > 0) {
    const rawP = Math.max(0, Math.min(1, relTime / inDuration));
    applyAnimationParams(transform, animIn, rawP, 'in', canvasWidth, canvasHeight);
  }

  // 2. Animación de Salida (Out)
  if (animOut !== 'none' && timeUntilEnd < outDuration && outDuration > 0) {
    const rawP = Math.max(0, Math.min(1, timeUntilEnd / outDuration));
    applyAnimationParams(transform, animOut, rawP, 'out', canvasWidth, canvasHeight);
  }

  return transform;
}

function applyAnimationParams(transform, animId, progress, mode, width, height) {
  // progress va de 0 (inicio de animación) a 1 (estado normal)
  const p = mode === 'in' ? progress : progress;

  switch (animId) {
    case 'fade':
      transform.opacity *= easeOutCubic(p);
      break;

    case 'zoom_in':
      transform.scale *= 0.2 + 0.8 * easeOutCubic(p);
      transform.opacity *= easeOutCubic(p);
      break;

    case 'zoom_out':
      transform.scale *= 1.8 - 0.8 * easeOutCubic(p);
      transform.opacity *= easeOutCubic(p);
      break;

    case 'bounce':
      transform.scale *= easeOutBack(p);
      transform.opacity *= Math.min(1, p * 2);
      break;

    case 'slide_right':
      transform.translateX += (1 - easeOutCubic(p)) * -width;
      transform.opacity *= Math.min(1, p * 1.5);
      break;

    case 'slide_left':
      transform.translateX += (1 - easeOutCubic(p)) * width;
      transform.opacity *= Math.min(1, p * 1.5);
      break;

    case 'slide_up':
      transform.translateY += (1 - easeOutCubic(p)) * height;
      transform.opacity *= Math.min(1, p * 1.5);
      break;

    case 'slide_down':
      transform.translateY += (1 - easeOutCubic(p)) * -height;
      transform.opacity *= Math.min(1, p * 1.5);
      break;

    case 'spin':
      transform.rotate += (1 - easeOutCubic(p)) * (Math.PI * (mode === 'in' ? -1 : 1));
      transform.scale *= 0.3 + 0.7 * easeOutCubic(p);
      transform.opacity *= easeOutCubic(p);
      break;

    case 'shake':
      if (p < 0.9) {
        const shakeFreq = 40;
        const amplitude = (1 - p) * 25;
        transform.translateX += Math.sin(p * shakeFreq) * amplitude;
        transform.translateY += Math.cos(p * shakeFreq * 1.3) * amplitude * 0.5;
      }
      break;

    case 'flash':
      if (p < 0.8) {
        transform.brightness += (1 - p) * 2.5;
      }
      transform.opacity *= Math.min(1, p * 2.5);
      break;

    default:
      break;
  }
}
