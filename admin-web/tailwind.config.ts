import type { Config } from 'tailwindcss';

// Same Goldnest palette as public-website/tailwind.config.ts, tuned here for
// a denser, data-heavy admin UI rather than a marketing site.
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FFFDF9',
          100: '#FBF6EC',
          200: '#F5ECD8',
        },
        ink: {
          DEFAULT: '#14110F',
          light: '#3A342C',
        },
        navy: {
          950: '#0A0F1A',
          900: '#0F172A',
          800: '#1B2537',
          700: '#2A3650',
        },
        gold: {
          50: '#FBF6EC',
          100: '#F5E9C9',
          200: '#EAD190',
          300: '#DFB95C',
          400: '#CFA23A',
          500: '#B8862A',
          600: '#96691F',
          700: '#744F18',
          800: '#523611',
          900: '#2F1F0A',
        },
        emerald: {
          500: '#12805C',
          600: '#0E6B4C',
        },
        rose: {
          500: '#C23B4B',
          600: '#A32F3D',
        },
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'ui-serif', 'Georgia', 'serif'],
        sans: ['var(--font-manrope)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 8px -2px rgba(20,17,15,0.06), 0 8px 24px -12px rgba(20,17,15,0.10)',
        elevated: '0 1px 2px rgba(20,17,15,0.04), 0 12px 32px -8px rgba(20,17,15,0.14), 0 4px 12px -4px rgba(20,17,15,0.08)',
        'elevated-hover': '0 2px 4px rgba(20,17,15,0.05), 0 20px 48px -12px rgba(20,17,15,0.20), 0 8px 20px -6px rgba(20,17,15,0.12)',
        gold: '0 8px 24px -6px rgba(207,162,58,0.35)',
        'gold-hover': '0 12px 32px -6px rgba(207,162,58,0.45)',
        'inner-line': 'inset 0 0 0 1px rgba(20,17,15,0.04)',
      },
      borderRadius: {
        xl2: '1.1rem',
        xl3: '1.5rem',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      backgroundImage: {
        'sidebar-sheen': 'radial-gradient(circle at 15% 0%, rgba(207,162,58,0.16), transparent 55%), linear-gradient(180deg, #0A0F1A 0%, #0D1420 55%, #0A0F1A 100%)',
        'card-sheen': 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
