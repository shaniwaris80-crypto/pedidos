/* =========================
FILE: app.js
ARSLAN LISTAS v3.5 — FIX: 1 solo archivo JS (evita 404 y clicks muertos)
========================= */

(function(){
"use strict";

/* ========= Helpers ========= */
const $ = s => document.querySelector(s);
const byId = id => document.getElementById(id);
const toLines = t => String(t||'').split(/[\n\r,]/).map(x=>x.trim()).filter(Boolean);

function debounce(fn, wait=300){
  let t=null;
  return function(...args){ clearTimeout(t); t=setTimeout(()=>fn.apply(this,args), wait); };
}
const idle = (cb)=> (window.requestIdleCallback ? requestIdleCallback(cb) : setTimeout(cb, 1));

/* ========= Theme ========= */
function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t==='dark'?'dark':'light');
  localStorage.setItem('arslan_theme', t);
}
window.toggleTheme = function(){
  const cur = localStorage.getItem('arslan_theme') || 'light';
  applyTheme(cur==='light'?'dark':'light');
};

/* ========= Normalización ========= */
const IGNORE_WORDS = ['caja','cajas','kg','kgs','kilo','kilos','uds','ud','u','unidad','unidades','manojo','manojos','saco','sacos','bolsa','bolsas'];
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

/* ========= Similaridad ========= */
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

/* ========= Parser ========= */
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

/* ========= LocalStorage keys ========= */
const LS = {
  VOCAB:'arslan_v35_vocab',
  STORES:'arslan_v35_stores',
  ASSIGN:'arslan_v35_assign',
  ORDERS:'arslan_v35_orders',
  EXTRAS:'arslan_v35_extras',
  SHARE:'arslan_v35_share_payloads'
};

/* ========= Proveedores ========= */
const PROVEEDORES_DEFAULT = ["ESMO","MONTENEGRO","ÁNGEL VACA","JOSÉ ANTONIO","JAVI","ANGELO"];
let PROVEEDORES = PROVEEDORES_DEFAULT.slice();
let orders = {};
let assignments = {};
let ACTIVE_PROV = null;

/* ========= Tiendas + Global ========= */
const tiendaState = { sp:[], sl:[], st:[] };
let globalRows = [];

/* ========= Extras ========= */
const EXTRA_DEFS = [
  { code:'riv', label:'Riviera', icon:'🏨' },
  { code:'bc',  label:'Braseros Centro', icon:'🍽️' },
  { code:'be',  label:'Braseros Edificio', icon:'🏢' },
  { code:'bs',  label:'Braseros Severo', icon:'🧾' },
  { code:'bt',  label:'Braseros Tomillares', icon:'🌿' },
  { code:'bf',  label:'Braseros Forum', icon:'🏛️' }
];
let extraOrders = {};

/* ========= Vocab ========= */
let __VOCAB_CACHE = null;
const OFFICIAL_VOCAB_RAW = (byId('vocabTxt')?.value || '').trim(); // se rellena tras load
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
  const base = saved && saved.trim()? saved : (byId('vocabTxt')?.value || '');
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
window.saveVocab = function(){
  localStorage.setItem(LS.VOCAB, byId('vocabTxt')?.value || '');
  __VOCAB_CACHE = null;
  alert('Vocabulario guardado.');
  renderProvidersPanels();
  unificarGlobal();
};
window.addNewWord = function(){
  const entry = prompt("Introduce nuevo producto (uno por línea si son varios):");
  if(!entry) return;
  const current = toLines(byId('vocabTxt').value);
  const added = toLines(entry);
  const merged = uniqueVocab(current.concat(added));
  byId('vocabTxt').value = merged.join('\n');
  window.saveVocab();
};

/* ========= Persist ========= */
const persistState = debounce(function(){
  localStorage.setItem(LS.STORES, JSON.stringify(tiendaState));
  localStorage.setItem(LS.ASSIGN, JSON.stringify(assignments));
  localStorage.setItem(LS.ORDERS, JSON.stringify(orders));
  localStorage.setItem(LS.EXTRAS, JSON.stringify(extraOrders));
}, 250);

/* ========= Autocomplete ========= */
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

/* ========= Tabs ========= */
window.__ARSLAN_SHARE_MODE = false;
window.__ARSLAN_SHARE_TOKEN = null;
window.__ARSLAN_SHARE_PAYLOAD = null;
window.__ARSLAN_SHARE_VIEW = { tab:'GLOBAL' };

