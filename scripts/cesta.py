# -*- coding: utf-8 -*-
"""
Cesta do IPH CeasaMinas-UFV: mapa canonico produto -> grupo / subgrupo, e
normalizacao dos nomes que aparecem na Tabela A1 dos boletins mensais.

A ordem/lista foi derivada da Tabela A1 (Apendice) dos 15 boletins mensais
(jun/2025 a ago/2026), conferida com as Notas Metodologicas. Sao 58 produtos
que, segundo a metodologia, representam ~97% do volume comercializado no
entreposto de Contagem entre 2021 e 2023.
"""

# Rotulos oficiais dos grupos / subgrupos (como aparecem na Tabela 1 dos boletins)
GRUPOS = ["Frutas", "Hortalicas", "Ovos"]

SUBGRUPOS = [
    "Frutas - brasileiras",
    "Frutas - importadas",
    "Hortalicas - folha, flor e haste",
    "Hortalicas - fruto",
    "Hortalicas - raiz, bulbo, tuberculo e rizoma",
    "Ovos",
]

# Chaves usadas no JSON para as 9 series de indice (IPH + 3 grupos + 6 subgrupos).
# Mapeiam para os rotulos da Tabela 1 / Figura 1 dos boletins.
SERIES_INDICE = {
    "IPH": "IPH",
    "Frutas": "IPH/Frutas",
    "Frutas_brasileiras": "IPH/Frutas brasileiras",
    "Frutas_importadas": "IPH/Frutas importadas",
    "Hortalicas": "IPH/Hortalicas",
    "Hortalicas_folha_flor_haste": "IPH/Hortalicas - folha, flor e haste",
    "Hortalicas_fruto": "IPH/Hortalicas - fruto",
    "Hortalicas_raiz_bulbo_tuberculo_rizoma": "IPH/Hortalicas - raiz, bulbo, tuberculo e rizoma",
    "Ovos": "IPH/Ovos",
}

SERIES_INDICE_ROTULO = {
    "IPH": "IPH geral",
    "Frutas": "Frutas",
    "Frutas_brasileiras": "Frutas brasileiras",
    "Frutas_importadas": "Frutas importadas",
    "Hortalicas": "Hortaliças",
    "Hortalicas_folha_flor_haste": "Hortaliças – folha, flor e haste",
    "Hortalicas_fruto": "Hortaliças – fruto",
    "Hortalicas_raiz_bulbo_tuberculo_rizoma": "Hortaliças – raiz, bulbo, tubérculo e rizoma",
    "Ovos": "Ovos",
}
SERIES_INDICE_CURTO = {
    "IPH": "IPH geral",
    "Frutas": "Frutas",
    "Frutas_brasileiras": "Frutas brasileiras",
    "Frutas_importadas": "Frutas importadas",
    "Hortalicas": "Hortaliças",
    "Hortalicas_folha_flor_haste": "Hort. folha, flor e haste",
    "Hortalicas_fruto": "Hort. fruto",
    "Hortalicas_raiz_bulbo_tuberculo_rizoma": "Hort. raiz, bulbo, tubérculo",
    "Ovos": "Ovos",
}

