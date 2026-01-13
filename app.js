/* ==========================
ARSLAN LISTAS v3.5 — Parte 1/3
Tema + utilidades + vocabulario + parser + estado base + tabs + extras config + SHARE (hash payload)
========================== */

/* ==========================
   Tema (claro/oscuro) con persistencia
========================== */
function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t==='dark'?'dark':'light');
  localStorage.setItem('arslan_theme', t);
}
function toggleTheme(){
  const cur = localStorage.getItem('arslan_theme') || 'light';
  applyTheme(cur==='light'?'dark':'light');
}

/* ==========================
   Debounce util + recálculo en idle
========================== */
function debounce(fn, wait=300){
  let t=null;
  return function(...args){
    clearTimeout(t);
    t=setTimeout(()=>fn.apply(this,args), wait);
  };
}
const idle = (cb)=> (window.requestIdleCallback ? requestIdleCallback(cb) : setTimeout(cb, 1));

/* ==========================
   Tabs (móvil) + render diferido + limpieza
========================== */
function showTab(key){
  if(window.__ARSLAN_SHARE_MODE) return;

  const ids = ['dic','tiendas','global','proveedores','share'];
  ids.forEach(k=>{
    const sec = document.getElementById('tab-'+k);
    if(sec) sec.style.display = (k===key)?'block':'none';
    const btn = document.getElementById('btn-'+k);
    if(btn) btn.classList.toggle('active', k===key);
  });

  const fab = document.getElementById('fab');
  if(fab){
    if(key==='global'){ fab.style.display='block'; }
    else { fab.style.display='none'; toggleFabMenu(true); }
  }

  closeAC();

  if(key==='global'){ idle(()=>{ unificarGlobal(); buildProvBar(); renderExtraChips(); }); }
  if(key==='proveedores'){ idle(()=>{ renderProvidersPanels(); renderFinalTabs(); renderFinalClickable('GLOBAL'); }); }
  if(key==='tiendas'){ idle(()=>{ renderExtraOrdersUI(); }); }
}

/* ==========================
   Config y utilidades
========================== */
const LS = {
  VOCAB:'arslan_v35_vocab',
  STORES:'arslan_v35_stores',
  ASSIGN:'arslan_v35_assign',
  ORDERS:'arslan_v35_orders',
  EXTRAS:'arslan_v35_extras',
  SHARE:'arslan_v35_share_payloads'
};

const PROVEEDORES_DEFAULT = ["ESMO","MONTENEGRO","ÁNGEL VACA","JOSÉ ANTONIO","JAVI","ANGELO"];
let PROVEEDORES = PROVEEDORES_DEFAULT.slice();

const IGNORE_WORDS = ['caja','cajas','kg','kgs','kilo','kilos','uds','ud','u','unidad','unidades','manojo','manojos','saco','sacos','bolsa','bolsas'];

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

