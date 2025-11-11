/* ===========================================================
   ARSLAN LISTAS v3.6.2 — KIWI FINAL (solo localStorage)
   - Sin Supabase, estable y rápido
   - TXT/WhatsApp autocorrigen estandarización
   - Reparto provisional basado en __purchases si existen (o en pedidos)
   - Reparto final: déficit proporcional, excedente 50/20/30
   - Undo tras enviar pedidos
=========================================================== */

/* =============== Utilidades DOM =============== */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const byId = id => document.getElementById(id);
const toLines = t => String(t||'').split(/[\n\r,]/).map(x=>x.trim()).filter(Boolean);

/* =============== Claves localStorage =============== */
const LS = {
  VOCAB: 'arslan_v36_vocab',
  STORES: 'arslan_v36_stores',
  ASSIGN: 'arslan_v36_assign',
  ORDERS: 'arslan_v36_orders',
  PURCHASES: 'arslan_v36_purchases',
  REPARTO: 'arslan_v36_reparto',
  PRICES: 'arslan_v36_prices',
  SENT_LOG: 'arslan_v36_sentlog'
};

/* =============== Config general =============== */
const PROVEEDORES = ["ESMO","MONTENEGRO","ÁNGEL VACA","JOSÉ ANTONIO","JAVI","ANGELO"];
const IGNORE_WORDS = ['caja','cajas','kg','kilo','kilos','uds','ud','u','unidad','unidades','manojo','manojos','saco','sacos'];

let ACTIVE_PROV = PROVEEDORES[0];

/* =============== Estado principal =============== */
const tiendaState = { sp:[], sl:[], st:[] };  // [{o,e,q,a}]
let globalRows = [];                           // [{name,total}]
let assignments = {};                          // { normKey(name) : proveedor }
let orders = {};                               // { prov : [{name, qty}] }
let __purchases = {};                          // { prov : [{name, purchased}] , "_SIN_PROV_": [...] }
let __reparto = {};                            // { name : {sp, sl, st} }

