/* IPH CeasaMinas-UFV: painel editorial. Requer D3 v7 e as constantes DADOS / COMPARATIVO. */
(function () {
"use strict";
if (typeof d3 === "undefined" || typeof DADOS === "undefined" || !DADOS) {
  console.error("dados ou d3 ausentes"); return;
}

/* ============================ idioma ============================ */
let LANG = "pt";
try { const saved = localStorage.getItem("iph.lang"); if (saved === "en" || saved === "pt") LANG = saved; } catch (e) {}

const LOCALE_PT = {
  dateTime: "%A, %e de %B de %Y. %X", date: "%d/%m/%Y", time: "%H:%M:%S",
  periods: ["AM", "PM"],
  days: ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"],
  shortDays: ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"],
  months: ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"],
  shortMonths: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
};
const LOCALE_EN = {
  dateTime: "%x, %X", date: "%m/%d/%Y", time: "%H:%M:%S",
  periods: ["AM", "PM"],
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};
d3.timeFormatDefaultLocale(LANG === "en" ? LOCALE_EN : LOCALE_PT);

/* ============================ util ============================ */
const D = DADOS, CMP = (typeof COMPARATIVO !== "undefined" && COMPARATIVO) ? COMPARATIVO : null;
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const el = (t, a, kids) => { const n = document.createElement(t); if (a) for (const k in a) { if (k === "class") n.className = a[k]; else if (k === "html") n.innerHTML = a[k]; else if (k === "text") n.textContent = a[k]; else n.setAttribute(k, a[k]); } (kids || []).forEach(c => n.appendChild(typeof c === "string" ? document.createTextNode(c) : c)); return n; };
const norm = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

let nf2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
let nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
function setNumberLocale() {
  const loc = LANG === "en" ? "en-US" : "pt-BR";
  nf2 = new Intl.NumberFormat(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  nf1 = new Intl.NumberFormat(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  nf0 = new Intl.NumberFormat(loc, { maximumFractionDigits: 0 });
}
const reais = v => v == null ? "-" : "R$ " + nf2.format(v);
const pct = (v, d) => v == null ? "-" : (v > 0 ? "+" : (v < 0 ? "−" : "")) + (d === 1 ? nf1 : nf2).format(Math.abs(v)) + "%";
const num = (v, d) => v == null ? "-" : (d === 1 ? nf1 : nf2).format(v);
const signCls = v => v > 0.005 ? "up" : (v < -0.005 ? "down" : "mut");
const tri = v => v > 0.005 ? "▲" : (v < -0.005 ? "▼" : "–");
const dateLoc = () => LANG === "en" ? "en-US" : "pt-BR";
const dfmt = (d, opt) => d.toLocaleDateString(dateLoc(), opt);

const MES_NOME_PT = { "01": "janeiro", "02": "fevereiro", "03": "março", "04": "abril", "05": "maio", "06": "junho", "07": "julho", "08": "agosto", "09": "setembro", "10": "outubro", "11": "novembro", "12": "dezembro" };
const MES_NOME_EN = { "01": "January", "02": "February", "03": "March", "04": "April", "05": "May", "06": "June", "07": "July", "08": "August", "09": "September", "10": "October", "11": "November", "12": "December" };
const mesLongo = ym => { const [y, m] = ym.split("-"); return LANG === "en" ? `${MES_NOME_EN[m]} ${y}` : `${MES_NOME_PT[m]} de ${y}`; };
const mesTitulo = t => LANG === "en" ? d3.timeFormat("%B %Y")(t) : d3.timeFormat("%B de %Y")(t).replace(/^./, c => c.toUpperCase());
const mesAbrevTitulo = t => d3.timeFormat("%B")(t).replace(/^./, c => c.toUpperCase());
const parseYM = ym => { const [y, m] = ym.split("-").map(Number); return new Date(y, m - 1, 1); };
const parseISO = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const isMobile = () => innerWidth < 620;

const css = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
const COL = () => ({
  ink: css("--ink"), ink2: css("--ink-2"), ink3: css("--ink-3"),
  rule: css("--rule"), rule2: css("--rule-2"), surface: css("--surface"),
  alta: css("--alta"), queda: css("--queda"), neutro: css("--neutro"),
  accent: css("--accent"), warn: css("--warn"),
  cat: [css("--c1"), css("--c2"), css("--c3"), css("--c4"), css("--c5")],
});
const divColor = v => v > 0.005 ? COL().alta : (v < -0.005 ? COL().queda : COL().neutro);

/* rótulos bilíngues de grupo / subgrupo / série (as chaves internas continuam em pt, só a exibição muda) */
const SUBGRUPO_LABEL = {
  pt: { "Frutas - brasileiras": "Frutas · brasileiras", "Frutas - importadas": "Frutas · importadas",
    "Hortalicas - folha, flor e haste": "Hortaliças · folha, flor e haste", "Hortalicas - fruto": "Hortaliças · fruto",
    "Hortalicas - raiz, bulbo, tuberculo e rizoma": "Hortaliças · raiz, bulbo e tubérculo", "Ovos": "Ovos" },
  en: { "Frutas - brasileiras": "Fruit · Brazilian", "Frutas - importadas": "Fruit · imported",
    "Hortalicas - folha, flor e haste": "Vegetables · leaf, flower & stem", "Hortalicas - fruto": "Vegetables · fruit",
    "Hortalicas - raiz, bulbo, tuberculo e rizoma": "Vegetables · root, bulb & tuber", "Ovos": "Eggs" },
};
const SUBGRUPO_CURTO = {
  pt: { "Frutas - brasileiras": "Frutas brasileiras", "Frutas - importadas": "Frutas importadas",
    "Hortalicas - folha, flor e haste": "Hort. folha/flor/haste", "Hortalicas - fruto": "Hort. fruto",
    "Hortalicas - raiz, bulbo, tuberculo e rizoma": "Hort. raiz/bulbo/tub.", "Ovos": "Ovos" },
  en: { "Frutas - brasileiras": "Brazilian fruit", "Frutas - importadas": "Imported fruit",
    "Hortalicas - folha, flor e haste": "Veg. leaf/flower/stem", "Hortalicas - fruto": "Veg. fruit",
    "Hortalicas - raiz, bulbo, tuberculo e rizoma": "Veg. root/bulb/tub.", "Ovos": "Eggs" },
};
const GRUPO_LABEL = {
  pt: { Frutas: "Frutas", Hortalicas: "Hortaliças", Ovos: "Ovos" },
  en: { Frutas: "Fruit", Hortalicas: "Vegetables", Ovos: "Eggs" },
};
const sgBonito = sg => (SUBGRUPO_LABEL[LANG] && SUBGRUPO_LABEL[LANG][sg]) || sg;
const sgCurto = sg => (SUBGRUPO_CURTO[LANG] && SUBGRUPO_CURTO[LANG][sg]) || sg;
const grupoBonito = g => (GRUPO_LABEL[LANG] && GRUPO_LABEL[LANG][g]) || g;

const SERIES_LABEL_EN = {
  IPH: "IPH overall", Frutas: "Fruit", Frutas_brasileiras: "Fruit · Brazilian", Frutas_importadas: "Fruit · imported",
  Hortalicas: "Vegetables", Hortalicas_folha_flor_haste: "Vegetables – leaf, flower & stem",
  Hortalicas_fruto: "Vegetables – fruit", Hortalicas_raiz_bulbo_tuberculo_rizoma: "Vegetables – root, bulb & tuber", Ovos: "Eggs",
};
const SERIES_CURTO_EN = {
  IPH: "IPH overall", Frutas: "Fruit", Frutas_brasileiras: "Fruit, Brazilian", Frutas_importadas: "Fruit, imported",
  Hortalicas: "Vegetables", Hortalicas_folha_flor_haste: "Veg. leaf/flower/stem",
  Hortalicas_fruto: "Veg. fruit", Hortalicas_raiz_bulbo_tuberculo_rizoma: "Veg. root/bulb/tuber", Ovos: "Eggs",
};
const serieLabel = k => LANG === "en" ? SERIES_LABEL_EN[k] : SERIES_ROT[k];
const serieLabelCurto = k => LANG === "en" ? SERIES_CURTO_EN[k] : SERIES_CURTO[k];

/* nomes dos produtos do Comparativo CEASA (fonte própria, fora da cesta do IPH) */
const NOME_COMPARATIVO_EN = {
  "ABACATE": "Avocado", "ABACAXI": "Pineapple", "ABO. ITALIANA": "Zucchini", "ABO. MENINA": "Butternut squash",
  "ABO. MOGANGA": "Moranga pumpkin", "ALFACE": "Lettuce", "ALHO BRASILEIRO": "Garlic (Brazilian)",
  "BANANA-NANICA": "Banana (Cavendish)", "BANANA-PRATA": "Banana (silver)", "BATATA": "Potato",
  "BATATA-DOCE": "Sweet potato", "BERINJELA": "Eggplant", "BETERRABA": "Beet", "BROCOLO": "Broccoli",
  "CEBOLA": "Onion", "CENOURA": "Carrot", "CHUCHU": "Chayote", "COCO VERDE": "Green coconut", "COUVE": "Collard greens",
  "COUVE-FLOR": "Cauliflower", "ESPINAFRE": "Spinach", "GOIABA": "Guava", "INHAME": "Yam", "JILO": "Scarlet eggplant",
  "LARANJA": "Orange", "LIMAO": "Lime", "MACA": "Apple", "MAMAO-FORMOSA": "Papaya (Formosa)",
  "MAMAO-HAVAI": "Papaya (Hawaii)", "MANDIOCA": "Cassava", "MANDIOQUINHA": "Peruvian carrot",
  "MANGA": "Mango", "MARACUJA": "Passion fruit", "MELANCIA": "Watermelon", "MELAO": "Melon",
  "MILHO-VERDE": "Sweet corn", "MORANGA": "Pumpkin", "MORANGO": "Strawberry", "OVOS": "Eggs", "PEPINO": "Cucumber",
  "PERA": "Pear", "PIMENTAO": "Bell pepper", "QUIABO": "Okra", "REPOLHO": "Cabbage", "TANGERINA": "Tangerine",
  "TOMATE": "Tomato", "UVA": "Grape", "VAGEM": "Green beans",
};

const TT = $("#tt");
function ttShow(html, ev) { TT.innerHTML = html; TT.classList.add("on"); ttMove(ev); }
function ttMove(ev) {
  const pad = 14, w = TT.offsetWidth, h = TT.offsetHeight;
  let x = ev.clientX + pad, y = ev.clientY + pad;
  if (x + w > innerWidth - 8) x = ev.clientX - w - pad;
  if (y + h > innerHeight - 8) y = ev.clientY - h - pad;
  TT.style.left = Math.max(8, x) + "px"; TT.style.top = Math.max(8, y) + "px";
}
function ttHide() { TT.classList.remove("on"); }

const charts = [];
function register(node, fn) { const rec = { node, fn }; charts.push(rec); fn(); return rec; }
let rT; addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(() => charts.forEach(c => { if (c.node.isConnected && c.node.offsetParent !== null) c.fn(); }), 160); });
function redrawAll() { charts.forEach(c => { if (c.node.isConnected && c.node.offsetParent !== null) c.fn(); }); }

function frame(container, ratio, margin) {
  container.innerHTML = "";
  const W = Math.max(240, Math.round(container.clientWidth || 640));
  const H = Math.max(140, Math.round(W * ratio));
  const m = Object.assign({ t: 16, r: 16, b: 28, l: 42 }, margin || {});
  const svg = d3.select(container).append("svg")
    .attr("class", "chart").attr("viewBox", `0 0 ${W} ${H}`)
    .attr("width", "100%").attr("height", H).attr("role", "img").attr("preserveAspectRatio", "xMidYMid meet");
  const g = svg.append("g").attr("transform", `translate(${m.l},${m.t})`);
  return { svg, g, W, H, iw: W - m.l - m.r, ih: H - m.t - m.b, m };
}
function overlay(g, iw, ih) {
  return g.append("rect").attr("x", 0).attr("y", 0).attr("width", iw).attr("height", ih).attr("fill", "transparent").style("cursor", "crosshair");
}

/* ============================ diverging bars ============================ */
function chartDivergingBars(container, rows, opt) {
  opt = opt || {};
  register(container, () => {
    const c = COL();
    const narrow = container.clientWidth < 560;
    const ratio = opt.ratio || (narrow ? 0.62 : 0.34);
    const m = Object.assign({ t: 20, r: 14, b: opt.rotate ? 92 : (opt.subLabel ? 46 : 34), l: 46 }, opt.margin || {});
    const { g, iw, ih } = frame(container, ratio, m);
    const x = d3.scaleBand().domain(rows.map(d => d.key)).range([0, iw]).padding(0.3);
    const maxAbs = opt.fixedMax || d3.max(rows, d => Math.abs(d.value)) || 1;
    const y = opt.mono
      ? d3.scaleLinear().domain([0, maxAbs * 1.12]).nice().range([ih, 0])
      : d3.scaleLinear().domain([-maxAbs * 1.1, maxAbs * 1.1]).nice().range([ih, 0]);
    g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-iw).tickFormat("")).call(s => s.select(".domain").remove());
    g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5).tickFormat(v => nf0.format(v) + (opt.unit || "%"))).call(s => s.select(".domain").remove()).call(s => s.selectAll("line").remove());
    const y0 = y(0);
    g.append("line").attr("class", "baseline").attr("x1", 0).attr("x2", iw).attr("y1", y0).attr("y2", y0);

    const nTicks = iw < 380 ? 6 : (iw < 620 ? 9 : (iw < 900 ? 15 : 26));
    const every = Math.max(1, Math.ceil(rows.length / nTicks));
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${ih})`)
      .call(d3.axisBottom(x).tickValues(x.domain().filter((_, i) => opt.rotate || rows.length <= nTicks ? true : i % every === 0)).tickFormat(k => { const r = rows.find(d => d.key === k); return r ? r.label : k; }).tickSize(4))
      .call(s => s.select(".domain").attr("stroke", c.rule2))
      .call(s => { if (opt.rotate) s.selectAll("text").attr("transform", "rotate(-34)").attr("text-anchor", "end").attr("dx", "-.5em").attr("dy", ".15em"); });

    if (opt.subLabel) {
      g.selectAll(".sub").data(rows).join("text").attr("class", "lbl").attr("fill", c.ink3)
        .attr("x", d => x(d.key) + x.bandwidth() / 2).attr("y", ih + 28).attr("text-anchor", "middle").attr("font-size", 10)
        .text(d => d.sub || "");
    }

    const bw = Math.min(x.bandwidth(), opt.maxBar || 30);
    const bars = g.selectAll(".bar").data(rows).join("g").attr("class", "bar")
      .attr("transform", d => `translate(${x(d.key) + (x.bandwidth() - bw) / 2},0)`);
    bars.append("rect")
      .attr("x", 0).attr("width", bw)
      .attr("y", d => d.value >= 0 ? y(d.value) : y0)
      .attr("height", d => Math.max(1.5, Math.abs(y(d.value) - y0)))
      .attr("rx", Math.min(4, bw / 2))
      .attr("fill", d => d.muted ? c.neutro : (opt.mono ? (opt.monoColor || c.accent) : divColor(d.value)))
      .attr("opacity", d => d.muted ? 0.55 : (opt.highlightKey && d.key !== opt.highlightKey ? 0.42 : 1))
      .attr("stroke", d => d.key === opt.highlightKey ? c.ink : c.surface)
      .attr("stroke-width", d => d.key === opt.highlightKey ? 2 : 1);
    if (opt.highlightKey) {
      const hd = rows.find(d => d.key === opt.highlightKey);
      if (hd) {
        const hy = hd.value >= 0 ? y(hd.value) - 9 : y(hd.value) + 9;
        g.append("path").attr("d", d3.symbol(d3.symbolTriangle, 34)())
          .attr("transform", `translate(${x(hd.key) + x.bandwidth() / 2},${hy}) rotate(${hd.value >= 0 ? 0 : 180})`)
          .attr("fill", c.ink);
      }
    }
    // rótulos: em tela estreita, só nas maiores barras + a mais recente
    const querRotulo = opt.labelAll || rows.length <= (narrow ? 10 : 16);
    if (querRotulo) {
      let mostra = () => true;
      if (narrow && rows.length > 9) {
        const ordenado = rows.slice().sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 3);
        const keep = new Set(ordenado.map(r => r.key).concat([rows[rows.length - 1].key]));
        mostra = d => keep.has(d.key);
      }
      bars.filter(mostra).append("text").attr("class", "lbl").attr("x", bw / 2).attr("text-anchor", "middle")
        .attr("y", d => {
          const top = y(Math.max(0, d.value)), bot = y(Math.min(0, d.value));
          if (d.value >= 0) return Math.max(10, top - 5);
          return (bot + 14 > ih - 2) ? y0 - 5 : bot + 13;   // rótulo de barra negativa alta vai p/ cima da linha zero
        })
        .attr("fill", c.ink)
        .text(d => opt.mono ? num(d.value, 1) + (opt.unit || "") : pct(d.value, 1));
    } else if (opt.highlightKey) {
      const hd = rows.find(d => d.key === opt.highlightKey);
      if (hd) bars.filter(d => d.key === opt.highlightKey).append("text").attr("class", "lbl-strong").attr("x", bw / 2).attr("text-anchor", "middle")
        .attr("y", hd.value >= 0 ? y(hd.value) - 15 : y(hd.value) + 24)
        .text(pct(hd.value, 1));
    }
    bars.append("rect").attr("x", (x.bandwidth() - bw) / -2 + (x.bandwidth() - bw) / 2 - (x.step() - x.bandwidth()) / 2).attr("width", x.step()).attr("y", 0).attr("height", ih).attr("fill", "transparent")
      .on("pointerenter pointermove", (ev, d) => ttShow(
        `<b>${d.tt || d.label}</b><div class="row"><span class="k">${opt.vlabel || tr("Variação", "Change")}</span><span>${opt.mono ? num(d.value, 1) + (opt.unit || "") : pct(d.value)}</span></div>` + (d.meta || ""), ev))
      .on("pointerleave", ttHide);
  });
}

/* ============================ line ============================ */
function chartLine(container, series, opt) {
  opt = opt || {};
  register(container, () => {
    const c = COL();
    const narrow = container.clientWidth < 560;
    const ratio = opt.ratio || (narrow ? 0.66 : 0.4);
    const rlab = series.length > 1 ? 46 : 12;
    const m = Object.assign({ t: 18, r: 14 + rlab, b: 30, l: opt.money ? 62 : 46 }, opt.margin || {});
    const { g, iw, ih } = frame(container, ratio, m);
    const all = series.flatMap(s => s.points.filter(p => p.y != null));
    const x = d3.scaleTime().domain(d3.extent(all, d => d.x)).range([0, iw]);
    let yd = d3.extent(all, d => d.y);
    if (opt.baseline != null) yd = [Math.min(yd[0], opt.baseline), Math.max(yd[1], opt.baseline)];
    const pad = (yd[1] - yd[0]) * 0.14 || 1;
    const y = d3.scaleLinear().domain([yd[0] - pad, yd[1] + pad]).nice().range([ih, 0]);
    g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-iw).tickFormat("")).call(s => s.select(".domain").remove());
    g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5).tickFormat(opt.yfmt || (v => nf0.format(v)))).call(s => s.select(".domain").remove()).call(s => s.selectAll("line").remove());
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${ih})`)
      .call(d3.axisBottom(x).ticks(Math.max(3, Math.min(8, Math.round(iw / 96)))).tickFormat(opt.xfmt || d3.timeFormat("%b/%y")).tickSize(4))
      .call(s => s.select(".domain").attr("stroke", c.rule2));
    if (opt.baseline != null) g.append("line").attr("class", "baseline").attr("x1", 0).attr("x2", iw).attr("y1", y(opt.baseline)).attr("y2", y(opt.baseline)).attr("stroke-dasharray", "3 3");
    if (opt.axisTitle) g.append("text").attr("class", "axis-title").attr("x", 0).attr("y", -6).text(opt.axisTitle);

    const line = d3.line().x(d => x(d.x)).y(d => y(d.y)).defined(d => d.y != null).curve(d3.curveMonotoneX);
    series.forEach(s => {
      if (opt.area && series.length === 1) {
        g.append("path").datum(s.points.filter(p => p.y != null)).attr("fill", s.color).attr("opacity", 0.14)
          .attr("d", d3.area().x(d => x(d.x)).y0(ih).y1(d => y(d.y)).curve(d3.curveMonotoneX));
      }
      const segs = []; let cur = [];
      s.points.forEach((p, i) => {
        if (p.y == null) return;
        if (cur.length && p.seg !== cur[cur.length - 1].seg) { cur.push(p); segs.push({ seg: cur[cur.length - 2].seg, pts: cur.slice() }); cur = [p]; }
        else cur.push(p);
      });
      if (cur.length) segs.push({ seg: cur[0].seg, pts: cur });
      segs.forEach(sg => g.append("path").datum(sg.pts).attr("fill", "none").attr("stroke", s.color)
        .attr("stroke-width", 2).attr("stroke-linecap", "round").attr("stroke-linejoin", "round")
        .attr("stroke-dasharray", (s.dash || (sg.seg && sg.seg !== "principal")) ? "4 4" : null).attr("d", line));
      if (opt.dots !== false) g.selectAll(null).data(s.points.filter(p => p.y != null)).join("circle")
        .attr("cx", d => x(d.x)).attr("cy", d => y(d.y)).attr("r", 2.6).attr("fill", s.color).attr("stroke", c.surface).attr("stroke-width", 1);
    });
    if (series.length > 1) {
      if (narrow) {
        // legenda abaixo do gráfico (evita colisão de rótulos de fim de linha)
        const lg = d3.select(container).append("div").attr("class", "legend");
        series.forEach(s => lg.append("span").html(`<i style="background:${s.color}"></i>${s.name}`));
      } else {
        const placed = [];
        series.map(s => ({ s, p: s.points.filter(pp => pp.y != null).slice(-1)[0] })).filter(o => o.p)
          .sort((a, b) => y(a.p.y) - y(b.p.y))
          .forEach(({ s, p }) => {
            let ly = y(p.y) + 3;
            while (placed.some(v => Math.abs(v - ly) < 13)) ly += 13;
            placed.push(ly);
            const t = g.append("text").attr("class", "lbl-strong").attr("fill", s.color).attr("x", x(p.x) + 7).attr("y", ly).text(s.name);
            if (x(p.x) + t.node().getComputedTextLength() + 8 > iw + rlab) t.attr("x", x(p.x) - 7).attr("text-anchor", "end");
          });
      }
    }
    const focus = g.append("g").style("display", "none");
    focus.append("line").attr("class", "baseline").attr("y1", 0).attr("y2", ih).attr("stroke", c.ink3);
    const dots = series.map(s => focus.append("circle").attr("r", 4).attr("fill", s.color).attr("stroke", c.surface).attr("stroke-width", 1.5));
    const times = [...new Set(all.map(d => +d.x))].sort((a, b) => a - b).map(t => new Date(t));
    overlay(g, iw, ih)
      .on("pointerenter", () => focus.style("display", null))
      .on("pointerleave", () => { focus.style("display", "none"); ttHide(); })
      .on("pointermove", ev => {
        const [mx] = d3.pointer(ev);
        const t0 = x.invert(Math.max(0, Math.min(iw, mx)));
        let tt = times[0], best = Infinity;
        times.forEach(t => { const dd = Math.abs(t - t0); if (dd < best) { best = dd; tt = t; } });
        focus.attr("transform", `translate(${x(tt)},0)`);
        let html = `<b>${(opt.ttdate || mesTitulo)(tt)}</b>`;
        series.forEach((s, i) => {
          const p = s.points.find(pp => +pp.x === +tt && pp.y != null);
          dots[i].style("display", p ? null : "none");
          if (p) { dots[i].attr("cx", 0).attr("cy", y(p.y)); html += `<div class="row"><span class="k">${s.name}</span><span>${opt.ttfmt ? opt.ttfmt(p) : nf2.format(p.y)}</span></div>`; }
        });
        ttShow(html, ev);
      });
  });
}

