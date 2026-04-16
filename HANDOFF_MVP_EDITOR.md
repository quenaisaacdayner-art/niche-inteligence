# HANDOFF — MVP Editor Visual

> **Propósito:** Handoff entre sessões. Estado atual + contexto pra continuar.
> Le este arquivo PRIMEIRO antes de qualquer ação relacionada ao editor.

> **Fonte única de verdade da spec:** `SINTESE_ARQUITETURAL.md` seção 16.5
> (APROFUNDADA 2026-04-16). Nao reabrir decisões tomadas lá.

---

## 1. Status atual (2026-04-16)

**MVP Editor Visual v1 COMPLETO e FUNCIONANDO.**

- ✅ Redesign CapCut-style aplicado (layout 4 zonas, tema dark navy + teal)
- ✅ Virtual cut mechanic funcionando (player pula cortes aprovados em tempo real)
- ✅ Todas as features MUST HAVE (7/7) e SHOULD HAVE (5/5) da spec 16.5
- ✅ 3/6 NICE TO HAVE (shortcuts modal, batch por tipo, loading states)
- ✅ 51 testes green (26 frontend vitest + 25 backend pytest)
- ✅ Build de produção OK (230KB JS + 20KB CSS)
- ✅ Rodando em `http://localhost:5173?slug=demo` com fixture demo

**Branch:** `feat/mvp-editor-visual` (12 commits, NÃO mergeado em master)

**Últimos commits:**
```
7612ed1 fix(editor): rename camelCase color keys to kebab-friendly lowercase
2668a84 feat(editor): CapCut-style redesign — virtual cut + 4-zone layout
2b4bc0a docs: add handoff for MVP Editor Visual session
ba4869a feat(editor): websocket integration — MVP complete
b855055 feat(editor): cut list, action panel, keyboard shortcuts — full review flow
d8cf066 feat(editor): timeline with cut strips + waveform with wavesurfer.js
228b4dc feat(editor): frontend shell with layout, header, video player + placeholders
```

---

## 2. O que foi feito nesta sessão (2026-04-16)

### 2.1 Sessão de aprofundamento (seção 16.5 da SINTESE)

Dayner reportou que o MVP anterior (2026-04-15) "parecia dashboard, não editor".
Discussão focou em 3 pontos:

1. **Funções faltantes:** cortar em tempo real + ver resultado imediato (não só aprovar/rejeitar).
2. **Design:** muito "developer tool" — queria algo CapCut-like, intuitivo.
3. **Referências:** Dayner mostrou screenshot do CapCut Desktop como look alvo.

Pesquisa paralela confirmou que editores pro caso (CapCut, Descript, Kapwing, DaVinci)
compartilham padrões específicos: timeline multi-track com trim handles, split at playhead,
preview regiao, virtual cut (não re-encoding).

Decisão arquitetural nova: **virtual cut como mecânica central** (player skip via RAF,
não precisa recompor o vídeo a cada ação). Seção 16.5 da SINTESE expandida com spec
completa (12 subseções), marcada APROFUNDADA 2026-04-16.

### 2.2 Implementação

**Redesign aplicado em 21 arquivos:**
- NOVOS: `Inspector.tsx`, `ShortcutsModal.tsx`, `Toasts.tsx`, `test_compose.py`
- REMOVIDO: `ActionPanel.tsx` (substituído por `Inspector.tsx`)
- ATUALIZADOS: App, Header, VideoPlayer, Timeline, Waveform, CutList, useKeyboard,
  editor store (split + skipList + rate + filter + toasts), types, tailwind, CSS, backend

**Tokens de design novos (tailwind.config.ts):**
- `editor.bg` `#15161a` | `editor.panel` `#1e1f25` | `editor.elevated` `#252630`
- `editor.border` `#2a2b35` | `editor.divider` `#1f2029`
- `editor.text` `#e4e4e7` | `editor.muted` `#8b8b9e` | `editor.dim` `#5a5b6b`
- `accent.DEFAULT` `#00bcd4` (teal/cyan) | `accent.hover` `#00d4e8`
- `cut.retake` (vermelho) | `cut.gap` (amber) | `cut.filler` (orange) | `cut.manual` (roxo)