/* ==========================
   Vocabulario (editable + persistente)
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

let __VOCAB_CACHE = null;
function loadVocab(){
  const saved = localStorage.getItem(LS.VOCAB);
  const base = saved && saved.trim()? saved : OFFICIAL_VOCAB_RAW;
  const list = uniqueVocab(toLines(base));
  const box = byId('vocabTxt');
  if(box) box.value = list.join('\n');
  __VOCAB_CACHE = list;
  return list;
}
function getVocab(){
  if(__VOCAB_CACHE && __VOCAB_CACHE.length) return __VOCAB_CACHE;
  return loadVocab();
}
function isInVocab(name){
  const vocab = getVocab();
  const k = normKey(name);
  return vocab.some(v => normKey(v) === k);
}

const persistState = debounce(function(){
  localStorage.setItem(LS.STORES, JSON.stringify(tiendaState));
  localStorage.setItem(LS.ASSIGN, JSON.stringify(assignments));
  localStorage.setItem(LS.ORDERS, JSON.stringify(orders));
  localStorage.setItem(LS.EXTRAS, JSON.stringify(extraOrders));
}, 350);

function saveVocab(){
  localStorage.setItem(LS.VOCAB, byId('vocabTxt')?.value || '');
  __VOCAB_CACHE = null;
  alert('Vocabulario guardado.');
  renderProvidersPanels();
  unificarGlobal();
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

/* ==========================
   Coincidencia aproximada (Dice + TokenSet)
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
   Parser líneas (cantidad + nombre)
========================== */
function parseLine(raw){
  if(!raw) return null;
  let s = raw.replace(/\t/g,' ').replace(/\s{2,}/g,' ').trim();
  s = s.replace(/^[-•*]\s*/,'');
  let qty=null, name=s;

  const mX = s.match(/(?:x|X|\*)\s*(\d+[\.,]?\d*)\b/);
  if(mX){ qty=Number(mX[1].replace(',','.')); name=s.replace(mX[0],'').trim(); }

  if(qty===null){
    const mEnd = s.match(/(\d+[\.,]?\d*)\s*(?:kg|kgs|kilo|kilos|uds|ud|u|unidad|unidades|caja|cajas|manojo|manojos|saco|sacos|bolsa|bolsas)?\s*$/i);
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

/* ==========================
   Estado principal
========================== */
const tiendaState = { sp:[], sl:[], st:[] };
let globalRows = [];
let assignments = {};
let orders = {};
let ACTIVE_PROV = null;

/* ==========================
   Pedidos extra (hoteles / braseros...) — opcionales
========================== */
const EXTRA_DEFS = [
  { code:'riv', label:'Riviera', icon:'🏨' },
  { code:'bc',  label:'Braseros Centro', icon:'🍽️' },
  { code:'be',  label:'Braseros Edificio', icon:'🏢' },
  { code:'bs',  label:'Braseros Severo', icon:'🧾' },
  { code:'bt',  label:'Braseros Tomillares', icon:'🌿' },
  { code:'bf',  label:'Braseros Forum', icon:'🏛️' }
];

let extraOrders = {};

/* ==========================
   Carga / Reset
========================== */
function loadState(){
  try{
    const s = JSON.parse(localStorage.getItem(LS.STORES)||'{}');
    ['sp','sl','st'].forEach(k=>{ if(Array.isArray(s[k])) tiendaState[k]=s[k]; });
  }catch{}
  try{ assignments = JSON.parse(localStorage.getItem(LS.ASSIGN)||'{}')||{}; }catch{}
  try{ orders = JSON.parse(localStorage.getItem(LS.ORDERS)||'{}')||{}; }catch{}
  try{ extraOrders = JSON.parse(localStorage.getItem(LS.EXTRAS)||'{}')||{}; }catch{ extraOrders = {}; }

  PROVEEDORES = (Array.isArray(orders.__providers) && orders.__providers.length) ? orders.__providers.slice() : PROVEEDORES_DEFAULT.slice();
  if(!ACTIVE_PROV) ACTIVE_PROV = PROVEEDORES[0];
  PROVEEDORES.forEach(p=>{ if(!Array.isArray(orders[p])) orders[p]=[]; });

  EXTRA_DEFS.forEach(d=>{
    if(!extraOrders[d.code]){
      extraOrders[d.code] = { enabled:false, raw:'', rows:[] };
    }else{
      if(typeof extraOrders[d.code].enabled!=='boolean') extraOrders[d.code].enabled = false;
      if(typeof extraOrders[d.code].raw!=='string') extraOrders[d.code].raw = '';
      if(!Array.isArray(extraOrders[d.code].rows)) extraOrders[d.code].rows = [];
    }
  });
}

function resetAll(){
  if(confirm('¿Seguro que quieres limpiar todo?')){
    localStorage.clear();
    location.reload();
  }
}

/* ==========================
   FAB helpers
========================== */
function toggleFabMenu(forceHide){
  const m = byId('fabMenu');
  if(!m) return;
  if(forceHide){ m.classList.remove('show'); return; }
  m.classList.toggle('show');
}
document.addEventListener('click', (e)=>{
  const m = byId('fabMenu'), f = byId('fab');
  if(!m || !f) return;
  if(!m.contains(e.target) && e.target!==f){ m.classList.remove('show'); }
}, {capture:true});

/* ==========================
   SHARE MODE — ahora soporta:
   - ?t=TOKEN (localStorage, mismo dispositivo)
   - #p=PAYLOAD (portable, cualquier dispositivo)
========================== */
window.__ARSLAN_SHARE_MODE = false;
window.__ARSLAN_SHARE_TOKEN = null;
window.__ARSLAN_SHARE_PAYLOAD = null;
window.__ARSLAN_SHARE_VIEW = { tab:'GLOBAL' };

function getQueryParam(name){
  const u = new URL(location.href);
  return u.searchParams.get(name);
}
function getHashParam(name){
  const h = String(location.hash || '').replace(/^#/,'');
  const sp = new URLSearchParams(h);
  return sp.get(name);
}

/* encode/decode payload portable */
function encodeSharePayload(payload){
  try{
    const json = JSON.stringify(payload);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return b64;
  }catch{ return null; }
}
function decodeSharePayload(b64){
  try{
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json);
  }catch{ return null; }
}

function enterShareModeFromPayload(payload, token=null){
  window.__ARSLAN_SHARE_MODE = true;
  window.__ARSLAN_SHARE_TOKEN = token;
  window.__ARSLAN_SHARE_PAYLOAD = payload;

  const tabbar = byId('tabbar');
  const hint = byId('appHint');
  const btnBack = byId('btnShareMode');
  if(tabbar) tabbar.style.display='none';
  if(hint) hint.style.display='none';
  if(btnBack) btnBack.style.display='inline-flex';

  const ids = ['dic','tiendas','global','proveedores','share'];
  ids.forEach(k=>{
    const sec = byId('tab-'+k);
    if(sec) sec.style.display = (k==='share') ? 'block' : 'none';
  });

  renderShareTabs();
  renderShareCurrent();
}

function exitShareMode(){
  const u = new URL(location.href);
  u.searchParams.delete('t');
  u.hash = '';
  location.href = u.toString();
}

function loadSharePayload(token){
  try{
    const all = JSON.parse(localStorage.getItem(LS.SHARE) || '{}') || {};
    return all[token] || null;
  }catch{ return null; }
}
function saveSharePayload(token, payload){
  try{
    const all = JSON.parse(localStorage.getItem(LS.SHARE) || '{}') || {};
    all[token] = payload;
    localStorage.setItem(LS.SHARE, JSON.stringify(all));
    return true;
  }catch{ return false; }
}
function makeToken(){
  return 'K' + Math.random().toString(16).slice(2,6).toUpperCase() + '-' + Math.random().toString(16).slice(2,6).toUpperCase();
}

/* ==========================
   INIT (parte 1)
========================== */
(function init_part1(){
  const savedTheme = localStorage.getItem('arslan_theme') || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme);

  loadVocab();
  loadState();

  // 1) portable share: #p=
  const p = getHashParam('p');
  if(p){
    const payload = decodeSharePayload(p);
    if(payload){
      enterShareModeFromPayload(payload, null);
      return;
    }
  }

  // 2) legacy share: ?t=
  const token = getQueryParam('t');
  if(token){
    const payload = loadSharePayload(token);
    enterShareModeFromPayload(payload, token);
    return;
  }

  showTab('dic');
  idle(()=>{ buildProvBar(); unificarGlobal(); renderExtraOrdersUI(); renderExtraChips(); });

})();
/* ==========================
ARSLAN LISTAS v3.5 — Parte 2/3
Autocomplete + tablas tiendas + estandarizar + exportar tiendas + UI extras + providers add
========================== */

let AC_ACTIVE = null;
function closeAC(){ if(AC_ACTIVE){ AC_ACTIVE.remove(); AC_ACTIVE=null; } }

function attachAutocomplete(cell, onPick){
  cell.addEventListener('input', ()=>{
    const val = stripGenericWords(cell.innerText||'');
    closeAC();
    if(!val) return;

    const vocab = getVocab();
    const nv = normKey(val);
    const suggestions = vocab.filter(v=> normKey(v).includes(nv)).slice(0,8);
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

  document.addEventListener('click', (e)=>{
    if(AC_ACTIVE && !AC_ACTIVE.contains(e.target) && e.target!==cell){ closeAC(); }
  }, {capture:true});
}

/* ==========================
   Render tabla tiendas
========================== */
function renderTable(code){
  const wrap = byId('tbl_'+code+'_wrap');
  if(!wrap) return;

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
        idle(()=>unificarGlobal());
      });
    }

    cell.addEventListener('blur', ()=>{
      const val = cell.innerText.trim();
      if(f==='q'){
        tiendaState[code][i].q = Number(String(val).replace(',','.'))||0;
      }else{
        const cleaned = removeDiacriticsUpper(val);
        tiendaState[code][i].e = cleaned;

        if(isInVocab(cleaned)){
          tiendaState[code][i].a=false; cell.classList.remove('red');
          cell.parentElement.querySelector('td:last-child').innerHTML='<span class="pill ok">OK</span>';
        }else{
          tiendaState[code][i].a=true; cell.classList.add('red');
          cell.parentElement.querySelector('td:last-child').innerHTML='<span class="pill warn">Revisar</span>';
        }
      }

      persistState();
      idle(()=>unificarGlobal());
    }, {passive:true});
  });
}

