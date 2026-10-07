import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-plus-jakarta)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Design System: "The Editorial Architect"
        primary: {
          DEFAULT: '#4f46e5',
          container: '#6366f1',
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        secondary: {
          DEFAULT: '#6b4fa0',
          container: '#c4b0e8',
          50: '#f5f0ff',
          100: '#ede5ff',
          200: '#d8c8f5',
          300: '#c4b0e8',
          400: '#9b7fd0',
          500: '#6b4fa0',
          600: '#5a3f8f',
          700: '#4a3278',
          800: '#3a2660',
          900: '#2a1a48',
        },
        surface: {
          DEFAULT: '#eef2f7',
          'container-low': '#f1f5f9',
          'container-lowest': '#ffffff',
          'container-high': '#e2e8f0',
          'container-highest': '#cbd5e1',
        },
        'on-surface': '#0f172a',
        'on-primary': '#ffffff',
        'on-secondary-container': '#2a1a48',
        outline: {
          DEFAULT: '#64748b',
          variant: '#94a3b8',
        },
        tertiary: '#983772',
        error: {
          DEFAULT: '#f43f5e',
          container: '#fff1f2',
        },
        'on-error': '#fff1f2',
        // Dark "Content OS" theme — additive, used only by the dashboard
        // shell (Sidebar, dashboard header/searchbar, dashboard home page)
        // so the rest of the app (marketing pages, auth, other dashboard
        // subpages) is unaffected.
        dash: {
          bg: '#0b1220',
          sidebar: '#0b1220',
          surface: '#0f172a',
          card: '#151d2e',
          'card-hover': '#1b2438',
          'card-alt': '#1e293b',
          border: 'rgba(255,255,255,0.07)',
          'border-strong': 'rgba(255,255,255,0.12)',
          text: '#f4f5f7',
          'text-secondary': '#94a3b8',
          'text-muted': '#64748b',
        },
      },
      spacing: {
        '4.5': '1.125rem',  // ~18px
        '11': '2.75rem',    // spacing 12 in design = 2.75rem
        '18': '4.5rem',     // spacing 20 = 4.5rem
        '22': '5.5rem',     // spacing 24 = 5.5rem
        '128': '32rem',
        '144': '36rem',
      },
      fontSize: {
        'display-md': ['2.75rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-sm': ['1.25rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-md': ['0.9375rem', { lineHeight: '1.6', fontWeight: '400' }],
        'label-md': ['0.875rem', { lineHeight: '1.4', fontWeight: '500' }],
        'label-sm': ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
      boxShadow: {
        'ambient': '0 20px 40px rgba(15, 23, 42, 0.06)',
        'ambient-sm': '0 8px 20px rgba(15, 23, 42, 0.04)',
        'ambient-lg': '0 30px 60px rgba(15, 23, 42, 0.08)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #4f46e5, #6366f1)',
        'gradient-hero': 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
