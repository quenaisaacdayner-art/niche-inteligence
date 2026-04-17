# Skill `video-cut` — Design Spec

**Data:** 2026-04-17
**Status:** Approved (Dayner), pronta para planning de implementacao
**Autoridade:** Este doc substitui ambiguidades de `SINTESE_ARQUITETURAL.md` §16.2. Para decisoes ja fechadas na secao 16.2.11, este doc detalha e opera.

---

## 1. Overview

`video-cut` e a skill que processa o `master.mp4` pre-montado pelo Dayner (num editor convencional) e **sugere** cortes semanticos — retakes, filler words, silencios >3s, trechos fora-do-roteiro. A skill nao re-encoda, nao compoe, nao entrega video final. O compose real e feito pelo **MVP Editor** (`tooling/editor/`) apos revisao humana.

A skill tem **2 entry points**:

1. **Pre-edit** (`video-cut <slug>`) — gera sugestoes de corte + transcript. Consumidos pelo editor.
2. **Post-edit** (`video-cut --build-manifest <slug>`) — apos Dayner aprovar cortes no editor, emite `manifest.json v2` (contrato canonico com skills downstream).

## 2. Contexto e motivacao

**Upgrade editor "1 master + N overlays" (2026-04-16)** invalidou o pipeline 10-step original da SINTESE §16.2.5.1 (extract_audio dupla, sync_detect com claquete, auto-editor render, compose_body, MediaPipe dynamic crop). O fluxo real do Dayner agora e:

```
varias fontes (OBS/Recordly) → editor convencional (CapCut/DaVinci) 
  → master.mp4 unico (30-60min, sujo) 
  → video-cut (sugere cortes) 
  → MVP Editor (revisao humana) 
  → MVP Editor (compose final via FFmpeg filter_complex — ja implementado)
```

A skill e um **"editor junior"** que le um master e sugere recortes; **nao monta video**.

## 3. Arquitetura

### 3.1 Data flow

```
[Dayner] → data/video-raw/{slug}/master.mp4
                        │
                        ▼
          ┌─────────────────────────────┐
          │   video-cut <slug>           │   (pre-edit, 4 steps)
          │                              │
          │  1. transcribe.py            │
          │  2. load_learning.py         │
          │  3. Claude retake_detection  │
          │  4. detect_gaps.py           │
          └──────────────┬───────────────┘
                         ▼
          data/video-processed/{slug}/
          ├── transcripts/master.words.json
          ├── learning_context.json
          ├── cuts_retakes.json   ──────┐
          └── gaps.json           ──────┤
                                        │
                                        ▼
                         [MVP Editor abre, Dayner revisa]
                                        │
                                        ▼
                         cuts_approved.json (editor escreve)
                                        │
                                        ▼
          ┌─────────────────────────────┐
          │ video-cut --build-manifest   │   (post-edit, 1 step)
          │                              │
          │  5. Claude manifest_builder  │
          └──────────────┬───────────────┘
                         ▼
                  manifest.json v2
                         │
                         ▼
         [downstream: video-audio, skill-transicoes, video-overlays]
```

### 3.2 Contratos

| Contrato | Quem escreve | Quem le |
|---|---|---|
| `cuts_retakes.json` | `video-cut` pre-edit | MVP Editor, `manifest_builder.md` |
| `gaps.json` | `video-cut` pre-edit | MVP Editor, `manifest_builder.md` |
| `cuts_approved.json` | MVP Editor | `video-cut` post-edit |
| `manifest.json v2` | `video-cut` post-edit | downstream skills |
| `transcripts/master.words.json` | `video-cut` pre-edit | `retake_detection.md`, `manifest_builder.md` |
| `learning_context.json` | `video-cut` pre-edit | `retake_detection.md` |

### 3.3 Contrato com roteiro-youtube (upstream)

A skill `video-cut` le roteiros **somente em schema v2**:

