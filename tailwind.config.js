// Colours are semantic tokens backed by CSS variables (see src/index.css), so
// every component reads the same palette and dark mode is a variable swap.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Archivo', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        script: ['"Segoe Script"', '"Brush Script MT"', 'cursive'],
      },
      colors: {
        canvas: token('canvas'),
        low: token('low'),
        card: token('card'),
        tint: token('tint'),
        ink: token('ink'),
        muted: token('muted'),
        line: token('line'),
        rule: token('rule'),
        accent: token('accent'),
        fill: token('fill'),
        onfill: token('onfill'),
        warn: token('warn'),
        onwarn: token('onwarn'),
      },
      // 6-7px on controls, 9-10px on the few real containers.
      borderRadius: {
        md: '6px',
        lg: '7px',
        xl: '9px',
        '2xl': '10px',
      },
      // State changes only, all at or under 200ms.
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'fade-up': 'fade-up 150ms ease-out',
        'slide-in': 'slide-in 180ms ease-out',
        'sheet-up': 'sheet-up 180ms ease-out',
      },
    },
  },
  plugins: [],
}
