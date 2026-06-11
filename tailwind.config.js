/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surround: '#0b1120',
        cream: '#f1e7d2',
        accent: '#2dd4bf',
        accentHover: '#5eead4',
        oak: '#d9b993',
        oakDark: '#a8855a',
        carcass: '#8a6a44',
        dim: '#8a8a8a',
        ink: '#3b332a',
        inkFaint: '#94a3b8',
        // Remap stone to cool slate tones so the whole app shifts to the
        // navy/teal scheme without touching every component.
        stone: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#111a2c',
          950: '#0b1120',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['Space Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        architectural: '0.32em',
      },
      boxShadow: {
        inset: '0 30px 80px -30px rgba(0,0,0,0.55), 0 8px 22px -8px rgba(0,0,0,0.45)',
        glow: '0 0 0 1px rgba(45,212,191,0.35), 0 8px 30px -6px rgba(45,212,191,0.35)',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { transform: 'scale(0.96)' },
          '60%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        rise: 'rise 0.45s ease-out both',
        pop: 'pop 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