```
**[BLOCO <N>] {act: HOOK|MECHANISM|CTA}**
"<fala literal do bloco>"
```

Sem `FACE|PIP|SCREEN` (schema v1 descontinuado — master e pre-montado).
Sem timestamps no roteiro (whisper resolve).

Se roteiro for v1, `manifest_builder.md` aborta com erro explicito pedindo re-geracao.

## 4. Pipeline pre-edit

### Step 1 — `transcribe.py`

- **Input:** `data/video-raw/{slug}/master.mp4`
- **Output:** `data/video-processed/{slug}/transcripts/master.words.json`
- **Implementacao:** chama `whisper-timestamped` modelo `medium` em CPU.
- **Parametros fixos:**
  - Language: auto-detect (normalmente `pt`)
  - VAD: `auto` (reduz halucinacao em silencio)
  - Device: `cpu` (Iris Xe iGPU nao acelera whisper ainda)
- **Schema output:** formato nativo `whisper-timestamped` — `{"text", "segments": [{"text", "start", "end", "words": [{"word", "start", "end", "confidence"}]}]}`
- **Performance esperada (Iris Xe CPU, modelo medium):** ~2x realtime → 10min audio ≈ 20min wall-clock. Logado em stderr.
- **Falhas:**
  - master.mp4 missing → exit 1 com path esperado
  - whisper OOM / crash → exit 1 + comando manual de debug (`ffmpeg -i master.mp4 -ar 16000 test.wav` pra Dayner validar audio)
  - modelo nao baixado (1a run) → baixa automatico, loga progresso

### Step 2 — `load_learning.py`

- **Input:** `memory/video-cut-corrections.jsonl`
- **Output:** `data/video-processed/{slug}/learning_context.json`
- **Algoritmo:**
  1. Le todas as entradas do jsonl
  2. Agrupa por `(cut_type, claude_reason_pattern)` (pattern = primeiras 3-5 palavras do reason)
  3. Para cada grupo com `samples >= 5`:
     - Se `approved_rate >= 0.80` → regra `applied` (aplica mais agressivo no futuro)
     - Se `approved_rate <= 0.30` → regra `disabled` (skill nao sugere mais esse padrao)
     - Entre 0.30-0.80 → neutro (nao aplica nem desabilita; coleta mais amostras)
  4. v1: so aplica regras com N>=5. v2 (futuro): aplica com N>=3 + ponderacao Bayesiana.
- **Schema output:** ver `learning_context.json` em §7.
- **Falha:** se jsonl nao existe ou vazio → output `{"applied_rules": [], "disabled_rules": [], "total_samples": 0}` (nao bloqueia).

### Step 3 — Claude inline `retake_detection.md`

- **Input:**
  - `transcripts/master.words.json`
  - `learning_context.json`
  - `config/my-context.md` (voz do Dayner)
  - `output/scripts/{slug}.md` (opcional; roteiro v2 se disponivel)
- **Output:** `data/video-processed/{slug}/cuts_retakes.json`
- **Tarefa:** detectar **retakes**, **filler words** e **off_script_review** dentro do transcript.
- **Heuristicas de retake:**
  1. Frases com >=80% word overlap em janela ±30s = candidato
  2. Marcadores verbais: "nao espera", "deixa eu repetir", "vou falar de novo", "espera", "hmm nao", "na verdade"
  3. Hesitacao > 2s antes de frase quase identica a anterior
- **Filler words v0:** `["uh", "hum", "né?" (final de frase), "tipo" (meio), "então" (inicio), "meio que"]`
- **Off_script_review:** conservador. Se trecho nao bate com nenhum bloco do roteiro (quando roteiro fornecido), sempre marca `off_script_review`. Editor decide. **Nunca corta silenciosamente** fala fora do roteiro.
- **Filtro:** ignorar palavras com confidence < 0.3 (whisper hallucination)
- **Regras de learning_context aplicadas:**
  - Se existe `applied_rule` match → raise threshold de confidence (sugere mais)
  - Se existe `disabled_rule` match → skippa (nao sugere)
