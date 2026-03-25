/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          void: 'var(--bg-void)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
        },
        accent: {
          primary: 'var(--accent-primary)',
          secondary: 'var(--accent-secondary)',
          glow: 'var(--accent-glow)',
        },
        text: {
          primary: 'var(--text-primary)',
          muted: 'var(--text-muted)',
          dim: 'var(--text-dim)',
        },
        status: {
          success: 'var(--success)',
          warning: 'var(--warning)',
        },
        border: {
          subtle: 'var(--border-subtle)',
        }
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'blob': 'blob 20s ease-in-out infinite alternate',
        'orbit': 'orbit 8s linear infinite',
        'shimmer': 'shimmer 2.5s infinite linear',
        'fade-up': 'fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spring-pop': 'spring-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        orbit: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: .5 },
        },
        'spring-pop': {
          '0%': { opacity: 0, transform: 'scale(0)' },
          '80%': { transform: 'scale(1.1)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        }
      }
    },
  },
  plugins: [],
}
