/* ==========================
   ARSLAN LISTAS v3.6 — KIWI OPTIMIZED (LocalStorage only)
   - Mismo flujo y funciones que v3.5
   - Supabase desactivado totalmente
   - Código modular y eventos delegados
========================== */

/* ===== Tabs ===== */
function showTab(key){
  const ids = ['dic','tiendas','global','proveedores','compras','reparto','precios'];
  ids.forEach(k=>{
    const sec = document.getElementById('tab-'+k);
    const btn = document.getElementById('btn-'+k);
    if(sec) sec.style.display = (k===key)?'block':'none';
    if(btn) btn.classList.toggle('active', k===key);
  });
  if(key==='global'){ unificarGlobal(); buildProvBar(); }
  if(key==='proveedores'){ renderProvidersPanels(); }
  if(key==='compras'){ renderCompras(); }
  if(key==='reparto'){ renderReparto(); }
  if(key==='precios'){ renderPrecios(); }
  updateGlobalStatus();
}

/* ===== Config & utils ===== */
const LS = {
  VOCAB: 'arslan_v34_vocab',
  STORES: 'arslan_v34_stores',
  ASSIGN: 'arslan_v34_assign',
  ORDERS: 'arslan_v34_orders',
  PURCHASES: 'arslan_v34_purchases',
  REPARTO: 'arslan_v34_reparto',
  PRICES: 'arslan_v34_prices',
  SENT_LOG: 'arslan_v34_sentlog'
};
const PROVEEDORES = ["ESMO","MONTENEGRO","ÁNGEL VACA","JOSÉ ANTONIO","JAVI","ANGELO"];
const IGNORE_WORDS = ['caja','cajas','kg','kilo','kilos','uds','ud','u','unidad','unidades','manojo','manojos','saco','sacos'];

const $ = s => document.querySelector(s);
const byId = id => document.getElementById(id);
const toLines = t => String(t||'').split(/[\n\r,]/).map(x=>x.trim()).filter(Boolean);

function cleanNum(n, def=0){
  const x = Number(String(n).replace(',','.'));
  if (!isFinite(x) || isNaN(x)) return def;
  return Math.max(0, x);
}
function getSentLog(){ try{ return JSON.parse(localStorage.getItem(LS.SENT_LOG)||'[]')||[]; }catch{ return []; } }
function pushSentLog(entry){
  const log = getSentLog(); log.push(entry);
  localStorage.setItem(LS.SENT_LOG, JSON.stringify(log));
}
function todayISO(){ return new Date().toISOString().slice(0,10); }

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
function stripGenericWords(s){
  const tokens = normKey(s).split(' ').filter(t=>!IGNORE_WORDS.includes(t.toLowerCase()));
  return tokens.join(' ').trim();
}

/* ===== Vocab ===== */
const OFFICIAL_VOCAB_RAW = `GRANNY FRANCIA
MANZANA PINK LADY
MANDARINA COLOMBE
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
function loadVocab(){
  const saved = localStorage.getItem(LS.VOCAB);
  const base = saved && saved.trim()? saved : OFFICIAL_VOCAB_RAW;
  const list = uniqueVocab(toLines(base));
  byId('vocabTxt').value = list.join('\n');
  return list;
}
function saveVocab(){
  localStorage.setItem(LS.VOCAB, byId('vocabTxt').value||'');
  alert('Vocabulario guardado.');
  renderProvidersPanels();
  unificarGlobal();
  updateGlobalStatus();
}

/* ===== Fuzzy match ===== */
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

/* ===== Parser línea ===== */
function parseLine(raw){
  if(!raw) return null;
  let s = raw.replace(/\t/g,' ').replace(/\s{2,}/g,' ').trim();
  s = s.replace(/^[-•*]\s*/,'');
  let qty=null, name=s;

  const mX = s.match(/(?:x|X|\*)\s*(\d+[\.,]?\d*)\b/);
  if(mX){ qty=Number(mX[1].replace(',','.')); name=s.replace(mX[0],'').trim(); }

  if(qty===null){
    const mEnd = s.match(/(\d+[\.,]?\d*)\s*(?:kg|kgs|kilo|kilos|uds|ud|u|unidad|unidades|caja|cajas)?\s*$/i);
    if(mEnd){ qty=Number(mEnd[1].replace(',','.')); name=s.slice(0,mEnd.index).trim(); }
  }
  if(qty===null){
    const mStart = s.match(/^\s*(\d+[\.,]?\d*)\s+(.*)$/);
    if(mStart){ qty=Number(mStart[1].replace(',','.')); name=mStart[2].trim(); }
  }
  if(qty===null){ qty=1; }

  name = stripGenericWords(name);
  return { original: removeDiacriticsUpper(s), name, qty };
}

/* ===== Estado ===== */
const tiendaState = { sp:[], sl:[], st:[] }; // [{o,e,q,a}]
let globalRows = [];                          // [{name,total}]
let assignments = {};                         // { normKey(name) : proveedor }
let orders = {};                              // { proveedor : [{name, qty}] }
let ACTIVE_PROV = PROVEEDORES[0];

// Compras y reparto
let __purchases = {};                         // { prov : [{name, purchased}] , "_SIN_PROV_": [...] }
let __reparto = {};                           // { name : {sp, sl, st} }

// Precios
function getPrices(){ try{ return JSON.parse(localStorage.getItem(LS.PRICES)||'{}')||{}; }catch{ return {}; } }
function setPrices(obj){ localStorage.setItem(LS.PRICES, JSON.stringify(obj||{})); }
function priceKey(prov,name){ return `${prov}||${normKey(name)}`; }

/* ===== Persistencia ===== */
function loadState(){
  try{
    const s = JSON.parse(localStorage.getItem(LS.STORES)||'{}');
    ['sp','sl','st'].forEach(k=>{ if(Array.isArray(s[k])) tiendaState[k]=s[k]; });
  }catch{}
  try{
    const a = JSON.parse(localStorage.getItem(LS.ASSIGN)||'{}'); assignments = a||{};
  }catch{}
  try{
    const o = JSON.parse(localStorage.getItem(LS.ORDERS)||'{}'); orders = o||{};
  }catch{}
  try{
    __purchases = JSON.parse(localStorage.getItem(LS.PURCHASES)||'{}')||{};
  }catch{ __purchases={}; }
  try{
    __reparto = JSON.parse(localStorage.getItem(LS.REPARTO)||'{}')||{};
  }catch{ __reparto={}; }

  PROVEEDORES.forEach(p=>{ if(!Array.isArray(orders[p])) orders[p]=[]; });
}
function persistState(){
  localStorage.setItem(LS.STORES, JSON.stringify(tiendaState));
  localStorage.setItem(LS.ASSIGN, JSON.stringify(assignments));
  localStorage.setItem(LS.ORDERS, JSON.stringify(orders));
  localStorage.setItem(LS.PURCHASES, JSON.stringify(__purchases||{}));
  localStorage.setItem(LS.REPARTO, JSON.stringify(__reparto||{}));
  updateGlobalStatus();
}
function resetAll(){
  if(confirm('¿Seguro que quieres limpiar todo?')){ localStorage.clear(); location.reload(); }
}
function resetAllButKeepVocab(){
  const vocab = localStorage.getItem(LS.VOCAB) || '';
  if(!confirm('¿Seguro que quieres reiniciar todo (manteniendo vocabulario)?')) return;
  localStorage.clear();
  localStorage.setItem(LS.VOCAB, vocab);
  alert('Reiniciado. El vocabulario se ha conservado.');
  location.reload();
}

/* ===== Autocomplete ===== */
let AC_ACTIVE = null;
let AC_LISTENERS_ATTACHED = false;
function closeAC(){ if (AC_ACTIVE) { AC_ACTIVE.remove(); AC_ACTIVE = null; } }
function ensureACGlobalListeners(){
  if (AC_LISTENERS_ATTACHED) return;
  AC_LISTENERS_ATTACHED = true;
  ['click','scroll','resize','orientationchange'].forEach(ev=>{
    window.addEventListener(ev, (e)=>{
      if (!AC_ACTIVE) return;
      if (ev==='click') {
        if (e.target && AC_ACTIVE.contains(e.target)) return;
      }
      closeAC();
    }, {capture:true, passive:true});
  });
}
function positionACBoxForCell(box, cell){
  const rect = cell.getBoundingClientRect();
  box.style.left = (rect.left + window.scrollX) + 'px';
  box.style.top  = (rect.bottom + window.scrollY) + 'px';
  box.style.width = rect.width + 'px';
}
function attachAutocomplete(cell, onPick){
  ensureACGlobalListeners();
  const reposition = ()=>{ if(AC_ACTIVE) positionACBoxForCell(AC_ACTIVE, cell); };
  cell.addEventListener('input', ()=>{
    const val = stripGenericWords(cell.innerText||'').trim();
    closeAC();
    if(!val) return;
    const vocab = loadVocab();
    const suggestions = vocab.filter(v=> normKey(v).includes(normKey(val))).slice(0,8);
    if(!suggestions.length) return;
    const box = document.createElement('div');
    box.className='ac-box';
    suggestions.forEach(s=>{
      const item = document.createElement('div');
      item.className='ac-item';
      item.textContent = s;
      item.onclick = ()=>{ onPick(s); closeAC(); };
      box.appendChild(item);
    });
    document.body.appendChild(box);
    AC_ACTIVE = box;
    positionACBoxForCell(box, cell);
  });
  cell.addEventListener('keyup', ()=>reposition());
}

/* ===== Tiendas ===== */
function renderTable(code){
  const wrap = byId('tbl_'+code+'_wrap');
  const rows = tiendaState[code]||[];
  if(!rows.length){ wrap.innerHTML=''; return; }
  let html = '<div class="scroll-x"><table><thead><tr><th>Original</th><th>Estandarizado</th><th>Cantidad</th><th>Estado</th></tr></thead><tbody>';
  rows.forEach((r,i)=>{
    html += `<tr>
      <td>${r.o}</td>
      <td contenteditable="true" data-i="${i}" data-f="e" ${r.a? 'class="red"':''}>${r.e}</td>
      <td contenteditable="true" data-i="${i}" data-f="q">${r.q}</td>
      <td>${r.a? '<span class="pill warn">Revisar</span>':'<span class="pill ok">OK</span>'}</td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  wrap.innerHTML = html;

  wrap.querySelectorAll('td[contenteditable]').forEach(cell=>{
    const i = Number(cell.dataset.i);
    const f = cell.dataset.f;
    if(f==='e'){
      attachAutocomplete(cell, (picked)=>{
        cell.innerText = picked;
        tiendaState[code][i].e = picked;
        tiendaState[code][i].a = false;
        cell.classList.remove('red');
        cell.parentElement.querySelector('td:last-child').innerHTML = '<span class="pill ok">OK</span>';
        persistState();
      });
    }
    cell.addEventListener('blur', ()=>{
      const val = cell.innerText.trim();
      if(f==='q'){
        tiendaState[code][i].q = cleanNum(val, 0);
      }else{
        const cleaned = removeDiacriticsUpper(val);
        tiendaState[code][i].e = cleaned;
        const vocab = loadVocab();
        const exact = vocab.find(v=> normKey(v)===normKey(cleaned));
        const tdState = cell.parentElement.querySelector('td:last-child');
        if(exact){ tiendaState[code][i].a=false; cell.classList.remove('red'); tdState.innerHTML='<span class="pill ok">OK</span>'; }
        else { tiendaState[code][i].a=true; cell.classList.add('red'); tdState.innerHTML='<span class="pill warn">Revisar</span>'; }
      }
      persistState();
    });
  });
}

