/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ut: {
          cream: "#F5F0E8",
          creamDark: "#EDE7DA",
          burnt: "#C0501A",
          burntHover: "#A03D10",
          burntLight: "#E8752A",
          charcoal: "#1A1714",
          brown: "#3D2B1A",
          mid: "#7A6A5A",
          faint: "#E0D8CC",
          white: "#FDFAF6",
          green: "#2D6A4F",
          greenBg: "#EAF4EE",
          blue: "#1A4A8F",
          blueBg: "#EAF0FA",
          urgent: "#B02020",
          urgentBg: "#FDE8E8",
          medium: "#B06000",
          mediumBg: "#FEF3CD",
        },
      },
      boxShadow: {
        utSm: "0 2px 8px rgba(40,25,10,0.08)",
        utMd: "0 6px 24px rgba(40,25,10,0.12)",
        utLg: "0 16px 48px rgba(40,25,10,0.16)",
      },
      borderRadius: {
        ut: "20px",
        utSm: "12px",
      },
      fontFamily: {
        display: ["Playfair Display", "Georgia", "Times New Roman", "serif"],
        body: ["DM Sans", "Avenir Next", "Segoe UI", "sans-serif"],
        mono: ["DM Mono", "Menlo", "Monaco", "monospace"],
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
      },
      animation: {
        fadeUp: "fadeUp .7s ease both",
        pulseDot: "pulseDot 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
