import { create } from "zustand";
import { produce } from "immer";
import type { Cut, FilterStatus, Overlay, PlaybackRate, ProjectInfo, SkipRange, Toast } from "../types";

interface HistorySnapshot {
  cuts: Cut[];
  overlays: Overlay[];
}

interface EditorState {
  slug: string;
  projectInfo: ProjectInfo | null;
  cuts: Cut[];
  overlays: Overlay[];
  selectedCutId: string | null;
  selectedOverlayId: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: PlaybackRate;
  zoom: number;
  filterStatus: FilterStatus;
  previewEndTime: number | null;
  undoStack: HistorySnapshot[];
  redoStack: HistorySnapshot[];
  toasts: Toast[];
  showShortcuts: boolean;

  // Slug / loading
  setSlug: (slug: string) => void;
  setProjectInfo: (info: ProjectInfo | null) => void;
  loadCuts: (cuts: Cut[]) => void;
  loadOverlays: (overlays: Overlay[]) => void;

  // Cut actions
  approveCut: (id: string) => void;
  rejectCut: (id: string, note?: string) => void;
  adjustCut: (id: string, newIn: number, newOut: number) => void;
  approveAll: () => void;
  approveAllByType: (type: Cut["cut_type"]) => void;
  splitAtPlayhead: () => string | null;
  removeCut: (id: string) => void;

  // Overlay actions
  addOverlay: (overlay: Overlay) => void;
  updateOverlay: (id: string, patch: Partial<Overlay>) => void;
  moveOverlay: (id: string, newTrack: number, newPos: number) => void;
  removeOverlay: (id: string) => void;
  selectOverlay: (id: string | null) => void;

  // Selection / navigation
  selectCut: (id: string | null) => void;
  selectNextCut: () => void;
  selectPrevCut: () => void;
  selectNextPending: () => void;

  // Playback
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  setIsPlaying: (p: boolean) => void;
  setPlaybackRate: (r: PlaybackRate) => void;
  setPreviewEndTime: (t: number | null) => void;
  previewRegion: (cutId?: string) => void;

  // Filters
  setFilterStatus: (s: FilterStatus) => void;

  // Zoom
  setZoom: (z: number) => void;

  // Undo/redo
  undo: () => void;
  redo: () => void;

  // Toasts
  pushToast: (message: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: string) => void;

  // Shortcuts modal
  toggleShortcuts: () => void;
}

function snapshot(state: EditorState): HistorySnapshot {
  return {
    cuts: JSON.parse(JSON.stringify(state.cuts)),
    overlays: JSON.parse(JSON.stringify(state.overlays)),
  };
}

function pushUndo(state: EditorState): void {
  state.undoStack.push(snapshot(state));
  state.redoStack = [];
  if (state.undoStack.length > 50) state.undoStack.shift();
}

function effectiveIn(cut: Cut): number {
  return cut.adjusted_in ?? cut.time_in;
}

function effectiveOut(cut: Cut): number {
  return cut.adjusted_out ?? cut.time_out;
}

/** Derive the list of ranges the player should skip during playback. */
export function deriveSkipList(cuts: Cut[]): SkipRange[] {
  return cuts
    .filter((c) => c.status === "approved" || c.status === "adjusted")
    .map((c) => ({ in: effectiveIn(c), out: effectiveOut(c), cutId: c.id }))
    .sort((a, b) => a.in - b.in);
}

/** Apply current filter to cuts list. */
export function filterCuts(cuts: Cut[], filter: FilterStatus): Cut[] {
  if (filter === "all") return cuts;
  if (filter === "pending") return cuts.filter((c) => c.status === "pending");
  if (filter === "rejected") return cuts.filter((c) => c.status === "rejected");
  return cuts;
}

/** Find active overlays at a given master timeline position. */
export function findActiveOverlays(overlays: Overlay[], t: number): Overlay[] {
  return overlays.filter((o) => {
    const start = o.timeline_pos;
    const end = o.timeline_pos + (o.time_out - o.time_in);
    return t >= start && t < end;
  });
}

/** Group overlays by track (track > 1). Returns sorted track indices with their overlays. */
export function overlaysByTrack(overlays: Overlay[]): { track: number; overlays: Overlay[] }[] {
  const groups = new Map<number, Overlay[]>();
  for (const o of overlays) {
    if (!groups.has(o.track)) groups.set(o.track, []);
    groups.get(o.track)!.push(o);
  }
  return Array.from(groups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([track, items]) => ({
      track,
      overlays: items.sort((a, b) => a.timeline_pos - b.timeline_pos),
    }));
}

