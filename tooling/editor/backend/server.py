import asyncio
import shutil
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from models import Cut, Overlay, Correction, SaveCutsRequest, SaveOverlaysRequest, ComposeJob
from services import (
    get_project_root,
    get_slug_dir,
    get_overlays_dir,
    load_cuts,
    save_cuts,
    load_overlays,
    save_overlays,
    get_project_info,
    append_correction,
    get_fixture_dir,
    compute_keep_segments,
    compute_overlay_placements,
    build_compose_ffmpeg_args,
    probe_duration,
    probe_dimensions,
)


MAX_UPLOAD_BYTES = 500 * 1024 * 1024  # 500MB


# --- WebSocket connection manager ---

class ConnectionManager:
    def __init__(self):
        self.connections: dict[str, list[WebSocket]] = {}

    async def connect(self, slug: str, ws: WebSocket):
        await ws.accept()
        self.connections.setdefault(slug, []).append(ws)

    def disconnect(self, slug: str, ws: WebSocket):
        if slug in self.connections:
            self.connections[slug] = [c for c in self.connections[slug] if c != ws]

    async def notify(self, slug: str, message: dict):
        for ws in self.connections.get(slug, []):
            try:
                await ws.send_json(message)
            except Exception:
                pass


manager = ConnectionManager()


# --- File watcher ---

def start_watcher(app_instance: FastAPI):
    """Start watchdog observer for data directory OR fixture directory changes."""
    try:
        from watchdog.observers import Observer
        from watchdog.events import FileSystemEventHandler

        fixture = get_fixture_dir()
        use_fixture = fixture and fixture.exists()
        watched_root = fixture if use_fixture else get_project_root() / "data" / "video-processed"

        if not watched_root.exists():
            return None

        def resolve_slug(path: Path) -> str | None:
            if use_fixture:
                return watched_root.name
            parts = path.parts
            try:
                idx = parts.index("video-processed")
                return parts[idx + 1]
            except (ValueError, IndexError):
                return None

        class Handler(FileSystemEventHandler):
            def on_modified(self, event):
                if event.is_directory:
                    return
                path = Path(event.src_path)
                slug = resolve_slug(path)
                if not slug:
                    return
                loop = asyncio.get_event_loop()
                asyncio.run_coroutine_threadsafe(
                    manager.notify(slug, {"type": "file_changed", "file": path.name}),
                    loop,
                )

        observer = Observer()
        observer.schedule(Handler(), str(watched_root), recursive=True)
        observer.daemon = True
        observer.start()
        return observer
    except ImportError:
        pass
    return None


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    observer = start_watcher(app_instance)
    yield
    if observer:
        observer.stop()


# --- App ---

