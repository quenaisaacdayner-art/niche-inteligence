import { useEffect } from "react";
import { useEditorStore } from "../stores/editor";

export function useKeyboard() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const store = useEditorStore.getState();

      switch (e.key) {
        case " ":
          e.preventDefault();
          store.setIsPlaying(!store.isPlaying);
          break;

        case "j":
          store.setCurrentTime(Math.max(0, store.currentTime - 5));
          store.setIsPlaying(false);
          break;

        case "l":
          store.setCurrentTime(Math.min(store.duration, store.currentTime + 5));
          store.setIsPlaying(false);
          break;

        case "k":
          store.setIsPlaying(false);
          break;

        case "ArrowLeft":
          e.preventDefault();
          store.setCurrentTime(Math.max(0, store.currentTime - (1 / 30)));
          store.setIsPlaying(false);
          break;

        case "ArrowRight":
          e.preventDefault();
          store.setCurrentTime(Math.min(store.duration, store.currentTime + (1 / 30)));
          store.setIsPlaying(false);
          break;

        case "ArrowUp":
          e.preventDefault();
          store.selectPrevCut();
          {
            const cut = store.cuts.find((c) => c.id === useEditorStore.getState().selectedCutId);
            if (cut) {
              store.setCurrentTime(cut.adjusted_in ?? cut.time_in);
              store.setIsPlaying(false);
            }
          }
          break;

        case "ArrowDown":
          e.preventDefault();
          store.selectNextCut();
          {
            const cut = store.cuts.find((c) => c.id === useEditorStore.getState().selectedCutId);
            if (cut) {
              store.setCurrentTime(cut.adjusted_in ?? cut.time_in);
              store.setIsPlaying(false);
            }
          }
          break;

        case "a":
          if (store.selectedCutId) store.approveCut(store.selectedCutId);
          break;

        case "r":
          if (store.selectedCutId) store.rejectCut(store.selectedCutId);
          break;

        case "z":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) {
              store.redo();
            } else {
              store.undo();
            }
          }
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
