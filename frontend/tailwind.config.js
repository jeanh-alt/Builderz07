/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Fluid Design System Engie - Direct color names
        // These will be accessible as bg-[color] text-[color] etc.
        'engie-primary': '#00A86B',
        'engie-primary-dark': '#00825A',
        'engie-primary-light': '#E3F5E8',
        'engie-secondary': '#0055A8',
        'engie-text-dark': '#2C3E50',
        'engie-text-medium': '#6C757D',
        'engie-text-light': '#9E9E9E',
        'engie-bg': '#FFFFFF',
        'engie-bg-light': '#F8F9FA',
        'engie-error': '#D32F2F',
        'engie-warning': '#FFC107',
        // Network status colors
        'network-engie': '#00A86B',
        'network-engie-soon': '#4CAF50',
        'network-high-score': '#E53935',
        'network-medium-score': '#FF9800',
        'network-low-score': '#D32F2F',
        'network-unknown': '#9E9E9E',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
