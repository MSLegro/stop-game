/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        hand: ['"Patrick Hand"', 'cursive', 'sans-serif'],
        sans: ['"Fredoka"', 'sans-serif'],
      },
      colors: {
        paper: {
          50: '#ffffff',
          100: '#fdfbf7',
          200: '#f9f6ee',
          300: '#f3ede2',
        },
        ink: {
          900: '#18181b',
          800: '#27272a',
          700: '#3f3f46',
          500: '#71717a',
        },
        chalk: {
          red: '#ef4444',
          yellow: '#facc15',
          green: '#22c55e',
          blue: '#3b82f6',
          purple: '#a855f7',
        }
      },
      boxShadow: {
        'sketch-sm': '2px 2px 0px #18181b',
        'sketch': '4px 4px 0px #18181b',
        'sketch-lg': '6px 6px 0px #18181b',
        'sketch-xl': '8px 8px 0px #18181b',
        'sketch-hover': '2px 2px 0px #18181b',
      },
      borderRadius: {
        'sketch': '255px 15px 225px 15px/15px 225px 15px 255px',
        'sketch-card': '20px 255px 20px 25px/255px 20px 255px 20px',
        'sketch-sm': '15px 125px 15px 15px/125px 15px 125px 15px',
      }
    },
  },
  plugins: [],
}
