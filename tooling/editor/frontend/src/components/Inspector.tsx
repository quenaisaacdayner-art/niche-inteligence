import { useEffect, useState } from "react";
import { useEditorStore } from "../stores/editor";
import { postCorrection, saveOverlays } from "../api";
import type { Cut, Overlay, OverlayPosition } from "../types";

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

const POSITION_OPTIONS: OverlayPosition[] = ["pip", "fullscreen", "custom"];

function formatTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const ms = Math.floor((t % 1) * 1000);
  return `${m}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

function OverlayInspector({ overlay }: { overlay: Overlay }) {
  const slug = useEditorStore((s) => s.slug);
  const overlays = useEditorStore((s) => s.overlays);
  const updateOverlay = useEditorStore((s) => s.updateOverlay);
  const moveOverlay = useEditorStore((s) => s.moveOverlay);
  const removeOverlay = useEditorStore((s) => s.removeOverlay);
  const previewSelect = useEditorStore((s) => s.setCurrentTime);
  const setIsPlaying = useEditorStore((s) => s.setIsPlaying);
  const pushToast = useEditorStore((s) => s.pushToast);

  const dur = overlay.time_out - overlay.time_in;

  const persist = async (next: Overlay[]) => {
    if (!slug) return;
    try {
      await saveOverlays(slug, next);
    } catch {
      pushToast("Erro ao salvar overlays", "error");
    }
  };

  const patchAndSave = (patch: Partial<Overlay>) => {
    updateOverlay(overlay.id, patch);
    const next = overlays.map((o) => (o.id === overlay.id ? { ...o, ...patch } : o));
    persist(next);
  };

  const moveAndSave = (track: number, pos: number) => {
    const clampedTrack = Math.max(2, track);
    const clampedPos = Math.max(0, pos);
    moveOverlay(overlay.id, clampedTrack, clampedPos);
    const next = overlays.map((o) =>
      o.id === overlay.id ? { ...o, track: clampedTrack, timeline_pos: clampedPos } : o
    );
    persist(next);
  };

  return (
    <div className="flex flex-col h-full bg-editor-panel border-l border-editor-border overflow-y-auto">
      <div className="panel-header">Inspector · Overlay</div>

      {/* Header */}
      <div className="p-3 border-b border-editor-divider space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-cut-manual">Clip</span>
          <span className="ml-auto text-[9px] text-editor-dim uppercase tracking-wider">track {overlay.track}</span>
        </div>
        <div className="text-[11px] text-editor-text truncate" title={overlay.file}>
          {overlay.file}
        </div>

        {/* Timings */}
        <div className="bg-editor-bg rounded p-2 space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-editor-muted">Posição na timeline</span>
            <span className="text-editor-text font-mono">{formatTime(overlay.timeline_pos)}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-editor-muted">Trim in / out</span>
            <span className="text-editor-text font-mono">
              {formatTime(overlay.time_in)} → {formatTime(overlay.time_out)}
            </span>
          </div>
          <div className="flex justify-between text-[10px] pt-1 border-t border-editor-divider">
            <span className="text-editor-muted">Duração</span>
            <span className="text-accent font-mono">{dur.toFixed(2)}s</span>
          </div>
        </div>

        <button
          onClick={() => {
            previewSelect(overlay.timeline_pos);
            setIsPlaying(true);
          }}
          className="w-full ghost-btn justify-center"
        >
          ▶ Ir pra essa posição
        </button>
      </div>

      {/* Position */}
      <div className="p-3 border-b border-editor-divider space-y-2">
        <div className="text-[10px] uppercase tracking-wide text-editor-muted">Posição visual</div>
        <div className="flex gap-1">
          {POSITION_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => patchAndSave({ position: p })}
              className={`flex-1 h-7 rounded text-[10px] uppercase tracking-wide transition-colors ${
                overlay.position === p
                  ? "bg-accent text-white"
                  : "bg-editor-bg text-editor-muted hover:bg-editor-elevated hover:text-editor-text border border-editor-divider"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Track + timeline pos controls */}
      <div className="p-3 border-b border-editor-divider space-y-2">
        <div className="text-[10px] uppercase tracking-wide text-editor-muted">Track / posição</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[9px] text-editor-dim mb-0.5">Track</label>
            <input
              type="number"
              min={2}
              max={10}
              value={overlay.track}
              onChange={(e) => moveAndSave(Number(e.target.value), overlay.timeline_pos)}
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full h-8 px-2 bg-editor-bg border border-editor-divider rounded text-[11px] text-editor-text focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-[9px] text-editor-dim mb-0.5">Posição (s)</label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={overlay.timeline_pos}
              onChange={(e) => moveAndSave(overlay.track, Number(e.target.value))}
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full h-8 px-2 bg-editor-bg border border-editor-divider rounded text-[11px] text-editor-text focus:border-accent"
            />
          </div>
        </div>
      </div>

      {/* Audio */}
      <div className="p-3 border-b border-editor-divider space-y-2">
        <label className="flex items-center gap-2 text-[11px] text-editor-text cursor-pointer">
          <input
            type="checkbox"
            checked={overlay.mute}
            onChange={(e) => patchAndSave({ mute: e.target.checked })}
            className="accent-accent"
          />
          Mute áudio
        </label>
      </div>

      {/* Remove */}
      <div className="p-3 mt-auto border-t border-editor-border">
        <button
          onClick={() => {
            removeOverlay(overlay.id);
            const next = overlays.filter((o) => o.id !== overlay.id);
            persist(next);
            pushToast("Overlay removido (use Ctrl+Z pra desfazer)", "info");
          }}
          className="w-full h-9 rounded bg-cut-retake/20 text-cut-retake border border-cut-retake/40 hover:bg-cut-retake/30 transition-colors text-[11px] font-medium"
        >
          🗑 Remover overlay
        </button>
      </div>
    </div>
  );
}

