import type { Config } from 'tailwindcss';

// Goldnest design system. Shared visually (not by import — separate Next.js
// apps) with admin-web/tailwind.config.ts; keep the two palettes in sync by
// hand if either changes.
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
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'ui-serif', 'Georgia', 'serif'],
        sans: ['var(--font-manrope)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 8px -2px rgba(20,17,15,0.08), 0 12px 32px -12px rgba(20,17,15,0.12)',
        lift: '0 8px 24px -8px rgba(184,134,42,0.35)',
      },
      backgroundImage: {
        'gold-radial': 'radial-gradient(circle at 50% 0%, rgba(207,162,58,0.28), rgba(10,15,26,0) 60%)',
        'gold-line': 'linear-gradient(90deg, transparent, #CFA23A, transparent)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
