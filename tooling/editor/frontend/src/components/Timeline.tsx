import { useRef, useCallback, useEffect, useMemo } from "react";
import { useEditorStore } from "../stores/editor";
import type { Cut } from "../types";
import Waveform from "./Waveform";

const CUT_COLORS: Record<Cut["cut_type"], { fill: string; border: string; label: string }> = {
  retake: { fill: "bg-cut-retake/30", border: "border-cut-retake", label: "R" },
  gap: { fill: "bg-cut-gap/30", border: "border-cut-gap", label: "G" },
  filler: { fill: "bg-cut-filler/30", border: "border-cut-filler", label: "F" },
  manual: { fill: "bg-cut-manual/30", border: "border-cut-manual", label: "M" },
};

const STATUS_OPACITY: Record<Cut["status"], string> = {
  approved: "opacity-100",
  adjusted: "opacity-100",
  rejected: "opacity-25",
  pending: "opacity-70",
};

function formatTime(t: number): string {
  if (!isFinite(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Timeline() {
  const cuts = useEditorStore((s) => s.cuts);
  const currentTime = useEditorStore((s) => s.currentTime);
  const duration = useEditorStore((s) => s.duration);
  const zoom = useEditorStore((s) => s.zoom);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const selectedCutId = useEditorStore((s) => s.selectedCutId);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const setIsPlaying = useEditorStore((s) => s.setIsPlaying);
  const setZoom = useEditorStore((s) => s.setZoom);
  const selectCut = useEditorStore((s) => s.selectCut);
  const adjustCut = useEditorStore((s) => s.adjustCut);
  const splitAtPlayhead = useEditorStore((s) => s.splitAtPlayhead);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const pushToast = useEditorStore((s) => s.pushToast);

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    cutId: string;
    edge: "left" | "right";
    startX: number;
    origIn: number;
    origOut: number;
  } | null>(null);

  const totalWidth = Math.max(duration * zoom, 200);
  const timeToX = (t: number) => t * zoom;

  // Time ruler tick step
  const step = zoom > 80 ? 1 : zoom > 40 ? 5 : zoom > 20 ? 10 : 30;
  const marks = useMemo(() => {
    const arr: number[] = [];
    if (duration > 0) {
      for (let t = 0; t <= duration; t += step) arr.push(t);
    }
    return arr;
  }, [duration, step]);

  // Auto-scroll: keep playhead in view during playback
  useEffect(() => {
    if (!isPlaying || !scrollRef.current) return;
    const container = scrollRef.current;
    const playheadX = currentTime * zoom;
    const viewLeft = container.scrollLeft;
    const viewRight = viewLeft + container.clientWidth;
    const margin = 80;
    if (playheadX < viewLeft + margin) {
      container.scrollLeft = Math.max(0, playheadX - margin);
    } else if (playheadX > viewRight - margin) {
      container.scrollLeft = playheadX - container.clientWidth + margin;
    }
  }, [currentTime, isPlaying, zoom]);

  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const t = Math.max(0, Math.min(duration, x / zoom));
      setCurrentTime(t);
      setIsPlaying(false);
    },
    [duration, zoom, setCurrentTime, setIsPlaying]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 10 : -10;
        setZoom(zoom + delta);
      }
    },
    [zoom, setZoom]
  );

  const startDrag = useCallback(
    (e: React.MouseEvent, cut: Cut, edge: "left" | "right") => {
      e.stopPropagation();
      e.preventDefault();
      const inT = cut.adjusted_in ?? cut.time_in;
      const outT = cut.adjusted_out ?? cut.time_out;
      dragRef.current = { cutId: cut.id, edge, startX: e.clientX, origIn: inT, origOut: outT };

      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = ev.clientX - dragRef.current.startX;
        const dt = dx / zoom;
        let newIn = dragRef.current.origIn;
        let newOut = dragRef.current.origOut;
        if (dragRef.current.edge === "left") {
          newIn = Math.max(0, Math.min(dragRef.current.origOut - 0.1, dragRef.current.origIn + dt));
        } else {
          newOut = Math.max(
            dragRef.current.origIn + 0.1,
            Math.min(duration, dragRef.current.origOut + dt)
          );
        }
        adjustCut(dragRef.current.cutId, newIn, newOut);
      };

      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [zoom, duration, adjustCut]
  );

  const handleStripClick = useCallback(
    (e: React.MouseEvent, cut: Cut) => {
      e.stopPropagation();
      selectCut(cut.id);
      const inT = cut.adjusted_in ?? cut.time_in;
      setCurrentTime(inT);
      setIsPlaying(false);
    },
    [selectCut, setCurrentTime, setIsPlaying]
  );

  const handleSplit = () => {
    const newId = splitAtPlayhead();
    if (newId) {
      pushToast("Corte manual criado", "success");
    } else {
      pushToast("Posicao invalida pra corte (dentro de outro corte ou fora do video)", "error");
    }
  };

  const playheadX = timeToX(currentTime);

  return (
    <div className="flex flex-col bg-editor-panel border-t border-editor-border select-none h-64">
      {/* Toolbar */}
      <div className="flex items-center gap-1 h-9 px-2 border-b border-editor-border bg-editor-panel">
        <button
          onClick={handleSplit}
          className="icon-btn"
          title="Split no playhead (S)"
        >
          <span className="text-[14px]">✂</span>
        </button>
        <div className="w-px h-5 bg-editor-border mx-1" />
        <button onClick={undo} className="icon-btn" title="Undo (Ctrl+Z)">
          ↩
        </button>
        <button onClick={redo} className="icon-btn" title="Redo (Ctrl+Shift+Z)">
          ↪
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-2 text-editor-muted text-[10px]">
          <span>Zoom</span>
          <input
            type="range"
            min={10}
            max={200}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-32 accent-accent"
          />
          <span className="font-mono w-10 text-right text-editor-text">{zoom}px/s</span>
        </div>
      </div>

      {/* Timeline body */}
      <div className="flex flex-1 min-h-0" onWheel={handleWheel}>
        {/* Track labels column */}
        <div className="flex-shrink-0 w-20 flex flex-col border-r border-editor-border text-[10px] text-editor-muted bg-editor-panel">
          <div className="h-6 border-b border-editor-divider" />
          <div className="h-10 flex items-center justify-end pr-2 text-track-face border-b border-editor-divider">
            Face
          </div>
          <div className="h-10 flex items-center justify-end pr-2 text-track-screen border-b border-editor-divider">
            Screen
          </div>
          <div className="h-12 flex items-center justify-end pr-2 text-track-audio">
            Audio
          </div>
        </div>

        {/* Scrollable tracks */}
        <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden relative">
          <div style={{ width: totalWidth, position: "relative" }}>
            {/* Time ruler */}
            <div
              className="h-6 border-b border-editor-divider relative overflow-hidden bg-editor-panel cursor-pointer"
              onClick={handleTrackClick}
            >
              {marks.map((t) => (
                <div
                  key={t}
                  className="absolute top-0 flex flex-col items-start"
                  style={{ left: timeToX(t) }}
                >
                  <div className="w-px h-2 bg-editor-textDim" />
                  <span className="text-[9px] text-editor-muted leading-none mt-0.5 ml-1">
                    {formatTime(t)}
                  </span>
                </div>
              ))}
            </div>

            {/* Face track */}
            <div
              className="h-10 border-b border-editor-divider relative cursor-pointer"
              onClick={handleTrackClick}
            >
              {duration > 0 && (
                <div
                  className="absolute top-1.5 bottom-1.5 rounded bg-track-face/10 border border-track-face/30"
                  style={{ left: 0, width: totalWidth }}
                />
              )}
            </div>

            {/* Screen track */}
            <div
              className="h-10 border-b border-editor-divider relative cursor-pointer"
              onClick={handleTrackClick}
            >
              {duration > 0 && (
                <div
                  className="absolute top-1.5 bottom-1.5 rounded bg-track-screen/10 border border-track-screen/30"
                  style={{ left: 0, width: totalWidth }}
                />
              )}
            </div>

            {/* Audio track with waveform */}
            <div className="h-12 relative cursor-pointer" onClick={handleTrackClick}>
              <Waveform zoom={zoom} />
            </div>

            {/* Cut strips — overlay spanning face + screen + audio tracks */}
            <div
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                top: 24, // below ruler
                height: 32 /* face */ + 32 /* unused gap */ + 40 /* audio */,
              }}
            >
              {cuts.map((cut) => {
                const inT = cut.adjusted_in ?? cut.time_in;
                const outT = cut.adjusted_out ?? cut.time_out;
                const x = timeToX(inT);
                const w = Math.max(4, timeToX(outT) - timeToX(inT));
                const isSelected = cut.id === selectedCutId;
                const colors = CUT_COLORS[cut.cut_type];
                const opacity = STATUS_OPACITY[cut.status];

                return (
                  <div
                    key={cut.id}
                    className={[
                      "absolute top-0 bottom-0 rounded border-l-2 border-r-2 cursor-pointer pointer-events-auto transition-opacity",
                      colors.fill,
                      colors.border,
                      opacity,
                      isSelected ? "ring-2 ring-accent" : "",
                    ].join(" ")}
                    style={{ left: x, width: w }}
                    onClick={(e) => handleStripClick(e, cut)}
                    title={`${cut.cut_type} [${formatTime(inT)}-${formatTime(outT)}] ${cut.status}`}
                  >
                    {/* Left trim handle */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2 -ml-1 cursor-ew-resize hover:bg-white/30 z-10"
                      onMouseDown={(e) => startDrag(e, cut, "left")}
                    />
                    {/* Type badge */}
                    {w > 18 && (
                      <span className="absolute top-1 left-1.5 text-[9px] font-bold text-white/90 pointer-events-none">
                        {colors.label}
                      </span>
                    )}
                    {/* Status glyph */}
                    {w > 30 && (cut.status === "approved" || cut.status === "adjusted") && (
                      <span className="absolute bottom-1 right-1.5 text-[10px] text-cut-approved pointer-events-none">
                        ✓
                      </span>
                    )}
                    {w > 30 && cut.status === "rejected" && (
                      <span className="absolute bottom-1 right-1.5 text-[10px] text-editor-muted pointer-events-none">
                        ✗
                      </span>
                    )}
                    {/* Right trim handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 -mr-1 cursor-ew-resize hover:bg-white/30 z-10"
                      onMouseDown={(e) => startDrag(e, cut, "right")}
                    />
                  </div>
                );
              })}
            </div>

            {/* Playhead — spans all tracks */}
            <div
              className="absolute top-0 bottom-0 w-px bg-white z-30 pointer-events-none"
              style={{ left: playheadX }}
            >
              {/* Playhead handle at top */}
              <div className="absolute -top-0.5 -left-1 w-2 h-2 bg-white rotate-45" />
            </div>
          </div>
        </div>
      </div>

      {/* Legend footer */}
      <div className="flex items-center gap-3 px-3 h-6 border-t border-editor-border text-[9px] text-editor-muted bg-editor-panel">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-cut-retake/60" />retake
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-cut-gap/60" />silencio
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-cut-filler/60" />filler
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-cut-manual/60" />manual
        </span>
        <span className="ml-auto">Ctrl+scroll: zoom · S: split · P: preview · A/R: aprovar/rejeitar</span>
      </div>
    </div>
  );
}
