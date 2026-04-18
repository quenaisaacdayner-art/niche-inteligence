# Guia Claude Code — Design Spec

**Data:** 2026-04-17
**Autor:** Dayner + Claude Code (brainstorming)
**Status:** Draft para revisao humana

---

## 1. Objetivo

Produzir `GUIA_CLAUDE_CODE.md` na raiz do projeto — uma **referencia de consulta**
(nao tutorial) que documenta as melhores tecnicas, regras, comandos e padroes de
prompt do Claude Code, organizados por eixo tematico, com ranking de impacto e
exemplos copiaveis.

**Publico:** Dayner (usuario avancado, ja constroi skills/plugins/hooks).
**Uso:** abrir quando precisar lembrar de um recurso, comparar opcoes pra um
caso de uso, ou descobrir gaps no workflow atual.

## 2. Escopo

### Eixos cobertos (5)

- **A) Produtividade** — slash commands, keybindings, settings/permissions, fast/compact/rewind
- **B) Qualidade de output** — CLAUDE.md hierarquia, memory system, delegacao
  pra subagents, briefings bons, skills rigidas (TDD/debug/verify)
- **C) Automacao/autonomia** — hooks (SessionStart/PreToolUse/etc), loops,
  scheduled agents, background tasks, worktrees
- **D) Skills/plugins** — anatomia de SKILL.md, organizacao de references/prompts,
  skill vs hook vs slash command, plugins oficiais, reuso multi-projeto
- **E) Prompts cookbook** — 12 padroes de prompt com objetivo especifico
  (debug, refactor, CLAUDE.md gen, code review, brainstorm, TDD enforcement,
  subagent delegation, skill construction, spec writing, meta-prompts,
  codebase exploration, anti-sycophancy)

### Fora de escopo

- Integracoes MCP externas (Canva, Gmail, Drive, etc.) — eixo E original descartado
- Tutoriais de instalacao inicial (assumimos ambiente ja funcionando)
- Comparacoes com outras ferramentas (Cursor, Aider, Copilot) — foco em dominio de CC

## 3. Formato do output

### Template de entrada

Cada item no guia segue este formato fixo:

```markdown
### [Nome do recurso] ⭐⭐⭐⭐⭐

**Exemplo:**
```[linguagem]
[snippet copiavel concreto]
```

**Quando usar:** [cenario especifico de ativacao]
**Por que funciona:** [mecanismo / beneficio / tradeoff]
**Melhor pra:** [caso de uso onde e a 1a escolha]
**Evitar quando:** [anti-padrao ou contra-indicacao]
```

### Ranking (1-5 estrelas)

| Estrelas | Significado |
|----------|-------------|
| ⭐⭐⭐⭐⭐ | Essencial — usar diariamente |
| ⭐⭐⭐⭐  | Alto valor — usar quando aplicavel |
| ⭐⭐⭐   | Nicho mas poderoso |
| ⭐⭐    | Situacional |
| ⭐     | Raramente vale a pena |

**Criterios de ranking:**
1. Frequencia de mencao na comunidade (via last30days)
2. Profundidade do problema que resolve
3. Custo de oportunidade de nao saber (o que fica na mesa)

### Estrutura do arquivo final

```
GUIA_CLAUDE_CODE.md

1. TL;DR — top 20 itens mais impactantes (one-liner cada)
2. Quick selector — index por objetivo ("pra fazer X, usa Y")
3. Eixo A — Produtividade (A1-A4)
4. Eixo B — Qualidade (B1-B5)
5. Eixo C — Automacao (C1-C5)
6. Eixo D — Skills/Plugins (D1-D5)
7. Eixo E — Prompts cookbook (E1-E12)
8. Anti-patterns — o que evitar
9. Fontes consultadas — links
```

### Idioma

Portugues brasileiro com termos tecnicos em ingles (hooks, skills, subagents,
worktrees, settings.json, etc.).

## 4. Estrategia de pesquisa

### 4.1. Fontes

**Primarias (comunidade, via last30days):**
- Reddit (r/ClaudeAI, r/ClaudeCode, r/LocalLLaMA)
- X/Twitter
- Hacker News
- YouTube (videos recentes sobre workflows)
- GitHub (top plugins/skills)

**Secundarias (leitura direta):**
- `docs.claude.com` (docs oficiais) via WebFetch
- `~/.claude/plugins/cache/` — source dos plugins ja instalados
  (superpowers, gsd, last30days, claude-plugins-official) — profissionais
  ja codificaram boas praticas aqui
- `~/.claude/CLAUDE.md` global do Dayner (referencia de estilo)

### 4.2. Queries paralelas no last30days (6 queries)

Cada query roda com `--emit=compact 1>report_N.md 2>log_N.err` pra permitir
consolidacao in-context (Regra 1 do CLAUDE.md global — nao confiar no LLM
interno do last30days).

