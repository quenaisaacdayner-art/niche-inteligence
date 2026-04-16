import { describe, it, expect, beforeEach } from "vitest";
import {
  useEditorStore,
  deriveSkipList,
  filterCuts,
  findActiveOverlays,
  overlaysByTrack,
} from "../src/stores/editor";
import type { Cut, Overlay } from "../src/types";

const makeCut = (id: string, time_in: number, overrides?: Partial<Cut>): Cut => ({
  id,
  cut_type: "retake",
  time_in,
  time_out: time_in + 2,
  reason: "test",
  confidence: 0.9,
  status: "pending",
  adjusted_in: null,
  adjusted_out: null,
  dayner_note: null,
  ...overrides,
});

const makeOverlay = (id: string, timeline_pos: number, overrides?: Partial<Overlay>): Overlay => ({
  id,
  file: `${id}.mp4`,
  track: 2,
  timeline_pos,
  time_in: 0,
  time_out: 5,
  position: "pip",
  mute: true,
  volume: 1.0,
  x_pct: null,
  y_pct: null,
  width_pct: null,
  ...overrides,
});

describe("editor store — core cut actions", () => {
  beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState());
  });

  it("loads cuts", () => {
    const cuts = [makeCut("r_0", 3.2), makeCut("g_0", 8.0, { cut_type: "gap" })];
    useEditorStore.getState().loadCuts(cuts);
    expect(useEditorStore.getState().cuts).toHaveLength(2);
  });

  it("approves a cut", () => {
    useEditorStore.getState().loadCuts([makeCut("r_0", 3.2)]);
    useEditorStore.getState().approveCut("r_0");
    expect(useEditorStore.getState().cuts[0].status).toBe("approved");
  });

  it("rejects a cut with note", () => {
    useEditorStore.getState().loadCuts([makeCut("r_0", 3.2)]);
    useEditorStore.getState().rejectCut("r_0", "era enfase");
    const cut = useEditorStore.getState().cuts[0];
    expect(cut.status).toBe("rejected");
    expect(cut.dayner_note).toBe("era enfase");
  });

  it("adjusts cut in/out", () => {
    useEditorStore.getState().loadCuts([makeCut("r_0", 3.2)]);
    useEditorStore.getState().adjustCut("r_0", 3.5, 5.0);
    const cut = useEditorStore.getState().cuts[0];
    expect(cut.status).toBe("adjusted");
    expect(cut.adjusted_in).toBe(3.5);
    expect(cut.adjusted_out).toBe(5.0);
  });

  it("undo reverts last action", () => {
    useEditorStore.getState().loadCuts([makeCut("r_0", 3.2)]);
    useEditorStore.getState().approveCut("r_0");
    expect(useEditorStore.getState().cuts[0].status).toBe("approved");
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().cuts[0].status).toBe("pending");
  });

  it("redo restores undone action", () => {
    useEditorStore.getState().loadCuts([makeCut("r_0", 3.2)]);
    useEditorStore.getState().approveCut("r_0");
    useEditorStore.getState().undo();
    useEditorStore.getState().redo();
    expect(useEditorStore.getState().cuts[0].status).toBe("approved");
  });

  it("approves all pending cuts", () => {
    useEditorStore.getState().loadCuts([
      makeCut("r_0", 3.2),
      makeCut("g_0", 8.0, { cut_type: "gap" }),
    ]);
    useEditorStore.getState().approveAll();
    const { cuts } = useEditorStore.getState();
    expect(cuts.every((c) => c.status === "approved")).toBe(true);
  });

  it("selects next/prev cut", () => {
    useEditorStore.getState().loadCuts([makeCut("r_0", 3.2), makeCut("g_0", 8.0)]);
    useEditorStore.getState().selectCut("r_0");
    expect(useEditorStore.getState().selectedCutId).toBe("r_0");

    useEditorStore.getState().selectNextCut();
    expect(useEditorStore.getState().selectedCutId).toBe("g_0");

    useEditorStore.getState().selectPrevCut();
    expect(useEditorStore.getState().selectedCutId).toBe("r_0");
  });
});

