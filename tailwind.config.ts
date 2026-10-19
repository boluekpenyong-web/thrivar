import type { Config } from "tailwindcss";

// THRIVAR brand system.
// The existing token names (cobalt, electric, sand, sandSoft, cream, ink) are kept
// and re-pointed at the new palette, so every page and component that already uses
// them is rebranded without being edited. The new names are the ones to use going forward.
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // New brand names
        aubergine: "#302B4A", // primary buttons, navigation, key elements
        plum: "#514565", // secondary elements, subtle emphasis
        cream: "#F7F1E8", // main background
        greige: "#E8E4DE", // coach bubbles, secondary surfaces
        champagne: "#D8C5A7", // icons, fine details (never text on cream)
        mauve: "#B7A6BC", // occasional supporting accent (never text on cream)
        ink: "#26213A", // body text, aubergine-tinted

        // Legacy names, now mapped to the new palette
        cobalt: "#302B4A",
        electric: "#514565",
        sand: "#D8C5A7",
        sandSoft: "#E8E4DE",
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