window.showTab = function(key){
  if(window.__ARSLAN_SHARE_MODE) return;

  const ids = ['dic','tiendas','global','proveedores','share'];
  ids.forEach(k=>{
    const sec = byId('tab-'+k);
    if(sec) sec.style.display = (k===key)?'block':'none';
    const btn = byId('btn-'+k);
    if(btn) btn.classList.toggle('active', k===key);
  });

  const fab = byId('fab');
  if(fab){
    if(key==='global'){ fab.style.display='block'; }
    else { fab.style.display='none'; toggleFabMenu(true); }
  }

  closeAC();

  if(key==='global'){ idle(()=>{ unificarGlobal(); buildProvBar(); renderExtraChips(); }); }
  if(key==='proveedores'){ idle(()=>{ renderProvidersPanels(); renderFinalTabs(); renderFinalClickable('GLOBAL'); }); }
  if(key==='tiendas'){ idle(()=>{ renderExtraOrdersUI(); }); }
};

/* ========= FAB ========= */
window.toggleFabMenu = function(forceHide){
  const m = byId('fabMenu');
  if(!m) return;
  if(forceHide){ m.classList.remove('show'); return; }
  m.classList.toggle('show');
};
document.addEventListener('click', (e)=>{
  const m = byId('fabMenu'), f = byId('fab');
  if(!m || !f) return;
  if(!m.contains(e.target) && e.target!==f){ m.classList.remove('show'); }
}, {capture:true});

/* ========= Load state ========= */
function loadState(){
  try{
    const s = JSON.parse(localStorage.getItem(LS.STORES)||'{}');
    ['sp','sl','st'].forEach(k=>{ if(Array.isArray(s[k])) tiendaState[k]=s[k]; });
  }catch{}
  try{ assignments = JSON.parse(localStorage.getItem(LS.ASSIGN)||'{}') || {}; }catch{ assignments={}; }
  try{ orders = JSON.parse(localStorage.getItem(LS.ORDERS)||'{}') || {}; }catch{ orders={}; }
  try{ extraOrders = JSON.parse(localStorage.getItem(LS.EXTRAS)||'{}') || {}; }catch{ extraOrders={}; }

  PROVEEDORES = (Array.isArray(orders.__providers) && orders.__providers.length) ? orders.__providers.slice() : PROVEEDORES_DEFAULT.slice();
  if(!ACTIVE_PROV) ACTIVE_PROV = PROVEEDORES[0];

  PROVEEDORES.forEach(p=>{ if(!Array.isArray(orders[p])) orders[p]=[]; });

  EXTRA_DEFS.forEach(d=>{
    if(!extraOrders[d.code]){
      extraOrders[d.code] = { enabled:false, raw:'', rows:[] };
    }else{
      if(typeof extraOrders[d.code].enabled!=='boolean') extraOrders[d.code].enabled=false;
      if(typeof extraOrders[d.code].raw!=='string') extraOrders[d.code].raw='';
      if(!Array.isArray(extraOrders[d.code].rows)) extraOrders[d.code].rows=[];
    }
  });
}

/* ========= Reset ========= */
window.resetAll = function(){
  if(confirm('¿Seguro que quieres limpiar todo?')){
    localStorage.clear();
    location.reload();
  }
};

/* ========= Render tablas tiendas ========= */
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

        const vocab = getVocab();
        const exact = vocab.find(v=> normKey(v)===normKey(cleaned));
        const tdState = cell.parentElement.querySelector('td:last-child');

        if(exact){
          tiendaState[code][i].a=false; cell.classList.remove('red'); tdState.innerHTML='<span class="pill ok">OK</span>';
        }else{
          tiendaState[code][i].a=true; cell.classList.add('red'); tdState.innerHTML='<span class="pill warn">Revisar</span>';
        }
      }
      persistState();
      idle(()=>unificarGlobal());
    }, {passive:true});
  });
}

/* ========= Estandarizar tienda ========= */
window.estandarizar = function(code){
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

    rows.push({ o:p.original, e:chosen, q:p.qty, a:(normKey(chosen)!==normKey(p.name)) });
  });

  tiendaState[code] = rows;
  renderTable(code);
  persistState();
  idle(()=>unificarGlobal());
};

