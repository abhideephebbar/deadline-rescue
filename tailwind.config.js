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
        background: 'var(--bg-page)',
        surface: 'var(--bg-surface)',
        raised: 'var(--bg-raised)',
        card: {
          DEFAULT: 'var(--bg-surface)',
          foreground: 'var(--text-main)',
          hover: 'var(--bg-raised)',
        },
        border: {
          DEFAULT: 'var(--border-subtle)',
          subtle: 'var(--border-subtle)',
          highlight: 'var(--border-highlight)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          muted: 'var(--accent-muted)',
          orange: '#ff5500',
          glow: 'rgba(249, 115, 22, 0.15)',
        },
        muted: {
          DEFAULT: 'var(--text-muted)',
          foreground: 'var(--text-muted)',
        }
      },
      transitionDuration: {
        'fast': '120ms',
        'med': '240ms',
        'slow': '420ms',
      },
      transitionTimingFunction: {
        'enter': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'exit': 'cubic-bezier(0.4, 0, 1, 1)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        'fade-in': 'fade-in 240ms cubic-bezier(0.22, 1, 0.36, 1)',
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
