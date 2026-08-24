/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sap: {
          blue: '#0a6ed1',
          dark: '#1d232a',
          sidebar: '#181b20',
          card: '#22272e',
          border: '#2d333b',
          accent: '#0070f2',
          gold: '#e99c00',
          success: '#107e3e',
          danger: '#bb0000',
          warning: '#e9730c',
        }
      }
    },
  },
  plugins: [],
}
