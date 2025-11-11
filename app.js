/* ===============================================================
   ARSLAN LISTAS v3.7 — KIWI SMART COMPRAS + REPARTO VISUAL
   =============================================================== */

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 ARSLAN LISTAS v3.7 iniciado correctamente");

  /* ============================================================
     🔹 HELPERS Y VARIABLES GLOBALES
     ============================================================ */
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const money = n => (isNaN(n) ? 0 : n).toFixed(2).replace(".", ",") + " €";
  const parseNum = v => {
    const n = parseFloat(String(v).replace(",", "."));
    return isNaN(n) ? 0 : n;
  };

  const emojiMap = {
    mango: "🥭",
    plátano: "🍌",
    banana: "🍌",
    manzana: "🍎",
    naranja: "🍊",
    limón: "🍋",
    zanahoria: "🥕",
    tomate: "🍅",
    aguacate: "🥑",
    piña: "🍍",
    sandía: "🍉",
    melón: "🍈",
    cebolla: "🧅",
    ajo: "🧄",
    papa: "🥔",
    patata: "🥔",
    lechuga: "🥬",
    pepino: "🥒",
    pimiento: "🌶️",
    fresa: "🍓",
    uva: "🍇",
    coco: "🥥",
    guineo: "🍌",
    cilantro: "🌿",
    perejil: "🌿",
    apio: "🌿",
  };

  const tiendaState = { sp: [], sl: [], st: [] };
  const state = {
    vocab: [],
    global: [],
    proveedores: {},
    compras: [],
    reparto: [],
    prices: [],
  };

  /* ============================================================
     🔹 GUARDAR Y CARGAR LOCALSTORAGE
     ============================================================ */
  const saveState = () => {
    localStorage.setItem("arslan_v37_state", JSON.stringify(state));
    localStorage.setItem("arslan_v37_tiendas", JSON.stringify(tiendaState));
  };

  const loadState = () => {
    try {
      const s = JSON.parse(localStorage.getItem("arslan_v37_state")) || {};
      Object.assign(state, s);
      const t = JSON.parse(localStorage.getItem("arslan_v37_tiendas")) || {};
      Object.assign(tiendaState, t);
      console.log("📦 Datos cargados localStorage");
    } catch (e) {
      console.warn("⚠️ Error al cargar estado:", e);
    }
  };
  loadState();

  /* ============================================================
     🔹 GESTIÓN DE TABS
     ============================================================ */
  const switchTab = id => {
    $$(".tab").forEach(t => (t.style.display = "none"));
    $(`#tab-${id}`).style.display = "block";
    $$(".tabbar button").forEach(b => b.classList.remove("active"));
    $(`#btn-${id}`).classList.add("active");
    saveState();
  };

  $$(".tabbar button").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Cargar primera tab
  switchTab("dic");

  /* ============================================================
     🔹 VOCABULARIO
     ============================================================ */
  const vocabTxt = $("#vocabTxt");

  // Cargar vocabulario inicial
  if (state.vocab.length) vocabTxt.value = state.vocab.join("\n");

  $("#btn-vocab-add").onclick = () => {
    vocabTxt.value += "\nNuevo producto";
  };

  $("#btn-vocab-save").onclick = () => {
    const vocab = vocabTxt.value
      .split("\n")
      .map(v => v.trim().toUpperCase())
      .filter(v => v);
    state.vocab = [...new Set(vocab)];
    saveState();
    alert("✅ Vocabulario guardado.");
  };

  $("#btn-reset-all").onclick = () => {
    if (confirm("¿Borrar TODO? Se perderán todos los datos.")) {
      localStorage.clear();
      location.reload();
    }
  };

  $("#btn-reset-keep").onclick = () => {
    if (confirm("¿Reiniciar todo manteniendo vocabulario?")) {
      const vocab = state.vocab;
      localStorage.clear();
      state.vocab = vocab;
      saveState();
      location.reload();
    }
  };

  /* ============================================================
     🔹 FUNCIONES DE ESTANDARIZACIÓN DE TIENDAS
     ============================================================ */
  function estandarizar(code) {
    const input = $(`#in_${code}`).value.trim();
    if (!input) {
      alert("⚠️ No hay texto en esta tienda.");
      return;
    }
    const vocab = state.vocab;
    const lines = input.split("\n").map(l => l.trim()).filter(l => l);
    const result = [];

    for (let line of lines) {
      let q = 1;
      let name = line.toUpperCase();
      const m = line.match(/^(\d+)\s*(.*)$/);
      if (m) {
        q = parseInt(m[1]);
        name = m[2].toUpperCase();
      }
      // Buscar coincidencia con vocab
      let match = vocab.find(v => name.includes(v));
      if (!match) match = name;
      result.push({ q, e: match });
    }

    tiendaState[code] = result;
    saveState();
    renderTablaTienda(code);
  }

  function renderTablaTienda(code) {
    const wrap = $(`#tbl_${code}_wrap`);
    const data = tiendaState[code];
    if (!data || !data.length) {
      wrap.innerHTML = "<i>No hay lista estandarizada.</i>";
      return;
    }
    let html = `<table><tr><th>Cant</th><th>Producto</th></tr>`;
    for (let r of data) {
      html += `<tr><td>${r.q}</td><td>${r.e}</td></tr>`;
    }
    html += "</table>";
    wrap.innerHTML = html;
  }

  ["sp", "sl", "st"].forEach(code => {
    $(`#${code}-estandarizar`).onclick = () => estandarizar(code);
    $(`#${code}-guardar`).onclick = () => {
      saveState();
      alert(`💾 ${code.toUpperCase()} guardado.`);
    };
    $(`#${code}-export-txt`).onclick = () => exportarTxt(code);
    $(`#${code}-whats`).onclick = () => sendWhatsTienda(code);
  });

  /* ============================================================
     🔹 EXPORTAR TXT / WHATSAPP
     ============================================================ */
  function generarTextoTienda(code) {
    if (!window.tiendaState?.[code]?.length) {
      try {
        estandarizar(code);
      } catch (e) {}
    }
    const data = window.tiendaState?.[code] || [];
    if (!data.length) {
      alert("No hay lista estandarizada ni texto pegado para esta tienda.");
      return "";
    }
    const nombre =
      code === "sp"
        ? "SAN PABLO"
        : code === "sl"
        ? "SAN LESMES"
        : "SANTIAGO";
    const lines = data.map(r => `- ${r.q} ${r.e}`).join("\n");
    return `🏪 ${nombre}\n\n${lines}`;
  }

  function exportarTxt(code) {
    const txt = generarTextoTienda(code);
    if (!txt) return;
    const blob = new Blob([txt], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${code}_lista.txt`;
    a.click();
  }

  function sendWhatsTienda(code) {
    const txt = generarTextoTienda(code);
    if (!txt) return;
    const encoded = encodeURIComponent(txt);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  }

  /* ============================================================
     🔹 GLOBAL (Unificación)
     ============================================================ */
  $("#btn-global-unificar").onclick = () => {
    const all = [...tiendaState.sp, ...tiendaState.sl, ...tiendaState.st];
    const merged = {};
    for (let r of all) {
      if (!r.e) continue;
      if (!merged[r.e]) merged[r.e] = 0;
      merged[r.e] += parseNum(r.q);
    }
    const arr = Object.entries(merged).map(([e, q]) => ({ e, q }));
    state.global = arr;
    saveState();
    renderGlobal();
    alert("✅ Global unificado.");
  };

  function renderGlobal() {
    const wrap = $("#global_wrap");
    const data = state.global;
    if (!data.length) {
      wrap.innerHTML = "<i>No hay datos globales.</i>";
      return;
    }
    let html = `<table><tr><th>Producto</th><th>Cantidad</th></tr>`;
    for (let r of data) {
      html += `<tr><td>${r.e}</td><td>${r.q}</td></tr>`;
    }
    html += "</table>";
    wrap.innerHTML = html;
  }
/* ===============================================================
   PARTE 2/3 — Compras + Reparto Provisional + Reparto Visual
   (continuación)
   =============================================================== */

/* -------------------------------
   Utilidades de cantidades/unidad
---------------------------------*/
const unitFor = (nameRaw) => {
  const name = String(nameRaw || "").toUpperCase();

  // Cajas típicas
  const isCaja = /(MANGO|AGUACATE|PLÁTANO CANARIO|PLATANO CANARIO|PLÁTANO MACHO|MACHO|GUINEO|UVA|PIÑA|PITAHAYA|MELÓN|MELON|SANDÍA|SANDIA)/.test(name);
  if (isCaja) return "cajas";

  // Unidades (piezas/manojo)
  if (/(MACHO|ALOE VERA|COCO|PAPAYA|MELÓN|MELON|SANDÍA|SANDIA|LECHUGA|APIO|PEREJIL|CILANTRO|CEBOLLINO|MENTA|HIERBABUENA)/.test(name)) return "uds";

  // Kg por defecto para hortaliza a granel
  if (/(TOMATE|ZANAHORIA|CEBOLLA|PATATA|PEPINO|PIMIENTO|BERENJENA|CALABAC|BROCOLI|BRÓCOLI|JUDIA|JUDÍA|REMOLACHA|CHIRIVIA|CHIRIVÍA)/.test(name)) return "kg";

  // Fruta suelta → kg
  if (/(MANZANA|PERA|NARANJA|MANDARINA|LIMON|LIMÓN|MELOCOTON|MELOCOTÓN|NECTARINA|GRANADA|KIWI|CEREZA|ALBARICOQUE|HIGO|BREVA|KAKI|CAKI)/.test(name)) return "kg";

  return "uds";
};

const emojiFor = (nameRaw) => {
  const s = String(nameRaw || "").toLowerCase();
  const map = {
    mango: "🥭", plátano: "🍌", platano: "🍌", banana: "🍌", guineo: "🍌",
    manzana: "🍎", pera: "🍐", naranja: "🍊", limón: "🍋", limon: "🍋",
    zanahoria: "🥕", tomate: "🍅", aguacate: "🥑", piña: "🍍", sandía: "🍉",
    sandia: "🍉", melón: "🍈", melon: "🍈", cebolla: "🧅", ajo: "🧄",
    patata: "🥔", papa: "🥔", lechuga: "🥬", pepino: "🥒", pimiento: "🌶️",
    fresa: "🍓", uva: "🍇", coco: "🥥", cilantro: "🌿", perejil: "🌿", apio: "🌿"
  };
  for (const k of Object.keys(map)) if (s.includes(k)) return map[k];
  return "📦";
};

/* ---------------------------------------
   Totales solicitados por producto/nombre
----------------------------------------*/
const solicitadoPorNombre = () => {
  const all = [...(tiendaState.sp || []), ...(tiendaState.sl || []), ...(tiendaState.st || [])];
  const map = {};
  for (const r of all) {
    if (!r?.e) continue;
    const k = r.e.toUpperCase().trim();
    map[k] = (map[k] || 0) + parseNum(r.q);
  }
  return map; // { 'TOMATE DANIELA': 5, ... }
};

/* ==========================
   COMPRAS
   - Por defecto “comprado” = “solicitado” (si no se tocó)
   - Si el usuario edita, queda manual=true
========================== */
const comprasWrap = $("#compras-wrap");

const ensureComprasState = () => {
  if (!Array.isArray(state.compras)) state.compras = [];
};

const getCompraRow = (name) => {
  ensureComprasState();
  const key = String(name || "").toUpperCase().trim();
  return state.compras.find(x => String(x.name).toUpperCase().trim() === key) || null;
};

const upsertCompraRow = (name, purchased, manual) => {
  ensureComprasState();
  const key = String(name || "").toUpperCase().trim();
  const idx = state.compras.findIndex(x => String(x.name).toUpperCase().trim() === key);
  const row = { name: key, purchased: parseNum(purchased), manual: !!manual };
  if (idx === -1) state.compras.push(row);
  else state.compras[idx] = row;
};

const marcarTodoComprado = () => {
  const sol = solicitadoPorNombre();
  Object.keys(sol).forEach(name => {
    const row = getCompraRow(name);
    // Si ya lo tocaste manualmente, respetamos
    if (row?.manual) return;
    upsertCompraRow(name, sol[name], false);
  });
  saveState();
  renderCompras();
  alert("✅ Todo marcado como comprado (= solicitado).");
};

const renderCompras = () => {
  const sol = solicitadoPorNombre();
  ensureComprasState();

  // Sin datos
  if (!Object.keys(sol).length) {
    comprasWrap.innerHTML = `<div class="hint">No hay productos solicitados todavía. Estandariza primero en “Tiendas”.</div>`;
    return;
  }

  // Construir tabla
  let html = `
    <div class="toolbar" style="margin-bottom:6px">
      <button class="btn small" id="btn-markall">✅ Marcar todo como comprado</button>
      <button class="btn small ghost" id="btn-reparto-provisional">🧮 Reparto provisional</button>
    </div>
    <table>
      <thead><tr>
        <th>Producto</th><th>Solicitado</th><th>Comprado</th><th>Unidad</th><th>Manual</th><th></th>
      </tr></thead><tbody>
  `;

  const rows = Object.keys(sol).sort((a, b) => a.localeCompare(b, "es"));
  for (const name of rows) {
    const solicitado = parseNum(sol[name]);
    const row = getCompraRow(name);

    // si no hay fila o no fue manual, proponer solicitado como comprado
    const comprado = row ? (row.manual ? parseNum(row.purchased) : solicitado) : solicitado;
    const manual = row ? !!row.manual : false;

    html += `
      <tr data-name="${name}">
        <td>${name}</td>
        <td>${solicitado}</td>
        <td><input class="c-purchased" type="number" min="0" step="0.01" value="${comprado}" style="width:110px"></td>
        <td>${unitFor(name)}</td>
        <td><input class="c-manual" type="checkbox" ${manual ? "checked" : ""}></td>
        <td>
          <button class="btn small muted c-save">Guardar</button>
          <button class="btn small c-clear">Borrar</button>
        </td>
      </tr>
    `;
  }
  html += `</tbody></table>`;
  comprasWrap.innerHTML = html;

  // Listeners
  $("#btn-markall").onclick = marcarTodoComprado;
  $("#btn-reparto-provisional").onclick = () => {
    renderRepartoProvisional(); // vista provisional dentro de la pestaña Reparto
    switchTab("reparto");
  };

  comprasWrap.querySelectorAll(".c-save").forEach(btn => {
    btn.addEventListener("click", () => {
      const tr = btn.closest("tr");
      const name = tr.dataset.name;
      const purchased = tr.querySelector(".c-purchased").value;
      const manual = tr.querySelector(".c-manual").checked;
      upsertCompraRow(name, purchased, manual);
      saveState();
      alert("💾 Guardado.");
    });
  });

  comprasWrap.querySelectorAll(".c-clear").forEach(btn => {
    btn.addEventListener("click", () => {
      const tr = btn.closest("tr");
      const name = tr.dataset.name.toUpperCase().trim();
      ensureComprasState();
      state.compras = state.compras.filter(x => String(x.name).toUpperCase().trim() !== name);
      saveState();
      renderCompras();
    });
  });
};

/* ==========================
   REPARTO PROVISIONAL
   - Basado SOLO en lo solicitado (sin depender de compras)
   - Emoji grande + botón OK + WhatsApp
========================== */
const repartoWrap = $("#reparto-wrap");

// Estructura temporal para “OK” provisional (no toca reparto final)
let __provOK = {};

const renderRepartoProvisional = () => {
  const sol = solicitadoPorNombre();
  const productos = Object.keys(sol).sort((a, b) => a.localeCompare(b, "es"));

  if (!productos.length) {
    repartoWrap.innerHTML = `<div class="hint">No hay productos solicitados.</div>`;
    return;
  }

  // Reset de selección provisional si no existe
  if (typeof __provOK !== "object" || !__provOK) __provOK = {};

  let cards = `<div class="hint">📦 REPARTO PROVISIONAL (según pedido — sin compras)</div><div id="prov-wrap">`;
  for (const name of productos) {
    const qty = sol[name];
    const emoji = emojiFor(name);
    const ok = !!__provOK[name];
    cards += `
      <div class="prov-card ${ok ? "ok" : ""}" data-name="${name}">
        <span class="emoji">${emoji}</span>
        <div>${name}</div>
        <div style="font-size:14px;opacity:.9">${qty} ${unitFor(name)}</div>
        <button class="prov-ok">${ok ? "✔ OK" : "OK"}</button>
      </div>
    `;
  }
  cards += `</div>
  <div class="toolbar" style="margin-top:8px">
    <button class="btn small" id="prov-send">🟢 Enviar por WhatsApp</button>
    <button class="btn small muted" id="prov-clear">🧹 Limpiar selección</button>
  </div>
  <div class="rv-list" id="prov-list"></div>
  `;
  repartoWrap.innerHTML = cards;

  // Acciones de tarjetas
  $("#prov-wrap").querySelectorAll(".prov-card .prov-ok").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".prov-card");
      const name = card.dataset.name;
      __provOK[name] = !__provOK[name];
      renderRepartoProvisional(); // re-render para reflejar estado
    });
  });

  // Botón limpiar
  $("#prov-clear").onclick = () => {
    __provOK = {};
    renderRepartoProvisional();
  };

  // Enviar WhatsApp
  $("#prov-send").onclick = () => {
    const sol = solicitadoPorNombre();
    const seleccion = Object.keys(__provOK).filter(k => __provOK[k]);
    const lines = (seleccion.length ? seleccion : Object.keys(sol)).map(name => {
      return `${emojiFor(name)} ${name} — ${sol[name]} ${unitFor(name)}`;
    });

    const texto = `📦 REPARTO PROVISIONAL\n` + lines.join("\n");
    const url = "https://wa.me/?text=" + encodeURIComponent(texto);
    window.open(url, "_blank");
  };

  // Vista previa textual (lo último)
  const preview = Object.keys(sol).map(name => `${emojiFor(name)} ${name} — ${sol[name]} ${unitFor(name)}`).join("\n");
  $("#prov-list").textContent = preview;
};

/* ==========================
   REPARTO VISUAL (POR TIENDA)
   - Selección rápida de ítems disponibles (según compras)
   - Lista textual + WhatsApp
========================== */
const ensureRepartoVisualTab = () => {
  if ($("#tab-repartovisual")) return; // ya existe

  // Crear sección de Reparto Visual si no está en HTML
  const section = document.createElement("section");
  section.id = "tab-repartovisual";
  section.className = "tab";
  section.style.display = "none";
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
          <button class="btn small" id="rv-clear">🧹 Limpiar</button>
          <button class="btn small" id="rv-send">🟢 WhatsApp</button>
        </div>
      </div>
      <div class="bd">
        <div id="rv-grid" class="rv-grid"></div>
        <hr>
        <h4>🧾 Selección:</h4>
        <div id="rv-list" class="rv-list"></div>
      </div>
    </div>
  `;
  $(".container").appendChild(section);

  // Botón en la tabbar si no existe
  if (!$("#btn-repartovisual")) {
    const btn = document.createElement("button");
    btn.id = "btn-repartovisual";
    btn.dataset.tab = "repartovisual";
    btn.innerHTML = "🧺<span>Reparto Visual</span>";
    $(".tabbar").appendChild(btn);
    btn.addEventListener("click", () => switchTab("repartovisual"));
  }
};

const renderRepartoVisual = () => {
  ensureRepartoVisualTab();

  const grid = $("#rv-grid");
  const lista = $("#rv-list");
  const tiendaSel = $("#rv-tienda").value;

  // Productos solicitados por esa tienda
  const pedidos = (tiendaState?.[tiendaSel] || []).slice();

  // Productos con stock comprado (>0)
  const stockMap = {};
  ensureComprasState();
  for (const r of state.compras) {
    if (parseNum(r.purchased) > 0) {
      stockMap[String(r.name).toUpperCase().trim()] = parseNum(r.purchased);
    }
  }

  // Filtrar solo los que tienen stock comprado
  const gridItems = pedidos
    .filter(p => stockMap[String(p.e).toUpperCase().trim()] > 0)
    .map(p => ({ name: p.e, qty: p.q, emoji: emojiFor(p.e) }));

  grid.innerHTML = gridItems
    .map(
      it => `
      <div class="rv-item" data-name="${it.name}">
        <span class="emoji">${it.emoji}</span>
        <div>${it.name}</div>
        <small>${it.qty} ${unitFor(it.name)}</small>
      </div>
    `
    )
    .join("");

  // Interacciones
  let selected = [];
  grid.querySelectorAll(".rv-item").forEach(div => {
    div.addEventListener("click", () => {
      const name = div.dataset.name;
      const qty = pedidos.find(x => x.e === name)?.q || 0;
      selected.push({ name, qty });
      div.classList.add("ok");
      div.style.pointerEvents = "none";
      lista.textContent = selected
        .map(it => `${emojiFor(it.name)} ${it.name} — ${it.qty} ${unitFor(it.name)}`)
        .join("\n");
    });
  });

  $("#rv-clear").onclick = () => {
    selected = [];
    renderRepartoVisual();
  };

  $("#rv-send").onclick = () => {
    const nombre =
      tiendaSel === "sp" ? "SAN PABLO" : tiendaSel === "sl" ? "SAN LESMES" : "SANTIAGO";
    const texto =
      `🚚 REPARTO ${nombre}\n\n` +
      (selected.length
        ? selected
            .map(it => `${emojiFor(it.name)} ${it.name} — ${it.qty} ${unitFor(it.name)}`)
            .join("\n")
        : "—");
    if (!selected.length) {
      alert("Selecciona al menos un producto.");
      return;
    }
    const url = "https://wa.me/?text=" + encodeURIComponent(texto);
    window.open(url, "_blank");
  };
};

// Auto-preparar la vista de Reparto Visual al entrar en la pestaña
const tabObs = new MutationObserver(() => {
  if ($("#tab-repartovisual")?.style.display === "block") {
    renderRepartoVisual();
  }
});
tabObs.observe(document.body, { attributes: true, childList: true, subtree: true });

/* ==========================
   ENLACES DE PESTAÑAS A RENDERIZADOS
========================== */
const linkTabRenders = () => {
  // Compras
  if ($("#tab-compras")) {
    // cuando entras en compras, render
    const obs = new MutationObserver(() => {
      if ($("#tab-compras").style.display === "block") {
        renderCompras();
      }
    });
    obs.observe($("#tab-compras"), { attributes: true, attributeFilter: ["style"] });
  }

  // Reparto
  if ($("#tab-reparto")) {
    const obsR = new MutationObserver(() => {
      if ($("#tab-reparto").style.display === "block") {
        renderRepartoProvisional(); // por defecto muestra provisional al entrar
      }
    });
    obsR.observe($("#tab-reparto"), { attributes: true, attributeFilter: ["style"] });
  }
};
linkTabRenders();
/* ===============================================================
   PARTE 3/3 — Exportaciones + Estado Global + Inicialización
   =============================================================== */

/* ==========================
   EXPORTAR GLOBAL (TXT/Excel)
========================== */
$("#btn-global-txt").onclick = () => {
  const data = state.global;
  if (!data.length) return alert("No hay datos globales para exportar.");
  const lines = data.map(r => `- ${r.q} ${r.e}`).join("\n");
  const txt = "📊 LISTA GLOBAL UNIFICADA\n\n" + lines;
  const blob = new Blob([txt], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "global_unificado.txt";
  a.click();
};

$("#btn-global-xlsx").onclick = () => {
  if (!state.global.length) return alert("No hay datos globales.");
  const ws = XLSX.utils.json_to_sheet(state.global);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "GLOBAL");
  XLSX.writeFile(wb, "global_unificado.xlsx");
};

/* ==========================
   ACTUALIZAR ESTADO GLOBAL SUPERIOR
========================== */
function actualizarResumenGlobal() {
  const totalTiendas =
    (tiendaState.sp?.length || 0) +
    (tiendaState.sl?.length || 0) +
    (tiendaState.st?.length || 0);

  const totalGlobal = state.global?.length || 0;
  const totalCompras = state.compras?.length || 0;
  const totalComprados = (state.compras || []).reduce(
    (sum, c) => sum + (parseNum(c.purchased) || 0),
    0
  );

  $("#status-assign").textContent = `🧾 Tiendas cargadas: ${totalTiendas}`;
  $("#status-buy").textContent = `🛒 Global: ${totalGlobal}`;
  $("#status-bought").textContent = `📦 Comprados: ${totalComprados.toFixed(2)}`;
  $("#status-sent").textContent = `✅ TXT/Whats enviados`;
  $("#status-distribute").textContent = `🚚 Reparto visual listo`;
  $("#status-prices").textContent = `📊 Precios activos`;
}

/* ==========================
   BOTONES GENERALES Y UTILIDADES
========================== */
$("#compras-sync").onclick = () => {
  saveState();
  alert("💾 Compras sincronizadas localmente.");
};

$("#prov-gen").onclick = () => renderRepartoProvisional();
$("#prov-okall").onclick = () => {
  const sol = solicitadoPorNombre();
  __provOK = {};
  Object.keys(sol).forEach(k => (__provOK[k] = true));
  renderRepartoProvisional();
};

/* Copiar texto */
$("#btn-global-copiar").onclick = () => {
  if (!state.global.length) return alert("Nada para copiar.");
  const lines = state.global.map(r => `- ${r.q} ${r.e}`).join("\n");
  navigator.clipboard.writeText(lines).then(() => {
    alert("📋 Copiado al portapapeles.");
  });
};

/* ==========================
   AUTO RENDER INICIAL
========================== */
renderGlobal();
renderCompras();
actualizarResumenGlobal();
console.log("✅ Sistema ARSLAN LISTAS v3.7 listo (solo localStorage).");

/* ==========================
   GUARDAR AUTOMÁTICO
========================== */
window.addEventListener("beforeunload", saveState);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveState();
});

/* ==========================
   EXTRA: Re-render resumen cada 10s
========================== */
setInterval(actualizarResumenGlobal, 10000);
   }); // <-- Cierra document.addEventListener('DOMContentLoaded', ...)

