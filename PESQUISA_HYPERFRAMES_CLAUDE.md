# Pesquisa: HyperFrames + Claude Code

**Data:** 2026-04-18
**Janela:** ultimos 30 dias (2026-03-19 -> 2026-04-18)

## Status da pesquisa
completa

## TL;DR
HyperFrames (heygen-com/hyperframes, v0.4.3, lancado ~1 mes atras, 2.8k stars) **e genuinamente agent-first** — shipa 3 slash commands nativas pro Claude Code (`/hyperframes`, `/hyperframes-cli`, `/gsap`) e o proprio launch video da HeyGen foi feito com ele. Porem, em 2026-04-18 **nao existe um unico case study publico de criador de conteudo independente** que tenha substituido Remotion por HyperFrames em producao de YouTube. Bugs criticos (audio double-play, font 404, Chromium 147 quebrando o engine default) foram merged na propria semana do launch, indicando framework ainda endurecendo. A referencia canonica "Claude Code + video em uma tarde" (Tim McAllister, Medium) usa **Remotion**. Recomendacao: manter Remotion no MVP de `video-overlays`, abrir ADR "reavaliar em Q3/2026" pos-v0.5 + 3-5 case studies publicos.

## Casos encontrados

### 1. HeyGen Launch Video (oficial, dogfooding)
- Link: https://github.com/heygen-com/hyperframes-launch-video
- Data: commits ao redor do launch (meados de abril 2026; v0.4.3 em 2026-04-17)
- Autor: HeyGen (vanceingalls, miguel-heygen, jrusso1020, ukimsanov)
- O que fez: video de launch de 49.77s em 1920x1080@30fps, composto de 17 sub-composicoes (glass intro, drop-in montage, thesis, CTA, engine sequences). 100% HTML.
- Stack: HyperFrames (npx), GSAP, Lottie, WebGL shaders, Three.js, ElevenLabs (VO), Seedance (talent insert). Node 22+ e FFmpeg como unicas deps runtime.
- Resultado: repo publico como "worked example". Storyboard.md e Script.md documentam direcao criativa. NAO ha retrospectiva publica de render time ou horas gastas.
- Friccoes: nao documentadas no repo publico.

### 2. HyperFrames shipa skills nativas de Claude Code
- Link: https://github.com/heygen-com/hyperframes e https://hyperframes.heygen.com/guides/prompting
- Data: release 0.4.3 (2026-04-17). Skills existem desde o launch publico.
- Autor: HeyGen
- O que fez: o proprio framework e explicitamente "agent-first". Ships 3 slash commands:
  - `/hyperframes` — autoria de composicoes
  - `/hyperframes-cli` — ajuda de CLI
  - `/gsap` — orientacao de animacao
- Stack: HTML + data-attrs + GSAP + Puppeteer + FFmpeg. Zero React / zero DSL proprietaria.
- Resultado: funciona com Claude Code, Cursor, Gemini CLI, Codex. Workflow tipico: `npx hyperframes init my-video` -> abrir no Claude Code -> prefixar prompt com `/hyperframes`.
- Friccoes: docs instruem "restart session after installing" e "always prefix HyperFrames prompts with /hyperframes to load skill context explicitly" — sinal de que skill nao e auto-detectada.

### 3. Issue #294 — instalacao falhou no OpenClaw (ARM64/Linux)
- Link: https://github.com/heygen-com/hyperframes/issues/294
- Data: 2026-04-16 (closed)
- Autor: niyogi
- O que fez: tentou usar HyperFrames em stack OpenClaw (Linux ARM64 + Chromium 147). Quebrou com `Protocol error (HeadlessExperimental.beginFrame): 'HeadlessExperimental.beginFrame' wasn't found`.
- Stack: Chromium 147 removeu suporte ao protocol `HeadlessExperimental.beginFrame` que o engine usa por default.
- Resultado: workaround imediato `PRODUCER_FORCE_SCREENSHOT=true`. Fix permanente no upstream mudou default pra `forceScreenshot: true`.
- Friccoes: alta — quebrou em ambiente "vizinho" (OpenClaw). Importante pra WSL/Linux: Puppeteer + Chromium moderno = superficie de bugs real. Nao ha mencao explicita a Claude Code no issue.

### 4. Comparacao Opus 4.7: HyperFrames vs Remotion (Misbah Syed, X)
- Link: https://x.com/MisbahSy/status/2044867370733478229
- Data: abril 2026 (post do launch week)
- Autor: Misbah Syed
- O que fez: passou o mesmo prompt pro Claude Opus 4.7 em HyperFrames e em Remotion, renderizou os dois, publicou lado-a-lado perguntando "qual e melhor?"
- Stack: Claude Opus 4.7 + HyperFrames + Remotion
- Resultado: post fez a pergunta sem dar veredicto definitivo. (Tweet nao fetcho via WebFetch/403; conteudo vem do cache do search.)
- Friccoes: nao documentadas no tweet.

