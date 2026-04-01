import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          DEFAULT: "#D4692A",
          50: "#FBF0E8",
          100: "#F5D9C4",
          200: "#EBB48A",
          300: "#E19050",
          400: "#D87A3A",
          500: "#D4692A",
          600: "#B85A24",
          700: "#9C4B1E",
          800: "#803D18",
          900: "#642E12",
        },
        dark: {
          DEFAULT: "#111111",
          50: "#2a2a2a",
          100: "#252525",
          200: "#222222",
          300: "#1e1e1e",
          400: "#1a1a1a",
          500: "#161616",
          600: "#111111",
          700: "#0d0d0d",
          800: "#0a0a0a",
          900: "#050505",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
