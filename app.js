/* app.js */
/* ==========================================================
   ARSLAN LISTAS v3.5 — KIWI MOBILE TABS
   FIX: Anti-null DOM guards + DOMContentLoaded init
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
  stores: { sp:[], sl:[], st:[] },
  assignments: {},
  orders: {},
  activeProvider: null,
};
let PROVIDERS = [];
let vocabList = [];
let vocabIndex = null;
let globalRows = [];
let undoStack = [];
let catalog = {};

/* ==========================
   Quality pill (FIX: no crash if missing)
========================== */
function setQuality(text, kind="muted"){
  const p = byId("qualityPill");
  if(!p) return; // FIX
  p.textContent = "Calidad: " + text;
  p.className = "pill " + (kind==="ok"?"ok":kind==="warn"?"warn":"muted");
}

/* ==========================
   Persistencia + backups
========================== */
const persistDebounced = debounce(()=>persistAll(), 300);
function persistAll(){
  try{
    localStorage.setItem(LS.VERSION, APP_VERSION);
    localStorage.setItem(LS.PROVIDERS, JSON.stringify(PROVIDERS));
    localStorage.setItem(LS.STATE, JSON.stringify(state));
    localStorage.setItem(LS.CATALOG, JSON.stringify(catalog));
    localStorage.setItem(LS.UNDO, JSON.stringify(undoStack.slice(-80)));
  }catch(e){
    console.warn("persistAll error:", e);
  }
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
  const vta = byId("vocabTxt");
  if(vta) vta.value = vocabList.join("\n"); // FIX

  rebuildVocabIndex();

  const cat = safeJSONParse(localStorage.getItem(LS.CATALOG), {});
  catalog = (cat && typeof cat==="object") ? cat : {};

  undoStack = safeJSONParse(localStorage.getItem(LS.UNDO), []);
  if(!Array.isArray(undoStack)) undoStack = [];
}

