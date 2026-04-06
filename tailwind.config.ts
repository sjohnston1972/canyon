import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    fontFamily: {
      display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      body: ['Inter', 'system-ui', 'sans-serif'],
      label: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['"Roboto Mono"', 'monospace'],
    },
    borderRadius: {
      none: '0',
      DEFAULT: '0',
      sm: '0',
      md: '0',
      lg: '0',
      xl: '0',
      full: '9999px',
    },
    extend: {
      colors: {
        surface: {
          DEFAULT: 'var(--surface)',
          dim: 'var(--surface-dim)',
          bright: 'var(--surface-bright)',
          container: {
            DEFAULT: 'var(--surface-container)',
            low: 'var(--surface-container-low)',
            lowest: 'var(--surface-container-lowest)',
            high: 'var(--surface-container-high)',
            highest: 'var(--surface-container-highest)',
          },
          variant: 'var(--surface-variant)',
          tint: 'var(--surface-tint)',
        },
        on: {
          surface: {
            DEFAULT: 'var(--on-surface)',
            variant: 'var(--on-surface-variant)',
          },
          primary: 'var(--on-primary)',
          secondary: 'var(--on-secondary)',
          tertiary: 'var(--on-tertiary)',
          error: 'var(--on-error)',
          background: 'var(--on-background)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          container: 'var(--primary-container)',
          fixed: { DEFAULT: '#5d5f5f', dim: '#454747' },
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          container: 'var(--secondary-container)',
          fixed: { DEFAULT: '#c8c6c6', dim: '#acabaa' },
        },
        tertiary: {
          DEFAULT: 'var(--tertiary)',
          container: 'var(--tertiary-container)',
          fixed: { DEFAULT: '#7e5700', dim: '#604100' },
        },
        error: {
          DEFAULT: 'var(--error)',
          container: 'var(--error-container)',
        },
        outline: {
          DEFAULT: 'var(--outline)',
          variant: 'var(--outline-variant)',
        },
        inverse: {
          surface: '#e5e2e1',
          primary: '#5d5f5f',
          'on-surface': '#313030',
        },
        background: 'var(--background)',
      },
      spacing: {
        'grid-1': '4px',
        'grid-2': '8px',
        'grid-3': '12px',
        'grid-4': '16px',
        'grid-5': '20px',
        'grid-6': '24px',
        'grid-8': '32px',
      },
    },
  },
  plugins: [],
} satisfies Config
