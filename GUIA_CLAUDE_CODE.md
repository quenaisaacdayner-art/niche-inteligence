# Guia Claude Code — Referencia

> **Data:** 2026-04-17
> **Escopo:** Produtividade + Qualidade + Automacao + Skills/Plugins + Prompts cookbook (5 eixos, 30 sub-topicos, 12 anti-patterns)
> **Formato:** cheatsheet de consulta. Cada entrada segue template fixo: **exemplo / quando usar / por que funciona / melhor pra / evitar quando**. Ranking 1-5 estrelas baseado em frequencia de mencao na comunidade × profundidade do problema resolvido × custo de oportunidade.
> **Fontes:** docs oficiais (code.claude.com) + comunidade (Reddit r/ClaudeCode, r/ClaudeAI, X, HN, YouTube, GitHub) + source dos plugins instalados (superpowers v5.0.7, last30days v3.0.0). Ver secao 9.

---

## 1. TL;DR — Top 20 recursos que mudam o jogo

Os 16 itens 5-estrelas + 4 itens 4-estrelas de maior impacto diario:

1. **Slash commands built-in (A1)** — `/` expoe 50+ comandos + 5 skills bundled. `/help` e sempre a resposta certa pra "qual comando era mesmo?".
2. **Permissions + `/fewer-permission-prompts` (A3)** — escanea transcripts e gera allowlist priorizada. Cada `yes, continue` que voce evita economiza fricao.
3. **Hierarquia CLAUDE.md (B1)** — managed > project > user > local. Escrever um CLAUDE.md bom paga em toda sessao seguinte (20x ROI segundo a comunidade).
4. **Memory system (B2)** — 4 tipos (user/feedback/project/reference) + MEMORY.md como index enxuto (<200 linhas). Correcao salva = correcao nao repetida.
5. **Delegacao pra subagent (B3)** — `Explore` (Haiku, read-only) pra search, `Plan` pra design, `general-purpose` pra multi-step. Protege contexto do main.
6. **Briefings auto-contidos (B4)** — prompt de subagent como colega que acabou de chegar: path + linha + goal + formato de resposta. Terso = trabalho shallow.
7. **Hooks em settings.json (C1)** — 26 eventos de lifecycle. Unico jeito de codificar "toda vez que X, faca Y" sem depender de Claude lembrar.
8. **Anatomia SKILL.md (D1)** — frontmatter + HARD-GATE + checklist com TaskCreate. Description e o trigger de ativacao; seja especifico.
9. **`references/prompts/` organizados (D2)** — `_prompt_principles.md` como camada constitucional, prompts por fase. Composicao > inline gigante.
10. **Tabela de decisao skill vs hook vs slash vs memory (D3)** — "se precisa acontecer sem Claude decidir, e hook". Resolve 80% das duvidas de arquitetura.
11. **Prompt E1 — Debug sistematico** — "metodo cientifico: reproduza, 3 hipoteses, teste cada uma, so entao fix". Mata o reflexo de "should work".
12. **Prompt E2 — Refactor grande** — "liste todos os call sites antes de tocar; preserve signatures ate migracao completa". Evita quebrar em cascata.
13. **Prompt E4 — Code review** — OWASP top 10 + tests cover new paths + no placeholders + follow existing patterns. BLOCKER/SUGGESTION/NIT.
14. **Prompt E5 — Brainstorming** — "uma pergunta por vez, 2-3 approaches, design first". HARD-GATE antes de implementar.
15. **Prompt E6 — TDD enforcement** — "RED before GREEN. No production code without a failing test first". Iron Law da superpowers.
16. **Prompt E12 — Anti-sycophancy** — "seja meu critico mais duro. 3 fraquezas. Nao suavize. Se estou errado, fale". Quebra concordancia performativa.
17. **Fast mode + compact + rewind (A4)** — `/fast` acelera Opus, `/compact` libera contexto sem perder skills (budget 25k tokens), `/rewind` restaura codigo E conversa.
18. **`run_in_background=true` + Monitor (C4)** — kickoff de build/test longo sem bloquear sessao. Streaming via Monitor evita polling.
19. **Git worktrees (C5)** — `isolation: worktree` em subagent + `/batch` pra features paralelas sem conflito de arvore.
20. **Plugins oficiais (D4)** — superpowers (Iron Laws + HARD-GATEs), gsd (planning por fase + model profile), last30days (research multi-fonte). Ler source antes de construir o seu.

---

## 2. Quick Selector — "Pra fazer X, usa Y"

| Objetivo | Usa | Ref |
|----------|-----|-----|
| Debugar bug sistematicamente | Skill `superpowers:systematic-debugging` + prompt E1 | 4 (B5), 7 (E1) |
| Onboarding de repo novo (gerar CLAUDE.md) | Prompt E3 + hierarquia CLAUDE.md | 4 (B1), 7 (E3) |
| Research multi-fonte (Reddit/X/HN/YouTube) | Plugin `last30days` + `--emit=compact` | 6 (D4) |
| Paralelizar 3+ queries independentes | `Agent run_in_background=true` OU subagent `Explore` | 4 (B3), 5 (C4) |
| Automatizar lint/format apos Edit | Hook `PostToolUse` matcher `Edit\|Write` | 5 (C1) |
| Pedir pushback honesto, evitar concordancia | Prompt E12 anti-sycophancy | 7 (E12) |
| Criar nova skill do zero | Prompt E8 + anatomia SKILL.md (D1) | 6 (D1), 7 (E8) |
| Planejar feature nao-trivial | Skill `superpowers:brainstorming` + prompt E5 | 4 (B5), 7 (E5) |
| Refactor grande em multi-arquivos | Prompt E2 + subagent `Plan` pra mapa de call sites | 7 (E2) |
| Implementar feature nova com TDD | Skill `superpowers:test-driven-development` + prompt E6 | 4 (B5), 7 (E6) |
| Acelerar sessao longa sem perder estado | `/fast` + `/compact` + `/rewind` (trilogia A4) | 3 (A4) |
| Reduzir prompts de permissao | Skill `fewer-permission-prompts` (A3) + allowlist em `settings.json` | 3 (A3) |
| Escrever spec ou plan pra feature | Prompt E9 + skills `writing-plans`/`writing-skills` | 7 (E9) |
| Reescrever prompt ambiguo ou vago | Prompt E10 meta-prompt | 7 (E10) |
| Auditar/mapear codebase desconhecido | Subagent `Explore` + prompt E11 | 4 (B3), 7 (E11) |
| Rodar workflow no cron (sem humano no terminal) | Slash `/schedule` (routines, webhooks) | 5 (C3) |
| Feature paralela sem sujar a worktree atual | Git worktrees (`isolation: worktree` ou `/batch`) | 5 (C5) |
| Code review de PR | Prompt E4 (OWASP + tests + placeholders) | 7 (E4) |
| Nao esquecer correcao entre sessoes | Memory `type: feedback` com **Why** e **How to apply** | 4 (B2) |
| Delegar trabalho sem queimar contexto do main | Subagent `Explore/Plan` + briefing E7 + "under 200 words" | 4 (B3-B4), 7 (E7) |

---

## 3. Eixo A — Produtividade

> Atalhos de sessao que reduzem friction no uso diario. Focam em **descoberta**
> (slash commands), **customizacao de input** (keybindings), **seguranca sem
> interromper flow** (permissions) e **longevidade de contexto** (fast +
> compact + rewind).

---

### A1. Slash commands built-in — nave-mae de features escondidas ⭐⭐⭐⭐⭐

**Exemplo:**
```text
/                           # abre menu de TODOS os comandos (fuzzy-filter)
/help                       # lista help + todos os commands ativos
/clear                      # nova conversa (alias /reset /new)
/compact <hint?>            # compacta transcript atual (resumo + re-inject)
/rewind                     # undo conversational + codigo (aliases /checkpoint /undo)
/context                    # grid visual de uso do context window
/cost                       # token usage + $ gasto na sessao
/fast [on|off]              # toggle fast mode (Haiku underlying)
/model <name>               # troca modelo mid-session
/effort <level|auto>        # low|medium|high|xhigh|max (extended thinking)
/focus                      # esconde UI exceto prompt + summary + response
/resume [session]           # retoma sessao anterior (alias /continue)
/review [PR]                # revisa PR local ou referenciado
/security-review            # analise de seguranca nas mudancas pendentes
/init                       # bootstrap CLAUDE.md no repo atual
/skills                     # lista skills ativas (pressiona `t` pra sort by tokens)
/hooks                      # browser read-only de hooks configurados
/status                     # mostra todas as camadas de settings ativas + source
```

**Quando usar:** Sempre que precisar de uma acao operacional de sessao que
nao e prompt-para-LLM (limpar, resumir, desfazer, ver custo, trocar modelo,
revisar PR, etc). `/` sozinho e o **discovery primario** — o menu mostra
built-ins + bundled skills + user skills + plugin commands + MCP prompts
num unico fuzzy finder.
**Por que funciona:** Slash commands NAO gastam turn de API pra acoes
administrativas (`/cost`, `/context`, `/clear`, `/copy`) e quando gastam
(`/review`, `/simplify`, `/compact`) sao opinionativos o suficiente pra
valer. Ha 50+ built-in + 5 bundled skills (`/batch`, `/claude-api`, `/debug`,
`/less-permission-prompts`, `/simplify`, `/loop`), mais qualquer skill de
projeto ou plugin ativo. Reddit r/ClaudeAI documenta que a maioria dos
usuarios conhece <10.
**Melhor pra:** Fluir entre tarefas sem digitar prompts repetitivos
("limpe", "me mostra o custo", "compacte agora"). `/compact <hint>` com
instrucao preserva o foco do resumo ("preserve decisions about architecture,
drop exploration").
**Evitar quando:** Custom commands ambiguos — skill com nome igual a
built-in faz override (skill vence), entao nao nomear skill `commit`,
`review`, `compact`, `clear`. Sempre checar `/help` antes de criar custom.

---

### A2. Keybindings + chord bindings via `/keybindings` ⭐⭐⭐

**Exemplo:**
```json
// ~/.claude/keybindings.json  (editar via /keybindings — apply instantaneo)
{
  "app:submit": "enter",
  "app:newline": "shift+enter",
  "app:cancel": "ctrl+c",
  "app:clear-input": "ctrl+u",
  "app:word-delete-backward": "ctrl+backspace",
  "app:line-start": "ctrl+a",
  "app:line-end": "ctrl+e",
  "app:transcript-toggle": "ctrl+o",
  "transcript:toggleShowAll": "ctrl+e",

  // Chord binding: 2 keys em sequencia (leader+action)
  "app:rewind": "ctrl+r,r",
  "app:fast-toggle": "ctrl+r,f",
  "app:compact": "ctrl+r,c",

  // Macros custom (invocar skill/command)
  "custom:run-tests": {
    "keys": "ctrl+r,t",
    "command": "/loop npm test"
  }
}
```

**Quando usar:** Keybindings padrao colidem com seu terminal (tmux, Warp,
iTerm2, VSCode), ou voce usa Claude Code horas/dia e quer chord-leaders
estilo Emacs/vim. Roda `/keybindings` pra abrir o arquivo; mudancas aplicam
**sem restart**. Ctrl+O abre o transcript viewer (modo nav-only, diferente
do chat live).
**Por que funciona:** Claude Code usa Ink (React-no-terminal) com stack
proprio de keybindings — `~/.claude/keybindings.json` e sobreposicao limpa,
nao precisa mexer no `.inputrc`/terminal profile. Chord bindings
(`"ctrl+r,r"` = press Ctrl+R, solta, press R) dao 50+ atalhos sem conflito
de modifier keys. Fixes recentes no changelog: `Ctrl+Backspace` no Windows,
`Ctrl+]`/`Ctrl+\`/`Ctrl+^` pra raw control bytes em terminais embeded.
**Melhor pra:** Power user com fluxo "terminal hacker" — vim bindings,
chord-leaders, macros pra disparar `/loop`, `/compact`, `/fast` sem passar
pelo menu. Combina bem com `/fast` + keychord pra toggle rapido.
**Evitar quando:** Uso ocasional — custo de aprender o arquivo > ganho em
velocidade. Default ja cobre 90% (Enter submit, Shift+Enter newline,
Ctrl+C cancel, Ctrl+O transcript). Tambem: NAO re-binde `enter` pra
newline sem chord — voce vai se trancar fora de conseguir submeter prompt.

---

### A3. Permissions + skill `fewer-permission-prompts` ⭐⭐⭐⭐⭐

**Exemplo:**
```json
// .claude/settings.json (project, shared via git)
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(npm run test *)",
      "Bash(python skills/**/*.py *)",
      "Read(~/.openclaw/secrets/**)"
    ],
    "ask": [
      "Bash(git push *)",
      "Bash(gh pr create *)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(curl *)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "WebFetch(domain:polymarket.com)"
    ],
    "defaultMode": "acceptEdits",
    "additionalDirectories": ["../SKILLs/"]
  }
}
```

```text
# Rodar skill bundled pra auto-detectar ruido de permission prompts
/less-permission-prompts
# Ela escaneia transcripts recentes, acha read-only Bash/MCP frequentes,
# e propoe allowlist priorizada (voce aprova uma lista em batch).
```

**Quando usar:** Qualquer projeto onde voce roda o mesmo conjunto de scripts
toda sessao (pytest, lint, `gh pr view`, `git log`, leitura de paths
fora-do-repo). Cada `allow` eliminado = 1 popup modal a menos. `deny`
evalua PRIMEIRO (deny > ask > allow, first-match-wins), entao seguro
pra bloquear destrutivos mesmo com allow permissivo em cima.
**Por que funciona:** 4 scopes merged em array (managed > local > project >
user; arrays **concatenam + dedupe**, nao replacem). Projeto decide o que
e seguro pra todo colaborador (`.claude/settings.json` em git); local decide
o que so voce autoriza (`.claude/settings.local.json` gitignored);
user decide default global (`~/.claude/settings.json`). `defaultMode:
acceptEdits` = Write/Edit auto-aprovados mas Bash ainda pede. Skill
`fewer-permission-prompts` automatiza a descoberta — ela le seus logs
e sugere allowlist ranqueada por frequencia.
**Melhor pra:** Projeto de uso diario (niche-intelligence, OpenClaw
workspace) onde friction de popup interrompe flow. Combine com `deny` de
`curl`, `.env`, `secrets/**` pra defense-in-depth. Sandbox mode (`"sandbox":
{...}`) e a camada acima pra tasks non-trust — deixa Bash livre dentro do
sandbox, nega rede/escrita fora.
**Evitar quando:** Projeto experimental/throwaway — permissions viram
overhead de config. Tambem NUNCA passar tokens secretos pra settings via
env dict — use `apiKeyHelper` script ou `$VAR` reference. **Nao aceito em
project settings:** `autoMemoryDirectory`, user-specific paths.

---

### A4. Fast mode + compact + rewind — trilogia da sessao longa ⭐⭐⭐⭐

**Exemplo:**
```text
# === inicio de sessao longa (debug multi-hora) ===
/fast on                        # troca underlying pra Haiku (3-5x mais rapido, barato)
# ... explora 30min, LE arquivos, faz grep/glob ...
/fast off                       # volta pro model default (Sonnet/Opus)
# ... pensa profundo em uma decisao arquitetural ...

# === context encheu (50%+ no /context grid) ===
/compact preserve architectural decisions, drop file listings
# resumo + re-inject. Skills invocadas ganham re-attach
# (primeiros 5000 tokens de cada, budget 25k total).

# === fez merda, codigo/conversa foi pro lado errado ===
/rewind                         # menu interativo: rewind conversation, code, ou ambos
# (aliases /checkpoint /undo). Restaura working tree + conversation
# pra snapshot anterior — ideal quando refactor virou bagunca.

# === alternativa: ramificar ao inves de voltar ===
/branch <name>                  # fork da conversation atual (alias /fork)
# continua na nova branch; a antiga fica disponivel em /resume.
```

**Quando usar:**
- `/fast on`: fases de **exploracao** (Glob, Grep, Read, skim de docs) onde
  voce quer ingestao rapida e barata. Toggle off pra decisoes finais,
  edits complexos, escrita de codigo.
- `/compact`: quando `/context` mostra >60% cheio OU antes de tarefa nova
  (limpa entropy). Hint e chave — sem hint, Claude decide o que cortar
  (as vezes mal).
- `/rewind`: apos refactor quebrado, subagent que fez merda, ou decisao
  ruim de arquitetura — restaura working tree + conversation juntos
  (diferente de `git checkout`, que nao rebobina o historico do modelo).
- `/branch`: explorar hipotese sem perder estado atual. Retorna via
  `/resume` na sessao antiga.

**Por que funciona:** Context window e finito (~200k em Sonnet/Opus;
1M em modos especificos). Fast mode corta custo em ~5x e latencia em ~3x
pra reads/searches onde inteligencia nao e o gargalo. Compact preserva
instrucoes (CLAUDE.md project-root re-le apos compact; subdirs nao — so
recarrega quando Claude acessar arquivo la). Skills invocadas sobrevivem
compact com 5k tokens cada (25k total, mais recente primeiro). Rewind e
unico — e a UNICA forma de voltar atras **tanto no codigo quanto na
conversa** simultaneamente (git sozinho nao resolve).
**Melhor pra:** Sessoes de debug/refactor >2h. Fluxo tipico:
`/fast on` pra explorar, `/fast off` + `/effort high` pra pensar,
`/compact` a cada 60% de uso, `/rewind` quando subagent confunde tudo.
`/context` e o thermometer — consulta a cada 30min.
**Evitar quando:**
- `/fast on` durante **escrita de codigo complexo** — Haiku erra mais em
  TS/Python com types. Toggle off antes de Write/Edit pesado.
- `/compact` em sessao curta (<20% contexto) — overhead > beneficio.
- `/rewind` sem salvar primeiro — se a sessao rewindada tinha descobertas
  importantes, exporta com `/export` antes. Rewind e **destrutivo** do
  estado corrente; nao ha "undo do undo" (exceto via `/resume` da sessao
  ramificada, se voce branched).
- `/branch` pra tudo — cada fork acumula estado no disco (configuravel via
  `cleanupPeriodDays`, default 30d). Use pra hipoteses que valem voltar;
  abandone com `/clear` pra tentativas throwaway.
## 4. Eixo B — Qualidade de output

Memoria, hierarquia de instrucoes, delegacao e skills rigidas. O que separa
um Claude Code "autocomplete com esteroides" de um "agent operating system"
e a pilha `CLAUDE.md + .claude/rules/ + auto memory + subagents + skills`.
Esta secao cobre os 5 levers que Dayner ja usa (alguns sem saber que usa).

---

### B1. Hierarquia CLAUDE.md (managed > project > user > local) + `.claude/rules/*.md` ⭐⭐⭐⭐⭐

**Exemplo (CLAUDE.md global bem-estruturado, do proprio Dayner):**
```markdown
# CLAUDE.md — Regras globais (carregado em toda sessao Claude Code)

## last30days (plugin de research multi-fonte)

Instalado em: `~/.claude/plugins/cache/last30days-skill/`
Config: `~/.config/last30days/.env` (...ja configurados)

### Regra 1 — Planning/reranking manual
Ao rodar last30days, NAO confiar no LLM interno do script...

### Regra 2 — Bug cosmetico do --diagnose
`bird_authenticated: false` no diagnose e bug conhecido...
```

**Exemplo (alternativa `.claude/rules/api.md` path-scoped):**
```markdown
---
paths:
  - "src/api/**/*.ts"
  - "lib/**/*.ts"
