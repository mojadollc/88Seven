import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#319F44",
        secondary: "#64DEA7",
        accent: "#59EBC6",
        cta: "#FF8A00",
        yellow: "#FFD23F",
        bg: "#F5F5DB",
        charcoal: "#1F2937",
        third: "#FFFFFF",
      },
    },
  },
  plugins: [],
};
export default config;
