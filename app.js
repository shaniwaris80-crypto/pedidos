/* =========================================================
   ARSLAN LISTAS v3.5 — PART 1/3
   Base + Tema + Tabs + Estado + Vocab + Parser + Estandarizar
========================================================= */

/* Tema */
function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t==='dark'?'dark':'light');
  localStorage.setItem('arslan_theme', t);
}
function toggleTheme(){
  const cur = localStorage.getItem('arslan_theme') || 'light';
  applyTheme(cur==='light'?'dark':'light');
}

/* Debounce + Idle */
function debounce(fn, wait=300){
  let t=null;
  return function(...args){
    clearTimeout(t);
    t=setTimeout(()=>fn.apply(this,args), wait);
  };
}
const idle = (cb)=> (window.requestIdleCallback? requestIdleCallback(cb): setTimeout(cb, 1));

/* Tabs */
function showTab(key){
  const ids = ['dic','tiendas','global','proveedores'];
  ids.forEach(k=>{
    document.getElementById('tab-'+k).style.display = (k===key)?'block':'none';
    document.getElementById('btn-'+k).classList.toggle('active', k===key);
  });

  const fab = document.getElementById('fab');
  if(key==='global'){ fab.style.display='block'; } else { fab.style.display='none'; toggleFabMenu(true); }

  closeAC();

  if(key==='global'){ idle(()=>{ unificarGlobal(); buildProvBar(); renderClickableGlobal(); }); }
  if(key==='proveedores'){ idle(()=>{ renderProvidersPanels(); renderRepartoClickable(); }); }
}

/* Config */
const LS = {
  VOCAB:'arslan_v35_vocab',
  STORES:'arslan_v35_stores',
  ASSIGN:'arslan_v35_assign',
  ORDERS:'arslan_v35_orders'
};
const PROVEEDORES = ["ESMO","MONTENEGRO","ÁNGEL VACA","JOSÉ ANTONIO","JAVI","ANGELO"];
const IGNORE_WORDS = ['caja','cajas','kg','kgs','kilo','kilos','uds','ud','u','unidad','unidades','manojo','manojos','saco','sacos'];

const $ = s => document.querySelector(s);
const byId = id => document.getElementById(id);
const toLines = t => String(t||'').split(/[\n\r,]/).map(x=>x.trim()).filter(Boolean);

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

/* Vocabulario base (tu lista) */
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
  renderClickableGlobal();
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

/* Similaridad */
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

/* Parser líneas */
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

/* Estado */
const tiendaState = { sp:[], sl:[], st:[] };
let globalRows = [];
let assignments = {};
let orders = {};
let ACTIVE_PROV = PROVEEDORES[0];

const persistState = debounce(function(){
  localStorage.setItem(LS.STORES, JSON.stringify(tiendaState));
  localStorage.setItem(LS.ASSIGN, JSON.stringify(assignments));
  localStorage.setItem(LS.ORDERS, JSON.stringify(orders));
}, 350);

function loadState(){
  try{
    const s = JSON.parse(localStorage.getItem(LS.STORES)||'{}');
    ['sp','sl','st'].forEach(k=>{ if(Array.isArray(s[k])) tiendaState[k]=s[k]; });
  }catch{}
  try{ assignments = JSON.parse(localStorage.getItem(LS.ASSIGN)||'{}')||{}; }catch{ assignments={}; }
  try{ orders = JSON.parse(localStorage.getItem(LS.ORDERS)||'{}')||{}; }catch{ orders={}; }
  PROVEEDORES.forEach(p=>{ if(!Array.isArray(orders[p])) orders[p]=[]; });
}

function resetAll(){
  if(confirm('¿Seguro que quieres limpiar todo?')){ localStorage.clear(); location.reload(); }
}

/* Autocomplete */
let AC_ACTIVE = null;
function closeAC(){ if(AC_ACTIVE){ AC_ACTIVE.remove(); AC_ACTIVE=null; } }
function attachAutocomplete(cell, onPick){
  cell.addEventListener('input', ()=>{
    const val = stripGenericWords(cell.innerText||'');
    closeAC();
    if(!val) return;
    const vocab = loadVocab();
    const suggestions = vocab.filter(v=> normKey(v).includes(normKey(val))).slice(0,8);
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
  }, {passive:true});
  document.addEventListener('click', (e)=>{ if(AC_ACTIVE && !AC_ACTIVE.contains(e.target) && e.target!==cell){ closeAC(); }}, {capture:true});
}

