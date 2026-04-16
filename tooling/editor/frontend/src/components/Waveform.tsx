import { useRef, useEffect } from "react";
import WaveSurfer from "wavesurfer.js";
import { useEditorStore } from "../stores/editor";
import { mediaUrl } from "../api";

interface Props {
  /** pixels per second to match the timeline zoom */
  zoom: number;
}

export default function Waveform({ zoom }: Props) {
  const slug = useEditorStore((s) => s.slug);
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (!containerRef.current || !slug) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#00bcd466",
      progressColor: "#00bcd4",
      cursorColor: "transparent", // we draw our own playhead in Timeline
      cursorWidth: 0,
      height: 40,
      barWidth: 2,
      barGap: 1,
      barRadius: 0,
      normalize: true,
      interact: false, // clicks handled by Timeline track
      minPxPerSec: zoom,
      fillParent: false,
      url: mediaUrl(slug, "face_clean.mp4"),
      backend: "MediaElement",
    });

    wsRef.current = ws;
    return () => {
      ws.destroy();
      wsRef.current = null;
    };
  }, [slug]);

  // Update minPxPerSec when zoom changes
  useEffect(() => {
    if (!wsRef.current) return;
    try {
      wsRef.current.zoom(zoom);
    } catch {
      // wavesurfer may not be ready
    }
  }, [zoom]);

  return <div ref={containerRef} className="w-full h-full pointer-events-none" />;
}