/* ==========================
   Estandarizar por tienda (FIX: Revisar solo si NO está en vocab)
========================== */
function estandarizar(code){
  const vocab = getVocab();
  const txt = byId('in_'+code)?.value || '';
  const rows = [];

  toLines(txt).forEach(line=>{
    const p = parseLine(line);
    if(!p) return;

    const exact = vocab.find(v=> normKey(v)===normKey(p.name));
    if(exact){
      rows.push({o:p.original, e:exact, q:p.qty, a:false});
      return;
    }

    const m = bestMatch(p.name, vocab);
    const chosen = m.name || p.name;

    // ✅ FIX: si chosen existe en vocab => OK
    const inV = vocab.some(v=> normKey(v)===normKey(chosen));
    rows.push({ o:p.original, e:chosen, q:p.qty, a:!inV });
  });

  tiendaState[code] = rows;
  renderTable(code);
  persistState();
  idle(()=>unificarGlobal());
}

/* ==========================
   Guardar tienda
========================== */
function guardarTienda(code){
  const out = (tiendaState[code]||[]).map(r=> `${r.e} ${r.q}`).join('\n');
  const box = byId('in_'+code);
  if(box) box.value = out;
  alert(`Tienda ${code.toUpperCase()} guardada en el textarea.`);
}

