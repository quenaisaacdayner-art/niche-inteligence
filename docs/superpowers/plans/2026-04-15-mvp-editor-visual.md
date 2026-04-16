# MVP Editor Visual — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local web editor (Vite+React+FastAPI) that displays video-cut pipeline results (cuts, timelines, waveform) and lets the user approve/reject/adjust cuts with undo/redo and a calibration memory loop.

**Architecture:** 3 layers — React frontend (localhost:5173) talks to FastAPI backend (localhost:8000) which reads/writes JSON files from the niche-intelligence data directory. Videos served via StaticFiles mount (native range request support). File changes detected by watchdog, pushed to frontend via WebSocket. All editor state lives in zustand with immer-based undo snapshots.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS, wavesurfer.js 7, zustand, immer, FastAPI, uvicorn, watchdog, FFmpeg.

**Spec:** `docs/superpowers/specs/2026-04-15-mvp-editor-visual-design.md`

---

## File Structure

```
tooling/editor/
├── CLAUDE.md
├── package.json
├── requirements.txt
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── postcss.config.js
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── types.ts
│   │   ├── api.ts
│   │   ├── stores/
│   │   │   └── editor.ts
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   └── useKeyboard.ts
│   │   └── components/
│   │       ├── Header.tsx
│   │       ├── VideoPlayer.tsx
│   │       ├── Timeline.tsx
│   │       ├── Waveform.tsx
│   │       ├── CutList.tsx
│   │       └── ActionPanel.tsx
│   └── __tests__/
│       └── editor-store.test.ts
├── backend/
│   ├── server.py
│   ├── models.py
│   ├── services.py
│   └── tests/
│       ├── conftest.py
│       └── test_api.py
├── fixtures/
│   └── demo/
│       ├── cuts_retakes.json
│       ├── gaps.json
│       └── sync.json
└── scripts/
    └── dev.sh
```

**Data read/written (outside editor, at project root):**
- `data/video-processed/{slug}/` — pipeline JSONs + video files
- `memory/video-cut-corrections.jsonl` — calibration feedback

---

## Prerequisites

- Node.js 22+ (confirmed: v22.20.0)
- Python 3.10+ (confirmed: 3.13.5)
- FFmpeg (confirmed: 8.1)
- npm 10+ (confirmed: 10.9.3)

---

## Task 1: Project Scaffolding

**Files:**
- Create: `tooling/editor/CLAUDE.md`
- Create: `tooling/editor/package.json`
- Create: `tooling/editor/requirements.txt`
- Create: `tooling/editor/frontend/index.html`
- Create: `tooling/editor/frontend/vite.config.ts`
- Create: `tooling/editor/frontend/tailwind.config.ts`
- Create: `tooling/editor/frontend/postcss.config.js`
- Create: `tooling/editor/frontend/tsconfig.json`
- Create: `tooling/editor/frontend/src/main.tsx`
- Create: `tooling/editor/frontend/src/index.css`
- Create: `tooling/editor/scripts/dev.sh`
- Create: `tooling/editor/fixtures/demo/cuts_retakes.json`
- Create: `tooling/editor/fixtures/demo/gaps.json`
- Create: `tooling/editor/fixtures/demo/sync.json`

- [ ] **Step 1: Create directory structure**

```bash
cd /c/Users/quena/projetos/niche-intelligence
mkdir -p tooling/editor/{frontend/src/{components,hooks,stores,__tests__},backend/tests,fixtures/demo,scripts}
```

- [ ] **Step 2: Write CLAUDE.md for the editor**

Create `tooling/editor/CLAUDE.md`:

```markdown
# CLAUDE.md — MVP Editor Visual

Sub-projeto dentro do niche-intelligence. Editor web local pra revisao de cortes de video.

## Stack
- Frontend: Vite + React 18 + TypeScript + Tailwind CSS + wavesurfer.js + zustand
- Backend: FastAPI + uvicorn + watchdog
- Bridge: filesystem (JSONs em data/video-processed/{slug}/)

## Como rodar
bash scripts/dev.sh                # inicia backend :8000 + frontend :5173
bash scripts/dev.sh --fixture demo # usa fixtures em vez de dados reais

## Estrutura
- frontend/src/components/ — React components (VideoPlayer, Timeline, Waveform, CutList, ActionPanel, Header)
- frontend/src/stores/editor.ts — zustand store (cuts state + undo/redo)
- frontend/src/hooks/ — useWebSocket (file watcher), useKeyboard (atalhos globais)
- frontend/src/api.ts — fetch wrappers pro backend
- backend/server.py — FastAPI app (todos os endpoints)
- backend/services.py — filesystem read/write, ffmpeg, corrections JSONL

## Convencoes
- Componentes: functional React com hooks. Sem class components.
- Styling: Tailwind utility classes. Sem CSS modules.
- State: zustand (nao useState pra state global). useStore() hook.
- Backend: FastAPI com Pydantic models. Sem ORM.
- Testes backend: pytest + httpx. Testes frontend: vitest.
- Paths: usar PROJECT_ROOT env var pra acessar data/ e memory/ do projeto pai.
```

- [ ] **Step 3: Write package.json**

Create `tooling/editor/package.json`:

```json
{
  "name": "mvp-editor-visual",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "cd frontend && npx vite",
    "build": "cd frontend && npx vite build",
    "test": "cd frontend && npx vitest run",
    "test:watch": "cd frontend && npx vitest"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.15",
    "typescript": "^5.6.3",
    "vite": "^6.0.3",
    "vitest": "^2.1.8"
  },
  "dependencies": {
    "immer": "^10.1.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "wavesurfer.js": "^7.8.8",
    "zustand": "^5.0.2"
  }
}
```

- [ ] **Step 4: Write requirements.txt**

Create `tooling/editor/requirements.txt`:

```
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
watchdog>=6.0.0
pydantic>=2.10.0
httpx>=0.28.0
pytest>=8.3.0
pytest-asyncio>=0.24.0
```

- [ ] **Step 5: Write Vite + Tailwind + TypeScript configs**

Create `tooling/editor/frontend/vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8000",
      "/media": "http://localhost:8000",
      "/ws": { target: "ws://localhost:8000", ws: true },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [],
  },
});
```

Create `tooling/editor/frontend/tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        editor: {
          bg: "#0a0a0a",
          surface: "#111827",
          border: "#1e293b",
          panel: "#0f172a",
        },
        cut: {
          retake: "#ef4444",
          gap: "#fbbf24",
          filler: "#f97316",
          approved: "#22c55e",
          rejected: "#ef4444",
        },
        track: {
          face: "#22c55e",
          screen: "#a855f7",
          pip: "#3b82f6",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
```

Create `tooling/editor/frontend/postcss.config.js`:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

Create `tooling/editor/frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src", "__tests__"]
}
```

- [ ] **Step 6: Write index.html + main.tsx + index.css**

Create `tooling/editor/frontend/index.html`:

```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MVP Editor Visual</title>
  </head>
  <body class="bg-editor-bg text-gray-200 overflow-hidden">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `tooling/editor/frontend/src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Create `tooling/editor/frontend/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  scrollbar-width: thin;
  scrollbar-color: #334155 #0a0a0a;
}
```

- [ ] **Step 7: Write fixture JSON files**

