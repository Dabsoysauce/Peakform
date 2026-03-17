/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        accent: '#1a1a2e',
        card: '#1e1e30',
        surface: '#16213e',
        'primary-green': '#4ade80',
      },
    },
  },
  plugins: [],
};
