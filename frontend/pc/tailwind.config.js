/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── 品牌主色（与 HIS端统一）────────────────────
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
        // ── 深色导航（与 HIS端统一）──────────────────
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
      },
      fontSize: {
        xs:   ['12px', '18px'],
        sm:   ['13px', '20px'],
        base: ['14px', '22px'],
        md:   ['15px', '22px'],
        lg:   ['16px', '24px'],
        xl:   ['18px', '26px'],
        '2xl':['20px', '28px'],
        '3xl':['24px', '32px'],
        '4xl':['28px', '36px'],
      },
      borderRadius: {
        DEFAULT: '6px',
        sm: '4px',
        md: '8px',
        lg: '10px',
        xl: '12px',
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,0.08)',
        'card-hover': '0 4px 16px rgba(22,119,255,0.12)',
      },
    },
  },
  plugins: [],
}