/* ==========================
   Exportar tienda TXT
========================== */
function exportarTiendaTXT(code){
  const tienda = tiendaState[code] || [];
  if (!tienda.length) { alert('No hay datos estandarizados.'); return; }
  const okRows = tienda.filter(r => !r.a);
  if (okRows.length !== tienda.length) { alert('Aún hay productos por revisar (en rojo).'); return; }

  const today = new Date().toISOString().split('T')[0];
  const txt = okRows.map(x => `${x.q} ${x.e}`).join('\n');
  const blob = new Blob([txt], {type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${code}_estandarizado_${today}.txt`;
  a.click();
}

/* ==========================
   Enviar tienda por WhatsApp
========================== */
function enviarTiendaWhatsApp(code){
  const tienda = tiendaState[code] || [];
  if (!tienda.length) { alert('No hay datos estandarizados.'); return; }
  const okRows = tienda.filter(r => !r.a);
  if (okRows.length !== tienda.length) { alert('Aún hay productos por revisar (en rojo).'); return; }

  const txt = okRows.map(x => `${x.q} ${x.e}`).join('\n');
  const msg = encodeURIComponent(`🛒 *Pedido ${code.toUpperCase()}*\n\n${txt}`);
  window.open(`https://wa.me/?text=${msg}`, '_blank');
}

/* ==========================
   UI Pedidos extra (hoteles/restaurantes)
========================== */
function renderExtraOrdersUI(){
  const wrap = byId('extra_orders_wrap');
  if(!wrap) return;

  let html = '';
  EXTRA_DEFS.forEach(d=>{
    const st = extraOrders[d.code] || { enabled:false, raw:'', rows:[] };
    const checked = st.enabled ? 'checked' : '';
    html += `
      <div class="card" style="margin-bottom:10px">
        <div class="hd">
          <strong>${d.icon} ${d.label}</strong>
          <div class="toolbar">
            <label class="chip ${st.enabled?'active':''}" style="cursor:pointer">
              <input type="checkbox" style="transform:scale(1.1)" ${checked}
                onchange="toggleExtraEnabled('${d.code}', this.checked)">
              <span>Incluir</span>
            </label>
            <button class="btn ghost small" onclick="estandarizarExtra('${d.code}')">Estandarizar</button>
            <button class="btn muted small" onclick="limpiarExtra('${d.code}')">🧹 Limpiar</button>
          </div>
        </div>
        <div class="bd">
          <textarea id="in_extra_${d.code}" placeholder="Pega pedido ${d.label}...">${st.raw||''}</textarea>
          <div class="hint">Estandariza para que sume bien al total. Solo suma si “Incluir” está activo.</div>
          <div id="tbl_extra_${d.code}_wrap" class="scroll-x" style="margin-top:8px"></div>
        </div>
      </div>
    `;
  });

  wrap.innerHTML = html;
  EXTRA_DEFS.forEach(d=>{ renderExtraTable(d.code); });
}

function toggleExtraEnabled(code, enabled){
  if(!extraOrders[code]) extraOrders[code] = { enabled:false, raw:'', rows:[] };
  extraOrders[code].enabled = !!enabled;
  persistState();
  renderExtraChips();
  idle(()=>unificarGlobal());
}

function guardarExtras(){
  EXTRA_DEFS.forEach(d=>{
    const box = byId('in_extra_'+d.code);
    if(box){ extraOrders[d.code].raw = box.value || ''; }
  });
  persistState();
  alert('Extras guardados.');
  idle(()=>unificarGlobal());
}

function limpiarExtra(code){
  if(!extraOrders[code]) return;
  extraOrders[code].raw = '';
  extraOrders[code].rows = [];
  const box = byId('in_extra_'+code);
  if(box) box.value = '';
  renderExtraTable(code);
  persistState();
  renderExtraChips();
  idle(()=>unificarGlobal());
}

/* ==========================
   Estandarizar extra (FIX: Revisar solo si NO está en vocab)
========================== */
function estandarizarExtra(code){
  const vocab = getVocab();
  const box = byId('in_extra_'+code);
  const txt = box ? box.value : '';

  const rows = [];
  toLines(txt).forEach(line=>{
    const p = parseLine(line);
    if(!p) return;

    const exact = vocab.find(v=> normKey(v)===normKey(p.name));
    if(exact){
      rows.push({o:p.original, e:exact, q:p.qty, a:false});
      return;
    }

    const m = bestMatch(p.name, vocab);
    const chosen = m.name || p.name;

    const inV = vocab.some(v=> normKey(v)===normKey(chosen));
    rows.push({ o:p.original, e:chosen, q:p.qty, a:!inV });
  });

  extraOrders[code].raw = txt;
  extraOrders[code].rows = rows;

  renderExtraTable(code);
  persistState();
  renderExtraChips();
  idle(()=>unificarGlobal());
}

function renderExtraTable(code){
  const wrap = byId('tbl_extra_'+code+'_wrap');
  if(!wrap) return;

  const rows = (extraOrders[code] && Array.isArray(extraOrders[code].rows)) ? extraOrders[code].rows : [];
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
        extraOrders[code].rows[i].e = picked;
        extraOrders[code].rows[i].a = false;
        cell.classList.remove('red');
        cell.parentElement.querySelector('td:last-child').innerHTML = '<span class="pill ok">OK</span>';
        persistState();
        idle(()=>unificarGlobal());
      });
    }

    cell.addEventListener('blur', ()=>{
      const val = cell.innerText.trim();
      if(f==='q'){
        extraOrders[code].rows[i].q = Number(String(val).replace(',','.'))||0;
      }else{
        const cleaned = removeDiacriticsUpper(val);
        extraOrders[code].rows[i].e = cleaned;

        if(isInVocab(cleaned)){
          extraOrders[code].rows[i].a=false; cell.classList.remove('red');
          cell.parentElement.querySelector('td:last-child').innerHTML='<span class="pill ok">OK</span>';
        }else{
          extraOrders[code].rows[i].a=true; cell.classList.add('red');
          cell.parentElement.querySelector('td:last-child').innerHTML='<span class="pill warn">Revisar</span>';
        }
      }

      persistState();
      idle(()=>unificarGlobal());
    }, {passive:true});
  });
}

