import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#22382f", soft: "#4c5e55", faint: "#7c8e83" },
        canvas: { DEFAULT: "#eef4ea", low: "#e3ecdf" },
        moss: { DEFAULT: "#2e7d5b", deep: "#1c5740" },
        honey: { DEFAULT: "#c08a35", soft: "#e7b25a" },
        slateblue: { DEFAULT: "#5f6fa6", soft: "#8a96c4" },
        teal: { DEFAULT: "#2f8a82", soft: "#5bb0a6" },
        clay: "#be6f54",
      },
      fontFamily: {
        sans: ["ui-rounded", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Helvetica", "Arial", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(34,56,47,0.22)",
        lift: "0 18px 50px -16px rgba(34,56,47,0.30)",
      },
      borderRadius: { xl2: "1.25rem" },
    },
  },
  plugins: [],
};
export default config;