/* Render tabla tienda */
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
        idle(()=>{ unificarGlobal(); renderClickableGlobal(); });
      });
    }
    cell.addEventListener('blur', ()=>{
      const val = cell.innerText.trim();
      if(f==='q'){
        tiendaState[code][i].q = Number(String(val).replace(',','.'))||0;
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
      idle(()=>{ unificarGlobal(); renderClickableGlobal(); });
    }, {passive:true});
  });
}

/* Estandarizar tienda */
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
  idle(()=>{ unificarGlobal(); renderClickableGlobal(); });
}

function guardarTienda(code){
  const out = (tiendaState[code]||[]).map(r=> `${r.e} ${r.q}`).join('\n');
  byId('in_'+code).value = out;
  alert(`Tienda ${code.toUpperCase()} guardada en el textarea.`);
}

function exportarTiendaTXT(code){
  const tienda = tiendaState[code] || [];
  if (!tienda.length) { alert('No hay datos estandarizados.'); return; }
  const okRows = tienda.filter(r => !r.a);
  if (!okRows.length) { alert('Aún hay productos por revisar (en rojo).'); return; }
  const today = new Date().toISOString().split('T')[0];
  const txt = okRows.map(x => `${x.q} ${x.e}`).join('\n');
  const blob = new Blob([txt], {type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${code}_estandarizado_${today}.txt`;
  a.click();
}

function enviarTiendaWhatsApp(code){
  const tienda = tiendaState[code] || [];
  if (!tienda.length) { alert('No hay datos estandarizados.'); return; }
  const okRows = tienda.filter(r => !r.a);
  if (!okRows.length) { alert('Aún hay productos por revisar (en rojo).'); return; }
  const txt = okRows.map(x => `${x.q} ${x.e}`).join('\n');
  const msg = encodeURIComponent(`🛒 *Pedido ${code.toUpperCase()}*\n\n${txt}`);
  window.open(`https://wa.me/?text=${msg}`, '_blank');
}
/* =========================================================
   ARSLAN LISTAS v3.5 — PART 2/3
   Global + Asignación + Proveedores + Exportaciones
========================================================= */

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

  // también refresca clickable global
  renderClickableGlobal();
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
      <td><button class="ok-assign" onclick="assignFromGlobal(${i})">✅</button></td>
      <td contenteditable="true" data-f="name">${r.name}${isSimilar?'<span class="flag">⚠️</span>':''}</td>
      <td contenteditable="true" data-f="total">${r.total}</td>
      <td>${isSimilar? '<span class="pill warn">Posible duplicado</span>':'<span class="pill ok">OK</span>'}</td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  wrap.innerHTML = html;

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
        renderClickableGlobal();
      });
    }

    cell.addEventListener('blur', ()=>{
      const val = cell.innerText.trim();
      if(f==='total'){
        globalRows[idx].total = Number(String(val).replace(',','.'))||0;
      }else{
        const cleaned = removeDiacriticsUpper(val);
        globalRows[idx].name = cleaned;
      }
      renderClickableGlobal();
    }, {passive:true});
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
  idle(()=>{ unificarGlobal(); renderProvidersPanels(); renderClickableGlobal(); });
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
      idle(()=>unificarGlobal());
    };
    bar.appendChild(b);
  });
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
        <button class="btn small" onclick="exportProvTXT('${p}')">📄 TXT ${p}</button>
        <button class="btn small muted" onclick="enviarProvWhatsApp('${p}')">📲 WhatsApp</button>
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
            orders[prov][idx].qty = Number(String(val).replace(',','.'))||0;
          }else{
            orders[prov][idx].name = removeDiacriticsUpper(val);
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
  const blob = new Blob([txt],{type:'text/plain'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`pedido_${prov}_${today}.txt`; a.click();
}
function enviarProvWhatsApp(prov){
  const list = orders[prov]||[];
  if(!list.length){ alert('No hay líneas para ' + prov); return; }
  const txt = list.map(x=> `${x.qty} ${x.name}`).join('\n');
  const msg = encodeURIComponent(`📦 *Pedido ${prov}*\n\n${txt}`);
  window.open(`https://wa.me/?text=${msg}`, '_blank');
}

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
    }else out += `- (sin líneas)\n`;
    out += `\n`;
  });

  out += `📌 SIN PROVEEDOR ASIGNADO:\n`;
  if(unassigned.length){
    unassigned.sort((a,b)=>a.name.localeCompare(b.name,'es'));
    unassigned.forEach(x=>{ out += `- ${x.qty} ${x.name}\n`; });
  }else out += `- (sin líneas)\n`;

  const today = new Date().toISOString().split('T')[0];
  const blob = new Blob([out],{type:'text/plain'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`resumen_pedidos_${today}.txt`; a.click();
}
/* =========================================================
   ARSLAN LISTAS v3.5 — PART 3/3
   Clickable lists (baja abajo) + Share link + Reparto clickable + Modal + Init
========================================================= */

/* ========== FAB helpers ========== */
function toggleFabMenu(forceHide){
  const m = byId('fabMenu');
  if(!m) return;
  if(forceHide){ m.classList.remove('show'); return; }
  m.classList.toggle('show');
}
document.addEventListener('click', (e)=>{
  const m = byId('fabMenu'), f = byId('fab');
  if(m && f && !m.contains(e.target) && e.target!==f){ m.classList.remove('show'); }
}, {capture:true});

/* =========================================================
   CLICKABLE ENGINE
========================================================= */
function clickLSKey(scope){
  // scope: 'global' o 'reparto'
  // para reparto añadimos tienda seleccionada
  if(scope==='reparto'){
    const code = byId('selRepartoTienda')?.value || '';
    return `arslan_click_${scope}_${code || 'none'}`;
  }
  return `arslan_click_${scope}`;
}
function getClickMap(scope){
  try{ return JSON.parse(localStorage.getItem(clickLSKey(scope))||'{}')||{}; }catch{ return {}; }
}
function setClickMap(scope, map){
  localStorage.setItem(clickLSKey(scope), JSON.stringify(map||{}));
}
function normNameKey(s){ return normKey(s); }

function computeClickableItems(scope){
  if(scope==='global'){
    // globalRows es "pendiente de asignar". Para compra global clickable queremos el TOTAL REAL (sumando 3 tiendas)
    const all = [].concat(tiendaState.sp||[], tiendaState.sl||[], tiendaState.st||[]);
    const map = new Map();
    all.forEach(r=>{
      const k = normKey(r.e);
      if(!map.has(k)) map.set(k,{name:r.e, qty:0});
      map.get(k).qty += (Number(r.q)||0);
    });
    return Array.from(map.values()).sort((a,b)=>a.name.localeCompare(b.name,'es'));
  }

  if(scope==='reparto'){
    const code = byId('selRepartoTienda')?.value || '';
    if(!code) return [];
    const lista = tiendaState[code] || [];
    return lista.map(x=>({name:x.e, qty:x.q}));
  }

  return [];
}

function renderClickable(scope){
  const listEl = byId(scope==='global' ? 'clickList_global' : 'clickList_reparto');
  const hintEl = byId(scope==='global' ? 'clickHint_global' : 'clickHint_reparto');
  if(!listEl || !hintEl) return;

  const items = computeClickableItems(scope);
  const map = getClickMap(scope);

  const isDone = (name)=> !!map[normNameKey(name)];
  const setDone = (name,val)=> { map[normNameKey(name)] = !!val; setClickMap(scope,map); };

  const pending = [];
  const done = [];
  items.forEach(it=> (isDone(it.name) ? done : pending).push(it));
  const finalArr = pending.concat(done);

  const doneCount = done.length;
  const total = items.length;
  const pendCount = total - doneCount;
  hintEl.textContent = `Pendientes ${pendCount} / Total ${total}`;

  listEl.innerHTML = '';
  finalArr.forEach(it=>{
    const li = document.createElement('li');
    if(isDone(it.name)) li.classList.add('done');

    const cb = document.createElement('input');
    cb.type='checkbox';
    cb.checked = isDone(it.name);

    const name = document.createElement('div');
    name.className='name';
    name.textContent = it.name;

    const qty = document.createElement('div');
    qty.className='qty';
    qty.textContent = it.qty;

    cb.addEventListener('click', (e)=>{
      e.stopPropagation();
      setDone(it.name, !isDone(it.name));
      renderClickable(scope);
    });
    li.addEventListener('click', ()=>{
      setDone(it.name, !isDone(it.name));
      renderClickable(scope);
    });

    li.appendChild(cb);
    li.appendChild(name);
    li.appendChild(qty);
    listEl.appendChild(li);
  });
}

function renderClickableGlobal(){ renderClickable('global'); }
function renderRepartoClickable(){ renderClickable('reparto'); }

function markAllClickable(scope){
  const items = computeClickableItems(scope);
  const map = getClickMap(scope);
  items.forEach(it=>{ map[normNameKey(it.name)] = true; });
  setClickMap(scope,map);
  renderClickable(scope);
}
function resetClickable(scope){
  localStorage.removeItem(clickLSKey(scope));
  renderClickable(scope);
}
function copyClickable(scope){
  const items = computeClickableItems(scope);
  const map = getClickMap(scope);
  const pending = [];
  const done = [];
  items.forEach(it=> ((map[normNameKey(it.name)]) ? done : pending).push(it));
  const txt = pending.concat(done).map(it=>`- ${it.qty} ${it.name}`).join('\n');
  navigator.clipboard.writeText(txt);
  alert('Lista copiada.');
}

/* =========================================================
   REPARTO WhatsApp/TXT (mantengo tu lógica base pero usando selección)
========================================================= */
function exportarRepartoTXT(){
  const code = byId('selRepartoTienda').value;
  if(!code){ alert('Selecciona una tienda primero.'); return; }
  const items = computeClickableItems('reparto');
  if(!items.length){ alert('Sin datos.'); return; }

  const today = new Date().toISOString().split('T')[0];
  const txt = items.map(x => `${x.qty} ${x.name}`).join('\n');
  const blob = new Blob([txt],{type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `reparto_${code}_${today}.txt`;
  a.click();
}

function enviarRepartoWhatsApp(){
  const code = byId('selRepartoTienda').value;
  if(!code){ alert('Selecciona una tienda primero.'); return; }
  const items = computeClickableItems('reparto');
  if(!items.length){ alert('Sin datos.'); return; }
  const txt = items.map(x => `- ${x.qty} ${x.name}`).join('\n');
  const msg = encodeURIComponent(`🚚 *Reparto ${code.toUpperCase()}*\n\n${txt}`);
  window.open(`https://wa.me/?text=${msg}`, '_blank');
}

/* =========================================================
   SHARE LINK (clickable delivery view) — auto-contenido
   Genera un link con #share=.... (json comprimido)
========================================================= */
function buildSharePayload(mode){
  const now = Date.now();
  if(mode==='global'){
    return { v:1, mode:'global', createdAt: now, title:'🛒 Compra Global', items: computeClickableItems('global') };
  }
  if(mode==='reparto'){
    const code = byId('selRepartoTienda')?.value || '';
    const title = code ? `🚚 Reparto ${code.toUpperCase()}` : '🚚 Reparto';
    return { v:1, mode:'reparto', code, createdAt: now, title, items: computeClickableItems('reparto') };
  }
  return { v:1, mode:'global', createdAt: now, title:'🛒 Compra Global', items: computeClickableItems('global') };
}

function makeShareLink(payload){
  const base = location.href.split('#')[0];
  const json = JSON.stringify(payload);
  const comp = LZString.compressToEncodedURIComponent(json);
  // Vista share dentro del mismo index: abrimos con ?share=1#data=...
  // (Así no necesitas otro archivo)
  const url = base.replace(/index\.html?$/,'index.html') + `?share=1#data=${comp}`;
  return url;
}

/* Modal */
let SHARE_LAST = null;

function openShareModal(mode){
  const modal = byId('shareModal');
  const input = byId('shareLink');
  const title = byId('shareTitle');
  const hint = byId('shareHint');

  const payload = buildSharePayload(mode);
  if(!payload.items || !payload.items.length){
    alert('No hay datos para generar link.');
    return;
  }

  const link = makeShareLink(payload);

  // Si el link es demasiado largo, aviso
  if(link.length > 7000){
    alert('⚠️ Link muy largo (lista muy grande). Para listas enormes, mejor guardarlo en nube con token. Pero este aún puede funcionar.');
  }

  SHARE_LAST = link;
  title.textContent = mode==='global' ? '🔗 Link Compra (clickable)' : '🔗 Link Reparto (clickable)';
  hint.textContent = 'Abre el link: checklist clickable (marcar baja al final).';
  input.value = link;

  modal.style.display='flex';
}

function closeShareModal(){ byId('shareModal').style.display='none'; }
function copyShareLink(){
  const v = byId('shareLink').value;
  navigator.clipboard.writeText(v);
  alert('Link copiado.');
}
function openShareLink(){
  const v = byId('shareLink').value;
  window.open(v, '_blank');
}
function shareWhatsApp(){
  const v = byId('shareLink').value;
  const msg = encodeURIComponent(`🔗 Lista clickable:\n${v}`);
  window.open(`https://wa.me/?text=${msg}`,'_blank');
}

/* =========================================================
   SHARE VIEW MODE: si ?share=1#data=...
   Convertimos la página en "vista entrega" (muy ligera)
========================================================= */
function maybeEnterShareMode(){
  const url = new URL(location.href);
  if(url.searchParams.get('share') !== '1') return;

  const hash = location.hash || '';
  const m = hash.match(/data=([^&]+)/);
  if(!m) return;

  let payload = null;
  try{
    const json = LZString.decompressFromEncodedURIComponent(m[1]);
    payload = JSON.parse(json);
  }catch(e){
    alert('Link inválido o corrupto.');
    return;
  }

  // Pintamos una vista simple usando el motor clickable
  // Reemplazamos el body por una lista clickable
  document.body.innerHTML = `
    <div class="topbar">
      <div class="left">
        <h1>${payload.title || 'Lista'}</h1>
        <span class="pill">Vista entrega</span>
      </div>
      <button class="theme-toggle" onclick="toggleTheme()">🌗 Tema</button>
    </div>
    <div class="container">
      <div class="card">
        <div class="hd">
          <strong>${payload.title || 'Lista'}</strong>
          <div class="toolbar">
            <button class="btn small ok" id="shareAll">✅ Marcar todo</button>
            <button class="btn small muted" id="shareReset">↩️ Reset</button>
            <button class="btn small" id="shareCopy">📋 Copiar</button>
          </div>
        </div>
        <div class="bd">
          <div class="hint" id="shareHintCount">Pendientes 0 / Total 0</div>
          <ul id="shareList" class="clicklist" style="margin-top:10px"></ul>
        </div>
      </div>
    </div>
  `;

  // Tema guardado
  const savedTheme = localStorage.getItem('arslan_theme') || 'light';
  applyTheme(savedTheme);

  // Click map específico por link (no mezcla con tu app)
  const scopeKey = `share_${payload.mode}_${payload.code || 'global'}_${payload.createdAt}`;
  const LSKEY = "arslan_share_checks_" + scopeKey;

  let map = {};
  try{ map = JSON.parse(localStorage.getItem(LSKEY)||'{}')||{}; }catch{ map = {}; }

  const items = (payload.items||[]).slice();

  const isDone = (name)=> !!map[normNameKey(name)];
  const setDone = (name,val)=>{ map[normNameKey(name)] = !!val; localStorage.setItem(LSKEY, JSON.stringify(map)); };

  function render(){
    const ul = byId('shareList');
    const hint = byId('shareHintCount');

    const pending=[], done=[];
    items.forEach(it=> (isDone(it.name) ? done : pending).push(it));
    const arr = pending.concat(done);

    hint.textContent = `Pendientes ${pending.length} / Total ${items.length}`;
    ul.innerHTML='';

    arr.forEach(it=>{
      const li=document.createElement('li');
      if(isDone(it.name)) li.classList.add('done');

      const cb=document.createElement('input');
      cb.type='checkbox'; cb.checked=isDone(it.name);

      const name=document.createElement('div');
      name.className='name'; name.textContent=it.name;

      const qty=document.createElement('div');
      qty.className='qty'; qty.textContent=it.qty;

      cb.addEventListener('click',(e)=>{e.stopPropagation(); setDone(it.name,!isDone(it.name)); render();});
      li.addEventListener('click',()=>{ setDone(it.name,!isDone(it.name)); render(); });

      li.appendChild(cb); li.appendChild(name); li.appendChild(qty);
      ul.appendChild(li);
    });
  }

  byId('shareAll').onclick = ()=>{ items.forEach(it=> setDone(it.name,true)); render(); };
  byId('shareReset').onclick = ()=>{ localStorage.removeItem(LSKEY); map={}; render(); };
  byId('shareCopy').onclick = ()=>{
    const txt = items.map(it=>`- ${it.qty} ${it.name}`).join('\n');
    navigator.clipboard.writeText(txt);
    alert('Lista copiada.');
  };

  render();
}

/* INIT */
(function init(){
  const savedTheme = localStorage.getItem('arslan_theme') || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme);

  // Si es vista share, entramos y terminamos
  maybeEnterShareMode();
  if(new URL(location.href).searchParams.get('share') === '1') return;

  loadVocab();
  loadState();

  showTab('dic');

  idle(()=>{ buildProvBar(); unificarGlobal(); renderClickableGlobal(); });
})();
