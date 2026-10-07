/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        surface2: 'rgb(var(--surface2) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        subtle: 'rgb(var(--subtle) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        'primary-fg': 'rgb(var(--primary-fg) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-fg': 'rgb(var(--accent-fg) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        'success-fg': 'rgb(var(--success-fg) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        'warning-fg': 'rgb(var(--warning-fg) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        'danger-fg': 'rgb(var(--danger-fg) / <alpha-value>)',
        info: 'rgb(var(--info) / <alpha-value>)',
        'info-fg': 'rgb(var(--info-fg) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -12px rgb(0 0 0 / 0.12)',
        pop: '0 8px 30px -8px rgb(0 0 0 / 0.20)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        pop: 'pop 0.2s ease-out both',
      },
    },
  },
  plugins: [],
};