app = FastAPI(title="MVP Editor Visual", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount media directory. The overlays/ subfolder is served under /media/overlays/.
fixture_dir = get_fixture_dir()
if fixture_dir and fixture_dir.exists():
    app.mount("/media", StaticFiles(directory=str(fixture_dir)), name="media")
else:
    data_dir = get_project_root() / "data" / "video-processed"
    if data_dir.exists():
        app.mount("/media", StaticFiles(directory=str(data_dir)), name="media")


# --- Compose job tracking ---

compose_jobs: dict[str, ComposeJob] = {}


# --- Project info + cuts ---

@app.get("/api/project/{slug}")
def api_get_project(slug: str):
    return get_project_info(slug)


@app.get("/api/cuts/{slug}")
def api_get_cuts(slug: str) -> list[Cut]:
    return load_cuts(slug)


@app.post("/api/cuts/{slug}/save")
def api_save_cuts(slug: str, req: SaveCutsRequest):
    save_cuts(slug, req.cuts)
    non_pending = [c for c in req.cuts if c.status != "pending"]
    return {"saved": len(non_pending)}


@app.post("/api/cuts/{slug}/approve-all")
def api_approve_all(slug: str):
    cuts = load_cuts(slug)
    for c in cuts:
        if c.status == "pending":
            c.status = "approved"
    save_cuts(slug, cuts)
    return {"approved": len([c for c in cuts if c.status == "approved"])}


# --- Overlays ---

@app.get("/api/overlays/{slug}")
def api_get_overlays(slug: str) -> list[Overlay]:
    return load_overlays(slug)


@app.post("/api/overlays/{slug}/save")
def api_save_overlays(slug: str, req: SaveOverlaysRequest):
    save_overlays(slug, req.overlays)
    return {"saved": len(req.overlays)}


# --- Upload ---

async def _write_upload(dest: Path, upload: UploadFile) -> int:
    """Stream an upload to disk with a size cap. Returns bytes written."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    written = 0
    with open(dest, "wb") as f:
        while True:
            chunk = await upload.read(1024 * 1024)
            if not chunk:
                break
            written += len(chunk)
            if written > MAX_UPLOAD_BYTES:
                f.close()
                dest.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail=f"File exceeds {MAX_UPLOAD_BYTES} bytes")
            f.write(chunk)
    return written


@app.post("/api/upload/{slug}/master")
async def api_upload_master(slug: str, file: UploadFile, replace: bool = False):
    if not file.filename or not file.filename.lower().endswith(".mp4"):
        raise HTTPException(status_code=400, detail="Only .mp4 files are supported")
    slug_dir = get_slug_dir(slug)
    dest = slug_dir / "master.mp4"
    if dest.exists() and not replace:
        raise HTTPException(status_code=409, detail="master already exists; pass replace=true to overwrite")
    bytes_written = await _write_upload(dest, file)
    await manager.notify(slug, {"type": "file_changed", "file": "master.mp4"})
    return {"file": "master.mp4", "bytes": bytes_written}


@app.post("/api/upload/{slug}/overlay")
async def api_upload_overlay(slug: str, file: UploadFile, track: int = 2, timeline_pos: float = 0.0):
    if not file.filename or not file.filename.lower().endswith(".mp4"):
        raise HTTPException(status_code=400, detail="Only .mp4 files are supported")
    overlays_dir = get_overlays_dir(slug)
    # Sanitize filename to avoid collisions and path traversal
    safe_name = Path(file.filename).name
    stem = Path(safe_name).stem
    suffix = Path(safe_name).suffix
    dest = overlays_dir / safe_name
    counter = 1
    while dest.exists():
        dest = overlays_dir / f"{stem}_{counter}{suffix}"
        counter += 1
    bytes_written = await _write_upload(dest, file)

    duration = await probe_duration(dest)

    overlays = load_overlays(slug)
    overlay_id = f"ovl_{stem}_{int(timeline_pos * 1000)}_{len(overlays)}"
    overlay = Overlay(
        id=overlay_id,
        file=dest.name,
        track=max(2, track),
        timeline_pos=max(0.0, timeline_pos),
        time_in=0.0,
        time_out=duration if duration > 0 else 0.0,
        position="pip",
        mute=True,
        volume=1.0,
    )
    overlays.append(overlay)
    save_overlays(slug, overlays)
    await manager.notify(slug, {"type": "file_changed", "file": dest.name})
    return overlay.model_dump()


@app.delete("/api/overlays/{slug}/{overlay_id}")
async def api_delete_overlay(slug: str, overlay_id: str):
    overlays = load_overlays(slug)
    target = next((o for o in overlays if o.id == overlay_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="overlay not found")
    # Remove file
    file_path = get_overlays_dir(slug) / target.file
    file_path.unlink(missing_ok=True)
    remaining = [o for o in overlays if o.id != overlay_id]
    save_overlays(slug, remaining)
    await manager.notify(slug, {"type": "file_changed", "file": "overlays.json"})
    return {"deleted": overlay_id}


# --- Corrections ---

@app.post("/api/corrections/{slug}")
def api_post_correction(slug: str, correction: Correction):
    append_correction(correction)
    return {"status": "ok"}


# --- Compose ---

@app.post("/api/compose/{slug}")
async def api_compose(slug: str):
    """Apply approved cuts to master.mp4 via FFmpeg filter_complex."""
    job_id = str(uuid.uuid4())[:8]
    compose_jobs[job_id] = ComposeJob(job_id=job_id, status="running")

    async def run_compose():
        try:
            slug_dir = get_slug_dir(slug)
            body_path = slug_dir / "body.mp4"
            master_path = slug_dir / "master.mp4"

            if not master_path.exists():
                compose_jobs[job_id].status = "error"
                compose_jobs[job_id].error = "master.mp4 not found"
                return

            cuts = load_cuts(slug)
            duration = await probe_duration(master_path)
            if duration <= 0:
                compose_jobs[job_id].status = "error"
                compose_jobs[job_id].error = "Could not probe video duration"
                return

            keep_segments = compute_keep_segments(cuts, duration)
            overlays = load_overlays(slug)
            placements = compute_overlay_placements(
                overlays,
                keep_segments if keep_segments else [(0.0, duration)],
                get_overlays_dir(slug),
            )
            master_size = await probe_dimensions(master_path)
            args = build_compose_ffmpeg_args(
                master_path, body_path, keep_segments,
                overlay_placements=placements, master_size=master_size,
            )

            proc = await asyncio.create_subprocess_exec(
                *args,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await proc.communicate()

            if proc.returncode == 0:
                compose_jobs[job_id].status = "done"
                compose_jobs[job_id].output_path = str(body_path)
                await manager.notify(slug, {"type": "compose_done"})
            else:
                compose_jobs[job_id].status = "error"
                tail = stderr.decode("utf-8", errors="replace")[-500:] if stderr else ""
                compose_jobs[job_id].error = f"FFmpeg exit {proc.returncode}: {tail}"
        except Exception as e:
            compose_jobs[job_id].status = "error"
            compose_jobs[job_id].error = str(e)

    asyncio.create_task(run_compose())
    return {"job_id": job_id}


@app.get("/api/compose/{slug}/status")
def api_compose_status(slug: str, job_id: str):
    job = compose_jobs.get(job_id)
    if not job:
        return {"status": "not_found"}
    return job


# --- WebSocket ---

@app.websocket("/ws/watch/{slug}")
async def ws_watch(slug: str, ws: WebSocket):
    await manager.connect(slug, ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(slug, ws)
