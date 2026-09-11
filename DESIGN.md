# Design — Painel IPH CeasaMinas-UFV

<!-- impeccable:design-doc -->

Registrado a partir do mundo construído (`index.html` + `vendor/app.js`), não de
uma intenção anterior. Direção fixada pelo usuário: **boletim editorial
interativo**.

## Tese

Um boletim mensal vivo do IPH. A série de preços dos hortigranjeiros de Minas
lida como relatório econômico — figuras numeradas, legendas curtas, um texto que
enuncia o achado. Recusa a grade de cartões-KPI e o dashboard de BI genérico.
Sem eyebrow/kicker acima dos títulos; a `<h2>` carrega sozinha e a navegação
(numerais romanos + scrollspy) faz o wayfinding.

## Modo

**Operate / Read.** O visitante completa uma tarefa (achar o comportamento de um
produto, entender o que moveu o índice) e lê para compreender. Expressão nunca
obscurece a tarefa: escaneabilidade, rótulo direto e consistência acima de tudo.

## Superfície e cor

Estratégia: **neutros + um acento** (Restrained). Fundo papel off-white, tinta
quase-preta, um verde CeasaMinas institucional como acento único.

| Token | Claro | Escuro |
|---|---|---|
| `--paper` (página) | `#f6f3ea` | `#171613` |
| `--surface` (figura) | `#fbf9f2` | `#221f1b` |
| `--surface-2` | `#f1ecdf` | `#2b2823` |
| `--ink` (texto primário) | `#221d16` (15:1) | `#f2efe4` |
| `--ink-2` (secundário) | `#5b5346` (6,8:1) | `#bbb4a4` (8:1 no surface) |
| `--ink-3` (eixo/muted) | `#736a58` (4,5:1) | `#978d78` |
| `--rule` / `--rule-2` (fios) | `#ddd6c4` / `#c4bba3` | `#343029` / `#4a453b` |
| `--accent` (marca, links, linha do índice) | `#1f7a46` | `#57bd83` |
| `--accent-ink` (texto sobre papel) | `#12532f` | `#8ed3ab` |

