import { useRef, useEffect } from "react";
import WaveSurfer from "wavesurfer.js";
import { useEditorStore } from "../stores/editor";
import { mediaUrl } from "../api";

interface Props {
  /** pixels per second to match the timeline zoom */
  zoom: number;
}

export default function Waveform({ zoom }: Props) {
  const projectInfo = useEditorStore((s) => s.projectInfo);
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);

  const masterFile = projectInfo?.master?.file ?? null;

  useEffect(() => {
    if (!containerRef.current || !masterFile) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#00bcd466",
      progressColor: "#00bcd4",
      cursorColor: "transparent",
      cursorWidth: 0,
      height: 40,
      barWidth: 2,
      barGap: 1,
      barRadius: 0,
      normalize: true,
      interact: false,
      minPxPerSec: zoom,
      fillParent: false,
      url: mediaUrl(masterFile),
      backend: "MediaElement",
    });

    wsRef.current = ws;
    return () => {
      ws.destroy();
      wsRef.current = null;
    };
  }, [masterFile]);

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
