import { create } from "zustand";
import { produce } from "immer";
import type { Cut } from "../types";

interface EditorState {
  slug: string;
  cuts: Cut[];
  selectedCutId: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  zoom: number;
  undoStack: Cut[][];
  redoStack: Cut[][];

  setSlug: (slug: string) => void;
  loadCuts: (cuts: Cut[]) => void;
  approveCut: (id: string) => void;
  rejectCut: (id: string, note?: string) => void;
  adjustCut: (id: string, newIn: number, newOut: number) => void;
  approveAll: () => void;
  selectCut: (id: string) => void;
  selectNextCut: () => void;
  selectPrevCut: () => void;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  setIsPlaying: (p: boolean) => void;
  setZoom: (z: number) => void;
  undo: () => void;
  redo: () => void;
}

function pushUndo(state: EditorState): void {
  state.undoStack.push(JSON.parse(JSON.stringify(state.cuts)));
  state.redoStack = [];
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  slug: "",
  cuts: [],
  selectedCutId: null,
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  zoom: 50,
  undoStack: [],
  redoStack: [],

  setSlug: (slug) => set({ slug }),
  loadCuts: (cuts) => set({ cuts, undoStack: [], redoStack: [] }),

  approveCut: (id) =>
    set(produce((s: EditorState) => {
      pushUndo(s);
      const cut = s.cuts.find((c) => c.id === id);
      if (cut) cut.status = "approved";
    })),

  rejectCut: (id, note) =>
    set(produce((s: EditorState) => {
      pushUndo(s);
      const cut = s.cuts.find((c) => c.id === id);
      if (cut) {
        cut.status = "rejected";
        if (note) cut.dayner_note = note;
      }
    })),

  adjustCut: (id, newIn, newOut) =>
    set(produce((s: EditorState) => {
      pushUndo(s);
      const cut = s.cuts.find((c) => c.id === id);
      if (cut) {
        cut.status = "adjusted";
        cut.adjusted_in = newIn;
        cut.adjusted_out = newOut;
      }
    })),

  approveAll: () =>
    set(produce((s: EditorState) => {
      pushUndo(s);
      for (const cut of s.cuts) {
        if (cut.status === "pending") cut.status = "approved";
      }
    })),

  selectCut: (id) => set({ selectedCutId: id }),

  selectNextCut: () => {
    const { cuts, selectedCutId } = get();
    if (!cuts.length) return;
    const idx = cuts.findIndex((c) => c.id === selectedCutId);
    const next = idx < cuts.length - 1 ? idx + 1 : 0;
    set({ selectedCutId: cuts[next].id });
  },

  selectPrevCut: () => {
    const { cuts, selectedCutId } = get();
    if (!cuts.length) return;
    const idx = cuts.findIndex((c) => c.id === selectedCutId);
    const prev = idx > 0 ? idx - 1 : cuts.length - 1;
    set({ selectedCutId: cuts[prev].id });
  },

  setCurrentTime: (t) => set({ currentTime: t }),
  setDuration: (d) => set({ duration: d }),
  setIsPlaying: (p) => set({ isPlaying: p }),
  setZoom: (z) => set({ zoom: Math.max(10, Math.min(200, z)) }),

  undo: () =>
    set(produce((s: EditorState) => {
      const prev = s.undoStack.pop();
      if (prev) {
        s.redoStack.push(JSON.parse(JSON.stringify(s.cuts)));
        s.cuts = prev;
      }
    })),

  redo: () =>
    set(produce((s: EditorState) => {
      const next = s.redoStack.pop();
      if (next) {
        s.undoStack.push(JSON.parse(JSON.stringify(s.cuts)));
        s.cuts = next;
      }
    })),
}));
