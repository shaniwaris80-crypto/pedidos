/* =========================
   app.js
   ARSLAN LISTAS v3.5 — KIWI PRO
   - Catálogo + historial precios
   - Proveedores dinámicos
   - Cantidades inteligentes
   - Auto-estandarizar al pegar
   - Undo/Redo global + undo asignación proveedor (toast)
   - Duplicados (sinónimos + similitud) + panel conflictos
   - Seguridad: backups + export/import JSON
========================= */

/* ==========================
   Helpers base
========================== */
const byId = (id)=>document.getElementById(id);
const toLines = (t)=>String(t||'').split(/[\n\r]/).map(x=>x.trim()).filter(Boolean);
const idle = (cb)=> (window.requestIdleCallback ? requestIdleCallback(cb) : setTimeout(cb,1));
function debounce(fn, wait=300){ let t=null; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), wait); }; }

function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t==='dark'?'dark':'light');
  localStorage.setItem('arslan_theme', t);
}
function toggleTheme(){
  const cur = localStorage.getItem('arslan_theme') || 'light';
  applyTheme(cur==='light'?'dark':'light');
}

function removeDiacriticsUpper(s){
  return String(s||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/ñ/g,'N').replace(/Ñ/g,'N')
    .toUpperCase();
}
function normKey(s){
  return removeDiacriticsUpper(s)
    .replace(/[^A-Z0-9\s]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

/* ==========================
   Storage keys (v3.5)
========================== */
const LS = {
  THEME:'arslan_theme',
  VOCAB:'arslan_v35_vocab',
  SYN:'arslan_v35_synonyms',
  STORES:'arslan_v35_stores',
  ASSIGN:'arslan_v35_assign',
  ORDERS:'arslan_v35_orders',
  PROV:'arslan_v35_providers',
  CATALOG:'arslan_v35_catalog',
  BACKUPS:'arslan_v35_backups',
  HISTORY:'arslan_v35_history'
};

/* ==========================
   Providers (dinámicos)
========================== */
let providers = []; // [{name, phone}]
function defaultProviders(){
  return [
    {name:"ESMO", phone:""},
    {name:"MONTENEGRO", phone:""},
    {name:"ÁNGEL VACA", phone:""},
    {name:"JOSÉ ANTONIO", phone:""},
    {name:"JAVI", phone:""},
    {name:"ANGELO", phone:""}
  ];
}
function loadProviders(){
  try{
    const p = JSON.parse(localStorage.getItem(LS.PROV)||'null');
    providers = Array.isArray(p) && p.length ? p : defaultProviders();
  }catch{ providers = defaultProviders(); }
}
function saveProviders(){
  providers = providers
    .map(x=>({name: removeDiacriticsUpper(x.name||'').trim(), phone: String(x.phone||'').trim()}))
    .filter(x=>x.name);
  localStorage.setItem(LS.PROV, JSON.stringify(providers));
  ensureOrdersProviderKeys();
  buildProvBar();
  renderProvidersPanels();
  renderProviderFilters();
  renderProvQuickList();
  toast("Proveedores guardados.");
}

/* ==========================
   Vocabulario + cache
========================== */
const IGNORE_WORDS = ['caja','cajas','kg','kilo','kilos','uds','ud','u','unidad','unidades','manojo','manojos','saco','sacos'];
function stripGenericWords(s){
  const tokens = normKey(s).split(' ').filter(t=>!IGNORE_WORDS.includes(String(t||'').toLowerCase()));
  return tokens.join(' ').trim();
}
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

let VOCAB_CACHE=null, VOCAB_SIG=null;
function getVocabFromTextarea(){
  const raw = byId('vocabTxt').value || '';
  const sig = raw.length + '|' + raw.slice(0,80) + '|' + raw.slice(-80);
  if(VOCAB_CACHE && VOCAB_SIG===sig) return VOCAB_CACHE;
  VOCAB_CACHE = uniqueVocab(toLines(raw));
  VOCAB_SIG = sig;
  return VOCAB_CACHE;
}

/* ==========================
   Sinónimos (alias => canon)
========================== */
let synonyms = {}; // { normKey(alias): CANONICAL_NAME_UPPER }
function parseSynonyms(text){
  const out = {};
  toLines(text).forEach(line=>{
    const s = line.trim();
    if(!s) return;
    const m = s.split('=');
    if(m.length<2) return;
    const left = removeDiacriticsUpper(m[0]).trim();
    const right = removeDiacriticsUpper(m.slice(1).join('=')).
      replace(/\s+/g,' ').trim();
    if(!left || !right) return;
    out[normKey(left)] = right;
  });
  return out;
}
function applySynonym(nameUpper){
  const k = normKey(nameUpper);
  return synonyms[k] ? synonyms[k] : nameUpper;
}
function loadSynonyms(){
  const saved = localStorage.getItem(LS.SYN) || '';
  byId('synTxt').value = saved;
  synonyms = parseSynonyms(saved);
}
function saveSynonyms(){
  localStorage.setItem(LS.SYN, byId('synTxt').value||'');
  synonyms = parseSynonyms(byId('synTxt').value||'');
  toast("Equivalencias guardadas.");
  idle(()=>unificarGlobal(true));
}
function addSynonym(){
  const entry = prompt("Añade equivalencia: ALIAS = CANÓNICO");
  if(!entry) return;
  const cur = byId('synTxt').value || '';
  byId('synTxt').value = (cur.trim()? (cur.trim()+'\n'):'') + entry;
  saveSynonyms();
}

/* ==========================
   OFFICIAL VOCAB (tu lista)
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
   Load/Save vocab
========================== */
function loadVocab(){
  function loadVocab(){
  const saved = localStorage.getItem(LS.VOCAB) || '';
  // ✅ SIEMPRE unir OFFICIAL + SAVED (por si saved quedó incompleto)
  const merged = uniqueVocab(
    toLines(OFFICIAL_VOCAB_RAW).concat(toLines(saved))
  );
  byId('vocabTxt').value = merged.join('\n');

  // cache
  VOCAB_CACHE = merged;
  VOCAB_CACHE_SIG = (byId('vocabTxt').value||'').length + '|merged';
  return merged;
}

  const list = uniqueVocab(toLines(base));
  byId('vocabTxt').value = list.join('\n');
  VOCAB_CACHE = list; VOCAB_SIG = (byId('vocabTxt').value||'').length + '|seed';
  return list;
}
function saveVocab(){
  localStorage.setItem(LS.VOCAB, byId('vocabTxt').value||'');
  VOCAB_CACHE=null; VOCAB_SIG=null;
  toast("Vocabulario guardado.");
  idle(()=>{ renderProvidersPanels(); unificarGlobal(true); });
}
function addNewWord(){
  const entry = prompt("Introduce nuevo producto (uno por línea si son varios):");
  if(!entry) return;
  const current = toLines(byId('vocabTxt').value);
  const merged = uniqueVocab(current.concat(toLines(entry)));
  byId('vocabTxt').value = merged.join('\n');
  saveVocab();
}

/* ==========================
   Similaridad (para “probables”)
========================== */
function bigrams(str){
  const s = stripGenericWords(str);
  const arr=[]; for(let i=0;i<s.length-1;i++){ if(s[i]!==' '&&s[i+1]!==' ') arr.push(s.slice(i,i+2)); }
  return arr;
}
function diceSim(a,b){
  const A=bigrams(a), B=bigrams(b);
  if(!A.length||!B.length) return 0;
  let hits=0; const pool=B.slice();
  A.forEach(bg=>{const idx=pool.indexOf(bg); if(idx>-1){hits++; pool.splice(idx,1);} });
  return (2*hits)/(A.length+B.length);
}
function tokenSetSim(a,b){
  const A=new Set(stripGenericWords(a).split(' ').filter(Boolean));
  const B=new Set(stripGenericWords(b).split(' ').filter(Boolean));
  if(!A.size||!B.size) return 0;
  let inter=0; A.forEach(x=>{ if(B.has(x)) inter++; });
  return inter / Math.max(A.size,B.size);
}
function similarityScore(a,b){ return 0.7*diceSim(a,b) + 0.3*tokenSetSim(a,b); }
function bestMatch(query, vocabArr){
  const q = stripGenericWords(query);
  let best = {name:null, score:0};
  vocabArr.forEach(v=>{
    const sc = similarityScore(q, v);
    if(sc>best.score) best = {name:v, score:sc};
  });
  return best;
}

/* ==========================
   Cantidades inteligentes (parser)
========================== */
const MATCH_THRESHOLD = 0.78;

function parseFraction(x){
  const m = String(x).match(/^(\d+)\s*\/\s*(\d+)$/);
  if(!m) return null;
  const a = Number(m[1]), b = Number(m[2]);
  if(!b) return null;
  return a/b;
}

function detectUnit(raw){
  const s = String(raw||'').toLowerCase();
  if(/\bmanojo(s)?\b/.test(s)) return 'manojo';
  if(/\b(saco|sacos)\b/.test(s)) return 'saco';
  if(/\b(caja|cajas)\b/.test(s)) return 'caja';
  if(/\b(kg|kgs|kilo|kilos)\b/.test(s)) return 'kg';
  if(/\b(ud|uds|unidad|unidades|u)\b/.test(s)) return 'ud';
  return ''; // desconocida
}

// Soporta: "3x2", "3 x 2", "2,5kg", "1/2", "x4", "4" al final o al inicio
function parseLineSmart(raw){
  if(!raw) return null;
  let s = String(raw).replace(/\t/g,' ').replace(/\s{2,}/g,' ').trim();
  s = s.replace(/^[-•*]\s*/,'');
  const unit = detectUnit(s);

  // 3x2 (multiplicación)
  const mMult = s.match(/\b(\d+[\.,]?\d*)\s*[xX\*]\s*(\d+[\.,]?\d*)\b/);
  let qty = null;

  if(mMult){
    const a = Number(mMult[1].replace(',','.'));
    const b = Number(mMult[2].replace(',','.'));
    qty = (isNaN(a)||isNaN(b)) ? null : a*b;
    s = s.replace(mMult[0],' ').replace(/\s+/g,' ').trim();
  }

  // x4
  if(qty===null){
    const mX = s.match(/(?:^|\s)(?:x|X|\*)\s*(\d+[\.,]?\d*)\b/);
    if(mX){
      qty = Number(mX[1].replace(',','.'));
      s = s.replace(mX[0],' ').replace(/\s+/g,' ').trim();
    }
  }

  // 2,5kg pegado
  if(qty===null){
    const m = s.match(/\b(\d+[\.,]?\d*)(?=\s*(kg|kgs|kilo|kilos|caja|cajas|manojo|manojos|ud|uds|unidad|unidades|u)\b)/i);
    if(m){
      qty = Number(m[1].replace(',','.'));
      s = s.replace(m[1],' ').replace(/\s+/g,' ').trim();
    }
  }

  // Fracción al inicio "1/2 TOMATE"
  if(qty===null){
    const mF = s.match(/^\s*(\d+\s*\/\s*\d+)\s+(.*)$/);
    if(mF){
      const f = parseFraction(mF[1]);
      if(f!==null){
        qty = f;
        s = mF[2].trim();
      }
    }
  }

  // número al final
  if(qty===null){
    const mEnd = s.match(/(\d+[\.,]?\d*)\s*(?:kg|kgs|kilo|kilos|uds|ud|u|unidad|unidades|caja|cajas|manojo|manojos|saco|sacos)?\s*$/i);
    if(mEnd){
      qty = Number(mEnd[1].replace(',','.'));
      s = s.slice(0, mEnd.index).trim();
    }
  }

  // número al inicio
  if(qty===null){
    const mStart = s.match(/^\s*(\d+[\.,]?\d*)\s+(.*)$/);
    if(mStart){
      qty = Number(mStart[1].replace(',','.'));
      s = mStart[2].trim();
    }
  }

  if(qty===null || isNaN(qty)) qty = 1;

  // limpiar palabras genéricas para nombre
  let name = stripGenericWords(s);
  name = applySynonym(removeDiacriticsUpper(name));

  return {
    original: removeDiacriticsUpper(String(raw).trim()),
    name,
    qty,
    unit: unit || '' // puede ir vacío
  };
}

/* ==========================
   Estado principal
========================== */
const tiendaState = { sp:[], sl:[], st:[] }; // [{o,e,q,a,u}]
let assignments = {}; // { normKey(prod) : provName }
let orders = {};      // { provName: [{name, qty}] }
let ACTIVE_PROV = "ESMO";
let globalRows = [];  // visible (sin asignar)
let lastUnifiedRows = [];
let lastSimilarSet = new Set();

let activeStore = 'sp';
let mobileOneStore = true;

/* ==========================
   Catalog (precios + historial)
========================== */
let catalog = {}; 
// { normKey(name): { name, unit, preferredProv, price, history:[{dateISO, price, prov, note}] } }

function ensureOrdersProviderKeys(){
  providers.forEach(p=>{ if(!Array.isArray(orders[p.name])) orders[p.name]=[]; });
  // limpiar providers antiguos no existentes (pero sin borrar datos si vuelven)
}

function loadState(){
  try{
    const s = JSON.parse(localStorage.getItem(LS.STORES)||'{}');
    ['sp','sl','st'].forEach(k=>{ if(Array.isArray(s[k])) tiendaState[k]=s[k]; });
  }catch{}
  try{
    const a = JSON.parse(localStorage.getItem(LS.ASSIGN)||'{}');
    assignments = a||{};
  }catch{ assignments = {}; }
  try{
    const o = JSON.parse(localStorage.getItem(LS.ORDERS)||'{}');
    orders = o||{};
  }catch{ orders = {}; }
  ensureOrdersProviderKeys();

  try{
    const c = JSON.parse(localStorage.getItem(LS.CATALOG)||'{}');
    catalog = c||{};
  }catch{ catalog = {}; }
}

const persistState = debounce(()=>{
  localStorage.setItem(LS.STORES, JSON.stringify(tiendaState));
  localStorage.setItem(LS.ASSIGN, JSON.stringify(assignments));
  localStorage.setItem(LS.ORDERS, JSON.stringify(orders));
  localStorage.setItem(LS.CATALOG, JSON.stringify(catalog));
}, 250);

/* ==========================
   Backups (últimos 7)
========================== */
function snapshotAll(){
  return {
    ts: Date.now(),
    stores: tiendaState,
    assign: assignments,
    orders,
    providers,
    catalog,
    vocab: byId('vocabTxt')?.value || '',
    syn: byId('synTxt')?.value || ''
  };
}
function pushBackup(obj){
  let list = [];
  try{ list = JSON.parse(localStorage.getItem(LS.BACKUPS)||'[]')||[]; }catch{ list=[]; }
  list.unshift(obj);
  list = list.slice(0,7);
  localStorage.setItem(LS.BACKUPS, JSON.stringify(list));
}
function makeBackupNow(){
  pushBackup(snapshotAll());
  toast("Backup creado.");
}
function openBackups(){
  const el = byId('backupList');
  let list = [];
  try{ list = JSON.parse(localStorage.getItem(LS.BACKUPS)||'[]')||[]; }catch{ list=[]; }
  if(!list.length){
    el.innerHTML = `<div class="hint">No hay backups aún.</div>`;
    return;
  }
  el.innerHTML = list.map((b,ix)=>{
    const d = new Date(b.ts);
    const label = d.toLocaleString();
    return `
      <div class="prov-row">
        <div><strong>Backup ${ix+1}</strong><div class="hint">${label}</div></div>
        <div class="hint">stores/assign/orders/catalog/providers</div>
        <div class="toolbar">
          <button class="btn small muted" onclick="restoreBackup(${ix})">Restaurar</button>
        </div>
      </div>
    `;
  }).join('');
}
function restoreBackup(ix){
  let list = [];
  try{ list = JSON.parse(localStorage.getItem(LS.BACKUPS)||'[]')||[]; }catch{ list=[]; }
  const b = list[ix];
  if(!b){ alert("Backup no encontrado"); return; }
  if(!confirm("¿Restaurar este backup? Se reemplaza el estado actual.")) return;

  // restaurar
  try{
    // vocab + syn primero
    localStorage.setItem(LS.VOCAB, b.vocab||'');
    localStorage.setItem(LS.SYN, b.syn||'');
    localStorage.setItem(LS.PROV, JSON.stringify(b.providers||defaultProviders()));
    localStorage.setItem(LS.STORES, JSON.stringify(b.stores||{sp:[],sl:[],st:[]}));
    localStorage.setItem(LS.ASSIGN, JSON.stringify(b.assign||{}));
    localStorage.setItem(LS.ORDERS, JSON.stringify(b.orders||{}));
    localStorage.setItem(LS.CATALOG, JSON.stringify(b.catalog||{}));
  }catch(e){
    alert("Error restaurando backup: " + e.message);
    return;
  }
  location.reload();
}

/* ==========================
   Export/Import JSON completo
========================== */
function exportFullJSON(){
  const obj = snapshotAll();
  const txt = JSON.stringify(obj, null, 2);
  downloadText(`arslan_listas_full_${new Date().toISOString().slice(0,10)}.json`, txt);
}
function openImportFull(){
  byId('importFullTxt').value = '';
  openModal('modalImportFull');
}
function importFullJSON(){
  const raw = byId('importFullTxt').value || '';
  if(!raw.trim()){ alert("Pega un JSON."); return; }
  let obj=null;
  try{ obj = JSON.parse(raw); }catch{ alert("JSON inválido."); return; }

  if(!confirm("¿Importar? Se reemplazará TODO (tiendas, asignaciones, proveedores, catálogo, vocab, equivalencias).")) return;

  try{
    localStorage.setItem(LS.VOCAB, obj.vocab||'');
    localStorage.setItem(LS.SYN, obj.syn||'');
    localStorage.setItem(LS.PROV, JSON.stringify(obj.providers||defaultProviders()));
    localStorage.setItem(LS.STORES, JSON.stringify(obj.stores||{sp:[],sl:[],st:[]}));
    localStorage.setItem(LS.ASSIGN, JSON.stringify(obj.assign||{}));
    localStorage.setItem(LS.ORDERS, JSON.stringify(obj.orders||{}));
    localStorage.setItem(LS.CATALOG, JSON.stringify(obj.catalog||{}));
  }catch(e){
    alert("Error importando: "+e.message);
    return;
  }
  location.reload();
}

/* ==========================
   Catálogo IO
========================== */
function openCatalogImport(){
  byId('catalogIOTxtWrap').style.display = 'none';
  byId('importCatalogTxt').value = '';
  openModal('modalCatalogIO');
}
function exportCatalogJSON(){
  const txt = JSON.stringify(catalog, null, 2);
  downloadText(`arslan_catalogo_${new Date().toISOString().slice(0,10)}.json`, txt);
}
function openImportCatalog(){
  byId('catalogIOTxtWrap').style.display = 'block';
  byId('importCatalogTxt').value = '';
}
function importCatalogJSON(){
  const raw = byId('importCatalogTxt').value || '';
  if(!raw.trim()){ alert("Pega un JSON."); return; }
  let obj=null;
  try{ obj = JSON.parse(raw); }catch{ alert("JSON inválido."); return; }
  if(typeof obj !== 'object'){ alert("Formato inválido."); return; }
  if(!confirm("¿Importar catálogo?")) return;
  catalog = obj;
  persistState();
  toast("Catálogo importado.");
  renderCatalog();
}
function openCatalogImport(){ openModal('modalCatalogIO'); }
function openCatalogImport(){ openModal('modalCatalogIO'); } // safe duplicate guard (no-op)
function openCatalogImport(){ openModal('modalCatalogIO'); }

/* ==========================
   Modal helpers
========================== */
function openModal(id){ byId(id).style.display='flex'; if(id==='modalData') openBackups(); }
function closeModal(id){ byId(id).style.display='none'; }
function openDataTools(){ openModal('modalData'); }
function openProvManager(){ renderProvManager(); openModal('modalProv'); }
function openConflicts(){ renderConflicts(); openModal('modalConflicts'); }

/* ==========================
   Safety reset
========================== */
function resetAllSafe(){
  const x = prompt("Escribe BORRAR para limpiar TODO:");
  if(x!=="BORRAR"){ toast("Cancelado."); return; }
  localStorage.clear();
  location.reload();
}

/* ==========================
   Download helper
========================== */
function downloadText(filename, txt){
  const blob = new Blob([txt],{type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

/* ==========================
   Autocomplete (1 listener global)
========================== */
let AC_ACTIVE=null, AC_ANCHOR=null;
function closeAC(){ if(AC_ACTIVE){ AC_ACTIVE.remove(); AC_ACTIVE=null; AC_ANCHOR=null; } }
document.addEventListener('click', (e)=>{
  if(AC_ACTIVE && !AC_ACTIVE.contains(e.target) && e.target!==AC_ANCHOR) closeAC();
}, {capture:true});
window.addEventListener('scroll', ()=>{ if(AC_ACTIVE) closeAC(); }, {passive:true});
window.addEventListener('resize', ()=>{ if(AC_ACTIVE) closeAC(); }, {passive:true});

function attachAutocomplete(cell, onPick){
  cell.addEventListener('input', ()=>{
    const val = stripGenericWords(cell.innerText||'');
    closeAC();
    if(!val) return;
    const vocab = getVocabFromTextarea();
    const needle = normKey(val);
    const suggestions = vocab.filter(v=> normKey(v).includes(needle)).slice(0,10);
    if(!suggestions.length) return;

    const rect = cell.getBoundingClientRect();
    const box = document.createElement('div');
    box.className='ac-box';
    box.style.left = (rect.left + window.scrollX) + 'px';
    box.style.top = (rect.bottom + window.scrollY) + 'px';
    box.style.width = rect.width + 'px';

    suggestions.forEach(s=>{
      const item = document.createElement('div');
      item.className='ac-item';
      item.textContent = s;
      item.onclick = ()=>{ onPick(s); closeAC(); };
      box.appendChild(item);
    });

    document.body.appendChild(box);
    AC_ACTIVE = box;
    AC_ANCHOR = cell;
  }, {passive:true});
}

/* ==========================
   Undo/Redo (historial)
========================== */
let undoStack = [];
let redoStack = [];
const MAX_HISTORY = 30;

function stateForHistory(){
  return {
    stores: JSON.parse(JSON.stringify(tiendaState)),
    assign: JSON.parse(JSON.stringify(assignments)),
    orders: JSON.parse(JSON.stringify(orders)),
    catalog: JSON.parse(JSON.stringify(catalog)),
    activeProv: ACTIVE_PROV
  };
}
function restoreFromHistory(s){
  // restore deep
  tiendaState.sp = s.stores.sp||[];
  tiendaState.sl = s.stores.sl||[];
  tiendaState.st = s.stores.st||[];
  assignments = s.assign||{};
  orders = s.orders||{};
  catalog = s.catalog||{};
  ACTIVE_PROV = s.activeProv || (providers[0]?.name || "ESMO");
  ensureOrdersProviderKeys();
  persistState();
  // rerender
  buildProvBar();
  renderTable('sp'); renderTable('sl'); renderTable('st');
  unificarGlobal(true);
  renderProvidersPanels();
  renderCatalog();
}
function pushHistory(reason){
  undoStack.push(stateForHistory());
  if(undoStack.length>MAX_HISTORY) undoStack.shift();
  redoStack = [];
  localStorage.setItem(LS.HISTORY, JSON.stringify({undo: undoStack, redo: redoStack}));
}
function loadHistory(){
  try{
    const h = JSON.parse(localStorage.getItem(LS.HISTORY)||'{}');
    undoStack = Array.isArray(h.undo)? h.undo : [];
    redoStack = Array.isArray(h.redo)? h.redo : [];
  }catch{ undoStack=[]; redoStack=[]; }
}
function saveHistory(){
  localStorage.setItem(LS.HISTORY, JSON.stringify({undo: undoStack, redo: redoStack}));
}
function undo(){
  if(!undoStack.length){ toast("Nada que deshacer."); return; }
  const cur = stateForHistory();
  const prev = undoStack.pop();
  redoStack.push(cur);
  saveHistory();
  restoreFromHistory(prev);
  toast("Deshecho.");
}
function redo(){
  if(!redoStack.length){ toast("Nada que rehacer."); return; }
  const cur = stateForHistory();
  const nxt = redoStack.pop();
  undoStack.push(cur);
  saveHistory();
  restoreFromHistory(nxt);
  toast("Rehecho.");
}

/* ==========================
   Toast undo para asignación proveedor
========================== */
let toastUndoPayload = null;
let toastTimer = null;

function toast(msg, withUndo=false, payload=null){
  const t = byId('toast');
  const txt = byId('toastText');
  const btn = byId('toastUndoBtn');
  txt.textContent = msg;
  btn.style.display = withUndo ? 'inline-flex' : 'none';
  t.style.display = 'flex';

  toastUndoPayload = withUndo ? payload : null;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ t.style.display='none'; toastUndoPayload=null; }, withUndo ? 8000 : 2500);
}
function toastUndo(){
  if(!toastUndoPayload) return;
  // deshacer asignación específica
  const p = toastUndoPayload;
  // p: {prodKey, provName, qty}
  pushHistory("toastUndo");
  // quitar assignment
  delete assignments[p.prodKey];

  // restar del proveedor
  const list = orders[p.provName]||[];
  const idx = list.findIndex(x=> normKey(x.name)===p.prodKey);
  if(idx>-1){
    list[idx].qty = (Number(list[idx].qty)||0) - (Number(p.qty)||0);
    if(list[idx].qty<=0) list.splice(idx,1);
  }
  orders[p.provName]=list;

  persistState();
  unificarGlobal(true);
  renderProvidersPanels();
  toast("Asignación deshecha.");
}

/* ==========================
   Tabs + FAB
========================== */
function showTab(key){
  const ids = ['dic','tiendas','global','proveedores','catalogo'];
  ids.forEach(k=>{
    byId('tab-'+k).style.display = (k===key)?'block':'none';
    byId('btn-'+k).classList.toggle('active', k===key);
  });

  const fab = byId('fab');
  if(key==='global'){ fab.style.display='block'; } else { fab.style.display='none'; toggleFabMenu(true); }

  closeAC();

  if(key==='global'){
    idle(()=>{ buildProvBar(); unificarGlobal(true); });
  }
  if(key==='proveedores'){
    idle(()=>{ renderProvidersPanels(); });
  }
  if(key==='catalogo'){
    idle(()=>{ syncCatalogFromData(false); renderCatalog(); });
  }
}
function toggleFabMenu(forceHide){
  const m = byId('fabMenu');
  if(forceHide){ m.classList.remove('show'); return; }
  m.classList.toggle('show');
}
document.addEventListener('click', (e)=>{
  const m = byId('fabMenu'), f = byId('fab');
  if(m && f && !m.contains(e.target) && e.target!==f) m.classList.remove('show');
}, {capture:true});

/* ==========================
   Tiendas: modo móvil + auto-estandarizar
========================== */
function switchStore(code){
  activeStore = code;
  // activar tarjeta en modo mobile-one
  document.querySelectorAll('.store-card').forEach(c=>{
    c.classList.toggle('active', c.dataset.store===code);
  });
}
function toggleMobileMode(){
  mobileOneStore = !mobileOneStore;
  const grid = byId('storesGrid');
  grid.classList.toggle('mobile-one', mobileOneStore);
  switchStore(activeStore);
  toast(mobileOneStore ? "Modo móvil: 1 tienda" : "Modo escritorio: 3 tiendas");
}

const autoStd = debounce((code)=>{ estandarizar(code); }, 380);

function attachAutoPaste(){
  ['sp','sl','st'].forEach(code=>{
    const ta = byId('in_'+code);
    if(!ta) return;
    ta.addEventListener('input', ()=>{
      // autostandardize
      autoStd(code);
    }, {passive:true});
  });
}

/* ==========================
   Render tabla tienda
========================== */
function renderTable(code){
  const wrap = byId('tbl_'+code+'_wrap');
  const rows = tiendaState[code]||[];
  if(!rows.length){ wrap.innerHTML=''; return; }

  let html = `<div class="scroll-x"><table><thead><tr>
    <th>Original</th><th>Estandarizado</th><th>Cant.</th><th>Unidad</th><th>Estado</th>
  </tr></thead><tbody>`;

  rows.forEach((r,i)=>{
    html += `<tr>
      <td>${r.o}</td>
      <td contenteditable="true" data-i="${i}" data-f="e" ${r.a? 'class="red"':''}>${r.e}</td>
      <td contenteditable="true" data-i="${i}" data-f="q">${r.q}</td>
      <td contenteditable="true" data-i="${i}" data-f="u">${r.u||''}</td>
      <td>${r.a? '<span class="pill warn">Revisar</span>':'<span class="pill ok">OK</span>'}</td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  wrap.innerHTML = html;

  wrap.querySelectorAll('td[contenteditable]').forEach(cell=>{
    const i = Number(cell.dataset.i);
    const f = cell.dataset.f;

    if(f==='e'){
      attachAutocomplete(cell, (picked)=>{
        pushHistory("pick_vocab_store");
        cell.innerText = picked;
        tiendaState[code][i].e = applySynonym(removeDiacriticsUpper(picked));
        tiendaState[code][i].a = false;
        cell.classList.remove('red');
        cell.parentElement.querySelector('td:last-child').innerHTML = '<span class="pill ok">OK</span>';
        persistState();
        idle(()=>unificarGlobal(true));
      });
    }

    cell.addEventListener('blur', ()=>{
      const val = cell.innerText.trim();
      pushHistory("edit_store_cell");

      if(f==='q'){
        tiendaState[code][i].q = Number(String(val).replace(',','.'))||0;
      }else if(f==='u'){
        tiendaState[code][i].u = String(val||'').toLowerCase().trim();
      }else{
        const cleaned = applySynonym(removeDiacriticsUpper(val));
        tiendaState[code][i].e = cleaned;

        const vocab = getVocabFromTextarea();
        const exact = vocab.find(v=> normKey(v)===normKey(cleaned));
        const tdState = cell.parentElement.querySelector('td:last-child');
        if(exact){ tiendaState[code][i].a=false; cell.classList.remove('red'); tdState.innerHTML='<span class="pill ok">OK</span>'; }
        else { tiendaState[code][i].a=true; cell.classList.add('red'); tdState.innerHTML='<span class="pill warn">Revisar</span>'; }
      }

      persistState();
      idle(()=>unificarGlobal(true));
    }, {passive:true});
  });
}

/* ==========================
   Estandarizar por tienda + fusion repetidos
========================== */
function mergeSameProducts(rows){
  const map = new Map(); // key => row
  rows.forEach(r=>{
    const k = normKey(r.e);
    if(!map.has(k)){
      map.set(k, {...r});
    }else{
      const cur = map.get(k);
      cur.q = (Number(cur.q)||0) + (Number(r.q)||0);
      // si alguno estaba revisar, deja revisar
      cur.a = cur.a || r.a;
      // unidad: prioriza la que exista
      cur.u = cur.u || r.u || '';
      map.set(k, cur);
    }
  });
  return Array.from(map.values());
}

function estandarizar(code){
  pushHistory("estandarizar_store");

  const vocab = getVocabFromTextarea();
  const txt = byId('in_'+code).value;
  const rows = [];

  toLines(txt.replace(/,/g,'\n')).forEach(line=>{
    const p = parseLineSmart(line);
    if(!p) return;

    // nombre candidato
    const exact = vocab.find(v=> normKey(v)===normKey(p.name));
    if(exact){
      rows.push({o:p.original, e:applySynonym(exact), q:p.qty, u:p.unit||'', a:false});
      return;
    }

    const m = bestMatch(p.name, vocab);
    const chosen = (m.name && m.score>=MATCH_THRESHOLD) ? m.name : p.name;
    // si no es exacto => revisar
    rows.push({o:p.original, e:applySynonym(removeDiacriticsUpper(chosen)), q:p.qty, u:p.unit||'', a:true});
  });

  // fusion repetidos
  tiendaState[code] = mergeSameProducts(rows);

  renderTable(code);
  persistState();
  idle(()=>unificarGlobal(true));
}

function guardarTienda(code){
  const out = (tiendaState[code]||[]).map(r=> `${r.e} ${r.q}${r.u?(' '+r.u):''}`).join('\n');
  byId('in_'+code).value = out;
  toast(`Tienda ${code.toUpperCase()} guardada.`);
}

function exportarTiendaTXT(code){
  const tienda = tiendaState[code] || [];
  if(!tienda.length){ alert('No hay datos estandarizados.'); return; }
  const okRows = tienda.filter(r=>!r.a);
  if(!okRows.length){ alert('Aún hay productos por revisar (en rojo).'); return; }
  const today = new Date().toISOString().split('T')[0];
  const txt = okRows.map(x => `${x.q} ${x.e}`).join('\n');
  downloadText(`${code}_estandarizado_${today}.txt`, txt);
}
function enviarTiendaWhatsApp(code){
  const tienda = tiendaState[code] || [];
  if(!tienda.length){ alert('No hay datos estandarizados.'); return; }
  const okRows = tienda.filter(r=>!r.a);
  if(!okRows.length){ alert('Aún hay productos por revisar (en rojo).'); return; }
  const txt = okRows.map(x => `${x.q} ${x.e}`).join('\n');
  const msg = encodeURIComponent(`🛒 *Pedido ${code.toUpperCase()}*\n\n${txt}`);
  window.open(`https://wa.me/?text=${msg}`, '_blank');
}

/* ==========================
   Global unificar + similares + asignación
========================== */
function unificarGlobal(force){
  // unifica
  const all = [].concat(tiendaState.sp||[], tiendaState.sl||[], tiendaState.st||[]);
  const map = new Map();
  all.forEach(r=>{
    const name = applySynonym(r.e);
    const key = normKey(name);
    if(!map.has(key)) map.set(key,{name, total:0, unit:r.u||''});
    map.get(key).total += (Number(r.q)||0);
    if(!map.get(key).unit && r.u) map.get(key).unit = r.u;
  });
  const arr = Array.from(map.values()).sort((a,b)=>a.name.localeCompare(b.name,'es'));
  lastUnifiedRows = arr;

  // detectar similares probables
  const names = arr.map(x=>x.name);
  const similarSet = new Set();
  for(let i=0;i<names.length;i++){
    for(let j=i+1;j<names.length;j++){
      const s1 = names[i], s2 = names[j];
      if(normKey(s1)===normKey(s2)) continue;
      const sc = similarityScore(s1, s2);
      if(sc>=0.86){
        similarSet.add(s1); similarSet.add(s2);
      }
    }
  }
  lastSimilarSet = similarSet;

  renderGlobalTable(arr, similarSet);

  // refrescar catálogo “pasivo”
  if(force) syncCatalogFromData(false);
}

function buildProvBar(){
  const bar = byId('provBar');
  bar.innerHTML='';
  providers.forEach(p=>{
    const b = document.createElement('button');
    b.className = 'prov-btn' + (p.name===ACTIVE_PROV?' active':'');
    b.textContent = p.name;
    b.onclick = ()=>{
      ACTIVE_PROV = p.name;
      buildProvBar();
      idle(()=>unificarGlobal(false));
    };
    bar.appendChild(b);
  });
}

function renderGlobalTable(rows, similarSet){
  // filtro búsqueda
  const q = (byId('globalSearch')?.value || '').trim();
  let filtered = rows;
  if(q){
    const k = normKey(q);
    filtered = rows.filter(r=> normKey(r.name).includes(k));
  }

  // solo los NO asignados
  const visible = filtered.filter(r => !assignments[normKey(r.name)]);
  globalRows = visible;

  const wrap = byId('global_wrap');
  byId('globalCountPill').textContent = `${visible.length}`;

  if(!visible.length){
    wrap.innerHTML = '<div class="hint">Sin productos (todo asignado o no hay coincidencias).</div>';
    return;
  }

  let html = `
    <div class="hint" style="margin-bottom:6px">
      Proveedor activo: <b>${ACTIVE_PROV}</b>. Usa ✅ para asignar. (Se puede deshacer)
    </div>
    <div class="scroll-x"><table>
      <thead><tr><th></th><th>Producto</th><th>Total</th><th>Unidad</th><th>Estado</th></tr></thead>
      <tbody>
  `;

  visible.forEach((r,i)=>{
    const isSimilar = similarSet.has(r.name);
    html += `<tr data-i="${i}" class="${isSimilar?'dup':''}">
      <td><button class="ok-assign" onclick="assignFromGlobal(${i})">✅</button></td>
      <td contenteditable="true" data-f="name">${r.name}${isSimilar?'<span class="flag">⚠️</span>':''}</td>
      <td contenteditable="true" data-f="total">${r.total}</td>
      <td contenteditable="true" data-f="unit">${r.unit||''}</td>
      <td>${isSimilar?'<span class="pill warn">Posible duplicado</span>':'<span class="pill ok">OK</span>'}</td>
    </tr>`;
  });

  html += `</tbody></table></div>`;
  wrap.innerHTML = html;

  // edición inline global + autocomplete
  wrap.querySelectorAll('td[contenteditable]').forEach(cell=>{
    const tr = cell.parentElement;
    const idx = Number(tr.dataset.i);
    const f = cell.dataset.f;

    if(f==='name'){
      attachAutocomplete(cell, (picked)=>{
        pushHistory("pick_vocab_global");
        const cleaned = applySynonym(removeDiacriticsUpper(picked));
        cell.innerText = cleaned;
        globalRows[idx].name = cleaned;
        tr.classList.remove('dup');
        tr.querySelector('td:last-child').innerHTML = '<span class="pill ok">OK</span>';
      });
    }

    cell.addEventListener('blur', ()=>{
      pushHistory("edit_global_cell");
      const val = cell.innerText.trim();

      if(f==='total'){
        globalRows[idx].total = Number(String(val).replace(',','.'))||0;
      }else if(f==='unit'){
        globalRows[idx].unit = String(val||'').toLowerCase().trim();
      }else{
        const cleaned = applySynonym(removeDiacriticsUpper(val));
        globalRows[idx].name = cleaned;

        const vocab = getVocabFromTextarea();
        const exact = vocab.find(v=> normKey(v)===normKey(cleaned));
        if(exact){
          tr.classList.remove('dup');
          tr.querySelector('td:last-child').innerHTML = '<span class="pill ok">OK</span>';
        }else{
          // recalcular duplicado probable
          let dup=false;
          for(let k=0;k<globalRows.length;k++){
            if(k===idx) continue;
            const sc = similarityScore(globalRows[idx].name, globalRows[k].name);
            if(sc>=0.86 && normKey(globalRows[idx].name)!==normKey(globalRows[k].name)){ dup=true; break; }
          }
          if(dup){
            tr.classList.add('dup');
            tr.querySelector('td:last-child').innerHTML = '<span class="pill warn">Posible duplicado</span>';
          }else{
            tr.classList.remove('dup');
            tr.querySelector('td:last-child').innerHTML = '<span class="pill">OK</span>';
          }
        }
      }

      persistState();
    }, {passive:true});
  });
}

function assignFromGlobal(idx){
  const item = globalRows[idx];
  if(!item) return;

  pushHistory("assign_global");

  const prodKey = normKey(item.name);
  assignments[prodKey] = ACTIVE_PROV;

  const list = orders[ACTIVE_PROV] || [];
  const exIdx = list.findIndex(x=> normKey(x.name)===prodKey);
  if(exIdx>-1){
    list[exIdx].qty += Number(item.total)||0;
  }else{
    list.push({name:item.name, qty:Number(item.total)||0});
  }
  orders[ACTIVE_PROV] = list;

  // actualizar catálogo “historial de compra” (sin precio)
  ensureCatalogItem(item.name, item.unit || '');

  persistState();
  unificarGlobal(false);
  renderProvidersPanels();

  toast(`Asignado a ${ACTIVE_PROV}`, true, {prodKey, provName: ACTIVE_PROV, qty: Number(item.total)||0});
}

/* ==========================
   Auto-asignación por historial
========================== */
function autoAssignByHistory(){
  // usa catalog.preferredProv si existe
  pushHistory("autoAssignByHistory");
  let count=0;

  globalRows.slice().forEach((it, idx)=>{
    const k = normKey(it.name);
    const cat = catalog[k];
    const prov = cat?.preferredProv;
    if(prov && providers.some(p=>p.name===prov)){
      ACTIVE_PROV = prov;
      assignments[k] = prov;
      const list = orders[prov] || [];
      const exIdx = list.findIndex(x=> normKey(x.name)===k);
      if(exIdx>-1) list[exIdx].qty += Number(it.total)||0;
      else list.push({name: it.name, qty: Number(it.total)||0});
      orders[prov]=list;
      count++;
    }
  });

  persistState();
  buildProvBar();
  unificarGlobal(false);
  renderProvidersPanels();
  toast(`Auto-asignados: ${count}`);
}

/* ==========================
   Proveedores panels
========================== */
function renderProvidersPanels(){
  const cont = byId('provPanels');
  cont.innerHTML='';
  providers.forEach(p=>{
    const prov = p.name;
    const list = orders[prov] || [];
    const card = document.createElement('div');
    card.className='card';

    const hd = document.createElement('div');
    hd.className='hd';
    hd.innerHTML = `<strong>${prov}</strong>
      <div class="toolbar">
        <button class="btn small" onclick="exportProvTXT('${prov}')">📄 TXT</button>
        <button class="btn small muted" onclick="enviarProvWhatsApp('${prov}')">📲 WhatsApp</button>
        <button class="btn small muted" onclick="setPreferredForSelected('${prov}')">⭐ Preferido (selección)</button>
      </div>`;

    const bd = document.createElement('div');
    bd.className='bd';

    if(!list.length){
      bd.innerHTML = `<div class="hint">Sin productos asignados.</div>`;
    }else{
      let html = `<div class="scroll-x"><table><thead><tr>
        <th></th><th>Producto</th><th>Cantidad</th>
      </tr></thead><tbody>`;
      list.forEach((it,ix)=>{
        html += `<tr>
          <td><input type="checkbox" data-prov="${prov}" data-idx="${ix}"></td>
          <td contenteditable="true" data-prov="${prov}" data-idx="${ix}" data-f="name" class="green">${it.name}</td>
          <td contenteditable="true" data-prov="${prov}" data-idx="${ix}" data-f="qty" class="green">${it.qty}</td>
        </tr>`;
      });
      html += `</tbody></table></div>`;
      bd.innerHTML = html;

      bd.querySelectorAll('td[contenteditable]').forEach(cell=>{
        const prov = cell.dataset.prov;
        const idx = Number(cell.dataset.idx);
        const f = cell.dataset.f;

        if(f==='name'){
          attachAutocomplete(cell, picked=>{
            pushHistory("edit_prov_name");
            const cleaned = applySynonym(removeDiacriticsUpper(picked));
            cell.innerText = cleaned;
            orders[prov][idx].name = cleaned;
            persistState();
          });
        }

        cell.addEventListener('blur', ()=>{
          pushHistory("edit_prov_cell");
          const val = cell.innerText.trim();
          if(f==='qty'){
            orders[prov][idx].qty = Number(String(val).replace(',','.'))||0;
          }else{
            orders[prov][idx].name = applySynonym(removeDiacriticsUpper(val));
          }
          persistState();
        }, {passive:true});
      });
    }

    card.appendChild(hd); card.appendChild(bd);
    cont.appendChild(card);
  });
}

function exportProvTXT(prov){
  const list = orders[prov]||[];
  if(!list.length){ alert('No hay líneas para ' + prov); return; }
  const today = new Date().toISOString().split('T')[0];
  const txt = list.map(x=> `${x.qty} ${x.name}`).join('\n');
  downloadText(`pedido_${prov}_${today}.txt`, txt);
}
function enviarProvWhatsApp(prov){
  const list = orders[prov]||[];
  if(!list.length){ alert('No hay líneas para ' + prov); return; }
  const txt = list.map(x=> `${x.qty} ${x.name}`).join('\n');
  const p = providers.find(x=>x.name===prov);
  const msg = encodeURIComponent(`📦 *Pedido ${prov}*\n\n${txt}`);
  // si hay phone, wa.me/telefono, si no general
  const url = (p && p.phone) ? `https://wa.me/${p.phone.replace(/\D/g,'')}?text=${msg}` : `https://wa.me/?text=${msg}`;
  window.open(url, '_blank');
}

function setPreferredForSelected(prov){
  // marca proveedor preferido en catálogo para checkboxes seleccionados
  const checks = document.querySelectorAll(`input[type="checkbox"][data-prov="${prov}"]:checked`);
  if(!checks.length){ toast("Selecciona productos (checkbox)."); return; }
  pushHistory("setPreferredForSelected");

  checks.forEach(ch=>{
    const idx = Number(ch.dataset.idx);
    const item = orders[prov][idx];
    if(!item) return;
    const k = normKey(item.name);
    ensureCatalogItem(item.name, '');
    catalog[k].preferredProv = prov;
  });

  persistState();
  toast("Preferido guardado en catálogo.");
  renderCatalog();
}

/* ==========================
   Export Global
========================== */
function copiarGlobal(){
  if(!globalRows.length) return;
  const txt = globalRows.map(r=>`- ${r.total} ${r.name}`).join('\n');
  navigator.clipboard.writeText(txt);
  toast("Lista global copiada.");
}
function exportarGlobalTXT(){
  if(!globalRows.length){ alert('No hay datos.'); return; }
  const today = new Date().toISOString().split('T')[0];
  const txt = globalRows.map(r=>`${r.total}\t${r.name}`).join('\n');
  downloadText(`lista_global_${today}.txt`, txt);
}
function exportarGlobalXLSX(){
  if(!globalRows.length){ alert('No hay datos.'); return; }
  const today = new Date().toISOString().split('T')[0];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([['Producto','Total'], ...globalRows.map(r=>[r.name,r.total])]);
  XLSX.utils.book_append_sheet(wb, ws, 'Global');
  XLSX.writeFile(wb, `lista_global_${today}.xlsx`);
}

/* ==========================
   TXT Global (asignados + pendientes)
========================== */
function exportResumenGlobalTXT(){
  const all = [].concat(tiendaState.sp||[], tiendaState.sl||[], tiendaState.st||[]);
  const totalMap = {};

  all.forEach(r=>{
    const name = applySynonym(r.e);
    const k = normKey(name);
    if(!totalMap[k]) totalMap[k] = {name, total:0};
    totalMap[k].total += (Number(r.q)||0);
  });

  const byProv = {};
  providers.forEach(p=>byProv[p.name]=[]);
  const unassigned = [];

  Object.values(totalMap).forEach(it=>{
    const k = normKey(it.name);
    const prov = assignments[k];
    if(prov && byProv[prov]){
      byProv[prov].push({name:it.name, qty:it.total});
    }else{
      unassigned.push({name:it.name, qty:it.total});
    }
  });

  let out = `📦 PEDIDOS POR PROVEEDOR\n\n`;
  providers.forEach(p=>{
    const name = p.name;
    out += `> ${name}:\n`;
    const arr = byProv[name] || [];
    if(arr.length){
      arr.sort((a,b)=>a.name.localeCompare(b.name,'es'));
      arr.forEach(x=>{ out += `- ${x.qty} ${x.name}\n`; });
    }else{
      out += `- (sin líneas)\n`;
    }
    out += `\n`;
  });

  out += `📌 SIN PROVEEDOR ASIGNADO:\n`;
  if(unassigned.length){
    unassigned.sort((a,b)=>a.name.localeCompare(b.name,'es'));
    unassigned.forEach(x=>{ out += `- ${x.qty} ${x.name}\n`; });
  }else{
    out += `- (sin líneas)\n`;
  }

  const today = new Date().toISOString().split('T')[0];
  downloadText(`resumen_pedidos_${today}.txt`, out);
}

/* ==========================
   Reparto por tiendas (con precios + total)
========================== */
const repartoState = {}; 
function renderRepartoTienda(){
  const code = byId('selRepartoTienda').value;
  const wrap = byId('reparto_wrap');
  if(!code){ wrap.innerHTML = '<div class="hint">Selecciona una tienda para ver su lista.</div>'; byId('repartoTotalPill').textContent='Total: 0,00€'; return; }

  const lista = tiendaState[code] || [];
  if(!lista.length){ wrap.innerHTML = '<div class="hint">Sin datos en esta tienda.</div>'; byId('repartoTotalPill').textContent='Total: 0,00€'; return; }

  if(!repartoState[code] || repartoState[code].length !== lista.length){
    repartoState[code] = lista.map(x => {
      const k = normKey(x.e);
      const price = catalog[k]?.price ? Number(catalog[k].price) : '';
      return { name:x.e, qty:x.q, price: price ? price.toFixed(2) : '', checked:false };
    });
  }

  let html = `<table><thead><tr><th></th><th>Producto</th><th>Cantidad</th><th>Precio (€)</th><th>Importe</th></tr></thead><tbody>`;
  repartoState[code].forEach((r,i)=>{
    const imp = (r.price!=='' && !isNaN(Number(r.price))) ? (Number(r.price)*Number(r.qty||0)) : 0;
    html += `<tr>
      <td><input type="checkbox" ${r.checked?'checked':''} onchange="toggleRepartoItem('${code}', ${i}, this.checked)"></td>
      <td>${r.name}</td>
      <td>${r.qty}</td>
      <td contenteditable="true" onblur="updateRepartoPrice('${code}', ${i}, this.innerText)">${r.price||''}</td>
      <td>${imp?imp.toFixed(2)+'€':''}</td>
    </tr>`;
  });
  html += `</tbody></table>`;
  wrap.innerHTML = html;
  updateRepartoTotal(code);
}
function toggleRepartoItem(code, idx, checked){
  if(!repartoState[code]) return;
  repartoState[code][idx].checked = checked;
  updateRepartoTotal(code);
}
function updateRepartoPrice(code, idx, val){
  if(!repartoState[code]) return;
  const num = parseFloat(String(val||'').replace(',','.'));
  repartoState[code][idx].price = isNaN(num)? '' : num.toFixed(2);
  updateRepartoTotal(code);
}
function updateRepartoTotal(code){
  const arr = repartoState[code]||[];
  let total=0;
  arr.forEach(x=>{
    if(!x.checked) return;
    const p = Number(String(x.price||'').replace(',','.'));
    if(isNaN(p)) return;
    total += p * (Number(x.qty)||0);
  });
  byId('repartoTotalPill').textContent = `Total: ${total.toFixed(2).replace('.',',')}€`;
}
function exportarRepartoTXT(){
  const code = byId('selRepartoTienda').value;
  if(!code){ alert('Selecciona una tienda primero.'); return; }
  const seleccionados = (repartoState[code]||[]).filter(x=>x.checked);
  if(!seleccionados.length){ alert('No hay productos seleccionados.'); return; }
  const txt = seleccionados.map(x => `${x.qty} ${x.name}${x.price ? ' — ' + x.price + '€' : ''}`).join('\n');
  const today = new Date().toISOString().split('T')[0];
  downloadText(`reparto_${code}_${today}.txt`, txt);
}
function exportarRepartoXLSX(){
  const code = byId('selRepartoTienda').value;
  if(!code){ alert('Selecciona una tienda primero.'); return; }
  const seleccionados = (repartoState[code]||[]).filter(x=>x.checked);
  if(!seleccionados.length){ alert('No hay productos seleccionados.'); return; }

  const rows = seleccionados.map(x=>{
    const p = Number(String(x.price||'').replace(',','.'));
    const imp = (!isNaN(p)? (p*(Number(x.qty)||0)) : '');
    return [x.name, x.qty, x.price||'', imp!==''?imp.toFixed(2):''];
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([['Producto','Cantidad','Precio','Importe'], ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'Reparto');
  XLSX.writeFile(wb, `reparto_${code}_${new Date().toISOString().slice(0,10)}.xlsx`);
}
function enviarRepartoWhatsApp(){
  const code = byId('selRepartoTienda').value;
  if(!code){ alert('Selecciona una tienda primero.'); return; }
  const seleccionados = (repartoState[code]||[]).filter(x=>x.checked);
  if(!seleccionados.length){ alert('No hay productos seleccionados.'); return; }

  let msg = `🚚 *Reparto ${code.toUpperCase()}*\n\n`;
  seleccionados.forEach(x=>{
    msg += `- ${x.qty} ${x.name}`;
    if(x.price) msg += ` — ${x.price}€`;
    msg += '\n';
  });
  msg = encodeURIComponent(msg);
  window.open(`https://wa.me/?text=${msg}`, '_blank');
}

/* ==========================
   Conflictos (duplicados probables) + acciones
========================== */
function renderConflicts(){
  // pares probables entre lastUnifiedRows
  const arr = lastUnifiedRows || [];
  const pairs = [];
  const names = arr.map(x=>x.name);

  for(let i=0;i<names.length;i++){
    for(let j=i+1;j<names.length;j++){
      if(normKey(names[i])===normKey(names[j])) continue;
      const sc = similarityScore(names[i], names[j]);
      if(sc>=0.88){
        pairs.push({a:names[i], b:names[j], score:sc});
      }
    }
  }

  const box = byId('conflictsList');
  if(!pairs.length){
    box.innerHTML = `<div class="hint">No hay conflictos fuertes ahora.</div>`;
    return;
  }

  box.innerHTML = pairs.slice(0,60).map((p,ix)=>{
    return `
      <div class="conf-row">
        <strong>${p.a}  ⇄  ${p.b}</strong>
        <div class="hint">Similitud: ${(p.score*100).toFixed(1)}%</div>
        <div class="conf-actions" style="margin-top:8px">
          <button class="btn small muted" onclick="makeSynFromConflict('${escapeQuotes(p.a)}','${escapeQuotes(p.b)}')">Crear equivalencia</button>
          <button class="btn small" onclick="mergeConflictTo('${escapeQuotes(p.a)}','${escapeQuotes(p.b)}')">Fusionar en A</button>
          <button class="btn small" onclick="mergeConflictTo('${escapeQuotes(p.b)}','${escapeQuotes(p.a)}')">Fusionar en B</button>
        </div>
      </div>
    `;
  }).join('');
}
function escapeQuotes(s){ return String(s).replace(/'/g,"\\'"); }

function makeSynFromConflict(a,b){
  // por defecto: b = a (alias -> canon), pero aquí preguntamos
  const choice = prompt(`Crear equivalencia.\nEscribe: "ALIAS = CANÓNICO"\nEj: ${b} = ${a}`, `${b} = ${a}`);
  if(!choice) return;
  const cur = byId('synTxt').value || '';
  byId('synTxt').value = (cur.trim()?cur.trim()+'\n':'') + choice;
  saveSynonyms();
  toast("Equivalencia añadida.");
}

function mergeConflictTo(canon, alias){
  // Cambia alias a canon en tiendas + orders + catálogo + assignments
  pushHistory("mergeConflictTo");

  const canonUp = applySynonym(removeDiacriticsUpper(canon));
  const aliasUp = applySynonym(removeDiacriticsUpper(alias));
  const canonKey = normKey(canonUp);
  const aliasKey = normKey(aliasUp);

  // tiendas: reemplazar e si coincide aliasKey
  ['sp','sl','st'].forEach(code=>{
    (tiendaState[code]||[]).forEach(r=>{
      if(normKey(r.e)===aliasKey){
        r.e = canonUp;
      }
    });
    tiendaState[code] = mergeSameProducts(tiendaState[code]);
  });

  // orders
  Object.keys(orders).forEach(prov=>{
    (orders[prov]||[]).forEach(r=>{
      if(normKey(r.name)===aliasKey) r.name = canonUp;
    });
    // fusion dentro del proveedor
    const tmp = {};
    (orders[prov]||[]).forEach(r=>{
      const k = normKey(r.name);
      if(!tmp[k]) tmp[k] = {name:r.name, qty:0};
      tmp[k].qty += Number(r.qty)||0;
    });
    orders[prov] = Object.values(tmp);
  });

  // assignments
  if(assignments[aliasKey]){
    if(!assignments[canonKey]) assignments[canonKey] = assignments[aliasKey];
    delete assignments[aliasKey];
  }

  // catálogo
  if(catalog[aliasKey]){
    if(!catalog[canonKey]) catalog[canonKey] = catalog[aliasKey];
    catalog[canonKey].name = canonUp;
    delete catalog[aliasKey];
  }else{
    ensureCatalogItem(canonUp,'');
  }

  persistState();
  renderTable('sp'); renderTable('sl'); renderTable('st');
  unificarGlobal(true);
  renderProvidersPanels();
  renderCatalog();
  toast("Fusionado.");
  closeModal('modalConflicts');
}

/* ==========================
   Catálogo (sync + render + historial)
========================== */
function ensureCatalogItem(name, unit){
  const n = applySynonym(removeDiacriticsUpper(name));
  const k = normKey(n);
  if(!catalog[k]){
    catalog[k] = { name:n, unit: unit||'', preferredProv:'', price:'', history:[] };
  }else{
    if(unit && !catalog[k].unit) catalog[k].unit = unit;
    catalog[k].name = n;
  }
  return catalog[k];
}

function syncCatalogFromData(save=true){
  // 1) desde tiendas
  ['sp','sl','st'].forEach(code=>{
    (tiendaState[code]||[]).forEach(r=>{
      ensureCatalogItem(r.e, r.u||'');
    });
  });
  // 2) desde orders
  Object.keys(orders).forEach(prov=>{
    (orders[prov]||[]).forEach(r=>{
      ensureCatalogItem(r.name,'');
      // si no hay preferredProv, sugerir el prov
      const k = normKey(r.name);
      if(!catalog[k].preferredProv) catalog[k].preferredProv = prov;
    });
  });

  if(save) persistState();
  renderProviderFilters();
  renderCatalog();
}

function renderProviderFilters(){
  // Catálogo: filtro proveedor
  const sel = byId('catFilterProv');
  if(!sel) return;
  const cur = sel.value || '';
  sel.innerHTML = `<option value="">Todos los proveedores</option>` + providers.map(p=>`<option value="${p.name}">${p.name}</option>`).join('');
  sel.value = cur && providers.some(p=>p.name===cur) ? cur : '';
}

function renderCatalog(){
  const wrap = byId('catalog_wrap');
  const q = (byId('catSearch')?.value || '').trim();
  const prov = (byId('catFilterProv')?.value || '').trim();
  const unit = (byId('catFilterUnit')?.value || '').trim();

  let items = Object.values(catalog||{});
  if(q){
    const k = normKey(q);
    items = items.filter(it=> normKey(it.name).includes(k));
  }
  if(prov){
    items = items.filter(it=> (it.preferredProv||'')===prov);
  }
  if(unit){
    items = items.filter(it=> (String(it.unit||'').toLowerCase().trim())===unit);
  }

  items.sort((a,b)=>a.name.localeCompare(b.name,'es'));
  byId('catCountPill').textContent = `${items.length}`;

  if(!items.length){
    wrap.innerHTML = `<div class="hint">No hay productos en catálogo para ese filtro.</div>`;
    return;
  }

  let html = `<div class="scroll-x"><table class="catalog-table">
    <thead><tr>
      <th>Producto</th><th>Unidad</th><th>Proveedor preferido</th><th>Precio actual (€)</th><th>Historial</th><th>Acciones</th>
    </tr></thead><tbody>`;

  items.forEach((it)=>{
    const k = normKey(it.name);
    const histCount = (it.history||[]).length;
    html += `<tr>
      <td><strong>${it.name}</strong><br><small>${k}</small></td>
      <td contenteditable="true" data-cat="${k}" data-f="unit">${it.unit||''}</td>
      <td>
        <select data-cat="${k}" onchange="setCatalogPreferred('${k}', this.value)">
          <option value="">(ninguno)</option>
          ${providers.map(p=>`<option value="${p.name}" ${it.preferredProv===p.name?'selected':''}>${p.name}</option>`).join('')}
        </select>
      </td>
      <td contenteditable="true" data-cat="${k}" data-f="price">${it.price||''}</td>
      <td>
        <span class="pill">${histCount} entradas</span>
        <button class="btn small muted" onclick="toggleHistory('${k}')">Ver</button>
      </td>
      <td>
        <div class="catalog-actions">
          <button class="btn small" onclick="addPriceHistory('${k}')">+ Historial</button>
          <button class="btn small muted" onclick="useLastPrice('${k}')">Usar último</button>
        </div>
      </td>
    </tr>
    <tr id="hist_${k}" style="display:none">
      <td colspan="6">
        ${renderHistoryTable(it, k)}
      </td>
    </tr>`;
  });

  html += `</tbody></table></div>`;
  wrap.innerHTML = html;

  // editable unit/price
  wrap.querySelectorAll('td[contenteditable]').forEach(cell=>{
    cell.addEventListener('blur', ()=>{
      const k = cell.dataset.cat;
      const f = cell.dataset.f;
      if(!catalog[k]) return;
      pushHistory("edit_catalog_cell");

      const val = cell.innerText.trim();
      if(f==='unit'){
        catalog[k].unit = String(val||'').toLowerCase().trim();
      }else if(f==='price'){
        const n = parseFloat(String(val||'').replace(',','.'));
        catalog[k].price = isNaN(n) ? '' : n.toFixed(2);
      }
      persistState();
    }, {passive:true});
  });
}

function renderHistoryTable(it, k){
  const hist = Array.isArray(it.history)? it.history.slice().sort((a,b)=> String(b.dateISO||'').localeCompare(String(a.dateISO||''))) : [];
  if(!hist.length){
    return `<div class="hint">Sin historial todavía. Pulsa “+ Historial”.</div>`;
  }
  let html = `<div class="scroll-x"><table><thead><tr>
    <th>Fecha</th><th>Precio</th><th>Proveedor</th><th>Nota</th>
  </tr></thead><tbody>`;
  hist.forEach(h=>{
    html += `<tr>
      <td>${h.dateISO||''}</td>
      <td>${h.price||''}</td>
      <td>${h.prov||''}</td>
      <td>${h.note||''}</td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  return html;
}
function toggleHistory(k){
  const tr = byId('hist_'+k);
  if(!tr) return;
  tr.style.display = (tr.style.display==='none' || !tr.style.display) ? 'table-row' : 'none';
}
function setCatalogPreferred(k, prov){
  if(!catalog[k]) return;
  pushHistory("set_catalog_preferred");
  catalog[k].preferredProv = prov || '';
  persistState();
}
function addPriceHistory(k){
  if(!catalog[k]) return;
  const dateISO = prompt("Fecha (YYYY-MM-DD):", new Date().toISOString().slice(0,10));
  if(!dateISO) return;
  const price = prompt("Precio (€):", catalog[k].price || '');
  if(price===null) return;
  const prov = prompt("Proveedor:", catalog[k].preferredProv || '');
  if(prov===null) return;
  const note = prompt("Nota (opcional):", '') || '';

  const n = parseFloat(String(price).replace(',','.'));
  pushHistory("add_price_history");
  catalog[k].history = Array.isArray(catalog[k].history)? catalog[k].history : [];
  catalog[k].history.push({dateISO: String(dateISO).trim(), price: isNaN(n)?'':n.toFixed(2), prov: String(prov||'').trim(), note});
  // actualizar precio actual con el nuevo si viene
  if(!isNaN(n)) catalog[k].price = n.toFixed(2);
  if(prov) catalog[k].preferredProv = String(prov).trim();
  persistState();
  renderCatalog();
  toast("Historial añadido.");
}
function useLastPrice(k){
  if(!catalog[k] || !Array.isArray(catalog[k].history) || !catalog[k].history.length){
    toast("No hay historial.");
    return;
  }
  const last = catalog[k].history.slice().sort((a,b)=> String(b.dateISO||'').localeCompare(String(a.dateISO||'')))[0];
  if(last && last.price){
    pushHistory("use_last_price");
    catalog[k].price = last.price;
    if(last.prov) catalog[k].preferredProv = last.prov;
    persistState();
    renderCatalog();
    toast("Aplicado último precio.");
  }
}

/* ==========================
   Proveedores manager UI
========================== */
function renderProvManager(){
  const box = byId('provManagerList');
  box.innerHTML = providers.map((p,ix)=>{
    return `
      <div class="prov-row">
        <input value="${p.name}" placeholder="Nombre" oninput="provEditName(${ix}, this.value)">
        <input value="${p.phone||''}" placeholder="Teléfono WhatsApp (opcional)" oninput="provEditPhone(${ix}, this.value)">
        <div class="toolbar">
          <button class="btn small muted" onclick="removeProvider(${ix})">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}
function provEditName(ix, val){ providers[ix].name = val; }
function provEditPhone(ix, val){ providers[ix].phone = val; }
function addProvider(){
  providers.push({name:"", phone:""});
  renderProvManager();
}
function removeProvider(ix){
  if(!confirm("¿Eliminar proveedor? (No borra pedidos antiguos guardados, pero dejarán de mostrarse)")) return;
  providers.splice(ix,1);
  renderProvManager();
}
function openProvManager(){ renderProvManager(); openModal('modalProv'); }

/* ==========================
   Proveedores “quick list” en diccionario
========================== */
function renderProvQuickList(){
  const wrap = byId('provQuickList');
  if(!wrap) return;
  wrap.innerHTML = providers.map(p=>`<span class="prov-chip">${p.name}${p.phone?' · 📲':''}</span>`).join('');
}

/* ==========================
   Catálogo IO (modal)
========================== */
function openCatalogImport(){
  byId('catalogIOTxtWrap').style.display = 'none';
  byId('importCatalogTxt').value = '';
  openModal('modalCatalogIO');
}
function openCatalogImport(){
  openModal('modalCatalogIO');
}

/* ==========================
   Data Tools
========================== */
function openDataTools(){ openModal('modalData'); }

/* ==========================
   Minor UI glue
========================== */
function openCatalogImport(){ openModal('modalCatalogIO'); } // ensure exists

/* ==========================
   INIT
========================== */
(function init(){
  // Theme
  const savedTheme = localStorage.getItem(LS.THEME) || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme);

  // Backups: auto backup on load (light)
  loadProviders();
  loadVocab();
  loadSynonyms();
  loadState();
  loadHistory();

  // ensure providers consistent
  providers = providers.map(p=>({name: removeDiacriticsUpper(p.name||'').trim(), phone:String(p.phone||'').trim()})).filter(p=>p.name);
  if(!providers.length) providers = defaultProviders();
  localStorage.setItem(LS.PROV, JSON.stringify(providers));
  ensureOrdersProviderKeys();

  // set active prov
  ACTIVE_PROV = providers[0]?.name || "ESMO";

  // Render
  renderProvQuickList();
  toggleMobileMode(); // set mobile mode default ON
  byId('storeSelect').value = activeStore;
  switchStore(activeStore);

  attachAutoPaste();

  // initial renders
  renderTable('sp'); renderTable('sl'); renderTable('st');
  buildProvBar();
  unificarGlobal(true);
  renderProvidersPanels();
  syncCatalogFromData(false);
  renderProviderFilters();
  renderCatalog();

  // create backup on load (keeps last 7)
  pushBackup(snapshotAll());

  // default tab
  showTab('dic');
})();
