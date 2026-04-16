import { useState } from "react";
import { useEditorStore } from "../stores/editor";
import CutList from "./CutList";
import Bin from "./Bin";

type Tab = "clips" | "cuts";

export default function LeftPanel() {
  const [tab, setTab] = useState<Tab>("clips");
  const cutsCount = useEditorStore((s) => s.cuts.length);
  const pendingCount = useEditorStore((s) => s.cuts.filter((c) => c.status === "pending").length);
  const overlaysCount = useEditorStore((s) => s.overlays.length);

  return (
    <div className="flex flex-col h-full bg-editor-panel border-r border-editor-border">
      {/* Tab bar */}
      <div className="flex border-b border-editor-border">
        <button
          onClick={() => setTab("clips")}
          className={`flex-1 h-10 text-[11px] font-medium transition-colors ${
            tab === "clips"
              ? "text-accent border-b-2 border-accent bg-editor-elevated"
              : "text-editor-muted hover:text-editor-text hover:bg-editor-elevated"
          }`}
        >
          Clips
          {overlaysCount > 0 && (
            <span className="ml-1.5 text-editor-dim text-[10px]">{overlaysCount}</span>
          )}
        </button>
        <button
          onClick={() => setTab("cuts")}
          className={`flex-1 h-10 text-[11px] font-medium transition-colors relative ${
            tab === "cuts"
              ? "text-accent border-b-2 border-accent bg-editor-elevated"
              : "text-editor-muted hover:text-editor-text hover:bg-editor-elevated"
          }`}
        >
          Cortes
          {cutsCount > 0 && (
            <span className="ml-1.5 text-editor-dim text-[10px]">{cutsCount}</span>
          )}
          {pendingCount > 0 && (
            <span className="absolute top-2 right-3 w-1.5 h-1.5 rounded-full bg-cut-gap" title={`${pendingCount} pendentes`} />
          )}
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {tab === "clips" && <Bin />}
        {tab === "cuts" && <CutList />}
      </div>
    </div>
  );
}
