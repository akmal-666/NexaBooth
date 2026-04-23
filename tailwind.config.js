/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#EBF0FF',
          100: '#D6E1FF',
          200: '#ADC3FF',
          400: '#6B86E8',
          500: '#4B5FD6',
          700: '#2D3FA3',
          900: '#1E2A6E',
        },
        accent: {
          400: '#FF9F7A',
          500: '#FF7B54',
          600: '#E55A2B',
        },
        surface: '#F4F7FF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'countdown': 'countdown 1s ease-in-out',
        'flash': 'flash 0.15s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'pulse-ring': 'pulse-ring 1.5s ease-out infinite',
      },
      keyframes: {
        countdown: {
          '0%': { transform: 'scale(1.5)', opacity: '0' },
          '20%': { transform: 'scale(1)', opacity: '1' },
          '80%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.8)', opacity: '0' },
        },
        flash: {
          '0%': { opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
      },
      boxShadow: {
        card: '0 2px 16px rgba(30, 42, 110, 0.08)',
        'card-hover': '0 8px 32px rgba(30, 42, 110, 0.16)',
        nav: '0 -4px 24px rgba(30, 42, 110, 0.08)',
      },
    },
  },
  plugins: [],
}