Create `tooling/editor/fixtures/demo/cuts_retakes.json`:

```json
[
  {"in": 3.2, "out": 5.8, "reason": "retake: repeated 'basicamente'", "confidence": 0.92},
  {"in": 12.0, "out": 14.5, "reason": "retake: false start 'entao vamos...'", "confidence": 0.87},
  {"in": 22.5, "out": 23.8, "reason": "filler: 'tipo' no meio de frase", "confidence": 0.95}
]
```

Create `tooling/editor/fixtures/demo/gaps.json`:

```json
[
  {"in": 8.0, "out": 11.5, "reason": "silence 3.5s"},
  {"in": 18.0, "out": 22.0, "reason": "silence 4.0s"}
]
```

Create `tooling/editor/fixtures/demo/sync.json`:

```json
{"offset_screen_seconds": 0}
```

- [ ] **Step 8: Generate fixture video files**

```bash
cd /c/Users/quena/projetos/niche-intelligence/tooling/editor/fixtures/demo
ffmpeg -y -f lavfi -i "testsrc=duration=30:size=1280x720:rate=30" -f lavfi -i "sine=frequency=440:duration=30" -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest face_clean.mp4
ffmpeg -y -f lavfi -i "testsrc2=duration=30:size=1280x720:rate=30" -f lavfi -i "sine=frequency=660:duration=30" -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest screen_clean.mp4
```

Expected: Two 30-second test videos (~1MB each).

- [ ] **Step 9: Write dev.sh**

Create `tooling/editor/scripts/dev.sh`:

```bash
#!/bin/bash
set -e

EDITOR_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_ROOT="$(cd "$EDITOR_DIR/../.." && pwd)"

FIXTURE=""
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --fixture) FIXTURE="$2"; shift ;;
    esac
    shift
done

export PROJECT_ROOT
if [ -n "$FIXTURE" ]; then
    export FIXTURE_DIR="$EDITOR_DIR/fixtures/$FIXTURE"
    echo "Using fixture: $FIXTURE_DIR"
fi

echo "Starting backend (FastAPI :8000)..."
cd "$EDITOR_DIR/backend"
python -m uvicorn server:app --reload --port 8000 --host 127.0.0.1 &
BACKEND_PID=$!

echo "Starting frontend (Vite :5173)..."
cd "$EDITOR_DIR/frontend"
npx vite --host 127.0.0.1 &
FRONTEND_PID=$!

echo ""
echo "========================================="
echo "  Editor ready:"
echo "  http://localhost:5173?slug=demo"
echo "========================================="
echo ""
echo "Press Ctrl+C to stop both"

cleanup() { kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; }
trap cleanup EXIT
wait
```

- [ ] **Step 10: Install dependencies**

```bash
cd /c/Users/quena/projetos/niche-intelligence/tooling/editor
npm install
pip install -r requirements.txt
```

Expected: `node_modules/` created, Python packages installed.

- [ ] **Step 11: Commit**

```bash
cd /c/Users/quena/projetos/niche-intelligence
git add tooling/editor/
git commit -m "feat(editor): scaffold project structure with configs and fixtures"
```

---

## Task 2: Backend Data Layer

**Files:**
- Create: `tooling/editor/backend/models.py`
- Create: `tooling/editor/backend/services.py`
- Create: `tooling/editor/backend/tests/conftest.py`
- Create: `tooling/editor/backend/tests/test_api.py` (partial — services tests)

- [ ] **Step 1: Write backend test fixtures**

Create `tooling/editor/backend/tests/__init__.py` (empty file).

Create `tooling/editor/backend/tests/conftest.py`:

```python
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
        {"in": 8.0, "out": 11.5, "reason": "silence 3.5s"},
        {"in": 18.0, "out": 22.0, "reason": "silence 4.0s"},
    ]
    (slug_dir / "gaps.json").write_text(json.dumps(gaps))

    (slug_dir / "sync.json").write_text(json.dumps({"offset_screen_seconds": 0.5}))

    # Create dummy video files (empty, just for existence checks)
    (slug_dir / "face_clean.mp4").write_bytes(b"\x00")
    (slug_dir / "screen_clean.mp4").write_bytes(b"\x00")

    # Memory dir
    (tmp_path / "memory").mkdir()

    return tmp_path
```

- [ ] **Step 2: Write failing tests for services**

Add to `tooling/editor/backend/tests/test_api.py`:

```python
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
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd /c/Users/quena/projetos/niche-intelligence/tooling/editor/backend
python -m pytest tests/ -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'services'`

- [ ] **Step 4: Write models.py**

Create `tooling/editor/backend/models.py`:

```python
from pydantic import BaseModel
from typing import Optional


class Cut(BaseModel):
    id: str
    cut_type: str  # retake | gap | filler
    time_in: float
    time_out: float
    reason: str
    confidence: float = 1.0
    status: str = "pending"  # pending | approved | rejected | adjusted
    adjusted_in: Optional[float] = None
    adjusted_out: Optional[float] = None
    dayner_note: Optional[str] = None


class Correction(BaseModel):
    video_slug: str
    date: str
    cut_type: str
    time_in: float
    time_out: float
    claude_reason: str
    transcript_context: str = ""
    action: str  # approved | rejected | adjusted
    adjusted_in: Optional[float] = None
    adjusted_out: Optional[float] = None
    dayner_note: Optional[str] = None


class SaveCutsRequest(BaseModel):
    cuts: list[Cut]


class ComposeJob(BaseModel):
    job_id: str
    status: str = "running"  # running | done | error
    error: Optional[str] = None
```

- [ ] **Step 5: Write services.py**

Create `tooling/editor/backend/services.py`:

