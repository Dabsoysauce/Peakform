/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#e85d04',
        'primary-light': '#f97316',
        accent: '#3b82f6',
        card: 'rgba(255,255,255,0.04)',
        'card-solid': '#13132b',
        surface: 'rgba(255,255,255,0.06)',
        'surface-solid': '#161633',
        'primary-green': '#22c55e',
        glow: '#e85d04',
        'glow-blue': '#3b82f6',
      },
      borderColor: {
        glass: 'rgba(255,255,255,0.08)',
      },
      backdropBlur: {
        glass: '20px',
      },
      boxShadow: {
        glow: '0 0 20px rgba(232,93,4,0.15)',
        'glow-blue': '0 0 20px rgba(59,130,246,0.15)',
        'glow-sm': '0 0 10px rgba(232,93,4,0.1)',
        glass: '0 8px 32px rgba(0,0,0,0.3)',
        'card-hover': '0 12px 40px rgba(232,93,4,0.08)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'gradient-shift': 'gradientShift 8s ease infinite',
        'fade-up': 'fadeUp 0.6s ease forwards',
        'slide-in': 'slideIn 0.4s ease forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(232,93,4,0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(232,93,4,0.4)' },
        },
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
