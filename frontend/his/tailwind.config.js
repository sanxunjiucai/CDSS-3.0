/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── 品牌主色（来自参考图）──────────────────────
        primary: {
          DEFAULT: '#1677FF',
          50:  '#EBF4FF',
          100: '#D6E9FF',
          200: '#A8D0FF',
          300: '#75B5FF',
          400: '#4096FF',
          500: '#1677FF',
          600: '#0958D9',
          700: '#003EB3',
          800: '#002887',
          900: '#001562',
        },
        // ── 深色导航栏 ────────────────────────────────
        navy: {
          DEFAULT: '#1C2D4F',
          light:   '#253A63',
          dark:    '#111E35',
        },
        // ── 功能色 ────────────────────────────────────
        danger:  '#FF4D4F',
        warning: '#FA8C16',
        success: '#52C41A',
        // ── 背景 / 边框 ───────────────────────────────
        bg:     '#F5F7FA',
        card:   '#FFFFFF',
        border: '#E4E9F0',
        // ── 患者信息条 ────────────────────────────────
        'patient-bg': '#EBF4FF',
      },
      fontSize: {
        '2xs': ['10px', '14px'],
        xs:    ['11px', '16px'],
        sm:    ['12px', '18px'],
        base:  ['13px', '20px'],
        md:    ['14px', '20px'],
      },
      borderRadius: {
        DEFAULT: '6px',
        sm: '4px',
        md: '8px',
        lg: '10px',
      },
    },
  },
  plugins: [],
}
