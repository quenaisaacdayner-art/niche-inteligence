export type CutType = "retake" | "gap" | "filler" | "manual";

export type CutStatus = "pending" | "approved" | "rejected" | "adjusted";

export type FilterStatus = "all" | "pending" | "rejected";

export type PlaybackRate = 0.5 | 1 | 1.5 | 2;

export type OverlayPosition = "pip" | "fullscreen" | "custom";

export interface Cut {
  id: string;
  cut_type: CutType;
  time_in: number;
  time_out: number;
  reason: string;
  confidence: number;
  status: CutStatus;
  adjusted_in: number | null;
  adjusted_out: number | null;
  dayner_note: string | null;
  source?: "face" | "screen" | "both";
}

export interface Overlay {
  id: string;
  /** Filename under {slug}/overlays/ */
  file: string;
  /** Track index on the timeline. 1 = master (reserved); overlays use 2+. */
  track: number;
  /** Position on the master timeline (seconds) where the overlay starts. */
  timeline_pos: number;
  /** Trim start inside the overlay file (seconds). */
  time_in: number;
  /** Trim end inside the overlay file (seconds). */
  time_out: number;
  position: OverlayPosition;
  mute: boolean;
  volume: number;
  /** Custom position (0-100 percentages of the master video area). */
  x_pct?: number | null;
  y_pct?: number | null;
  width_pct?: number | null;
}

export interface ProjectInfo {
  slug: string;
  master: { file: string } | null;
  overlays: Overlay[];
  has_body: boolean;
  data_dir: string;
}

export interface Correction {
  video_slug: string;
  date: string;
  cut_type: string;
  time_in: number;
  time_out: number;
  claude_reason: string;
  transcript_context: string;
  action: "approved" | "rejected" | "adjusted" | "manual" | "deleted";
  adjusted_in: number | null;
  adjusted_out: number | null;
  dayner_note: string | null;
}

export interface Toast {
  id: string;
  message: string;
  kind: "info" | "success" | "error";
}

/** Derived skipList entry — used by VideoPlayer to skip approved cuts in real time. */
export interface SkipRange {
  in: number;
  out: number;
  cutId: string;
}
