/* app.js */
/* ==========================================================
   ARSLAN LISTAS v3.5 — KIWI MOBILE TABS
   - Corrección PRO de nombres (índice + score)
   - Autocomplete PRO (dropdown propio) (change + blur)
   - Catálogo de productos comprados: precio + historial
   - Cantidades inteligentes (unidad sugerida)
   - Menos toques: chips +/- cantidad, FAB, render lazy
   - Deshacer global (incluye asignación proveedor)
   - Duplicados: exacto + similares ⚠️
   - Proveedores editables
   - Seguridad/calidad: validación, backup/restore, saneado
========================================================== */

/* ==========================
   Helpers básicos
========================== */
const $ = (s)=>document.querySelector(s);
const byId = (id)=>document.getElementById(id);
const toLines = (t)=>String(t||'').split(/[\n\r]+/).map(x=>x.trim()).filter(Boolean);
const idle = (cb)=> (window.requestIdleCallback ? requestIdleCallback(cb) : setTimeout(cb, 1));
function debounce(fn, wait=250){ let t=null; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; }
function nowISO(){ return new Date().toISOString(); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function safeJSONParse(s, fallback){ try{ return JSON.parse(s); }catch{ return fallback; } }

/* ==========================
   Storage keys + versión
========================== */
const LS = {
  THEME: "arslan_theme",
  VOCAB: "arslan_v35_vocab",
  STATE: "arslan_v35_state",
  PROVIDERS: "arslan_v35_providers",
  CATALOG: "arslan_v35_catalog",
  UNDO: "arslan_v35_undo",
  VERSION: "arslan_v35_version"
};
const APP_VERSION = "3.5";

/* ==========================
   Normalización de nombres
========================== */
function removeDiacriticsUpper(s){
  return String(s||"")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/ñ/g,"N").replace(/Ñ/g,"N")
    .toUpperCase();
}
const IGNORE_WORDS = new Set(["CAJA","CAJAS","KG","KGS","KILO","KILOS","UDS","UD","U","UNIDAD","UNIDADES","MANOJO","MANOJOS","SACO","SACOS"]);
function normKey(s){
  return removeDiacriticsUpper(s)
    .replace(/[^A-Z0-9\s]/g," ")
    .replace(/\s+/g," ")
    .trim();
}
function stripGenericWords(s){
  const t = normKey(s).split(" ").filter(Boolean).filter(w=>!IGNORE_WORDS.has(w));
  return t.join(" ").trim();
}

