/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: "#D90000",
          "red-hover": "#A60000",
          white: "#FFFFFF",
          "white-hover": "#F5F5F5",
          card: "#FFFFFF",
          border: "#D90000",
          muted: "#71717A",
          dark: "#18181B",
          light: "#FAFAFA",
        }
      }
    },
  },
  plugins: [],
};
