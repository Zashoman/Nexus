import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Dark trading-terminal palette
        ink: {
          950: '#08090b',
          900: '#0c0e12',
          850: '#10131a',
          800: '#151923',
          700: '#1d2230',
          600: '#2a3040',
          500: '#3a4158',
        },
        bone: {
          50: '#f5f4f0',
          100: '#e8e6df',
          200: '#c8c5ba',
          300: '#9b988d',
          400: '#6e6b63',
        },
        // Regime accents
        calm: '#6ba97f',
        elevated: '#c9a15b',
        stressed: '#c97a5b',
        dislocation: '#b5455f',
        // Signal
        up: '#6ba97f',
        down: '#c97a5b',
        accent: '#d4a76a',
      },
      boxShadow: {
        tile: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 -1px 0 0 rgba(0,0,0,0.4) inset',
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
    },
  },
  plugins: [],
};

export default config;
