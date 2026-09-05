import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#4194AF",
        secondary: "#61B288",
        accent: "#93D569",
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
