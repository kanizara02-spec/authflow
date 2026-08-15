/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        cyber: {
          cyan: "#38bdf8",
          emerald: "#10b981",
          violet: "#8b5cf6",
          amber: "#f59e0b",
          rose: "#ef4444",
        },
        ink: {
          950: "#0b0f19",
          900: "#111827",
          850: "#1f2937",
          800: "#374151",
          750: "#4b5563",
          700: "#6b7280",
          600: "#9ca3af",
        },
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "ui-sans-serif", "system-ui"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow-pulse": "glowPulse 3s ease-in-out infinite alternate",
        "spin-slow": "spin 12s linear infinite",
      },
      keyframes: {
        glowPulse: {
          "0%": { boxShadow: "0 0 15px rgba(0, 240, 255, 0.15)" },
          "100%": { boxShadow: "0 0 35px rgba(0, 240, 255, 0.35)" },
        },
      },
    },
  },
  plugins: [],
};
