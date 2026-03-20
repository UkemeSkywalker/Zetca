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
          DEFAULT: '#4a40e0',
          container: '#9795ff',
          50: '#f0efff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93a0fd',
          400: '#6b63f1',
          500: '#4a40e0',
          600: '#3a32c4',
          700: '#2d27a0',
          800: '#1e1b7a',
          900: '#141060',
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
          DEFAULT: '#f6f6ff',
          'container-low': '#eef0ff',
          'container-lowest': '#ffffff',
          'container-high': '#dde2f5',
          'container-highest': '#d1dcff',
        },
        'on-surface': '#272e42',
        'on-primary': '#ffffff',
        'on-secondary-container': '#2a1a48',
        outline: {
          DEFAULT: '#6f768e',
          variant: '#a5adc6',
        },
        tertiary: '#983772',
        error: {
          DEFAULT: '#dc2626',
          container: '#ffefef',
        },
        'on-error': '#ffefef',
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
        'ambient': '0 20px 40px rgba(39, 46, 66, 0.06)',
        'ambient-sm': '0 8px 20px rgba(39, 46, 66, 0.04)',
        'ambient-lg': '0 30px 60px rgba(39, 46, 66, 0.08)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #4a40e0, #9795ff)',
        'gradient-hero': 'linear-gradient(135deg, #4a40e0 0%, #6b4fa0 50%, #9795ff 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
