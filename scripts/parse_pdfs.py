# -*- coding: utf-8 -*-
"""
parse_pdfs.py — extrai as series de dados do IPH CeasaMinas-UFV a partir dos PDFs
baixados por fetch_pdfs.py e grava data/dados.json.

Fontes:
  * Boletim Mensal  (data/pdfs/monthly/IPH<Mes><Ano>.pdf)
      - Tabela 1 .......... variacao mensal (com sinal) do IPH + 3 grupos + 6 subgrupos
      - Figura 1 .......... variacao semanal (com sinal) das 9 series, 4-5 semanas/mes
                            (so a partir do boletim de outubro/2025; antes e imagem)
      - Figura 3 .......... numero-indice (base dez/2024 = 100)
      - Apendice Tabela A1  preco R$/kg (inicio e fim do mes) + variacao + peso, ~58 produtos
  * Informe Semanal (data/pdfs/weekly/InformeCEASA*.pdf)
      - infografico; usado so p/ as semanas posteriores ao ultimo boletim.
  * scripts/semanas_manuais.json
      - semanas jul-set/2025 (informes so-imagem), transcritas visualmente.

Uso:  python scripts/parse_pdfs.py
"""
import json
import re
import sys
import unicodedata
from datetime import date, timedelta
from pathlib import Path

import pdfplumber

sys.path.insert(0, str(Path(__file__).resolve().parent))
import cesta  # noqa: E402
from cesta import PRODUTOS, ORDEM_PRODUTOS, canon  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
DIR_MONTHLY = RAIZ / "data" / "pdfs" / "monthly"
DIR_WEEKLY = RAIZ / "data" / "pdfs" / "weekly"
MANUAIS = Path(__file__).resolve().parent / "semanas_manuais.json"
SAIDA = RAIZ / "data" / "dados.json"

MESES = {
    "janeiro": 1, "fevereiro": 2, "marco": 3, "abril": 4, "maio": 5, "junho": 6,
    "julho": 7, "agosto": 8, "setembro": 9, "outubro": 10, "novembro": 11, "dezembro": 12,
}
MES_ABREV = ["", "jan", "fev", "mar", "abr", "mai", "jun",
             "jul", "ago", "set", "out", "nov", "dez"]

SERIE_ORDEM = [
    "IPH", "Frutas", "Frutas_brasileiras", "Frutas_importadas", "Hortalicas",
    "Hortalicas_folha_flor_haste", "Hortalicas_fruto",
    "Hortalicas_raiz_bulbo_tuberculo_rizoma", "Ovos",
]

avisos = []

# Notas de metodologia por produto (quebras conhecidas na serie de preco)
NOTAS_PRODUTO = {
    "OVOS DE GRANJA": ("A partir de outubro/2025 o peso padrao da caixa de 30 duzias passou "
                       "de 25 kg para 21 kg (decisao tecnica da CeasaMinas). O salto de preco "
                       "por kg em out/2025 reflete essa mudanca de padrao, nao o mercado."),
}


def aviso(msg):
    avisos.append(msg)
    print("  [aviso]", msg)


def sa(s):
    return "".join(c for c in unicodedata.normalize("NFD", s)
                   if unicodedata.category(c) != "Mn").lower()


def num_br(s):
    """'-9,52' -> -9.52 ; '7,301' -> 7.30 (descarta digito de nota de rodape)."""
    s = str(s).strip().replace("%", "").replace("−", "-").replace("–", "-")
    s = s.replace(" ", "")
    m = re.match(r"^(-?\d+),(\d{2})\d*$", s)
    if m:
        return float(f"{m.group(1)}.{m.group(2)}")
    m = re.match(r"^(-?\d+),(\d)$", s)
    if m:
        return float(f"{m.group(1)}.{m.group(2)}")
    return float(s.replace(",", "."))


def mes_de_arquivo(nome):
    m = re.match(r"IPH([A-Za-zçÇ]+?)(\d{4})", nome)
    if not m:
        return None
    mm = MESES.get(sa(m.group(1)))
    return f"{int(m.group(2)):04d}-{mm:02d}" if mm else None


def mes_rotulo(ym):
    y, m = map(int, ym.split("-"))
    return f"{MES_ABREV[m]}/{y % 100:02d}"


