# Guia Claude Code — Plano de Execucao

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produzir `GUIA_CLAUDE_CODE.md` na raiz do projeto — cheatsheet-referencia com 30+ entradas (A1-A4, B1-B5, C1-C5, D1-D5, E1-E12) seguindo template fixo (exemplo/quando/por que/melhor pra/evitar) + ranking 1-5 estrelas + TL;DR + Quick selector + Anti-patterns.

**Architecture:** 3 frentes de coleta em paralelo (last30days × 6 queries em background, leitura de plugin cache local, WebFetch docs oficiais), consolidacao in-context (Opus 4.7 1M), escrita secao por secao, self-review final.

**Tech Stack:** last30days v3.0.0 (pesquisa multi-fonte), WebFetch (docs.claude.com), Read/Glob/Grep (plugin cache), Write/Edit (output). Sem deps Python novas.

---

## Fase 0: Pre-flight

### Task 1: Resolver interpretador Python + verificar last30days

**Files:**
- Read: `/c/Users/quena/.claude/plugins/cache/last30days-skill/last30days/3.0.0/SKILL.md:73-85` (secao Runtime Preflight)

**Objetivo:** garantir que `LAST30DAYS_PYTHON` e `SKILL_ROOT` estao resolvidos antes de disparar queries em background. Sem isso, as 6 queries podem falhar silenciosamente.

- [ ] **Step 1: Resolver `LAST30DAYS_PYTHON`**

Run:
```bash
for py in python3.14 python3.13 python3.12 python3; do
  command -v "$py" >/dev/null 2>&1 || continue
  "$py" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 12) else 1)' 2>/dev/null || continue
  LAST30DAYS_PYTHON="$py"
  echo "FOUND: $LAST30DAYS_PYTHON"
  break
done
echo "RESOLVED: LAST30DAYS_PYTHON=${LAST30DAYS_PYTHON:-MISSING}"
```

Expected: `FOUND: python3` (ou versao especifica) + `RESOLVED: LAST30DAYS_PYTHON=python3`.

- [ ] **Step 2: Definir `SKILL_ROOT`**

```bash
SKILL_ROOT="/c/Users/quena/.claude/plugins/cache/last30days-skill/last30days/3.0.0"
ls "$SKILL_ROOT/scripts/last30days.py" && echo "SKILL_ROOT_OK"
```

Expected: listagem do arquivo + `SKILL_ROOT_OK`.

- [ ] **Step 3: Criar diretorio de reports**

```bash
mkdir -p /c/Users/quena/projetos/niche-intelligence/.research/claude-code-guide
cd /c/Users/quena/projetos/niche-intelligence/.research/claude-code-guide
pwd
```

Expected: path absoluto confirmando cwd.

- [ ] **Step 4: Smoke test da CLI**

```bash
"$LAST30DAYS_PYTHON" "$SKILL_ROOT/scripts/last30days.py" --help 2>&1 | head -20
```

Expected: help output listando flags `--emit`, `--save-dir`, etc. Se retornar erro, **parar** e reportar — sem last30days, fallback para `WebSearch` (mudanca de abordagem).

---

## Fase 1: Coleta Paralela

### Task 2: Disparar 6 queries last30days em background

**Files:**
- Output: `.research/claude-code-guide/report_{1..6}.md` + `log_{1..6}.err`

**Importante:** usar `run_in_background=true` em cada Bash call. Cada query usa `--emit=compact` conforme Regra 1 do CLAUDE.md global (reranking em-context, nao confiar no LLM interno).

- [ ] **Step 1: Query 1 — Hooks + settings.json (A3, C1)**

```bash
cd /c/Users/quena/projetos/niche-intelligence/.research/claude-code-guide
"$LAST30DAYS_PYTHON" "$SKILL_ROOT/scripts/last30days.py" \
  "claude code hooks PreToolUse PostToolUse SessionStart settings.json best practices" \
  --emit=compact --save-dir=. --save-suffix=q1 \
  1>report_1.md 2>log_1.err
echo "Q1_EXIT=$?"
```

Run in background. Expected: process spawns, returns shell ID. Tempo: 3-8 min.

- [ ] **Step 2: Query 2 — Slash commands + keybindings + fast/compact/rewind (A1, A2, A4)**

```bash
"$LAST30DAYS_PYTHON" "$SKILL_ROOT/scripts/last30days.py" \
  "claude code slash commands keybindings shortcuts fast mode context compaction rewind" \
  --emit=compact --save-dir=. --save-suffix=q2 \
  1>report_2.md 2>log_2.err
```

Run in background.

- [ ] **Step 3: Query 3 — Subagents + CLAUDE.md + memory (B1, B2, B3, B4)**

```bash
"$LAST30DAYS_PYTHON" "$SKILL_ROOT/scripts/last30days.py" \
  "claude code subagents delegation Agent tool CLAUDE.md memory system hierarchy" \
  --emit=compact --save-dir=. --save-suffix=q3 \
  1>report_3.md 2>log_3.err
```

Run in background.

- [ ] **Step 4: Query 4 — TDD, debugging, anti-sycophancy, prompt engineering (B5, E10, E12)**

