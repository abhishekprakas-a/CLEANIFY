import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff9ff",
          100: "#dff2ff",
          200: "#b8e7ff",
          300: "#78d4ff",
          400: "#2fbeff",
          500: "#06a6f0",
          600: "#0084cd",
          700: "#0069a6",
          800: "#055989",
          900: "#0a4a71",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
