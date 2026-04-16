import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="h-screen flex items-center justify-center text-gray-400">
      MVP Editor Visual — Shell loaded
    </div>
  </StrictMode>,
);
