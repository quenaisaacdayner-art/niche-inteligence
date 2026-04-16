import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "../src/stores/editor";
import type { Cut } from "../src/types";

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

describe("editor store", () => {
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
