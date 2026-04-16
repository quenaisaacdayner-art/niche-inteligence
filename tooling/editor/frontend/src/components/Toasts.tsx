import { useEditorStore } from "../stores/editor";

const KIND_STYLE: Record<string, string> = {
  info: "bg-editor-elevated border-editor-border text-editor-text",
  success: "bg-cut-approved/20 border-cut-approved/40 text-cut-approved",
  error: "bg-cut-retake/20 border-cut-retake/40 text-cut-retake",
};

export default function Toasts() {
  const toasts = useEditorStore((s) => s.toasts);
  const dismissToast = useEditorStore((s) => s.dismissToast);

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2 rounded border text-[11px] shadow-elevated pointer-events-auto cursor-pointer ${KIND_STYLE[t.kind]}`}
          style={{ animation: "toast-in 150ms ease-out" }}
          onClick={() => dismissToast(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
