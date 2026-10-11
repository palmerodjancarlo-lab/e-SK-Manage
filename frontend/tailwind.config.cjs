/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // 12% tints are used across the app (bg-primary/12 …); not in Tailwind's default scale
      opacity: { 12: '0.12' },
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        brand: 'rgb(var(--brand) / <alpha-value>)',
        'brand-fg': 'rgb(var(--brand-fg) / <alpha-value>)',
        sidebar: 'rgb(var(--sidebar) / <alpha-value>)',
        gold: 'rgb(var(--gold) / <alpha-value>)',
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
        sans: ['"Atkinson Hyperlegible Next"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // Restrained radii (Swiss minimal): cards and inputs stay crisp, not bubbly
      borderRadius: {
        xl: '0.625rem',
        '2xl': '0.75rem',
        '3xl': '1rem',
      },
      // Borders carry structure; shadows stay barely-there
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.05)',
        pop: '0 12px 32px -12px rgb(15 23 42 / 0.25)',
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
        // document scanner: a light bar sweeping down the page
        scan: {
          '0%': { top: '0%' },
          '50%': { top: 'calc(100% - 4px)' },
          '100%': { top: '0%' },
        },
        // landing & auth: slow drift for decorative layers
        drift: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -10px, 0)' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(4px) rotate(-1.5deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'grow-x': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
        // route change: ends with NO transform, so fixed/sticky children keep working
        'page-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        pop: 'pop 0.2s ease-out both',
        scan: 'scan 2.2s ease-in-out infinite',
        drift: 'drift 9s ease-in-out infinite',
        bob: 'bob 4s ease-in-out infinite',
        shimmer: 'shimmer 2.4s linear infinite',
        'grow-x': 'grow-x 0.8s cubic-bezier(.2,.7,.2,1) both',
        'page-in': 'page-in 0.35s ease-out backwards',
      },
    },
  },
  plugins: [],
};
