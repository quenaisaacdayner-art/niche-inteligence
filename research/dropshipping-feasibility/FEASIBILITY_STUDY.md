# Estudo de viabilidade — dropshipping ML/Shopee como MEI

**Data:** 2026-04-30
**Autor:** Claude Code (coleta sistemática) + critérios definidos pelo Dayner
**Branch:** `claude/dropshipping-feasibility-study-lJATd`
**Sources:** ver `sources.md`

---

## TL;DR (decisão)

**NO-GO** em ambas as plataformas com a configuração atual (MEI único,
capital R$ 3k, 4 meses até primeiro lucro, risco de suspensão tolerável =
baixo).

- **Shopee:** proibição literal e ativa desde out/2024. Risco de
  banimento alto. Quebra critério de risco.
- **Mercado Livre:** dropshipping permitido com restrições, mas margem
  base realista (3 a 8%) fica abaixo do mínimo de 15% definido. Quebra
  critério de margem.

A única configuração que poderia passar nos critérios é
**dropshipping nacional em ML com fornecedor parceiro de volume +
ticket médio acima de R$ 250 + nicho de baixa concorrência** —
inviável com R$ 3k de capital e prazo de 4 meses.

**Recomendação alternativa (fora do escopo do estudo, levantada como
ramificação):** se quiser testar e-commerce sem queimar o CNPJ da
agência, abrir CNPJ separado (ME ou MEI dedicado se atividade permitir)
para isolar o risco — mas a tese econômica continua frágil.

---

## 1. Critérios de decisão (travados antes da pesquisa)

| # | Critério | Valor mínimo aceitável |
|---|----------|------------------------|
| 1 | Margem líquida sobre receita bruta (após reforma tributária 2026) | ≥ 15% |
| 2 | Capital máximo a queimar testando | ≤ R$ 3.000 em 90 dias |
| 3 | Tempo até primeiro lucro mensal positivo | ≤ 4 meses |
| 4 | Risco de suspensão de conta tolerável | Baixo (CNPJ é o mesmo da agência) |

Qualquer cenário que falhe em **um** critério → no-go. O critério 4 é o
mais restritivo: como o MEI é único e a agência depende dele, suspensão
contamina o negócio principal.

---

## 2. Camada 1 — Política atual (literal)

### 2.1 Tabela comparativa ML × Shopee

| Dimensão | Mercado Livre | Shopee |
|----------|---------------|--------|
| **Status do dropshipping** | Permitido com restrições. Não há proibição explícita; há regras operacionais que filtram modelos incompatíveis. | **Proibido explicitamente** desde out/2024. Comunicado oficial no Centro de Educação ao Vendedor (art. 14637) e nas Regras do Vendedor. |
| **Definição operacional da plataforma** | "Vendedor é responsável pela entrega do produto ao comprador, dentro do prazo prometido no anúncio. Você precisa garantir que seu fornecedor poste o item dentro do prazo." (parafraseado de fonte secundária citando o ML; redação literal pendente — fetch 403) | "Vendedores devem ter estoque próprio e cuidar diretamente das práticas de envio, anúncios e atendimento ao consumidor." (parafraseado; redação literal pendente) |
| **Fornecedor internacional** | **Vetado**: "no Mercado Livre não é possível vender sem estoque usando fornecedores de fora do Brasil. Você precisa cadastrar o endereço do seu fornecedor como remetente; ele precisa estar no Brasil e você só pode trabalhar com um fornecedor de cada vez." | Vetado por extensão (qualquer dropshipping é). |
| **Logística obrigatória** | Mercado Envios obrigatório (a etiqueta sai do sistema do ML; exige que o fornecedor aceite postar usando essa etiqueta). | Logística Shopee própria; vendedor deve postar diretamente. |
| **Nota fiscal** | Obrigatória para todo envio (MEI, ME, etc.). CFOP 5120/6120 (venda à ordem) para dropshipping nacional. | Obrigatória. |
| **Penalidades** | Suspensão por padrão de comportamento: atrasos, cancelamentos, reclamações, baixa reputação. Suspensão direta por "ser dropshipper" não é o mecanismo — o mecanismo é o resultado operacional. | Pontos de penalidade → remoção de frete grátis → congelamento de anúncios → banimento permanente. |
| **Recurso** | Possível recorrer na plataforma e judicializar (JEC). | Recurso interno limitado; histórico de banimento sem reversão em fóruns. |
| **Fonte** | mercadolivre.com.br/ajuda/1004 + mercadopago.com.br/ajuda/40184 (oficial, fetch 403); fontes secundárias datadas em 2026-04-30 | seller.shopee.com.br/edu/article/14637 (oficial, fetch 403); confirmado por múltiplas fontes secundárias citando publicação out/2024 |