/* ==========================
   Vocabulario oficial base
========================== */
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
CEBOLLINO
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
MANDARINA SEGUNDA
MANZANA GOLDEN 28
NARANJA ZUMO
KIWI SEGUNDA
MANZANA ROYAL GALA 24
PLATANO CANARIO SUELTO
CEREZA
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
AVOCADO
PERA CONFERENCIA PRIMERA BIS
REINETA PARDA
POMELO CHINO
MANDARINA TABALET
BERZA
COL DE BRUSELAS
NUECES SEGUNDA 
ESCAROLA 
CEBOLLA ROJA
MENTA
HABANERO
RABANITOS
POMELO
PAPAYA
REINETA 28
NISPERO
ALBARICOQUE
TOMATE PERA
TOMATE BOLA
TOMATE PINK
VALVENOSTA GOLDEN
MELOCOTON ROJO
MELON GALIA
APIO
NARANJA SANHUJA
LIMON PRIMERA
MANGO
MELOCOTON AMARILLO
VALVENOSTA ROJA
PINA
NARANJA HOJA
PERA CONFERENCIA SEGUNDA
CEBOLLA DULCE
TOMATE ASURCADO AZUL
ESPARRAGOS BLANCOS
ESPARRAGOS TRIGUEROS
REINETA PRIMERA
AGUACATE PRIMERA
COCO
NECTARINA SEGUNDA
REINETA 24
NECTARINA CARNE BLANCA
GUINDILLA
REINETA VERDE
PATATA 25KG
PATATA 5 KG
TOMATE RAFF
REPOLLO
KIWI ZESPRI
PARAGUAYO SEGUNDA
MELON
REINETA 26
TOMATE ROSA
MANZANA CRISPS
ALOE VERA PIEZAS
TOMATE ENSALADA
PATATA 10KG
MELON BOLLO
CIRUELA ROJA
LIMA
GUINEO VERDE
SETAS
BANANA
BONIATO
FRAMBUESA
BREVAS
PERA AGUA
YAUTIA
YAME
OKRA
MANZANA MELASSI
CACAHUETE
SANDIA NEGRA
SANDIA RAYADA
HIGOS
KUMATO
KIWI CHILE
MELOCOTON AMARILLO SEGUNDA
HIERBABUENA
REMOLACHA
LECHUGA ROMANA
KAKI
CIRUELA CLAUDIA
PERA LIMONERA
CIRUELA AMARILLA
HIGOS BLANCOS
UVA ALVILLO
LIMON EXTRA
PITAHAYA ROJA
HIGO CHUMBO
CLEMENTINA
GRANADA
NECTARINA PRIMERA BIS
CHIRIMOYA
UVA CHELVA
PIMIENTO CALIFORNIA VERDE
KIWI TOMASIN
PIMIENTO CALIFORNIA ROJO
MANDARINA SATSUMA
CASTANA
CAKI
MANZANA KANZI
PERA ERCOLINA
NABO
UVA ALVILLO NEGRA
CHAYOTE
ROYAL GALA 28
MANDARINA PRIMERA
PIMIENTO PINTON
MELOCOTON AMARILLO DE CALANDA
HINOJOS
MANDARINA DE HOJA
UVA ROJA PRIMERA
UVA BLANCA PRIMERA`;

/* ==========================
   Estado principal
========================== */
const defaultProviders = ["ESMO","MONTENEGRO","ÁNGEL VACA","JOSÉ ANTONIO","JAVI","ANGELO"];
const state = {
  stores: { sp:[], sl:[], st:[] },  // [{o,e,q,a}]
  assignments: {},                  // { normKey(name): provider }
  orders: {},                       // { provider: [{name,qty,unit?}] }
  activeProvider: null,
};
let PROVIDERS = [];
let vocabList = [];                 // strings
let vocabIndex = null;              // índice rápido
let globalRows = [];                // visibles sin asignar
let undoStack = [];                 // snapshots

/* ==========================
   Catálogo (productos comprados)
   catalog[nameKey] = { name, unit, price, lastAt, hist:[{date,price}], notes? }
========================== */
let catalog = {};

/* ==========================
   Quality pill
========================== */
function setQuality(text, kind="muted"){
  const p = byId("qualityPill");
  p.textContent = "Calidad: " + text;
  p.className = "pill " + (kind==="ok"?"ok":kind==="warn"?"warn":"muted");
}

/* ==========================
   Persistencia + backups
========================== */
const persistDebounced = debounce(()=>persistAll(), 300);
function persistAll(){
  localStorage.setItem(LS.VERSION, APP_VERSION);
  localStorage.setItem(LS.PROVIDERS, JSON.stringify(PROVIDERS));
  localStorage.setItem(LS.STATE, JSON.stringify(state));
  localStorage.setItem(LS.CATALOG, JSON.stringify(catalog));
  localStorage.setItem(LS.UNDO, JSON.stringify(undoStack.slice(-80)));
}
function loadAll(){
  const prov = safeJSONParse(localStorage.getItem(LS.PROVIDERS), null);
  PROVIDERS = Array.isArray(prov) && prov.length ? prov : defaultProviders.slice();

  const st = safeJSONParse(localStorage.getItem(LS.STATE), null);
  if(st && st.stores && st.assignments && st.orders){
    state.stores = st.stores;
    state.assignments = st.assignments || {};
    state.orders = st.orders || {};
    state.activeProvider = st.activeProvider || PROVIDERS[0];
  }else{
    state.activeProvider = PROVIDERS[0];
  }
  PROVIDERS.forEach(p=>{ if(!Array.isArray(state.orders[p])) state.orders[p]=[]; });

  const voc = localStorage.getItem(LS.VOCAB);
  const base = (voc && voc.trim()) ? voc : OFFICIAL_VOCAB_RAW;
  vocabList = uniqueVocab(toLines(base)).map(x=>removeDiacriticsUpper(x));
  byId("vocabTxt").value = vocabList.join("\n");
  rebuildVocabIndex();

  const cat = safeJSONParse(localStorage.getItem(LS.CATALOG), {});
  catalog = (cat && typeof cat==="object") ? cat : {};
  if(!Array.isArray(undoStack)) undoStack = [];
  undoStack = safeJSONParse(localStorage.getItem(LS.UNDO), []);
}
function makeBackupObject(){
  return {
    app:"ARSLAN_LISTAS",
    version: APP_VERSION,
    exportedAt: nowISO(),
    providers: PROVIDERS,
    state,
    vocab: byId("vocabTxt").value || "",
    catalog
  };
}
function downloadJSON(obj, filename){
  const blob = new Blob([JSON.stringify(obj,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}
function restoreFromObject(obj){
  if(!obj || typeof obj!=="object") throw new Error("Formato inválido");
  if(obj.vocab!=null) localStorage.setItem(LS.VOCAB, String(obj.vocab));
  if(Array.isArray(obj.providers)) localStorage.setItem(LS.PROVIDERS, JSON.stringify(obj.providers));
  if(obj.state) localStorage.setItem(LS.STATE, JSON.stringify(obj.state));
  if(obj.catalog) localStorage.setItem(LS.CATALOG, JSON.stringify(obj.catalog));
  localStorage.setItem(LS.UNDO, JSON.stringify([]));
  location.reload();
}

/* ==========================
   Undo (snapshot)
========================== */
function pushUndo(tag=""){
  // snapshot pequeño
  const snap = {
    t: Date.now(),
    tag,
    providers: PROVIDERS.slice(),
    active: state.activeProvider,
    stores: JSON.parse(JSON.stringify(state.stores)),
    assignments: JSON.parse(JSON.stringify(state.assignments)),
    orders: JSON.parse(JSON.stringify(state.orders)),
    catalog: JSON.parse(JSON.stringify(catalog))
  };
  undoStack.push(snap);
  if(undoStack.length>120) undoStack = undoStack.slice(-120);
  persistDebounced();
}
function undo(){
  const snap = undoStack.pop();
  if(!snap){ alert("No hay nada para deshacer."); return; }
  PROVIDERS = snap.providers || PROVIDERS;
  state.activeProvider = snap.active || state.activeProvider;
  state.stores = snap.stores || state.stores;
  state.assignments = snap.assignments || state.assignments;
  state.orders = snap.orders || state.orders;
  catalog = snap.catalog || catalog;
  // asegurar providers en orders
  PROVIDERS.forEach(p=>{ if(!Array.isArray(state.orders[p])) state.orders[p]=[]; });
  persistDebounced();
  rebuildVocabIndex();
  buildProvBar();
  renderProvidersPanels();
  renderStoresAll();
  unifyGlobal();
  renderCatalog();
}

/* ==========================
   Vocab único
========================== */
function uniqueVocab(lines){
  const seen = new Set(); const out=[];
  for(const l of lines){
    const t = removeDiacriticsUpper(l).trim();
    if(!t) continue;
    const k = normKey(t);
    if(!seen.has(k)){ seen.add(k); out.push(t); }
  }
  return out;
}

/* ==========================
   Índice de vocab PRO (más rápido y mejor detección)
========================== */
function bigrams(s){
  const t = stripGenericWords(s);
  const arr=[];
  for(let i=0;i<t.length-1;i++){
    const a=t[i], b=t[i+1];
    if(a!==" " && b!==" ") arr.push(a+b);
  }
  return arr;
}
function diceSimFromBigrams(A,B){
  if(!A.length||!B.length) return 0;
  let hits=0;
  const pool = B.slice();
  for(const bg of A){
    const ix = pool.indexOf(bg);
    if(ix>-1){ hits++; pool.splice(ix,1); }
  }
  return (2*hits)/(A.length+B.length);
}
function tokenSet(s){
  return new Set(stripGenericWords(s).split(" ").filter(Boolean));
}
function tokenSetSim(A,B){
  if(!A.size||!B.size) return 0;
  let inter=0;
  for(const x of A) if(B.has(x)) inter++;
  return inter / Math.max(A.size, B.size);
}
function buildPrefixMap(list){
  // map de prefijos para sugerencias rápidas
  const map = new Map();
  list.forEach(v=>{
    const k = normKey(v);
    const parts = k.split(" ").filter(Boolean);
    // guardar prefijos de palabra y del total
    const keys = new Set();
    keys.add(k.slice(0, Math.min(20,k.length)));
    parts.forEach(p=>{
      keys.add(p.slice(0, Math.min(10,p.length)));
    });
    keys.forEach(pref=>{
      if(!map.has(pref)) map.set(pref, []);
      map.get(pref).push(v);
    });
  });
  return map;
}
function rebuildVocabIndex(){
  // precompute
  const entries = vocabList.map(v=>({
    name: v,
    key: normKey(v),
    tokens: tokenSet(v),
    bgs: bigrams(v)
  }));
  const exactMap = new Map(entries.map(e=>[e.key, e.name]));
  const prefixMap = buildPrefixMap(vocabList);

  vocabIndex = { entries, exactMap, prefixMap };
}

/* ==========================
   AutocorrectNameToVocab (mejorado)
   - 1) exact match por key
   - 2) candidates por prefixMap
   - 3) score = 0.75 dice + 0.25 tokenSet (con precomputed)
========================== */
function bestMatchVocab(query){
  const qClean = stripGenericWords(query);
  const qKey = normKey(qClean);
  if(!qKey) return {name:"", ok:false, score:0};

  // exact
  const exact = vocabIndex.exactMap.get(qKey);
  if(exact) return {name: exact, ok:true, score:1};

  // candidates
  const keyShort = qKey.slice(0, Math.min(20, qKey.length));
  const parts = qKey.split(" ").filter(Boolean);
  const candsSet = new Set();
  const fromMap1 = vocabIndex.prefixMap.get(keyShort) || [];
  fromMap1.forEach(x=>candsSet.add(x));
  parts.slice(0,3).forEach(p=>{
    const arr = vocabIndex.prefixMap.get(p.slice(0, Math.min(10,p.length))) || [];
    arr.forEach(x=>candsSet.add(x));
  });

  // fallback: si nada, usar todo (limitado)
  let candidates = Array.from(candsSet);
  if(!candidates.length){
    candidates = vocabList.slice(0, 800); // safe cap
  }

  const qTokens = tokenSet(qClean);
  const qBgs = bigrams(qClean);

  let best = {name:null, score:0};
  // evaluar con entries precomputed
  const entryMap = new Map(vocabIndex.entries.map(e=>[e.name,e]));
  for(const name of candidates){
    const e = entryMap.get(name);
    if(!e) continue;
    const d = diceSimFromBigrams(qBgs, e.bgs);
    const t = tokenSetSim(qTokens, e.tokens);
    const sc = 0.75*d + 0.25*t;

    // boost si contiene substring
    const contains = e.key.includes(qKey) ? 0.06 : 0;
    const finalScore = Math.min(1, sc + contains);

    if(finalScore > best.score){
      best = {name:e.name, score:finalScore};
    }
  }
  return {name: best.name, ok: (best.score>=0.90), score: best.score};
}
function autocorrectNameToVocab(input){
  const cleaned = removeDiacriticsUpper(input).trim();
  const stripped = stripGenericWords(cleaned);
  if(!stripped) return {name:"", ok:false, score:0};

  const m = bestMatchVocab(stripped);
  // si score razonable, devolver candidato; si no, devolver cleaned (pero normalizado)
  if(m.name && m.score>=0.78) return {name:m.name, ok:m.ok, score:m.score};
  return {name: stripped, ok:false, score: m.score||0};
}

/* ==========================
   Autocomplete PRO (dropdown propio)
   - funciona en móvil siempre
   - elige con click/tap => dispara apply (CHANGE)
========================== */
const acRoot = byId("acRoot");
let acTarget = null;
let acOnPick = null;

function acHide(){
  acRoot.style.display="none";
  acRoot.innerHTML="";
  acTarget = null;
  acOnPick = null;
}
function acShowForInput(inputEl, items){
  if(!items.length){ acHide(); return; }
  const r = inputEl.getBoundingClientRect();
  const width = Math.max(220, r.width);
  acRoot.style.left = `${Math.round(r.left)}px`;
  acRoot.style.top = `${Math.round(r.bottom+6)}px`;
  acRoot.style.width = `${Math.round(width)}px`;
  acRoot.style.display="block";
  acRoot.innerHTML = "";

  items.slice(0,10).forEach(it=>{
    const div = document.createElement("div");
    div.className="ac-item";
    div.innerHTML = `<span>${it.name}</span><span class="ac-badge">${Math.round(it.score*100)}%</span>`;
    div.onmousedown = (e)=>{ e.preventDefault(); }; // evita blur antes de click
    div.onclick = ()=>{
      if(acOnPick) acOnPick(it.name);
      acHide();
    };
    acRoot.appendChild(div);
  });
}
function suggestFromVocab(q, limit=10){
  const cleaned = stripGenericWords(q);
  const qKey = normKey(cleaned);
  if(!qKey) return [];
  const qTokens = tokenSet(cleaned);
  const qBgs = bigrams(cleaned);

  // candidates por prefijos
  const candsSet = new Set();
  const keyShort = qKey.slice(0, Math.min(20,qKey.length));
  (vocabIndex.prefixMap.get(keyShort)||[]).forEach(x=>candsSet.add(x));
  qKey.split(" ").filter(Boolean).slice(0,3).forEach(p=>{
    (vocabIndex.prefixMap.get(p.slice(0,Math.min(10,p.length)))||[]).forEach(x=>candsSet.add(x));
  });

  let candidates = Array.from(candsSet);
  if(!candidates.length) candidates = vocabList.slice(0, 500);

  const entryMap = new Map(vocabIndex.entries.map(e=>[e.name,e]));
  const scored = [];
  for(const name of candidates){
    const e = entryMap.get(name);
    if(!e) continue;
    const d = diceSimFromBigrams(qBgs, e.bgs);
    const t = tokenSetSim(qTokens, e.tokens);
    let sc = 0.75*d + 0.25*t;
    if(e.key.includes(qKey)) sc = Math.min(1, sc + 0.06);
    if(sc>=0.70) scored.push({name:e.name, score:sc});
  }
  scored.sort((a,b)=>b.score-a.score);
  return scored.slice(0, limit);
}
function attachAutocompleteToInput(inputEl, onPick){
  inputEl.setAttribute("autocomplete","off");
  const handler = debounce(()=>{
    const v = inputEl.value || "";
    const sug = suggestFromVocab(v, 10);
    acTarget = inputEl;
    acOnPick = onPick;
    acShowForInput(inputEl, sug);
  }, 80);

  inputEl.addEventListener("input", handler, {passive:true});
  inputEl.addEventListener("focus", handler, {passive:true});
  inputEl.addEventListener("blur", ()=>setTimeout(()=>{ if(document.activeElement!==acRoot) acHide(); }, 140), {passive:true});
}
document.addEventListener("scroll", ()=>{ if(acRoot.style.display==="block") acHide(); }, {passive:true, capture:true});
document.addEventListener("click", (e)=>{
  if(acRoot.style.display==="block"){
    if(e.target===acRoot || acRoot.contains(e.target)) return;
    if(acTarget && (e.target===acTarget || acTarget.contains(e.target))) return;
    acHide();
  }
}, {capture:true});

/* ==========================
   Parser líneas (cantidad + nombre) mejorado
   - soporta "x4", "4kg", "4 kg", "4 cajas", etc.
   - si no hay cantidad => 1
========================== */
function parseLine(raw){
  if(!raw) return null;
  let s = String(raw).replace(/\t/g," ").replace(/\s{2,}/g," ").trim();
  s = s.replace(/^[-•*]\s*/,"");
  if(!s) return null;

  let qty = null;
  let name = s;

  const mX = s.match(/(?:\bx|\bX|\*)\s*(\d+[\.,]?\d*)\b/);
  if(mX){
    qty = Number(mX[1].replace(",","."));
    name = s.replace(mX[0]," ").trim();
  }
  if(qty===null){
    const mEnd = s.match(/(\d+[\.,]?\d*)\s*(kg|kgs|kilo|kilos|uds|ud|u|unidad|unidades|caja|cajas|manojo|manojos|saco|sacos)?\s*$/i);
    if(mEnd){
      qty = Number(mEnd[1].replace(",","."));
      name = s.slice(0, mEnd.index).trim();
    }
  }
  if(qty===null){
    const mStart = s.match(/^\s*(\d+[\.,]?\d*)\s+(.*)$/);
    if(mStart){
      qty = Number(mStart[1].replace(",","."));
      name = mStart[2].trim();
    }
  }
  if(qty===null || Number.isNaN(qty)) qty = 1;

  const original = removeDiacriticsUpper(s);
  const cleanedName = stripGenericWords(name);
  return { original, name: cleanedName, qty };
}

/* ==========================
   Duplicados exactos + merge
========================== */
function sumDuplicatesRows(rows){
  const map = new Map();
  for(const r of rows){
    const k = normKey(r.e);
    if(!k) continue;
    if(!map.has(k)) map.set(k, {o:r.o, e:r.e, q:0, a:!!r.a});
    const it = map.get(k);
    it.q += Number(r.q)||0;
    // si uno era "a revisar", mantener "a revisar"
    it.a = it.a || !!r.a;
  }
  return Array.from(map.values()).sort((a,b)=>a.e.localeCompare(b.e,"es"));
}

/* ==========================
   Similaridad (para ⚠️ duplicados probables)
========================== */
function similarityScore(a,b){
  const A = bigrams(a), B = bigrams(b);
  const d = diceSimFromBigrams(A,B);
  const t = tokenSetSim(tokenSet(a), tokenSet(b));
  return 0.7*d + 0.3*t;
}

/* ==========================
   Render TABs
========================== */
function showTab(key){
  const keys = ["dic","tiendas","global","proveedores","catalogo"];
  keys.forEach(k=>{
    byId("tab-"+k).style.display = (k===key) ? "block" : "none";
    byId("btn-"+k).classList.toggle("active", k===key);
  });

  const fab = byId("fab");
  if(key==="global"){ fab.style.display="block"; } else { fab.style.display="none"; fabMenuHide(); }

  acHide();

  if(key==="global") idle(()=>{ buildProvBar(); unifyGlobal(); renderProvManage(); });
  if(key==="proveedores") idle(()=>{ renderProvidersPanels(); });
  if(key==="catalogo") idle(()=>{ renderCatalog(); });
}

/* ==========================
   Tema
========================== */
function applyTheme(t){
  document.documentElement.setAttribute("data-theme", t==="dark" ? "dark" : "light");
  localStorage.setItem(LS.THEME, t==="dark"?"dark":"light");
}
function toggleTheme(){
  const cur = localStorage.getItem(LS.THEME) || "light";
  applyTheme(cur==="light" ? "dark" : "light");
}

/* ==========================
   Vocab UI
========================== */
function saveVocab(){
  const raw = byId("vocabTxt").value || "";
  const list = uniqueVocab(toLines(raw)).map(x=>removeDiacriticsUpper(x));
  byId("vocabTxt").value = list.join("\n");
  localStorage.setItem(LS.VOCAB, byId("vocabTxt").value);
  vocabList = list;
  rebuildVocabIndex();
  persistDebounced();
  setQuality("OK", "ok");
  alert("Vocabulario guardado y optimizado.");
  // re-render suave
  renderStoresAll();
  unifyGlobal();
  renderProvidersPanels();
  renderCatalog();
}
function addNewWord(){
  const entry = prompt("Introduce nuevo producto (uno por línea si son varios):");
  if(!entry) return;
  const current = toLines(byId("vocabTxt").value);
  const added = toLines(entry);
  const merged = uniqueVocab(current.concat(added)).map(x=>removeDiacriticsUpper(x));
  byId("vocabTxt").value = merged.join("\n");
  saveVocab();
}

/* ==========================
   Seguridad/calidad: reset all
========================== */
function resetAll(){
  if(confirm("¿Seguro que quieres limpiar TODO? (vocab, tiendas, proveedores, pedidos, catálogo)")){
    localStorage.clear();
    location.reload();
  }
}

/* ==========================
   Tiendas: estandarizar + render
========================== */
function estandarizarStore(code){
  pushUndo("estandarizar-"+code);

  const txt = byId("in_"+code).value || "";
  const rows = [];

  toLines(txt).forEach(line=>{
    const p = parseLine(line);
    if(!p) return;
    const ac = autocorrectNameToVocab(p.name);
    rows.push({ o:p.original, e:ac.name, q:p.qty, a:!ac.ok });
  });

  state.stores[code] = sumDuplicatesRows(rows);
  persistDebounced();
  renderStoreTable(code);
  idle(()=>unifyGlobal());
  updateQualityFromStores();
}

function guardarTienda(code){
  const out = (state.stores[code]||[]).map(r=>`${r.e} ${r.q}`).join("\n");
  byId("in_"+code).value = out;
  alert(`Tienda ${code.toUpperCase()} guardada en el textarea.`);
}
function exportarTiendaTXT(code){
  const tienda = state.stores[code]||[];
  if(!tienda.length){ alert("No hay datos estandarizados."); return; }
  const okRows = tienda.filter(r=>!r.a && r.e);
  if(!okRows.length){ alert("Aún hay productos por revisar (en rojo)."); return; }
  const txt = okRows.map(x=>`${x.q} ${x.e}`).join("\n");
  const blob = new Blob([txt], {type:"text/plain"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${code}_estandarizado_${todayISO()}.txt`;
  a.click();
}
function enviarTiendaWhatsApp(code){
  const tienda = state.stores[code]||[];
  if(!tienda.length){ alert("No hay datos estandarizados."); return; }
  const okRows = tienda.filter(r=>!r.a && r.e);
  if(!okRows.length){ alert("Aún hay productos por revisar (en rojo)."); return; }
  const txt = okRows.map(x=>`${x.q} ${x.e}`).join("\n");
  const msg = encodeURIComponent(`🛒 *Pedido ${code.toUpperCase()}*\n\n${txt}`);
  window.open(`https://wa.me/?text=${msg}`,"_blank");
}