function estandarizar(code){
  const vocab = loadVocab();
  const txt = byId('in_'+code).value;
  const rows = [];
  toLines(txt).forEach(line=>{
    const p = parseLine(line);
    if(!p) return;
    const exact = vocab.find(v=> normKey(v)===normKey(p.name));
    if(exact){ rows.push({o:p.original, e:exact, q:p.qty, a:false}); return; }
    const m = bestMatch(p.name, vocab);
    const chosen = m.name || p.name;
    rows.push({o:p.original, e:chosen, q:p.qty, a:(normKey(chosen)!==normKey(p.name))});
  });
  tiendaState[code] = rows;
  renderTable(code);
  persistState();
  updateGlobalStatus();
}
function guardarTienda(code){
  const out = (tiendaState[code]||[]).map(r=> `${r.e} ${r.q}`).join('\n');
  byId('in_'+code).value = out;
  alert(`Tienda ${code.toUpperCase()} guardada en el textarea.`);
}

/* ===== Global unify ===== */
function unificarGlobal(){
  const all = [].concat(tiendaState.sp||[], tiendaState.sl||[], tiendaState.st||[]);
  const map = new Map();
  all.forEach(r=>{
    const key = normKey(r.e);
    if(!map.has(key)) map.set(key,{name:r.e,total:0});
    map.get(key).total += (Number(r.q)||0);
  });
  const arr = Array.from(map.values()).sort((a,b)=>a.name.localeCompare(b.name,'es'));
  const names = arr.map(x=>x.name);
  const similarSet = new Set();
  for(let i=0;i<names.length;i++){
    for(let j=i+1;j<names.length;j++){
      const s1 = names[i], s2 = names[j];
      const sc = similarityScore(s1, s2);
      if(sc>=0.86 && normKey(s1)!==normKey(s2)){
        similarSet.add(s1); similarSet.add(s2);
      }
    }
  }
  renderGlobalTable(arr, similarSet);
  updateGlobalStatus();
}
function renderGlobalTable(rows, similarSet){
  const visible = rows.filter(r => !assignments[normKey(r.name)]);
  globalRows = visible;
  const wrap = byId('global_wrap');
  if(!visible.length){ wrap.innerHTML='<div class="hint">Sin productos (todo asignado o no unificado).</div>'; return; }
  let html = `
    <div class="hint mb6">Proveedor activo: <b>${ACTIVE_PROV}</b>. Usa ✅ para asignar rápidamente.</div>
    <div class="scroll-x"><table>
      <thead><tr><th></th><th>Producto</th><th>Total</th><th>Estado</th></tr></thead>
      <tbody>`;
  visible.forEach((r,i)=>{
    const isSimilar = similarSet.has(r.name);
    html += `<tr data-i="${i}" class="${isSimilar?'dup':''}">
      <td><button class="ok-assign" data-assign="${i}">✅</button></td>
      <td contenteditable="true" data-f="name">${r.name}${isSimilar?'<span class="flag">⚠️</span>':''}</td>
      <td contenteditable="true" data-f="total">${r.total}</td>
      <td>${isSimilar? '<span class="pill warn">Posible duplicado</span>':'<span class="pill ok">OK</span>'}</td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  wrap.innerHTML = html;

  // Asignar
  wrap.querySelectorAll('[data-assign]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = Number(btn.dataset.assign);
      assignFromGlobal(idx);
    });
  });

  // Edición inline + autocomplete
  wrap.querySelectorAll('td[contenteditable]').forEach(cell=>{
    const tr = cell.parentElement;
    const idx = Number(tr.dataset.i);
    const f = cell.dataset.f;
    if(f==='name'){
      attachAutocomplete(cell, (picked)=>{
        cell.innerText = picked;
        globalRows[idx].name = picked;
        tr.classList.remove('dup');
        tr.querySelector('td:last-child').innerHTML = '<span class="pill ok">OK</span>';
      });
    }
    cell.addEventListener('blur', ()=>{
      const val = cell.innerText.trim();
      if(f==='total'){
        globalRows[idx].total = cleanNum(val, 0);
      }else{
        const cleaned = removeDiacriticsUpper(val);
        globalRows[idx].name = cleaned;
        const vocab = loadVocab();
        const exact = vocab.find(v=> normKey(v)===normKey(cleaned));
        if(exact){
          tr.classList.remove('dup');
          tr.querySelector('td:last-child').innerHTML = '<span class="pill ok">OK</span>';
        }else{
          let dup = false;
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
            tr.querySelector('td:last-child').innerHTML = '<span class="pill ok">OK</span>';
          }
        }
      }
    });
  });
}

function assignFromGlobal(idx){
  const item = globalRows[idx];
  if(!item) return;
  const k = normKey(item.name);
  assignments[k] = ACTIVE_PROV;

  const list = orders[ACTIVE_PROV]||[];
  const exIdx = list.findIndex(x=> normKey(x.name)===k);
  if(exIdx>-1){ list[exIdx].qty += Number(item.total)||0; }
  else{ list.push({name:item.name, qty:Number(item.total)||0}); }
  orders[ACTIVE_PROV] = list;

  persistState();
  unificarGlobal();
  renderProvidersPanels();
  updateGlobalStatus();
}

/* ===== Proveedores ===== */
function buildProvBar(){
  const bar = byId('provBar'); if(!bar) return;
  bar.innerHTML='';
  PROVEEDORES.forEach(p=>{
    const b = document.createElement('button');
    b.className = 'prov-btn' + (p===ACTIVE_PROV?' active':'');
    b.textContent = p;
    b.onclick = ()=>{
      ACTIVE_PROV = p;
      buildProvBar();
      unificarGlobal();
    };
    bar.appendChild(b);
  });
}

let __lastClearedOrders = null;
function showUndoToast(){
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:70px;background:#111827;color:#fff;padding:10px 14px;border-radius:10px;z-index:10000;box-shadow:0 4px 14px rgba(0,0,0,.2);';
  t.innerHTML = 'Pedidos vaciados tras enviar. <button id="undoBtn" style="margin-left:8px;background:#fff;color:#111827;border:0;border-radius:6px;padding:6px 10px;cursor:pointer">Deshacer</button>';
  document.body.appendChild(t);
  document.getElementById('undoBtn').onclick = ()=>{
    if(__lastClearedOrders){
      const {prov, list} = __lastClearedOrders;
      orders[prov] = list;
      __lastClearedOrders = null;
      persistState();
      renderProvidersPanels();
      unificarGlobal();
      updateGlobalStatus();
    }
    t.remove();
  };
  setTimeout(()=>{ if (t.parentNode) t.remove(); }, 9000);
}

function renderProvidersPanels(){
  const cont = byId('provPanels'); if(!cont) return;
  cont.innerHTML='';
  PROVEEDORES.forEach(p=>{
    const list = orders[p]||[];
    const card = document.createElement('div');
    card.className='card';
    const hd = document.createElement('div');
    hd.className='hd';
    hd.innerHTML = `<strong>${p}</strong>
      <div class="toolbar">
        <button class="btn small whats">🟢 WhatsApp</button>
        <button class="btn small muted txtprov">📄 TXT + comprado</button>
      </div>`;
    const bd = document.createElement('div');
    bd.className='bd';

    if(!list.length){
      bd.innerHTML = '<div class="hint">Sin productos asignados.</div>';
    }else{
      let html = '<div class="scroll-x"><table><thead><tr><th>Producto</th><th>Cantidad</th></tr></thead><tbody>';
      list.forEach((it,ix)=>{
        html += `<tr>
          <td contenteditable="true" data-prov="${p}" data-idx="${ix}" data-f="name" class="green">${it.name}</td>
          <td contenteditable="true" data-prov="${p}" data-idx="${ix}" data-f="qty" class="green">${it.qty}</td>
        </tr>`;
      });
      html += '</tbody></table></div>';
      bd.innerHTML = html;

      bd.querySelectorAll('td[contenteditable]').forEach(cell=>{
        const prov = cell.dataset.prov;
        const idx = Number(cell.dataset.idx);
        const f = cell.dataset.f;
        if(f==='name'){
          attachAutocomplete(cell, picked=>{
            cell.innerText = picked;
            orders[prov][idx].name = picked;
            persistState();
          });
        }
        cell.addEventListener('blur', ()=>{
          const val = cell.innerText.trim();
          if(f==='qty'){
            orders[prov][idx].qty = cleanNum(val, 0);
          }else{
            orders[prov][idx].name = removeDiacriticsUpper(val);
          }
          persistState();
        });
      });
    }

    card.appendChild(hd); card.appendChild(bd);
    cont.appendChild(card);

    const btnWhats = hd.querySelector('.btn.whats');
    if(btnWhats){
      btnWhats.onclick = ()=>{
        const txt = getPedidoTexto(p);
        if(!txt){ alert('Sin líneas para enviar.'); return; }
        const url = 'https://wa.me/?text=' + encodeURIComponent(txt);
        pushSentLog({prov: p, when: todayISO(), type: 'whatsapp', lines: (orders[p]||[]).length});
        window.open(url, '_blank');
        marcarCompradoTotalDeProveedor(p, true);
      };
    }
    const btnTxt = hd.querySelector('.btn.txtprov');
    if(btnTxt){
      btnTxt.onclick = ()=>{
        const listNow = (orders[p]||[]);
        if(!listNow.length){ alert('No hay líneas para ' + p); return; }
        const today = new Date().toISOString().split('T')[0];
        const txt = listNow.map(x=> `${x.qty} ${x.name}`).join('\n');
        const blob = new Blob([txt],{type:'text/plain'});
        const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`pedido_${p}_${today}.txt`; a.click();
        pushSentLog({prov: p, when: todayISO(), type: 'txt', lines: (orders[p]||[]).length});
        marcarCompradoTotalDeProveedor(p, true);
      };
    }
  });
  updateGlobalStatus();
}
function getPedidoTexto(prov){
  const list = (orders?.[prov]||[]);
  if(!list.length) return '';
  let out = `PEDIDO ${prov}\n`;
  list.forEach(it=>{ out += `- ${cleanNum(it.qty,0)} ${it.name}\n`; });
  return out.trim();
}
function marcarCompradoTotalDeProveedor(prov, vaciarDespues = false){
  if(!Array.isArray(__purchases[prov])) __purchases[prov]=[];
  (orders?.[prov]||[]).forEach(it=>{
    const idx = __purchases[prov].findIndex(x=> normKey(x.name) === normKey(it.name));
    if (idx>-1) __purchases[prov][idx].purchased = cleanNum(it.qty, 0);
    else __purchases[prov].push({name: it.name, purchased: cleanNum(it.qty, 0)});
  });
  if(vaciarDespues){
    __lastClearedOrders = {prov, list: (orders[prov]||[]).map(x=>({...x}))};
    orders[prov] = [];
    showUndoToast();
  }
  persistState();
  renderProvidersPanels();
  if(byId('btn-compras')?.classList.contains('active')) renderCompras();
  if(byId('btn-reparto')?.classList.contains('active')) renderReparto();
  alert(`Pedido de ${prov} marcado como COMPRADO y retirado del panel de pedidos.`);
}

/* ===== Export global ===== */
function copiarGlobal(){
  if(!globalRows.length) return;
  const txt = globalRows.map(r=>`- ${r.total} ${r.name}`).join('\n');
  navigator.clipboard.writeText(txt);
  alert('Lista global copiada.');
}
function exportarGlobalTXT(){
  if(!globalRows.length){ alert('No hay datos.'); return; }
  const today = new Date().toISOString().split('T')[0];
  const txt = globalRows.map(r=>`${r.total}\t${r.name}`).join('\n');
  const blob = new Blob([txt],{type:'text/plain'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`lista_global_${today}.txt`; a.click();
}
function exportarGlobalXLSX(){
  if(!globalRows.length){ alert('No hay datos.'); return; }
  const today = new Date().toISOString().split('T')[0];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([['Producto','Total'], ...globalRows.map(r=>[r.name,r.total])]);
  XLSX.utils.book_append_sheet(wb, ws, 'Global');
  XLSX.writeFile(wb, `lista_global_${today}.xlsx`);
}
function exportResumenGlobalTXT(){
  const all = [].concat(tiendaState.sp||[], tiendaState.sl||[], tiendaState.st||[]);
  const totalMap = {};
  all.forEach(r=>{
    const k = normKey(r.e);
    if(!totalMap[k]) totalMap[k] = {name:r.e, total:0};
    totalMap[k].total += (Number(r.q)||0);
  });
  const byProv = {}; PROVEEDORES.forEach(p=>byProv[p]=[]);
  const unassigned = [];
  Object.values(totalMap).forEach(it=>{
    const k = normKey(it.name);
    const prov = assignments[k];
    if(prov && PROVEEDORES.includes(prov)){
      byProv[prov].push({name:it.name, qty:it.total});
    }else{
      unassigned.push({name:it.name, qty:it.total});
    }
  });
  let out = `📦 PEDIDOS POR PROVEEDOR\n\n`;
  PROVEEDORES.forEach(p=>{
    out += `> ${p}:\n`;
    if(byProv[p].length){
      byProv[p].sort((a,b)=>a.name.localeCompare(b.name,'es'));
      byProv[p].forEach(x=>{ out += `- ${x.qty} ${x.name}\n`; });
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
  const blob = new Blob([out],{type:'text/plain'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`resumen_pedidos_${today}.txt`; a.click();
}

/* ===== Compras ===== */
function renderCompras(){
  const cont = byId('compras-wrap'); if(!cont) return;
  const purchases = __purchases || {};
  let html = '<table><thead><tr><th>Proveedor</th><th>Producto</th><th>Comprado</th><th>Acciones</th></tr></thead><tbody>';
  const vendors = PROVEEDORES||[];
  vendors.forEach(p=>{
    const list = purchases[p]||[];
    if(!list.length){
      html += `<tr><td>${p}</td><td colspan="3" class="hint">Sin compras</td></tr>`;
    }else{
      list.forEach((it,ix)=>{
        html += `<tr data-prov="${p}" data-idx="${ix}">
          <td>${p}</td>
          <td contenteditable="true" class="c-name">${it.name}</td>
          <td><input class="c-qty" type="number" min="0" step="0.01" value="${cleanNum(it.purchased,0)}" style="width:100px"></td>
          <td>
            <button class="btn small muted c-save">Guardar</button>
            <button class="btn small c-del">Eliminar</button>
          </td>
        </tr>`;
      });
    }
  });
  html += '</tbody></table>';

  // Panel sin proveedor
  const sinProv = unassignedTotals();
  html += `<div class="card" style="margin-top:10px">
    <div class="hd"><strong>🛒 Sin proveedor asignado</strong></div>
    <div class="bd">${
      sinProv.length? `
      <table><thead><tr><th>Producto</th><th>Solicitado</th><th>Comprado</th><th></th></tr></thead><tbody>
        ${sinProv.map((it,ix)=>`
          <tr data-sp-name="${it.name}">
            <td class="c-name" contenteditable="true">${it.name}</td>
            <td>${it.qty}</td>
            <td><input class="c-qty" type="number" min="0" step="0.01" value="0" style="width:110px"></td>
            <td><button class="btn small">Guardar</button></td>
          </tr>
        `).join('')}
      </tbody></table>` : `<div class="hint">No hay productos sin asignar.</div>`
    }</div>
  </div>`;

  cont.innerHTML = html;

  // Handlers compras por proveedor
  cont.querySelectorAll('.c-save').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const tr = btn.closest('tr');
      const p = tr.dataset.prov, ix = Number(tr.dataset.idx);
      const name = tr.querySelector('.c-name').innerText.trim();
      const qty  = cleanNum(tr.querySelector('.c-qty').value, 0);
      __purchases[p][ix] = {name, purchased:qty};
      persistState();
      renderCompras();
      renderReparto();
    });
  });
  cont.querySelectorAll('.c-del').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const tr = btn.closest('tr');
      const p = tr.dataset.prov, ix = Number(tr.dataset.idx);
      __purchases[p].splice(ix,1);
      persistState();
      renderCompras();
      renderReparto();
    });
  });

  // Guardar compras sin proveedor
  cont.querySelectorAll('tr[data-sp-name]').forEach(tr=>{
    const nameEl = tr.querySelector('.c-name');
    const qtyEl  = tr.querySelector('.c-qty');
    const btn    = tr.querySelector('.btn');
    btn.addEventListener('click', ()=>{
      const name = removeDiacriticsUpper(nameEl.innerText.trim());
      const qty  = cleanNum(qtyEl.value, 0);
      if(!Array.isArray(__purchases['_SIN_PROV_'])) __purchases['_SIN_PROV_']=[];
      const idx = __purchases['_SIN_PROV_'].findIndex(x=> normKey(x.name)===normKey(name));
      if(idx>-1) __purchases['_SIN_PROV_'][idx].purchased = qty;
      else __purchases['_SIN_PROV_'].push({name, purchased:qty});
      persistState();
      alert('Compra guardada sin proveedor.');
      renderCompras();
      renderReparto();
    });
  });

  // Acciones barra
  byId('compras-add').onclick = ()=>{
    const prov = prompt('Proveedor (exacto como en la lista):\n' + (PROVEEDORES||[]).join(', '));
    if(!prov){return;}
    const name = prompt('Producto (usa nombres del diccionario si es posible):');
    if(!name){return;}
    const qty = cleanNum(prompt('Cantidad comprada:')||'0', 0);
    if(!__purchases[prov]) __purchases[prov]=[];
    __purchases[prov].push({name:removeDiacriticsUpper(name), purchased:qty});
    persistState();
    renderCompras();
    renderReparto();
  };
  byId('compras-sync').onclick = ()=>{
    persistState();
    alert('Sincronizado.');
  };

  updateGlobalStatus();
}
function totalSolicitadoPorNombre(){
  const all = [].concat(tiendaState.sp||[], tiendaState.sl||[], tiendaState.st||[]);
  const map = {};
  all.forEach(r=>{
    const k = normKey(r.e);
    map[k] = (map[k]||0) + (Number(r.q)||0);
  });
  const byName={};
  Object.keys(map).forEach(k=>{
    const row = all.find(r=>normKey(r.e)===k);
    byName[row?row.e:k] = map[k];
  });
  return byName;
}
function unassignedTotals(){
  const totals = totalSolicitadoPorNombre();
  const out = [];
  Object.keys(totals).forEach(name=>{
    const k = normKey(name);
    const prov = (assignments||{})[k];
    if(!prov){ out.push({name, qty: Number(totals[name])||0}); }
  });
  out.sort((a,b)=>a.name.localeCompare(b.name,'es'));
  return out;
}

/* ===== Reparto ===== */
function solicitadoPorTienda(name){
  const nk = normKey(name);
  const S = {sp:0, sl:0, st:0};
  (tiendaState?.sp||[]).forEach(r=>{ if(normKey(r.e)===nk) S.sp += Number(r.q)||0; });
  (tiendaState?.sl||[]).forEach(r=>{ if(normKey(r.e)===nk) S.sl += Number(r.q)||0; });
  (tiendaState?.st||[]).forEach(r=>{ if(normKey(r.e)===nk) S.st += Number(r.q)||0; });
  return S;
}
function totalComprado(){
  const map={};
  (PROVEEDORES||[]).forEach(p=>{
    (__purchases[p]||[]).forEach(it=>{
      map[it.name] = (map[it.name]||0) + (Number(it.purchased)||0);
    });
  });
  (__purchases['_SIN_PROV_']||[]).forEach(it=>{
    map[it.name] = (map[it.name]||0) + (Number(it.purchased)||0);
  });
  return map;
}
function totalSolicitado(){
  const all = [].concat(tiendaState?.sp||[], tiendaState?.sl||[], tiendaState?.st||[]);
  const map = {};
  all.forEach(r=>{
    const k = normKey(r.e);
    map[k] = (map[k]||0) + (Number(r.q)||0);
  });
  const byName={};
  Object.keys(map).forEach(k=>{
    const row = all.find(r=>normKey(r.e)===k);
    byName[row?row.e:k] = map[k];
  });
  return byName;
}
function calcularRepartoSugerido(name, comp){
  const base = solicitadoPorTienda(name);
  const totalBase = +(base.sp + base.sl + base.st).toFixed(2);
  const comprado = +(Number(comp)||0).toFixed(2);
  if(comprado <= 0){
    return {tipo: 'sin_stock', objetivo: {sp:0, sl:0, st:0}, exceso: 0, factor: 0};
  }
  if(comprado < totalBase && totalBase > 0){
    const f = +(comprado / totalBase).toFixed(6);
    return {tipo: 'deficit', objetivo: {sp:+(base.sp*f).toFixed(2), sl:+(base.sl*f).toFixed(2), st:+(base.st*f).toFixed(2)}, exceso:0, factor:f};
  }
  if(comprado === totalBase){
    return {tipo: 'exacto', objetivo: {sp:+(base.sp).toFixed(2), sl:+(base.sl).toFixed(2), st:+(base.st).toFixed(2)}, exceso:0, factor:1};
  }
  const exceso = +(comprado - totalBase).toFixed(2);
  return {tipo:'exceso', objetivo:{sp:+(base.sp + exceso*0.50).toFixed(2), sl:+(base.sl + exceso*0.20).toFixed(2), st:+(base.st + exceso*0.30).toFixed(2)}, exceso, factor:1};
}
function renderReparto(){
  const cont = byId('reparto-wrap'); if(!cont) return;
  const comprado = totalComprado();
  const solicitadoTotal = totalSolicitado();
  const productos = Object.keys(comprado).sort((a,b)=>a.localeCompare(b,'es'));
  if(!productos.length){ cont.innerHTML = '<div class="hint">No hay productos comprados todavía.</div>'; updateGlobalStatus(); return;}
  let html = '<table><thead><tr><th>Producto</th><th>Comprado</th><th>Solicitado total</th><th>Restante global</th><th>San Pablo</th><th>San Lesmes</th><th>Santiago</th><th></th></tr></thead><tbody>';
  productos.forEach(name=>{
    const comp = +(Number(comprado[name])||0).toFixed(2);
    const sol  = +(Number(solicitadoTotal[name])||0).toFixed(2);
    if(comp<=0) return;
    const suger = calcularRepartoSugerido(name, comp);
    const objetivo = suger.objetivo;
    const curEnt = __reparto[name] || {sp:0, sl:0, st:0};
    const cap = { sp: Math.min(curEnt.sp||0, objetivo.sp), sl: Math.min(curEnt.sl||0, objetivo.sl), st: Math.min(curEnt.st||0, objetivo.st) };
    if(!__reparto[name]) __reparto[name] = {sp:0, sl:0, st:0};
    __reparto[name] = cap; persistState();
    const pend = { sp: +(Math.max(0, objetivo.sp - cap.sp)).toFixed(2), sl: +(Math.max(0, objetivo.sl - cap.sl)).toFixed(2), st: +(Math.max(0, objetivo.st - cap.st)).toFixed(2) };
    const entregadoTotal = +(cap.sp + cap.sl + cap.st).toFixed(2);
    const restGlobal = Math.max(0, +(comp - entregadoTotal).toFixed(2));
    const pendienteTotal = +(pend.sp + pend.sl + pend.st).toFixed(2);
    if(pendienteTotal<=0 && restGlobal<=0){ return; }
    const badgeModo = (()=>{
      if(suger.tipo==='deficit') return '<span class="pill warn">Déficit: reparto proporcional a pedido</span>';
      if(suger.tipo==='exceso')  return '<span class="pill ok">Excedente: +50/20/30</span>';
      if(suger.tipo==='exacto')  return '<span class="pill ok">Exacto a lo pedido</span>';
      return '<span class="pill">Sin stock</span>';
    })();
    html += `<tr data-name="${name}">
      <td><div style="display:flex;flex-direction:column;gap:4px"><div>${name}</div><div>${badgeModo}</div></div></td>
      <td>${comp}</td><td>${sol}</td><td>${restGlobal}</td>
      <td><div class="flexline"><button class="btn small muted r-dec" data-t="sp">–</button><span class="pill">Entregado: ${cap.sp} / Obj: ${objetivo.sp} (pend: ${pend.sp})</span></div></td>
      <td><div class="flexline"><button class="btn small muted r-dec" data-t="sl">–</button><span class="pill">Entregado: ${cap.sl} / Obj: ${objetivo.sl} (pend: ${pend.sl})</span></div></td>
      <td><div class="flexline"><button class="btn small muted r-dec" data-t="st">–</button><span class="pill">Entregado: ${cap.st} / Obj: ${objetivo.st} (pend: ${pend.st})</span></div></td>
      <td><div class="flexline"><button class="btn small" data-completar="${name}">✅ Completar</button>${suger.tipo==='exceso' ? `<button class="btn small muted ex-btn">➕ Excedente</button>` : ''}</div></td>
    </tr>`;
  });
  html += '</tbody></table>';
  cont.innerHTML = html;

  cont.querySelectorAll('.r-dec').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const tr = btn.closest('tr');
      const name = tr.dataset.name;
      const tienda = btn.dataset.t;
      const comp = +(Number(totalComprado()[name])||0).toFixed(2);
      const suger = calcularRepartoSugerido(name, comp);
      const obj = suger.objetivo;
      const cur = __reparto[name] || {sp:0,sl:0,st:0};
      const entregadoTotal = +( (cur.sp||0)+(cur.sl||0)+(cur.st||0) ).toFixed(2);
      const restGlobal = Math.max(0, +(comp - entregadoTotal).toFixed(2));
      const pendienteTienda = Math.max(0, +(obj[tienda] - (cur[tienda]||0)).toFixed(2));
      if(restGlobal<=0 || pendienteTienda<=0) return;
      const inc = Math.min(1, pendienteTienda, restGlobal);
      __reparto[name] = {...cur, [tienda]: +( (cur[tienda]||0) + inc ).toFixed(2)};
      persistState();
      renderReparto();
    });
  });

  cont.querySelectorAll('.ex-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const tr = btn.closest('tr');
      const name = tr.dataset.name;
      const comp = +(Number(totalComprado()[name])||0).toFixed(2);
      const suger = calcularRepartoSugerido(name, comp);
      if(suger.tipo!=='exceso') return;
      let cur = __reparto[name] || {sp:0,sl:0,st:0};
      const obj = suger.objetivo;
      let restGlobal = Math.max(0, +(comp - (cur.sp+cur.sl+cur.st)).toFixed(2));
      ['sp','sl','st'].forEach(t=>{
        if(restGlobal<=0) return;
        const pend = Math.max(0, +(obj[t] - (cur[t]||0)).toFixed(2));
        if(pend>0){
          const inc = Math.min(pend, restGlobal);
          cur = {...cur, [t]: +((cur[t]||0)+inc).toFixed(2)};
          restGlobal = +(restGlobal - inc).toFixed(2);
        }
      });
      __reparto[name] = cur;
      persistState();
      renderReparto();
    });
  });

  cont.querySelectorAll('[data-completar]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const name = btn.dataset.completar;
      marcarTodoEntregado(name);
    });
  });

  byId('reparto-save').onclick = ()=>{
    persistState();
    alert('Reparto guardado.');
  };

  updateGlobalStatus();
}
function marcarTodoEntregado(name){
  const comp = +(Number(totalComprado()[name])||0).toFixed(2);
  const suger = calcularRepartoSugerido(name, comp);
  const obj = suger.objetivo;
  const cur = __reparto[name] || {sp:0,sl:0,st:0};
  let restGlobal = Math.max(0, +(comp - ((cur.sp||0)+(cur.sl||0)+(cur.st||0))).toFixed(2));
  const out = {...cur};
  ['sp','sl','st'].forEach(t=>{
    const pend = Math.max(0, +(obj[t] - (out[t]||0)).toFixed(2));
    if(pend>0 && restGlobal>0){
      const inc = Math.min(pend, restGlobal);
      out[t] = +((out[t]||0) + inc).toFixed(2);
      restGlobal = +(restGlobal - inc).toFixed(2);
    }
  });
  __reparto[name] = out;
  persistState();
  renderReparto();
}

/* ===== Precios ===== */
function productosCompradosPorProveedor(){
  const out = {}; (PROVEEDORES||[]).forEach(p=> out[p]=[]);
  const purchases = __purchases||{};
  Object.keys(purchases).forEach(prov=>{
    (purchases[prov]||[]).forEach(it=>{
      if(prov==='_SIN_PROV_') return;
      if((Number(it.purchased)||0)<=0) return;
      if(!out[prov]) out[prov]=[];
      const exists = out[prov].some(x=> normKey(x.name)===normKey(it.name));
      if(!exists) out[prov].push({name:it.name});
    });
  });
  return out;
}
function renderPrecios(){
  const cont = byId('precios-wrap'); if(!cont) return;
  const prices = getPrices();
  const data = productosCompradosPorProveedor();
  let html = '';
  const provs = Object.keys(data);
  if(!provs.length){ cont.innerHTML = '<div class="hint">No hay productos comprados todavía.</div>'; return; }
  provs.forEach(prov=>{
    const list = data[prov]||[];
    html += `<div class="card mb8">
      <div class="hd"><strong>${prov}</strong></div>
      <div class="bd">`;
    if(!list.length){
      html += `<div class="hint">Sin productos comprados para ${prov}.</div>`;
    }else{
      html += `<table><thead><tr><th>Producto</th><th>Precio anterior</th><th>Precio nuevo</th><th>Acción</th></tr></thead><tbody>`;
      list.sort((a,b)=>a.name.localeCompare(b.name,'es')).forEach((it)=>{
        const k = priceKey(prov, it.name);
        const prev = prices[k]?.price ?? '';
        html += `<tr data-prov="${prov}" data-name="${it.name}">
          <td>${it.name}</td>
          <td>${prev!==''? prev : '<span class="hint">—</span>'}</td>
          <td><input class="p-new" type="number" min="0" step="0.01" value="${prev!==''?prev:''}" style="width:130px"></td>
          <td>
            <button class="btn small muted p-save">Guardar</button>
            <button class="btn small p-equal">✅ Igual</button>
          </td>
        </tr>`;
      });
      html += `</tbody></table>`;
    }
    html += `</div></div>`;
  });
  cont.innerHTML = html;

  cont.querySelectorAll('.p-save').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const tr = btn.closest('tr');
      const prov = tr.dataset.prov;
      const name = tr.dataset.name;
      const val  = Number(tr.querySelector('.p-new').value);
      const k = priceKey(prov, name);
      const obj = getPrices();
      obj[k] = {prov, name, price: isFinite(val)? val : null};
      setPrices(obj);
      alert('Precio guardado.');
      updateGlobalStatus();
    });
  });
  cont.querySelectorAll('.p-equal').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const tr = btn.closest('tr');
      const prov = tr.dataset.prov;
      const name = tr.dataset.name;
      const k = priceKey(prov, name);
      const obj = getPrices();
      tr.querySelector('.p-new').value = (obj[k] && obj[k].price!=null) ? obj[k].price : '';
      tr.style.background = '#f6ffed';
    });
  });

  byId('precios-save').onclick = ()=> alert('Los cambios de precio por fila ya quedan guardados al pulsar "Guardar".');

  byId('precios-send').onclick = ()=>{
    const obj = getPrices();
    const changesByProv = {};
    document.querySelectorAll('#precios-wrap tr[data-prov]').forEach(tr=>{
      const prov = tr.dataset.prov;
      const name = tr.dataset.name;
      const inputVal = tr.querySelector('.p-new').value;
      if(inputVal==='') return;
      const newPrice = Number(inputVal);
      if(!isFinite(newPrice)) return;
      const k = priceKey(prov, name);
      const prev = obj[k]?.price ?? null;
      if(prev===null || Number(prev) !== newPrice){
        if(!changesByProv[prov]) changesByProv[prov] = [];
        changesByProv[prov].push({name, prev, next:newPrice});
        obj[k] = {prov, name, price:newPrice};
      }
    });
    setPrices(obj);
    if(!Object.keys(changesByProv).length){
      alert('No hay cambios de precio para enviar.');
      return;
    }
    Object.keys(changesByProv).forEach(prov=>{
      const lines = changesByProv[prov].map(r=>{
        const prevTxt = (r.prev===null || r.prev===undefined || r.prev==='')? '—' : r.prev;
        return `- ${r.name}: ${prevTxt} → ${r.next}`;
      }).join('\n');
      const msg = `CAMBIOS DE PRECIOS (${prov})\n${lines}`;
      const url = 'https://wa.me/?text=' + encodeURIComponent(msg);
      window.open(url, '_blank');
    });
    updateGlobalStatus();
  };
}

/* ===== Estado Global Bar ===== */
function updateGlobalStatus(){
  const all = [].concat(tiendaState.sp||[], tiendaState.sl||[], tiendaState.st||[]);
  const totalMap = {};
  all.forEach(r=>{
    const k = normKey(r.e);
    if(!totalMap[k]) totalMap[k] = {name:r.e, total:0};
    totalMap[k].total += (Number(r.q)||0);
  });
  const unassignedKeys = Object.keys(totalMap).filter(k=> !assignments[k]);
  const sinAsignar = unassignedKeys.length;

  const sentToday = getSentLog().filter(x=>x.when===todayISO());
  const pedidosEnviados = sentToday.length;

  let compradosUds = 0;
  Object.values(__purchases||{}).forEach(list=>{
    (list||[]).forEach(it=> compradosUds += (Number(it.purchased)||0));
  });

  let lineasOrders = 0;
  Object.values(orders||{}).forEach(list=> lineasOrders += (list||[]).length);
  let lineasCompradas = 0;
  Object.values(__purchases||{}).forEach(list=> lineasCompradas += (list||[]).filter(it=> (Number(it.purchased)||0)>0).length);
  const sinComprar = Math.max(0, lineasOrders - lineasCompradas);

  let pendienteReparto = 0;
  const compradoPorNombre = totalComprado();
  Object.keys(compradoPorNombre).forEach(name=>{
    const entreg = __reparto[name] ? (Number(__reparto[name].sp||0)+Number(__reparto[name].sl||0)+Number(__reparto[name].st||0)) : 0;
    const rest = Math.max(0, Number(compradoPorNombre[name]) - entreg);
    pendienteReparto += rest;
  });

  const pricesObj = getPrices();
  let cambiosPrecio = 0;
  const compradosProv = productosCompradosPorProveedor();
  Object.keys(compradosProv).forEach(prov=>{
    compradosProv[prov].forEach(it=>{
      const k = priceKey(prov, it.name);
      if(!(k in pricesObj)) cambiosPrecio++;
    });
  });

  byId('status-assign').textContent = `🧾 Sin asignar: ${sinAsignar}`;
  byId('status-buy').textContent = `🛒 Sin comprar: ${sinComprar}`;
  byId('status-sent').textContent = `✅ Pedidos enviados: ${pedidosEnviados}`;
  byId('status-bought').textContent = `📦 Comprados: ${compradosUds} uds`;
  byId('status-distribute').textContent = `🚚 Reparto pendiente: ${pendienteReparto}`;
  byId('status-prices').textContent = `📊 Cambios precio: ${cambiosPrecio}`;
}

/* ===== INIT & UI bindings ===== */
function renderButtonsAndFixes(){
  // Topline buttons
  byId('vocab-add').onclick = ()=>{
    const entry = prompt("Introduce nuevo producto (uno por línea si son varios):");
    if(!entry) return;
    const current = toLines(byId('vocabTxt').value);
    const added = toLines(entry);
    const merged = uniqueVocab(current.concat(added));
    byId('vocabTxt').value = merged.join('\n');
    saveVocab();
  };
  byId('vocab-save').onclick = saveVocab;
  byId('all-reset').onclick = resetAll;
  byId('all-reset-keep').onclick = resetAllButKeepVocab;

  // Tiendas toolbar
  document.querySelectorAll('[data-est]').forEach(b=>{
    b.onclick = ()=> estandarizar(b.dataset.est);
  });
  document.querySelectorAll('[data-guardar]').forEach(b=>{
    b.onclick = ()=> guardarTienda(b.dataset.guardar);
  });
  document.querySelectorAll('[data-txt]').forEach(b=>{
    b.onclick = ()=> exportarTiendaTXT_Fix(b.dataset.txt);
  });

  // Global toolbar
  byId('btn-unificar').onclick = unificarGlobal;
  byId('btn-txt-global').onclick = exportarGlobalTXT;
  byId('btn-xlsx-global').onclick = exportarGlobalXLSX;
  byId('btn-resumen-global').onclick = exportResumenGlobalTXT;
  byId('btn-copiar-global').onclick = copiarGlobal;

  // Tabbar
  byId('btn-dic').onclick = ()=> showTab('dic');
  byId('btn-tiendas').onclick = ()=> showTab('tiendas');
  byId('btn-global').onclick = ()=> showTab('global');
  byId('btn-proveedores').onclick = ()=> showTab('proveedores');
  byId('btn-compras').onclick = ()=> showTab('compras');
  byId('btn-reparto').onclick = ()=> showTab('reparto');
  byId('btn-precios').onclick = ()=> showTab('precios');
}

/* ===== Extensiones integradas ===== */

/* WhatsApp por tienda + TXT fix */
function generarTextoTienda(code){
  const data = window.tiendaState?.[code] || [];
  if(!data.length){
    alert('No hay lista estandarizada para esta tienda.');
    return '';
  }
  const nombre = code==='sp'?'SAN PABLO':(code==='sl'?'SAN LESMES':'SANTIAGO');
  const lines = data.map(r=>`- ${r.q} ${r.e}`).join('\n');
  return `🏪 ${nombre}\n\n${lines}`;
}
function enviarListaWhats(code){
  const msg = generarTextoTienda(code);
  if(!msg) return;
  const url = 'https://wa.me/?text=' + encodeURIComponent(msg);
  window.open(url,'_blank');
}
function exportarTiendaTXT_Fix(code){
  const msg = generarTextoTienda(code);
  if(!msg) return;
  const today = new Date().toISOString().split('T')[0];
  const nombre = code==='sp'?'san_pablo':(code==='sl'?'san_lesmes':'santiago');
  const blob = new Blob([msg],{type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `lista_${nombre}_${today}.txt`;
  a.click();
}
// Inserta botón Whats en cada tienda al cargar UI
function ensureWhatsButtonsForStores(){
  ['sp','sl','st'].forEach(code=>{
    const card = document.querySelector(`#tbl_${code}_wrap`)?.closest('.card');
    if(!card) return;
    const toolbar = card.querySelector('.toolbar');
    if(!toolbar) return;
    if(!toolbar.querySelector('.btn.whats-ti')){
      const btnW = document.createElement('button');
      btnW.className = 'btn small whats-ti';
      btnW.textContent = '🟢 WhatsApp';
      btnW.style.marginLeft = '4px';
      toolbar.appendChild(btnW);
      btnW.addEventListener('click', ()=> enviarListaWhats(code));
    }
  });
}

