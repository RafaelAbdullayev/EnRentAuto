import type { Config } from 'tailwindcss';

/**
 * Дизайн-система EnRentAuto.
 * Тёмная премиальная палитра: графит + платиновый акцент.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#050506',
          900: '#0a0a0c',
          850: '#0f1014',
          800: '#15161b',
          700: '#1e2027',
          600: '#2a2d36',
          500: '#3a3e49',
        },
        accent: {
          DEFAULT: '#c8a96a', // тёплое золото — «дорогой автосалон»
          soft: '#e2cd9c',
          deep: '#9c7f43',
        },
        signal: {
          new: '#5b8def',
          confirmed: '#7c6bf2',
          active: '#2fbf71',
          done: '#8b93a5',
          cancel: '#e05561',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,.4), 0 12px 40px -12px rgba(0,0,0,.65)',
        glow: '0 0 0 1px rgba(200,169,106,.35), 0 18px 60px -18px rgba(200,169,106,.45)',
        inset: 'inset 0 1px 0 rgba(255,255,255,.06)',
      },
      backgroundImage: {
        'grid-fade':
          'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(200,169,106,.14), transparent 70%)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .5s cubic-bezier(.22,.61,.36,1) both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
export default config;