### 5. "HyperFrames: HTML to MP4 AI Video Generation [92/100]" (YouTube)
- Link: https://www.youtube.com/watch?v=09DB0Wr071U
- Data: abril 2026 (pos-launch)
- Autor: canal nao capturado (YouTube 403 pra WebFetch)
- O que fez: walkthrough/review do framework
- Stack: HyperFrames + provavelmente Claude Code (score 92/100 sugere review estruturado)
- Resultado: video publicado, nao foi possivel extrair numeros exatos.
- Friccoes: N/D sem conseguir ver a transcricao.

### 6. Tim McAllister — "How I Added AI Video Production to Claude Code in One Afternoon" (Medium, marco 2026)
- Link: https://medium.com/@emergentcap/how-i-added-ai-video-production-to-claude-code-in-one-afternoon-9edcb68853aa
- Data: marco 2026
- Autor: Tim McAllister (@emergentcap)
- O que fez: conectou Claude Code a um pipeline de video; Claude escreve composicoes React, gera render props, chama ElevenLabs pra VO, e shella pro CLI do framework de renderizacao.
- Stack: **Remotion** (NAO HyperFrames) + ElevenLabs + Claude Code
- Resultado: publicado como tutorial; case study que virou referencia pra "Claude Code + Remotion" stack.
- Friccoes: N/D (pagina nao fetchable diretamente, 403).
- **Importante:** este artigo e do Tim e sobre **Remotion**, nao HyperFrames. Quando HyperFrames lancou em abril, o Tim ja tinha o pipeline em Remotion rodando ha ~1 mes. Ninguem publicou ainda um "afternoon" equivalente com HyperFrames.

### 7. Rohan Paul / Nelly — anuncio de launch no X
- Links: https://x.com/rohanpaul_ai/status/2044851401118138572 e https://x.com/nrqa__/status/2044891741778772463
- Data: abril 2026 (launch day)
- Autor: influenciadores de AI/dev
- O que fez: divulgaram o launch, enfatizando o workflow "describe what you want -> agent writes HTML/CSS/JS -> HyperFrames produces MP4"
- Stack: implicita (HyperFrames + agent generico)
- Resultado: alto engajamento no launch week (tweets com >2k interacoes).
- Friccoes: nao documentadas em hypes de launch.

## Friccoes tecnicas recorrentes

