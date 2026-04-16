import { useRef, useEffect, useCallback, useMemo } from "react";
import { useEditorStore, deriveSkipList, findActiveOverlays } from "../stores/editor";
import { mediaUrl, overlayMediaUrl } from "../api";
import type { Overlay } from "../types";

function formatTime(t: number): string {
  if (!isFinite(t)) return "0:00:00";
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const SPEED_OPTIONS = [0.5, 1, 1.5, 2] as const;

/** Compute the CSS positioning for a rendered overlay element. */
function overlayStyle(ov: Overlay): React.CSSProperties {
  if (ov.position === "fullscreen") {
    return { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };
  }
  if (ov.position === "custom") {
    const left = ov.x_pct != null ? `${ov.x_pct}%` : "4%";
    const top = ov.y_pct != null ? `${ov.y_pct}%` : "4%";
    const width = ov.width_pct != null ? `${ov.width_pct}%` : "22%";
    return { position: "absolute", left, top, width, borderRadius: 8 };
  }
  // default pip: bottom-right 22% wide
  return {
    position: "absolute",
    right: "2%",
    bottom: "2%",
    width: "22%",
    borderRadius: 8,
  };
}

export default function VideoPlayer() {
  const projectInfo = useEditorStore((s) => s.projectInfo);
  const overlays = useEditorStore((s) => s.overlays);
  const cuts = useEditorStore((s) => s.cuts);
  const currentTime = useEditorStore((s) => s.currentTime);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const duration = useEditorStore((s) => s.duration);
  const playbackRate = useEditorStore((s) => s.playbackRate);
  const previewEndTime = useEditorStore((s) => s.previewEndTime);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const setDuration = useEditorStore((s) => s.setDuration);
  const setIsPlaying = useEditorStore((s) => s.setIsPlaying);
  const setPlaybackRate = useEditorStore((s) => s.setPlaybackRate);
  const setPreviewEndTime = useEditorStore((s) => s.setPreviewEndTime);

  const masterFile = projectInfo?.master?.file ?? null;
  const masterSrc = masterFile ? mediaUrl(masterFile) : undefined;

  const masterRef = useRef<HTMLVideoElement>(null);
  const overlayRefs = useRef(new Map<string, HTMLVideoElement>());
  const rafRef = useRef<number>(0);

  const skipList = useMemo(() => deriveSkipList(cuts), [cuts]);
  const skipListRef = useRef(skipList);
  useEffect(() => {
    skipListRef.current = skipList;
  }, [skipList]);

  const overlaysRef = useRef(overlays);
  useEffect(() => {
    overlaysRef.current = overlays;
  }, [overlays]);

  const previewEndRef = useRef(previewEndTime);
  useEffect(() => {
    previewEndRef.current = previewEndTime;
  }, [previewEndTime]);

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Core RAF loop: virtual cut + preview-end stop + overlay sync + broadcast
  const tick = useCallback(() => {
    const master = masterRef.current;
    if (master) {
      const t = master.currentTime;

      // preview-end gate
      if (previewEndRef.current !== null && t >= previewEndRef.current) {
        master.pause();
        overlayRefs.current.forEach((el) => el.pause());
        setIsPlaying(false);
        setPreviewEndTime(null);
      }

      // virtual cut skip
      if (isPlayingRef.current) {
        const skip = skipListRef.current.find((r) => t >= r.in && t < r.out);
        if (skip) {
          master.currentTime = skip.out;
        }
      }

      setCurrentTime(master.currentTime);

      // Sync each active overlay element to (t - timeline_pos + time_in)
      const active = findActiveOverlays(overlaysRef.current, master.currentTime);
      const activeIds = new Set(active.map((o) => o.id));
      overlayRefs.current.forEach((el, id) => {
        if (!activeIds.has(id)) {
          if (!el.paused) el.pause();
          return;
        }
        const ov = active.find((o) => o.id === id);
        if (!ov) return;
        const target = ov.time_in + (master.currentTime - ov.timeline_pos);
        const drift = Math.abs(el.currentTime - target);
        if (drift > 0.15) el.currentTime = target;
        if (isPlayingRef.current && el.paused) el.play().catch(() => {});
        if (!isPlayingRef.current && !el.paused) el.pause();
      });
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [setCurrentTime, setIsPlaying, setPreviewEndTime]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  // Play / pause transport
  useEffect(() => {
    const master = masterRef.current;
    if (!master) return;
    if (isPlaying) {
      master.play().catch(() => {});
    } else {
      master.pause();
      overlayRefs.current.forEach((el) => el.pause());
    }
  }, [isPlaying]);

  // External seek (keyboard, timeline click)
  useEffect(() => {
    const master = masterRef.current;
    if (!master || isPlaying) return;
    const drift = Math.abs(master.currentTime - currentTime);
    if (drift > 0.05) {
      master.currentTime = currentTime;
    }
  }, [currentTime, isPlaying]);

  // Playback rate
  useEffect(() => {
    if (masterRef.current) masterRef.current.playbackRate = playbackRate;
    overlayRefs.current.forEach((el) => {
      el.playbackRate = playbackRate;
    });
  }, [playbackRate]);

  const handleLoadedMetadata = () => {
    if (masterRef.current) setDuration(masterRef.current.duration);
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  const approvedDuration = skipList.reduce((acc, r) => acc + (r.out - r.in), 0);
  const effectiveDuration = duration - approvedDuration;

  // Register overlay <video> refs via callback ref
  const registerOverlayRef = useCallback((id: string) => (el: HTMLVideoElement | null) => {
    if (el) overlayRefs.current.set(id, el);
    else overlayRefs.current.delete(id);
  }, []);

  // Render only overlays active at current time (stable set; avoids flicker)
  const activeOverlays = findActiveOverlays(overlays, currentTime);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-editor-bg">
      {/* Video surface */}
      <div
        className="flex-1 relative bg-black flex items-center justify-center cursor-pointer min-h-0 overflow-hidden"
        onClick={togglePlay}
      >
        {masterSrc ? (
          <video
            ref={masterRef}
            src={masterSrc}
            className="max-h-full max-w-full"
            onLoadedMetadata={handleLoadedMetadata}
            preload="auto"
            playsInline
          />
        ) : (
          <div className="text-editor-muted text-[12px] text-center px-6">
            Sem <code className="text-editor-text">master.mp4</code> pra este slug.<br />
            Faca upload de um vídeo pra comecar.
          </div>
        )}
        {activeOverlays.map((ov) => (
          <video
            key={ov.id}
            ref={registerOverlayRef(ov.id)}
            src={overlayMediaUrl(ov.file)}
            style={overlayStyle(ov)}
            className="border border-editor-border shadow-elevated object-cover"
            preload="auto"
            playsInline
            muted={ov.mute}
          />
        ))}
        {previewEndTime !== null && (
          <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-accent text-white text-[10px] font-medium">
            Preview regiao
          </div>
        )}
      </div>

      {/* Transport bar */}
      <div className="flex items-center justify-between px-4 h-11 bg-editor-panel border-t border-editor-border">
        <div className="flex items-center gap-3 text-editor-muted text-[11px] font-mono">
          <span className="text-editor-text">{formatTime(currentTime)}</span>
          <span className="text-editor-dim">/</span>
          <span>{formatTime(duration)}</span>
          {skipList.length > 0 && (
            <span className="text-accent ml-2">
              {skipList.length} cortes ativos · resultado ~{formatTime(effectiveDuration)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => setCurrentTime(Math.max(0, currentTime - 5))} className="icon-btn" title="Voltar 5s (J)">
            ⟲
          </button>
          <button
            onClick={togglePlay}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-accent text-white hover:bg-accent-hover transition-colors"
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button
            onClick={() => setCurrentTime(Math.min(duration, currentTime + 5))}
            className="icon-btn"
            title="Avancar 5s (L)"
          >
            ⟳
          </button>
        </div>

        <div className="flex items-center gap-1">
          {SPEED_OPTIONS.map((r, i) => (
            <button
              key={r}
              onClick={() => setPlaybackRate(r)}
              className={`inline-flex items-center justify-center w-10 h-6 text-[10px] rounded transition-colors ${
                playbackRate === r
                  ? "bg-accent text-white"
                  : "text-editor-muted hover:bg-editor-elevated hover:text-editor-text"
              }`}
              title={`Velocidade ${r}x (${i + 1})`}
            >
              {r}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