function renderStoresAll(){
  ["sp","sl","st"].forEach(code=>renderStoreTable(code));
  updateQualityFromStores();
}

function renderStoreTable(code){
  const wrap = byId("tbl_"+code+"_wrap");
  const rows = state.stores[code]||[];
  if(!rows.length){ wrap.innerHTML=""; return; }

  let html = `<div class="scroll-x"><table>
    <thead><tr><th>Original</th><th>Estandarizado</th><th>Cantidad</th><th>Estado</th></tr></thead><tbody>`;

  rows.forEach((r,i)=>{
    const status = r.a ? `<span class="pill warn">Revisar</span>` : `<span class="pill ok">OK</span>`;
    html += `<tr>
      <td>${escapeHTML(r.o||"")}</td>
      <td>
        <input class="cell-input ${r.a?'warn':'ok'}" data-se="${i}" value="${escapeAttr(r.e||"")}" />
      </td>
      <td>
        <div class="qty-chip">
          <button data-qm="${i}" aria-label="menos">−</button>
          <span class="n" id="q_${code}_${i}">${Number(r.q)||0}</span>
          <button data-qp="${i}" aria-label="más">+</button>
        </div>
      </td>
      <td>${status}</td>
    </tr>`;
  });

  html += `</tbody></table></div>`;
  wrap.innerHTML = html;

  // qty +/- (menos toques)
  wrap.querySelectorAll("button[data-qm]").forEach(btn=>{
    btn.onclick = ()=>{
      pushUndo("qty-minus-"+code);
      const i = Number(btn.getAttribute("data-qm"));
      const v = Math.max(0, (Number(state.stores[code][i].q)||0) - 1);
      state.stores[code][i].q = v;
      byId(`q_${code}_${i}`).textContent = v;
      persistDebounced();
      idle(()=>unifyGlobal());
    };
  });
  wrap.querySelectorAll("button[data-qp]").forEach(btn=>{
    btn.onclick = ()=>{
      pushUndo("qty-plus-"+code);
      const i = Number(btn.getAttribute("data-qp"));
      const v = (Number(state.stores[code][i].q)||0) + 1;
      state.stores[code][i].q = v;
      byId(`q_${code}_${i}`).textContent = v;
      persistDebounced();
      idle(()=>unifyGlobal());
    };
  });

  // inputs (NOMBRE) con autocomplete PRO + autocorrect on change/blur
  wrap.querySelectorAll("input[data-se]").forEach(inp=>{
    const apply = ()=>{
      const i = Number(inp.getAttribute("data-se"));
      if(!state.stores[code][i]) return;

      pushUndo("edit-store-name-"+code);

      const ac = autocorrectNameToVocab(inp.value);
      state.stores[code][i].e = ac.name;
      state.stores[code][i].a = !ac.ok;

      // merge duplicates exact
      state.stores[code] = sumDuplicatesRows(state.stores[code]);

      persistDebounced();
      renderStoreTable(code);
      idle(()=>unifyGlobal());
      updateQualityFromStores();
    };

    attachAutocompleteToInput(inp, (picked)=>{
      inp.value = picked;
      // fuerza apply inmediato (simula change)
      apply();
    });

    inp.addEventListener("change", apply, {passive:true});
    inp.addEventListener("blur", apply, {passive:true});

    // feedback en vivo (sin re-render)
    inp.addEventListener("input", debounce(()=>{
      const ac = autocorrectNameToVocab(inp.value);
      inp.classList.toggle("ok", ac.ok);
      inp.classList.toggle("warn", !ac.ok);
    }, 120), {passive:true});
  });
}