```bash
"$LAST30DAYS_PYTHON" "$SKILL_ROOT/scripts/last30days.py" \
  "claude code TDD test driven development systematic debugging anti sycophancy prompt engineering meta prompt" \
  --emit=compact --save-dir=. --save-suffix=q4 \
  1>report_4.md 2>log_4.err
```

Run in background.

- [ ] **Step 5: Query 5 — Automacao (loops, cron, background, worktrees) (C2, C3, C4, C5)**

```bash
"$LAST30DAYS_PYTHON" "$SKILL_ROOT/scripts/last30days.py" \
  "claude code automation loops scheduled cron background tasks git worktrees parallel" \
  --emit=compact --save-dir=. --save-suffix=q5 \
  1>report_5.md 2>log_5.err
```

Run in background.

- [ ] **Step 6: Query 6 — Skills, plugins, prompt cookbook (D1-D5, E1-E9, E11)**

```bash
"$LAST30DAYS_PYTHON" "$SKILL_ROOT/scripts/last30days.py" \
  "claude code skills plugins SKILL.md architecture prompt patterns cookbook templates" \
  --emit=compact --save-dir=. --save-suffix=q6 \
  1>report_6.md 2>log_6.err
```

Run in background.

- [ ] **Step 7: Verificar todos os 6 processos disparados**

```bash
ls -la /c/Users/quena/projetos/niche-intelligence/.research/claude-code-guide/
```

Expected: listagem com `report_1.md` a `report_6.md` (podem estar vazios ainda), `log_1.err` a `log_6.err`.

---

### Task 3: Mapear estrutura do plugin cache (paralelo a Task 2)

Enquanto as 6 queries rodam em background, explorar source dos plugins instalados — fonte rica de padroes reais ja codificados.

**Files:**
- Read: `/c/Users/quena/.claude/plugins/cache/claude-plugins-official/superpowers/**/*.md`
- Read: `/c/Users/quena/.claude/plugins/cache/claude-plugins-official/gsd/**/*.md`
- Read: `/c/Users/quena/.claude/plugins/cache/last30days-skill/last30days/3.0.0/SKILL.md`
- Output: `.research/claude-code-guide/plugin_cache_findings.md`

- [ ] **Step 1: Listar skills do superpowers**

```bash
ls /c/Users/quena/.claude/plugins/cache/claude-plugins-official/superpowers/*/skills/ 2>&1
```

Capturar os nomes das skills (brainstorming, debugging, executing-plans, TDD, writing-plans, writing-skills, etc.).

- [ ] **Step 2: Ler frontmatter + primeiros 50 linhas de cada SKILL.md do superpowers**

Use Glob para encontrar e Read (parcial) pra extrair:
- Nome, description, when-to-use
- Padroes de checklist, HARD-GATE, flowcharts

Glob pattern: `C:\Users\quena\.claude\plugins\cache\claude-plugins-official\superpowers\**\SKILL.md`

Documentar no arquivo `plugin_cache_findings.md` em formato:
```
## superpowers:<skill-name>
- trigger: <description>
- enforcement: <HARD-GATE / soft / flowchart>
- padrao-chave: <uma linha>
```

- [ ] **Step 3: Ler slash commands do gsd (routed pelo CLAUDE.md global)**

Glob: `C:\Users\quena\.claude\plugins\cache\claude-plugins-official\gsd\**\*.md`

Capturar: estrutura de comando (YAML header?), argument-hint, subagent orchestration patterns.

- [ ] **Step 4: Inspecionar hooks configurados no settings.json global**

```bash
cat /c/Users/quena/.claude/settings.json 2>/dev/null || echo "NO_GLOBAL_SETTINGS"
ls /c/Users/quena/.claude/hooks/ 2>/dev/null || echo "NO_HOOKS_DIR"
```

Capturar cadeia de SessionStart/PreToolUse/etc. configurada.

- [ ] **Step 5: Escrever `plugin_cache_findings.md`**

Consolidar em 1 arquivo de 200-400 linhas com secoes:
- Skills de process rigido (TDD, debug, brainstorming, etc.) — quantas, o que enforcam
- Skills flexiveis (frontend-design, etc.)
- Slash commands do gsd — categorizados
- Hooks observados
- Padroes cross-plugin

---

### Task 4: WebFetch docs oficiais (paralelo a Task 2)

**Files:**
- Output: `.research/claude-code-guide/docs_snippets.md`

- [ ] **Step 1: WebFetch pagina de hooks**

URL: `https://docs.claude.com/en/docs/claude-code/hooks`
Prompt pro WebFetch: "Extract: all hook events (SessionStart, PreToolUse, PostToolUse, Stop, UserPromptSubmit, etc.), JSON config format, environment variables passed, return values, use cases mentioned. Output as structured markdown."

- [ ] **Step 2: WebFetch pagina de skills**

URL: `https://docs.claude.com/en/docs/claude-code/skills`
Prompt: "Extract: SKILL.md frontmatter format, description conventions, user-invocable vs internal, how skills activate, best practices mentioned."

- [ ] **Step 3: WebFetch pagina de subagents**

URL: `https://docs.claude.com/en/docs/claude-code/sub-agents`
Prompt: "Extract: when to use subagents, Agent tool parameters, prompt-writing guidance for subagents, isolation modes, foreground vs background."

- [ ] **Step 4: WebFetch slash commands + settings**