/* ============================ heatmap ============================ */
function chartHeat(container, cols, rows, matrix) {
  register(container, () => {
    const c = COL();
    const cw = container.clientWidth || 640;
    const left = Math.min(210, cw * 0.34), top = 10, gap = 2;
    const cellW = Math.max(8, Math.min(24, (cw - left - 14) / cols.length));
    const cellH = 22;
    const W = left + cellW * cols.length + 14, H = top + cellH * rows.length + 34;
    container.innerHTML = "";
    const svg = d3.select(container).append("svg").attr("class", "chart").attr("viewBox", `0 0 ${W} ${H}`).attr("width", "100%").attr("height", H).attr("preserveAspectRatio", "xMidYMid meet");
    const maxAbs = d3.max(rows, r => d3.max(cols, cc => Math.abs((matrix[r.key] || {})[cc.key] || 0))) || 1;
    const g = svg.append("g").attr("transform", `translate(${left},${top})`);
    rows.forEach((r, ri) => {
      g.append("text").attr("class", "lbl").attr("x", -8).attr("y", ri * cellH + cellH / 2 + 3).attr("text-anchor", "end").text(r.label);
      cols.forEach((cc, ci) => {
        const v = (matrix[r.key] || {})[cc.key];
        g.append("rect").attr("x", ci * cellW).attr("y", ri * cellH).attr("width", cellW - gap).attr("height", cellH - gap).attr("rx", 2)
          .attr("fill", v == null ? "transparent" : divColor(v))
          .attr("opacity", v == null ? 1 : (0.16 + 0.84 * Math.min(1, Math.abs(v) / maxAbs)))
          .attr("stroke", v == null ? c.rule : "none").attr("stroke-dasharray", v == null ? "2 2" : null)
          .on("pointerenter pointermove", ev => ttShow(`<b>${r.label}</b><div class="row"><span class="k">${cc.label}</span><span>${v == null ? "-" : pct(v)}</span></div>`, ev))
          .on("pointerleave", ttHide);
      });
    });
    const step = Math.ceil(cols.length / (cellW < 14 ? 6 : 9));
    cols.forEach((cc, ci) => { if (ci % step === 0) g.append("text").attr("class", "lbl").attr("fill", c.ink3).attr("x", ci * cellW + cellW / 2).attr("y", rows.length * cellH + 16).attr("text-anchor", "middle").attr("font-size", 10).text(cc.label); });
  });
}