/* ==========================
   Chips extras (en Global)
========================== */
function renderExtraChips(){
  const wrap = byId('extraChips');
  if(!wrap) return;

  wrap.innerHTML = '';
  EXTRA_DEFS.forEach(d=>{
    const st = extraOrders[d.code] || { enabled:false };
    const chip = document.createElement('div');
    chip.className = 'chip' + (st.enabled ? ' active' : '');
    chip.innerHTML = `<span>${d.icon} ${d.label}</span><span class="pill">${st.enabled?'ON':'OFF'}</span>`;
    chip.onclick = ()=>{
      toggleExtraEnabled(d.code, !st.enabled);
      renderExtraOrdersUI();
    };
    wrap.appendChild(chip);
  });
}

/* ==========================
   Añadir proveedores
========================== */
function addProveedor(){
  const p = prompt("Nombre del nuevo proveedor:");
  if(!p) return;
  const name = removeDiacriticsUpper(p).trim();
  if(!name) return;

  if(PROVEEDORES.includes(name)){
    alert('Ya existe ese proveedor.');
    return;
  }
  PROVEEDORES.push(name);
  orders[name] = orders[name] || [];
  orders.__providers = PROVEEDORES.slice();
  persistState();
  buildProvBar();
  renderProvidersPanels();
  alert('Proveedor añadido: ' + name);
}
/* ==========================
ARSLAN LISTAS v3.5 — Parte 3/3
Unificación global + asignación proveedor + exportaciones + clickable final + reparto clickable + share links (portable)
========================== */

function buildProvBar(){
  const bar = byId('provBar');
  if(!bar) return;
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

  const add = document.createElement('button');
  add.className = 'prov-btn';
  add.textContent = '+ PROV';
  add.onclick = ()=>addProveedor();
  bar.appendChild(add);
}

/* ==========================
   Unificar global (tiendas + extras activos) + similares
========================== */
function unificarGlobal(){
  const all = []
    .concat(tiendaState.sp||[], tiendaState.sl||[], tiendaState.st||[]);

  EXTRA_DEFS.forEach(d=>{
    const st = extraOrders[d.code];
    if(st && st.enabled && Array.isArray(st.rows) && st.rows.length){
      all.push(...st.rows);
    }
  });

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
  if(!window.__ARSLAN_SHARE_MODE){
    idle(()=>{ if(byId('finalClickList')) renderFinalTabs(); });
  }
}

/* ==========================
   GLOBAL + Asignación a proveedor
========================== */
function renderGlobalTable(rows, similarSet){
  const visible = rows.filter(r => !assignments[normKey(r.name)]);
  globalRows = visible;

  const wrap = byId('global_wrap');
  if(!wrap) return;

  if(!visible.length){
    wrap.innerHTML='<div class="hint">Sin productos (todo asignado o no unificado).</div>';
    return;
  }

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
      });
    }

    cell.addEventListener('blur', ()=>{
      const val = cell.innerText.trim();

      if(f==='total'){
        globalRows[idx].total = Number(String(val).replace(',','.'))||0;
      }else{
        const cleaned = removeDiacriticsUpper(val);
        globalRows[idx].name = cleaned;

        if(isInVocab(cleaned)){
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
            tr.querySelector('td:last-child').innerHTML='<span class="pill warn">Posible duplicado</span>';
          }else{
            tr.classList.remove('dup');
            tr.querySelector('td:last-child').innerHTML='<span class="pill">OK</span>';
          }
        }
      }
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
  idle(()=>unificarGlobal());
  renderProvidersPanels();
  renderFinalTabs();
}

