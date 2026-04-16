import { useEffect } from "react";
import { useEditorStore } from "./stores/editor";
import { fetchCuts } from "./api";
import Header from "./components/Header";
import VideoPlayer from "./components/VideoPlayer";
import Timeline from "./components/Timeline";
import Waveform from "./components/Waveform";
import CutList from "./components/CutList";
import ActionPanel from "./components/ActionPanel";
import { useKeyboard } from "./hooks/useKeyboard";
import { useWebSocket } from "./hooks/useWebSocket";

export default function App() {
  const slug = useEditorStore((s) => s.slug);
  const setSlug = useEditorStore((s) => s.setSlug);
  const loadCuts = useEditorStore((s) => s.loadCuts);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("slug") || "demo";
    setSlug(s);
  }, [setSlug]);

  useEffect(() => {
    if (!slug) return;
    fetchCuts(slug).then(loadCuts);
  }, [slug, loadCuts]);

  useWebSocket(slug, () => {
    if (slug) fetchCuts(slug).then(loadCuts);
  });

  useKeyboard();

  if (!slug) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="h-screen flex flex-col bg-editor-bg">
      <Header />
      <div className="flex flex-1 min-h-0">
        <div className="flex-[2] flex flex-col border-r border-editor-border">
          <VideoPlayer />
        </div>
        <div className="w-80 flex flex-col bg-editor-panel">
          <CutList />
          <ActionPanel />
        </div>
      </div>
      <div className="border-t border-editor-border">
        <Timeline />
        <Waveform />
      </div>
    </div>
  );
}