**Virtual cut implementation (VideoPlayer.tsx):**
- `deriveSkipList(cuts)` deriva ranges de cortes aprovados/ajustados (sorted by start)
- RAF loop no player: se `currentTime` está dentro de qualquer range, `video.currentTime = range.out`
- Face + screen pulam sincronizados
- Preview region (P): seta `previewEndTime` no store, player para automático quando atinge
- Zero re-encoding: MP4 original não muda até o usuário clicar "Compor"

**Compose real (backend/services.py):**
- `merge_ranges()` — junta overlaps
- `compute_keep_segments(cuts, duration)` — complemento dos remove ranges
- `build_compose_ffmpeg_args()` — gera FFmpeg `filter_complex` com `trim` + `atrim` + `concat`
- Antes: `ffmpeg -i face_clean -c copy body.mp4` (só copiava)
- Agora: aplica os cortes aprovados via filter graph

### 2.3 Bug corrigido

Tailwind v3 `@apply` em arquivos CSS não resolve nested keys camelCase. Config inicial
tinha `textMuted`, `textDim`, `borderMuted` — dev server PostCSS falhava com
"text-editor-textMuted class does not exist" (build passava, dev não).

Fix: renomeado pra lowercase simples — `muted`, `dim`, `divider`. Atualizado 8 arquivos.
Commit `7612ed1`.

---

## 3. Estrutura de arquivos (atual)

```
tooling/editor/
├── CLAUDE.md                         # sub-project conventions
├── package.json                      # scripts: dev / build / test
├── requirements.txt                  # FastAPI, uvicorn, watchdog, pytest
├── scripts/dev.sh                    # start backend + frontend
├── frontend/
│   ├── index.html
│   ├── vite.config.ts                # proxy /api + /media + /ws → :8000
│   ├── tailwind.config.ts            # design tokens (editor / accent / cut / track)
│   ├── src/
│   │   ├── main.tsx, App.tsx         # 4-zone grid layout
│   │   ├── index.css                 # @tailwind + @layer components
│   │   ├── types.ts                  # Cut, Correction, SkipRange, Toast, FilterStatus
│   │   ├── api.ts                    # fetch wrappers
│   │   ├── stores/editor.ts          # zustand + immer (split, skipList, rate, filter, toasts)
│   │   ├── hooks/
│   │   │   ├── useKeyboard.ts        # Space/J/K/L/S/A/R/P/1-4/?/Delete/Ctrl+Z
│   │   │   └── useWebSocket.ts       # /ws/watch/{slug}
│   │   └── components/
│   │       ├── Header.tsx            # slug + status counters + undo/redo + Save/Export
│   │       ├── CutList.tsx           # left panel, filters All/Pending/Rejected
│   │       ├── VideoPlayer.tsx       # dual sync + virtual cut RAF + speed controls
│   │       ├── Inspector.tsx         # right panel, cut details, approve/reject
│   │       ├── Timeline.tsx          # toolbar + multi-track + trim handles + playhead follow
│   │       ├── Waveform.tsx          # wavesurfer.js sub-component (used by Timeline)
│   │       ├── Toasts.tsx            # notifications
│   │       └── ShortcutsModal.tsx    # ? key modal
│   └── __tests__/editor-store.test.ts # 26 tests (virtual cut, split, auto-advance, filters, etc)
├── backend/
│   ├── server.py                     # FastAPI + WebSocket + CORS + /media mount
│   ├── models.py                     # Cut (w/ source field), Correction, SaveCutsRequest, ComposeJob
│   ├── services.py                   # load/save, append_correction, merge_ranges, compute_keep_segments, build_compose_ffmpeg_args, probe_duration
│   ├── pytest.ini
│   └── tests/
│       ├── test_api.py               # 8 tests (load/save/endpoints)
│       └── test_compose.py           # 17 tests (compose helpers)
└── fixtures/demo/
    ├── cuts_retakes.json, gaps.json, sync.json, cuts_approved.json
    └── face_clean.mp4, screen_clean.mp4   # gitignored
```