---

# API Development Rules

- All API endpoints must include input validation
- Use the standard error response format
- Never log request bodies (PII risk)
```

**Ordem de carga (alto -> baixo, concatenadas — NAO substituidas):**

| Tier | Location | Loaded quando | Shared |
|------|----------|---------------|--------|
| Managed | `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS), `C:\Program Files\ClaudeCode\CLAUDE.md` (Win) | Sempre, inalteravel | Org inteira |
| Project | `./CLAUDE.md` ou `./.claude/CLAUDE.md` | Sempre (raiz) / on-demand (subdirs) | Time (git) |
| User | `~/.claude/CLAUDE.md` | Sempre, todo projeto | So voce |
| Local | `./CLAUDE.local.md` | Sempre (gitignored) | So voce, so no projeto |
| Rules | `.claude/rules/*.md` ou `~/.claude/rules/*.md` | Se `paths:` casa arquivo editado | Same scope do diretorio pai |

**Quando usar:**
- **Project `CLAUDE.md`:** onboarding canonico do repo (o que o projeto faz, triggers de skills, configs, anti-padroes). Dayner usa `C:\Users\quena\projetos\niche-intelligence\CLAUDE.md` com 14 secoes.
- **User `~/.claude/CLAUDE.md`:** regras que valem pra TODO projeto seu (setup de last30days, cookies do X, naming conventions pessoais).
- **`.claude/rules/<topic>.md`:** regra que so interessa quando Claude edita certos arquivos. Evita poluir o contexto raiz com rules irrelevantes pra outras areas do codigo.
- **`./CLAUDE.local.md`:** secrets paths, handle de staging local, qualquer coisa que nao quer commitar.

**Por que funciona:** CLAUDE.md entra no system prompt a cada turno (nao so no startup). Arrays merge across scopes — managed nao zera user. Post-compact, project-root CLAUDE.md e re-injetado (nested subdirs NAO — reload so quando Claude le arquivo la).

**Melhor pra:** rules persistentes que o Claude precisa saber SEMPRE. Tom, triggers de skills, invariantes (ex: "magic bytes antes de Read em imagem"), cadeias de prompts (ex: "ler `_prompt_principles.md` primeiro antes de qualquer prompt de fase").

**Evitar quando:**
- Dumps de documentacao longa (>500 linhas) — migrar pra `.claude/rules/` com `paths:` ou `docs/` via `@import`.
- Content que muda a cada run — isso e memoria (B2), nao rule.
- Regras que so valem pra 1 pasta especifica do monorepo — usar `.claude/rules/` path-scoped em vez de `./sub/CLAUDE.md` (subdirs nao re-injetam pos-compact).
- Segredos em plain text — vai pra `~/.openclaw/secrets/*.env` e e referenciado via path.

---

### B2. Memory system (4 tipos) + MEMORY.md como index <200 linhas ⭐⭐⭐⭐⭐

**Exemplo (MEMORY.md real do Dayner, enxuto e funcional):**
```markdown
# Memory Index — Niche Intelligence

- [Dayner — perfil do usuario](user_dayner.md) — boliviano BR, agencia AI-native, anti-guru, 3 cerebros
- [Pipeline automatico sem pausas](feedback_automatico_sem_friction.md) — rejeita checkpoints
- [Dry-run completo, full-run pendente](project_dryrun_completo_fullrun_pendente.md) — $4.85 aprovado
- [Bug date parser fix](project_bug_date_parser_fix.md) — _parse_relative_date corrigido
- [Sintese arquitetural + thumbnail-generator](project_video_automation_research.md) — 2026-04-14/15
- [Pre-flight de magic bytes em imagens](feedback_image_preflight_magic_bytes.md) — incidente AVIF 2026-04-14
```

**Exemplo (arquivo individual com frontmatter):**
```markdown
---
name: Pipeline automatico sem pausas
description: Usuario rejeita checkpoints bloqueantes. Parar SO em erro real.
type: feedback
originSessionId: 3cbfc565-800b-4f36-9d0f-dd09876efef6
---
Pipeline deve rodar AUTOMATICO por default. Parar SOMENTE em erro real.

**Why:** Dayner testou versao com checkpoints bloqueantes e disse "fica
muito chato". Checkpoints de custo foram implementados e REMOVIDOS na
mesma sessao.

**How to apply:** Nunca adicionar pausas que exijam resposta entre fases.
Imprimir resumos no stderr como visibilidade, nao como bloqueio.
```

**Os 4 tipos (prefixo no filename):**

| Tipo | Prefixo | Escreve | Contem | Exemplo |
|------|---------|---------|--------|---------|
| `user` | `user_` | Claude (auto) | Identidade/perfil do usuario | `user_dayner.md` — boliviano, agencia, 3 cerebros |
| `feedback` | `feedback_` | Claude (auto) | Correcao/preferencia que veio da conversa | `feedback_respostas_concisas.md`, `feedback_image_preflight_magic_bytes.md` |
| `project` | `project_` | Claude (auto) | Estado/decisao fechada do projeto atual | `project_mvp_editor_built.md`, `project_video_cut_spec_finalized.md` |
| `reference` | (sem prefixo fixo) | Claude (on demand) | Topicos tecnicos recorrentes | `debugging.md`, `api-conventions.md` |

**Quando usar:**
- **Nao escreva manual.** Auto memory (v2.1.59+, ON por default) escreve sozinho quando voce corrige algo ou diz "da proxima vez faca X". Dayner nunca editou MEMORY.md a mao — o Claude cuidou.
- **Para FORCAR save:** "adiciona isso na memoria auto" ou "sempre usa pnpm" — Claude escreve em auto memory. Para CLAUDE.md do projeto: "adiciona isso no CLAUDE.md" (explicito).
- **MEMORY.md como index:** Claude lista os `.md` filhos com 1-liner cada. So os primeiros 200 linhas / 25KB carregam no startup — o resto dos files carregam on-demand quando relevante.

**Por que funciona:** `~/.claude/projects/<hash-do-projeto>/memory/MEMORY.md` carrega em TODA sessao, mas os files individuais (`project_*.md`, `feedback_*.md`) SO carregam se Claude decidir que sao relevantes pra conversa atual. Economiza tokens e evita "memory drift" onde rules antigas contaminam contextos novos.

**Melhor pra:**
- **Feedback recorrente:** usuario corrigiu 2x -> vai pra auto memory, nao repete na 3a.
- **Decisoes ja fechadas:** "video-cut e pipeline de 5 steps, master unico, manifest v2 como contrato" — vira `project_video_cut_spec_finalized.md`, Claude nao re-abre o debate.
- **Identidade + tom:** user file dita portunhol, anti-guru, seco.

**Evitar quando:**
- **Instrucoes de todo-sempre-obrigatorio:** vai pra CLAUDE.md (B1). Memory e learning, nao constitution.
- **Transcript completo:** auto memory nao e log. Se precisa historico, use `/export` ou `~/.claude/projects/.../sessions/`.
- **Segredos:** auto memory file fica em `~/.claude/projects/<hash>/memory/` — nao committavel, mas legivel. Nao colar API keys.
- **Project shared:** auto memory e **local-only** por design (nao e git-tracked). Se o time precisa saber, vai pra `CLAUDE.md` ou `.claude/rules/`.

**Toggle:** `/memory` ou `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` ou `{ "autoMemoryEnabled": false }`. Custom dir: `{ "autoMemoryDirectory": "~/my-custom-memory-dir" }` (NAO aceito em project settings).

---

### B3. Quando delegar pra subagent (Explore vs Plan vs general-purpose) ⭐⭐⭐⭐⭐

**Exemplo (dispatch explicito pra Explore — read-only, Haiku, context isolado):**
```text
Use the Explore subagent to find every place in the codebase that calls
`detect_outliers` and summarize the call sites. Report in under 200 words
with file paths + line numbers.
```

**Exemplo (Plan, pra research antes de coding):**
```text
Entering plan mode. Use the Plan subagent to map how `video-cut` emits
manifest.json v2 — trace the 5-step pipeline from master.mp4 through
load_learning.py to the final JSON. Output: file list + data flow diagram.
```

**Exemplo (general-purpose, quando precisa Read+Edit+Bash em sequencia):**
```text
Use a general-purpose subagent to: (1) run the test suite, (2) identify
the 3 failing tests, (3) fix each one, (4) re-run. Return a summary of
which tests you touched and what the root cause was for each.
```

**Tabela de decisao (built-in subagents):**

| Agent | Model | Tools | Quando delegar |
|-------|-------|-------|----------------|
| `Explore` | Haiku | Read/Glob/Grep (read-only) | File discovery, "onde X e chamado", "qual a arquitetura de Y". Suporta `quick` / `medium` / `very thorough` |
| `Plan` | Inherit | Read-only | Dentro de plan mode, quando voce vai executar mas quer research primeiro sem poluir contexto |
| `general-purpose` | Inherit | ALL (Read, Edit, Write, Bash, Grep...) | Tarefa multi-step que precisa DE FATO mudar arquivos ou rodar comandos |

**Quando usar (os 3 motivos legitimos):**

1. **Protecao de contexto.** Subagent tem context window proprio. O main so recebe o RESULTADO, nao os 50 arquivos que ele leu pra chegar la. Se voce vai analisar um codebase de 500 arquivos, delega pra Explore ou a proxima compaction come tudo.
2. **Paralelismo.** "Research autenticacao, database E API em paralelo" -> 3 subagents concurrent, retornam ao main independentemente. Warning: os 3 resultados ACUMULAM no contexto do main apos retornarem — nao dispare 10 em paralelo.
3. **Tool restriction.** Subagent com `tools: Read, Grep, Glob` nao consegue quebrar o repo por acidente. Usar pra code review, security review, audit.

**Por que funciona:** Main thread fica enxuta (o resumo de 200 tokens vs os 30k tokens de exploracao). Auto-compaction preserva transcripts de subagent separadamente em `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl`. Subagent NAO pode spawnar outros subagents (se precisar nested, usa skill ou chain do main).

**Melhor pra:**
- **"Onde X mora no codebase?"** -> Explore (Haiku, barato, read-only).
- **"Constroe/refatora essa feature em paralelo com a que voce ja ta fazendo"** -> general-purpose em background (`/tasks` pra monitorar).
- **Code review apos mudanca grande** -> general-purpose com `tools: Read, Grep, Glob, Bash` e system prompt de reviewer.
- **Explore de codebase desconhecido** -> "thoroughness: very thorough" — Explore faz varios Grep/Read rounds.

**Evitar quando:**
- **Task de 2-3 turnos:** overhead de spawn > economia. Faz direto.
- **Precisa back-and-forth com voce:** subagent roda "fire and forget", nao conversa durante. Se voce vai iterar, fica no main.
- **Conhecimento ja ta no main:** se voce ja leu os arquivos relevantes neste turno, nao delega — o subagent vai re-ler tudo do zero (context nao e shared).
- **Task precisa CLAUDE.md:** **bug conhecido v2.1.84+** — subagents perdem CLAUDE.md context (`omitClaudeMd: true`). Se o subagent precisa das rules do projeto, `skills: [...]` no frontmatter injeta body da skill direto, ou use `initialPrompt` pra repetir as rules criticas.

---

### B4. Briefings bons pra subagents (self-contained prompt, path+linha, formato de resposta explicito) ⭐⭐⭐⭐⭐

**Exemplo (briefing ruim — Claude vai perder tempo):**
```text
Look at the video-cut skill and tell me if it's good.
```

