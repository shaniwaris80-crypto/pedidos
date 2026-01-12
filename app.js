/* app.js — ARSLAN LISTAS v3.5 (PRO) */
(() => {
  "use strict";

  /* ==========================
     Utils
  ========================== */
  const byId = (id) => document.getElementById(id);
  const $ = (q) => document.querySelector(q);
  const nowISO = () => new Date().toISOString();
  const todayISO = () => new Date().toISOString().split("T")[0];

  function debounce(fn, wait = 300) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }
  const idle = (cb) => (window.requestIdleCallback ? requestIdleCallback(cb) : setTimeout(cb, 1));

  function removeDiacriticsUpper(s) {
    return String(s || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/ñ/g, "N").replace(/Ñ/g, "N")
      .toUpperCase();
  }
  function normKey(s) {
    return removeDiacriticsUpper(s)
      .replace(/[^A-Z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function safeText(id, text) {
    const el = byId(id);
    if (el) el.textContent = text;
  }

  /* ==========================
     Storage keys
  ========================== */
  const LS = {
    THEME: "arslan_theme",
    VOCAB: "arslan_v35_vocab",
    STORES: "arslan_v35_stores",
    ASSIGN: "arslan_v35_assign",
    ORDERS: "arslan_v35_orders",
    PROVIDERS: "arslan_v35_providers",
    EQUIV: "arslan_v35_equiv",
    CATALOG: "arslan_v35_catalog",
    PREFS: "arslan_v35_prefs",
    BACKUPS: "arslan_v35_backups"
  };

  /* ==========================
     Default providers + vocab
  ========================== */
  const DEFAULT_PROVIDERS = [
    { name: "ESMO", phone: "", template: "📦 *Pedido {PROV}*\n\n{LINES}" },
    { name: "MONTENEGRO", phone: "", template: "📦 *Pedido {PROV}*\n\n{LINES}" },
    { name: "ÁNGEL VACA", phone: "", template: "📦 *Pedido {PROV}*\n\n{LINES}" },
    { name: "JOSÉ ANTONIO", phone: "", template: "📦 *Pedido {PROV}*\n\n{LINES}" },
    { name: "JAVI", phone: "", template: "📦 *Pedido {PROV}*\n\n{LINES}" },
    { name: "ANGELO", phone: "", template: "📦 *Pedido {PROV}*\n\n{LINES}" }
  ];

  const OFFICIAL_VOCAB_RAW = `GRANNY FRANCIA
MANZANA PINK LADY
MANDARINA COLOMBE
MANDARINA PLASENCIA
MANDARINA USOPRADES
MANZANA GRNNY SMITH
NARANJA MESA USOPRADES
NARANJA ZUMO USOPRADES
MANZANA STORY
GUAYABA
ROMANESCU
PATATA AGRIA
PATATA MONALISA
PATATA SPUNTA
CEBOLLINO
ENELDO
REMOLACHA
LECHUGA ROBLE
ESCAROLA
GUISANTES
KIWI MARIPOSA
AGUACATE LISO
KIWI ZESPRI GOLD
PARAGUAYO
KIWI TOMASIN PLANCHA
PERA RINCON DEL SOTO
MELOCOTON PRIMERA
AGUACATE GRANEL
MARACUYA
MANZANA GOLDEN 24
PLATANO CANARIO PRIMERA
MANDARINA HOJA
MANZANA GOLDEN 20
NARANJA TOMASIN
NECTARINA
NUECES
SANDIA
LIMON SEGUNDA
MANZANA FUJI
NARANJA MESA SONRISA
JENGIBRE
BATATA
AJO PRIMERA
CEBOLLA NORMAL
CALABAZA GRANDE
PATATA LAVADA
TOMATE CHERRY RAMA
TOMATE CHERRY PERA
TOMATE DANIELA
TOMATE ROSA PRIMERA
TOMATE ASURCADO MARRON
TOMATE RAMA
PIMIENTO PADRON
ZANAHORIA
PEPINO
CEBOLLETA
PUERROS
BROCOLI
JUDIA VERDE
BERENJENA
PIMIENTO ITALIANO VERDE
PIMIENTO ITALIANO ROJO
CHAMPINON
UVA ROJA
UVA BLANCA
ALCACHOFA
CALABACIN
COLIFLOR
BATAVIA
ICEBERG
NARANJA ZUMO
KIWI SEGUNDA
PLATANO CANARIO SUELTO
FRESAS
ARANDANOS
ESPINACA
PEREJIL
CILANTRO
ACELGAS
PIMIENTO VERDE
PIMIENTO ROJO
MACHO VERDE
MACHO MADURO
YUCA
PERA CONFERENCIA PRIMERA BIS
REINETA PARDA
BERZA
COL DE BRUSELAS
CEBOLLA ROJA
MENTA
HABANERO
RABANITOS
PAPAYA
POMELO
TOMATE PERA
TOMATE BOLA
TOMATE PINK
VALVENOSTA GOLDEN
MELON GALIA
APIO
LIMON PRIMERA
MANGO
PINA
NARANJA HOJA
CEBOLLA DULCE
ESPARRAGOS BLANCOS
ESPARRAGOS TRIGUEROS
COCO
GUINDILLA
TOMATE RAFF
REPOLLO
MELON
TOMATE ROSA
MANZANA CRISPS
ALOE VERA PIEZAS
TOMATE ENSALADA
PATATA 10KG
MELON BOLLO
CIRUELA ROJA
LIMA
GUINEO VERDE
BONIATO
PERA AGUA
YAUTIA
YAME
OKRA
MANZANA MELASSI
SANDIA NEGRA
SANDIA RAYADA
HIGOS
KUMATO
HIERBABUENA
LECHUGA ROMANA
KAKI
HINOJOS
GRANADA
CHIRIMOYA
PIMIENTO CALIFORNIA VERDE
PIMIENTO CALIFORNIA ROJO
CASTANA
NABO
CHAYOTE
PIMIENTO PINTON
UVA ROJA PRIMERA
UVA BLANCA PRIMERA`;

  /* ==========================
     App state
  ========================== */
  const state = {
    providers: [],
    activeProv: "",
    vocab: [],
    equivMap: new Map(),
    tiendaState: { sp: [], sl: [], st: [] }, // rows {o,e,q,u,a}
    assignments: {}, // key(product|unit) -> providerName
    orders: {}, // providerName -> [{name, qty, unit}]
    globalRows: [],
    catalog: {}, // key -> {name, unit, prefProv, price, history:[]}
    repartoState: {},
    prefs: { storeSelected: "sp", mobileOneStore: true, catalogOnlyNoPrice: false },
    undoStack: [],
    lastToastUndo: null,
    conflicts: []
  };

  const IGNORE_WORDS = ['caja','cajas','kg','kgs','kilo','kilos','uds','ud','u','unidad','unidades','manojo','manojos','saco','sacos'];
  const MATCH_THRESHOLD = 0.78;

  /* ==========================
     Theme
  ========================== */
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t === "dark" ? "dark" : "light");
    localStorage.setItem(LS.THEME, t);
  }
  function toggleTheme() {
    const cur = localStorage.getItem(LS.THEME) || "light";
    applyTheme(cur === "light" ? "dark" : "light");
  }

  /* ==========================
     Backups
  ========================== */
  function loadBackups() {
    try {
      const arr = JSON.parse(localStorage.getItem(LS.BACKUPS) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }
  function saveBackups(arr) {
    localStorage.setItem(LS.BACKUPS, JSON.stringify(arr.slice(0, 7)));
  }
  function exportPayload() {
    return {
      version: "v3.5",
      exportedAt: nowISO(),
      providers: state.providers,
      activeProv: state.activeProv,
      vocabTxt: byId("vocabTxt") ? (byId("vocabTxt").value || "") : "",
      equivTxt: byId("equivTxt") ? (byId("equivTxt").value || "") : "",
      tiendaState: state.tiendaState,
      assignments: state.assignments,
      orders: state.orders,
      catalog: state.catalog,
      prefs: state.prefs
    };
  }
  function makeBackup(reason = "auto") {
    const snap = exportPayload();
    const b = loadBackups();
    b.unshift({ at: nowISO(), reason, payload: snap });
    saveBackups(b);
    safeText("cloudHint", "Local • Backup ✅");
  }

  function restoreBackup(index) {
    const b = loadBackups();
    const item = b[index];
    if (!item) return;
    importPayload(item.payload, { silent: true });
    toast(`Backup restaurado (${new Date(item.at).toLocaleString()})`, null);
  }

  /* ==========================
     Persist
  ========================== */
  const persistState = debounce(() => {
    localStorage.setItem(LS.STORES, JSON.stringify(state.tiendaState));
    localStorage.setItem(LS.ASSIGN, JSON.stringify(state.assignments));
    localStorage.setItem(LS.ORDERS, JSON.stringify(state.orders));
    localStorage.setItem(LS.PROVIDERS, JSON.stringify(state.providers));
    if (byId("equivTxt")) localStorage.setItem(LS.EQUIV, byId("equivTxt").value || "");
    if (byId("vocabTxt")) localStorage.setItem(LS.VOCAB, byId("vocabTxt").value || "");
    localStorage.setItem(LS.CATALOG, JSON.stringify(state.catalog));
    localStorage.setItem(LS.PREFS, JSON.stringify(state.prefs));
  }, 250);

  function safeLoadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const v = JSON.parse(raw);
      return (v === null || v === undefined) ? fallback : v;
    } catch { return fallback; }
  }

  /* ==========================
     Undo stack
  ========================== */
  function pushUndo(label = "cambio") {
    const snapshot = exportPayload();
    state.undoStack.push({ at: nowISO(), label, snapshot });
    if (state.undoStack.length > 30) state.undoStack.shift();
  }
  function undo() {
    const last = state.undoStack.pop();
    if (!last) { toast("Nada que deshacer.", null); return; }
    importPayload(last.snapshot, { silent: true, keepUndo: true });
    toast(`Deshecho: ${last.label}`, null);
  }

  function importPayload(payload, opts = {}) {
    const { silent = false, keepUndo = false } = opts;
    try {
      if (!payload || typeof payload !== "object") throw new Error("JSON inválido");

      if (!keepUndo) state.undoStack = [];

      // providers
      state.providers = Array.isArray(payload.providers) && payload.providers.length
        ? payload.providers.map(p => ({
            name: removeDiacriticsUpper(p.name || "").trim(),
            phone: String(p.phone || "").trim(),
            template: String(p.template || "📦 *Pedido {PROV}*\n\n{LINES}")
          })).filter(p => p.name)
        : DEFAULT_PROVIDERS.slice();

      state.activeProv = payload.activeProv && state.providers.find(p => p.name === payload.activeProv)
        ? payload.activeProv
        : (state.providers[0]?.name || "ESMO");

      // vocab/equiv
      if (byId("vocabTxt")) byId("vocabTxt").value = String(payload.vocabTxt || "").trim() || OFFICIAL_VOCAB_RAW;
      if (byId("equivTxt")) byId("equivTxt").value = String(payload.equivTxt || "").trim();

      state.tiendaState = payload.tiendaState && typeof payload.tiendaState === "object" ? payload.tiendaState : { sp:[], sl:[], st:[] };
      state.assignments = payload.assignments && typeof payload.assignments === "object" ? payload.assignments : {};
      state.orders = payload.orders && typeof payload.orders === "object" ? payload.orders : {};
      state.catalog = payload.catalog && typeof payload.catalog === "object" ? payload.catalog : {};
      state.prefs = payload.prefs && typeof payload.prefs === "object" ? payload.prefs : state.prefs;

      normalizeOrders();
      loadEquivsToMap();
      refreshAllUI();

      persistState();
      if (!silent) toast("Importado correctamente ✅", null);
      makeBackup("import");
    } catch (e) {
      alert("Error importando JSON: " + (e?.message || e));
    }
  }

  /* ==========================
     Vocab cache
  ========================== */
  let VOCAB_CACHE = null;
  let VOCAB_SIG = null;

  function toLines(t) {
    return String(t || "").split(/[\n\r,]/).map(x => x.trim()).filter(Boolean);
  }
  function uniqueVocab(lines) {
    const seen = new Set(); const out = [];
    for (const l of lines) {
      const t = removeDiacriticsUpper(l).trim();
      if (!t) continue;
      const k = normKey(t);
      if (!seen.has(k)) { seen.add(k); out.push(t); }
    }
    return out;
  }
  function getVocab() {
    const ta = byId("vocabTxt");
    const raw = ta ? (ta.value || "") : OFFICIAL_VOCAB_RAW;
    const sig = raw.length + "|" + raw.slice(0, 40) + "|" + raw.slice(-40);
    if (VOCAB_CACHE && VOCAB_SIG === sig) return VOCAB_CACHE;
    VOCAB_CACHE = uniqueVocab(toLines(raw));
    VOCAB_SIG = sig;
    return VOCAB_CACHE;
  }

  /* ==========================
     Equivalences
  ========================== */
  function loadEquivsToMap() {
    state.equivMap = new Map();
    const ta = byId("equivTxt");
    const lines = toLines(ta ? (ta.value || "") : "");
    for (const line of lines) {
      const m = line.split("=").map(x => x.trim()).filter(Boolean);
      if (m.length !== 2) continue;
      const from = normKey(m[0]);
      const to = normKey(m[1]);
      if (from && to) state.equivMap.set(from, to);
    }
  }
  function applyEquivKey(k) {
    let cur = k;
    for (let i = 0; i < 5; i++) {
      const next = state.equivMap.get(cur);
      if (!next) break;
      cur = next;
    }
    return cur;
  }
  function applyEquivName(name, vocab) {
    const k = applyEquivKey(normKey(name));
    const dest = vocab.find(v => normKey(v) === k);
    return dest || name;
  }

  /* ==========================
     Similarity
  ========================== */
  function stripGenericWords(s) {
    const tokens = normKey(s).split(" ").filter(t => !IGNORE_WORDS.includes(String(t || "").toLowerCase()));
    return tokens.join(" ").trim();
  }
  function bigrams(str) {
    const s = stripGenericWords(str);
    const arr = [];
    for (let i = 0; i < s.length - 1; i++) {
      if (s[i] !== " " && s[i + 1] !== " ") arr.push(s.slice(i, i + 2));
    }
    return arr;
  }
  function diceSim(a, b) {
    const A = bigrams(a), B = bigrams(b);
    if (!A.length || !B.length) return 0;
    let hits = 0; const pool = B.slice();
    A.forEach(bg => {
      const idx = pool.indexOf(bg);
      if (idx > -1) { hits++; pool.splice(idx, 1); }
    });
    return (2 * hits) / (A.length + B.length);
  }
  function tokenSetSim(a, b) {
    const A = new Set(stripGenericWords(a).split(" ").filter(Boolean));
    const B = new Set(stripGenericWords(b).split(" ").filter(Boolean));
    if (!A.size || !B.size) return 0;
    let inter = 0; A.forEach(x => { if (B.has(x)) inter++; });
    return inter / Math.max(A.size, B.size);
  }
  function similarityScore(a, b) { return 0.7 * diceSim(a, b) + 0.3 * tokenSetSim(a, b); }

  function bestMatch(query, vocabArr) {
    const q = stripGenericWords(query);
    let best = { name: null, score: 0 };
    vocabArr.forEach(v => {
      const sc = similarityScore(q, v);
      if (sc > best.score) best = { name: v, score: sc };
    });
    return best;
  }

  /* ==========================
     Parser (smart qty + unit)
  ========================== */
  function parseQtyToken(s) {
    const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (frac) {
      const a = Number(frac[1]), b = Number(frac[2]);
      if (b) return a / b;
    }
    const n = Number(String(s).replace(",", "."));
    return isNaN(n) ? null : n;
  }

  function parseLine(raw) {
    if (!raw) return null;
    let s = String(raw).replace(/\t/g, " ").replace(/\s{2,}/g, " ").trim();
    s = s.replace(/^[-•*]\s*/, "");
    s = s.replace(/(\d[\d,\.]*)(kg|kgs|kilo|kilos|ud|uds|u|unidad|unidades|caja|cajas|manojo|manojos)\b/i, "$1 $2");

    let unit = "";
    const unitM = s.match(/\b(kg|kgs|kilo|kilos|caja|cajas|manojo|manojos|ud|uds|u|unidad|unidades)\b/i);
    if (unitM) {
      const u = unitM[1].toLowerCase();
      if (u.startsWith("kg") || u.startsWith("kilo")) unit = "kg";
      else if (u.startsWith("caj")) unit = "caja";
      else if (u.startsWith("man")) unit = "manojo";
      else unit = "ud";
    }

    let qty = null;
    let name = s;

    const mult = s.match(/\b(\d+[\.,]?\d*|\d+\s*\/\s*\d+)\s*[xX]\s*(\d+[\.,]?\d*|\d+\s*\/\s*\d+)\b/);
    if (mult) {
      const a = parseQtyToken(mult[1].replace(/\s+/g, ""));
      const b = parseQtyToken(mult[2].replace(/\s+/g, ""));
      if (a !== null && b !== null) {
        qty = a * b;
        name = s.replace(mult[0], "").trim();
      }
    }

    if (qty === null) {
      const mX = s.match(/(?:^|\s)(?:x|X|\*)\s*(\d+[\.,]?\d*|\d+\s*\/\s*\d+)\b/);
      if (mX) {
        const n = parseQtyToken(mX[1].replace(/\s+/g, ""));
        if (n !== null) {
          qty = n;
          name = s.replace(mX[0], " ").trim();
        }
      }
    }

    if (qty === null) {
      const mEnd = s.match(/(\d+[\.,]?\d*|\d+\s*\/\s*\d+)\s*(?:kg|kgs|kilo|kilos|uds|ud|u|unidad|unidades|caja|cajas|manojo|manojos)?\s*$/i);
      if (mEnd) {
        const n = parseQtyToken(mEnd[1].replace(/\s+/g, ""));
        if (n !== null) {
          qty = n;
          name = s.slice(0, mEnd.index).trim();
        }
      }
    }

    if (qty === null) {
      const mStart = s.match(/^\s*(\d+[\.,]?\d*|\d+\s*\/\s*\d+)\s+(.*)$/);
      if (mStart) {
        const n = parseQtyToken(mStart[1].replace(/\s+/g, ""));
        if (n !== null) {
          qty = n;
          name = mStart[2].trim();
        }
      }
    }

    if (qty === null) qty = 1;

    const cleanedName = stripGenericWords(name);

    return {
      original: removeDiacriticsUpper(s),
      name: cleanedName,
      qty,
      unit
    };
  }

  /* ==========================
     Providers
  ========================== */
  function safeUpperName(s) { return removeDiacriticsUpper(s || "").trim(); }

  function loadProviders() {
    const saved = safeLoadJSON(LS.PROVIDERS, null);
    if (Array.isArray(saved) && saved.length) {
      state.providers = saved.map(p => ({
        name: safeUpperName(p.name),
        phone: String(p.phone || "").trim(),
        template: String(p.template || "📦 *Pedido {PROV}*\n\n{LINES}")
      })).filter(p => p.name);
    } else {
      state.providers = DEFAULT_PROVIDERS.slice();
    }
    state.activeProv = state.providers[0]?.name || "ESMO";
  }

  function providerNames() {
    return state.providers.map(p => p.name);
  }

  function normalizeOrders() {
    const names = providerNames();
    names.forEach(p => { if (!Array.isArray(state.orders[p])) state.orders[p] = []; });
    Object.keys(state.orders).forEach(k => { if (!names.includes(k)) delete state.orders[k]; });
    if (!state.activeProv || !names.includes(state.activeProv)) state.activeProv = names[0] || "ESMO";
  }

  function buildProvBar() {
    const bar = byId("provBar");
    if (!bar) return;
    bar.innerHTML = "";
    state.providers.forEach(p => {
      const b = document.createElement("button");
      b.className = "prov-btn" + (p.name === state.activeProv ? " active" : "");
      b.textContent = p.name;
      b.onclick = () => {
        state.activeProv = p.name;
        buildProvBar();
        idle(unifyGlobal);
      };
      bar.appendChild(b);
    });
    safeText("provCountPill", `Proveedores: ${state.providers.length}`);
  }

  /* ==========================
     Autocomplete (safe)
  ========================== */
  let AC_ACTIVE = null;
  let AC_ANCHOR = null;

  function closeAC() {
    if (AC_ACTIVE) { AC_ACTIVE.remove(); AC_ACTIVE = null; AC_ANCHOR = null; }
  }

  document.addEventListener("click", (e) => {
    if (AC_ACTIVE && !AC_ACTIVE.contains(e.target) && e.target !== AC_ANCHOR) closeAC();
  }, { capture: true });

  window.addEventListener("scroll", () => { if (AC_ACTIVE) closeAC(); }, { passive: true });
  window.addEventListener("resize", () => { if (AC_ACTIVE) closeAC(); }, { passive: true });

  function attachAutocomplete(cell, onPick) {
    if (!cell) return;
    cell.addEventListener("input", () => {
      const val = stripGenericWords(cell.innerText || "");
      closeAC();
      if (!val) return;

      const vocab = getVocab();
      const needle = normKey(val);
      const suggestions = vocab.filter(v => normKey(v).includes(needle)).slice(0, 8);
      if (!suggestions.length) return;

      const rect = cell.getBoundingClientRect();
      const box = document.createElement("div");
      box.className = "ac-box";
      box.style.left = (rect.left + window.scrollX) + "px";
      box.style.top = (rect.bottom + window.scrollY) + "px";
      box.style.width = rect.width + "px";

      suggestions.forEach(s => {
        const item = document.createElement("div");
        item.className = "ac-item";
        item.textContent = s;
        item.onclick = () => { onPick(s); closeAC(); };
        box.appendChild(item);
      });

      document.body.appendChild(box);
      AC_ACTIVE = box;
      AC_ANCHOR = cell;
    }, { passive: true });
  }

  /* ==========================
     Store standardize + render
  ========================== */
  function mergeSame(items) {
    const map = new Map();
    for (const r of items) {
      const k = applyEquivKey(normKey(r.e || r.name || ""));
      const unit = r.u || r.unit || "";
      const key = k + "|" + unit;
      if (!map.has(key)) map.set(key, { ...r, q: Number(r.q || r.qty || 0) });
      else map.get(key).q += Number(r.q || r.qty || 0);
    }
    return Array.from(map.values());
  }

  function standardizeStore(code, text) {
    const vocab = getVocab();
    loadEquivsToMap();

    const rows = [];
    toLines(text).forEach(line => {
      const p = parseLine(line);
      if (!p) return;

      let baseName = applyEquivName(p.name, vocab);

      const exact = vocab.find(v => normKey(v) === normKey(baseName));
      if (exact) {
        rows.push({ o: p.original, e: exact, q: p.qty, u: p.unit, a: false });
        return;
      }

      const m = bestMatch(baseName, vocab);
      if (m.name && m.score >= MATCH_THRESHOLD) {
        rows.push({ o: p.original, e: m.name, q: p.qty, u: p.unit, a: true });
      } else {
        rows.push({ o: p.original, e: removeDiacriticsUpper(baseName), q: p.qty, u: p.unit, a: true });
      }
    });

    const merged = mergeSame(rows);
    state.tiendaState[code] = merged;
  }

  function renderStoreTable(code) {
    const wrap = byId("tbl_store_wrap");
    if (!wrap) return;

    const rows = state.tiendaState[code] || [];
    if (!rows.length) { wrap.innerHTML = ""; return; }

    let html = `<div class="scroll-x"><table><thead>
      <tr><th>Original</th><th>Estandarizado</th><th>Cantidad</th><th>Unidad</th><th>Estado</th></tr>
    </thead><tbody>`;

    rows.forEach((r, i) => {
      html += `<tr>
        <td>${r.o || ""}</td>
        <td contenteditable="true" data-i="${i}" data-f="e" ${r.a ? 'class="red"' : ""}>${r.e || ""}</td>
        <td><input class="input" data-i="${i}" data-f="q" inputmode="decimal" value="${String(r.q ?? "")}"></td>
        <td>
          <select class="select" data-i="${i}" data-f="u">
            <option value="" ${!r.u ? "selected" : ""}>(-)</option>
            <option value="kg" ${r.u==="kg"?"selected":""}>kg</option>
            <option value="caja" ${r.u==="caja"?"selected":""}>caja</option>
            <option value="manojo" ${r.u==="manojo"?"selected":""}>manojo</option>
            <option value="ud" ${r.u==="ud"?"selected":""}>ud</option>
          </select>
        </td>
        <td>${r.a ? '<span class="pill warn">Revisar</span>' : '<span class="pill ok">OK</span>'}</td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
    wrap.innerHTML = html;

    wrap.querySelectorAll('td[contenteditable][data-f="e"]').forEach(cell => {
      const i = Number(cell.dataset.i);

      attachAutocomplete(cell, (picked) => {
        pushUndo("editar producto tienda");
        state.tiendaState[code][i].e = picked;
        state.tiendaState[code][i].a = false;
        persistState();
        idle(() => {
          renderStoreTable(code);
          unifyGlobal();
          syncCatalogFromPurchases(true);
        });
      });

      cell.addEventListener("blur", () => {
        const val = removeDiacriticsUpper(cell.innerText.trim());
        pushUndo("editar producto tienda");
        const vocab = getVocab();
        state.tiendaState[code][i].e = val;
        const exact = vocab.find(v => normKey(v) === normKey(val));
        state.tiendaState[code][i].a = !exact;
        persistState();
        idle(() => {
          renderStoreTable(code);
          unifyGlobal();
          syncCatalogFromPurchases(true);
        });
      }, { passive: true });
    });

    wrap.querySelectorAll('input[data-f="q"]').forEach(inp => {
      inp.addEventListener("change", () => {
        const i = Number(inp.dataset.i);
        const val = Number(String(inp.value).replace(",", ".")) || 0;
        pushUndo("editar cantidad tienda");
        state.tiendaState[code][i].q = val;
        persistState();
        idle(() => {
          unifyGlobal();
          syncCatalogFromPurchases(true);
        });
      });
    });

    wrap.querySelectorAll('select[data-f="u"]').forEach(sel => {
      sel.addEventListener("change", () => {
        const i = Number(sel.dataset.i);
        pushUndo("editar unidad tienda");
        state.tiendaState[code][i].u = sel.value;
        persistState();
        idle(() => {
          unifyGlobal();
          syncCatalogFromPurchases(true);
        });
      });
    });
  }

  function storeToTextarea(code) {
    const ta = byId("in_store");
    if (!ta) return;
    const rows = state.tiendaState[code] || [];
    const out = rows.map(r => `${r.e} ${r.q}${r.u ? " " + r.u : ""}`).join("\n");
    ta.value = out;
  }

  function exportStoreTXT(code) {
    const rows = state.tiendaState[code] || [];
    if (!rows.length) return alert("No hay datos estandarizados.");
    const ok = rows.filter(r => !r.a);
    if (!ok.length) return alert("Aún hay productos por revisar (en rojo).");
    const txt = ok.map(x => `${x.q} ${x.e}${x.u ? " " + x.u : ""}`).join("\n");
    downloadText(txt, `${code}_estandarizado_${todayISO()}.txt`);
  }

  function waStore(code) {
    const rows = state.tiendaState[code] || [];
    if (!rows.length) return alert("No hay datos estandarizados.");
    const ok = rows.filter(r => !r.a);
    if (!ok.length) return alert("Aún hay productos por revisar (en rojo).");
    const txt = ok.map(x => `${x.q} ${x.e}${x.u ? " " + x.u : ""}`).join("\n");
    waOpen(`🛒 *Pedido ${code.toUpperCase()}*\n\n${txt}`);
  }

  /* ==========================
     Global unify + assign
  ========================== */
  function assignmentKey(row) {
    const k = applyEquivKey(normKey(row.name));
    return k + "|" + (row.unit || "");
  }

  function unifyGlobal() {
    const wrap = byId("global_wrap");
    const all = []
      .concat(state.tiendaState.sp || [], state.tiendaState.sl || [], state.tiendaState.st || []);

    const map = new Map();
    all.forEach(r => {
      const k = applyEquivKey(normKey(r.e || ""));
      const unit = r.u || "";
      const key = k + "|" + unit;
      if (!map.has(key)) map.set(key, { name: r.e || "", total: 0, unit });
      map.get(key).total += (Number(r.q) || 0);
    });

    const arr = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "es"));

    const names = arr.map(x => x.name);
    const similarSet = new Set();
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const s1 = names[i], s2 = names[j];
        const sc = similarityScore(s1, s2);
        if (sc >= 0.86 && normKey(s1) !== normKey(s2)) { similarSet.add(s1); similarSet.add(s2); }
      }
    }

    renderGlobalTable(arr, similarSet);
    syncCatalogFromPurchases(true);

    if (!wrap) return;
  }

  function renderGlobalTable(rows, similarSet) {
    const wrap = byId("global_wrap");
    if (!wrap) return;

    const visible = rows.filter(r => !state.assignments[applyEquivKey(normKey(r.name)) + "|" + (r.unit || "")]);
    state.globalRows = visible;

    if (!visible.length) {
      wrap.innerHTML = '<div class="hint">Sin productos (todo asignado o no unificado).</div>';
      return;
    }

    let html = `
      <div class="hint" style="margin-bottom:6px">
        Proveedor activo: <b>${state.activeProv}</b>. Usa ✅ para asignar rápido.
      </div>
      <div class="scroll-x"><table>
        <thead><tr><th></th><th>Producto</th><th>Total</th><th>Unidad</th><th>Estado</th></tr></thead>
        <tbody>`;

    visible.forEach((r, i) => {
      const isSimilar = similarSet.has(r.name);
      html += `<tr data-i="${i}" class="${isSimilar ? "dup" : ""}">
        <td><button class="ok-assign" data-assign="${i}">✅</button></td>
        <td contenteditable="true" data-f="name">${r.name}${isSimilar ? '<span class="flag">⚠️</span>' : ""}</td>
        <td><input class="input" data-i="${i}" data-f="total" inputmode="decimal" value="${String(r.total)}"></td>
        <td>
          <select class="select" data-i="${i}" data-f="unit">
            <option value="" ${!r.unit?"selected":""}>(-)</option>
            <option value="kg" ${r.unit==="kg"?"selected":""}>kg</option>
            <option value="caja" ${r.unit==="caja"?"selected":""}>caja</option>
            <option value="manojo" ${r.unit==="manojo"?"selected":""}>manojo</option>
            <option value="ud" ${r.unit==="ud"?"selected":""}>ud</option>
          </select>
        </td>
        <td>${isSimilar ? '<span class="pill warn">Posible duplicado</span>' : '<span class="pill ok">OK</span>'}</td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
    wrap.innerHTML = html;

    wrap.querySelectorAll("button[data-assign]").forEach(btn => {
      btn.onclick = () => assignFromGlobal(Number(btn.dataset.assign));
    });

    wrap.querySelectorAll('td[contenteditable][data-f="name"]').forEach((cell) => {
      attachAutocomplete(cell, (picked) => {
        const tr = cell.parentElement;
        const idx = Number(tr.dataset.i);
        pushUndo("editar producto global");
        state.globalRows[idx].name = picked;
        persistState();
      });

      cell.addEventListener("blur", () => {
        const tr = cell.parentElement;
        const idx = Number(tr.dataset.i);
        const cleaned = removeDiacriticsUpper(cell.innerText.trim());
        pushUndo("editar producto global");
        state.globalRows[idx].name = cleaned;
        persistState();
        idle(() => { unifyGlobal(); syncCatalogFromPurchases(true); });
      }, { passive: true });
    });

    wrap.querySelectorAll('input[data-f="total"]').forEach(inp => {
      inp.addEventListener("change", () => {
        const idx = Number(inp.dataset.i);
        const val = Number(String(inp.value).replace(",", ".")) || 0;
        pushUndo("editar total global");
        state.globalRows[idx].total = val;
        persistState();
      });
    });

    wrap.querySelectorAll('select[data-f="unit"]').forEach(sel => {
      sel.addEventListener("change", () => {
        const idx = Number(sel.dataset.i);
        pushUndo("editar unidad global");
        state.globalRows[idx].unit = sel.value;
        persistState();
      });
    });
  }

  function assignFromGlobal(idx) {
    const item = state.globalRows[idx];
    if (!item) return;

    pushUndo("asignar proveedor");

    const k = assignmentKey(item);
    state.assignments[k] = state.activeProv;

    const list = state.orders[state.activeProv] || [];
    const ex = list.findIndex(x => assignmentKey({ name: x.name, unit: x.unit }) === k);
    if (ex > -1) list[ex].qty += Number(item.total) || 0;
    else list.push({ name: item.name, qty: Number(item.total) || 0, unit: item.unit || "" });
    state.orders[state.activeProv] = list;

    persistState();
    renderProvidersPanels();
    idle(unifyGlobal);

    toast(`Asignado a ${state.activeProv}: ${item.total} ${item.name}`, { type: "assign", provider: state.activeProv, key: k, name: item.name, total: item.total, unit: item.unit || "" });
  }

  function undoLastAssignment(payload) {
    if (!payload || payload.type !== "assign") return;
    pushUndo("deshacer asignación");
    delete state.assignments[payload.key];

    const list = state.orders[payload.provider] || [];
    const idx = list.findIndex(x => assignmentKey({ name: x.name, unit: x.unit }) === payload.key);
    if (idx > -1) {
      list[idx].qty -= Number(payload.total) || 0;
      if (list[idx].qty <= 0) list.splice(idx, 1);
      state.orders[payload.provider] = list;
    }

    persistState();
    renderProvidersPanels();
    idle(unifyGlobal);
    toast("Asignación deshecha ✅", null);
  }

  /* ==========================
     Provider panels
  ========================== */
  function providerTemplate(provName) {
    const p = state.providers.find(x => x.name === provName);
    return p?.template || "📦 *Pedido {PROV}*\n\n{LINES}";
  }
  function providerPhone(provName) {
    const p = state.providers.find(x => x.name === provName);
    return p?.phone || "";
  }

  function renderProvidersPanels() {
    const cont = byId("provPanels");
    if (!cont) return;

    cont.innerHTML = "";
    normalizeOrders();

    state.providers.forEach(p => {
      const list = state.orders[p.name] || [];
      const card = document.createElement("div");
      card.className = "card";

      const hd = document.createElement("div");
      hd.className = "hd";
      hd.innerHTML = `<strong>${p.name}</strong>
        <div class="toolbar">
          <button class="btn small" data-txt="${p.name}">📄 TXT</button>
          <button class="btn small muted" data-wa="${p.name}">📲 WhatsApp</button>
          <button class="btn small muted" data-clear="${p.name}">🗑️</button>
        </div>`;

      const bd = document.createElement("div");
      bd.className = "bd";

      if (!list.length) {
        bd.innerHTML = '<div class="hint">Sin productos asignados.</div>';
      } else {
        let html = `<div class="scroll-x"><table><thead><tr><th>Producto</th><th>Cantidad</th><th>Unidad</th></tr></thead><tbody>`;
        list.forEach((it, ix) => {
          html += `<tr>
            <td contenteditable="true" data-prov="${p.name}" data-idx="${ix}" data-f="name" class="green">${it.name}</td>
            <td><input class="input" data-prov="${p.name}" data-idx="${ix}" data-f="qty" inputmode="decimal" value="${String(it.qty)}"></td>
            <td>
              <select class="select" data-prov="${p.name}" data-idx="${ix}" data-f="unit">
                <option value="" ${!it.unit?"selected":""}>(-)</option>
                <option value="kg" ${it.unit==="kg"?"selected":""}>kg</option>
                <option value="caja" ${it.unit==="caja"?"selected":""}>caja</option>
                <option value="manojo" ${it.unit==="manojo"?"selected":""}>manojo</option>
                <option value="ud" ${it.unit==="ud"?"selected":""}>ud</option>
              </select>
            </td>
          </tr>`;
        });
        html += `</tbody></table></div>`;
        bd.innerHTML = html;

        bd.querySelectorAll('td[contenteditable][data-f="name"]').forEach(cell => {
          const prov = cell.dataset.prov;
          const idx = Number(cell.dataset.idx);
          attachAutocomplete(cell, (picked) => {
            pushUndo("editar pedido proveedor");
            state.orders[prov][idx].name = picked;
            persistState();
            syncCatalogFromPurchases(true);
          });
          cell.addEventListener("blur", () => {
            pushUndo("editar pedido proveedor");
            state.orders[prov][idx].name = removeDiacriticsUpper(cell.innerText.trim());
            persistState();
            syncCatalogFromPurchases(true);
          }, { passive: true });
        });

        bd.querySelectorAll('input[data-f="qty"]').forEach(inp => {
          inp.addEventListener("change", () => {
            const prov = inp.dataset.prov;
            const idx = Number(inp.dataset.idx);
            pushUndo("editar cantidad proveedor");
            state.orders[prov][idx].qty = Number(String(inp.value).replace(",", ".")) || 0;
            persistState();
          });
        });

        bd.querySelectorAll('select[data-f="unit"]').forEach(sel => {
          sel.addEventListener("change", () => {
            const prov = sel.dataset.prov;
            const idx = Number(sel.dataset.idx);
            pushUndo("editar unidad proveedor");
            state.orders[prov][idx].unit = sel.value;
            persistState();
          });
        });
      }

      cont.appendChild(card);
      card.appendChild(hd);
      card.appendChild(bd);
    });

    cont.querySelectorAll("button[data-txt]").forEach(b => b.onclick = () => exportProvTXT(b.dataset.txt));
    cont.querySelectorAll("button[data-wa]").forEach(b => b.onclick = () => waProv(b.dataset.wa));
    cont.querySelectorAll("button[data-clear]").forEach(b => b.onclick = () => clearProvOrder(b.dataset.clear));
  }

  function exportProvTXT(prov) {
    const list = state.orders[prov] || [];
    if (!list.length) return alert("No hay líneas para " + prov);
    const txt = list.map(x => `${x.qty} ${x.name}${x.unit ? " " + x.unit : ""}`).join("\n");
    downloadText(txt, `pedido_${prov}_${todayISO()}.txt`);
  }

  function waProv(prov) {
    const list = state.orders[prov] || [];
    if (!list.length) return alert("No hay líneas para " + prov);
    const lines = list.map(x => `${x.qty} ${x.name}${x.unit ? " " + x.unit : ""}`).join("\n");
    const tpl = providerTemplate(prov);
    const msg = tpl.replaceAll("{PROV}", prov).replaceAll("{LINES}", lines);
    const phone = providerPhone(prov);
    if (phone) waOpenTo(phone, msg);
    else waOpen(msg);
  }

  function clearProvOrder(prov) {
    if (!confirm(`¿Vaciar pedido de ${prov}?`)) return;
    pushUndo("vaciar proveedor");
    state.orders[prov] = [];
    persistState();
    renderProvidersPanels();
  }

  /* ==========================
     Global exports
  ========================== */
  function globalTextLines(rows) {
    return rows.map(r => `${r.total} ${r.name}${r.unit ? " " + r.unit : ""}`).join("\n");
  }

  function copyGlobal() {
    if (!state.globalRows.length) return alert("No hay datos.");
    navigator.clipboard.writeText(globalTextLines(state.globalRows));
    toast("Copiado ✅", null);
  }
  function exportGlobalTXT() {
    if (!state.globalRows.length) return alert("No hay datos.");
    downloadText(globalTextLines(state.globalRows), `lista_global_${todayISO()}.txt`);
  }
  function exportGlobalXLSX() {
    if (!state.globalRows.length) return alert("No hay datos.");
    if (!window.XLSX) return alert("Falta XLSX en el index.");
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([["Producto","Total","Unidad"], ...state.globalRows.map(r => [r.name, r.total, r.unit || ""])]);
    XLSX.utils.book_append_sheet(wb, ws, "Global");
    XLSX.writeFile(wb, `lista_global_${todayISO()}.xlsx`);
  }

  function exportResumenGlobalTXT() {
    const all = [].concat(state.tiendaState.sp || [], state.tiendaState.sl || [], state.tiendaState.st || []);
    const totalMap = {};
    all.forEach(r => {
      const k = applyEquivKey(normKey(r.e));
      const u = r.u || "";
      const key = k + "|" + u;
      if (!totalMap[key]) totalMap[key] = { name: r.e, qty: 0, unit: u };
      totalMap[key].qty += (Number(r.q) || 0);
    });

    const byProv = {};
    providerNames().forEach(p => byProv[p] = []);
    const unassigned = [];

    Object.values(totalMap).forEach(it => {
      const k = applyEquivKey(normKey(it.name)) + "|" + (it.unit || "");
      const prov = state.assignments[k];
      if (prov && byProv[prov]) byProv[prov].push(it);
      else unassigned.push(it);
    });

    let out = `📦 PEDIDOS POR PROVEEDOR\n\n`;
    providerNames().forEach(p => {
      out += `> ${p}:\n`;
      const list = byProv[p] || [];
      if (!list.length) out += `- (sin líneas)\n\n`;
      else {
        list.sort((a,b) => a.name.localeCompare(b.name,'es'));
        list.forEach(x => { out += `- ${x.qty} ${x.name}${x.unit ? " " + x.unit : ""}\n`; });
        out += `\n`;
      }
    });

    out += `📌 SIN PROVEEDOR ASIGNADO:\n`;
    if (!unassigned.length) out += `- (sin líneas)\n`;
    else {
      unassigned.sort((a,b) => a.name.localeCompare(b.name,'es'));
      unassigned.forEach(x => { out += `- ${x.qty} ${x.name}${x.unit ? " " + x.unit : ""}\n`; });
    }

    downloadText(out, `resumen_pedidos_${todayISO()}.txt`);
  }

  /* ==========================
     Catalog sync + reparto (mínimo, sin romper)
  ========================== */
  function ensureCatalogEntry(name) {
    const k = applyEquivKey(normKey(name));
    if (!k) return null;
    if (!state.catalog[k]) state.catalog[k] = { name: removeDiacriticsUpper(name), unit: "", prefProv: "", price: "", history: [] };
    state.catalog[k].name = removeDiacriticsUpper(name);
    return state.catalog[k];
  }

  function syncCatalogFromPurchases(silent = false) {
    const allNames = new Set();
    ["sp","sl","st"].forEach(code => (state.tiendaState[code] || []).forEach(r => allNames.add(r.e)));
    providerNames().forEach(p => (state.orders[p] || []).forEach(r => allNames.add(r.name)));
    allNames.forEach(n => { if (n) ensureCatalogEntry(n); });
    persistState();
    if (!silent) toast("Catálogo sincronizado ✅", null);
  }

  function renderRepartoStore(code) {
    const wrap = byId("reparto_wrap");
    if (!wrap) return;
    if (!code) { wrap.innerHTML = '<div class="hint">Selecciona una tienda.</div>'; return; }

    const lista = state.tiendaState[code] || [];
    if (!lista.length) { wrap.innerHTML = '<div class="hint">Sin datos en esta tienda.</div>'; return; }

    if (!state.repartoState[code] || state.repartoState[code].length !== lista.length) {
      state.repartoState[code] = lista.map(x => ({ name: x.e, qty: x.q, price: "", checked: false, unit: x.u || "" }));
    }

    let html = `<table><thead><tr><th></th><th>Producto</th><th>Cant.</th><th>Unidad</th><th>Precio</th></tr></thead><tbody>`;
    state.repartoState[code].forEach((r, i) => {
      html += `<tr>
        <td><input type="checkbox" ${r.checked ? "checked" : ""} data-rchk="${i}"></td>
        <td>${r.name}</td>
        <td>${r.qty}</td>
        <td>${r.unit || ""}</td>
        <td><input class="input" data-rprice="${i}" inputmode="decimal" value="${r.price || ""}"></td>
      </tr>`;
    });
    html += `</tbody></table>`;
    wrap.innerHTML = html;

    wrap.querySelectorAll("input[data-rchk]").forEach(chk => {
      chk.onchange = () => {
        const i = Number(chk.dataset.rchk);
        state.repartoState[code][i].checked = chk.checked;
      };
    });

    wrap.querySelectorAll("input[data-rprice]").forEach(inp => {
      inp.onchange = () => {
        const i = Number(inp.dataset.rprice);
        const num = Number(String(inp.value).replace(",", "."));
        state.repartoState[code][i].price = isNaN(num) ? "" : num.toFixed(2);
      };
    });
  }

  /* ==========================
     Download helpers
  ========================== */
  function downloadText(txt, filename) {
    const blob = new Blob([txt], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }
  function downloadJSON(obj, filename) {
    const txt = JSON.stringify(obj, null, 2);
    downloadText(txt, filename);
  }

  function waOpen(msg) {
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }
  function waOpenTo(phone, msg) {
    const digits = String(phone || "").replace(/[^\d]/g, "");
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  /* ==========================
     Toast (undo assign)
  ========================== */
  let toastTimer = null;
  function toast(message, undoPayload) {
    const t = byId("toast");
    const msg = byId("toastMsg");
    const btn = byId("toastUndo");

    if (!t || !msg || !btn) {
      // fallback: no toast in HTML
      console.log("[TOAST]", message);
      state.lastToastUndo = undoPayload;
      return;
    }

    msg.textContent = message;
    state.lastToastUndo = undoPayload;

    btn.style.display = undoPayload ? "inline-block" : "none";
    t.style.display = "flex";

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.style.display = "none";
      state.lastToastUndo = null;
    }, undoPayload ? 7000 : 2200);
  }

  /* ==========================
     Tabs + FAB
  ========================== */
  function showTab(key) {
    const ids = ["dic", "tiendas", "global", "proveedores", "catalogo"];
    ids.forEach(k => {
      const tab = byId("tab-" + k);
      const btn = byId("btn-" + k);
      if (tab) tab.style.display = (k === key) ? "block" : "none";
      if (btn) btn.classList.toggle("active", k === key);
    });

    closeAC();

    const fab = byId("fab");
    if (fab) {
      if (key === "global") fab.style.display = "block";
      else { fab.style.display = "none"; hideFabMenu(); }
    }

    if (key === "global") idle(() => { buildProvBar(); unifyGlobal(); });
    if (key === "proveedores") idle(() => renderProvidersPanels());
  }

  function toggleFabMenu() {
    const m = byId("fabMenu");
    if (m) m.classList.toggle("show");
  }
  function hideFabMenu() {
    const m = byId("fabMenu");
    if (m) m.classList.remove("show");
  }

  document.addEventListener("click", (e) => {
    const m = byId("fabMenu"), f = byId("fab");
    if (!m || !f) return;
    if (m.classList.contains("show") && !m.contains(e.target) && e.target !== f) hideFabMenu();
  }, { capture: true });

  /* ==========================
     Wiring UI
  ========================== */
  function refreshAllUI() {
    buildProvBar();
    renderProvidersPanels();

    // store select (modo 1 tienda)
    const selStore = byId("selStore");
    if (selStore) {
      selStore.value = state.prefs.storeSelected || "sp";
      loadStoreIntoTextarea(selStore.value);
      renderStoreTable(selStore.value);
    }

    // global
    unifyGlobal();
  }

  function loadStoreIntoTextarea(code) {
    const ta = byId("in_store");
    if (!ta) return;
    const rows = state.tiendaState[code] || [];
    // si no hay rows, mantener lo que el usuario pegó
    if (!rows.length) return;
    ta.value = rows.map(r => `${r.e} ${r.q}${r.u ? " " + r.u : ""}`).join("\n");
  }

  /* ==========================
     File import/export hooks (opcional)
  ========================== */
  function openImportFile(inputId) {
    const inp = byId(inputId);
    if (!inp) return alert("No existe input file en index.");
    inp.value = "";
    inp.click();
  }

  function readFileAsJSON(file, cb) {
    const reader = new FileReader();
    reader.onload = () => {
      try { cb(JSON.parse(String(reader.result || "{}"))); }
      catch { alert("Archivo JSON inválido."); }
    };
    reader.readAsText(file);
  }

  /* ==========================
     Init / Load from localStorage
  ========================== */
  function loadAllFromLocal() {
    // theme
    const savedTheme = localStorage.getItem(LS.THEME) || (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    applyTheme(savedTheme);

    // providers
    loadProviders();

    // vocab/equiv
    const savedV = localStorage.getItem(LS.VOCAB);
    if (byId("vocabTxt")) byId("vocabTxt").value = (savedV && savedV.trim()) ? savedV : OFFICIAL_VOCAB_RAW;

    const savedE = localStorage.getItem(LS.EQUIV) || "";
    if (byId("equivTxt")) byId("equivTxt").value = savedE;

    // states
    state.tiendaState = safeLoadJSON(LS.STORES, { sp: [], sl: [], st: [] });
    state.assignments = safeLoadJSON(LS.ASSIGN, {});
    state.orders = safeLoadJSON(LS.ORDERS, {});
    state.catalog = safeLoadJSON(LS.CATALOG, {});
    state.prefs = safeLoadJSON(LS.PREFS, state.prefs);

    normalizeOrders();
    loadEquivsToMap();
    syncCatalogFromPurchases(true);

    makeBackup("auto");
  }

  function wireEvents() {
    // theme
    if (byId("themeBtn")) byId("themeBtn").onclick = toggleTheme;

    // tabs via onclick en HTML: también exponemos en window
    // store selector
    const selStore = byId("selStore");
    if (selStore) {
      selStore.onchange = () => {
        const code = selStore.value || "sp";
        state.prefs.storeSelected = code;
        persistState();
        loadStoreIntoTextarea(code);
        renderStoreTable(code);
      };
    }

    // store textarea auto-standardize on paste/typing (debounce)
    const ta = byId("in_store");
    if (ta && selStore) {
      const run = debounce(() => {
        const code = selStore.value || "sp";
        pushUndo("estandarizar tienda");
        standardizeStore(code, ta.value || "");
        persistState();
        renderStoreTable(code);
        unifyGlobal();
      }, 350);

      ta.addEventListener("input", run);
    }

    // global actions (si existen botones)
    if (byId("btnCopyGlobal")) byId("btnCopyGlobal").onclick = copyGlobal;
    if (byId("btnExportGlobalTXT")) byId("btnExportGlobalTXT").onclick = exportGlobalTXT;
    if (byId("btnExportGlobalXLSX")) byId("btnExportGlobalXLSX").onclick = exportGlobalXLSX;
    if (byId("btnExportResumen")) byId("btnExportResumen").onclick = exportResumenGlobalTXT;

    // toast undo
    const undoBtn = byId("toastUndo");
    if (undoBtn) {
      undoBtn.onclick = () => {
        if (state.lastToastUndo) undoLastAssignment(state.lastToastUndo);
      };
    }

    // FAB menu actions (si tus botones lo llaman por onclick, igual)
    const fab = byId("fab");
    if (fab) fab.onclick = toggleFabMenu;
  }

  /* ==========================
     Expose to window for HTML onclick
  ========================== */
  window.toggleTheme = toggleTheme;
  window.showTab = showTab;
  window.toggleFabMenu = toggleFabMenu;

  // Acciones que quizá llamas desde botones inline
  window.undo = undo;
  window.copyGlobal = copyGlobal;
  window.exportGlobalTXT = exportGlobalTXT;
  window.exportGlobalXLSX = exportGlobalXLSX;
  window.exportResumenGlobalTXT = exportResumenGlobalTXT;

  window.exportStoreTXT = exportStoreTXT;
  window.waStore = waStore;
  window.storeToTextarea = storeToTextarea;

  /* ==========================
     Boot
  ========================== */
  document.addEventListener("DOMContentLoaded", () => {
    loadAllFromLocal();
    wireEvents();
    refreshAllUI();

    // Tab inicial si existe estructura de tabs
    if (byId("tab-dic") || byId("tab-diccionario")) {
      // si tu index usa tab-dic, esto funciona; si no, no pasa nada
      showTab("dic");
    }
  });

})();