/* ============================ dot-plot vs referência ============================ */
function chartVsRef(container, items, opt) {
  opt = opt || {};
  register(container, () => {
    const c = COL();
    const rowH = 36, cw = container.clientWidth || 640;
    const left = Math.min(150, cw * 0.3);
    const { g, iw } = frame(container, (rowH * items.length + 56) / cw, { t: 26, r: 66, b: 30, l: left });
    const vals = items.map(d => d.value).filter(v => v != null);
    if (!vals.length) { g.append("text").attr("x", iw / 2).attr("y", 20).attr("text-anchor", "middle").attr("class", "lbl").attr("fill", c.ink3).text(tr("Sem cotação para este produto nesta semana", "No quote for this product this week")); return; }
    const refV = opt.ref;
    const dom = [Math.min(...vals, refV ?? Infinity), Math.max(...vals, refV ?? -Infinity)];
    const span = (dom[1] - dom[0]) || 1;
    const x = d3.scaleLinear().domain([dom[0] - span * 0.08, dom[1] + span * 0.1]).nice().range([0, iw]);
    g.append("g").attr("class", "axis").call(d3.axisTop(x).ticks(5).tickFormat(v => nf2.format(v)).tickSize(3)).call(s => s.select(".domain").remove()).call(s => s.selectAll("line").attr("stroke", c.rule));
    if (refV != null) {
      g.append("line").attr("x1", x(refV)).attr("x2", x(refV)).attr("y1", -4).attr("y2", rowH * items.length).attr("stroke", c.accent).attr("stroke-width", 1).attr("stroke-dasharray", "3 3").attr("opacity", .5);
    }
    items.forEach((d, i) => {
      const yy = i * rowH + rowH / 2;
      g.append("text").attr("class", d.highlight ? "lbl-strong" : "lbl").attr("x", -10).attr("y", yy + 3).attr("text-anchor", "end").text(d.label);
      if (d.value == null) { g.append("text").attr("class", "lbl").attr("fill", c.ink3).attr("x", 4).attr("y", yy + 3).text(tr("sem cotação", "no quote")); return; }
      if (refV != null && !d.highlight) g.append("line").attr("x1", x(refV)).attr("x2", x(d.value)).attr("y1", yy).attr("y2", yy).attr("stroke", c.rule2).attr("stroke-width", 2);
      const r = d.highlight ? 7 : 5.5;
      const dot = g.append("circle").attr("cx", x(d.value)).attr("cy", yy).attr("r", r)
        .attr("fill", d.highlight ? c.accent : (d.outline ? c.surface : c.ink2))
        .attr("stroke", d.outline ? c.accent : c.surface).attr("stroke-width", d.outline ? 2.4 : 1.4);
      g.append("text").attr("class", "lbl").attr("x", x(d.value) + r + 5).attr("y", yy + 3).text(nf2.format(d.value));
      dot.on("pointerenter pointermove", ev => ttShow(
        `<b>${d.label}</b><div class="row"><span class="k">${tr("Preço", "Price")}</span><span>${reais(d.value)}/${d.unit || "kg"}</span></div>` +
        (refV != null ? `<div class="row"><span class="k">${tr("vs.", "vs.")} ${opt.reflabel}</span><span>${pct((d.value / refV - 1) * 100, 1)}</span></div>` : ""), ev)).on("pointerleave", ttHide);
    });
  });
}

/* ============================ tradução: texto fixo do html ============================ */
function tr(pt, en) { return LANG === "en" ? en : pt; }

const FIG_TXT = {
  1: { pt: '<b>Número-índice do IPH CeasaMinas-UFV</b>, dezembro de 2024 (mês-base = 100) até o último mês publicado. Valores abaixo de 100 indicam preços menores que os de dezembro de 2024. Meses de dez/2024 a maio/2025 vêm da Figura 3 dos boletins; os demais, do encadeamento das variações mensais.',
       en: '<b>IPH CeasaMinas-UFV number-index</b>, December 2024 (base month = 100) through the latest published month. Values below 100 mean prices lower than December 2024. Dec/2024–May/2025 come from Figure 3 of the bulletins; the rest, from chaining the monthly changes.' },
  2: { pt: '<b>Variação mensal do IPH</b>. Seguindo a convenção dos informes: <span style="color:var(--alta);font-weight:600">verde = alta</span> de preços, <span style="color:var(--queda);font-weight:600">vermelho = queda</span>. Passe o cursor para o detalhe do mês.',
       en: '<b>Monthly change in the IPH</b>. Following the bulletins’ own convention: <span style="color:var(--alta);font-weight:600">green = a rise</span> in prices, <span style="color:var(--queda);font-weight:600">red = a fall</span>. Hover for the month’s detail.' },
  3: { pt: '<b>Os três grupos no último mês</b> (Frutas, Hortaliças e Ovos): variação de preços e peso de cada um na composição do índice.',
       en: '<b>The three groups in the latest month</b> (Fruit, Vegetables and Eggs): price change and each one’s weight in the index.' },
  4: { pt: '<b>Trajetória comparada</b> dos produtos selecionados.', en: '<b>Compared trajectory</b> of the selected products.' },
  5: { pt: '<b>Variação semanal</b> da série escolhida, <span id="semanalRange"></span>. Semanas de jul a set/2025 foram transcritas dos infográficos (marcadas em cinza).',
       en: '<b>Weekly change</b> for the chosen series, <span id="semanalRange"></span>. Weeks from Jul–Sep/2025 were transcribed from the infographics (marked in grey).' },
  6: { pt: '<b>Mapa de calor semana × série</b>, últimas 26 semanas. <span style="color:var(--alta);font-weight:600">Verde = alta</span>, <span style="color:var(--queda);font-weight:600">vermelho = queda</span>; a intensidade acompanha a magnitude.',
       en: '<b>Heat map, week × series</b>, last 26 weeks. <span style="color:var(--alta);font-weight:600">Green = a rise</span>, <span style="color:var(--queda);font-weight:600">red = a fall</span>; intensity tracks the magnitude.' },
  7: { pt: '<b>Variação semanal do subgrupo do produto</b>, com a semana escolhida em destaque.', en: '<b>Weekly change in the product’s subgroup</b>, with the chosen week highlighted.' },
  8: { pt: '<b>Preço mensal</b> (R$/kg): ponto no fim do período de referência de cada mês.', en: '<b>Monthly price</b> (R$/kg): point at the end of each month’s reference period.' },
  9: { pt: '<b>Variação mês a mês</b> do preço do produto.', en: '<b>Month-to-month change</b> in the product’s price.' },
  10: { pt: '<b>Sazonalidade</b>: preço por mês do calendário, uma linha por ano, quando há dois anos de dados.', en: '<b>Seasonality</b>: price by calendar month, one line per year, when two years of data are available.' },
  11: { pt: '<b>Variação mensal de cada série</b>, jun/2025 ao último mês. Nove painéis na mesma gramática; o número ao lado do título é a variação do último mês.',
        en: '<b>Monthly change for each series</b>, Jun/2025 to the latest month. Nine panels in the same grammar; the number beside each title is the latest month’s change.' },
  12: { pt: '<b>Decomposição do último mês</b>: contribuição de cada subgrupo para a variação do IPH, em pontos percentuais (peso × variação).', en: '<b>Breakdown of the latest month</b>: each subgroup’s contribution to the IPH change, in percentage points (weight × change).' },
  13: { pt: '<b>Variação acumulada em 12 meses do IPH</b>, calculada a partir do número-índice (mês ÷ mesmo mês do ano anterior − 1). Disponível a partir de dez/2025.', en: '<b>12-month accumulated change in the IPH</b>, calculated from the number-index (month ÷ same month last year − 1). Available from Dec/2025 onward.' },
  14: { pt: '<b>Produtos mais voláteis</b>: desvio-padrão das variações mensais em toda a série.', en: '<b>Most volatile products</b>: standard deviation of monthly changes across the whole series.' },
  15: { pt: '<b>Preço do produto nas seis unidades</b>. Grande BH em destaque (ponto verde) e a linha tracejada marca o preço dela; a unidade comparada aparece com o círculo contornado. As cotações podem ser de dias diferentes da mesma semana; ver as datas abaixo.',
        en: '<b>The product’s price across the six units</b>. Greater BH is highlighted (green dot) and the dashed line marks its price; the compared unit shows as an outlined circle. Quotes may be from different days within the same week; see the dates below.' },
  16: { pt: '<b>Diferença de preço no tempo</b>: Grande BH menos a unidade comparada, por semana coletada.', en: '<b>Price gap over time</b>: Greater BH minus the compared unit, by week collected.' },
};

