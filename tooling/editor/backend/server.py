import asyncio
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from models import Cut, Correction, SaveCutsRequest, ComposeJob
from services import (
    get_project_root,
    get_slug_dir,
    load_cuts,
    save_cuts,
    get_project_info,
    append_correction,
    get_fixture_dir,
)


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
    """Start watchdog observer for data directory changes."""
    try:
        from watchdog.observers import Observer
        from watchdog.events import FileSystemEventHandler

        class Handler(FileSystemEventHandler):
            def on_modified(self, event):
                if event.is_directory:
                    return
                path = Path(event.src_path)
                parts = path.parts
                try:
                    idx = parts.index("video-processed")
                    slug = parts[idx + 1]
                    loop = asyncio.get_event_loop()
                    asyncio.run_coroutine_threadsafe(
                        manager.notify(slug, {"type": "file_changed", "file": path.name}),
                        loop,
                    )
                except (ValueError, IndexError):
                    pass

        data_dir = get_project_root() / "data" / "video-processed"
        if data_dir.exists():
            observer = Observer()
            observer.schedule(Handler(), str(data_dir), recursive=True)
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

# Mount media directory for video streaming (supports range requests)
fixture_dir = get_fixture_dir()
if fixture_dir and fixture_dir.exists():
    app.mount("/media", StaticFiles(directory=str(fixture_dir)), name="media")
else:
    data_dir = get_project_root() / "data" / "video-processed"
    if data_dir.exists():
        app.mount("/media", StaticFiles(directory=str(data_dir)), name="media")


# --- Compose job tracking ---

compose_jobs: dict[str, ComposeJob] = {}


# --- Endpoints ---

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


@app.post("/api/corrections/{slug}")
def api_post_correction(slug: str, correction: Correction):
    append_correction(correction)
    return {"status": "ok"}


@app.post("/api/compose/{slug}")
async def api_compose(slug: str):
    """Dispatch FFmpeg compose as background task."""
    job_id = str(uuid.uuid4())[:8]
    compose_jobs[job_id] = ComposeJob(job_id=job_id, status="running")

    async def run_compose():
        try:
            slug_dir = get_slug_dir(slug)
            body_path = slug_dir / "body.mp4"
            face_path = slug_dir / "face_clean.mp4"

            if not face_path.exists():
                compose_jobs[job_id].status = "error"
                compose_jobs[job_id].error = "face_clean.mp4 not found"
                return

            proc = await asyncio.create_subprocess_exec(
                "ffmpeg", "-y", "-i", str(face_path),
                "-c", "copy", str(body_path),
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await proc.wait()

            if proc.returncode == 0:
                compose_jobs[job_id].status = "done"
                await manager.notify(slug, {"type": "compose_done"})
            else:
                compose_jobs[job_id].status = "error"
                compose_jobs[job_id].error = f"FFmpeg exit code {proc.returncode}"
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
