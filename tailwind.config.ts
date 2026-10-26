import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        ig: {
          blue: "#0095F6",
          "blue-hover": "#1877F2",
          border: "#DBDBDB",
          "border-light": "#EFEFEF",
          muted: "#737373",
          surface: "#FAFAFA",
        },
      },
      backgroundImage: {
        "gradient-ig": "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
        "gradient-dm": "linear-gradient(135deg, #7F00FF 0%, #E100FF 100%)",
        "gradient-qusec": "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
        "gradient-qusec-subtle": "linear-gradient(135deg, rgba(240,148,51,0.06) 0%, rgba(220,39,67,0.06) 50%, rgba(188,24,136,0.06) 100%)",
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(0, 0, 0, 0.04)",
        card: "0 1px 3px rgba(0, 0, 0, 0.08)",
        dropdown: "0 4px 20px rgba(0, 0, 0, 0.12)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out forwards",
        "slide-up": "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "like-bounce": "likeBounce 0.45s ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        likeBounce: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.25)" },
          "100%": { transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
