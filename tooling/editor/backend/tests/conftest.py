import json
import pytest
from pathlib import Path


@pytest.fixture
def project_root(tmp_path: Path) -> Path:
    """Create a mock project structure mimicking niche-intelligence layout."""
    slug_dir = tmp_path / "data" / "video-processed" / "test-video"
    slug_dir.mkdir(parents=True)

    cuts = [
        {"in": 3.2, "out": 5.8, "reason": "retake: repeated 'basicamente'", "confidence": 0.92},
        {"in": 12.0, "out": 14.5, "reason": "retake: false start", "confidence": 0.87},
    ]
    (slug_dir / "cuts_retakes.json").write_text(json.dumps(cuts))

    gaps = [
        {"in": 20.0, "out": 23.5, "reason": "silence 3.5s"},
        {"in": 28.0, "out": 32.0, "reason": "silence 4.0s"},
    ]
    (slug_dir / "gaps.json").write_text(json.dumps(gaps))

    (slug_dir / "sync.json").write_text(json.dumps({"offset_screen_seconds": 0.5}))

    # Create dummy video files (empty, just for existence checks)
    (slug_dir / "face_clean.mp4").write_bytes(b"\x00")
    (slug_dir / "screen_clean.mp4").write_bytes(b"\x00")

    # Memory dir
    (tmp_path / "memory").mkdir()

    return tmp_path