const STATIC_I18N = [
  ["title", null, "IPH CeasaMinas–UFV", "IPH CeasaMinas–UFV"],
  [".wordmark > span > span", null, "Índice de Preços de Hortigranjeiros", "Fresh Produce & Egg Price Index"],
  [".entreposto p", null, "Entreposto da CeasaMinas · Contagem / MG · origem dos preços do IPH", "CeasaMinas wholesale market · Contagem, Minas Gerais · source of the IPH prices"],
  ['#navIn a[href="#panorama"] .lbl', null, "Panorama", "Overview"],
  ['#navIn a[href="#comparador"] .lbl', null, "Comparador", "Comparison"],
  ['#navIn a[href="#semanal"] .lbl', null, "Ritmo semanal", "Weekly rhythm"],
  ['#navIn a[href="#produtos"] .lbl', null, "Explorador de produtos", "Product explorer"],
  ['#navIn a[href="#grupos"] .lbl', null, "Grupos e subgrupos", "Groups & subgroups"],
  ['#navIn a[href="#rankings"] .lbl', null, "Rankings", "Rankings"],
  ['#navIn a[href="#comparativo"] .lbl', null, "Comparativo CEASA", "CEASA comparison"],
  ['#navIn a[href="#metodologia"] .lbl', null, "Metodologia", "Methodology"],
  ["#panorama .section-head h2", null, "O índice de preços dos hortigranjeiros", "The price index for fresh produce and eggs"],
  ["#comparador .section-head h2", null, "Produtos lado a lado", "Products side by side"],
  ["#comparador .section-head p", null, "Preços indexados a 100 no primeiro mês em comum, para comparar trajetórias de itens com faixas de preço diferentes.", "Prices indexed to 100 in the first month they share, so items with very different price ranges can be compared side by side."],
  ["#comparador label[for='cmpModo']", null, "Eixo", "Axis"],
  ["#comparador .field label:not([for])", null, "Produtos (2 a 5)", "Products (2 to 5)"],
  ['#cmpModo button[data-v="indice"]', null, "Índice (100)", "Index (100)"],
  ["#semanal .section-head h2", null, "A oscilação de curto prazo", "Short-term swings"],
  ["#semanal .section-head p", null, "Os informes semanais trazem a variação do índice e dos grupos, não o preço de cada produto. A semana de referência vai de quinta a quarta.", "The weekly bulletins carry the change in the index and the groups, not the price of each product. The reference week runs Thursday to Wednesday."],
  ["#semanal label[for='serieSemanal']", null, "Série", "Series"],
  ["#semanal .sub-h", null, "Um produto, numa semana escolhida", "One product, in a chosen week"],
  ["#semanal .sub-h + p", null, "A CeasaMinas não publica preço semanal por produto, só o índice do grupo e do subgrupo. Escolha o produto e a semana para ver como o <b>subgrupo dele</b> se moveu naquela semana, ao lado do preço mensal mais próximo do produto.", "CeasaMinas doesn’t publish a weekly price per product, only the group and subgroup index. Choose the product and the week to see how <b>its subgroup</b> moved that week, alongside the closest monthly price for the product.", true],
  ["#prodSemInput", "placeholder", "Buscar produto…", "Search for a product…"],
  ["#semanal label[for='semSemana']", null, "Semana", "Week"],
  ["#produtos .section-head h2", null, "Um produto de cada vez", "One product at a time"],
  ["#produtos .section-head p", null, "Preço médio no atacado do entreposto de Contagem (R$/kg), do Apêndice de cada boletim mensal. Série de 15 meses.", "Average wholesale price at the Contagem market (R$/kg), from the Appendix of each monthly bulletin. 15-month series."],
  ["#produtos label[for='prodInput']", null, "Produto", "Product"],
  ["#prodInput", "placeholder", "Buscar entre 58 produtos…", "Search among 58 products…"],
  ["#grupos .section-head h2", null, "Quem puxa o índice", "What drives the index"],
  ["#grupos .section-head p", null, "O IPH se decompõe em 3 grupos e 6 subgrupos. As hortaliças concentram a volatilidade; as frutas brasileiras carregam o maior peso.", "The IPH breaks down into 3 groups and 6 subgroups. Vegetables carry most of the volatility; Brazilian fruit carries the largest weight."],
  ["#rankings .section-head h2", null, "Destaques do mês", "Highlights of the month"],
  ["#rankings label[for='rkMes']", null, "Mês de referência", "Reference month"],
  ["#comparativo .section-head h2", null, "Grande BH e as outras unidades", "Greater BH and the other units"],
  ["#comparativo .section-head p", null, 'Preço mais comum (última cotação) nas seis unidades da CeasaMinas. Tudo é comparado com a <b>Grande BH</b>. Fonte diferente do IPH: lista de produtos e unidades de medida próprias, sem série longa; o histórico é acumulado semana a semana.',
    'Most common price (latest quote) across the six CeasaMinas units. Everything is compared with <b>Greater BH</b>. A different source from the IPH: its own product list and units, with no long history; this panel builds the series up one week at a time.', true],
  ["#comparativo label[for='cmpCeasaProd']", null, "Produto", "Product"],
  ["#comparativo label[for='cmpCeasaCidade']", null, "Comparar Grande BH com", "Compare Greater BH with"],
  [".foot-fonte-l", null, "Fonte dos dados", "Data sources"],
  [".jump-top", "aria-label", "Voltar ao topo", "Back to top"],
  ["#themeBtn", "aria-label", "Alternar tema claro e escuro", "Toggle light/dark theme"],
  ["#langSeg", "aria-label", "Idioma / Language", "Idioma / Language"],
];

// parágrafos e lista da Metodologia (conteúdo mais longo, tratado à parte p/ clareza)
const META_HTML = {
  pt: [
    'O <b>IPH CeasaMinas-UFV</b> é publicado pela <a href="https://www.ceasaminas.com.br/indiceufvgeral.asp" target="_blank" rel="noopener">CeasaMinas</a> em parceria com o Departamento de Economia da UFV (DEE/UFV), com boletins mensais e informes semanais desde junho de 2025. Acompanha os preços do atacado no entreposto de <b>Contagem-MG</b>, com base metodológica nas Notas Metodológicas do índice e mês-base dezembro de 2024 (número-índice = 100).',
    'Este painel <b>não é um produto oficial</b> da CeasaMinas nem da UFV. É uma camada de exploração da série histórica montada a partir dos PDFs públicos.',
  ],
  en: [
    'The <b>IPH CeasaMinas-UFV</b> is published by <a href="https://www.ceasaminas.com.br/indiceufvgeral.asp" target="_blank" rel="noopener">CeasaMinas</a> in partnership with UFV’s Department of Economics (DEE/UFV), with monthly bulletins and weekly reports since June 2025. It tracks wholesale prices at the <b>Contagem-MG</b> market, methodologically grounded in the index’s Notas Metodológicas, with December 2024 as the base month (number-index = 100).',
    'This panel <b>is not an official product</b> of CeasaMinas or UFV. It is an exploration layer over the historical series, built from the public PDFs.',
  ],
};

function applyStaticI18n() {
  document.documentElement.lang = LANG === "en" ? "en" : "pt-BR";
  STATIC_I18N.forEach(([sel, attr, pt, en, isHtml]) => {
    $$(sel).forEach(elm => {
      const val = LANG === "en" ? en : pt;
      if (attr) elm.setAttribute(attr, val);
      else if (isHtml) elm.innerHTML = val;
      else elm.textContent = val;
    });
  });
  $$(".fig-cap").forEach(cap => {
    const numSpan = cap.querySelector(".fig-num"), txtSpan = cap.querySelector(".fig-txt");
    if (!numSpan || !txtSpan) return;
    const n = parseInt(numSpan.textContent.replace(/\D/g, ""), 10);
    numSpan.textContent = tr("Figura", "Figure") + " " + n + ".";
    if (FIG_TXT[n]) txtSpan.innerHTML = FIG_TXT[n][LANG];
  });
  const metaP = $$("#metodologia > div > p");
  META_HTML[LANG].forEach((html, i) => { if (metaP[i]) metaP[i].innerHTML = html; });
}

/* ============================ dados derivados ============================ */
const PRODUTOS = D.produtos;
const CHAVES = Object.keys(PRODUTOS);
const SERIES_ROT = D.meta.series_indice_rotulo;
const SERIES_CURTO = D.meta.series_indice_curto || SERIES_ROT;
const SERIES_KEYS = Object.keys(SERIES_ROT);
const MESES = D.iph_mensal.map(r => r.mes);
const ULT = MESES[MESES.length - 1];

function prodStats(ch) {
  const p = PRODUTOS[ch], s = p.serie;
  const precos = s.map(d => d.preco), vars = s.map(d => d.variacao);
  const last = s[s.length - 1], first = s[0];
  const acum = (last.preco / first.preco - 1) * 100;
  const lm = last.mes.split("-")[1];
  const prev = s.find(d => d.mes.split("-")[1] === lm && d.mes < last.mes);
  const yoy = prev ? (last.preco / prev.preco - 1) * 100 : null;
  return { p, s, last, first, acum, yoy, yoyBase: prev, min: d3.min(precos), max: d3.max(precos), mean: d3.mean(precos), sd: d3.deviation(vars) || 0, varMes: last.variacao };
}

const INDICE_PTS = D.indice_numero.map(d => ({ x: parseYM(d.mes), y: d.valor, seg: (d.origem === "cadeia" || d.origem === "base") ? "principal" : "figura3", raw: d }));
(function () { for (let i = 1; i < INDICE_PTS.length; i++) if (INDICE_PTS[i].seg === "principal" && INDICE_PTS[i - 1].seg !== "principal") INDICE_PTS[i - 1].seg = "principal"; })();

const ACUM12 = (function () {
  const m = D.indice_numero, out = [];
  for (let i = 0; i < m.length; i++) {
    const [y, mm] = m[i].mes.split("-").map(Number);
    const ant = m.find(r => r.mes === `${y - 1}-${String(mm).padStart(2, "0")}`);
    if (ant) out.push({ mes: m[i].mes, valor: (m[i].valor / ant.valor - 1) * 100 });
  }
  return out;
})();

/* ============================ seções ============================ */
function renderIssueLine() {
  const [a, b] = D.meta.periodo_mensal;
  const dataStr = dfmt(parseISO(D.meta.gerado_em));
  $("#issueLine").innerHTML = tr(
    `Série mensal <b>${mesLongo(a)}</b> – <b>${mesLongo(b)}</b><br>Base: dezembro de 2024 = 100 · dados de ${dataStr}`,
    `Monthly series <b>${mesLongo(a)}</b> – <b>${mesLongo(b)}</b><br>Base: December 2024 = 100 · data as of ${dataStr}`
  );
  $("#footMeta").textContent = tr(
    `Dados extraídos em ${dataStr} · ${D.meta.n_produtos} produtos · número-índice de ${mesLongo(D.indice_numero[0].mes)} a ${mesLongo(D.indice_numero.slice(-1)[0].mes)} · ${D.iph_semanal.length} semanas.`,
    `Data extracted on ${dataStr} · ${D.meta.n_produtos} products · number-index from ${mesLongo(D.indice_numero[0].mes)} to ${mesLongo(D.indice_numero.slice(-1)[0].mes)} · ${D.iph_semanal.length} weeks.`
  );
}