/* =============== Saneo y normalización =============== */
function cleanNum(n, def=0){
  const x = Number(String(n).replace(',','.'));
  if (!isFinite(x) || isNaN(x)) return def;
  return Math.max(0, x);
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
function stripGenericWords(s){
  const tokens = normKey(s).split(' ').filter(t=>!IGNORE_WORDS.includes(t.toLowerCase()));
  return tokens.join(' ').trim();
}
function todayISO(){ return new Date().toISOString().slice(0,10); }

/* =============== Similitud (Dice + token set) =============== */
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

/* =============== Vocabulario =============== */
const OFFICIAL_VOCAB_RAW = `TOMATE DANIELA
TOMATE RAMA
TOMATE PERA
TOMATE ROSA
TOMATE BOLA
KIWI ZESPRI GOLD
MANZANA GOLDEN 20
MANZANA GOLDEN 24
MANZANA PINK LADY
ZANAHORIA
PIMIENTO ITALIANO VERDE
PIMIENTO ITALIANO ROJO
PIMIENTO CALIFORNIA VERDE
PIMIENTO CALIFORNIA ROJO
CEBOLLA DULCE
CEBOLLA ROJA
CEBOLLA NORMAL
CEBOLLINO
CEBOLLETA
PUERROS
PEPINO
BERENJENA
CALABACIN
BROCOLI
COLIFLOR
BATAVIA
ICEBERG
PEREJIL
CILANTRO
APIO
MANGO
AGUACATE GRANEL
LIMA
LIMON PRIMERA
NARANJA ZUMO
NARANJA HOJA
UVA BLANCA
UVA ROJA
FRESAS
ARANDANOS
POMELO
PAPAYA
GRANADA
CHAMPINON
OKRA
BONIATO
PATATA 10KG
PATATA 25KG
SANDIA
MELON
PLATANO CANARIO PRIMERA
GUINDILLA
HABANERO`;

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
function addNewWord(){
  const entry = prompt("Introduce nuevo producto (uno por línea si son varios):");
  if(!entry) return;
  const current = toLines(byId('vocabTxt').value);
  const added = toLines(entry);
  const merged = uniqueVocab(current.concat(added));
  byId('vocabTxt').value = merged.join('\n');
  saveVocab();
}

/* =============== Parser de líneas =============== */
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

/* =============== Persistencia =============== */
function loadState(){
  try{
    const s = JSON.parse(localStorage.getItem(LS.STORES)||'{}');
    ['sp','sl','st'].forEach(k=>{ if(Array.isArray(s[k])) tiendaState[k]=s[k]; });
  }catch{}
  try{ assignments = JSON.parse(localStorage.getItem(LS.ASSIGN)||'{}')||{}; }catch{ assignments={}; }
  try{ orders = JSON.parse(localStorage.getItem(LS.ORDERS)||'{}')||{}; }catch{ orders={}; }
  try{ __purchases = JSON.parse(localStorage.getItem(LS.PURCHASES)||'{}')||{}; }catch{ __purchases={}; }
  try{ __reparto = JSON.parse(localStorage.getItem(LS.REPARTO)||'{}')||{}; }catch{ __reparto={}; }
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

/* =============== Autocomplete =============== */
let AC_ACTIVE = null;
let AC_LISTENERS_ATTACHED = false;
function closeAC(){ if (AC_ACTIVE) { AC_ACTIVE.remove(); AC_ACTIVE = null; } }
function ensureACGlobalListeners(){
  if (AC_LISTENERS_ATTACHED) return;
  AC_LISTENERS_ATTACHED = true;
  ['click','scroll','resize','orientationchange'].forEach(ev=>{
    window.addEventListener(ev, (e)=>{
      if (!AC_ACTIVE) return;
      if (ev==='click') { if (e.target && AC_ACTIVE.contains(e.target)) return; }
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

/* =============== Render tienda / estandarizar =============== */
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

function bestMatch(query, vocabArr){
  const q = stripGenericWords(query);
  let best = {name:null, score:0};
  vocabArr.forEach(v=>{
    const sc = similarityScore(q, v);
    if(sc>best.score) best = {name:v, score:sc};
  });
  return best;
}

function estandarizar(code){
  const txtArea = byId('in_'+code);
  const txt = (txtArea && txtArea.value) ? txtArea.value : '';
  const vocab = loadVocab();
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

/* =============== Global: unificar y detectar similares =============== */
function unificarGlobal(){
  const all = [].concat(tiendaState.sp||[], tiendaState.sl||[], tiendaState.st||[]);
  const map = new Map();
  all.forEach(r=>{
    const key = normKey(r.e);
    if(!map.has(key)) map.set(key,{name:r.e,total:0});
    map.get(key).total += (Number(r.q)||0);
  });
  const arr = Array.from(map.values()).sort((a,b)=>a.name.localeCompare(b.name,'es'));

  // detectar similares
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
    <div class="hint" style="margin-bottom:6px">
      Proveedor activo: <b>${ACTIVE_PROV}</b>. Usa ✅ para asignar rápidamente.
    </div>
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

  // Asignación rápida
  wrap.querySelectorAll('[data-assign]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = Number(btn.dataset.assign);
      assignFromGlobal(idx);
    });
  });
}

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

/* =============== Pedidos por proveedor: paneles + envío =============== */
let __lastClearedOrders = null; // buffer para deshacer
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

    // Handlers de envío
    const btnWhats = hd.querySelector('.btn.whats');
    if(btnWhats){
      btnWhats.onclick = ()=>{
        const txt = getPedidoTexto(p);
        if(!txt){ alert('Sin líneas para enviar.'); return; }
        pushSentLog({prov: p, when: todayISO(), type: 'whatsapp', lines: (orders[p]||[]).length});
        window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
        marcarCompradoTotalDeProveedor(p, true);
      };
    }
    const btnTxt = hd.querySelector('.btn.txtprov');
    if(btnTxt){
      btnTxt.onclick = ()=>{
        const listNow = (orders[p]||[]);
        if(!listNow.length){ alert('No hay líneas para ' + p); return; }
        const today = todayISO();
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
  if($('#btn-compras')?.classList.contains('active')) renderCompras();
  if($('#btn-reparto')?.classList.contains('active')) renderReparto();
  alert(`Pedido de ${prov} marcado como COMPRADO y retirado del panel de pedidos.`);
}

/* =============== Exportación Global =============== */
function copiarGlobal(){
  if(!globalRows.length) return;
  const txt = globalRows.map(r=>`- ${r.total} ${r.name}`).join('\n');
  navigator.clipboard.writeText(txt);
  alert('Lista global copiada.');
}
function exportarGlobalTXT(){
  if(!globalRows.length){ alert('No hay datos.'); return; }
  const today = todayISO();
  const txt = globalRows.map(r=>`${r.total}\t${r.name}`).join('\n');
  const blob = new Blob([txt],{type:'text/plain'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`lista_global_${today}.txt`; a.click();
}
function exportarGlobalXLSX(){
  if(!globalRows.length){ alert('No hay datos.'); return; }
  const today = todayISO();
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([['Producto','Total'], ...globalRows.map(r=>[r.name,r.total])]);
  XLSX.utils.book_append_sheet(wb, ws, 'Global');
  XLSX.writeFile(wb, `lista_global_${today}.xlsx`);
}

/* =============== TXT Global por proveedor y sin asignar =============== */
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
    }else{ out += `- (sin líneas)\n`; }
    out += `\n`;
  });

  out += `📌 SIN PROVEEDOR ASIGNADO:\n`;
  if(unassigned.length){
    unassigned.sort((a,b)=>a.name.localeCompare(b.name,'es'));
    unassigned.forEach(x=>{ out += `- ${x.qty} ${x.name}\n`; });
  }else{
    out += `- (sin líneas)\n`;
  }

  const today = todayISO();
  const blob = new Blob([out],{type:'text/plain'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`resumen_pedidos_${today}.txt`; a.click();
}

/* =============== Compras =============== */
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
  byId('compras-markall').onclick = ()=>{
    if(!confirm('¿Marcar todas las líneas como compradas según lo solicitado?')) return;
    const ord = orders || {};
    const purchases = __purchases || {};
    Object.keys(ord).forEach(prov=>{
      if(!Array.isArray(ord[prov])) return;
      purchases[prov] = ord[prov].map(it=>({
        name: it.name,
        purchased: Number(it.qty)||0
      }));
    });
    __purchases = purchases;
    persistState();
    alert('✅ Todas las líneas marcadas como compradas.\nReparto provisional y final actualizados.');
    renderCompras();
    renderReparto();
  };
  byId('compras-sync').onclick = ()=>{ persistState(); alert('Sincronizado.'); };

  updateGlobalStatus();
}

/* =============== Reparto final (compras reales) =============== */
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
    return { tipo: 'sin_stock', objetivo: {sp:0, sl:0, st:0}, exceso: 0, factor: 0 };
  }
  if(comprado < totalBase && totalBase > 0){
    const f = +(comprado / totalBase).toFixed(6);
    return {
      tipo: 'deficit',
      objetivo: {
        sp: +(base.sp * f).toFixed(2),
        sl: +(base.sl * f).toFixed(2),
        st: +(base.st * f).toFixed(2)
      },
      exceso: 0,
      factor: f
    };
  }
  if(comprado === totalBase){
    return { tipo: 'exacto', objetivo: { sp:+base.sp.toFixed(2), sl:+base.sl.toFixed(2), st:+base.st.toFixed(2) }, exceso: 0, factor: 1 };
  }
  const exceso = +(comprobado - totalBase).toFixed(2); // typo evitado: usamos comprado
  const excesoCorr = +(comprado - totalBase).toFixed(2);
  return {
    tipo: 'exceso',
    objetivo: {
      sp: +(base.sp + excesoCorr*0.50).toFixed(2),
      sl: +(base.sl + excesoCorr*0.20).toFixed(2),
      st: +(base.st + excesoCorr*0.30).toFixed(2)
    },
    exceso: excesoCorr,
    factor: 1
  };
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
    const cap = {
      sp: Math.min(curEnt.sp||0, objetivo.sp),
      sl: Math.min(curEnt.sl||0, objetivo.sl),
      st: Math.min(curEnt.st||0, objetivo.st),
    };
    if(!__reparto[name]) __reparto[name] = {sp:0, sl:0, st:0};
    __reparto[name] = cap;
    persistState();

    const pend = {
      sp: +(Math.max(0, objetivo.sp - cap.sp)).toFixed(2),
      sl: +(Math.max(0, objetivo.sl - cap.sl)).toFixed(2),
      st: +(Math.max(0, objetivo.st - cap.st)).toFixed(2)
    };

    const entregadoTotal = +(cap.sp + cap.sl + cap.st).toFixed(2);
    const restGlobal = Math.max(0, +(comp - entregadoTotal).toFixed(2));

    const badgeModo = (()=>{
      if(suger.tipo==='deficit') return '<span class="pill warn">Déficit: reparto proporcional</span>';
      if(suger.tipo==='exceso')  return '<span class="pill ok">Excedente: +50/20/30</span>';
      if(suger.tipo==='exacto')  return '<span class="pill ok">Exacto a lo pedido</span>';
      return '<span class="pill">Sin stock</span>';
    })();

    html += `<tr data-name="${name}">
      <td>
        <div style="display:flex;flex-direction:column;gap:4px">
          <div>${name}</div>
          <div>${badgeModo}</div>
        </div>
      </td>
      <td>${comp}</td>
      <td>${sol}</td>
      <td>${restGlobal}</td>

      <td>
        <div class="row">
          <button class="btn small muted r-dec" data-t="sp">–</button>
          <span class="pill">Entregado: ${cap.sp} / Obj: ${objetivo.sp} (pend: ${pend.sp})</span>
        </div>
      </td>
      <td>
        <div class="row">
          <button class="btn small muted r-dec" data-t="sl">–</button>
          <span class="pill">Entregado: ${cap.sl} / Obj: ${objetivo.sl} (pend: ${pend.sl})</span>
        </div>
      </td>
      <td>
        <div class="row">
          <button class="btn small muted r-dec" data-t="st">–</button>
          <span class="pill">Entregado: ${cap.st} / Obj: ${objetivo.st} (pend: ${pend.st})</span>
        </div>
      </td>

      <td>
        <div class="row">
          <button class="btn small" data-completar="${name}">✅ Completar</button>
          ${suger.tipo==='exceso' ? `<button class="btn small muted" data-excedente="${name}">➕ Excedente</button>` : ''}
        </div>
      </td>
    </tr>`;
  });

  html += '</tbody></table>';
  cont.innerHTML = html;

  // – (entrega 1 unidad respetando objetivo y stock)
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

  // Excedente
  cont.querySelectorAll('[data-excedente]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const name = btn.dataset.excedente;
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

  // Completar
  cont.querySelectorAll('[data-completar]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const name = btn.dataset.completar;
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
    });
  });

  byId('reparto-save').onclick = ()=>{ persistState(); alert('Reparto guardado.'); };

  updateGlobalStatus();
}

