import { useEffect, useState } from "react";
import { useEditorStore } from "../stores/editor";
import { postCorrection } from "../api";
import type { Cut } from "../types";

const TYPE_LABEL: Record<Cut["cut_type"], string> = {
  retake: "Retake",
  gap: "Silencio",
  filler: "Filler word",
  manual: "Corte manual",
};

const TYPE_COLOR: Record<Cut["cut_type"], string> = {
  retake: "text-cut-retake",
  gap: "text-cut-gap",
  filler: "text-cut-filler",
  manual: "text-cut-manual",
};

function formatTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const ms = Math.floor((t % 1) * 1000);
  return `${m}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

export default function Inspector() {
  const slug = useEditorStore((s) => s.slug);
  const cuts = useEditorStore((s) => s.cuts);
  const selectedCutId = useEditorStore((s) => s.selectedCutId);
  const approveCut = useEditorStore((s) => s.approveCut);
  const rejectCut = useEditorStore((s) => s.rejectCut);
  const removeCut = useEditorStore((s) => s.removeCut);
  const approveAll = useEditorStore((s) => s.approveAll);
  const approveAllByType = useEditorStore((s) => s.approveAllByType);
  const previewRegion = useEditorStore((s) => s.previewRegion);
  const pushToast = useEditorStore((s) => s.pushToast);

  const [note, setNote] = useState("");
  const [escapeText, setEscapeText] = useState("");

  const selectedCut = cuts.find((c) => c.id === selectedCutId) || null;

  // Reset note when selection changes
  useEffect(() => {
    setNote(selectedCut?.dayner_note || "");
  }, [selectedCutId]);

  if (!selectedCut) {
    return (
      <div className="flex flex-col h-full bg-editor-panel border-l border-editor-border">
        <div className="panel-header">Inspector</div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
          <div className="text-editor-textMuted text-[12px]">
            Nenhum corte selecionado
          </div>
          <div className="text-editor-textDim text-[10px]">
            Clica num corte na lista ou na timeline pra ver detalhes
          </div>
        </div>
        <div className="p-2 border-t border-editor-border space-y-1">
          <button
            onClick={() => {
              approveAll();
              pushToast("Todos os pendentes aprovados", "success");
            }}
            className="w-full ghost-btn justify-center"
          >
            Aprovar todos pendentes
          </button>
          <button
            onClick={() => {
              approveAllByType("gap");
              pushToast("Silencios aprovados", "success");
            }}
            className="w-full ghost-btn justify-center text-[10px]"
          >
            Aprovar so silencios
          </button>
        </div>
      </div>
    );
  }

  const effectiveIn = selectedCut.adjusted_in ?? selectedCut.time_in;
  const effectiveOut = selectedCut.adjusted_out ?? selectedCut.time_out;
  const spanDuration = (effectiveOut - effectiveIn).toFixed(2);
  const isManual = selectedCut.cut_type === "manual";

  const handleApprove = async () => {
    approveCut(selectedCut.id);
    pushToast("Corte aprovado", "success");
    await postCorrection(slug, {
      video_slug: slug,
      date: new Date().toISOString().slice(0, 10),
      cut_type: selectedCut.cut_type,
      time_in: selectedCut.time_in,
      time_out: selectedCut.time_out,
      claude_reason: selectedCut.reason,
      transcript_context: "",
      action: "approved",
      adjusted_in: null,
      adjusted_out: null,
      dayner_note: null,
    });
  };

  const handleReject = async () => {
    rejectCut(selectedCut.id, note || undefined);
    pushToast("Corte rejeitado", "info");
    await postCorrection(slug, {
      video_slug: slug,
      date: new Date().toISOString().slice(0, 10),
      cut_type: selectedCut.cut_type,
      time_in: selectedCut.time_in,
      time_out: selectedCut.time_out,
      claude_reason: selectedCut.reason,
      transcript_context: "",
      action: "rejected",
      adjusted_in: null,
      adjusted_out: null,
      dayner_note: note || null,
    });
    setNote("");
  };

  const handleRemove = async () => {
    removeCut(selectedCut.id);
    pushToast("Corte removido", "info");
    await postCorrection(slug, {
      video_slug: slug,
      date: new Date().toISOString().slice(0, 10),
      cut_type: selectedCut.cut_type,
      time_in: selectedCut.time_in,
      time_out: selectedCut.time_out,
      claude_reason: selectedCut.reason,
      transcript_context: "",
      action: "deleted",
      adjusted_in: null,
      adjusted_out: null,
      dayner_note: null,
    });
  };

  const handleEscape = async () => {
    if (!escapeText.trim()) return;
    await postCorrection(slug, {
      video_slug: slug,
      date: new Date().toISOString().slice(0, 10),
      cut_type: "escape_hatch",
      time_in: 0,
      time_out: 0,
      claude_reason: "",
      transcript_context: "",
      action: "manual",
      adjusted_in: null,
      adjusted_out: null,
      dayner_note: escapeText,
    });
    pushToast("Feedback enviado ao Claude", "success");
    setEscapeText("");
  };

  return (
    <div className="flex flex-col h-full bg-editor-panel border-l border-editor-border overflow-y-auto">
      <div className="panel-header">Inspector</div>

      {/* Cut header */}
      <div className="p-3 border-b border-editor-borderMuted space-y-2">
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-semibold uppercase tracking-wide ${TYPE_COLOR[selectedCut.cut_type]}`}>
            {TYPE_LABEL[selectedCut.cut_type]}
          </span>
          <span className="ml-auto text-[9px] text-editor-textDim uppercase tracking-wider">
            {selectedCut.status}
          </span>
        </div>

        {/* Time range */}
        <div className="bg-editor-bg rounded p-2 space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-editor-textMuted">Inicio</span>
            <span className="text-editor-text font-mono">{formatTime(effectiveIn)}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-editor-textMuted">Fim</span>
            <span className="text-editor-text font-mono">{formatTime(effectiveOut)}</span>
          </div>
          <div className="flex justify-between text-[10px] pt-1 border-t border-editor-borderMuted">
            <span className="text-editor-textMuted">Duracao</span>
            <span className="text-accent font-mono">{spanDuration}s</span>
          </div>
        </div>

        {/* Preview button */}
        <button
          onClick={() => previewRegion(selectedCut.id)}
          className="w-full ghost-btn justify-center"
        >
          ▶ Preview regiao (P)
        </button>
      </div>

      {/* Reason / confidence */}
      {!isManual && (
        <div className="p-3 border-b border-editor-borderMuted space-y-2">
          <div className="text-[10px] uppercase tracking-wide text-editor-textMuted">
            Razao do Claude
          </div>
          <div className="text-[11px] text-editor-text leading-relaxed">
            {selectedCut.reason || "—"}
          </div>
          {selectedCut.confidence < 1 && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-editor-textMuted uppercase tracking-wide">
                Confianca
              </span>
              <div className="flex-1 h-1 bg-editor-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${Math.round(selectedCut.confidence * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-editor-text font-mono">
                {Math.round(selectedCut.confidence * 100)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="p-3 border-b border-editor-borderMuted space-y-2">
        {!isManual && (
          <>
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                className="flex-1 h-9 rounded bg-cut-approved/20 text-cut-approved border border-cut-approved/40 hover:bg-cut-approved/30 transition-colors text-[11px] font-medium"
              >
                ✓ Aprovar (A)
              </button>
              <button
                onClick={handleReject}
                className="flex-1 h-9 rounded bg-cut-retake/20 text-cut-retake border border-cut-retake/40 hover:bg-cut-retake/30 transition-colors text-[11px] font-medium"
              >
                ✗ Rejeitar (R)
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-wide text-editor-textMuted">
                Nota (opcional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="por que? vira input pro proximo video"
                className="w-full h-16 px-2 py-1.5 bg-editor-bg border border-editor-borderMuted rounded text-[10px] text-editor-text placeholder:text-editor-textDim focus:border-accent resize-none"
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </>
        )}

        {isManual && (
          <button
            onClick={handleRemove}
            className="w-full h-9 rounded bg-cut-retake/20 text-cut-retake border border-cut-retake/40 hover:bg-cut-retake/30 transition-colors text-[11px] font-medium"
          >
            🗑 Remover corte (Delete)
          </button>
        )}
      </div>

      {/* Escape hatch */}
      <div className="p-3 mt-auto border-t border-editor-border space-y-1">
        <div className="text-[9px] uppercase tracking-wide text-editor-textMuted">
          Algo diferente?
        </div>
        <textarea
          value={escapeText}
          onChange={(e) => setEscapeText(e.target.value)}
          placeholder="e.g. 'refaz retakes entre 2-3min com janela de 60s'"
          className="w-full h-14 px-2 py-1.5 bg-editor-bg border border-dashed border-editor-border rounded text-[10px] text-editor-text placeholder:text-editor-textDim focus:border-accent resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) handleEscape();
            e.stopPropagation();
          }}
        />
        <button
          onClick={handleEscape}
          disabled={!escapeText.trim()}
          className="w-full ghost-btn justify-center text-[10px]"
        >
          Enviar (Ctrl+Enter)
        </button>
      </div>
    </div>
  );
}