URLs (2 fetches):
- `https://docs.claude.com/en/docs/claude-code/slash-commands`
- `https://docs.claude.com/en/docs/claude-code/settings`

Prompt: "Extract: built-in slash commands (list), custom command creation, settings.json schema (permissions, env, hooks, model), project vs user settings."

- [ ] **Step 5: WebFetch CLAUDE.md + memory**

URL: `https://docs.claude.com/en/docs/claude-code/memory`
Prompt: "Extract: CLAUDE.md hierarchy (global/project/subdir), memory file format, auto-loading rules, @import syntax if exists."

- [ ] **Step 6: Consolidar em `docs_snippets.md`**

Agregar os 5 fetches em um unico arquivo com secoes por topico. Se WebFetch falhar em alguma (URL mudou), documentar e seguir — plugin cache + reports do last30days cobrem o gap.

---

## Fase 2: Consolidacao

### Task 5: Ler todos os reports last30days + catalogar por eixo

**Files:**
- Read: `.research/claude-code-guide/report_{1..6}.md`
- Output: `.research/claude-code-guide/catalog.md`

**Pre-condicao:** 6 queries do Task 2 concluidas (verificar via `ls -la` que reports tem >100 bytes cada).

- [ ] **Step 1: Checar tamanho de todos os reports**

```bash
cd /c/Users/quena/projetos/niche-intelligence/.research/claude-code-guide
wc -l report_*.md log_*.err
```

Expected: cada report com >50 linhas. Se algum vier vazio/minusculo, ler `log_N.err` correspondente pra entender (cookies X expirados, rate limit, etc.).

- [ ] **Step 2: Ler report_1.md (hooks + settings) + extrair achados**

Read completo. Pra cada achado relevante, anotar em formato:
```
[A3 ou C1] <nome do recurso> | <fonte: Reddit/X/HN/doc> | <1-liner de valor>
```

- [ ] **Step 3: Repetir para reports 2-6**

Mesma estrutura. Ao final, `catalog.md` tem uma lista consolidada com todos os achados taggeados pelo sub-topico correspondente (A1-A4, B1-B5, C1-C5, D1-D5, E1-E12).

- [ ] **Step 4: Cross-reference com `plugin_cache_findings.md` e `docs_snippets.md`**

Pra cada achado, adicionar tag `[doc]` ou `[plugin]` se tambem aparece nessas fontes (reforca ranking).

- [ ] **Step 5: Identificar gaps**

Qual sub-topico ficou com <3 achados? Flag pra cobrir com conhecimento interno + docs. Nao inventar — so cobrir o que ja esta evidenciado em alguma fonte.

Expected output: `catalog.md` com 30+ sub-secoes (uma por sub-topico A1-E12), cada uma com 3-10 achados taggeados.

---

### Task 6: Decidir ranking de cada item (3 criterios)

**Files:**
- Read: `.research/claude-code-guide/catalog.md`
- Modify: `.research/claude-code-guide/catalog.md` (adicionar coluna `ranking`)

**Criterios:**
1. **Frequencia** — quantas fontes independentes mencionam? (1 = so doc, 3+ = comunidade forte)
2. **Profundidade** — que classe de problema resolve? (triagem: trivial / produtividade / transformacional)
3. **Custo de oportunidade** — quao mal fica quem nao sabe? (esquecivel / util / bloqueante)

**Mapa:**
- ⭐⭐⭐⭐⭐ = freq 3+ AND profundidade transformacional AND custo bloqueante
- ⭐⭐⭐⭐ = freq 2+ AND (profundidade transformacional OR custo bloqueante)
- ⭐⭐⭐ = freq 2+ AND profundidade produtividade
- ⭐⭐ = freq 1 AND profundidade util
- ⭐ = niche edge-case, so pra completude

- [ ] **Step 1: Revisar catalog.md item a item**

Pra cada achado, atribuir estrelas na margem:
```
[A1] /fast slash command | [doc][plugin] | liga Opus 4.6 rapido | ⭐⭐⭐⭐
```

- [ ] **Step 2: Garantir >=1 achado ⭐⭐⭐⭐⭐ por eixo**

Se algum eixo (A, B, C, D, E) nao tem nenhum 5-estrelas, re-avaliar — talvez um 4-estrelas merece upgrade baseado em contexto do Dayner (quem constroi skills, plugins, hooks).

- [ ] **Step 3: Identificar top 20 pro TL;DR**

Selecionar os 20 mais impactantes (5+4 estrelas apenas). Marcar com `[TLDR]` no catalog.

Expected: `catalog.md` com todos os itens ranqueados, top-20 flagged.

---

## Fase 3: Escrita

### Task 7: Criar esqueleto `GUIA_CLAUDE_CODE.md`

**Files:**
- Create: `/c/Users/quena/projetos/niche-intelligence/GUIA_CLAUDE_CODE.md`

- [ ] **Step 1: Write skeleton**

