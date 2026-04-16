# MVP Editor Visual — Design Spec

> **Data:** 2026-04-15
> **Status:** Design aprovado pelo Dayner. Pronto pra implementacao.
> **Referencia:** SINTESE_ARQUITETURAL.md secao 16.5 (Onda 0)

---

## 1. Visao geral

App web local (localhost) que mostra o resultado do pipeline video-cut (cortes sugeridos pelo Claude Code) e permite ao Dayner:

1. **Visualizar** — player de video + timeline 2 tracks + waveform + strips coloridos
2. **Editar** — aprovar/rejeitar/ajustar cada corte sugerido pelo Claude
3. **Executar** — cortes individualmente ou todos de uma vez + compor body.mp4
4. **Retroceder** — undo/redo ilimitado em qualquer acao
5. **Calibrar** — cada correcao vira exemplo pro proximo video (feedback loop)

**Decisoes estruturais:**

| Decisao | Escolha | Alternativas descartadas |
|---------|---------|--------------------------|
| Escopo | 1 editor, 3 modos (video-cut primeiro; audio/overlays depois) | 3 editores separados (duplicacao 3x); core+plugins (over-engineering) |
| Papel do Claude | D+ — botoes fixos + memoria calibracao + escape hatch texto | Chat embutido (reimplementa Claude Code); sem Claude (rigido demais) |
| Integracao Claude | File-based via watcher. Zero subprocess/chat embutido. | Subprocess spawn (fragil); MCP server (complexo); Anthropic API direto (perde Claude Code) |
| Hospedagem | `tooling/editor/` com CLAUDE.md proprio dentro do niche-intelligence | Projeto separado (perde contexto); raiz (polui namespace) |

---

## 2. Arquitetura

3 camadas: Frontend / Backend / Bridge (filesystem).

### 2.1 Frontend — Vite + React + TypeScript (localhost:5173)

Componentes:

| Componente | Responsabilidade |
|------------|-----------------|
| `VideoPlayer` | HTML5 `<video>` com seek preciso, preview PIP (screen + face overlay corner) |
| `Timeline` | Canvas/SVG, 2 tracks sync (face + screen), zoom (Ctrl+scroll), scroll horizontal, playhead arrastavel |
| `Waveform` | wavesurfer.js renderizando audio do face_clean.mp4 |
| `CutStrips` | Strips coloridos na timeline (retake=vermelho, gap=amarelo, filler=laranja) com bordas arrastaveis pra ajuste in/out |
| `CutList` | Painel lateral: lista de cortes com status (pendente/aprovado/rejeitado/ajustado), click pra navegar |
| `ActionPanel` | Botoes aprovar (A) / rejeitar (R) / aprovar todos / re-rodar retakes + campo nota + escape hatch D+ |
| `KeyboardManager` | Hook global: Space (play/pause), J/K/L (seek), setas (frame), setas vert (corte ant/prox), A/R (aprovar/rejeitar), Ctrl+Z/Ctrl+Shift+Z (undo/redo) |

**UI lib:** Tailwind CSS + componentes proprios. Sem framework pesado (sem MUI, sem Ant).

**State management:** Zustand com middleware immer pra snapshots (undo/redo).

### 2.2 Backend — FastAPI (localhost:8000)

Endpoints:

| Metodo | Rota | Funcao |
|--------|------|--------|
| GET | `/api/project/{slug}` | Metadata do projeto (arquivos disponiveis, status pipeline) |
| GET | `/api/cuts/{slug}` | Retorna cuts_retakes.json + gaps.json mergeados + status de aprovacao |
| PUT | `/api/cuts/{slug}/{cut_id}` | Atualiza status de 1 corte (approve/reject/adjust) |
| POST | `/api/cuts/{slug}/approve-all` | Aprova todos os cortes pendentes |
| POST | `/api/compose/{slug}` | Dispara FFmpeg pra compor body.mp4 (async, retorna job_id) |
| GET | `/api/compose/{slug}/status` | Status do job FFmpeg (running/done/error) |
| GET | `/api/video/{slug}/{filename}` | Streaming de video com range requests (face_clean, screen_clean, body) |
| POST | `/api/corrections/{slug}` | Appenda correcao no JSONL |
| GET | `/api/waveform/{slug}` | Retorna dados de waveform pre-computados (FFmpeg → JSON de peaks) |
| WS | `/ws/watch/{slug}` | WebSocket: notifica frontend quando JSON muda em disco |

Dependencias Python: `fastapi`, `uvicorn`, `watchdog`, `pydantic`.

### 2.3 Bridge — Filesystem

O filesystem e a fonte de verdade unica. Editor e Claude Code nunca se falam diretamente — ambos leem/escrevem arquivos no mesmo diretorio.

**Fluxo de sincronizacao:**
1. Claude Code (terminal) escreve JSON em `data/video-processed/{slug}/`
2. Backend roda `watchdog` observando esse diretorio
3. Quando arquivo muda → backend envia evento via WebSocket
4. Frontend recebe evento → refetch dos dados → UI atualiza sem refresh
5. Latencia alvo: <500ms entre Claude salvar e UI mostrar