window.guardarTienda = function(code){
  const out = (tiendaState[code]||[]).map(r=> `${r.e} ${r.q}`).join('\n');
  const box = byId('in_'+code);
  if(box) box.value = out;
  alert(`Tienda ${code.toUpperCase()} guardada en el textarea.`);
};

window.exportarTiendaTXT = function(code){
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
};

window.enviarTiendaWhatsApp = function(code){
  const tienda = tiendaState[code] || [];
  if (!tienda.length) { alert('No hay datos estandarizados.'); return; }
  const okRows = tienda.filter(r => !r.a);
  if (!okRows.length) { alert('Aún hay productos por revisar (en rojo).'); return; }
  const txt = okRows.map(x => `${x.q} ${x.e}`).join('\n');
  const msg = encodeURIComponent(`🛒 *Pedido ${code.toUpperCase()}*\n\n${txt}`);
  window.open(`https://wa.me/?text=${msg}`, '_blank');
};

/* ========= Extras ========= */
window.renderExtraOrdersUI = function(){
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
          <div class="hint">Solo suma si “Incluir” está activo.</div>
          <div id="tbl_extra_${d.code}_wrap" class="scroll-x" style="margin-top:8px"></div>
        </div>
      </div>
    `;
  });

  wrap.innerHTML = html;
  EXTRA_DEFS.forEach(d=> renderExtraTable(d.code));
};

window.toggleExtraEnabled = function(code, enabled){
  if(!extraOrders[code]) extraOrders[code] = { enabled:false, raw:'', rows:[] };
  extraOrders[code].enabled = !!enabled;
  persistState();
  renderExtraChips();
  idle(()=>unificarGlobal());
};

window.guardarExtras = function(){
  EXTRA_DEFS.forEach(d=>{
    const box = byId('in_extra_'+d.code);
    if(box) extraOrders[d.code].raw = box.value || '';
  });
  persistState();
  alert('Extras guardados.');
  idle(()=>unificarGlobal());
};

window.limpiarExtra = function(code){
  if(!extraOrders[code]) return;
  extraOrders[code].raw = '';
  extraOrders[code].rows = [];
  const box = byId('in_extra_'+code);
  if(box) box.value = '';
  renderExtraTable(code);
  persistState();
  renderExtraChips();
  idle(()=>unificarGlobal());
};

window.estandarizarExtra = function(code){
  const vocab = getVocab();
  const box = byId('in_extra_'+code);
  const txt = box ? box.value : '';
  const rows = [];

  toLines(txt).forEach(line=>{
    const p = parseLine(line);
    if(!p) return;

    const exact = vocab.find(v=> normKey(v)===normKey(p.name));
    if(exact){ rows.push({o:p.original, e:exact, q:p.qty, a:false}); return; }

    const m = bestMatch(p.name, vocab);
    const chosen = m.name || p.name;
    rows.push({ o:p.original, e:chosen, q:p.qty, a:(normKey(chosen)!==normKey(p.name)) });
  });

  extraOrders[code].raw = txt;
  extraOrders[code].rows = rows;
  renderExtraTable(code);
  persistState();
  renderExtraChips();
  idle(()=>unificarGlobal());
};

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

        const vocab = getVocab();
        const exact = vocab.find(v=> normKey(v)===normKey(cleaned));
        const tdState = cell.parentElement.querySelector('td:last-child');

        if(exact){
          extraOrders[code].rows[i].a=false; cell.classList.remove('red'); tdState.innerHTML='<span class="pill ok">OK</span>';
        }else{
          extraOrders[code].rows[i].a=true; cell.classList.add('red'); tdState.innerHTML='<span class="pill warn">Revisar</span>';
        }
      }
      persistState();
      idle(()=>unificarGlobal());
    }, {passive:true});
  });
}

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
      window.toggleExtraEnabled(d.code, !st.enabled);
      window.renderExtraOrdersUI();
    };
    wrap.appendChild(chip);
  });
}

/* ========= Proveedores bar + add ========= */
function addProveedor(){
  const p = prompt("Nombre del nuevo proveedor:");
  if(!p) return;
  const name = removeDiacriticsUpper(p).trim();
  if(!name) return;
  if(PROVEEDORES.includes(name)){ alert('Ya existe ese proveedor.'); return; }
  PROVEEDORES.push(name);
  orders[name] = orders[name] || [];
  orders.__providers = PROVEEDORES.slice();
  persistState();
  buildProvBar();
  renderProvidersPanels();
  alert('Proveedor añadido: ' + name);
}
function buildProvBar(){
  const bar = byId('provBar');
  if(!bar) return;
  bar.innerHTML='';
  PROVEEDORES.forEach(p=>{
    const b = document.createElement('button');
    b.className = 'prov-btn' + (p===ACTIVE_PROV?' active':'');
    b.textContent = p;
    b.onclick = ()=>{ ACTIVE_PROV = p; buildProvBar(); idle(()=>unificarGlobal()); };
    bar.appendChild(b);
  });
  const add = document.createElement('button');
  add.className = 'prov-btn';
  add.textContent = '+ PROV';
  add.onclick = ()=>addProveedor();
  bar.appendChild(add);
}

/* ========= Global unify + assign ========= */
window.unificarGlobal = function(){
  const all = []
    .concat(tiendaState.sp||[], tiendaState.sl||[], tiendaState.st||[]);
  EXTRA_DEFS.forEach(d=>{
    const st = extraOrders[d.code];
    if(st && st.enabled && Array.isArray(st.rows) && st.rows.length) all.push(...st.rows);
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
      const sc = similarityScore(names[i], names[j]);
      if(sc>=0.86 && normKey(names[i])!==normKey(names[j])){ similarSet.add(names[i]); similarSet.add(names[j]); }
    }
  }

  renderGlobalTable(arr, similarSet);
  idle(()=>{ renderFinalTabs(); renderFinalClickable('GLOBAL'); });
};

function renderGlobalTable(rows, similarSet){
  globalRows = rows.filter(r => !assignments[normKey(r.name)]);
  const wrap = byId('global_wrap');
  if(!wrap) return;

  if(!globalRows.length){
    wrap.innerHTML='<div class="hint">Sin productos (todo asignado o no unificado).</div>';
    return;
  }

  let html = `
    <div class="hint" style="margin-bottom:6px">
      Proveedor activo: <b>${ACTIVE_PROV}</b>. Usa ✅ para asignar.
    </div>
    <div class="scroll-x"><table>
      <thead><tr><th></th><th>Producto</th><th>Total</th><th>Estado</th></tr></thead>
      <tbody>`;

  globalRows.forEach((r,i)=>{
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
      attachAutocomplete(cell, (picked)=>{ cell.innerText=picked; globalRows[idx].name=picked; tr.classList.remove('dup'); });
    }

    cell.addEventListener('blur', ()=>{
      const val = cell.innerText.trim();
      if(f==='total'){
        globalRows[idx].total = Number(String(val).replace(',','.'))||0;
      }else{
        globalRows[idx].name = removeDiacriticsUpper(val);
      }
      persistState();
    }, {passive:true});
  });
}

window.assignFromGlobal = function(idx){
  const item = globalRows[idx];
  if(!item) return;
  const k = normKey(item.name);
  assignments[k] = ACTIVE_PROV;

  const list = orders[ACTIVE_PROV]||[];
  const exIdx = list.findIndex(x=> normKey(x.name)===k);
  if(exIdx>-1) list[exIdx].qty += Number(item.total)||0;
  else list.push({name:item.name, qty:Number(item.total)||0});
  orders[ACTIVE_PROV]=list;

  persistState();
  idle(()=>window.unificarGlobal());
  renderProvidersPanels();
  renderFinalTabs();
};

/* ========= Providers panels ========= */
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
        <button class="btn small" onclick="exportProvTXT('${p}')">📄 TXT</button>
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
          attachAutocomplete(cell, picked=>{ cell.innerText=picked; orders[prov][idx].name=picked; persistState(); });
        }
        cell.addEventListener('blur', ()=>{
          const val = cell.innerText.trim();
          if(f==='qty') orders[prov][idx].qty = Number(String(val).replace(',','.'))||0;
          else orders[prov][idx].name = removeDiacriticsUpper(val);
          persistState();
        }, {passive:true});
      });
    }

    card.appendChild(hd); card.appendChild(bd);
    cont.appendChild(card);
  });
}

window.exportProvTXT = function(prov){
  const list = orders[prov]||[];
  if(!list.length){ alert('No hay líneas para ' + prov); return; }
  const today = new Date().toISOString().split('T')[0];
  const txt = list.map(x=> `${x.qty} ${x.name}`).join('\n');
  const blob = new Blob([txt],{type:'text/plain'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`pedido_${prov}_${today}.txt`; a.click();
};
window.enviarProvWhatsApp = function(prov){
  const list = orders[prov]||[];
  if(!list.length){ alert('No hay líneas para ' + prov); return; }
  const txt = list.map(x=> `${x.qty} ${x.name}`).join('\n');
  const msg = encodeURIComponent(`📦 *Pedido ${prov}*\n\n${txt}`);
  window.open(`https://wa.me/?text=${msg}`, '_blank');
};

