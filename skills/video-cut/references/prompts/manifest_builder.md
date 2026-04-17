# manifest_builder — Fase 5 do pipeline post-edit

Ler `_video_cut_principles.md` primeiro.

## INPUT

- `data/video-processed/{slug}/cuts_approved.json` — editor escreveu
  apos revisao humana. Formato existente do editor (campos `time_in`,
  `time_out`, `action` ∈ {`approved`, `rejected`, `adjusted`},
  `adjusted_in`, `adjusted_out`).
- `data/video-processed/{slug}/transcripts/master.words.json`
- `output/scripts/{slug}.md` — OBRIGATORIO em schema v2
  (`[BLOCO N] {act: HOOK|MECHANISM|CTA}`).

## TASK

Emitir `data/video-processed/{slug}/manifest.json` no schema v2
(contrato canonico com downstream: video-audio, video-overlays,
skill-transicoes).

## SANITY CHECKS (faz antes de tudo)

1. Abrir `output/scripts/{slug}.md`. Se arquivo contem qualquer linha
   com `[BLOCO N — FACE]`, `[BLOCO N — PIP`, `[BLOCO N — SCREEN`:
   EXIT 1. Stderr: "Roteiro esta em schema v1 (com SOURCE). Re-gerar
   em v2 via skill roteiro-youtube antes de rodar manifest_builder."

2. Se `cuts_approved.json` nao existe: EXIT 1. Stderr:
   "cuts_approved.json nao encontrado. Abrir MVP Editor, revisar
   cortes, salvar antes de rodar --build-manifest."

3. Se roteiro nao existe: EXIT 1, stderr explica que roteiro e
   obrigatorio pra manifest (modo degraded "sem-roteiro" nao esta na
   v1 da skill — aspiracional).

## ALGORITMO

### 1. Parsear roteiro

Extrai cada bloco em formato:

```
{
  "bloco_num": int,
  "act": "HOOK" | "MECHANISM" | "CTA",
  "fala": "texto literal",
  "anchor_start": "primeiras 3-5 palavras da fala",
  "anchor_end": "ultimas 3-5 palavras da fala"
}
```

### 2. Compute cuts_applied

De `cuts_approved.json`, filtrar so entradas com `action in {"approved", "adjusted"}`.

Para cada entry:
- Se `action == "adjusted"`, usar `adjusted_in` / `adjusted_out`.
- Senao, usar `time_in` / `time_out`.
- Preservar `type` (retake | filler | off_script_review | silence).

Ordenar por `in` crescente. Coleta em `cuts_applied[]`.

### 3. Calcular master_duration_raw e master_duration_cut

- `master_duration_raw` = timestamp `end` da ultima palavra em words.json.
  (Fallback: `ffprobe` se preferir — aceito qualquer um.)
- `master_duration_cut` = `master_duration_raw - sum(c.out - c.in for c in cuts_applied)`.

### 4. Fuzzy match dos blocos

Para cada bloco do roteiro:

1. Buscar `anchor_start` (>= 3 palavras) no transcript com
   `Levenshtein.ratio >= 0.80`.
2. Se encontrado, buscar `anchor_end` DEPOIS do `anchor_start` encontrado.
3. `raw_in` = timestamp da primeira palavra do `anchor_start`
   encontrado.
4. `raw_out` = timestamp da ultima palavra do `anchor_end` encontrado.
5. `match_confidence`:
   - `high` se Levenshtein >= 0.95 em ambos
   - `low` se Levenshtein em [0.80, 0.95]
   - `missing` se qualquer um < 0.80 ou nao encontrado

### 5. Aplicar cuts -> calcular cut_in / cut_out

Para cada bloco com `raw_in` / `raw_out` definidos:

```python
def cut_offset(t, cuts):
    off = 0.0
    for c in cuts:
        if c["out"] <= t:
            off += c["out"] - c["in"]
        elif c["in"] < t < c["out"]:
            off += t - c["in"]
    return off

cut_in  = raw_in  - cut_offset(raw_in, cuts_applied)
cut_out = raw_out - cut_offset(raw_out, cuts_applied)
```

### 6. Fallback de vizinhanca (match_confidence = missing)

Se bloco N tem match missing:

- `raw_in = prev.raw_out` (se prev existe) senao `raw_in = 0.0`
- `raw_out = next.raw_in` (se next existe) senao `raw_out = master_duration_raw`
- `cut_in / cut_out` recalculados via `cut_offset` acima
- `off_script_review_flags.append("match_missing")`
- stderr WARN: "BLOCO N: match missing, fallback applied via prev/next"

### 7. IDs estaveis + grafo prev/next

- `id` = `f"clip-{i:02d}"` onde i = index global 0..N-1
- `prev_clip_id` = id do clip anterior OR null
- `next_clip_id` = id do proximo OR null

### 8. Boundary classification

Para cada clip:

- `boundary_in`:
  - `"start"` se i == 0
  - `"act_change"` se `clip[i].act != clip[i-1].act`
  - `"same_act"` caso contrario
- `boundary_out`:
  - `"end"` se i == N-1
  - `"act_change"` se `clip[i].act != clip[i+1].act`
  - `"same_act"` caso contrario

### 9. Validar invariante de duracao

```python
total = sum(clip.duration for clip in clips)
diff = abs(total - master_duration_cut)
if diff > 0.1:
    print(f"WARN: duration invariant diverges by {diff:.3f}s", file=sys.stderr)
    # NAO bloqueia — continua
```

### 10. Emitir JSON final

```json
{
  "slug": "...",
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

`duration = cut_out - cut_in` (redundante, conveniente pro downstream).

`transcript_excerpt` = primeiras ~100 chars do transcript entre
`raw_in` e `raw_out`.

## OBSERVABILIDADE

Stderr ao final:

```
manifest_builder: N clips, M with match_confidence='high', K='low', P='missing'
  invariante duration: diff=0.0XXs (tolerance 0.1s)
  cuts_applied: X silences, Y retakes, Z fillers, W off_script_review
```

Se P > 0 ou K > 0:

```
ATENCAO: os seguintes blocos precisam revisao humana no editor:
  - BLOCO 3 (match=low): "anchor start nao bateu 100%"
  - BLOCO 7 (match=missing): "fallback de vizinhanca aplicado"
```

## REGRAS INVARIAVEIS

- Invariante matematica: `abs(sum(clips.duration) - master_duration_cut) <= 0.1`
- IDs sequenciais sem salto
- `boundary_in`/`boundary_out` ∈ {"start", "act_change", "same_act", "end"}
- `match_confidence` ∈ {"high", "low", "missing", "n/a"}
- Nenhum clip com `cut_out < cut_in`
- `cuts_applied` ordenado por `in` crescente, sem overlap

## [Context applied]

Ao final, NO STDERR (nao no JSON), nota humana:

```
[Context applied: Dayner valida cada bloco no editor antes de exportar.
Fallback de vizinhanca evita travar o pipeline. match_missing sempre visivel
(principio 5). Clips ID estaveis sobrevivem a re-cortes (principio 1).]
```
