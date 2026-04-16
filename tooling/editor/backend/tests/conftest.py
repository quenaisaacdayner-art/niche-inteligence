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

    # Master file (the single primary video)
    (slug_dir / "master.mp4").write_bytes(b"\x00")

    # Overlays subfolder + one sample overlay + overlays.json
    overlays_dir = slug_dir / "overlays"
    overlays_dir.mkdir()
    (overlays_dir / "broll1.mp4").write_bytes(b"\x00")

    overlays = [
        {
            "id": "ovl_broll1_10000_0",
            "file": "broll1.mp4",
            "track": 2,
            "timeline_pos": 10.0,
            "time_in": 0.0,
            "time_out": 5.0,
            "position": "pip",
            "mute": True,
            "volume": 1.0,
            "x_pct": None,
            "y_pct": None,
            "width_pct": None,
        }
    ]
    (slug_dir / "overlays.json").write_text(json.dumps(overlays))

    # Memory dir
    (tmp_path / "memory").mkdir()

    return tmp_path
