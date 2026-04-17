# SKILL: video-cut

> Processa `master.mp4` pre-montado e sugere cortes semanticos (retakes,
> fillers, silencios, off_script). NAO re-encoda. NAO compoe. O MVP Editor
> em `tooling/editor/` faz o compose final via FFmpeg filter_complex.

## Quando ativar

Triggers (frases do Dayner que roteiam pra esta skill):

- "roda video-cut pro slug X" / "roda video-cut pro anti-notebook"
- "analisa o master.mp4 do X"
- "sugere cortes pro X"
- "gera manifest do X" (post-edit)
- "constroi manifest do X apos aprovar cortes"

## Dois entry points

### Pre-edit

```
python -m scripts.run_precut --slug <slug>
```

(rodar do diretorio `skills/video-cut/`, OU adaptar via PYTHONPATH)

Produz:
- `data/video-processed/{slug}/transcripts/master.words.json`
- `data/video-processed/{slug}/learning_context.json`
- `data/video-processed/{slug}/gaps.json`

Em seguida, Claude inline roda `retake_detection.md` produzindo:
- `data/video-processed/{slug}/cuts_retakes.json`

Depois, abre o MVP Editor pra revisao humana:
```
bash tooling/editor/scripts/dev.sh --slug <slug>
```
(ou em dev: `bash tooling/editor/scripts/dev.sh --fixture anti-notebook`)

### Post-edit (apos Dayner aprovar cortes no editor)

```
python -m scripts.load_learning --slug <slug>   # refresh learning
```

Em seguida, Claude inline roda `manifest_builder.md` consumindo
`cuts_approved.json` + transcripts + roteiro v2 e produzindo:
- `data/video-processed/{slug}/manifest.json` (schema v2)

## PROTOCOLO OBRIGATORIO (agente: seguir literal)

### Passo 0 — pre-flight

```bash
cd skills/video-cut && python -m scripts.validate_setup
```

Se retornar 1, parar. Instalar o que faltar antes de seguir.

### Passo 1 — pre-edit Python pipeline

```bash
cd skills/video-cut && python -m scripts.run_precut --slug <slug>
```

Espera:
- exit 0
- `transcripts/master.words.json` tem `"words"` com confidence media > 0.7
- `gaps.json` existe (pode ser [])
- `learning_context.json` existe

Se any falha, investigar stderr. NAO seguir.

### Passo 2 — ler principios

```
Read: skills/video-cut/references/prompts/_video_cut_principles.md
```

### Passo 3 — retake_detection inline

```
Read: skills/video-cut/references/prompts/retake_detection.md
Read: data/video-processed/{slug}/transcripts/master.words.json
Read: data/video-processed/{slug}/learning_context.json
Read: config/my-context.md
Read: output/scripts/{slug}.md (opcional; se existir, usar)
```

Emitir `data/video-processed/{slug}/cuts_retakes.json` seguindo schema
do prompt. Reportar N retakes / M fillers / K off_script em stderr.

### Passo 4 — abrir editor

Informar Dayner:
```
cuts_retakes.json + gaps.json prontos.
Rodar: bash tooling/editor/scripts/dev.sh --slug <slug>
ou:    bash tooling/editor/scripts/dev.sh --fixture <slug>  (dev mode)
Revisar cortes, aprovar/ajustar/rejeitar, clicar "Salvar".
Depois pedir: "gera manifest do <slug>"
```

Skill termina aqui na fase pre-edit.

### Passo 5 — (post-edit, apos Dayner aprovar)

Quando Dayner pedir "gera manifest do X":

```
Read: skills/video-cut/references/prompts/_video_cut_principles.md
Read: skills/video-cut/references/prompts/manifest_builder.md
Read: data/video-processed/{slug}/cuts_approved.json
Read: data/video-processed/{slug}/transcripts/master.words.json
Read: output/scripts/{slug}.md   (v2 obrigatorio — schema check)
```

Emitir `data/video-processed/{slug}/manifest.json` seguindo schema v2.

Reportar:
- N clips, distribuicao de match_confidence
- Invariante de duracao (diff em segundos)
- Lista de blocos que precisam revisao humana (low/missing)

## Regras invariaveis

1. **Stdout = JSON machine-readable. Stderr = humano.** Nunca misturar.
2. **Roteiro em v1 = EXIT 1** na fase manifest. Nao tentar parsear
   FACE/PIP/SCREEN.
3. **Master nao se reencoda.** Skill so escreve JSONs.
4. **Pausa automatica entre pre-edit e post-edit.** Editor e quem disparou
   cuts_approved.json. Skill nao abre editor sozinha.
5. **Falha visivel.** Qualquer match low/missing, invariante quebrada,
   learning rule aplicada: stderr WARN.

## Estrutura de arquivos

```
skills/video-cut/
├── SKILL.md                              (este arquivo)
├── references/prompts/
│   ├── _video_cut_principles.md         (camada constitucional)
│   ├── retake_detection.md              (fase 3 pre-edit)
│   └── manifest_builder.md              (fase 5 post-edit)
├── scripts/
│   ├── config.py                        (paths/thresholds)
│   ├── validate_setup.py                (pre-flight)
│   ├── transcribe.py                    (whisper-timestamped)
│   ├── load_learning.py                 (agrega memory/)
│   ├── detect_gaps.py                   (ffmpeg silencedetect)
│   └── run_precut.py                    (orquestra os 3 acima)
└── tests/                               (pytest)
```

## Dependencias runtime

- `ffmpeg` >= 8.0 no PATH (ja validado via `validate_setup.py`)
- `whisper-timestamped` (pip) — modelo `medium` baixa no 1o run (~1.5GB)
- `python-Levenshtein` (pip) — fuzzy match
- Python 3.13+

## Integracao downstream (lateral/upstream)

| Skill / Componente | Direcao | Contrato |
|---|---|---|
| `roteiro-youtube` | upstream | consome `output/scripts/{slug}.md` em schema v2 `[BLOCO N] {act: ...}` |
| `MVP Editor` (`tooling/editor/`) | lateral | le `cuts_retakes.json` + `gaps.json` + `transcripts/master.words.json`; escreve `cuts_approved.json` |
| `config/my-context.md` | upstream | lido por `retake_detection.md` |
| `memory/video-cut-corrections.jsonl` | upstream | lido por `load_learning.py` |
| `video-audio` (futura) | downstream | consumira `manifest.json v2` |
| `video-overlays` (futura) | downstream | consumira `manifest.json v2` |
| `skill-transicoes` (futura) | downstream | consumira `manifest.json v2` |

## Custo

Zero API externo. So tokens Claude (retake_detection + manifest_builder).
Whisper e CPU local. Sem `MAX_COST_PER_RUN` enforced — tokens Claude ja
contabilizados pelo orcamento geral do projeto.
