import { useState } from "react";
import { useEditorStore } from "../stores/editor";
import { saveCuts, startCompose, checkCompose } from "../api";

export default function Header() {
  const slug = useEditorStore((s) => s.slug);
  const cuts = useEditorStore((s) => s.cuts);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const [composing, setComposing] = useState(false);

  const pendingCount = cuts.filter((c) => c.status === "pending").length;

  const handleSave = async () => {
    await saveCuts(slug, cuts);
  };

  const handleCompose = async () => {
    setComposing(true);
    await saveCuts(slug, cuts);
    const jobId = await startCompose(slug);
    const poll = setInterval(async () => {
      const status = await checkCompose(slug, jobId);
      if (status === "done" || status === "error") {
        clearInterval(poll);
        setComposing(false);
      }
    }, 1000);
  };

  return (
    <div className="flex justify-between items-center px-4 py-2 bg-editor-surface border-b border-editor-border">
      <div className="flex items-center gap-3">
        <span className="font-bold text-white">{slug}</span>
        {pendingCount > 0 && (
          <span className="text-xs px-2 py-0.5 bg-editor-border rounded-full text-yellow-400">
            {pendingCount} pendentes
          </span>
        )}
        <span className="text-xs text-gray-500">video-cut mode</span>
      </div>
      <div className="flex gap-2">
        <button onClick={undo} className="text-xs px-3 py-1 bg-editor-border rounded hover:bg-gray-700">
          Undo (Ctrl+Z)
        </button>
        <button onClick={redo} className="text-xs px-3 py-1 bg-editor-border rounded hover:bg-gray-700">
          Redo
        </button>
        <button onClick={handleSave} className="text-xs px-3 py-1 bg-editor-border rounded hover:bg-gray-700">
          Aplicar cortes
        </button>
        <button
          onClick={handleCompose}
          disabled={composing}
          className="text-xs px-3 py-1 bg-emerald-900 text-emerald-300 rounded hover:bg-emerald-800 disabled:opacity-50"
        >
          {composing ? "Compondo..." : "Compor body.mp4"}
        </button>
      </div>
    </div>
  );
}