**Quem escreve o que:**

| Arquivo | Quem escreve | Quem le |
|---------|-------------|---------|
| `cuts_retakes.json` | Claude Code (step 4 video-cut) | Editor (visualizacao) |
| `gaps.json` | Claude Code (step 5 video-cut) | Editor (visualizacao) |
| `sync.json` | Claude Code (step 2 video-cut) | Editor (sync tracks) |
| `transcripts/*.words.json` | Claude Code (step 3 video-cut) | Editor (contexto no CutList) |
| `face_clean.mp4` / `screen_clean.mp4` | auto-editor (step 7 video-cut) | Editor (player) |
| `cuts_approved.json` | Editor (acao Dayner) | Claude Code (step 9 video-cut) |
| `manifest.json` | Claude Code (step 9 video-cut) | Editor (referencia) |
| `body.mp4` | FFmpeg via editor backend (compose) | Editor (preview final) |
| `memory/video-cut-corrections.jsonl` | Editor (toda acao) | Claude Code (proximo video, prompt CALIBRACAO) |

---

## 3. Feedback loop — memoria de calibracao

Cada acao do Dayner no editor (aprovar, rejeitar, ajustar) gera uma entrada no arquivo append-only `memory/video-cut-corrections.jsonl`.

### Schema da correcao

```json
{
  "video_slug": "n8n-skills",
  "date": "2026-04-16",
  "cut_type": "retake | gap | filler",
  "time_in": 45.2,
  "time_out": 48.1,
  "claude_reason": "retake: repeated 'bem...'",
  "transcript_context": "bem... bem interessante isso que o n8n faz",
  "action": "approved | rejected | adjusted",
  "adjusted_in": null,
  "adjusted_out": null,
  "dayner_note": null
}
```

**Campos opcionais:** `adjusted_in`/`adjusted_out` so populados quando `action=adjusted`. `dayner_note` e opcional em todos os casos (campo texto livre no editor).

### Como o Claude consome

O prompt `retake_detection.md` (step 4 da skill video-cut) inclui um bloco `## CALIBRACAO` que instrui Claude a ler `memory/video-cut-corrections.jsonl` antes de sugerir cortes. Claude agrupa padroes por tipo:

- **Rejeitados:** padroes que Dayner NAO quer cortar (ex: "bem... bem X" = enfase)
- **Ajustados:** calibracao de margens (ex: "gaps: deixar 0.3s de margem")
- **Aprovados:** reforco positivo (ex: "filler 'entao' no inicio = cortar sempre")

Apos ~5 videos, taxa de aprovacao esperada: >90%.

---

## 4. Undo/redo

Stack de estados mantido em memoria do browser (zustand + immer middleware).

- Cada acao cria snapshot do array de cortes
- `Ctrl+Z` volta ao snapshot anterior; `Ctrl+Shift+Z` avanca
- Niveis: ilimitado (~1KB por snapshot)
- Resetado ao fechar editor
- **Commit em disco somente ao clicar "Aplicar cortes"** — ate la, tudo na memoria

---

## 5. Estrutura de diretorios

```
niche-intelligence/
├── tooling/
│   └── editor/
│       ├── CLAUDE.md              # instrucoes especificas do editor
│       ├── package.json           # deps frontend
│       ├── requirements.txt       # deps backend
│       ├── frontend/
│       │   ├── src/
│       │   │   ├── components/    # VideoPlayer, Timeline, Waveform, CutList, CutStrips, ActionPanel
│       │   │   ├── hooks/         # useProject, useCuts, useKeyboard, useWebSocket, useUndo
│       │   │   ├── stores/        # zustand: cuts, timeline, undo history
│       │   │   ├── types/         # TypeScript interfaces (Cut, Project, Correction)
│       │   │   └── App.tsx
│       │   ├── index.html
│       │   ├── vite.config.ts
│       │   └── tailwind.config.ts
│       ├── backend/
│       │   ├── server.py          # FastAPI app
│       │   ├── routes/            # project.py, cuts.py, compose.py, corrections.py, video.py, waveform.py
│       │   ├── services/          # ffmpeg.py, watcher.py, corrections.py
│       │   └── models.py          # Pydantic schemas
│       ├── fixtures/
│       │   └── demo/              # videos CC 30s + JSONs fake pra teste
│       └── scripts/
│           └── dev.sh             # inicia frontend + backend juntos
```

**CLAUDE.md do editor:** instrucoes sobre a codebase React+FastAPI, como rodar, convencoes de componentes. NAO duplica o CLAUDE.md raiz do niche-intelligence.

---

## 6. User flow completo

**Premissa:** Dayner ja tem `facecam.mp4` + `screencast.mp4` gravados e roteiro com markers `[BLOCO N — SOURCE]`.

### No terminal (Claude Code)

1. Dayner: "roda video-cut pro slug n8n-skills"
2. Claude executa steps 1-7 automatico (extract_audio → auto-editor)
3. Claude imprime: "Editor pronto: http://localhost:5173?slug=n8n-skills"

### No browser (editor)

