import json
from pathlib import Path
from unittest.mock import patch


def test_load_cuts_merges_retakes_and_gaps(project_root: Path):
    with patch("services.get_project_root", return_value=project_root):
        from services import load_cuts
        cuts = load_cuts("test-video")

    assert len(cuts) == 4  # 2 retakes + 2 gaps
    assert cuts[0].time_in == 3.2  # sorted by time
    assert cuts[0].cut_type == "retake"
    assert cuts[2].cut_type == "gap"


def test_load_cuts_sorted_by_time(project_root: Path):
    with patch("services.get_project_root", return_value=project_root):
        from services import load_cuts
        cuts = load_cuts("test-video")

    times = [c.time_in for c in cuts]
    assert times == sorted(times)


def test_get_project_info(project_root: Path):
    with patch("services.get_project_root", return_value=project_root):
        from services import get_project_info
        info = get_project_info("test-video")

    assert info["slug"] == "test-video"
    assert info["has_face_clean"] is True
    assert info["has_screen_clean"] is True
    assert info["has_body"] is False


def test_append_correction(project_root: Path):
    with patch("services.get_project_root", return_value=project_root):
        from services import append_correction
        from models import Correction

        correction = Correction(
            video_slug="test-video",
            date="2026-04-16",
            cut_type="retake",
            time_in=3.2,
            time_out=5.8,
            claude_reason="retake: repeated word",
            transcript_context="basicamente basicamente isso",
            action="rejected",
            dayner_note="nao era retake, era enfase",
        )
        append_correction(correction)

    jsonl_path = project_root / "memory" / "video-cut-corrections.jsonl"
    assert jsonl_path.exists()
    line = json.loads(jsonl_path.read_text().strip())
    assert line["action"] == "rejected"
    assert line["dayner_note"] == "nao era retake, era enfase"