/* =============== Reparto provisional (CORREGIDO) =============== */
/* Genera reparto provisional. Si existen compras (__purchases),
   usa esas cantidades (porque reflejan "marcar todo comprado").
   Si no existen compras, usa los pedidos por tienda. */
function generarRepartoProvisionalTexto(){
  // Determinar fuente de datos
  const compras = totalComprado(); // objeto {name: cantidad}
  const hayCompras = Object.keys(compras).length > 0;

  // Construimos por tienda
  const porTienda = { sp:[], sl:[], st:[] };

  if(hayCompras){
    // Reparto proporcional a lo pedido por tienda (si existe), pero SOLO como preview sin límites finos
    Object.keys(compras).sort((a,b)=>a.localeCompare(b,'es')).forEach(name=>{
      const comp = cleanNum(compras[name],0);
      const S = solicitadoPorTienda(name);
      const totalBase = S.sp + S.sl + S.st;

      if(totalBase>0){
        // proporcional a pedido
        const sp = +(comp * (S.sp/totalBase)).toFixed(2);
        const sl = +(comp * (S.sl/totalBase)).toFixed(2);
        const st = +(comp * (S.st/totalBase)).toFixed(2);
        if(sp>0) porTienda.sp.push({name, qty: sp});
        if(sl>0) porTienda.sl.push({name, qty: sl});
        if(st>0) porTienda.st.push({name, qty: st});
      }else{
        // sin pedidos: asignar 50/20/30
        const sp = +(comp*0.5).toFixed(2);
        const sl = +(comp*0.2).toFixed(2);
        const st = +(comp*0.3).toFixed(2);
        if(sp>0) porTienda.sp.push({name, qty: sp});
        if(sl>0) porTienda.sl.push({name, qty: sl});
        if(st>0) porTienda.st.push({name, qty: st});
      }
    });
  }else{
    // Sin compras: mostrar tal cual los pedidos por tienda
    ['sp','sl','st'].forEach(code=>{
      (tiendaState[code]||[]).forEach(r=>{
        porTienda[code].push({name:r.e, qty: cleanNum(r.q,0)});
      });
    });
  }

  // Construir texto
  const fecha = todayISO();
  let texto = `🚚 REPARTO PROVISIONAL – ${fecha}\n\n`;

  function bloque(nombre, arr){
    if(!arr.length) return `${nombre}\n- (sin líneas)\n\n`;
    arr.sort((a,b)=>a.name.localeCompare(b.name,'es'));
    return `${nombre}\n` + arr.map(it=>`- ${it.qty} ${it.name}`).join('\n') + '\n\n';
  }

  texto += bloque('🏪 San Pablo', porTienda.sp);
  texto += bloque('🏪 San Lesmes', porTienda.sl);
  texto += bloque('🏪 Santiago', porTienda.st);

  return texto.trim();
}