/* ========= Export global ========= */
window.copiarGlobal = function(){
  if(!globalRows.length) return;
  const txt = globalRows.map(r=>`- ${r.total} ${r.name}`).join('\n');
  navigator.clipboard.writeText(txt);
  alert('Lista global copiada.');
};
window.exportarGlobalTXT = function(){
  if(!globalRows.length){ alert('No hay datos.'); return; }
  const today = new Date().toISOString().split('T')[0];
  const txt = globalRows.map(r=>`${r.total}\t${r.name}`).join('\n');
  const blob = new Blob([txt],{type:'text/plain'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`lista_global_${today}.txt`; a.click();
};
window.exportarGlobalXLSX = function(){
  if(!globalRows.length){ alert('No hay datos.'); return; }
  const today = new Date().toISOString().split('T')[0];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([['Producto','Total'], ...globalRows.map(r=>[r.name,r.total])]);
  XLSX.utils.book_append_sheet(wb, ws, 'Global');
  XLSX.writeFile(wb, `lista_global_${today}.xlsx`);
};
window.exportResumenGlobalTXT = function(){
  const all = [].concat(tiendaState.sp||[], tiendaState.sl||[], tiendaState.st||[]);
  EXTRA_DEFS.forEach(d=>{
    const st = extraOrders[d.code];
    if(st && st.enabled && Array.isArray(st.rows) && st.rows.length) all.push(...st.rows);
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
    if(prov && PROVEEDORES.includes(prov)) byProv[prov].push({name:it.name, qty:it.total});
    else unassigned.push({name:it.name, qty:it.total});
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
};

/* ========= Clickable list ========= */
function mountClickableList(opts){
  const { items, key, ulId, hintId } = opts;
  const ul = byId(ulId);
  const hint = byId(hintId);
  if(!ul || !hint) return null;

  const LSKEY = "arslan_checks_" + key;
  let checkedMap = {};
  try{ checkedMap = JSON.parse(localStorage.getItem(LSKEY) || "{}") || {}; }catch{ checkedMap = {}; }
  const norm = (s)=> String(s||"").trim().toUpperCase();

  function setChecked(name, val){
    checkedMap[norm(name)] = !!val;
    localStorage.setItem(LSKEY, JSON.stringify(checkedMap));
  }
  function isChecked(name){ return !!checkedMap[norm(name)]; }

  function updateHint(){
    const doneCount = items.filter(it=>isChecked(it.name)).length;
    const total = items.length;
    hint.textContent = `Pendientes ${total-doneCount} / Total ${total}`;
  }

  function render(){
    ul.innerHTML = "";
    const pending=[], done=[];
    items.forEach(it => (isChecked(it.name) ? done : pending).push(it));
    const arr = pending.concat(done);

    arr.forEach(it=>{
      const li = document.createElement("li");
      const doneFlag = isChecked(it.name);
      if(doneFlag) li.classList.add("done");

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = doneFlag;

      const name = document.createElement("div");
      name.className = "name";
      name.textContent = it.name;

      const qty = document.createElement("div");
      qty.className = "qty";
      qty.textContent = it.qty;

      const toggle = ()=>{
        const newVal = !isChecked(it.name);
        setChecked(it.name, newVal);
        render();
        updateHint();
      };

      cb.addEventListener("click", (e)=>{ e.stopPropagation(); toggle(); });
      li.addEventListener("click", toggle);

      li.appendChild(cb);
      li.appendChild(name);
      li.appendChild(qty);
      ul.appendChild(li);
    });

    updateHint();
  }

  function markAll(){ items.forEach(it=> setChecked(it.name, true)); render(); updateHint(); }
  function reset(){ localStorage.removeItem(LSKEY); checkedMap={}; render(); updateHint(); }

  render();
  return { markAll, reset };
}

/* ========= Final clickable ========= */
let __FINAL_VIEW = { tab:'GLOBAL', mount:null, items:[] };

function getTotalUnifiedAll(){
  const all = [].concat(tiendaState.sp||[], tiendaState.sl||[], tiendaState.st||[]);
  EXTRA_DEFS.forEach(d=>{
    const st = extraOrders[d.code];
    if(st && st.enabled && Array.isArray(st.rows) && st.rows.length) all.push(...st.rows);
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
  if(code==='sp'||code==='sl'||code==='st') return (tiendaState[code]||[]).map(x=>({name:x.e, qty:x.q}));
  const st = extraOrders[code];
  if(st && Array.isArray(st.rows)) return st.rows.map(x=>({name:x.e, qty:x.q}));
  return [];
}

window.renderFinalTabs = function(){
  const wrap = byId('finalTabs');
  if(!wrap) return;
  wrap.innerHTML = '';

  const addTab = (id, label)=>{
    const b = document.createElement('button');
    b.className = 'tabpill' + (__FINAL_VIEW.tab===id ? ' active' : '');
    b.textContent = label;
    b.onclick = ()=>{ __FINAL_VIEW.tab=id; window.renderFinalTabs(); window.renderFinalClickable(id); };
    wrap.appendChild(b);
  };

  addTab('GLOBAL','🛒 Global');
  addTab('sp','🏪 San Pablo');
  addTab('sl','🏪 San Lesmes');
  addTab('st','🏪 Santiago');

  EXTRA_DEFS.forEach(d=>{
    const st = extraOrders[d.code];
    if(st && st.enabled) addTab(d.code, `${d.icon} ${d.label}`);
  });
};

window.renderFinalClickable = function(tab){
  const title = byId('finalListTitle');
  if(!title) return;

  let items = [];
  let label = '🛒 Compra Global';
  if(tab==='GLOBAL'){ items = getTotalUnifiedAll(); label='🛒 Compra Global (final)'; }
  else{
    items = getDestList(tab);
    if(tab==='sp') label='🏪 San Pablo (reparto)';
    if(tab==='sl') label='🏪 San Lesmes (reparto)';
    if(tab==='st') label='🏪 Santiago (reparto)';
    const def = EXTRA_DEFS.find(x=>x.code===tab);
    if(def) label = `${def.icon} ${def.label} (reparto)`;
  }

  title.textContent = label;
  __FINAL_VIEW.items = items;
  __FINAL_VIEW.mount = mountClickableList({
    items, key:'FINAL_'+tab, ulId:'finalClickList', hintId:'finalListHint'
  });
};

window.finalMarkAll = function(){ if(__FINAL_VIEW.mount) __FINAL_VIEW.mount.markAll(); };
window.finalResetChecks = function(){ if(__FINAL_VIEW.mount) __FINAL_VIEW.mount.reset(); };
window.finalDownloadTXT = function(){
  const items = __FINAL_VIEW.items || [];
  if(!items.length){ alert('No hay datos.'); return; }
  const today = new Date().toISOString().split('T')[0];
  const txt = items.map(x=>`${x.qty} ${x.name}`).join('\n');
  const blob = new Blob([txt],{type:'text/plain'});
  const a = document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`clickable_${__FINAL_VIEW.tab}_${today}.txt`;
  a.click();
};

/* ========= Reparto clickable ========= */
const repartoState = {};
function initRepartoStateFor(code, list){
  if(!repartoState[code] || repartoState[code].length !== list.length){
    repartoState[code] = list.map(x => ({ name:x.name, qty:x.qty, price:'', checked:false }));
  }
}

window.renderRepartoTienda = function(){
  const code = byId('selRepartoTienda')?.value || '';
  const wrap = byId('reparto_click_wrap');
  if(!wrap) return;

  if(!code){ wrap.innerHTML = '<div class="hint">Selecciona un destino para ver su lista.</div>'; return; }

  const base = getDestList(code);
  if(!base.length){ wrap.innerHTML = '<div class="hint">Sin datos en este destino.</div>'; return; }

  initRepartoStateFor(code, base);

  const list = repartoState[code];
  const pending = list.filter(x=>!x.checked);
  const done = list.filter(x=>x.checked);
  const ordered = pending.concat(done);

  wrap.innerHTML = `<div class="card"><div class="bd">
    <div class="hint">Pendientes ${pending.length} / Total ${list.length}</div>
    <ul class="clicklist" id="reparto_ul_${code}" style="margin-top:10px"></ul>
  </div></div>`;

  const ul = byId('reparto_ul_'+code);
  ordered.forEach((r)=>{
    const li = document.createElement('li');
    if(r.checked) li.classList.add('done');

    const cb = document.createElement('input');
    cb.type='checkbox'; cb.checked=!!r.checked;

    const name = document.createElement('div');
    name.className='name';
    name.textContent = r.name + (r.price ? ` — ${r.price}€` : '');

    const qty = document.createElement('div');
    qty.className='qty'; qty.textContent=r.qty;

    const toggle = ()=>{ r.checked=!r.checked; window.renderRepartoTienda(); };

    cb.addEventListener('click', (e)=>{ e.stopPropagation(); toggle(); });
    li.addEventListener('click', toggle);

    li.addEventListener('contextmenu', (e)=>{
      e.preventDefault();
      const v = prompt(`Precio para: ${r.name} (ej 1.20)`, r.price || '');
      if(v===null) return;
      const num = parseFloat(String(v).replace(',','.'));
      r.price = isNaN(num) ? '' : num.toFixed(2);
      window.renderRepartoTienda();
    });

    li.appendChild(cb); li.appendChild(name); li.appendChild(qty);
    ul.appendChild(li);
  });
};

window.repartoMarkAll = function(){
  const code = byId('selRepartoTienda')?.value || '';
  if(!code){ alert('Selecciona un destino primero.'); return; }
  (repartoState[code]||[]).forEach(x=>x.checked=true);
  window.renderRepartoTienda();
};
window.repartoResetChecks = function(){
  const code = byId('selRepartoTienda')?.value || '';
  if(!code){ alert('Selecciona un destino primero.'); return; }
  (repartoState[code]||[]).forEach(x=>x.checked=false);
  window.renderRepartoTienda();
};
window.exportarRepartoTXT = function(){
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
};
window.enviarRepartoWhatsApp = function(){
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
};

/* ========= SHARE (mismo sistema localStorage) ========= */
function getQueryParam(name){
  const u = new URL(location.href);
  return u.searchParams.get(name);
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
function currentShareToken(){
  const d = new Date().toISOString().split('T')[0];
  return 'DAY-' + d.replace(/-/g,'');
}
function makeShareLink(token){
  const u = new URL(location.href);
  u.searchParams.set('t', token);
  return u.toString();
}
function buildSharePayload(){
  const createdAt = Date.now();
  const iso = new Date(createdAt).toISOString();
  const global = getTotalUnifiedAll().map(x=>({name:x.name, qty:x.qty}));
  const splits = { sp:getDestList('sp'), sl:getDestList('sl'), st:getDestList('st') };
  EXTRA_DEFS.forEach(d=>{ if(extraOrders[d.code] && extraOrders[d.code].enabled) splits[d.code]=getDestList(d.code); });
  return { meta:{ createdAt, iso, version:'v3.5' }, global, splits };
}
window.copyShareLinkForCurrent = function(){
  const token = currentShareToken();
  if(!saveSharePayload(token, buildSharePayload())){ alert('No se pudo guardar el payload.'); return; }
  const link = makeShareLink(token);
  navigator.clipboard.writeText(link);
  alert('Link copiado.');
};
window.openShareLinkForCurrent = function(){
  const token = currentShareToken();
  if(!saveSharePayload(token, buildSharePayload())){ alert('No se pudo guardar el payload.'); return; }
  window.open(makeShareLink(token), '_blank');
};

/* ========= Share mode UI ========= */
let __SHARE_MOUNT = null;

function enterShareMode(token){
  window.__ARSLAN_SHARE_MODE = true;
  window.__ARSLAN_SHARE_TOKEN = token;

  const tabbar = byId('tabbar');
  const hint = byId('appHint');
  const btnBack = byId('btnShareMode');
  if(tabbar) tabbar.style.display='none';
  if(hint) hint.style.display='none';
  if(btnBack) btnBack.style.display='inline-flex';

  ['dic','tiendas','global','proveedores','share'].forEach(k=>{
    const sec = byId('tab-'+k);
    if(sec) sec.style.display = (k==='share') ? 'block' : 'none';
  });

  window.__ARSLAN_SHARE_PAYLOAD = loadSharePayload(token);

  renderShareTabs();
  renderShareCurrent();
}

window.exitShareMode = function(){
  const u = new URL(location.href);
  u.searchParams.delete('t');
  location.href = u.toString();
};

function renderShareTabs(){
  const tabs = byId('shareTabs');
  if(!tabs) return;
  tabs.innerHTML = '';

  const payload = window.__ARSLAN_SHARE_PAYLOAD;
  if(!payload){ tabs.innerHTML='<div class="hint">Link inválido o sin datos en este dispositivo.</div>'; return; }

  const add = (id, label)=>{
    const b = document.createElement('button');
    b.className = 'tabpill' + (window.__ARSLAN_SHARE_VIEW.tab===id ? ' active' : '');
    b.textContent = label;
    b.onclick = ()=>{ window.__ARSLAN_SHARE_VIEW.tab=id; renderShareTabs(); renderShareCurrent(); };
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
  if(meta) meta.textContent = payload.meta ? `Creado: ${payload.meta.iso} — ${payload.meta.version}` : '';
}

function renderShareCurrent(){
  const payload = window.__ARSLAN_SHARE_PAYLOAD;
  const title = byId('shareListTitle');
  if(!payload){
    if(title) title.textContent='Link inválido';
    const ul=byId('shareClickList'); if(ul) ul.innerHTML='';
    const hint=byId('shareListHint'); if(hint) hint.textContent='';
    return;
  }

  const tab = window.__ARSLAN_SHARE_VIEW.tab || 'GLOBAL';
  let items = [];
  let label = '🛒 Compra Global';

  if(tab==='GLOBAL'){ items = payload.global || []; label='🛒 Compra Global (final)'; }
  else{
    items = (payload.splits && payload.splits[tab]) ? payload.splits[tab] : [];
    if(tab==='sp') label='🏪 San Pablo';
    if(tab==='sl') label='🏪 San Lesmes';
    if(tab==='st') label='🏪 Santiago';
    const def = EXTRA_DEFS.find(x=>x.code===tab);
    if(def) label = `${def.icon} ${def.label}`;
  }

  if(title) title.textContent = label;

  __SHARE_MOUNT = mountClickableList({
    items, key:'SHARE_'+window.__ARSLAN_SHARE_TOKEN+'_'+tab, ulId:'shareClickList', hintId:'shareListHint'
  });
}

window.shareMarkAll = function(){ if(__SHARE_MOUNT) __SHARE_MOUNT.markAll(); };
window.shareResetChecks = function(){ if(__SHARE_MOUNT) __SHARE_MOUNT.reset(); };
window.shareCopyCurrentLink = function(){
  const token = window.__ARSLAN_SHARE_TOKEN;
  if(!token) return alert('Sin token.');
  navigator.clipboard.writeText(makeShareLink(token));
  alert('Link copiado.');
};
window.shareDownloadTXTCurrent = function(){
  const payload = window.__ARSLAN_SHARE_PAYLOAD;
  if(!payload) return alert('Link inválido.');
  const tab = window.__ARSLAN_SHARE_VIEW.tab || 'GLOBAL';
  const items = (tab==='GLOBAL') ? (payload.global||[]) : ((payload.splits && payload.splits[tab]) ? payload.splits[tab] : []);
  if(!items.length) return alert('No hay datos.');
  const today = new Date().toISOString().split('T')[0];
  const txt = items.map(x=>`${x.qty} ${x.name}`).join('\n');
  const blob = new Blob([txt],{type:'text/plain'});
  const a = document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`share_${tab}_${today}.txt`;
  a.click();
};

/* ========= Init ========= */
function init(){
  const savedTheme = localStorage.getItem('arslan_theme') || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme);

  loadState();

  // cargar vocab después de que el textarea exista
  loadVocab();

  // Share mode?
  const token = getQueryParam('t');
  if(token){ enterShareMode(token); return; }

  window.showTab('dic');
  idle(()=>{ buildProvBar(); window.unificarGlobal(); window.renderExtraOrdersUI(); renderExtraChips(); renderProvidersPanels(); window.renderFinalTabs(); window.renderFinalClickable('GLOBAL'); });

  // 🔥 indicador rápido si el JS está vivo
  // console.log("ARSLAN v3.5 OK");
}

window.addEventListener('DOMContentLoaded', init);

})(); 
