import { useRef, useEffect } from "react";
import WaveSurfer from "wavesurfer.js";
import { useEditorStore } from "../stores/editor";
import { mediaUrl } from "../api";

export default function Waveform() {
  const slug = useEditorStore((s) => s.slug);
  const currentTime = useEditorStore((s) => s.currentTime);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const seekingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || !slug) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#22c55e40",
      progressColor: "#22c55e",
      cursorColor: "#ef4444",
      cursorWidth: 2,
      height: 40,
      barWidth: 2,
      barGap: 1,
      barRadius: 1,
      normalize: true,
      interact: true,
      url: mediaUrl(slug, "face_clean.mp4"),
    });

    ws.on("seeking" as any, (time: number) => {
      seekingRef.current = true;
      useEditorStore.getState().setCurrentTime(time);
      useEditorStore.getState().setIsPlaying(false);
      setTimeout(() => (seekingRef.current = false), 100);
    });

    wsRef.current = ws;
    return () => ws.destroy();
  }, [slug]);

  useEffect(() => {
    if (!wsRef.current || seekingRef.current || isPlaying) return;
    const duration = wsRef.current.getDuration();
    if (duration > 0) {
      wsRef.current.seekTo(currentTime / duration);
    }
  }, [currentTime, isPlaying]);

  return (
    <div className="px-4 pb-1 bg-editor-bg">
      <div className="flex items-center">
        <span className="w-14 text-[9px] text-gray-500 text-right pr-1">Audio</span>
        <div ref={containerRef} className="flex-1" />
      </div>
    </div>
  );
}
