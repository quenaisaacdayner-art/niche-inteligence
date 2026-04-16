export type CutType = "retake" | "gap" | "filler" | "manual";

export type CutStatus = "pending" | "approved" | "rejected" | "adjusted";

export type FilterStatus = "all" | "pending" | "rejected";

export type PlaybackRate = 0.5 | 1 | 1.5 | 2;

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
  /** Source track this cut applies to. "both" = face+screen (default for gaps/retakes). */
  source?: "face" | "screen" | "both";
}

export interface ProjectInfo {
  slug: string;
  has_face_clean: boolean;
  has_screen_clean: boolean;
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
