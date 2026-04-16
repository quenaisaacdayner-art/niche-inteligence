import json
import sys
from pathlib import Path
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient


# Add backend to path so imports work
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


# --- services.load_cuts / get_project_info / load_overlays ---

def test_load_cuts_merges_retakes_and_gaps(project_root: Path):
    with patch("services.get_project_root", return_value=project_root):
        from services import load_cuts
        cuts = load_cuts("test-video")

    assert len(cuts) == 4
    assert cuts[0].time_in == 3.2
    assert cuts[0].cut_type == "retake"
    assert cuts[2].cut_type == "gap"


def test_load_cuts_sorted_by_time(project_root: Path):
    with patch("services.get_project_root", return_value=project_root):
        from services import load_cuts
        cuts = load_cuts("test-video")

    times = [c.time_in for c in cuts]
    assert times == sorted(times)


def test_get_project_info_with_master_and_overlay(project_root: Path):
    with patch("services.get_project_root", return_value=project_root):
        from services import get_project_info
        info = get_project_info("test-video")

    assert info["slug"] == "test-video"
    assert info["master"] == {"file": "master.mp4"}
    assert info["has_body"] is False
    assert len(info["overlays"]) == 1
    ov = info["overlays"][0]
    assert ov["id"] == "ovl_broll1_10000_0"
    assert ov["file"] == "broll1.mp4"
    assert ov["track"] == 2
    assert ov["timeline_pos"] == 10.0


def test_get_project_info_no_master(project_root: Path):
    """Slug dir exists but has no master.mp4 — master should be None."""
    slug_dir = project_root / "data" / "video-processed" / "no-master"
    slug_dir.mkdir(parents=True)

    with patch("services.get_project_root", return_value=project_root):
        from services import get_project_info
        info = get_project_info("no-master")

    assert info["master"] is None
    assert info["overlays"] == []


def test_load_overlays_empty(project_root: Path):
    """Missing overlays.json returns empty list."""
    slug_dir = project_root / "data" / "video-processed" / "empty"
    slug_dir.mkdir(parents=True)

    with patch("services.get_project_root", return_value=project_root):
        from services import load_overlays
        overlays = load_overlays("empty")

    assert overlays == []


def test_save_overlays_round_trip(project_root: Path):
    with patch("services.get_project_root", return_value=project_root):
        from services import load_overlays, save_overlays
        from models import Overlay

        overlays = [
            Overlay(
                id="a",
                file="a.mp4",
                track=2,
                timeline_pos=0.0,
                time_in=0.0,
                time_out=10.0,
            ),
            Overlay(
                id="b",
                file="b.mp4",
                track=3,
                timeline_pos=20.0,
                time_in=1.0,
                time_out=8.0,
                position="fullscreen",
            ),
        ]
        save_overlays("round-trip", overlays)
        loaded = load_overlays("round-trip")

    assert len(loaded) == 2
    assert loaded[0].id == "a"
    assert loaded[1].track == 3
    assert loaded[1].position == "fullscreen"


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


# --- API endpoint integration ---

@pytest.fixture
def app(project_root: Path):
    """Create FastAPI app with mocked project root."""
    with patch("services.get_project_root", return_value=project_root):
        with patch("server.get_project_root", return_value=project_root):
            from server import app as fastapi_app
            yield fastapi_app


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_get_project(client):
    resp = await client.get("/api/project/test-video")
    assert resp.status_code == 200
    data = resp.json()
    assert data["slug"] == "test-video"
    assert data["master"] == {"file": "master.mp4"}
    assert len(data["overlays"]) == 1


@pytest.mark.asyncio
async def test_get_cuts(client):
    resp = await client.get("/api/cuts/test-video")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 4
    assert data[0]["cut_type"] in ("retake", "gap", "filler")


@pytest.mark.asyncio
async def test_save_cuts(client):
    resp = await client.get("/api/cuts/test-video")
    cuts = resp.json()
    cuts[0]["status"] = "approved"

    resp = await client.post("/api/cuts/test-video/save", json={"cuts": cuts})
    assert resp.status_code == 200
    assert resp.json()["saved"] == 1