function renderPanorama() {
  const ult = D.iph_mensal[D.iph_mensal.length - 1];
  const idxUlt = D.indice_numero[D.indice_numero.length - 1];
  const quedaDesde = (idxUlt.valor / 100 - 1) * 100;
  const a12 = ACUM12[ACUM12.length - 1];
  const v = ult.IPH;
  const dir = v > 0.05 ? tr("subiu", "rose") : (v < -0.05 ? tr("recuou", "fell") : tr("ficou praticamente estável", "held nearly steady"));
  const quedaAlta = tr(quedaDesde < 0 ? "queda" : "alta", quedaDesde < 0 ? "fall" : "rise");
  const extra = a12 ? tr(`, com variação de <b>${pct(a12.valor, 1)}</b> em 12 meses`, `, with a 12-month change of <b>${pct(a12.valor, 1)}</b>`) : "";
  $("#ledePanorama").innerHTML = tr(
    `Em <b>${mesLongo(ult.mes)}</b>, o IPH CeasaMinas-UFV <span class="${signCls(v)}">${dir} <span class="big">${pct(v)}</span></span>. ` +
    `O número-índice fechou o mês em <span class="big tnum">${nf1.format(idxUlt.valor)}</span>` +
    `, uma ${quedaAlta} acumulada de <b>${pct(quedaDesde, 1)}</b> desde dezembro de 2024${extra}.`,
    `In <b>${mesLongo(ult.mes)}</b>, the IPH CeasaMinas-UFV <span class="${signCls(v)}">${dir} to <span class="big">${pct(v)}</span></span>. ` +
    `The number-index closed the month at <span class="big tnum">${nf1.format(idxUlt.valor)}</span>` +
    `, a cumulative ${quedaAlta} of <b>${pct(quedaDesde, 1)}</b> since December 2024${extra}.`
  );

  chartLine($("#figIndice"), [{ name: tr("Número-índice", "Number-index"), color: COL().accent, points: INDICE_PTS }], {
    baseline: 100, area: true, ratio: isMobile() ? 0.6 : 0.33,
    yfmt: v => nf0.format(v), ttfmt: p => nf1.format(p.y) + (p.raw && p.raw.origem === "figura3" ? tr(" (Figura 3)", " (Figure 3)") : ""),
    ttdate: mesTitulo,
    axisTitle: tr("índice · dezembro de 2024 = 100", "index · December 2024 = 100"),
  });
  chartDivergingBars($("#figIphMensal"),
    D.iph_mensal.map(r => ({ key: r.mes, label: r.rotulo, value: r.IPH, tt: mesLongo(r.mes),
      meta: `<div class="row"><span class="k">${grupoBonito("Frutas")}</span><span>${pct(r.Frutas)}</span></div><div class="row"><span class="k">${grupoBonito("Hortalicas")}</span><span>${pct(r.Hortalicas)}</span></div><div class="row"><span class="k">${grupoBonito("Ovos")}</span><span>${pct(r.Ovos)}</span></div>` })),
    { ratio: isMobile() ? 0.6 : 0.32, labelAll: true, vlabel: tr("IPH no mês", "IPH for the month"), margin: { b: 40 } });

  const dec = D.decomposicao[ULT];
  const grupos = [
    { k: "Frutas", subs: ["Frutas - brasileiras", "Frutas - importadas"] },
    { k: "Hortalicas", subs: ["Hortalicas - folha, flor e haste", "Hortalicas - fruto", "Hortalicas - raiz, bulbo, tuberculo e rizoma"] },
    { k: "Ovos", subs: ["Ovos"] },
  ];
  chartDivergingBars($("#figGrupos"), grupos.map(gr => {
    const peso = dec ? d3.sum(dec.subgrupos.filter(s => gr.subs.includes(s.subgrupo)), s => s.peso) : null;
    const rot = grupoBonito(gr.k);
    return { key: gr.k, label: rot, value: ult[gr.k], tt: rot + " · " + mesLongo(ULT),
      sub: peso != null ? tr("peso ", "weight ") + nf1.format(peso * 100) + "%" : "",
      meta: peso != null ? `<div class="row"><span class="k">${tr("Peso no IPH", "Weight in the IPH")}</span><span>${nf1.format(peso * 100)}%</span></div>` : "" };
  }), { ratio: isMobile() ? 0.42 : 0.26, labelAll: true, maxBar: 46, subLabel: true, vlabel: tr("Variação no mês", "Change in the month"), margin: { b: 48 } });
}

function renderGrupos() {
  function drawSM() {
    const host = $("#figSmallMult"); host.innerHTML = "";
    const boxes = SERIES_KEYS.map(k => {
      const cell = el("div", { class: "sm-cell" });
      const ultv = D.iph_mensal[D.iph_mensal.length - 1][k];
      cell.appendChild(el("h4", { text: serieLabelCurto(k) }));
      cell.appendChild(el("div", { class: "sm-meta", html: `${tr("último mês", "latest month")}&nbsp; <span class="${signCls(ultv)}">${tri(ultv)} ${pct(ultv, 1)}</span>` }));
      const box = el("div"); cell.appendChild(box); host.appendChild(cell);
      return { k, box };
    });
    // desenha so depois de inserir as 9 celulas: o grid auto-fit so assume a
    // largura de coluna final quando todos os itens ja estao no DOM.
    boxes.forEach(({ k, box }) => {
      smallDiv(box, D.iph_mensal.map(r => ({ mes: r.mes, rot: r.rotulo, v: r[k] || 0 })), null, serieLabel(k));
    });
  }
  function smallDiv(container, data, fixedMax, name) {
    register(container, () => {
      const c = COL();
      const { g, iw, ih } = frame(container, 0.52, { t: 8, r: 18, b: 18, l: 30 });
      const x = d3.scaleBand().domain(data.map(d => d.mes)).range([0, iw]).padding(0.24);
      const mA = fixedMax || d3.max(data, d => Math.abs(d.v)) || 1;
      const y = d3.scaleLinear().domain([-mA * 1.1, mA * 1.1]).range([ih, 0]);
      g.append("line").attr("class", "baseline").attr("x1", 0).attr("x2", iw).attr("y1", y(0)).attr("y2", y(0));
      g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(3).tickFormat(v => nf0.format(v))).call(s => s.select(".domain").remove()).call(s => s.selectAll("line").remove());
      g.selectAll("rect.b").data(data).join("rect").attr("class", "b")
        .attr("x", d => x(d.mes)).attr("width", x.bandwidth())
        .attr("y", d => d.v >= 0 ? y(d.v) : y(0)).attr("height", d => Math.max(1, Math.abs(y(d.v) - y(0))))
        .attr("rx", 1.5).attr("fill", d => divColor(d.v));
      g.append("rect").attr("width", iw).attr("height", ih).attr("fill", "transparent")
        .on("pointermove", ev => { const mx = d3.pointer(ev)[0]; const i = Math.max(0, Math.min(data.length - 1, Math.floor(mx / x.step()))); const d = data[i]; ttShow(`<b>${name}</b><div class="row"><span class="k">${mesLongo(d.mes)}</span><span>${pct(d.v)}</span></div>`, ev); })
        .on("pointerleave", ttHide);
      [0, data.length - 1].forEach(i => g.append("text").attr("class", "lbl").attr("fill", c.ink3).attr("x", Math.max(6, Math.min(iw - 4, x(data[i].mes) + x.bandwidth() / 2))).attr("y", ih + 13).attr("text-anchor", i === 0 ? "start" : "end").attr("font-size", 9).text(data[i].rot));
    });
  }
  drawSM();

  const dec = D.decomposicao[ULT];
  if (dec) {
    chartDivergingBars($("#figDecomp"), dec.subgrupos.slice().sort((a, b) => b.impacto_pp - a.impacto_pp).map(s => ({
      key: s.subgrupo, label: sgCurto(s.subgrupo), value: s.impacto_pp, tt: sgCurto(s.subgrupo),
      meta: `<div class="row"><span class="k">${tr("Peso", "Weight")}</span><span>${nf1.format(s.peso * 100)}%</span></div><div class="row"><span class="k">${tr("Variação", "Change")}</span><span>${pct(s.variacao)}</span></div>`
    })), { ratio: isMobile() ? 0.62 : 0.4, labelAll: true, rotate: true, maxBar: 44, unit: tr(" p.p.", " pp"), vlabel: tr("Impacto", "Impact"), margin: { b: 108, l: 46 } });
  }
  chartLine($("#figAcum12"), [{ name: tr("IPH (12 meses)", "IPH (12 months)"), color: COL().accent, points: ACUM12.map(d => ({ x: parseYM(d.mes), y: d.valor, seg: "principal" })) }],
    { baseline: 0, area: true, ratio: isMobile() ? 0.6 : 0.3, yfmt: v => nf0.format(v) + "%", ttfmt: p => pct(p.y, 1), ttdate: mesTitulo });
}

function renderSemanal() {
  const sel = $("#serieSemanal");
  sel.innerHTML = "";
  SERIES_KEYS.forEach(k => sel.appendChild(el("option", { value: k }, [serieLabel(k)])));
  const W = D.iph_semanal;
  $("#semanalRange").textContent = tr(
    `${W.length} semanas, de ${dfmt(parseISO(W[0].fim))} a ${dfmt(parseISO(W[W.length - 1].fim))}`,
    `${W.length} weeks, from ${dfmt(parseISO(W[0].fim))} to ${dfmt(parseISO(W[W.length - 1].fim))}`
  );
  function drawWeekly(k) {
    chartDivergingBars($("#figSemanal"), W.map(w => ({
      key: w.fim, label: dfmt(parseISO(w.fim), { day: "2-digit", month: "2-digit" }),
      value: w[k] == null ? 0 : w[k], muted: /transcrito/.test(w.origem) || w[k] == null,
      tt: tr(`Semana ${w.periodo} de ${parseISO(w.fim).getFullYear()}`, `Week of ${w.periodo}, ${parseISO(w.fim).getFullYear()}`),
      meta: `<div class="row"><span class="k">${tr("Fonte", "Source")}</span><span>${w.origem}</span></div>`
    })), { ratio: isMobile() ? 0.62 : 0.32, maxBar: 12, vlabel: serieLabel(k) + tr(" (semana)", " (week)") });
  }
  sel.onchange = () => drawWeekly(sel.value);
  drawWeekly(sel.value || "IPH");

  const last26 = W.slice(-26);
  chartHeat($("#figHeat"),
    last26.map(w => ({ key: w.fim, label: dfmt(parseISO(w.fim), { day: "2-digit", month: "2-digit" }) })),
    SERIES_KEYS.map(k => ({ key: k, label: serieLabelCurto(k) })),
    Object.fromEntries(SERIES_KEYS.map(k => [k, Object.fromEntries(last26.map(w => [w.fim, w[k]]))])));
}

