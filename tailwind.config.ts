import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        abyss: "#090a12",
        ink: "#121322",
        panel: "#18182a",
        gold: "#ffd66b",
        acid: "#b6ff4f",
        rose: "#ff3f7c",
        cyan: "#35e8ff"
      },
      boxShadow: {
        neon: "0 0 24px rgba(53, 232, 255, 0.35)",
        impact: "0 0 36px rgba(255, 63, 124, 0.35)"
      },
      fontFamily: {
        display: ["var(--font-display)", "Impact", "Arial Black", "sans-serif"]
      },
      backgroundImage: {
        scanlines:
          "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
        radialBurst:
          "radial-gradient(circle at 50% 40%, rgba(255,214,107,0.24), rgba(255,63,124,0.10) 34%, transparent 64%)"
      }
    }
  },
  plugins: []
};

export default config;
