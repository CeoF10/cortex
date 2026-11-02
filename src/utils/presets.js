// TIPOGRAFÍAS VIRALES POPULARES EN TIKTOK, REELS Y SHORTS
export const VIRAL_FONTS = [
  { id: 'Montserrat, sans-serif', name: 'Montserrat 900 (Viral TikTok / Reels)' },
  { id: 'Anton, Impact, sans-serif', name: 'Anton (Hormozi Punch)' },
  { id: "'Bebas Neue', Impact, sans-serif", name: 'Bebas Neue (Titular Reels)' },
  { id: 'Poppins, sans-serif', name: 'Poppins 900 (Geométrico Viral)' },
  { id: "'Luckiest Guy', Impact, cursive", name: 'Luckiest Guy (MrBeast Divertido)' },
  { id: 'Bangers, Impact, cursive', name: 'Bangers (Comic / Acción)' },
  { id: 'Rubik, sans-serif', name: 'Rubik Black (Pesado Urbano)' },
  { id: 'Oswald, sans-serif', name: 'Oswald Bold (Titular Fuerte)' },
  { id: 'Impact, sans-serif', name: 'Impact (Clásica Memes)' },
  { id: 'system-ui, sans-serif', name: 'System UI (Estándar Moderna)' },
  { id: 'Arial, sans-serif', name: 'Arial (Simple Neutra)' },
  { id: 'Georgia, serif', name: 'Georgia (Editorial Elegante)' }
];

export const TEXT_PRESETS = [
  {
    id: 'preset_viral_yellow',
    name: 'Viral Amarillo',
    text: 'TEXTO VIRAL',
    fontSize: 52,
    color: '#FFE600',
    bgColor: '#000000',
    fontFamily: 'Montserrat, sans-serif',
    strokeColor: '#000000',
    strokeWidth: 5,
    positionY: 80
  },
  {
    id: 'preset_neon_cyan',
    name: 'Neón Cyan',
    text: 'BRILLO NEÓN',
    fontSize: 48,
    color: '#00F2FE',
    bgColor: 'transparent',
    fontFamily: "'Bebas Neue', Impact, sans-serif",
    strokeColor: '#004455',
    strokeWidth: 3,
    positionY: 50
  },
  {
    id: 'preset_subtitle_box',
    name: 'Caja Subtítulo',
    text: 'SUBTÍTULO DESTACADO',
    fontSize: 40,
    color: '#FFFFFF',
    bgColor: 'rgba(0, 0, 0, 0.75)',
    fontFamily: 'Montserrat, sans-serif',
    strokeColor: 'transparent',
    strokeWidth: 0,
    positionY: 82
  },
  {
    id: 'preset_hormozi_title',
    name: 'Hormozi Impact',
    text: '¡MIRA ESTO!',
    fontSize: 54,
    color: '#FFFFFF',
    bgColor: 'transparent',
    fontFamily: 'Anton, Impact, sans-serif',
    strokeColor: '#000000',
    strokeWidth: 5,
    positionY: 25
  },
  {
    id: 'preset_mrbeast',
    name: 'MrBeast Bouncy',
    text: '¡INCREÍBLE RETO!',
    fontSize: 50,
    color: '#FFEA00',
    bgColor: 'rgba(0, 0, 0, 0.65)',
    fontFamily: "'Luckiest Guy', Impact, cursive",
    strokeColor: '#000000',
    strokeWidth: 6,
    positionY: 75
  }
];

// MODOS DE FONDO SELECCIONABLES PARA CUALQUIER TEMA
export const SUBTITLE_BG_MODES = [
  {
    id: 'black',
    name: 'Negro Clásico',
    iconColor: '#000000',
    bgColor: 'rgba(0, 0, 0, 0.75)',
    baseColor: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 4
  },
  {
    id: 'white',
    name: 'Blanco (Fácil Lectura)',
    iconColor: '#FFFFFF',
    bgColor: 'rgba(255, 255, 255, 0.94)',
    baseColor: '#0F172A',
    strokeColor: 'transparent',
    strokeWidth: 0
  },
  {
    id: 'transparent',
    name: 'Sin Fondo (Transparente)',
    iconColor: 'transparent',
    bgColor: 'transparent',
    baseColor: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 6
  },
  {
    id: 'midnight',
    name: 'Azul Noche Suave',
    iconColor: '#0F172A',
    bgColor: 'rgba(15, 23, 42, 0.88)',
    baseColor: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 3
  }
];