**Exemplo (briefing bom — auto-contido, acionavel, formato fixo):**
```text
You are a subagent writing ONE section of a cheatsheet. Task: produce the
"Eixo B — Qualidade de output" section following the fixed template below.

**Context:** Target file is `GUIA_CLAUDE_CODE.md` at the root of
`C:\Users\quena\projetos\niche-intelligence\`. User is an advanced user
(already builds skills/plugins/hooks). Language: PT-BR, technical terms
in English.

**Sub-topics (5 entries):**
- B1: CLAUDE.md hierarchy (global > project > subdir). `.claude/rules/*.md`
- B2: Memory system (4 types: user/feedback/project/reference)
- B3: When to delegate to subagent (Explore vs general-purpose vs Plan)
- B4: Writing good briefings for subagents
- B5: Rigid skills (TDD, systematic-debugging, brainstorming)

**Sources to read (absolute paths):**
1. `.research/claude-code-guide/docs_snippets.md` — section 2 (skills),
   section 3 (sub-agents), section 5b (memory). Has full official schemas.
2. `.research/claude-code-guide/plugin_cache_findings.md` — 15 skills cataloged
3. `C:\Users\quena\.claude\CLAUDE.md` — real user's global CLAUDE.md, USE
   as copyable example in B1
4. `C:\Users\quena\.claude\projects\...\memory\MEMORY.md` — real memory,
   USE as example in B2

**Response format:** Write with Write tool to
`C:\Users\quena\projetos\niche-intelligence\.research\claude-code-guide\section_B.md`.
Header: `## 4. Eixo B — Qualidade de output`. 5 entries B1-B5 as H3.
Size: 250-450 lines. Final response: 3-5 lines summary.
```

**Checklist pra briefing bom:**

| Campo | Obrigatorio? | Exemplo |
|-------|--------------|---------|
| **Papel** | Sim | "You are a subagent writing ONE section..." |
| **Task de 1 linha** | Sim | "Produce B1-B5 following the fixed template." |
| **Paths absolutos** | Sim (se mencionar arquivos) | `C:\Users\quena\projetos\niche-intelligence\...` NAO "o guia" |
| **Path + linha pra bugs** | Sim (se debugging) | "Check `env.py:412` — `bird_x.set_credentials()`" |
| **Sources ranked** | Sim | 1, 2, 3... com o que olhar em cada um |
| **Formato de resposta** | Sim | "Write to X. Header = Y. Length = 250-450 linhas. Final = 3 lines." |
| **Cap de palavras** | Recomendado | "Report in under 200 words" / "3-5 lines summary" |
| **NAO-fazer explicitos** | Recomendado | "NAO invente features. Verifique em docs_snippets antes." |

**Quando usar:** todo subagent dispatch nao-trivial. Subagent nao tem a conversa anterior — so recebe o prompt que voce escreve. Se falta info la, ele adivinha (e adivinha mal).

**Por que funciona:**
- **Paths absolutos** evitam "onde fica esse arquivo?" round-trip.
- **Formato de resposta explicito** evita blobs longos que voce precisa filtrar depois.
- **Sources ranked** (1 primario, 2-3 secundarios) evitam Claude gastar tokens lendo ruido.
- **Cap de palavras** forca sintese — subagent Haiku tende a ser verboso se nao limitar.

**Melhor pra:**
- **Research com output estruturado:** "Return JSON with fields X, Y, Z" ou "Return markdown H2/H3 table."
- **Reviews:** "Return critical/warning/suggestion buckets. Each item: file:line + 1-sentence explanation."
- **Paralelismo:** cada subagent com briefing 100% independente (sem referencias cruzadas).

**Evitar quando:**
- **Briefing vira novela:** >100 linhas = main thread ja gastou tanto quanto o subagent vai retornar. Refatora: extrai pra skill `skills/my-subagent-brief/SKILL.md` e passa `skills: [my-subagent-brief]` no frontmatter do agent.
- **Voce vai iterar:** subagent nao conversa. Fica no main.
- **Briefing depende de contexto da conversa anterior:** copia o contexto relevante pra dentro do briefing (ou passa `transcript_path` via hook — avancado).

---

### B5. Skills rigidas (HARD-GATE vs Iron Law) — quando seguir, quando relaxar ⭐⭐⭐⭐

**Exemplo (skill rigida — brainstorming com HARD-GATE):**
```markdown
---
name: brainstorming
description: "You MUST use this before any creative work..."
---

# Brainstorming Ideas Into Designs

<HARD-GATE>
Do NOT invoke any implementation skill, write any code, scaffold any
project, or take any implementation action until you have presented a
design and the user has approved it. This applies to EVERY project
regardless of perceived simplicity.
</HARD-GATE>

## Anti-Pattern: "This Is Too Simple To Need A Design"

Every project goes through this process. A todo list, a single-function
utility, a config change — all of them. "Simple" projects are where
unexamined assumptions cause the most wasted work.
```

**As 4 skills rigidas do ecossistema (obra/superpowers v5.0.7 catalogado):**

| Skill | Gate pattern | Iron Law |
|-------|--------------|----------|
| `brainstorming` | HARD-GATE | "NO IMPLEMENTATION BEFORE DESIGN APPROVED" |
| `test-driven-development` | Iron Law | "NO PRODUCTION CODE WITHOUT FAILING TEST" |
| `systematic-debugging` | Iron Law | "NO FIXES WITHOUT ROOT CAUSE INVESTIGATION" |
| `verification-before-completion` | Iron Law | "NO CLAIMS WITHOUT EVIDENCE" |

**Quando SEGUIR (HARD-GATE vale a pena):**
- **Greenfield / MVP novo:** voce nao sabe o que ta construindo. Brainstorming forca explicitar intent/reqs antes de Claude escrever 2000 linhas que voce vai jogar fora.
- **Bug que ja retornou 2x:** systematic-debugging forca root cause. Senao voce pacha superficie e bug reaparece.
- **"Deploy amanha":** verification-before-completion impede Claude de dizer "tests passing" sem rodar. Evidence > assertion.
- **Feature critica:** TDD + verification-before-completion como par. Failing test -> fix -> green. Sem atalho.

**Quando RELAXAR (HARD-GATE vira friction inutil):**
- **Decisao trivial:** nome de arquivo, path, slug. Dayner ja tem `feedback_decisoes_triviais.md` em memoria — nao pergunta, assume default.
- **Pipeline operacional ja validado:** niche-intel v2 ja rodou dry-run OK. Rodar full-run nao precisa brainstorming — precisa executar. Dayner rejeita checkpoints (`feedback_automatico_sem_friction.md`).
- **Exploracao read-only:** se voce so ta lendo codebase pra entender, brainstorming nao se aplica. Pula.
- **Correcao obvia:** typo, import missing, f-string mal fechada. TDD seria overkill — faz o fix + roda o teste que ja existe.

**Por que funciona o padrao HARD-GATE:** o XML tag `<HARD-GATE>` no body da skill engatilha parsing mais atento do modelo. Claude trata como blocking sem exceptions. Diferente de "try to...", que fica suggestion. A convencao veio do obra/superpowers framework e espalhou pra mattpocock/skills, jleechanorg/agent-orchestrator, e ~67 skills catalogadas no ecossistema (X post @Axel_bitblaze69, 2026-04-16).

**Melhor pra:**
- **Equipes novas com Claude Code:** skills rigidas = guardrails. Reduzem variancia de junior dev.
- **Codebases grandes / production:** evidence-based completion evita "ship and pray".
- **Colaboracao assincrona:** se voce volta ao projeto em 1 semana, skill rigida reproduz teu processo sem precisar lembrar.

**Evitar quando:**
- **Solo dev + fluxo rapido + projeto conhecido:** voce e o guardrail. Skill rigida vira cerimonia.
- **Prototipagem descartavel:** vai jogar fora, TDD e waste.
- **Pairing com Claude ja com memoria rica:** auto memory ja registrou suas preferencias. Skill rigida duplica.
- **Dayner-style flow:** `feedback_automatico_sem_friction.md` + `feedback_decisoes_triviais.md` ja substituem brainstorming/verification pra o niche-intel. Usar skill rigida aqui geraria conflito de instrucao (memory diz "flui", skill diz "para e pergunta").

**Decidir caso a caso:** se a skill rigida e do tipo "save you from yourself" (TDD, systematic-debugging), vale. Se e do tipo "make sure user approves" (brainstorming pra tarefa trivial), a memoria `feedback_automatico_sem_friction.md` ja te protege — pula.
## 5. Eixo C — Automacao e autonomia

> **Tese do eixo:** hooks sao o jeito certo de codificar habitos automaticos ("toda vez que X, faca Y"); loops + scheduled agents + background tasks sao 3 formas complementares de tirar o humano do terminal; worktrees existem pra paralelizar sem poluir a arvore de trabalho. Os 5 itens abaixo estao ordenados por impacto, nao por ordem alfabetica.

---

### C1. Hooks — lifecycle events em settings.json ⭐⭐⭐⭐⭐

Hooks sao comandos que o harness do Claude Code executa automaticamente em 26 eventos do ciclo de vida de uma sessao. **Eles nao estao dentro do Claude — o harness os dispara.** Isso significa que memory/preferences nao conseguem substitui-los: se o usuario quer "toda vez que eu salvar um arquivo X, rode Y", so hooks garantem.

**Formato base em `settings.json`:**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "if": "Bash(rm *)",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/block-rm.sh",
            "timeout": 600,
            "statusMessage": "Validating command..."
          }
        ]
      }
    ]
  }
}
```

**Os 26 eventos (agrupados por fase):**

| Fase | Eventos | Blockable? |
|------|---------|-----------|
| Session | `SessionStart`, `SessionEnd`, `InstructionsLoaded` | Nao |
| Prompt | `UserPromptSubmit`, `Stop`, `StopFailure` | `UserPromptSubmit`/`Stop` sim |
| Tools | `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `PermissionDenied` | `PreToolUse`/`PermissionRequest` sim |
| Subagents | `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `TeammateIdle` | `SubagentStop`/`TaskCreated`/`TaskCompleted`/`TeammateIdle` sim |
| Compaction | `PreCompact`, `PostCompact` | `PreCompact` sim |
| Filesystem | `FileChanged`, `CwdChanged`, `WorktreeCreate`, `WorktreeRemove` | `WorktreeCreate` sim (qualquer exit != 0 falha) |
| MCP | `Elicitation`, `ElicitationResult`, `ConfigChange` | Todos sim |
| Notif | `Notification` | Nao |

**Exit code semantics (obrigatorio saber):**

```
Exit 0  -> Sucesso. stdout parseado como JSON de output.
Exit 2  -> Blocking error. stdout ignorado; stderr vira mensagem pro Claude.
Outro   -> Non-blocking error. Primeira linha do stderr aparece no transcript.
```

Exit 2 nao e universal — em eventos nao-blockable (`PostToolUse`, `SessionStart`, `FileChanged`, etc.) exit 2 e tratado como non-blocking.

**Input JSON comum (todo hook recebe via stdin):**

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/current/working/dir",
  "permission_mode": "default|plan|acceptEdits|auto|dontAsk|bypassPermissions",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": { "command": "...", "description": "..." }
}
```

**Exemplo 1 — block rm -rf:**

```bash
#!/bin/bash
# .claude/hooks/block-rm.sh
COMMAND=$(jq -r '.tool_input.command')

if echo "$COMMAND" | grep -q 'rm -rf'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Destructive command blocked by hook"
    }
  }'
  exit 0
else
  exit 0
fi
```

Pare com `"decision": "deny"` no stdout (exit 0) OU `exit 2` com mensagem em stderr. Os dois caminhos bloqueiam o tool call; o primeiro da mensagem customizada ao usuario, o segundo so ao Claude.

**Exemplo 2 — PostToolUse lint automatico:**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/lint-check.sh",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

```bash
#!/bin/bash
# .claude/hooks/lint-check.sh
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

case "$FILE" in
  *.py)  ruff check "$FILE" ;;
  *.ts|*.tsx) pnpm eslint "$FILE" ;;
  *.go)  gofmt -l "$FILE" ;;
esac
exit 0
```

`PostToolUse` e non-blockable — serve pra side-effects (lint, format, audit log). Se quiser bloquear antes do write, use `PreToolUse` com exit 2.

**Exemplo 3 — SessionStart injeta contexto (padrao `superpowers` e `last30days`):**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/session-start",
            "async": false
          }
        ]
      }
    ]
  }
}
```

Usado pelos dois plugins do Dayner: o hook le o `SKILL.md` principal, escapa JSON, injeta contexto inicial antes do primeiro turn. Matcher `startup|clear|compact` cobre os 3 tipos de boot (nova sessao, `/clear`, pos-compaction).

**Matchers disponiveis:**

```json
"matcher": "*"                  // todas as tools
"matcher": "Bash"               // tool unica
"matcher": "Edit|Write"         // regex (or)
"matcher": "^Notebook"          // regex prefix
"matcher": "mcp__memory__.*"    // MCP-specific
```

**Escopos onde hooks podem ser configurados (6 locais):**

1. `~/.claude/settings.json` (user)
2. `.claude/settings.json` (projeto shared)
3. `.claude/settings.local.json` (projeto local, gitignored)
4. Managed policy (enterprise)
5. Plugin `hooks/hooks.json` (scoped ao plugin)
6. Skill/agent frontmatter (`hooks:` key) — scope e lifetime da skill/agent

**Kill switch global:** `"disableAllHooks": true` em qualquer camada acima.

**Variaveis de ambiente:**

```
$CLAUDE_PROJECT_DIR       # raiz do projeto
${CLAUDE_PLUGIN_ROOT}     # diretorio do plugin (em plugin hooks)
${CLAUDE_PLUGIN_DATA}     # dados persistentes do plugin
$CLAUDE_ENV_FILE          # so em SessionStart/CwdChanged/FileChanged — escreve env vars persistentes
```

**Output JSON para permission decisions (PreToolUse):**

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny|ask|defer",
    "permissionDecisionReason": "shown to user for allow/ask; to Claude for deny",
    "updatedInput": { "field": "modified value" },
    "additionalContext": "..."
  }
}
```

Precedencia entre multiplos hooks: `deny` > `defer` > `ask` > `allow`.

**Gotchas reais (do docs):**
- Shell profile que imprime no startup **quebra parsing de JSON** — mova `echo` pra `.bashrc` so-interativo.
- Output injetado no contexto e **capped em 10.000 chars**.
- `--resume` nao restaura permission mode; passar `--permission-mode` de novo.
- `defer` so funciona em single tool call; multiplos sao ignorados.
- Variaveis tipo `CLAUDE_TOOL_NAME` NAO sao passadas como env vars — tool info vem SEMPRE via JSON stdin em `tool_name`/`tool_input`/`tool_use_id`.
- `WorktreeCreate` e excecao: **qualquer** exit non-zero falha a criacao (nao so exit 2).

**Quando usar:** qualquer automacao "toda vez que Claude faz X, faca Y"; security gates (block rm, SQL writes); quality gates (lint/test no PostToolUse); env setup em SessionStart; audit logging; auto-approval de comandos whitelisted.
**Por que funciona:** o harness executa, nao o modelo — garantia de que o hook rode mesmo se o modelo "esquecer". Memory/preferences sao declarativos; hooks sao imperativos + bloqueantes.
**Melhor pra:** fluxos que ja viraram cadencia (lint apos edit, test apos save, block destructive commands, inject contexto na boot).
**Evitar quando:** logica que depende do significado da conversa (ai e skill, nao hook); side-effect caro que trava tool (usar `async: true` onde disponivel, ou timeout curto). Nunca colocar `sleep`, fetch remoto sync, ou qualquer coisa acima de ~1s no caminho critico de PreToolUse — trava o turn inteiro.

---

### C2. Loops — /loop [intervalo] [prompt] ⭐⭐⭐⭐

Skill bundled (`/loop`, alias `/proactive`) que roda um prompt/slash-command em loop na sessao atual. Dois modos.

**Exemplo — modo fixed interval:**

```bash
/loop 5m /check-ci
/loop 30s /babysit-prs
/loop 2h /update-status-report
```

**Exemplo — modo self-paced (Claude decide quando acordar):**

```bash
/loop
> Monitora o deploy e me avisa quando subir. Checa sozinho em intervalos que voce julgar apropriado.
```

Sem argumento de intervalo, a skill usa `ScheduleWakeup` internamente: Claude acorda quando decidir (tipicamente baseado no contexto — "checou ha 2 minutos, SSE estavel, volta em 5 minutos"). Util quando o intervalo "certo" depende do que foi observado.

**Cache window de 5 minutos:** repeticoes dentro da mesma janela de 5 min reusam prompt cache do Anthropic (50% desconto em input tokens no cache hit). `/loop 5m` e escolha idiomatica por isso — alinha com a TTL do cache.

**Cancelar:** Ctrl+C ou novo prompt. Loops nao sobrevivem a `/clear` nem a saida do CLI.

**Quando usar:** poll de CI/deploy, monitoria de endpoint, babysit de PRs, status checks recorrentes, scrape periodico durante uma sessao de trabalho.
**Por que funciona:** single-session cache hit + context acumulado (cada iteracao ja sabe o que a anterior viu); self-pacing evita over-polling.
**Melhor pra:** tarefas que precisam do Claude vivo na mesma sessao (porque usam contexto acumulado ou porque Dayner ta acompanhando).
**Evitar quando:** a tarefa precisa persistir apos Dayner fechar o terminal — usa `/schedule` (C3). Nao use `/loop` pra "toda segunda 9h" — nao sobrevive reboot.

---

### C3. Scheduled agents — /schedule (routines, cron, webhooks) ⭐⭐⭐⭐

Built-in command (`/schedule`, alias `/routines`) + tools `CronCreate`/`CronList`/`CronDelete` + `RemoteTrigger`. Persistem fora da sessao — rodam no servidor do Claude Code na cloud (ou local via MindStudio/launchd dependendo do setup).

**Exemplo:**

```bash
/schedule
> Cria uma routine que roda toda segunda 9h: "gera o relatorio semanal de outliers do youtube-content-research, salva em data/content-research/weekly-brief-YYYY-MM-DD.md, e manda um webhook pro Slack com o titulo + link."
```

Claude chama `CronCreate` com `{ schedule: "0 9 * * 1", prompt: "...", trigger: "cron" }`. Registry vive fora da sessao; Dayner pode listar/deletar com:

```bash
/schedule list
/schedule delete <id>
```

**Tres tipos de trigger (da PR do Martin407/Glass #59, abril/2026):**

1. **Scheduled** — cron expression. Classico "toda segunda 9h".
2. **API token** — endpoint unico. `curl -X POST https://.../routine/<id>?token=...` dispara. Util pra integrar com outros sistemas.
3. **GitHub events** — webhook nativo: `issue.opened`, `pr.synchronize`, `workflow_run.completed`.

**Exemplos reais de padroes na comunidade:**
- **MindStudio blog** (2026-04-16): rotina matinal "gera morning brief: news + PR digest + calendario do dia, manda pro email".
- **OmniNode/omniclaude** (PR #1337, 2026-04-17): usa 5 plists launchd no macOS local em vez de CronCreate — preferencia por "durable machine-level trigger" (sobrevive reboot do servidor do Claude Code).
- **yama-kei/multi-project-gateway** (issue #210, 2026-04-14): `GitHub Issues` como integration point — agent periodico le issues e triages.

**Quando usar:** tarefas recorrentes que Dayner NAO quer ter de invocar manualmente; integracoes com webhooks externos (GitHub, Stripe, CI).
**Por que funciona:** roda sem humano. `/loop` precisa de sessao; `/schedule` precisa so do servidor.
**Melhor pra:** daily/weekly briefs, monitoramento continuo (15min/hora/dia), pipelines event-driven (PR opens -> review automatico), tarefas batch de madrugada.
**Evitar quando:** tarefa precisa de I/O interativo (user questions sem resposta na rotina acabam em timeout/erro). Tarefas caras que podem rodar em loop descontrolado — sempre colocar budget ceiling dentro do prompt da rotina, nao confiar na plataforma.

---

### C4. Background tasks — run_in_background=true + Monitor ⭐⭐⭐⭐

Quando o Bash tool ou o Agent tool recebem `run_in_background: true`, o processo vai pro pool de background tasks. Nao bloqueia o turn. `/tasks` (alias `/bashes`) lista o que ta rodando; `Monitor` streamea stdout linha-a-linha como notificacao.

**Exemplo Bash background:**

```bash
# No turn atual, dispara e segue
Bash(
  command="pnpm test:watch",
  run_in_background=true,
  description="Run test watcher"
)

# Em outro momento, le stdout via Monitor
Monitor(task_id="bash-123")
```

**Exemplo subagent background (frontmatter):**

```yaml
---
name: slow-test-runner
description: Runs the full integration suite (takes 40min)
background: true
---

Run the full integration test suite and report only failures with stack traces.
```

Invocar como agent em foreground mesmo assim bloqueia; `background: true` no frontmatter tira o default. Alternativamente: `Ctrl+B` no meio de uma task pra backgroundar manualmente.

**Permission behavior em background:**
- Foreground: permission prompts bloqueiam e pedem ao user.
- Background: Claude Code pede **TODAS as permissoes upfront** antes de backgroundar; durante execucao, auto-nega tudo nao-pre-aprovado.

**Kill switch:** `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` em env.

**Padrao util — poll com until em vez de sleep longo:**

```bash
# Dentro de Monitor, streameia cada linha do ate-loop como notificacao
until pg_isready -h db -p 5432; do sleep 2; done && echo "DB ready"
```

Assim Dayner recebe UMA notificacao quando o banco sobe, sem polling manual.

**Quando usar:** builds longos (>30s), test watchers, servers de dev, scraping paralelo, agent de analise profunda que leva minutos.
**Por que funciona:** libera o turn pra continuar trabalhando em outra coisa; stdout e streamed, nao buffered.
**Melhor pra:** `pnpm dev`, `jest --watch`, `docker-compose up`, pytest longo, subagent tipo `Explore` em codebase gigante.
**Evitar quando:** task precisa de input interativo (vai auto-negar e travar); quando o resultado vai ser usado imediatamente no mesmo turn (usar foreground e mais simples).

---

### C5. Git worktrees — isolation: worktree + /batch ⭐⭐⭐⭐

Worktrees sao copias isoladas do repo apontando pra branches diferentes. Claude Code usa nativamente pra evitar colisao quando paraleliza trabalho. Tres caminhos:

**Caminho 1 — subagent com `isolation: worktree`:**

```yaml
---
name: feature-implementer
description: Implement a feature in an isolated worktree
isolation: worktree
---

Implement $ARGUMENTS. You are in a fresh worktree copy of the repo.
When done, push the branch; do not merge.
```

O harness cria o worktree no tmp, roda o subagent la, e limpa automaticamente se nao houve changes. `cleanupPeriodDays: 30` (default) controla orphan cleanup.

**Caminho 2 — `/batch` skill (5-30 unidades em paralelo):**

```bash
/batch "para cada endpoint em src/api/, gere um teste de integracao cobrindo happy path + 3 error cases"
```

A skill dispara ate 30 subagents, cada um no proprio worktree, trabalhando em arquivos diferentes. Merge final fica com Dayner (ou agent coordenador).

**Caminho 3 — EnterWorktree/ExitWorktree manuais:**

```bash
# Claude invoca EnterWorktree pra isolar trabalho dentro da mesma sessao
EnterWorktree(branch="feat/new-auth")
# ... trabalho isolado ...
ExitWorktree()
```

Util quando Claude precisa mexer em 2 branches na mesma conversa sem `git stash`.

**Config de worktrees em `settings.json`:**

```json
{
  "worktree": {
    "symlinkDirectories": ["node_modules", ".cache"],
    "sparsePaths": ["packages/my-app", "shared/utils"]
  }
}
```

`symlinkDirectories` evita reinstalar deps em cada worktree (symlink pro original). `sparsePaths` restringe checkout quando o monorepo e gigante. Tambem: `.worktreeinclude` copia gitignored files (`.env`, credentials locais) pra dentro do worktree.

**WorktreeCreate hook** (ver C1): pode bloquear criacao via exit non-zero — util em managed policy pra forcar nomes de branch, proteger refs, etc.

**Quando usar:** features paralelas independentes (A nao conflita com B); experimentos "e se" sem sujar a branch atual; analise de codebase gigante em chunks; refactors que afetam varios modulos e voce quer rollback granular.
**Por que funciona:** isolamento fisico — cada worktree e um diretorio separado, entao edits paralelos nao se sobreescrevem. Git garante consistencia no merge.
**Melhor pra:** `/batch` em tarefas mapeaveis (30 arquivos, mesma transformacao), `superpowers:using-git-worktrees` pra feature work significativa, A/B de implementacoes.
**Evitar quando:** trabalho e fortemente sequencial (worktrees adicionam overhead); projeto nao e git (duh); deps nao-deterministicas que quebram em copia do repo sem `symlinkDirectories` configurado.

---

### Decisoes rapidas — qual usar quando

| Se voce quer... | Use | Nao use |
|-----------------|-----|---------|
| Bloquear `rm -rf` antes de executar | Hook `PreToolUse` + exit 2 | Instrucao em CLAUDE.md |
| Rodar lint apos toda edit | Hook `PostToolUse` (matcher `Edit\|Write`) | Pedir ao Claude pra lembrar |
| Checar CI a cada 5min enquanto trabalha | `/loop 5m /check-ci` | `/schedule` (overkill pra sessao viva) |
| Daily brief toda segunda 9h | `/schedule` cron | `/loop` (morre ao fechar CLI) |
| Implementar 20 features em paralelo | `/batch` + worktrees | Subagents sem isolation (conflito de edits) |
| Rodar test watcher em background | `Bash(run_in_background=true)` + Monitor | Foreground (trava turn) |
| Injetar contexto em toda nova sessao | Hook `SessionStart` | CLAUDE.md (ja carrega, mas sem logica) |
| Webhook do GitHub dispara review automatico | `/schedule` trigger=GitHub events | Hook (nao ve webhook externo) |

---

### Anti-patterns deste eixo

1. **Hook com I/O remoto no `PreToolUse`** — trava todo tool call ate a request responder. Mova pra PostToolUse ou async.
2. **`/loop` pra tarefa que nao precisa de contexto** — desperdica tokens + cache. Se e stateless, use `/schedule`.
3. **Background task sem pre-aprovar permissoes** — auto-negacao vai matar a task no meio. Liste tudo upfront.
4. **Worktrees com deps grandes sem symlink** — `npm install` em 30 worktrees = 30x o tempo. Configure `symlinkDirectories`.
5. **Exit 1 em hook esperando bloquear** — exit 1 e non-blocking. So exit 2 bloqueia (exceto WorktreeCreate que e qualquer != 0).
6. **Shell profile imprimindo em startup** — quebra parsing JSON de hooks. Mova prints pra `.bashrc` interativo-only.

---

### Fontes deste eixo

- Docs oficiais: `https://code.claude.com/docs/en/hooks`, `https://code.claude.com/docs/en/settings`, `https://code.claude.com/docs/en/commands`, `https://code.claude.com/docs/en/sub-agents` (ver `.research/claude-code-guide/docs_snippets.md` secoes 1, 3, 4, 5a)
- PR GitHub Martin407/Glass #59 (2026-04-16): routines scheduled + API tokens + GitHub webhooks
- Blog MindStudio (2026-04-16): business automation patterns com `/schedule`
- PR OmniNode-ai/omniclaude #1337 (2026-04-17): launchd vs CronCreate tradeoff
- Issue yama-kei/multi-project-gateway #210 (2026-04-14): scheduled agent wake-up com GitHub Issues como queue
- Plugins instalados: superpowers v5.0.7 (`hooks/hooks.json` SessionStart), last30days v3 (SessionStart + check-config.sh, timeout 5s)
- Reddit r/ClaudeCode thread 2026-04-10: "I automated most of my job" (cron + API -> Claude Code -> PR)
## 6. Eixo D — Skills e Plugins

> Como skills sao organizadas, quando usar skill vs hook vs slash vs memory, o que os plugins oficiais (superpowers, gsd, last30days) ensinam sobre padroes de SKILL.md, e como publicar uma skill pra reusar em multiplos projetos.

---

### D1. Anatomia de SKILL.md — YAML frontmatter + corpo + HARD-GATE ⭐⭐⭐⭐⭐

**Exemplo — skill simples de referencia (read-only):**

```yaml
---
name: api-conventions
description: API design patterns for this codebase
---

When writing API endpoints:
- Use RESTful naming conventions
- Return consistent error formats
- Include request validation
```

**Exemplo — skill task com allowed-tools + argument-hint (estilo niche-intel):**

```yaml
---
name: niche-intel
description: >
  Analise de nicho e concorrentes no YouTube para estrategia de conteudo.
  Usar quando pedirem para analisar nicho, concorrentes, ou estrategia.
allowed-tools: Bash(python *)
argument-hint: "[--skip-scrape] [--channels-only h1,h2] [--dry-run]"
---

## Trigger
- "analisa meu nicho", "roda niche intel"
- "pesquisa o mercado", "quais videos estao performando"

### Passo 4: Classificacao (Claude Code inline)
**PROTOCOLO OBRIGATORIO — ler NA ORDEM:**
1. `skills/niche-intel/references/prompts/_prompt_principles.md`
2. `skills/niche-intel/references/prompts/classification.md`
3. `config/my-context.md`
4. `config/taxonomy.json`
```

**Exemplo — skill rigida com HARD-GATE (estilo superpowers/brainstorming):**

```yaml
---
name: brainstorming
description: "You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation."
---

# Brainstorming Ideas Into Designs

<HARD-GATE>
Do NOT invoke any implementation skill, write any code, scaffold any project,
or take any implementation action until you have presented a design and the
user has approved it. This applies to EVERY project regardless of perceived simplicity.
</HARD-GATE>

## Checklist
You MUST create a task for each of these items and complete them in order:
1. **Explore project context** — check files, docs, recent commits
2. **Ask clarifying questions** — one at a time
3. **Propose 2-3 approaches** — with trade-offs
4. **Present design** — in sections scaled to complexity
5. **Write design doc** — save to `docs/specs/YYYY-MM-DD-<topic>-design.md`
6. **Spec self-review** — fix placeholders/contradictions inline
7. **User reviews written spec** — wait for approval
8. **Transition to implementation** — invoke writing-plans skill
```

**Campos de frontmatter (os que realmente importam):**

| Campo | Required | Quando usar |
|-------|----------|-------------|
| `name` | implicito | lowercase + hyphens, max 64. Vira `/slash-command`. Se omitir, usa nome do dir |
| `description` | **recomendado** | **O TRIGGER** — Claude decide ativar por aqui. Front-load keywords. Combined description+when_to_use truncado em 1.536 chars |
| `when_to_use` | opcional | Triggers extras. Appended a description |
| `argument-hint` | opcional | `[--dry-run] [--channels h1,h2]` — aparece no autocomplete |
| `allowed-tools` | opcional | `Bash(python *)` ou `Read, Grep, Glob`. Pre-aprovadas, nao pede permissao |
| `disable-model-invocation` | opcional | `true` = so user invoca via `/name` (skill de deploy/commit) |
| `user-invocable` | opcional | `false` = Claude invoca automatico, nao aparece no menu `/` |
| `context` | opcional | `fork` = roda em subagent isolado (preserva main context) |
| `agent` | opcional | `Explore`/`Plan`/`general-purpose` quando `context: fork` |
| `hooks` | opcional | Lifecycle hooks scoped a skill (PreToolUse/PostToolUse) |
| `paths` | opcional | Glob pra auto-ativar so em arquivos matching |
| `model` | opcional | Override do model enquanto skill ativa |
| `effort` | opcional | `low`/`medium`/`high`/`xhigh`/`max` |

**Tres padroes estruturais do corpo (visto nas skills reais):**

1. **Trigger section** — "Ativar quando o usuario pedir algo como: ..." com exemplos literais. Redundancia com description mas ajuda Claude casar intent.
2. **PROTOCOLO OBRIGATORIO** — "Ler os arquivos abaixo NA ORDEM: 1. ... 2. ..." por fase. Encadeia prompts sem depender de memoria.
3. **Checklist com TaskCreate** — superpowers padroniza "You MUST create a task for each of these items". Cada item vira TodoWrite entry, subagent dispatch via Task tool, main marca checkbox.

**Quando usar:** toda vez que um workflow repetitivo merece ser codificado com protocolo de ativacao automatica.
**Por que funciona:** `description` entra no contexto sempre (truncada em 1.536 chars), corpo carrega so quando invocada. HARD-GATE funciona porque body fica ate o fim da sessao — Claude nao esquece o gate. PROTOCOLO OBRIGATORIO numerado forca encadeamento determinista mesmo quando Claude ta cansado.
**Melhor pra:** pipelines multi-fase (niche-intel 7 passos), workflows criativos (roteiro-youtube 4 fases), skills rigidas com contratos (brainstorming + writing-plans), pipelines com deps externas (thumbnail-generator: Gemini + rembg + Pillow).
**Evitar quando:** a tarefa e one-shot (usar slash command simples), ou a ativacao precisa ser 100% automatica sem user prompt (usar hook).

---

### D2. Organizacao de references/prompts — camada constitucional + prompts por fase ⭐⭐⭐⭐⭐

**Exemplo — estrutura real do niche-intel (project-local):**

```bash
skills/niche-intel/
├── SKILL.md                          # Frontmatter + trigger + workflow + protocolos
├── references/
│   ├── prompts/
│   │   ├── _prompt_principles.md    # Camada constitucional (11 principios)
│   │   ├── classification.md         # Fase 4 — taxonomia 4D
│   │   ├── channel_deep_analysis.md  # Fase 6a — 6 dimensoes por canal
│   │   ├── cross_channel_synthesis.md# Fase 6b — sintese 11 secoes
│   │   ├── recommendations.md        # Fase 6c — ICE scoring
│   │   ├── refinement_pass.md        # Fase 6d — auto-critica (max 2 passes)
│   │   └── thumbnail_analysis.md     # Fase 6.5 — 11 features multimodal
│   ├── apify_endpoints.md            # Referencia API externa
│   └── taxonomy.md                   # Referencia humana (valores controlados)
└── scripts/
    ├── validate_setup.py
    ├── scrape_channels.py
    └── ...
```

**Exemplo — pattern de encadeamento na SKILL.md:**

```markdown
### Fase 2: Escrever roteiro + SEO package + thumbnail concept

**PROTOCOLO OBRIGATORIO — ler NA ORDEM:**
1. `skills/roteiro-youtube/references/prompts/_script_principles.md`
2. `config/my-context.md`
3. `C:\Users\quena\.openclaw\workspace\brand_os\dna\dna_completo.md`
4. `skills/roteiro-youtube/references/prompts/write_script.md`

**ESTE PASSO E FEITO POR TI (CLAUDE CODE), NAO POR SCRIPT.**
```

**Exemplo — `_prompt_principles.md` como constituicao (trecho):**

```markdown
# Prompt Principles — Meta-guide for all inline analyses

> Toda fase inline DEVE comecar lendo este arquivo.
> Se um prompt especifico contradiz estes principios, estes principios vencem.

## Principio 1 — Contexto injetado E aplicado

Antes de qualquer analise, ler `config/my-context.md`. Mas ler nao basta —
tem que USAR.

**Teste explicito:** Toda secao termina com
`[Context applied: <como o contexto moldou esse insight>]`.
Se essa linha estivesse em branco, o insight e generico demais.
```

**Regras de decisao — quando separar em prompts vs inline na SKILL.md:**

| Cenario | Decisao | Razao |
|---------|---------|-------|
| Regras mecanicas curtas (ex: "stdout = JSON, stderr = log") | Inline na SKILL.md | Overhead de arquivo separado nao vale |
| Prompt longo (>50 linhas) com exemplos | Arquivo em `references/prompts/` | Mantem SKILL.md < 500 linhas (recomendacao oficial) |
| Checklist reutilizado por multiplas fases | `_principles.md` constitucional | DRY — uma verdade, N fases importam |
| Taxonomia / valores controlados | JSON em `config/` | Machine-readable, versionavel, editavel por scripts |
| Exemplos verbatim (hooks, CTAs) | `references/patterns/*.md` | Calibracao humana, nao prompt engineering |
| Prompt so usado por 1 fase com < 30 linhas | Inline | Evita proliferacao de arquivos |

**Padrao `_` prefix pra constitucional:** `_prompt_principles.md` (niche-intel), `_script_principles.md` (roteiro-youtube), `_thumbnail_principles.md` (thumbnail-generator), `_research_principles.md` (content-execution-research), `_ideation_principles.md` (youtube-content-research). O underscore diz "ler primeiro" e ordena no listing alfabetico.

**Quando usar:** qualquer skill com ≥3 fases ou ≥2 prompts longos.
**Por que funciona:** body da SKILL.md fica pequeno (< 500 linhas, cabe no budget de 1% context), prompts carregam sob demanda via Read quando a fase executa. `_prefix` constitucional forca Claude a ler o meta-guia antes do prompt especifico (encadeamento determinista). Separacao permite editar 1 prompt sem invalidar o resto.
**Melhor pra:** pipelines multi-fase com protocolo explicito, skills que tem DRY entre fases, skills com prompts > 100 linhas.
**Evitar quando:** skill e single-shot (ex: `/commit` nao precisa de `references/`), prompts sao < 30 linhas cada (inline fica ok), ou skill e puro wrapper de script (o prompt e so "rode o script").

---

### D3. Skill vs hook vs slash vs memory — tabela de decisao ⭐⭐⭐⭐⭐

**Exemplo — tabela de decisao canonica:**

| Precisa | Quando | Solucao | Onde |
|---------|--------|---------|------|
| Automatico sem user pedir (event-driven) | "Toda vez que rodar Bash X, faz Y" / "Toda sessao, valida config" | **hook** | `settings.json` ou `hooks/hooks.json` no plugin |
| Comando curto explicito, 1-shot | "quero rodar /deploy" / "/commit" / "/review" | **slash command** (agora virou skill minima) | `.claude/skills/deploy/SKILL.md` com frontmatter simples |
| Workflow complexo multi-fase com protocolo | "analisa meu nicho" → pipeline 7 passos | **skill** | `.claude/skills/<name>/SKILL.md` + `references/prompts/*.md` |
| Fato persistente cross-sessao (instrucao estatica) | "sempre use pnpm, nao npm" / "projeto usa X" | **memory (CLAUDE.md)** | `./CLAUDE.md` (project) ou `~/.claude/CLAUDE.md` (user) |
| Learning acumulado (Claude escreve) | Observacoes auto-capturadas entre sessoes | **auto memory** | `~/.claude/projects/<proj>/memory/MEMORY.md` |
| Regra path-scoped (so em `src/api/**/*.ts`) | Regras que valem so pra alguns arquivos | **rules com paths** | `.claude/rules/api.md` com frontmatter `paths:` |
| Agente especializado com context proprio | Subtarefa que queima muito token (research/debug) | **subagent** | `.claude/agents/<name>.md` ou `skill + context: fork` |

**Exemplo de erro comum — "queria automatico mas usei memory":**

```markdown
<!-- ERRADO: em CLAUDE.md -->
## Quando rodar npm install, sempre limpar node_modules primeiro
```

Isso NAO funciona — memory e contexto passivo, nao executa acao. O correto:

```json
// .claude/settings.json — PreToolUse hook
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "command",
        "if": "Bash(npm install)",
        "command": ".claude/hooks/clean-node-modules.sh"
      }]
    }]
  }
}
```

**Exemplo — quando a mesma regra se encaixa em multiplos:**

Regra: "Antes de commit, rodar lint".

- **Como memory:** "Sempre rode lint antes de commit" em CLAUDE.md. Claude *pode* esquecer, nao e determinista.
- **Como slash:** `/commit-with-lint` — user invoca manualmente. Funciona mas nao previne commits manuais.
- **Como skill:** `skill: git-commit` com protocolo. Melhor pra workflows. Ainda depende de user ativar.
- **Como hook (recomendado):** `PreToolUse` matcher `Bash(git commit *)` roda lint, exit 2 se falhar. Determinista, bloqueia violacao, funciona mesmo em background.

**Regra de ouro:** se a acao precisa acontecer **sem Claude decidir**, e hook. Se precisa de **judgment/context**, e skill. Se e **informacao que Claude precisa saber**, e memory.

**Quando usar:** antes de criar qualquer artefato novo, rodar essa tabela mentalmente.
**Por que funciona:** cada mecanismo tem garantias diferentes — hooks sao deterministas (executados pelo harness, nao por Claude), skills sao reativos (dependem de Claude decidir ativar), memory e passivo (contexto injetado), slash e explicito (user invoca). Escolher errado gera frustration ("ele esqueceu de novo").
**Melhor pra:** arquitetar corretamente antes de implementar. Regra "automated behavior requires hook" esta explicita no skill `update-config` oficial.
**Evitar quando:** tentar forcar automacao via memory (Claude vai "esquecer"), ou tentar hook pra tarefa que precisa de judgment (vai bloquear coisa legitima).

---

### D4. Plugins oficiais — licoes de superpowers, gsd, last30days ⭐⭐⭐⭐

**Exemplo — superpowers (process-rigid skills com Iron Laws):**

```yaml
---
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code
---

