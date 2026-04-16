import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        editor: {
          bg: "#0a0a0a",
          surface: "#111827",
          border: "#1e293b",
          panel: "#0f172a",
        },
        cut: {
          retake: "#ef4444",
          gap: "#fbbf24",
          filler: "#f97316",
          approved: "#22c55e",
          rejected: "#ef4444",
        },
        track: {
          face: "#22c55e",
          screen: "#a855f7",
          pip: "#3b82f6",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