describe("editor store — virtual cut (skipList)", () => {
  beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState());
  });

  it("deriveSkipList includes only approved/adjusted", () => {
    const cuts: Cut[] = [
      makeCut("a", 1, { status: "approved" }),
      makeCut("b", 5, { status: "pending" }),
      makeCut("c", 10, { status: "rejected" }),
      makeCut("d", 15, { status: "adjusted", adjusted_in: 16, adjusted_out: 18 }),
    ];
    const list = deriveSkipList(cuts);
    expect(list).toHaveLength(2);
    expect(list[0].cutId).toBe("a");
    expect(list[1].cutId).toBe("d");
  });

  it("deriveSkipList uses adjusted_in/out when set", () => {
    const cuts: Cut[] = [
      makeCut("a", 1, { status: "adjusted", adjusted_in: 2, adjusted_out: 4 }),
    ];
    const list = deriveSkipList(cuts);
    expect(list[0].in).toBe(2);
    expect(list[0].out).toBe(4);
  });

  it("deriveSkipList is sorted by start time", () => {
    const cuts: Cut[] = [
      makeCut("z", 20, { status: "approved" }),
      makeCut("a", 5, { status: "approved" }),
      makeCut("m", 12, { status: "approved" }),
    ];
    const list = deriveSkipList(cuts);
    expect(list.map((r) => r.in)).toEqual([5, 12, 20]);
  });
});

describe("editor store — manual cuts (split at playhead)", () => {
  beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState());
  });

  it("splitAtPlayhead creates a manual cut at current time", () => {
    useEditorStore.setState({ currentTime: 10, duration: 60 });
    const newId = useEditorStore.getState().splitAtPlayhead();
    expect(newId).not.toBeNull();

    const cut = useEditorStore.getState().cuts.find((c) => c.id === newId);
    expect(cut?.cut_type).toBe("manual");
    expect(cut?.status).toBe("approved");
    expect(cut?.time_in).toBeCloseTo(9.75, 2);
    expect(cut?.time_out).toBeCloseTo(10.25, 2);
  });

  it("splitAtPlayhead refuses when inside another cut", () => {
    useEditorStore.getState().loadCuts([
      makeCut("a", 5, { time_out: 10, status: "approved" }),
    ]);
    useEditorStore.setState({ currentTime: 7, duration: 60 });
    const newId = useEditorStore.getState().splitAtPlayhead();
    expect(newId).toBeNull();
  });

  it("splitAtPlayhead refuses outside video duration", () => {
    useEditorStore.setState({ currentTime: 120, duration: 60 });
    expect(useEditorStore.getState().splitAtPlayhead()).toBeNull();
  });

  it("removeCut deletes a cut", () => {
    useEditorStore.getState().loadCuts([makeCut("r_0", 3.2)]);
    useEditorStore.getState().removeCut("r_0");
    expect(useEditorStore.getState().cuts).toHaveLength(0);
  });
});

describe("editor store — auto-advance after approve/reject", () => {
  beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState());
  });

  it("approveCut auto-advances to next pending", () => {
    useEditorStore.getState().loadCuts([
      makeCut("a", 1),
      makeCut("b", 5),
      makeCut("c", 10),
    ]);
    useEditorStore.getState().selectCut("a");
    useEditorStore.getState().approveCut("a");
    expect(useEditorStore.getState().selectedCutId).toBe("b");
  });

  it("rejectCut auto-advances to next pending", () => {
    useEditorStore.getState().loadCuts([
      makeCut("a", 1),
      makeCut("b", 5),
    ]);
    useEditorStore.getState().selectCut("a");
    useEditorStore.getState().rejectCut("a");
    expect(useEditorStore.getState().selectedCutId).toBe("b");
  });

  it("auto-advance wraps to first pending", () => {
    useEditorStore.getState().loadCuts([
      makeCut("a", 1, { status: "approved" }),
      makeCut("b", 5),
      makeCut("c", 10, { status: "rejected" }),
    ]);
    useEditorStore.getState().selectCut("c");
    useEditorStore.getState().approveCut("c");
    expect(useEditorStore.getState().selectedCutId).toBe("b");
  });
});