/* ---- produto numa semana escolhida (índice do subgrupo, não preço semanal) ---- */
const SUBGRUPO_SERIE = {
  "Frutas - brasileiras": "Frutas_brasileiras",
  "Frutas - importadas": "Frutas_importadas",
  "Hortalicas - folha, flor e haste": "Hortalicas_folha_flor_haste",
  "Hortalicas - fruto": "Hortalicas_fruto",
  "Hortalicas - raiz, bulbo, tuberculo e rizoma": "Hortalicas_raiz_bulbo_tuberculo_rizoma",
  "Ovos": "Ovos",
};
let prodSemCombo;
function renderProdutoSemana(ch, semanaFim) {
  if (!ch || !PRODUTOS[ch]) { try { ch = localStorage.getItem("iph.prodSemana"); } catch (e) {} }
  if (!ch || !PRODUTOS[ch]) ch = PRODUTOS["TOMATE ITALIANO"] ? "TOMATE ITALIANO" : CHAVES[0];
  try { localStorage.setItem("iph.prodSemana", ch); } catch (e) {}
  if (prodSemCombo) prodSemCombo.set(ch);

  const sel = $("#semSemana");
  const already = sel.dataset.filled === "1";
  if (!already) {
    sel.innerHTML = "";
    D.iph_semanal.forEach(w => sel.appendChild(el("option", { value: w.fim },
      [`${w.periodo} · ${parseISO(w.fim).getFullYear()}`])));
    sel.value = D.iph_semanal[D.iph_semanal.length - 1].fim;
    sel.dataset.filled = "1";
  }
  if (semanaFim && [...sel.options].some(o => o.value === semanaFim)) sel.value = semanaFim;
  const fim = sel.value;
  const week = D.iph_semanal.find(w => w.fim === fim);
  const p = PRODUTOS[ch];
  const serieKey = SUBGRUPO_SERIE[p.subgrupo];
  const valSub = week ? week[serieKey] : null;
  const valGrupo = week ? week[p.grupo] : null;
  const grupoRot = grupoBonito(p.grupo);
  const transcrita = week && /transcrito/.test(week.origem);

  const wd = parseISO(fim);
  let best = p.serie[0], bestDiff = Infinity;
  p.serie.forEach(s => {
    const [y, m] = s.mes.split("-").map(Number);
    const diff = Math.abs(new Date(y, m, 0) - wd);
    if (diff < bestDiff) { bestDiff = diff; best = s; }
  });
  const tag = transcrita ? ` <span class="tag">${tr("semana transcrita", "transcribed week")}</span>` : "";

  $("#ledeProdSemana").innerHTML = !week ? "" : tr(
    `Na semana de <b>${week.periodo} de ${wd.getFullYear()}</b>, o subgrupo de <b>${p.rotulo}</b> (${sgBonito(p.subgrupo)}) ` +
    `<span class="${signCls(valSub)}">${tri(valSub)} ${pct(valSub, 1)}</span>${tag}. ` +
    `Grupo ${grupoRot} na semana: <span class="${signCls(valGrupo)}">${pct(valGrupo, 1)}</span>. ` +
    `Preço mensal mais próximo do produto (${mesLongo(best.mes)}): <b>${reais(best.preco)}/kg</b>, ` +
    `<span class="${signCls(best.variacao)}">${pct(best.variacao, 1)}</span> naquele mês.`,
    `In the week of <b>${week.periodo}, ${wd.getFullYear()}</b>, <b>${p.rotulo}</b>’s subgroup (${sgBonito(p.subgrupo)}) ` +
    `<span class="${signCls(valSub)}">${tri(valSub)} ${pct(valSub, 1)}</span>${tag}. ` +
    `Group ${grupoRot} that week: <span class="${signCls(valGrupo)}">${pct(valGrupo, 1)}</span>. ` +
    `Closest monthly price for the product (${mesLongo(best.mes)}): <b>${reais(best.preco)}/kg</b>, ` +
    `<span class="${signCls(best.variacao)}">${pct(best.variacao, 1)}</span> that month.`
  );

  const f = $("#fichaProdSemana"); f.innerHTML = "";
  [
    [tr("Subgrupo nesta semana", "Subgroup this week"), `<span class="${signCls(valSub)} delta">${tri(valSub)} ${pct(valSub, 1)}</span>`, sgBonito(p.subgrupo)],
    [tr("Grupo nesta semana", "Group this week"), `<span class="${signCls(valGrupo)} delta">${tri(valGrupo)} ${pct(valGrupo, 1)}</span>`, grupoRot],
    [tr("Preço mensal + próximo", "Closest monthly price"), reais(best.preco) + "/kg", mesLongo(best.mes)],
    [tr("Variação naquele mês", "Change that month"), `<span class="${signCls(best.variacao)} delta">${tri(best.variacao)} ${pct(best.variacao, 1)}</span>`, tr("mês fechado, não a semana", "closed month, not the week")],
  ].forEach(([k, v, s]) => f.appendChild(el("div", {}, [el("dt", { text: k }), el("dd", { html: v + (s ? `<small>${s}</small>` : "") })])));

  chartDivergingBars($("#figProdSemana"), D.iph_semanal.map(w => ({
    key: w.fim, label: dfmt(parseISO(w.fim), { day: "2-digit", month: "2-digit" }),
    value: w[serieKey] == null ? 0 : w[serieKey], muted: /transcrito/.test(w.origem) || w[serieKey] == null,
    tt: sgBonito(p.subgrupo) + tr(" · semana de ", " · week of ") + w.periodo,
  })), { ratio: isMobile() ? 0.62 : 0.32, maxBar: 12, vlabel: sgBonito(p.subgrupo) + tr(" (semana)", " (week)"), highlightKey: fim });
}

/* ---- combobox ---- */
function makeCombo(inputEl, listEl, onPick) {
  const items = () => CHAVES.map(ch => ({ ch, rot: PRODUTOS[ch].rotulo, sg: PRODUTOS[ch].subgrupo, n: norm(PRODUTOS[ch].rotulo) }));
  let active = -1, filtered = [];
  function close() { listEl.hidden = true; inputEl.setAttribute("aria-expanded", "false"); active = -1; }
  function render(q) {
    const nq = norm(q);
    filtered = items().filter(it => !nq || it.n.includes(nq));
    listEl.innerHTML = ""; let lastSg = null;
    filtered.slice(0, 60).forEach((it, i) => {
      if (it.sg !== lastSg) { listEl.appendChild(el("div", { class: "grp", text: sgBonito(it.sg) })); lastSg = it.sg; }
      const b = el("button", { type: "button", role: "option" });
      const idx = it.n.indexOf(nq);
      b.innerHTML = nq && idx >= 0 ? it.rot.slice(0, idx) + "<mark>" + it.rot.slice(idx, idx + nq.length) + "</mark>" + it.rot.slice(idx + nq.length) : it.rot;
      if (i === active) b.dataset.active = "1";
      b.addEventListener("click", () => { inputEl.value = it.rot; close(); onPick(it.ch); });
      listEl.appendChild(b);
    });
    if (!filtered.length) listEl.appendChild(el("div", { class: "grp", text: tr("nada encontrado", "nothing found") }));
  }
  inputEl.addEventListener("focus", () => { render(inputEl.value); listEl.hidden = false; inputEl.setAttribute("aria-expanded", "true"); });
  inputEl.addEventListener("input", () => { active = -1; render(inputEl.value); listEl.hidden = false; });
  inputEl.addEventListener("keydown", ev => {
    const btns = $$("button", listEl);
    if (ev.key === "ArrowDown") { ev.preventDefault(); active = Math.min(btns.length - 1, active + 1); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); active = Math.max(0, active - 1); }
    else if (ev.key === "Enter") { ev.preventDefault(); (btns[active] || btns[0])?.click(); return; }
    else if (ev.key === "Escape") { close(); inputEl.blur(); return; }
    else return;
    render(inputEl.value); listEl.hidden = false;
    listEl.querySelector("[data-active]")?.scrollIntoView({ block: "nearest" });
  });
  document.addEventListener("click", ev => { if (!listEl.parentElement.contains(ev.target)) close(); });
  return { set: ch => { inputEl.value = PRODUTOS[ch].rotulo; } };
}

let prodCombo;
function renderProduto(ch) {
  if (!ch || !PRODUTOS[ch]) { try { ch = localStorage.getItem("iph.produto"); } catch (e) {} }
  if (!ch || !PRODUTOS[ch]) ch = PRODUTOS["TOMATE ITALIANO"] ? "TOMATE ITALIANO" : CHAVES[0];
  try { localStorage.setItem("iph.produto", ch); } catch (e) {}
  if (prodCombo) prodCombo.set(ch);
  setHashParam("produtos", "p", ch);
  const st = prodStats(ch), p = st.p;
  const dir = st.varMes > 0.05 ? tr("subiu", "rose") : (st.varMes < -0.05 ? tr("caiu", "fell") : tr("ficou estável", "held steady"));
  $("#ledeProduto").innerHTML = tr(
    `<b>${p.rotulo}</b>, ${sgBonito(p.subgrupo)}. ` +
    `No fechamento de <b>${mesLongo(st.last.mes)}</b>, o preço médio no atacado foi <span class="big tnum">${reais(st.last.preco)}/kg</span>, ` +
    `<span class="${signCls(st.varMes)}">${dir} <b>${pct(st.varMes, 1)}</b></span> ante o mês anterior. ` +
    (st.yoy != null
      ? `Contra ${mesLongo(st.yoyBase.mes)}, <span class="${signCls(st.yoy)}">${st.yoy > 0 ? "alta" : "queda"} de <b>${pct(st.yoy, 1)}</b></span>.`
      : `A série ainda não cobre este mês em dois anos. A variação acumulada desde ${mesLongo(st.first.mes)} é <span class="${signCls(st.acum)}"><b>${pct(st.acum, 1)}</b></span>.`),
    `<b>${p.rotulo}</b>, ${sgBonito(p.subgrupo)}. ` +
    `At the close of <b>${mesLongo(st.last.mes)}</b>, the average wholesale price was <span class="big tnum">${reais(st.last.preco)}/kg</span>, ` +
    `${dir} <b>${pct(st.varMes, 1)}</b> from the previous month. ` +
    (st.yoy != null
      ? `Against ${mesLongo(st.yoyBase.mes)}, <span class="${signCls(st.yoy)}">${st.yoy > 0 ? "a rise" : "a fall"} of <b>${pct(st.yoy, 1)}</b></span>.`
      : `The series doesn’t yet cover this month across two years. The change accumulated since ${mesLongo(st.first.mes)} is <span class="${signCls(st.acum)}"><b>${pct(st.acum, 1)}</b></span>.`)
  );

  const f = $("#fichaProduto"); f.innerHTML = "";
  [
    [tr("Preço atual", "Current price"), reais(st.last.preco) + "/kg", mesLongo(st.last.mes)],
    [tr("Variação no mês", "Change in the month"), `<span class="${signCls(st.varMes)} delta">${tri(st.varMes)} ${pct(st.varMes, 1)}</span>`, tr("vs. mês anterior", "vs. previous month")],
    st.yoy != null
      ? [tr("Variação anual", "Annual change"), `<span class="${signCls(st.yoy)} delta">${tri(st.yoy)} ${pct(st.yoy, 1)}</span>`, tr("vs. ", "vs. ") + st.yoyBase.rotulo]
      : [tr("Acum. na série", "Accum. in series"), `<span class="${signCls(st.acum)} delta">${tri(st.acum)} ${pct(st.acum, 1)}</span>`, tr("desde ", "since ") + st.first.rotulo],
    [tr("Faixa de preço", "Price range"), `<span class="rng">${nf2.format(st.min)} – ${nf2.format(st.max)}</span>`, tr("média ", "average ") + "R$ " + nf2.format(st.mean) + "/kg"],
    [tr("Volatilidade", "Volatility"), nf1.format(st.sd) + tr(" p.p.", " pp"), tr("desvio-padrão mensal", "monthly standard deviation")],
    [tr("Peso no IPH", "Weight in the IPH"), p.peso_iph != null ? nf2.format(p.peso_iph * 100) + "%" : "-", tr("no último boletim", "in the latest bulletin")],
  ].forEach(([k, v, s]) => f.appendChild(el("div", {}, [el("dt", { text: k }), el("dd", { html: v + (s ? `<small>${s}</small>` : "") })])));
  $("#notaProduto").innerHTML = p.nota ? `<div class="note"><b>${tr("Nota.", "Note.")}</b> ${p.nota}</div>` : "";

  chartLine($("#figProdPreco"), [{ name: "R$/kg", color: COL().accent, points: p.serie.map(d => ({ x: parseYM(d.mes), y: d.preco, seg: "principal" })) }],
    { area: true, money: true, ratio: isMobile() ? 0.6 : 0.32, yfmt: v => nf2.format(v), ttfmt: pt => reais(pt.y) + "/kg", ttdate: mesTitulo, axisTitle: "R$/kg" });
  chartDivergingBars($("#figProdVar"), p.serie.map(d => ({ key: d.mes, label: d.rotulo, value: d.variacao, tt: p.rotulo + " · " + mesLongo(d.mes),
    meta: `<div class="row"><span class="k">${tr("Preço no fim do mês", "Price at month's end")}</span><span>${reais(d.preco)}</span></div>` })),
    { ratio: isMobile() ? 0.58 : 0.3, labelAll: true, vlabel: tr("Variação no mês", "Change in the month"), margin: { b: 40 } });

  const byYear = d3.groups(p.serie, d => d.mes.split("-")[0]);
  if (byYear.length >= 2) {
    chartLine($("#figProdSazon"), byYear.map(([yr, arr], i) => ({
      name: yr, color: i === byYear.length - 1 ? COL().accent : COL().ink3,
      points: arr.map(d => ({ x: new Date(2020, +d.mes.split("-")[1] - 1, 1), y: d.preco, seg: "principal" }))
    })), { ratio: 0.42, money: true, dots: true, yfmt: v => nf2.format(v), xfmt: d3.timeFormat("%b"), ttfmt: pt => reais(pt.y), ttdate: mesAbrevTitulo, axisTitle: "R$/kg" });
  } else {
    $("#figProdSazon").innerHTML = `<p class="mut" style="padding:24px;text-align:center">${tr("Só um ano de dados. A sazonalidade aparece quando a série cobrir o mesmo mês em dois anos.", "Only one year of data. Seasonality appears once the series covers the same month across two years.")}</p>`;
  }
}

