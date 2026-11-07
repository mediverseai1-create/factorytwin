import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#14283B", charcoal: "#202A32", steel: "#486779", ivory: "#F2F0E8",
        amber: { DEFAULT: "#E5A13A", dark: "#B97A1C" }, ok: "#3D765C", slate: "#8997A0", danger: "#B5483A",
      },
      fontFamily: { display: ["var(--font-display)", "sans-serif"], sans: ["var(--font-sans)", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