/* Enviar Reparto WhatsApp con fecha */
function addRepartoWhatsButton(){
  const toolbar = document.querySelector('#tab-reparto .toolbar');
  if(toolbar && !document.getElementById('reparto-send')){
    const btn = document.createElement('button');
    btn.className = 'btn small muted';
    btn.id = 'reparto-send';
    btn.textContent = '📱 Enviar reparto WhatsApp';
    toolbar.appendChild(btn);
    btn.addEventListener('click', sendRepartoWhatsApp);
  }
}
function sendRepartoWhatsApp(){
  const rep = window.__reparto || {};
  const fecha = new Date().toISOString().slice(0,10);
  const tiendas = {
    sp: { nombre: "🏪 San Pablo", items: [] },
    sl: { nombre: "🏪 San Lesmes", items: [] },
    st: { nombre: "🏪 Santiago", items: [] }
  };
  Object.entries(rep).forEach(([name, dist])=>{
    ['sp','sl','st'].forEach(t=>{
      const qty = cleanNum(dist[t]||0,0);
      if(qty>0){ tiendas[t].items.push({name, qty}); }
    });
  });
  let texto = `🚚 REPARTO GLOBAL – ${fecha}\n\n`;
  Object.values(tiendas).forEach(t=>{
    if(t.items.length){
      texto += `${t.nombre}\n`;
      t.items.sort((a,b)=>a.name.localeCompare(b.name,'es'));
      t.items.forEach(it=>{ texto += `- ${it.qty} ${it.name}\n`; });
      texto += `\n`;
    }
  });
  if(texto.trim() === `🚚 REPARTO GLOBAL – ${fecha}`){
    alert("No hay productos repartidos todavía.");
    return;
  }
  const url = "https://wa.me/?text=" + encodeURIComponent(texto.trim());
  window.open(url, "_blank");
}

