import { useEditorStore } from "../stores/editor";

const SHORTCUTS: { group: string; items: { keys: string; label: string }[] }[] = [
  {
    group: "Playback",
    items: [
      { keys: "Space", label: "Play / Pause" },
      { keys: "J", label: "Voltar 5s" },
      { keys: "K", label: "Pausar" },
      { keys: "L", label: "Avancar 5s" },
      { keys: "← →", label: "Frame step" },
      { keys: "1 / 2 / 3 / 4", label: "Velocidade 0.5x / 1x / 1.5x / 2x" },
      { keys: "P", label: "Preview regiao do corte selecionado" },
    ],
  },
  {
    group: "Cortes",
    items: [
      { keys: "↑ / ↓", label: "Navegar entre cortes" },
      { keys: "A", label: "Aprovar corte selecionado" },
      { keys: "R", label: "Rejeitar corte selecionado" },
      { keys: "S", label: "Split no playhead (criar corte manual)" },
      { keys: "Delete", label: "Remover corte manual ou overlay selecionado" },
    ],
  },
  {
    group: "Overlays / Clips",
    items: [
      { keys: "Drag (Bin → Track)", label: "Posicionar clip numa track" },
      { keys: "Drag (horizontal)", label: "Mover clip no tempo" },
      { keys: "Drag (vertical)", label: "Trocar clip de track" },
      { keys: "Drag nas bordas", label: "Trim in/out do clip" },
    ],
  },
  {
    group: "Historico",
    items: [
      { keys: "Ctrl+Z", label: "Desfazer (cortes + overlays)" },
      { keys: "Ctrl+Shift+Z", label: "Refazer" },
      { keys: "Ctrl+S", label: "Salvar cortes + overlays" },
    ],
  },
  {
    group: "Interface",
    items: [
      { keys: "?", label: "Mostrar/esconder este modal" },
      { keys: "Esc", label: "Fechar modal / cancelar" },
      { keys: "Ctrl+scroll", label: "Zoom na timeline" },
    ],
  },
];

export default function ShortcutsModal() {
  const show = useEditorStore((s) => s.showShortcuts);
  const toggle = useEditorStore((s) => s.toggleShortcuts);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={toggle}
    >
      <div
        className="bg-editor-panel border border-editor-border rounded-lg shadow-elevated w-full max-w-xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 h-12 border-b border-editor-border">
          <div className="flex items-center gap-2">
            <span className="text-accent">⌨</span>
            <span className="text-editor-text text-[13px] font-semibold">Atalhos de teclado</span>
          </div>
          <button
            onClick={toggle}
            className="icon-btn"
            title="Fechar (Esc)"
          >
            ✕
          </button>
        </div>
        <div className="p-5 space-y-5">
          {SHORTCUTS.map((group) => (
            <div key={group.group}>
              <div className="text-[10px] uppercase tracking-wider text-editor-muted mb-2">
                {group.group}
              </div>
              <div className="space-y-1">
                {group.items.map((s) => (
                  <div key={s.keys} className="flex items-center justify-between py-1">
                    <span className="text-editor-text text-[12px]">{s.label}</span>
                    <kbd className="px-2 py-0.5 rounded bg-editor-elevated border border-editor-border text-editor-text text-[10px] font-mono">
                      {s.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