/* ==========================
   Global: unify + tabla + asignación proveedor (undo)
========================== */
function unifyGlobal(){
  const all = [].concat(state.stores.sp||[], state.stores.sl||[], state.stores.st||[]);
  const map = new Map();

  for(const r of all){
    const name = (r && r.e) ? r.e : "";
    const key = normKey(name);
    if(!key) continue;
    if(!map.has(key)) map.set(key, {name, total:0});
    map.get(key).total += (Number(r.q)||0);
  }

  const arr = Array.from(map.values()).sort((a,b)=>a.name.localeCompare(b.name,"es"));

  // similares ⚠️
  const similarSet = new Set();
  const names = arr.map(x=>x.name);
  for(let i=0;i<names.length;i++){
    for(let j=i+1;j<names.length;j++){
      const s1=names[i], s2=names[j];
      if(normKey(s1)===normKey(s2)) continue;
      const sc = similarityScore(s1,s2);
      if(sc>=0.86){
        similarSet.add(s1); similarSet.add(s2);
      }
    }
  }

  renderGlobalTable(arr, similarSet);
  updateQualityFromStores();
}

function renderGlobalTable(allRows, similarSet){
  const visible = allRows.filter(r=>!state.assignments[normKey(r.name)]);
  globalRows = visible;

  const wrap = byId("global_wrap");
  if(!visible.length){
    wrap.innerHTML = `<div class="hint">Sin productos (todo asignado o no hay datos).</div>`;
    return;
  }

  let html = `
    <div class="hint" style="margin-bottom:6px">
      Proveedor activo: <b>${escapeHTML(state.activeProvider||PROVIDERS[0])}</b>. Asigna con ✅.
    </div>
    <div class="scroll-x"><table>
      <thead><tr><th></th><th>Producto</th><th>Total</th><th>Estado</th></tr></thead><tbody>`;

  visible.forEach((r,i)=>{
    const isSimilar = similarSet.has(r.name);
    html += `<tr data-i="${i}" class="${isSimilar?'dup':''}">
      <td><button class="ok-assign" data-assign="${i}">✅</button></td>
      <td><input class="cell-input ${isSimilar?'warn':'ok'}" data-gname="${i}" value="${escapeAttr(r.name)}" /></td>
      <td><input class="cell-input ok" data-gtotal="${i}" value="${escapeAttr(String(r.total))}" /></td>
      <td>${isSimilar? `<span class="pill warn">Posible duplicado <span class="flag">⚠️</span></span>` : `<span class="pill ok">OK</span>`}</td>
    </tr>`;
  });

  html += `</tbody></table></div>`;
  wrap.innerHTML = html;

  // assign buttons (UNDO incluido)
  wrap.querySelectorAll("button[data-assign]").forEach(btn=>{
    btn.onclick = ()=>{
      const idx = Number(btn.getAttribute("data-assign"));
      assignFromGlobal(idx);
    };
  });

  // name input (autocomplete + autocorrect on change/blur)
  wrap.querySelectorAll("input[data-gname]").forEach(inp=>{
    const apply = ()=>{
      const idx = Number(inp.getAttribute("data-gname"));
      if(!globalRows[idx]) return;

      pushUndo("edit-global-name");

      const ac = autocorrectNameToVocab(inp.value);
      globalRows[idx].name = ac.name;
      inp.value = ac.name;
      inp.classList.toggle("ok", ac.ok);
      inp.classList.toggle("warn", !ac.ok);

      persistDebounced();
      idle(()=>unifyGlobal());
    };

    attachAutocompleteToInput(inp, (picked)=>{
      inp.value = picked;
      apply();
    });

    inp.addEventListener("change", apply, {passive:true});
    inp.addEventListener("blur", apply, {passive:true});
  });

  // total input
  wrap.querySelectorAll("input[data-gtotal]").forEach(inp=>{
    const apply = ()=>{
      const idx = Number(inp.getAttribute("data-gtotal"));
      if(!globalRows[idx]) return;
      pushUndo("edit-global-total");
      const v = Number(String(inp.value).replace(",","."));
      globalRows[idx].total = Number.isFinite(v) ? v : 0;
      persistDebounced();
      idle(()=>unifyGlobal());
    };
    inp.addEventListener("change", apply, {passive:true});
    inp.addEventListener("blur", apply, {passive:true});
  });
}

