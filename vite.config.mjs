import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Política de seguridad de contenido para el build de producción (en desarrollo Vite
// necesita scripts inline para el recargado en caliente, así que solo se aplica al compilar).
// Sin scripts remotos ni eval; medios locales vía file:/media:, fuentes de Google Fonts.
const CSP = [
  "default-src 'self' file:",
  "script-src 'self' file:",
  "style-src 'self' file: 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' file: data: https://fonts.gstatic.com",
  "img-src 'self' file: media: data: blob: https:",
  "media-src 'self' file: media: blob: https:",
  "connect-src 'self' file: media:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'"
].join('; ');

function cspPlugin() {
  return {
    name: 'cortex-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`);
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), cspPlugin()],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
