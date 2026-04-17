# CLAUDE.md — Niche Intelligence System

> Este arquivo carrega automaticamente quando qualquer agente (Claude Code,
> OpenClaw, etc.) abre uma sessao neste diretorio. Ele e o ponto de
> onboarding canonico do projeto. Mantem-no como fonte unica de verdade.

---

## 1) O que este projeto e

Sistema que escaneia canais do YouTube de concorrentes, detecta videos
outliers, classifica conteudo por taxonomia controlada (4 dimensoes), analisa
padroes por canal e cross-channel, analisa thumbnails via capacidade
multimodal nativa do Claude Code, refina outputs com auto-critica, e gera
relatorio HTML com recomendacoes ICE-scored adaptadas ao contexto do Dayner.

**Output final:** `output/reports/niche-report-YYYY-MM-DD.html` — relatorio
auto-contido com 11 secoes (executive summary, top outliers, padroes de
titulo, thumbnails, recomendacoes priorizadas, plano de acao por
semana/mes/trimestre).

**Plataforma:** YouTube only (v2).

**Projeto SEPARADO** do `C:\Users\quena\projetos\SKILLs\`. NAO modificar
arquivos la. PODE ler/referenciar arquivos de la para contexto.

## 2) Origem e historia

- **2026-04-10:** Dayner assistiu o video do Oleg Melnikov
  ("My Claude Code System For Viral Social Media Growth"). O Oleg compartilhou
  o prompt original no Skool — salvo em `skool-prompt-niche-analysis.md`
  na raiz deste projeto. Transcricao do video em `transcricao_video.md`.
- **Debate dos 3 cerebros:** O prompt foi debatido com OpenClaw (estrategista)
  + Claude Chat (contraponto) + Claude Code (executor). Decisao: o prompt
  do Oleg e bom esqueleto mas raso pro contexto do Dayner — falta cost gates,
  cache, taxonomia controlada, schema multi-platform, refinement pass.
- **2026-04-10:** v1 do sistema construida — funciona em dry-run com 2 canais.
- **2026-04-11 (atual):** v2 — adicionados thumbnails (analise multimodal),
  refinement pass (auto-critica), my-channel (opcional), `validate_setup.py`.

**Sistema dos 3 cerebros (contexto pro openclaw agent):**
- **OpenClaw** (`~/.openclaw/workspace/`) = estrategista de longo prazo,
  brand DNA, identidade
- **Claude Chat** = contraponto socratico, debate de hipoteses
- **Claude Code** = executor + terceiro cerebro (este projeto vive aqui)

## 3) Estado atual do projeto

Ler `state/pipeline_state.json` pra estado mais recente. No momento desta
edicao:
- **Total gasto:** ~$1.91 USD (de $50 budget)
- **Dry-run niche-intel completo:** 2 canais, 20 videos, 6 outliers, 2 transcricoes
- **Fase 6 niche-intel (analise inline):** ainda nao executada em dados reais
- **`my-channel.json` status:** `not_configured` (canal YouTube criado mas
  handle ainda nao setado — fase 6e pulada graciosamente)
- **thumbnail-generator:** v1 construida em 2026-04-15 (Onda 1a); pipeline
  mecanico validado via smoke test (read_concept + compose + export); aguarda
  primeiro video real pra validar gen_background (Gemini API $0.06/run) +
  judge multimodal inline
- **Video pos-producao (video-cut, video-audio, video-overlays):** ainda
  nao construidas — precisam Dayner gravar primeiro video real pra
  validar footage

## 4) Como o sistema e acionado

O projeto contem 5 skills:

| Skill | Arquivo | Tipo | Quando |
|-------|---------|------|--------|
| **niche-intel** | `skills/niche-intel/SKILL.md` | Pipeline automatico (Python + Claude inline) | Analise de concorrentes YouTube |
| **youtube-content-research** | `skills/youtube-content-research/SKILL.md` | Pipeline (Python + Claude inline) | Gerar ideias de video semanais |
| **content-execution-research** | `skills/content-execution-research/SKILL.md` | Research conversacional (Claude inline) | Pesquisar como executar uma ideia de video |
| **roteiro-youtube** | `skills/roteiro-youtube/SKILL.md` | Geracao de texto (Claude inline) | Gerar roteiro de video a partir de ideia validada |
| **thumbnail-generator** | `skills/thumbnail-generator/SKILL.md` | Pipeline (Python + Claude inline multimodal) | Gerar 3 variantes de thumbnail PNG 1280x720 de um roteiro |
| **video-cut** | `skills/video-cut/SKILL.md` | Pipeline (Python + Claude inline) | Sugerir cortes semanticos em `master.mp4` pre-montado + emitir manifest v2 (2 entry points: pre-edit e post-edit, separados por revisao humana no MVP Editor) |

**Importante:** nenhuma skill esta registrada em `~/.claude/skills/` (so
existem dentro deste projeto). O mecanismo de ativacao:

1. Este `CLAUDE.md` carrega automaticamente ao abrir sessao no projeto.
2. Quando o usuario faz um pedido que casa com o trigger de uma skill,
   o agente roteia para a `SKILL.md` correspondente.
3. A `SKILL.md` dita o fluxo — incluindo quando ler cada prompt.

### Triggers niche-intel
- "analisa meu nicho", "roda niche intel", "analise de concorrentes"
- "gera o relatorio de nicho", "pesquisa o mercado"
→ Roteia para `skills/niche-intel/SKILL.md`

### Triggers youtube-content-research
- "gera ideias de video", "ideias pro YouTube"
- "research de conteudo", "o que gravar essa semana"
- "ideias de conteudo", "quais videos criar"
→ Roteia para `skills/youtube-content-research/SKILL.md`

### Triggers content-execution-research
- "pesquisar como executar [ideia]", "research de execucao"
- "como fazer essa ideia", "viabilidade de [ideia]"
- "da pra fazer [ideia]?", "pesquisa como construir [sistema]"
→ Roteia para `skills/content-execution-research/SKILL.md`

### Triggers roteiro-youtube
- "gera roteiro pra [ideia]", "escreve o script"
- "roteiro do video", "faz o roteiro"
- "script do video [ideia]", "monta o roteiro"
- "prepara o roteiro pra gravar"
→ Roteia para `skills/roteiro-youtube/SKILL.md`

### Triggers thumbnail-generator
- "gera a thumb", "gera thumbnail", "cria a capa"
- "faz as variantes de thumb pra [slug]"
- "thumbnail pro video X", "capa do video X"
- "pega o roteiro Y e gera a thumb"

Usuario passa caminho do roteiro via `--script` OU menciona o slug
(Claude procura `output/scripts/{slug}*.md`). Roteiro precisa ter
bloco `thumbnailConcept` v2 preenchido (enforce no `roteiro-youtube`
quality_gate).
→ Roteia para `skills/thumbnail-generator/SKILL.md`

### Triggers video-cut
- "roda video-cut pro [slug]", "analisa o master.mp4 do [slug]"
- "sugere cortes pro [slug]" (pre-edit)
- "gera manifest do [slug]", "constroi manifest apos aprovar cortes" (post-edit)
- "video-cut pro [slug]"
→ Roteia para `skills/video-cut/SKILL.md`. Fluxo tem 2 entry points
  (pre-edit e post-edit separados por revisao humana no MVP Editor).

**O usuario NAO precisa dizer explicitamente "leia a skill" ou "leia o prompt
X".** Basta a frase-gatilho. Todo o encadeamento entre prompts e ditado pela
`SKILL.md` de cada skill.

## 5) Filosofia de execucao: AUTOMATICO por default, parar SO em erro

O pipeline e desenhado pra rodar inteiro sem interromper o usuario. Resumos
e amostras sao impressos no stderr como visibilidade — o usuario pode
interromper se ver algo errado, mas o default e fluir sem perguntar permissao.

**Pare SO se um destes acontecer:**

1. `validate_setup.py` retornar exit 1 (config/token/dirs invalidos)
2. Budget hard-stop: `check_budget()` bloqueia porque o custo excede $50
3. Erro de API real (Apify 401, 5xx persistente, network down)
4. Refinement pass detectar ≥50% de insights ruins (escalation pro humano)
5. Excecao Python nao tratada

**NAO pare por:**
- "Quero confirmar o custo" — o budget ceiling ja protege ($50 hard-stop)
- "Quero validar a classificacao" — refinement pass cuida disso
- "Quero ver as recomendacoes antes do refinement" — refinement remove o lixo
- "E uma boa pratica pausar" — nao e. E friction.

**Visibilidade sem bloqueio:** Cada script imprime um budget header
(`print_budget_header()` em `utils.py`) e resumos no stderr. **Stdout e
reservado pra JSON machine-readable; stderr pra log humano** — nao misturar.

## 6) Pipeline v2 — 7 fases

| Fase | Quem executa | Script / Prompt | Custo |
|------|-------------|-----------------|-------|
| 0    | Python      | `validate_setup.py` | $0 |
| 1    | Python      | `scrape_channels.py` (Apify) | ~$0.30/canal |
| 2    | Python      | `detect_outliers.py` (mediana local) | $0 |
| 3    | Claude inline | `classification.md` | tokens |
| 4    | Python      | `scrape_transcripts.py` (Apify) | ~$0.08/transcricao |
| 4.5  | Python      | `download_thumbnails.py` (CDN publico) — paralelo a 4 | $0 |
| 5a   | Claude inline | `channel_deep_analysis.md` (1 por canal) | tokens |
| 5b   | Claude inline | `cross_channel_synthesis.md` | tokens |
| 5c   | Claude inline | `recommendations.md` (12-18 ICE-scored) | tokens |
| 5d   | Claude inline | `refinement_pass.md` (auto-critica, max 2 passes) | tokens |
| 5.5  | Claude inline | `thumbnail_analysis.md` — paralelo a 5a-5c | tokens |
| 5e   | Claude inline | analise do proprio canal — pulada se `my-channel.json.status != "configured"` | tokens |
| 6    | Python      | `generate_report.py --open` | $0 |

**Numeracao na SKILL.md:** Os passos sao numerados como `Passo 1` a `Passo 7`
na SKILL.md, com sub-fases `6a/6b/6c/6d/6.5/6e`. A tabela acima usa a mesma
estrutura — so achato pra leitura mais rapida.

**Ordem de dependencia:**
- 1 → 2 → 3 → 4 (sequencial)
- 4 e 4.5 podem rodar em paralelo (Apify vs CDN — recursos diferentes)
- 5a → 5b → 5c → 5d (sequencial)
- 5.5 (thumbnails) roda em paralelo com 5a-5c (depende so de `data/thumbnails/`)
- 5d (refinement) pode re-disparar 5a/5b/5c. Max 2 passes total.
- 6 e o ultimo

**Custo por run completo:** ~$4.85 USD (11 canais + 19 transcricoes).
Hard-ceiling em `MAX_COST_PER_RUN` em `skills/niche-intel/scripts/config.py`.

## 7) Cadeia de prompts — niche-intel (`references/prompts/`)

Todos os prompts de analise inline do niche-intel ficam em
`skills/niche-intel/references/prompts/`. Dependencias:

| Arquivo                        | Fase    | Quando e lido                                       |
|--------------------------------|---------|----------------------------------------------------|
| `_prompt_principles.md`        | TODAS   | SEMPRE primeiro, antes de qualquer prompt especifico |
| `classification.md`            | 3       | Antes de classificar videos                         |
| `channel_deep_analysis.md`     | 5a      | Antes da analise por canal                          |
| `cross_channel_synthesis.md`   | 5b      | Antes da sintese cross-channel                      |
| `recommendations.md`           | 5c      | Antes de gerar recomendacoes                        |
| `refinement_pass.md`           | 5d      | Antes do auto-critica/refinement                    |
| `thumbnail_analysis.md`        | 5.5     | Antes da analise visual (paralela com 5a-5c)        |

**Regras de encadeamento:**

- **`_prompt_principles.md` e a camada constitucional** — todo prompt
  especifico comeca com "ler `_prompt_principles.md` primeiro". Claude le esse
  arquivo uma vez por fase, antes do prompt especifico.
- **Cada fase da `SKILL.md` tem um bloco `PROTOCOLO OBRIGATORIO`** que lista
  exatamente quais arquivos ler e em que ordem. O agente segue essa lista
  sem precisar de instrucao adicional do usuario.
- **Refinement (5d) pode re-disparar 5a/5b/5c** se detectar insights que
  falham o checklist de 7 pontos. Max 2 passes — se ≥50% dos insights falham,
  escala pro humano (nao loop infinito).

## 7.5) Cadeia de prompts — content-execution-research

Prompts de research ficam em
`skills/content-execution-research/references/prompts/`. Dependencias:

| Arquivo                    | Fase | Quando e lido                                          |
|----------------------------|------|--------------------------------------------------------|
| `_research_principles.md`  | TODAS | SEMPRE primeiro, antes de qualquer prompt especifico   |
| `decompose_problem.md`     | 1    | Antes de quebrar ideia em sub-problemas                |
| `research_solutions.md`    | 2    | Antes de buscar solucoes (GitHub, ferramentas, docs)   |
| `analyze_viability.md`     | 3    | Antes de avaliar custo/tempo/nivel/resultado           |
| `recommend_path.md`        | 4    | Antes de compilar documento final + veredicto          |

**Diferenca vs niche-intel:** Esta skill nao tem scripts Python. Tudo e
executado inline pelo Claude Code usando WebSearch/WebFetch/context7/Read.
Nao tem custo de API externo (Apify). Output vai pra
`output/research/{slug}-YYYY-MM-DD.md`.

## 7.6) Cadeia de prompts — youtube-content-research

Prompts de ideacao ficam em
`skills/youtube-content-research/references/prompts/`. Dependencias:

| Arquivo                    | Fase | Quando e lido                                          |
|----------------------------|------|--------------------------------------------------------|
| `_ideation_principles.md`  | TODAS | SEMPRE primeiro, antes de qualquer prompt especifico   |
| `gap_detection.md`         | 4    | Antes da analise EN vs PT-BR gaps                      |
| `idea_generation.md`       | 5    | Antes de gerar ideias + scoring                        |

**Pipeline desta skill (6 passos):**
1. `validate_setup.py` — pre-flight (configs, budget, dados niche-intel)
2. `refresh_channels.py` — hibrido: reusa niche-intel se fresco, re-scrapa se stale
3. `search_youtube.py` — Apify YouTube Search por keywords (~$0.10/keyword)
4. Claude inline: gap detection (EN vs PT-BR)
5. Claude inline: ideacao + scoring (4 dimensoes, 15-25 ideias rankeadas)
6. Salvar + dedup contra historico

**Custo por run:** ~$1.50-2.00 (15 keywords). Ceiling: $3.50/run.
**Config:** `config/content-research.json` (keywords, scoring weights).
**Output:** `data/content-research/ideas/ideas-YYYY-MM-DD.json`

**Fluxo completo de conteudo (5 sistemas):**
```
niche-intel                →  Analisa concorrentes, detecta padroes, gera recomendacoes
youtube-content-research   →  Gera ideias de video rankeadas (semanal)
content-execution-research →  Pesquisa COMO executar uma ideia aprovada (sob demanda)
roteiro-youtube            →  Gera roteiro + SEO + thumbnailConcept v2 (sob demanda)
thumbnail-generator        →  Gera 3 variantes PNG 1280x720 do roteiro (sob demanda)
```

O fluxo e: niche-intel alimenta youtube-content-research com dados de canais
→ Dayner aprova ideias → content-execution-research pesquisa como executar
→ Dayner testa MVP → roteiro-youtube gera o script + thumbnailConcept pra
gravar → Dayner grava + thumbnail-generator cria as 3 thumbs → Dayner sobe
pro YouTube Studio (A/B test nativo).

## 7.7) Cadeia de prompts — roteiro-youtube

Prompts de geracao de roteiro ficam em
`skills/roteiro-youtube/references/prompts/`. Dependencias:

| Arquivo                    | Fase | Quando e lido                                          |
|----------------------------|------|--------------------------------------------------------|
| `_script_principles.md`   | TODAS | SEMPRE primeiro, antes de qualquer prompt especifico   |
| `extract_narrative.md`    | 1    | Antes de coletar inputs e extrair narrativa            |
| `write_script.md`         | 2    | Antes de escrever roteiro + SEO + thumbnail            |
| `quality_gate.md`         | 3    | Antes da revisao de qualidade                          |
| `finalize_output.md`      | 4    | Antes de compilar e salvar output final                |

**Diferenca vs outras skills:** Esta skill nao tem scripts Python NEM usa
WebSearch/WebFetch. Tudo e leitura de arquivos (Read) + geracao de texto
inline. Input vem de: output da Skill 2 (arquivo) + MVP do Dayner
(conversa) + dados do niche-intel (arquivos).
Output vai pra `output/scripts/{slug}-YYYY-MM-DD.md`.

## 7.8) Cadeia de prompts — thumbnail-generator

Prompts de composicao + judge ficam em
`skills/thumbnail-generator/references/prompts/`. Dependencias:

| Arquivo                       | Fase | Quando e lido                                           |
|-------------------------------|------|---------------------------------------------------------|
| `_thumbnail_principles.md`    | TODAS | SEMPRE primeiro (11 principios: Claude orange obrigatorio, max 2 niveis tipograficos, max 4 palavras, WCAG AA gate, mobile-first, etc) |
| `template_selection.md`       | 3    | Archetype + layout_template_hint -> 3 templates (v1 default, v2 micro-variacao, v3 alternativo + Hook B) |
| `asset_gathering.md`          | 4    | Matching `brand_assets_suggested` contra `assets/brand-icons/_MANIFEST.json` |
| `draft_composition.md`        | 5    | Gera prompt pro provider de imagem (5-parte: scene+palette+lighting+depth+negatives) |
| `judge_rubric.md`             | 9    | LLM-as-judge 7-dim × 0-10 (Claude inline le PNG via Read tool multimodal; pre-flight magic bytes OBRIGATORIO) |
| `reroll_feedback.md`          | 10   | Estrategia de re-roll 1/2/3 baseada em dims que falharam |

**Pipeline desta skill (9 steps — ver SKILL.md):**
1. `validate_setup.py` — pre-flight (fontes, deps, gemini key, budget)
2. `read_concept.py` — parseia thumbnailConcept v2 do roteiro .md
3. Claude inline: template_selection (v1/v2/v3 templates + Hook B)
4. Claude inline: asset_gathering (brand-icons matching)
5. Claude inline: draft_composition (3 prompts de bg)
6. `gen_background.py` × 3 paralelo — chama Gemini 2.5 Flash Image
7. `remove_bg.py` — rembg birefnet-portrait (cached por pose)
8. `compose_thumbnail.py` × 3 — Pillow layers (bg + glow + face + icons + yellow-box + text)
9. Claude inline: judge_rubric (7-dim × 0-10; gate WCAG AA >=4.5:1)
10. Claude inline: reroll_feedback (se reprovado, max 3 loops)
11. `export_variants.py` — salva 3 PNGs finais + generation.json log

**Custo por run:** $0.06 USD default (nanobanana × 3) — worst-case $0.18
com 3 re-rolls. Ceiling: $0.50/run.

**Config:**
- Templates: `skills/thumbnail-generator/assets/templates/{A1,A2,A3,B,C,D,E}.json`
- Brand: `config/brand.json` (paleta + fontes)
- Providers: `config/thumbnail-providers.yaml` (4 steps swappable)
- Assets: `skills/thumbnail-generator/assets/{brand-icons,fonts,faces}/`

**Placeholders ativos (MVP):**
- 8 brand-icons placeholder (claude-square, anthropic, n8n, cursor, chatgpt,
  github, obsidian, shopify) — circulos com inicial, marcados `placeholder: true`
  no `_MANIFEST.json`. Dayner substitui pelos PNGs oficiais (simpleicons.org)
- 1 face placeholder + 6 pose cutouts apontando pra ele. Dayner substitui
  apos sessao de 1h de captura (6 poses da SINTESE 16.1 §5.5)
- Fontes: 5 reais (Inter/InterTight/Fraunces/Caveat variable + JetBrainsMono-Bold
  static), baixadas automaticamente por `download_fonts.py`

**Regras invariaveis:**
- Pre-flight magic bytes em TODA imagem antes de Read (CLAUDE.md §11)
- Claude orange (#E06B3E) obrigatorio em thumbs de videos sobre Claude
- Max 4 palavras em `text`, max 2 niveis tipograficos
- Gate WCAG AA 4.5:1 nao-negociavel (judge)
- 9 steps do pipeline sao FIXOS; providers sao SWAPPABLE via YAML
- **Excecao consciente a Regra 5** (fluir automatico): ate 1h/mes de
  ajuste manual via `--force-provider=canva_api` aceito (SINTESE 16.1 §7)

## 8) Configuracao

- **Concorrentes:** `config/competitors.json` — lista de 11 canais (3 tiers)
- **Taxonomia (valores controlados):** `config/taxonomy.json` — 4 dimensoes
  (`topics`, `formats`, `title_patterns`, `hook_types`)
- **Contexto do negocio:** `config/my-context.md` — lido em TODA analise
  inline pra adaptar insights ao Dayner
- **Canal proprio:** `config/my-channel.json` — atualmente
  `status: "not_configured"`. Quando Dayner criar canal, atualizar pra
  `{"status": "configured", "handle": "@x", ...}` e fase 5e roda automatico
- **Apify token:** `~/.openclaw/secrets/apify.env` (variavel `APIFY_API_TOKEN`)
- **Limites de custo (niche-intel):** `skills/niche-intel/scripts/config.py`
  (`MAX_COST_PER_RUN`, `TOTAL_BUDGET`, `COST_PER_CHANNEL_SCRAPE`,
  `COST_PER_TRANSCRIPT`)
- **Config content-research:** `config/content-research.json` — keywords seed,
  scoring weights, channels extras, max_cost_per_run ($3.50)
- **Limites de custo (content-research):** `skills/youtube-content-research/scripts/cr_config.py`
- **Apify endpoints (referencia):** `skills/niche-intel/references/apify_endpoints.md`
- **Taxonomia (referencia humana):** `skills/niche-intel/references/taxonomy.md`
- **Brand identity (canal Dayner):** `config/brand.json` — paleta hibrida + fontes
  + constraints (1280x720, safe zone mobile 246x138, WCAG AA). MUST pra
  video-overlays; starting point pra thumbnail-generator. Criado 2026-04-14 na
  sessao de aprofundamento thumbnail-generator. Ver SINTESE_ARQUITETURAL.md 16.1.
- **Thumbnail providers:** `config/thumbnail-providers.yaml` — 4 steps swappable
  (draft/polish/face/compose). Default MVP: `pillow_nanobanana_compose` (Gemini,
  $0.02/img, pq Flux keyless) + rembg + Pillow. Override runtime com
  `--<step>-provider=X`. Hard-ceiling $0.50/run. Criado 2026-04-14.
- **Gemini API token:** `~/.openclaw/secrets/gemini_api.env` (variavel
  `GEMINI_API_KEY` OU raw `AIza...` na primeira linha — helper em
  `skills/thumbnail-generator/scripts/config.py:load_gemini_key()`)
- **Limites de custo (thumbnail-generator):** `skills/thumbnail-generator/scripts/config.py`
  (`MAX_COST_PER_RUN=0.50`, `COST_PER_NANOBANANA_IMG=0.02`)
- **Deps Python (thumbnail-generator):** `Pillow >= 10.0` (variable font
  support), `rembg[cpu]` — instalar via `pip install` (NAO stdlib-only;
  skills de video relaxam a regra, secao 6 da SINTESE)

## 9) Estrutura de dados

```
data/
├── raw/               # Respostas brutas da Apify (1 JSON/canal)
├── normalized/        # Schema unificado (1 JSON/canal)
├── outliers/          # Analise de outliers (1 JSON/canal)
├── classified/        # Videos classificados pelo LLM (1 JSON/canal)
│                      # + {handle}_review.json pra casos ambiguos
├── transcripts/       # Transcricoes (1 TXT/video) + {video_id}_hook.txt
├── thumbnails/        # 60 imagens (top 30 + bottom 30) + _manifest.json
├── analysis/          # channel_{handle}.json, cross_channel.json,
│                      # recommendations.json, thumbnails.json, refinement_log.md
└── content-research/  # [youtube-content-research skill]
    ├── channels_snapshot.json  # Snapshot consolidado de canais (refresh_channels.py)
    ├── search/                 # Resultados YouTube Search por keyword
    │   └── search-YYYY-MM-DD.json
    ├── ideas/                  # Ideias geradas por run
    │   └── ideas-YYYY-MM-DD.json
    └── history.json            # Indice acumulativo de ideias (dedup)
