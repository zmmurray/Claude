import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Monochrome sage → pine.
        pine: { darkest: "#051F20", dark: "#0B2B26", DEFAULT: "#163832" },
        ink: { DEFAULT: "#163832", soft: "#3c5e52", faint: "#6f968a" },
        canvas: { DEFAULT: "#DAF1DE", low: "#eef6ee" },
        moss: { DEFAULT: "#235347", deep: "#163832" }, // primary accent (emerald→pine)
        sage: { DEFAULT: "#8EB69B", deep: "#6e977f" },
        mint: "#DAF1DE",
        // The single warm point of light — used sparingly for the one thing that matters most.
        peach: { DEFAULT: "#E9B98D", deep: "#d99e66" },
        clay: "#b06a52", // errors only
      },
      fontFamily: {
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Helvetica", "Arial", "sans-serif"],
        // All sans-serif now — "display" is the same family, just used at larger sizes.
        display: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Helvetica", "Arial", "sans-serif"],
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
