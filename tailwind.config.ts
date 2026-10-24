import type { Config } from "tailwindcss";

// THRIVAR brand system (Product Interface Redesign brief).
// Midnight Ink #202039, Warm Ivory #F6F2EA, Muted Champagne #C5B38B, Mineral Slate #777F91.
// Older token names (aubergine, plum, cream, greige, mauve, cobalt, electric, sand, sandSoft)
// are kept and re-pointed at the new palette, so pages not touched in this update
// (Journal, Pillars, Assessment, Coach) pick up the new colours without being edited.
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand names, use these going forward
        midnight: "#202039", // authority: key text, selected states, primary buttons
        ivory: "#F6F2EA", // page background and the Intelligence card
        champagne: "#C5B38B", // fine details only, never body text
        mineral: { DEFAULT: "#777F91", deep: "#646C7E" }, // DEFAULT for lines and large text; deep (#646C7E) for small secondary text, still clearly slate and readable on ivory
        tonal: "#ECE7DC", // quiet tonal surface for panels on ivory

        // Older names, now mapped to the new palette
        aubergine: "#202039",
        plum: "#3A3A5C", // hover state of midnight
        cream: "#F6F2EA",
        greige: "#ECE7DC",
        mauve: "#777F91",
        ink: "#202039",
        cobalt: "#202039",
        electric: "#3A3A5C",
        sand: "#C5B38B",
        sandSoft: "#ECE7DC",
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