```python
import json
import os
from pathlib import Path
from models import Cut, Correction


def get_project_root() -> Path:
    """Resolve project root from env var or relative path."""
    env = os.environ.get("PROJECT_ROOT")
    if env:
        return Path(env)
    # Fallback: backend/ → editor/ → tooling/ → niche-intelligence/
    return Path(__file__).resolve().parent.parent.parent.parent


def get_fixture_dir() -> Path | None:
    """Return fixture directory if FIXTURE_DIR env var is set."""
    env = os.environ.get("FIXTURE_DIR")
    return Path(env) if env else None


def get_slug_dir(slug: str) -> Path:
    """Return the data directory for a given slug."""
    fixture = get_fixture_dir()
    if fixture and fixture.exists():
        return fixture
    return get_project_root() / "data" / "video-processed" / slug


def load_cuts(slug: str) -> list[Cut]:
    """Load cuts_retakes.json + gaps.json, merge, assign IDs, sort by time."""
    slug_dir = get_slug_dir(slug)
    cuts: list[Cut] = []

    retakes_path = slug_dir / "cuts_retakes.json"
    if retakes_path.exists():
        data = json.loads(retakes_path.read_text(encoding="utf-8"))
        for i, item in enumerate(data):
            cut_type = "filler" if "filler" in item.get("reason", "") else "retake"
            cuts.append(Cut(
                id=f"{cut_type}_{i}",
                cut_type=cut_type,
                time_in=item["in"],
                time_out=item["out"],
                reason=item.get("reason", ""),
                confidence=item.get("confidence", 1.0),
            ))

    gaps_path = slug_dir / "gaps.json"
    if gaps_path.exists():
        data = json.loads(gaps_path.read_text(encoding="utf-8"))
        for i, item in enumerate(data):
            duration = item["out"] - item["in"]
            cuts.append(Cut(
                id=f"gap_{i}",
                cut_type="gap",
                time_in=item["in"],
                time_out=item["out"],
                reason=item.get("reason", f"silence {duration:.1f}s"),
            ))

    # Apply saved approvals if they exist
    approved_path = slug_dir / "cuts_approved.json"
    if approved_path.exists():
        saved = json.loads(approved_path.read_text(encoding="utf-8"))
        status_map = {s["id"]: s for s in saved}
        for cut in cuts:
            if cut.id in status_map:
                s = status_map[cut.id]
                cut.status = s.get("status", "pending")
                cut.adjusted_in = s.get("adjusted_in")
                cut.adjusted_out = s.get("adjusted_out")
                cut.dayner_note = s.get("dayner_note")

    cuts.sort(key=lambda c: c.time_in)
    return cuts


def save_cuts(slug: str, cuts: list[Cut]) -> None:
    """Write cuts_approved.json with all non-pending cuts."""
    slug_dir = get_slug_dir(slug)
    approved = [
        {
            "id": c.id,
            "status": c.status,
            "adjusted_in": c.adjusted_in,
            "adjusted_out": c.adjusted_out,
            "dayner_note": c.dayner_note,
        }
        for c in cuts
        if c.status != "pending"
    ]
    path = slug_dir / "cuts_approved.json"
    path.write_text(json.dumps(approved, indent=2, ensure_ascii=False), encoding="utf-8")


def get_project_info(slug: str) -> dict:
    """Return metadata about what files exist for a slug."""
    slug_dir = get_slug_dir(slug)
    return {
        "slug": slug,
        "has_face_clean": (slug_dir / "face_clean.mp4").exists(),
        "has_screen_clean": (slug_dir / "screen_clean.mp4").exists(),
        "has_body": (slug_dir / "body.mp4").exists(),
        "data_dir": str(slug_dir),
    }


def append_correction(correction: Correction) -> None:
    """Append one correction entry to memory/video-cut-corrections.jsonl."""
    root = get_project_root()
    path = root / "memory" / "video-cut-corrections.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(correction.model_dump(), ensure_ascii=False) + "\n")
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd /c/Users/quena/projetos/niche-intelligence/tooling/editor/backend
python -m pytest tests/ -v
```

Expected: 4 tests PASS.

- [ ] **Step 7: Commit**

```bash
cd /c/Users/quena/projetos/niche-intelligence
git add tooling/editor/backend/
git commit -m "feat(editor): backend data layer — models + services + tests"
```

---

## Task 3: Backend API Server

**Files:**
- Create: `tooling/editor/backend/server.py`
- Modify: `tooling/editor/backend/tests/test_api.py` (add endpoint tests)

- [ ] **Step 1: Write failing endpoint tests**

Append to `tooling/editor/backend/tests/test_api.py`:

```python
import sys
from pathlib import Path
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


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
    assert data["has_face_clean"] is True


@pytest.mark.asyncio
async def test_get_cuts(client):
    resp = await client.get("/api/cuts/test-video")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 4
    assert data[0]["cut_type"] in ("retake", "gap", "filler")


@pytest.mark.asyncio
async def test_save_cuts(client):
    # First load cuts
    resp = await client.get("/api/cuts/test-video")
    cuts = resp.json()

    # Approve first cut
    cuts[0]["status"] = "approved"

    resp = await client.post("/api/cuts/test-video/save", json={"cuts": cuts})
    assert resp.status_code == 200
    assert resp.json()["saved"] == 1


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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /c/Users/quena/projetos/niche-intelligence/tooling/editor/backend
python -m pytest tests/test_api.py -v -k "test_get_project or test_get_cuts or test_save_cuts or test_post_correction"
```

Expected: FAIL — `ModuleNotFoundError: No module named 'server'`

- [ ] **Step 3: Write server.py**

Create `tooling/editor/backend/server.py`:

```python
import asyncio
import uuid
from pathlib import Path
from contextlib import asynccontextmanager

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

watcher_task = None


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
                # Extract slug from path: .../data/video-processed/{slug}/file.json
                parts = path.parts
                try:
                    idx = parts.index("video-processed")
                    slug = parts[idx + 1]
                    asyncio.run_coroutine_threadsafe(
                        manager.notify(slug, {"type": "file_changed", "file": path.name}),
                        asyncio.get_event_loop(),
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

            # Simple compose: copy face_clean as body (MVP placeholder)
            # Real compose with manifest + PIP comes in video-cut skill
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
            await ws.receive_text()  # keep alive
    except WebSocketDisconnect:
        manager.disconnect(slug, ws)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /c/Users/quena/projetos/niche-intelligence/tooling/editor/backend
python -m pytest tests/ -v
```

Expected: All tests PASS (8 total — 4 service + 4 endpoint).

- [ ] **Step 5: Verify server starts**

```bash
cd /c/Users/quena/projetos/niche-intelligence/tooling/editor/backend
PROJECT_ROOT="/c/Users/quena/projetos/niche-intelligence" FIXTURE_DIR="/c/Users/quena/projetos/niche-intelligence/tooling/editor/fixtures/demo" python -m uvicorn server:app --port 8000 &
sleep 2
curl -s http://localhost:8000/api/project/demo | python -m json.tool
kill %1
```

Expected: JSON response with `slug: "demo"`.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/quena/projetos/niche-intelligence
git add tooling/editor/backend/
git commit -m "feat(editor): backend API server with all endpoints + watcher + tests"
```

---

## Task 4: Frontend Foundation

**Files:**
- Create: `tooling/editor/frontend/src/types.ts`
- Create: `tooling/editor/frontend/src/api.ts`
- Create: `tooling/editor/frontend/src/stores/editor.ts`
- Create: `tooling/editor/frontend/__tests__/editor-store.test.ts`

- [ ] **Step 1: Write types.ts**

Create `tooling/editor/frontend/src/types.ts`:

```typescript
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
```

- [ ] **Step 2: Write api.ts**

Create `tooling/editor/frontend/src/api.ts`:

```typescript
import type { Cut, ProjectInfo, Correction } from "./types";

const BASE = "";

export async function fetchProject(slug: string): Promise<ProjectInfo> {
  const res = await fetch(`${BASE}/api/project/${slug}`);
  return res.json();
}

export async function fetchCuts(slug: string): Promise<Cut[]> {
  const res = await fetch(`${BASE}/api/cuts/${slug}`);
  return res.json();
}

export async function saveCuts(slug: string, cuts: Cut[]): Promise<void> {
  await fetch(`${BASE}/api/cuts/${slug}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cuts }),
  });
}

export async function postCorrection(slug: string, correction: Correction): Promise<void> {
  await fetch(`${BASE}/api/corrections/${slug}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(correction),
  });
}

export async function startCompose(slug: string): Promise<string> {
  const res = await fetch(`${BASE}/api/compose/${slug}`, { method: "POST" });
  const data = await res.json();
  return data.job_id;
}

export async function checkCompose(slug: string, jobId: string): Promise<string> {
  const res = await fetch(`${BASE}/api/compose/${slug}/status?job_id=${jobId}`);
  const data = await res.json();
  return data.status;
}

