/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cortex: {
          dark: '#0f0f11',
          darker: '#09090b',
          panel: '#18181b',
          card: '#222227',
          border: '#2e2e38',
          hover: '#32323d',
          accent: '#00f2fe',
          cyan: '#00e5ff',
          neon: '#08f7fe',
          text: '#f4f4f5',
          textMuted: '#9ca3af'
        }
      }
    },
  },
  plugins: [],
}