Par **divergente** para toda variação de preço — segue a convenção dos informes
da CeasaMinas: **verde = alta, vermelho = queda** (não a convenção de "inflação
ruim"). Validado com `dataviz/scripts/validate_palette.js` nos dois modos:

| | alta (marca) | queda (marca) | alta (texto) | queda (texto) |
|---|---|---|---|---|
| claro | `#00806a` | `#c53f30` | `--alta-ink` `#00705c` | `--queda-ink` `#b63628` |
| escuro | `#16a184` | `#e5594a` | `#3cc0a3` | `#ef7365` |

CVD ΔE ≈ 9–10 (passa o alvo ≥ 8). Como o par verde/vermelho fica na faixa de
atenção para daltonismo, **três codificações secundárias** acompanham sempre: a
posição em relação à linha zero (barras divergentes), o rótulo direto do valor, e
o triângulo ▲/▼ no texto. Neutro `--neutro` `#a99f88` para valor zero e para
séries transcritas (jul–set/2025).

Categórico (só o Comparador, ≤ 5 séries): slots 1-5 da paleta de referência do
dataviz (`--c1`…`--c5`). Contraste sub-3:1 de alguns no papel → alívio por rótulo
direto + legenda + tabela, todos presentes.

Tema: claro é o principal (uso em escritório e projeção). Escuro é uma variante
selecionada (passos próprios, não flip automático), com toggle que vence
`prefers-color-scheme` nos dois sentidos e persiste em `localStorage`
(`iph.tema`).

## Tipografia

- **Títulos / números de destaque:** Bitter (slab serif documental, Huerta
  Tipográfica). Embutida em base64 (`vendor/fonts-embed.css`, latin + latin-ext,
  woff2 variável 400–700) para funcionar offline. Fallback: Charter, Iowan Old
  Style, Palatino, Georgia.
- **Corpo / dados:** stack de sans do sistema (`-apple-system, "Segoe UI",
  Roboto, …`). Superfície Operate/Read é bem servida por sans de sistema; o
  caráter tipográfico fica todo na serifa de título.
- Números em tabelas e eixos: `font-variant-numeric: tabular-nums`.
- Subtítulo da marca em itálico da serifa, caixa mista (não caixa-alta).
- Coluna de leitura `--readw: 66ch`; corpo 16px/1.6.

## Composição

- **Masthead** com marca (ícone SVG desenhado + "IPH · CeasaMinas–UFV" na
  serifa), linha de edição (período coberto, base, data dos dados) e toggle de
  tema. Não é sticky.
- **Nav** sticky, 8 seções com numeral romano; rola na horizontal no mobile;
  `aria-current` via IntersectionObserver.
- **Coluna de leitura** (`main`, `--maxw` 1180px) com `<figure class="wide">` que
  sangra para uma grade mais larga; painéis com fio de 1px (`--rule-2`), sem
  sombra — sentam na página como figura impressa. Sombra só em elementos
  flutuantes (combobox, botão "voltar ao topo").
- **Figuras numeradas** (Figura 1…15) com legenda curta em `--ink-2`, o número em
  serifa/acento.
- **Lede** por seção: parágrafo de 1,16rem que enuncia o achado com o número
  embutido em serifa grande (`.big`).
- **Ficha** (grid de definições) no explorador de produto e no comparativo — não
  é linha de cartões-KPI: é uma tabela de definições com fio entre células.

## Gráficos (`vendor/app.js`)

Primitivas D3 v7 reutilizáveis, todas responsivas (viewBox + re-render em resize,
registro em `charts[]`), tooltip único fixo (`#tt`), locale de tempo pt-BR:

- `chartDivergingBars` — variação +/- ; barra ancorada na linha zero, canto
  arredondado, cor divergente, rótulo direto (declutter no mobile: só as maiores
  + a mais recente). Modo `mono` (eixo a partir de zero, cor única) para
  volatilidade.
- `chartLine` — série temporal; crosshair + tooltip, área opcional (0,14 de
  opacidade), segmento tracejado para dados de origem diferente (número-índice
  dez/24–mai/25). Rótulo de fim de linha com anti-colisão; legenda abaixo no
  mobile.
- `chartHeat` — semana × série, divergente, célula com opacidade ∝ magnitude.
- `chartVsRef` — dot-plot das 6 unidades da CeasaMinas com linha tracejada na
  referência (Grande BH) e conector até cada unidade.
- `smallDiv` — small multiples das 9 séries (escala livre ou comum).

Grade recessiva (`--rule`), eixo `--ink-3`, texto sempre em tokens de tinta
(nunca na cor da série). Legenda presente para ≥ 2 séries; ≤ 4 também com rótulo
direto.

## Movimento

Mínimo e institucional. Sem animação de entrada. Transições de hover/foco curtas
(0,1–0,2s). `prefers-reduced-motion: reduce` zera tudo. Scroll suave na
navegação (respeitando reduced-motion). O tooltip aparece com fade de 0,1s.

## Estados

- **Sem sazonalidade** (só um ano de dados): mensagem no lugar do gráfico.
- **Sem cotação** (Comparativo CEASA): "sem cotação nesta semana" no dot-plot e
  na ficha; lede adapta o texto.
- **Sem histórico ≥ 2 semanas** no Comparativo: Figura 14 (diferença no tempo)
  fica oculta.
- **Sem `COMPARATIVO`**: a aba mostra instrução para rodar o scraper.
- **`localStorage` indisponível**: todo acesso em try/catch; a página funciona
  com os padrões (Tomate italiano, tema do sistema).
- **Avisos de extração**: listados na seção Metodologia quando `meta.avisos` não
  está vazio.

## Acessibilidade

Contraste AA para texto (verificado token a token nos dois modos). Foco visível
(`:focus-visible` com anel do acento). Navegação por teclado no combobox
(setas/enter/esc) e nos toggles. Alvos de toque ≥ 36px. Canal alternativo à cor
em todo gráfico (posição + rótulo + forma ▲▼). `aria-current`, `aria-pressed`,
`role="combobox"/"listbox"`, `aria-live` no tooltip. Corpo nunca rola na
horizontal; tabelas e figuras largas rolam no próprio container.

## Não fazer

- Cartão com ícone + título + texto como estrutura de página; cartões aninhados.
- Eyebrow/kicker acima de título.
- `border-left`/`border-right` colorido acima de 1px em callout ou cartão.
- Sombra difusa + fio de 1px no mesmo elemento (escolher um).
- Caixa-alta em texto corrido (ok em rótulo curto de formulário/tabela).
- Cor da série carregando identidade sozinha; texto na cor da série.
- Inventar preço semanal por produto, ou tratar "acumulado na série" como
  "variação anual".
