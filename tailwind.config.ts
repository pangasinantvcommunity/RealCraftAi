import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: "#050505",
          50: "#f4f4f5",
          100: "#141416",
          200: "#0d0d0f",
          900: "#050505",
        },
        violet: {
          DEFAULT: "#7C4DFF",
          50: "#f1ecff",
          100: "#e3d9ff",
          300: "#b193ff",
          500: "#7C4DFF",
          700: "#5b2fe0",
          900: "#2f1470",
        },
        cyan: {
          DEFAULT: "#00E5FF",
          300: "#7dfaff",
          500: "#00E5FF",
          700: "#00a8bd",
        },
      },
      fontFamily: {
        heading: ["var(--font-space-grotesk)", "var(--font-sora)", "sans-serif"],
        sora: ["var(--font-sora)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      backgroundImage: {
        "cinematic-glow":
          "radial-gradient(circle at 50% 0%, rgba(124,77,255,0.25), transparent 60%)",
        aurora: "linear-gradient(120deg, #7C4DFF 0%, #00E5FF 50%, #7C4DFF 100%)",
      },
      boxShadow: {
        glow: "0 0 40px rgba(124,77,255,0.35)",
        "glow-cyan": "0 0 40px rgba(0,229,255,0.35)",
        depth: "0 20px 60px -15px rgba(0,0,0,0.7)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.08)" },
        },
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
        "gradient-shift": "gradient-shift 8s ease infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