def range_meses(ini, fim):
    y, m = map(int, ini.split("-"))
    fy, fm = map(int, fim.split("-"))
    out = []
    while (y, m) <= (fy, fm):
        out.append(f"{y:04d}-{m:02d}")
        m += 1
        if m == 13:
            y, m = y + 1, 1
    return out


# ---------------------------------------------------------------------------
#  Boletim mensal — Tabela 1 (variacao mensal com sinal)
# ---------------------------------------------------------------------------
RE_TAB1 = re.compile(r"(?:Infla[çc][ãa]o[-\s]*)?IPH(/[^0-9\n]+?)?\s+(-?\d{1,3},\d{1,2})\s*%")
ALVOS_TAB1 = {
    "": "IPH",
    "/frutas": "Frutas",
    "/frutas brasileiras": "Frutas_brasileiras",
    "/frutas importadas": "Frutas_importadas",
    "/hortalicas": "Hortalicas",
    "/hortalicas - folha, flor e haste": "Hortalicas_folha_flor_haste",
    "/hortalicas - fruto": "Hortalicas_fruto",
    "/hortalicas - raiz, bulbo, tuberculo e rizoma": "Hortalicas_raiz_bulbo_tuberculo_rizoma",
    "/ovos": "Ovos",
}


def parse_tabela1(full_text):
    out = {}
    for m in RE_TAB1.finditer(full_text):
        chave = re.sub(r"\s+", " ", sa(m.group(1) or "").strip())
        if chave in ALVOS_TAB1 and ALVOS_TAB1[chave] not in out:
            out[ALVOS_TAB1[chave]] = num_br(m.group(2))
    return out


# ---------------------------------------------------------------------------
#  Boletim mensal — Figura 1 (variacao semanal com sinal)
# ---------------------------------------------------------------------------
def parse_figura1(pdf):
    NUMPCT = re.compile(r"^-?\d{1,3},\d{1,2}%$")
    COLS = [138, 181, 224, 267, 310, 352, 395, 439, 483]
    for pg in pdf.pages:
        t = pg.extract_text() or ""
        if "Figura 1" not in t or "Semana" not in t:
            continue
        capt = re.sub(r"\s+", " ", t)
        datas = re.findall(r"Semana\s*(\d)\s*:\s*(\d{2}/\d{2})\s*a\s*(\d{2}/\d{2})", capt)
        nums = [w for w in pg.extract_words() if NUMPCT.match(w["text"])]
        if len(nums) < 18:
            return []
        linhas = []
        for w in sorted(nums, key=lambda z: z["top"]):
            if linhas and abs(w["top"] - linhas[-1][0]) < 4:
                linhas[-1][1].append(w)
            else:
                linhas.append([w["top"], [w]])
        linhas = [ln for ln in linhas if 7 <= len(ln[1]) <= 11]
        linhas.sort(key=lambda z: z[0])
        semanas = []
        for i, (_, cells) in enumerate(linhas):
            slot = {}
            for c in cells:
                j = min(range(9), key=lambda k: abs(c["x0"] - COLS[k]))
                slot[j] = c
            if len(slot) < 8:
                continue
            valores = {SERIE_ORDEM[j]: num_br(slot[j]["text"]) for j in slot}
            periodo = next((f"{ini} a {fim}" for n, ini, fim in datas if int(n) == i + 1), "")
            semanas.append({"periodo": periodo, "valores": valores})
        return semanas
    return []


# ---------------------------------------------------------------------------
#  Boletim mensal — Apendice Tabela A1
# ---------------------------------------------------------------------------
RE_ROW = re.compile(
    r"^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9''\.\-/ ]+?)\s+"
    r"(\d{1,3},\d{2})\d?\s+"
    r"(\d{1,3},\d{2})\d?\s+"
    r"(-?\d{1,3},\d{2})\d?"
    r"(?:\s+(\d,\d{3,4}))?\s*$"
)


