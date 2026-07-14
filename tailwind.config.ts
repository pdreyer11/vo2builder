import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        vo2: {
          accent: "#E84545",
          "accent-light": "#FDF2F2",
          "accent-mid": "#F0888A",
        },
        surface: "#FAFAFA",
        "surface-card": "#FFFFFF",
        sidebar: "#111827",
        // HR zone colors
        "zone-1": "#22C55E",
        "zone-2": "#3B82F6",
        "zone-3": "#EAB308",
        "zone-4": "#F97316",
        "zone-5": "#E84545",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