---

## 4. Como rodar

```bash
# Terminal único (mata com Ctrl+C):
cd tooling/editor && bash scripts/dev.sh --fixture demo
# Abre: http://localhost:5173?slug=demo

# OU manual em dois terminais:
# Terminal 1 — backend:
cd tooling/editor/backend && \
  PROJECT_ROOT=/c/Users/quena/projetos/niche-intelligence \
  FIXTURE_DIR=/c/Users/quena/projetos/niche-intelligence/tooling/editor/fixtures/demo \
  python -m uvicorn server:app --port 8000 --host 127.0.0.1

# Terminal 2 — frontend:
cd tooling/editor/frontend && npx vite --host 127.0.0.1
```

Rodar testes:
```bash
cd tooling/editor && npm test                          # 26 frontend tests
cd tooling/editor/backend && python -m pytest tests/   # 25 backend tests
cd tooling/editor/frontend && npx tsc --noEmit         # typecheck
cd tooling/editor/frontend && npx vite build           # production build
```

---

## 5. Keyboard shortcuts (definitivos)

| Tecla | Ação |
|---|---|
| Space | Play/Pause |
| J/K/L | Shuttle -5s / Stop / Shuttle +5s |
| ← → | Frame step |
| ↑ ↓ | Navegar entre cortes (respeita filtro ativo) |
| S | **Split no playhead — cria corte manual** |
| A | Aprovar corte selecionado (auto-avanço) |
| R | Rejeitar corte selecionado (auto-avanço) |
| P | **Preview região do corte** (toca [in, out] e para) |
| Delete | Remove corte manual selecionado |
| 1/2/3/4 | Velocidade 0.5x / 1x / 1.5x / 2x |
| Ctrl+Z / Ctrl+Shift+Z | Undo / Redo |
| Ctrl+S | Salvar cortes |
| ? | Abrir modal de shortcuts |
| Esc | Fechar modal / cancelar preview |

---

## 6. Decisões que NÃO devem ser reabertas

(Copiadas da SINTESE seção 16.5 §12 — reabrir só com evidência forte)

1. Layout 4 zonas CapCut — CutList / Player / Inspector / Timeline
2. Virtual cut como mecânica central (player skip RAF, não re-encoding)
3. Tema dark navy + teal accent (tokens no tailwind.config)
4. Stack: Vite + React + Tailwind + Zustand + Immer + wavesurfer.js + FastAPI + watchdog
5. File-based bridge com Claude Code (terminal separado, WebSocket pra reload)
6. Opção D+ (botões + memória calibração + escape hatch, SEM chat embutido)
7. 1 editor, 3 modos (video-cut primeiro; audio/overlays depois)
8. Compose real via FFmpeg `filter_complex` (trim+concat)
9. Split at playhead (S) — cria corte manual de 0.5s centrado no currentTime
10. Status filtros: All / Pendentes / Rejeitados (não "approved")
11. Hospedagem: `tooling/editor/` (não `skills/`)

---

## 7. O que falta (próxima sessão ou posteriores)

### 7.1 NICE TO HAVE ainda não implementados (baixa prioridade)

- **Frame thumbnails na timeline** — requer FFmpeg server-side pra gerar sprite de frames
- **Overview + detail timeline** (DaVinci Cut Page pattern) — timeline fina full-length + zoom detail
- **Body.mp4 preview post-compose** — player troca source automaticamente após compose
- **Modo video-audio / video-overlays** — mesma UI, mas outros tipos de operações

### 7.2 Bloqueios externos

**Onda 1b (video-cut)** está **bloqueada** por 2 pré-requisitos:

1. **Dayner grava 1º vídeo teste real** (5-10min: hook + demo + CTA)
   - Instalar Recordly + OBS
   - Gravar face-cam + screencast separados
   - ~1h de trabalho manual