- **Schema output:** ver §7.
- **Observabilidade:** stderr imprime `N retakes / N fillers / N off_script detectados`. Se vídeo > 5min e 0 retakes, WARN "low retake count — verificar transcript".

### Step 4 — `detect_gaps.py`

- **Input:** `data/video-raw/{slug}/master.mp4`
- **Output:** `data/video-processed/{slug}/gaps.json`
- **Implementacao:** FFmpeg `silencedetect` filter.
  ```bash
  ffmpeg -i master.mp4 -af silencedetect=n=-30dB:d=3.0 -f null - 2>&1
  ```
  Parse stderr lines `silence_start: X` / `silence_end: Y | silence_duration: Z`.
- **Parametros fixos:**
  - Threshold: `-30dB`
  - Min duration: `3.0s` (silencio menor = pausa natural, nao corta)
- **Schema output:** `[{"in": <float>, "out": <float>, "type": "silence", "duration": <float>}]`
- **Falha:** ffmpeg nao no PATH → validate_setup ja capturou; aqui crash = bug real.

## 5. Pipeline post-edit

### Step 5 — Claude inline `manifest_builder.md`

- **Input:**
  - `cuts_approved.json` (editor escreveu)
  - `transcripts/master.words.json`
  - `output/scripts/{slug}.md` (v2 obrigatorio)
- **Output:** `data/video-processed/{slug}/manifest.json` (schema v2, §7)
- **Algoritmo:**
  1. Parse markers do roteiro: extrai blocos `[BLOCO N] {act: ...}` + primeira frase como fala
  2. Para cada bloco:
     - `anchor_start` = primeiras 3-5 palavras da fala
     - `anchor_end` = ultimas 3-5 palavras da fala
     - Fuzzy match (`Levenshtein >= 80%` ou `fuzzysearch` library) no transcript
     - Se ambos encontrados → `cut_in`/`cut_out` = timestamps das palavras
     - Se so start → usa start do proximo bloco como end
     - Se nenhum → `match_confidence: "missing"` + fallback por vizinhanca (herda `prev.cut_out` → `next.cut_in`)
  3. Aplica `cuts_applied[]` (tudo que esta em `cuts_approved.json` com action=approved|adjusted)
  4. Converte timestamps raw → cut (subtrai duracao acumulada dos cortes anteriores ao clip)
  5. Emite clips com IDs estaveis (`clip-00`, `clip-01`, ...) + `prev_clip_id`/`next_clip_id`
  6. Classifica `boundary_in`/`boundary_out`:
     - `start` / `end` nos extremos
     - `act_change` quando `clip[i].act != clip[i-1].act`
     - `same_act` caso contrario
  7. Valida invariante: `sum(clip.duration) ≈ master_duration_cut` (tolerancia 0.1s)
- **Falhas:**
  - Roteiro em v1 detectado (tem `— FACE|PIP|SCREEN`) → exit 1, pede re-geracao
  - Roteiro nao existe → exit 1, emite manifest degradado com todo master como 1 clip unico (modo "no-roteiro")
  - Invariante diverge > 0.1s → stderr WARN com diff, continua
  - Qualquer clip com `match_confidence != "high"` → stderr com lista + sugere editar no MVP Editor

## 6. Prompts (outline do conteudo)

### `_video_cut_principles.md` — camada constitucional

7 principios:

