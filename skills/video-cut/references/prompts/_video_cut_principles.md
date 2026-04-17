# Principios invariaveis do video-cut

Estes 7 principios governam TODAS as decisoes da skill video-cut.
Todo prompt especifico (retake_detection.md, manifest_builder.md) comeca
com "Ler `_video_cut_principles.md` primeiro".

## 1. ROTEIRO E LEI, TRANSCRIPT E VERDADE

Intencao vem do roteiro marcado (schema v2: `[BLOCO N] {act: ...}`).
Timestamps reais vem do whisper. Fuzzy match por frase-ancora
(`anchor_start` / `anchor_end`) reconcilia os dois espacos.

Quando ha conflito entre intencao do roteiro e o que foi dito de fato
(Dayner improvisou, esqueceu uma frase, falou de forma diferente):
transcript manda. Roteiro e mapa, nao GPS.

## 2. CONSERVADOR EM DUVIDA

Retake em duvida = MANTEM no output. O editor visual resolve via
aprovacao humana. Nunca corta silenciosamente algo ambiguo.

Regra concreta: se confidence do retake/filler < 0.85, ainda emite no
JSON com confidence baixa. Editor destaca em cor diferente (amarelo).
Dayner decide.

## 3. SILENCIO E COMANDO DE CORTE

Silencio > 3s = Dayner deliberadamente pulando tempo morto. Emite como
gap.json sempre. Dayner pode rejeitar no editor se for pausa dramatica
intencional.

Silencio < 3s = respiracao / pausa natural de fala. NAO corta.

## 4. MASTER NAO SE REENCODA

A skill so escreve JSONs de sugestao. Nao encoda video, nao aplica
cortes, nao gera body.mp4. O compose real e do MVP Editor
(`tooling/editor/backend/services.py::build_compose_ffmpeg_args`).

Se voce esta tentado a rodar ffmpeg -c:v libx264 em algum lugar, pare.
Esta fora do escopo.

## 5. FALHA VISIVEL > FALHA SILENCIOSA

Match com baixa confianca, cortes duvidosos, roteiro em v1 (sem `{act}`),
invariante de duracao quebrada, arquivo faltando: reporta no stderr com
destaque. Stdout fica reservado pra JSON machine-readable.

Nunca esconder um problema pra "nao incomodar". Se algo esta errado,
o Dayner tem que saber antes de abrir o editor.

## 6. CONTEXTO DO DAYNER SEMPRE APLICADO

Ler `config/my-context.md` antes de decisoes semanticas (que palavras
conta como filler, o que e retake legitimo, qual a voz natural). Ao
final de cada output, adicionar bloco `[Context applied: ...]`
explicitando COMO o contexto do Dayner moldou a decisao.

Insights genericos que servem pra "qualquer criador" = re-fazer.

## 7. IMPROVISO BOM != RETAKE RUIM

Dayner improvisa em cima do roteiro. Nem toda fala fora-do-roteiro e
ruim. Heuristica:

- Fora-do-roteiro + repete em ±30s = retake (corta o primeiro, MANTEM
  a versao que soou melhor; confidence alta).
- Fora-do-roteiro + unico + conecta ao bloco anterior ou seguinte =
  improviso bom -> MANTEM + marca `off_script_review` conservador
  (editor destaca em roxo pra humano validar, mas NAO remove
  silenciosamente).
- Fora-do-roteiro + longo/hesitante + desconectado = ainda nao corta
  sozinho. Emite `off_script_review` com confidence media. Editor decide.

**Regra de ouro do principio 7:** na duvida, marca pra revisao. Nunca
corta improviso que pode estar bom.