### 2.2 Como cada plataforma "detecta" dropshipping

Mesmo no ML onde é permitido, o que faz o vendedor cair em malha fina é
o **rastro operacional do dropshipping**, não o modelo em si:

- Prazo de postagem ultrapassando o limite (fornecedor demora pra despachar)
- Taxa de cancelamento elevada (fornecedor sem estoque)
- Endereço do remetente diferente do CNPJ do vendedor (sem cadastro como fornecedor)
- Reclamações recorrentes sobre "produto diferente do anunciado" (fornecedor manda outra coisa)
- NF emitida com CFOP errado ou ausência de NF

Na Shopee, qualquer um dos sinais acima soma pontos de penalidade — e a
proibição explícita dá à Shopee um gatilho discricionário pra banir
mesmo se o vendedor estiver entregando bem.

### 2.3 Gap TOS vs enforcement (limitação aceita)

Sem dado estatístico público sobre frequência de suspensão por
dropshipping. Sinais qualitativos consistentes em fóruns/Reclame Aqui:

- ML: suspensões reportadas são em geral por reputação, não por
  "modelo de negócio". Dropshippers nacionais com fornecedor estável
  reportam contas estáveis há anos.
- Shopee: relatos de banimento sem aviso aumentaram pós out/2024.
  Recurso raramente reverte.

---

## 3. Camada 3 — Mudanças regulatórias 2026 (timeline)

| Data | Evento | Impacto pro dropshipper MEI |
|------|--------|------------------------------|
| **2025-04-01** | ICMS sobre compras internacionais sobe de 17% pra 20% em estados que aderiram | Dropshipping internacional fica mais caro. Não afeta ML (que veta fornecedor internacional). |
| **2026-01-01** | Início da reforma tributária. Empresas Lucro Real/Presumido começam com alíquotas simbólicas (CBS 0,9%, IBS 0,1%). MEI/Simples Nacional **dispensados em 2026**. | **Neutro pro MEI em 2026.** Nenhuma obrigação adicional. |
| **2026-03-17** | Câmara aprova regime de urgência pro PLP 108/2021 (430 votos a favor, 0 contra) | Sinaliza alta probabilidade de aumento do teto MEI ainda em 2026, mas vigência depende de votação plenário + sanção + DOU. |
| **2026-09-01 a 2026-09-30** | Janela de opção de regime tributário pra 2027 (Simples Nacional puro vs Simples Híbrido vs Regime Regular) | **Decisão crítica pra dropshipper que vende B2B**: comprador PJ prefere fornecedor com IBS/CBS no regime regular pra ter direito a crédito. Pra venda direta a consumidor (caso típico do dropshipper em marketplace), Simples puro continua melhor. |
| **2027-01-01** | Simples Nacional passa a ter que reportar CBS/IBS (em modo simbólico ainda); regime escolhido em set/2026 entra em vigor | Aumento de complexidade fiscal. MEI continua com DAS fixo, mas obrigações acessórias mudam. |
| **Pendente** | Sanção do PLP 108/2021 elevando teto MEI pra R$ 130k (Senado) ou R$ 144,9k (Câmara) | Se sancionado, dá fôlego pro dropshipper crescer dentro do MEI. **Não confirmado ainda.** |

### 3.1 Programa Remessa Conforme (importação)

- Compras até US$ 50: **20% de Imposto de Importação + ICMS 17–20%**
- Compras acima de US$ 50: **60% de II (com desconto fixo de US$ 20) + ICMS**

Isso já está em vigor. Como o ML veta fornecedor internacional pra
dropshipping, o impacto recai apenas sobre operações fora dos
marketplaces grandes (loja própria com Shopify importando do
AliExpress, etc.). **Não afeta o cenário em estudo.**

---

## 4. Camada 4 — Operacional pro MEI

### 4.1 NF de dropshipping (legalmente correto)

Operação chamada **"venda à ordem"** ou triangulação. 3 NFs:

1. Lojista (MEI) emite NF de venda pro consumidor final, **CFOP 5120**
   (intra-estado) ou **6120** (interestadual), com CRT 4 (MEI), e
   menciona nos dados adicionais: "produto a ser entregue pelo fornecedor
   X, CNPJ Y".
2. Fornecedor emite NF simbólica de venda pro lojista (CFOP 5118 / 6118).
3. Fornecedor emite NF de remessa pro consumidor final (CFOP 5923 / 6923),
   indicando entrega "por conta e ordem" do lojista.

**Pré-requisito:** o fornecedor precisa cooperar com triangulação. Nem
todo fornecedor brasileiro emite NF nesse modelo — muitos só emitem NF
de venda direta. Se o fornecedor recusa, a operação não pode ser
legalizada como dropshipping; o lojista teria que ter estoque ou
operar irregularmente.

### 4.2 Atividades MEI compatíveis

MEI pode operar como:
- Comerciante varejista (vários CNAEs específicos por categoria)
- E-commerce em geral (CNAE 4781, 4782, 4789 etc.)

A atividade "dropshipping" não existe como CNAE separado. O MEI registra
o CNAE da categoria do produto vendido (roupas, eletrônicos, etc.).
**Restrição prática:** se o dropshipper vende múltiplas categorias
(roupa + eletrônicos + casa), pode estar operando fora do CNAE
declarado, o que é vulnerabilidade fiscal.

### 4.3 Margem mínima sobrevivente

Premissas comuns aos 3 cenários:
- Plataforma: Mercado Livre (Shopee é no-go por proibição)
- Anúncio Clássico (comissão 10–14%, escolho **13% como base**)
- DAS MEI 2026: R$ 76,90/mês fixo (≈ R$ 3 por venda assumindo 25 vendas/mês)
- MEI dentro do teto R$ 81k/ano (sem migração pra ME)
- Frete via Mercado Envios Flex (vendedor paga parte; assumir R$ 15 médio
  por envio depois do subsídio)
- Sem custos de Mercado Ads (otimista) ou com 7–10% (base/pessimista)
- Sem armazenagem (modelo dropshipping puro)
- Embalagem/etiqueta: R$ 3
- Devoluções: 3% (otimista), 5% (base), 8% (pessimista)

#### Cenário OTIMISTA — produto único, ticket alto, fornecedor parceiro

| Item | Valor |
|------|-------|
| Preço venda | R$ 300 |
| Custo produto (fornecedor com volume) | R$ 150 |
| Comissão ML 13% | R$ 39 |
| Frete Flex (assumindo Flex em SP) | R$ 10 |
| DAS proporcional | R$ 3 |
| Embalagem | R$ 3 |
| Devoluções 3% (média ponderada) | R$ 9 |
| Mercado Ads | R$ 0 (orgânico) |
| **Custo total** | **R$ 214** |
| **Líquido por venda** | **R$ 86** |
| **Margem** | **28,7%** |

Passa o critério (≥15%). Mas requer: nicho com pouca concorrência,
fornecedor que dá desconto de 50% no MSRP (improvável sem volume), e
tráfego orgânico (sem Ads). **Realista? Possível, mas raro pra
iniciante.**

#### Cenário BASE — produto comum, ticket médio, sem volume

| Item | Valor |
|------|-------|
| Preço venda | R$ 150 |
| Custo produto (sem volume, margem do fornecedor) | R$ 95 |
| Comissão ML 13% | R$ 19,50 |
| Frete Flex | R$ 15 |
| DAS proporcional | R$ 3 |
| Embalagem | R$ 3 |
| Devoluções 5% | R$ 7,50 |
| Mercado Ads 7% | R$ 10,50 |
| **Custo total** | **R$ 153,50** |
| **Líquido por venda** | **−R$ 3,50** |
| **Margem** | **−2,3%** |

**Falha o critério.** Cenário típico do MEI iniciante: sem volume com
fornecedor, dependente de Ads pra ranquear. Operação queima dinheiro.

#### Cenário PESSIMISTA — produto comoditizado, alta concorrência

| Item | Valor |
|------|-------|
| Preço venda | R$ 80 (faixa de taxa fixa R$ 6) |
| Custo produto | R$ 50 |
| Comissão ML 13% | R$ 10,40 |
| Taxa fixa abaixo R$ 79? Não (preço = R$ 80) | R$ 0 |
| Frete Flex | R$ 12 |
| DAS proporcional | R$ 3 |
| Embalagem | R$ 3 |
| Devoluções 8% | R$ 6,40 |
| Mercado Ads 10% | R$ 8 |
| **Custo total** | **R$ 92,80** |
| **Líquido por venda** | **−R$ 12,80** |
| **Margem** | **−16%** |