/* Reparto provisional */
function addRepartoProvisionalButton(){
  const toolbar = document.querySelector('#tab-reparto .toolbar');
  if(toolbar && !document.getElementById('reparto-prov')){
    const btnProv = document.createElement('button');
    btnProv.className = 'btn small muted';
    btnProv.id = 'reparto-prov';
    btnProv.textContent = '🧮 Reparto provisional';
    toolbar.prepend(btnProv);
    btnProv.addEventListener('click', generarRepartoProvisional);
  }
}
function generarRepartoProvisional(){
  const cont = document.getElementById('reparto-wrap');
  if(!cont) return;
  const sp = window.tiendaState?.sp || [];
  const sl = window.tiendaState?.sl || [];
  const st = window.tiendaState?.st || [];
  const all = [].concat(sp, sl, st);
  if(!all.length){ alert("No hay productos pedidos todavía."); return; }
  const totals = {};
  all.forEach(r=>{
    const k = normKey(r.e);
    if(!totals[k]) totals[k] = { name: r.e, sp:0, sl:0, st:0 };
    if(sp.includes(r)) totals[k].sp += Number(r.q)||0;
    if(sl.includes(r)) totals[k].sl += Number(r.q)||0;
    if(st.includes(r)) totals[k].st += Number(r.q)||0;
  });
  const productos = Object.values(totals).sort((a,b)=>a.name.localeCompare(b.name,'es'));
  if(!productos.length){ alert("No hay datos para generar el reparto provisional."); return; }
  let html = '<table><thead><tr><th>Producto</th><th>San Pablo</th><th>San Lesmes</th><th>Santiago</th><th>Total</th></tr></thead><tbody>';
  productos.forEach(p=>{
    const total = +(p.sp+p.sl+p.st).toFixed(2);
    html += `<tr><td>${p.name}</td><td>${p.sp}</td><td>${p.sl}</td><td>${p.st}</td><td>${total}</td></tr>`;
  });
  html += '</tbody></table>';
  cont.innerHTML = `<div class="hint mb6">📋 Reparto provisional (según pedidos, sin compras registradas)</div>${html}`;
}

