/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        synth: {
          panel: '#15181d',
          panel2: '#1f242b',
          edge: '#3b434d',
          mint: '#51f5c6',
          cyan: '#42c6ff',
          violet: '#a674ff',
          amber: '#f2b84b',
        },
      },
    },
  },
  plugins: [],
};
