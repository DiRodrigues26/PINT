/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        softinsa: {
          50:  '#eef3f9',
          100: '#d5e1ef',
          200: '#aac3de',
          300: '#7fa5cd',
          400: '#5487bc',
          500: '#39639c',
          600: '#2d5288',
          700: '#244270',
          800: '#1c3358',
          900: '#152541',
        },
        azulciano: {
          50:  '#e6f8fc',
          100: '#c0ecf7',
          200: '#8ddef1',
          300: '#5ad1eb',
          400: '#2cc4e5',
          500: '#00b8e0',
          600: '#009bc0',
          700: '#007e9c',
          800: '#006179',
          900: '#004556',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'softinsa-gradient': 'linear-gradient(135deg, #39639C 0%, #00B8E0 100%)',
      },
    },
  },
  plugins: [],
};
