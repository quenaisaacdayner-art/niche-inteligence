import { useEditorStore } from "../stores/editor";

const STATUS_STYLES: Record<string, { border: string; icon: string; color: string }> = {
  approved: { border: "border-l-cut-approved", icon: "✓", color: "text-cut-approved" },
  rejected: { border: "border-l-cut-rejected", icon: "✗", color: "text-red-300" },
  adjusted: { border: "border-l-yellow-400", icon: "~", color: "text-yellow-400" },
  pending: { border: "border-l-gray-600", icon: "◻", color: "text-gray-400" },
};

const TYPE_LABELS: Record<string, string> = {
  retake: "retake",
  gap: "gap",
  filler: "filler",
};

export default function CutList() {
  const cuts = useEditorStore((s) => s.cuts);
  const selectedCutId = useEditorStore((s) => s.selectedCutId);
  const selectCut = useEditorStore((s) => s.selectCut);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const setIsPlaying = useEditorStore((s) => s.setIsPlaying);

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    const ds = Math.floor((t % 1) * 10);
    return `${m}:${String(s).padStart(2, "0")}.${ds}`;
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-3 py-2 border-b border-editor-border text-xs font-bold text-gray-400">
        Cortes sugeridos ({cuts.length})
      </div>
      <div className="p-1.5 space-y-1">
        {cuts.map((cut, i) => {
          const st = STATUS_STYLES[cut.status];
          const isSelected = cut.id === selectedCutId;
          const effectiveIn = cut.adjusted_in ?? cut.time_in;
          const effectiveOut = cut.adjusted_out ?? cut.time_out;
          return (
            <div
              key={cut.id}
              className={`px-2 py-1.5 rounded text-[10px] cursor-pointer border-l-2 ${st.border} ${isSelected ? "bg-yellow-400/10 border-l-yellow-400" : "bg-editor-border hover:bg-gray-800"}`}
              onClick={() => {
                selectCut(cut.id);
                setCurrentTime(effectiveIn);
                setIsPlaying(false);
              }}
            >
              <div className={st.color}>
                {st.icon} #{i + 1} {TYPE_LABELS[cut.cut_type]} {formatTime(effectiveIn)}–{formatTime(effectiveOut)}
              </div>
              <div className="text-gray-500 truncate">{cut.reason}</div>
              {cut.dayner_note && (
                <div className="text-gray-500 italic truncate">"{cut.dayner_note}"</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