2. **Atualizar `roteiro-youtube` pra emitir markers visuais**
   - Schema: `[BLOCO N — SOURCE:position]` (FACE / PIP / SCREEN)
   - Sem timestamps (whisper-timestamped fornece tempo real via fuzzy match)
   - Spec em SINTESE 16.2 §5.3

**Onda 1a (thumbnail-generator)** já foi construída (smoke test OK) mas aguarda vídeo real
pra validar `gen_background.py` (Gemini API $0.06/run) + judge multimodal com Read tool.

---

## 8. Próxima sessão — plano acordado

**Decisão (2026-04-16):** caminho paralelo.

**Dayner faz (manual):**
1. Instalar Recordly (v1.1.20+) + OBS Studio
2. Configurar captura (webcam + mic)
3. Gravar 1 vídeo de 5-10min com estrutura: hook (FACE) → demo (PIP:br) → CTA (FACE)
4. Salvar como `data/video-raw/{slug}/facecam.mp4` + `screencast.mp4`

**Claude Code faz (código) em paralelo:**
1. Atualizar `skills/roteiro-youtube/` pra emitir markers `[BLOCO N — SOURCE]`
   (ver SINTESE 16.2 §5.3 pra schema exato)
2. Scaffold da skill `video-cut`:
   - `skills/video-cut/SKILL.md`
   - `references/prompts/_video_cut_principles.md`
   - `references/prompts/retake_detection.md`
   - `references/prompts/manifest_builder.md`
   - `scripts/extract_audio.py`, `transcribe.py`, `detect_gaps.py`, `merge_timeline.py`, `compose_body.py`
   - (estruturas prontas, retake detection calibrado quando houver footage)

**Quando convergir:** plugar footage real + markers + scripts → validar pipeline completo
no MVP Editor (com dados reais, não fixtures).

---

## 9. Se quiser iterar no MVP Editor antes de video-cut

(Bloco separado — sessão dedicada a tweaks do editor, conforme Dayner pediu.)

Abrir Claude Code dentro do projeto, iniciar sessão dizendo: "quero iterar o MVP Editor".
Claude deve ler (nesta ordem):
1. `HANDOFF_MVP_EDITOR.md` (este arquivo) — contexto
2. `SINTESE_ARQUITETURAL.md` §16.5 — spec completa, decisões
3. `tooling/editor/CLAUDE.md` — convenções locais
4. Branch `feat/mvp-editor-visual` checked out
5. Rodar `bash scripts/dev.sh --fixture demo` pra ver estado atual

Coisas seguras pra adicionar/mudar:
- Features aspiracionais da SINTESE 16.5 §6
- Ajustes de UX finos (espaçamentos, cores de tokens)
- Mais atalhos / mais filtros
- Integrações novas (e.g. transcript sidebar)

Coisas NÃO reabrir sem discussão forte:
- As 11 decisões listadas na seção 6 acima.

---

## 10. Referência cruzada

| Documento | Onde | Quando ler |
|---|---|---|
| Spec completa do editor | `SINTESE_ARQUITETURAL.md` §16.5 | Sempre — fonte única de verdade |
| Spec do video-cut | `SINTESE_ARQUITETURAL.md` §16.2 | Antes de construir video-cut |
| Sub-projeto convenções | `tooling/editor/CLAUDE.md` | Ao editar código do editor |
| CLAUDE.md raiz | `CLAUDE.md` | Contexto geral do niche-intelligence |
| Memory MVP Editor | `~/.claude/projects/.../memory/project_mvp_editor_built.md` | Auto-carregado em sessão |

---

## 11. Estado do git (snapshot)

- **Branch atual:** `feat/mvp-editor-visual`
- **Base:** `master` (commit `b0078a6`)
- **Commits nesta branch:** 12 (5 originais + 7 desta sessão de redesign)
- **Status vs master:** 12 commits à frente, não mergeado
- **Remote:** não configurado (repo local only)
- **Untracked no root:** arquivos de pesquisa (.md), configs, data/, skills/, etc —
  NÃO são do editor, foram deixados intencionalmente fora deste commit.

Pra ver o que mudou: `git log master..feat/mvp-editor-visual --oneline`
