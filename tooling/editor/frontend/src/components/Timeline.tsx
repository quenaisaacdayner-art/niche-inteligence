import { useRef, useCallback, useEffect, useMemo } from "react";
import { useEditorStore, overlaysByTrack } from "../stores/editor";
import { saveOverlays } from "../api";
import type { Cut, Overlay } from "../types";
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

const TRACK_HEIGHT = 36;   // px per track
const MASTER_HEIGHT = 40;  // px for master track
const AUDIO_HEIGHT = 40;   // px for audio waveform track
const RULER_HEIGHT = 24;   // px

function formatTime(t: number): string {
  if (!isFinite(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Timeline() {
  const cuts = useEditorStore((s) => s.cuts);
  const overlays = useEditorStore((s) => s.overlays);
  const currentTime = useEditorStore((s) => s.currentTime);
  const duration = useEditorStore((s) => s.duration);
  const zoom = useEditorStore((s) => s.zoom);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const selectedCutId = useEditorStore((s) => s.selectedCutId);
  const selectedOverlayId = useEditorStore((s) => s.selectedOverlayId);
  const slug = useEditorStore((s) => s.slug);

  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const setIsPlaying = useEditorStore((s) => s.setIsPlaying);
  const setZoom = useEditorStore((s) => s.setZoom);
  const selectCut = useEditorStore((s) => s.selectCut);
  const selectOverlay = useEditorStore((s) => s.selectOverlay);
  const adjustCut = useEditorStore((s) => s.adjustCut);
  const updateOverlay = useEditorStore((s) => s.updateOverlay);
  const moveOverlay = useEditorStore((s) => s.moveOverlay);
  const addOverlay = useEditorStore((s) => s.addOverlay);
  const splitAtPlayhead = useEditorStore((s) => s.splitAtPlayhead);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const pushToast = useEditorStore((s) => s.pushToast);

  const scrollRef = useRef<HTMLDivElement>(null);
  const cutDragRef = useRef<{
    cutId: string;
    edge: "left" | "right";
    startX: number;
    origIn: number;
    origOut: number;
  } | null>(null);

  const overlayDragRef = useRef<{
    overlayId: string;
    kind: "move" | "trim-left" | "trim-right";
    startX: number;
    startY: number;
    origPos: number;
    origIn: number;
    origOut: number;
    origTrack: number;
  } | null>(null);

  const trackGroups = useMemo(() => overlaysByTrack(overlays), [overlays]);
  // Compose tracks: always render 1 master + each used overlay track + an "add" placeholder
  const usedTracks = trackGroups.map((g) => g.track);
  const maxTrack = usedTracks.length > 0 ? Math.max(...usedTracks) : 1;
  const overlayTracks: number[] = [];
  for (let t = 2; t <= Math.max(maxTrack + 1, 3); t++) overlayTracks.push(t);

  const totalWidth = Math.max(duration * zoom, 200);
  const timeToX = (t: number) => t * zoom;

  const step = zoom > 80 ? 1 : zoom > 40 ? 5 : zoom > 20 ? 10 : 30;
  const marks = useMemo(() => {
    const arr: number[] = [];
    if (duration > 0) for (let t = 0; t <= duration; t += step) arr.push(t);
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

  const handleRulerClick = useCallback(
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

  // --- Cut drag (trim handles) ---
  const startCutDrag = useCallback(
    (e: React.MouseEvent, cut: Cut, edge: "left" | "right") => {
      e.stopPropagation();
      e.preventDefault();
      const inT = cut.adjusted_in ?? cut.time_in;
      const outT = cut.adjusted_out ?? cut.time_out;
      cutDragRef.current = { cutId: cut.id, edge, startX: e.clientX, origIn: inT, origOut: outT };

      const onMove = (ev: MouseEvent) => {
        if (!cutDragRef.current) return;
        const dx = ev.clientX - cutDragRef.current.startX;
        const dt = dx / zoom;
        let newIn = cutDragRef.current.origIn;
        let newOut = cutDragRef.current.origOut;
        if (cutDragRef.current.edge === "left") {
          newIn = Math.max(0, Math.min(cutDragRef.current.origOut - 0.1, cutDragRef.current.origIn + dt));
        } else {
          newOut = Math.max(
            cutDragRef.current.origIn + 0.1,
            Math.min(duration, cutDragRef.current.origOut + dt)
          );
        }
        adjustCut(cutDragRef.current.cutId, newIn, newOut);
      };
      const onUp = () => {
        cutDragRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [zoom, duration, adjustCut]
  );

  const handleCutClick = useCallback(
    (e: React.MouseEvent, cut: Cut) => {
      e.stopPropagation();
      selectCut(cut.id);
      const inT = cut.adjusted_in ?? cut.time_in;
      setCurrentTime(inT);
      setIsPlaying(false);
    },
    [selectCut, setCurrentTime, setIsPlaying]
  );

  // --- Overlay drag (move, trim) ---
  const persistOverlays = useCallback(
    (next: Overlay[]) => {
      if (!slug) return;
      saveOverlays(slug, next).catch(() => pushToast("Erro ao salvar overlays", "error"));
    },
    [slug, pushToast]
  );

  const startOverlayDrag = useCallback(
    (e: React.MouseEvent, overlay: Overlay, kind: "move" | "trim-left" | "trim-right") => {
      e.stopPropagation();
      e.preventDefault();
      overlayDragRef.current = {
        overlayId: overlay.id,
        kind,
        startX: e.clientX,
        startY: e.clientY,
        origPos: overlay.timeline_pos,
        origIn: overlay.time_in,
        origOut: overlay.time_out,
        origTrack: overlay.track,
      };

      const onMove = (ev: MouseEvent) => {
        const drag = overlayDragRef.current;
        if (!drag) return;
        const dx = ev.clientX - drag.startX;
        const dy = ev.clientY - drag.startY;
        const dt = dx / zoom;

        if (drag.kind === "move") {
          const newPos = Math.max(0, drag.origPos + dt);
          // Vertical snap between tracks (each row = TRACK_HEIGHT)
          const trackShift = Math.round(dy / TRACK_HEIGHT);
          const newTrack = Math.max(2, drag.origTrack + trackShift);
          moveOverlay(drag.overlayId, newTrack, newPos);
        } else if (drag.kind === "trim-left") {
          const delta = dt;
          const newIn = Math.max(0, Math.min(drag.origOut - 0.1, drag.origIn + delta));
          const newPos = Math.max(0, drag.origPos + (newIn - drag.origIn));
          updateOverlay(drag.overlayId, { time_in: newIn, timeline_pos: newPos });
        } else {
          const newOut = Math.max(drag.origIn + 0.1, drag.origOut + dt);
          updateOverlay(drag.overlayId, { time_out: newOut });
        }
      };
      const onUp = () => {
        overlayDragRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        // Persist
        const fresh = useEditorStore.getState().overlays;
        persistOverlays(fresh);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [zoom, moveOverlay, updateOverlay, persistOverlays]
  );

  const handleSplit = () => {
    const newId = splitAtPlayhead();
    if (newId) pushToast("Corte manual criado", "success");
    else pushToast("Posicao invalida (dentro de outro corte ou fora do video)", "error");
  };

  // --- Drop handler: overlay dragged from Bin onto a track ---
  const handleTrackDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, targetTrack: number) => {
      e.preventDefault();
      const overlayId = e.dataTransfer.getData("application/x-overlay-id");
      if (!overlayId) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const scrollLeft = scrollRef.current?.scrollLeft ?? 0;
      const x = e.clientX - rect.left + scrollLeft;
      const t = Math.max(0, x / zoom);
      const existing = overlays.find((o) => o.id === overlayId);
      if (!existing) return;
      moveOverlay(overlayId, targetTrack, t);
      const next = useEditorStore.getState().overlays;
      persistOverlays(next);
    },
    [overlays, zoom, moveOverlay, persistOverlays]
  );

  const handleTrackDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes("application/x-overlay-id")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
  };

  const playheadX = timeToX(currentTime);

  const labelColWidth = 80;

  return (
    <div className="flex flex-col bg-editor-panel border-t border-editor-border select-none h-64">
      {/* Toolbar */}
      <div className="flex items-center gap-1 h-9 px-2 border-b border-editor-border bg-editor-panel">
        <button onClick={handleSplit} className="icon-btn" title="Split no playhead (S)">
          <span className="text-[14px]">✂</span>
        </button>
        <div className="w-px h-5 bg-editor-border mx-1" />
        <button onClick={undo} className="icon-btn" title="Undo (Ctrl+Z)">↩</button>
        <button onClick={redo} className="icon-btn" title="Redo (Ctrl+Shift+Z)">↪</button>

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
        <div
          className="flex-shrink-0 flex flex-col border-r border-editor-border text-[10px] text-editor-muted bg-editor-panel"
          style={{ width: labelColWidth }}
        >
          <div style={{ height: RULER_HEIGHT }} className="border-b border-editor-divider" />
          <div
            style={{ height: MASTER_HEIGHT }}
            className="flex items-center justify-end pr-2 text-track-screen border-b border-editor-divider font-medium"
          >
            Master
          </div>
          {overlayTracks.map((t) => (
            <div
              key={t}
              style={{ height: TRACK_HEIGHT }}
              className="flex items-center justify-end pr-2 text-editor-muted border-b border-editor-divider"
            >
              Track {t}
            </div>
          ))}
          <div style={{ height: AUDIO_HEIGHT }} className="flex items-center justify-end pr-2 text-track-audio">
            Audio
          </div>
        </div>

        {/* Scrollable tracks */}
        <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden relative">
          <div style={{ width: totalWidth, position: "relative" }}>
            {/* Ruler */}
            <div
              style={{ height: RULER_HEIGHT }}
              className="border-b border-editor-divider relative overflow-hidden bg-editor-panel cursor-pointer"
              onClick={handleRulerClick}
            >
              {marks.map((t) => (
                <div key={t} className="absolute top-0 flex flex-col items-start" style={{ left: timeToX(t) }}>
                  <div className="w-px h-2 bg-editor-dim" />
                  <span className="text-[9px] text-editor-muted leading-none mt-0.5 ml-1">{formatTime(t)}</span>
                </div>
              ))}
            </div>

            {/* Master track (cut strips overlaid) */}
            <div
              style={{ height: MASTER_HEIGHT }}
              className="border-b border-editor-divider relative cursor-pointer"
              onClick={handleRulerClick}
            >
              {duration > 0 && (
                <div
                  className="absolute top-1.5 bottom-1.5 rounded bg-track-screen/10 border border-track-screen/30"
                  style={{ left: 0, width: totalWidth }}
                />
              )}
              {/* Cut strips */}
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
                      "absolute top-0.5 bottom-0.5 rounded border-l-2 border-r-2 cursor-pointer transition-opacity",
                      colors.fill,
                      colors.border,
                      opacity,
                      isSelected ? "ring-2 ring-accent" : "",
                    ].join(" ")}
                    style={{ left: x, width: w }}
                    onClick={(e) => handleCutClick(e, cut)}
                    title={`${cut.cut_type} [${formatTime(inT)}-${formatTime(outT)}] ${cut.status}`}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2 -ml-1 cursor-ew-resize hover:bg-white/30 z-10"
                      onMouseDown={(e) => startCutDrag(e, cut, "left")}
                    />
                    {w > 18 && (
                      <span className="absolute top-0.5 left-1.5 text-[9px] font-bold text-white/90 pointer-events-none">
                        {colors.label}
                      </span>
                    )}
                    {w > 30 && (cut.status === "approved" || cut.status === "adjusted") && (
                      <span className="absolute bottom-0.5 right-1.5 text-[10px] text-cut-approved pointer-events-none">
                        ✓
                      </span>
                    )}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 -mr-1 cursor-ew-resize hover:bg-white/30 z-10"
                      onMouseDown={(e) => startCutDrag(e, cut, "right")}
                    />
                  </div>
                );
              })}
            </div>

            {/* Overlay tracks — each track is a drop zone for overlay clips */}
            {overlayTracks.map((trackIdx) => {
              const group = trackGroups.find((g) => g.track === trackIdx);
              const trackOverlays = group?.overlays ?? [];
              return (
                <div
                  key={`track-${trackIdx}`}
                  style={{ height: TRACK_HEIGHT }}
                  className="border-b border-editor-divider relative"
                  onDrop={(e) => handleTrackDrop(e, trackIdx)}
                  onDragOver={handleTrackDragOver}
                  onClick={handleRulerClick}
                >
                  <div
                    className="absolute top-1 bottom-1 rounded bg-editor-elevated/20 border border-editor-border/20"
                    style={{ left: 0, width: totalWidth }}
                  />
                  {trackOverlays.map((ov) => {
                    const dur = ov.time_out - ov.time_in;
                    const x = timeToX(ov.timeline_pos);
                    const w = Math.max(8, timeToX(dur));
                    const isSelected = ov.id === selectedOverlayId;
                    return (
                      <div
                        key={ov.id}
                        style={{ left: x, width: w }}
                        className={`absolute top-0.5 bottom-0.5 rounded border border-cut-manual bg-cut-manual/30 cursor-move transition-all ${
                          isSelected ? "ring-2 ring-accent" : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectOverlay(ov.id);
                        }}
                        onMouseDown={(e) => startOverlayDrag(e, ov, "move")}
                        title={`${ov.file} [${formatTime(ov.timeline_pos)}] · ${dur.toFixed(2)}s`}
                      >
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2 -ml-1 cursor-ew-resize hover:bg-white/30 z-10"
                          onMouseDown={(e) => startOverlayDrag(e, ov, "trim-left")}
                        />
                        {w > 50 && (
                          <span className="absolute inset-0 flex items-center px-2 text-[10px] text-white/90 truncate pointer-events-none">
                            {ov.file}
                          </span>
                        )}
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 -mr-1 cursor-ew-resize hover:bg-white/30 z-10"
                          onMouseDown={(e) => startOverlayDrag(e, ov, "trim-right")}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Audio waveform */}
            <div
              style={{ height: AUDIO_HEIGHT }}
              className="relative cursor-pointer"
              onClick={handleRulerClick}
            >
              <Waveform zoom={zoom} />
            </div>

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-px bg-white z-30 pointer-events-none"
              style={{ left: playheadX }}
            >
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
          <span className="w-2 h-2 rounded-sm bg-cut-manual/60" />clip
        </span>
        <span className="ml-auto">Ctrl+scroll: zoom · S: split · P: preview · A/R: aprovar/rejeitar · drag clip: mover</span>
      </div>
    </div>
  );
}
