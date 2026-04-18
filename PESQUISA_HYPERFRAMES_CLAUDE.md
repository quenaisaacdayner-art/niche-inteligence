# Pesquisa: HyperFrames + Claude Code

**Data:** 2026-04-18
**Janela:** ultimos 30 dias (2026-03-19 -> 2026-04-18)

## Status da pesquisa
em andamento (fase final)

## TL;DR
(preencher no fim)

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
(pendente)

## Benchmark render time
(pendente)

## Comparacao com Remotion
(pendente)

## Respostas as 6 perguntas criticas
1. Alguem ja combinou HyperFrames + Claude Code publicamente?
2. Top 3 friccoes tecnicas?
3. Tempo de render 1 min 1080p?
4. Casos em Windows/WSL?
5. Comparado com Remotion — qual ganhou?
6. Videos YouTube inteiros feitos com HyperFrames existem?

## Gaps da pesquisa
(pendente)

## Recomendacao final
(pendente)
