import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        /* Brand Colors */
        brand: {
          50: "hsl(var(--brand-50))",
          500: "hsl(var(--brand-500))",
          600: "hsl(var(--brand-600))",
          700: "hsl(var(--brand-700))",
        },
        
        /* Neon Colors */
        neon: {
          magenta: "hsl(var(--neon-magenta))",
          cyan: "hsl(var(--neon-cyan))",
          green: "hsl(var(--neon-green))",
        },
        
        /* Component Colors */
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      
      /* Cyberpunk Backgrounds */
      backgroundImage: {
        'gradient-neon': 'var(--gradient-neon)',
        'gradient-cyber': 'var(--gradient-cyber)',
        'gradient-glow': 'var(--gradient-glow)',
      },
      
      /* Neon Box Shadows */
      boxShadow: {
        'neon': 'var(--shadow-neon)',
        'magenta': 'var(--shadow-magenta)',
        'glass': 'var(--shadow-glass)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        /* Shadcn Accordion */
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        
        /* Cyberpunk Animations */
        "grid-float": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "25%": { transform: "translate(-2px, -2px) scale(1.005)" },
          "50%": { transform: "translate(2px, -1px) scale(0.995)" },
          "75%": { transform: "translate(-1px, 2px) scale(1.002)" },
        },
        "grid-pulse": {
          "0%": { opacity: "0.05" },
          "100%": { opacity: "0.15" },
        },
        "neon-glow": {
          "0%, 100%": { textShadow: "0 0 5px currentColor, 0 0 10px currentColor" },
          "50%": { textShadow: "0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor" },
        },
        "word-reveal": {
          "0%": { 
            opacity: "0", 
            transform: "translateY(-20px) scale(0.8)",
            textShadow: "0 0 0 transparent",
          },
          "50%": {
            opacity: "0.7",
            transform: "translateY(-5px) scale(1.1)",
          },
          "100%": { 
            opacity: "1", 
            transform: "translateY(0) scale(1)",
            textShadow: "0 0 12px hsl(var(--brand-500) / 0.6)",
          },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 5px hsl(var(--brand-500) / 0.3)" },
          "50%": { boxShadow: "0 0 20px hsl(var(--brand-500) / 0.6), 0 0 30px hsl(var(--brand-500) / 0.3)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      
      animation: {
        /* Shadcn */
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        
        /* Cyberpunk */
        "grid-float": "grid-float 20s ease-in-out infinite",
        "grid-pulse": "grid-pulse 4s ease-in-out infinite alternate",
        "neon-glow": "neon-glow 2s ease-in-out infinite",
        "word-reveal": "word-reveal 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.5s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