1. **ROTEIRO E LEI, TRANSCRIPT E VERDADE.** Intencao vem do roteiro marcado; timestamps reais vem do whisper. Fuzzy match por frase-ancora reconcilia os dois.
2. **CONSERVADOR EM DUVIDA.** Retake em duvida = MANTEM. Editor visual resolve via aprovacao humana.
3. **SILENCIO E COMANDO DE CORTE.** > 3s = Dayner deliberadamente pulando tempo morto.
4. **MASTER NAO SE REENCODA.** Skill so sugere cortes. Compose real e do editor.
5. **FALHA VISIVEL > FALHA SILENCIOSA.** Match com baixa confianca, cortes duvidosos, sync falho: reportar com destaque. Nunca esconder.
6. **CONTEXTO DO DAYNER SEMPRE APLICADO.** Ler `config/my-context.md` antes de decisoes semanticas.
7. **IMPROVISO BOM ≠ RETAKE RUIM.** Fora-do-roteiro + unico + conecta ao bloco = `off_script_review` (NUNCA corta silenciosamente).

### `retake_detection.md` — fase 3

Estrutura:

```
Ler `_video_cut_principles.md` primeiro.

INPUT: words.json, learning_context.json, my-context.md, [scripts/{slug}.md opcional]

TASK: detectar retakes, fillers, off_script. Emitir cuts_retakes.json.

HEURISTICAS:
1. Retake por overlap (≥80% word overlap em ±30s)
2. Retake por marcador verbal (lista fixa)
3. Hesitacao > 2s + frase similar
4. Filler words (lista v0 fixa)
5. Off_script: fala nao bate com nenhum bloco do roteiro (se fornecido)

LEARNING: aplicar applied_rules / disabled_rules de learning_context.json

OUTPUT: cuts_retakes.json (schema §7)
```

### `manifest_builder.md` — fase 5

```
Ler `_video_cut_principles.md` primeiro.

INPUT: cuts_approved.json, words.json, scripts/{slug}.md (v2 obrigatorio)

TASK: emitir manifest.json v2 mapeando blocos → clips virtuais.

ALGORITMO: ver §5 step 5.

VALIDATIONS:
- Roteiro em v1? exit 1
- Invariante duration? WARN
- Match missing? fallback vizinhanca + flag off_script_review

OUTPUT: manifest.json (schema v2, §7)
```

## 7. Schemas (referencia)

### 7.1 `master.words.json` (formato whisper-timestamped nativo)

```json
{
  "text": "...",
  "segments": [
    {
      "text": "...",
      "start": 0.12,
      "end": 4.5,
      "words": [
        {"word": "cara", "start": 0.12, "end": 0.34, "confidence": 0.98},
        ...
      ]
    }
  ]
}
```

### 7.2 `learning_context.json`

```json
{
  "applied_rules": [
    {
      "rule_key": "filler_tipo_meio",
      "samples": 7,
      "approved_rate": 0.86,
      "description": "cortar 'tipo' em meio de frase"
    }
  ],
  "disabled_rules": [
    {
      "rule_key": "silence_exact_3_0s",
      "samples": 10,
      "approved_rate": 0.20,
      "description": "Dayner rejeita silencios de exatamente 3.0s frequentemente"
    }
  ],
  "neutral_rules": [],
  "total_samples": 19,
  "min_samples_for_rule": 5,
  "generated_at": "2026-04-17T14:22:00"
}
```

### 7.3 `cuts_retakes.json`

```json
[
  {
    "in": 45.2,
    "out": 48.1,
    "type": "retake",
    "reason": "repeated 'bem nao'",
    "confidence": 0.87,
    "transcript_context": "...bem nao espera bem nao..."
  },
  {
    "in": 62.1,
    "out": 62.9,
    "type": "filler",
    "reason": "'tipo' meio-frase",
    "confidence": 0.95,
    "transcript_context": "...o processo tipo de decisao..."
  },
  {
    "in": 140.0,
    "out": 152.3,
    "type": "off_script_review",
    "reason": "texto fora do roteiro, conecta parcialmente ao BLOCO 8",
    "confidence": 0.55,
    "transcript_context": "..."
  }
]
```

Campo `type` ∈ `{"retake", "filler", "off_script_review"}`.
Confidence < 0.85 ainda vai pro arquivo (editor destaca em amarelo, humano decide).

### 7.4 `gaps.json`

