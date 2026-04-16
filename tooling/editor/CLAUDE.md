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
