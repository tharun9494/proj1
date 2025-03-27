/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff1f1',
          100: '#ffe1e1',
          200: '#ffc7c7',
          300: '#ffa0a0',
          400: '#ff6b6b',
          500: '#ff3b3b',
          600: '#ff1111',
          700: '#e70000',
          800: '#c00',
          900: '#a60000',
          950: '#5c0000',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};