function assignFromGlobal(idx){
  const item = globalRows[idx];
  if(!item) return;

  pushUndo("assign-provider");

  const prov = state.activeProvider || PROVIDERS[0];
  const k = normKey(item.name);
  state.assignments[k] = prov;

  const list = state.orders[prov] || [];
  const ex = list.findIndex(x=>normKey(x.name)===k);
  if(ex>-1){
    list[ex].qty += Number(item.total)||0;
  }else{
    list.push({name:item.name, qty:Number(item.total)||0, unit: inferUnit(item.name)});
  }
  state.orders[prov] = list;

  // actualizar catálogo (producto visto)
  ensureCatalogEntry(item.name, inferUnit(item.name));

  persistDebounced();
  idle(()=>unifyGlobal());
  renderProvidersPanels();
  renderCatalog();
}

/* ==========================
   Providers bar + gestión
========================== */
function buildProvBar(){
  const bar = byId("provBar");
  bar.innerHTML = "";
  PROVIDERS.forEach(p=>{
    const b = document.createElement("button");
    b.className = "prov-btn" + ((state.activeProvider===p) ? " active" : "");
    b.textContent = p;
    b.onclick = ()=>{
      pushUndo("switch-provider");
      state.activeProvider = p;
      persistDebounced();
      buildProvBar();
      idle(()=>unifyGlobal());
    };
    bar.appendChild(b);
  });
}

function renderProvManage(){
  const wrap = byId("provManageWrap");
  if(!wrap) return;

  let html = `<div class="scroll-x"><table>
    <thead><tr><th>Proveedor</th><th>Acciones</th></tr></thead><tbody>`;

  PROVIDERS.forEach((p,i)=>{
    html += `<tr>
      <td><input class="cell-input ok" data-provname="${i}" value="${escapeAttr(p)}" /></td>
      <td style="white-space:nowrap">
        <button class="btn small muted" data-provdel="${i}">🗑️ Quitar</button>
      </td>
    </tr>`;
  });

  html += `</tbody></table></div>`;
  wrap.innerHTML = html;

  // rename provider
  wrap.querySelectorAll("input[data-provname]").forEach(inp=>{
    inp.addEventListener("blur", ()=>{
      const i = Number(inp.getAttribute("data-provname"));
      const newName = removeDiacriticsUpper(inp.value).trim();
      if(!newName) { inp.value = PROVIDERS[i]; return; }

      pushUndo("rename-provider");

      const old = PROVIDERS[i];
      PROVIDERS[i] = newName;

      // migrar orders key si existía
      if(old!==newName){
        state.orders[newName] = state.orders[old] || [];
        delete state.orders[old];

        // migrar assignments value
        Object.keys(state.assignments).forEach(k=>{
          if(state.assignments[k]===old) state.assignments[k]=newName;
        });

        // active
        if(state.activeProvider===old) state.activeProvider=newName;
      }

      persistDebounced();
      buildProvBar();
      renderProvidersPanels();
      unifyGlobal();
      renderProvManage();
    }, {passive:true});
  });

  // delete provider
  wrap.querySelectorAll("button[data-provdel]").forEach(btn=>{
    btn.onclick = ()=>{
      const i = Number(btn.getAttribute("data-provdel"));
      const p = PROVIDERS[i];
      if(!confirm(`¿Quitar proveedor "${p}"?\nSus líneas NO se borran: se moverán a "SIN PROVEEDOR".`)) return;

      pushUndo("delete-provider");

      // crear bucket sin proveedor
      const bucket = "SIN PROVEEDOR";
      if(!PROVIDERS.includes(bucket)) PROVIDERS.push(bucket);
      if(!Array.isArray(state.orders[bucket])) state.orders[bucket]=[];

      // mover líneas
      const lines = state.orders[p] || [];
      state.orders[bucket] = state.orders[bucket].concat(lines);
      delete state.orders[p];

      // limpiar assignments que apunten a p
      Object.keys(state.assignments).forEach(k=>{
        if(state.assignments[k]===p) delete state.assignments[k];
      });

      // eliminar provider
      PROVIDERS.splice(i,1);
      if(state.activeProvider===p) state.activeProvider = PROVIDERS[0] || bucket;

      persistDebounced();
      buildProvBar();
      unifyGlobal();
      renderProvidersPanels();
      renderProvManage();
    };
  });
}

function addProvider(){
  const name = prompt("Nombre del proveedor:");
  if(!name) return;
  const p = removeDiacriticsUpper(name).trim();
  if(!p) return;

  pushUndo("add-provider");

  if(!PROVIDERS.includes(p)) PROVIDERS.push(p);
  if(!Array.isArray(state.orders[p])) state.orders[p]=[];
  if(!state.activeProvider) state.activeProvider=p;

  persistDebounced();
  buildProvBar();
  renderProvManage();
  renderProvidersPanels();
}
function reorderProviders(){
  pushUndo("reorder-providers");
  PROVIDERS.sort((a,b)=>a.localeCompare(b,"es"));
  persistDebounced();
  buildProvBar();
  renderProvManage();
  renderProvidersPanels();
}

/* ==========================
   Providers panels (editable + autocorrect)
========================== */
function renderProvidersPanels(){
  const cont = byId("provPanels");
  if(!cont) return;
  cont.innerHTML = "";

  PROVIDERS.forEach(prov=>{
    const list = state.orders[prov] || [];
    const card = document.createElement("div");
    card.className = "card";

    const hd = document.createElement("div");
    hd.className = "hd";
    hd.innerHTML = `<strong>${escapeHTML(prov)}</strong>
      <div class="toolbar">
        <button class="btn small" data-ptxt="${escapeAttr(prov)}">📄 TXT</button>
        <button class="btn small muted" data-pwa="${escapeAttr(prov)}">📲 WhatsApp</button>
      </div>`;

    const bd = document.createElement("div");
    bd.className = "bd";

    if(!list.length){
      bd.innerHTML = `<div class="hint">Sin productos asignados.</div>`;
    }else{
      let html = `<div class="scroll-x"><table>
        <thead><tr><th>Producto</th><th>Cantidad</th><th>Unidad</th><th></th></tr></thead><tbody>`;
      list.forEach((it,ix)=>{
        const key = normKey(it.name);
        const hasPrice = !!(catalog[key] && catalog[key].price);
        html += `<tr>
          <td><input class="cell-input ok" data-pname="${escapeAttr(prov)}" data-idx="${ix}" value="${escapeAttr(it.name)}" /></td>
          <td><input class="cell-input ok" data-pqty="${escapeAttr(prov)}" data-idx="${ix}" value="${escapeAttr(String(it.qty))}" /></td>
          <td>
            <select class="select" data-punit="${escapeAttr(prov)}" data-idx="${ix}">
              ${unitOptions(it.unit || inferUnit(it.name))}
            </select>
          </td>
          <td style="white-space:nowrap">
            <span class="pill ${hasPrice?'ok':'warn'}" title="Precio en catálogo">${hasPrice?'€ OK':'€ ?'}</span>
            <button class="btn small muted" data-prm="${escapeAttr(prov)}" data-idx="${ix}">🗑️</button>
          </td>
        </tr>`;
      });
      html += `</tbody></table></div>`;
      bd.innerHTML = html;

      // name inputs (autocomplete + autocorrect change/blur)
      bd.querySelectorAll("input[data-pname]").forEach(inp=>{
        const apply = ()=>{
          const prov2 = inp.getAttribute("data-pname");
          const idx = Number(inp.getAttribute("data-idx"));
          if(!state.orders[prov2] || !state.orders[prov2][idx]) return;

          pushUndo("edit-provider-name");

          const ac = autocorrectNameToVocab(inp.value);
          state.orders[prov2][idx].name = ac.name;
          state.orders[prov2][idx].unit = inferUnit(ac.name);
          inp.value = ac.name;
          inp.classList.toggle("ok", ac.ok);
          inp.classList.toggle("warn", !ac.ok);

          // merge duplicates exact en ese proveedor
          state.orders[prov2] = mergeOrderList(state.orders[prov2]);

          // catálogo
          ensureCatalogEntry(ac.name, state.orders[prov2][idx]?.unit || inferUnit(ac.name));

          persistDebounced();
          renderProvidersPanels();
          renderCatalog();
        };

        attachAutocompleteToInput(inp, (picked)=>{
          inp.value = picked;
          apply();
        });

        inp.addEventListener("change", apply, {passive:true});
        inp.addEventListener("blur", apply, {passive:true});
      });

      // qty inputs
      bd.querySelectorAll("input[data-pqty]").forEach(inp=>{
        const apply = ()=>{
          const prov2 = inp.getAttribute("data-pqty");
          const idx = Number(inp.getAttribute("data-idx"));
          if(!state.orders[prov2] || !state.orders[prov2][idx]) return;

          pushUndo("edit-provider-qty");

          const v = Number(String(inp.value).replace(",","."));
          state.orders[prov2][idx].qty = Number.isFinite(v) ? v : 0;

          persistDebounced();
        };
        inp.addEventListener("change", apply, {passive:true});
        inp.addEventListener("blur", apply, {passive:true});
      });

      // unit select
      bd.querySelectorAll("select[data-punit]").forEach(sel=>{
        sel.onchange = ()=>{
          const prov2 = sel.getAttribute("data-punit");
          const idx = Number(sel.getAttribute("data-idx"));
          if(!state.orders[prov2] || !state.orders[prov2][idx]) return;

          pushUndo("edit-provider-unit");

          state.orders[prov2][idx].unit = sel.value;
          ensureCatalogEntry(state.orders[prov2][idx].name, sel.value);
          persistDebounced();
          renderCatalog();
        };
      });

      // remove line
      bd.querySelectorAll("button[data-prm]").forEach(btn=>{
        btn.onclick = ()=>{
          const prov2 = btn.getAttribute("data-prm");
          const idx = Number(btn.getAttribute("data-idx"));
          if(!state.orders[prov2] || !state.orders[prov2][idx]) return;

          pushUndo("remove-provider-line");

          state.orders[prov2].splice(idx,1);
          persistDebounced();
          renderProvidersPanels();
        };
      });
    }

    card.appendChild(hd); card.appendChild(bd);
    cont.appendChild(card);

    // export buttons
    hd.querySelectorAll("button[data-ptxt]").forEach(btn=>{
      btn.onclick = ()=>exportProvTXT(btn.getAttribute("data-ptxt"));
    });
    hd.querySelectorAll("button[data-pwa]").forEach(btn=>{
      btn.onclick = ()=>enviarProvWhatsApp(btn.getAttribute("data-pwa"));
    });
  });
}