describe("editor store — filters", () => {
  beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState());
  });

  it("filterCuts returns pending only", () => {
    const cuts: Cut[] = [
      makeCut("a", 1, { status: "pending" }),
      makeCut("b", 5, { status: "approved" }),
      makeCut("c", 10, { status: "rejected" }),
    ];
    expect(filterCuts(cuts, "pending")).toHaveLength(1);
    expect(filterCuts(cuts, "pending")[0].id).toBe("a");
  });

  it("filterCuts returns rejected only", () => {
    const cuts: Cut[] = [
      makeCut("a", 1, { status: "pending" }),
      makeCut("b", 5, { status: "rejected" }),
    ];
    expect(filterCuts(cuts, "rejected")).toHaveLength(1);
    expect(filterCuts(cuts, "rejected")[0].id).toBe("b");
  });

  it("filterCuts all returns everything", () => {
    const cuts: Cut[] = [
      makeCut("a", 1, { status: "pending" }),
      makeCut("b", 5, { status: "approved" }),
    ];
    expect(filterCuts(cuts, "all")).toHaveLength(2);
  });
});

describe("editor store — preview region", () => {
  beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState());
  });

  it("previewRegion sets currentTime and previewEndTime", () => {
    useEditorStore.getState().loadCuts([makeCut("a", 10, { time_out: 15 })]);
    useEditorStore.getState().selectCut("a");
    useEditorStore.getState().previewRegion();
    const state = useEditorStore.getState();
    expect(state.currentTime).toBeCloseTo(9.9, 1);
    expect(state.previewEndTime).toBe(15);
    expect(state.isPlaying).toBe(true);
  });

  it("setIsPlaying(false) clears previewEndTime", () => {
    useEditorStore.getState().loadCuts([makeCut("a", 10, { time_out: 15 })]);
    useEditorStore.getState().selectCut("a");
    useEditorStore.getState().previewRegion();
    useEditorStore.getState().setIsPlaying(false);
    expect(useEditorStore.getState().previewEndTime).toBeNull();
  });
});

describe("editor store — playback rate", () => {
  beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState());
  });

  it("setPlaybackRate updates rate", () => {
    useEditorStore.getState().setPlaybackRate(1.5);
    expect(useEditorStore.getState().playbackRate).toBe(1.5);
  });
});

describe("editor store — project info", () => {
  beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState());
  });

  it("starts with null projectInfo", () => {
    expect(useEditorStore.getState().projectInfo).toBeNull();
  });

  it("setProjectInfo records master + overlays", () => {
    useEditorStore.getState().setProjectInfo({
      slug: "demo",
      master: { file: "master.mp4" },
      overlays: [makeOverlay("a", 0)],
      has_body: false,
      data_dir: "/tmp/demo",
    });
    const info = useEditorStore.getState().projectInfo;
    expect(info?.master?.file).toBe("master.mp4");
    expect(info?.overlays).toHaveLength(1);
  });

  it("accepts projectInfo null (fetch failed)", () => {
    useEditorStore.getState().setProjectInfo(null);
    expect(useEditorStore.getState().projectInfo).toBeNull();
  });
});