/* Auto-compras + marcar todo comprado */
function addComprasMarkAllButton(){
  const comprasToolbar = document.querySelector('#tab-compras .toolbar');
  if(comprasToolbar && !document.getElementById('compras-markall')){
    const btnAll = document.createElement('button');
    btnAll.className = 'btn small';
    btnAll.id = 'compras-markall';
    btnAll.textContent = '✅ Marcar todo como comprado';
    comprasToolbar.appendChild(btnAll);
    btnAll.addEventListener('click', marcarTodoComprado);
  }
}
function autocompletarComprasDesdePedidos(){
  const o = window.orders || {};
  const p = window.__purchases || {};
  Object.keys(o).forEach(prov=>{
    if(!Array.isArray(o[prov])) return;
    if(!Array.isArray(p[prov])) p[prov] = [];
    o[prov].forEach(it=>{
      const k = normKey(it.name);
      const idx = p[prov].findIndex(x=> normKey(x.name)===k);
      if(idx===-1){ p[prov].push({ name: it.name, purchased: Number(it.qty)||0 }); }
    });
  });
  window.__purchases = p;
  persistState();
}
function marcarTodoComprado(){
  if(!confirm('¿Marcar todas las líneas como compradas según lo solicitado?')) return;
  const o = window.orders || {};
  const p = window.__purchases || {};
  Object.keys(o).forEach(prov=>{
    if(!Array.isArray(o[prov])) return;
    p[prov] = o[prov].map(it=>({ name: it.name, purchased: Number(it.qty)||0 }));
  });
  window.__purchases = p;
  persistState();
  alert('✅ Todas las líneas marcadas como compradas.\nYa puedes generar el reparto final.');
  renderCompras();
  renderReparto();
}

