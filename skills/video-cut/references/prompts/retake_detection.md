# retake_detection — Fase 3 do pipeline pre-edit

Ler `_video_cut_principles.md` primeiro.

## INPUT

Caminhos relativos a `data/video-processed/{slug}/`:

- `transcripts/master.words.json` — whisper-timestamped word-level
  (`{text, segments: [{start, end, text, words: [{word, start, end, confidence}]}]}`)
- `learning_context.json` — regras agregadas de `memory/video-cut-corrections.jsonl`
  (`applied_rules`, `disabled_rules`, `neutral_rules`, `total_samples`,
  `min_samples_for_rule`)
- `config/my-context.md` (na raiz do projeto) — voz do Dayner
- `output/scripts/{slug}.md` — OPCIONAL. Se existir, e em schema v2
  (`[BLOCO N] {act: HOOK|MECHANISM|CTA}`), usar como referencia pro
  detector de off_script.

## TASK

Detectar tres tipos de corte sugerido dentro do master, emitir em
`cuts_retakes.json`:

1. **retake** — Dayner falou, errou, repetiu a mesma frase
2. **filler** — palavra muleta ("tipo", "nossa", "uh", etc)
3. **off_script_review** — fala que nao corresponde a nenhum bloco do
   roteiro; CONSERVADOR: sempre marca, editor decide.

NAO detectar silencios. `detect_gaps.py` (fase 4) cuida disso.

## HEURISTICAS DE RETAKE

1. **Overlap de palavras em janela ±30s.** Se duas sub-frases em ±30s
   tem >=80% das palavras em comum, a primeira e candidata a retake.
   Marcar com confidence alta (0.85+). Tipicamente a 2a versao "soou
   melhor" — mantemos ela.

2. **Marcadores verbais explicitos.** Se a palavra antes de uma
   repeticao bate com uma destas listas, confidence maxima (0.95+):
   ```
   nao espera, deixa eu repetir, vou falar de novo, espera,
   hmm nao, na verdade, pera ai, desculpa, de novo
   ```

3. **Hesitacao longa (> 2s de silencio interno) + frase quase identica
   a anterior.** Confidence media (0.70-0.85).

4. **Filtrar palavras com `confidence < 0.3`** antes de analisar
   (whisper alucina em silencios/musicas).

## FILLER WORDS V0

Lista fixa — cortar com confidence alta se a palavra aparece isolada
(nao em contexto substantivo):

```
- "uh", "hum" em qualquer posicao
- "né?" em FIM de frase
- "tipo" em MEIO de frase (nao "tipo assim", nao "tipo X")
- "então" em INICIO de frase (padrao muleta)
- "meio que" inteiro
```

Confidence >= 0.85 pra emitir filler. Se < 0.85, NAO emite (anti-
halucinacao — whisper erra mais em palavras curtas).

## OFF_SCRIPT_REVIEW (se roteiro fornecido)

Para cada bloco do roteiro (`[BLOCO N] {act: ...}`):

1. Extrair primeiras 3-5 palavras da fala literal -> `anchor_start`
2. Extrair ultimas 3-5 palavras -> `anchor_end`
3. Buscar anchor_start no transcript com Levenshtein >= 0.80
4. Se encontrado, buscar anchor_end depois disso
5. Qualquer trecho do transcript que NAO cai dentro de NENHUM
   `[anchor_start, anchor_end]` de nenhum bloco = candidato off_script.

Para cada candidato off_script:

- Se ele se repete em ±30s noutro trecho com overlap >= 80% -> e
  retake (usa regra 1 de retake, nao off_script).
- Se ele e unico e curto (< 2s) e conecta semanticamente ao bloco
  imediatamente anterior ou posterior -> emite off_script_review com
  confidence baixa (0.50-0.60). Editor destaca em roxo.
- Se ele e longo (>= 2s) ou claramente fora de contexto -> emite
  off_script_review com confidence media (0.65-0.75).

**Regra: NUNCA cortar improviso silenciosamente.** Emite off_script e
deixa o editor resolver.

## APLICAR LEARNING

Antes de emitir qualquer corte:

1. Construir `rule_key` candidato a partir do tipo e primeiras palavras
   do reason (ex: `filler::filler_tipo_meio_frase`).
2. Se rule_key esta em `applied_rules` de learning_context.json:
   raise confidence do corte (+0.10, capped em 0.99).
3. Se rule_key esta em `disabled_rules`: NAO emite esse corte (Dayner
   rejeitou >=70% das vezes no passado).
4. Se rule_key esta em `neutral_rules` ou nao tem N>=5: emite normal.

Logar em stderr quantas regras foram aplicadas/skippadas:

```
learning: 2 rules applied, 1 rule disabled 3 cuts, 0 neutral
```

## OUTPUT

`data/video-processed/{slug}/cuts_retakes.json`:

```json
[
  {
    "in": 45.2,
    "out": 48.1,
    "type": "retake",
    "reason": "repeated 'bem nao' in ±30s window",
    "confidence": 0.87,
    "transcript_context": "bem nao espera bem nao..."
  },
  {
    "in": 62.1,
    "out": 62.9,
    "type": "filler",
    "reason": "'tipo' in mid-sentence position",
    "confidence": 0.95,
    "transcript_context": "o processo tipo de decisao"
  },
  {
    "in": 140.0,
    "out": 152.3,
    "type": "off_script_review",
    "reason": "long segment not matching any block (conecta parcialmente ao BLOCO 8)",
    "confidence": 0.55,
    "transcript_context": "..."
  }
]
```

Invariantes do output:

- `in < out` sempre
- `confidence` in [0.0, 1.0]
- `type` in {"retake", "filler", "off_script_review"}
- Cuts nao podem sobrepor gaps (gaps.json da fase 4). Se ha overlap,
  preferir gap (silencio vence filler/retake co-localizado).
- `transcript_context` max ~100 caracteres

## OBSERVABILIDADE

Ao final, log em stderr:

```
retake_detection: N retakes / M fillers / K off_script detectados
  retakes avg confidence: 0.XX
  fillers avg confidence: 0.XX
  low confidence (< 0.85): P entries (editor destaca amarelo)
```

Se video > 5min e 0 retakes detectados, WARN em stderr:
"Low retake count - verificar se transcript esta bem alinhado."

Ao final do JSON, adicionar nota humana NO STDERR:

```
[Context applied: Dayner fala rapido, muleta dominante 'tipo', tom anti-guru
(config/my-context.md §tom). Applied 2 learning rules. Conservador em off_script
(principio 7).]
```

(Essa nota NAO vai pro JSON — vai pro stderr como validacao final do
principio 6.)