```markdown
# Guia Claude Code — Referencia

> **Data:** 2026-04-17
> **Escopo:** Produtividade + Qualidade + Automacao + Skills/Plugins + Prompts cookbook
> **Formato:** cheatsheet de consulta. Cada entrada segue template: exemplo / quando / por que / melhor pra / evitar. Ranking 1-5 estrelas.
> **Fontes:** docs.claude.com + comunidade (Reddit/X/HN/YouTube) + plugin cache local (superpowers, gsd, last30days).

---

## 1. TL;DR — Top 20 recursos que mudam o jogo

*[preencher em Task 16 retroativamente, apos todas as secoes escritas]*

---

## 2. Quick Selector — "Pra fazer X, usa Y"

*[preencher em Task 16]*

---

## 3. Eixo A — Produtividade

*[preencher em Task 8]*

### A1. Slash commands built-in
### A2. Keybindings e chord bindings
### A3. Permission modes + settings.json
### A4. Fast mode, context compaction, rewind

---

## 4. Eixo B — Qualidade de output

*[preencher em Task 9]*

### B1. Hierarquia CLAUDE.md
### B2. Memory system (user / feedback / project / reference)
### B3. Quando delegar para subagent
### B4. Escrever briefings bons para subagents
### B5. Skills rigidas (TDD, brainstorming, debugging, verification)

---

## 5. Eixo C — Automacao e autonomia

*[preencher em Task 10]*

### C1. Hooks (SessionStart, PreToolUse, PostToolUse, Stop, UserPromptSubmit)
### C2. Loops (`/loop` com intervalo vs dinamico, ScheduleWakeup)
### C3. Scheduled agents (CronCreate, RemoteTrigger)
### C4. Background tasks (`run_in_background`, Monitor)
### C5. Git worktrees para isolacao

---

## 6. Eixo D — Skills e Plugins

*[preencher em Task 11]*

### D1. Anatomia de SKILL.md
### D2. Organizacao de references/prompts
### D3. Skill vs hook vs slash command vs memory
### D4. Plugins oficiais (superpowers, gsd, last30days)
### D5. Reuso multi-projeto

---

## 7. Eixo E — Prompts cookbook

*[preencher em Task 12]*

### E1. Debug sistematico
### E2. Refactor grande / migracao
### E3. Gerar CLAUDE.md / onboarding
### E4. Code review / PR review
### E5. Brainstorming / planning
### E6. TDD enforcement
### E7. Delegacao para subagent
### E8. Construir skill / SKILL.md
### E9. Escrever specs / plans
### E10. Meta-prompts
### E11. Exploracao de codebase
### E12. Anti-sycophancy / pushback honesto

---

## 8. Anti-patterns — o que evitar

*[preencher em Task 13]*

---

## 9. Fontes consultadas

*[preencher em Task 14]*
```

- [ ] **Step 2: Verificar**

```bash
wc -l /c/Users/quena/projetos/niche-intelligence/GUIA_CLAUDE_CODE.md
```

Expected: ~90 linhas (so esqueleto).

---

### Task 8: Eixo A — Produtividade (A1-A4)

**Files:**
- Read: `.research/claude-code-guide/catalog.md` (achados A1-A4)
- Modify: `GUIA_CLAUDE_CODE.md` (secao 3)

**Template de entrada obrigatorio (repetir em Tasks 9-12 tambem):**
```markdown
### AX. [Titulo curto] ⭐⭐⭐⭐⭐

**Exemplo:**
\`\`\`[bash|json|markdown]
<snippet copiavel concreto de 3-15 linhas>
\`\`\`

**Quando usar:** <cenario especifico de ativacao>
**Por que funciona:** <mecanismo ou beneficio>
**Melhor pra:** <caso de uso onde e 1a escolha>
**Evitar quando:** <contra-indicacao>
```

- [ ] **Step 1: Escrever A1 — Slash commands built-in**

Cobrir: `/help`, `/clear`, `/compact`, `/fast`, `/rewind`, `/loop`, `/schedule`, `/login`, `/logout`, `/ide`. Para cada, um micro-exemplo. Ranking: provavelmente ⭐⭐⭐⭐⭐ pro conjunto (essencial).

- [ ] **Step 2: Escrever A2 — Keybindings e chord bindings**

Cobrir: como editar `~/.claude/keybindings.json`, chord bindings (e.g., `Ctrl+X Ctrl+S`), exemplos do Dayner poder customizar. Ranking esperado: ⭐⭐⭐ (situacional, mas alto valor quando muda cadencia diaria).

- [ ] **Step 3: Escrever A3 — Permissions + settings.json**

Cobrir: `allow`/`deny` lists, `skills/fewer-permission-prompts` (do superpowers), project vs user settings, hooks de aprovacao. Exemplo: allowlist pra `npm test`, `pytest`, etc. Ranking: ⭐⭐⭐⭐⭐ (toda sessao usa).

- [ ] **Step 4: Escrever A4 — Fast mode, context compaction, rewind**

Cobrir: `/fast` (Opus 4.6 acelerado), `/compact` (resumo pra liberar contexto), rewind (voltar N mensagens), 1M context (como usar). Ranking: ⭐⭐⭐⭐ (nao diario, mas salva sessao).

- [ ] **Step 5: Verificar**

Ler a secao 3 do GUIA. Deve ter 4 entradas completas, cada uma com os 5 campos do template.

---

### Task 9: Eixo B — Qualidade (B1-B5)

**Files:**
- Read: `.research/claude-code-guide/catalog.md` (achados B1-B5)
- Read: `~/.claude/plugins/cache/claude-plugins-official/superpowers/<version>/skills/brainstorming/SKILL.md` (referencia de skill rigida)
- Modify: `GUIA_CLAUDE_CODE.md` (secao 4)

