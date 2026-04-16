import { useState } from "react";
import { useEditorStore } from "../stores/editor";
import { postCorrection, saveCuts } from "../api";

export default function ActionPanel() {
  const slug = useEditorStore((s) => s.slug);
  const cuts = useEditorStore((s) => s.cuts);
  const selectedCutId = useEditorStore((s) => s.selectedCutId);
  const approveCut = useEditorStore((s) => s.approveCut);
  const rejectCut = useEditorStore((s) => s.rejectCut);
  const approveAll = useEditorStore((s) => s.approveAll);
  const [note, setNote] = useState("");
  const [escapeText, setEscapeText] = useState("");

  const selectedCut = cuts.find((c) => c.id === selectedCutId);

  const handleApprove = async () => {
    if (!selectedCut) return;
    approveCut(selectedCut.id);
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
    if (!selectedCut) return;
    rejectCut(selectedCut.id, note || undefined);
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

  const handleApproveAll = async () => {
    approveAll();
    await saveCuts(slug, useEditorStore.getState().cuts);
  };

  const handleEscape = () => {
    if (!escapeText.trim()) return;
    fetch(`/api/corrections/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_slug: slug,
        date: new Date().toISOString().slice(0, 10),
        cut_type: "escape_hatch",
        time_in: 0,
        time_out: 0,
        claude_reason: "",
        transcript_context: "",
        action: "escape_hatch",
        dayner_note: escapeText,
      }),
    });
    setEscapeText("");
  };

  return (
    <div className="p-2.5 border-t border-editor-border space-y-2">
      <div className="flex gap-1.5">
        <button
          onClick={handleApprove}
          disabled={!selectedCut}
          className="flex-1 py-1.5 bg-emerald-900 text-emerald-300 rounded text-xs hover:bg-emerald-800 disabled:opacity-30"
        >
          ✓ Aprovar (A)
        </button>
        <button
          onClick={handleReject}
          disabled={!selectedCut}
          className="flex-1 py-1.5 bg-red-900 text-red-300 rounded text-xs hover:bg-red-800 disabled:opacity-30"
        >
          ✗ Rejeitar (R)
        </button>
      </div>

      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="nota opcional: por que rejeitou?"
        className="w-full px-2 py-1.5 bg-editor-border border border-editor-border rounded text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-gray-500"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleReject();
          e.stopPropagation();
        }}
      />

      <div className="flex gap-1.5">
        <button
          onClick={handleApproveAll}
          className="flex-1 py-1 bg-editor-border text-gray-400 rounded text-[9px] hover:bg-gray-700"
        >
          Aprovar todos
        </button>
      </div>

      <input
        type="text"
        value={escapeText}
        onChange={(e) => setEscapeText(e.target.value)}
        placeholder="algo diferente? (vira task pro terminal)"
        className="w-full px-2 py-1.5 bg-black border border-dashed border-gray-700 rounded text-[9px] text-gray-500 placeholder:text-gray-700 focus:outline-none focus:border-gray-500"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleEscape();
          e.stopPropagation();
        }}
      />
    </div>
  );
}
