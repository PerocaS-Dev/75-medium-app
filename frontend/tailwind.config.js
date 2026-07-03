/**
 * 75 Medium — Design Tokens (Tailwind v3 config)
 * Source: style-files/tailwind.config.js — do not edit this copy directly.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    // ── Type scale (rem, 16px base) ───────────────────────────
    fontSize: {
      'caption': ['0.8125rem', { lineHeight: '1.4' }],
      'sm':      ['0.875rem',  { lineHeight: '1.45' }],
      'base':    ['1rem',      { lineHeight: '1.5' }],
      'lg':      ['1.125rem',  { lineHeight: '1.35' }],
      'xl':      ['1.3125rem', { lineHeight: '1.25' }],
      '2xl':     ['1.6875rem', { lineHeight: '1.18' }],
      '3xl':     ['2.125rem',  { lineHeight: '1.1' }],
      'display': ['2.75rem',   { lineHeight: '1.04', letterSpacing: '-0.01em' }],
      'hero':    ['3.75rem',   { lineHeight: '1.0',  letterSpacing: '-0.02em' }],
      'stat':    ['5rem',      { lineHeight: '0.92', letterSpacing: '-0.03em' }],
    },
    extend: {
      colors: {
        clay: {
          50:  '#F8F3EA',
          100: '#F0E8DB',
          200: '#E5D9C7',
          300: '#D3C3AE',
          400: '#B9A48D',
          500: '#99826D',
          600: '#7A6553',
          700: '#5F4C3E',
          800: '#4A3B30',
          900: '#362A22',
          950: '#2A211B',
        },
        paper: '#FFFDF8',

        blush: {
          100: '#FDEDF1',
          200: '#FBDCE5',
          300: '#F8C6D5',
          400: '#F2A7BD',
          500: '#E687A2',
          600: '#D6688A',
        },
        lilac: {
          100: '#F3EEFB',
          200: '#E8DEF7',
          300: '#D8CAF0',
          400: '#C2ADE6',
          500: '#A98FD6',
          600: '#8E6FC4',
        },

        sage: {
          100: '#E6F0E9',
          300: '#C2D9C9',
          500: '#8DB39A',
          600: '#6E967C',
        },
        peach: {
          100: '#FBEBD8',
          300: '#F6D0A8',
          500: '#E8A971',
          600: '#D0894E',
        },
        rust: {
          100: '#F6E3DC',
          300: '#E9BBAF',
          500: '#D08A7B',
          600: '#B96C5B',
        },
      },

      fontFamily: {
        display: ['Newsreader', 'Georgia', 'serif'],
        sans:    ['"Hanken Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },

      spacing: {
        '4.5':    '1.125rem',
        '13':     '3.25rem',
        '18':     '4.5rem',
        'gutter': '1.25rem',
        'section':'2.5rem',
        'bleed':  '5rem',
      },

      borderRadius: {
        'sm':   '0.5rem',
        'md':   '0.75rem',
        'lg':   '1.125rem',
        'xl':   '1.375rem',
        '2xl':  '1.75rem',
        'pill': '999px',
      },

      boxShadow: {
        'soft':       '0 1px 2px rgba(58,42,30,0.04), 0 4px 16px rgba(58,42,30,0.06)',
        'lift':       '0 10px 34px rgba(58,42,30,0.12)',
        'ring':       '0 0 0 4px rgba(230,135,162,0.18)',
        'inset-hair': 'inset 0 0 0 1px rgba(229,217,199,0.9)',
      },

      transitionTimingFunction: {
        'soft': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },

      keyframes: {
        'pop-in': {
          '0%':   { transform: 'scale(0.6)', opacity: '0' },
          '60%':  { transform: 'scale(1.08)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        'rise': {
          '0%':   { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
        'rise':   'rise 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
}