def parse_apendice(pdf, ym):
    idx = None
    for i, pg in enumerate(pdf.pages):
        t = pg.extract_text() or ""
        if "ABACATE" in t and "ABACAXI" in t:
            idx = i
            break
    if idx is None:
        aviso(f"{ym}: Apendice (Tabela A1) nao encontrado")
        return None, None, {}
    di = dfim = None
    for pg in pdf.pages:
        t = re.sub(r"\s+", " ", pg.extract_text() or "")
        m = re.search(r"Tabela\s*(?:A1|1A)\.[^(]*\((\d{2}/\d{2}/\d{4})\s*[–\-−a]\s*(\d{2}/\d{2}/\d{4})\)", t)
        if m:
            di, dfim = m.group(1), m.group(2)
            break
    linhas = []
    for pg in pdf.pages[idx:idx + 2]:
        linhas += (pg.extract_text() or "").splitlines()
    encontrados = {}
    for ln in linhas:
        ln = ln.strip()
        if not ln or sa(ln).startswith(("produto", "fonte", "preco", "apendice", "tabela")):
            continue
        mm = RE_ROW.match(ln)
        if not mm:
            continue
        nome, p1, p2, var, peso = mm.groups()
        chave = canon(nome)
        if chave is None:
            aviso(f"{ym}: produto nao reconhecido na Tabela A1: {nome!r}")
            continue
        if chave in encontrados:
            continue
        encontrados[chave] = {
            "preco_ini": num_br(p1), "preco_fim": num_br(p2), "variacao": num_br(var),
            "peso": round(float(peso.replace(",", ".")), 4) if peso else None,
        }
    if not (50 <= len(encontrados) <= 60):
        aviso(f"{ym}: Tabela A1 com {len(encontrados)} produtos (esperado ~58)")
    return di, dfim, encontrados


# ---------------------------------------------------------------------------
#  Boletim mensal — Figura 3 (numero-indice)
# ---------------------------------------------------------------------------
def parse_figura3(pdf):
    """Retorna os rotulos de dados da Figura 3, ordenados por x (jan/25, fev/25, ...)."""
    LABEL = re.compile(r"^\d{2,3},\d{2}$")  # rotulos de dado tem 2 casas ('89,00'); eixo e '80','90','100'
    for pg in pdf.pages:
        t = pg.extract_text() or ""
        if "Figura 3" in t and "CeasaMinas" in t and "dezembro de 2024" in t.lower():
            ws = [w for w in pg.extract_words()
                  if LABEL.match(w["text"]) and 120 < w["x0"] < 560 and 250 < w["top"] < 640]
            if len(ws) < 8:
                continue
            ws.sort(key=lambda z: z["x0"])
            vals = [num_br(w["text"]) for w in ws]
            # remove stray inicial (callout do mes corrente, repetido a esquerda)
            if len(vals) > 3 and abs(vals[0] - vals[-1]) < 0.05:
                vals = vals[1:]
            return vals
    return []


# ---------------------------------------------------------------------------
#  Informe semanal (so semanas posteriores ao ultimo boletim)
# ---------------------------------------------------------------------------
def _setas_por_y(caminho):
    try:
        import pymupdf as fitz
    except ImportError:
        try:
            import fitz
        except ImportError:
            return []
    out = []
    try:
        pg = fitz.open(caminho)[0]
        for p in pg.get_drawings():
            c = p.get("fill") or p.get("color")
            r = p.get("rect")
            if not c or not r or r.width > 40 or r.height < 8 or r.height > 60:
                continue
            R, G, B = c[:3]
            if G > R and G > B:
                out.append(("+", (r.y0 + r.y1) / 2, (r.x0 + r.x1) / 2))
            elif R > G and R > B:
                out.append(("-", (r.y0 + r.y1) / 2, (r.x0 + r.x1) / 2))
    except Exception as e:  # noqa: BLE001
        aviso(f"PyMuPDF falhou em {Path(caminho).name}: {e}")
    return out


RE_INF_DATA = re.compile(r"\((\d{2}/\d{2}/\d{4})\s*a\s*(\d{2}/\d{2}/\d{4})\)")
RE_PCT = re.compile(r"^-?\d{1,3},\d{1,2}%$")
# posicoes fixas do infografico "novo" (2026): (serie, lado, x0_aprox, top_aprox)
INF_SLOTS = [
    ("Frutas_brasileiras", "L", 134, 231.6),
    ("Hortalicas_folha_flor_haste", "R", 385, 231.7),
    ("Frutas_importadas", "L", 134, 342.6),
    ("Hortalicas_fruto", "R", 385, 342.6),
    ("Ovos_sub", "L", 134, 463.6),
    ("Hortalicas_raiz_bulbo_tuberculo_rizoma", "R", 385, 464.0),
]


