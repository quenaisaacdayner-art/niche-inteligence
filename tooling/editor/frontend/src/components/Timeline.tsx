import { useRef, useCallback } from "react";
import { useEditorStore } from "../stores/editor";
import type { Cut } from "../types";

const CUT_COLORS: Record<Cut["cut_type"], string> = {
  retake: "bg-cut-retake/40 border-cut-retake",
  gap: "bg-cut-gap/40 border-cut-gap",
  filler: "bg-cut-filler/40 border-cut-filler",
};

const STATUS_RING: Record<Cut["status"], string> = {
  approved: "ring-1 ring-cut-approved",
  rejected: "ring-1 ring-cut-rejected opacity-40",
  adjusted: "ring-1 ring-yellow-400",
  pending: "",
};

function formatTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Timeline() {
  const cuts = useEditorStore((s) => s.cuts);
  const currentTime = useEditorStore((s) => s.currentTime);
  const duration = useEditorStore((s) => s.duration);
  const zoom = useEditorStore((s) => s.zoom);
  const selectedCutId = useEditorStore((s) => s.selectedCutId);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const setIsPlaying = useEditorStore((s) => s.setIsPlaying);
  const setZoom = useEditorStore((s) => s.setZoom);
  const selectCut = useEditorStore((s) => s.selectCut);
  const adjustCut = useEditorStore((s) => s.adjustCut);

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

  // Time ruler step
  const step = zoom > 80 ? 1 : zoom > 40 ? 5 : 10;
  const marks: number[] = [];
  if (duration > 0) {
    for (let t = 0; t <= duration; t += step) {
      marks.push(t);
    }
  }

  const handleScrollAreaClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only seek on direct click (not drag or strip click)
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft ?? 0);
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
    (
      e: React.MouseEvent,
      cut: Cut,
      edge: "left" | "right"
    ) => {
      e.stopPropagation();
      e.preventDefault();
      const inT = cut.adjusted_in ?? cut.time_in;
      const outT = cut.adjusted_out ?? cut.time_out;
      dragRef.current = {
        cutId: cut.id,
        edge,
        startX: e.clientX,
        origIn: inT,
        origOut: outT,
      };

      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = ev.clientX - dragRef.current.startX;
        const dt = dx / zoom;
        let newIn = dragRef.current.origIn;
        let newOut = dragRef.current.origOut;
        if (dragRef.current.edge === "left") {
          newIn = Math.max(0, Math.min(dragRef.current.origOut - 0.1, dragRef.current.origIn + dt));
        } else {
          newOut = Math.max(dragRef.current.origIn + 0.1, Math.min(duration, dragRef.current.origOut + dt));
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

  const playheadX = timeToX(currentTime);

  return (
    <div className="flex flex-col bg-editor-bg select-none" onWheel={handleWheel}>
      {/* Track rows */}
      <div className="flex text-[9px] text-gray-400">
        {/* Left labels column */}
        <div className="flex-shrink-0 w-14 flex flex-col border-r border-editor-border">
          {/* Ruler label */}
          <div className="h-5 border-b border-editor-border" />
          {/* Face label */}
          <div className="h-5 flex items-center justify-end pr-1 text-track-face border-b border-editor-border">
            Face
          </div>
          {/* Screen label */}
          <div className="h-5 flex items-center justify-end pr-1 text-track-screen border-b border-editor-border">
            Screen
          </div>
          {/* Cuts label */}
          <div className="h-8 flex items-center justify-end pr-1 border-b border-editor-border">
            Cortes
          </div>
        </div>

        {/* Scrollable area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto overflow-y-hidden"
          style={{ position: "relative" }}
        >
          <div style={{ width: totalWidth, position: "relative" }}>
            {/* Time ruler */}
            <div
              className="h-5 border-b border-editor-border relative overflow-hidden"
              onClick={handleScrollAreaClick}
              style={{ cursor: "pointer" }}
            >
              {marks.map((t) => (
                <div
                  key={t}
                  className="absolute top-0 flex flex-col items-center"
                  style={{ left: timeToX(t) }}
                >
                  <div className="w-px h-2 bg-gray-600" />
                  <span className="text-[8px] text-gray-500 leading-none mt-px">{formatTime(t)}</span>
                </div>
              ))}
              {/* Playhead marker in ruler */}
              <div
                className="absolute top-0 bottom-0 w-px bg-red-500 z-20 pointer-events-none"
                style={{ left: playheadX }}
              />
            </div>

            {/* Face track bar */}
            <div
              className="h-5 border-b border-editor-border relative"
              onClick={handleScrollAreaClick}
              style={{ cursor: "pointer" }}
            >
              {duration > 0 && (
                <div
                  className="absolute top-1 bottom-1 rounded-sm bg-track-face/20 border border-track-face/40"
                  style={{ left: 0, width: totalWidth }}
                />
              )}
              <div
                className="absolute top-0 bottom-0 w-px bg-red-500 z-20 pointer-events-none"
                style={{ left: playheadX }}
              />
            </div>

            {/* Screen track bar */}
            <div
              className="h-5 border-b border-editor-border relative"
              onClick={handleScrollAreaClick}
              style={{ cursor: "pointer" }}
            >
              {duration > 0 && (
                <div
                  className="absolute top-1 bottom-1 rounded-sm bg-track-screen/20 border border-track-screen/40"
                  style={{ left: 0, width: totalWidth }}
                />
              )}
              <div
                className="absolute top-0 bottom-0 w-px bg-red-500 z-20 pointer-events-none"
                style={{ left: playheadX }}
              />
            </div>

            {/* Cuts strip row */}
            <div
              className="h-8 border-b border-editor-border relative"
              onClick={handleScrollAreaClick}
              style={{ cursor: "pointer" }}
            >
              {cuts.map((cut) => {
                const inT = cut.adjusted_in ?? cut.time_in;
                const outT = cut.adjusted_out ?? cut.time_out;
                const x = timeToX(inT);
                const w = Math.max(4, timeToX(outT) - timeToX(inT));
                const isSelected = cut.id === selectedCutId;
                return (
                  <div
                    key={cut.id}
                    className={[
                      "absolute top-1 bottom-1 rounded border cursor-pointer",
                      CUT_COLORS[cut.cut_type],
                      STATUS_RING[cut.status],
                      isSelected ? "outline outline-1 outline-white" : "",
                    ].join(" ")}
                    style={{ left: x, width: w }}
                    onClick={(e) => handleStripClick(e, cut)}
                    title={`${cut.cut_type} [${formatTime(inT)}–${formatTime(outT)}] ${cut.status}`}
                  >
                    {/* Left drag handle */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/20 z-10"
                      onMouseDown={(e) => startDrag(e, cut, "left")}
                    />
                    {/* Label (only if wide enough) */}
                    {w > 20 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[7px] font-medium text-white/70 pointer-events-none truncate px-1">
                        {cut.cut_type[0].toUpperCase()}
                      </span>
                    )}
                    {/* Right drag handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/20 z-10"
                      onMouseDown={(e) => startDrag(e, cut, "right")}
                    />
                  </div>
                );
              })}
              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 w-px bg-red-500 z-20 pointer-events-none"
                style={{ left: playheadX }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Legend row */}
      <div className="flex items-center gap-3 px-2 py-0.5 text-[8px] text-gray-500 border-t border-editor-border">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-cut-retake/60" />retake
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-cut-gap/60" />gap
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-cut-filler/60" />filler
        </span>
        <span className="ml-2 flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm ring-1 ring-cut-approved" />approved
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm ring-1 ring-cut-rejected opacity-60" />rejected
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm ring-1 ring-yellow-400" />adjusted
        </span>
        <span className="ml-auto">Ctrl+scroll zoom</span>
      </div>
    </div>
  );
}
