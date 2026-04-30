/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "Helvetica Neue", "sans-serif"],
      },
      colors: {
        border: "hsl(220 13% 91%)",
        input: "hsl(220 13% 91%)",
        ring: "hsl(224 76% 48%)",
        background: "hsl(220 20% 97%)",
        foreground: "hsl(222 20% 10%)",
        primary: {
          DEFAULT: "hsl(224 76% 48%)",
          foreground: "hsl(0 0% 100%)",
        },
        secondary: {
          DEFAULT: "hsl(220 14% 96%)",
          foreground: "hsl(222 10% 20%)",
        },
        destructive: {
          DEFAULT: "hsl(0 72% 51%)",
          foreground: "hsl(0 0% 100%)",
        },
        muted: {
          DEFAULT: "hsl(220 14% 96%)",
          foreground: "hsl(220 8% 46%)",
        },
        accent: {
          DEFAULT: "hsl(220 14% 96%)",
          foreground: "hsl(222 10% 20%)",
        },
        popover: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(222 20% 10%)",
        },
        card: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(222 20% 10%)",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