def parse_informe(caminho):
    """So p/ o infografico novo (2026+), usado nas semanas apos o ultimo boletim."""
    with pdfplumber.open(caminho) as pdf:
        pg = pdf.pages[0]
        texto = pg.extract_text() or ""
        words = pg.extract_words()
    if not texto:
        return None
    m = RE_INF_DATA.search(re.sub(r"\s+", " ", texto))
    if not m:
        return None
    pct = [w for w in words if RE_PCT.match(w["text"])]

    def achar(x0, top, tol_x=28, tol_y=14):
        cand = [w for w in pct if abs(w["x0"] - x0) < tol_x and abs(w["top"] - top) < tol_y]
        return num_br(cand[0]["text"]) if cand else None

    setas = _setas_por_y(caminho)  # [('+'/'-', y, x), ...]
    val = {}

    # IPH (numero isolado abaixo de "(variacao semanal)")
    iph = achar(108, 592, tol_x=22, tol_y=12)
    if iph is not None:
        val["IPH"] = iph

    # GRUPOS (coluna da direita, sinal explicito no texto)
    for serie, top in [("Frutas", 565.8), ("Hortalicas", 587.4), ("Ovos", 609.0)]:
        v = achar(422, top, tol_x=22, tol_y=12)
        if v is not None:
            val[serie] = v

    # subgrupos: magnitude por posicao + sinal pela seta mais proxima
    for serie, lado, x0, top in INF_SLOTS:
        mag = achar(x0, top, tol_x=32, tol_y=16)
        if mag is None:
            continue
        chave = serie.replace("_sub", "")
        if abs(mag) < 0.005:
            val.setdefault(chave, 0.0)
            continue
        xseta = 113 if lado == "L" else 369
        cand = [s for s in setas if abs(s[2] - xseta) < 25 and abs(s[1] - top) < 20]
        if cand:
            val[chave] = round(mag * (-1 if cand[0][0] == "-" else 1), 2)
        else:
            aviso(f"{Path(caminho).name}: sem seta p/ {chave} ({mag}%) — sinal indefinido")
    return {"ini": m.group(1), "fim": m.group(2), "valores": val}


# ---------------------------------------------------------------------------
def dstr(s):
    d, mth, y = s.split("/")
    return date(int(y), int(mth), int(d))


def semana_fim_iso(periodo, ano_boletim, mes_boletim):
    fim_dm = periodo.split(" a ")[-1]
    dd, mm = map(int, fim_dm.split("/"))
    ano = ano_boletim
    if mm == 12 and mes_boletim == 1:
        ano -= 1
    elif mm == 1 and mes_boletim == 12:
        ano += 1
    return f"{ano:04d}-{mm:02d}-{dd:02d}"


