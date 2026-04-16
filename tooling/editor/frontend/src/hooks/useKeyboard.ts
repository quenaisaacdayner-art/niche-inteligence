import { useEffect } from "react";
import { useEditorStore } from "../stores/editor";
import type { PlaybackRate } from "../types";

export function useKeyboard() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const store = useEditorStore.getState();

      // Ctrl/Cmd modifier combos first
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "z":
            e.preventDefault();
            if (e.shiftKey) store.redo();
            else store.undo();
            return;
          case "y":
            e.preventDefault();
            store.redo();
            return;
        }
        return; // don't process other keys with modifier
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          store.setIsPlaying(!store.isPlaying);
          break;

        case "j":
          e.preventDefault();
          store.setCurrentTime(Math.max(0, store.currentTime - 5));
          store.setIsPlaying(false);
          break;

        case "k":
          e.preventDefault();
          store.setIsPlaying(false);
          break;

        case "l":
          e.preventDefault();
          store.setCurrentTime(Math.min(store.duration, store.currentTime + 5));
          store.setIsPlaying(false);
          break;

        case "ArrowLeft":
          e.preventDefault();
          store.setCurrentTime(Math.max(0, store.currentTime - 1 / 30));
          store.setIsPlaying(false);
          break;

        case "ArrowRight":
          e.preventDefault();
          store.setCurrentTime(Math.min(store.duration, store.currentTime + 1 / 30));
          store.setIsPlaying(false);
          break;

        case "ArrowUp": {
          e.preventDefault();
          store.selectPrevCut();
          const next = useEditorStore.getState().selectedCutId;
          const cut = store.cuts.find((c) => c.id === next);
          if (cut) {
            store.setCurrentTime(cut.adjusted_in ?? cut.time_in);
            store.setIsPlaying(false);
          }
          break;
        }

        case "ArrowDown": {
          e.preventDefault();
          store.selectNextCut();
          const next = useEditorStore.getState().selectedCutId;
          const cut = store.cuts.find((c) => c.id === next);
          if (cut) {
            store.setCurrentTime(cut.adjusted_in ?? cut.time_in);
            store.setIsPlaying(false);
          }
          break;
        }

        case "a":
        case "A":
          if (store.selectedCutId) {
            e.preventDefault();
            store.approveCut(store.selectedCutId);
          }
          break;

        case "r":
        case "R":
          if (store.selectedCutId) {
            e.preventDefault();
            store.rejectCut(store.selectedCutId);
          }
          break;

        case "p":
        case "P":
          if (store.selectedCutId) {
            e.preventDefault();
            store.previewRegion();
          }
          break;

        case "s":
        case "S": {
          e.preventDefault();
          const newId = store.splitAtPlayhead();
          if (newId) {
            store.pushToast("Corte manual criado", "success");
          } else {
            store.pushToast(
              "Posicao invalida (dentro de outro corte ou fora do video)",
              "error"
            );
          }
          break;
        }

        case "Delete":
        case "Backspace": {
          const sel = store.selectedCutId;
          if (!sel) return;
          const cut = store.cuts.find((c) => c.id === sel);
          if (cut?.cut_type === "manual") {
            e.preventDefault();
            store.removeCut(sel);
            store.pushToast("Corte manual removido", "info");
          }
          break;
        }

        case "1":
        case "2":
        case "3":
        case "4": {
          const rates: PlaybackRate[] = [0.5, 1, 1.5, 2];
          const rate = rates[parseInt(e.key, 10) - 1];
          if (rate) {
            e.preventDefault();
            store.setPlaybackRate(rate);
          }
          break;
        }

        case "?":
          e.preventDefault();
          store.toggleShortcuts();
          break;

        case "Escape":
          if (store.showShortcuts) {
            e.preventDefault();
            store.toggleShortcuts();
          } else if (store.previewEndTime !== null) {
            e.preventDefault();
            store.setIsPlaying(false);
            store.setPreviewEndTime(null);
          }
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
