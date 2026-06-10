import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#EFBF04",
        secondary: "#D62828",
        third: "#FFFFFF",
      },
    },
  },
  plugins: [],
};
export default config;
