/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1677FF',
          50: '#E6F4FF',
          100: '#BAE0FF',
          500: '#1677FF',
          600: '#0958D9',
          700: '#003EB3',
        },
        health: {
          DEFAULT: '#00B96B',
          light: '#D9F7BE',
        },
        warning: {
          DEFAULT: '#FA8C16',
          light: '#FFF7E6',
        },
        danger: {
          DEFAULT: '#F5222D',
          light: '#FFF1F0',
        },
        bg: '#F5F7FA',
        card: '#FFFFFF',
        textPrimary: '#1C2D4F',
        textSecondary: '#6B7FA3',
        border: '#E8EDF5',
      },
      fontFamily: {
        sans: ['-apple-system', 'PingFang SC', 'Helvetica Neue', 'Arial'],
      },
    },
  },
  plugins: [],
};
