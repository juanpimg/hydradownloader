/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Helvetica Neue",
          "Helvetica",
          "Arial",
          "sans-serif"
        ],
      },
      colors: {
        apple: {
          blue: "#0071e3",
          'blue-hover': "#0077ed",
          gray: "#86868b",
          'card-light': "rgba(255, 255, 255, 0.72)",
          'card-dark': "rgba(28, 28, 30, 0.75)",
          'border-light': "rgba(0, 0, 0, 0.08)",
          'border-dark': "rgba(255, 255, 255, 0.12)",
        }
      },
      boxShadow: {
        'apple-subtle': "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
        'apple-elevated': "0 20px 40px -15px rgba(0, 0, 0, 0.12)",
        'apple-glow': "0 0 30px -5px rgba(0, 113, 227, 0.3)",
      },
      backdropBlur: {
        'apple': "24px",
      }
    },
  },
  plugins: [],
}