**Template: mesmo de Task 8.**

- [ ] **Step 1: Escrever B1 — Hierarquia CLAUDE.md**

Cobrir: global (`~/.claude/CLAUDE.md`) > projeto (`CLAUDE.md` na raiz) > subdir (opcional). Quando usar cada. Exemplo real: mostrar estrutura do projeto niche-intelligence como caso. Ranking: ⭐⭐⭐⭐⭐.

- [ ] **Step 2: Escrever B2 — Memory system**

Cobrir: 4 tipos (user/feedback/project/reference), estrutura de `memory/MEMORY.md` (index <200 linhas) + arquivos individuais com frontmatter. Quando salvar vs nao salvar. Exemplo do proprio `MEMORY.md` do Dayner. Ranking: ⭐⭐⭐⭐⭐.

- [ ] **Step 3: Escrever B3 — Quando delegar pra subagent**

Cobrir: contexto protection, paralelismo, tarefas com muitos results (Explore/general-purpose). Tabela de decisao: delegar se (A) vai queimar muito contexto, (B) e paralelizavel, (C) e auto-contido. Ranking: ⭐⭐⭐⭐⭐.

- [ ] **Step 4: Escrever B4 — Briefings pra subagent**

Cobrir: prompt self-contained (agente nao tem contexto), incluir path + linha + objetivo, especificar formato de resposta, "report in under 200 words". Anti-pattern: "based on your findings, fix the bug" (delega entendimento). Ranking: ⭐⭐⭐⭐.

- [ ] **Step 5: Escrever B5 — Skills rigidas**

Cobrir: TDD (test-first), systematic-debugging (scientific method), brainstorming (HARD-GATE antes de implementar), verification-before-completion (evidence before assertions). Quando seguir vs quando relaxar. Ranking: ⭐⭐⭐⭐⭐.

- [ ] **Step 6: Verificar**

Secao 4 do GUIA deve ter 5 entradas completas.

---

### Task 10: Eixo C — Automacao (C1-C5)

**Files:**
- Read: `.research/claude-code-guide/catalog.md` (achados C1-C5)
- Read: `.research/claude-code-guide/docs_snippets.md` (pagina de hooks)
- Modify: `GUIA_CLAUDE_CODE.md` (secao 5)

- [ ] **Step 1: Escrever C1 — Hooks**

Cobrir: os 5 eventos (SessionStart, PreToolUse, PostToolUse, Stop, UserPromptSubmit), formato JSON em settings.json, variaveis de ambiente passadas (e.g., `CLAUDE_TOOL_NAME`, `CLAUDE_HOOK_EVENT`), return code semantics (0 = continue, 2 = block). Exemplo concreto: hook de auto-format no PostToolUse. Ranking: ⭐⭐⭐⭐⭐ (automation unlock real).

- [ ] **Step 2: Escrever C2 — Loops (/loop + ScheduleWakeup)**

Cobrir: `/loop 5m /check-ci`, `/loop` dinamico (self-paced via ScheduleWakeup), quando usar cada. Cache window 5-min (270s stay hot vs 1200s+ commit-to-long). Ranking: ⭐⭐⭐ (situacional mas potente).

- [ ] **Step 3: Escrever C3 — Scheduled agents**

Cobrir: CronCreate (agendar agent pra rodar em cron), CronList/CronDelete, RemoteTrigger, diferenca pro /loop. Use case: research semanal automatico. Ranking: ⭐⭐⭐.

- [ ] **Step 4: Escrever C4 — Background tasks**

Cobrir: `run_in_background=true` em Bash/Agent, Monitor tool pra stream de stdout, quando preferir BG vs FG (independent work vs blocking on result). Ranking: ⭐⭐⭐⭐.

- [ ] **Step 5: Escrever C5 — Git worktrees**

Cobrir: EnterWorktree/ExitWorktree (pra agents isolados), use case: 2+ features paralelas sem conflito. Ranking: ⭐⭐⭐.

- [ ] **Step 6: Verificar**

Secao 5 com 5 entradas completas.

---

### Task 11: Eixo D — Skills/Plugins (D1-D5)

**Files:**
- Read: `.research/claude-code-guide/plugin_cache_findings.md`
- Modify: `GUIA_CLAUDE_CODE.md` (secao 6)

- [ ] **Step 1: Escrever D1 — Anatomia de SKILL.md**

Cobrir: YAML frontmatter (name, description, allowed-tools, argument-hint, user-invocable), description como gatilho de ativacao (crucial!), HARD-GATE vs soft, checklist com TaskCreate. Exemplo minimal: 15 linhas de SKILL.md funcional. Ranking: ⭐⭐⭐⭐⭐.

- [ ] **Step 2: Escrever D2 — references/prompts organization**

Cobrir: padrao do projeto (`skills/<skill>/references/prompts/*.md`), `_prompt_principles.md` como camada constitucional, quando separar prompt em arquivo vs inline na SKILL.md. Exemplo: estrutura do `roteiro-youtube`. Ranking: ⭐⭐⭐⭐.

- [ ] **Step 3: Escrever D3 — Skill vs hook vs slash command vs memory**