function mergeOrderList(list){
  const map = new Map();
  for(const it of list){
    const k = normKey(it.name);
    if(!k) continue;
    if(!map.has(k)) map.set(k, {name:it.name, qty:0, unit: it.unit || inferUnit(it.name)});
    const x = map.get(k);
    x.qty += Number(it.qty)||0;
  }
  return Array.from(map.values()).sort((a,b)=>a.name.localeCompare(b.name,"es"));
}

function exportProvTXT(prov){
  const list = state.orders[prov]||[];
  if(!list.length){ alert("No hay líneas para " + prov); return; }
  const txt = list.map(x=>`${x.qty} ${x.name}`).join("\n");
  const blob = new Blob([txt], {type:"text/plain"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `pedido_${prov}_${todayISO()}.txt`;
  a.click();
}
function enviarProvWhatsApp(prov){
  const list = state.orders[prov]||[];
  if(!list.length){ alert("No hay líneas para " + prov); return; }
  const txt = list.map(x=>`${x.qty} ${x.name}`).join("\n");
  const msg = encodeURIComponent(`📦 *Pedido ${prov}*\n\n${txt}`);
  window.open(`https://wa.me/?text=${msg}`,"_blank");
}

/* ==========================
   Export global
========================== */
function copiarGlobal(){
  if(!globalRows.length){ alert("No hay datos."); return; }
  const txt = globalRows.map(r=>`- ${r.total} ${r.name}`).join("\n");
  navigator.clipboard.writeText(txt);
  alert("Lista global copiada.");
}
function exportarGlobalTXT(){
  if(!globalRows.length){ alert("No hay datos."); return; }
  const txt = globalRows.map(r=>`${r.total}\t${r.name}`).join("\n");
  const blob = new Blob([txt], {type:"text/plain"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `lista_global_${todayISO()}.txt`;
  a.click();
}
function exportarGlobalXLSX(){
  if(!globalRows.length){ alert("No hay datos."); return; }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([["Producto","Total"], ...globalRows.map(r=>[r.name, r.total])]);
  XLSX.utils.book_append_sheet(wb, ws, "Global");
  XLSX.writeFile(wb, `lista_global_${todayISO()}.xlsx`);
}
function exportResumenGlobalTXT(){
  // reconstruir totales por producto (todas tiendas)
  const all = [].concat(state.stores.sp||[], state.stores.sl||[], state.stores.st||[]);
  const totalMap = {};
  all.forEach(r=>{
    const k = normKey(r.e);
    if(!k) return;
    if(!totalMap[k]) totalMap[k] = {name:r.e, total:0};
    totalMap[k].total += (Number(r.q)||0);
  });

  const byProv = {}; PROVIDERS.forEach(p=>byProv[p]=[]);
  const unassigned = [];

  Object.values(totalMap).forEach(it=>{
    const k = normKey(it.name);
    const prov = state.assignments[k];
    if(prov && PROVIDERS.includes(prov)){
      byProv[prov].push({name:it.name, qty:it.total});
    }else{
      unassigned.push({name:it.name, qty:it.total});
    }
  });

  let out = `📦 PEDIDOS POR PROVEEDOR\n\n`;
  PROVIDERS.forEach(p=>{
    out += `> ${p}:\n`;
    const arr = (byProv[p]||[]).sort((a,b)=>a.name.localeCompare(b.name,"es"));
    if(arr.length) arr.forEach(x=>out += `- ${x.qty} ${x.name}\n`);
    else out += `- (sin líneas)\n`;
    out += `\n`;
  });

  out += `📌 SIN PROVEEDOR ASIGNADO:\n`;
  if(unassigned.length){
    unassigned.sort((a,b)=>a.name.localeCompare(b.name,"es"));
    unassigned.forEach(x=>out += `- ${x.qty} ${x.name}\n`);
  }else out += `- (sin líneas)\n`;

  const blob = new Blob([out], {type:"text/plain"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `resumen_pedidos_${todayISO()}.txt`;
  a.click();
}

/* ==========================
   Reparto por tiendas (con precio opcional)
========================== */
const repartoState = {}; // {code:[{name,qty,price,checked}]}
function renderRepartoTienda(){
  const code = byId("selRepartoTienda").value;
  const wrap = byId("reparto_wrap");
  if(!code){ wrap.innerHTML = `<div class="hint">Selecciona una tienda para ver su lista.</div>`; return; }
  const lista = state.stores[code]||[];
  if(!lista.length){ wrap.innerHTML = `<div class="hint">Sin datos en esta tienda.</div>`; return; }

  if(!repartoState[code] || repartoState[code].length !== lista.length){
    repartoState[code] = lista.map(x=>({name:x.e, qty:x.q, price:"", checked:false}));
  }

  let html = `<div class="scroll-x"><table>
    <thead><tr><th></th><th>Producto</th><th>Cantidad</th><th>Precio (€)</th></tr></thead><tbody>`;

  repartoState[code].forEach((r,i)=>{
    html += `<tr>
      <td><input type="checkbox" ${r.checked?"checked":""} data-rchk="${i}"></td>
      <td>${escapeHTML(r.name)}</td>
      <td>${escapeHTML(String(r.qty))}</td>
      <td><input class="cell-input ok" data-rprice="${i}" value="${escapeAttr(r.price||"")}" placeholder="0,00"></td>
    </tr>`;
  });

  html += `</tbody></table></div>`;
  wrap.innerHTML = html;

  wrap.querySelectorAll("input[data-rchk]").forEach(ch=>{
    ch.onchange = ()=>{ repartoState[code][Number(ch.getAttribute("data-rchk"))].checked = ch.checked; };
  });
  wrap.querySelectorAll("input[data-rprice]").forEach(inp=>{
    inp.onblur = ()=>{
      const i = Number(inp.getAttribute("data-rprice"));
      const num = parseFloat(String(inp.value||"").replace(",","."));
      repartoState[code][i].price = Number.isFinite(num) ? num.toFixed(2) : "";
      inp.value = repartoState[code][i].price;
    };
  });
}
function exportarRepartoTXT(){
  const code = byId("selRepartoTienda").value;
  if(!code){ alert("Selecciona una tienda primero."); return; }
  const arr = (repartoState[code]||[]).filter(x=>x.checked);
  if(!arr.length){ alert("No hay productos seleccionados."); return; }
  const txt = arr.map(x=>`${x.qty} ${x.name}${x.price? " — "+x.price+"€":""}`).join("\n");
  const blob = new Blob([txt], {type:"text/plain"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `reparto_${code}_${todayISO()}.txt`;
  a.click();
}
function enviarRepartoWhatsApp(){
  const code = byId("selRepartoTienda").value;
  if(!code){ alert("Selecciona una tienda primero."); return; }
  const arr = (repartoState[code]||[]).filter(x=>x.checked);
  if(!arr.length){ alert("No hay productos seleccionados."); return; }
  let msg = `🚚 *Reparto ${code.toUpperCase()}*\n\n`;
  arr.forEach(x=>{
    msg += `- ${x.qty} ${x.name}`;
    if(x.price) msg += ` — ${x.price}€`;
    msg += `\n`;
  });
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,"_blank");
}

/* ==========================
   Catálogo (precios + historial)
========================== */
function ensureCatalogEntry(name, unit){
  const k = normKey(name);
  if(!k) return;
  if(!catalog[k]){
    catalog[k] = { name: removeDiacriticsUpper(name), unit: unit||inferUnit(name), price:"", lastAt:"", hist:[] };
  }else{
    // keep best name (vocab)
    catalog[k].name = removeDiacriticsUpper(name);
    if(unit) catalog[k].unit = unit;
  }
}
function inferUnit(name){
  // “cantidades inteligentes” (puedes cambiar regla)
  const n = normKey(name);
  if(/\bPINA\b|\bCOCO\b|\bPAPAYA\b|\bSANDIA\b|\bMELON\b|\bALOE\b/.test(n)) return "ud";
  if(/\bCILANTRO\b|\bPEREJIL\b|\bAPIO\b|\bHIERBABUENA\b|\bMENTA\b|\bENELDO\b/.test(n)) return "manojo";
  return "kg";
}
function unitOptions(selected){
  const opts = ["kg","ud","caja","manojo","saco"];
  return opts.map(u=>`<option value="${u}" ${u===selected?"selected":""}>${u}</option>`).join("");
}
function syncCatalogFromOrders(){
  pushUndo("catalog-sync");
  // from stores
  ["sp","sl","st"].forEach(code=>{
    (state.stores[code]||[]).forEach(r=>ensureCatalogEntry(r.e, inferUnit(r.e)));
  });
  // from orders
  PROVIDERS.forEach(p=>{
    (state.orders[p]||[]).forEach(it=>ensureCatalogEntry(it.name, it.unit || inferUnit(it.name)));
  });
  persistDebounced();
  renderCatalog();
  alert("Catálogo actualizado con productos detectados.");
}
function setCatalogPrice(nameKey, price){
  if(!catalog[nameKey]) return;
  const p = String(price||"").trim();
  const num = parseFloat(p.replace(",","."));
  if(!Number.isFinite(num) || num<0) return;

  // guardar historial si cambia
  const prev = catalog[nameKey].price ? parseFloat(String(catalog[nameKey].price).replace(",", ".")) : null;
  if(prev===null || Math.abs(prev-num) > 1e-9){
    catalog[nameKey].hist = catalog[nameKey].hist || [];
    catalog[nameKey].hist.unshift({date: todayISO(), price: num.toFixed(2)});
    catalog[nameKey].hist = catalog[nameKey].hist.slice(0, 40);
  }
  catalog[nameKey].price = num.toFixed(2);
  catalog[nameKey].lastAt = nowISO();
}
function renderCatalog(){
  const wrap = byId("catalogWrap");
  if(!wrap) return;

  // ensure entries
  syncCatalogLight();

  const q = normKey(byId("catalogSearch")?.value || "");
  const filter = byId("catalogFilter")?.value || "all";

  let arr = Object.entries(catalog).map(([k,v])=>({k, ...v}));
  if(q){
    arr = arr.filter(x=>normKey(x.name).includes(q));
  }
  if(filter==="priced") arr = arr.filter(x=>x.price);
  if(filter==="unpriced") arr = arr.filter(x=>!x.price);

  arr.sort((a,b)=>a.name.localeCompare(b.name,"es"));

  if(!arr.length){
    wrap.innerHTML = `<div class="hint">No hay productos (o no coinciden con el filtro).</div>`;
    return;
  }

  let html = `<div class="scroll-x"><table>
    <thead><tr><th>Producto</th><th>Unidad</th><th>Precio</th><th>Historial</th><th></th></tr></thead><tbody>`;

  arr.forEach((it,ix)=>{
    const hist = (it.hist||[]).slice(0,3).map(h=>`${h.date}: ${h.price}€`).join(" · ");
    html += `<tr>
      <td><input class="cell-input ok" data-cname="${escapeAttr(it.k)}" value="${escapeAttr(it.name)}"></td>
      <td>
        <select class="select" data-cunit="${escapeAttr(it.k)}">
          ${unitOptions(it.unit || "kg")}
        </select>
      </td>
      <td><input class="cell-input ${it.price?'ok':'warn'}" data-cprice="${escapeAttr(it.k)}" value="${escapeAttr(it.price||"")}" placeholder="0,00"></td>
      <td class="hint">${escapeHTML(hist || "—")}</td>
      <td style="white-space:nowrap">
        <button class="btn small muted" data-chist="${escapeAttr(it.k)}">📜</button>
        <button class="btn small muted" data-cdel="${escapeAttr(it.k)}">🗑️</button>
      </td>
    </tr>`;
  });

  html += `</tbody></table></div>`;
  wrap.innerHTML = html;

  // name edit with autocomplete+autocorrect
  wrap.querySelectorAll("input[data-cname]").forEach(inp=>{
    const k = inp.getAttribute("data-cname");
    const apply = ()=>{
      pushUndo("catalog-name");
      const ac = autocorrectNameToVocab(inp.value);
      // cambiar key si cambia nombre: migración
      const newKey = normKey(ac.name);
      if(!newKey){ inp.value = catalog[k]?.name || ""; return; }

      // si misma key: update
      if(newKey===k){
        catalog[k].name = ac.name;
        inp.value = ac.name;
      }else{
        // mover objeto
        const obj = catalog[k] || {name:ac.name, unit:"kg", price:"", lastAt:"", hist:[]};
        obj.name = ac.name;
        catalog[newKey] = obj;
        delete catalog[k];

        // también migrar assignments key
        if(state.assignments[k]){
          state.assignments[newKey] = state.assignments[k];
          delete state.assignments[k];
        }
        // migrar orders items
        PROVIDERS.forEach(p=>{
          (state.orders[p]||[]).forEach(it=>{
            if(normKey(it.name)===k) it.name = ac.name;
          });
        });
      }

      persistDebounced();
      renderCatalog();
      unifyGlobal();
      renderProvidersPanels();
    };

    attachAutocompleteToInput(inp, (picked)=>{ inp.value=picked; apply(); });
    inp.addEventListener("change", apply, {passive:true});
    inp.addEventListener("blur", apply, {passive:true});
  });

  // unit
  wrap.querySelectorAll("select[data-cunit]").forEach(sel=>{
    sel.onchange = ()=>{
      pushUndo("catalog-unit");
      const k = sel.getAttribute("data-cunit");
      if(catalog[k]) catalog[k].unit = sel.value;
      persistDebounced();
    };
  });

  // price
  wrap.querySelectorAll("input[data-cprice]").forEach(inp=>{
    const k = inp.getAttribute("data-cprice");
    inp.onblur = ()=>{
      pushUndo("catalog-price");
      setCatalogPrice(k, inp.value);
      persistDebounced();
      renderCatalog();
    };
  });

  // history modal simple (alert)
  wrap.querySelectorAll("button[data-chist]").forEach(btn=>{
    btn.onclick = ()=>{
      const k = btn.getAttribute("data-chist");
      const h = (catalog[k]?.hist||[]);
      const txt = h.length ? h.map(x=>`${x.date} — ${x.price}€`).join("\n") : "(sin historial)";
      alert(`📜 Historial ${catalog[k]?.name||""}\n\n${txt}`);
    };
  });

  // delete product
  wrap.querySelectorAll("button[data-cdel]").forEach(btn=>{
    btn.onclick = ()=>{
      const k = btn.getAttribute("data-cdel");
      if(!catalog[k]) return;
      if(!confirm(`¿Borrar del catálogo?\n${catalog[k].name}`)) return;
      pushUndo("catalog-delete");
      delete catalog[k];
      persistDebounced();
      renderCatalog();
    };
  });
}
function syncCatalogLight(){
  // sin alert ni pushUndo
  ["sp","sl","st"].forEach(code=>{
    (state.stores[code]||[]).forEach(r=>ensureCatalogEntry(r.e, inferUnit(r.e)));
  });
  PROVIDERS.forEach(p=>{
    (state.orders[p]||[]).forEach(it=>ensureCatalogEntry(it.name, it.unit || inferUnit(it.name)));
  });
}

/* ==========================
   Export/Import catálogo
========================== */
function exportCatalog(){
  const obj = {version:APP_VERSION, exportedAt: nowISO(), catalog};
  downloadJSON(obj, `catalogo_${todayISO()}.json`);
}
function importCatalogFile(file){
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const obj = JSON.parse(reader.result);
      if(!obj || typeof obj!=="object") throw new Error("Formato inválido");
      if(!obj.catalog) throw new Error("No hay catalog en el JSON");
      pushUndo("catalog-import");
      catalog = obj.catalog;
      persistDebounced();
      renderCatalog();
      alert("Catálogo importado.");
    }catch(e){
      alert("Error importando catálogo: " + e.message);
    }
  };
  reader.readAsText(file);
}

/* ==========================
   Normalizar nombres en proveedores
========================== */
function normalizeProviderNames(){
  pushUndo("prov-normalize");
  PROVIDERS.forEach(p=>{
    const list = state.orders[p]||[];
    list.forEach(it=>{
      const ac = autocorrectNameToVocab(it.name);
      it.name = ac.name;
      it.unit = it.unit || inferUnit(it.name);
      ensureCatalogEntry(it.name, it.unit);
    });
    state.orders[p] = mergeOrderList(list);
  });
  persistDebounced();
  renderProvidersPanels();
  renderCatalog();
  alert("Nombres normalizados con vocabulario.");
}
function clearEmptyProviders(){
  pushUndo("prov-clear-empty");
  const keep = [];
  for(const p of PROVIDERS){
    const list = state.orders[p]||[];
    if(list.length) keep.push(p);
  }
  // siempre mantener el activo y al menos 1
  if(!keep.includes(state.activeProvider) && state.activeProvider) keep.push(state.activeProvider);
  if(!keep.length) keep.push(defaultProviders[0]);

  PROVIDERS = keep;
  persistDebounced();
  buildProvBar();
  renderProvManage();
  renderProvidersPanels();
}

/* ==========================
   Calidad de datos (pill)
========================== */
function updateQualityFromStores(){
  let total=0, bad=0;
  ["sp","sl","st"].forEach(code=>{
    (state.stores[code]||[]).forEach(r=>{
      if(!r.e) return;
      total++;
      if(r.a) bad++;
      if((Number(r.q)||0) <= 0) bad++;
    });
  });
  if(!total){ setQuality("—", "muted"); return; }
  const ratio = bad/total;
  if(ratio===0) setQuality("OK", "ok");
  else if(ratio<0.25) setQuality("Revisar", "warn");
  else setQuality("Mala", "warn");
}

/* ==========================
   FAB
========================== */
function fabMenuToggle(forceHide){
  const m = byId("fabMenu");
  if(forceHide){ m.classList.remove("show"); return; }
  m.classList.toggle("show");
}
function fabMenuHide(){ fabMenuToggle(true); }

/* ==========================
   Escapes
========================== */
function escapeHTML(s){
  return String(s||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeAttr(s){
  return escapeHTML(s).replaceAll("\n"," ").replaceAll("\r"," ");
}

/* ==========================
   UI bind
========================== */
function hookUI(){
  // tabs
  byId("tabbar").querySelectorAll("button[data-tab]").forEach(btn=>{
    btn.onclick = ()=>showTab(btn.getAttribute("data-tab"));
  });

  // theme
  byId("btnTheme").onclick = toggleTheme;

  // vocab
  byId("btnSaveVocab").onclick = saveVocab;
  byId("btnAddWord").onclick = addNewWord;
  byId("btnResetAll").onclick = resetAll;

  // live vocab index while typing (mejora autocompletar al corregir)
  byId("vocabTxt").addEventListener("input", debounce(()=>{
    vocabList = uniqueVocab(toLines(byId("vocabTxt").value)).map(x=>removeDiacriticsUpper(x));
    rebuildVocabIndex();
  }, 220), {passive:true});

  // store buttons
  document.querySelectorAll("button[data-est]").forEach(b=>{
    b.onclick = ()=>estandarizarStore(b.getAttribute("data-est"));
  });
  document.querySelectorAll("button[data-save]").forEach(b=>{
    b.onclick = ()=>guardarTienda(b.getAttribute("data-save"));
  });
  document.querySelectorAll("button[data-txt]").forEach(b=>{
    b.onclick = ()=>exportarTiendaTXT(b.getAttribute("data-txt"));
  });
  document.querySelectorAll("button[data-wa]").forEach(b=>{
    b.onclick = ()=>enviarTiendaWhatsApp(b.getAttribute("data-wa"));
  });

  // global
  byId("btnUnify").onclick = ()=>unifyGlobal();
  byId("btnGlobalTXT").onclick = exportarGlobalTXT;
  byId("btnGlobalXLSX").onclick = exportarGlobalXLSX;
  byId("btnResumenTXT").onclick = exportResumenGlobalTXT;
  byId("btnCopyGlobal").onclick = copiarGlobal;

  // provider manage
  byId("btnProvAdd").onclick = addProvider;
  byId("btnProvReorder").onclick = reorderProviders;
  byId("btnEditProv").onclick = ()=>{ renderProvManage(); };
  byId("btnProvClearEmpty").onclick = clearEmptyProviders;
  byId("btnProvNormalize").onclick = normalizeProviderNames;

  // reparto
  byId("selRepartoTienda").onchange = renderRepartoTienda;
  byId("btnRepartoTXT").onclick = exportarRepartoTXT;
  byId("btnRepartoWA").onclick = enviarRepartoWhatsApp;

  // catálogo
  byId("btnCatalogSync").onclick = syncCatalogFromOrders;
  byId("btnCatalogExport").onclick = exportCatalog;
  byId("btnCatalogImport").onclick = ()=>byId("fileCatalogImport").click();
  byId("btnCatalogAdd").onclick = ()=>{
    const n = prompt("Nombre producto:");
    if(!n) return;
    pushUndo("catalog-add");
    const ac = autocorrectNameToVocab(n);
    ensureCatalogEntry(ac.name, inferUnit(ac.name));
    persistDebounced();
    renderCatalog();
  };
  byId("catalogSearch").addEventListener("input", debounce(()=>renderCatalog(), 150), {passive:true});
  byId("catalogFilter").onchange = ()=>renderCatalog();

  byId("fileCatalogImport").addEventListener("change", (e)=>{
    const f = e.target.files && e.target.files[0];
    if(f) importCatalogFile(f);
    e.target.value = "";
  });

  // backup/restore general
  byId("btnBackup").onclick = ()=>{
    const obj = makeBackupObject();
    downloadJSON(obj, `arslan_listas_backup_${todayISO()}.json`);
  };
  byId("btnRestore").onclick = ()=>byId("fileImport").click();
  byId("fileImport").addEventListener("change", (e)=>{
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const obj = JSON.parse(reader.result);
        if(!confirm("¿Importar backup? (Sobrescribe datos locales)")) return;
        restoreFromObject(obj);
      }catch(err){
        alert("Error importando backup: " + err.message);
      }
    };
    reader.readAsText(f);
    e.target.value="";
  });

  // undo
  byId("btnUndoTop").onclick = undo;

  // FAB
  byId("fab").onclick = ()=>fabMenuToggle();
  byId("fabUnify").onclick = ()=>{ unifyGlobal(); fabMenuHide(); };
  byId("fabTXT").onclick = ()=>{ exportarGlobalTXT(); fabMenuHide(); };
  byId("fabXLSX").onclick = ()=>{ exportarGlobalXLSX(); fabMenuHide(); };
  byId("fabCopy").onclick = ()=>{ copiarGlobal(); fabMenuHide(); };
  byId("fabResumen").onclick = ()=>{ exportResumenGlobalTXT(); fabMenuHide(); };

  document.addEventListener("click", (e)=>{
    const m = byId("fabMenu"), f = byId("fab");
    if(m.classList.contains("show") && !m.contains(e.target) && e.target!==f){
      m.classList.remove("show");
    }
  }, {capture:true});

  // autosave pill
  byId("autosavePill").onclick = ()=>{
    persistAll();
    alert("Guardado local realizado.");
  };
}

/* ==========================
   INIT
========================== */
(function init(){
  // theme
  const savedTheme = localStorage.getItem(LS.THEME) || ((window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light");
  applyTheme(savedTheme);

  loadAll();

  // asegurar active provider
  if(!state.activeProvider || !PROVIDERS.includes(state.activeProvider)) state.activeProvider = PROVIDERS[0];

  // render inicial
  hookUI();
  buildProvBar();
  renderStoresAll();
  unifyGlobal();
  renderProvidersPanels();
  renderProvManage();
  renderCatalog();

  // default tab
  showTab("dic");

  // quality initial
  updateQualityFromStores();

  // pequeñas mejoras de rendimiento: persist idle
  idle(()=>persistAll());
})();
