# -*- coding: utf-8 -*-
"""Screenshots de QA do index.html (Playwright/Chromium). Uso: python scripts/shots.py [tema]"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parent.parent
URL = (RAIZ / "index.html").as_uri()
OUT = RAIZ / ".impeccable" / "review"
OUT.mkdir(parents=True, exist_ok=True)
TEMA = sys.argv[1] if len(sys.argv) > 1 else "auto"

SECOES = ["panorama", "grupos", "semanal", "produtos", "comparador", "comparativo", "rankings", "metodologia"]


def run(pw):
    errs = []
    for label, vw in [("desktop", (1360, 1000)), ("mobile", (390, 844))]:
        br = pw.chromium.launch()
        ctx = br.new_context(viewport={"width": vw[0], "height": vw[1]}, device_scale_factor=2,
                             color_scheme=("dark" if TEMA == "dark" else "light"))
        pg = ctx.new_page()
        pg.on("console", lambda m: errs.append(f"[{label}] {m.type}: {m.text}") if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: errs.append(f"[{label}] PAGEERROR: {e}"))
        pg.goto(URL, wait_until="networkidle")
        pg.wait_for_timeout(1200)
        pg.screenshot(path=str(OUT / f"{label}.png"), full_page=True)
        for s in SECOES:
            try:
                pg.evaluate(f"document.getElementById('{s}').scrollIntoView()")
                pg.wait_for_timeout(700)
                el = pg.query_selector(f"#{s}")
                el.screenshot(path=str(OUT / f"{label}-{s}.png"))
            except Exception as e:
                errs.append(f"[{label}] shot {s}: {e}")
        ctx.close(); br.close()
    print("CONSOLE / ERROS:")
    for e in dict.fromkeys(errs):
        print("  ", e)
    if not errs:
        print("   (nenhum)")
    print(f"\n-> {OUT}")


with sync_playwright() as pw:
    run(pw)
