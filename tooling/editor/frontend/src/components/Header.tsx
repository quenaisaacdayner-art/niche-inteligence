import { useState, useEffect } from "react";
import { useEditorStore } from "../stores/editor";
import { saveCuts, startCompose, checkCompose } from "../api";

export default function Header() {
  const slug = useEditorStore((s) => s.slug);
  const cuts = useEditorStore((s) => s.cuts);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const undoStack = useEditorStore((s) => s.undoStack);
  const redoStack = useEditorStore((s) => s.redoStack);
  const toggleShortcuts = useEditorStore((s) => s.toggleShortcuts);
  const pushToast = useEditorStore((s) => s.pushToast);

  const [composing, setComposing] = useState(false);
  const [saving, setSaving] = useState(false);

  const approvedCount = cuts.filter(
    (c) => c.status === "approved" || c.status === "adjusted"
  ).length;
  const rejectedCount = cuts.filter((c) => c.status === "rejected").length;
  const pendingCount = cuts.filter((c) => c.status === "pending").length;

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveCuts(slug, cuts);
      pushToast("Cortes salvos", "success");
    } catch {
      pushToast("Erro ao salvar cortes", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCompose = async () => {
    setComposing(true);
    try {
      await saveCuts(slug, cuts);
      const jobId = await startCompose(slug);
      pushToast("Compondo body.mp4...", "info");
      const poll = setInterval(async () => {
        const status = await checkCompose(slug, jobId);
        if (status === "done") {
          clearInterval(poll);
          setComposing(false);
          pushToast("body.mp4 pronto!", "success");
        } else if (status === "error") {
          clearInterval(poll);
          setComposing(false);
          pushToast("Erro no compose — ver terminal", "error");
        }
      }, 1000);
    } catch {
      setComposing(false);
      pushToast("Erro ao iniciar compose", "error");
    }
  };

  // Ctrl+S shortcut for save
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && !e.shiftKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          handleSave();
        }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [cuts, slug]);

  return (
    <header className="flex items-center h-12 px-4 bg-editor-panel border-b border-editor-border">
      {/* Left: slug + mode */}
      <div className="flex items-center gap-3">
        <span className="text-accent text-[13px] font-semibold tracking-wide">
          ✂ Editor
        </span>
        <span className="text-editor-textDim">/</span>
        <span className="text-editor-text text-[12px] font-medium">{slug || "..."}</span>
        <span className="px-2 py-0.5 rounded bg-editor-elevated text-editor-textMuted text-[10px] uppercase tracking-wider">
          video-cut
        </span>
      </div>

      {/* Center: status counters */}
      <div className="flex items-center gap-4 mx-auto text-[11px]">
        <StatusCounter icon="✓" value={approvedCount} label="aprovados" color="text-cut-approved" />
        <StatusCounter icon="✗" value={rejectedCount} label="rejeitados" color="text-editor-textDim" />
        <StatusCounter icon="◦" value={pendingCount} label="pendentes" color="text-cut-gap" />
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={undoStack.length === 0}
          className="icon-btn"
          title="Undo (Ctrl+Z)"
        >
          ↩
        </button>
        <button
          onClick={redo}
          disabled={redoStack.length === 0}
          className="icon-btn"
          title="Redo (Ctrl+Shift+Z)"
        >
          ↪
        </button>
        <button
          onClick={toggleShortcuts}
          className="icon-btn"
          title="Atalhos (?)"
        >
          ?
        </button>

        <div className="w-px h-5 bg-editor-border mx-2" />

        <button
          onClick={handleSave}
          disabled={saving}
          className="ghost-btn"
          title="Salvar cortes (Ctrl+S)"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
        <button
          onClick={handleCompose}
          disabled={composing}
          className="accent-btn"
          title="Exportar body.mp4 com cortes aplicados"
        >
          {composing ? "Compondo..." : "Exportar"}
        </button>
      </div>
    </header>
  );
}

function StatusCounter({
  icon,
  value,
  label,
  color,
}: {
  icon: string;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <span className={`flex items-center gap-1.5 ${color}`}>
      <span className="text-[13px]">{icon}</span>
      <span className="font-mono text-editor-text">{value}</span>
      <span className="text-editor-textMuted">{label}</span>
    </span>
  );
}
