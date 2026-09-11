# Painel IPH CeasaMinas-UFV

Painel interativo da série histórica do **Índice de Preços de Hortigranjeiros
(IPH CeasaMinas-UFV)** + comparativo de preços entre as unidades da CeasaMinas.

Não é um produto oficial da CeasaMinas nem da UFV — é uma camada de exploração
montada a partir dos PDFs e páginas públicos.

- **`index.html`** — o painel. Arquivo único e autocontido (D3, fontes e dados
  embutidos). Abre com duplo clique, sem servidor, funciona offline.
- **`scripts/`** — pipeline Python que baixa e reprocessa as fontes.
- **`data/`** — PDFs baixados, `dados.json` e `comparativo_ceasa.json` gerados.

## Fontes

| Fonte | O que é | Frequência |
|---|---|---|
| [indiceufvgeral.asp](https://www.ceasaminas.com.br/indiceufvgeral.asp) | Boletins mensais e informes semanais do IPH (PDFs) | mensal + semanal |
| [Preço mais comum MG](https://minas1.ceasa.mg.gov.br/ceasainternet/cst_precosmaiscomumMG/cst_precosmaiscomumMG.php) | Última cotação do preço mais comum nas 6 unidades da CeasaMinas | atualizada continuamente; **sem série histórica** |

## Atualizar os dados

```
pip install -r requirements.txt        # pdfplumber, pymupdf

python scripts/fetch_pdfs.py           # baixa boletins/informes novos
python scripts/parse_pdfs.py           # -> data/dados.json
python scripts/fetch_comparativo.py    # 1 snapshot do comparativo (RODAR TODA SEMANA)
python scripts/build_html.py           # reinjeta os dados em index.html
```

### Por que rodar `fetch_comparativo.py` toda semana

A página "Preço mais comum MG" só publica a **cotação mais recente** de cada
unidade — não há série histórica na fonte. `fetch_comparativo.py` guarda um
*snapshot* datado por semana em `data/comparativo_ceasa.json`; a série de
comparação BH × outras cidades vai sendo construída a cada coleta. Snapshots da
mesma semana ISO não são duplicados, então rodar mais de uma vez por semana é
inofensivo.

Para automatizar de fato (Windows), agende no Task Scheduler algo como:

```
python C:\Users\Pichau\ceasa-iph-dashboard\scripts\fetch_comparativo.py
python C:\Users\Pichau\ceasa-iph-dashboard\scripts\fetch_pdfs.py
python C:\Users\Pichau\ceasa-iph-dashboard\scripts\parse_pdfs.py
python C:\Users\Pichau\ceasa-iph-dashboard\scripts\build_html.py
```
toda segunda ou terça de manhã.

## O que a fonte permite — e o que não

- **Preço por produto é mensal** (Apêndice Tabela A1 de cada boletim). Não há
  preço semanal por produto — o painel não o inventa.
- **Dado semanal é só de índice/grupo/subgrupo** (9 séries), dos informes.
- **Semanas de jul–set/2025** vêm de informes só-imagem, transcritos à mão em
  `scripts/semanas_manuais.json` (marcados no painel).
- **"Variação anual" por produto** só é comparação ano-a-ano real para jun, jul e
  ago (2025 vs 2026); nos demais meses o painel mostra variação acumulada na
  série, sempre rotulada.
- **Ovos de granja:** salto de preço/kg em out/2025 = mudança do peso-padrão da
  caixa (25 → 21 kg), não do mercado. Anotado no produto.
- **Comparativo CEASA:** taxonomia de produtos e unidades de medida próprias
  (DZ, UN, "30 DZ"…), diferentes da cesta do IPH. As cotações de cada unidade
  podem ser de dias diferentes da mesma semana.

## Estrutura

```
index.html                 painel final (gerado por build_html.py)
vendor/
  d3.min.js                D3 v7 (embutido no build)
  app.js                   lógica do painel (embutido no build)
  fonts-embed.css          Bitter em base64 (embutido no build)
scripts/
  fetch_pdfs.py            baixa PDFs do IPH
  parse_pdfs.py            extrai dados/dados.json
  fetch_comparativo.py     scraper do comparativo (semanal)
  build_html.py            injeta dados + vendor em index.html
  cesta.py                 mapa produto -> grupo/subgrupo, normalização de nomes
  semanas_manuais.json     semanas jul-set/2025 transcritas
  shots.py                 screenshots de QA (Playwright)
data/
  dados.json               dataset do IPH
  comparativo_ceasa.json   histórico do comparativo (cresce a cada semana)
  pdfs/monthly/            boletins mensais
  pdfs/weekly/             informes semanais
PRODUCT.md  DESIGN.md      documentação (skill impeccable)
```