def main():
    # ---------- boletins ----------
    boletins = {}
    for pdf_path in sorted(DIR_MONTHLY.glob("IPH*.pdf")):
        ym = mes_de_arquivo(pdf_path.name)
        if not ym:
            continue
        print(f"boletim {ym}  ({pdf_path.name})")
        with pdfplumber.open(pdf_path) as pdf:
            full = "\n".join((p.extract_text() or "") for p in pdf.pages)
            tab1 = parse_tabela1(full)
            fig1 = parse_figura1(pdf)
            di, dfim, apnd = parse_apendice(pdf, ym)
            fig3 = parse_figura3(pdf)
        if "IPH" not in tab1:
            aviso(f"{ym}: Tabela 1 nao parseada")
        boletins[ym] = dict(arquivo=pdf_path.name, tab1=tab1, semanas=fig1,
                            apendice=apnd, data_ini=di, data_fim=dfim, fig3=fig3, full=full)

    meses_ord = sorted(boletins)
    if not meses_ord:
        sys.exit("Nenhum boletim em data/pdfs/monthly/")
    ultimo = meses_ord[-1]

    # ---------- iph_mensal ----------
    iph_mensal = []
    for ym in meses_ord:
        row = {"mes": ym, "rotulo": mes_rotulo(ym)}
        row.update(boletins[ym]["tab1"])
        iph_mensal.append(row)

    # ---------- numero-indice (dez/2024 = 100) ----------
    full_u = boletins[ultimo]["full"]
    anchor = None
    ma = re.search(r"redu[çc][ãa]o acumulada de aproximadamente (\d{1,2},\d{1,2})%[^.]*desde dezembro de 2024", full_u, re.I)
    if ma:
        anchor = 100.0 * (1 - num_br(ma.group(1)) / 100)
    if anchor is None:
        mb = re.search(r"[íi]ndice\s+(?:alcan[çc]ou|atingiu|foi de)\s+(\d{2,3},\d{1,2})", full_u, re.I)
        if mb:
            anchor = num_br(mb.group(1))

    indice = {}
    if anchor is not None:
        indice[ultimo] = anchor
        for i in range(len(meses_ord) - 1, 0, -1):
            v = boletins[meses_ord[i]]["tab1"].get("IPH")
            if v is None:
                break
            indice[meses_ord[i - 1]] = indice[meses_ord[i]] / (1 + v / 100)
    else:
        aviso("Numero-indice: ancora nao encontrada")

    # dez/2024..mai/2025 vem da Figura 3 do boletim mais antigo que a traga limpa
    early_vals, early_src = [], None
    for ym in meses_ord:
        if len(boletins[ym]["fig3"]) >= 8:
            early_vals, early_src = boletins[ym]["fig3"], ym
            break
    early_map = {}
    if early_vals:
        # Figura 3 comeca em jan/2025 (dez/2024 = 100 nao recebe rotulo)
        ms = range_meses("2025-01", early_src)
        early_map = dict(zip(ms, early_vals))
        comuns = [m for m in early_map if m in indice]
        if comuns:
            dif = max(abs(early_map[m] - indice[m]) / indice[m] for m in comuns)
            if dif > 0.03:
                aviso(f"Figura 3 ({early_src}) diverge da cadeia (max {dif*100:.1f}%) — usando cadeia")

    serie_indice = []
    for ym in range_meses("2024-12", ultimo):
        v, origem = None, None
        if ym == "2024-12":
            v, origem = 100.0, "base"
        elif ym in indice:
            v, origem = indice[ym], "cadeia"
        elif ym in early_map:
            v, origem = early_map[ym], "figura3"
        if v is not None:
            serie_indice.append({"mes": ym, "rotulo": mes_rotulo(ym),
                                 "valor": round(v, 2), "origem": origem})

    # ---------- produtos ----------
    produtos = {}
    for chave in ORDEM_PRODUTOS:
        meta = PRODUTOS[chave]
        serie, peso_atual = [], None
        for ym in meses_ord:
            ap = boletins[ym]["apendice"].get(chave)
            if not ap:
                continue
            serie.append({"mes": ym, "rotulo": mes_rotulo(ym),
                          "preco": round(ap["preco_fim"], 2),
                          "preco_ini": round(ap["preco_ini"], 2),
                          "variacao": round(ap["variacao"], 2)})
            if ap["peso"] is not None:
                peso_atual = ap["peso"]
        if serie:
            produtos[chave] = {"rotulo": meta["rotulo"], "grupo": meta["grupo"],
                               "subgrupo": meta["subgrupo"], "peso_iph": peso_atual, "serie": serie}
            if chave in NOTAS_PRODUTO:
                produtos[chave]["nota"] = NOTAS_PRODUTO[chave]

    # ---------- iph_semanal ----------
    semanal, vistos = [], {}

    def por(fim, periodo, origem, valores):
        if fim in vistos:
            return
        row = {"fim": fim, "periodo": periodo, "origem": origem}
        row.update(valores)
        vistos[fim] = row
        semanal.append(row)

    # 1) manuais (jul-set/2025)
    if MANUAIS.exists():
        for s in json.loads(MANUAIS.read_text(encoding="utf-8"))["semanas"]:
            por(s["fim"], s["periodo"], "informe (transcrito)",
                {k: v for k, v in s.items() if k not in ("fim", "periodo")})

    # 2) boletins (Figura 1)
    for ym in meses_ord:
        y, mth = map(int, ym.split("-"))
        for sem in boletins[ym]["semanas"]:
            if not sem["periodo"]:
                continue
            por(semana_fim_iso(sem["periodo"], y, mth), sem["periodo"], "boletim", sem["valores"])

    # 3) informes posteriores ao ultimo boletim
    limite = dstr(boletins[ultimo]["data_fim"]) if boletins[ultimo]["data_fim"] else None
    for inf in sorted(DIR_WEEKLY.glob("InformeCEASA*.pdf")):
        try:
            info = parse_informe(str(inf))
        except Exception as e:  # noqa: BLE001
            aviso(f"informe {inf.name}: {e}")
            continue
        if not info:
            continue
        fim_d = dstr(info["fim"])
        if limite and fim_d <= limite + timedelta(days=2):
            continue
        por(fim_d.isoformat(), f"{info['ini'][:5]} a {info['fim'][:5]}", "informe", info["valores"])

    semanal.sort(key=lambda r: r["fim"])
    for a, b in zip(semanal, semanal[1:]):
        gap = (date.fromisoformat(b["fim"]) - date.fromisoformat(a["fim"])).days
        if gap > 10:
            aviso(f"Semanal: {gap} dias entre {a['fim']} e {b['fim']}")

    # ---------- decomposicao do ultimo mes ----------
    SG2SERIE = {
        "Frutas - brasileiras": "Frutas_brasileiras",
        "Frutas - importadas": "Frutas_importadas",
        "Hortalicas - folha, flor e haste": "Hortalicas_folha_flor_haste",
        "Hortalicas - fruto": "Hortalicas_fruto",
        "Hortalicas - raiz, bulbo, tuberculo e rizoma": "Hortalicas_raiz_bulbo_tuberculo_rizoma",
        "Ovos": "Ovos",
    }
    decomposicao = {}
    sub_peso = {}
    for chave, ap in boletins[ultimo]["apendice"].items():
        if ap["peso"] is None:
            continue
        sg = PRODUTOS[chave]["subgrupo"]
        sub_peso[sg] = sub_peso.get(sg, 0) + ap["peso"]
    if sub_peso:
        tab1_u = boletins[ultimo]["tab1"]
        decomposicao[ultimo] = {"subgrupos": [
            {"subgrupo": sg, "peso": round(p, 4), "variacao": tab1_u.get(SG2SERIE[sg]),
             "impacto_pp": round(p * tab1_u[SG2SERIE[sg]], 4) if tab1_u.get(SG2SERIE[sg]) is not None else None}
            for sg, p in sorted(sub_peso.items(), key=lambda kv: -kv[1])
        ]}

    # ---------- validacoes ----------
    print("\nProdutos/boletim:", [(ym, len(boletins[ym]["apendice"])) for ym in meses_ord])
    print(f"iph_mensal={len(iph_mensal)}  indice_numero={len(serie_indice)}  "
          f"produtos={len(produtos)}  semanas={len(semanal)}")
    # confere Tabela 2 do ultimo boletim (amostra)
    conf = re.findall(r"([A-Z][a-zç]+(?:\s[a-zçã-]+){0,2})\s+(-?\d{1,3},\d{2})%\s*\(R\$ (\d{1,3},\d{2})/kg\)", full_u)
    ok = 0
    for nome, var, preco in conf[:12]:
        ch = canon(nome)
        if ch and ch in produtos and produtos[ch]["serie"]:
            s = produtos[ch]["serie"][-1]
            if abs(s["preco"] - num_br(preco)) < 0.05:
                ok += 1
    if conf:
        print(f"conferencia Tabela 2 (ultimo boletim): {ok}/{min(len(conf),12)} precos batem")

    dados = {
        "meta": {
            "fonte": "IPH CeasaMinas-UFV — CeasaMinas e Departamento de Economia da UFV",
            "url": "https://www.ceasaminas.com.br/indiceufvgeral.asp",
            "base": "dezembro de 2024 = 100",
            "gerado_em": date.today().isoformat(),
            "periodo_mensal": [meses_ord[0], meses_ord[-1]],
            "periodo_semanal": [semanal[0]["fim"], semanal[-1]["fim"]] if semanal else None,
            "n_produtos": len(produtos),
            "series_indice_rotulo": cesta.SERIES_INDICE_ROTULO,
            "series_indice_curto": cesta.SERIES_INDICE_CURTO,
            "avisos": avisos,
        },
        "indice_numero": serie_indice,
        "iph_mensal": iph_mensal,
        "iph_semanal": semanal,
        "decomposicao": decomposicao,
        "produtos": produtos,
    }
    SAIDA.write_text(json.dumps(dados, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\nOK -> {SAIDA}  ({SAIDA.stat().st_size/1024:.0f} KB)   avisos: {len(avisos)}")


if __name__ == "__main__":
    main()