/* Cierre diario + precios automáticos */
function addCloseDayButton(){
  const bar = document.querySelector('.container');
  if(bar && !document.getElementById('closeDayBtn')){
    const btn = document.createElement('button');
    btn.id = 'closeDayBtn';
    btn.className = 'btn';
    btn.style.marginTop = '14px';
    btn.textContent = '🕒 Cerrar día (precios + reinicio)';
    btn.onclick = cerrarDia;
    bar.appendChild(btn);
  }
}
function cerrarDia(){
  if(!confirm('¿Deseas cerrar el día, revisar precios y reiniciar para mañana?')) return;
  const compras = window.__purchases || {};
  const productos = [];
  Object.values(compras).forEach(list=>{
    (list||[]).forEach(it=>{
      if(it.name && Number(it.purchased)>0){
        const nk = normKey(it.name);
        if(!productos.find(x=>normKey(x.name)===nk))
          productos.push({name: it.name});
      }
    });
  });
  if(!productos.length){ alert('No hay productos comprados hoy.'); return; }
  const modal = document.createElement('div');
  modal.style.cssText = `position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center;`;
  modal.innerHTML = `
    <div style="background:#fff;padding:20px;border-radius:12px;max-height:80%;overflow:auto;width:90%;max-width:480px;">
      <h3>💶 Precios de compra del día</h3>
      <p style="font-size:13px;color:#555">Introduce el precio de compra. El sistema aplicará automáticamente +40 % como precio de venta.</p>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr><th style="text-align:left">Producto</th><th>Compra (€)</th><th>Acción</th></tr></thead>
        <tbody id="preciosDiaBody"></tbody>
      </table>
      <div style="margin-top:12px;text-align:right">
        <button class="btn muted" id="cancelClose">Cancelar</button>
        <button class="btn" id="finalizarClose">Finalizar y generar texto</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const body = modal.querySelector('#preciosDiaBody');
  productos.sort((a,b)=>a.name.localeCompare(b.name,'es'));
  body.innerHTML = productos.map(p=>`
    <tr data-name="${p.name}">
      <td>${p.name}</td>
      <td><input type="number" min="0" step="0.01" style="width:100px"></td>
      <td><button class="btn small muted igual">✅ Igual</button></td>
    </tr>
  `).join('');
  const precios = getPrices();
  body.querySelectorAll('.igual').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const tr = btn.closest('tr');
      const name = tr.dataset.name;
      const found = Object.values(precios).find(x=>normKey(x.name)===normKey(name));
      if(found) tr.querySelector('input').value = found.price;
    });
  });
  modal.querySelector('#cancelClose').onclick = ()=> modal.remove();
  modal.querySelector('#finalizarClose').onclick = ()=>{
    const rows = Array.from(body.querySelectorAll('tr'));
    const newPrices = {};
    const lines = [];
    rows.forEach(tr=>{
      const name = tr.dataset.name;
      const val = Number(tr.querySelector('input').value);
      if(!isFinite(val)||val<=0) return;
      const venta = +(val * 1.4).toFixed(2);
      newPrices[priceKey('GLOBAL',name)] = {prov:'GLOBAL',name,price:venta};
      lines.push(`- ${name}: €${venta.toFixed(2)}`);
    });
    const merged = {...precios, ...newPrices};
    setPrices(merged);
    const today = new Date().toISOString().split('T')[0];
    const msg = `📅 PRECIOS ${today}\n\n` + lines.join('\n');
    const url = 'https://wa.me/?text=' + encodeURIComponent(msg);
    window.open(url, '_blank');
    // Reinicio "seguro": conservar vocab + asignaciones
    const keepVocab = localStorage.getItem(LS.VOCAB) || '';
    const keepAssign = localStorage.getItem(LS.ASSIGN) || '{}';
    localStorage.clear();
    localStorage.setItem(LS.VOCAB, keepVocab);
    localStorage.setItem(LS.ASSIGN, keepAssign);
    alert('✅ Día cerrado. Datos limpiados para mañana.');
    location.reload();
    modal.remove();
  };
}

/* Reparto visual */
function addRepartoVisualTab(){
  // Botón en tabbar
  const tabbar = document.querySelector('.tabbar');
  if(tabbar && !document.getElementById('btn-repartovisual')){
    const btn = document.createElement('button');
    btn.id = 'btn-repartovisual';
    btn.innerHTML = '🧺<span>Reparto Visual</span>';
    btn.onclick = ()=> showRepartoVisual();
    tabbar.appendChild(btn);
  }
  // Sección
  if(!document.getElementById('tab-repartovisual')){
    const section = document.createElement('section');
    section.id = 'tab-repartovisual';
    section.className = 'tab';
    section.style.display='none';
    section.innerHTML = `
      <div class="card">
        <div class="hd">
          <strong>🧺 Reparto Visual por Tienda</strong>
          <div class="toolbar">
            <select id="rv-tienda" class="btn muted small">
              <option value="sp">🏪 San Pablo</option>
              <option value="sl">🏪 San Lesmes</option>
              <option value="st">🏪 Santiago</option>
            </select>
            <button class="btn small" id="rv-clear">🧹 Limpiar selección</button>
            <button class="btn small" id="rv-send">🟢 Enviar WhatsApp</button>
          </div>
        </div>
        <div class="bd">
          <div id="rv-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;"></div>
          <hr>
          <h4>🧾 Asignados hoy:</h4>
          <div id="rv-list" style="min-height:60px;font-size:14px;"></div>
        </div>
      </div>
    `;
    document.querySelector('.container').appendChild(section);
  }
}
function showRepartoVisual(){
  document.querySelectorAll('.tab').forEach(t=>t.style.display='none');
  document.querySelectorAll('.tabbar button').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-repartovisual').style.display='block';
  document.getElementById('btn-repartovisual').classList.add('active');
  renderRepartoVisual();
}
function renderRepartoVisual(){
  const tiendaSel = document.getElementById('rv-tienda').value;
  const grid = document.getElementById('rv-grid');
  const lista = document.getElementById('rv-list');
  const compras = window.__purchases || {};
  const pedidos = window.tiendaState?.[tiendaSel] || [];
  const fotos = {
    'TOMATE':'https://cdn-icons-png.flaticon.com/512/765/765481.png',
    'ZANAHORIA':'https://cdn-icons-png.flaticon.com/512/415/415733.png',
    'PLATANO':'https://cdn-icons-png.flaticon.com/512/415/415748.png',
    'MANZANA':'https://cdn-icons-png.flaticon.com/512/766/766149.png',
    'CEBOLLA':'https://cdn-icons-png.flaticon.com/512/415/415730.png',
    'PIMIENTO':'https://cdn-icons-png.flaticon.com/512/415/415744.png'
  };
  const productosComprados = {};
  Object.values(compras).forEach(list=>{
    (list||[]).forEach(it=>{
      const key = normKey(it.name);
      productosComprados[key] = (productosComprados[key]||0) + Number(it.purchased||0);
    });
  });
  const gridItems = pedidos
    .filter(p=>productosComprados[normKey(p.e)]>0)
    .map(p=>{
      const matchKey = Object.keys(fotos).find(k=>p.e.includes(k));
      const foto = matchKey ? fotos[matchKey] : 'https://cdn-icons-png.flaticon.com/512/2835/2835563.png';
      return {name:p.e, qty:p.q, img:foto};
    });
  grid.innerHTML = gridItems.map(it=>`
    <div class="rv-item" data-name="${it.name}" data-qty="${it.qty}" style="border:1px solid #ddd;border-radius:10px;padding:6px;text-align:center;cursor:pointer;transition:.2s">
      <img src="${it.img}" style="width:60px;height:60px;object-fit:contain"><br>
      <b>${it.name}</b><br>
      <small>${it.qty}</small>
    </div>
  `).join('');
  grid.querySelectorAll('.rv-item').forEach(div=>{
    div.addEventListener('click', ()=>{
      const name = div.dataset.name;
      const qty = div.dataset.qty;
      const line = `<div>• ${qty} ${name}</div>`;
      lista.innerHTML += line;
      div.style.opacity='0.4';
      div.style.pointerEvents='none';
    });
  });
  document.getElementById('rv-clear').onclick = ()=>{
    lista.innerHTML='';
    renderRepartoVisual();
  };
  document.getElementById('rv-send').onclick = ()=>{
    const nombre = tiendaSel==='sp'?'SAN PABLO':(tiendaSel==='sl'?'SAN LESMES':'SANTIAGO');
    const txt = `🚚 REPARTO ${nombre}\n\n` + lista.innerText.trim();
    if(!txt.trim()){ alert('No hay productos seleccionados.'); return; }
    const url = 'https://wa.me/?text=' + encodeURIComponent(txt);
    window.open(url,'_blank');
  };
}

/* ===== INIT ===== */
(function init(){
  showTab('dic');
  loadVocab();
  loadState();
  ['sp','sl','st'].forEach(code=> renderTable(code));
  buildProvBar();
  renderProvidersPanels();
  unificarGlobal();
  updateGlobalStatus();
  renderButtonsAndFixes();

  // Añadir extensiones y botones
  ensureWhatsButtonsForStores();
  addRepartoWhatsButton();
  addRepartoProvisionalButton();
  addComprasMarkAllButton();
  addCloseDayButton();
  addRepartoVisualTab();

  // Autocomplete compras inicial si no hay nada
  setTimeout(()=>{
    try{
      if(Object.keys(window.__purchases||{}).length===0){
        autocompletarComprasDesdePedidos();
      }
    }catch(e){}
  }, 800);
})();