# Test-Driven Development (TDD)

**Core principle:** If you didn't watch the test fail, you don't know if it tests the right thing.

**Violating the letter of the rules is violating the spirit of the rules.**

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write code before the test? Delete it. Start over.

**No exceptions:**
- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Delete means delete
```

**15 skills catalogadas no superpowers v5.0.7 — padroes estruturais:**

- **HARD-GATE / Iron Law pattern** — `brainstorming`, `test-driven-development`, `systematic-debugging`, `verification-before-completion`, `subagent-driven-development`. Enforcement por linguagem (MUST, NO, "delete means delete") — nao via codigo, via documentacao imperativa que sobrevive compaction.
- **Flowchart (GraphViz DOT)** — incorporado no body pra visualizar decision trees. Claude le DOT, renderiza mentalmente.
- **Red Flags / Anti-Patterns table** — lista de rationalizacoes comuns + correcao. Ex: "This is too simple to need a design" → "Every project goes through this process".
- **External Prompt Templates** — `./subagent-driven-development/implementer-prompt.md`, `./writing-plans/plan-document-reviewer-prompt.md`. Skill pointa pro template que subagent recebe via Task tool.
- **TaskCreate + TodoWrite Flow** — main cria TodoWrite com lista, dispatcha Task(implementer), subagent trabalha isolado, main marca checkbox, repete.
- **SessionStart hook** — `bash ${CLAUDE_PLUGIN_ROOT}/hooks/session-start` le `using-superpowers/SKILL.md`, escapa JSON, injeta no contexto. Garante que skill "using-superpowers" sempre entra na sessao.

**Exemplo — gsd (phase/roadmap planning):**

```bash
# Slash commands expostos como skills user-invocable
/gsd:new-project         # Init com deep context gathering → PROJECT.md
/gsd:new-milestone       # Start new milestone cycle
/gsd:plan-phase          # PLAN.md com verification loop
/gsd:execute-phase       # Wave-based parallelization
/gsd:verify-work         # UAT conversacional
/gsd:audit-milestone     # Audit completion vs original intent
/gsd:resume-work         # Resume com full context restoration
/gsd:pause-work          # Context handoff mid-phase
/gsd:debug               # Systematic debugging, state persistente
```

Padroes-chave do gsd:
- **Decimal phase insertion** — `/gsd:insert-phase` cria phase 72.1 entre 72 e 73 sem renumerar. Evita drift em roadmap longo.
- **Model profile switching** — `/gsd:set-profile quality|balanced|budget` troca model pra agentes internos.
- **Health diagnose** — `/gsd:health` valida `.planning/` dir, oferece reparar.
- **Resume/pause explicit** — captura contexto em arquivo, nao em memoria Claude.

**Exemplo — last30days (multi-source research):**

```yaml
---
name: last30days
description: "Multi-query social search with intelligent planning. Research any topic across Reddit, X, YouTube, TikTok, Instagram, Hacker News, Polymarket, and the web."
argument-hint: 'last30days AI video tools'
allowed-tools: Bash, Read, Write, AskUserQuestion, WebSearch
user-invocable: true
metadata:
  openclaw:
    requires:
      env: [SCRAPECREATORS_API_KEY]
      optionalEnv: [OPENAI_API_KEY, XAI_API_KEY, BRAVE_API_KEY]
      bins: [node, python3]
    primaryEnv: SCRAPECREATORS_API_KEY
