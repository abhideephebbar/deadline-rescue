/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        background: '#0c0c0c',
        card: {
          DEFAULT: '#141414',
          foreground: '#f5f5f5',
          hover: '#191919',
        },
        border: {
          DEFAULT: '#262626',
          subtle: 'rgba(255, 255, 255, 0.08)',
        },
        accent: {
          DEFAULT: '#f97316',
          orange: '#ff5500',
          glow: 'rgba(249, 115, 22, 0.15)',
        },
        muted: {
          DEFAULT: '#222222',
          foreground: '#8c8c8c',
        }
      },
    },
  },
  plugins: [],
}