1. **Chromium modernos quebram o engine default.** Issue #294 mostra que Chromium 147 removeu `HeadlessExperimental.beginFrame` — o protocol que o capture engine usa. Fix upstream mudou o default pra screenshot mode, mas quem esta em stacks "exoticas" (ARM64, containers custom, WSL com Chromium system-wide) vai bater nisso ate atualizar pra >= 0.4.3.
2. **Skill nao auto-carrega no Claude Code.** Docs oficiais avisam: "restart session after installing" e "always prefix HyperFrames prompts with /hyperframes to load the skill context explicitly". Ou seja, nao e plug-and-play — sem o prefixo a skill nao entra no contexto.
3. **PRs de bug heavy no launch week.** Entre 2026-04-16 e 2026-04-18 foram merged fixes em: double-audio scaffolding (#299), single-owner audio (#298), silent-first-play (#293), font-load 404s (#313), CRF/bitrate controls (#292). Indica que o framework ainda esta endurecendo — audio, loading e encoder defaults tiveram bugs em producao no proprio launch.
4. **Puppeteer + WSL = historico ruim.** Embora nao haja issue especifico do HyperFrames no WSL, o Puppeteer tem historico documentado de problemas em WSL (libnss3, --no-sandbox, etc). HyperFrames herda esses problemas por depender de Puppeteer.
5. **Ausencia de case study de YouTuber usando HyperFrames em producao.** Tim McAllister, que e a referencia canonica de "afternoon video pipeline com Claude Code", usa Remotion — NAO HyperFrames. Nenhum equivalente com HyperFrames foi publicado ate 2026-04-18.

## Benchmark render time

**Dado oficial (do docs):** "You can create, preview, and render your first Hyperframes video in under two minutes." (Quickstart). Nao especifica duracao do video nem resolucao — provavelmente e um quickstart curto (<15s).

**Dados independentes:** ZERO. Nenhum benchmark publico de render time para 1min @ 1080p@30fps foi localizado nos ultimos 30 dias. O launch video oficial tem 49.77s @ 1080p30 mas o repo nao documenta tempo total de render.

**Estimativa inferencial:** como o engine e Puppeteer (captura frame a frame via CDP) + FFmpeg, render time e aproximadamente `duracao_video * N_seconds_per_frame * fps`. Para 1min@30fps = 1800 frames; se Puppeteer captura a ~10 fps (otimista em headless + compositing custoso), seriam ~3min real. Em CPU fraca (Iris Xe que o Dayner tem), mais proximo de 5-8min. Isso e **estimativa, nao benchmark publicado**.

## Comparacao com Remotion

| Dimensao | HyperFrames (v0.4.3) | Remotion (maduro) |
|---|---|---|
| Paradigma | HTML + data-attrs + GSAP | React + TSX components |
| Agent-first | **Sim** (3 skills nativas no Claude Code) | Parcial (doc pagina dedicada a Claude Code, mas sem skills nativas) |
| Maturidade | ~1 mes publico, v0.4.3, 2.8k stars, 5 contribs | anos de producao, ecossistema grande |
| Dep runtime | Node 22+ + FFmpeg | Node + FFmpeg + Chromium |
| Case studies YT | Nao encontrado | Tim McAllister, Brendan Jowett (ja no SINTESE 16.1 do projeto) |
| Bugs criticos ativos | Sim — audio, font 404, encoder defaults (merged no launch week) | Estavel |
| Windows/WSL | Risco (Puppeteer + Chromium 147 bugs) | Risco (mas mais workarounds documentados) |
| Curva de aprendizado | Baixa (HTML/CSS) | Media (React) |
| Fit com skill `/video-overlays` do projeto | Teorico alto; pratica nao validada | Ja validada na SINTESE 16.1 |

**Veredicto do ecossistema (ate 2026-04-18):** Remotion ainda ganha em producao. HyperFrames ganha em "velocity agent-first" mas falta prova social e maturidade de encoder.

## Respostas as 6 perguntas criticas

1. **Alguem ja combinou HyperFrames + Claude Code publicamente?**
   Sim, MAS quase exclusivamente o time da HeyGen (launch video) + launch marketing no X (Rohan Paul, Nelly, Misbah Syed). UM video no YouTube ("HyperFrames: HTML to MP4 AI Video Generation [92/100]"). NAO ha case study de criador de conteudo independente que gravou um video de producao real ainda.
2. **Top 3 friccoes tecnicas?**
   (1) Chromium 147+ quebra engine default (issue #294). (2) Skill nao auto-carrega no Claude Code, precisa prefixar `/hyperframes`. (3) Audio/font/encoder bugs merged no proprio launch week indicam framework ainda endurecendo.
3. **Tempo de render 1 min 1080p?**
   Nao publicado. Estimativa inferencial: 3-8 minutos em hardware medio. Quickstart promete "under 2 minutes" mas sem especificar duracao nem resolucao.
4. **Casos em Windows/WSL?**
   Nenhum caso especifico confirmado ate 2026-04-18. Risco herdado do Puppeteer + Chromium (historico ruim em WSL, agravado pelo bug CDP do Chromium 147).
5. **Comparado com Remotion — qual ganhou?**
   Misbah Syed publicou comparacao side-by-side com Opus 4.7 mas deixou em aberto. No ecossistema, **Remotion ainda vence** em maturidade, case studies publicos, e fit com stacks Windows. HyperFrames vence em "agent-first" se voce ja esta all-in em Claude Code.
6. **Videos YouTube inteiros feitos com HyperFrames existem?**
   UM video publico confirmado (id 09DB0Wr071U, review do framework). NAO ha canal de criador que adotou HyperFrames como pipeline primario e publicou uma serie de videos — ate 2026-04-18, cedo demais.

## Gaps da pesquisa

- Nao consegui fetchar Medium, X, YouTube (todos 403). Dados vem do snippet dos search engines.
- Nao verifiquei HN item 47797513 diretamente ("Render Video from HTML via Chrome's BeginFrame API") — provavel que seja o launch HN post mas 403.
- Sem benchmarks publicados de render time. Unica pista e "under 2 minutes" no quickstart.
- Nao ha thread em r/ClaudeAI ou r/LocalLLaMA sobre HyperFrames ate a data desta pesquisa.
- GitHub issue search so retornou PRs, nao issues — possivel que issues reais existam mas nao foram filtradas pela query dada.

## Recomendacao final

**Nao substituir Remotion por HyperFrames na skill `video-overlays` agora.** HyperFrames e promissor e genuinamente agent-first (3 skills nativas no Claude Code, HTML em vez de React reduz atrito pro Dayner), mas tem 3 red flags pra adopcao em producao YouTube hoje: (1) framework com ~1 mes publico e bugs de audio/font/encoder merged no proprio launch week; (2) ambiente ARM64 ja quebrou (issue #294) e Windows/WSL e risco documentado via Puppeteer; (3) **zero** case studies de YouTuber independente publicando video real feito com HyperFrames — a SINTESE_ARQUITETURAL 16.1 ja escolheu Remotion com base em Brendan Jowett e Tim McAllister, ambos em producao. Caminho pragmatico: manter Remotion como baseline no MVP de `video-overlays`, abrir um ADR "reavaliar HyperFrames em 2026-Q3" apos v0.5+ e 3-5 case studies publicos, e rodar um spike de 2h gerando um snippet test (ex: lower-third animado) so pra comparar DX com Claude Code inline — sem reescrever o pipeline.