/* ---- comparador ---- */
let cmpSel = [], cmpModo = "indice";
function renderComparador(initial) {
  if (!cmpSel.length) cmpSel = (initial && initial.length ? initial : ["TOMATE ITALIANO", "BATATA LISA", "CENOURA"]).filter(c => PRODUTOS[c]);
  const chips = $("#cmpChips"); chips.innerHTML = "";
  cmpSel.forEach((ch, i) => {
    const c = el("span", { class: "chip" }, [el("i", { style: `width:9px;height:9px;border-radius:9px;background:${COL().cat[i]}` }), PRODUTOS[ch].rotulo]);
    const b = el("button", { type: "button", "aria-label": tr("remover ", "remove ") + PRODUTOS[ch].rotulo }, ["×"]);
    b.addEventListener("click", () => { cmpSel = cmpSel.filter(x => x !== ch); renderComparador(); });
    c.appendChild(b); chips.appendChild(c);
  });
  if (cmpSel.length < 5) { const add = el("span", { class: "chip add", role: "button", tabindex: "0" }, [tr("+ produto", "+ product")]); add.addEventListener("click", () => openCmpPicker(add)); add.addEventListener("keydown", e => { if (e.key === "Enter") openCmpPicker(add); }); chips.appendChild(add); }
  setHashParam("comparador", "p", cmpSel.join(","));

  const common = MESES.filter(m => cmpSel.every(ch => PRODUTOS[ch].serie.some(d => d.mes === m)));
  const base0 = common[0];
  const series = cmpSel.map((ch, i) => {
    const s = PRODUTOS[ch].serie.filter(d => common.includes(d.mes));
    const b = s.find(d => d.mes === base0).preco;
    return { name: PRODUTOS[ch].rotulo, color: COL().cat[i],
      points: s.map(d => ({ x: parseYM(d.mes), y: cmpModo === "indice" ? d.preco / b * 100 : d.preco, seg: "principal", _p: d.preco })) };
  });
  chartLine($("#figCmp"), series, {
    baseline: cmpModo === "indice" ? 100 : null, money: cmpModo === "reais", ratio: isMobile() ? 0.66 : 0.4,
    yfmt: v => cmpModo === "indice" ? nf0.format(v) : nf2.format(v),
    ttfmt: pt => cmpModo === "indice" ? nf1.format(pt.y) + " · " + reais(pt._p) : reais(pt.y),
    ttdate: mesTitulo,
    axisTitle: cmpModo === "indice" ? `${tr("índice", "index")} · ${d3.timeFormat("%b/%y")(parseYM(base0))} = 100` : "R$/kg",
  });

  const t = $("#cmpTbl"); t.innerHTML = "";
  t.appendChild(el("thead", {}, [el("tr", {}, [tr("Produto", "Product"), tr("Preço atual", "Current price"), tr("No mês", "In the month"), tr("Acum. série", "Accum. series"), tr("Anual", "Annual"), tr("Peso IPH", "IPH weight")].map(h => el("th", { text: h })))]));
  const tb = el("tbody");
  cmpSel.forEach((ch, i) => {
    const st = prodStats(ch);
    tb.appendChild(el("tr", {}, [
      el("td", { html: `<i style="display:inline-block;width:9px;height:9px;border-radius:9px;background:${COL().cat[i]};margin-right:7px"></i>` + PRODUTOS[ch].rotulo }),
      el("td", { text: reais(st.last.preco) }),
      el("td", { html: `<span class="${signCls(st.varMes)}">${pct(st.varMes, 1)}</span>` }),
      el("td", { html: `<span class="${signCls(st.acum)}">${pct(st.acum, 1)}</span>` }),
      el("td", { html: st.yoy != null ? `<span class="${signCls(st.yoy)}">${pct(st.yoy, 1)}</span>` : "<span class='mut'>-</span>" }),
      el("td", { text: PRODUTOS[ch].peso_iph != null ? nf2.format(PRODUTOS[ch].peso_iph * 100) + "%" : "-" }),
    ]));
  });
  t.appendChild(tb);
}
function openCmpPicker(anchor) {
  if ($("#cmpPickList")) { $("#cmpPickList").remove(); return; }
  const wrap = el("div", { class: "combo-list", id: "cmpPickList", style: "position:absolute;left:0;top:calc(100% + 4px)" });
  CHAVES.filter(ch => !cmpSel.includes(ch)).forEach(ch => {
    const b = el("button", { type: "button", text: PRODUTOS[ch].rotulo });
    b.addEventListener("click", () => { cmpSel.push(ch); wrap.remove(); renderComparador(); });
    wrap.appendChild(b);
  });
  anchor.style.position = "relative"; anchor.appendChild(wrap);
  setTimeout(() => document.addEventListener("click", function h(e) { if (!wrap.contains(e.target) && e.target !== anchor) { wrap.remove(); document.removeEventListener("click", h); } }), 0);
}
$$("#cmpModo button").forEach(b => b.addEventListener("click", () => { $$("#cmpModo button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); cmpModo = b.dataset.v; renderComparador(); }));

/* ---- comparativo CEASA ---- */
function nomeBonito(s) {
  if (LANG === "en" && NOME_COMPARATIVO_EN[s]) return NOME_COMPARATIVO_EN[s];
  return s.replace(/^ABO\. /, "Abobrinha ").replace(/^ABACAXI$/, "Abacaxi").replace(/^BROCOLO$/, "Brócolis")
    .toLowerCase().replace(/(^|[\s\-/])([a-zà-ú])/g, (m, a, b) => a + b.toUpperCase());
}
function renderComparativo() {
  if (!CMP || !CMP.historico || !CMP.historico.length) {
    $("#comparativo .controls").innerHTML = "";
    $("#ledeComparativo").innerHTML = `<span class="mut">${tr('Sem dados do comparativo ainda. Rode <code>python scripts/fetch_comparativo.py</code> e reconstrua o painel.', 'No comparison data yet. Run <code>python scripts/fetch_comparativo.py</code> and rebuild the panel.')}</span>`;
    return;
  }
  const last = CMP.historico[CMP.historico.length - 1];
  const cidades = CMP.meta.unidades.filter(u => u !== CMP.meta.referencia);
  const pSel = $("#cmpCeasaProd"), cSel = $("#cmpCeasaCidade");
  pSel.innerHTML = ""; cSel.innerHTML = "";
  CMP.produtos.forEach(p => pSel.appendChild(el("option", { value: p }, [nomeBonito(p)])));
  cidades.forEach(c => cSel.appendChild(el("option", { value: c }, [c])));
  let st0 = { p: "TOMATE", c: "Uberlândia" };
  try { st0 = { p: localStorage.getItem("iph.cmpceasa.p") || "TOMATE", c: localStorage.getItem("iph.cmpceasa.c") || "Uberlândia" }; } catch (e) {}
  if (CMP.produtos.includes(st0.p)) pSel.value = st0.p;
  if (cidades.includes(st0.c)) cSel.value = st0.c;

  function draw() {
    const prod = pSel.value, cid = cSel.value;
    try { localStorage.setItem("iph.cmpceasa.p", prod); localStorage.setItem("iph.cmpceasa.c", cid); } catch (e) {}
    const precos = last.precos[prod] || {};
    const unidade = last.unidade_medida[prod] || "kg";
    const bh = precos[CMP.meta.referencia], other = precos[cid];
    const dif = (bh != null && other != null) ? bh - other : null;
    const difp = (dif != null && other) ? (bh / other - 1) * 100 : null;
    // semântica: Grande BH mais barata = bom p/ quem compra na BH (verde); mais cara = vermelho
    const cls = dif == null ? "mut" : (dif < -0.001 ? "up" : (dif > 0.001 ? "down" : "mut"));
    const nome = nomeBonito(prod);

    $("#ledeComparativo").innerHTML = (bh == null)
      ? tr(`<b>${nome}</b> não teve cotação na Grande BH nesta semana.`, `<b>${nome}</b> had no quote in Greater BH this week.`)
      : tr(
        `<b>${nome}</b> (${unidade}): na <b>Grande BH</b>, ${reais(bh)}. ` +
        (other == null ? `${cid} não cotou o produto nesta semana.` :
          (Math.abs(difp) < 0.5 ? `Em <b>${cid}</b>, ${reais(other)}: praticamente o mesmo preço.` :
            `Em <b>${cid}</b>, ${reais(other)}: <span class="${cls}">a Grande BH está <b>${dif < 0 ? "mais barata" : "mais cara"}</b> em ${reais(Math.abs(dif))} (${pct(difp, 1)})</span>.`)),
        `<b>${nome}</b> (${unidade}): in <b>Greater BH</b>, ${reais(bh)}. ` +
        (other == null ? `${cid} did not quote the product this week.` :
          (Math.abs(difp) < 0.5 ? `In <b>${cid}</b>, ${reais(other)}: practically the same price.` :
            `In <b>${cid}</b>, ${reais(other)}: <span class="${cls}">Greater BH is <b>${dif < 0 ? "cheaper" : "pricier"}</b> by ${reais(Math.abs(dif))} (${pct(difp, 1)})</span>.`))
      );

    const f = $("#fichaComparativo"); f.innerHTML = "";
    [["Grande BH", reais(bh), unidade], [cid, reais(other), unidade],
    [tr("Diferença", "Difference"), dif == null ? "-" : `<span class="${cls}">${reais(Math.abs(dif))}</span>`, dif == null ? "-" : (dif < 0 ? tr("BH mais barata", "BH cheaper") : (dif > 0 ? tr("BH mais cara", "BH pricier") : tr("empate", "tie")))],
    [tr("Em %", "As %"), difp == null ? "-" : `<span class="${cls}">${pct(difp, 1)}</span>`, "Grande BH ÷ " + cid],
    ].forEach(([k, v, s]) => f.appendChild(el("div", {}, [el("dt", { text: k }), el("dd", { html: v + (s ? `<small>${s}</small>` : "") })])));

    chartVsRef($("#figCeasaBarras"), CMP.meta.unidades.map(u => ({
      label: u, value: (last.precos[prod] || {})[u], highlight: u === CMP.meta.referencia, outline: u === cid, unit: unidade
    })), { ref: bh, reflabel: "Grande BH" });

    const hist = CMP.historico.map(s => ({ x: parseISO(s.semana_ref), bh: (s.precos[prod] || {})[CMP.meta.referencia], ot: (s.precos[prod] || {})[cid] }))
      .filter(d => d.bh != null && d.ot != null).map(d => ({ x: d.x, y: d.bh - d.ot, seg: "principal" }));
    const wrap = $("#figCeasaHistWrap");
    if (hist.length >= 2) {
      wrap.hidden = false;
      chartLine($("#figCeasaHist"), [{ name: "Grande BH − " + cid, color: COL().accent, points: hist }],
        { baseline: 0, money: true, ratio: 0.34, yfmt: v => nf2.format(v), ttfmt: p => reais(p.y), ttdate: t => dfmt(t) });
    } else wrap.hidden = true;

    $("#ceasaDatas").innerHTML = `<b>${tr("Datas das cotações desta semana:", "Quote dates this week:")}</b> ` +
      CMP.meta.unidades.map(u => `${u} ${last.datas_cotacao[u] ? dfmt(parseISO(last.datas_cotacao[u])) : "-"}`).join(" · ") +
      tr(`. Coletado em ${dfmt(parseISO(last.coletado_em))}. Histórico acumulado: ${CMP.historico.length} semana(s).`,
         `. Collected on ${dfmt(parseISO(last.coletado_em))}. History so far: ${CMP.historico.length} week(s).`);
  }
  pSel.onchange = draw; cSel.onchange = draw;
  draw();
}

/* ---- rankings ---- */
function renderRankings() {
  const sel = $("#rkMes");
  sel.innerHTML = "";
  MESES.forEach(m => sel.appendChild(el("option", { value: m }, [mesLongo(m)])));
  sel.value = ULT;
  function draw() {
    const m = sel.value;
    const rows = CHAVES.map(ch => { const d = PRODUTOS[ch].serie.find(x => x.mes === m); return d ? { ch, rot: PRODUTOS[ch].rotulo, v: d.variacao, preco: d.preco } : null; }).filter(Boolean);
    const altas = rows.slice().sort((a, b) => b.v - a.v).slice(0, 8);
    const baixas = rows.slice().sort((a, b) => a.v - b.v).slice(0, 8);
    const host = $("#rkAltasBaixas"); host.innerHTML = "";
    const grid = el("div", { style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px;margin:10px 0 8px" });
    [[tr("Maiores altas", "Biggest gains"), altas], [tr("Maiores quedas", "Biggest drops"), baixas]].forEach(([tit, arr]) => {
      const box = el("div");
      box.appendChild(el("h4", { text: tit + " · " + mesLongo(m), style: "margin-bottom:8px" }));
      const tw = el("div", { class: "tbl-wrap", style: "margin:0" });
      const tbl = el("table", { class: "data" });
      tbl.appendChild(el("thead", {}, [el("tr", {}, [tr("Produto", "Product"), tr("Variação", "Change"), tr("Preço", "Price")].map(h => el("th", { text: h })))]));
      const tb = el("tbody");
      arr.forEach(r => tb.appendChild(el("tr", {}, [
        el("td", { html: `<a href="#produtos" data-prod="${r.ch}">${r.rot}</a>` }),
        el("td", { html: `<span class="${signCls(r.v)}">${tri(r.v)} ${pct(r.v, 1)}</span>` }),
        el("td", { text: reais(r.preco) + "/kg" }),
      ])));
      tbl.appendChild(tb); tw.appendChild(tbl); box.appendChild(tw); grid.appendChild(box);
    });
    host.appendChild(grid);
    host.querySelectorAll("[data-prod]").forEach(a => a.addEventListener("click", e => renderProduto(a.dataset.prod)));

    const precoRows = rows.slice().sort((a, b) => b.preco - a.preco);
    const t = $("#rkPrecoTbl"); t.innerHTML = "";
    t.appendChild(el("caption", { style: "text-align:left;padding:11px 14px;color:var(--ink-2);font-size:.86rem", text: tr(`Preço por kg em ${mesLongo(m)}: os 6 mais caros e os 6 mais baratos`, `Price per kg in ${mesLongo(m)}: the 6 priciest and the 6 cheapest`) }));
    t.appendChild(el("thead", {}, [el("tr", {}, [tr("Produto", "Product"), "R$/kg", tr("No mês", "In the month"), tr("Subgrupo", "Subgroup")].map(h => el("th", { text: h })))]));
    const tb = el("tbody");
    precoRows.slice(0, 6).concat([{ sep: 1 }]).concat(precoRows.slice(-6)).forEach(r => {
      if (r.sep) { tb.appendChild(el("tr", {}, [el("td", { colspan: "4", style: "text-align:center;color:var(--ink-3)", text: `⋯ ${rows.length - 12} ${tr("produtos", "products")} ⋯` })])); return; }
      tb.appendChild(el("tr", {}, [
        el("td", { text: r.rot }), el("td", { text: nf2.format(r.preco) }),
        el("td", { html: `<span class="${signCls(r.v)}">${pct(r.v, 1)}</span>` }),
        el("td", { text: sgBonito(PRODUTOS[r.ch].subgrupo) }),
      ]));
    });
    t.appendChild(tb);
  }
  sel.onchange = draw;
  draw();

  const vol = CHAVES.map(ch => ({ ch, rot: PRODUTOS[ch].rotulo, sd: d3.deviation(PRODUTOS[ch].serie.map(d => d.variacao)) || 0 }))
    .sort((a, b) => b.sd - a.sd).slice(0, 12);
  chartDivergingBars($("#figVol"), vol.map(d => ({ key: d.ch, label: d.rot, value: d.sd, tt: d.rot,
    meta: `<div class="row"><span class="k">${tr("Desvio-padrão mensal", "Monthly standard deviation")}</span><span>${nf1.format(d.sd)}${tr(" p.p.", " pp")}</span></div>` })),
    { ratio: isMobile() ? 0.7 : 0.42, labelAll: true, rotate: true, maxBar: 36, mono: true, monoColor: COL().accent, unit: "", vlabel: tr("Volatilidade", "Volatility"), margin: { b: 118, l: 46 } });
}

function renderAvisos() {
  const av = D.meta.avisos || [];
  $("#avisosParse").innerHTML = av.length
    ? `<h4 style="margin:18px 0 6px">${tr("Avisos da última extração", "Notes from the latest extraction")}</h4><ul class="mut" style="font-size:.84rem;padding-left:1.1em">${av.map(a => `<li>${a}</li>`).join("")}</ul>`
    : `<p class="mut" style="font-size:.86rem">${tr(
        `Extração sem avisos: as 15 tabelas mensais e as ${D.iph_semanal.length} semanas passaram nas checagens (contagem de produtos, continuidade de preço e conferência contra a Tabela 2 dos boletins).`,
        `Extraction with no warnings: all 15 monthly tables and ${D.iph_semanal.length} weeks passed the checks (product count, price continuity, and a cross-check against the bulletins’ Table 2).`
      )}</p>`;
}

/* ============================ tema / idioma / nav ============================ */
function setupTheme() {
  const btn = $("#themeBtn"), lbl = $("#themeLabel");
  let saved = null; try { saved = localStorage.getItem("iph.tema"); } catch (e) {}
  if (saved) document.documentElement.setAttribute("data-theme", saved);
  const isDark = () => { const c = document.documentElement.getAttribute("data-theme"); return c === "dark" || (!c && matchMedia("(prefers-color-scheme:dark)").matches); };
  window._themeLabelUpdate = () => { lbl.textContent = isDark() ? tr("Escuro", "Dark") : tr("Claro", "Light"); };
  window._themeLabelUpdate();
  btn.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("iph.tema", next); } catch (e) {}
    window._themeLabelUpdate(); redrawAll();
  });
}
function setupLang() {
  const seg = $("#langSeg");
  function upd() { $$("#langSeg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === LANG))); }
  upd();
  seg.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    if (b.dataset.lang === LANG) return;
    LANG = b.dataset.lang;
    try { localStorage.setItem("iph.lang", LANG); } catch (e) {}
    d3.timeFormatDefaultLocale(LANG === "en" ? LOCALE_EN : LOCALE_PT);
    setNumberLocale();
    upd();
    applyStaticI18n();
    if (window._themeLabelUpdate) window._themeLabelUpdate();
    // reconstrói tudo que é gerado por JS (ledes, fichas, tabelas, gráficos) na nova língua
    $("#serieSemanal").innerHTML = ""; $("#semSemana").dataset.filled = "0";
    renderIssueLine(); renderPanorama(); renderGrupos(); renderSemanal(); renderAvisos();
    renderProdutoSemana(); renderProduto(); renderComparador(); renderComparativo(); renderRankings();
  }));
}
function setupNav() {
  const links = $$("#navIn a");
  const io = new IntersectionObserver(ents => ents.forEach(e => {
    if (e.isIntersecting) { const id = "#" + e.target.id; links.forEach(a => a.setAttribute("aria-current", String(a.getAttribute("href") === id))); }
  }), { rootMargin: "-45% 0px -50% 0px" });
  links.forEach(a => { const t = $(a.getAttribute("href")); if (t) io.observe(t); });
  links.forEach(a => a.addEventListener("click", ev => {
    ev.preventDefault();
    const t = $(a.getAttribute("href"));
    if (t) { t.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth", block: "start" }); history.replaceState(null, "", a.getAttribute("href")); }
  }));
  const jt = $("#jumpTop");
  addEventListener("scroll", () => jt.classList.toggle("on", scrollY > 700), { passive: true });
  jt.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
}
function setHashParam(section, key, val) {
  if ((location.hash || "").slice(1).split("?")[0] !== section) return;
  history.replaceState(null, "", `#${section}?${key}=${encodeURIComponent(val)}`);
}
function readHash() {
  const [sec, qs] = location.hash.replace(/^#/, "").split("?");
  return { sec, params: new URLSearchParams(qs || "") };
}

function init() {
  setNumberLocale();
  applyStaticI18n();
  renderIssueLine();
  renderPanorama();
  renderGrupos();
  renderSemanal();
  renderAvisos();
  prodSemCombo = makeCombo($("#prodSemInput"), $("#prodSemList"), ch => renderProdutoSemana(ch));
  renderProdutoSemana();
  $("#semSemana").addEventListener("change", () => renderProdutoSemana(null, $("#semSemana").value));
  prodCombo = makeCombo($("#prodInput"), $("#prodList"), renderProduto);
  const { sec, params } = readHash();
  renderProduto(sec === "produtos" ? params.get("p") : null);
  renderComparador(sec === "comparador" && params.get("p") ? params.get("p").split(",") : null);
  renderComparativo();
  renderRankings();
  setupTheme();
  setupLang();
  setupNav();
  if (sec) { const t = document.getElementById(sec); if (t) setTimeout(() => t.scrollIntoView(), 80); }
}
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
