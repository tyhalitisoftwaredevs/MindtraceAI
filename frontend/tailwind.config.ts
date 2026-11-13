import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172d2a",
        forest: "#225c4b",
        mint: "#e9f4ed",
        canvas: "#f7f8f4",
        coral: "#e98567",
      },
      boxShadow: {
        card: "0 12px 35px rgba(27, 57, 48, 0.06)",
      },
      fontFamily: {
        sans: ["Arial", "Helvetica", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