```json
[
  {"in": 8.0, "out": 11.5, "type": "silence", "duration": 3.5}
]
```

Schema identico ao que editor ja le.

### 7.5 `cuts_approved.json` (editor escreve, skill le)

Formato existente do editor — nao sera modificado.

### 7.6 `manifest.json v2`

```json
{
  "slug": "anti-notebook",
  "master_file": "master.mp4",
  "master_duration_raw": 1827.50,
  "master_duration_cut": 1245.30,
  "clips": [
    {
      "id": "clip-00",
      "bloco": 1,
      "act": "HOOK",
      "raw_in": 0.12,
      "raw_out": 45.20,
      "cut_in": 0.00,
      "cut_out": 45.08,
      "duration": 45.08,
      "anchor_start": "cara ce ja imaginou",
      "anchor_end": "mexer em nada",
      "transcript_excerpt": "cara ce ja imaginou um sistema ...",
      "match_confidence": "high",
      "prev_clip_id": null,
      "next_clip_id": "clip-01",
      "boundary_in": "start",
      "boundary_out": "act_change",
      "off_script_review_flags": []
    }
  ],
  "cuts_applied": [
    {"in": 12.40, "out": 15.80, "type": "silence"},
    {"in": 102.10, "out": 108.30, "type": "retake"}
  ]
}
```

Invariante: `sum(clips[].duration) ≈ master_duration_cut` (tolerancia 0.1s).

## 8. Error handling (politica unificada)

| Classe | Comportamento |
|---|---|
| whisper nao instalado / ffmpeg missing | `validate_setup.py` exit 1 com link do `pip install` |
| master.mp4 nao encontrado | exit 1 + path esperado |
| transcribe quebra | exit 1 + comando manual de debug (`ffmpeg -i master.mp4 -ar 16000 test.wav`) |
| fuzzy match < 80% | `match_confidence: "low"` + stderr warning + lista de blocos |
| fuzzy match missing | `match_confidence: "missing"` + fallback vizinhanca + flag `off_script_review_flags: ["match_missing"]` |
| invariante duration diverge > 0.1s | stderr WARN com diff; continua |
| roteiro em schema v1 | exit 1, pede re-geracao em v2 |
| jsonl de learning vazio | OK — learning_context degrada gracefully (rules = []) |
| budget excedido | hard-stop via `check_budget()` (zero custo de API externo nesta skill — so tokens Claude) |

Nenhuma falha silenciosa. Stdout = JSON. Stderr = humano.

## 9. Testing strategy

### Fase A — smoke test (desbloqueada ja)

Roda em `tooling/editor/fixtures/anti-notebook/master.mp4` (178s face-cam real). Valida:

- [ ] `validate_setup.py` passa (whisper + ffmpeg presentes)
- [ ] `transcribe.py` produz `master.words.json` com words > 0 e confidence media > 0.7
- [ ] `detect_gaps.py` produz `gaps.json` com 0..N entradas (provavelmente 0 em face-cam limpo)
- [ ] `retake_detection.md` roda sem crash, produz `cuts_retakes.json`
- [ ] `load_learning.py` consome o jsonl existente em `memory/` sem quebrar

Nao testa fuzzy match (no roteiro correspondente).

### Fase B — integracao (post-edit)

Desbloqueada quando:
- 1 vídeo real gravado pelo Dayner, OU
- Mini-roteiro sintetico escrito reverso a partir do transcript do anti-notebook

Valida:
- [ ] `manifest.json v2` completo com todos clips
- [ ] 100% dos clips com `match_confidence` definido
- [ ] Invariante `sum(duration) ≈ master_duration_cut`
- [ ] IDs sequenciais sem salto
- [ ] Grafo `prev/next_clip_id` integro

### Unit tests Python (pytest)

- `test_load_learning.py` — agregacao do jsonl, regras applied/disabled/neutral
- `test_detect_gaps.py` — parsing do silencedetect output (mock ffmpeg)
- `test_config.py` — paths calculados corretos
- `test_schemas.py` — validacao de outputs contra schemas §7

