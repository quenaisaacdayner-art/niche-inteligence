import { useEffect } from "react";
import { useEditorStore } from "./stores/editor";
import { fetchCuts, fetchProject, fetchOverlays } from "./api";
import Header from "./components/Header";
import VideoPlayer from "./components/VideoPlayer";
import Timeline from "./components/Timeline";
import LeftPanel from "./components/LeftPanel";
import Inspector from "./components/Inspector";
import Toasts from "./components/Toasts";
import ShortcutsModal from "./components/ShortcutsModal";
import { useKeyboard } from "./hooks/useKeyboard";
import { useWebSocket } from "./hooks/useWebSocket";

export default function App() {
  const slug = useEditorStore((s) => s.slug);
  const setSlug = useEditorStore((s) => s.setSlug);
  const setProjectInfo = useEditorStore((s) => s.setProjectInfo);
  const loadCuts = useEditorStore((s) => s.loadCuts);
  const loadOverlays = useEditorStore((s) => s.loadOverlays);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("slug") || "demo";
    setSlug(s);
  }, [setSlug]);

  useEffect(() => {
    if (!slug) return;
    fetchProject(slug).then(setProjectInfo).catch(() => setProjectInfo(null));
    fetchCuts(slug).then(loadCuts);
    fetchOverlays(slug).then(loadOverlays);
  }, [slug, loadCuts, loadOverlays, setProjectInfo]);

  useWebSocket(slug, () => {
    if (!slug) return;
    fetchProject(slug).then(setProjectInfo).catch(() => {});
    fetchCuts(slug).then(loadCuts);
    fetchOverlays(slug).then(loadOverlays);
  });

  useKeyboard();

  if (!slug) {
    return (
      <div className="flex items-center justify-center h-screen bg-editor-bg text-editor-muted">
        Carregando...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-editor-bg overflow-hidden">
      <Header />
      <div className="flex flex-1 min-h-0">
        <aside className="w-72 flex-shrink-0">
          <LeftPanel />
        </aside>
        <main className="flex-1 flex flex-col min-w-0">
          <VideoPlayer />
        </main>
        <aside className="w-80 flex-shrink-0">
          <Inspector />
        </aside>
      </div>
      <Timeline />
      <Toasts />
      <ShortcutsModal />
    </div>
  );
}