**Falha catastroficamente.** Tipo de produto que comoditiza rápido
(acessórios genéricos importados, gadgets) dá perda direta.

### 4.4 Sensibilidade

Pra atingir margem ≥15% no cenário base, qualquer um:
- Reduzir custo de produto pra R$ 75 (precisa volume com fornecedor)
- Subir preço pra R$ 200 (precisa nicho menos competitivo)
- Cortar Mercado Ads e ganhar tráfego orgânico (precisa reputação alta, leva 6–12 meses)

Nenhum desses está acessível pro perfil do estudo (MEI recém-formalizado,
R$ 3k de capital, 4 meses até lucro).

---

## 5. Avaliação contra os critérios

| Critério | Valor mínimo | ML cenário base | Shopee | Veredicto |
|----------|--------------|-----------------|--------|-----------|
| 1. Margem ≥ 15% | Sim | −2,3% | N/A (proibido) | **FALHA em ambas** |
| 2. Capital ≤ R$ 3k em 90d | R$ 3.000 | Possível operar com R$ 3k em SKUs (aprox 20–30 unidades de teste), mas com margem negativa o capital queima rápido | N/A | Capital tecnicamente cabe, mas vai virar perda |
| 3. Lucro ≤ 4 meses | 4 meses | Improvável: ranquear no ML leva 3–6 meses; reputação verde leva ~90 dias mínimos; margem negativa não vira no curto prazo sem subir ticket ou fornecedor | N/A | **FALHA** |
| 4. Risco suspensão baixo | Baixo | ML: médio (depende de operação; CNPJ único agrava). Shopee: **alto** (proibição explícita) | Alto | **FALHA na Shopee, MÉDIO no ML** |

3 dos 4 critérios falham. A combinação "MEI único + agência principal + 
capital baixo + dropshipping" é estruturalmente incompatível com os
critérios travados.

---

## 6. Pior cenário factível em 12 meses

1. Banimento na Shopee 30 dias após começar (é proibido; só uma denúncia
   ou uma reclamação do comprador detona).
2. Suspensão do ML por padrão de atrasos do fornecedor — CNPJ MEI fica
   marcado, agência usa esse mesmo CNPJ pra nota dos clientes.
3. Cliente da agência pede NF e CNPJ aparece com restrição → quebra de
   confiança, perda de cliente.
4. Capital R$ 3k vira R$ 0 em 60–90 dias (cenário base com margem
   negativa).
5. Tempo gasto: 3–4h/dia gerenciando atrasos e SAC — tempo que sai da
   agência (atividade principal e mais lucrativa).

**Custo de oportunidade real >>> R$ 3.000 nominais.**

---

## 7. Decisão final

**NO-GO** em ambas plataformas com a configuração atual.

### Quando reabrir o caso

- Capital disponível ≥ R$ 15k pra travar SKUs com fornecedor (deixa de
  ser dropshipping puro, vira estoque pequeno)
- CNPJ da agência separado do CNPJ de e-commerce (isola risco; pode ser
  ME se atividade exigir)
- Nicho com ticket > R$ 250 e fornecedor parceiro confirmado em
  triangulação NF
- Sanção do PLP 108/2021 (R$ 130k+) confirmada — dá margem operacional

### O que NÃO mudaria a decisão

- Mudanças marginais nas comissões do ML (matematicamente irrelevantes
  no cenário base)
- Reforma tributária 2026 (MEI dispensado; só vira fator em 2027)
- Aumento do teto MEI (não muda margem unitária; só estende por quanto
  tempo se opera dentro do regime simplificado)

### Próximo passo, se quiser pivotar

Em vez de dropshipping, considerar:
1. **Affiliate marketing** dos produtos da agência (zero estoque, zero
   risco de plataforma, alavancagem da audiência)
2. **Produto digital próprio** (margem ~80%, sem CNAE específico
   problemático, escalável)
3. **Curadoria/comissão B2B** (você indica fornecedor pros clientes da
   agência, fornecedor te paga comissão — sem operar logística)

Esses caminhos preservam o foco na agência e usam o que você já tem
(audiência + relacionamento), em vez de competir num jogo de margem
fina onde dropshippers profissionais com volume já dominam.