---

## Runtime Preflight
Before running any last30days.py, resolve Python 3.12+ interpreter once in
LAST30DAYS_PYTHON.

## Step 0: First-Run Setup Wizard
CRITICAL: ALWAYS execute Step 0 BEFORE Step 1. Check ~/.config/last30days/.env
silently. Do NOT say "Setup complete" every time.
```

Padroes-chave do last30days:
- **Runtime preflight como primeiro bloco** — loop pra encontrar Python 3.12+, salva em env var, falha cedo se nao achar.
- **First-run setup wizard** — check silencioso de `~/.config/last30days/.env`, rodar wizard 1x, nunca re-rodar ("Do NOT say Setup is complete every time").
- **Metadata openclaw namespace** — skill pode declarar pre-requisitos (env vars, binarios) pra frontend (openclaw) mostrar status.
- **SessionStart hook** — `bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/check-config.sh` silencioso, so fala se precisar setup. Timeout 5s.
- **Regra global documentada** — o CLAUDE.md do usuario anota bugs conhecidos do skill (`bird_authenticated: false` cosmetic bug) + workarounds (planning/reranking manual em vez de confiar no LLM interno).

**Licoes transversais dos 3 plugins:**

1. **Plugins modernos usam Skill tool, nao `/command` deprecated** — superpowers v5.0.7 tem zero slash commands, so skills. `/command:subcommand` do gsd ainda existe mas e acoplado ao grupo.
2. **Hooks sao plugin-scoped** — cada plugin declara `hooks/hooks.json` separado. Evita conflito entre plugins.
3. **External prompt templates habilitam modularidade** — skill aponta pra arquivo, subagent recebe via Task tool. Reutilizavel cross-skills.
4. **Verification e evidence-based** — `verification-before-completion` exige "Identify → Run → Read → Verify → Claim". Sem evidencia, sem claim de "done".
5. **TDD para documentacao** — `writing-skills` aplica RED-GREEN-REFACTOR em skill authoring: rode pressure scenario sem skill (RED), escreva skill (GREEN), feche loopholes (REFACTOR).

**Quando usar:** estudar antes de escrever skills pesadas; copiar padroes para skills propias.
**Por que funciona:** 15 skills do superpowers resolveram estes problemas em producao com enforcement via linguagem (nao via codigo). HARD-GATE + Iron Law funcionam porque Claude respeita "NO PRODUCTION CODE WITHOUT FAILING TEST" com a mesma serieness que respeita policies de seguranca.
**Melhor pra:** skills que precisam resistir a rationalizations ("just this once"), workflows com estado persistente (gsd roadmap), skills com dependencias complexas (last30days com 6 APIs opcionais).
**Evitar quando:** skill e simples o suficiente pra caber em 30 linhas — nao adicionar Iron Law cerimonia pra wrapper trivial.

---

### D5. Reuso multi-projeto — plugin, scopes, /plugin install ⭐⭐⭐⭐

**Exemplo — 3 caminhos pra reusar skill em multiplos projetos:**

**Caminho 1 — personal skill (usar em todos seus projetos):**

```bash
# Move skill local pra ~/.claude/skills/
mv ./skills/niche-intel ~/.claude/skills/niche-intel

