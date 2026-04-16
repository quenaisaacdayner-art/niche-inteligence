export interface Cut {
  id: string;
  cut_type: "retake" | "gap" | "filler";
  time_in: number;
  time_out: number;
  reason: string;
  confidence: number;
  status: "pending" | "approved" | "rejected" | "adjusted";
  adjusted_in: number | null;
  adjusted_out: number | null;
  dayner_note: string | null;
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
  action: "approved" | "rejected" | "adjusted";
  adjusted_in: number | null;
  adjusted_out: number | null;
  dayner_note: string | null;
}