# Produto canonico (chave, sempre CAIXA ALTA e sem hifen) ->
#   (rotulo de exibicao, grupo, subgrupo)
_CESTA = [
    # ---- Frutas brasileiras (22) ----
    ("ABACATE",                     "Abacate",                          "Frutas", "Frutas - brasileiras"),
    ("ABACAXI PEROLA",              "Abacaxi pérola",              "Frutas", "Frutas - brasileiras"),
    ("BANANA MACA",                 "Banana-maçã",            "Frutas", "Frutas - brasileiras"),
    ("BANANA NANICA",               "Banana-nanica",                    "Frutas", "Frutas - brasileiras"),
    ("BANANA PRATA",                "Banana-prata",                     "Frutas", "Frutas - brasileiras"),
    ("COCO SECO",                   "Coco seco",                        "Frutas", "Frutas - brasileiras"),
    ("COCO VERDE",                  "Coco verde",                       "Frutas", "Frutas - brasileiras"),
    ("GOIABA VERMELHA",             "Goiaba vermelha",                  "Frutas", "Frutas - brasileiras"),
    ("LARANJA PERA",                "Laranja-pera",                     "Frutas", "Frutas - brasileiras"),
    ("LIMAO TAHITI",                "Limão-tahiti",                "Frutas", "Frutas - brasileiras"),
    ("MACA",                        "Maçã",                   "Frutas", "Frutas - brasileiras"),
    ("MAMAO FORMOSA",               "Mamão formosa",               "Frutas", "Frutas - brasileiras"),
    ("MAMAO HAWAY",                 "Mamão havai",                 "Frutas", "Frutas - brasileiras"),
    ("MANGA",                       "Manga",                            "Frutas", "Frutas - brasileiras"),
    ("MARACUJA AZEDO",              "Maracujá azedo",              "Frutas", "Frutas - brasileiras"),
    ("MELANCIA",                    "Melancia",                         "Frutas", "Frutas - brasileiras"),
    ("MELAO AMARELO",               "Melão amarelo",               "Frutas", "Frutas - brasileiras"),
    ("MORANGO",                     "Morango",                          "Frutas", "Frutas - brasileiras"),
    ("PESSEGO",                     "Pêssego",                     "Frutas", "Frutas - brasileiras"),
    ("TANGERINA PONKAN",            "Tangerina ponkan",                 "Frutas", "Frutas - brasileiras"),
    ("UVA NIAGARA",                 "Uva niágara",                 "Frutas", "Frutas - brasileiras"),
    ("UVA VITORIA",                 "Uva vitória",                 "Frutas", "Frutas - brasileiras"),
    # ---- Frutas importadas (2) ----
    ("MACA IMPORTADA RED DELICIOUS","Maçã importada (Red Delicious)", "Frutas", "Frutas - importadas"),
    ("PERA IMPORTADA WILLIAMS",     "Pera importada (Williams)",        "Frutas", "Frutas - importadas"),
    # ---- Hortalicas - folha, flor e haste (7) ----
    ("ALFACE LISA",                 "Alface lisa",                      "Hortalicas", "Hortalicas - folha, flor e haste"),
    ("ALHO PORO",                   "Alho-poró",                   "Hortalicas", "Hortalicas - folha, flor e haste"),
    ("BROCOLIS NINJA",              "Brócolis ninja",             "Hortalicas", "Hortalicas - folha, flor e haste"),
    ("COUVE",                       "Couve",                            "Hortalicas", "Hortalicas - folha, flor e haste"),
    ("COUVE-FLOR",                  "Couve-flor",                       "Hortalicas", "Hortalicas - folha, flor e haste"),
    ("REPOLHO HIBRIDO",             "Repolho híbrido",             "Hortalicas", "Hortalicas - folha, flor e haste"),
    ("REPOLHO ROXO",                "Repolho roxo",                     "Hortalicas", "Hortalicas - folha, flor e haste"),
    # ---- Hortalicas - fruto (14) ----
    ("ABOBRINHA ITALIANA",          "Abobrinha italiana",               "Hortalicas", "Hortalicas - fruto"),
    ("ABOBRINHA MENINA",            "Abobrinha menina",                 "Hortalicas", "Hortalicas - fruto"),
    ("BERINJELA",                   "Berinjela",                        "Hortalicas", "Hortalicas - fruto"),
    ("CHUCHU",                      "Chuchu",                           "Hortalicas", "Hortalicas - fruto"),
    ("JILO COMPRIDO",               "Jiló comprido",              "Hortalicas", "Hortalicas - fruto"),
    ("MILHO VERDE",                 "Milho verde",                      "Hortalicas", "Hortalicas - fruto"),
    ("MORANGA HIBRIDA",             "Moranga híbrida",             "Hortalicas", "Hortalicas - fruto"),
    ("PEPINO AODAI",                "Pepino aodai",                     "Hortalicas", "Hortalicas - fruto"),
    ("PIMENTAO VERDE",              "Pimentão verde",              "Hortalicas", "Hortalicas - fruto"),
    ("QUIABO",                      "Quiabo",                           "Hortalicas", "Hortalicas - fruto"),
    ("TOMATE CEREJA",               "Tomate cereja",                    "Hortalicas", "Hortalicas - fruto"),
    ("TOMATE ITALIANO",             "Tomate italiano",                  "Hortalicas", "Hortalicas - fruto"),
    ("TOMATE LONGA VIDA",           "Tomate longa vida",                "Hortalicas", "Hortalicas - fruto"),
    ("VAGEM MACARRAO",              "Vagem-macarrão",             "Hortalicas", "Hortalicas - fruto"),
    # ---- Hortalicas - raiz, bulbo, tuberculo e rizoma (11) ----
    ("ALHO BRASILEIRO",             "Alho brasileiro",                  "Hortalicas", "Hortalicas - raiz, bulbo, tuberculo e rizoma"),
    ("ALHO IMPORTADO",              "Alho importado",                   "Hortalicas", "Hortalicas - raiz, bulbo, tuberculo e rizoma"),
    ("BATATA DOCE",                 "Batata-doce",                      "Hortalicas", "Hortalicas - raiz, bulbo, tuberculo e rizoma"),
    ("BATATA LISA",                 "Batata lisa",                      "Hortalicas", "Hortalicas - raiz, bulbo, tuberculo e rizoma"),
    ("BETERRABA S/FLS",             "Beterraba (sem folhas)",           "Hortalicas", "Hortalicas - raiz, bulbo, tuberculo e rizoma"),
    ("CEBOLA AMARELA",              "Cebola amarela",                   "Hortalicas", "Hortalicas - raiz, bulbo, tuberculo e rizoma"),
    ("CEBOLA IMPORTADA",            "Cebola importada",                 "Hortalicas", "Hortalicas - raiz, bulbo, tuberculo e rizoma"),
    ("CENOURA",                     "Cenoura",                          "Hortalicas", "Hortalicas - raiz, bulbo, tuberculo e rizoma"),
    ("INHAME DEDO",                 "Inhame-dedo",                      "Hortalicas", "Hortalicas - raiz, bulbo, tuberculo e rizoma"),
    ("MANDIOCA",                    "Mandioca",                         "Hortalicas", "Hortalicas - raiz, bulbo, tuberculo e rizoma"),
    ("MANDIOQUINHA",                "Mandioquinha",                     "Hortalicas", "Hortalicas - raiz, bulbo, tuberculo e rizoma"),
    # ---- Ovos (2) ----
    ("OVOS DE CODORNA",             "Ovos de codorna",                  "Ovos", "Ovos"),
    ("OVOS DE GRANJA",              "Ovos de granja",                   "Ovos", "Ovos"),
]

