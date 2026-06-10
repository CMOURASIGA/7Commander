
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./store/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./constants/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fff4ec',
          100: '#ffe3d4',
          200: '#ffc7ad',
          300: '#ff9e73',
          400: '#f97c45',
          500: '#f26522',
          600: '#d9531a',
          700: '#b14117',
          800: '#8a3214',
          900: '#6b2811',
          950: '#3a1408',
        },
      }
    },
  },
  plugins: [],
}
