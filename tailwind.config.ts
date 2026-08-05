import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      // Palier d'opacité au pourcent près : la charte joue sur des voiles très
      // fins (bordures à 6-12 %) que l'échelle par défaut ne couvre pas.
      opacity: Object.fromEntries(
        Array.from({ length: 101 }, (_, i) => [String(i), String(i / 100)]),
      ),
      colors: {
        // Charte : nuit profonde, or sacerdotal, ivoire.
        night: {
          50: '#f4f6fb',
          100: '#e6eaf4',
          200: '#c6cee3',
          300: '#9aa8cb',
          400: '#6a7cae',
          500: '#4a5a8d',
          600: '#37456f',
          700: '#2a3557',
          800: '#1d2540',
          900: '#131a2f',
          950: '#0a0f1e',
        },
        gold: {
          50: '#fdf9ed',
          100: '#f9efcd',
          200: '#f2dc98',
          300: '#e9c35c',
          400: '#e0ac33',
          500: '#c98f1d',
          600: '#a86e16',
          700: '#875216',
          800: '#704218',
          900: '#5f3818',
        },
        ivory: {
          50: '#fffdf8',
          100: '#fdf9ef',
          200: '#f7f0e0',
          300: '#eee2c9',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        elevated: '0 24px 60px -24px rgba(10, 15, 30, 0.45)',
        gold: '0 0 0 1px rgba(233, 195, 92, 0.35), 0 18px 40px -20px rgba(201, 143, 29, 0.5)',
      },
      backgroundImage: {
        'sacerdotal':
          'radial-gradient(1200px 600px at 15% -10%, rgba(233,195,92,0.16), transparent 60%), radial-gradient(900px 500px at 90% 0%, rgba(74,90,141,0.35), transparent 55%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-500px 0' },
          '100%': { backgroundPosition: '500px 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 2.2s linear infinite',
      },
      typography: {
        DEFAULT: { css: { maxWidth: '72ch' } },
      },
    },
  },
  plugins: [],
};

export default config;
