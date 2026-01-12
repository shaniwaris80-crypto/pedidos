/* app.js */
(() => {
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
    equivMap: new Map(), // key(from) -> key(to), also stores display in equivTxt
    tiendaState: { sp: [], sl: [], st: [] }, // rows {o,e,q,u,a}
    assignments: {}, // key(product) -> providerName
    orders: {}, // providerName -> [{name, qty, unit}]
    globalRows: [], // visible rows [{name,total,unit}]
    catalog: {}, // key(product) -> {name, unit, prefProv, price, history:[{date,price,prov,note}]}
    repartoState: {}, // tienda -> [{name, qty, price, checked}]
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
  function makeBackup(reason = "auto") {
    const snap = exportPayload();
    const b = loadBackups();
    b.unshift({ at: nowISO(), reason, payload: snap });
    saveBackups(b);
    byId("cloudHint").textContent = "Local • Backup ✅";
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
    localStorage.setItem(LS.EQUIV, byId("equivTxt").value || "");
    localStorage.setItem(LS.CATALOG, JSON.stringify(state.catalog));
    localStorage.setItem(LS.PREFS, JSON.stringify(state.prefs));
  }, 250);

  function safeLoadJSON(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key) || "");
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

  /* ==========================
     Export / Import payload
  ========================== */
  function exportPayload() {
    return {
      version: "v3.5",
      exportedAt: nowISO(),
      providers: state.providers,
      activeProv: state.activeProv,
      vocabTxt: byId("vocabTxt").value || "",
      equivTxt: byId("equivTxt").value || "",
      tiendaState: state.tiendaState,
      assignments: state.assignments,
      orders: state.orders,
      catalog: state.catalog,
      prefs: state.prefs
    };
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

      // active
      state.activeProv = payload.activeProv && state.providers.find(p => p.name === payload.activeProv)
        ? payload.activeProv
        : (state.providers[0]?.name || "ESMO");

      // vocab/equiv textareas
      byId("vocabTxt").value = String(payload.vocabTxt || "").trim() || OFFICIAL_VOCAB_RAW;
      byId("equivTxt").value = String(payload.equivTxt || "").trim();

      // tienda / assign / orders / catalog / prefs
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
     Vocab helpers (unique + cache)
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
    const raw = byId("vocabTxt").value || "";
    const sig = raw.length + "|" + raw.slice(0, 40) + "|" + raw.slice(-40);
    if (VOCAB_CACHE && VOCAB_SIG === sig) return VOCAB_CACHE;
    VOCAB_CACHE = uniqueVocab(toLines(raw));
    VOCAB_SIG = sig;
    return VOCAB_CACHE;
  }

  /* ==========================
     Equivalences (synonyms)
  ========================== */
  function loadEquivsToMap() {
    state.equivMap = new Map();
    const lines = toLines(byId("equivTxt").value || "");
    for (const line of lines) {
      const m = line.split("=").map(x => x.trim()).filter(Boolean);
      if (m.length !== 2) continue;
      const from = normKey(m[0]);
      const to = normKey(m[1]);
      if (from && to) state.equivMap.set(from, to);
    }
  }
  function applyEquivKey(k) {
    // Follow chain up to 5 steps to avoid loops
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
    // if vocab contains the destination, return it (best)
    const dest = vocab.find(v => normKey(v) === k);
    return dest || name;
  }

  /* ==========================
     Similarity (Dice + TokenSet)
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
    // supports "1/2" or "2,5"
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

    // normalize "2,5kg" => "2,5 kg"
    s = s.replace(/(\d[\d,\.]*)(kg|kgs|kilo|kilos|ud|uds|u|unidad|unidades|caja|cajas|manojo|manojos)\b/i, "$1 $2");

    // detect unit
    let unit = "";
    const unitM = s.match(/\b(kg|kgs|kilo|kilos|caja|cajas|manojo|manojos|ud|uds|u|unidad|unidades)\b/i);
    if (unitM) {
      const u = unitM[1].toLowerCase();
      if (u.startsWith("kg") || u.startsWith("kilo")) unit = "kg";
      else if (u.startsWith("caj")) unit = "caja";
      else if (u.startsWith("man")) unit = "manojo";
      else unit = "ud";
    }

    // patterns
    let qty = null;
    let name = s;

    // 3x2 or 3 x 2
    const mult = s.match(/\b(\d+[\.,]?\d*|\d+\s*\/\s*\d+)\s*[xX]\s*(\d+[\.,]?\d*|\d+\s*\/\s*\d+)\b/);
    if (mult) {
      const a = parseQtyToken(mult[1].replace(/\s+/g, ""));
      const b = parseQtyToken(mult[2].replace(/\s+/g, ""));
      if (a !== null && b !== null) {
        qty = a * b;
        name = s.replace(mult[0], "").trim();
      }
    }

    // x 3
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

    // qty at end
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

    // qty at start
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

    // strip generic words from name
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
  function loadProviders() {
    const saved = safeLoadJSON(LS.PROVIDERS, null);
    if (Array.isArray(saved) && saved.length) {
      state.providers = saved.map(p => ({
        name: removeDiacriticsUpper(p.name || "").trim(),
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
    // remove orders for deleted providers (optional cleanup)
    Object.keys(state.orders).forEach(k => { if (!names.includes(k)) delete state.orders[k]; });
    if (!state.activeProv || !names.includes(state.activeProv)) state.activeProv = names[0] || "ESMO";
  }

  function buildProvBar() {
    const bar = byId("provBar");
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
    byId("provCountPill").textContent = `Proveedores: ${state.providers.length}`;
  }

  /* ==========================
     Autocomplete (single listener)
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
     Standardize store + merge duplicates
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

      // apply equivalence first
      let baseName = applyEquivName(p.name, vocab);

      // exact match
      const exact = vocab.find(v => normKey(v) === normKey(baseName));
      if (exact) {
        rows.push({ o: p.original, e: exact, q: p.qty, u: p.unit, a: false });
        return;
      }

      // best match
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

    // handlers
    wrap.querySelectorAll('td[contenteditable]').forEach(cell => {
      const i = Number(cell.dataset.i);
      const f = cell.dataset.f;
      if (f === "e") {
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
      }
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
    const rows = state.tiendaState[code] || [];
    const out = rows.map(r => `${r.e} ${r.q}${r.u ? " " + r.u : ""}`).join("\n");
    byId("in_store").value = out;
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
     Global unify + assignments + undo-on-assign toast
  ========================== */
  function unifyGlobal() {
    const all = []
      .concat(state.tiendaState.sp || [], state.tiendaState.sl || [], state.tiendaState.st || []);
    const map = new Map();

    all.forEach(r => {
      const k0 = normKey(r.e || "");
      const k = applyEquivKey(k0);
      const unit = r.u || "";
      const key = k + "|" + unit;
      const name = r.e || "";
      if (!map.has(key)) map.set(key, { name, total: 0, unit });
      map.get(key).total += (Number(r.q) || 0);
    });

    const arr = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "es"));

    // similar detection (for UI only)
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
  }

  function renderGlobalTable(rows, similarSet) {
    // visible = those not assigned
    const visible = rows.filter(r => !state.assignments[applyEquivKey(normKey(r.name)) + "|" + (r.unit || "")]);
    state.globalRows = visible;

    const wrap = byId("global_wrap");
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

    // assign buttons
    wrap.querySelectorAll("button[data-assign]").forEach(btn => {
      btn.onclick = () => assignFromGlobal(Number(btn.dataset.assign));
    });

    // edit name + autocomplete
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
        idle(() => {
          unifyGlobal();
          syncCatalogFromPurchases(true);
        });
      }, { passive: true });
    });

    // totals & unit edits
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

  function assignmentKey(row) {
    const k = applyEquivKey(normKey(row.name));
    return k + "|" + (row.unit || "");
  }

  function assignFromGlobal(idx) {
    const item = state.globalRows[idx];
    if (!item) return;

    pushUndo("asignar proveedor");

    const k = assignmentKey(item);
    state.assignments[k] = state.activeProv;

    // add to provider order
    const list = state.orders[state.activeProv] || [];
    const ex = list.findIndex(x => assignmentKey({ name: x.name, unit: x.unit }) === k);
    if (ex > -1) list[ex].qty += Number(item.total) || 0;
    else list.push({ name: item.name, qty: Number(item.total) || 0, unit: item.unit || "" });
    state.orders[state.activeProv] = list;

    persistState();
    renderProvidersPanels();
    idle(unifyGlobal);

    // toast undo assignment
    const undoPayload = { type: "assign", provider: state.activeProv, key: k, name: item.name, total: item.total, unit: item.unit || "" };
    toast(`Asignado a ${state.activeProv}: ${item.total} ${item.name}`, undoPayload);
  }

  function undoLastAssignment(payload) {
    if (!payload || payload.type !== "assign") return;
    pushUndo("deshacer asignación");

    // remove assignment
    delete state.assignments[payload.key];

    // subtract from provider order
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
          <button class="btn small danger" data-clear="${p.name}">🗑️</button>
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

        // inline edits
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

    // panel buttons
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
    // also remove assignments pointing to this prov (optional: keep assignments)
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
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([["Producto","Total","Unidad"], ...state.globalRows.map(r => [r.name, r.total, r.unit || ""])]);
    XLSX.utils.book_append_sheet(wb, ws, "Global");
    XLSX.writeFile(wb, `lista_global_${todayISO()}.xlsx`);
  }

  function exportResumenGlobalTXT() {
    // recompute totals from tiendas (source of truth)
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
     Auto-assign (history / rules)
  ========================== */
  function autoAssign() {
    if (!state.globalRows.length) return toast("No hay filas en Global.", null);

    pushUndo("auto-asignar");

    // rule 1: if catalog has prefProv -> assign
    // rule 2: if already assigned in history (assignments) -> assign (by key)
    // rule 3: provider keyword rules (simple)
    const rules = [
      { re: /TOMASIN/g, prov: "JAVI" },
      { re: /FRESAS|ARANDANOS|FRAMBUESA/g, prov: "ÁNGEL VACA" }
    ];

    let count = 0;
    const copy = state.globalRows.slice(); // snapshot
    copy.forEach((row, idx) => {
      const k = assignmentKey(row);

      let prov = state.assignments[k] || "";
      if (!prov) {
        const cat = state.catalog[applyEquivKey(normKey(row.name))];
        if (cat?.prefProv && providerNames().includes(cat.prefProv)) prov = cat.prefProv;
      }
      if (!prov) {
        for (const r of rules) {
          if (r.re.test(row.name) && providerNames().includes(r.prov)) { prov = r.prov; break; }
        }
      }
      if (!prov) return;

      state.activeProv = prov;
      buildProvBar();
      assignFromGlobal(idx);
      count++;
    });

    toast(`Auto-asignado: ${count}`, null);
  }

  /* ==========================
     Conflicts panel
  ========================== */
  function scanConflicts() {
    const all = [].concat(state.tiendaState.sp || [], state.tiendaState.sl || [], state.tiendaState.st || []);
    const names = Array.from(new Set(all.map(x => x.e).filter(Boolean)));
    const pairs = [];
    for (let i=0;i<names.length;i++){
      for (let j=i+1;j<names.length;j++){
        const a=names[i], b=names[j];
        const sc = similarityScore(a,b);
        if (sc>=0.90 && normKey(a)!==normKey(b)) pairs.push({a,b,sc});
      }
    }
    state.conflicts = pairs.sort((x,y)=>y.sc-x.sc).slice(0,30);
    renderConflicts();
  }

  function renderConflicts() {
    const w = byId("conflictsWrap");
    if (!state.conflicts.length) {
      w.innerHTML = '<div class="hint">Sin conflictos.</div>';
      return;
    }
    let html = `<div class="hint" style="margin-bottom:8px">Sugerencias (top 30). Puedes crear equivalencia rápido.</div>`;
    html += `<div class="scroll-x"><table><thead><tr><th>A</th><th>B</th><th>Score</th><th>Acción</th></tr></thead><tbody>`;
    state.conflicts.forEach((p, i) => {
      html += `<tr>
        <td>${p.a}</td><td>${p.b}</td><td>${p.sc.toFixed(2)}</td>
        <td>
          <button class="btn small ghost" data-eq="${i}" data-dir="ab">A=B</button>
          <button class="btn small ghost" data-eq="${i}" data-dir="ba">B=A</button>
        </td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    w.innerHTML = html;

    w.querySelectorAll("button[data-eq]").forEach(btn => {
      btn.onclick = () => {
        const i = Number(btn.dataset.eq);
        const dir = btn.dataset.dir;
        const p = state.conflicts[i];
        if (!p) return;
        const line = dir === "ab" ? `${p.a} = ${p.b}` : `${p.b} = ${p.a}`;
        const cur = (byId("equivTxt").value || "").trim();
        byId("equivTxt").value = (cur ? cur + "\n" : "") + line;
        loadEquivsToMap();
        persistState();
        toast("Equivalencia añadida ✅", null);
        unifyGlobal();
      };
    });
  }

  /* ==========================
     Catalog (prices + history)
  ========================== */
  function ensureCatalogEntry(name) {
    const k = applyEquivKey(normKey(name));
    if (!k) return null;
    if (!state.catalog[k]) {
      state.catalog[k] = { name: removeDiacriticsUpper(name), unit: "", prefProv: "", price: "", history: [] };
    }
    // keep display name latest
    state.catalog[k].name = removeDiacriticsUpper(name);
    return state.catalog[k];
  }

  function syncCatalogFromPurchases(silent = false) {
    // from tiendaState + orders
    const allNames = new Set();
    ["sp","sl","st"].forEach(code => (state.tiendaState[code] || []).forEach(r => allNames.add(r.e)));
    providerNames().forEach(p => (state.orders[p] || []).forEach(r => allNames.add(r.name)));

    allNames.forEach(n => { if (n) ensureCatalogEntry(n); });

    // also, update units if we have them
    ["sp","sl","st"].forEach(code => (state.tiendaState[code] || []).forEach(r => {
      const e = ensureCatalogEntry(r.e);
      if (e && r.u && !e.unit) e.unit = r.u;
    }));

    providerNames().forEach(p => (state.orders[p] || []).forEach(r => {
      const e = ensureCatalogEntry(r.name);
      if (e && r.unit && !e.unit) e.unit = r.unit;
      // if assignment suggests prefProv and not set, do not override (user decides)
    }));

    persistState();
    if (!silent) toast("Catálogo sincronizado ✅", null);
    renderCatalog();
    fillCatalogProviderFilters();
  }

  function fillCatalogProviderFilters() {
    const sel = byId("catalogFilterProv");
    const cur = sel.value;
    sel.innerHTML = `<option value="">Todos los proveedores</option>` + providerNames().map(p => `<option value="${p}">${p}</option>`).join("");
    sel.value = cur;
  }

  function renderCatalog() {
    const wrap = byId("catalogWrap");
    const q = (byId("catalogSearch").value || "").trim();
    const provF = byId("catalogFilterProv").value || "";
    const unitF = byId("catalogFilterUnit").value || "";
    const onlyNo = state.prefs.catalogOnlyNoPrice;

    const entries = Object.entries(state.catalog)
      .map(([k, v]) => ({ k, ...v }))
      .filter(it => it.name)
      .filter(it => !q || normKey(it.name).includes(normKey(q)))
      .filter(it => !provF || it.prefProv === provF)
      .filter(it => !unitF || (it.unit || "") === unitF)
      .filter(it => !onlyNo || !String(it.price || "").trim())
      .sort((a,b)=>a.name.localeCompare(b.name,'es'));

    if (!entries.length) {
      wrap.innerHTML = '<div class="hint">Sin productos que coincidan.</div>';
      return;
    }

    let html = `<div class="scroll-x"><table><thead>
      <tr><th>Producto</th><th>Precio</th><th>Unidad</th><th>Preferido</th><th>Historial</th></tr>
    </thead><tbody>`;
    entries.forEach(it => {
      const hist = Array.isArray(it.history) ? it.history.length : 0;
      html += `<tr data-cat="${it.k}">
        <td><button class="btn small ghost" data-open="${it.k}">Abrir</button> <b>${it.name}</b></td>
        <td>${it.price ? (it.price + " €") : '<span class="hint">—</span>'}</td>
        <td>${it.unit || '<span class="hint">—</span>'}</td>
        <td>${it.prefProv || '<span class="hint">—</span>'}</td>
        <td>${hist}</td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    wrap.innerHTML = html;

    wrap.querySelectorAll("button[data-open]").forEach(b => {
      b.onclick = () => openCatalogDetail(b.dataset.open);
    });
  }

  let currentDetailKey = null;
  function openCatalogDetail(k) {
    const item = state.catalog[k];
    if (!item) return;
    currentDetailKey = k;

    byId("catalogDetailTitle").textContent = item.name || "Producto";
    byId("detailPrice").value = item.price ? String(item.price).replace(".", ",") : "";
    byId("detailUnit").value = item.unit || "";
    const provSel = byId("detailProv");
    provSel.innerHTML = `<option value="">(sin preferido)</option>` + providerNames().map(p => `<option value="${p}">${p}</option>`).join("");
    provSel.value = item.prefProv || "";

    renderDetailHistory(item);
    byId("catalogDetailCard").style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderDetailHistory(item) {
    const w = byId("detailHistoryWrap");
    const hist = Array.isArray(item.history) ? item.history.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))) : [];
    if (!hist.length) {
      w.innerHTML = '<div class="hint">Sin historial aún.</div>';
      return;
    }
    let html = `<div class="scroll-x"><table><thead><tr><th>Fecha</th><th>Precio</th><th>Proveedor</th><th>Nota</th><th></th></tr></thead><tbody>`;
    hist.forEach((h, i) => {
      html += `<tr>
        <td>${h.date || ""}</td>
        <td>${h.price ? (h.price + " €") : ""}</td>
        <td>${h.prov || ""}</td>
        <td>${h.note || ""}</td>
        <td><button class="btn small danger" data-delhist="${i}">🗑️</button></td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    w.innerHTML = html;

    w.querySelectorAll("button[data-delhist]").forEach(btn => {
      btn.onclick = () => {
        pushUndo("borrar historial precio");
        const idx = Number(btn.dataset.delhist);
        // delete from sorted copy -> find matching entry by identity fallback date+price+prov
        const target = hist[idx];
        const real = item.history || [];
        const j = real.findIndex(x => x.date===target.date && x.price===target.price && x.prov===target.prov && x.note===target.note);
        if (j>-1) real.splice(j,1);
        item.history = real;
        persistState();
        renderDetailHistory(item);
        renderCatalog();
      };
    });
  }

  function saveCatalogDetail() {
    if (!currentDetailKey) return;
    const item = state.catalog[currentDetailKey];
    if (!item) return;

    pushUndo("guardar catálogo");

    const priceRaw = String(byId("detailPrice").value || "").trim();
    const price = priceRaw ? (Number(priceRaw.replace(",", ".")) || "") : "";
    item.price = price !== "" ? Number(price).toFixed(2) : "";
    item.unit = byId("detailUnit").value || "";
    item.prefProv = byId("detailProv").value || "";

    persistState();
    renderCatalog();
    toast("Catálogo guardado ✅", null);
  }

  function addHistoryEntry() {
    if (!currentDetailKey) return;
    const item = state.catalog[currentDetailKey];
    if (!item) return;

    const priceRaw = String(byId("detailPrice").value || "").trim();
    const price = priceRaw ? (Number(priceRaw.replace(",", ".")) || null) : null;
    const prov = byId("detailProv").value || "";
    if (price === null) return alert("Pon un precio primero.");

    pushUndo("añadir historial precio");

    item.history = Array.isArray(item.history) ? item.history : [];
    item.history.push({ date: todayISO(), price: Number(price).toFixed(2), prov, note: "" });

    // also set current price
    item.price = Number(price).toFixed(2);
    if (!item.unit) item.unit = byId("detailUnit").value || "";
    if (!item.prefProv && prov) item.prefProv = prov;

    persistState();
    renderDetailHistory(item);
    renderCatalog();
    toast("Añadido al historial ✅", null);
  }

  function exportCatalogOnly() {
    const payload = { version: "catalog_v1", exportedAt: nowISO(), catalog: state.catalog };
    downloadJSON(payload, `catalogo_${todayISO()}.json`);
  }
  function importCatalogOnly(payload) {
    if (!payload || typeof payload !== "object") return alert("JSON inválido.");
    if (!payload.catalog || typeof payload.catalog !== "object") return alert("No veo catálogo en el JSON.");
    pushUndo("importar catálogo");
    // merge
    Object.entries(payload.catalog).forEach(([k, v]) => {
      if (!state.catalog[k]) state.catalog[k] = v;
      else {
        // merge fields prefer existing non-empty
        const cur = state.catalog[k];
        cur.name = cur.name || v.name;
        cur.unit = cur.unit || v.unit;
        cur.prefProv = cur.prefProv || v.prefProv;
        cur.price = cur.price || v.price;
        const h1 = Array.isArray(cur.history) ? cur.history : [];
        const h2 = Array.isArray(v.history) ? v.history : [];
        cur.history = [...h1, ...h2].slice(0, 500);
        state.catalog[k] = cur;
      }
    });
    persistState();
    renderCatalog();
    toast("Catálogo importado ✅", null);
  }

  function lastPriceFor(name) {
    const k = applyEquivKey(normKey(name));
    const it = state.catalog[k];
    if (!it) return "";
    if (it.price) return it.price;
    const hist = Array.isArray(it.history) ? it.history.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))) : [];
    return hist[0]?.price || "";
  }

  /* ==========================
     Reparto (per store) + totals + apply last prices
  ========================== */
  function renderRepartoStore(code) {
    const wrap = byId("reparto_wrap");
    if (!code) { wrap.innerHTML = '<div class="hint">Selecciona una tienda para ver su lista.</div>'; updateRepartoTotals(code); return; }

    const lista = state.tiendaState[code] || [];
    if (!lista.length) { wrap.innerHTML = '<div class="hint">Sin datos en esta tienda.</div>'; updateRepartoTotals(code); return; }

    if (!state.repartoState[code] || state.repartoState[code].length !== lista.length) {
      state.repartoState[code] = lista.map(x => ({ name: x.e, qty: x.q, price: "", checked: false, unit: x.u || "" }));
    }

    let html = `<table><thead><tr><th></th><th>Producto</th><th>Cant.</th><th>Unidad</th><th>Precio (€)</th><th>Subtotal</th></tr></thead><tbody>`;
    state.repartoState[code].forEach((r, i) => {
      const subtotal = (r.checked && r.price) ? (Number(r.price) * Number(r.qty)).toFixed(2) : "";
      html += `<tr>
        <td><input type="checkbox" ${r.checked ? "checked" : ""} data-rchk="${i}"></td>
        <td>${r.name}</td>
        <td>${r.qty}</td>
        <td>${r.unit || ""}</td>
        <td><input class="input" data-rprice="${i}" inputmode="decimal" value="${r.price || ""}"></td>
        <td>${subtotal ? (subtotal + " €") : ""}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
    wrap.innerHTML = html;

    wrap.querySelectorAll("input[data-rchk]").forEach(chk => {
      chk.onchange = () => {
        const i = Number(chk.dataset.rchk);
        state.repartoState[code][i].checked = chk.checked;
        updateRepartoTotals(code);
        renderRepartoStore(code); // refresh subtotals quickly
      };
    });

    wrap.querySelectorAll("input[data-rprice]").forEach(inp => {
      inp.onchange = () => {
        const i = Number(inp.dataset.rprice);
        const num = Number(String(inp.value).replace(",", "."));
        state.repartoState[code][i].price = isNaN(num) ? "" : num.toFixed(2);
        updateRepartoTotals(code);
        renderRepartoStore(code);
      };
    });

    updateRepartoTotals(code);
  }

  function updateRepartoTotals(code) {
    const pill = byId("repartoTotals");
    if (!code || !state.repartoState[code]) { pill.textContent = "Total: 0,00 €"; return; }
    const total = state.repartoState[code]
      .filter(x => x.checked && x.price)
      .reduce((sum, x) => sum + (Number(x.qty) * Number(x.price)), 0);
    pill.textContent = `Total: ${total.toFixed(2).replace(".", ",")} €`;
  }

  function applyLastPricesToReparto() {
    const code = byId("selRepartoTienda").value;
    if (!code) return alert("Selecciona una tienda primero.");
    const list = state.repartoState[code] || [];
    if (!list.length) return alert("No hay lista en reparto.");
    let filled = 0;
    list.forEach(x => {
      if (!x.price) {
        const lp = lastPriceFor(x.name);
        if (lp) { x.price = String(lp); filled++; }
      }
    });
    renderRepartoStore(code);
    toast(`Precios aplicados: ${filled}`, null);
  }

  function exportRepartoTXT() {
    const code = byId("selRepartoTienda").value;
    if (!code) return alert("Selecciona una tienda primero.");
    const sel = (state.repartoState[code] || []).filter(x => x.checked);
    if (!sel.length) return alert("No hay productos seleccionados.");
    const txt = sel.map(x => `${x.qty} ${x.name}${x.unit ? " " + x.unit : ""}${x.price ? " — " + x.price + "€" : ""}`).join("\n");
    downloadText(txt, `reparto_${code}_${todayISO()}.txt`);
  }

  function waReparto() {
    const code = byId("selRepartoTienda").value;
    if (!code) return alert("Selecciona una tienda primero.");
    const sel = (state.repartoState[code] || []).filter(x => x.checked);
    if (!sel.length) return alert("No hay productos seleccionados.");
    let msg = `🚚 *Reparto ${code.toUpperCase()}*\n\n`;
    sel.forEach(x => {
      msg += `- ${x.qty} ${x.name}${x.unit ? " " + x.unit : ""}`;
      if (x.price) msg += ` — ${x.price}€`;
      msg += "\n";
    });
    waOpen(msg);
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
      byId("tab-" + k).style.display = (k === key) ? "block" : "none";
      byId("btn-" + k).classList.toggle("active", k === key);
    });

    closeAC();

    const fab = byId("fab");
    if (key === "global") fab.style.display = "block";
    else { fab.style.display = "none"; hideFabMenu(); }

    if (key === "global") idle(() => { buildProvBar(); unifyGlobal(); });
    if (key === "proveedores") idle(() => renderProvidersPanels());
    if (key === "catalogo") idle(() => { fillCatalogProviderFilters(); renderCatalog(); });
  }

  function toggleFabMenu() { byId("fabMenu").classList.toggle("show"); }
  function hideFabMenu() { byId("fabMenu").classList.remove("show"); }

  document.addEventListener("click", (e) => {
    const m = byId("fabMenu"), f = byId("fab");
    if (m.classList.contains("show") && !m.contains(e.target) && e.target !== f) hideFabMenu();
  }, { capture: true });

  /* ==========================
     Providers Modal
  ========================== */
  let editingProvName = null;

  function openProvModal() {
    byId("modalProv").style.display = "flex";
    renderProvManageList();
    fillProvForm(null);
  }
  function closeProvModal() { byId("modalProv").style.display = "none"; }

  function renderProvManageList() {
    const wrap = byId("provManageList");
    const list = state.providers.slice().sort((a,b)=>a.name.localeCompare(b.name,'es'));
    if (!list.length) {
      wrap.innerHTML = '<div class="hint">Sin proveedores.</div>';
      return;
    }
    let html = `<div class="scroll-x"><table><thead><tr><th>Nombre</th><th>Tel</th><th></th></tr></thead><tbody>`;
    list.forEach(p => {
      html += `<tr>
        <td><b>${p.name}</b></td>
        <td>${p.phone || '<span class="hint">—</span>'}</td>
        <td>
          <button class="btn small ghost" data-edit="${p.name}">Editar</button>
          <button class="btn small danger" data-del="${p.name}">Borrar</button>
        </td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    wrap.innerHTML = html;

    wrap.querySelectorAll("button[data-edit]").forEach(b => b.onclick = () => fillProvForm(b.dataset.edit));
    wrap.querySelectorAll("button[data-del]").forEach(b => b.onclick = () => deleteProvider(b.dataset.del));
  }

  function fillProvForm(name) {
    const p = name ? state.providers.find(x => x.name === name) : null;
    editingProvName = p ? p.name : null;
    byId("provName").value = p ? p.name : "";
    byId("provPhone").value = p ? p.phone : "";
    byId("provTemplate").value = p ? p.template : "📦 *Pedido {PROV}*\n\n{LINES}";
  }

  function saveProviderFromForm() {
    const name = removeDiacriticsUpper(byId("provName").value || "").trim();
    const phone = String(byId("provPhone").value || "").trim();
    const template = String(byId("provTemplate").value || "📦 *Pedido {PROV}*\n\n{LINES}");

    if (!name) return alert("Pon un nombre.");

    pushUndo("guardar proveedor");

    // if editing, update existing
    if (editingProvName) {
      const idx = state.providers.findIndex(p => p.name === editingProvName);
      if (idx > -1) state.providers[idx] = { name, phone, template };
      // if renamed, migrate orders + assignments
      if (editingProvName !== name) {
        // migrate orders
        state.orders[name] = state.orders[editingProvName] || [];
        delete state.orders[editingProvName];
        // migrate assignments values
        Object.keys(state.assignments).forEach(k => {
          if (state.assignments[k] === editingProvName) state.assignments[k] = name;
        });
        if (state.activeProv === editingProvName) state.activeProv = name;
      }
    } else {
      if (state.providers.some(p => p.name === name)) return alert("Ya existe ese proveedor.");
      state.providers.push({ name, phone, template });
    }

    normalizeOrders();
    persistState();

    renderProvManageList();
    buildProvBar();
    renderProvidersPanels();
    fillCatalogProviderFilters();
    fillProvForm(null);
    toast("Proveedor guardado ✅", null);
  }

  function deleteProvider(name) {
    if (!confirm(`¿Borrar proveedor ${name}?`)) return;

    pushUndo("borrar proveedor");

    state.providers = state.providers.filter(p => p.name !== name);
    // remove its orders
    delete state.orders[name];
    // keep assignments but they will be treated as "unassigned" in resumen; we can clean:
    Object.keys(state.assignments).forEach(k => { if (state.assignments[k] === name) delete state.assignments[k]; });

    normalizeOrders();
    persistState();

    renderProvManageList();
    buildProvBar();
    renderProvidersPanels();
    fillCatalogProviderFilters();
    toast("Proveedor borrado ✅", null);
  }

  /* ==========================
     Backups modal
  ========================== */
  function openBackupsModal() {
    byId("modalBackups").style.display = "flex";
    renderBackupsList();
  }
  function closeBackupsModal() { byId("modalBackups").style.display = "none"; }

  function renderBackupsList() {
    const wrap = byId("backupList");
    const b = loadBackups();
    if (!b.length) {
      wrap.innerHTML = '<div class="hint">No hay backups todavía.</div>';
      return;
    }
    let html = `<div class="scroll-x"><table><thead><tr><th>Fecha</th><th>Motivo</th><th></th></tr></thead><tbody>`;
    b.forEach((x, i) => {
      html += `<tr>
        <td>${new Date(x.at).toLocaleString()}</td>
        <td>${x.reason}</td>
        <td>
          <button class="btn small ghost" data-restore="${i}">Restaurar</button>
          <button class="btn small muted" data-export="${i}">Exportar</button>
        </td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    wrap.innerHTML = html;

    wrap.querySelectorAll("button[data-restore]").forEach(btn => {
      btn.onclick = () => {
        const i = Number(btn.dataset.restore);
        if (!confirm("¿Restaurar este backup?")) return;
        restoreBackup(i);
      };
    });
    wrap.querySelectorAll("button[data-export]").forEach(btn => {
      btn.onclick = () => {
        const i = Number(btn.dataset.export);
        const item = loadBackups()[i];
        if (!item) return;
        downloadJSON(item.payload, `backup_${i}_${todayISO()}.json`);
      };
    });
  }

  /* ==========================
     Reset (type BORRAR)
  ========================== */
  function resetAll() {
    const v = prompt("Para resetear TODO escribe: BORRAR");
    if (v !== "BORRAR") return;
    localStorage.clear();
    location.reload();
  }

  /* ==========================
     Import/export file
  ========================== */
  function openImportFile(which = "all") {
    const input = which === "catalog" ? byId("fileImportCatalog") : byId("fileImport");
    input.value = "";
    input.click();
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
     Wiring UI
  ========================== */
  function refreshAllUI() {
    // providers
    buildProvBar();
    renderProvidersPanels();
    fillCatalogProviderFilters();

    // store select
    byId("selStore").value = state.prefs.storeSelected || "sp";
    loadStoreIntoTextarea(byId("selStore").value);
    renderStoreTable(byId("selStore").value);

    // reparto
    byId("selRepartoTienda").value = "";
    byId("reparto_wrap").innerHTML = '<div class="hint">Selecciona una tienda para ver su lista.</div>';

    // global
    unifyGlobal();

    // catalog
    renderCatalog();
  }

  function loadStoreIntoTextarea(code) {
    const rows = state.tiendaState[code] || [];
    byId("in
