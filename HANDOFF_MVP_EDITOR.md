# HANDOFF — MVP Editor Visual (sessao 2026-04-15)

> **Proposito:** Documento de handoff pra proxima sessao continuar o trabalho no
> MVP Editor Visual. Le este arquivo PRIMEIRO antes de qualquer acao.

---

## 1. O que foi feito nesta sessao

### Brainstorming + Design (aprovado pelo Dayner)

Sessao de brainstorming com Visual Companion (mockups no browser) onde 4 gaps
criticos foram debatidos e fechados:

| Gap | Decisao | Alternativas descartadas |
|-----|---------|--------------------------|
| Escopo | **1 editor, 3 modos** (video-cut primeiro; audio/overlays depois) | 3 editores (duplicacao 3x); core+plugins (over-engineering) |
| Papel do Claude | **Opcao D+** — botoes fixos + memoria de calibracao + escape hatch texto | Chat embutido (reimplementa Claude Code); sem Claude (rigido demais) |
| Integracao Claude | **File-based via watcher**. Zero subprocess/chat embutido. Claude Code roda no terminal, editor recarrega via WebSocket quando JSON muda. | Subprocess spawn (fragil); MCP server (complexo) |
| Hospedagem | **`tooling/editor/`** com CLAUDE.md proprio dentro do niche-intelligence | Projeto separado (perde contexto) |

**Ideia original do Dayner:** editor onde ele edita as sugestoes do Claude, executa
cortes um por um ou batch, retrocede (undo), e visualiza o resultado. E CRITICO:
cada correcao do Dayner vira exemplo pro proximo video (feedback loop via
`memory/video-cut-corrections.jsonl`). Apos ~5 videos, sistema calibrado >90%
aprovacao sem ajuste.

### Documentos produzidos

| Arquivo | Conteudo |
|---------|---------|
| `docs/superpowers/specs/2026-04-15-mvp-editor-visual-design.md` | Design spec completo (10 secoes) |
| `docs/superpowers/plans/2026-04-15-mvp-editor-visual.md` | Plano de implementacao (8 tasks, 2571 linhas, codigo completo) |

### Implementacao (8/8 tasks concluidas)

Branch: **`feat/mvp-editor-visual`** (10 commits, a partir de `b0078a6`)

```
ba4869a feat(editor): websocket integration — MVP complete
b855055 feat(editor): cut list, action panel, keyboard shortcuts — full review flow
d8cf066 feat(editor): timeline with cut strips + waveform with wavesurfer.js
228b4dc feat(editor): frontend shell with layout, header, video player + placeholders
8ccabab feat(editor): frontend foundation — types, api, store with undo/redo + tests
49d26c5 feat(editor): backend API server with all endpoints + watcher + tests
93f7905 feat(editor): backend data layer — models + services + tests
67b93be feat(editor): scaffold project structure with configs and fixtures
a8a8b1f feat(editor): implementation plan — 8 tasks with complete code
b0078a6 Add MVP Editor Visual design spec (Onda 0)
```

### Testes

- **Frontend (vitest):** 8/8 pass (editor store: load, approve, reject, adjust, undo, redo, approveAll, select)
- **Backend (pytest):** 8/8 pass (4 service tests + 4 endpoint tests)

### Como rodar

```bash
cd tooling/editor && bash scripts/dev.sh --fixture demo
# Abre http://localhost:5173?slug=demo
```

---

## 2. Arquitetura implementada

```
Frontend (Vite+React :5173)  ←→  Backend (FastAPI :8000)  ←→  Filesystem (data/)
                                        ↕
                                  WebSocket watcher
                                  (watchdog observa data/)
```

### Frontend