# Estrutura final
~/.claude/skills/niche-intel/
├── SKILL.md
├── references/prompts/*.md
└── scripts/*.py

# Agora /niche-intel disponivel em QUALQUER projeto
```

**Caminho 2 — manter project-local (so neste repo):**

```bash
# Estrutura atual do niche-intelligence
<project>/.claude/skills/<name>/SKILL.md   # scope project (gitignado ou nao)
<project>/skills/<name>/SKILL.md           # pattern niche-intelligence (SKILL.md lido via Read)
```

Niche-intelligence adota variante: skills vivem em `skills/<name>/` (nao `.claude/skills/`) porque sao invocadas via frase-gatilho roteada pelo CLAUDE.md, nao registradas no sistema de skills do Claude Code. Funciona pra projetos com muitas skills e pipeline ad-hoc.

**Caminho 3 — publicar em plugin (reusar cross-user, versionavel):**

```bash
# 1. Estrutura do plugin
my-plugin/
├── plugin.json              # Metadata
├── skills/
│   ├── niche-intel/
│   │   └── SKILL.md
│   └── roteiro-youtube/
│       └── SKILL.md
├── hooks/
│   └── hooks.json           # SessionStart, PreToolUse, etc
├── agents/
│   └── researcher.md        # Subagents
└── commands/
    └── deploy.md            # Slash commands legacy
```

```json
// plugin.json
{
  "name": "dayner-content-stack",
  "version": "1.0.0",
  "description": "Niche intelligence + script generation + thumbnail for YouTube",
  "author": "Dayner",
  "skills": ["./skills/niche-intel", "./skills/roteiro-youtube"],
  "hooks": "./hooks/hooks.json"
}
```

```bash
# 2. Publicar via git + registrar marketplace em settings.json
# settings.json do user que quer usar:
{
  "enabledPlugins": {
    "dayner-content-stack@dayner-plugins": true
  },
  "extraKnownMarketplaces": {
    "dayner-plugins": {
      "source": "github",
      "repo": "dayner/claude-plugins"
    }
  }
}

# 3. Install e reload
/plugin install dayner-content-stack
/reload-plugins       # sem restart
```

**Precedencia de skills (quem vence em conflito de nome):**

```
Enterprise (managed settings)           # Max — nao override
  > Personal (~/.claude/skills/)         # Voce em todos projetos
    > Project (.claude/skills/)          # So neste repo
      > Plugin (<plugin>/skills/)        # Onde plugin enabled
```

Plugins usam namespace `plugin-name:skill-name` pra evitar colisao — ex: `superpowers:brainstorming` vs `gsd:discuss-phase`.

**Exemplo — estrutura do plugin cache (onde vive plugin instalado):**

```bash
# Path em Windows
C:\Users\quena\.claude\plugins\cache\
├── claude-plugins-official\
│   └── superpowers\
│       └── 5.0.7\          # Versao instalada
│           ├── SKILL.md
│           ├── plugin.json
│           ├── skills\     # 15 skills
│           ├── hooks\
│           └── agents\
└── last30days-skill\
    └── last30days\
        └── 3.0.0\
            ├── SKILL.md
            ├── hooks\
            └── scripts\
```

**Matrix de decisao — qual caminho usar:**

| Cenario | Caminho |
|---------|---------|
| Skill exploratoria, WIP | Project-local (`skills/` ou `.claude/skills/`) |
| Skill madura, uso em 2-3 projetos seus | Personal (`~/.claude/skills/`) |
| Skill pronta, quer compartilhar com time | Plugin via git privado + `extraKnownMarketplaces` |
| Skill publicavel, open source | Plugin via GitHub publico + README instrucoes de install |
| Skill com deps pesadas (Python 3.12+, binarios) | Plugin com `hooks/SessionStart` pra check deps + `scripts/` |
| Skill com state persistente (gsd roadmap) | Plugin com `${CLAUDE_PLUGIN_DATA}` pra dados persistentes |

**Quando usar:** apos skill ter sido usada 3+ vezes e estar estavel, promover de project-local pra personal ou plugin.
**Por que funciona:** separacao de scopes permite iterar local sem quebrar outros projetos. Plugins tem versionamento (5.0.7, 3.0.0) que permite `minimumVersion` check. `/reload-plugins` recarrega sem restart. Auto-discovery de subdirs (skills de `packages/frontend/.claude/skills/`) permite monorepos.
**Melhor pra:** stacks reusaveis (dayner-content-stack), ferramentas pra time (company-conventions), skills de comunidade (superpowers, gsd, last30days).
**Evitar quando:** skill e 100% especifica do projeto atual (niche-intel com referencias hardcoded a `config/competitors.json` nao faz sentido publicar); voce ainda ta iterando forma da skill (promover quando estiver estavel, nao antes).

---

## Checklist final do Eixo D

Antes de criar qualquer novo artefato, rodar este checklist:

- [ ] **E automatico (sem user pedir)?** → hook em `settings.json` ou `hooks/hooks.json`
- [ ] **E comando curto 1-shot?** → slash command / skill minima (`disable-model-invocation: true`)
- [ ] **E workflow multi-fase com protocolo?** → skill com `SKILL.md` + `references/prompts/`
- [ ] **E fato persistente/preferencia?** → memory em CLAUDE.md (project ou user)
- [ ] **E regra path-scoped?** → `.claude/rules/<name>.md` com `paths:` frontmatter
- [ ] **Skill vai crescer (>500 linhas body)?** → quebrar em `references/prompts/*.md`
- [ ] **Skill tem DRY entre fases?** → criar `_principles.md` constitucional
- [ ] **Skill precisa de enforcement rigido?** → HARD-GATE + Iron Law (ver superpowers)
- [ ] **Skill estavel e vai usar em 3+ projetos?** → promover pra `~/.claude/skills/` ou plugin
- [ ] **Skill tem deps (Python 3.12+, binarios)?** → SessionStart hook de preflight

Referencias rapidas:
- **Docs oficiais:** `https://code.claude.com/docs/en/skills` (v2.x)
- **Budget:** SKILL.md < 500 linhas; description + when_to_use < 1.536 chars
- **Live reload:** adicionar/editar skill recarrega automatico; novo TOP-LEVEL dir requer restart
- **Invocacao explicita:** `/skill-name arg1 arg2` ou "use the X skill"
- **Listar skills disponiveis:** `/skills` (press `t` pra sort by token count)
## 7. Eixo E — Prompts cookbook

> **Secao central do guia.** 12 padroes de prompt prontos pra copiar, com a mesma
> estrutura: exemplo copiavel, quando usar, por que funciona, melhor pra, evitar
> quando. Ordem: E1-E12 segue o ciclo de vida tipico de um projeto —
> debug (E1) -> refactor (E2) -> onboarding (E3) -> review (E4) -> planning (E5)
> -> TDD (E6) -> delegar (E7) -> construir skill (E8) -> spec (E9) -> meta (E10)
> -> explorar (E11) -> pedir critica (E12).
>
> **Regra de ouro:** prompts estruturados sempre batem prompts vagos. "Debug X"
> vira frustra; "Debug X usando metodo cientifico em 4 passos" rende. A
> diferenca nao e o modelo — e o prompt.
>
> **Como usar:** nao decore — cole o bloco, substitua `[X]` pelo contexto real,
> manda. Ajusta depois se precisar. Os prompts funcionam em portugues OU ingles;
> escolhi o idioma que rende melhor em cada caso (a maioria em ingles porque e
> o default da comunidade e do treinamento do modelo).

---

### E1. Debug sistematico — metodo cientifico antes de fixar ⭐⭐⭐⭐⭐

**Exemplo (prompt copiavel):**
```text
Debug [descricao do bug] usando metodo cientifico. NAO proponha fix antes do passo 4.

1) REPRODUZIR
   - Comando exato que eu rodei: [cole aqui]
   - Output real: [cole aqui]
   - Output esperado: [descreva]
   - E reproduzivel 100%? Se nao, liste o que varia.

2) INVESTIGAR
   - Leia stack trace completo (nao pule warnings)
   - git log --oneline -10 + git diff HEAD~3 pra ver o que mudou
   - Liste 3 hipoteses de causa raiz, ordenadas por probabilidade

3) TESTAR CADA HIPOTESE
   Pra cada uma: (a) comando minimo pra verificar, (b) observacao esperada se
   a hipotese for verdadeira, (c) observacao esperada se for falsa, (d) rode
   e reporte qual das duas aconteceu.

4) SO AGORA: PROPOR FIX
   - Causa raiz confirmada: [X]
   - Fix minimo: uma mudanca, um arquivo
   - Test case que reproduz o bug (failing antes, passing depois)

Regras invioláveis:
- "Should work" nao significa que funciona. Rode e mostre output.
- Se 3 hipoteses falharem, pare e me diga — nao tente hipotese #4 (pode ser
  problema arquitetural).
- Nao bundle "while I'm here" refactors no mesmo commit.
```

**Quando usar:** bug, test failure, comportamento inesperado, flaky test, algo
"funciona na minha maquina". Sempre que o instinto for "deixa eu so tentar
uma coisa".

**Por que funciona:** forca o modelo a separar **observacao** (o que o
codigo faz) de **explicacao** (por que faz). Random fixes mascaram o sintoma
e criam novos bugs. O `superpowers:systematic-debugging` SKILL da Jesse Vincent
relata first-time fix rate de 95% vs 40% com abordagem random, e 15-30min vs
2-3h de thrashing. A estrutura "hipoteses ranqueadas + teste minimo por
hipotese" e a mesma que engenheiros senior usam informalmente — o prompt
torna explicito.

**Melhor pra:** bugs em sistemas multi-componente (CI -> build -> sign,
API -> service -> DB), flaky tests, regressoes apos merge, bugs em codigo
que voce nao escreveu.

**Evitar quando:** typo obvio (missing semicolon, import errado) — overkill;
bug ja reproduzido 100% e a causa esta na primeira linha do erro; voce ja
sabe a causa e so precisa de ajuda com a sintaxe do fix.

---

### E2. Refactor grande / migracao — call sites first, preservar signatures ⭐⭐⭐⭐⭐

**Exemplo (prompt copiavel):**
```text
Vou refatorar [X] pra [Y]. Antes de tocar em codigo de implementacao:

FASE 1 — MAP (read-only, use Explore subagent se tiver)
1. Liste todos os call sites de [X] — Grep + output file:line
2. Pra cada call site, extraia: (a) signature atual usada, (b) tipo de retorno
   esperado, (c) side effects observaveis
3. Agrupe call sites por "padrao de uso" (ex: "11 usam sync, 3 usam async com
   callback, 1 e dead code")
4. Identifique: quais call sites mudam? quais preservam signature? quais podem
   ser deletados?

FASE 2 — PLAN (me mostre antes de mexer)
- Ordem de mudanca: folhas primeiro (menos dependencias), raiz por ultimo
- Quais signatures eu ABSOLUTAMENTE nao quero quebrar (API publica, exports)
- Shim/adapter layer temporaria? (sim/nao + justificativa)
- Testes existentes cobrem o comportamento? Se nao, qual o minimo pra adicionar
  antes de refatorar?

FASE 3 — EXECUTE (um call site por commit)
- Cada commit: um call site migrado + teste verde
- NAO combine "migrei 5 arquivos" num commit so
- Apos cada commit: rodar test suite completa

Regras:
- NAO refatore "enquanto esta ai" coisas nao relacionadas
- NAO mude signature publica sem deprecation path
- Se um call site for ambiguo (nao sei se e X ou Y), pare e pergunte
```

**Quando usar:** renomear API usada em 20+ lugares, migrar de lib A pra lib B,
mudar shape de config, dividir um modulo que cresceu demais, extrair
biblioteca interna.

**Por que funciona:** o erro classico de refactor e mudar a implementacao
antes de entender os usos — resulta em API otima pro autor, horrivel pros
consumidores. "Call sites first" inverte: usos ditam a API nova. A separacao
em 3 fases (map -> plan -> execute) da checkpoint humano antes do trabalho
destrutivo.

**Melhor pra:** refactors que cruzam pacotes/arquivos, mudancas de framework
(React -> Vue, Express -> Fastify), extract/inline de modulos, qualquer
mudanca onde "onde mais isso e usado?" e a primeira pergunta.

**Evitar quando:** refactor local dentro de 1 funcao (overkill); mudanca
cosmetica (rename de variavel privada); extrair helper obvio dentro do mesmo
arquivo. Tambem evite quando a API ainda tem zero consumidores externos — ai
pode iterar livre.

---

### E3. Gerar CLAUDE.md / onboarding de repo novo ⭐⭐⭐⭐

**Exemplo (prompt copiavel):**
```text
Analise este repo e gere um CLAUDE.md inicial em 200-400 linhas. Use o comando
/init se voce quiser como ponto de partida, mas va alem do default.

O CLAUDE.md deve cobrir (nessa ordem):

1. **O que este projeto e** — 2-3 frases. Dominio, usuario-alvo, output final.
2. **Stack detectado** — rode `cat package.json` / `cat pyproject.toml` /
   `ls` e liste: linguagem + versao, frameworks, build tool, test runner,
   lint/format, CI.
3. **Comandos que eu rodo toda hora**
   - Dev: `npm run dev` ou equivalente
   - Test: com flag pra rodar so um teste
   - Lint + format
   - Build
   - Deploy (se houver)
4. **Convenções detectadas** — leia 5-10 arquivos representativos e extraia:
   - Padrao de nomenclatura (camelCase vs snake_case, arquivos PascalCase vs kebab)
   - Como erros sao tratados (throw vs Result type vs callback)
   - Como testes sao organizados (colocados com codigo? em /tests?)
   - Import style (relative vs absolute, aliases configurados?)
5. **Arquitetura em 1 paragrafo** — camadas principais + como se conectam.
   Inclui diagrama ASCII se ajudar.
6. **Regras invariaveis** — coisas que NUNCA devem ser quebradas (ex: "todo
   endpoint POST precisa de input validation", "nao commitar .env")
7. **Documentos relacionados** — tabela: arquivo | quando ler

NAO faca:
- NAO invente convencoes que nao existem no repo. Se voce nao conseguiu
  detectar algo (ex: lint config), escreva "a descobrir" ao inves de assumir.
- NAO copie boilerplate generico de CLAUDE.md. Esta instrucao tem que ser
  especifica a ESTE repo.
- NAO escreva mais de 400 linhas — CLAUDE.md deve caber em context window.
  Se precisar mais, extraia pra /docs e link.

Apos gerar, me mostre primeiro 50 linhas + indice + pergunte se quer ajustes
antes de commitar.
```

**Quando usar:** clonou um repo novo, esta herdando projeto de outro time,
projeto existente sem CLAUDE.md, precisando padronizar onboarding pra outros
agentes.

**Por que funciona:** `/init` do Claude Code gera algo generico. Este prompt
forca detecao real via `cat`/`ls` antes de escrever — previne alucinar
convencoes. A estrutura fixa (7 secoes numeradas) funciona porque Claude Code
CLAUDE.md nao e documentacao pro humano — e instrucao pro modelo proximo. A
restricao "nao invente" e crucial; sem ela o modelo preenche lacunas com
plausibilidades.

**Melhor pra:** repos com 100+ arquivos, monorepos (um CLAUDE.md por
package), onboarding de time, setup de pipeline CI/CD onde voce quer que
agentes Claude executem.

**Evitar quando:** projeto de 1 arquivo (CLAUDE.md e overhead); projeto
ainda em greenfield sem codigo real (escreva depois de ter padrao estabelecido);
se o projeto ja tem README.md bom, considere `@README` no CLAUDE.md ao inves
de duplicar.

---

### E4. Code review / PR review — OWASP + tests + placeholders ⭐⭐⭐⭐⭐

**Exemplo (prompt copiavel):**
```text
Revise os changes pendentes (git diff HEAD ou PR #N). Nao aprove nada
automaticamente. Output em 4 secoes:

## CRITICAL (must-fix antes de merge)
Para cada um: arquivo:linha + 1 frase de problema + 1 frase de fix.
Inclui:
- Security: input validation missing, SQL injection, XSS, path traversal,
  hardcoded secrets, auth bypass (OWASP Top 10)
- Correctness: logic bugs, race conditions, off-by-one, null deref
- Data integrity: delete sem WHERE, migration irreversivel, breaking API change

## WARNINGS (should-fix, pode ser follow-up)
- Error handling generico (`catch (e) {}`)
- Magic numbers sem constante
- TODOs / FIXMEs / placeholders (`throw new Error("not implemented")`,
  `return null; // TODO`, `console.log` esquecido)
- Test coverage: codigo novo sem teste, ou teste que nao testa comportamento
  real (mockando o que deveria testar)
- Patterns inconsistentes com o resto do codebase (ex: outro modulo usa
  Result<T>, este usa throw)

## STYLE / NITS (optional)
- Nomes ambiguos, duplicacao, DRY violations
- Comments outdated
- Formatting fora do padrao

## APPROVED (o que ta bom)
Nao liste tudo — so coisas dignas de destaque (ex: "refactor do auth ficou
mais claro que o original").

REGRAS:
- Se voce nao encontrou Critical nem Warning, escreva "APPROVED - ship it"
  no final. Nao invente problema pra preencher.
- Cada issue precisa de arquivo:linha. Sem referencia = critica vaga, rejeito.
- NAO use emojis. NAO use "this looks great but...".
- Para security: cite OWASP reference (ex: "OWASP A03:2021 Injection").
```

**Quando usar:** antes de merge de PR propria (self-review), revisando PR
de colega, antes de release de feature critica, quando ativar
`superpowers:requesting-code-review` skill.

**Por que funciona:** a estrutura Critical/Warning/Style/Approved e a mesma
que reviewers humanos usam — forca priorizacao. Bundle "security + tests +
placeholders" em um prompt rende porque: (a) sao as 3 categorias de bug
que mais escapam pra producao, (b) sao independentes (achar um nao dispensa
procurar os outros), (c) cada um tem checklist mental diferente (OWASP
/ coverage / search for patterns). A regra "Approved sem preencher" previne
sycophancy — modelos tendem a inventar criticas pra parecer "rigorosos".

**Melhor pra:** PRs com 50-500 LOC changed, code mergeando pra producao, code
tocando security boundaries (auth, payments, PII).

**Evitar quando:** PR de 1-liner (overhead); PR de docs-only (a maioria das
categorias nao se aplica); codigo de exploracao/prototipo (YAGNI, corte
criterios). Tambem evite este prompt pra review de PR de terceiros que voce
ja sabe que vai rejeitar — seja direto ao ponto, nao gaste tokens.

---

### E5. Brainstorming / planning de feature — uma pergunta por vez ⭐⭐⭐⭐⭐

**Exemplo (prompt copiavel):**
```text
Quero construir [X]. Antes de escrever codigo ou mesmo pseudocodigo:

FASE 1 — EXPLORAR CONTEXTO (silenciosamente, so reporte o que descobriu)
- Leia arquivos relevantes no repo
- Verifique se algo similar ja existe
- Checa ultimos commits pra entender direcao recente

FASE 2 — ME PERGUNTAR
Faca UMA pergunta por vez. Prefira multipla escolha quando possivel.
Foque em: proposito (por que isso existe), constraints (prazo, budget, stack),
success criteria (como vou saber que ficou bom).
Nao junte "posso fazer X e tambem Y?" — quebra em 2 mensagens separadas.

FASE 3 — PROPOR 2-3 ABORDAGENS
Apresente com trade-offs e SUA recomendacao.
Formato: Opcao A: [nome curto] — [1 frase] | pros: ... | contras: ...
                                            | recomendada porque: ...

FASE 4 — APRESENTAR DESIGN (apenas apos eu aprovar uma abordagem)
Seccoes: arquitetura, componentes, data flow, error handling, testing.
Tamanho de cada secao escala com complexidade — frases simples pra partes
triviais, ate 200-300 palavras pra partes nuancadas. Apos cada secao pergunte
"isso faz sentido?" antes de prosseguir.

FASE 5 — ESCREVER SPEC
Depois que eu aprovar o design, salve em .planning/specs/YYYY-MM-DD-[topico].md
e me avise pra revisar antes de implementar.

HARD-GATE: NAO escreva codigo, NAO crie arquivos em src/, NAO invoque outras
skills de implementacao ate eu aprovar o design. Aplica-se a TODO projeto,
inclusive "simples".
```

**Quando usar:** "vou construir X", feature nova, mudanca de arquitetura,
qualquer momento onde o instinto e "ja sei o que fazer, vou codar" mas o
historico mostra que voce se arrepende.

**Por que funciona:** o `superpowers:brainstorming` skill documenta o
anti-padrao "este e simples demais pra precisar de design" — justamente
projetos "simples" onde suposicoes nao examinadas geram o maior retrabalho.
"Uma pergunta por vez" e critico: batches de perguntas travam a conversa
(usuario pula partes), uma por vez mantem momentum. "2-3 opcoes" forca o
modelo a sair do piloto automatico da primeira ideia. Multipla escolha
quando possivel reduz friction.

**Melhor pra:** features novas, decisoes de arquitetura, side projects
onde voce ainda nao tem clareza, qualquer trabalho criativo onde "o que e
isso?" ainda esta ambiguo.

**Evitar quando:** tarefa mecanica (rodar lint, atualizar dependencias,
fix de typo); voce ja tem design escrito e so precisa de implementacao —
ai pule pro E6/TDD; pressao de tempo extrema onde voce ja decidiu e so
precisa de execucao.

---

### E6. TDD enforcement — RED before GREEN, no production code without failing test ⭐⭐⭐⭐⭐

**Exemplo (prompt copiavel):**
```text
Implemente [feature] usando TDD estrito. Regra invariavel: NO PRODUCTION
CODE WITHOUT A FAILING TEST FIRST. Se voce escrever codigo de producao antes
do teste falhar, delete e recomece.

CICLO (repetir ate completar):

1. RED — escreva UM teste minimo
   - Uma coisa por vez (name contem "and"? divida)
   - Nome descreve comportamento, nao implementacao ("returns null for empty
     input" nao "test1")
   - Use codigo real, nao mock do que voce ta testando
   - Arquivo: [caminho do teste]

2. VERIFY RED — rode o teste e me mostre o output
   - Deve falhar (nao errorear)
   - A failure message deve ser esperada (nao typo)
   - Se passar: voce ta testando comportamento que ja existe, re-escreva o teste
   - Se erroreia: fix o erro, rode de novo ate falhar CORRETAMENTE

3. GREEN — escreva o minimo de codigo pra passar
   - Nao adicione features nao testadas
   - Nao "enquanto estou aqui"
   - YAGNI: signature da funcao minima

4. VERIFY GREEN — rode
   - Teste novo passa
   - Outros testes nao quebraram
   - Output limpo (sem warnings)

5. REFACTOR (opcional, so se for claro)
   - Remove duplicacao, melhora nome
   - Nao adicione comportamento
   - Testes continuam verdes

6. COMMIT
   - "test: red — [descricao]" (opcional, alguns preferem so o green)
   - "feat: [descricao]" no green

Repita ate cobrir: happy path, edge cases (empty, null, boundary), error cases.

SINAIS DE QUE VOCE QUEBROU A REGRA:
- Codigo antes de teste -> delete e recomece
- Teste passa na primeira tentativa -> voce testou codigo existente, nao
  comportamento novo
- "Vou manter este codigo como referencia e escrever o teste" -> NAO. Delete.
- "Esse caso e simples demais pra testar" -> simples quebra tambem. 30 seg.
```

**Quando usar:** toda feature nova, todo bugfix, qualquer mudanca de
comportamento. Ser rigoroso com TDD aqui paga pro resto do projeto.

**Por que funciona:** testes escritos depois passam imediatamente — o que nao
prova nada (podem testar a coisa errada, podem espelhar implementacao, podem
faltar edge cases que voce esqueceu). A regra iron-law do `test-driven-development`
skill e psicologica: se voce **viu o teste falhar**, voce sabe que ele testa
algo. Se nao viu, e fe. A estrutura RED -> VERIFY RED -> GREEN -> VERIFY GREEN
com rodadas explicitas (nao so "rode o teste", mas "me mostre o output") forca
o modelo a parar e verificar, nao so afirmar.

**Melhor pra:** codigo que vai pra producao, bibliotecas, APIs publicas,
qualquer codigo com shelf-life > 1 mes. Tambem excelente pra bug fixes:
escrever o teste que reproduz antes de fixar prova que o fix funcionou.

**Evitar quando:** prototipo descartavel ("quero ver se isso e viavel, vou
jogar fora"); codigo gerado (schemas, boilerplate); config files que so o
runtime valida; scripts one-off. Nesses, pergunta antes de pular TDD — e
facil racionalizar.

---

### E7. Delegacao pra subagent — briefing auto-contido, formato de resposta ⭐⭐⭐⭐

**Exemplo (prompt copiavel):**
```text
Dispare um subagent [general-purpose|Explore] com o seguinte briefing:

--- BRIEFING AUTO-CONTIDO (copie isto pro prompt do subagent) ---

OBJETIVO
[1 frase, acao concreta. Ex: "Encontre todos os usos de deprecated API `fooBar`
neste repo e liste-os em JSON com file:line + contexto de 3 linhas."]

CONTEXTO (por que isso importa — 2-3 frases)
[Ex: "Estou migrando de fooBar pra fooBaz. Preciso do inventory completo
antes de planejar a ordem de migracao. Isso NAO e exploration casual — quero
lista exaustiva."]

SCOPE
- Busque em: [diretorios]
- Ignore: [node_modules, dist, arquivos gerados, testes fixtures]
- Inclua: [.ts, .tsx, .js — mas nao .json]

FERRAMENTAS DISPONIVEIS
- Voce pode usar: Read, Grep, Glob
- Voce NAO pode usar: Write, Edit, Bash (read-only investigation)

FORMATO DE RESPOSTA (obrigatorio)
Retorne em markdown, nessa ordem, NO MAXIMO 200 PALAVRAS:

## Resumo
- Total de call sites encontrados: N
- Arquivos afetados: M

## Inventario (JSON em code block)
```json
[
  {"file": "src/x.ts", "line": 42, "context": "...", "usage_type": "sync|async"},
  ...
]
```

## Descobertas relevantes
- [Se encontrou dead code, inconsistencias, coisas inesperadas — liste.
  Se nao encontrou nada incomum, escreva "nenhuma".]

O QUE NAO FAZER
- NAO proponha plano de migracao (nao e seu escopo)
- NAO edite nenhum arquivo
- NAO inclua codigo completo dos call sites — so 3 linhas de contexto
- NAO me de um "what I found was interesting because..." — seja direto
- Se algum arquivo der erro de leitura, pule e reporte no final

--- FIM DO BRIEFING ---

Delegue agora e me reporte o resultado.
```

**Quando usar:** tarefa que cabe em um subagent porque e (a) read-only ou
isolada, (b) tem output bem definido, (c) pode travar/gastar context se
rodar inline. Exemplos: inventario de usage, research de biblioteca,
benchmark de opcoes, find-dead-code.

**Por que funciona:** subagents tem context window novo — pra serem uteis
precisam de briefing auto-contido (o subagent nao ve a conversa que voce
teve antes). Os campos "O QUE NAO FAZER" e "FORMATO DE RESPOSTA" sao
criticos porque subagents tendem a over-deliver (explicar processo, dar
opiniao, escopar creep). "Under 200 words" enforcement previne inundar
o main thread com resposta longa (sub-agent returns acumulam no main — ver
doc oficial). O `agentskills.io` pattern explicito ajuda o subagent a
saber EXATAMENTE o shape esperado.

**Melhor pra:** exploracao paralela de areas distintas (auth / DB / API em
3 subagents simultaneos), tarefas que gastariam muitos tokens inline (scan
de 500 arquivos), research que voce quer que seja self-contained (nao
quer que subagent leia o historico todo), audits onde voce quer output
estruturado.

**Evitar quando:** tarefa precisa de back-and-forth ou multiplas fases com
contexto compartilhado — fica no main; tarefa rapida inline (1-2 files) —
overhead de setup maior que o beneficio; quando voce precisa ver o processo
(debugging) — subagent encapsula demais.

---

### E8. Construir skill / SKILL.md — template + HARD-GATE + frontmatter ⭐⭐⭐⭐

**Exemplo (prompt copiavel):**
```text
Construa uma nova skill chamada "[nome-kebab-case]". Use o skill creator
pattern (frontmatter minimo + HARD-GATE quando apropriado + corpo < 500 linhas).

PASSO 1 — ENTENDER A SKILL (me pergunte ate ter claridade)
- Qual o trigger exato? (frase-gatilho do usuario, tipo "gera roteiro pra X")
- Quais tools essa skill precisa? (Read, Bash, WebSearch, etc)
- Ela deve ser user-invocable SO? Claude-auto-invocable SO? Ambos?
- E um pipeline (Python + Claude inline) ou texto-only (so Claude)?
- Que frontmatter fields fazem sentido? (context: fork? paths glob? allowed-tools?)
- Tem HARD-GATE? (regra invariavel tipo "nao execute sem X")

PASSO 2 — PROPOR ESTRUTURA (me mostre antes de criar arquivos)
.claude/skills/[nome]/
├── SKILL.md                 # Principal — < 500 linhas
├── references/              # Docs que Claude le sob demanda
│   └── [se pipeline com prompts inline, listar prompts aqui]
├── scripts/                 # Se houver Python/bash
│   └── [listar]
└── fixtures/                # Se precisar pra testes

PASSO 3 — ESCREVER SKILL.md SEGUINDO TEMPLATE

---
name: [nome-kebab]
description: [1-2 frases. Front-load use case. Max 1536 chars combinado com when_to_use.]
when_to_use: [Contexto adicional. Trigger phrases. Appended a description.]
allowed-tools: [lista se quiser restringir — senao omitir]
disable-model-invocation: [true se so user invoca — senao omitir]
context: [fork se quiser subagent isolado — senao omitir]
---

# [Nome humano da Skill]

## Overview
[2-3 frases. O que a skill faz + quando usar.]

## When to Use
- Caso 1
- Caso 2

## When NOT to Use
- Anti-caso 1
- Anti-caso 2

[Se aplicavel — adicione HARD-GATE:]
<HARD-GATE>
NAO [acao] ate [pre-condicao cumprida]. Aplica-se a TODO caso,
inclusive "simples". Violar a letra e violar o espirito.
</HARD-GATE>

## Process (ou Checklist)
1. [Passo 1] — [1-2 frases]
2. [Passo 2] — ...

## Red Flags — STOP
- "Rationalizacao tipica 1" -> reality check
- "Rationalizacao tipica 2" -> reality check

## Quick Reference
[Tabela condensada dos passos pra usar como cheatsheet]

PASSO 4 — VALIDAR
- SKILL.md < 500 linhas? (rode wc -l)
- description + when_to_use < 1536 chars combinados?
- Frontmatter YAML valido? (rode python -c "import yaml; yaml.safe_load(open('SKILL.md').read().split('---')[1])")
- Triggers documentados no CLAUDE.md do projeto (se for project-scoped)?
- Smoke test: invoque a skill com um exemplo real e veja se funciona

REGRAS:
- SKILL.md e instrucao pro modelo proximo, NAO documentacao pro humano.
  Prefira comandos ("faca X") a descricoes ("esta skill faz X").
- Se precisar de exemplos longos, mova pra ./examples.md e link.
- Se tem script Python, SKILL.md diz quando chamar — logica fica no .py.
```

**Quando usar:** criando nova skill pra automatizar workflow recorrente,
construindo skill pra time (project-scoped), convertendo playbook manual em
skill executavel.

**Por que funciona:** skills que funcionam bem compartilham estrutura:
frontmatter minimo (nao polua), HARD-GATE quando tem regra inviolavel,
Red Flags section pra prevenir rationalization, < 500 linhas (budget de
context). O skill creator pattern mencionado em "67 claude code skills"
(X thread de abril 2026) inverte o fluxo — ao inves de escrever SKILL.md
do zero, voce conversa com Claude pra construir. Os 4 passos (entender ->
propor -> escrever -> validar) evitam o erro classico de gerar skill
bonita mas que nao triggera ou triggera demais.

**Melhor pra:** workflows executados 5+ vezes, processos com checklist,
automacoes que envolvem sequencia fixa (validate -> gather -> analyze ->
report), instrucoes que voce ja se pegou copiando e colando em prompts
repetidamente.

**Evitar quando:** tarefa executada 1-2 vezes (skill e overhead); algo que
varia muito a cada execucao (skill presume pattern); quando prompt inline
de 10 linhas resolve (nao construa skill pra tudo).

---

### E9. Escrever specs / plans — sections fixas, no placeholders, exact paths ⭐⭐⭐⭐

**Exemplo (prompt copiavel):**
```text
Escreva uma spec (design document) pra [feature] seguindo template rigido.
Salve em .planning/specs/YYYY-MM-DD-[kebab-topic].md.

REGRAS GLOBAIS
- SEM placeholders. Zero "TBD", "TODO", "[preencher depois]". Se voce nao
  sabe, pergunte antes de escrever. Se e genuinamente aberto, escreva
  "decision deferred to [fase/data]" com motivo.
- CADA path e absoluto e exato. Nao "src/utils/*" generico — "src/utils/
  retry.ts com funcoes retryOperation + retryWithBackoff".
- CADA requirement tem criterio de verificacao. "Retry 3 vezes" nao — "retries
  up to 3 times with exponential backoff (500ms, 1s, 2s); after 3rd failure
  throws RetryExhaustedError".

ESTRUTURA OBRIGATORIA (preencher nesta ordem):

# [Titulo da feature]

## 1. Problem Statement
- Qual dor isso resolve? (1-2 frases)
- Quem sente essa dor? (user? dev? both?)
- Por que resolver agora? (triggering event)

## 2. Non-Goals
- O que isso DELIBERADAMENTE nao faz
- Ex: "not solving for multi-tenancy — single user only"
- Previne scope creep

## 3. Proposed Solution
- Approach em 3-5 frases
- Por que essa entre outras opcoes consideradas?

## 4. Architecture
- Componentes (caixas)
- Data flow (setas)
- Diagrama ASCII ou descreve em prosa se muito simples

## 5. API / Interface
- Signatures exatas. Nomes de funcao, tipos de arg, tipos de retorno.
- Erros que podem ser thrown + quando
- Nenhum `any` / `unknown` em signature — se e generic, explicite

## 6. Data Model
- Schema de DB / JSON (se aplicavel)
- Migrations needed
- Indexes

## 7. Implementation Plan
Plano dividido em tasks bite-sized (cada task commitavel independentemente).
Formato:
- [ ] Task 1: [descricao]. Files: [list]. Tests: [list]. Est: [S/M/L].
- [ ] Task 2: ...

## 8. Testing Strategy
- Unit: que comportamentos
- Integration: que fluxos
- Manual verification: [steps pra testar UAT]

## 9. Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|

## 10. Rollout Plan
- Feature flag?
- Migracao de dados existentes?
- Rollback strategy?

## 11. Success Criteria (DoD)
- [ ] Criterio 1 verificavel
- [ ] Criterio 2 verificavel
- [ ] Todos os testes verdes
- [ ] Docs atualizados

SELF-REVIEW LOOP (apos escrever, antes de me mostrar):
1. Placeholder scan — grep "TBD\|TODO\|\[fill\]\|\[?\]" e elimine
2. Consistency check — secoes contradizem? arquitetura bate com API?
3. Scope check — isso cabe num unico plan de implementacao? se nao, decomponha
4. Ambiguity check — alguma frase pode ser lida de 2 jeitos? torne explicito

So me mostre depois desses 4 checks.
```

**Quando usar:** feature que vai levar > 1 dia, mudanca de arquitetura,
feature que tem stakeholders (alguem vai ler e aprovar), refactor grande,
qualquer trabalho onde "voltar a negociar escopo" depois que comecou e caro.

**Por que funciona:** specs com placeholders sao quase sempre abandonadas
(o autor "volta depois" e esquece). A regra "no placeholders" forca
decidir agora ou documentar explicitamente o deferral. Sections fixas
reduz tempo de "o que preciso escrever?" — voce so preenche. "Exact paths"
previne especulacao que nao sobrevive ao primeiro `ls`. O self-review loop
e onde 90% das specs falham (escritor so olha com olhos frescos no dia
seguinte); forcar in-session captura issues cedo.

**Melhor pra:** pre-implementation specs, RFCs, mudancas que precisam
buy-in de time, projects com multi-semana timeline, specs pra skills
complexas (video-cut, thumbnail-generator).

**Evitar quando:** tarefa < 2h de implementacao (spec e overhead); exploracao
de opcoes (ai e brainstorming, nao spec); mudanca trivial (fix de typo,
atualizar dependencia). Tambem evite quando ja tem spec num sistema externo
(Linear, Notion) — nao duplique.

---

### E10. Meta-prompts — reescrever prompt pra remover ambiguidade ⭐⭐⭐⭐

**Exemplo (prompt copiavel):**
```text
Antes de executar meu pedido, reescreva-o. Mostre 2 versoes:

VERSAO A (meu original, literal)
[cole aqui o que voce tava prestes a me pedir]

VERSAO B (reescrita pra remover ambiguidade)
Identifique e corrija:
1. Verbos vagos ("melhorar", "arrumar", "fazer funcionar") -> acao concreta
2. Pronomes sem referente claro ("isso", "ele", "tudo") -> substantivos explicitos
3. Scope ambiguo ("o codigo", "os arquivos") -> paths ou padroes especificos
4. Success criteria ausentes -> "estara pronto quando [X]"
5. Suposicoes nao verbalizadas -> explicite
6. Estilo de output nao especificado -> "em bullets", "em markdown", "em JSON"
7. Constraints nao declaradas -> "maximo N palavras", "so arquivos .ts",
   "sem mexer em testes existentes"

Apresente VERSAO B e pergunte: "isto captura o que voce quis dizer? qualquer
ajuste antes de executar?"

SO APOS EU APROVAR VERSAO B, execute.

Template de success criteria se eu nao te der:
- Input: [o que voce recebe]
- Output: [shape/tamanho/formato esperado]
- Done when: [condicao verificavel]
- Constraints: [nao-faca lista]
```

**Quando usar:** quando voce ta com preguica de escrever prompt bem (os
pedidos saindo rapido e vago); tarefa critica onde reworks custam caro;
quando voce percebe "nao sei exatamente o que quero" mas precisa avancar;
prompt que voce planeja salvar/reutilizar (vai pra skill? pra macro? pra
playbook?).

**Por que funciona:** a maioria dos erros de output nao vem do modelo — vem
do prompt ambiguo que permite 3 interpretacoes validas. O modelo escolhe
uma das 3 (geralmente a mais comum no treinamento) que nao e o que voce
queria. Pedir explicitamente "reescreva pra ser univoco" extrai a intencao
via espelho. E **iterar no prompt** e quase sempre mais barato que iterar
na execucao. Pattern conhecido como "Grill Me" skill (ver report_6) onde
o modelo entrevista voce antes de agir.

**Melhor pra:** tarefas longas (> 30min de modelo), tarefas caras em tokens,
conversas onde voce ja perdeu uma rodada com modelo indo pro lado errado,
promp engineering pra skills novas (o meta-prompt vira o prompt oficial).

**Evitar quando:** tarefa trivial ("rode npm test"); tarefa iterativa barata
onde reajustar e facil ("ajusta esse texto"); quando voce ja tem o prompt
claro e esta so procrastinando com meta-work.

---

### E11. Exploracao de codebase — Explore subagent, audit, map deps ⭐⭐⭐⭐

**Exemplo (prompt copiavel):**
```text
Dispare subagent Explore (read-only, haiku, paralelo se aplicavel) pra mapear
[area do codebase]. Trabalho em 3 passos:

PASSO 1 — AUDIT QUICK (5-10 min)
Objetivo: entender a area em alto nivel.
- Quantos arquivos? LOC total? linguagens?
- Quais os 3-5 entry points principais?
- Top 5 arquivos por tamanho
- Top 5 arquivos por "centralidade" (mais importados / mais depended-upon)
- Convencoes detectadas (imports, naming, error handling)

Output: resumo em < 30 linhas.

PASSO 2 — MAP DEPENDENCIES
Para cada entry point do passo 1:
- O que importa (direct deps)
- Quem importa ele (reverse deps)
- Graph em bullet nesting:
  - entryA.ts
    - imports: depB, depC
    - imported by: caller1, caller2
    - depB.ts
      - imports: ...

Output: tree em markdown.

PASSO 3 — FIND DEAD CODE + SMELLS
Use Grep + cross-reference:
- Funcoes/classes exportadas mas nao importadas em lugar nenhum (dead code)
- Arquivos sem teste correspondente
- Arquivos com > 500 linhas (candidatos a split)
- Padroes inconsistentes (ex: metade usa async/await, metade usa .then)
- TODOs / FIXMEs / HACK comments velhos (> 3 meses via git blame)

Output: tabela "issue | arquivo | severity | quick fix".

REGRAS:
- Use SO tools read-only (Read, Grep, Glob). NAO edite, NAO rode bash
  destrutivo.
- Thoroughness: [quick|medium|very thorough] — o default e medium.
- Se area muito grande (> 200 arquivos), disparem 2-3 subagents em paralelo
  dividindo por subdiretorio e depois consolide.
- Se encontrar coisa perigosa (credencial commitada, eval de user input),
  ALERTE no topo do output — nao enterre.
- Output total: < 300 linhas. Se precisar mais, corte pra 300 e me diga o
  que mais tem.
```

**Quando usar:** herdou codebase novo, vai fazer refactor grande (precisa
de mapa antes), suspeita de dead code acumulado, vai abrir PR em area que
nao conhece, auditoria de seguranca, tentando entender "como o auth flow
funciona aqui".

**Por que funciona:** Explore subagent e **read-only** + **Haiku** — barato
em tokens, seguro (nao pode quebrar nada), perfeito pra descoberta. Paralelizar
em 2-3 subagents pra subdiretorios diferentes acelera 3x sem multiplicar
custo por 3 (cada um tem contexto proprio, mais otimizado). Os 3 passos em
cascata (audit -> map -> smells) seguem o fluxo natural: primeiro **onde
estou**, depois **como se conecta**, finalmente **o que ta mal**. Pular etapas
leva a opinar sobre smells sem entender contexto.

**Melhor pra:** codebases de 10k+ LOC, projetos que voce vai editar mas nao
escreveu, due diligence antes de aceitar projeto/contrato, geracao de
onboarding doc (combine com E3), prep pra security review.

**Evitar quando:** codebase pequeno (< 500 LOC — so leia direto); area
que voce escreveu semana passada (voce ja conhece); quando voce precisa
de pergunta especifica ("onde X e definido?") — ai use Grep direto, nao
Explore subagent; quando scope nao esta claro — brainstorm primeiro (E5).

---

### E12. Anti-sycophancy — pedir pushback honesto ⭐⭐⭐⭐⭐

**Exemplo (prompt copiavel):**
```text
Seja meu critico mais duro sobre [X — decisao, codigo, plano, argumento]. Nao
suavize. Nao concorde pra evitar conflito. Se eu estou errado, me diga que
estou errado.

REGRAS
1. Encontre EXATAMENTE 3 fraquezas. Nem mais (diluir ajuda ninguem), nem
   menos (se so achou 2, procure mais; se realmente so tem 1, me diga e pare).
2. Cada critica precisa de:
   (a) evidencia concreta — linha, arquivo, numero, citacao
   (b) por que e problema (nao so "isso e ruim" — explique o impacto)
   (c) qual seria a alternativa melhor
3. Rankeie por severidade — qual e o risco MAIOR se nao corrigir?
4. Se depois de procurar, voce nao achar 3 fraquezas materiais, escreva
   "APROVADO - nao encontrei issues materiais. [1-2 frases de por que]".
   Nao invente critica pra preencher quota.

PROIBIDO
- "This is great but..." -> so the critica
- "Overall, this looks solid, however..." -> corte o preambulo
- Hedging ("might be worth considering" quando voce acha que e claramente errado)
- Sandwich de feedback (elogio -> critica -> elogio) — corte os elogios
- Aceitar o que eu disse sem testar

OUTPUT FORMAT

## Critica #1 (severity: alta/media/baixa)
- Problema: [1 frase]
- Evidencia: [linha, arquivo, citacao literal]
- Impacto: [o que acontece se nao corrigir]
- Alternativa: [o que fazer]

## Critica #2 ...
## Critica #3 ...

## Veredicto
[1 frase. Ex: "Plano tem flaw estrutural em #1 — reconsidere antes de
implementar." ou "Issues sao menores, pode seguir corrigindo em paralelo."]

Pergunta final: "quer que eu detalhe qualquer uma dessas?"
```

**Quando usar:** apos propor design/arquitetura/plano; antes de merge de PR
sua; apos gerar spec; quando o modelo ta concordando com tudo o que voce
diz (red flag); qualquer decisao onde o downside do erro e caro.

**Por que funciona:** modelos sao treinados pra serem uteis — o que vira
sycophancy (concordam com qualquer proposta do usuario). Isso ESCONDE
problemas reais. O prompt precisa ser explicito: (a) numero obrigatorio de
criticas (3) forca busca ativa, (b) evidencia obrigatoria previne
criticas vagas (mais faceis de produzir), (c) ranking forca priorizacao,
(d) clausula "se nao achar, diga aprovado" e safety valve contra inventar
fraqueza. A proibicao de hedging ("might be worth considering") e crucial —
hedges sao o jeito do modelo evitar parecer rude sem realmente desconcordar.

**Melhor pra:** decisoes caras (arquitetura, contrato), post-design review
antes de implementar, antes de apresentar trabalho a um humano mais senior
(ensaio de critica), quando voce esta excited com uma ideia e desconfia do
viesh.

**Evitar quando:** tarefa mecanica (rodar teste, formatar codigo — nao tem
o que criticar); exploration fase (brainstorming precoce, onde criticar
mata ideias antes de maturar); quando voce esta genuinamente procurando
validacao emocional (seja honesto — se o que voce precisa e encorajamento
nao critica, peca isso); 2 ou 3 rodadas consecutivas do mesmo prompt
(diminishing returns — depois de 3 criticas materiais, resto e nit).

---
## 8. Anti-patterns

> 12 erros comuns que matam produtividade, qualidade ou ambos. Ordem =
> impacto (mais graves primeiro). Cada item: **sintoma observavel** +
> **por que e ruim** + **fix concreto**. Sem estrelas — anti-padroes nao
> sao "usar mais/menos", sao "nao fazer".

---

### AP-1: Read em imagem sem pre-flight de magic bytes

**Sintoma:** baixa `.jpg` do YouTube/CDN, passa direto pro Read. API
retorna erro de formato. Proxima mensagem repete o erro, e a seguinte
tambem — sessao travou em loop.

**Por que e ruim:** YouTube CDN serve AVIF/WebP com extensao `.jpg`
(content negotiation). Formato invalido no Read tool fixa o image block
no historico e **toda mensagem nova repete o erro** (sessao poisoned).
Unica saida: `/compact` ou `/rewind` — perde contexto. Incidente real
em 2026-04-14 com 4 arquivos em `data/thumbnail-refs/oleg-benchmark/`.

**Fix:** pre-flight obrigatorio antes de Read em imagem baixada da web:
`head -c 4 file | xxd -p`. Se nao comecar com `ffd8ff`, e AVIF/WebP/HEIC
— converter com `ffmpeg -y -i input -q:v 2 output.jpg`. Scripts de
download devem enviar `Accept: image/jpeg` preventivamente.

---

### AP-2: Commitar sem pedido explicito do usuario

**Sintoma:** usuario pede "refatora X", Claude refatora e ja faz
`git commit -m "refactor X"` sem ter sido solicitado. Ou: faz edits,
decide "ja que terminei vou commitar pra fechar tarefa".

**Por que e ruim:** commits indesejados poluem historico, as vezes
incluem arquivos sensiveis (`.env`, secrets), quebram atomicidade que o
usuario queria, e dao trabalho pra reverter. Global CLAUDE.md do Dayner
ja codifica: commits SO com pedido explicito ("commita ai", "cria um
commit"). "Ja que terminei" nao conta como permissao.

**Fix:** nunca commitar sem gatilho explicito. Apos editar, parar e
aguardar. Se duvida, perguntar "quer que eu commite isso?" — 1 pergunta
custa menos que 1 revert.

---

### AP-3: Ignorar o HARD-GATE de skills rigidas ("esse projeto e diferente")

**Sintoma:** skill `brainstorming` diz "NAO implementar antes de design
aprovado". Claude pensa "esse projeto e trivial" e parte pra implementar.
Mesmo vale pra `test-driven-development` (producao antes do teste
falhar), `systematic-debugging` (fix sem root cause),
`verification-before-completion` (reclamar "done" sem rodar teste).

**Por que e ruim:** HARD-GATE / Iron Law nao e sugestao — e o mecanismo
que faz a skill funcionar. "Simple" projects sao ONDE assumptions
nao-examinadas causam mais desperdicio (codificado na propria skill
como anti-pattern). Pular gate = skill virou decoracao.

**Fix:** skill diz qual gate e obrigatorio. Respeitar mesmo se projeto
parece trivial — design de 3 frases > 300 linhas retrabalhadas. Se
quiser resistir, desinstalar a skill e assumir responsabilidade
explicita; nao ignorar silenciosamente.

---

### AP-4: Rewind em vez de investigar root cause

**Sintoma:** teste falhou, fix falhou, usuario pede `/rewind` ou Claude
propoe "reescreve do zero". Bug volta na sessao seguinte porque causa
raiz nao foi endereçada.

**Por que e ruim:** rewind apaga sintoma e historico de tentativas mas
causa raiz persiste no codigo/dados. Skill `systematic-debugging` tem
Iron Law sobre isso: "NO FIXES WITHOUT ROOT CAUSE INVESTIGATION".

**Fix:** antes de rewind — reproduzir minimamente, isolar local,
identificar causa, implementar fix, verificar. Rewind depois de debug
(pra limpar artefatos) ok; antes de entender o que quebrou, nao.

---

### AP-5: Prompts vagos ("make it better", "improve this")

**Sintoma:** "melhora esse codigo", "otimiza essa thumbnail", "refina o
prompt". Claude improvisa criterios (legibilidade? performance? tamanho?
contraste?) e devolve algo que nao era pedido. Duas iteracoes depois o
codigo esta pior que o original.

**Por que e ruim:** sem criterio de sucesso, modelo escolhe um eixo e
voce escolhe outro — divergencia cresce a cada turn. "Better" contra o
quê? Cada resposta otimiza eixo diferente.

**Fix:** criterios explicitos + success condition. "Reduz alocacoes no
hot loop ate bench rodar em <50ms, preserve API publica, testes
continuam passando." Se nao sabe ainda, peça pro modelo listar 3-5 eixos
E escolha um antes da mudanca.

---

### AP-6: Sycophantic agreement (modelo concorda pra evitar conflito)

**Sintoma:** usuario propoe abordagem, modelo responde "otima ideia, vou
implementar assim". Implementa. Review posterior nota falha obvia que o
modelo nao levantou. Padrao repete em decisoes de arquitetura.

**Por que e ruim:** decisoes ruins passam por falta de friction. No
sistema dos 3 cerebros (OpenClaw estrategista + Claude contraponto +
Claude Code executor), se Claude sempre concorda, perdeu o papel de
contraponto.

**Fix:** prompt anti-sycophancy explicito ("se ver risco/flaw, argumenta
contra ANTES de implementar"). Em decisoes criticas, pedir lista de 2-3
objecoes primeiro. Skill `receiving-code-review` ja codifica "evidence
before agreement".

---

### AP-7: Subagent com briefing terso ("analyze this")

**Sintoma:** dispatch tipo "analyze the auth module" ou "research how X
works". Subagent devolve sumario raso, sem paths. Main thread precisa 3
rodadas de followup pra extrair o que devia vir no primeiro report.

**Por que e ruim:** subagent nao tem acesso ao contexto do main thread —
so o que voce injetou. Briefing terso = subagent inventa escopo, erra
foco, retorna generalidades. Tempo economizado virou 3x iterando.

**Fix:** briefing como pra colega novo: (1) path absoluto + linhas
relevantes, (2) o que ja foi investigado, (3) goal concreto (pergunta
a responder, nao "explora"), (4) formato esperado (JSON? bullets?
paths?). Skill `subagent-driven-development` tem template: Role + Task
Description + Context + Questions Gate + Your Job (steps).

---

### AP-8: Falta de CLAUDE.md (inferir stack toda sessao)

**Sintoma:** toda nova sessao Claude refaz Glob/Grep pra descobrir stack,
package manager, convencoes, layout. Usa `npm` quando projeto usa `pnpm`;
cria arquivo em `src/` quando convencao e `lib/`.

**Por que e ruim:** cada sessao paga custo de re-descoberta em tokens
(10-30 Glob/Read calls repetidos) e em qualidade (as vezes infere
errado). Usuario perde tempo corrigindo assumptions basicas.

**Fix:** investir 2h escrevendo `CLAUDE.md` de projeto: stack + package
manager + convencoes test/lint + scripts principais + regras
invariaveis + onde NAO mexer. Carrega automatico em toda sessao. `/init`
gera scaffolding. Bonus: path-scoped rules em `.claude/rules/*.md` com
`paths:` frontmatter pra convencoes que so aplicam em `src/api/**`.

---

### AP-9: Mocks em integration tests

**Sintoma:** test suite passa verde; roda em producao com DB/API real
e falha. Mock retornava `{status: 200}` hardcoded, nao batia no endpoint
real. Ate testes marcados "integration" mockam dependentes externos.

**Por que e ruim:** integration com mock testa so que voce escreveu um
mock — nao o contrato real. Bugs de schema, auth, rate limit, null
handling passam. Mock drift: API real mudou, mock nao acompanhou.

**Fix:** integration = real DB + real API (sandbox/staging). Mocks so em
unit tests. Pra pipelines tipo niche-intel, usar fixtures de resposta
REAL capturada com TTL de re-captura. Se custo bloqueia, rodar 1 pass
"live" semanal em CI agendado.

---

### AP-10: Re-ler arquivo que acabou de editar "pra confirmar"

**Sintoma:** Claude faz Edit/Write e imediatamente chama Read no mesmo
arquivo "pra verificar que aplicou". Padrao repete toda vez que edita.

**Por que e ruim:** Edit/Write ja teria retornado erro se falhasse —
confirmacao extra e ruido. Em sessao longa, 20-30 reads redundantes
consomem tokens e latencia. Harness do Claude Code diz explicitamente
"do NOT re-read a file you just edited".

**Fix:** trust the harness. Edit sucesso = aplicou. Re-ler so faz sentido
se o arquivo foi alterado por OUTRA via (script externo) entre turnos.

---

### AP-11: MEMORY.md / CLAUDE.md crescendo alem de 200 linhas

**Sintoma:** `CLAUDE.md` do projeto passa de 500 linhas; `MEMORY.md`
auto-gerenciado acumula 800. Parte e truncada silenciosamente (auto
memory carrega so primeiros 200 linhas / 25KB).

**Por que e ruim:** docs oficiais recomendam `<200 linhas` por CLAUDE.md
e `<500` por SKILL.md. O que passa e cortado sem aviso — regras que voce
assumiu estar carregadas nao estao. Sessao age contra regras
"supostamente" ativas.

**Fix:** CLAUDE.md = index + regras NAO-negociaveis. Detalhes via
`@docs/arquivo.md` ou `.claude/rules/*.md` com `paths:` scopados (carrega
on demand). Pra auto memory, quebrar em topic files
(`debugging.md`, `api-conventions.md`) e manter `MEMORY.md` so como
index enxuto.

---

### AP-12: Uma skill fazendo 5 coisas (description vaga)

**Sintoma:** skill `my-project` com description "Helps with the project"
— Claude nunca sabe quando ativar. Ou skill `content-helper` que cobre
roteiro + thumbnail + SEO + analytics + upload: trigger ambiguo, skill
ativa tarde ou nunca.

**Por que e ruim:** description e o scoring de delegacao. Vaga = matching
pobre = skill dormente. Multi-proposito = body inteiro entra no contexto
pra sub-tarefa que usa 10%, e body fica ate o fim da sessao. O projeto
atual segue o padrao certo: 6 skills atomicas (niche-intel,
youtube-content-research, content-execution-research, roteiro-youtube,
thumbnail-generator, video-cut) com triggers distintos.

**Fix:** 1 skill = 1 responsabilidade. Description no formato
"Use when [trigger] - [what accomplishes]". Front-load o use case
(primeiros 200 chars viram o scoring). Se faz N coisas, quebrar em N
skills + opcional uma "coordenadora" que as invoca em sequencia.
## 9. Fontes consultadas

Trilha de credibilidade + rabbit holes pra leitura aprofundada. Coletado em
2026-04-17 via plugin `last30days` (6 queries paralelas) + WebFetch de docs
oficiais + source-read de plugins locais.

### 9.1. Docs oficiais (code.claude.com)

> Nota: `docs.claude.com/en/docs/claude-code/*` retorna 301 pra `code.claude.com/docs/en/*`. Use o host canonico.

- **Hooks** — https://code.claude.com/docs/en/hooks — 26 eventos de hook (SessionStart/PreToolUse/PostToolUse/Stop/etc), return codes (Exit 0/1/2), JSON input/output schema, matcher patterns, handler types (command/http/prompt/agent), precedencia com multiplos hooks.
- **Skills** — https://code.claude.com/docs/en/skills — frontmatter YAML completo (14 campos), 4 scopes (enterprise/personal/project/plugin), live change detection, auto-discovery de subdirs, string substitutions ($ARGUMENTS, $CLAUDE_SKILL_DIR), budget de 1.536 chars por description.
- **Sub-agents** — https://code.claude.com/docs/en/sub-agents — Agent tool params (antigo Task), 5 built-in (Explore/Plan/general-purpose/statusline-setup/Claude Code Guide), isolation modes (worktree), memory scopes (user/project/local), foreground vs background, `--agents` JSON inline flag.
- **Commands** — https://code.claude.com/docs/en/commands — 75+ slash commands built-in + bundled skills (/batch, /claude-api, /debug, /loop, /simplify). Inclui `/rewind`, `/branch`, `/focus`, `/memory`, `/recap`, `/doctor`, `/effort`, `/fast`.
- **Settings** — https://code.claude.com/docs/en/settings — schema completo de settings.json (90+ campos), 4 scopes com precedencia managed > cli > local > project > user, array merge (nao replace), permissions syntax, sandbox config, worktree config, attribution customizavel.
- **Memory** — https://code.claude.com/docs/en/memory — CLAUDE.md hierarquia (4 scopes), @import syntax com max depth 5, auto-memory v2.1.59+ (default ON), `.claude/rules/` path-scoped com glob, AGENTS.md compat, resolution order e post-compact behavior.

### 9.2. Recursos da comunidade (top 10, filtrados)

- **Reddit r/ClaudeAI "50+ slash commands"** — https://www.reddit.com/r/ClaudeAI/comments/1shz99l/here_are_50_slash_commands_in_claude_code_that/ — lista compilada por usuario com 50+ slash commands built-in organizados por funcao (context mgmt, session, config, diagnostics). Base pra secao 4 do guia.
- **Reddit r/ClaudeCode "Folder structure reference"** — https://www.reddit.com/r/ClaudeCode/comments/1slw8vd/claude_code_folder_structure_reference_made_this/ — cheat sheet de layout `.claude/` (hooks/skills/agents/rules/commands), settings.json, mcp config. Autor menciona "jumping between 6 different pages" pra entender, justificando o cheatsheet consolidado.
- **computingforgeeks "Claude Code Cheat Sheet [2026]"** — https://computingforgeeks.com/claude-code-cheat-sheet/ — keyboard shortcuts, slash commands, CLI flags, CLAUDE.md setup, MCP servers, hooks, auto mode, env vars. Referencia externa mais completa disponivel publicamente.
- **Anthropic Resources PDF "Claude Code Advanced Patterns"** — https://resources.anthropic.com/hubfs/Claude%20Code%20Advanced%20Patterns_%20Subagents,%20MCP,%20and%20Scaling%20to%20Real%20Codebases.pdf — PDF oficial Anthropic sobre subagents, MCP integration, scaling pra codebases reais. Best practices autorizadas.
- **MindStudio "Routines/Scheduled Tasks"** — https://www.mindstudio.ai/blog/claude-code-routines-scheduled-tasks-business-automation — explicacao detalhada de Routines (cron + webhooks), use cases de business automation. Pareado com PR #59 de Martin407/Glass que implementa o feature completo.
- **GitHub Piebald-AI/claude-code-system-prompts** — https://github.com/Piebald-AI/claude-code-system-prompts — todos system prompts internos do Claude Code (24 tool descriptions + Plan/Explore/Task subagent prompts + CLAUDE.md/compact/statusline/WebFetch/security-review utility prompts). Atualizado por versao do CC.
- **GitHub obra/superpowers** — https://github.com/obra/superpowers — framework agentico com 15 skills rigidos (brainstorming, TDD, systematic-debugging, verification-before-completion, subagent-driven-development). HARD-GATE e Iron Law patterns. Referencia de skill design avancado.
- **GitHub mattpocock/skills** — https://github.com/mattpocock/skills — diretorio pessoal de skills do Matt Pocock (TDD com red-green-refactor, refactoring, code fixing). Exemplo de biblioteca de skills pessoal mantida em git.
- **Tech With Tim "Ultimate Claude Code Guide"** (YouTube, 67K views) — https://www.youtube.com/watch?v=uogzSxOw4LU — tutorial completo MCP + Skills + mais. Video mais assistido da janela de 30 dias sobre o topico.
- **X thread "67 Claude Code skills" (@Axel_bitblaze69)** — https://x.com/Axel_bitblaze69/status/2044790646242988109 — thread com 67 skills que "transformam $20 subscription em dev team completo" (skill-creator, TDD, code-review, systematic-debug). Catalogo comunitario extenso.

### 9.3. Plugins instalados consultados (source-read)

- **superpowers v5.0.7** — `~/.claude/plugins/cache/claude-plugins-official/superpowers/5.0.7/` — 15 skills rigidos de process (brainstorming, TDD, verification, systematic-debugging, subagent-driven-development, using-git-worktrees). Hook SessionStart em `hooks/hooks.json`. Fonte pra patterns de skill com HARD-GATE.
- **last30days v3.0.0** — `~/.claude/plugins/cache/last30days-skill/last30days/3.0.0/` — plugin de research multi-fonte (Brave/GitHub/Perplexity/Polymarket/Reddit/X/YouTube/HN). Hook SessionStart valida Python 3.12+. Usado pra 6 queries paralelas na coleta deste guia.
- **gsd** — skills disponibilizados via Claude Code harness (nao cacheados em disk nesta maquina) — comandos de planning/execucao por fase (gsd:plan-phase, gsd:execute-phase, gsd:new-milestone, gsd:resume-work). Referencia de lifecycle de projeto estruturado.

### 9.4. Arquivos internos deste projeto

- `~/.claude/CLAUDE.md` — regras globais do Dayner (regras do plugin last30days: planning manual, bug cosmetico de --diagnose, renovacao de cookies X via Firefox, proibicao de colar .env no chat).
- `C:\Users\quena\projetos\niche-intelligence\CLAUDE.md` — CLAUDE.md do projeto (14 secoes: filosofia, pipeline, skills registradas, regras tecnicas invariaveis, triggers, cadeia de prompts).
- `C:\Users\quena\projetos\niche-intelligence\skills\*\SKILL.md` — 6 skills locais como referencia de estrutura (niche-intel, youtube-content-research, content-execution-research, roteiro-youtube, thumbnail-generator, video-cut).
- `C:\Users\quena\projetos\niche-intelligence\.research\claude-code-guide\docs_snippets.md` — consolidacao completa das 6 paginas oficiais (hooks/skills/sub-agents/commands/settings/memory) com snippets copiaveis.
- `C:\Users\quena\projetos\niche-intelligence\.research\claude-code-guide\report_{1..6}.md` — reports brutos do last30days (6 queries paralelas).
- `C:\Users\quena\projetos\niche-intelligence\.research\claude-code-guide\plugin_cache_findings.md` — analise de source code de superpowers + last30days.

### 9.5. Metodologia

- **Pesquisa comunitaria:** plugin `last30days` v3.0.0, 6 queries paralelas com `--emit=compact`, redirect correto (`1>report.md 2>log.err`), rerank/sintese em-context com Opus 4.7 (1M). Nao dependente de LLM interno (OpenRouter retorna HTTP 400 no formato do last30days; Gemini/OpenAI/xAI nao configurados).
- **Docs oficiais:** WebFetch de 6 paginas canonicas em `code.claude.com/docs/en/*` (host migrado de `docs.claude.com`). Consolidado em `docs_snippets.md` com snippets copiaveis.
- **Plugins:** source-read de 2 plugins instalados localmente (superpowers, last30days). Findings em `plugin_cache_findings.md`.
- **Filtros aplicados:** URLs de polymarket.com (prediction markets crypto — noise) removidas. Videos YouTube com <100 views removidos (tutoriais fraquinhos). Perplexity cites sem URL real removidos.
- **Data de coleta:** 2026-04-17. Janela do last30days: 2026-03-19 a 2026-04-18.