export function mediaUrl(slug: string, filename: string): string {
  // In fixture mode, files are at /media/filename
  // In real mode, files are at /media/{slug}/filename
  // Backend mounts the correct directory
  return `${BASE}/media/${filename}`;
}
```

- [ ] **Step 3: Write failing test for editor store**

Create `tooling/editor/frontend/__tests__/editor-store.test.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it fails**

```bash
cd /c/Users/quena/projetos/niche-intelligence/tooling/editor
npx vitest run
```

Expected: FAIL — module `../src/stores/editor` not found.

- [ ] **Step 5: Write editor store with undo/redo**

Create `tooling/editor/frontend/src/stores/editor.ts`:

```typescript
import { create } from "zustand";
import { produce } from "immer";
import type { Cut } from "../types";

interface EditorState {
  // Data
  slug: string;
  cuts: Cut[];
  selectedCutId: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  zoom: number; // pixels per second

  // Undo
  undoStack: Cut[][];
  redoStack: Cut[][];

  // Actions
  setSlug: (slug: string) => void;
  loadCuts: (cuts: Cut[]) => void;
  approveCut: (id: string) => void;
  rejectCut: (id: string, note?: string) => void;
  adjustCut: (id: string, newIn: number, newOut: number) => void;
  approveAll: () => void;
  selectCut: (id: string) => void;
  selectNextCut: () => void;
  selectPrevCut: () => void;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  setIsPlaying: (p: boolean) => void;
  setZoom: (z: number) => void;
  undo: () => void;
  redo: () => void;
}

function pushUndo(state: EditorState): void {
  state.undoStack.push(JSON.parse(JSON.stringify(state.cuts)));
  state.redoStack = [];
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  slug: "",
  cuts: [],
  selectedCutId: null,
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  zoom: 50,
  undoStack: [],
  redoStack: [],

  setSlug: (slug) => set({ slug }),

  loadCuts: (cuts) => set({ cuts, undoStack: [], redoStack: [] }),

  approveCut: (id) =>
    set(
      produce((s: EditorState) => {
        pushUndo(s);
        const cut = s.cuts.find((c) => c.id === id);
        if (cut) cut.status = "approved";
      }),
    ),

  rejectCut: (id, note) =>
    set(
      produce((s: EditorState) => {
        pushUndo(s);
        const cut = s.cuts.find((c) => c.id === id);
        if (cut) {
          cut.status = "rejected";
          if (note) cut.dayner_note = note;
        }
      }),
    ),

  adjustCut: (id, newIn, newOut) =>
    set(
      produce((s: EditorState) => {
        pushUndo(s);
        const cut = s.cuts.find((c) => c.id === id);
        if (cut) {
          cut.status = "adjusted";
          cut.adjusted_in = newIn;
          cut.adjusted_out = newOut;
        }
      }),
    ),

  approveAll: () =>
    set(
      produce((s: EditorState) => {
        pushUndo(s);
        for (const cut of s.cuts) {
          if (cut.status === "pending") cut.status = "approved";
        }
      }),
    ),

  selectCut: (id) => set({ selectedCutId: id }),

  selectNextCut: () => {
    const { cuts, selectedCutId } = get();
    if (!cuts.length) return;
    const idx = cuts.findIndex((c) => c.id === selectedCutId);
    const next = idx < cuts.length - 1 ? idx + 1 : 0;
    set({ selectedCutId: cuts[next].id });
  },

  selectPrevCut: () => {
    const { cuts, selectedCutId } = get();
    if (!cuts.length) return;
    const idx = cuts.findIndex((c) => c.id === selectedCutId);
    const prev = idx > 0 ? idx - 1 : cuts.length - 1;
    set({ selectedCutId: cuts[prev].id });
  },

  setCurrentTime: (t) => set({ currentTime: t }),
  setDuration: (d) => set({ duration: d }),
  setIsPlaying: (p) => set({ isPlaying: p }),
  setZoom: (z) => set({ zoom: Math.max(10, Math.min(200, z)) }),

  undo: () =>
    set(
      produce((s: EditorState) => {
        const prev = s.undoStack.pop();
        if (prev) {
          s.redoStack.push(JSON.parse(JSON.stringify(s.cuts)));
          s.cuts = prev;
        }
      }),
    ),

  redo: () =>
    set(
      produce((s: EditorState) => {
        const next = s.redoStack.pop();
        if (next) {
          s.undoStack.push(JSON.parse(JSON.stringify(s.cuts)));
          s.cuts = next;
        }
      }),
    ),
}));
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd /c/Users/quena/projetos/niche-intelligence/tooling/editor
npx vitest run
```

Expected: 8 tests PASS.

- [ ] **Step 7: Commit**

```bash
cd /c/Users/quena/projetos/niche-intelligence
git add tooling/editor/frontend/
git commit -m "feat(editor): frontend foundation — types, api, store with undo/redo + tests"
```

---

## Task 5: Frontend Shell + Player

**Files:**
- Create: `tooling/editor/frontend/src/App.tsx`
- Create: `tooling/editor/frontend/src/components/Header.tsx`
- Create: `tooling/editor/frontend/src/components/VideoPlayer.tsx`

- [ ] **Step 1: Write App.tsx with grid layout**

Create `tooling/editor/frontend/src/App.tsx`:

```tsx
import { useEffect } from "react";
import { useEditorStore } from "./stores/editor";
import { fetchCuts, fetchProject } from "./api";
import Header from "./components/Header";
import VideoPlayer from "./components/VideoPlayer";
import Timeline from "./components/Timeline";
import Waveform from "./components/Waveform";
import CutList from "./components/CutList";
import ActionPanel from "./components/ActionPanel";
import { useKeyboard } from "./hooks/useKeyboard";
import { useWebSocket } from "./hooks/useWebSocket";

export default function App() {
  const slug = useEditorStore((s) => s.slug);
  const setSlug = useEditorStore((s) => s.setSlug);
  const loadCuts = useEditorStore((s) => s.loadCuts);

  // Read slug from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("slug") || "demo";
    setSlug(s);
  }, [setSlug]);

  // Load data when slug changes
  useEffect(() => {
    if (!slug) return;
    fetchCuts(slug).then(loadCuts);
  }, [slug, loadCuts]);

  // WebSocket for file changes
  useWebSocket(slug, () => {
    if (slug) fetchCuts(slug).then(loadCuts);
  });

  // Global keyboard shortcuts
  useKeyboard();

  if (!slug) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="h-screen flex flex-col bg-editor-bg">
      <Header />
      <div className="flex flex-1 min-h-0">
        {/* Main area: player */}
        <div className="flex-[2] flex flex-col border-r border-editor-border">
          <VideoPlayer />
        </div>
        {/* Side panel: cut list + actions */}
        <div className="w-80 flex flex-col bg-editor-panel">
          <CutList />
          <ActionPanel />
        </div>
      </div>
      {/* Timeline + Waveform at bottom */}
      <div className="border-t border-editor-border">
        <Timeline />
        <Waveform />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write Header.tsx**

Create `tooling/editor/frontend/src/components/Header.tsx`:

```tsx
import { useEditorStore } from "../stores/editor";
import { saveCuts, startCompose, checkCompose } from "../api";
import { useState } from "react";

