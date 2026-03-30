import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui"],
      },
      colors: {
        /** Brand accent — violet / purple family (light → deep) */
        fresh: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7e22ce",
          800: "#6b21a8",
          900: "#581c87",
        },
        /** Swiggy-style orange accent */
        rush: {
          50: "#fff7ed",
          100: "#ffedd5",
          400: "#fb923c",
          500: "#FC8019",
          600: "#ea580c",
          700: "#c2410c",
        },
        ink: {
          DEFAULT: "#1c1917",
          muted: "#57534e",
          soft: "#a8a29e",
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.06)",
        "card-lg":
          "0 4px 6px rgba(0,0,0,.04), 0 12px 32px rgba(0,0,0,.08)",
        glow: "0 0 48px rgba(147, 51, 234, 0.28)",
      },
      backgroundImage: {
        "mesh-hero":
          "radial-gradient(at 40% 20%, rgba(147,51,234,0.14) 0px, transparent 52%), radial-gradient(at 85% 10%, rgba(192,132,252,0.12) 0px, transparent 48%), radial-gradient(at 0% 60%, rgba(99,102,241,0.1) 0px, transparent 50%), linear-gradient(180deg, #faf5ff 0%, #f5f3ff 45%, #fafaf9 100%)",
        "gradient-cta": "linear-gradient(135deg, #c084fc 0%, #9333ea 42%, #6d28d9 100%)",
        "gradient-rush": "linear-gradient(135deg, #FC8019 0%, #ea580c 100%)",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
