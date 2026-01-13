/* ==========================
   ARSLAN LISTAS v3.5 — KIWI PRO (FIXED)
   - Carga vocab SIEMPRE + Datalist global para autocompletar
   - Autocorrección mejorada al editar nombre (exact + sinónimos + fuzzy)
   - Inputs estables (no contenteditable) en tablas para evitar errores
   - Cantidades inteligentes + unidades
   - Auto-estandarizar en Tiendas (menos toques)
   - Undo general + Undo asignación proveedor
   - Duplicados + equivalencias
   - Añadir proveedores + seguridad/backups + export/import
========================== */

(() => {
  /* --------------------------
     Helpers / DOM
  -------------------------- */
  const $ = (q) => document.querySelector(q);
  const byId = (id) => document.getElementById(id);
  const nowISO = () => new Date().toISOString();
  const todayISO = () => new Date().toISOString().slice(0,10);

  const toLines = (t) => String(t||"")
    .split(/\r?\n|,/g)
    .map(x=>x.trim())
    .filter(Boolean);

  const debounce = (fn, wait=250) => {
    let t=null;
    return (...args) => {
      clearTimeout(t);
      t=setTimeout(()=>fn(...args), wait);
    };
  };

  const idle = (cb) => (window.requestIdleCallback ? requestIdleCallback(cb) : setTimeout(cb, 1));

  function removeDiacriticsUpper(s){
    return String(s||"")
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/ñ/g,"N").replace(/Ñ/g,"N")
      .toUpperCase();
  }
  function normKey(s){
    return removeDiacriticsUpper(s)
      .replace(/[^A-Z0-9\s]/g," ")
      .replace(/\s+/g," ")
      .trim();
  }

  /* --------------------------
     LocalStorage keys
  -------------------------- */
  const LS = {
    THEME: "arslan_theme",
    VOCAB: "arslan_v35_vocab",
    SYN: "arslan_v35_syn",
    STORES: "arslan_v35_stores",
    PROVS: "arslan_v35_provs",
    ASSIGN: "arslan_v35_assign",
    ORDERS: "arslan_v35_orders",
    CATALOG: "arslan_v35_catalog",
    BACKUPS: "arslan_v35_backups",
    UNDO: "arslan_v35_undo_stack"
  };

  /* --------------------------
     Defaults / Constants
  -------------------------- */
  const DEFAULT_PROVS = ["ESMO","MONTENEGRO","ÁNGEL VACA","JOSÉ ANTONIO","JAVI","ANGELO"];
  const IGNORE_WORDS = ["caja","cajas","kg","kgs","kilo","kilos","uds","ud","u","unidad","unidades","manojo","manojos","saco","sacos"];
  const MATCH_THRESHOLD = 0.78; // fuzzy mínimo
  const SIM_DUP_THRESHOLD = 0.86;

  const STORE_META = {
    sp:{name:"San Pablo", icon:"🏪"},
    sl:{name:"San Lesmes", icon:"🏪"},
    st:{name:"Santiago", icon:"🏪"}
  };

  /* --------------------------
     State
  -------------------------- */
  let VOCAB_CACHE = null;
  let VOCAB_SIG = null;

  let state = {
    vocab: [],
    synonyms: {},         // { ORIGKEY : DESTNAME }
    stores: { sp:[], sl:[], st:[] }, // rows {o,e,q,u,a}
    providers: [],
    activeProv: "",
    assignments: {},      // { normKey(product)+"||unit" : provider }
    orders: {},           // { provider : [{name, qty, unit}] }
    catalog: {},          // { normKey(name)+"||unit" : { name, unit, prices:[], last:null } }
    reparto: {},          // {store:[{name,qty,unit,price,checked}] } (no persist)
    undoStack: [],        // snapshots
    assignUndo: []        // actions for undo assignment
  };

  /* --------------------------
     Theme
  -------------------------- */
  function applyTheme(t){
    document.documentElement.setAttribute("data-theme", t==="dark"?"dark":"light");
    localStorage.setItem(LS.THEME, t);
  }
  function toggleTheme(){
    const cur = localStorage.getItem(LS.THEME) || "light";
    applyTheme(cur==="light"?"dark":"light");
  }

  /* --------------------------
     Safety / Backups / Undo
  -------------------------- */
  function snapshot(label=""){
    return {
      label,
      at: Date.now(),
      stores: JSON.parse(JSON.stringify(state.stores)),
      providers: JSON.parse(JSON.stringify(state.providers)),
      activeProv: state.activeProv,
      assignments: JSON.parse(JSON.stringify(state.assignments)),
      orders: JSON.parse(JSON.stringify(state.orders)),
      vocabText: byId("vocabTxt") ? String(byId("vocabTxt").value||"") : "",
      synText: byId("synTxt") ? String(byId("synTxt").value||"") : "",
      catalog: JSON.parse(JSON.stringify(state.catalog))
    };
  }

  function pushUndo(label){
    try{
      const snap = snapshot(label);
      state.undoStack.unshift(snap);
      state.undoStack = state.undoStack.slice(0, 25);
      localStorage.setItem(LS.UNDO, JSON.stringify(state.undoStack));
    }catch{}
  }

  function undo(){
    const stack = state.undoStack || [];
    if(!stack.length){
      alert("No hay acciones para deshacer.");
      return;
    }
    const snap = stack.shift();
    state.undoStack = stack;
    localStorage.setItem(LS.UNDO, JSON.stringify(state.undoStack));

    state.stores = snap.stores || {sp:[],sl:[],st:[]};
    state.providers = snap.providers || DEFAULT_PROVS.slice();
    state.activeProv = snap.activeProv || (state.providers[0]||"");
    state.assignments = snap.assignments || {};
    state.orders = snap.orders || {};
    state.catalog = snap.catalog || {};

    if(byId("vocabTxt")) byId("vocabTxt").value = snap.vocabText || byId("vocabTxt").value;
    if(byId("synTxt")) byId("synTxt").value = snap.synText || byId("synTxt").value;

    persistAll();
    rebuildCachesFromText();      // ✅ recargar vocab/syn en memoria
    rebuildVocabDatalist();       // ✅ autocompletar actualizado
    hardRefreshUI();
  }

  function saveBackup(){
    pushUndo("backup-before");
    const backups = JSON.parse(localStorage.getItem(LS.BACKUPS)||"[]");
    const b = { at: nowISO(), data: exportAllDataObject() };
    backups.unshift(b);
    const trimmed = backups.slice(0,7);
    localStorage.setItem(LS.BACKUPS, JSON.stringify(trimmed));
    updateBackupPill();
    alert("Backup guardado ✅");
  }

  function updateBackupPill(){
    const backups = JSON.parse(localStorage.getItem(LS.BACKUPS)||"[]");
    const pill = byId("pillBackups");
    if(pill) pill.textContent = String(backups.length);
  }

  function safeReset(){
    const v = prompt("Escribe BORRAR para limpiar todo (reset seguro):");
    if(v !== "BORRAR") return;
    localStorage.clear();
    location.reload();
  }

  /* --------------------------
     Export/Import JSON (sistema completo)
  -------------------------- */
  function exportAllDataObject(){
    return {
      version: "v3.5",
      exportedAt: nowISO(),
      theme: localStorage.getItem(LS.THEME) || "light",
      vocab: byId("vocabTxt") ? String(byId("vocabTxt").value||"") : "",
      synonyms: byId("synTxt") ? String(byId("synTxt").value||"") : "",
      stores: state.stores,
      providers: state.providers,
      activeProv: state.activeProv,
      assignments: state.assignments,
      orders: state.orders,
      catalog: state.catalog,
      backups: JSON.parse(localStorage.getItem(LS.BACKUPS)||"[]")
    };
  }

  function downloadJSON(obj, filename){
    const blob = new Blob([JSON.stringify(obj,null,2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  function exportJSON(){
    const obj = exportAllDataObject();
    downloadJSON(obj, `arslan_listas_backup_${todayISO()}.json`);
  }

  function importJSONFile(file){
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const obj = JSON.parse(String(reader.result||"{}"));
        applyImportedObject(obj);
        alert("Importado ✅");
      }catch(e){
        alert("JSON inválido.");
      }
    };
    reader.readAsText(file);
  }

  function applyImportedObject(obj){
    pushUndo("import-json");

    if(obj.theme) applyTheme(obj.theme);

    if(byId("vocabTxt") && typeof obj.vocab==="string"){
      byId("vocabTxt").value = obj.vocab;
      localStorage.setItem(LS.VOCAB, obj.vocab);
    }
    if(byId("synTxt") && typeof obj.synonyms==="string"){
      byId("synTxt").value = obj.synonyms;
      localStorage.setItem(LS.SYN, obj.synonyms);
    }

    state.providers = Array.isArray(obj.providers) && obj.providers.length ? obj.providers : DEFAULT_PROVS.slice();
    state.activeProv = obj.activeProv || (state.providers[0]||"");
    state.stores = obj.stores || {sp:[],sl:[],st:[]};
    state.assignments = obj.assignments || {};
    state.orders = obj.orders || {};
    state.catalog = obj.catalog || {};

    if(Array.isArray(obj.backups)){
      localStorage.setItem(LS.BACKUPS, JSON.stringify(obj.backups.slice(0,7)));
    }

    persistAll();
    rebuildCachesFromText();      // ✅ recarga vocab/syn
    rebuildVocabDatalist();       // ✅ autocompletar
    refreshStoresFlags();         // ✅ revalida OK/REVISAR
    hardRefreshUI();
  }

  /* --------------------------
     Persist
  -------------------------- */
  function persistAll(){
    localStorage.setItem(LS.VOCAB, byId("vocabTxt") ? String(byId("vocabTxt").value||"") : "");
    localStorage.setItem(LS.SYN, byId("synTxt") ? String(byId("synTxt").value||"") : "");
    localStorage.setItem(LS.STORES, JSON.stringify(state.stores));
    localStorage.setItem(LS.PROVS, JSON.stringify(state.providers));
    localStorage.setItem(LS.ASSIGN, JSON.stringify(state.assignments));
    localStorage.setItem(LS.ORDERS, JSON.stringify(state.orders));
    localStorage.setItem(LS.CATALOG, JSON.stringify(state.catalog));
    localStorage.setItem(LS.UNDO, JSON.stringify(state.undoStack||[]));
  }
  const persistAllDebounced = debounce(persistAll, 250);

  /* --------------------------
     Vocab + Synonyms (CARGA SIEMPRE)
  -------------------------- */
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

  function rebuildCachesFromText(){
    // ✅ Siempre reconstruye desde los textareas actuales
    const vocabTxt = byId("vocabTxt") ? String(byId("vocabTxt").value||"") : "";
    const synTxt = byId("synTxt") ? String(byId("synTxt").value||"") : "";

    const list = uniqueVocab(toLines(vocabTxt));
    state.vocab = list;

    VOCAB_CACHE = list;
    VOCAB_SIG = vocabTxt.length + "|" + vocabTxt.slice(0,60) + "|" + vocabTxt.slice(-60);

    state.synonyms = parseSynonymsText(synTxt);
  }

  function getVocabCached(){
    const txt = byId("vocabTxt") ? String(byId("vocabTxt").value||"") : "";
    const sig = txt.length + "|" + txt.slice(0,60) + "|" + txt.slice(-60);

    if(VOCAB_CACHE && VOCAB_SIG===sig) return VOCAB_CACHE;

    const list = uniqueVocab(toLines(txt));
    VOCAB_CACHE = list;
    VOCAB_SIG = sig;
    state.vocab = list;
    return list;
  }

  function parseSynonymsText(t){
    const map = {};
    toLines(t).forEach(line=>{
      const s = line.split("#")[0].trim();
      if(!s) return;
      const m = s.split("=");
      if(m.length<2) return;
      const a = removeDiacriticsUpper(m[0].trim());
      const b = removeDiacriticsUpper(m.slice(1).join("=").trim());
      if(a && b) map[normKey(a)] = removeDiacriticsUpper(b);
    });
    return map;
  }

  function applySynonyms(name){
    const key = normKey(name);
    const syn = state.synonyms[key];
    return syn ? syn : name;
  }

  /* --------------------------
     ✅ DATALIST (AUTOCOMPLETAR)
  -------------------------- */
  function rebuildVocabDatalist(){
    const dl = byId("vocabList");
    if(!dl) return;
    const vocab = getVocabCached();
    dl.innerHTML = vocab.map(v=>`<option value="${escapeHtml(v)}"></option>`).join("");
  }

  function escapeHtml(s){
    return String(s||"")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;");
  }

  /* --------------------------
     Similarity (Dice + TokenSet)
  -------------------------- */
  function stripGenericWords(s){
    const tokens = normKey(s).split(" ").filter(t=>!IGNORE_WORDS.includes(String(t||"").toLowerCase()));
    return tokens.join(" ").trim();
  }

  function bigrams(str){
    const s = stripGenericWords(str);
    const arr=[];
    for(let i=0;i<s.length-1;i++){
      if(s[i]!==" " && s[i+1]!==" ") arr.push(s.slice(i,i+2));
    }
    return arr;
  }
  function diceSim(a,b){
    const A=bigrams(a), B=bigrams(b);
    if(!A.length||!B.length) return 0;
    let hits=0; const pool=B.slice();
    A.forEach(bg=>{
      const idx = pool.indexOf(bg);
      if(idx>-1){ hits++; pool.splice(idx,1); }
    });
    return (2*hits)/(A.length+B.length);
  }
  function tokenSetSim(a,b){
    const A=new Set(stripGenericWords(a).split(" ").filter(Boolean));
    const B=new Set(stripGenericWords(b).split(" ").filter(Boolean));
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

  /* --------------------------
     ✅ AUTOCORRECCIÓN AL EDITAR
     - Si coincide exacto → ok
     - Si sinónimo → aplica destino
     - Si fuzzy >= threshold → autocorrige
     - Si no → lo deja (REVISAR)
  -------------------------- */
  function autocorrectNameToVocab(rawName){
    let nm = removeDiacriticsUpper(String(rawName||"").trim());
    if(!nm) return {name:"", ok:false, changed:false};

    nm = applySynonyms(nm);

    const vocab = getVocabCached();
    const exact = vocab.find(v => normKey(v)===normKey(nm));
    if(exact){
      const changed = exact !== nm;
      return {name: exact, ok:true, changed};
    }

    const m = bestMatch(nm, vocab);
    if(m.name && m.score >= MATCH_THRESHOLD){
      return {name: m.name, ok:true, changed:true, score:m.score};
    }

    return {name: nm, ok:false, changed:false};
  }

  /* --------------------------
     Smart Parser (qty + unit + name)
  -------------------------- */
  const UNIT_MAP = [
    {re:/(^|\s)(kg|kgs|kilo|kilos)(\s|$)/i, unit:"KG"},
    {re:/(^|\s)(caja|cajas)(\s|$)/i, unit:"CAJA"},
    {re:/(^|\s)(manojo|manojos)(\s|$)/i, unit:"MANOJO"},
    {re:/(^|\s)(saco|sacos)(\s|$)/i, unit:"SACO"},
    {re:/(^|\s)(ud|uds|u|unidad|unidades)(\s|$)/i, unit:"UD"}
  ];

  function detectUnit(text){
    for(const u of UNIT_MAP){
      if(u.re.test(text)) return u.unit;
    }
    return "";
  }

  function toNumberSmart(s){
    const x = String(s||"").trim();
    if(!x) return null;
    const frac = x.match(/^(\d+)\s*\/\s*(\d+)$/);
    if(frac){
      const a = Number(frac[1]); const b = Number(frac[2]);
      if(b) return a/b;
      return null;
    }
    const n = Number(x.replace(",","."));
    return isNaN(n) ? null : n;
  }

  function cleanNameKeepLetters(s){
    return removeDiacriticsUpper(s)
      .replace(/[^A-Z0-9\s]/g," ")
      .replace(/\s+/g," ")
      .trim();
  }

  function parseLineSmart(raw){
    if(!raw) return null;
    let s = String(raw).replace(/\t/g," ").replace(/\s{2,}/g," ").trim();
    s = s.replace(/^[-•*]\s*/,"");
    if(!s) return null;

    const unit = detectUnit(s);
    let qty = null;

    const mx = s.match(/(?:^|\s)(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+)\s*x\s*(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+)(?:\s|$)/i);
    if(mx){
      const a = toNumberSmart(mx[1].replace(/\s/g,""));
      const b = toNumberSmart(mx[2].replace(/\s/g,""));
      if(a!=null && b!=null) qty = a*b;
      s = s.replace(mx[0]," ").trim();
    }

    if(qty===null){
      const mx2 = s.match(/(?:x|X|\*)\s*(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+)/);
      if(mx2){
        const v = toNumberSmart(mx2[1].replace(/\s/g,""));
        if(v!=null) qty = v;
        s = s.replace(mx2[0]," ").trim();
      }
    }

    if(qty===null){
      const mend = s.match(/(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+)\s*(?:kg|kgs|kilo|kilos|uds|ud|u|unidad|unidades|caja|cajas|manojo|manojos|saco|sacos)?\s*$/i);
      if(mend){
        const v = toNumberSmart(mend[1].replace(/\s/g,""));
        if(v!=null) qty = v;
        s = s.slice(0, mend.index).trim();
      }
    }

    if(qty===null){
      const mstart = s.match(/^\s*(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+)\s+(.*)$/);
      if(mstart){
        const v = toNumberSmart(mstart[1].replace(/\s/g,""));
        if(v!=null) qty = v;
        s = mstart[2].trim();
      }
    }

    if(qty===null) qty = 1;

    let name = s;
    name = cleanNameKeepLetters(name);

    const tokens = name.split(" ").filter(t=>{
      const low = t.toLowerCase();
      return !IGNORE_WORDS.includes(low);
    });
    name = tokens.join(" ").trim();
    if(!name) name = cleanNameKeepLetters(raw);

    name = applySynonyms(name);

    return { original: removeDiacriticsUpper(String(raw)), name, qty, unit };
  }

  /* --------------------------
     Store ops
  -------------------------- */
  function sumDuplicatesRows(rows){
    const map = new Map();
    rows.forEach(r=>{
      const k = normKey(r.e);
      const u = r.u || "";
      const key = k + "||" + u;
      if(!map.has(key)) map.set(key, {o:r.o, e:r.e, q:0, u:u, a:r.a});
      const it = map.get(key);
      it.q += Number(r.q)||0;
      it.a = it.a || r.a;
    });
    return Array.from(map.values()).sort((a,b)=>a.e.localeCompare(b.e,"es"));
  }

  function estandarizarStore(code, sourceText){
    const vocab = getVocabCached();
    const rows = [];
    toLines(sourceText).forEach(line=>{
      const p = parseLineSmart(line);
      if(!p) return;

      // ✅ autocorrige con el sistema nuevo
      const ac = autocorrectNameToVocab(p.name);
      rows.push({o:p.original, e: ac.name, q: p.qty, u: p.unit || "", a: !ac.ok});
    });

    const merged = sumDuplicatesRows(rows);
    state.stores[code] = merged;
    persistAllDebounced();
  }

  function storeToTextarea(code){
    const rows = state.stores[code]||[];
    return rows.map(r=>{
      const u = r.u ? ` ${r.u}` : "";
      return `${r.e} ${r.q}${u}`;
    }).join("\n");
  }

  function storeExportTXT(code){
    const rows = state.stores[code]||[];
    if(!rows.length){ alert("No hay datos."); return; }
    const ok = rows.filter(r=>!r.a);
    if(!ok.length){ alert("Aún hay productos por revisar (en rojo)."); return; }
    const txt = ok.map(r=>{
      const u = r.u ? ` ${r.u}` : "";
      return `${r.q} ${r.e}${u}`;
    }).join("\n");
    const blob = new Blob([txt], {type:"text/plain"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${code}_estandarizado_${todayISO()}.txt`;
    a.click();
  }

  function storeSendWA(code){
    const rows = state.stores[code]||[];
    if(!rows.length){ alert("No hay datos."); return; }
    const ok = rows.filter(r=>!r.a);
    if(!ok.length){ alert("Aún hay productos por revisar (en rojo)."); return; }
    const lines = ok.map(r=>{
      const u = r.u ? ` ${r.u}` : "";
      return `${r.q} ${r.e}${u}`;
    }).join("\n");
    const meta = STORE_META[code];
    const msg = encodeURIComponent(`🛒 *Pedido ${meta.name}*\n\n${lines}\n\nGracias`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  /* --------------------------
     Global unify + duplicates detect
  -------------------------- */
  let globalRows = [];
  let globalAll = [];

  function unifyGlobal(){
    const all = [].concat(state.stores.sp||[], state.stores.sl||[], state.stores.st||[]);
    const map = new Map();

    all.forEach(r=>{
      const name = r.e;
      const unit = r.u || "";
      const k = normKey(name) + "||" + unit;
      if(!map.has(k)) map.set(k, {name, unit, total:0});
      map.get(k).total += Number(r.q)||0;
    });

    globalAll = Array.from(map.values())
      .sort((a,b)=> (a.name + a.unit).localeCompare(b.name + b.unit, "es"));

    const visible = globalAll.filter(it => !state.assignments[normKey(it.name) + "||" + (it.unit||"")]);
    const q = normKey(byId("globalSearch") ? byId("globalSearch").value : "");
    globalRows = q ? visible.filter(x => normKey(x.name).includes(q)) : visible;

    renderGlobalTable();
  }

  function detectSimilarSet(rows){
    const names = rows.map(x=>x.name + (x.unit?(" "+x.unit):""));
    const similarSet = new Set();
    for(let i=0;i<names.length;i++){
      for(let j=i+1;j<names.length;j++){
        const s1 = names[i], s2 = names[j];
        const sc = similarityScore(s1, s2);
        if(sc >= SIM_DUP_THRESHOLD && normKey(s1)!==normKey(s2)){
          similarSet.add(s1);
          similarSet.add(s2);
        }
      }
    }
    return similarSet;
  }

  function fmtQty(n){
    const x = Number(n)||0;
    if(Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
    return x.toFixed(2);
  }

  /* --------------------------
     ✅ Render Global con INPUT + DATALIST (AUTOCOMPLETE)
  -------------------------- */
  function renderGlobalTable(){
    const wrap = byId("globalWrap");
    const pill = byId("pillGlobalCount");
    if(pill) pill.textContent = String(globalRows.length);

    if(!wrap) return;
    if(!globalRows.length){
      wrap.innerHTML = `<div class="hint">Sin productos (todo asignado o vacío).</div>`;
      return;
    }

    const similarSet = detectSimilarSet(globalRows);

    let html = `<div class="scroll-x"><table>
      <thead><tr>
        <th></th>
        <th>Producto</th>
        <th>Total</th>
        <th>Unidad</th>
        <th>Estado</th>
        <th>Precio</th>
      </tr></thead><tbody>`;

    globalRows.forEach((r,idx)=>{
      const keyShow = (r.name + (r.unit?(" "+r.unit):""));
      const isSimilar = similarSet.has(keyShow);
      const priceInfo = getLastPriceInfoFor(r.name, state.activeProv);

      html += `<tr data-i="${idx}" class="${isSimilar?'dupRow':''}">
        <td><button class="ok-assign" data-assign="${idx}">✅</button></td>
        <td>
          <input class="cellInput ${isSimilar?'warn':'ok'}" list="vocabList" data-gname="${idx}" value="${escapeHtml(r.name)}" />
          ${isSimilar?`<span class="flag">⚠️</span>`:""}
        </td>
        <td><input class="cellInput small" data-gtotal="${idx}" value="${escapeHtml(fmtQty(r.total))}" /></td>
        <td><input class="cellInput small" data-gunit="${idx}" value="${escapeHtml(r.unit||"")}" /></td>
        <td>${isSimilar?`<span class="pill warn">Posible duplicado</span>`:`<span class="pill ok">OK</span>`}</td>
        <td>${priceInfo}</td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
    wrap.innerHTML = html;

    wrap.querySelectorAll("[data-assign]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const idx = Number(btn.getAttribute("data-assign"));
        assignFromGlobal(idx);
      });
    });

    // ✅ Autocorrección al salir del input
    wrap.querySelectorAll("input[data-gname]").forEach(inp=>{
      inp.addEventListener("blur", ()=>{
        const idx = Number(inp.getAttribute("data-gname"));
        if(!globalRows[idx]) return;

        pushUndo("edit-global-name");

        const ac = autocorrectNameToVocab(inp.value);
        globalRows[idx].name = ac.name;
        inp.value = ac.name;
        inp.classList.toggle("ok", ac.ok);
        inp.classList.toggle("warn", !ac.ok);

        persistAllDebounced();
        idle(()=>{ unifyGlobal(); });
      }, {passive:true});
    });

    wrap.querySelectorAll("input[data-gtotal]").forEach(inp=>{
      inp.addEventListener("blur", ()=>{
        const idx = Number(inp.getAttribute("data-gtotal"));
        if(!globalRows[idx]) return;
        pushUndo("edit-global-total");
        globalRows[idx].total = Number(String(inp.value).replace(",", ".")) || 0;
        inp.value = fmtQty(globalRows[idx].total);
        persistAllDebounced();
        idle(()=>{ unifyGlobal(); });
      }, {passive:true});
    });

    wrap.querySelectorAll("input[data-gunit]").forEach(inp=>{
      inp.addEventListener("blur", ()=>{
        const idx = Number(inp.getAttribute("data-gunit"));
        if(!globalRows[idx]) return;
        pushUndo("edit-global-unit");
        globalRows[idx].unit = removeDiacriticsUpper(inp.value||"");
        inp.value = globalRows[idx].unit;
        persistAllDebounced();
        idle(()=>{ unifyGlobal(); });
      }, {passive:true});
    });
  }

  /* --------------------------
     Providers / Assign / Undo assign
  -------------------------- */
  function ensureOrdersBuckets(){
    state.providers.forEach(p=>{
      if(!Array.isArray(state.orders[p])) state.orders[p] = [];
    });
  }

  function assignFromGlobal(idx){
    const item = globalRows[idx];
    if(!item) return;

    pushUndo("assign-from-global");

    const k = normKey(item.name) + "||" + (item.unit||"");
    const prov = state.activeProv;

    state.assignUndo.unshift({
      at: Date.now(),
      prov,
      key: k,
      name: item.name,
      unit: item.unit||"",
      qty: Number(item.total)||0
    });
    state.assignUndo = state.assignUndo.slice(0, 50);

    state.assignments[k] = prov;

    ensureOrdersBuckets();
    const list = state.orders[prov] || [];
    const exIdx = list.findIndex(x => (normKey(x.name) + "||" + (x.unit||"")) === k);
    if(exIdx>-1){
      list[exIdx].qty += Number(item.total)||0;
    }else{
      list.push({name:item.name, qty:Number(item.total)||0, unit:item.unit||""});
    }
    state.orders[prov] = list;

    ensureCatalogEntry(item.name, item.unit||"");

    persistAllDebounced();
    idle(()=>{ unifyGlobal(); renderProvidersPanels(); renderProductsTable(); });
  }

  function undoAssign(){
    const a = state.assignUndo.shift();
    if(!a){
      alert("No hay asignación para deshacer.");
      return;
    }

    pushUndo("undo-assign");

    delete state.assignments[a.key];

    const list = state.orders[a.prov] || [];
    const idx = list.findIndex(x => (normKey(x.name) + "||" + (x.unit||"")) === a.key);
    if(idx>-1){
      list[idx].qty -= a.qty;
      if(list[idx].qty <= 0) list.splice(idx,1);
    }
    state.orders[a.prov] = list;

    persistAllDebounced();
    idle(()=>{ unifyGlobal(); renderProvidersPanels(); });
  }

  function buildProvBar(){
    const bar = byId("provBar");
    if(!bar) return;
    bar.innerHTML = "";

    state.providers.forEach(p=>{
      const b = document.createElement("button");
      b.className = "prov-btn" + (p===state.activeProv ? " active" : "");
      b.textContent = p;
      b.onclick = () => {
        state.activeProv = p;
        byId("activeProvName").textContent = p;
        buildProvBar();
        persistAllDebounced();
        idle(()=>{ unifyGlobal(); renderProductsTable(); });
      };
      bar.appendChild(b);
    });

    byId("activeProvName").textContent = state.activeProv || "";
  }

  /* --------------------------
     Providers panels (INPUT + AUTOCOMPLETE)
  -------------------------- */
  function exportProvTXT(prov){
    const list = state.orders[prov] || [];
    if(!list.length){ alert("No hay líneas para " + prov); return; }
    const txt = list
      .slice()
      .sort((a,b)=> (a.name+a.unit).localeCompare(b.name+b.unit,"es"))
      .map(x => `${fmtQty(x.qty)} ${x.name}${x.unit?(" "+x.unit):""}`)
      .join("\n");

    const blob = new Blob([txt], {type:"text/plain"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pedido_${prov}_${todayISO()}.txt`;
    a.click();
  }

  function sendProvWA(prov){
    const list = state.orders[prov] || [];
    if(!list.length){ alert("No hay líneas para " + prov); return; }
    const txt = list
      .slice()
      .sort((a,b)=> (a.name+a.unit).localeCompare(b.name+b.unit,"es"))
      .map(x => `${fmtQty(x.qty)} ${x.name}${x.unit?(" "+x.unit):""}`)
      .join("\n");

    const msg = encodeURIComponent(`📦 *Pedido ${prov}*\n\n${txt}\n\nGracias`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  function renderProvidersPanels(){
    const cont = byId("provPanels");
    if(!cont) return;
    cont.innerHTML = "";

    ensureOrdersBuckets();

    state.providers.forEach(prov=>{
      const list = state.orders[prov] || [];
      const card = document.createElement("div");
      card.className = "card";

      const hd = document.createElement("div");
      hd.className = "hd";
      hd.innerHTML = `
        <strong>${escapeHtml(prov)}</strong>
        <div class="toolbar">
          <button class="btn small muted" data-ptxt="${escapeHtml(prov)}">📄 TXT</button>
          <button class="btn small" data-pwa="${escapeHtml(prov)}">📲 WhatsApp</button>
        </div>
      `;

      const bd = document.createElement("div");
      bd.className = "bd";

      if(!list.length){
        bd.innerHTML = `<div class="hint">Sin productos asignados.</div>`;
      }else{
        let html = `<div class="scroll-x"><table>
          <thead><tr><th>Producto</th><th>Cantidad</th><th>Unidad</th><th>Precio</th></tr></thead><tbody>`;

        list.forEach((it,ix)=>{
          const priceInfo = getLastPriceInfoFor(it.name, prov);
          html += `<tr>
            <td>
              <input class="cellInput ok" list="vocabList" data-pname="${escapeHtml(prov)}" data-idx="${ix}" value="${escapeHtml(it.name)}" />
            </td>
            <td><input class="cellInput small" data-pqty="${escapeHtml(prov)}" data-idx="${ix}" value="${escapeHtml(fmtQty(it.qty))}" /></td>
            <td><input class="cellInput small" data-punit="${escapeHtml(prov)}" data-idx="${ix}" value="${escapeHtml(it.unit||"")}" /></td>
            <td>${priceInfo}</td>
          </tr>`;
        });

        html += `</tbody></table></div>`;
        bd.innerHTML = html;

        // ✅ autocorrección + persistencia
        bd.querySelectorAll("input[data-pname]").forEach(inp=>{
          inp.addEventListener("blur", ()=>{
            pushUndo("edit-provider-name");
            const prov2 = inp.getAttribute("data-pname");
            const idx = Number(inp.getAttribute("data-idx"));
            if(!state.orders[prov2] || !state.orders[prov2][idx]) return;

            const ac = autocorrectNameToVocab(inp.value);
            state.orders[prov2][idx].name = ac.name;
            inp.value = ac.name;
            inp.classList.toggle("ok", ac.ok);
            inp.classList.toggle("warn", !ac.ok);

            ensureCatalogEntry(ac.name, state.orders[prov2][idx].unit||"");
            persistAllDebounced();
            idle(()=>{ renderProvidersPanels(); renderProductsTable(); });
          }, {passive:true});
        });

        bd.querySelectorAll("input[data-pqty]").forEach(inp=>{
          inp.addEventListener("blur", ()=>{
            pushUndo("edit-provider-qty");
            const prov2 = inp.getAttribute("data-pqty");
            const idx = Number(inp.getAttribute("data-idx"));
            if(!state.orders[prov2] || !state.orders[prov2][idx]) return;

            const n = Number(String(inp.value||"").replace(",","."));
            state.orders[prov2][idx].qty = isNaN(n) ? 0 : n;
            if(state.orders[prov2][idx].qty<=0) state.orders[prov2].splice(idx,1);

            persistAllDebounced();
            idle(()=>{ renderProvidersPanels(); });
          }, {passive:true});
        });

        bd.querySelectorAll("input[data-punit]").forEach(inp=>{
          inp.addEventListener("blur", ()=>{
            pushUndo("edit-provider-unit");
            const prov2 = inp.getAttribute("data-punit");
            const idx = Number(inp.getAttribute("data-idx"));
            if(!state.orders[prov2] || !state.orders[prov2][idx]) return;

            state.orders[prov2][idx].unit = removeDiacriticsUpper(inp.value||"");
            inp.value = state.orders[prov2][idx].unit;

            ensureCatalogEntry(state.orders[prov2][idx].name, state.orders[prov2][idx].unit||"");
            persistAllDebounced();
            idle(()=>{ renderProvidersPanels(); renderProductsTable(); });
          }, {passive:true});
        });
      }

      card.appendChild(hd);
      card.appendChild(bd);
      cont.appendChild(card);

      card.querySelectorAll("[data-ptxt]").forEach(b=>b.onclick=()=>exportProvTXT(prov));
      card.querySelectorAll("[data-pwa]").forEach(b=>b.onclick=()=>sendProvWA(prov));
    });
  }

  /* --------------------------
     Providers manage modal
  -------------------------- */
  function openProvModal(){
    pushUndo("open-prov-modal");

    const modal = byId("modalProv");
    const list = byId("provManageList");
    modal.style.display = "flex";

    const draft = state.providers.slice();

    function renderDraft(){
      list.innerHTML = "";
      draft.forEach((p,idx)=>{
        const row = document.createElement("div");
        row.className = "miniRow";
        row.innerHTML = `
          <input value="${escapeHtml(p)}" data-i="${idx}" />
          <button class="btn muted small" data-del="${idx}">Eliminar</button>
        `;
        list.appendChild(row);
      });

      list.querySelectorAll("button[data-del]").forEach(btn=>{
        btn.onclick = () => {
          const i = Number(btn.getAttribute("data-del"));
          const name = draft[i];
          if(!confirm(`Eliminar proveedor: ${name}?`)) return;
          draft.splice(i,1);
          renderDraft();
        };
      });
    }

    renderDraft();

    byId("btnProvSave").onclick = () => {
      const arr = [];
      list.querySelectorAll("input[data-i]").forEach(inp=>{
        const v = String(inp.value||"").trim();
        if(v) arr.push(v);
      });

      const seen = new Set();
      const cleaned = [];
      arr.forEach(p=>{
        const k = normKey(p);
        if(!seen.has(k)){ seen.add(k); cleaned.push(p); }
      });

      if(!cleaned.length){
        alert("Debe haber al menos 1 proveedor.");
        return;
      }

      pushUndo("save-providers");

      state.providers = cleaned;

      if(!state.providers.includes(state.activeProv)){
        state.activeProv = state.providers[0];
      }

      const allowed = new Set(state.providers);
      Object.keys(state.assignments).forEach(k=>{
        const prov = state.assignments[k];
        if(!allowed.has(prov)) delete state.assignments[k];
      });

      const newOrders = {};
      state.providers.forEach(p=>{
        newOrders[p] = Array.isArray(state.orders[p]) ? state.orders[p] : [];
      });
      state.orders = newOrders;

      persistAllDebounced();
      closeProvModal();
      hardRefreshUI();
    };

    byId("btnProvCancel").onclick = () => closeProvModal();
  }

  function closeProvModal(){
    byId("modalProv").style.display = "none";
  }

  function addProviderQuick(){
    const p = prompt("Nombre del nuevo proveedor:");
    if(!p) return;

    pushUndo("add-provider");
    const name = String(p).trim();
    const key = normKey(name);
    if(!key) return;

    const exists = state.providers.some(x=>normKey(x)===key);
    if(exists){ alert("Ya existe."); return; }

    state.providers.push(name);
    state.orders[name] = [];
    persistAllDebounced();
    hardRefreshUI();
  }

  /* --------------------------
     Global exports
  -------------------------- */
  function copyGlobal(){
    if(!globalRows.length){ alert("No hay datos."); return; }
    const txt = globalRows.map(r => `- ${fmtQty(r.total)} ${r.name}${r.unit?(" "+r.unit):""}`).join("\n");
    navigator.clipboard.writeText(txt);
    alert("Copiado ✅");
  }

  function exportGlobalTXT(){
    if(!globalRows.length){ alert("No hay datos."); return; }
    const txt = globalRows.map(r => `${fmtQty(r.total)}\t${r.name}\t${r.unit||""}`).join("\n");
    const blob = new Blob([txt], {type:"text/plain"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lista_global_${todayISO()}.txt`;
    a.click();
  }

  function exportGlobalXLSX(){
    if(!globalRows.length){ alert("No hay datos."); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([["Producto","Total","Unidad"], ...globalRows.map(r=>[r.name, r.total, r.unit||""])]);
    XLSX.utils.book_append_sheet(wb, ws, "Global");
    XLSX.writeFile(wb, `lista_global_${todayISO()}.xlsx`);
  }

  function exportResumenGlobalTXT(){
    const all = globalAll.slice();
    const byProv = {};
    state.providers.forEach(p=>byProv[p]=[]);
    const unassigned = [];

    all.forEach(it=>{
      const k = normKey(it.name) + "||" + (it.unit||"");
      const prov = state.assignments[k];
      if(prov && byProv[prov]){
        byProv[prov].push({name:it.name, qty:it.total, unit:it.unit||""});
      }else{
        unassigned.push({name:it.name, qty:it.total, unit:it.unit||""});
      }
    });

    let out = `📦 PEDIDOS POR PROVEEDOR\n\n`;
    state.providers.forEach(p=>{
      out += `> ${p}:\n`;
      const arr = byProv[p] || [];
      if(arr.length){
        arr.sort((a,b)=> (a.name+a.unit).localeCompare(b.name+b.unit,"es"));
        arr.forEach(x=>{
          out += `- ${fmtQty(x.qty)} ${x.name}${x.unit?(" "+x.unit):""}\n`;
        });
      }else out += `- (sin líneas)\n`;
      out += `\n`;
    });

    out += `📌 SIN PROVEEDOR ASIGNADO:\n`;
    if(unassigned.length){
      unassigned.sort((a,b)=> (a.name+a.unit).localeCompare(b.name+b.unit,"es"));
      unassigned.forEach(x=>{
        out += `- ${fmtQty(x.qty)} ${x.name}${x.unit?(" "+x.unit):""}\n`;
      });
    }else out += `- (sin líneas)\n`;

    const blob = new Blob([out], {type:"text/plain"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `resumen_pedidos_${todayISO()}.txt`;
    a.click();
  }

  /* --------------------------
     Reparto
  -------------------------- */
  function renderReparto(){
    const code = byId("selReparto").value;
    const wrap = byId("repartoWrap");
    const pill = byId("pillRepartoCount");
    if(!wrap) return;

    if(!code){
      wrap.innerHTML = `<div class="hint">Selecciona una tienda para ver su lista.</div>`;
      if(pill) pill.textContent = "0";
      return;
    }

    const lista = state.stores[code] || [];
    if(!lista.length){
      wrap.innerHTML = `<div class="hint">Sin datos en esta tienda.</div>`;
      if(pill) pill.textContent = "0";
      return;
    }

    if(!state.reparto[code] || state.reparto[code].length !== lista.length){
      state.reparto[code] = lista.map(x => ({ name:x.e, qty:x.q, unit:x.u||"", price:"", checked:false }));
    }

    if(pill) pill.textContent = String(state.reparto[code].length);

    let html = `<table><thead><tr>
      <th></th><th>Producto</th><th>Cantidad</th><th>Unidad</th><th>Precio (€)</th>
    </tr></thead><tbody>`;

    state.reparto[code].forEach((r,i)=>{
      html += `<tr>
        <td><input type="checkbox" ${r.checked?"checked":""} data-rchk="${code}" data-i="${i}"></td>
        <td>${escapeHtml(r.name)}</td>
        <td>${escapeHtml(fmtQty(r.qty))}</td>
        <td>${escapeHtml(r.unit||"")}</td>
        <td><input class="cellInput small" data-rprice="${code}" data-i="${i}" value="${escapeHtml(r.price||"")}" /></td>
      </tr>`;
    });

    html += `</tbody></table>`;
    wrap.innerHTML = html;

    wrap.querySelectorAll("input[data-rchk]").forEach(chk=>{
      chk.onchange = () => {
        const c = chk.getAttribute("data-rchk");
        const i = Number(chk.getAttribute("data-i"));
        state.reparto[c][i].checked = chk.checked;
      };
    });

    wrap.querySelectorAll("input[data-rprice]").forEach(inp=>{
      inp.addEventListener("blur", ()=>{
        const c = inp.getAttribute("data-rprice");
        const i = Number(inp.getAttribute("data-i"));
        const v = String(inp.value||"").trim().replace(",",".");
        const n = Number(v);
        state.reparto[c][i].price = isNaN(n) ? "" : n.toFixed(2);
        inp.value = state.reparto[c][i].price;
      }, {passive:true});
    });
  }

  function exportRepartoTXT(){
    const code = byId("selReparto").value;
    if(!code){ alert("Selecciona tienda."); return; }
    const sel = (state.reparto[code]||[]).filter(x=>x.checked);
    if(!sel.length){ alert("No hay seleccionados."); return; }

    const txt = sel.map(x => {
      const pr = x.price ? ` — ${x.price}€` : "";
      const u = x.unit ? ` ${x.unit}` : "";
      return `${fmtQty(x.qty)} ${x.name}${u}${pr}`;
    }).join("\n");

    const blob = new Blob([txt], {type:"text/plain"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `reparto_${code}_${todayISO()}.txt`;
    a.click();
  }

  function sendRepartoWA(){
    const code = byId("selReparto").value;
    if(!code){ alert("Selecciona tienda."); return; }
    const sel = (state.reparto[code]||[]).filter(x=>x.checked);
    if(!sel.length){ alert("No hay seleccionados."); return; }

    const meta = STORE_META[code];
    let msg = `🚚 *Reparto ${meta.name}*\n\n`;
    sel.forEach(x=>{
      const u = x.unit ? ` ${x.unit}` : "";
      msg += `- ${fmtQty(x.qty)} ${x.name}${u}`;
      if(x.price) msg += ` — ${x.price}€`;
      msg += `\n`;
    });

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  /* --------------------------
     Catalog / Prices
  -------------------------- */
  function ensureCatalogEntry(name, unit){
    const k = normKey(name) + "||" + (unit||"");
    if(!state.catalog[k]){
      state.catalog[k] = {
        name: removeDiacriticsUpper(name),
        unit: removeDiacriticsUpper(unit||""),
        prices: [],
        last: null
      };
    }
    return state.catalog[k];
  }

  function getLastPriceInfoFor(name, prov){
    const k1 = normKey(name);
    const keys = Object.keys(state.catalog);
    let bestKey = null;
    for(const k of keys){
      if(k.startsWith(k1+"||")){ bestKey = k; break; }
    }
    if(!bestKey) return `<span class="pill">sin precio</span>`;

    const entry = state.catalog[bestKey];
    if(!entry || !entry.last) return `<span class="pill">sin precio</span>`;

    const lastSame = entry.prices.slice().reverse().find(x=>x.prov===prov);
    const last = lastSame || entry.last;
    if(!last) return `<span class="pill">sin precio</span>`;

    return `<span class="pill ok">${last.price.toFixed(2)}€</span><span class="pill"> ${escapeHtml(last.prov)}</span>`;
  }

  function scanProductsFromPurchases(){
    pushUndo("scan-products");
    globalAll.forEach(it => ensureCatalogEntry(it.name, it.unit||""));
    state.providers.forEach(p=>{
      (state.orders[p]||[]).forEach(it=>{
        ensureCatalogEntry(it.name, it.unit||"");
      });
    });
    persistAllDebounced();
    renderProductsTable();
    alert("Catálogo actualizado ✅");
  }

  function renderProductsTable(){
    const wrap = byId("prodWrap");
    const pill = byId("pillProdCount");
    const q = normKey(byId("prodSearch") ? byId("prodSearch").value : "");
    const provFilter = byId("prodProvFilter") ? byId("prodProvFilter").value : "";
    if(!wrap) return;

    const entries = Object.entries(state.catalog).map(([k,v])=>({key:k, ...v}));
    let filtered = entries;

    if(q) filtered = filtered.filter(x => normKey(x.name).includes(q));
    if(provFilter) filtered = filtered.filter(x => x.prices && x.prices.some(p=>p.prov===provFilter));

    filtered.sort((a,b)=> (a.name+a.unit).localeCompare(b.name+b.unit,"es"));
    if(pill) pill.textContent = String(filtered.length);

    if(!filtered.length){
      wrap.innerHTML = `<div class="hint">No hay productos en el catálogo. Pulsa “🔎 Cargar desde compras”.</div>`;
      return;
    }

    let html = `<div class="scroll-x"><table>
      <thead><tr>
        <th>Producto</th>
        <th>Unidad</th>
        <th>Proveedor</th>
        <th>Precio (€)</th>
        <th>Guardar</th>
        <th>Historial</th>
      </tr></thead><tbody>`;

    filtered.forEach((it)=>{
      const hist = (it.prices||[]).slice(-3).reverse().map(p=>`${p.date} · ${p.prov} · ${p.price.toFixed(2)}€`).join("<br>");
      html += `<tr>
        <td>${escapeHtml(it.name)}</td>
        <td>${escapeHtml(it.unit||"")}</td>
        <td>
          <select data-p-prov="${escapeHtml(it.key)}">
            <option value="">(elige)</option>
            ${state.providers.map(p=>`<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("")}
          </select>
        </td>
        <td><input class="cellInput small" data-p-price="${escapeHtml(it.key)}" value="" placeholder="Ej: 1.25" /></td>
        <td><button class="btn small" data-p-save="${escapeHtml(it.key)}">Guardar</button></td>
        <td>${hist || `<span class="pill">sin historial</span>`}</td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
    wrap.innerHTML = html;

    wrap.querySelectorAll("button[data-p-save]").forEach(btn=>{
      btn.onclick = () => {
        const key = btn.getAttribute("data-p-save");
        const sel = wrap.querySelector(`select[data-p-prov="${CSS.escape(key)}"]`);
        const inp = wrap.querySelector(`input[data-p-price="${CSS.escape(key)}"]`);
        const prov = sel ? sel.value : "";
        const priceTxt = inp ? String(inp.value||"").trim().replace(",",".") : "";
        const price = Number(priceTxt);

        if(!prov){ alert("Elige proveedor."); return; }
        if(!priceTxt || isNaN(price) || price<=0){ alert("Precio inválido."); return; }

        pushUndo("save-price");

        const entry = state.catalog[key] || ensureCatalogEntry(key.split("||")[0], key.split("||")[1]||"");
        const rec = {date: todayISO(), prov, price: Number(price)};
        entry.prices = Array.isArray(entry.prices) ? entry.prices : [];
        entry.prices.push(rec);
        entry.last = rec;

        state.catalog[key] = entry;
        persistAllDebounced();
        renderProductsTable();
        idle(()=>{ renderProvidersPanels(); renderGlobalTable(); });
      };
    });
  }

  function exportPricesJSON(){
    const obj = { exportedAt: nowISO(), catalog: state.catalog, providers: state.providers };
    downloadJSON(obj, `arslan_precios_${todayISO()}.json`);
  }

  function importPricesJSONFile(file){
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const obj = JSON.parse(String(reader.result||"{}"));
        if(!obj || typeof obj!=="object" || !obj.catalog) throw new Error("bad");
        pushUndo("import-prices");

        const cat = obj.catalog || {};
        Object.keys(cat).forEach(k=>{
          if(!state.catalog[k]) state.catalog[k] = cat[k];
          else{
            const a = state.catalog[k];
            const b = cat[k];
            a.prices = Array.isArray(a.prices)?a.prices:[];
            const bpr = Array.isArray(b.prices)?b.prices:[];
            bpr.forEach(p=>a.prices.push(p));
            const last = a.prices.slice().sort((x,y)=> String(x.date).localeCompare(String(y.date))).slice(-1)[0];
            if(last) a.last = last;
            state.catalog[k] = a;
          }
        });

        persistAllDebounced();
        renderProductsTable();
        alert("Precios importados ✅");
      }catch(e){
        alert("JSON de precios inválido.");
      }
    };
    reader.readAsText(file);
  }

  /* --------------------------
     Store Table render (INPUT + AUTOCOMPLETE)
  -------------------------- */
  function renderStoreTable(code){
    const wrap = byId("storeTableWrap");
    const rows = state.stores[code] || [];
    if(!wrap) return;

    if(!rows.length){
      wrap.innerHTML = `<div class="hint">Pega una lista arriba.</div>`;
      return;
    }

    let html = `<div class="scroll-x"><table>
      <thead><tr>
        <th>Original</th>
        <th>Estandarizado</th>
        <th>Cant</th>
        <th>Unidad</th>
        <th>Estado</th>
      </tr></thead><tbody>`;

    rows.forEach((r,i)=>{
      html += `<tr data-i="${i}">
        <td>${escapeHtml(r.o)}</td>
        <td>
          <input class="cellInput ${r.a?'warn':'ok'}" list="vocabList" data-se="${i}" value="${escapeHtml(r.e)}" />
        </td>
        <td><input class="cellInput small" data-sq="${i}" value="${escapeHtml(fmtQty(r.q))}" /></td>
        <td><input class="cellInput small" data-su="${i}" value="${escapeHtml(r.u||"")}" /></td>
        <td>${r.a?`<span class="pill warn">Revisar</span>`:`<span class="pill ok">OK</span>`}</td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
    wrap.innerHTML = html;

    wrap.querySelectorAll("input[data-se]").forEach(inp=>{
      inp.addEventListener("blur", ()=>{
        pushUndo("edit-store-name");

        const idx = Number(inp.getAttribute("data-se"));
        if(!state.stores[code] || !state.stores[code][idx]) return;

        const ac = autocorrectNameToVocab(inp.value);
        state.stores[code][idx].e = ac.name;
        state.stores[code][idx].a = !ac.ok;

        inp.value = ac.name;
        inp.classList.toggle("ok", ac.ok);
        inp.classList.toggle("warn", !ac.ok);

        state.stores[code] = sumDuplicatesRows(state.stores[code]);
        persistAllDebounced();
        renderStoreTable(code);
        idle(()=>unifyGlobal());
      }, {passive:true});
    });

    wrap.querySelectorAll("input[data-sq]").forEach(inp=>{
      inp.addEventListener("blur", ()=>{
        pushUndo("edit-store-qty");
        const idx = Number(inp.getAttribute("data-sq"));
        if(!state.stores[code] || !state.stores[code][idx]) return;

        state.stores[code][idx].q = Number(String(inp.value).replace(",",".")) || 0;
        inp.value = fmtQty(state.stores[code][idx].q);

        state.stores[code] = sumDuplicatesRows(state.stores[code]);
        persistAllDebounced();
        renderStoreTable(code);
        idle(()=>unifyGlobal());
      }, {passive:true});
    });

    wrap.querySelectorAll("input[data-su]").forEach(inp=>{
      inp.addEventListener("blur", ()=>{
        pushUndo("edit-store-unit");
        const idx = Number(inp.getAttribute("data-su"));
        if(!state.stores[code] || !state.stores[code][idx]) return;

        state.stores[code][idx].u = removeDiacriticsUpper(inp.value||"");
        inp.value = state.stores[code][idx].u;

        state.stores[code] = sumDuplicatesRows(state.stores[code]);
        persistAllDebounced();
        renderStoreTable(code);
        idle(()=>unifyGlobal());
      }, {passive:true});
    });
  }

  function mergeStoreDuplicatesCurrent(){
    const code = byId("selStore").value;
    pushUndo("merge-store-dups");
    state.stores[code] = sumDuplicatesRows(state.stores[code]||[]);
    persistAllDebounced();
    renderStoreTable(code);
    idle(()=>unifyGlobal());
  }

  /* --------------------------
     Global search hook
  -------------------------- */
  function hookGlobalSearch(){
    const inp = byId("globalSearch");
    if(!inp) return;
    inp.addEventListener("input", debounce(()=>unifyGlobal(), 180), {passive:true});
  }

  /* --------------------------
     Tiendas auto-estandarizar
  -------------------------- */
  function hookStoreAuto(){
    const input = byId("storeInput");
    const sel = byId("selStore");
    if(!input || !sel) return;

    const run = debounce(()=>{
      const code = sel.value;
      const txt = input.value || "";
      pushUndo("auto-standardize");
      estandarizarStore(code, txt);
      renderStoreTable(code);
      idle(()=>unifyGlobal());
    }, 260);

    input.addEventListener("input", run, {passive:true});
    input.addEventListener("paste", run, {passive:true});

    sel.addEventListener("change", ()=>{
      const code = sel.value;
      input.value = storeToTextarea(code);
      renderStoreTable(code);
    }, {passive:true});

    input.value = storeToTextarea(sel.value);
    renderStoreTable(sel.value);
  }

  /* --------------------------
     Diccionario actions
  -------------------------- */
  function saveVocabAndSyn(){
    pushUndo("save-vocab-syn");

    const lines = uniqueVocab(toLines(byId("vocabTxt").value||""));
    byId("vocabTxt").value = lines.join("\n");

    state.synonyms = parseSynonymsText(byId("synTxt").value||"");

    VOCAB_CACHE = null;
    VOCAB_SIG = null;

    persistAllDebounced();

    rebuildCachesFromText();      // ✅ recarga
    rebuildVocabDatalist();       // ✅ autocompletar actualizado
    refreshStoresFlags();         // ✅ recalcula OK/REVISAR
    idle(()=>{ unifyGlobal(); renderProvidersPanels(); renderProductsTable(); });

    alert("Guardado ✅");
  }

  function addWord(){
    const entry = prompt("Nuevo producto (puedes pegar varias líneas):");
    if(!entry) return;
    pushUndo("add-word");
    const cur = toLines(byId("vocabTxt").value||"");
    const add = toLines(entry);
    const merged = uniqueVocab(cur.concat(add));
    byId("vocabTxt").value = merged.join("\n");
    persistAllDebounced();
    rebuildVocabDatalist();
  }

  function refreshStoresFlags(){
    const vocab = getVocabCached();
    ["sp","sl","st"].forEach(code=>{
      const rows = state.stores[code]||[];
      rows.forEach(r=>{
        const ac = autocorrectNameToVocab(r.e);
        r.e = ac.name;
        r.a = !ac.ok;
      });
      state.stores[code] = sumDuplicatesRows(rows);
    });
    persistAllDebounced();
  }

  /* --------------------------
     Productos filter
  -------------------------- */
  function refreshProductsProvFilter(){
    const sel = byId("prodProvFilter");
    if(!sel) return;
    sel.innerHTML = `<option value="">Proveedor (todos)</option>` + state.providers.map(p=>`<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");
  }

  /* --------------------------
     UI Tabs + FAB
  -------------------------- */
  function showTab(key){
    const tabs = ["dic","tiendas","global","proveedores","productos"];
    tabs.forEach(k=>{
      const sec = byId("tab-"+k);
      const btn = byId("btn-"+k);
      if(sec) sec.style.display = (k===key) ? "block" : "none";
      if(btn) btn.classList.toggle("active", k===key);
    });

    if(key==="global"){
      idle(()=>{ unifyGlobal(); buildProvBar(); });
    }
    if(key==="proveedores"){
      idle(()=>{ renderProvidersPanels(); });
    }
    if(key==="productos"){
      idle(()=>{ refreshProductsProvFilter(); renderProductsTable(); });
    }
  }

  function toggleFab(forceHide){
    const m = byId("fabMenu");
    if(forceHide){ m.classList.remove("show"); return; }
    m.classList.toggle("show");
  }

  function hookFAB(){
    const fab = byId("fab");
    const menu = byId("fabMenu");
    if(!fab || !menu) return;

    fab.onclick = () => toggleFab(false);
    document.addEventListener("click", (e)=>{
      if(!menu.contains(e.target) && e.target!==fab) toggleFab(true);
    }, {capture:true});

    menu.querySelectorAll(".fab-item").forEach(btn=>{
      btn.onclick = ()=>{
        const a = btn.getAttribute("data-action");
        if(a==="unify"){ unifyGlobal(); }
        if(a==="undo"){ undo(); }
        if(a==="backup"){ saveBackup(); }
        if(a==="copyGlobal"){ copyGlobal(); }
        toggleFab(true);
      };
    });
  }

  /* --------------------------
     Integrity check
  -------------------------- */
  function integrityCheck(){
    let ok = true;
    if(!state.providers || !state.providers.length) ok = false;
    if(!state.stores || typeof state.stores!=="object") ok = false;
    if(!state.orders || typeof state.orders!=="object") ok = false;

    const pill = byId("pillIntegrity");
    if(pill){
      pill.className = "pill " + (ok ? "ok" : "warn");
      pill.textContent = ok ? "OK" : "REVISAR";
    }
    return ok;
  }

  /* --------------------------
     Hard refresh UI
  -------------------------- */
  function hardRefreshUI(){
    updateBackupPill();
    refreshProductsProvFilter();
    rebuildVocabDatalist();
    buildProvBar();
    hookGlobalSearch();
    unifyGlobal();
    renderProvidersPanels();
    renderProductsTable();

    const code = byId("selStore") ? byId("selStore").value : "sp";
    if(byId("storeInput")) byId("storeInput").value = storeToTextarea(code);
    renderStoreTable(code);

    integrityCheck();
  }

  /* --------------------------
     Load / Init
  -------------------------- */
  function load(){
    const savedTheme = localStorage.getItem(LS.THEME) ||
      (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    applyTheme(savedTheme);

    const vocabSaved = localStorage.getItem(LS.VOCAB) || "";
    const synSaved = localStorage.getItem(LS.SYN) || "";

    if(byId("vocabTxt")) byId("vocabTxt").value = vocabSaved;
    if(byId("synTxt")) byId("synTxt").value = synSaved;

    try{ state.stores = JSON.parse(localStorage.getItem(LS.STORES)||"{}"); }catch{ state.stores = {sp:[],sl:[],st:[]}; }
    if(!state.stores || typeof state.stores!=="object") state.stores = {sp:[],sl:[],st:[]};
    ["sp","sl","st"].forEach(k=>{ if(!Array.isArray(state.stores[k])) state.stores[k]=[]; });

    try{ state.providers = JSON.parse(localStorage.getItem(LS.PROVS)||"[]"); }catch{ state.providers = []; }
    if(!Array.isArray(state.providers) || !state.providers.length) state.providers = DEFAULT_PROVS.slice();
    state.activeProv = state.providers[0];

    try{ state.assignments = JSON.parse(localStorage.getItem(LS.ASSIGN)||"{}"); }catch{ state.assignments = {}; }
    try{ state.orders = JSON.parse(localStorage.getItem(LS.ORDERS)||"{}"); }catch{ state.orders = {}; }
    ensureOrdersBuckets();

    try{ state.catalog = JSON.parse(localStorage.getItem(LS.CATALOG)||"{}"); }catch{ state.catalog = {}; }
    if(!state.catalog || typeof state.catalog!=="object") state.catalog = {};

    try{ state.undoStack = JSON.parse(localStorage.getItem(LS.UNDO)||"[]"); }catch{ state.undoStack = []; }
    if(!Array.isArray(state.undoStack)) state.undoStack = [];

    // ✅ Carga SIEMPRE vocab/syn a memoria + datalist
    rebuildCachesFromText();
    rebuildVocabDatalist();

    byId("pillMode").textContent = (window.innerWidth < 980) ? "Modo móvil" : "Modo escritorio";
    updateBackupPill();
    integrityCheck();
  }

  /* --------------------------
     Hooks
  -------------------------- */
  function hookUI(){
    document.querySelectorAll(".tabbar button[data-tab]").forEach(btn=>{
      btn.onclick = ()=> showTab(btn.getAttribute("data-tab"));
    });

    byId("btnTheme").onclick = toggleTheme;
    byId("btnUndoTop").onclick = undo;
    byId("btnBackup").onclick = saveBackup;
    byId("btnSafeReset").onclick = safeReset;

    byId("btnAddWord").onclick = addWord;
    byId("btnSaveVocab").onclick = saveVocabAndSyn;
     // ✅ ACTUALIZA AUTOCOMPLETAR EN VIVO (sin esperar a guardar)
if(byId("vocabTxt")){
  byId("vocabTxt").addEventListener("input", debounce(()=>{
    rebuildCachesFromText();
    rebuildVocabDatalist();
  }, 250), {passive:true});
}


    byId("btnExportJSON").onclick = exportJSON;
    byId("btnImportJSON").onclick = ()=> byId("fileImport").click();
    byId("fileImport").addEventListener("change", (e)=>{
      const f = e.target.files && e.target.files[0];
      if(f) importJSONFile(f);
      e.target.value = "";
    });

    byId("btnStoreTXT").onclick = ()=> storeExportTXT(byId("selStore").value);
    byId("btnStoreWA").onclick = ()=> storeSendWA(byId("selStore").value);
    byId("btnStoreSave").onclick = ()=>{
      pushUndo("store-save-to-textarea");
      const code = byId("selStore").value;
      byId("storeInput").value = storeToTextarea(code);
      alert("Guardado en textarea ✅");
    };
    byId("btnMergeStoreDup").onclick = mergeStoreDuplicatesCurrent;

    byId("btnUnify").onclick = ()=>{ pushUndo("unify"); unifyGlobal(); };
    byId("btnCopyGlobal").onclick = copyGlobal;
    byId("btnTXTGlobal").onclick = exportGlobalTXT;
    byId("btnXLSXGlobal").onclick = exportGlobalXLSX;
    byId("btnResumenGlobal").onclick = exportResumenGlobalTXT;

    byId("btnUndoAssign").onclick = undoAssign;

    byId("btnAddProv").onclick = addProviderQuick;
    byId("btnManageProv").onclick = openProvModal;
    byId("btnCloseProv").onclick = closeProvModal;

    byId("selReparto").addEventListener("change", renderReparto, {passive:true});
    byId("btnRepartoTXT").onclick = exportRepartoTXT;
    byId("btnRepartoWA").onclick = sendRepartoWA;

    byId("btnScanProducts").onclick = scanProductsFromPurchases;
    byId("btnExportPrices").onclick = exportPricesJSON;
    byId("btnImportPrices").onclick = ()=> byId("fileImportPrices").click();
    byId("fileImportPrices").addEventListener("change", (e)=>{
      const f = e.target.files && e.target.files[0];
      if(f) importPricesJSONFile(f);
      e.target.value = "";
    });

    byId("prodSearch").addEventListener("input", debounce(renderProductsTable, 180), {passive:true});
    byId("prodProvFilter").addEventListener("change", renderProductsTable, {passive:true});

    hookGlobalSearch();
    hookStoreAuto();
    hookFAB();

    window.addEventListener("resize", debounce(()=>{
      byId("pillMode").textContent = (window.innerWidth < 980) ? "Modo móvil" : "Modo escritorio";
    }, 200), {passive:true});
  }

  /* --------------------------
     Init
  -------------------------- */
  load();
  hookUI();
  showTab("dic");
  idle(()=>hardRefreshUI());

})();