/* ==========================
   Paneles de proveedores
========================== */
function renderProvidersPanels(){
  const cont = byId('provPanels');
  if(!cont) return;

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

/* ==========================
   Exportación Global
========================== */
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

/* ==========================
   TXT Global (asignados + pendientes)
========================== */
function exportResumenGlobalTXT(){
  const all = []
    .concat(tiendaState.sp||[], tiendaState.sl||[], tiendaState.st||[]);

  EXTRA_DEFS.forEach(d=>{
    const st = extraOrders[d.code];
    if(st && st.enabled && Array.isArray(st.rows) && st.rows.length){
      all.push(...st.rows);
    }
  });

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

/* ==========================
   CLICKABLE LIST MODULE
========================== */
function mountClickableList(opts){
  const { items, key, ulId, hintId } = opts;
  const ul = byId(ulId);
  const hint = byId(hintId);
  if(!ul || !hint) return;

  const LSKEY = "arslan_checks_" + key;
  let checkedMap = {};
  try{ checkedMap = JSON.parse(localStorage.getItem(LSKEY) || "{}") || {}; }catch{ checkedMap = {}; }

  const norm = (s)=> String(s||"").trim().toUpperCase();

  function setChecked(name, val){
    checkedMap[norm(name)] = !!val;
    localStorage.setItem(LSKEY, JSON.stringify(checkedMap));
  }
  function isChecked(name){ return !!checkedMap[norm(name)]; }

  function sortedItems(){
    const pending = [];
    const done = [];
    items.forEach(it => (isChecked(it.name) ? done : pending).push(it));
    return pending.concat(done);
  }

  function updateHint(){
    const doneCount = items.filter(it=>isChecked(it.name)).length;
    const total = items.length;
    const pending = total - doneCount;
    hint.textContent = `Pendientes ${pending} / Total ${total}`;
  }

  function render(){
    ul.innerHTML = "";
    const arr = sortedItems();

    arr.forEach(it=>{
      const li = document.createElement("li");
      const done = isChecked(it.name);
      if(done) li.classList.add("done");

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = done;

      const name = document.createElement("div");
      name.className = "name";
      name.textContent = it.name;

      const qty = document.createElement("div");
      qty.className = "qty";
      qty.textContent = it.qty;

      cb.addEventListener("click", (e)=>{
        e.stopPropagation();
        const newVal = !isChecked(it.name);
        setChecked(it.name, newVal);
        render(); updateHint();
      });

      li.addEventListener("click", ()=>{
        const newVal = !isChecked(it.name);
        setChecked(it.name, newVal);
        render(); updateHint();
      });

      li.appendChild(cb);
      li.appendChild(name);
      li.appendChild(qty);
      ul.appendChild(li);
    });

    updateHint();
  }

  function markAll(){
    items.forEach(it=> setChecked(it.name, true));
    render(); updateHint();
  }

  function reset(){
    localStorage.removeItem(LSKEY);
    checkedMap = {};
    render(); updateHint();
  }

  render();
  return { markAll, reset, getKey:()=>LSKEY };
}

/* ==========================
   FINAL CLICKABLE
========================== */
let __FINAL_VIEW = { tab:'GLOBAL', mount:null, items:[] };

function getTotalUnifiedAll(){
  const all = []
    .concat(tiendaState.sp||[], tiendaState.sl||[], tiendaState.st||[]);

  EXTRA_DEFS.forEach(d=>{
    const st = extraOrders[d.code];
    if(st && st.enabled && Array.isArray(st.rows) && st.rows.length){
      all.push(...st.rows);
    }
  });

  const map = new Map();
  all.forEach(r=>{
    const k = normKey(r.e);
    if(!map.has(k)) map.set(k,{name:r.e, qty:0});
    map.get(k).qty += (Number(r.q)||0);
  });

  return Array.from(map.values()).sort((a,b)=>a.name.localeCompare(b.name,'es'));
}

function getDestList(code){
  if(code==='sp'||code==='sl'||code==='st'){
    return (tiendaState[code]||[]).map(x=>({name:x.e, qty:x.q}));
  }
  const st = extraOrders[code];
  if(st && Array.isArray(st.rows)){
    return st.rows.map(x=>({name:x.e, qty:x.q}));
  }
  return [];
}

function renderFinalTabs(){
  const wrap = byId('finalTabs');
  if(!wrap) return;

  wrap.innerHTML = '';

  const addTab = (id, label)=>{
    const b = document.createElement('button');
    b.className = 'tabpill' + (__FINAL_VIEW.tab===id ? ' active' : '');
    b.textContent = label;
    b.onclick = ()=>{
      __FINAL_VIEW.tab = id;
      renderFinalTabs();
      renderFinalClickable(id);
    };
    wrap.appendChild(b);
  };

  addTab('GLOBAL','🛒 Global');
  addTab('sp','🏪 San Pablo');
  addTab('sl','🏪 San Lesmes');
  addTab('st','🏪 Santiago');

  EXTRA_DEFS.forEach(d=>{
    const st = extraOrders[d.code];
    if(st && st.enabled){
      addTab(d.code, `${d.icon} ${d.label}`);
    }
  });
}

function renderFinalClickable(tab){
  const title = byId('finalListTitle');
  const ul = byId('finalClickList');
  const hint = byId('finalListHint');
  if(!title || !ul || !hint) return;

  let items = [];
  let label = '🛒 Compra Global';

  if(tab==='GLOBAL'){
    items = getTotalUnifiedAll().map(x=>({name:x.name, qty:x.qty}));
    label = '🛒 Compra Global (final)';
  }else if(tab==='sp'||tab==='sl'||tab==='st'){
    items = getDestList(tab);
    label = (tab==='sp'?'🏪 San Pablo':tab==='sl'?'🏪 San Lesmes':'🏪 Santiago') + ' (reparto)';
  }else{
    const def = EXTRA_DEFS.find(x=>x.code===tab);
    items = getDestList(tab);
    label = (def?`${def.icon} ${def.label}`:'🏨 Extra') + ' (reparto)';
  }

  title.textContent = label;
  __FINAL_VIEW.items = items;

  __FINAL_VIEW.mount = mountClickableList({
    items,
    key: 'FINAL_' + tab,
    ulId: 'finalClickList',
    hintId: 'finalListHint'
  });
}

function finalMarkAll(){ if(__FINAL_VIEW.mount?.markAll) __FINAL_VIEW.mount.markAll(); }
function finalResetChecks(){ if(__FINAL_VIEW.mount?.reset) __FINAL_VIEW.mount.reset(); }
function finalDownloadTXT(){
  const items = __FINAL_VIEW.items || [];
  if(!items.length){ alert('No hay datos.'); return; }
  const today = new Date().toISOString().split('T')[0];
  const txt = items.map(x=>`${x.qty} ${x.name}`).join('\n');
  const blob = new Blob([txt],{type:'text/plain'});
  const a = document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`clickable_${__FINAL_VIEW.tab}_${today}.txt`;
  a.click();
}

/* ==========================
   REPARTO CLICKABLE + PRECIOS (botón 💶)
========================== */
const repartoState = {}; 
function initRepartoStateFor(code, list){
  if(!repartoState[code] || repartoState[code].length !== list.length){
    repartoState[code] = list.map(x => ({ name:x.name, qty:x.qty, price:'', checked:false }));
  }
}

function renderRepartoTienda(){
  const code = byId('selRepartoTienda')?.value || '';
  const wrap = byId('reparto_click_wrap');
  if(!wrap) return;

  if(!code){
    wrap.innerHTML = '<div class="hint">Selecciona un destino para ver su lista.</div>';
    return;
  }

  const base = getDestList(code);
  if(!base.length){
    wrap.innerHTML = '<div class="hint">Sin datos en este destino.</div>';
    return;
  }

  initRepartoStateFor(code, base);

  const list = repartoState[code];
  const pending = list.filter(x=>!x.checked);
  const done = list.filter(x=>x.checked);
  const ordered = pending.concat(done);

  wrap.innerHTML = `
    <div class="card">
      <div class="bd">
        <div class="hint">Pendientes ${pending.length} / Total ${list.length}</div>
        <ul class="clicklist" id="reparto_ul_${code}" style="margin-top:10px"></ul>
      </div>
    </div>
  `;

  const ul = byId('reparto_ul_'+code);
  ordered.forEach((r)=>{
    const li = document.createElement('li');
    if(r.checked) li.classList.add('done');

    const cb = document.createElement('input');
    cb.type='checkbox';
    cb.checked = !!r.checked;

    const name = document.createElement('div');
    name.className='name';
    name.textContent = r.name + (r.price ? ` — ${r.price}€` : '');

    const qty = document.createElement('div');
    qty.className='qty';
    qty.textContent = r.qty;

    const priceBtn = document.createElement('button');
    priceBtn.className = 'price-btn';
    priceBtn.type = 'button';
    priceBtn.textContent = '💶';
    priceBtn.title = 'Editar precio';
    priceBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const v = prompt(`Precio para: ${r.name} (ej 1.20)`, r.price || '');
      if(v===null) return;
      const num = parseFloat(String(v).replace(',','.'));
      r.price = isNaN(num) ? '' : num.toFixed(2);
      renderRepartoTienda();
    });

    cb.addEventListener('click', (e)=>{
      e.stopPropagation();
      r.checked = !r.checked;
      renderRepartoTienda();
    });

    li.addEventListener('click', ()=>{
      r.checked = !r.checked;
      renderRepartoTienda();
    });

    li.appendChild(cb);
    li.appendChild(name);
    li.appendChild(priceBtn);
    li.appendChild(qty);
    ul.appendChild(li);
  });
}