| Componente | O que faz |
|------------|-----------|
| `App.tsx` | Layout grid: header / player+sidebar / timeline+waveform. Le `?slug=` da URL. |
| `Header.tsx` | Slug, pending count, undo/redo, "Aplicar cortes", "Compor body.mp4" |
| `VideoPlayer.tsx` | 2 videos HTML5 sync (screen fullscreen + face PIP corner). RAF sync loop. |
| `Timeline.tsx` | 2 tracks (face/screen) + cut strips coloridos + playhead + drag handles + zoom |
| `Waveform.tsx` | wavesurfer.js v7 renderizando audio de face_clean.mp4 |
| `CutList.tsx` | Lista lateral com status icons, time ranges, click-to-navigate |
| `ActionPanel.tsx` | Aprovar/rejeitar + nota + aprovar todos + escape hatch D+ |
| `useKeyboard.ts` | Space, J/K/L, setas, A/R, Ctrl+Z — skipa quando em INPUT |
| `useWebSocket.ts` | Conecta ao backend watcher, recarrega dados em file_changed |
| `editor.ts` (store) | Zustand + immer: cuts state, undo/redo (snapshots), playback, zoom |

### Backend

| Endpoint | Funcao |
|----------|--------|
| `GET /api/project/{slug}` | Metadata (quais arquivos existem) |
| `GET /api/cuts/{slug}` | Cuts mergeados (retakes + gaps + approved status) |
| `POST /api/cuts/{slug}/save` | Escreve cuts_approved.json |
| `POST /api/cuts/{slug}/approve-all` | Aprova todos pendentes |
| `POST /api/corrections/{slug}` | Appenda correcao ao JSONL |
| `POST /api/compose/{slug}` | Dispara FFmpeg async (job_id) |
| `GET /api/compose/{slug}/status` | Poll status do job |
| `WS /ws/watch/{slug}` | Notifica frontend quando JSON muda em disco |
| Static `/media/` | Serve videos com range requests (StaticFiles) |

### Feedback loop (memoria de calibracao)

Cada acao do Dayner (aprovar/rejeitar/ajustar) gera entrada em
`memory/video-cut-corrections.jsonl`:

```json
{
  "video_slug": "slug",
  "date": "2026-04-16",
  "cut_type": "retake|gap|filler",
  "time_in": 3.2, "time_out": 5.8,
  "claude_reason": "retake: repeated 'bem...'",
  "transcript_context": "bem... bem interessante",
  "action": "approved|rejected|adjusted",
  "adjusted_in": null, "adjusted_out": null,
  "dayner_note": "nao era retake, era enfase"
}
```

Proximo video: prompt `retake_detection.md` le esse arquivo no bloco CALIBRACAO.

---

## 3. O que FALTA — gaps auditados

### CRITICO (sem isso nao serve pra uso real)

| # | Gap | Detalhe |
|---|-----|---------|
| 1 | **Auto-avanco apos aprovar/rejeitar** | Hoje fica parado no mesmo corte. Precisa saltar pro proximo pendente automaticamente. |
| 2 | **Preview da regiao do corte** | Tecla P = toca [time_in → time_out] e para. Sem isso nao da pra ouvir o trecho pra decidir. |
| 3 | **Timeline segue o playhead** | Playhead sai da tela durante playback, timeline nao scrolla. |
| 4 | **Compose realmente aplica os cortes** | Hoje o backend FAZ `ffmpeg -i face_clean -c copy body.mp4` (so copia!). Precisa usar concat demuxer/trim filters baseado em cuts_approved.json pra remover os trechos aprovados. |

### IMPORTANTE (fluxo profissional)

| # | Gap | Detalhe |
|---|-----|---------|
| 5 | **Resumo de status** | Mostrar "X aprovados, Y rejeitados, Z pendentes" no header ou topo da lista. |
| 6 | **Feedback visual (toasts)** | "Aplicar cortes" e "Compor" nao mostram nenhum feedback. Toast simples. |
| 7 | **Filtrar cortes por status** | Botoes "Todos / Pendentes / Rejeitados" no topo da CutList. |
| 8 | **Player mostra body.mp4 apos compose** | Trocar source do player pra body.mp4 quando compose termina. |
| 9 | **Controle de velocidade** | 0.5x / 1x / 1.5x / 2x. Essencial pra revisar 12min de video. |