function CutInspector({ cut }: { cut: Cut }) {
  const slug = useEditorStore((s) => s.slug);
  const approveCut = useEditorStore((s) => s.approveCut);
  const rejectCut = useEditorStore((s) => s.rejectCut);
  const removeCut = useEditorStore((s) => s.removeCut);
  const previewRegion = useEditorStore((s) => s.previewRegion);
  const pushToast = useEditorStore((s) => s.pushToast);

  const [note, setNote] = useState("");
  const [escapeText, setEscapeText] = useState("");

  useEffect(() => {
    setNote(cut.dayner_note || "");
  }, [cut.id]);

  const effectiveIn = cut.adjusted_in ?? cut.time_in;
  const effectiveOut = cut.adjusted_out ?? cut.time_out;
  const spanDuration = (effectiveOut - effectiveIn).toFixed(2);
  const isManual = cut.cut_type === "manual";

  const handleApprove = async () => {
    approveCut(cut.id);
    pushToast("Corte aprovado", "success");
    await postCorrection(slug, {
      video_slug: slug,
      date: new Date().toISOString().slice(0, 10),
      cut_type: cut.cut_type,
      time_in: cut.time_in,
      time_out: cut.time_out,
      claude_reason: cut.reason,
      transcript_context: "",
      action: "approved",
      adjusted_in: null,
      adjusted_out: null,
      dayner_note: null,
    });
  };

  const handleReject = async () => {
    rejectCut(cut.id, note || undefined);
    pushToast("Corte rejeitado", "info");
    await postCorrection(slug, {
      video_slug: slug,
      date: new Date().toISOString().slice(0, 10),
      cut_type: cut.cut_type,
      time_in: cut.time_in,
      time_out: cut.time_out,
      claude_reason: cut.reason,
      transcript_context: "",
      action: "rejected",
      adjusted_in: null,
      adjusted_out: null,
      dayner_note: note || null,
    });
    setNote("");
  };

  const handleRemove = async () => {
    removeCut(cut.id);
    pushToast("Corte removido", "info");
    await postCorrection(slug, {
      video_slug: slug,
      date: new Date().toISOString().slice(0, 10),
      cut_type: cut.cut_type,
      time_in: cut.time_in,
      time_out: cut.time_out,
      claude_reason: cut.reason,
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
      <div className="panel-header">Inspector · Corte</div>

      <div className="p-3 border-b border-editor-divider space-y-2">
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-semibold uppercase tracking-wide ${TYPE_COLOR[cut.cut_type]}`}>
            {TYPE_LABEL[cut.cut_type]}
          </span>
          <span className="ml-auto text-[9px] text-editor-dim uppercase tracking-wider">{cut.status}</span>
        </div>

        <div className="bg-editor-bg rounded p-2 space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-editor-muted">Inicio</span>
            <span className="text-editor-text font-mono">{formatTime(effectiveIn)}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-editor-muted">Fim</span>
            <span className="text-editor-text font-mono">{formatTime(effectiveOut)}</span>
          </div>
          <div className="flex justify-between text-[10px] pt-1 border-t border-editor-divider">
            <span className="text-editor-muted">Duracao</span>
            <span className="text-accent font-mono">{spanDuration}s</span>
          </div>
        </div>

        <button onClick={() => previewRegion(cut.id)} className="w-full ghost-btn justify-center">
          ▶ Preview regiao (P)
        </button>
      </div>

      {!isManual && (
        <div className="p-3 border-b border-editor-divider space-y-2">
          <div className="text-[10px] uppercase tracking-wide text-editor-muted">Razao do Claude</div>
          <div className="text-[11px] text-editor-text leading-relaxed">{cut.reason || "—"}</div>
          {cut.confidence < 1 && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-editor-muted uppercase tracking-wide">Confianca</span>
              <div className="flex-1 h-1 bg-editor-elevated rounded-full overflow-hidden">
                <div className="h-full bg-accent" style={{ width: `${Math.round(cut.confidence * 100)}%` }} />
              </div>
              <span className="text-[10px] text-editor-text font-mono">
                {Math.round(cut.confidence * 100)}%
              </span>
            </div>
          )}
        </div>
      )}

      <div className="p-3 border-b border-editor-divider space-y-2">
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
              <label className="text-[9px] uppercase tracking-wide text-editor-muted">Nota (opcional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="por que? vira input pro proximo video"
                className="w-full h-16 px-2 py-1.5 bg-editor-bg border border-editor-divider rounded text-[10px] text-editor-text placeholder:text-editor-dim focus:border-accent resize-none"
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

      <div className="p-3 mt-auto border-t border-editor-border space-y-1">
        <div className="text-[9px] uppercase tracking-wide text-editor-muted">Algo diferente?</div>
        <textarea
          value={escapeText}
          onChange={(e) => setEscapeText(e.target.value)}
          placeholder="e.g. 'refaz retakes entre 2-3min com janela de 60s'"
          className="w-full h-14 px-2 py-1.5 bg-editor-bg border border-dashed border-editor-border rounded text-[10px] text-editor-text placeholder:text-editor-dim focus:border-accent resize-none"
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

export default function Inspector() {
  const cuts = useEditorStore((s) => s.cuts);
  const overlays = useEditorStore((s) => s.overlays);
  const selectedCutId = useEditorStore((s) => s.selectedCutId);
  const selectedOverlayId = useEditorStore((s) => s.selectedOverlayId);
  const approveAll = useEditorStore((s) => s.approveAll);
  const approveAllByType = useEditorStore((s) => s.approveAllByType);
  const pushToast = useEditorStore((s) => s.pushToast);

  const selectedCut = cuts.find((c) => c.id === selectedCutId) || null;
  const selectedOverlay = overlays.find((o) => o.id === selectedOverlayId) || null;

  if (selectedOverlay) return <OverlayInspector overlay={selectedOverlay} />;
  if (selectedCut) return <CutInspector cut={selectedCut} />;

  return (
    <div className="flex flex-col h-full bg-editor-panel border-l border-editor-border">
      <div className="panel-header">Inspector</div>
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
        <div className="text-editor-muted text-[12px]">Nenhum corte ou clip selecionado</div>
        <div className="text-editor-dim text-[10px]">
          Seleciona algo na timeline ou no painel esquerdo
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