| # | Query (search terms) | Cobre sub-topicos |
|---|---------------------|-------------------|
| 1 | claude code hooks PreToolUse SessionStart settings.json | A3, C1 |
| 2 | claude code slash commands keybindings fast mode context compaction | A1, A2, A4 |
| 3 | claude code subagents delegation CLAUDE.md memory system | B1, B2, B3, B4 |
| 4 | claude code TDD debugging prompt engineering anti-sycophancy | B5, E10, E12 |
| 5 | claude code loops cron background tasks worktrees automation | C2, C3, C4, C5 |
| 6 | claude code skills plugins architecture SKILL.md prompt patterns | D1-D5, E1-E9, E11 |

### 4.3. Processo de consolidacao

1. Rodar 6 queries em paralelo (background)
2. Ler 6 reports + logs de erro
3. Ler `~/.claude/plugins/cache/*/` — extrair padroes de SKILL.md, hooks, etc.
4. WebFetch paginas chave de docs.claude.com (hooks, skills, subagents, commands)
5. Para cada item identificado:
   - Consolidar mencoes cross-source
   - Atribuir ranking (1-5 estrelas)
   - Extrair exemplo concreto da comunidade ou do plugin cache
   - Redigir entrada seguindo template
6. Cross-reference: cada eixo deve ter pelo menos 1 item ⭐⭐⭐⭐⭐
7. Self-review antes de entregar

### 4.4. Custos

| Recurso | Custo |
|---------|-------|
| last30days (6 queries) | $0 (Brave free tier + scraping ja pago) |
| WebFetch docs oficiais | tokens de sessao |
| Leitura de plugin cache local | tokens de sessao |
| Consolidacao + write-up | tokens de sessao (Opus 4.7 1M) |
| **Total externo** | **$0** |

Sem chave de API externa paga envolvida.

## 5. Criterios de sucesso

O guia e considerado pronto quando:

1. **Cobertura:** todos os 30 sub-topicos (A1-A4, B1-B5, C1-C5, D1-D5, E1-E12) tem entrada
2. **Ranking:** cada entrada tem estrelas atribuidas com justificativa implicita
3. **Concretude:** cada entrada tem exemplo copiavel (nao pseudo-codigo abstrato)
4. **Quick selector:** index "pra fazer X, usa Y" cobre os 15-20 casos de uso mais comuns do Dayner
5. **Anti-patterns:** secao dedicada com minimo 8 armadilhas reais
6. **Fontes:** links verificaveis para docs oficiais e posts da comunidade citados
7. **Sem placeholders:** zero "TBD", "TODO", "a definir" no documento final

## 6. Riscos e mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| last30days retorna pouca coisa util (comunidade subestimada) | Fallback: leitura direta de docs oficiais + plugin cache local (ja comprovados como fonte rica) |
| Cookies do X expirados (CLAUDE.md global Regra 3) | Queries rodam mesmo sem X; se vier vazio, pular e reportar |
| Ranking ficar subjetivo demais | Ancorar em 3 criterios explicitos (freq + profundidade + opp cost); estrelas com justificativa curta na entrada |
| Guia ficar longo demais pra ser referencia util | TL;DR + Quick selector no topo; corpo pode ser denso pq e consulta, nao leitura linear |
| Informacao desatualizada (Claude Code evolui rapido) | Filtro temporal: priorizar fontes dos ultimos 30 dias (natural do last30days); data de 2026-04-17 no header |

## 7. Plano de execucao (alto nivel)

O plano detalhado sera produzido pelo skill `writing-plans` apos aprovacao
deste spec. Esboco:

1. **Fase 1 — Coleta paralela** (30-60 min): disparar 6 queries last30days em
   background; em paralelo, explorar plugin cache local + WebFetch docs oficiais
2. **Fase 2 — Consolidacao** (30-45 min): ler reports, cruzar fontes, decidir
   ranking item a item
3. **Fase 3 — Escrita** (60-90 min): redigir GUIA_CLAUDE_CODE.md seguindo
   template, secao por secao
4. **Fase 4 — Self-review + entrega** (15 min): rodar check de placeholders,
   contradicoes, completude; ajustar; entregar

## 8. Open questions (resolvidas durante brainstorm)

- ~~Formato?~~ **Cheatsheet referencia (A)** — nao guia sequencial
- ~~Escopo de eixos?~~ **A+B+C+D+E** (sem integracoes externas)
- ~~Ranking?~~ **Sim, 1-5 estrelas, 3 criterios**
- ~~Template de entrada?~~ **exemplo/quando/por que/melhor pra/evitar**
- ~~Fontes?~~ **last30days + docs oficiais + plugin cache local**
- ~~Idioma?~~ **pt-BR com termos tecnicos em en**
- ~~Path do output?~~ **raiz do projeto — `GUIA_CLAUDE_CODE.md`**

## 9. Proximos passos

1. **Dayner revisa este spec** — confirma ou pede ajustes
2. Apos aprovacao, invoco skill `writing-plans` para plano de execucao detalhado
3. Apos plano aprovado, executo fase a fase