Cobrir: tabela de decisao. Regra: se precisa automatico (sem user pedir), e hook. Se user pede com comando curto, slash. Se e workflow complexo, skill. Se e fato persistente, memory. Ranking: ⭐⭐⭐⭐⭐.

- [ ] **Step 4: Escrever D4 — Plugins oficiais**

Cobrir (3 cases): superpowers (process-rigid skills, HARD-GATEs), gsd (planning-driven dev com phase/roadmap), last30days (multi-source research). O que aprender de cada. Ranking: ⭐⭐⭐⭐.

- [ ] **Step 5: Escrever D5 — Reuso multi-projeto**

Cobrir: publicar skill em plugin, `~/.claude/plugins/`, ou manter local em `projeto/skills/`. Como ativar plugin (`/plugin install`). Ranking: ⭐⭐⭐.

- [ ] **Step 6: Verificar**

Secao 6 com 5 entradas completas.

---

### Task 12: Eixo E — Prompts cookbook (E1-E12)

**Files:**
- Read: `.research/claude-code-guide/catalog.md` (achados E1-E12)
- Modify: `GUIA_CLAUDE_CODE.md` (secao 7)

**Nota:** este eixo tem 12 entradas. Dividir em sub-batches de 4 pra nao perder foco.

- [ ] **Step 1: Batch 1 — E1 Debug sistematico + E2 Refactor grande + E3 CLAUDE.md gen + E4 Code review**

E1: Prompt tipo "Use scientific method: hypothesis > test > observe > refine. Do not propose fixes until root cause is confirmed."
E2: Prompt tipo "List all call sites before touching. Preserve signatures until migration complete."
E3: Prompt tipo "Read package.json + top 3 src files. Summarize: stack, conventions, entry points. Write CLAUDE.md sections: 1-project, 2-architecture, 3-dev commands, 4-conventions."
E4: Prompt tipo "Review PR #N. Check: security (OWASP top 10), tests cover new paths, no placeholder/TODO, follows existing patterns. Output: BLOCKER / SUGGESTION / NIT per finding."

Cada um com exemplo + quando + por que + melhor pra + evitar. Ranking por dor que resolve.

- [ ] **Step 2: Batch 2 — E5 Brainstorming + E6 TDD + E7 Subagent delegation + E8 Skill construction**

E5: "Use superpowers:brainstorming. Goal: <...>. Ask one question at a time. Propose 2-3 approaches. Present design. Get approval before writing spec."
E6: "Implement X via TDD. Write failing test first. Do not write implementation until test fails. One test-implement-commit cycle per behavior."
E7: "Dispatch Agent with subagent_type=Explore. Task: <...>. Report: what you found, key files, open questions. Under 200 words. No implementation."
E8: "Create skill at skills/<name>/SKILL.md. Frontmatter: name, description (trigger-quality), allowed-tools. Sections: checklist, HARD-GATE, process, examples. Reference existing skill <X> as template."

- [ ] **Step 3: Batch 3 — E9 Specs + E10 Meta-prompts + E11 Codebase exploration + E12 Anti-sycophancy**

E9: "Write spec at docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md. Sections: goal, scope (in/out), architecture, success criteria, risks. No placeholders."
E10: "Rewrite my previous prompt to: (a) remove ambiguity, (b) add success criteria, (c) specify output format. Return ONLY the new prompt, no explanation."
E11: "Use Agent subagent_type=Explore thoroughness=medium. Find: <pattern>. Report: files + line numbers + one-line context each. Under 150 words."
E12: "Be my toughest critic. Find 3 weaknesses in this design. Do not soften. If I'm wrong, tell me I'm wrong. Do not agree to avoid conflict."

- [ ] **Step 4: Verificar**

Secao 7 com 12 entradas completas. Total de palavras ~3000-5000 (mais longa do guia).

---

### Task 13: Anti-patterns

**Files:**
- Modify: `GUIA_CLAUDE_CODE.md` (secao 8)

- [ ] **Step 1: Escrever 8-12 anti-patterns curtos**

Formato:
```markdown
### AP-N: <nome>
**Sintoma:** <como reconhecer>
**Por que e ruim:** <consequencia>
**Fix:** <alternativa>
```

Candidatos (selecionar 8-12 mais referenciados):
1. **Fazer Claude inferir sem CLAUDE.md** — caro, baixa qualidade. Fix: 2 horas escrevendo CLAUDE.md pagam em toda sessao seguinte.
2. **Subagent sem briefing auto-contido** — "based on your findings, fix it" delega entendimento. Fix: escrever prompt como se o agente acabou de chegar.
3. **Pular brainstorming em "projeto simples"** — projeto simples nao existe. Fix: spec curto mas sempre.
4. **Committar automatico** — global CLAUDE.md pede explicit ask. Fix: nunca commitar sem "commita ai".
5. **Mocks em integration tests** — paresce testar, nao testa. Fix: real DB/API em integration.
6. **Rewind em vez de fix** — eventualmente volta a acontecer. Fix: debug sistematico + skill verification.
7. **Re-ler arquivo que acabou de editar** — Edit/Write teriam erroed. Fix: trust the harness.
8. **Prompt terso pra subagent** — produz trabalho shallow. Fix: briefing como colega que acabou de chegar.
9. **Sycophantic agreement** — concorda pra evitar conflito. Fix: E12 anti-sycophancy prompt.
10. **Skills invocadas so quando obvio** — 1% de chance = invocar. Fix: superpowers:using-superpowers primeiro.
11. **MEMORY.md crescendo alem de 200 linhas** — truncado. Fix: arquivos individuais + index enxuto.
12. **/compact em meio a plano** — perde contexto do que ja foi feito. Fix: so em transicao natural.

