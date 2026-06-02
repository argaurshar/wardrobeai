/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surround: '#0b0c10',
        cream: '#f1e7d2',
        accent: '#ff5a3c',
        accentHover: '#e8472b',
        oak: '#d9b993',
        oakDark: '#a8855a',
        carcass: '#8a6a44',
        dim: '#8a8a8a',
        ink: '#3b332a',
        inkFaint: '#8d8a84',
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
      },
    },
  },
  plugins: [],
};
