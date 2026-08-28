import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#16A34A",
        secondary: "#84E13A",
        accent: "#0B5E34",
        cta: "#FF8A00",
        yellow: "#FFD23F",
        bg: "#F4F5F7",
        charcoal: "#1F2937",
        third: "#FFFFFF",
      },
    },
  },
  plugins: [],
};
export default config;
