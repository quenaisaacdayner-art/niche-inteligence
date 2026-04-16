import { useRef, useEffect, useCallback, useMemo } from "react";
import { useEditorStore, deriveSkipList } from "../stores/editor";
import { mediaUrl } from "../api";

function formatTime(t: number): string {
  if (!isFinite(t)) return "0:00:00";
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const SPEED_OPTIONS = [0.5, 1, 1.5, 2] as const;

export default function VideoPlayer() {
  const slug = useEditorStore((s) => s.slug);
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

  const screenRef = useRef<HTMLVideoElement>(null);
  const faceRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);

  const skipList = useMemo(() => deriveSkipList(cuts), [cuts]);
  const skipListRef = useRef(skipList);
  useEffect(() => {
    skipListRef.current = skipList;
  }, [skipList]);

  const previewEndRef = useRef(previewEndTime);
  useEffect(() => {
    previewEndRef.current = previewEndTime;
  }, [previewEndTime]);

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Core RAF loop: sync + virtual cut skip + preview-end stop
  const tick = useCallback(() => {
    const screen = screenRef.current;
    const face = faceRef.current;
    if (screen) {
      const t = screen.currentTime;

      // 1) preview-end gate — if we crossed the preview target, stop
      if (previewEndRef.current !== null && t >= previewEndRef.current) {
        screen.pause();
        face?.pause();
        setIsPlaying(false);
        setPreviewEndTime(null);
      }

      // 2) virtual cut skip — while playing, if currentTime is inside an approved cut, jump to out
      if (isPlayingRef.current) {
        const skip = skipListRef.current.find((r) => t >= r.in && t < r.out);
        if (skip) {
          screen.currentTime = skip.out;
          if (face) face.currentTime = skip.out;
        }
      }

      // 3) broadcast current time to store
      setCurrentTime(screen.currentTime);

      // 4) keep face in sync with screen
      if (face) {
        const drift = Math.abs(face.currentTime - screen.currentTime);
        if (drift > 0.1) face.currentTime = screen.currentTime;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [setCurrentTime, setIsPlaying, setPreviewEndTime]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  // Play / pause transport
  useEffect(() => {
    if (!screenRef.current || !faceRef.current) return;
    if (isPlaying) {
      screenRef.current.play().catch(() => {});
      faceRef.current.play().catch(() => {});
    } else {
      screenRef.current.pause();
      faceRef.current.pause();
    }
  }, [isPlaying]);

  // Seek from external source (keyboard, timeline click, etc.)
  useEffect(() => {
    if (!screenRef.current || isPlaying) return;
    const drift = Math.abs(screenRef.current.currentTime - currentTime);
    if (drift > 0.05) {
      screenRef.current.currentTime = currentTime;
      if (faceRef.current) faceRef.current.currentTime = currentTime;
    }
  }, [currentTime, isPlaying]);

  // Playback rate
  useEffect(() => {
    if (screenRef.current) screenRef.current.playbackRate = playbackRate;
    if (faceRef.current) faceRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  const handleLoadedMetadata = () => {
    if (screenRef.current) setDuration(screenRef.current.duration);
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  // Count approved cuts for "cortes ativos" indicator
  const approvedDuration = skipList.reduce((acc, r) => acc + (r.out - r.in), 0);
  const effectiveDuration = duration - approvedDuration;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-editor-bg">
      {/* Video surface */}
      <div
        className="flex-1 relative bg-black flex items-center justify-center cursor-pointer min-h-0 overflow-hidden"
        onClick={togglePlay}
      >
        <video
          ref={screenRef}
          src={mediaUrl(slug, "screen_clean.mp4")}
          className="max-h-full max-w-full"
          onLoadedMetadata={handleLoadedMetadata}
          preload="auto"
          playsInline
        />
        <video
          ref={faceRef}
          src={mediaUrl(slug, "face_clean.mp4")}
          className="absolute bottom-4 right-4 w-[22%] rounded-lg border border-editor-border shadow-elevated"
          preload="auto"
          playsInline
          muted
        />
        {previewEndTime !== null && (
          <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-accent text-white text-[10px] font-medium">
            Preview regiao
          </div>
        )}
      </div>

      {/* Transport bar */}
      <div className="flex items-center justify-between px-4 h-11 bg-editor-panel border-t border-editor-border">
        {/* Left: timecode + virtual cut info */}
        <div className="flex items-center gap-3 text-editor-textMuted text-[11px] font-mono">
          <span className="text-editor-text">{formatTime(currentTime)}</span>
          <span className="text-editor-textDim">/</span>
          <span>{formatTime(duration)}</span>
          {skipList.length > 0 && (
            <span className="text-accent ml-2">
              {skipList.length} cortes ativos · resultado ~{formatTime(effectiveDuration)}
            </span>
          )}
        </div>

        {/* Center: transport controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentTime(Math.max(0, currentTime - 5))}
            className="icon-btn"
            title="Voltar 5s (J)"
          >
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

        {/* Right: playback speed */}
        <div className="flex items-center gap-1">
          {SPEED_OPTIONS.map((r, i) => (
            <button
              key={r}
              onClick={() => setPlaybackRate(r)}
              className={`inline-flex items-center justify-center w-10 h-6 text-[10px] rounded transition-colors ${
                playbackRate === r
                  ? "bg-accent text-white"
                  : "text-editor-textMuted hover:bg-editor-elevated hover:text-editor-text"
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
