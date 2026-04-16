import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // App chrome — dark navy (CapCut-inspired)
        editor: {
          bg: "#15161a",        // app background
          panel: "#1e1f25",     // panel surfaces (cut list, inspector, timeline)
          elevated: "#252630",  // elevated surfaces (dropdowns, tooltips, hover)
          border: "#2a2b35",    // panel separators
          divider: "#1f2029",   // subtle dividers within a panel
          text: "#e4e4e7",      // primary text
          muted: "#8b8b9e",     // secondary text (timestamps, labels)
          dim: "#5a5b6b",       // tertiary (disabled, hints)
        },
        // Accent — teal/cyan (active, selection, focus)
        accent: {
          DEFAULT: "#00bcd4",
          hover: "#00d4e8",
          muted: "#00bcd433",      // 20% for selection fills
          ring: "#00bcd466",       // 40% for rings
        },
        // Cut colors by type
        cut: {
          retake: "#ef4444",       // vermelho — retake
          gap: "#f59e0b",          // amber — silencio
          filler: "#f97316",       // orange — filler words
          manual: "#a855f7",       // roxo — corte criado pelo usuario
          approved: "#22c55e",     // verde
          rejected: "#71717a",     // cinza (dimmed)
          adjusted: "#eab308",     // amarelo
        },
        // Track colors
        track: {
          face: "#22c55e",
          screen: "#3b82f6",
          audio: "#00bcd4",
        },
      },
      boxShadow: {
        panel: "0 0 0 1px #2a2b35",
        elevated: "0 4px 12px rgba(0, 0, 0, 0.4)",
      },
    },
  },
  plugins: [],
} satisfies Config;