export default function Header() {
  const slug = useEditorStore((s) => s.slug);
  const cuts = useEditorStore((s) => s.cuts);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const [composing, setComposing] = useState(false);

  const pendingCount = cuts.filter((c) => c.status === "pending").length;

  const handleSave = async () => {
    await saveCuts(slug, cuts);
  };

  const handleCompose = async () => {
    setComposing(true);
    await saveCuts(slug, cuts);
    const jobId = await startCompose(slug);

    // Poll for completion
    const poll = setInterval(async () => {
      const status = await checkCompose(slug, jobId);
      if (status === "done" || status === "error") {
        clearInterval(poll);
        setComposing(false);
      }
    }, 1000);
  };

  return (
    <div className="flex justify-between items-center px-4 py-2 bg-editor-surface border-b border-editor-border">
      <div className="flex items-center gap-3">
        <span className="font-bold text-white">{slug}</span>
        {pendingCount > 0 && (
          <span className="text-xs px-2 py-0.5 bg-editor-border rounded-full text-yellow-400">
            {pendingCount} pendentes
          </span>
        )}
        <span className="text-xs text-gray-500">video-cut mode</span>
      </div>
      <div className="flex gap-2">
        <button onClick={undo} className="text-xs px-3 py-1 bg-editor-border rounded hover:bg-gray-700">
          Undo (Ctrl+Z)
        </button>
        <button onClick={redo} className="text-xs px-3 py-1 bg-editor-border rounded hover:bg-gray-700">
          Redo
        </button>
        <button onClick={handleSave} className="text-xs px-3 py-1 bg-editor-border rounded hover:bg-gray-700">
          Aplicar cortes
        </button>
        <button
          onClick={handleCompose}
          disabled={composing}
          className="text-xs px-3 py-1 bg-emerald-900 text-emerald-300 rounded hover:bg-emerald-800 disabled:opacity-50"
        >
          {composing ? "Compondo..." : "Compor body.mp4"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write VideoPlayer.tsx**

Create `tooling/editor/frontend/src/components/VideoPlayer.tsx`:

```tsx
import { useRef, useEffect, useCallback } from "react";
import { useEditorStore } from "../stores/editor";
import { mediaUrl } from "../api";

export default function VideoPlayer() {
  const slug = useEditorStore((s) => s.slug);
  const currentTime = useEditorStore((s) => s.currentTime);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const setDuration = useEditorStore((s) => s.setDuration);
  const setIsPlaying = useEditorStore((s) => s.setIsPlaying);

  const screenRef = useRef<HTMLVideoElement>(null);
  const faceRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);

  // Sync face video to screen video time
  const syncVideos = useCallback(() => {
    if (screenRef.current) {
      setCurrentTime(screenRef.current.currentTime);
      if (faceRef.current) {
        const drift = Math.abs(faceRef.current.currentTime - screenRef.current.currentTime);
        if (drift > 0.1) {
          faceRef.current.currentTime = screenRef.current.currentTime;
        }
      }
    }
    rafRef.current = requestAnimationFrame(syncVideos);
  }, [setCurrentTime]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(syncVideos);
    return () => cancelAnimationFrame(rafRef.current);
  }, [syncVideos]);

  // Play/pause control from store
  useEffect(() => {
    if (!screenRef.current || !faceRef.current) return;
    if (isPlaying) {
      screenRef.current.play().catch(() => {});
      faceRef.current.play().catch(() => {});
    } else {
      screenRef.current.pause();
      faceRef.current.pause();
    }
  }, [isPlaying]);

  // External seek (from timeline click or cut navigation)
  useEffect(() => {
    if (!screenRef.current || isPlaying) return;
    const drift = Math.abs(screenRef.current.currentTime - currentTime);
    if (drift > 0.05) {
      screenRef.current.currentTime = currentTime;
      if (faceRef.current) faceRef.current.currentTime = currentTime;
    }
  }, [currentTime, isPlaying]);

  const handleLoadedMetadata = () => {
    if (screenRef.current) setDuration(screenRef.current.duration);
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    const ms = Math.floor((t % 1) * 1000);
    return `${m}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Video area */}
      <div className="flex-1 relative bg-black flex items-center justify-center" onClick={togglePlay}>
        <video
          ref={screenRef}
          src={mediaUrl(slug, "screen_clean.mp4")}
          className="max-h-full max-w-full"
          onLoadedMetadata={handleLoadedMetadata}
          preload="auto"
          playsInline
        />
        {/* Face PIP overlay */}
        <video
          ref={faceRef}
          src={mediaUrl(slug, "face_clean.mp4")}
          className="absolute bottom-3 right-3 w-1/4 rounded-lg border border-purple-600 shadow-lg"
          preload="auto"
          playsInline
          muted
        />
      </div>
      {/* Controls bar */}
      <div className="flex items-center justify-center gap-4 py-2 bg-editor-surface border-t border-editor-border">
        <span className="text-xs text-gray-500">J</span>
        <span className="text-xs text-gray-500">◄</span>
        <button
          onClick={togglePlay}
          className="text-sm px-4 py-1 bg-editor-border rounded hover:bg-gray-700"
        >
          {isPlaying ? "⏸ Space" : "▶ Space"}
        </button>
        <span className="text-xs text-gray-500">►</span>
        <span className="text-xs text-gray-500">L</span>
        <span className="text-xs text-gray-500 ml-4">
          {formatTime(currentTime)} / {formatTime(useEditorStore.getState().duration)}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create placeholder components so App compiles**

Create these minimal placeholder files so the app can render:

`tooling/editor/frontend/src/components/Timeline.tsx`:
```tsx
export default function Timeline() {
  return <div className="h-32 bg-editor-bg px-4 py-2 text-xs text-gray-500">Timeline (Task 6)</div>;
}
```

`tooling/editor/frontend/src/components/Waveform.tsx`:
```tsx
export default function Waveform() {
  return <div className="h-8 bg-editor-bg px-4 text-xs text-gray-500">Waveform (Task 6)</div>;
}
```

`tooling/editor/frontend/src/components/CutList.tsx`:
```tsx
export default function CutList() {
  return <div className="flex-1 overflow-y-auto p-2 text-xs text-gray-500">CutList (Task 7)</div>;
}
```

`tooling/editor/frontend/src/components/ActionPanel.tsx`:
```tsx
export default function ActionPanel() {
  return <div className="p-2 border-t border-editor-border text-xs text-gray-500">ActionPanel (Task 7)</div>;
}
```

`tooling/editor/frontend/src/hooks/useKeyboard.ts`:
```typescript
export function useKeyboard() {
  // Task 7
}
```

`tooling/editor/frontend/src/hooks/useWebSocket.ts`:
```typescript
export function useWebSocket(_slug: string, _onUpdate: () => void) {
  // Task 8
}
```

- [ ] **Step 5: Start dev server and verify app loads**

```bash
cd /c/Users/quena/projetos/niche-intelligence/tooling/editor
bash scripts/dev.sh --fixture demo
```

Open `http://localhost:5173?slug=demo`. Expected: dark UI with header (slug name, buttons), video player area with two test-pattern videos (PIP layout), placeholder text for timeline/waveform/cutlist.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/quena/projetos/niche-intelligence
git add tooling/editor/frontend/
git commit -m "feat(editor): frontend shell with layout, header, video player + placeholders"
```

---

## Task 6: Timeline + Waveform

**Files:**
- Modify: `tooling/editor/frontend/src/components/Timeline.tsx`
- Modify: `tooling/editor/frontend/src/components/Waveform.tsx`

- [ ] **Step 1: Write Timeline component**

Replace `tooling/editor/frontend/src/components/Timeline.tsx`:

```tsx
import { useRef, useCallback } from "react";
import { useEditorStore } from "../stores/editor";

const CUT_COLORS: Record<string, string> = {
  retake: "bg-cut-retake/40 border-cut-retake",
  gap: "bg-cut-gap/40 border-cut-gap",
  filler: "bg-cut-filler/40 border-cut-filler",
};

const STATUS_RING: Record<string, string> = {
  approved: "ring-1 ring-cut-approved",
  rejected: "ring-1 ring-cut-rejected opacity-40",
  adjusted: "ring-1 ring-yellow-400",
  pending: "",
};

export default function Timeline() {
  const cuts = useEditorStore((s) => s.cuts);
  const currentTime = useEditorStore((s) => s.currentTime);
  const duration = useEditorStore((s) => s.duration);
  const zoom = useEditorStore((s) => s.zoom);
  const selectedCutId = useEditorStore((s) => s.selectedCutId);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const setIsPlaying = useEditorStore((s) => s.setIsPlaying);
  const setZoom = useEditorStore((s) => s.setZoom);
  const selectCut = useEditorStore((s) => s.selectCut);
  const adjustCut = useEditorStore((s) => s.adjustCut);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ cutId: string; edge: "in" | "out"; startX: number; startTime: number } | null>(null);

  const totalWidth = duration * zoom;
  const timeToX = (t: number) => t * zoom;
  const xToTime = (x: number) => x / zoom;

  // Click on empty area → seek
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      if (dragRef.current) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const scrollLeft = containerRef.current?.scrollLeft || 0;
      const x = e.clientX - rect.left + scrollLeft;
      const t = xToTime(x);
      setCurrentTime(Math.max(0, Math.min(duration, t)));
      setIsPlaying(false);
    },
    [duration, setCurrentTime, setIsPlaying, zoom],
  );

  // Zoom with Ctrl+scroll
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        setZoom(zoom + (e.deltaY > 0 ? -5 : 5));
      }
    },
    [zoom, setZoom],
  );

  // Drag strip edges to adjust in/out
  const handleEdgeMouseDown = (cutId: string, edge: "in" | "out", e: React.MouseEvent) => {
    e.stopPropagation();
    const cut = cuts.find((c) => c.id === cutId);
    if (!cut) return;
    dragRef.current = {
      cutId,
      edge,
      startX: e.clientX,
      startTime: edge === "in" ? (cut.adjusted_in ?? cut.time_in) : (cut.adjusted_out ?? cut.time_out),
    };

    const handleMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = me.clientX - dragRef.current.startX;
      const dt = dx / zoom;
      const newTime = Math.max(0, dragRef.current.startTime + dt);
      const c = cuts.find((cc) => cc.id === dragRef.current!.cutId)!;
      const currentIn = c.adjusted_in ?? c.time_in;
      const currentOut = c.adjusted_out ?? c.time_out;
      if (dragRef.current.edge === "in") {
        adjustCut(dragRef.current.cutId, Math.min(newTime, currentOut - 0.1), currentOut);
      } else {
        adjustCut(dragRef.current.cutId, currentIn, Math.max(newTime, currentIn + 0.1));
      }
    };

    const handleUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  // Time ruler marks
  const marks: number[] = [];
  const step = zoom > 80 ? 1 : zoom > 40 ? 5 : 10;
  for (let t = 0; t <= duration; t += step) marks.push(t);

  const formatMark = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="relative select-none" onWheel={handleWheel}>
      <div className="flex justify-between items-center px-4 py-1">
        <span className="text-xs text-gray-500">
          Timeline (scroll = horizontal | Ctrl+scroll = zoom)
        </span>
        <span className="text-xs text-gray-500">{zoom}px/s</span>
      </div>
      <div ref={containerRef} className="overflow-x-auto pl-16" onClick={handleTimelineClick}>
        <div style={{ width: totalWidth, minHeight: 100 }} className="relative">
          {/* Time ruler */}
          <div className="h-4 relative">
            {marks.map((t) => (
              <span
                key={t}
                className="absolute text-[8px] text-gray-600 -translate-x-1/2"
                style={{ left: timeToX(t) }}
              >
                {formatMark(t)}
              </span>
            ))}
          </div>

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
            style={{ left: timeToX(currentTime) }}
          >
            <div className="w-2 h-2 bg-red-500 rounded-full -translate-x-[3px] -translate-y-1" />
          </div>

          {/* Face track */}
          <div className="h-5 bg-editor-border rounded-sm mb-0.5 relative">
            <div className="absolute inset-0 bg-track-face/20 rounded-sm" />
            <span className="absolute -left-14 text-[9px] text-gray-500 top-0.5">Face</span>
          </div>

          {/* Screen track */}
          <div className="h-5 bg-editor-border rounded-sm mb-1 relative">
            <div className="absolute inset-0 bg-track-screen/20 rounded-sm" />
            <span className="absolute -left-14 text-[9px] text-gray-500 top-0.5">Screen</span>
          </div>

          {/* Cut strips */}
          <div className="h-5 relative">
            <span className="absolute -left-14 text-[9px] text-gray-500 top-0.5">Cortes</span>
            {cuts.map((cut) => {
              const effectiveIn = cut.adjusted_in ?? cut.time_in;
              const effectiveOut = cut.adjusted_out ?? cut.time_out;
              const left = timeToX(effectiveIn);
              const width = timeToX(effectiveOut) - left;
              const isSelected = cut.id === selectedCutId;
              return (
                <div
                  key={cut.id}
                  className={`absolute top-0 h-full rounded cursor-pointer border ${CUT_COLORS[cut.cut_type]} ${STATUS_RING[cut.status]} ${isSelected ? "brightness-125 z-10" : ""}`}
                  style={{ left, width: Math.max(width, 4) }}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectCut(cut.id);
                    setCurrentTime(effectiveIn);
                    setIsPlaying(false);
                  }}
                >
                  {/* Drag handles */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-white/30"
                    onMouseDown={(e) => handleEdgeMouseDown(cut.id, "in", e)}
                  />
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-white/30"
                    onMouseDown={(e) => handleEdgeMouseDown(cut.id, "out", e)}
                  />
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-3 mt-1 text-[8px]">
            <span className="text-cut-retake">■ retake</span>
            <span className="text-cut-gap">■ gap</span>
            <span className="text-cut-filler">■ filler</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write Waveform component**

Replace `tooling/editor/frontend/src/components/Waveform.tsx`:

```tsx
import { useRef, useEffect } from "react";
import WaveSurfer from "wavesurfer.js";
import { useEditorStore } from "../stores/editor";
import { mediaUrl } from "../api";

export default function Waveform() {
  const slug = useEditorStore((s) => s.slug);
  const currentTime = useEditorStore((s) => s.currentTime);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const seekingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || !slug) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#22c55e40",
      progressColor: "#22c55e",
      cursorColor: "#ef4444",
      cursorWidth: 2,
      height: 40,
      barWidth: 2,
      barGap: 1,
      barRadius: 1,
      normalize: true,
      interact: true,
      url: mediaUrl(slug, "face_clean.mp4"),
    });

    ws.on("seeking", (time: number) => {
      seekingRef.current = true;
      useEditorStore.getState().setCurrentTime(time);
      useEditorStore.getState().setIsPlaying(false);
      setTimeout(() => (seekingRef.current = false), 100);
    });

    wsRef.current = ws;
    return () => ws.destroy();
  }, [slug]);

  // Sync waveform cursor to external time changes
  useEffect(() => {
    if (!wsRef.current || seekingRef.current || isPlaying) return;
    const duration = wsRef.current.getDuration();
    if (duration > 0) {
      wsRef.current.seekTo(currentTime / duration);
    }
  }, [currentTime, isPlaying]);

  return (
    <div className="px-4 pb-1 bg-editor-bg">
      <div className="flex items-center">
        <span className="w-14 text-[9px] text-gray-500 text-right pr-1">Audio</span>
        <div ref={containerRef} className="flex-1" />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Start dev server and verify visually**

```bash
cd /c/Users/quena/projetos/niche-intelligence/tooling/editor
bash scripts/dev.sh --fixture demo
```

Open `http://localhost:5173?slug=demo`. Expected:
- Two test-pattern videos in PIP layout
- Timeline with colored cut strips at the correct time positions
- Waveform rendering audio from face_clean.mp4
- Click on timeline → playhead moves + videos seek
- Ctrl+scroll on timeline → zoom in/out

- [ ] **Step 4: Commit**

```bash
cd /c/Users/quena/projetos/niche-intelligence
git add tooling/editor/frontend/src/components/Timeline.tsx tooling/editor/frontend/src/components/Waveform.tsx
git commit -m "feat(editor): timeline with cut strips + waveform with wavesurfer.js"
```

---

## Task 7: CutList + ActionPanel + Keyboard

**Files:**
- Modify: `tooling/editor/frontend/src/components/CutList.tsx`
- Modify: `tooling/editor/frontend/src/components/ActionPanel.tsx`
- Modify: `tooling/editor/frontend/src/hooks/useKeyboard.ts`

- [ ] **Step 1: Write CutList component**

Replace `tooling/editor/frontend/src/components/CutList.tsx`:

```tsx
import { useEditorStore } from "../stores/editor";

const STATUS_STYLES: Record<string, { border: string; icon: string; color: string }> = {
  approved: { border: "border-l-cut-approved", icon: "✓", color: "text-cut-approved" },
  rejected: { border: "border-l-cut-rejected", icon: "✗", color: "text-red-300" },
  adjusted: { border: "border-l-yellow-400", icon: "~", color: "text-yellow-400" },
  pending: { border: "border-l-gray-600", icon: "◻", color: "text-gray-400" },
};

const TYPE_LABELS: Record<string, string> = {
  retake: "retake",
  gap: "gap",
  filler: "filler",
};

export default function CutList() {
  const cuts = useEditorStore((s) => s.cuts);
  const selectedCutId = useEditorStore((s) => s.selectedCutId);
  const selectCut = useEditorStore((s) => s.selectCut);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const setIsPlaying = useEditorStore((s) => s.setIsPlaying);

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    const ds = Math.floor((t % 1) * 10);
    return `${m}:${String(s).padStart(2, "0")}.${ds}`;
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-3 py-2 border-b border-editor-border text-xs font-bold text-gray-400">
        Cortes sugeridos ({cuts.length})
      </div>
      <div className="p-1.5 space-y-1">
        {cuts.map((cut, i) => {
          const st = STATUS_STYLES[cut.status];
          const isSelected = cut.id === selectedCutId;
          const effectiveIn = cut.adjusted_in ?? cut.time_in;
          const effectiveOut = cut.adjusted_out ?? cut.time_out;
          return (
            <div
              key={cut.id}
              className={`px-2 py-1.5 rounded text-[10px] cursor-pointer border-l-2 ${st.border} ${isSelected ? "bg-yellow-400/10 border-l-yellow-400" : "bg-editor-border hover:bg-gray-800"}`}
              onClick={() => {
                selectCut(cut.id);
                setCurrentTime(effectiveIn);
                setIsPlaying(false);
              }}
            >
              <div className={st.color}>
                {st.icon} #{i + 1} {TYPE_LABELS[cut.cut_type]} {formatTime(effectiveIn)}–{formatTime(effectiveOut)}
              </div>
              <div className="text-gray-500 truncate">{cut.reason}</div>
              {cut.dayner_note && (
                <div className="text-gray-500 italic truncate">"{cut.dayner_note}"</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write ActionPanel component**

Replace `tooling/editor/frontend/src/components/ActionPanel.tsx`:

```tsx
import { useState } from "react";
import { useEditorStore } from "../stores/editor";
import { postCorrection, saveCuts } from "../api";

export default function ActionPanel() {
  const slug = useEditorStore((s) => s.slug);
  const cuts = useEditorStore((s) => s.cuts);
  const selectedCutId = useEditorStore((s) => s.selectedCutId);
  const approveCut = useEditorStore((s) => s.approveCut);
  const rejectCut = useEditorStore((s) => s.rejectCut);
  const approveAll = useEditorStore((s) => s.approveAll);
  const [note, setNote] = useState("");
  const [escapeText, setEscapeText] = useState("");

  const selectedCut = cuts.find((c) => c.id === selectedCutId);

  const handleApprove = async () => {
    if (!selectedCut) return;
    approveCut(selectedCut.id);
    await postCorrection(slug, {
      video_slug: slug,
      date: new Date().toISOString().slice(0, 10),
      cut_type: selectedCut.cut_type,
      time_in: selectedCut.time_in,
      time_out: selectedCut.time_out,
      claude_reason: selectedCut.reason,
      transcript_context: "",
      action: "approved",
      adjusted_in: null,
      adjusted_out: null,
      dayner_note: null,
    });
  };

  const handleReject = async () => {
    if (!selectedCut) return;
    rejectCut(selectedCut.id, note || undefined);
    await postCorrection(slug, {
      video_slug: slug,
      date: new Date().toISOString().slice(0, 10),
      cut_type: selectedCut.cut_type,
      time_in: selectedCut.time_in,
      time_out: selectedCut.time_out,
      claude_reason: selectedCut.reason,
      transcript_context: "",
      action: "rejected",
      adjusted_in: null,
      adjusted_out: null,
      dayner_note: note || null,
    });
    setNote("");
  };

  const handleApproveAll = async () => {
    approveAll();
    await saveCuts(slug, useEditorStore.getState().cuts);
  };

  const handleEscape = () => {
    if (!escapeText.trim()) return;
    // Save to .editor-tasks.txt for Claude Code terminal
    fetch(`/api/corrections/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_slug: slug,
        date: new Date().toISOString().slice(0, 10),
        cut_type: "escape_hatch",
        time_in: 0,
        time_out: 0,
        claude_reason: "",
        transcript_context: "",
        action: "escape_hatch",
        dayner_note: escapeText,
      }),
    });
    setEscapeText("");
  };

  return (
    <div className="p-2.5 border-t border-editor-border space-y-2">
      {/* Approve / Reject */}
      <div className="flex gap-1.5">
        <button
          onClick={handleApprove}
          disabled={!selectedCut}
          className="flex-1 py-1.5 bg-emerald-900 text-emerald-300 rounded text-xs hover:bg-emerald-800 disabled:opacity-30"
        >
          ✓ Aprovar (A)
        </button>
        <button
          onClick={handleReject}
          disabled={!selectedCut}
          className="flex-1 py-1.5 bg-red-900 text-red-300 rounded text-xs hover:bg-red-800 disabled:opacity-30"
        >
          ✗ Rejeitar (R)
        </button>
      </div>

      {/* Note */}
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="nota opcional: por que rejeitou?"
        className="w-full px-2 py-1.5 bg-editor-border border border-editor-border rounded text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-gray-500"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleReject();
          e.stopPropagation(); // prevent keyboard shortcuts
        }}
      />

      {/* Batch actions */}
      <div className="flex gap-1.5">
        <button
          onClick={handleApproveAll}
          className="flex-1 py-1 bg-editor-border text-gray-400 rounded text-[9px] hover:bg-gray-700"
        >
          Aprovar todos
        </button>
      </div>

      {/* Escape hatch D+ */}
      <input
        type="text"
        value={escapeText}
        onChange={(e) => setEscapeText(e.target.value)}
        placeholder="algo diferente? (vira task pro terminal)"
        className="w-full px-2 py-1.5 bg-black border border-dashed border-gray-700 rounded text-[9px] text-gray-500 placeholder:text-gray-700 focus:outline-none focus:border-gray-500"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleEscape();
          e.stopPropagation();
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Write keyboard shortcuts hook**

Replace `tooling/editor/frontend/src/hooks/useKeyboard.ts`:

```typescript
import { useEffect } from "react";
import { useEditorStore } from "../stores/editor";

export function useKeyboard() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const store = useEditorStore.getState();

      switch (e.key) {
        case " ":
          e.preventDefault();
          store.setIsPlaying(!store.isPlaying);
          break;

        case "j":
          store.setCurrentTime(Math.max(0, store.currentTime - 5));
          store.setIsPlaying(false);
          break;

        case "l":
          store.setCurrentTime(Math.min(store.duration, store.currentTime + 5));
          store.setIsPlaying(false);
          break;

        case "k":
          store.setIsPlaying(false);
          break;

        case "ArrowLeft":
          e.preventDefault();
          store.setCurrentTime(Math.max(0, store.currentTime - (1 / 30)));
          store.setIsPlaying(false);
          break;

        case "ArrowRight":
          e.preventDefault();
          store.setCurrentTime(Math.min(store.duration, store.currentTime + (1 / 30)));
          store.setIsPlaying(false);
          break;

        case "ArrowUp":
          e.preventDefault();
          store.selectPrevCut();
          {
            const cut = store.cuts.find((c) => c.id === useEditorStore.getState().selectedCutId);
            if (cut) {
              store.setCurrentTime(cut.adjusted_in ?? cut.time_in);
              store.setIsPlaying(false);
            }
          }
          break;

        case "ArrowDown":
          e.preventDefault();
          store.selectNextCut();
          {
            const cut = store.cuts.find((c) => c.id === useEditorStore.getState().selectedCutId);
            if (cut) {
              store.setCurrentTime(cut.adjusted_in ?? cut.time_in);
              store.setIsPlaying(false);
            }
          }
          break;

        case "a":
          if (store.selectedCutId) store.approveCut(store.selectedCutId);
          break;

        case "r":
          if (store.selectedCutId) store.rejectCut(store.selectedCutId);
          break;

        case "z":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) {
              store.redo();
            } else {
              store.undo();
            }
          }
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
```

- [ ] **Step 4: Start dev server and verify interactions**

```bash
cd /c/Users/quena/projetos/niche-intelligence/tooling/editor
bash scripts/dev.sh --fixture demo
```

Open `http://localhost:5173?slug=demo`. Test:
- Cut list shows 5 items (3 retakes/fillers + 2 gaps)
- Click cut → player seeks + strip highlights
- Press A → cut turns green (approved)
- Press R → cut turns red (rejected)
- Ctrl+Z → undo
- Space → play/pause
- Arrow keys → frame step / navigate cuts
- Type in note field → Enter → rejects with note

- [ ] **Step 5: Commit**

```bash
cd /c/Users/quena/projetos/niche-intelligence
git add tooling/editor/frontend/src/
git commit -m "feat(editor): cut list, action panel, keyboard shortcuts — full review flow"
```

---

## Task 8: WebSocket + Compose + Final Integration

**Files:**
- Modify: `tooling/editor/frontend/src/hooks/useWebSocket.ts`

- [ ] **Step 1: Write WebSocket hook**

Replace `tooling/editor/frontend/src/hooks/useWebSocket.ts`:

```typescript
import { useEffect, useRef } from "react";

export function useWebSocket(slug: string, onUpdate: () => void) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!slug) return;

    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/watch/${slug}`);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "file_changed" || data.type === "compose_done") {
            onUpdate();
          }
        } catch {}
      };

      ws.onclose = () => {
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, [slug, onUpdate]);
}
```

- [ ] **Step 2: Run the full app with fixtures and verify end-to-end**

```bash
cd /c/Users/quena/projetos/niche-intelligence/tooling/editor
bash scripts/dev.sh --fixture demo
```

Open `http://localhost:5173?slug=demo`. Full verification checklist:

1. ✓ Videos load and play in PIP layout (screen large + face corner)
2. ✓ Timeline shows 2 tracks (Face + Screen) as colored bars
3. ✓ Cut strips appear at correct positions with correct colors
4. ✓ Waveform renders audio from face_clean.mp4
5. ✓ Click cut in list → player seeks + strip highlights
6. ✓ Press A → approve cut (green border)
7. ✓ Press R → reject cut (red border)
8. ✓ Drag strip edge → adjust in/out time
9. ✓ Ctrl+Z → undo last action
10. ✓ Ctrl+Shift+Z → redo
11. ✓ Space → play/pause
12. ✓ J/K/L → seek backward/stop/forward
13. ✓ Arrow left/right → frame step
14. ✓ Arrow up/down → previous/next cut
15. ✓ "Aplicar cortes" → saves to backend
16. ✓ "Compor body.mp4" → FFmpeg runs → body.mp4 appears
17. ✓ Zoom in/out with Ctrl+scroll
18. ✓ Note field on reject stores text
19. ✓ Escape hatch field available

- [ ] **Step 3: Run all tests**

```bash
cd /c/Users/quena/projetos/niche-intelligence/tooling/editor
npx vitest run && cd backend && python -m pytest tests/ -v
```

Expected: All frontend (8) and backend (8) tests pass.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/quena/projetos/niche-intelligence
git add tooling/editor/
git commit -m "feat(editor): websocket integration, compose flow — MVP complete"
```

---

## Keyboard Shortcuts Summary

| Key | Action |
|-----|--------|
| Space | Play / Pause |
| J | Seek back 5s |
| K | Stop |
| L | Seek forward 5s |
| ← | Frame back (1/30s) |
| → | Frame forward (1/30s) |
| ↑ | Previous cut |
| ↓ | Next cut |
| A | Approve selected cut |
| R | Reject selected cut |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Ctrl+Scroll | Zoom timeline |