**Sem** rodar whisper nos unit tests (muito pesado; coberto pelo smoke).

## 10. Estrutura de diretorios

```
skills/video-cut/
├── SKILL.md                              # trigger + protocolo obrigatorio
├── references/
│   └── prompts/
│       ├── _video_cut_principles.md
│       ├── retake_detection.md
│       └── manifest_builder.md
├── scripts/
│   ├── __init__.py
│   ├── config.py                         # paths, thresholds, constants
│   ├── validate_setup.py
│   ├── transcribe.py
│   ├── load_learning.py
│   └── detect_gaps.py
└── tests/
    ├── fixtures/
    │   └── silence_sample.wav            # 10s com silencio conhecido
    ├── test_load_learning.py
    ├── test_detect_gaps.py
    ├── test_config.py
    └── test_schemas.py

data/video-raw/{slug}/
└── master.mp4                            # input manual do Dayner

data/video-processed/{slug}/              # outputs da skill
├── transcripts/
│   └── master.words.json
├── learning_context.json
├── cuts_retakes.json
├── gaps.json
├── cuts_approved.json                    # editor escreve
└── manifest.json                         # skill post-edit escreve
```

## 11. Dependencias e pre-requisitos

### Pre-build (antes de qualquer codigo)

- [ ] `pip install whisper-timestamped` (baixa ~1.5GB no 1o run do modelo medium)
- [ ] ffmpeg no PATH (ja confirmado, v8.1 em `C:\Users\quena\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_*`)
- [ ] `memory/video-cut-corrections.jsonl` existe (confirmado, 19 entradas)
- [ ] `tooling/editor/fixtures/anti-notebook/master.mp4` existe (confirmado, 178s)

### Runtime (cada execucao)

- `config/my-context.md` (ja existe)
- `output/scripts/{slug}.md` em v2 (opcional pre-edit, obrigatorio post-edit)

### Python libs (stdlib + whisper)

- `whisper-timestamped` (nova dep)
- `Levenshtein` ou `fuzzysearch` (nova dep pra fuzzy match)
- stdlib: `json`, `pathlib`, `subprocess`, `argparse`, `sys`, `re`

Relaxa regra "stdlib-only" das skills de niche-intel/content-research (alinhado com SINTESE §6: skills de video podem usar deps especializadas).

## 12. Integracao com componentes existentes

| Componente | Relacao |
|---|---|
| `roteiro-youtube` | Upstream. Fornece `output/scripts/{slug}.md` em v2. Sem ajuste necessario (ja emite v2). Roteiros antigos em v1 precisam ser re-gerados manualmente. |
| `MVP Editor` (`tooling/editor/`) | Lateral. Le `cuts_retakes.json` + `gaps.json` + `transcripts/master.words.json`. Escreve `cuts_approved.json`. Zero refactor. |
| `config/my-context.md` | Lido por `retake_detection.md` pra adaptar decisoes a voz do Dayner. |
| `memory/video-cut-corrections.jsonl` | Input de `load_learning.py`. |
| `video-audio` (futura) | Downstream. Le `manifest.json v2` — `act` por clip, `boundary_out` pra whoosh SFX. |
| `video-overlays` (futura) | Downstream. Le `manifest.json v2` — `id`, `cut_in`/`cut_out`, `transcript_excerpt` pra posicionar overlays. |
| `skill-transicoes` (futura) | Downstream. Le `manifest.json v2` — `boundary_out` decide tipo de transicao. |

## 13. Decisoes registradas (com rationale)

