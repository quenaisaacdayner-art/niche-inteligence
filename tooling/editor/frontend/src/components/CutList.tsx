import { useEffect, useRef } from "react";
import { useEditorStore, filterCuts } from "../stores/editor";
import type { Cut, FilterStatus } from "../types";

const TYPE_COLOR: Record<Cut["cut_type"], string> = {
  retake: "bg-cut-retake",
  gap: "bg-cut-gap",
  filler: "bg-cut-filler",
  manual: "bg-cut-manual",
};

const TYPE_LABEL: Record<Cut["cut_type"], string> = {
  retake: "Retake",
  gap: "Silencio",
  filler: "Filler",
  manual: "Manual",
};

const STATUS_BADGE: Record<Cut["status"], { icon: string; color: string; label: string }> = {
  pending: { icon: "◦", color: "text-editor-textMuted", label: "pendente" },
  approved: { icon: "✓", color: "text-cut-approved", label: "aprovado" },
  rejected: { icon: "✗", color: "text-editor-textDim", label: "rejeitado" },
  adjusted: { icon: "~", color: "text-cut-adjusted", label: "ajustado" },
};

function formatTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const ds = Math.floor((t % 1) * 10);
  return `${m}:${String(s).padStart(2, "0")}.${ds}`;
}

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendentes" },
  { key: "rejected", label: "Rejeitados" },
];

export default function CutList() {
  const cuts = useEditorStore((s) => s.cuts);
  const selectedCutId = useEditorStore((s) => s.selectedCutId);
  const filterStatus = useEditorStore((s) => s.filterStatus);
  const selectCut = useEditorStore((s) => s.selectCut);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const setIsPlaying = useEditorStore((s) => s.setIsPlaying);
  const setFilterStatus = useEditorStore((s) => s.setFilterStatus);

  const visibleCuts = filterCuts(cuts, filterStatus);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll selected cut into view
  useEffect(() => {
    if (!selectedCutId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-cut-id="${selectedCutId}"]`);
    if (el && "scrollIntoView" in el) {
      (el as HTMLElement).scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedCutId]);

  const counts = {
    all: cuts.length,
    pending: cuts.filter((c) => c.status === "pending").length,
    rejected: cuts.filter((c) => c.status === "rejected").length,
  };

  return (
    <div className="flex flex-col h-full bg-editor-panel border-r border-editor-border">
      {/* Panel header */}
      <div className="panel-header">
        <span className="flex-1">Cortes</span>
        <span className="text-editor-text font-mono normal-case tracking-normal">
          {visibleCuts.length}
        </span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-2 border-b border-editor-borderMuted">
        {FILTERS.map((f) => {
          const isActive = filterStatus === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`flex-1 px-2 h-7 rounded text-[11px] transition-colors ${
                isActive
                  ? "bg-accent text-white"
                  : "text-editor-textMuted hover:bg-editor-elevated hover:text-editor-text"
              }`}
            >
              {f.label} <span className="opacity-60">{counts[f.key]}</span>
            </button>
          );
        })}
      </div>

      {/* Cut list */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {visibleCuts.length === 0 && (
          <div className="text-center text-editor-textMuted text-[11px] p-6">
            {filterStatus === "all"
              ? "Nenhum corte ainda. Tecla S cria um corte manual no playhead."
              : `Nenhum corte ${filterStatus === "pending" ? "pendente" : "rejeitado"}.`}
          </div>
        )}

        {visibleCuts.map((cut, i) => {
          const isSelected = cut.id === selectedCutId;
          const effectiveIn = cut.adjusted_in ?? cut.time_in;
          const effectiveOut = cut.adjusted_out ?? cut.time_out;
          const durationMs = (effectiveOut - effectiveIn).toFixed(2);
          const status = STATUS_BADGE[cut.status];

          return (
            <div
              key={cut.id}
              data-cut-id={cut.id}
              className={`group relative rounded px-2.5 py-2 cursor-pointer transition-colors border ${
                isSelected
                  ? "bg-accent-muted border-accent"
                  : "bg-editor-bg border-editor-borderMuted hover:border-editor-border hover:bg-editor-elevated"
              }`}
              onClick={() => {
                selectCut(cut.id);
                setCurrentTime(effectiveIn);
                setIsPlaying(false);
              }}
            >
              {/* Top row: type badge + time range + duration */}
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full ${TYPE_COLOR[cut.cut_type]}`} />
                <span className="text-editor-text text-[11px] font-medium">
                  {TYPE_LABEL[cut.cut_type]}
                </span>
                <span className="text-editor-textMuted text-[10px] font-mono ml-auto">
                  {formatTime(effectiveIn)}–{formatTime(effectiveOut)}
                </span>
                <span className="text-editor-textDim text-[10px] font-mono">
                  {durationMs}s
                </span>
              </div>

              {/* Bottom row: reason + status */}
              <div className="flex items-start gap-2">
                <span className="text-editor-textMuted text-[10px] flex-1 line-clamp-2">
                  {cut.reason || "—"}
                </span>
                <span className={`text-[11px] ${status.color}`} title={status.label}>
                  {status.icon}
                </span>
              </div>

              {/* Note (if any) */}
              {cut.dayner_note && (
                <div className="mt-1 text-[10px] italic text-editor-textDim border-l-2 border-editor-border pl-2 line-clamp-1">
                  "{cut.dayner_note}"
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