- [ ] **Step 2: Verificar**

Secao 8 com 8-12 entradas.

---

### Task 14: Fontes consultadas

**Files:**
- Read: `.research/claude-code-guide/{report_1..6}.md`, `plugin_cache_findings.md`, `docs_snippets.md`
- Modify: `GUIA_CLAUDE_CODE.md` (secao 9)

- [ ] **Step 1: Extrair URLs citadas**

Grep nos reports por URLs (`https://...`). Listar unicas.

```bash
grep -hoE 'https?://[^ )"]+' .research/claude-code-guide/report_*.md 2>/dev/null | sort -u | head -50
```

- [ ] **Step 2: Categorizar fontes**

Agrupar em:
- **Docs oficiais** (docs.claude.com, docs.anthropic.com)
- **Comunidade** (Reddit, X/Twitter, HN)
- **Blogs/videos** (YouTube, Medium, Substack)
- **GitHub** (repos de plugins, skills)
- **Plugin cache local** (paths dos plugins lidos)

- [ ] **Step 3: Escrever secao 9**

Formato:
```markdown
## 9. Fontes consultadas

### Docs oficiais
- [Hooks](https://docs.claude.com/...)
- [Skills](...)
...

### Comunidade (top 10)
- [titulo] — [url] — [1-liner do valor extraido]
...

### Plugin cache local (code-read)
- `superpowers` — ~/.claude/plugins/cache/...
- `gsd` — ...
- `last30days` — ...
```

---

### Task 15: Preencher TL;DR + Quick selector (retroativo)

**Files:**
- Read: `GUIA_CLAUDE_CODE.md` (secoes 3-8 agora preenchidas)
- Modify: `GUIA_CLAUDE_CODE.md` (secoes 1 + 2)

- [ ] **Step 1: Selecionar top-20 para TL;DR**

Criterio: entradas ⭐⭐⭐⭐⭐ primeiro (provavelmente 15-20). Se faltar pra chegar a 20, pegar ⭐⭐⭐⭐ com maior impacto no dia-a-dia.

Formato TL;DR (1 linha cada):
```markdown
1. **CLAUDE.md hierarquico** — global > projeto > subdir. Escrever vale 20x o esforco.
2. **Memory system** — 4 tipos, MEMORY.md index. Nao repetir correcoes.
3. **Hooks** — SessionStart/PreToolUse automation. Unlock real de autonomia.
...
20. **/compact em transicao natural** — libera contexto sem perder estado.
```

- [ ] **Step 2: Montar Quick Selector — index por objetivo**

Formato:
```markdown
## 2. Quick Selector — "Pra fazer X, usa Y"

| Objetivo | Usa | Ref |
|----------|-----|-----|
| Debugar bug sistematicamente | superpowers:systematic-debugging + prompt E1 | secao 4 B5, secao 7 E1 |
| Onboarding de repo novo | prompt E3 + CLAUDE.md hierarquia | secao 4 B1, secao 7 E3 |
| Research multi-fonte | last30days plugin + emit=compact | secao 6 D4, CLAUDE.md global Regra 1 |
| Paralelizar 3+ queries independentes | Agent run_in_background OU subagent_type=Explore | secao 5 C4, secao 4 B3 |
| Automatizar format apos Edit | hook PostToolUse | secao 5 C1 |
| Pedir pushback honesto | prompt E12 anti-sycophancy | secao 7 E12 |
| ... (15-20 linhas) | | |
```

Cobrir os 15-20 casos de uso mais comuns do Dayner (baseado no CLAUDE.md do projeto: research de concorrentes, roteiro, thumbnail, video-cut, debug de pipeline Python, MCP setup, etc.).

- [ ] **Step 3: Verificar**

```bash
wc -l /c/Users/quena/projetos/niche-intelligence/GUIA_CLAUDE_CODE.md
```

Expected: 700-1500 linhas totais.

---

## Fase 4: Review + Entrega

### Task 16: Self-review + fix inline

**Files:**
- Read: `GUIA_CLAUDE_CODE.md` (completo)

**Checklist (cada item = 1 step):**

- [ ] **Step 1: Placeholder scan**

```bash
grep -nE "TBD|TODO|\[\.\.\.\]|\[preencher\]|a definir|placeholder" /c/Users/quena/projetos/niche-intelligence/GUIA_CLAUDE_CODE.md
```

Expected: 0 matches. Se tiver, fix inline.

- [ ] **Step 2: Cobertura dos 30 sub-topicos**

Grep por cada marker:
```bash
for id in A1 A2 A3 A4 B1 B2 B3 B4 B5 C1 C2 C3 C4 C5 D1 D2 D3 D4 D5 E1 E2 E3 E4 E5 E6 E7 E8 E9 E10 E11 E12; do
  count=$(grep -c "^### $id\." /c/Users/quena/projetos/niche-intelligence/GUIA_CLAUDE_CODE.md)
  echo "$id: $count"
done
```