describe("editor store — overlay actions", () => {
  beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState());
  });

  it("loadOverlays populates overlays and resets history", () => {
    useEditorStore.getState().loadOverlays([makeOverlay("a", 5), makeOverlay("b", 20)]);
    const state = useEditorStore.getState();
    expect(state.overlays).toHaveLength(2);
    expect(state.undoStack).toHaveLength(0);
  });

  it("addOverlay appends to list and supports undo", () => {
    useEditorStore.getState().loadOverlays([]);
    useEditorStore.getState().addOverlay(makeOverlay("new", 10));
    expect(useEditorStore.getState().overlays).toHaveLength(1);
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().overlays).toHaveLength(0);
  });

  it("updateOverlay patches fields", () => {
    useEditorStore.getState().loadOverlays([makeOverlay("a", 0, { mute: true, volume: 0.5 })]);
    useEditorStore.getState().updateOverlay("a", { mute: false, volume: 1.0 });
    const ov = useEditorStore.getState().overlays[0];
    expect(ov.mute).toBe(false);
    expect(ov.volume).toBe(1.0);
  });

  it("moveOverlay changes track and timeline_pos, clamps to min track=2 and pos>=0", () => {
    useEditorStore.getState().loadOverlays([makeOverlay("a", 10)]);
    useEditorStore.getState().moveOverlay("a", 3, 25);
    let ov = useEditorStore.getState().overlays[0];
    expect(ov.track).toBe(3);
    expect(ov.timeline_pos).toBe(25);

    useEditorStore.getState().moveOverlay("a", 1, -5); // below minimum
    ov = useEditorStore.getState().overlays[0];
    expect(ov.track).toBe(2);
    expect(ov.timeline_pos).toBe(0);
  });

  it("removeOverlay deletes by id and clears selection if selected", () => {
    useEditorStore.getState().loadOverlays([makeOverlay("a", 0), makeOverlay("b", 10)]);
    useEditorStore.getState().selectOverlay("a");
    useEditorStore.getState().removeOverlay("a");
    expect(useEditorStore.getState().overlays.map((o) => o.id)).toEqual(["b"]);
    expect(useEditorStore.getState().selectedOverlayId).toBeNull();
  });

  it("selectOverlay clears selected cut", () => {
    useEditorStore.getState().loadCuts([makeCut("c_0", 0)]);
    useEditorStore.getState().loadOverlays([makeOverlay("o_0", 0)]);
    useEditorStore.getState().selectCut("c_0");
    useEditorStore.getState().selectOverlay("o_0");
    expect(useEditorStore.getState().selectedCutId).toBeNull();
    expect(useEditorStore.getState().selectedOverlayId).toBe("o_0");
  });

  it("undo restores both cuts and overlays", () => {
    useEditorStore.getState().loadCuts([makeCut("c", 0)]);
    useEditorStore.getState().loadOverlays([makeOverlay("o", 0)]);
    useEditorStore.getState().addOverlay(makeOverlay("o2", 10));
    useEditorStore.getState().approveCut("c");
    expect(useEditorStore.getState().overlays).toHaveLength(2);
    expect(useEditorStore.getState().cuts[0].status).toBe("approved");
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().cuts[0].status).toBe("pending");
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().overlays).toHaveLength(1);
  });
});

describe("editor store — overlay helpers", () => {
  it("findActiveOverlays returns only overlays covering current time", () => {
    const overlays = [
      makeOverlay("a", 0, { time_in: 0, time_out: 10 }),      // 0-10
      makeOverlay("b", 5, { time_in: 0, time_out: 3 }),        // 5-8
      makeOverlay("c", 12, { time_in: 0, time_out: 5 }),       // 12-17
    ];
    expect(findActiveOverlays(overlays, 6).map((o) => o.id).sort()).toEqual(["a", "b"]);
    expect(findActiveOverlays(overlays, 15).map((o) => o.id)).toEqual(["c"]);
    expect(findActiveOverlays(overlays, 20)).toEqual([]);
  });

  it("overlaysByTrack groups by track and sorts tracks ascending", () => {
    const overlays = [
      makeOverlay("a", 0, { track: 3 }),
      makeOverlay("b", 10, { track: 2 }),
      makeOverlay("c", 5, { track: 2 }),
    ];
    const groups = overlaysByTrack(overlays);
    expect(groups.map((g) => g.track)).toEqual([2, 3]);
    // Track 2 overlays sorted by timeline_pos
    expect(groups[0].overlays.map((o) => o.id)).toEqual(["c", "b"]);
  });
});

describe("editor store — toasts", () => {
  beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState());
  });

  it("pushToast adds a toast", () => {
    useEditorStore.getState().pushToast("test", "success");
    const toasts = useEditorStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe("test");
    expect(toasts[0].kind).toBe("success");
  });

  it("dismissToast removes toast", () => {
    useEditorStore.getState().pushToast("test");
    const id = useEditorStore.getState().toasts[0].id;
    useEditorStore.getState().dismissToast(id);
    expect(useEditorStore.getState().toasts).toHaveLength(0);
  });
});
