# Cortex

Un editor de video de escritorio moderno, potente y ultrarrápido, construido con **Electron**, **React**, **Tailwind CSS**, aceleración por hardware con **FFmpeg (NVIDIA NVENC)** y generación de subtítulos automáticos sincronizados por palabra con **OpenAI Faster-Whisper**.

---

## Características Principales

### 1. Línea de Tiempo Multipista Inteligente (Timeline)
* **Pistas Separadas:** Pista de subtítulos / texto, pista de video e imágenes superpuestas, y pistas de audio dedicadas.
* **Cabezal de Reproducción (Playhead):** Deslizamiento milimétrico suave (scrubbing) con regla de tiempo adaptativa según el nivel de zoom.
* **Corte Preciso (Split):** Divide cualquier clip exactamente en la posición del cabezal (`Ctrl+B`).
* **Recorte de Extremos (Trimming):** Ajusta el punto de entrada y salida arrastrando los extremos de cualquier clip.
* **Guías Magnéticas (Snapping):** Ajuste magnético inteligente con línea guía visual y salto automático al final de clips adyacentes o de audio.
* **Navegación Fluida:** Paneo con clic central de ratón, zoom dinámico con rueda de ratón y atajos para saltar entre cortes.

### 2. Subtítulos Automáticos con IA y Estilo Karaoke
* **Transcripción Ultrarrápida:** Generación automática de subtítulos mediante **Faster-Whisper** ejecutado localmente con soporte multilingüe.
* **Animación Karaoke Viral:** Resaltado de palabra por palabra sincronizado, brillo glow personalizable y sin temblores (jitter-free).
* **Posicionamiento 1:1:** Posicionamiento vectorial exacto pixel a pixel tanto en el reproductor como en la exportación de video final.
* **Biblioteca de Estilos:** Preajustes listos para usar (Viral Amarillo, Neón Cyan, Caja Subtítulo, Minimalista, etc.) con edición completa de tipografía, tamaño, contorno y fondo.

### 3. Efectos, Transformaciones y Animaciones
* **Animaciones de Entrada y Salida:** Soporte para `Fade`, `Bounce`, `Zoom In`, `Zoom Out`, `Slide Up`, `Slide Down`, `Slide Left`, `Slide Right`, `Spin`, `Flash` y `Shake`.
* **Superposición de Imágenes y Stickers:** Soporte de capas PNG con transparencias, escala libre, opacidad y posicionamiento en pantalla.
* **Mezcla de Audio:** Control de volumen por clip y por pista, soporte para mute individual y curvas suaves de Fade In / Fade Out.

### 4. Motor de Exportación Nativo con GPU NVENC
* **Renderizado Acelerado por GPU:** Integración nativa con **NVIDIA NVENC (GeForce RTX)** y fallback automático a CPU multihilo (`libx264`).
* **Múltiples Relaciones de Aspecto:**
  * **16:9** (Horizontal para YouTube, PC y TV).
  * **9:16** (Vertical para TikTok, Instagram Reels y YouTube Shorts).
  * **1:1** (Cuadrado para Feed).
* **Exportación en Tiempo Récord:** Procesamiento de videos de larga duración en alta resolución (1080p / 720p @ 30/60 FPS).

---

## Estructura del Proyecto

```plaintext
cortex/
├── electron/                 # Backend de la aplicación Electron
│   ├── main.cjs              # Proceso principal, ventanas y handlers IPC
│   ├── preload.cjs           # Puente seguro IPC entre frontend y node
│   └── ffmpeg_export.cjs     # Motor de composición y exportación FFmpeg nativo
├── python/                   # Módulo de Inteligencia Artificial
│   ├── transcribe.py         # Script de transcripción Whisper por palabras
│   └── requirements.txt      # Dependencias de Python (faster-whisper, numpy, av)
├── src/                      # Frontend en React
│   ├── components/           # Componentes modulares
│   │   ├── CanvasPlayer.jsx  # Reproductor y visor en tiempo real
│   │   ├── Timeline.jsx      # Línea de tiempo multipista interactiva
│   │   ├── PropertiesPanel.jsx # Panel de propiedades e inspector de clips
│   │   ├── MediaPanel.jsx    # Gestor de biblioteca multimedia
│   │   ├── AutoSubtitleModal.jsx # Modal de subtitulado automático
│   │   ├── ExportModal.jsx   # Modal de configuración de exportación
│   │   ├── AudioWaveform.jsx # Generador de formas de onda de audio
│   │   └── ErrorBoundary.jsx # Captura y recuperación de errores en UI
│   ├── utils/                # Utilidades de tiempo, animaciones y estilos
│   ├── App.jsx               # Contenedor principal de la aplicación
│   └── main.jsx              # Punto de entrada de React
├── start.sh                  # Lanzador nativo para Linux
├── package.json              # Configuración y dependencias de Node.js
└── vite.config.mjs           # Configuración del empaquetador Vite
```

---

## Instalación y Requisitos

### Requisitos Previos
1. **Node.js** (v18 o superior).
2. **FFmpeg** instalado en el sistema (`sudo apt install ffmpeg` o `pacman -S ffmpeg`).
3. **Python 3.10+** (para la función de subtítulos automáticos).
4. GPU NVIDIA con drivers actualizados (recomendado para aceleración NVENC).

### Instalación de Dependencias

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/CeoF10/cortex.git
   cd cortex
   ```

2. Instalar dependencias de Node.js:
   ```bash
   npm install
   ```

3. Configurar el entorno de Python para Faster-Whisper:
   ```bash
   python3 -m venv python/venv
   source python/venv/bin/activate
   pip install -r python/requirements.txt
   ```

---

## Uso

### Modo Desarrollo (Vite + Electron)
Para trabajar con recarga en caliente (Hot Module Replacement):
```bash
npm run dev
```

### Compilar y Ejecutar en Producción
```bash
npm run build
npm start
```

O directamente mediante el script de inicio:
```bash
./start.sh
```

---

## Atajos de Teclado Útiles

| Atajo | Acción |
| :--- | :--- |
| `Espacio` | Reproducir / Pausar |
| `Ctrl + B` | Cortar clip en el cabezal (Split) |
| `Supr` / `Delete` | Eliminar clip seleccionado |
| `Ctrl + Z` / `Ctrl + Y` | Deshacer / Rehacer |
| `F12` o `Ctrl + Shift + I` | Abrir herramientas de desarrollador (DevTools) |
| `Shift + Arrastre` o `Clic Rueda` | Paneo horizontal en la línea de tiempo |

---

## Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo LICENSE para más detalles.