4. Dayner abre o link, ve player + timelines + cortes sugeridos
5. Navega entre cortes com setas ↑↓ ou clicando na lista lateral
6. Cada corte: preview no player → decide aprovar (A) / rejeitar (R) / ajustar (drag bordas)
7. Nota opcional em rejeicoes ("nao era retake, era enfase")
8. Pode aprovar todos de uma vez se confia na sugestao
9. Ctrl+Z desfaz qualquer acao
10. Clica "Aplicar cortes" → backend escreve `cuts_approved.json` + appenda corrections no JSONL
11. Clica "Compor body.mp4" → FFmpeg roda → preview carrega no player
12. Se satisfeito: fecha editor

### De volta no terminal

13. Claude detecta que `cuts_approved.json` e `body.mp4` existem
14. Continua com a proxima skill (video-audio)

### Escape hatch

Se algo nao se resolve com os botoes fixos:
- Dayner escreve no campo D+: "refazer retakes 2:00-3:00 janela ±60s"
- Backend salva em `.editor-tasks.txt`
- Dayner pega no terminal e fala pro Claude Code
- Claude re-roda, watcher atualiza UI automaticamente

**Nota:** o botao "re-rodar retakes" tambem segue essa mecanica — retake detection e Claude inline (nao script Python puro), entao o editor gera a task e o Dayner dispara no terminal. Steps que sao Python puro (silence detection, compose) o backend executa direto.

---

## 7. Funcionalidades MVP

### Incluidas no MVP (v1)

- Player de video com seek preciso
- Preview PIP (screen base + face overlay corner)
- Timeline 2 tracks sincronizados (face + screen)
- Waveform de audio (wavesurfer.js)
- Strips coloridos por tipo (retake=vermelho, gap=amarelo, filler=laranja)
- Lista de cortes lateral com status e contagem
- Click em corte → playhead pula pra timestamp
- Aprovar / rejeitar corte (botao + atalho A/R)
- Nota textual opcional na rejeicao (feedback loop)
- Ajustar in/out arrastando bordas do strip na timeline
- Undo/redo ilimitado (Ctrl+Z / Ctrl+Shift+Z)
- Atalhos: Space (play/pause), J/K/L (seek), setas (frame), setas vert (corte ant/prox)
- Zoom na timeline (Ctrl+scroll)
- Botao "Aplicar cortes" (salva em disco)
- Botao "Compor body.mp4" (FFmpeg async)
- Preview body.mp4 apos compose
- File watcher (recarrega quando JSON muda)
- Escape hatch D+ (campo texto → .editor-tasks.txt)
- Salvar corrections em JSONL (calibracao)

### v2+ (fora do MVP)

- Thumbnails na timeline (frames preview)
- Snap/grid entre cortes
- Split view (face e screen lado a lado)
- Waveform separado por track
- I/O marks tipo CapCut (set in / set out)
- Drag & drop de segmentos
- Keyboard customization
- Analytics dashboard (taxa aprovacao ao longo do tempo)
- Export pra DaVinci/Premiere (XML)
- Chapter markers visuais
- Modo video-audio (waveform detalhado + SFX markers)
- Modo video-overlays (overlay preview on timeline)

---

## 8. Como testar sem video real

Fixture sintetico em `tooling/editor/fixtures/demo/`:

| Arquivo | Conteudo |
|---------|---------|
| `face_clean.mp4` | 30s de video Creative Commons (Pexels) |
| `screen_clean.mp4` | 30s de screencast qualquer |
| `cuts_retakes.json` | 5 cortes fake com timestamps reais |
| `gaps.json` | 3 gaps fake |
| `sync.json` | offset 0 |

**Cobertura:** player, timeline, waveform, strips, aprovacao, undo/redo, atalhos, WebSocket, compose, JSONL.

**O que so o video real valida:** waveform de voz real, precisao dos cortes sugeridos por Claude, performance com video 10-15min (~500MB). Nao bloqueia MVP.

**Comando:** `bash scripts/dev.sh --fixture demo`

---

## 9. Dependencias

### Frontend (package.json)

- `react` + `react-dom`
- `typescript`
- `vite`
- `tailwindcss`
- `wavesurfer.js`
- `zustand` + `immer`

### Backend (requirements.txt)

- `fastapi`
- `uvicorn`
- `watchdog`
- `pydantic`

### Sistema

- `ffmpeg` (ja instalado)
- Node.js + npm
- Python 3.10+

---

## 10. Estimativa de esforco

~6-10h com Claude Code (construcao assistida). Divisao aproximada:

| Bloco | Esforco |
|-------|---------|
| Backend FastAPI (endpoints + watcher + video streaming) | ~2h |
| Frontend shell (layout, routing, Tailwind) | ~1h |
| VideoPlayer + Timeline + Waveform | ~2-3h |
| CutList + ActionPanel + atalhos | ~1-2h |
| Undo/redo + corrections JSONL | ~0.5h |
| Fixtures + dev.sh + testes manuais | ~0.5-1h |

Modo video-cut somente. Modos audio/overlays sao esforco separado (v2+).