function repartoMarkAll(){
  const code = byId('selRepartoTienda')?.value || '';
  if(!code){ alert('Selecciona un destino primero.'); return; }
  repartoState[code]?.forEach(x=>x.checked=true);
  renderRepartoTienda();
}
function repartoResetChecks(){
  const code = byId('selRepartoTienda')?.value || '';
  if(!code){ alert('Selecciona un destino primero.'); return; }
  repartoState[code]?.forEach(x=>x.checked=false);
  renderRepartoTienda();
}

function exportarRepartoTXT(){
  const code = byId('selRepartoTienda')?.value || '';
  if(!code){ alert('Selecciona un destino primero.'); return; }
  const seleccionados = (repartoState[code]||[]).filter(x=>x.checked);
  if(!seleccionados.length){ alert('No hay productos seleccionados.'); return; }

  const txt = seleccionados.map(x => `${x.qty} ${x.name}${x.price ? ' — ' + x.price + '€' : ''}`).join('\n');
  const today = new Date().toISOString().split('T')[0];
  const blob = new Blob([txt],{type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `reparto_${code}_${today}.txt`;
  a.click();
}

function enviarRepartoWhatsApp(){
  const code = byId('selRepartoTienda')?.value || '';
  if(!code){ alert('Selecciona un destino primero.'); return; }
  const seleccionados = (repartoState[code]||[]).filter(x=>x.checked);
  if(!seleccionados.length){ alert('No hay productos seleccionados.'); return; }

  let msg = `🚚 *Reparto ${code.toUpperCase()}*\n\n`;
  seleccionados.forEach(x=>{
    msg += `- ${x.qty} ${x.name}`;
    if(x.price) msg += ` — ${x.price}€`;
    msg += '\n';
  });
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

/* ==========================
   SHARE LINKS (portable)
   Genera payload desde compra global + repartos
========================== */
function buildSharePayload(){
  const createdAt = Date.now();
  const iso = new Date(createdAt).toISOString();
  const global = getTotalUnifiedAll().map(x=>({name:x.name, qty:x.qty}));

  const splits = { sp: getDestList('sp'), sl: getDestList('sl'), st: getDestList('st') };
  EXTRA_DEFS.forEach(d=>{
    const st = extraOrders[d.code];
    if(st && st.enabled){
      splits[d.code] = getDestList(d.code);
    }
  });

  const meta = { createdAt, iso, version:'v3.5', note:'ARSLAN SHARE' };
  return { meta, global, splits };
}

function makeShareLinkPortable(payload){
  const u = new URL(location.href);
  u.searchParams.delete('t'); // portable: sin token
  const b64 = encodeSharePayload(payload);
  if(!b64) return u.toString();
  u.hash = 'p=' + encodeURIComponent(b64);
  return u.toString();
}

function copyShareLinkForCurrent(){
  const payload = buildSharePayload();
  const link = makeShareLinkPortable(payload);
  navigator.clipboard.writeText(link);
  alert('Link copiado (portable). Envíalo por WhatsApp.');
}
function openShareLinkForCurrent(){
  const payload = buildSharePayload();
  const link = makeShareLinkPortable(payload);
  window.open(link, '_blank');
}

/* ==========================
   SHARE VIEW UI
========================== */
function renderShareTabs(){
  const tabs = byId('shareTabs');
  if(!tabs) return;
  tabs.innerHTML = '';

  const payload = window.__ARSLAN_SHARE_PAYLOAD;
  if(!payload){
    tabs.innerHTML = '<div class="hint">Link inválido o sin datos.</div>';
    const meta = byId('shareMeta'); if(meta) meta.textContent = '';
    return;
  }

  const add = (id, label)=>{
    const b = document.createElement('button');
    b.className = 'tabpill' + (window.__ARSLAN_SHARE_VIEW.tab===id ? ' active' : '');
    b.textContent = label;
    b.onclick = ()=>{
      window.__ARSLAN_SHARE_VIEW.tab = id;
      renderShareTabs();
      renderShareCurrent();
    };
    tabs.appendChild(b);
  };

  add('GLOBAL','🛒 Global');
  add('sp','🏪 San Pablo');
  add('sl','🏪 San Lesmes');
  add('st','🏪 Santiago');

  EXTRA_DEFS.forEach(d=>{
    if(payload.splits && payload.splits[d.code] && payload.splits[d.code].length){
      add(d.code, `${d.icon} ${d.label}`);
    }
  });

  const meta = byId('shareMeta');
  if(meta){
    meta.textContent = payload.meta ? `Creado: ${payload.meta.iso} — ${payload.meta.version}` : '';
  }
}

let __SHARE_MOUNT = null;
function renderShareCurrent(){
  const payload = window.__ARSLAN_SHARE_PAYLOAD;
  const title = byId('shareListTitle');
  if(!payload){
    if(title) title.textContent = 'Link inválido';
    const ul = byId('shareClickList'); if(ul) ul.innerHTML='';
    const hint = byId('shareListHint'); if(hint) hint.textContent='';
    return;
  }

  const tab = window.__ARSLAN_SHARE_VIEW.tab || 'GLOBAL';

  let items = [];
  let label = '🛒 Compra Global';

  if(tab==='GLOBAL'){
    items = payload.global || [];
    label = '🛒 Compra Global (final)';
  }else{
    items = (payload.splits && payload.splits[tab]) ? payload.splits[tab] : [];
    if(tab==='sp') label='🏪 San Pablo';
    if(tab==='sl') label='🏪 San Lesmes';
    if(tab==='st') label='🏪 Santiago';
    const def = EXTRA_DEFS.find(x=>x.code===tab);
    if(def) label = `${def.icon} ${def.label}`;
  }

  if(title) title.textContent = label;

  __SHARE_MOUNT = mountClickableList({
    items,
    key: 'SHARE_' + (window.__ARSLAN_SHARE_TOKEN||'PORTABLE') + '_' + tab,
    ulId: 'shareClickList',
    hintId: 'shareListHint'
  });
}

function shareMarkAll(){ __SHARE_MOUNT?.markAll?.(); }
function shareResetChecks(){ __SHARE_MOUNT?.reset?.(); }

function shareCopyCurrentLink(){
  // copia el link tal cual (portable o token)
  navigator.clipboard.writeText(location.href);
  alert('Link copiado.');
}

function shareDownloadTXTCurrent(){
  const payload = window.__ARSLAN_SHARE_PAYLOAD;
  if(!payload){ alert('Link inválido.'); return; }
  const tab = window.__ARSLAN_SHARE_VIEW.tab || 'GLOBAL';
  const items = (tab==='GLOBAL') ? (payload.global||[]) : ((payload.splits && payload.splits[tab]) ? payload.splits[tab] : []);
  if(!items.length){ alert('No hay datos.'); return; }

  const today = new Date().toISOString().split('T')[0];
  const txt = items.map(x=>`${x.qty} ${x.name}`).join('\n');
  const blob = new Blob([txt],{type:'text/plain'});
  const a = document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`share_${tab}_${today}.txt`;
  a.click();
}

/* ==========================
   INIT (parte 3)
========================== */
(function init_part3(){
  if(!window.__ARSLAN_SHARE_MODE){
    idle(()=>{ renderFinalTabs(); renderFinalClickable('GLOBAL'); });
  }else{
    const btnBack = byId('btnShareMode');
    if(btnBack) btnBack.style.display='inline-flex';
  }
})();
