import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cobalt: "#243B7A",
        electric: "#4C6FFF",
        sand: "#D8CBB8",
        sandSoft: "#EFE8DD",
        cream: "#F8F5EF",
        ink: "#182033",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