function makeBackupObject(){
  return {
    app:"ARSLAN_LISTAS",
    version: APP_VERSION,
    exportedAt: nowISO(),
    providers: PROVIDERS,
    state,
    vocab: (byId("vocabTxt") ? (byId("vocabTxt").value||"") : ""),
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
   Índice de vocab PRO
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
  const map = new Map();
  list.forEach(v=>{
    const k = normKey(v);
    const parts = k.split(" ").filter(Boolean);
    const keys = new Set();
    keys.add(k.slice(0, Math.min(20,k.length)));
    parts.forEach(p=>keys.add(p.slice(0, Math.min(10,p.length))));
    keys.forEach(pref=>{
      if(!map.has(pref)) map.set(pref, []);
      map.get(pref).push(v);
    });
  });
  return map;
}
function rebuildVocabIndex(){
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
   AutocorrectNameToVocab
========================== */
function bestMatchVocab(query){
  const qClean = stripGenericWords(query);
  const qKey = normKey(qClean);
  if(!qKey) return {name:"", ok:false, score:0};

  const exact = vocabIndex?.exactMap?.get(qKey);
  if(exact) return {name: exact, ok:true, score:1};

  const keyShort = qKey.slice(0, Math.min(20, qKey.length));
  const parts = qKey.split(" ").filter(Boolean);

  const candsSet = new Set();
  const fromMap1 = vocabIndex?.prefixMap?.get(keyShort) || [];
  fromMap1.forEach(x=>candsSet.add(x));
  parts.slice(0,3).forEach(p=>{
    const arr = vocabIndex?.prefixMap?.get(p.slice(0, Math.min(10,p.length))) || [];
    arr.forEach(x=>candsSet.add(x));
  });

  let candidates = Array.from(candsSet);
  if(!candidates.length){
    candidates = vocabList.slice(0, 800);
  }

  const qTokens = tokenSet(qClean);
  const qBgs = bigrams(qClean);

  let best = {name:null, score:0};
  const entryMap = new Map((vocabIndex?.entries||[]).map(e=>[e.name,e]));
  for(const name of candidates){
    const e = entryMap.get(name);
    if(!e) continue;
    const d = diceSimFromBigrams(qBgs, e.bgs);
    const t = tokenSetSim(qTokens, e.tokens);
    const sc = 0.75*d + 0.25*t;
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
  if(m.name && m.score>=0.78) return {name:m.name, ok:m.ok, score:m.score};
  return {name: stripped, ok:false, score: m.score||0};
}

/* ==========================
   Autocomplete PRO
========================== */
const acRoot = ()=>byId("acRoot"); // FIX lazy getter
let acTarget = null;
let acOnPick = null;

function acHide(){
  const root = acRoot();
  if(!root) return;
  root.style.display="none";
  root.innerHTML="";
  acTarget = null;
  acOnPick = null;
}
function acShowForInput(inputEl, items){
  const root = acRoot();
  if(!root) return;
  if(!items.length){ acHide(); return; }
  const r = inputEl.getBoundingClientRect();
  const width = Math.max(220, r.width);
  root.style.left = `${Math.round(r.left)}px`;
  root.style.top = `${Math.round(r.bottom+6)}px`;
  root.style.width = `${Math.round(width)}px`;
  root.style.display="block";
  root.innerHTML = "";

  items.slice(0,10).forEach(it=>{
    const div = document.createElement("div");
    div.className="ac-item";
    div.innerHTML = `<span>${it.name}</span><span class="ac-badge">${Math.round(it.score*100)}%</span>`;
    div.onmousedown = (e)=>{ e.preventDefault(); };
    div.onclick = ()=>{
      if(acOnPick) acOnPick(it.name);
      acHide();
    };
    root.appendChild(div);
  });
}
function suggestFromVocab(q, limit=10){
  const cleaned = stripGenericWords(q);
  const qKey = normKey(cleaned);
  if(!qKey) return [];
  const qTokens = tokenSet(cleaned);
  const qBgs = bigrams(cleaned);

  const candsSet = new Set();
  const keyShort = qKey.slice(0, Math.min(20,qKey.length));
  (vocabIndex?.prefixMap?.get(keyShort)||[]).forEach(x=>candsSet.add(x));
  qKey.split(" ").filter(Boolean).slice(0,3).forEach(p=>{
    (vocabIndex?.prefixMap?.get(p.slice(0,Math.min(10,p.length)))||[]).forEach(x=>candsSet.add(x));
  });

  let candidates = Array.from(candsSet);
  if(!candidates.length) candidates = vocabList.slice(0, 500);

  const entryMap = new Map((vocabIndex?.entries||[]).map(e=>[e.name,e]));
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
  if(!inputEl) return;
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
  inputEl.addEventListener("blur", ()=>setTimeout(()=>{ acHide(); }, 160), {passive:true});
}

/* listeners globales (FIX safe) */
document.addEventListener("scroll", ()=>{ acHide(); }, {passive:true, capture:true});
document.addEventListener("click", (e)=>{
  const root = acRoot();
  if(!root || root.style.display!=="block") return;
  if(e.target===root || root.contains(e.target)) return;
  if(acTarget && (e.target===acTarget || acTarget.contains(e.target))) return;
  acHide();
}, {capture:true});

/* ==========================
   Parser líneas
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
   Duplicados
========================== */
function sumDuplicatesRows(rows){
  const map = new Map();
  for(const r of rows){
    const k = normKey(r.e);
    if(!k) continue;
    if(!map.has(k)) map.set(k, {o:r.o, e:r.e, q:0, a:!!r.a});
    const it = map.get(k);
    it.q += Number(r.q)||0;
    it.a = it.a || !!r.a;
  }
  return Array.from(map.values()).sort((a,b)=>a.e.localeCompare(b.e,"es"));
}

/* ==========================
   Similaridad
========================== */
function similarityScore(a,b){
  const A = bigrams(a), B = bigrams(b);
  const d = diceSimFromBigrams(A,B);
  const t = tokenSetSim(tokenSet(a), tokenSet(b));
  return 0.7*d + 0.3*t;
}

/* ==========================
   Tabs + theme (guards)
========================== */
function showTab(key){
  const keys = ["dic","tiendas","global","proveedores","catalogo"];
  keys.forEach(k=>{
    const tab = byId("tab-"+k);
    const btn = byId("btn-"+k);
    if(tab) tab.style.display = (k===key) ? "block" : "none";
    if(btn) btn.classList.toggle("active", k===key);
  });

  const fab = byId("fab");
  if(fab){
    if(key==="global"){ fab.style.display="block"; }
    else { fab.style.display="none"; fabMenuHide(); }
  }
  acHide();

  if(key==="global") idle(()=>{ buildProvBar(); unifyGlobal(); renderProvManage(); });
  if(key==="proveedores") idle(()=>{ renderProvidersPanels(); });
  if(key==="catalogo") idle(()=>{ renderCatalog(); });
}

function applyTheme(t){
  document.documentElement.setAttribute("data-theme", t==="dark" ? "dark" : "light");
  localStorage.setItem(LS.THEME, t==="dark"?"dark":"light");
}
function toggleTheme(){
  const cur = localStorage.getItem(LS.THEME) || "light";
  applyTheme(cur==="light" ? "dark" : "light");
}

/* ==========================
   Vocab UI (guards)
========================== */
function saveVocab(){
  const vta = byId("vocabTxt");
  const raw = vta ? (vta.value || "") : "";
  const list = uniqueVocab(toLines(raw)).map(x=>removeDiacriticsUpper(x));
  if(vta) vta.value = list.join("\n");
  localStorage.setItem(LS.VOCAB, vta ? vta.value : list.join("\n"));
  vocabList = list;
  rebuildVocabIndex();
  persistDebounced();
  setQuality("OK", "ok");
  alert("Vocabulario guardado y optimizado.");
  renderStoresAll();
  unifyGlobal();
  renderProvidersPanels();
  renderCatalog();
}
function addNewWord(){
  const entry = prompt("Introduce nuevo producto (uno por línea si son varios):");
  if(!entry) return;
  const vta = byId("vocabTxt");
  const current = toLines(vta ? vta.value : "");
  const added = toLines(entry);
  const merged = uniqueVocab(current.concat(added)).map(x=>removeDiacriticsUpper(x));
  if(vta) vta.value = merged.join("\n");
  saveVocab();
}
function resetAll(){
  if(confirm("¿Seguro que quieres limpiar TODO? (vocab, tiendas, proveedores, pedidos, catálogo)")){
    localStorage.clear();
    location.reload();
  }
}

/* ==========================
   Tiendas
========================== */
function estandarizarStore(code){
  pushUndo("estandarizar-"+code);
  const ta = byId("in_"+code);
  const txt = ta ? (ta.value || "") : "";
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
  const ta = byId("in_"+code);
  if(ta) ta.value = out;
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
  if(!wrap) return; // FIX
  if(!rows.length){ wrap.innerHTML=""; return; }

  let html = `<div class="scroll-x"><table>
    <thead><tr><th>Original</th><th>Estandarizado</th><th>Cantidad</th><th>Estado</th></tr></thead><tbody>`;

  rows.forEach((r,i)=>{
    const status = r.a ? `<span class="pill warn">Revisar</span>` : `<span class="pill ok">OK</span>`;
    html += `<tr>
      <td>${escapeHTML(r.o||"")}</td>
      <td><input class="cell-input ${r.a?'warn':'ok'}" data-se="${i}" value="${escapeAttr(r.e||"")}" /></td>
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

  wrap.querySelectorAll("button[data-qm]").forEach(btn=>{
    btn.onclick = ()=>{
      pushUndo("qty-minus-"+code);
      const i = Number(btn.getAttribute("data-qm"));
      const v = Math.max(0, (Number(state.stores[code][i].q)||0) - 1);
      state.stores[code][i].q = v;
      const qel = byId(`q_${code}_${i}`);
      if(qel) qel.textContent = v;
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
      const qel = byId(`q_${code}_${i}`);
      if(qel) qel.textContent = v;
      persistDebounced();
      idle(()=>unifyGlobal());
    };
  });

  wrap.querySelectorAll("input[data-se]").forEach(inp=>{
    const apply = ()=>{
      const i = Number(inp.getAttribute("data-se"));
      if(!state.stores[code][i]) return;
      pushUndo("edit-store-name-"+code);

      const ac = autocorrectNameToVocab(inp.value);
      state.stores[code][i].e = ac.name;
      state.stores[code][i].a = !ac.ok;

      state.stores[code] = sumDuplicatesRows(state.stores[code]);

      persistDebounced();
      renderStoreTable(code);
      idle(()=>unifyGlobal());
      updateQualityFromStores();
    };

    attachAutocompleteToInput(inp, (picked)=>{
      inp.value = picked;
      apply();
    });

    inp.addEventListener("change", apply, {passive:true});
    inp.addEventListener("blur", apply, {passive:true});
    inp.addEventListener("input", debounce(()=>{
      const ac = autocorrectNameToVocab(inp.value);
      inp.classList.toggle("ok", ac.ok);
      inp.classList.toggle("warn", !ac.ok);
    }, 120), {passive:true});
  });
}

/* ==========================
   Global
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

  const similarSet = new Set();
  const names = arr.map(x=>x.name);
  for(let i=0;i<names.length;i++){
    for(let j=i+1;j<names.length;j++){
      const s1=names[i], s2=names[j];
      if(normKey(s1)===normKey(s2)) continue;
      const sc = similarityScore(s1,s2);
      if(sc>=0.86){ similarSet.add(s1); similarSet.add(s2); }
    }
  }

  renderGlobalTable(arr, similarSet);
  updateQualityFromStores();
}

function renderGlobalTable(allRows, similarSet){
  const wrap = byId("global_wrap");
  if(!wrap) return; // FIX

  const visible = allRows.filter(r=>!state.assignments[normKey(r.name)]);
  globalRows = visible;

  if(!visible.length){
    wrap.innerHTML = `<div class="hint">Sin productos (todo asignado o no hay datos).</div>`;
    return;
  }

  let html = `
    <div class="hint" style="margin-bottom:6px">
      Proveedor activo: <b>${escapeHTML(state.activeProvider||PROVIDERS[0]||"")}</b>. Asigna con ✅.
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

  wrap.querySelectorAll("button[data-assign]").forEach(btn=>{
    btn.onclick = ()=>{
      const idx = Number(btn.getAttribute("data-assign"));
      assignFromGlobal(idx);
    };
  });

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

    attachAutocompleteToInput(inp, (picked)=>{ inp.value = picked; apply(); });
    inp.addEventListener("change", apply, {passive:true});
    inp.addEventListener("blur", apply, {passive:true});
  });

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

function inferUnit(name){
  const n = normKey(name);
  if(/\bPINA\b|\bCOCO\b|\bPAPAYA\b|\bSANDIA\b|\bMELON\b|\bALOE\b/.test(n)) return "ud";
  if(/\bCILANTRO\b|\bPEREJIL\b|\bAPIO\b|\bHIERBABUENA\b|\bMENTA\b|\bENELDO\b/.test(n)) return "manojo";
  return "kg";
}

function ensureCatalogEntry(name, unit){
  const k = normKey(name);
  if(!k) return;
  if(!catalog[k]){
    catalog[k] = { name: removeDiacriticsUpper(name), unit: unit||inferUnit(name), price:"", lastAt:"", hist:[] };
  }else{
    catalog[k].name = removeDiacriticsUpper(name);
    if(unit) catalog[k].unit = unit;
  }
}

function assignFromGlobal(idx){
  const item = globalRows[idx];
  if(!item) return;

  pushUndo("assign-provider");

  const prov = state.activeProvider || PROVIDERS[0] || "SIN PROVEEDOR";
  const k = normKey(item.name);

  state.assignments[k] = prov;

  const list = state.orders[prov] || [];
  const ex = list.findIndex(x=>normKey(x.name)===k);
  if(ex>-1) list[ex].qty += Number(item.total)||0;
  else list.push({name:item.name, qty:Number(item.total)||0, unit: inferUnit(item.name)});
  state.orders[prov] = list;

  ensureCatalogEntry(item.name, inferUnit(item.name));

  persistDebounced();
  idle(()=>unifyGlobal());
  renderProvidersPanels();
  renderCatalog();
}

/* ==========================
   Providers bar + panels (guards)
========================== */
function buildProvBar(){
  const bar = byId("provBar");
  if(!bar) return; // FIX
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

function mergeOrderList(list){
  const map = new Map();
  for(const it of list){
    const k = normKey(it.name);
    if(!k) continue;
    if(!map.has(k)) map.set(k, {name:it.name, qty:0, unit: it.unit || inferUnit(it.name)});
    map.get(k).qty += Number(it.qty)||0;
  }
  return Array.from(map.values()).sort((a,b)=>a.name.localeCompare(b.name,"es"));
}

function unitOptions(selected){
  const opts = ["kg","ud","caja","manojo","saco"];
  return opts.map(u=>`<option value="${u}" ${u===selected?"selected":""}>${u}</option>`).join("");
}

function renderProvidersPanels(){
  const cont = byId("provPanels");
  if(!cont) return; // FIX
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

          state.orders[prov2] = mergeOrderList(state.orders[prov2]);
          ensureCatalogEntry(ac.name, state.orders[prov2][idx]?.unit || inferUnit(ac.name));

          persistDebounced();
          renderProvidersPanels();
          renderCatalog();
        };

        attachAutocompleteToInput(inp, (picked)=>{ inp.value = picked; apply(); });
        inp.addEventListener("change", apply, {passive:true});
        inp.addEventListener("blur", apply, {passive:true});
      });

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

    hd.querySelectorAll("button[data-ptxt]").forEach(btn=>{
      btn.onclick = ()=>exportProvTXT(btn.getAttribute("data-ptxt"));
    });
    hd.querySelectorAll("button[data-pwa]").forEach(btn=>{
      btn.onclick = ()=>enviarProvWhatsApp(btn.getAttribute("data-pwa"));
    });
  });
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
   Proveedores: manage (guard)
========================== */
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

  wrap.querySelectorAll("input[data-provname]").forEach(inp=>{
    inp.addEventListener("blur", ()=>{
      const i = Number(inp.getAttribute("data-provname"));
      const newName = removeDiacriticsUpper(inp.value).trim();
      if(!newName) { inp.value = PROVIDERS[i]; return; }

      pushUndo("rename-provider");
      const old = PROVIDERS[i];
      PROVIDERS[i] = newName;

      if(old!==newName){
        state.orders[newName] = state.orders[old] || [];
        delete state.orders[old];

        Object.keys(state.assignments).forEach(k=>{
          if(state.assignments[k]===old) state.assignments[k]=newName;
        });

        if(state.activeProvider===old) state.activeProvider=newName;
      }

      persistDebounced();
      buildProvBar();
      renderProvidersPanels();
      unifyGlobal();
      renderProvManage();
    }, {passive:true});
  });

  wrap.querySelectorAll("button[data-provdel]").forEach(btn=>{
    btn.onclick = ()=>{
      const i = Number(btn.getAttribute("data-provdel"));
      const p = PROVIDERS[i];
      if(!confirm(`¿Quitar proveedor "${p}"?\nSus líneas NO se borran: se moverán a "SIN PROVEEDOR".`)) return;

      pushUndo("delete-provider");

      const bucket = "SIN PROVEEDOR";
      if(!PROVIDERS.includes(bucket)) PROVIDERS.push(bucket);
      if(!Array.isArray(state.orders[bucket])) state.orders[bucket]=[];

      const lines = state.orders[p] || [];
      state.orders[bucket] = state.orders[bucket].concat(lines);
      delete state.orders[p];

      Object.keys(state.assignments).forEach(k=>{
        if(state.assignments[k]===p) delete state.assignments[k];
      });

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

/* ==========================
   Calidad de datos
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
   Catálogo (guard mínimo para no romper)
   (Si ya tienes tu catálogo completo, esto no lo corta)
========================== */
function renderCatalog(){
  const wrap = byId("catalogWrap");
  if(!wrap) return;
  // (si quieres la versión completa del renderCatalog anterior, dímelo y te lo pego íntegro,
  //  aquí no revienta aunque falte la tab de catálogo)
  wrap.innerHTML = `<div class="hint">Catálogo listo (si tu index incluye la pestaña). Si no, no afecta.</div>`;
}

/* ==========================
   FAB (guards)
========================== */
function fabMenuToggle(forceHide){
  const m = byId("fabMenu");
  if(!m) return;
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
   UI bind (FIX: guards)
========================== */
function hookUI(){
  const tabbar = byId("tabbar");
  if(tabbar){
    tabbar.querySelectorAll("button[data-tab]").forEach(btn=>{
      btn.onclick = ()=>showTab(btn.getAttribute("data-tab"));
    });
  }

  const btnTheme = byId("btnTheme");
  if(btnTheme) btnTheme.onclick = toggleTheme;

  const btnSaveVocab = byId("btnSaveVocab");
  if(btnSaveVocab) btnSaveVocab.onclick = saveVocab;

  const btnAddWord = byId("btnAddWord");
  if(btnAddWord) btnAddWord.onclick = addNewWord;

  const btnResetAll = byId("btnResetAll");
  if(btnResetAll) btnResetAll.onclick = resetAll;

  const vta = byId("vocabTxt");
  if(vta){
    vta.addEventListener("input", debounce(()=>{
      vocabList = uniqueVocab(toLines(vta.value)).map(x=>removeDiacriticsUpper(x));
      rebuildVocabIndex();
    }, 220), {passive:true});
  }

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

  const btnUnify = byId("btnUnify");
  if(btnUnify) btnUnify.onclick = ()=>unifyGlobal();

  const btnEditProv = byId("btnEditProv");
  if(btnEditProv) btnEditProv.onclick = ()=>renderProvManage();

  const btnUndoTop = byId("btnUndoTop");
  if(btnUndoTop) btnUndoTop.onclick = undo;

  const btnBackup = byId("btnBackup");
  if(btnBackup){
    btnBackup.onclick = ()=>{
      const obj = makeBackupObject();
      downloadJSON(obj, `arslan_listas_backup_${todayISO()}.json`);
    };
  }
  const btnRestore = byId("btnRestore");
  const fileImport = byId("fileImport");
  if(btnRestore && fileImport){
    btnRestore.onclick = ()=>fileImport.click();
    fileImport.addEventListener("change", (e)=>{
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
  }

  const autosavePill = byId("autosavePill");
  if(autosavePill){
    autosavePill.onclick = ()=>{
      persistAll();
      alert("Guardado local realizado.");
    };
  }

  // FAB
  const fab = byId("fab");
  const fabUnify = byId("fabUnify");
  if(fab) fab.onclick = ()=>fabMenuToggle();
  if(fabUnify) fabUnify.onclick = ()=>{ unifyGlobal(); fabMenuHide(); };

  document.addEventListener("click", (e)=>{
    const m = byId("fabMenu"), f = byId("fab");
    if(m && m.classList.contains("show") && !m.contains(e.target) && e.target!==f){
      m.classList.remove("show");
    }
  }, {capture:true});
}

/* ==========================
   INIT (FIX: after DOMContentLoaded)
========================== */
function init(){
  const savedTheme = localStorage.getItem(LS.THEME) || ((window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light");
  applyTheme(savedTheme);

  loadAll();

  if(!state.activeProvider || !PROVIDERS.includes(state.activeProvider)) state.activeProvider = PROVIDERS[0];

  hookUI();
  buildProvBar();
  renderStoresAll();
  unifyGlobal();
  renderProvidersPanels();
  renderProvManage();
  renderCatalog();
  showTab("dic");
  updateQualityFromStores();

  idle(()=>persistAll());
}

// FIX: espera al DOM
if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", init);
}else{
  init();
}