PRODUTOS = {chave: {"rotulo": rot, "grupo": g, "subgrupo": sg}
            for (chave, rot, g, sg) in _CESTA}
ORDEM_PRODUTOS = [c[0] for c in _CESTA]

# Nomes crus da Tabela A1 que precisam ser mapeados para a chave canonica.
_ALIASES = {
    "ALHO-PORO": "ALHO PORO",
    "ALHO PORÓ": "ALHO PORO",
    "ALHO-PORÓ": "ALHO PORO",
    "BRÓCOLIS NINJA": "BROCOLIS NINJA",
    "BROCOLIS NINJA": "BROCOLIS NINJA",
    "MAÇÃ": "MACA",
    "BANANA MAÇÃ": "BANANA MACA",
    "LIMÃO TAHITI": "LIMAO TAHITI",
    "MAMÃO FORMOSA": "MAMAO FORMOSA",
    "MAMÃO HAWAY": "MAMAO HAWAY",
    "MAMÃO HAVAI": "MAMAO HAWAY",
    "MARACUJÁ AZEDO": "MARACUJA AZEDO",
    "MELÃO AMARELO": "MELAO AMARELO",
    "PÊSSEGO": "PESSEGO",
    "UVA NIÁGARA": "UVA NIAGARA",
    "UVA VITÓRIA": "UVA VITORIA",
    "ABACAXI PÉROLA": "ABACAXI PEROLA",
    "MAÇÃ IMPORTADA RED DELICIOUS": "MACA IMPORTADA RED DELICIOUS",
    "JILÓ COMPRIDO": "JILO COMPRIDO",
    "JILO COMPRIDO": "JILO COMPRIDO",
    "PIMENTÃO VERDE": "PIMENTAO VERDE",
    "VAGEM MACARRÃO": "VAGEM MACARRAO",
    "MORANGA HÍBRIDA": "MORANGA HIBRIDA",
    "REPOLHO HÍBRIDO": "REPOLHO HIBRIDO",
    "BETERRABA SEM FOLHAS": "BETERRABA S/FLS",
    "BETERRABA S/ FLS": "BETERRABA S/FLS",
}


def _strip_accents(s):
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", s)
                   if unicodedata.category(c) != "Mn")


def canon(nome_cru):
    """Normaliza um nome de produto vindo da Tabela A1 para a chave canonica.
    Retorna None se nao for reconhecido."""
    n = " ".join(nome_cru.strip().upper().split())
    n = n.replace("–", "-").replace("  ", " ")
    if n in _ALIASES:
        return _ALIASES[n]
    if n in PRODUTOS:
        return n
    na = _strip_accents(n)
    if na in PRODUTOS:
        return na
    na2 = na.replace("-", " ").replace("  ", " ").strip()
    for chave in PRODUTOS:
        if _strip_accents(chave).replace("-", " ") == na2:
            return chave
    # alias sem acento
    for alias, chave in _ALIASES.items():
        if _strip_accents(alias).replace("-", " ") == na2:
            return chave
    return None


def rotulo(chave):
    return PRODUTOS.get(chave, {}).get("rotulo", chave.title())


if __name__ == "__main__":
    print(f"{len(PRODUTOS)} produtos na cesta")
    from collections import Counter
    c = Counter(v["subgrupo"] for v in PRODUTOS.values())
    for sg in SUBGRUPOS:
        print(f"  {c.get(sg,0):2d}  {sg}")