### POLIMENTO

| # | Gap | Detalhe |
|---|-----|---------|
| 10 | **Modal de atalhos** | Tecla "?" abre modal com todos os shortcuts. |
| 11 | **Loading states** | Spinner em videos/waveform/dados enquanto carrega. |
| 12 | **Tratamento de erros** | Mensagem visivel se backend cai, video falha, compose falha. |
| 13 | **Auto-scroll na CutList** | Lista nao scrolla pro corte selecionado via ↑↓. |

### Estimativa de esforco

- Criticos (1-4): ~2-3h
- Importantes (5-9): ~2-3h
- Polimento (10-13): ~1-2h
- **Total: ~5-8h pra editor "profissional usavel"**

---

## 4. Estrutura de arquivos

```
tooling/editor/
├── CLAUDE.md
├── package.json
├── requirements.txt
├── frontend/
│   ├── index.html
│   ├── vite.config.ts, tailwind.config.ts, postcss.config.js, tsconfig.json
│   ├── src/
│   │   ├── main.tsx, App.tsx, index.css
│   │   ├── types.ts, api.ts
│   │   ├── stores/editor.ts
│   │   ├── hooks/useKeyboard.ts, useWebSocket.ts
│   │   └── components/Header, VideoPlayer, Timeline, Waveform, CutList, ActionPanel
│   └── __tests__/editor-store.test.ts
├── backend/
│   ├── server.py, models.py, services.py, pytest.ini
│   └── tests/conftest.py, test_api.py
├── fixtures/demo/
│   ├── cuts_retakes.json, gaps.json, sync.json
│   └── face_clean.mp4, screen_clean.mp4 (gitignored, gerados via FFmpeg)
└── scripts/dev.sh
```

---

## 5. Decisoes que NAO devem ser re-abertas

1. **1 editor, 3 modos** — decidido e implementado. NAO criar 3 editores.
2. **Opcao D+** (botoes + memoria + escape hatch) — decidido. NAO embutir chat Claude.
3. **File-based bridge** — decidido. Claude Code no terminal, editor le/escreve JSONs.
4. **Zustand + immer pra undo** — implementado e testado. NAO migrar pra Redux.
5. **wavesurfer.js v7** — implementado. NAO trocar.
6. **HTML/CSS divs pra timeline** — implementado (nao canvas). NAO migrar pra canvas.
7. **FastAPI + watchdog** — implementado e testado. NAO trocar framework.

---

## 6. Prioridade recomendada pra proxima sessao

1. Implementar os 4 gaps CRITICOS (auto-avanco, preview regiao, timeline-follow, compose real)
2. Implementar os 5 gaps IMPORTANTES (status summary, toasts, filtros, body.mp4 no player, velocidade)
3. Polimento se sobrar tempo
4. Testar com fixtures (ainda nao ha video real — Dayner precisa gravar primeiro)

---

## 7. Referencia cruzada

| Documento | Onde | Quando ler |
|-----------|------|------------|
| Design spec | `docs/superpowers/specs/2026-04-15-mvp-editor-visual-design.md` | Pra entender o "por que" de cada decisao |
| Plano original | `docs/superpowers/plans/2026-04-15-mvp-editor-visual.md` | Pra ver o codigo planejado (2571 linhas) |
| SINTESE_ARQUITETURAL.md | raiz | Pra contexto geral das 4 skills pos-roteiro |
| CLAUDE.md do editor | `tooling/editor/CLAUDE.md` | Pra convencoes do sub-projeto |
| CLAUDE.md raiz | `CLAUDE.md` | Pra contexto geral do niche-intelligence |

---

## 8. Estado do git

- Branch: `feat/mvp-editor-visual` (10 commits)
- Base: `master` (commit `b0078a6`)
- Nao mergeado em master ainda
- Sem remote configurado (repo local only)
- `.gitignore` atualizado com `.superpowers/` e `tooling/editor/fixtures/demo/*.mp4`