Expected: `<id>: 1` pra todos. Se algum vier 0, adicionar.

- [ ] **Step 3: Template compliance**

Pra cada entrada, verificar presenca dos 5 campos:

```bash
# Conta ocorrencias dos campos. Devem ser ~30 de cada.
grep -c "^\*\*Exemplo:\*\*" /c/Users/quena/projetos/niche-intelligence/GUIA_CLAUDE_CODE.md
grep -c "^\*\*Quando usar:\*\*" /c/Users/quena/projetos/niche-intelligence/GUIA_CLAUDE_CODE.md
grep -c "^\*\*Por que funciona:\*\*" /c/Users/quena/projetos/niche-intelligence/GUIA_CLAUDE_CODE.md
grep -c "^\*\*Melhor pra:\*\*" /c/Users/quena/projetos/niche-intelligence/GUIA_CLAUDE_CODE.md
grep -c "^\*\*Evitar quando:\*\*" /c/Users/quena/projetos/niche-intelligence/GUIA_CLAUDE_CODE.md
```

Expected: >= 30 de cada. Se algum campo faltar, preencher.

- [ ] **Step 4: Ranking sanity check**

```bash
grep -cE "⭐{5}|⭐⭐⭐⭐⭐" /c/Users/quena/projetos/niche-intelligence/GUIA_CLAUDE_CODE.md
grep -cE "^### .* ⭐" /c/Users/quena/projetos/niche-intelligence/GUIA_CLAUDE_CODE.md
```

Expected: >=1 item 5-estrelas por eixo (A/B/C/D/E = 5+). Total de headers com estrela >= 30.

- [ ] **Step 5: Coerencia de termos**

Verificar terminos consistentes: "subagent" (nao "sub-agent" nem "sub agent"). "CLAUDE.md" sempre maiusculo. "settings.json" lowercase.

```bash
grep -in "sub-agent\|sub agent" /c/Users/quena/projetos/niche-intelligence/GUIA_CLAUDE_CODE.md
grep -in "claude\.md\|Claude\.md" /c/Users/quena/projetos/niche-intelligence/GUIA_CLAUDE_CODE.md | grep -v "CLAUDE.md"
```

Expected: 0 matches em cada. Se aparecer, fix via `sed` ou Edit replace_all.

- [ ] **Step 6: Links nao quebrados (soft check)**

Se ha tempo, WebFetch 2-3 URLs aleatorias da secao 9 pra confirmar que respondem 200. Nao obrigatorio.

- [ ] **Step 7: Fixes inline conforme checklist detectar**

Edit in-place pra cada issue encontrada nos steps 1-5. Apos cada fix, re-rodar o comando relevante.

---

### Task 17: Entrega final

- [ ] **Step 1: Reportar ao usuario**

Output um summary de 5-8 linhas:
```
GUIA_CLAUDE_CODE.md entregue na raiz do projeto.
- Linhas: <N>
- Entradas: 30 (A1-A4 + B1-B5 + C1-C5 + D1-D5 + E1-E12)
- 5-estrelas: <M>
- Anti-patterns: <K>
- Fontes: <docs oficiais, X comunidade, Y plugin cache>
Intermediarios em .research/claude-code-guide/ (6 reports last30days + catalog + docs_snippets + plugin_cache_findings).
```

- [ ] **Step 2: Perguntar sobre commit**

"Commito o guia + spec + plan em um commit focado na branch atual, ou voce prefere criar branch dedicada (ex: `feat/claude-code-guide`)?" — esperar decisao (CLAUDE.md global: so commitar quando pedido).

- [ ] **Step 3: Cleanup opcional**

Perguntar se quer manter `.research/claude-code-guide/` como intermediarios (util pra re-runs) ou apagar (manter repo limpo). Aguardar resposta.

---

## Self-Review do plano (apos escrever tudo)

**1. Cobertura do spec** (`2026-04-17-claude-code-guide-design.md`):
- Secao 2 (Eixos) → Tasks 8-12 ✓
- Secao 3 (Template + ranking + estrutura) → Tasks 7, 8-12 ✓
- Secao 4.1 (Fontes) → Tasks 2, 3, 4 ✓
- Secao 4.2 (6 queries) → Task 2 ✓
- Secao 4.3 (Consolidacao) → Tasks 5, 6 ✓
- Secao 5 (Criterios de sucesso) → Task 16 (todos os checks) ✓
- Secao 7 (Fases 1-4) → plano mapeado ✓

**2. Placeholder scan:** Nenhum "TBD", "TODO", "a definir", "similar to task N" no plano. Todos os steps tem comandos/codigo concretos.

**3. Consistencia:**
- `LAST30DAYS_PYTHON` + `SKILL_ROOT` definidos em Task 1, reutilizados em Task 2 ✓
- Path do guia consistente: `/c/Users/quena/projetos/niche-intelligence/GUIA_CLAUDE_CODE.md` em Tasks 7-16 ✓
- Template de entrada (5 campos) definido em Task 8, reforcado em Task 16 Step 3 ✓
- Ranking ⭐⭐⭐⭐⭐ definido em Task 6, verificado em Task 16 Step 4 ✓
