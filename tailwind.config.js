/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Sora', '-apple-system', 'sans-serif'],
        sans: ['DM Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Cascadia Code', 'Consolas', 'monospace'],
      },
      colors: {
        // ── Design Bible ──────────────────────────────────
        surface: {
          DEFAULT: '#03030a',
          card:    '#0d0d1a',
          elevated:'#141428',
          overlay: '#0a0a14',
        },
        // Single accent gradient: Violet → Cyan
        violet: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        cyan: {
          50:  '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        // ── Legacy tokens (backward compat) ───────────────
        primary: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d7fe',
          300: '#a5bbfc',
          400: '#8196f8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        accent: {
          50:  '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
        dark: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      spacing: {
        // Strict 8px scale extensions
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
      },
      maxWidth: {
        '8xl': '88rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      backgroundSize: {
        '200%': '200% 200%',
        '300%': '300% 300%',
      },
      animation: {
        // ── New Design Bible animations ────────────────────
        'shimmer':      'shimmer 2.2s linear infinite',
        'glow-pulse':   'glowPulse 2.4s ease-in-out infinite',
        'float':        'float 5s ease-in-out infinite',
        'gradient-x':   'gradientX 6s ease infinite',
        'fade-up':      'fadeUp 0.5s ease-out',
        'fade-in':      'fadeIn 0.4s ease-out',
        'scale-in':     'scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        'slide-right':  'slideRight 0.4s ease-out',
        'border-glow':  'borderGlow 2s ease-in-out infinite',
        'node-pulse':   'nodePulse 2.8s ease-in-out infinite',
        'grid-pan':     'gridPan 24s linear infinite',
        // ── Legacy ────────────────────────────────────────
        'slide-up':     'slideUp 0.5s ease-out',
        'slide-down':   'slideDown 0.5s ease-out',
        'pulse-slow':   'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'aurora':       'aurora 14s linear infinite',
        'pulse-glow':   'glowPulse 2.6s ease-in-out infinite',
        'orb-float':    'float 4.8s ease-in-out infinite',
        'gradient':     'gradientX 8s ease infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-1200px 0' },
          '100%': { backgroundPosition: '1200px 0' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 16px rgba(139,92,246,0.25), 0 0 32px rgba(6,182,212,0.10)' },
          '50%':      { boxShadow: '0 0 32px rgba(139,92,246,0.50), 0 0 64px rgba(6,182,212,0.25)' },
        },
        borderGlow: {
          '0%, 100%': { borderColor: 'rgba(139,92,246,0.30)' },
          '50%':      { borderColor: 'rgba(6,182,212,0.60)' },
        },
        nodePulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(139,92,246,0.40)' },
          '50%':      { boxShadow: '0 0 0 8px rgba(139,92,246,0.00)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.88)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideRight: {
          '0%':   { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        aurora: {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        gridPan: {
          '0%':   { backgroundPosition: '0px 0px, 0px 0px' },
          '100%': { backgroundPosition: '0px 56px, 56px 0px' },
        },
      },
      boxShadow: {
        // Violet-to-Cyan glow system
        'glow-sm':  '0 0 16px rgba(139,92,246,0.30)',
        'glow':     '0 0 32px rgba(139,92,246,0.35), 0 0 64px rgba(6,182,212,0.10)',
        'glow-lg':  '0 0 48px rgba(139,92,246,0.45), 0 0 96px rgba(6,182,212,0.20)',
        'glow-cyan':'0 0 32px rgba(6,182,212,0.40)',
        'card':     '0 1px 0 rgba(255,255,255,0.06) inset, 0 0 0 1px rgba(255,255,255,0.04)',
        'card-hover':'0 1px 0 rgba(255,255,255,0.08) inset, 0 0 0 1px rgba(139,92,246,0.25), 0 8px 32px rgba(0,0,0,0.40)',
      },
    },
  },
  plugins: [],
}