@pytest.mark.asyncio
async def test_get_overlays(client):
    resp = await client.get("/api/overlays/test-video")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["id"] == "ovl_broll1_10000_0"


@pytest.mark.asyncio
async def test_save_overlays(client):
    resp = await client.get("/api/overlays/test-video")
    overlays = resp.json()
    overlays[0]["track"] = 3
    overlays[0]["timeline_pos"] = 55.0

    resp = await client.post("/api/overlays/test-video/save", json={"overlays": overlays})
    assert resp.status_code == 200
    assert resp.json()["saved"] == 1

    # Verify persistence
    resp = await client.get("/api/overlays/test-video")
    after = resp.json()
    assert after[0]["track"] == 3
    assert after[0]["timeline_pos"] == 55.0


@pytest.mark.asyncio
async def test_delete_overlay(client):
    resp = await client.delete("/api/overlays/test-video/ovl_broll1_10000_0")
    assert resp.status_code == 200
    assert resp.json()["deleted"] == "ovl_broll1_10000_0"

    resp = await client.get("/api/overlays/test-video")
    assert resp.json() == []


@pytest.mark.asyncio
async def test_delete_overlay_not_found(client):
    resp = await client.delete("/api/overlays/test-video/doesnotexist")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_upload_master_new(client, project_root):
    slug_dir = project_root / "data" / "video-processed" / "upload-master"
    slug_dir.mkdir(parents=True)
    payload = b"\x00\x00\x00\x20ftypisom\x00"
    files = {"file": ("recording.mp4", payload, "video/mp4")}
    resp = await client.post("/api/upload/upload-master/master", files=files)
    assert resp.status_code == 200
    assert resp.json()["file"] == "master.mp4"
    assert (slug_dir / "master.mp4").exists()


@pytest.mark.asyncio
async def test_upload_master_conflict_without_replace(client):
    payload = b"\x00"
    files = {"file": ("recording.mp4", payload, "video/mp4")}
    # test-video slug already has master.mp4 from fixture
    resp = await client.post("/api/upload/test-video/master", files=files)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_upload_master_rejects_non_mp4(client):
    files = {"file": ("recording.txt", b"not a video", "text/plain")}
    resp = await client.post("/api/upload/test-video/master", files=files, params={"replace": "true"})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_upload_overlay_creates_entry(client, project_root):
    slug_dir = project_root / "data" / "video-processed" / "upload-ovl"
    slug_dir.mkdir(parents=True)
    (slug_dir / "master.mp4").write_bytes(b"\x00")

    payload = b"\x00" * 512
    files = {"file": ("broll_new.mp4", payload, "video/mp4")}
    resp = await client.post(
        "/api/upload/upload-ovl/overlay",
        files=files,
        params={"track": 3, "timeline_pos": 12.5},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["file"] == "broll_new.mp4"
    assert data["track"] == 3
    assert data["timeline_pos"] == 12.5

    # File landed in overlays/ subdir and is in overlays.json
    assert (slug_dir / "overlays" / "broll_new.mp4").exists()
    overlays_json = json.loads((slug_dir / "overlays.json").read_text())
    assert len(overlays_json) == 1


@pytest.mark.asyncio
async def test_upload_overlay_duplicate_filename_renamed(client, project_root):
    slug_dir = project_root / "data" / "video-processed" / "dup-ovl"
    (slug_dir / "overlays").mkdir(parents=True)
    (slug_dir / "overlays" / "clip.mp4").write_bytes(b"\x00")

    files = {"file": ("clip.mp4", b"\x00" * 100, "video/mp4")}
    resp = await client.post("/api/upload/dup-ovl/overlay", files=files)
    assert resp.status_code == 200
    assert resp.json()["file"] == "clip_1.mp4"


@pytest.mark.asyncio
async def test_post_correction(client):
    correction = {
        "video_slug": "test-video",
        "date": "2026-04-16",
        "cut_type": "retake",
        "time_in": 3.2,
        "time_out": 5.8,
        "claude_reason": "retake: repeated word",
        "transcript_context": "basicamente basicamente",
        "action": "rejected",
        "dayner_note": "era enfase",
    }
    resp = await client.post("/api/corrections/test-video", json=correction)
    assert resp.status_code == 200
