import { useRef, useEffect, useCallback } from "react";
import { useEditorStore } from "../stores/editor";
import { mediaUrl } from "../api";

export default function VideoPlayer() {
  const slug = useEditorStore((s) => s.slug);
  const currentTime = useEditorStore((s) => s.currentTime);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const duration = useEditorStore((s) => s.duration);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const setDuration = useEditorStore((s) => s.setDuration);
  const setIsPlaying = useEditorStore((s) => s.setIsPlaying);

  const screenRef = useRef<HTMLVideoElement>(null);
  const faceRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);

  const syncVideos = useCallback(() => {
    if (screenRef.current) {
      setCurrentTime(screenRef.current.currentTime);
      if (faceRef.current) {
        const drift = Math.abs(faceRef.current.currentTime - screenRef.current.currentTime);
        if (drift > 0.1) {
          faceRef.current.currentTime = screenRef.current.currentTime;
        }
      }
    }
    rafRef.current = requestAnimationFrame(syncVideos);
  }, [setCurrentTime]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(syncVideos);
    return () => cancelAnimationFrame(rafRef.current);
  }, [syncVideos]);

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

  useEffect(() => {
    if (!screenRef.current || isPlaying) return;
    const drift = Math.abs(screenRef.current.currentTime - currentTime);
    if (drift > 0.05) {
      screenRef.current.currentTime = currentTime;
      if (faceRef.current) faceRef.current.currentTime = currentTime;
    }
  }, [currentTime, isPlaying]);

  const handleLoadedMetadata = () => {
    if (screenRef.current) setDuration(screenRef.current.duration);
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    const ms = Math.floor((t % 1) * 1000);
    return `${m}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
  };

  return (
    <div className="flex-1 flex flex-col">
      <div
        className="flex-1 relative bg-black flex items-center justify-center cursor-pointer"
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
          className="absolute bottom-3 right-3 w-1/4 rounded-lg border border-purple-600 shadow-lg"
          preload="auto"
          playsInline
          muted
        />
      </div>
      <div className="flex items-center justify-center gap-4 py-2 bg-editor-surface border-t border-editor-border">
        <span className="text-xs text-gray-500">J</span>
        <span className="text-xs text-gray-500">◄</span>
        <button
          onClick={togglePlay}
          className="text-sm px-4 py-1 bg-editor-border rounded hover:bg-gray-700"
        >
          {isPlaying ? "⏸ Space" : "▶ Space"}
        </button>
        <span className="text-xs text-gray-500">►</span>
        <span className="text-xs text-gray-500">L</span>
        <span className="text-xs text-gray-500 ml-4">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