// FONDOS RÁPIDOS PARA ACCESIBILIDAD Y ESTILOS EN PANEL DE PROPIEDADES
export const BACKGROUND_PRESETS = [
  { id: 'none', name: 'Sin Fondo', value: 'transparent', defaultTextColor: '#FFFFFF', strokeColor: '#000000', strokeWidth: 5 },
  { id: 'black', name: 'Negro Clásico', value: 'rgba(0, 0, 0, 0.75)', defaultTextColor: '#FFFFFF', strokeColor: '#000000', strokeWidth: 3 },
  { id: 'white', name: 'Blanco Lectura', value: 'rgba(255, 255, 255, 0.94)', defaultTextColor: '#0F172A', strokeColor: 'transparent', strokeWidth: 0 },
  { id: 'midnight', name: 'Azul Noche', value: 'rgba(15, 23, 42, 0.88)', defaultTextColor: '#FFFFFF', strokeColor: '#000000', strokeWidth: 3 },
  { id: 'yellow', name: 'Banner Amarillo', value: 'rgba(254, 240, 138, 0.95)', defaultTextColor: '#000000', strokeColor: 'transparent', strokeWidth: 0 },
  { id: 'red', name: 'Rojo Alerta', value: 'rgba(220, 38, 38, 0.9)', defaultTextColor: '#FFFFFF', strokeColor: '#000000', strokeWidth: 2 }
];

// TEMAS VIRALES ORIGINALES CON FUENTES POPULARES Y PALABRA RESALTADA
export const SUBTITLE_THEMES = [
  {
    id: 'theme_blue_electric',
    name: 'TikTok Azul Eléctrico',
    baseColor: '#FFFFFF',
    highlightColor: '#00E5FF', // Azul Neón
    bgColor: 'rgba(0, 0, 0, 0.75)',
    fontFamily: 'Montserrat, sans-serif',
    fontSize: 46,
    strokeColor: '#000000',
    strokeWidth: 5,
    positionY: 87,
    karaoke: true,
    uppercase: true,
    previewText: 'AZUL ELÉCTRICO'
  },
  {
    id: 'theme_hormozi_yellow',
    name: 'Hormozi Amarillo Viral',
    baseColor: '#FFFFFF',
    highlightColor: '#FFE600', // Amarillo viral
    bgColor: 'rgba(0, 0, 0, 0.75)',
    fontFamily: 'Anton, Impact, sans-serif',
    fontSize: 48,
    strokeColor: '#000000',
    strokeWidth: 5,
    positionY: 87,
    karaoke: true,
    uppercase: true,
    previewText: 'IMPACTO VIRAL'
  },
  {
    id: 'theme_bebas_cyan',
    name: 'Reels Bebas Pro',
    baseColor: '#FFFFFF',
    highlightColor: '#00F2FE',
    bgColor: 'rgba(12, 12, 18, 0.75)',
    fontFamily: "'Bebas Neue', Impact, sans-serif",
    fontSize: 50,
    strokeColor: '#000000',
    strokeWidth: 4,
    positionY: 87,
    karaoke: true,
    uppercase: true,
    previewText: 'MODERNO REELS'
  },
  {
    id: 'theme_emerald_green',
    name: 'Verde Neón (Poppins)',
    baseColor: '#FFFFFF',
    highlightColor: '#00FF66', // Verde brillante
    bgColor: 'rgba(0, 0, 0, 0.7)',
    fontFamily: 'Poppins, sans-serif',
    fontSize: 44,
    strokeColor: '#000000',
    strokeWidth: 5,
    positionY: 87,
    karaoke: true,
    uppercase: true,
    previewText: 'CRECE RÁPIDO'
  },
  {
    id: 'theme_mrbeast_fun',
    name: 'MrBeast Divertido',
    baseColor: '#FFFFFF',
    highlightColor: '#FFAE00', // Naranja/Amarillo gamer
    bgColor: 'rgba(0, 0, 0, 0.65)',
    fontFamily: "'Luckiest Guy', Impact, cursive",
    fontSize: 46,
    strokeColor: '#000000',
    strokeWidth: 6,
    positionY: 87,
    karaoke: true,
    uppercase: true,
    previewText: '¡INCREÍBLE RETO!'
  },
  {
    id: 'theme_fire_bangers',
    name: 'Comic Bangers (Acción)',
    baseColor: '#FFFFFF',
    highlightColor: '#FF3B30', // Rojo vibrante
    bgColor: 'rgba(0, 0, 0, 0.8)',
    fontFamily: 'Bangers, Impact, cursive',
    fontSize: 50,
    strokeColor: '#000000',
    strokeWidth: 5,
    positionY: 87,
    karaoke: true,
    uppercase: true,
    previewText: 'MIRA ESTO'
  },
  {
    id: 'theme_cyberpunk_rubik',
    name: 'Cyberpunk Magenta',
    baseColor: '#FFFFFF',
    highlightColor: '#FF007F', // Fucsia Neón
    bgColor: 'rgba(15, 10, 25, 0.8)',
    fontFamily: 'Rubik, sans-serif',
    fontSize: 44,
    strokeColor: '#000000',
    strokeWidth: 4,
    positionY: 87,
    karaoke: true,
    uppercase: true,
    previewText: 'FUTURISTA PRO'
  }
];