function renderRepartoProvisional(){
  const cont = byId('reparto-wrap'); if(!cont) return;
  const texto = generarRepartoProvisionalTexto();
  cont.innerHTML = `
    <div class="hint">📋 Reparto provisional (usa compras si existen; si no, pedidos).</div>
    <pre style="white-space:pre-wrap;border:1px dashed var(--border);padding:10px;border-radius:10px;margin-top:6px">${texto}</pre>
  `;
}

function enviarRepartoProvisionalWhatsApp(){
  const texto = generarRepartoProvisionalTexto();
  if(!texto || !texto.trim()){
    alert('No hay productos para enviar en el reparto provisional.');
    return;
  }
  const url = 'https://wa.me/?text=' + encodeURIComponent(texto);
  window.open(url,'_blank');
}

/* =============== Precios =============== */
function getPrices(){ try{ return JSON.parse(localStorage.getItem(LS.PRICES)||'{}')||{}; }catch{ return {}; } }
function setPrices(obj){ localStorage.setItem(LS.PRICES, JSON.stringify(obj||{})); }
function priceKey(prov,name){ return `${prov}||${normKey(name)}`; }

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
    html += `<div class="card" style="margin-bottom:10px">
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
      if(obj[k] && obj[k].price!=null) tr.querySelector('.p-new').value = obj[k].price;
      else tr.querySelector('.p-new').value = '';
      tr.style.background = '#f6ffed';
    });
  });

  byId('precios-save').onclick = ()=>{ alert('Los cambios se guardan por fila con “Guardar”.'); };
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
      window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
    });

    updateGlobalStatus();
  };
}

/* =============== Estado Global =============== */
function getSentLog(){ try{ return JSON.parse(localStorage.getItem(LS.SENT_LOG)||'[]')||[]; }catch{ return []; } }
function pushSentLog(entry){ const log = getSentLog(); log.push(entry); localStorage.setItem(LS.SENT_LOG, JSON.stringify(log)); }

function updateGlobalStatus(){
  // Sin asignar por nombre unificado
  const all = [].concat(tiendaState.sp||[], tiendaState.sl||[], tiendaState.st||[]);
  const totalMap = {};
  all.forEach(r=>{
    const k = normKey(r.e);
    if(!totalMap[k]) totalMap[k] = {name:r.e, total:0};
    totalMap[k].total += (Number(r.q)||0);
  });
  const unassignedKeys = Object.keys(totalMap).filter(k=> !assignments[k]);
  const sinAsignar = unassignedKeys.length;

  // Pedidos enviados hoy
  const sentToday = getSentLog().filter(x=>x.when===todayISO());
  const pedidosEnviados = sentToday.length;

  // Comprados totales (uds)
  let compradosUds = 0;
  Object.values(__purchases||{}).forEach(list=>{
    (list||[]).forEach(it=> compradosUds += (Number(it.purchased)||0));
  });

  // Sin comprar: líneas orders - líneas con purchased>0
  let lineasOrders = 0;
  Object.values(orders||{}).forEach(list=> lineasOrders += (list||[]).length);
  let lineasCompradas = 0;
  Object.values(__purchases||{}).forEach(list=> lineasCompradas += (list||[]).filter(it=> (Number(it.purchased)||0)>0).length);
  const sinComprar = Math.max(0, lineasOrders - lineasCompradas);

  // Reparto pendiente: comprado menos entregado
  let pendienteReparto = 0;
  const compradoPorNombre = totalComprado();
  Object.keys(compradoPorNombre).forEach(name=>{
    const entreg = __reparto[name] ? (Number(__reparto[name].sp||0)+Number(__reparto[name].sl||0)+Number(__reparto[name].st||0)) : 0;
    const rest = Math.max(0, Number(compradoPorNombre[name]) - entreg);
    pendienteReparto += rest;
  });

  // Cambios de precio pendientes (productos comprados sin precio guardado)
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

/* =============== TXT / Whats para TIENDAS: autocorrección =============== */
function generarTextoTienda(code){
  // Si no existe lista estandarizada, intenta crearla automáticamente
  if(!tiendaState[code] || tiendaState[code].length === 0){
    try { estandarizar(code); } catch(e){ /* noop */ }
  }
  const data = tiendaState?.[code] || [];
  if(!data.length){
    alert('⚠️ No hay lista estandarizada ni texto pegado para esta tienda.');
    return '';
  }
  const nombre = code==='sp' ? 'SAN PABLO' : code==='sl' ? 'SAN LESMES' : code==='st' ? 'SANTIAGO' : 'TIENDA';
  const lines = data.map(r => `- ${r.q} ${r.e}`).join('\n');
  return `🏪 ${nombre}\n\n${lines}`;
}
function enviarListaWhats(code){
  const msg = generarTextoTienda(code);
  if(!msg) return;
  window.open('https://wa.me/?text=' + encodeURIComponent(msg),'_blank');
}
function exportarTiendaTXT(code){
  const msg = generarTextoTienda(code);
  if(!msg) return;
  const today = todayISO();
  const nombre = code==='sp'?'san_pablo':(code==='sl'?'san_lesmes':'santiago');
  const blob = new Blob([msg],{type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `lista_${nombre}_${today}.txt`;
  a.click();
}

/* =============== Tabs =============== */
function showTab(key){
  const ids = ['dic','tiendas','global','proveedores','compras','reparto','precios'];
  ids.forEach(k=>{
    const sec = byId('tab-'+k);
    const btn = byId('btn-'+k);
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

/* =============== INIT + Listeners =============== */
(function init(){
  // Pestaña inicial
  showTab('dic');

  // Cargar vocab y estado
  loadVocab();
  loadState();

  // Render tablas tienda
  ['sp','sl','st'].forEach(code=> renderTable(code));

  // Listeners toolbar tiendas
  $$('[data-est]').forEach(b=> b.addEventListener('click', ()=> estandarizar(b.dataset.est)));
  $$('[data-guardar]').forEach(b=> b.addEventListener('click', ()=> guardarTienda(b.dataset.guardar)));
  $$('[data-txt]').forEach(b=> b.addEventListener('click', ()=> exportarTiendaTXT(b.dataset.txt)));
  $$('[data-whats]').forEach(b=> b.addEventListener('click', ()=> enviarListaWhats(b.dataset.whats)));

  // Global
  byId('btn-unificar').onclick = unificarGlobal;
  byId('btn-global-txt').onclick = exportarGlobalTXT;
  byId('btn-global-xlsx').onclick = exportarGlobalXLSX;
  byId('btn-resumen-global').onclick = exportResumenGlobalTXT;
  byId('btn-global-copiar').onclick = copiarGlobal;

  // Reparto provisional
  byId('reparto-prov').onclick = renderRepartoProvisional;
  byId('reparto-prov-whats').onclick = enviarRepartoProvisionalWhatsApp;

  // Precios (botonera se asigna dentro de renderPrecios)

  // Diccionario
  byId('btn-vocab-add').onclick = addNewWord;
  byId('btn-vocab-save').onclick = saveVocab;
  byId('btn-reset-all').onclick = resetAll;
  byId('btn-reset-keep').onclick = resetAllButKeepVocab;

  // Tabbar
  $$('.tabbar button').forEach(btn=>{
    btn.addEventListener('click', ()=> showTab(btn.dataset.tab));
  });

  // Proveedores inicial
  buildProvBar();
  renderProvidersPanels();

  // Unificar si ya hay datos
  unificarGlobal();
  updateGlobalStatus();
})();
