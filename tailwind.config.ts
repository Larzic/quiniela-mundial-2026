import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Marca Nxtara
        nxpink: "#FF2C91",
        nxpinkDark: "#D81B74",
        nxteal: "#00E7CF",
        nxred: "#FF2D55",
        nxink: "#04100E", // fondo base
        nxpanel: "#0B1A18",
        nxpanel2: "#11231F",
        nxborder: "rgba(255,255,255,0.10)",
      },
      backgroundImage: {
        "nx-grad": "linear-gradient(135deg,#FF2C91 0%,#FF2D55 100%)",
        "nx-teal": "linear-gradient(135deg,#00E7CF 0%,#33CCBB 100%)",
      },
      boxShadow: {
        "nx-glow": "0 0 40px -10px rgba(255,44,145,0.45)",
      },
    },
  },
  plugins: [],
};
export default config;
