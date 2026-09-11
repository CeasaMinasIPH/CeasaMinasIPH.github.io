# -*- coding: utf-8 -*-
"""
build_html.py — monta o index.html autocontido.

Substitui, EM index.html, o conteudo interno destes 3 blocos (mantendo os
marcadores, entao e re-executavel):

  /*__FONTS_INICIO__*/  ... /*__FONTS_FIM__*/   <- vendor/fonts-embed.css
  /*__D3_INICIO__*/     ... /*__D3_FIM__*/      <- vendor/d3.min.js
  /*__DADOS_INICIO__*/  ... /*__DADOS_FIM__*/   <- data/dados.json + data/comparativo_ceasa.json

Resultado: um unico arquivo que abre por file:// (D3, fontes e dados embutidos).

Uso:  python scripts/build_html.py
"""
import base64
import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
HTML = RAIZ / "index.html"
DADOS = RAIZ / "data" / "dados.json"
COMPARATIVO = RAIZ / "data" / "comparativo_ceasa.json"
D3 = RAIZ / "vendor" / "d3.min.js"
FONTS = RAIZ / "vendor" / "fonts-embed.css"
APP = RAIZ / "vendor" / "app.js"
ASSETS_DIR = RAIZ / "assets"
# token __ASSET_<nome>__ em index.html -> arquivo em assets/. So precisa rodar uma vez;
# apos embutido o token some do HTML e novas rodadas simplesmente nao acham nada a trocar.
ASSETS = {
    "iph_roundel": "iph_roundel.png",
    "ceasaminas": "ceasaminas_logo.png",
    "ufv": "ufv_logo.png",
    "dee": "dee_logo.png",
    "entreposto": "entreposto.jpg",
}
MIME = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml"}


def bloco(nome, corpo):
    ini, fim = f"/*__{nome}_INICIO__*/", f"/*__{nome}_FIM__*/"
    return re.compile(re.escape(ini) + r".*?" + re.escape(fim), re.S), f"{ini}\n{corpo}\n{fim}"


def main():
    if not HTML.exists():
        raise SystemExit("index.html nao encontrado")
    if not DADOS.exists():
        raise SystemExit("data/dados.json nao encontrado — rode scripts/parse_pdfs.py antes")

    html = HTML.read_text(encoding="utf-8")
    dados = json.loads(DADOS.read_text(encoding="utf-8"))
    comp = json.loads(COMPARATIVO.read_text(encoding="utf-8")) if COMPARATIVO.exists() else None

    payload = ("const DADOS = " + json.dumps(dados, ensure_ascii=False, separators=(",", ":")) + ";\n"
               "const COMPARATIVO = "
               + (json.dumps(comp, ensure_ascii=False, separators=(",", ":")) if comp else "null") + ";")

    subs = [bloco("DADOS", payload)]
    if FONTS.exists():
        subs.append(bloco("FONTS", FONTS.read_text(encoding="utf-8")))
    if D3.exists():
        subs.append(bloco("D3", D3.read_text(encoding="utf-8")))
    if APP.exists():
        subs.append(bloco("APP", APP.read_text(encoding="utf-8")))

    for rx, novo in subs:
        if not rx.search(html):
            raise SystemExit(f"marcador {rx.pattern[:40]}... nao encontrado em index.html")
        html = rx.sub(lambda _: novo, html, count=1)

    n_assets = 0
    for nome, fname in ASSETS.items():
        token = f"__ASSET_{nome}__"
        if token not in html:
            continue
        f = ASSETS_DIR / fname
        if not f.exists():
            print(f"  [aviso] {f} nao encontrado — token {token} mantido")
            continue
        uri = f"data:{MIME[f.suffix.lower()]};base64,{base64.b64encode(f.read_bytes()).decode()}"
        html = html.replace(token, uri)
        n_assets += 1

    HTML.write_text(html, encoding="utf-8")
    n_comp = len(comp["historico"]) if comp else 0
    print(f"OK — index.html {HTML.stat().st_size/1024:.0f} KB | "
          f"{dados['meta']['n_produtos']} produtos IPH (dados {dados['meta']['gerado_em']}) | "
          f"comparativo: {n_comp} snapshot(s) | imagens embutidas nesta rodada: {n_assets}")


if __name__ == "__main__":
    main()
