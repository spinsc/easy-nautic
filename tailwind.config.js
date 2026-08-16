/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tide: {
          50: '#eefbfc',
          100: '#d3f2f4',
          200: '#a7e4e9',
          300: '#71ccd4',
          400: '#3cabb6',
          500: '#218f9b',
          600: '#19717f',
          700: '#175b68',
          800: '#174a55',
          900: '#173e48',
        },
      },
      fontFamily: {
        display: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
