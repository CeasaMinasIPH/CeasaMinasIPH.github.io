# -*- coding: utf-8 -*-
"""
fetch_pdfs.py — baixa todos os PDFs do IPH CeasaMinas-UFV a partir da pagina
https://www.ceasaminas.com.br/indiceufvgeral.asp

  * Boletins mensais  (IPH<Mes><Ano>.pdf)    -> data/pdfs/monthly/
  * Informes semanais (InformeCEASA*.pdf)    -> data/pdfs/weekly/
  * Notas metodologicas                      -> data/pdfs/monthly/

Arquivos ja existentes sao pulados. Rode de novo quando a CeasaMinas publicar
novos boletins/informes.

Uso:  python scripts/fetch_pdfs.py
"""
import re
import sys
import time
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

RAIZ = Path(__file__).resolve().parent.parent
PAGINA = "https://www.ceasaminas.com.br/indiceufvgeral.asp"
BASE = "https://www.ceasaminas.com.br/indiceufv/"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CEASA-IPH-dashboard/1.0"
DIR_M = RAIZ / "data" / "pdfs" / "monthly"
DIR_W = RAIZ / "data" / "pdfs" / "weekly"


def get(url, timeout=60):
    req = Request(url, headers={"User-Agent": UA})
    with urlopen(req, timeout=timeout) as r:
        return r.read()


def main():
    DIR_M.mkdir(parents=True, exist_ok=True)
    DIR_W.mkdir(parents=True, exist_ok=True)
    print(f"lendo {PAGINA}")
    html = get(PAGINA).decode("latin-1", "replace")
    (RAIZ / "data" / "indiceufvgeral.asp.html").write_text(html, encoding="utf-8")

    urls = sorted(set(re.findall(r"https://www\.ceasaminas\.com\.br/indiceufv/[^\"'>\s]+\.pdf", html)))
    if not urls:
        sys.exit("Nenhum link de PDF encontrado na pagina — o layout do site pode ter mudado.")

    novos = pulados = erros = 0
    for url in urls:
        nome = url.rsplit("/", 1)[-1].replace(" ", "")
        destino = (DIR_M if "IPH" in nome or "Notas" in nome else DIR_W) / nome
        if destino.exists() and destino.stat().st_size > 5000:
            pulados += 1
            continue
        enc = BASE + quote(url[len(BASE):])
        try:
            dados = get(enc)
            if not dados.startswith(b"%PDF"):
                raise ValueError("resposta nao e PDF")
            destino.write_bytes(dados)
            novos += 1
            print(f"  baixado  {destino.relative_to(RAIZ)}  ({len(dados)//1024} KB)")
            time.sleep(0.3)
        except Exception as e:  # noqa: BLE001
            erros += 1
            print(f"  ERRO     {nome}: {e}")

    print(f"\n{len(urls)} PDFs listados | {novos} baixados | {pulados} ja existiam | {erros} erros")
    print(f"  monthly: {len(list(DIR_M.glob('*.pdf')))}   weekly: {len(list(DIR_W.glob('*.pdf')))}")


if __name__ == "__main__":
    main()