function findNextPending(cuts: Cut[], afterId: string | null): string | null {
  if (!cuts.length) return null;
  const idx = afterId ? cuts.findIndex((c) => c.id === afterId) : -1;
  for (let i = idx + 1; i < cuts.length; i++) {
    if (cuts[i].status === "pending") return cuts[i].id;
  }
  for (let i = 0; i <= idx; i++) {
    if (cuts[i].status === "pending") return cuts[i].id;
  }
  return null;
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  slug: "",
  projectInfo: null,
  cuts: [],
  overlays: [],
  selectedCutId: null,
  selectedOverlayId: null,
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  playbackRate: 1,
  zoom: 50,
  filterStatus: "all",
  previewEndTime: null,
  undoStack: [],
  redoStack: [],
  toasts: [],
  showShortcuts: false,

  setSlug: (slug) => set({ slug }),
  setProjectInfo: (info) => set({ projectInfo: info }),
  loadCuts: (cuts) => set({ cuts, undoStack: [], redoStack: [] }),
  loadOverlays: (overlays) => set({ overlays, undoStack: [], redoStack: [] }),

  approveCut: (id) => {
    set(
      produce((s: EditorState) => {
        pushUndo(s);
        const cut = s.cuts.find((c) => c.id === id);
        if (cut) cut.status = "approved";
      })
    );
    const next = findNextPending(get().cuts, id);
    if (next && next !== id) {
      get().selectCut(next);
      const c = get().cuts.find((x) => x.id === next);
      if (c) set({ currentTime: effectiveIn(c) });
    }
  },

  rejectCut: (id, note) => {
    set(
      produce((s: EditorState) => {
        pushUndo(s);
        const cut = s.cuts.find((c) => c.id === id);
        if (cut) {
          cut.status = "rejected";
          if (note) cut.dayner_note = note;
        }
      })
    );
    const next = findNextPending(get().cuts, id);
    if (next && next !== id) {
      get().selectCut(next);
      const c = get().cuts.find((x) => x.id === next);
      if (c) set({ currentTime: effectiveIn(c) });
    }
  },

  adjustCut: (id, newIn, newOut) =>
    set(
      produce((s: EditorState) => {
        pushUndo(s);
        const cut = s.cuts.find((c) => c.id === id);
        if (cut) {
          cut.status = "adjusted";
          cut.adjusted_in = newIn;
          cut.adjusted_out = newOut;
        }
      })
    ),

  approveAll: () =>
    set(
      produce((s: EditorState) => {
        pushUndo(s);
        for (const cut of s.cuts) {
          if (cut.status === "pending") cut.status = "approved";
        }
      })
    ),

  approveAllByType: (type) =>
    set(
      produce((s: EditorState) => {
        pushUndo(s);
        for (const cut of s.cuts) {
          if (cut.status === "pending" && cut.cut_type === type) {
            cut.status = "approved";
          }
        }
      })
    ),

  splitAtPlayhead: () => {
    const { cuts, currentTime, duration } = get();
    if (duration <= 0 || currentTime < 0 || currentTime >= duration) return null;
    const inside = cuts.find((c) => {
      const inT = effectiveIn(c);
      const outT = effectiveOut(c);
      return currentTime >= inT && currentTime < outT;
    });
    if (inside) return null;
    const halfSpan = 0.25;
    const newIn = Math.max(0, currentTime - halfSpan);
    const newOut = Math.min(duration, currentTime + halfSpan);
    const newId = `manual_${Date.now()}`;
    const newCut: Cut = {
      id: newId,
      cut_type: "manual",
      time_in: newIn,
      time_out: newOut,
      reason: "corte manual (split no playhead)",
      confidence: 1.0,
      status: "approved",
      adjusted_in: null,
      adjusted_out: null,
      dayner_note: null,
    };
    set(
      produce((s: EditorState) => {
        pushUndo(s);
        s.cuts.push(newCut);
        s.cuts.sort((a, b) => effectiveIn(a) - effectiveIn(b));
        s.selectedCutId = newId;
      })
    );
    return newId;
  },

  removeCut: (id) =>
    set(
      produce((s: EditorState) => {
        pushUndo(s);
        const idx = s.cuts.findIndex((c) => c.id === id);
        if (idx >= 0) {
          s.cuts.splice(idx, 1);
          if (s.selectedCutId === id) s.selectedCutId = null;
        }
      })
    ),

  // --- Overlay actions ---

  addOverlay: (overlay) =>
    set(
      produce((s: EditorState) => {
        pushUndo(s);
        s.overlays.push(overlay);
      })
    ),

  updateOverlay: (id, patch) =>
    set(
      produce((s: EditorState) => {
        pushUndo(s);
        const ov = s.overlays.find((o) => o.id === id);
        if (ov) Object.assign(ov, patch);
      })
    ),

  moveOverlay: (id, newTrack, newPos) =>
    set(
      produce((s: EditorState) => {
        pushUndo(s);
        const ov = s.overlays.find((o) => o.id === id);
        if (ov) {
          ov.track = Math.max(2, newTrack);
          ov.timeline_pos = Math.max(0, newPos);
        }
      })
    ),

  removeOverlay: (id) =>
    set(
      produce((s: EditorState) => {
        pushUndo(s);
        const idx = s.overlays.findIndex((o) => o.id === id);
        if (idx >= 0) {
          s.overlays.splice(idx, 1);
          if (s.selectedOverlayId === id) s.selectedOverlayId = null;
        }
      })
    ),

  selectOverlay: (id) => set({ selectedOverlayId: id, selectedCutId: null, previewEndTime: null }),

  // --- Selection / navigation ---

  selectCut: (id) => set({ selectedCutId: id, selectedOverlayId: null, previewEndTime: null }),

  selectNextCut: () => {
    const { cuts, selectedCutId, filterStatus } = get();
    const visible = filterCuts(cuts, filterStatus);
    if (!visible.length) return;
    const idx = visible.findIndex((c) => c.id === selectedCutId);
    const next = idx < visible.length - 1 ? idx + 1 : 0;
    set({ selectedCutId: visible[next].id, selectedOverlayId: null });
  },

  selectPrevCut: () => {
    const { cuts, selectedCutId, filterStatus } = get();
    const visible = filterCuts(cuts, filterStatus);
    if (!visible.length) return;
    const idx = visible.findIndex((c) => c.id === selectedCutId);
    const prev = idx > 0 ? idx - 1 : visible.length - 1;
    set({ selectedCutId: visible[prev].id, selectedOverlayId: null });
  },

  selectNextPending: () => {
    const next = findNextPending(get().cuts, get().selectedCutId);
    if (next) {
      get().selectCut(next);
      const c = get().cuts.find((x) => x.id === next);
      if (c) set({ currentTime: effectiveIn(c) });
    }
  },

  setCurrentTime: (t) => set({ currentTime: t }),
  setDuration: (d) => set({ duration: d }),
  setIsPlaying: (p) => {
    if (!p) set({ previewEndTime: null });
    set({ isPlaying: p });
  },
  setPlaybackRate: (r) => set({ playbackRate: r }),
  setPreviewEndTime: (t) => set({ previewEndTime: t }),

  previewRegion: (cutId) => {
    const targetId = cutId ?? get().selectedCutId;
    if (!targetId) return;
    const cut = get().cuts.find((c) => c.id === targetId);
    if (!cut) return;
    const inT = effectiveIn(cut);
    const outT = effectiveOut(cut);
    set({
      currentTime: Math.max(0, inT - 0.1),
      previewEndTime: outT,
      isPlaying: true,
    });
  },

  setFilterStatus: (s) => set({ filterStatus: s }),

  setZoom: (z) => set({ zoom: Math.max(10, Math.min(200, z)) }),

  undo: () =>
    set(
      produce((s: EditorState) => {
        const prev = s.undoStack.pop();
        if (prev) {
          s.redoStack.push(snapshot(s));
          s.cuts = prev.cuts;
          s.overlays = prev.overlays;
        }
      })
    ),

  redo: () =>
    set(
      produce((s: EditorState) => {
        const next = s.redoStack.pop();
        if (next) {
          s.undoStack.push(snapshot(s));
          s.cuts = next.cuts;
          s.overlays = next.overlays;
        }
      })
    ),

  pushToast: (message, kind = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set(
      produce((s: EditorState) => {
        s.toasts.push({ id, message, kind });
      })
    );
    setTimeout(() => {
      set(
        produce((s: EditorState) => {
          s.toasts = s.toasts.filter((t) => t.id !== id);
        })
      );
    }, 3000);
  },

  dismissToast: (id) =>
    set(
      produce((s: EditorState) => {
        s.toasts = s.toasts.filter((t) => t.id !== id);
      })
    ),

  toggleShortcuts: () => set({ showShortcuts: !get().showShortcuts }),
}));
