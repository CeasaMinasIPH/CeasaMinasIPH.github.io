# -*- coding: utf-8 -*-
"""
fetch_comparativo.py — coleta o "Preco mais comum no estado de Minas Gerais"
(ultima cotacao) das 6 unidades da CeasaMinas e ANEXA um snapshot datado ao
historico em data/comparativo_ceasa.json.

Fonte (grid ScriptCase, sem serie historica — so a ultima cotacao):
  https://minas1.ceasa.mg.gov.br/ceasainternet/cst_precosmaiscomumMG/cst_precosmaiscomumMG.php

Como a fonte so publica a cotacao mais recente, a serie historica e construida
aqui: rode este script uma vez por semana (idealmente as segundas/tercas) para
acumular um ponto por semana. Snapshots da mesma semana ISO nao sao duplicados.

Uso:  python scripts/fetch_comparativo.py
"""
import html as H
import json
import re
import sys
from datetime import date, datetime
from pathlib import Path
from urllib.request import Request, urlopen

RAIZ = Path(__file__).resolve().parent.parent
URL = ("https://minas1.ceasa.mg.gov.br/ceasainternet/"
       "cst_precosmaiscomumMG/cst_precosmaiscomumMG.php")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CEASA-IPH-dashboard/1.0"
SAIDA = RAIZ / "data" / "comparativo_ceasa.json"
CACHE_HTML = RAIZ / "data" / "comparativo_page.html"

# ordem das colunas de preco no grid
UNIDADES = ["Grande BH", "Uberlândia", "Juiz de Fora",
            "Gov. Valadares", "Caratinga", "Barbacena"]
REF = "Grande BH"  # tudo e comparado com esta unidade

_UNIT = r"(?:\d{2}\s+)?(?:KG|DZ|UN|UNID\.?|MC|CX|PC|SC|MACO|MO|LT|G|BOX|BJ|PT)"
RE_ROW = re.compile(
    r"([A-ZÀ-Ú][A-ZÀ-Ú0-9º./()\- ]*?[A-ZÀ-Ú.)])\s+"
    r"(" + _UNIT + r")\s+"
    r"((?:(?:-{2,}|\d{1,4}[.,]\d{2})\s+){5}(?:-{2,}|\d{1,4}[.,]\d{2}))"
)
RE_DATA = re.compile(r"([A-Za-zÀ-ú.\s]+?)\s*-\s*cota[çc][ãa]o de:\s*(\d{2}/\d{2}/\d{4})")


def baixar():
    req = Request(URL, headers={"User-Agent": UA})
    with urlopen(req, timeout=60) as r:
        html = r.read().decode("utf-8", "replace")
    CACHE_HTML.write_text(html, encoding="utf-8")
    return html


def texto_visivel(html):
    t = re.sub(r"<script.*?</script>", " ", html, flags=re.S)
    t = re.sub(r"<style.*?</style>", " ", t, flags=re.S)
    t = re.sub(r"<[^>]+>", " ", t)
    return H.unescape(re.sub(r"[ \t]+", " ", t))


def num(s):
    s = s.strip().replace(",", ".")
    return None if set(s) <= {"-"} else round(float(s), 2)


def parse(html):
    txt = texto_visivel(html)
    # recorta o miolo do grid
    ini = txt.find("Barbacena")
    fim = txt.find("Datas das últimas cota")
    if ini < 0 or fim < 0 or fim < ini:
        raise RuntimeError("layout da pagina mudou — nao achei o grid")
    miolo = txt[ini + len("Barbacena"):fim]

    precos, unidade_medida = {}, {}
    for m in RE_ROW.finditer(miolo):
        nome = re.sub(r"\s+", " ", m.group(1)).strip(" .")
        unid = re.sub(r"\s+", " ", m.group(2)).strip()
        cols = re.split(r"\s+", m.group(3).strip())
        if len(cols) != 6:
            continue
        precos[nome] = {u: num(v) for u, v in zip(UNIDADES, cols)}
        unidade_medida[nome] = unid

    datas = {}
    for m in RE_DATA.finditer(txt):
        rot = re.sub(r"\s+", " ", m.group(1)).strip().replace("Gov.Valadares", "Gov. Valadares")
        for u in UNIDADES:
            if rot.replace(" ", "").lower() in u.replace(" ", "").lower() or \
               u.replace(" ", "").lower() in rot.replace(" ", "").lower():
                datas[u] = datetime.strptime(m.group(2), "%d/%m/%Y").date().isoformat()
    if len(precos) < 20:
        raise RuntimeError(f"so {len(precos)} produtos parseados — layout suspeito")
    return precos, unidade_medida, datas


def main():
    print(f"lendo {URL}")
    html = baixar()
    precos, unidade_medida, datas = parse(html)
    ref_data = datas.get(REF) or date.today().isoformat()
    y, w, _ = date.fromisoformat(ref_data).isocalendar()
    semana_iso = f"{y}-W{w:02d}"

    if SAIDA.exists():
        dados = json.loads(SAIDA.read_text(encoding="utf-8"))
    else:
        dados = {"meta": {}, "historico": []}

    dados["meta"] = {
        "fonte": "CeasaMinas — Preço mais comum no estado de Minas Gerais (última cotação)",
        "url": URL,
        "unidades": UNIDADES,
        "referencia": REF,
        "gerado_em": date.today().isoformat(),
        "nota": ("A fonte só publica a cotação mais recente de cada unidade — a série "
                 "histórica é acumulada semana a semana por este script. As datas de "
                 "cotação diferem entre unidades (ver datas_cotacao de cada snapshot)."),
    }

    snap = {
        "semana": semana_iso,
        "semana_ref": ref_data,
        "coletado_em": date.today().isoformat(),
        "datas_cotacao": datas,
        "unidade_medida": unidade_medida,
        "precos": precos,
    }
    hist = [s for s in dados["historico"] if s["semana"] != semana_iso]
    hist.append(snap)
    hist.sort(key=lambda s: s["semana"])
    dados["historico"] = hist

    produtos = sorted({p for s in hist for p in s["precos"]})
    dados["produtos"] = produtos

    SAIDA.write_text(json.dumps(dados, ensure_ascii=False, indent=1), encoding="utf-8")
    novos = "atualizado" if any(s["semana"] == semana_iso for s in dados["historico"][:-1]) else "novo"
    print(f"\n{len(precos)} produtos | semana {semana_iso} ({novos}) | "
          f"{len(hist)} snapshot(s) no historico")
    print(f"datas de cotacao: {datas}")
    print(f"OK -> {SAIDA}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        sys.exit(f"ERRO: {e}")
