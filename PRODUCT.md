# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

HTML/CSS/JavaScript estático, arquivo único (`index.html`) autocontido — D3 v7,
CSS, JS e os dados (JSON) todos embutidos, para abrir por `file://` sem servidor.
Escolha derivada do pedido explícito do usuário ("dashboard interativo em html").
Um pipeline Python separado (`scripts/`) rebaixa e reprocessa os PDFs da fonte e
regenera os dados; `scripts/build_html.py` reinjeta o JSON no `index.html`.

## Users

Público técnico de economia agrícola, sem um caso de uso dominante:

- Thiago e colegas do Departamento de Economia da UFV, explorando a dinâmica de
  preços dos hortigranjeiros da CeasaMinas para análise e preparação de relatórios.
- Analistas de abastecimento e política agrícola (perfil CONAB / gestão pública)
  acompanhando inflação de alimentos no atacado.
- Produtores e atacadistas que já consomem os informes do IPH e querem série
  histórica navegável em vez de PDFs soltos.

## Product Purpose

Transformar os boletins mensais e informes semanais do **IPH CeasaMinas-UFV**
(Índice de Preços de Hortigranjeiros), hoje publicados como dezenas de PDFs
avulsos em `ceasaminas.com.br/indiceufvgeral.asp`, em um painel único e navegável
da série histórica. O painel deixa escolher um produto e ver sua trajetória de
preço (R$/kg), variação mês a mês, variação acumulada e variação anual quando
existe; e acompanhar o índice agregado (IPH + 3 grupos + 6 subgrupos) em ritmo
mensal e semanal. Sucesso: qualquer um dos públicos acima responde "como o preço
de X se comportou" e "o que puxou o índice neste mês" em segundos, sem abrir PDF.

## Positioning

Primeira visão consolidada e interativa da série do IPH CeasaMinas-UFV. A fonte
oficial só oferece PDFs individuais (um boletim por mês, um informe por semana),
sem nenhuma ferramenta de série histórica, comparação ou busca por produto. Não
há concorrente direto; o valor é ser a camada de exploração que a fonte não tem.

## Operating Context

- Fonte: `https://www.ceasaminas.com.br/indiceufvgeral.asp`. Base metodológica nas
  Notas Metodológicas do IPH e no marco dezembro/2024 = 100 (número-índice).
- Preços = média do atacado no entreposto de **Contagem-MG**, coleta às segundas,
  quartas e sextas; semana de referência de quinta a quarta.
- Cesta de **58 produtos** (frutas, hortaliças e ovos) que representam ~97% do
  volume comercializado entre 2021 e 2023.
- Uso esperado: análise solo no navegador e projeção ao vivo em reunião. O arquivo
  precisa funcionar offline (duplo clique), porque os PDFs da fonte não são
  acessíveis via navegador (sem CORS) e a conexão em reunião nem sempre existe.
- Atualização manual: quando a CeasaMinas publica novos boletins/informes, roda-se
  `fetch_pdfs.py` → `parse_pdfs.py` → `build_html.py`.

## Capabilities and Constraints

- **Granularidade assimétrica, imposta pela fonte:** dado por produto é **mensal**
  (Apêndice Tabela A1 de cada boletim: preço no início e no fim do mês + variação).
  Dado **semanal** existe só no nível de índice/grupo/subgrupo — a fonte nunca
  publica preço semanal por produto. O painel não inventa preço semanal por produto.
- **Série curta:** boletins mensais desde jun/2025; informes semanais desde
  jul/2025. "Variação anual" (12 meses) por produto só é real para os meses com
  par ano-a-ano (jun, jul, ago de 2025 vs 2026); fora disso mostra-se variação
  acumulada na série, sempre rotulada como tal.
- **Semanas jul–set/2025:** os informes desse período são PDFs só-imagem;
  os valores foram transcritos visualmente e ficam marcados como tal
  (`scripts/semanas_manuais.json`).
- **Quebra conhecida:** o preço/kg dos ovos de granja salta em out/2025 porque a
  caixa-padrão passou de 25 kg para 21 kg — é mudança de padrão, não de mercado, e
  precisa vir anotada no produto.
- Todo número estatístico exibido deixa explícito o que a base sustenta (tamanho
  da série, origem do dado, o que é medido vs. estimado/transcrito).
- Terminologia oficial preservada: IPH, "número-índice", grupos (Frutas /
  Hortaliças / Ovos), subgrupos ("folha, flor e haste"; "fruto"; "raiz, bulbo,
  tubérculo e rizoma"), "informe semanal", "boletim mensal".

## Brand Commitments

- Fonte e créditos sempre visíveis: **CeasaMinas** (Centrais de Abastecimento de
  Minas Gerais) e **Departamento de Economia da UFV (DEE/UFV)**; parceria lançada
  em julho de 2025.
- Não é produto oficial da CeasaMinas nem da UFV — é um painel derivado dos dados
  públicos; isso precisa ficar claro e a fonte primária precisa estar linkada.
- Português do Brasil em toda a interface. R$ e formato numérico pt-BR.
- Sem emoji e sem estética "gerada por IA"; ícones são SVG desenhados. Tratamento
  visual institucional, adequado a audiência técnica e de governo.
- Nenhum texto (rótulo, opção, pergunta) pode ser cortado por limite de largura.

## Evidence on Hand

- 15 boletins mensais + 60 informes semanais + Notas Metodológicas, baixados em
  `data/pdfs/`. Dados reais e públicos.
- `data/dados.json` gerado pelo pipeline: número-índice (dez/2024–ago/2026),
  variação mensal das 9 séries (jun/2025–ago/2026), variação semanal das 9 séries
  (~60 semanas), série mensal de preço + variação dos 58 produtos, decomposição do
  último mês.
- Sem depoimentos, estudos de caso ou material de marketing — é ferramenta
  analítica, não peça promocional.

## Product Principles

- **Fidelidade à fonte acima de completude:** melhor um recorte honesto (produto =
  mensal) do que um dado semanal por produto fabricado por interpolação.
- **Cada número carrega seu contexto:** origem (boletim / informe / transcrito),
  tamanho da série e o que representa (atacado, Contagem-MG) andam junto do valor.
- **Escolher o produto é o gesto central:** o explorador de produto é a tela que
  tudo o mais serve; buscar e trocar de produto tem que ser instantâneo.
- **Linguagem de boletim, não de BI genérico:** figuras numeradas, legendas
  curtas, texto que enuncia o achado — não uma grade de cartões-KPI.
- **Funciona offline e sozinho:** um arquivo, sem servidor, sem rede; a atualização
  é um passo deliberado e reprodutível, não um requisito de runtime.

## Accessibility & Inclusion

Sem norma formal estabelecida pelo usuário. Compromissos assumidos: contraste
AA para texto, navegação por teclado, foco visível, alvos de toque adequados,
`prefers-reduced-motion` respeitado, e canal alternativo à cor (rótulo direto +
forma) em todo gráfico, já que verde/vermelho de alta/queda é a codificação.