| PC | Decisao | Rationale |
|---|---|---|
| PC#1 (schema roteiro) | Skill video-cut aceita so v2. | Evita dois parsers. write_script.md ja emite v2. Roteiros antigos editados manualmente ou re-gerados. |
| PC#2 (formato cuts) | `cuts_retakes.json` + `gaps.json` (separados). | Zero refactor no editor (backend ja le separado). Downstream unifica via manifest_builder. |
| PC#3 (fluxo manifest) | 2 entry points (pre-edit + post-edit). | Manifest so existe quando cortes estao aprovados. Separa preparacao (skill) de aprovacao (humano) de exportacao (editor). |
| PC#4 (whisper) | `pip install whisper-timestamped`, modelo medium. | Confirmado na SINTESE §5. Baixa no 1o run. CPU-only (Iris Xe nao acelera). |
| PC#5 (off_script heuristica) | Conservador: sempre marca. | Principio 5 ("falha visivel > silenciosa") + Principio 7 ("improviso bom ≠ retake ruim"). |
| PC#6 (video de teste) | 2 fases: smoke em anti-notebook ja; integracao quando video real ou roteiro sintetico. | Desacopla teste tecnico (transcribe/gaps/retake funcionam) de teste semantico (fuzzy match). |
| PC#7 (invariante fallback) | Fallback por vizinhanca + flag match_missing. | Preserva invariante matematica. Humano ve flag no editor. Zero falha silenciosa. |

## 14. Out of scope (v1)

- Take selection (varios takes da mesma fala) — Dayner grava 1 take so
- Chapter markers auto no YouTube Studio — proxima skill
- Legendas queimadas (SRT burn-in) — video-audio ou skill futura
- XML export pra DaVinci — escape hatch v2
- Breathing zoom sutil em face-cam — video-overlays
- Dynamic crop (MediaPipe) — editor v3 (adiado na SINTESE §16.2.11)
- Take policy multi-take — v2
- Learning Bayesiano (N<5 com ponderacao) — v2
- Auto-abrir editor no fim do pre-edit — editor abre via script dev.sh dedicado

## 15. Criterio "bom o suficiente" (skill pronta pra entregar)

Pre-edit completo quando:
- [ ] `master.words.json` com confidence media > 0.7
- [ ] `gaps.json` com entradas validas (duration >= 3s)
- [ ] `cuts_retakes.json` produz resultado consistente entre runs (determinismo LLM via seed/temp=0)
- [ ] Nenhum retake sobrepoe gap
- [ ] Filler words com confidence < 0.85 descartados (anti-halucinacao)

Post-edit completo quando:
- [ ] Manifest v2 com todos clips do roteiro
- [ ] 100% com `match_confidence` ∈ {high, low, missing, n/a}
- [ ] Invariante duration (tolerancia 0.1s)
- [ ] Grafo `prev/next_clip_id` integro
- [ ] `boundary_out` enum valido em 100% dos clips

Skill aprovada pra uso real quando:
- [ ] Smoke test (fase A) passa em anti-notebook
- [ ] 1 video real completo roda end-to-end (fase B)
- [ ] Dayner aprova pelo menos 60% dos retakes sugeridos no 1o video (se <60%, ajustar heuristicas)

## 16. Referencias

- `SINTESE_ARQUITETURAL.md` §16.2 (spec aprofundada) e §16.2.11 (reconciliacao 2026-04-16)
- `SINTESE_ARQUITETURAL.md` §16.5 (MVP Editor upgrade 2026-04-16)
- `tooling/editor/CLAUDE.md` (contrato do editor)
- `skills/roteiro-youtube/references/prompts/write_script.md` §Schema de markers
- `memory/video-cut-corrections.jsonl` (19 entradas de teste do editor em 2026-04-16)
- `CLAUDE.md` §11 (regras tecnicas invariaveis do projeto)
- Oleg Melnikov prompt original (`skool-prompt-niche-analysis.md`) — nao aplicavel aqui (niche-intel), mas estabelece cultura "Claude inline + Python scripts" que a skill segue.

---

**Proximo passo:** invocar skill `superpowers:writing-plans` pra gerar plano de implementacao detalhado (TDD, atomic commits, ordem de construcao).