```

Outros diretorios:
- `cache/channels/` — cache de scraping (TTL 7 dias)
- `state/pipeline_state.json` — fases completas + custo acumulado
- `output/reports/` — relatorios HTML gerados (niche-intel)
- `output/research/` — documentos de research de execucao (content-execution-research)
- `output/scripts/` — roteiros de video gerados (roteiro-youtube)
- `output/thumbnails/{slug}-v{1,2,3}.png` — 3 variantes PNG 1280x720 por video
- `output/thumbnails/{slug}-generation.json` — log completo do run (prompts,
  providers, scores, rerolls, cost, final paths) — alimenta memoria de
  feedback loop v2
- `output/thumbnails/tmp/` — drafts intermediarios antes do judge aprovar
- `data/thumbnail-work/{slug}/` — JSONs intermediarios do pipeline
  (concept.json, templates_selected.json, assets_selected.json, bg_prompts.json,
  judge_scores.json, reroll_log.json) + `bg_{v1,v2,v3}.png` do provider
- `skills/thumbnail-generator/assets/` — templates (7 JSON) + brand-icons
  (8 PNGs + manifest) + fonts (5 TTF variable) + faces (placeholder + 6 pose
  cutouts)
- `data/thumbnail-refs/` — corpus de 56 thumbs de referencia (5 canais: Oleg/Nate/Nick/Ben/MarcVerdu) + ANALYSIS.md + MARC_VERDU_ANALYSIS.md (criado 2026-04-14)
- `data/research/thumbnail-*.md` — pesquisas da sessao thumbnail-generator (SaaS mechanics + Pillow-vs-Canva eval)
- `memory/` — voice examples + performance log (roteiro-youtube, gitignored)

## 10) Plataforma: YouTube only

O sistema analisa concorrentes no YouTube e gera recomendacoes pra criar
conteudo no YouTube. Plataforma unica, sem proxy cross-platform.

- **YouTube tem dados publicos abundantes** (Apify scrapers, transcricoes,
  thumbnails, channel-level metadata) — ideal pra analise automatizada.
- **Output direto:** as recomendacoes sao pra videos do YouTube do Dayner
  (titulos, hooks, formatos, thumbnails, topicos).

**O que falta (futuro):** `MULTI_PLATFORM_SYSTEM.md` na raiz do projeto e o
documento de handoff que descreve como estender pra TikTok/Instagram. Pendente.

## 11) Regras tecnicas (invariaveis)

- **Budget total:** $50 USD hard-ceiling em `state/pipeline_state.json`.
  `check_budget()` bloqueia gastos que excedam o restante.
- **Cache:** Canais cached por 7 dias, transcricoes por 30 dias.
- **1 canal por API call:** NUNCA batchear canais no scraper
  (`maxResults` e compartilhado pelo actor da Apify — batchar quebra a
  contagem por canal).
- **Taxonomia controlada:** Classificacao usa SOMENTE valores de
  `config/taxonomy.json`. Video ambiguo vai pra `data/classified/{handle}_review.json`,
  nao inventa categoria nova. Gaps detectados sao logados em
  `summary.taxonomy_gaps_suggested` no JSON.
- **Stdlib-only pra niche-intel + youtube-content-research:** Scripts Python
  sem dependencias externas (urllib, json, pathlib, statistics, etc.).
  NAO adicionar `requirements.txt`.
- **Skills de video (thumbnail-generator, video-cut, video-audio, video-overlays):**
  regra stdlib-only relaxada (SINTESE 16.1 §6). Permite Pillow, rembg,
  auto-editor, ffmpeg-python, etc. Deps documentadas na SKILL.md da skill
  especifica, instaladas via `pip install` manual (ainda sem requirements.txt).
- **Contexto aplicado, nao so lido:** Toda analise inline tem que terminar
  com `[Context applied: ...]`. Se o insight serve pra qualquer criador
  generico, re-fazer. Ver Principio 1 de `_prompt_principles.md`.
- **Stdout vs stderr:** Stdout = JSON machine-readable. Stderr = log humano
  (incluindo budget header e top-5 outliers). Nao misturar.
- **Imagens: validar magic bytes antes de Read (invariante de seguranca).**
  YouTube CDN faz content negotiation e pode servir AVIF/WebP mesmo quando a
  URL pede `.jpg`. Se um arquivo AVIF/HEIC/WebP/SVG for lido via Read tool,
  a API rejeita e **poisona a sessao** — o image block fica fixo no historico
  e toda nova mensagem repete o erro (so `/compact` ou rewind destrava).
  Antes de qualquer Read em imagem baixada da web, checar `head -c 4 file |
  xxd -p`: `ffd8ff*` = JPEG ok, qualquer outro = converter via ffmpeg
  (`ffmpeg -y -i input -q:v 2 output.jpg`) antes de seguir. O script
  `download_thumbnails.py` deve mandar `Accept: image/jpeg` pra prevenir,
  mas o pre-flight e a defesa final. Incidente original: 2026-04-14, 4
  arquivos em `data/thumbnail-refs/oleg-benchmark/` eram AVIF mascarados.

## 12) "Modos" da skill (logicos, nao flags CLI)

A SKILL.md menciona modos como `--skip-scrape`, `--skip-transcripts`,
`--skip-thumbnails`, `--channels-only h1,h2`, `--dry-run`. **Nem todos sao
flags CLI reais nos scripts** — alguns sao modos LOGICOS que o agente
implementa pulando passos:

### niche-intel

| Modo | Como funciona |
|------|---------------|
| `--skip-scrape` | Agente pula a invocacao de `scrape_channels.py`, usa `data/normalized/` existente |
| `--skip-transcripts` | Agente pula `scrape_transcripts.py` |
| `--skip-thumbnails` | Agente pula `download_thumbnails.py` E a sub-fase 5.5 inline |
| `--channels-only h1,h2` | Flag REAL: passada como `--channels h1,h2` pra `scrape_channels.py` e `detect_outliers.py` |
| `--dry-run` | Flag REAL nos scripts: limita a 2 canais + 10 videos + 2 transcricoes (~$0.70) |

### thumbnail-generator

| Modo | Como funciona |
|------|---------------|
| `--script PATH` | **obrigatorio** — caminho pro roteiro `.md` com bloco thumbnailConcept v2 |
| `--force-template=A1/A2/A3/B/C/D/E` | Override do template v1 (v2/v3 seguem `variation_rules`) |
| `--force-provider=nanobanana/canva_api/flux_schnell` | Troca provider de imagem no step 4 |
| `--skip-rerolls` | Entrega primeira geracao mesmo se judge reprovar (iteracao rapida) |
| `--dry-run` | Roda validate_setup + mostra template/asset/prompt decisoes SEM chamar provider (zero custo) |
| `--force` | Regera mesmo se `{slug}-v1.png` ja existir |

Quando o usuario pede um modo, o agente decide o que vira flag real e o
que vira "pular invocacao".

## 13) Documentos relacionados (raiz do projeto)

Alem deste CLAUDE.md, ha outros docs importantes na raiz que NAO devem ser
ignorados:

| Arquivo | Conteudo | Quando ler |
|---------|----------|------------|
| `MULTI_PLATFORM_SYSTEM.md` | Handoff doc descrevendo extensao TikTok/Instagram. Inclui contexto historico do projeto e da decisao de comecar com YouTube. | Quando alguem pedir "extender pra Instagram/TikTok" |
| `NEXT_SESSION_THUMBNAILS.md` | Handoff antigo (pre-v2) sobre analise de thumbnails. **Maior parte ja foi implementada na v2.** Util pra entender o raciocinio. | Quando ha duvida sobre por que thumbnails sao analisadas no v2 |
| `transcricao_video.md` | Transcricao do video original do Oleg Melnikov. | Pra entender a inspiracao do sistema |
| `skool-prompt-niche-analysis.md` | Prompt original que o Oleg compartilhou no Skool. | Pra ver o que foi descartado/melhorado |
| `HANDOFF_VIDEO_CREATION_AUTOMATION.md` | Pesquisa profunda sobre automacao de edicao de video, thumbnails, upload, shorts, analytics. Mapeamento de ferramentas (auto-editor, WhisperX, rembg, Remotion, Reap, etc.), pipeline proposto, e ondas de implementacao. | Quando for construir skills de pos-producao (contexto historico; decisoes finais estao em SINTESE_ARQUITETURAL.md) |
| `transcrição.md` | Transcricao do video do Brendan Jowett ("How I Fully Automated My Video Editing (Claude Code)"). Case study real Descript + Claude Code + Remotion + Whisper + FFmpeg. | Referencia de workflow — ler antes de construir video-overlays |
| `PESQUISA_REMOTION.md` | Pesquisa profunda Remotion (capacidades, custos, alternativas). Sessao paralela. | Referencia pra video-overlays |
| `PESQUISA_CORTES_LOCAL.md` | Auto-editor v30 + LLM retake detection + whisper-timestamped. Substituto local do Descript. | Referencia pra video-cut |
| `PESQUISA_SCREENCAST_CAPTURE.md` | Recordly, OpenScreen, OBS, Windows 11 setup. | Referencia pra captura (manual Dayner) |
| `PESQUISA_REMOTION_FIRESHIP.md` | Kinetic typography, code reveals, zoom punches, Agent Skills, benchmarks Iris Xe. | Referencia pra video-overlays |
| `PESQUISA_COMPOSITING.md` | FFmpeg xfade + zoompan pra 3-atos. MoviePy rejeitado. | Referencia pra video-cut (fase compositing) |
| `PESQUISA_AUDIO_PIPELINE.md` | pyrnnoise + Freesound + Mubert + FFmpeg sidechaincompress + loudnorm. | Referencia pra video-audio |
| `PESQUISA_COMUNIDADE_WORKFLOWS.md` | Stacks reais (Brendan, Sabrina, ClawVid, kickstart). Consensos e anti-padroes. | Referencia transversal |
| `SINTESE_ARQUITETURAL.md` | **Fonte unica de verdade pos-roteiro.** Decisoes arquiteturais fechadas: 4 skills (video-cut, video-audio, video-overlays, thumbnail-generator), stack completo, anti-padroes, ordem de construcao, riscos. Cristaliza as 8 pesquisas + respostas Dayner. | **OBRIGATORIO** antes de construir qualquer skill pos-roteiro. Nao re-abrir debate ja fechado aqui. |

## 14) Referencia ao projeto principal (OpenClaw + agencia)

Para contexto do negocio, ler (read-only):

- `C:\Users\quena\projetos\SKILLs\CLAUDE.md` — contexto da agencia AI marketing
- `C:\Users\quena\.openclaw\workspace\IDENTITY.md` — identidade do sistema OpenClaw
- `C:\Users\quena\.openclaw\workspace\AGENTS.md` — agentes registrados no OpenClaw
- `C:\Users\quena\.openclaw\workspace\MEMORY.md` — memoria persistente do OpenClaw
- `C:\Users\quena\.openclaw\workspace\brand_os\dna\dna_completo.md` — brand DNA
- `C:\Users\quena\.openclaw\workspace\content\estrategia_claude_code.md` — pesquisa anterior de concorrentes Claude Code
- `C:\Users\quena\.openclaw\workspace\content\pesquisa_mercado.md` — pesquisa de mercado historica

**Para o agente OpenClaw lendo este arquivo:** este projeto e um sub-sistema
operacional pra alimentar tua estrategia de conteudo. Tu defines a
estrategia (em `~/.openclaw/workspace/content/`); este sistema gera os
insights de mercado que voce usa pra decidir o que produzir. Nao confunda
os papeis: aqui se faz pesquisa, la se faz decisao estrategica.
