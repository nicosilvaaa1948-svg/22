/*
 * BLUNNO - Sistema interno de pedidos y distribución
 * Versión de demostración estática: sin Firebase, sin servidor y sin dependencias externas.
 * Los datos quedan únicamente en localStorage del navegador actual.
 */
'use strict';

const STORAGE_KEY = 'blunno_distribucion_demo_v1';
const SESSION_KEY = 'blunno_distribucion_session_v1';
const STATUSES = {
  new: { label: 'Nuevo', css: 'status-new' },
  preparing: { label: 'En preparación', css: 'status-preparing' },
  ready: { label: 'Preparado', css: 'status-ready' },
  dispatched: { label: 'Despachado', css: 'status-dispatched' },
  delivered: { label: 'Entregado', css: 'status-delivered' },
  cancelled: { label: 'Cancelado', css: 'status-cancelled' }
};
const NAV_ADMIN = [
  { id: 'dashboard', label: 'Inicio', icon: '▦', caption: 'OPERACIONES' },
  { id: 'orders', label: 'Pedidos', icon: '▤' },
  { id: 'preparation', label: 'Preparación', icon: '▣' },
  { id: 'catalog', label: 'Proveedores y artículos', icon: '▥', caption: 'ADMINISTRACIÓN' },
  { id: 'branches', label: 'Sucursales', icon: '⌂' },
  { id: 'history', label: 'Historial e informes', icon: '◷', caption: 'CONTROL' }
];
const NAV_BRANCH = [
  { id: 'new-order', label: 'Hacer un pedido', icon: '＋', caption: 'MI SUCURSAL' },
  { id: 'my-orders', label: 'Mis pedidos', icon: '▤' }
];

let state = loadState();
let session = loadSession();
let currentPage = session?.role === 'admin' ? 'dashboard' : 'new-order';
let catalogQuery = '';
let catalogSupplierFilter = 'all';
let catalogActiveFilter = 'active';
let orderQuery = '';
let orderStatusFilter = 'all';
let orderSupplierFilter = 'all';
let orderBranchFilter = 'all';
let orderMonthFilter = 'all';
let productQuery = '';
let createDrafts = {};
let createSupplierId = '';
let createBranchId = '';
let mobileNavOpen = false;
let lastPageBeforeModal = currentPage;

function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function todayLocalISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
function seedState() {
  const suppliers = [
    { id: 'sup-coca', name: 'Coca-Cola', contact: '', notes: 'Catálogo de bebidas', active: true, createdAt: new Date().toISOString() },
    { id: 'sup-almacen', name: 'Proveedor de almacén', contact: '', notes: '', active: true, createdAt: new Date().toISOString() },
    { id: 'sup-limpieza', name: 'Limpieza y hogar', contact: '', notes: '', active: true, createdAt: new Date().toISOString() },
    { id: 'sup-congelados', name: 'Congelados del Sur', contact: '', notes: '', active: true, createdAt: new Date().toISOString() }
  ];
  const p = (id, supplierId, name, category, presentations, notes = '') => ({
    id, supplierId, name, category, presentations: presentations.map(([name, units]) => ({ name, units })), notes, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  });
  const products = [
    p('prod-coca-500', 'sup-coca', 'Coca-Cola 500 ml', 'Bebidas', [['Unidad', 1], ['Pack', 9], ['Caja', 36], ['Pallet', 2160]], 'Equivalencias de ejemplo: verificar con el proveedor.'),
    p('prod-coca-225', 'sup-coca', 'Coca-Cola 2,25 L', 'Bebidas', [['Unidad', 1], ['Pack', 6], ['Caja', 24], ['Pallet', 480]], 'Equivalencias de ejemplo: verificar con el proveedor.'),
    p('prod-coca-zero', 'sup-coca', 'Coca-Cola Zero 500 ml', 'Bebidas', [['Unidad', 1], ['Pack', 9], ['Caja', 36]], 'Equivalencias de ejemplo: verificar con el proveedor.'),
    p('prod-agua', 'sup-coca', 'Agua mineral 500 ml', 'Aguas', [['Unidad', 1], ['Pack', 12], ['Caja', 24], ['Pallet', 1800]], 'Equivalencias de ejemplo: verificar con el proveedor.'),
    p('prod-arroz', 'sup-almacen', 'Arroz largo fino 1 kg', 'Almacén', [['Unidad', 1], ['Pack', 6], ['Caja', 12]], ''),
    p('prod-galletitas', 'sup-almacen', 'Galletitas surtidas', 'Almacén', [['Unidad', 1], ['Pack', 12], ['Caja', 48]], ''),
    p('prod-aceite', 'sup-almacen', 'Aceite mezcla 900 ml', 'Almacén', [['Unidad', 1], ['Caja', 12]], ''),
    p('prod-lavandina', 'sup-limpieza', 'Lavandina 1 L', 'Limpieza', [['Unidad', 1], ['Pack', 6], ['Caja', 12]], ''),
    p('prod-detergente', 'sup-limpieza', 'Detergente 750 ml', 'Limpieza', [['Unidad', 1], ['Pack', 12], ['Caja', 24]], ''),
    p('prod-bolsa', 'sup-limpieza', 'Bolsas de residuos', 'Limpieza', [['Unidad', 1], ['Pack', 10], ['Caja', 100]], ''),
    p('prod-pollo', 'sup-congelados', 'Pollo congelado', 'Congelados', [['Unidad', 1], ['Caja', 10], ['Cajón', 10], ['Pallet', 500]], 'Equivalencias de ejemplo: verificar con el proveedor.'),
    p('prod-hamburguesas', 'sup-congelados', 'Hamburguesas congeladas', 'Congelados', [['Unidad', 1], ['Pack', 12], ['Caja', 48]], '')
  ];
  const branches = Array.from({ length: 13 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return { id: `branch-${n}`, code: n, name: `Local ${n}`, username: `local${n}`, password: `blunno${n}`, active: true, notes: '', createdAt: new Date().toISOString() };
  });
  return {
    version: 1,
    suppliers,
    products,
    branches,
    orders: [],
    activity: [{ id: uid('act'), createdAt: new Date().toISOString(), title: 'Sistema iniciado en modo demostración', detail: 'El catálogo contiene datos de ejemplo. Revisá las equivalencias antes de usarlo.', type: 'system' }],
    nextOrderNumber: 1001
  };
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = seedState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.products) || !Array.isArray(parsed.branches) || !Array.isArray(parsed.orders)) throw new Error('Formato incorrecto');
    parsed.suppliers ||= [];
    parsed.activity ||= [];
    parsed.nextOrderNumber ||= 1001;
    return parsed;
  } catch (err) {
    console.error('No se pudieron cargar los datos guardados. Se inicia un catálogo de demostración.', err);
    return seedState();
  }
}
function loadSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    toast('No se pudieron guardar los datos. Exportá una copia de seguridad y liberá espacio del navegador.', 'error');
    console.error(err);
    return false;
  }
}
function saveSession() {
  if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else sessionStorage.removeItem(SESSION_KEY);
}
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
function fmtDate(dateLike, includeTime = true) {
  if (!dateLike) return '—';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-AR', includeTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }
    : { day: '2-digit', month: 'short', year: 'numeric' }).format(d).replace(',', ' ·');
}
function shortDate(dateLike) {
  if (!dateLike) return '—';
  const d = new Date(dateLike);
  return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short' }).format(d);
}
function monthName(ym) {
  if (!ym || ym === 'all') return 'Todos los períodos';
  const [y, m] = ym.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
}
function statusPill(status) {
  const obj = STATUSES[status] || STATUSES.new;
  return `<span class="status ${obj.css}">${esc(obj.label)}</span>`;
}
function bySupplier(id) { return state.suppliers.find(s => s.id === id); }
function byProduct(id) { return state.products.find(p => p.id === id); }
function byBranch(id) { return state.branches.find(b => b.id === id); }
function canAdmin() { return session?.role === 'admin'; }
function currentBranch() { return session?.role === 'branch' ? byBranch(session.branchId) : null; }
function branchDisplay(id) { return byBranch(id)?.name || 'Sucursal no disponible'; }
function getAllOrdersForSession() {
  if (canAdmin()) return [...state.orders];
  return state.orders.filter(o => o.branchId === session?.branchId);
}
function addActivity(title, detail, type = 'update', orderId = null) {
  state.activity.unshift({ id: uid('act'), createdAt: new Date().toISOString(), title, detail, type, orderId });
  state.activity = state.activity.slice(0, 150);
}
function toast(message, kind = 'success') {
  const region = document.getElementById('toastRegion');
  if (!region) return;
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}
function initials(text) {
  return String(text || 'BL').split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
}
function activeSuppliers() { return state.suppliers.filter(s => s.active).sort((a,b) => a.name.localeCompare(b.name, 'es')); }
function getSupplierProducts(supplierId, includeInactive = false) {
  return state.products.filter(p => p.supplierId === supplierId && (includeInactive || p.active)).sort((a,b) => a.name.localeCompare(b.name, 'es'));
}
function orderNumber(order) { return `#${String(order.number).padStart(6, '0')}`; }
function activityIcon(type) {
  return ({ order: '＋', update: '✎', status: '↻', product: '▣', branch: '⌂', system: 'i', cancel: '×' })[type] || '·';
}
function availablePages() { return canAdmin() ? NAV_ADMIN : NAV_BRANCH; }
function pageMeta(id) {
  const all = [...NAV_ADMIN, ...NAV_BRANCH];
  return all.find(p => p.id === id) || { label: 'Inicio', icon: '▦' };
}
function pageDescription(id) {
  const map = {
    dashboard: 'Una vista clara de lo que entra, lo que se prepara y lo que ya salió.',
    orders: 'Buscá, filtrá y seguí cada pedido de las sucursales.',
    preparation: 'Consolidá mercadería por proveedor y artículo para preparar la distribución.',
    catalog: 'Administrá proveedores, artículos y equivalencias de cada presentación.',
    branches: 'Organizá los locales, sus accesos de demostración y su estado.',
    history: 'Consultá pedidos anteriores y generá documentos para guardar o imprimir.',
    'new-order': 'Elegí proveedor, marcá los artículos y confirmá las cantidades.',
    'my-orders': 'Consultá el estado y el historial de los pedidos de tu sucursal.'
  };
  return map[id] || '';
}
function render() {
  const app = document.getElementById('app');
  if (!app) return;
  if (!session) {
    app.innerHTML = renderLogin();
    return;
  }
  if (!(canAdmin() && currentPage === 'new-order') && !availablePages().some(p => p.id === currentPage)) currentPage = canAdmin() ? 'dashboard' : 'new-order';
  app.innerHTML = renderShell();
  const content = document.getElementById('pageContent');
  if (!content) return;
  switch (currentPage) {
    case 'dashboard': content.innerHTML = renderDashboard(); break;
    case 'orders': content.innerHTML = renderOrdersPage(false); break;
    case 'preparation': content.innerHTML = renderPreparation(); break;
    case 'catalog': content.innerHTML = renderCatalog(); break;
    case 'branches': content.innerHTML = renderBranches(); break;
    case 'history': content.innerHTML = renderOrdersPage(false, true); break;
    case 'new-order': content.innerHTML = renderCreateOrder(); break;
    case 'my-orders': content.innerHTML = renderOrdersPage(true); break;
    default: content.innerHTML = renderDashboard();
  }
  if (mobileNavOpen) openMobileNav();
}
function renderLogin() {
  return `
  <main class="login-screen">
    <section class="login-brand-panel">
      <div class="brand"><div class="brand-mark">B</div><div><div class="brand-name">BLUNNO</div><div class="brand-subtitle">PEDIDOS Y DISTRIBUCIÓN</div></div></div>
      <div class="login-hero">
        <div class="eyebrow">PLATAFORMA INTERNA</div>
        <h1>Los pedidos de todos los locales, en un solo lugar.</h1>
        <p>Una manera más simple de organizar proveedores, mercadería y distribución. Hecho para el trabajo diario de Distribuidora BLUNNO.</p>
        <div class="login-feature-list">
          <div class="login-feature"><span>✓</span> Pedidos claros y fáciles de seguir</div>
          <div class="login-feature"><span>✓</span> Catálogo organizado por proveedor</div>
          <div class="login-feature"><span>✓</span> Historial de pedidos y documentos</div>
        </div>
      </div>
      <div class="login-copyright">© ${new Date().getFullYear()} Distribuidora BLUNNO · Prototipo sin conexión a servicios externos</div>
    </section>
    <section class="login-form-panel">
      <form class="login-box" id="loginForm">
        <div class="mini-brand"><div class="brand-mark">B</div><div><div class="brand-name" style="color:var(--navy)">BLUNNO</div><div class="brand-subtitle" style="color:var(--muted)">SISTEMA DE PEDIDOS</div></div></div>
        <h2>Ingresar al sistema</h2>
        <p>Usá el usuario asignado a tu sucursal o el acceso de administrador del local 14.</p>
        <div class="field"><label for="loginUsername">Usuario</label><input class="control" id="loginUsername" name="username" autocomplete="username" placeholder="Ej. local03" required></div>
        <div class="field"><label for="loginPassword">Contraseña</label><input class="control" id="loginPassword" name="password" type="password" autocomplete="current-password" placeholder="Ingresá tu contraseña" required></div>
        <div id="loginError" class="login-error">No se pudo iniciar sesión. Revisá el usuario y la contraseña.</div>
        <button class="btn btn-primary login-submit" type="submit">Ingresar <span>→</span></button>
        <div class="login-help"><strong>Modo demostración:</strong> administrador <code>admin</code> / <code>blunno14</code>. Sucursal: <code>local01</code> / <code>blunno01</code> (cambiá el número del 01 al 13 y usá la contraseña correspondiente). No utilices estas credenciales ni datos reales en una publicación pública.</div>
      </form>
    </section>
  </main>`;
}
function renderShell() {
  const pages = availablePages();
  let lastCaption = '';
  const navHtml = pages.map(p => {
    const caption = p.caption && p.caption !== lastCaption ? `<div class="nav-caption">${esc(p.caption)}</div>` : '';
    if (p.caption) lastCaption = p.caption;
    const count = p.id === 'orders' ? state.orders.filter(o => ['new', 'preparing'].includes(o.status)).length : p.id === 'my-orders' ? state.orders.filter(o => o.branchId === session.branchId && ['new','preparing'].includes(o.status)).length : 0;
    return `${caption}<button class="nav-link ${currentPage === p.id ? 'active' : ''}" data-page="${p.id}"><span class="nav-icon">${p.icon}</span><span>${esc(p.label)}</span>${count ? `<span class="nav-count">${count}</span>` : ''}</button>`;
  }).join('');
  const branch = currentBranch();
  const userName = canAdmin() ? 'Administrador' : (branch?.name || 'Sucursal');
  const userSub = canAdmin() ? 'Control total · Local 14' : 'Perfil de sucursal';
  const meta = pageMeta(currentPage);
  const globalHeaderActions = canAdmin()
    ? `<span class="top-date">${new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date())}</span>`
    : `<span class="top-date">${esc(branch?.name || '')}</span>`;
  return `
  <div class="app-shell">
    <div class="mobile-overlay ${mobileNavOpen ? 'show' : ''}" data-action="close-mobile-nav"></div>
    <aside class="sidebar ${mobileNavOpen ? 'mobile-open' : ''}" id="sidebar">
      <div class="brand"><div class="brand-mark">B</div><div><div class="brand-name">BLUNNO</div><div class="brand-subtitle">PEDIDOS Y DISTRIBUCIÓN</div></div></div>
      <nav class="nav-list" aria-label="Navegación principal">${navHtml}</nav>
      <div class="sidebar-spacer"></div>
      ${canAdmin() ? `<div class="nav-caption">RESPALDOS</div><button class="nav-link" data-action="backup-export"><span class="nav-icon">⇩</span><span>Exportar copia</span></button><button class="nav-link" data-action="backup-import"><span class="nav-icon">⇧</span><span>Restaurar copia</span></button><input id="backupFileInput" class="hidden" type="file" accept="application/json,.json">` : ''}
      <div class="sidebar-note"><div class="avatar">${esc(initials(userName))}</div><div><strong>${esc(userName)}</strong><span>${esc(userSub)}</span></div></div>
      <button class="sidebar-logout" data-action="logout">↪ &nbsp; Cerrar sesión</button>
    </aside>
    <main class="main-area">
      <header class="topbar">
        <div style="display:flex;align-items:center;gap:11px;min-width:0"><button class="mobile-menu" data-action="toggle-mobile-nav" aria-label="Abrir menú">☰</button><div class="topbar-title"><h1>${esc(meta.label)}</h1><p>${esc(canAdmin() ? 'Distribuidora BLUNNO · Local 14' : (branch?.name || 'Distribuidora BLUNNO'))}</p></div></div>
        <div class="topbar-actions">${globalHeaderActions}${canAdmin() && currentPage !== 'new-order' ? `<button class="btn btn-primary" data-action="quick-new-order">＋ <span class="hide-small">Nuevo pedido</span></button>` : ''}</div>
      </header>
      <section class="page-content" id="pageContent"></section>
    </main>
  </div>`;
}
function pageHeading(title, desc, actions = '') {
  return `<div class="page-heading"><div><h2>${esc(title)}</h2><p>${esc(desc)}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ''}</div>`;
}
function statCard(label, value, foot, icon, tone = '') {
  return `<div class="stat-card"><div><div class="stat-label">${esc(label)}</div><div class="stat-number">${esc(value)}</div><div class="stat-foot">${esc(foot)}</div></div><div class="stat-icon ${tone}">${icon}</div></div>`;
}
function renderDashboard() {
  const orders = [...state.orders].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  const count = status => orders.filter(o => o.status === status).length;
  const deliveredToday = orders.filter(o => o.status === 'delivered' && (o.updatedAt || o.createdAt).slice(0,10) === todayLocalISO()).length;
  const activeProducts = state.products.filter(p => p.active).length;
  const activeBranches = state.branches.filter(b => b.active).length;
  const recent = orders.slice(0, 6);
  const recentRows = recent.length ? recent.map(orderRow).join('') : '';
  const activity = state.activity.slice(0, 7);
  return `${pageHeading('Panel de distribución', 'Controlá los pedidos y la mercadería en un solo lugar.', `<button class="btn btn-secondary" data-action="export-orders">⇩ Exportar informe</button><button class="btn btn-primary" data-action="quick-new-order">＋ Nuevo pedido</button>`)}
    <div class="stats-grid">
      ${statCard('Pedidos nuevos', count('new'), 'Esperan revisión', '＋', 'amber')}
      ${statCard('En preparación', count('preparing'), 'En el depósito', '▣', '')}
      ${statCard('Listos para despachar', count('ready'), 'Pendientes de salida', '✓', 'green')}
      ${statCard('Entregados hoy', deliveredToday, 'Según el estado actual', '↗', 'slate')}
    </div>
    <div class="content-grid">
      <section class="panel"><div class="panel-head"><div><h3>Pedidos recientes</h3><p>Últimos movimientos registrados en el sistema.</p></div><button class="text-link" data-page="orders">Ver todos →</button></div>
        ${recent.length ? `<div class="table-scroll"><table><thead><tr><th>Pedido</th><th>Sucursal</th><th>Proveedor</th><th>Fecha y hora</th><th>Estado</th><th></th></tr></thead><tbody>${recentRows}</tbody></table></div>` : `<div class="empty-state"><div class="empty-icon">▤</div><strong>Todavía no hay pedidos</strong><p>Cuando una sucursal envíe su primer pedido, aparecerá acá para que puedas revisarlo.</p><button class="btn btn-primary btn-small" data-action="quick-new-order">Crear pedido de prueba</button></div>`}
        <div class="pagination-footer"><span>${orders.length} pedido${orders.length === 1 ? '' : 's'} registrado${orders.length === 1 ? '' : 's'}</span><span>${activeBranches} locales activos · ${activeProducts} artículos activos</span></div>
      </section>
      <section class="panel"><div class="panel-head"><div><h3>Actividad reciente</h3><p>Registro de cambios y operaciones.</p></div><span class="status status-delivered">Registro</span></div><div class="panel-body"><div class="activity-list">${activity.length ? activity.map(activityItem).join('') : `<div class="empty-state"><strong>Sin actividad registrada</strong></div>`}</div></div></section>
    </div>
    <div class="notice-box" style="margin-top:18px;margin-bottom:0"><span>ⓘ</span><div><strong>Modo sin Firebase.</strong> Esta versión guarda la información en el navegador de esta computadora. Para trabajar sincronizados entre sucursales será necesario conectar un servidor o una base de datos más adelante.</div></div>`;
}
function orderRow(order) {
  const provider = order.supplierName || bySupplier(order.supplierId)?.name || 'Proveedor';
  return `<tr><td><div class="primary-cell">${esc(orderNumber(order))}</div><div class="secondary-cell">${order.lines.length} artículo${order.lines.length === 1 ? '' : 's'}</div></td><td><div class="primary-cell">${esc(order.branchName || branchDisplay(order.branchId))}</div><div class="secondary-cell">${esc(order.createdBy || '')}</div></td><td>${esc(provider)}</td><td><div class="primary-cell">${esc(fmtDate(order.createdAt, false))}</div><div class="secondary-cell">${esc(new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(order.createdAt)))}</div></td><td>${statusPill(order.status)}</td><td><div class="table-actions"><button class="btn-icon" title="Ver pedido" aria-label="Ver pedido" data-action="view-order" data-id="${esc(order.id)}">↗</button></div></td></tr>`;
}
function renderOrdersPage(onlyMine = false, isHistory = false) {
  const title = onlyMine ? 'Mis pedidos' : isHistory ? 'Historial e informes' : 'Pedidos recibidos';
  const desc = onlyMine ? 'Seguimiento de todas las solicitudes enviadas por tu sucursal.' : isHistory ? 'Buscá pedidos anteriores, filtrá períodos y descargá documentos.' : 'Bandeja central para revisar, preparar y despachar solicitudes.';
  const actions = canAdmin() ? `<button class="btn btn-secondary" data-action="export-orders">⇩ Exportar Excel / CSV</button>${isHistory ? '' : `<button class="btn btn-primary" data-action="quick-new-order">＋ Nuevo pedido</button>`}` : `<button class="btn btn-primary" data-page="new-order">＋ Hacer pedido</button>`;
  const branches = state.branches.filter(b => b.active).sort((a,b) => a.name.localeCompare(b.name,'es'));
  const suppliers = activeSuppliers();
  const months = [...new Set(getAllOrdersForSession().map(o => (o.createdAt || '').slice(0,7)).filter(Boolean))].sort().reverse();
  return `${pageHeading(title, desc, actions)}
  <section class="panel">
    <div class="filter-bar">
      <div class="search-wrap"><span class="search-symbol">⌕</span><input id="orderSearch" class="search-input" value="${esc(orderQuery)}" placeholder="Buscar pedido, sucursal, proveedor o artículo…" autocomplete="off"><div class="autocomplete" id="orderSuggestions"></div></div>
      <select class="select-control" id="orderSupplierFilter"><option value="all">Todos los proveedores</option>${suppliers.map(s => `<option value="${esc(s.id)}" ${orderSupplierFilter === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
      ${canAdmin() ? `<select class="select-control" id="orderBranchFilter"><option value="all">Todas las sucursales</option>${branches.map(b => `<option value="${esc(b.id)}" ${orderBranchFilter === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select>` : ''}
      <select class="select-control" id="orderStatusFilter"><option value="all">Todos los estados</option>${Object.entries(STATUSES).map(([k,v]) => `<option value="${k}" ${orderStatusFilter === k ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select>
      <select class="select-control" id="orderMonthFilter"><option value="all">Todos los períodos</option>${months.map(m => `<option value="${m}" ${orderMonthFilter === m ? 'selected' : ''}>${esc(monthName(m))}</option>`).join('')}</select>
      <button class="btn btn-secondary btn-small" data-action="clear-order-filters">Limpiar</button>
    </div>
    <div id="ordersTableWrap">${renderOrdersTable()}</div>
  </section>
  <div class="notice-box" style="margin-top:14px;margin-bottom:0"><span>ⓘ</span><div>${onlyMine ? 'Solo ves los pedidos asociados a tu propia sucursal.' : 'Cada pedido conserva los nombres y las equivalencias de las presentaciones que tenía al momento de enviarse.'} No se muestran precios.</div></div>`;
}
function orderMatches(order, query) {
  if (!query) return true;
  const q = query.toLocaleLowerCase('es');
  const blob = [orderNumber(order), order.branchName, branchDisplay(order.branchId), order.supplierName, order.createdBy, order.notes, ...(order.lines || []).flatMap(l => [l.productName, l.presentationName, l.category, l.notes])].join(' ').toLocaleLowerCase('es');
  return blob.includes(q);
}
function getFilteredOrders() {
  let orders = getAllOrdersForSession();
  if (orderQuery.trim()) orders = orders.filter(o => orderMatches(o, orderQuery.trim()));
  if (orderStatusFilter !== 'all') orders = orders.filter(o => o.status === orderStatusFilter);
  if (orderSupplierFilter !== 'all') orders = orders.filter(o => o.supplierId === orderSupplierFilter || o.supplierName === bySupplier(orderSupplierFilter)?.name);
  if (canAdmin() && orderBranchFilter !== 'all') orders = orders.filter(o => o.branchId === orderBranchFilter);
  if (orderMonthFilter !== 'all') orders = orders.filter(o => (o.createdAt || '').slice(0,7) === orderMonthFilter);
  return orders.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
}
function renderOrdersTable() {
  const orders = getFilteredOrders();
  if (!orders.length) return `<div class="empty-state"><div class="empty-icon">⌕</div><strong>No encontramos pedidos</strong><p>Probá cambiando los filtros o usando una palabra más corta, como el nombre del proveedor o del artículo.</p></div>`;
  return `<div class="table-scroll"><table><thead><tr><th>N.º de pedido</th><th>Sucursal</th><th>Proveedor</th><th>Fecha y hora</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${orders.map(o => orderRow(o)).join('')}</tbody></table></div><div class="pagination-footer"><span>Se muestran ${orders.length} pedido${orders.length === 1 ? '' : 's'}</span><span>Ordenados del más reciente al más antiguo</span></div>`;
}
function renderOrderSuggestions() {
  const box = document.getElementById('orderSuggestions');
  const input = document.getElementById('orderSearch');
  if (!box || !input) return;
  const q = input.value.trim().toLocaleLowerCase('es');
  if (q.length < 2) { box.classList.remove('show'); box.innerHTML = ''; return; }
  const hits = [];
  const orders = getAllOrdersForSession();
  orders.forEach(o => {
    if (hits.length < 5 && ([orderNumber(o), o.branchName, o.supplierName].join(' ').toLocaleLowerCase('es').includes(q))) {
      hits.push({ title: `${orderNumber(o)} · ${o.branchName || branchDisplay(o.branchId)}`, sub: `${o.supplierName || 'Proveedor'} · ${fmtDate(o.createdAt)}`, query: orderNumber(o), icon: '▤' });
    }
  });
  const products = state.products.filter(p => p.name.toLocaleLowerCase('es').includes(q)).slice(0,4);
  products.forEach(p => hits.push({ title: p.name, sub: `Artículo · ${bySupplier(p.supplierId)?.name || 'Proveedor'}`, query: p.name, icon: '▣' }));
  const suppliers = state.suppliers.filter(s => s.name.toLocaleLowerCase('es').includes(q)).slice(0,3);
  suppliers.forEach(s => hits.push({ title: s.name, sub: 'Proveedor', query: s.name, icon: '↗' }));
  if (!hits.length) { box.classList.remove('show'); box.innerHTML = ''; return; }
  box.innerHTML = `<div class="autocomplete-caption">Sugerencias</div>${hits.slice(0,8).map(h => `<div class="suggestion" role="button" tabindex="0" data-action="use-order-suggestion" data-query="${esc(h.query)}"><span class="suggestion-mark">${h.icon}</span><span>${esc(h.title)}<small>${esc(h.sub)}</small></span></div>`).join('')}`;
  box.classList.add('show');
}
function renderPreparation() {
  const orders = state.orders.filter(o => ['new','preparing','ready','dispatched'].includes(o.status));
  const grouped = new Map();
  orders.forEach(o => (o.lines || []).forEach(line => {
    const providerName = line.supplierName || o.supplierName || 'Proveedor';
    const key = `${providerName}::${line.productId || line.productName}`;
    if (!grouped.has(key)) grouped.set(key, { supplier: providerName, product: line.productName, unitTotal: 0, breakdown: new Map(), branches: new Set(), orders: new Set() });
    const item = grouped.get(key);
    const quantity = Number(line.quantity) || 0;
    const presentation = line.presentationName || 'Unidad';
    const bkey = presentation;
    item.unitTotal += quantity * (Number(line.unitsPerPresentation) || 1);
    item.breakdown.set(bkey, (item.breakdown.get(bkey) || 0) + quantity);
    item.branches.add(o.branchName || branchDisplay(o.branchId));
    item.orders.add(o.id);
  }));
  const byProvider = new Map();
  [...grouped.values()].sort((a,b) => a.supplier.localeCompare(b.supplier,'es') || a.product.localeCompare(b.product,'es')).forEach(item => {
    if (!byProvider.has(item.supplier)) byProvider.set(item.supplier, []);
    byProvider.get(item.supplier).push(item);
  });
  const productsTotal = grouped.size;
  const unitsTotal = [...grouped.values()].reduce((sum, item) => sum + item.unitTotal, 0);
  const html = [...byProvider.entries()].map(([supplier, items]) => `<section class="panel prep-group"><div class="prep-group-title"><span>${esc(supplier)}</span><small>${items.length} artículo${items.length === 1 ? '' : 's'} · ${items.reduce((sum,i)=>sum+i.branches.size,0)} asignaciones de sucursal</small></div>${items.map(item => `<div class="prep-row"><div><div class="prep-product">${esc(item.product)}</div><div class="secondary-cell">${item.branches.size} sucursal${item.branches.size === 1 ? '' : 'es'} · ${item.orders.size} pedido${item.orders.size === 1 ? '' : 's'}</div></div><div><div class="prep-quantity">${item.unitTotal.toLocaleString('es-AR')} u.</div><div class="secondary-cell">equivalentes</div></div><div class="prep-details">${[...item.breakdown.entries()].map(([pres,qty]) => `${esc(pres)}: ${qty}`).join(' · ')}</div></div>`).join('')}</section>`).join('');
  return `${pageHeading('Preparación de mercadería', 'Sumá los pedidos activos para saber qué preparar por proveedor y artículo.', `<button class="btn btn-secondary" data-action="export-preparation">⇩ Exportar preparación</button><button class="btn btn-primary" data-action="print-preparation">▣ Imprimir / PDF</button>`)}
  <div class="stats-grid">${statCard('Artículos diferentes', productsTotal, 'En pedidos por preparar', '▣', '')}${statCard('Unidades equivalentes', unitsTotal.toLocaleString('es-AR'), 'Según las equivalencias guardadas', '⇄', 'green')}${statCard('Pedidos activos', orders.length, 'Sin entregar ni cancelar', '▤', 'amber')}${statCard('Proveedores', byProvider.size, 'Con mercadería pendiente', '↗', 'slate')}</div>
  <div class="notice-box"><span>ⓘ</span><div>Esta lista suma pedidos nuevos, en preparación, preparados y despachados. Las equivalencias reflejan lo registrado en cada pedido histórico; confirmá la mercadería real antes del despacho.</div></div>
  ${byProvider.size ? html : `<section class="panel"><div class="empty-state"><div class="empty-icon">▣</div><strong>No hay mercadería pendiente de preparación</strong><p>Cuando haya pedidos activos, acá vas a ver el total por proveedor y artículo, con el desglose de las presentaciones solicitadas.</p><button class="btn btn-secondary btn-small" data-page="orders">Ver pedidos</button></div></section>`}`;
}
function renderCatalog() {
  const suppliers = state.suppliers.slice().sort((a,b) => a.name.localeCompare(b.name,'es'));
  const activeCount = state.products.filter(p => p.active).length;
  const actions = `<button class="btn btn-secondary" data-action="import-catalog">⇧ Importar CSV</button><button class="btn btn-secondary" data-action="export-catalog">⇩ Exportar catálogo</button><button class="btn btn-secondary" data-action="new-supplier">＋ Proveedor</button><button class="btn btn-primary" data-action="new-product">＋ Artículo</button><input id="catalogFileInput" class="hidden" type="file" accept=".csv,text/csv">`;
  const filteredSuppliers = suppliers.filter(s => catalogSupplierFilter === 'all' || s.id === catalogSupplierFilter);
  const sections = filteredSuppliers.map(s => {
    const supplierMatchesQuery = Boolean(catalogQuery) && s.name.toLocaleLowerCase('es').includes(catalogQuery.toLocaleLowerCase('es'));
    const products = state.products.filter(p => p.supplierId === s.id && (catalogActiveFilter === 'all' || (catalogActiveFilter === 'active' ? p.active : !p.active)) && (!catalogQuery || supplierMatchesQuery || [p.name,p.category,p.notes,...p.presentations.map(x=>x.name)].join(' ').toLocaleLowerCase('es').includes(catalogQuery.toLocaleLowerCase('es'))));
    if (catalogQuery && !products.length && !s.name.toLocaleLowerCase('es').includes(catalogQuery.toLocaleLowerCase('es'))) return '';
    return `<section class="panel" style="margin-bottom:15px"><div class="panel-head"><div style="display:flex;gap:11px;align-items:center"><div class="catalog-symbol">${esc(initials(s.name))}</div><div><h3>${esc(s.name)} ${s.active ? '' : '<span class="status status-inactive">Inactivo</span>'}</h3><p>${products.length} artículo${products.length === 1 ? '' : 's'} · ${esc(s.contact || 'Sin contacto cargado')}</p></div></div><div class="table-actions"><button class="btn btn-secondary btn-small" data-action="edit-supplier" data-id="${esc(s.id)}">Editar proveedor</button><button class="btn-icon" title="Agregar artículo a este proveedor" data-action="new-product" data-supplier="${esc(s.id)}">＋</button></div></div>
      ${products.length ? `<div class="catalog-card-grid">${products.map(p => `<article class="catalog-card"><div class="catalog-top"><div class="catalog-symbol">▣</div><div style="flex:1;min-width:0"><div class="catalog-name">${esc(p.name)}</div><div class="catalog-meta">${esc(p.category || 'Sin categoría')} · ${p.active ? 'Activo' : 'Inactivo'}</div></div>${p.active ? '' : `<span class="status status-inactive">Inactivo</span>`}</div><div class="catalog-equivalences">${p.presentations.map(pr => `<span class="equivalence-chip">${esc(pr.name)}: ${Number(pr.units) === 1 ? '1 unidad' : `${Number(pr.units).toLocaleString('es-AR')} u.`}</span>`).join('')}</div>${p.notes ? `<div class="secondary-cell" style="white-space:normal;line-height:1.45;margin-bottom:9px">${esc(p.notes)}</div>` : ''}<div class="catalog-foot"><span class="secondary-cell">Actualizado ${esc(shortDate(p.updatedAt || p.createdAt))}</span><button class="btn btn-secondary btn-small" data-action="edit-product" data-id="${esc(p.id)}">Editar artículo</button></div></article>`).join('')}</div>` : `<div class="empty-state" style="padding:24px"><strong>No hay artículos en este proveedor con estos filtros</strong><p>Agregá uno nuevo o cambiá el filtro de estado.</p><button class="btn btn-secondary btn-small" data-action="new-product" data-supplier="${esc(s.id)}">＋ Agregar artículo</button></div>`}</section>`;
  }).join('');
  return `${pageHeading('Proveedores y artículos', 'Administrá el catálogo de BLUNNO. No se cargan precios ni fotos.', actions)}
    <div class="stats-grid">${statCard('Proveedores', state.suppliers.filter(s=>s.active).length, 'Activos', '↗', '')}${statCard('Artículos activos', activeCount, 'Disponibles para pedir', '▣', 'green')}${statCard('Artículos inactivos', state.products.filter(p=>!p.active).length, 'Conservados en historial', '◷', 'slate')}${statCard('Presentaciones', state.products.filter(p=>p.active).reduce((sum,p)=>sum+p.presentations.length,0), 'Equivalencias configuradas', '⇄', 'amber')}</div>
    <section class="panel" style="margin-bottom:18px"><div class="filter-bar"><div class="search-wrap"><span class="search-symbol">⌕</span><input id="catalogSearch" class="search-input" value="${esc(catalogQuery)}" placeholder="Buscar artículo, proveedor, categoría o presentación…" autocomplete="off"><div class="autocomplete" id="catalogSuggestions"></div></div><select class="select-control" id="catalogSupplierFilter"><option value="all">Todos los proveedores</option>${suppliers.map(s=>`<option value="${esc(s.id)}" ${catalogSupplierFilter===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select><select class="select-control" id="catalogActiveFilter"><option value="active" ${catalogActiveFilter==='active'?'selected':''}>Artículos activos</option><option value="inactive" ${catalogActiveFilter==='inactive'?'selected':''}>Artículos inactivos</option><option value="all" ${catalogActiveFilter==='all'?'selected':''}>Todos los artículos</option></select><button class="btn btn-secondary btn-small" data-action="clear-catalog-filters">Limpiar</button></div></section>
    ${sections || `<section class="panel"><div class="empty-state"><div class="empty-icon">⌕</div><strong>No hay resultados</strong><p>Probá con otra palabra o agregá un proveedor.</p></div></section>`}
    <div class="notice-box" style="margin-bottom:0"><span>ⓘ</span><div><strong>Importante:</strong> las equivalencias configuradas se aplican a los pedidos nuevos. Los pedidos ya enviados conservan el nombre, la presentación y la equivalencia originales.</div></div>`;
}
function renderCatalogSuggestions() {
  const box = document.getElementById('catalogSuggestions');
  const input = document.getElementById('catalogSearch');
  if (!box || !input) return;
  const q = input.value.trim().toLocaleLowerCase('es');
  if (q.length < 2) { box.classList.remove('show'); box.innerHTML = ''; return; }
  const hits = [];
  state.products.filter(p => [p.name,p.category,p.notes,...p.presentations.map(x=>x.name)].join(' ').toLocaleLowerCase('es').includes(q)).slice(0,6).forEach(p => hits.push({ type: 'product', id:p.id, title:p.name, sub:bySupplier(p.supplierId)?.name || 'Proveedor' }));
  state.suppliers.filter(s=>s.name.toLocaleLowerCase('es').includes(q)).slice(0,3).forEach(s => hits.push({type:'supplier',id:s.id,title:s.name,sub:'Proveedor'}));
  if (!hits.length) { box.classList.remove('show'); box.innerHTML = ''; return; }
  box.innerHTML = `<div class="autocomplete-caption">Resultados sugeridos</div>${hits.slice(0,8).map(h=>`<div class="suggestion" tabindex="0" role="button" data-action="use-catalog-suggestion" data-type="${h.type}" data-id="${esc(h.id)}" data-query="${esc(h.title)}"><span class="suggestion-mark">${h.type==='product'?'▣':'↗'}</span><span>${esc(h.title)}<small>${esc(h.sub)}</small></span></div>`).join('')}`;
  box.classList.add('show');
}
function renderBranches() {
  const branches = state.branches.slice().sort((a,b) => a.code.localeCompare(b.code,'es'));
  const active = branches.filter(b=>b.active).length;
  const rows = branches.map(b => `<tr><td><div class="primary-cell">${esc(b.name)}</div><div class="secondary-cell">Código ${esc(b.code)}</div></td><td><span class="primary-cell">${esc(b.username)}</span><div class="secondary-cell">Usuario de demostración</div></td><td>${b.active ? `<span class="status status-ready">Activa</span>` : `<span class="status status-inactive">Inactiva</span>`}</td><td><div class="secondary-cell">${state.orders.filter(o=>o.branchId===b.id).length} pedidos históricos</div></td><td><div class="table-actions"><button class="btn btn-secondary btn-small" data-action="edit-branch" data-id="${esc(b.id)}">Editar</button><button class="btn btn-icon" title="${b.active?'Desactivar':'Activar'} sucursal" data-action="toggle-branch" data-id="${esc(b.id)}">${b.active?'⏻':'✓'}</button></div></td></tr>`).join('');
  return `${pageHeading('Sucursales', 'Administrá los locales habilitados para hacer pedidos a BLUNNO.', `<button class="btn btn-primary" data-action="new-branch">＋ Agregar sucursal</button>`)}
    <div class="stats-grid">${statCard('Sucursales activas', active, 'Pueden ingresar', '⌂', 'green')}${statCard('Sucursales inactivas', branches.length-active, 'No pueden iniciar sesión', '⏸', 'slate')}${statCard('Pedidos históricos', state.orders.length, 'Se conservan al desactivar', '◷', '')}${statCard('Sucursales totales', branches.length, 'Locales registrados', '▤', 'amber')}</div>
    <div class="notice-box warning"><span>!</span><div>Los accesos incluidos son solo de demostración. Como esta versión no tiene servidor ni Firebase, las contraseñas y los permisos no constituyen una protección real para datos privados.</div></div>
    <section class="panel"><div class="panel-head"><div><h3>Locales registrados</h3><p>Las sucursales solo pueden crear pedidos y consultar su propio historial.</p></div><span class="status status-delivered">Administración</span></div><div class="table-scroll"><table><thead><tr><th>Sucursal</th><th>Usuario</th><th>Estado</th><th>Actividad</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
function renderCreateOrder() {
  const suppliers = activeSuppliers();
  if (!createSupplierId || !suppliers.some(s=>s.id===createSupplierId)) createSupplierId = suppliers[0]?.id || '';
  const branch = currentBranch();
  const activeBranches = state.branches.filter(b=>b.active).sort((a,b)=>a.code.localeCompare(b.code,'es'));
  if (canAdmin() && (!createBranchId || !activeBranches.some(b=>b.id===createBranchId))) createBranchId = activeBranches[0]?.id || '';
  const supplier = bySupplier(createSupplierId);
  const products = supplier ? getSupplierProducts(supplier.id) : [];
  const branchSelect = canAdmin() ? `<div class="field" style="min-width:180px"><label for="createBranchSelect">Pedido para la sucursal</label><select id="createBranchSelect" class="select-control" style="width:100%">${activeBranches.map(b=>`<option value="${esc(b.id)}" ${createBranchId===b.id?'selected':''}>${esc(b.name)}</option>`).join('')}</select></div>` : `<div class="field" style="min-width:180px"><label>Sucursal que realiza el pedido</label><div class="control" style="background:#f7f9fc;display:flex;align-items:center">${esc(branch?.name || '')}</div></div>`;
  return `${pageHeading('Hacer un pedido', 'Elegí un proveedor y marcá exactamente lo que necesitás. Sin precios ni imágenes.', `<button class="btn btn-secondary" data-page="${canAdmin()?'orders':'my-orders'}">Ver pedidos anteriores</button>`)}
    <div class="notice-box"><span>ⓘ</span><div>Marcá los artículos que querés pedir, elegí la presentación y la cantidad. Debajo de cada presentación se indica su equivalencia configurada por el administrador.</div></div>
    <section class="panel" style="margin-bottom:16px"><div class="panel-body"><div class="form-grid"><div class="field"><label for="createSupplierSelect">Proveedor</label><select id="createSupplierSelect" class="select-control" style="width:100%" ${suppliers.length?'':'disabled'}>${suppliers.map(s=>`<option value="${esc(s.id)}" ${createSupplierId===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>${branchSelect}<div class="field field-full"><label for="createOrderNotes">Observaciones del pedido (opcional)</label><input class="control" id="createOrderNotes" placeholder="Ej. Entregar por entrada de depósito…"></div></div></div></section>
    <section class="panel" id="createOrderPanel"><div class="panel-head"><div><h3>Mercadería disponible</h3><p>${supplier ? `${esc(supplier.name)} · ${products.length} artículos activos` : 'Primero agregá un proveedor desde el administrador.'}</p></div><span class="status status-delivered">${products.length} artículos</span></div>
      <div class="filter-bar"><div class="search-wrap"><span class="search-symbol">⌕</span><input id="createProductSearch" class="search-input" value="${esc(productQuery)}" placeholder="Escribí para buscar: coca, agua, arroz…" autocomplete="off"><div class="autocomplete" id="createProductSuggestions"></div></div><button class="btn btn-secondary btn-small" data-action="clear-create-search">Limpiar búsqueda</button></div>
      <form id="createOrderForm"><div id="createProductList">${renderCreateProductList()}</div>
        <div class="order-footer"><div><strong id="selectedCountLabel">${selectedCreateCount(createSupplierId)} artículo${selectedCreateCount(createSupplierId)===1?'':'s'} seleccionado${selectedCreateCount(createSupplierId)===1?'':'s'}</strong><div class="muted-small">Podés revisar y corregir las cantidades antes de confirmar.</div></div><button class="btn btn-primary" type="submit" ${products.length?'':'disabled'}>Revisar y confirmar pedido →</button></div></form>
    </section>`;
}
function selectedCreateCount(supplierId = createSupplierId) {
  return Object.values(createDrafts[supplierId] || {}).filter(x => x && x.selected).length;
}
function getCreateDraft(supplierId, productId) {
  createDrafts[supplierId] ||= {};
  createDrafts[supplierId][productId] ||= { selected: false, quantity: '1', presentationIndex: '0', extraLines: [] };
  const draft = createDrafts[supplierId][productId];
  if (!Array.isArray(draft.extraLines)) draft.extraLines = [];
  return draft;
}
function renderCreateProductList() {
  const supplier = bySupplier(createSupplierId);
  const allSupplierProducts = supplier ? getSupplierProducts(supplier.id) : [];
  const products = allSupplierProducts.filter(p=>[p.name,p.category,p.notes,...p.presentations.map(x=>x.name)].join(' ').toLocaleLowerCase('es').includes(productQuery.toLocaleLowerCase('es')));
  if (!products.length) return `<div class="empty-state"><div class="empty-icon">⌕</div><strong>${supplier?'No encontramos artículos':'No hay proveedores activos'}</strong><p>${supplier?'Probá una palabra más corta o pedile al administrador que revise el catálogo.':'El administrador debe cargar un proveedor y sus productos antes de hacer pedidos.'}</p></div>`;
  return `<div class="product-order-list">${products.map(p=>{
    const d=getCreateDraft(supplier.id,p.id);
    const chosenIndex=Math.min(Math.max(0,Number(d.presentationIndex)||0),p.presentations.length-1);
    const extraLines=(d.extraLines||[]).map((line,i)=>`<div class="extra-presentation-row"><select class="select-control" data-extra-product="${esc(p.id)}" data-extra-index="${i}" data-extra-field="presentationIndex" aria-label="Otra presentación de ${esc(p.name)}">${p.presentations.map((pr,j)=>`<option value="${j}" ${j===Number(line.presentationIndex)?'selected':''}>${esc(pr.name)} · ${Number(pr.units)===1?'1 unidad':`${Number(pr.units).toLocaleString('es-AR')} u.`}</option>`).join('')}</select><input class="control" type="number" min="1" step="1" value="${esc(line.quantity||'1')}" data-extra-product="${esc(p.id)}" data-extra-index="${i}" data-extra-field="quantity" aria-label="Cantidad de ${esc(p.name)} para otra presentación"><button type="button" class="btn-icon" data-action="remove-extra-presentation" data-product-id="${esc(p.id)}" data-extra-index="${i}" title="Quitar esta presentación" aria-label="Quitar esta presentación">×</button></div>`).join('');
    return `<div class="product-order-row" data-product-row="${esc(p.id)}"><input type="checkbox" name="pickProduct" value="${esc(p.id)}" ${d.selected?'checked':''} aria-label="Seleccionar ${esc(p.name)}"><div><div class="item-name">${esc(p.name)}</div><div class="item-note">${esc(p.category || 'Sin categoría')}${p.notes?` · ${esc(p.notes)}`:''}</div><button type="button" class="text-link extra-add" data-action="add-extra-presentation" data-product-id="${esc(p.id)}">＋ Otra presentación</button>${extraLines}</div><div class="product-quantity-wrap"><select class="select-control" name="presentation-${esc(p.id)}" aria-label="Presentación de ${esc(p.name)}">${p.presentations.map((pr,i)=>`<option value="${i}" ${i===chosenIndex?'selected':''}>${esc(pr.name)} · ${Number(pr.units)===1?'1 unidad':`${Number(pr.units).toLocaleString('es-AR')} u.`}</option>`).join('')}</select><input class="control" name="quantity-${esc(p.id)}" type="number" min="1" step="1" value="${esc(d.quantity||'1')}" aria-label="Cantidad de ${esc(p.name)}" inputmode="numeric"></div><div class="item-note">${p.presentations.length} presentación${p.presentations.length===1?'':'es'}</div></div>`;
  }).join('')}</div>`;
}
function renderCreateProductSuggestions() {
  const box = document.getElementById('createProductSuggestions');
  const input = document.getElementById('createProductSearch');
  if (!box || !input) return;
  const q = input.value.trim().toLocaleLowerCase('es');
  if (q.length < 2) { box.classList.remove('show'); box.innerHTML=''; return; }
  const hits = getSupplierProducts(createSupplierId).filter(p=>[p.name,p.category,...p.presentations.map(x=>x.name)].join(' ').toLocaleLowerCase('es').includes(q)).slice(0,7);
  if (!hits.length) { box.classList.remove('show'); box.innerHTML=''; return; }
  box.innerHTML = `<div class="autocomplete-caption">Artículos sugeridos</div>${hits.map(p=>`<div class="suggestion" tabindex="0" role="button" data-action="use-create-suggestion" data-query="${esc(p.name)}"><span class="suggestion-mark">▣</span><span>${esc(p.name)}<small>${esc(p.category || 'Artículo')}</small></span></div>`).join('')}`;
  box.classList.add('show');
}
function getPresentation(product, name) { return product?.presentations?.find(p=>p.name === name); }
function renderActivityForOrder(orderId) {
  const acts = state.activity.filter(a=>a.orderId===orderId).slice(0,8);
  if (!acts.length) return '<div class="secondary-cell">Todavía no hay modificaciones registradas para este pedido.</div>';
  return `<div class="activity-list">${acts.map(activityItem).join('')}</div>`;
}
function activityItem(a) {
  return `<div class="activity-item"><div class="activity-dot">${activityIcon(a.type)}</div><div style="min-width:0"><strong>${esc(a.title)}</strong><p>${esc(a.detail || '')}</p><div class="activity-time">${esc(fmtDate(a.createdAt))}</div></div></div>`;
}
function openModal(title, subtitle, body, options = {}) {
  closeModal(false);
  const root = document.createElement('div');
  root.className = 'modal-backdrop';
  root.id = 'activeModalBackdrop';
  root.innerHTML = `<section class="modal ${options.wide?'modal-wide':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><div><h3>${esc(title)}</h3>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div><button class="modal-x" data-action="close-modal" aria-label="Cerrar">×</button></div><div class="modal-body">${body}</div>${options.footer===false?'':`<div class="modal-foot">${options.footer || `<button type="button" class="btn btn-secondary" data-action="close-modal">Cancelar</button>`}</div>`}</section>`;
  document.body.appendChild(root);
  root.addEventListener('click', e => { if (e.target === root) closeModal(); });
  const focusable = root.querySelector('input:not([type=hidden]),select,textarea,button');
  if (focusable) setTimeout(()=>focusable.focus(), 30);
}
function closeModal(shouldFocus = true) {
  const root = document.getElementById('activeModalBackdrop');
  if (root) root.remove();
}
function openSupplierModal(id = null) {
  if (!canAdmin()) return;
  const supplier = id ? bySupplier(id) : null;
  const form = `<form id="supplierForm" data-id="${esc(id||'')}"><div class="form-grid">
    <div class="field field-full"><label for="supplierName">Nombre del proveedor *</label><input id="supplierName" class="control" name="name" required maxlength="100" value="${esc(supplier?.name||'')}" placeholder="Ej. Distribuidora de bebidas"></div>
    <div class="field"><label for="supplierContact">Contacto (opcional)</label><input id="supplierContact" class="control" name="contact" value="${esc(supplier?.contact||'')}" maxlength="120" placeholder="Teléfono o persona de contacto"></div>
    <div class="field"><label for="supplierActive">Estado</label><select id="supplierActive" class="select-control" name="active" style="width:100%"><option value="true" ${supplier?.active!==false?'selected':''}>Activo</option><option value="false" ${supplier?.active===false?'selected':''}>Inactivo</option></select></div>
    <div class="field field-full"><label for="supplierNotes">Observaciones</label><textarea id="supplierNotes" class="textarea-control" name="notes" maxlength="500" placeholder="Aclaraciones internas">${esc(supplier?.notes||'')}</textarea></div>
  </div></form>`;
  const foot = `${supplier ? `<button type="button" class="btn btn-danger" data-action="deactivate-supplier" data-id="${esc(id)}">${supplier.active?'Desactivar':'Activar'}</button>` : ''}<button type="button" class="btn btn-secondary" data-action="close-modal">Cancelar</button><button type="submit" form="supplierForm" class="btn btn-primary">Guardar proveedor</button>`;
  openModal(supplier?'Editar proveedor':'Agregar proveedor', 'Los proveedores inactivos y sus artículos se conservan en el historial.', form, { footer: foot });
}
function presentationLines(product) { return (product?.presentations || []).map(p => `${p.name}=${p.units}`).join('; '); }
function parsePresentations(text) {
  const parts = String(text || '').split(/[;\n|]+/).map(s=>s.trim()).filter(Boolean);
  const found = [];
  for (const part of parts) {
    const m = part.match(/^(.+?)\s*(?:=|:|→|-)\s*(\d+(?:[.,]\d+)?)\s*(?:u(?:nidades?)?)?$/i);
    if (!m) throw new Error(`No entendí la presentación "${part}". Usá el formato Pack=9; Caja=36.`);
    const name = m[1].trim();
    const units = Number(m[2].replace(',', '.'));
    if (!name || !Number.isFinite(units) || units <= 0 || !Number.isInteger(units)) throw new Error(`La equivalencia de "${name}" debe ser un número entero mayor que cero.`);
    if (found.some(p=>p.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es'))) throw new Error(`La presentación "${name}" está repetida.`);
    found.push({name, units});
  }
  if (!found.length) throw new Error('Cargá por lo menos una presentación, por ejemplo Unidad=1; Pack=9.');
  const unit = found.find(p=>p.name.toLocaleLowerCase('es') === 'unidad');
  if (!unit) found.unshift({name:'Unidad',units:1});
  else if (unit.units !== 1) throw new Error('La presentación Unidad debe equivaler exactamente a 1 unidad.');
  return found;
}
function openProductModal(id = null, supplierId = null) {
  if (!canAdmin()) return;
  const product = id ? byProduct(id) : null;
  const defaultSupplier = supplierId || product?.supplierId || activeSuppliers()[0]?.id || '';
  const suppliers = state.suppliers.slice().sort((a,b)=>a.name.localeCompare(b.name,'es'));
  const form = `<form id="productForm" data-id="${esc(id||'')}"><div class="form-grid">
    <div class="field"><label for="productSupplier">Proveedor *</label><select class="select-control" style="width:100%" id="productSupplier" name="supplierId" required>${suppliers.map(s=>`<option value="${esc(s.id)}" ${defaultSupplier===s.id?'selected':''}>${esc(s.name)}${s.active?'':' (inactivo)'}</option>`).join('')}</select></div>
    <div class="field"><label for="productActive">Estado</label><select class="select-control" style="width:100%" id="productActive" name="active"><option value="true" ${product?.active!==false?'selected':''}>Activo</option><option value="false" ${product?.active===false?'selected':''}>Inactivo</option></select></div>
    <div class="field field-full"><label for="productName">Nombre del artículo *</label><input class="control" id="productName" name="name" required maxlength="140" value="${esc(product?.name||'')}" placeholder="Ej. Coca-Cola 500 ml"></div>
    <div class="field field-full"><label for="productCategory">Categoría (opcional)</label><input class="control" id="productCategory" name="category" maxlength="80" value="${esc(product?.category||'')}" placeholder="Ej. Bebidas, Limpieza, Almacén"></div>
    <div class="field field-full"><label for="productPresentations">Presentaciones y equivalencias *</label><textarea class="textarea-control" id="productPresentations" name="presentations" required style="min-height:82px" placeholder="Unidad=1; Pack=9; Caja=36; Cajón=12; Pallet=2160">${esc(product?presentationLines(product):'Unidad=1; Pack=9; Caja=36')}</textarea><span class="hint">Separá cada presentación con punto y coma. Ejemplo: Unidad=1; Pack=9; Caja=36; Cajón=12; Pallet=2160. Los valores son las unidades equivalentes de esa presentación.</span></div>
    <div class="field field-full"><label for="productNotes">Observaciones (opcional)</label><textarea class="textarea-control" id="productNotes" name="notes" maxlength="600" placeholder="Aclaraciones que necesitan ver las sucursales">${esc(product?.notes||'')}</textarea></div>
  </div><div class="notice-box" style="margin:16px 0 0"><span>ⓘ</span><div>Al cambiar una equivalencia, los nuevos pedidos utilizarán la configuración nueva. Los pedidos anteriores mantienen su equivalencia original.</div></div></form>`;
  const foot = `${product ? `<button type="button" class="btn btn-danger" data-action="toggle-product" data-id="${esc(id)}">${product.active?'Desactivar artículo':'Reactivar artículo'}</button>` : ''}<button type="button" class="btn btn-secondary" data-action="close-modal">Cancelar</button><button type="submit" form="productForm" class="btn btn-primary">Guardar artículo</button>`;
  openModal(product?'Editar artículo':'Agregar artículo', 'Sin precios y sin imágenes. El proveedor y las presentaciones se pueden cambiar desde acá.', form, { footer: foot });
}
function openBranchModal(id = null) {
  if (!canAdmin()) return;
  const branch = id ? byBranch(id) : null;
  const form = `<form id="branchForm" data-id="${esc(id||'')}"><div class="form-grid">
    <div class="field"><label for="branchCode">Código corto *</label><input class="control" id="branchCode" name="code" required maxlength="8" value="${esc(branch?.code||String(Math.max(0,...state.branches.map(b=>Number(b.code)||0))+1).padStart(2,'0'))}" placeholder="14"></div>
    <div class="field"><label for="branchName">Nombre visible *</label><input class="control" id="branchName" name="name" required maxlength="100" value="${esc(branch?.name||'')}" placeholder="Ej. Local 14 - Depósito"></div>
    <div class="field"><label for="branchUsername">Usuario *</label><input class="control" id="branchUsername" name="username" required maxlength="50" value="${esc(branch?.username||'')}" placeholder="Ej. local14" autocomplete="off"></div>
    <div class="field"><label for="branchPassword">Contraseña de demostración ${branch?'(dejar vacío para no cambiar)':'*'}</label><input class="control" id="branchPassword" name="password" type="password" ${branch?'':'required'} minlength="4" maxlength="100" value="" placeholder="${branch?'Sin cambios':'Definir contraseña'}" autocomplete="new-password"></div>
    <div class="field"><label for="branchActive">Estado</label><select class="select-control" id="branchActive" name="active" style="width:100%"><option value="true" ${branch?.active!==false?'selected':''}>Activa</option><option value="false" ${branch?.active===false?'selected':''}>Inactiva</option></select></div>
    <div class="field"><label for="branchNotes">Observaciones</label><input class="control" id="branchNotes" name="notes" maxlength="300" value="${esc(branch?.notes||'')}" placeholder="Información interna"></div>
  </div><div class="notice-box warning" style="margin:16px 0 0"><span>!</span><div>Estos usuarios y contraseñas solo funcionan en la demostración local. En una versión multiusuario real, los accesos deben gestionarse en un servidor seguro.</div></div></form>`;
  const foot = `<button type="button" class="btn btn-secondary" data-action="close-modal">Cancelar</button><button type="submit" form="branchForm" class="btn btn-primary">Guardar sucursal</button>`;
  openModal(branch?'Editar sucursal':'Agregar sucursal', 'Podés agregar nuevos locales si la distribuidora sigue creciendo.', form, { footer: foot });
}
function orderDetailHtml(order) {
  const lines = order.lines || [];
  return `<div class="order-detail-grid"><div class="detail-box"><span>NÚMERO DE PEDIDO</span><strong>${esc(orderNumber(order))}</strong></div><div class="detail-box"><span>SUCURSAL</span><strong>${esc(order.branchName || branchDisplay(order.branchId))}</strong></div><div class="detail-box"><span>ESTADO ACTUAL</span><strong>${esc(STATUSES[order.status]?.label || order.status)}</strong></div><div class="detail-box"><span>FECHA Y HORA</span><strong>${esc(fmtDate(order.createdAt))}</strong></div><div class="detail-box"><span>PROVEEDOR</span><strong>${esc(order.supplierName||bySupplier(order.supplierId)?.name||'Proveedor')}</strong></div><div class="detail-box"><span>REALIZADO POR</span><strong>${esc(order.createdBy||'Sucursal')}</strong></div></div>
  ${order.notes ? `<div class="notice-box"><span>▤</span><div><strong>Observaciones</strong><br>${esc(order.notes)}</div></div>` : ''}
  <div class="section-label">Artículos solicitados</div><div class="table-scroll"><table><thead><tr><th>Artículo</th><th>Presentación</th><th>Cantidad</th><th>Equivalencia</th><th>Unidades totales</th></tr></thead><tbody>${lines.map(l=>`<tr><td><div class="primary-cell">${esc(l.productName)}</div>${l.category?`<div class="secondary-cell">${esc(l.category)}</div>`:''}</td><td>${esc(l.presentationName)}</td><td><span class="primary-cell">${Number(l.quantity).toLocaleString('es-AR')}</span></td><td>${Number(l.unitsPerPresentation)===1?'1 unidad':`${Number(l.unitsPerPresentation).toLocaleString('es-AR')} unidades`}</td><td><span class="primary-cell">${(Number(l.quantity)*Number(l.unitsPerPresentation)).toLocaleString('es-AR')}</span></td></tr>`).join('')}</tbody></table></div>
  <div class="pagination-footer" style="padding-left:0;padding-right:0"><span>${lines.length} artículo${lines.length===1?'':'s'}</span><strong>${lines.reduce((s,l)=>s+(Number(l.quantity)||0)*(Number(l.unitsPerPresentation)||1),0).toLocaleString('es-AR')} unidades equivalentes</strong></div>
  <div class="section-label" style="margin-top:18px">Actividad del pedido</div>${renderActivityForOrder(order.id)}`;
}
function viewOrder(id) {
  const order = state.orders.find(o=>o.id===id);
  if (!order || (!canAdmin() && order.branchId !== session?.branchId)) { toast('No tenés acceso a este pedido.', 'error'); return; }
  const foot = `${order.status==='new' && !canAdmin() ? `<button class="btn btn-danger" data-action="cancel-own-order" data-id="${esc(order.id)}">Cancelar pedido</button>` : ''}<button class="btn btn-secondary" data-action="print-order" data-id="${esc(order.id)}">▣ Imprimir / PDF</button>${canAdmin() ? `<button class="btn btn-primary" data-action="edit-order" data-id="${esc(order.id)}">Editar pedido</button>` : `<button class="btn btn-primary" data-action="close-modal">Cerrar</button>`}`;
  openModal(`Pedido ${orderNumber(order)}`, 'El historial conserva los datos originales de las presentaciones.', orderDetailHtml(order), { wide: true, footer: foot });
}
function presentationOption(value, label, selected = false) { return `<option value="${esc(value)}" ${selected?'selected':''}>${esc(label)}</option>`; }
function editOrderLineHtml(order, line, idx) {
  const products = state.products.filter(p=>p.supplierId===order.supplierId);
  const currentProduct = byProduct(line.productId);
  const productOptions = `${presentationOption(`snap::${line.productId||''}`, `Original: ${line.productName} (pedido)`, true)}${products.filter(p=>p.id!==line.productId).map(p=>presentationOption(`cur::${p.id}`, p.name)).join('')}`;
  const presentationOpts = `${presentationOption(`snap::${encodeURIComponent(line.presentationName)}::${Number(line.unitsPerPresentation)||1}`, `${line.presentationName} · ${Number(line.unitsPerPresentation)||1} u. (original)`, true)}${(currentProduct?.presentations||[]).filter(p=>p.name!==line.presentationName || Number(p.units)!==Number(line.unitsPerPresentation)).map(p=>presentationOption(`cur::${encodeURIComponent(p.name)}::${p.units}`, `${p.name} · ${Number(p.units)} u.`)).join('')}`;
  return `<div class="modal-line edit-order-line" data-index="${idx}" data-original-product-id="${esc(line.productId||'')}" data-original-name="${esc(line.productName)}" data-original-category="${esc(line.category||'')}" data-original-supplier-name="${esc(line.supplierName||order.supplierName||'')}" data-original-presentation="${esc(line.presentationName)}" data-original-units="${Number(line.unitsPerPresentation)||1}" data-original-quantity="${Number(line.quantity)||1}" data-original-notes="${esc(line.notes||'')}">
    <select class="select-control line-product" aria-label="Artículo">${productOptions}</select>
    <select class="select-control line-presentation" aria-label="Presentación">${presentationOpts}</select>
    <input class="control line-quantity" type="number" min="1" step="1" value="${Number(line.quantity)||1}" aria-label="Cantidad">
    <button class="btn-icon" type="button" title="Quitar línea" data-action="remove-edit-line">×</button>
  </div>`;
}
function openEditOrderModal(id) {
  if (!canAdmin()) return;
  const order = state.orders.find(o=>o.id===id);
  if (!order) return;
  const branchOptions = state.branches.map(b=>`<option value="${esc(b.id)}" ${order.branchId===b.id?'selected':''}>${esc(b.name)}${b.active?'':' (inactivo)'}</option>`).join('');
  const statusOptions = Object.entries(STATUSES).map(([k,v])=>`<option value="${k}" ${order.status===k?'selected':''}>${esc(v.label)}</option>`).join('');
  const body = `<form id="editOrderForm" data-id="${esc(order.id)}"><div class="form-grid" style="margin-bottom:20px"><div class="field"><label>Sucursal</label><select class="select-control" name="branchId" style="width:100%">${branchOptions}</select></div><div class="field"><label>Estado del pedido</label><select class="select-control" name="status" style="width:100%">${statusOptions}</select></div><div class="field field-full"><label for="editOrderNotes">Observaciones</label><textarea class="textarea-control" name="notes" id="editOrderNotes" maxlength="1000">${esc(order.notes||'')}</textarea></div></div><div class="section-label">Editar artículos · ${esc(order.supplierName||'Proveedor')}</div><p class="secondary-cell" style="white-space:normal;margin-bottom:12px">Las líneas sin cambios conservan las equivalencias originales. Al elegir otro artículo o presentación, se aplica la configuración actual del catálogo.</p><div class="modal-line modal-line-head"><span>Artículo</span><span>Presentación</span><span>Cantidad</span><span></span></div><div class="modal-lines" id="editOrderLines">${order.lines.map((line,idx)=>editOrderLineHtml(order,line,idx)).join('')}</div><button type="button" class="btn btn-secondary btn-small" style="margin-top:12px" data-action="add-edit-line">＋ Agregar artículo</button></form>`;
  const foot = `<button type="button" class="btn btn-secondary" data-action="close-modal">Cancelar</button><button type="submit" form="editOrderForm" class="btn btn-primary">Guardar cambios</button>`;
  openModal(`Editar pedido ${orderNumber(order)}`, 'Los cambios quedarán registrados en la actividad del pedido.', body, { wide: true, footer: foot });
}
function addEditOrderLine(orderId) {
  const order = state.orders.find(o=>o.id===orderId);
  const wrap = document.getElementById('editOrderLines');
  if (!order || !wrap) return;
  const product = getSupplierProducts(order.supplierId)[0];
  if (!product) { toast('No hay artículos activos para este proveedor.', 'error'); return; }
  const line = { productId: product.id, productName: product.name, category: product.category||'', supplierName: order.supplierName, presentationName: product.presentations[0]?.name||'Unidad', unitsPerPresentation: product.presentations[0]?.units||1, quantity: 1, notes: '' };
  const idx = wrap.querySelectorAll('.edit-order-line').length;
  wrap.insertAdjacentHTML('beforeend', editOrderLineHtml(order, line, idx));
  const row = wrap.lastElementChild;
  // Esta línea es nueva, por eso selecciona la configuración actual y no la instantánea histórica.
  const productSelect = row.querySelector('.line-product');
  productSelect.value = `cur::${product.id}`;
  updateEditLinePresentation(row, product.id, true);
}
function updateEditLinePresentation(row, productId, chooseCurrent = false) {
  const select = row.querySelector('.line-presentation');
  const productSelect = row.querySelector('.line-product');
  const chosen = productSelect.value;
  if (chosen.startsWith('snap::')) return;
  const id = chosen.startsWith('cur::') ? chosen.slice(5) : productId;
  const p = byProduct(id);
  if (!p) return;
  const previousName = chooseCurrent ? '' : (select.value.startsWith('cur::') ? decodeURIComponent(select.value.split('::')[1]||'') : '');
  select.innerHTML = (p.presentations||[]).map(pr=>presentationOption(`cur::${encodeURIComponent(pr.name)}::${pr.units}`, `${pr.name} · ${Number(pr.units)} u.`, pr.name===previousName)).join('');
  if (!select.value && select.options.length) select.selectedIndex = 0;
}
function saveOrderEdit(form) {
  const order = state.orders.find(o=>o.id===form.dataset.id);
  if (!order) return;
  const oldStatus = order.status;
  const newBranchId = form.elements.branchId.value;
  const newStatus = form.elements.status.value;
  const notes = form.elements.notes.value.trim();
  const rowNodes = [...document.querySelectorAll('#editOrderLines .edit-order-line')];
  if (!rowNodes.length) { toast('El pedido debe tener por lo menos un artículo.', 'error'); return; }
  const lines = [];
  for (const row of rowNodes) {
    const prodVal = row.querySelector('.line-product').value;
    const presentationVal = row.querySelector('.line-presentation').value;
    const quantity = Number(row.querySelector('.line-quantity').value);
    if (!Number.isInteger(quantity) || quantity < 1) { toast('Todas las cantidades deben ser números enteros mayores que cero.', 'error'); return; }
    if (prodVal.startsWith('snap::')) {
      lines.push({ productId: row.dataset.originalProductId || '', productName: row.dataset.originalName || 'Artículo', category: row.dataset.originalCategory || '', supplierName: row.dataset.originalSupplierName || order.supplierName, presentationName: row.dataset.originalPresentation || 'Unidad', unitsPerPresentation: Number(row.dataset.originalUnits)||1, quantity, notes: row.dataset.originalNotes || '' });
    } else {
      const product = byProduct(prodVal.slice(5));
      if (!product) { toast('Uno de los artículos seleccionados ya no existe.', 'error'); return; }
      let presName = 'Unidad', units = 1;
      if (presentationVal.startsWith('snap::')) {
        presName = decodeURIComponent(presentationVal.split('::')[1]||'Unidad');
        units = Number(presentationVal.split('::')[2]) || 1;
      } else {
        const parts = presentationVal.split('::');
        presName = decodeURIComponent(parts[1]||'Unidad'); units = Number(parts[2]) || 1;
      }
      lines.push({ productId: product.id, productName: product.name, category: product.category || '', supplierName: bySupplier(product.supplierId)?.name || order.supplierName, presentationName: presName, unitsPerPresentation: units, quantity, notes: product.notes||'' });
    }
  }
  const branch = byBranch(newBranchId);
  if (!branch) { toast('Seleccioná una sucursal válida.', 'error'); return; }
  order.branchId = branch.id;
  order.branchName = branch.name;
  order.status = newStatus;
  order.notes = notes;
  order.lines = lines;
  order.updatedAt = new Date().toISOString();
  addActivity('Pedido actualizado', `${orderNumber(order)} · ${branch.name} · artículos, observaciones o estado actualizados.`, 'update', order.id);
  if (oldStatus !== newStatus) addActivity('Estado cambiado', `${orderNumber(order)}: ${STATUSES[oldStatus]?.label||oldStatus} → ${STATUSES[newStatus]?.label||newStatus}.`, 'status', order.id);
  persist(); closeModal(); render(); toast('Pedido actualizado correctamente.');
}
function confirmOrderFromForm(form) {
  const supplier = bySupplier(createSupplierId);
  if (!supplier || !supplier.active) { toast('Seleccioná un proveedor activo.', 'error'); return; }
  const branchId = canAdmin() ? document.getElementById('createBranchSelect')?.value : session.branchId;
  const branch = byBranch(branchId);
  if (!branch || !branch.active) { toast('Seleccioná una sucursal activa.', 'error'); return; }
  const selectedIds = Object.entries(createDrafts[supplier.id] || {}).filter(([,draft])=>draft?.selected).map(([productId])=>productId);
  if (!selectedIds.length) { toast('Marcá al menos un artículo antes de continuar.', 'error'); return; }
  const lines = [];
  for (const productId of selectedIds) {
    const product = byProduct(productId);
    const draft = getCreateDraft(supplier.id, productId);
    if (!product || !product.active || product.supplierId !== supplier.id) { toast('Uno de los artículos ya no está disponible. Actualizá el catálogo.', 'error'); return; }
    const requestedLines = [{ quantity: draft.quantity, presentationIndex: draft.presentationIndex }, ...(draft.extraLines || [])];
    for (const requested of requestedLines) {
      const quantity = Number(requested.quantity);
      const selectedIndex = Number(requested.presentationIndex);
      const presentation = product.presentations[selectedIndex];
      if (!Number.isInteger(quantity) || quantity < 1) { toast(`Todas las cantidades de ${product.name} deben ser enteros mayores que cero.`, 'error'); return; }
      if (!presentation || !Number.isInteger(Number(presentation.units)) || Number(presentation.units) <= 0) { toast(`Revisá la presentación de ${product.name}.`, 'error'); return; }
      lines.push({ productId: product.id, productName: product.name, category: product.category || '', supplierName: supplier.name, presentationName: presentation.name, unitsPerPresentation: Number(presentation.units), quantity, notes: product.notes || '' });
    }
  }
  const notes = document.getElementById('createOrderNotes')?.value.trim() || '';
  const now = new Date().toISOString();
  const order = { id: uid('order'), number: state.nextOrderNumber++, branchId: branch.id, branchName: branch.name, supplierId: supplier.id, supplierName: supplier.name, createdAt: now, updatedAt: now, createdBy: canAdmin() ? 'Administrador · Local 14' : (branch.username || branch.name), status: 'new', notes, lines };
  const backup = JSON.stringify(state);
  state.orders.push(order);
  addActivity('Pedido recibido', `${orderNumber(order)} · ${branch.name} envió ${lines.length} artículo${lines.length===1?'':'s'} a ${supplier.name}.`, 'order', order.id);
  if (!persist()) { try { state = JSON.parse(backup); } catch {} return; }
  productQuery = '';
  createDrafts[supplier.id] = {};
  orderQuery = '';
  toast(`Pedido ${orderNumber(order)} enviado correctamente.`);
  if (!canAdmin()) currentPage = 'my-orders'; else currentPage = 'orders';
  render();
  viewOrder(order.id);
}
function cancelOwnOrder(id) {
  const order = state.orders.find(o=>o.id===id);
  if (!order || canAdmin() || order.branchId!==session?.branchId || order.status!=='new') { toast('Este pedido ya no se puede cancelar desde la sucursal.', 'error'); return; }
  if (!confirm(`¿Cancelar el pedido ${orderNumber(order)}? Se conservará en el historial.`)) return;
  order.status='cancelled'; order.updatedAt=new Date().toISOString();
  addActivity('Pedido cancelado', `${orderNumber(order)} fue cancelado por ${order.branchName}.`, 'cancel', order.id);
  persist(); closeModal(); render(); toast('Pedido cancelado. Quedó guardado en el historial.');
}
function openPrintWindow(title, body, landscape = false) {
  const win = window.open('', '_blank');
  if (!win) { toast('El navegador bloqueó la ventana. Permití las ventanas emergentes para imprimir.', 'error'); return; }
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:A4 ${landscape?'landscape':'portrait'};margin:14mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#172437;font-size:11px;margin:0}header{border-bottom:3px solid #14263d;padding-bottom:12px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.brand{font-size:22px;font-weight:800;letter-spacing:3px;color:#14263d}.muted{color:#627186;font-size:10px;margin-top:5px}.ref{text-align:right;font-weight:bold;font-size:13px}h1{font-size:19px;margin:0 0 6px;color:#14263d}h2{font-size:13px;margin:20px 0 9px}p{line-height:1.5}table{width:100%;border-collapse:collapse;margin:10px 0 18px}th{background:#14263d;color:#fff;text-align:left;padding:8px;font-size:9px;print-color-adjust:exact}td{padding:8px;border-bottom:1px solid #dfe5ed;vertical-align:top;font-size:10px}tr{break-inside:avoid}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}.box{border:1px solid #dfe5ed;border-radius:6px;padding:9px}.box span{display:block;color:#627186;font-size:9px;margin-bottom:5px}.box strong{font-size:11px}.note{padding:10px;background:#f2f5f9;border-radius:6px;line-height:1.5}.footer{margin-top:25px;display:grid;grid-template-columns:1fr 1fr;gap:50px}.sign{border-top:1px solid #8997a8;padding-top:7px;color:#526276;font-size:10px;margin-top:42px}.no-print{margin-bottom:15px;padding:9px;border-radius:6px;background:#edf4fc;color:#304b69;font-size:10px}@media print{.no-print{display:none}}</style></head><body><div class="no-print">Se abrirá el diálogo de impresión. Elegí una impresora o “Guardar como PDF”.</div>${body}<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));</script></body></html>`;
  win.document.open(); win.document.write(html); win.document.close();
}
function printOrder(id) {
  const order = state.orders.find(o=>o.id===id);
  if (!order || (!canAdmin() && order.branchId!==session?.branchId)) return;
  const lines = order.lines.map(l=>`<tr><td>${esc(l.productName)}${l.category?`<div class="muted">${esc(l.category)}</div>`:''}</td><td>${esc(l.presentationName)}</td><td>${Number(l.quantity).toLocaleString('es-AR')}</td><td>${Number(l.unitsPerPresentation).toLocaleString('es-AR')} u.</td><td>${(Number(l.quantity)*Number(l.unitsPerPresentation)).toLocaleString('es-AR')}</td></tr>`).join('');
  const body = `<header><div><div class="brand">BLUNNO</div><div class="muted">DISTRIBUIDORA · SISTEMA DE PEDIDOS Y DISTRIBUCIÓN</div></div><div class="ref">PEDIDO ${esc(orderNumber(order))}<div class="muted">${esc(fmtDate(order.createdAt))}</div></div></header><h1>Pedido de mercadería</h1><div class="summary"><div class="box"><span>SUCURSAL</span><strong>${esc(order.branchName||branchDisplay(order.branchId))}</strong></div><div class="box"><span>PROVEEDOR</span><strong>${esc(order.supplierName||'Proveedor')}</strong></div><div class="box"><span>ESTADO</span><strong>${esc(STATUSES[order.status]?.label||order.status)}</strong></div></div><div class="muted">Solicitado por: ${esc(order.createdBy||'Sucursal')}</div><h2>Artículos solicitados</h2><table><thead><tr><th>Artículo</th><th>Presentación</th><th>Cantidad</th><th>Equivalencia</th><th>Unidades equivalentes</th></tr></thead><tbody>${lines}</tbody></table><div class="box"><span>TOTAL DE LÍNEAS</span><strong>${order.lines.length} artículo${order.lines.length===1?'':'s'} · ${order.lines.reduce((s,l)=>s+Number(l.quantity)*Number(l.unitsPerPresentation),0).toLocaleString('es-AR')} unidades equivalentes</strong></div>${order.notes?`<h2>Observaciones</h2><div class="note">${esc(order.notes)}</div>`:''}<div class="footer"><div class="sign">Preparó · Local 14</div><div class="sign">Recibió · ${esc(order.branchName||'Sucursal')}</div></div><p class="muted" style="margin-top:25px">Documento interno de Distribuidora BLUNNO · No incluye precios.</p>`;
  openPrintWindow(`BLUNNO ${orderNumber(order)}`, body);
}
function printPreparation() {
  const orders = state.orders.filter(o => ['new','preparing','ready','dispatched'].includes(o.status));
  const grouped = new Map();
  orders.forEach(o => (o.lines||[]).forEach(l=>{
    const provider=l.supplierName||o.supplierName||'Proveedor'; const key=`${provider}::${l.productId||l.productName}`;
    if(!grouped.has(key)) grouped.set(key,{provider,product:l.productName,total:0,parts:new Map(),branches:new Set()});
    const it=grouped.get(key); it.total+=Number(l.quantity)*Number(l.unitsPerPresentation); it.parts.set(l.presentationName,(it.parts.get(l.presentationName)||0)+Number(l.quantity)); it.branches.add(o.branchName||branchDisplay(o.branchId));
  }));
  const suppliers=[...new Set([...grouped.values()].map(x=>x.provider))].sort();
  const sections=suppliers.map(s=>`<h2>${esc(s)}</h2><table><thead><tr><th>Artículo</th><th>Total equivalente</th><th>Desglose de presentaciones</th><th>Sucursales</th></tr></thead><tbody>${[...grouped.values()].filter(x=>x.provider===s).sort((a,b)=>a.product.localeCompare(b.product,'es')).map(x=>`<tr><td>${esc(x.product)}</td><td>${x.total.toLocaleString('es-AR')} unidades</td><td>${[...x.parts.entries()].map(([k,v])=>`${esc(k)}: ${v}`).join(' · ')}</td><td>${[...x.branches].map(esc).join(', ')}</td></tr>`).join('')}</tbody></table>`).join('');
  openPrintWindow('BLUNNO - Lista de preparación', `<header><div><div class="brand">BLUNNO</div><div class="muted">DISTRIBUIDORA · LISTA CONSOLIDADA DE PREPARACIÓN</div></div><div class="ref">${esc(fmtDate(new Date(),true))}</div></header><h1>Mercadería para preparar</h1><p class="muted">Incluye pedidos nuevos, en preparación, preparados y despachados. Verificar el contenido de las presentaciones antes de armar la mercadería.</p>${sections||'<p>No hay pedidos activos.</p>'}`, true);
}
function csvCell(v) { return `"${String(v ?? '').replace(/"/g,'""')}"`; }
function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportOrdersCSV(filteredOnly = false) {
  const orders = filteredOnly ? getFilteredOrders() : getAllOrdersForSession();
  const headers = ['Pedido','Sucursal','Usuario que creo','Proveedor','Fecha','Hora','Estado','Articulo','Categoria','Presentacion','Cantidad solicitada','Unidades por presentacion','Unidades equivalentes','Observaciones'];
  const rows = [];
  orders.forEach(o=>(o.lines||[]).forEach(l=>{
    const dt = new Date(o.createdAt);
    rows.push([orderNumber(o),o.branchName||branchDisplay(o.branchId),o.createdBy,o.supplierName,dt.toLocaleDateString('es-AR'),dt.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',hour12:false}),STATUSES[o.status]?.label||o.status,l.productName,l.category,l.presentationName,l.quantity,l.unitsPerPresentation,Number(l.quantity)*Number(l.unitsPerPresentation),o.notes].map(csvCell).join(';'));
  }));
  const csv = '\ufeff' + [headers.map(csvCell).join(';'),...rows].join('\r\n');
  downloadBlob(`BLUNNO_pedidos_${todayLocalISO()}.csv`, csv, 'text/csv;charset=utf-8;');
  toast('Informe exportado. Podés abrir el CSV con Excel.');
}
function exportCatalogCSV() {
  const headers = ['proveedor','articulo','categoria','presentaciones','observaciones','estado'];
  const rows = state.products.map(p=>[bySupplier(p.supplierId)?.name||'',p.name,p.category,presentationsForCSV(p.presentations),p.notes,p.active?'Activo':'Inactivo'].map(csvCell).join(';'));
  downloadBlob(`BLUNNO_catalogo_${todayLocalISO()}.csv`, '\ufeff'+[headers.map(csvCell).join(';'),...rows].join('\r\n'), 'text/csv;charset=utf-8;');
  toast('Catálogo exportado a CSV.');
}
function presentationsForCSV(ps) { return (ps||[]).map(p=>`${p.name}=${p.units}`).join('|'); }
function exportPreparationCSV() {
  const orders = state.orders.filter(o=>['new','preparing','ready','dispatched'].includes(o.status));
  const map = new Map();
  orders.forEach(o=>(o.lines||[]).forEach(l=>{
    const key=[l.supplierName||o.supplierName,l.productId||l.productName,l.presentationName].join('::');
    if(!map.has(key)) map.set(key,{supplier:l.supplierName||o.supplierName,product:l.productName,presentation:l.presentationName,quantity:0,units:l.unitsPerPresentation,branches:new Set()});
    const x=map.get(key);x.quantity+=Number(l.quantity);x.branches.add(o.branchName||branchDisplay(o.branchId));
  }));
  const rows=[['Proveedor','Articulo','Presentacion','Cantidad a preparar','Unidades por presentacion','Unidades equivalentes','Sucursales'].map(csvCell).join(';'),...[...map.values()].sort((a,b)=>a.supplier.localeCompare(b.supplier,'es')||a.product.localeCompare(b.product,'es')).map(x=>[x.supplier,x.product,x.presentation,x.quantity,x.units,x.quantity*x.units,[...x.branches].join(', ')].map(csvCell).join(';'))];
  downloadBlob(`BLUNNO_preparacion_${todayLocalISO()}.csv`,'\ufeff'+rows.join('\r\n'),'text/csv;charset=utf-8;');
  toast('Lista de preparación exportada.');
}
function exportBackup() {
  const payload = { app: 'BLUNNO Sistema de Pedidos', formatVersion: 1, exportedAt: new Date().toISOString(), data: state };
  downloadBlob(`BLUNNO_respaldo_${todayLocalISO()}.json`, JSON.stringify(payload,null,2), 'application/json;charset=utf-8;');
  toast('Copia de seguridad descargada. Guardala en un lugar seguro.');
}
function importBackupFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const p = JSON.parse(reader.result);
      const next = p.data || p;
      if (!next || !Array.isArray(next.suppliers) || !Array.isArray(next.products) || !Array.isArray(next.branches) || !Array.isArray(next.orders)) throw new Error('No se reconoce la estructura de la copia.');
      if (!confirm('Restaurar esta copia reemplazará los datos guardados en este navegador. ¿Querés continuar?')) return;
      state = next; persist(); addActivity('Copia de seguridad restaurada', `Se importó una copia de datos (${file.name}).`, 'system'); persist(); render(); toast('Copia restaurada correctamente.');
    } catch(err) { toast(`No se pudo restaurar la copia: ${err.message}`, 'error'); }
  };
  reader.onerror = () => toast('No se pudo leer el archivo de respaldo.', 'error');
  reader.readAsText(file);
}
function parseCSVLine(line, delimiter) {
  const out=[]; let val=''; let inside=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"' && inside && line[i+1]==='"'){val+='"';i++;}
    else if(ch==='"') inside=!inside;
    else if(ch===delimiter && !inside){out.push(val);val='';}
    else val+=ch;
  }
  out.push(val);return out.map(s=>s.trim());
}
function importCatalogFile(file) {
  if (!file) return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      let text=String(reader.result||'').replace(/^\uFEFF/,'');
      const first=text.split(/\r?\n/)[0]||'';
      const delimiter=(first.match(/;/g)||[]).length >= (first.match(/,/g)||[]).length ? ';' : ',';
      const lines=text.split(/\r?\n/).filter(l=>l.trim());
      if(lines.length<2) throw new Error('El archivo no contiene filas de productos.');
      const headers=parseCSVLine(lines[0],delimiter).map(h=>h.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim());
      const index=key=>headers.indexOf(key);
      const iSupplier=index('proveedor'), iName=index('articulo'), iCategory=index('categoria'), iPres=index('presentaciones'), iNotes=index('observaciones'), iStatus=index('estado');
      if(iSupplier<0||iName<0||iPres<0) throw new Error('Faltan columnas obligatorias: proveedor, articulo y presentaciones.');
      let added=0, updated=0, skipped=0;
      for(let n=1;n<lines.length;n++){
        const cols=parseCSVLine(lines[n],delimiter);
        const supplierName=cols[iSupplier]||''; const name=cols[iName]||''; const presText=cols[iPres]||'';
        if(!supplierName||!name||!presText){skipped++;continue;}
        let supplier=state.suppliers.find(s=>s.name.toLocaleLowerCase('es')===supplierName.toLocaleLowerCase('es'));
        if(!supplier){supplier={id:uid('sup'),name:supplierName,contact:'',notes:'',active:true,createdAt:new Date().toISOString()};state.suppliers.push(supplier);}
        const presentations=parsePresentations(presText.replace(/\|/g,';'));
        let product=state.products.find(p=>p.supplierId===supplier.id&&p.name.toLocaleLowerCase('es')===name.toLocaleLowerCase('es'));
        const obj={supplierId:supplier.id,name,category:cols[iCategory]||'',presentations,notes:cols[iNotes]||'',active:(cols[iStatus]||'Activo').toLocaleLowerCase('es')!=='inactivo',updatedAt:new Date().toISOString()};
        if(product){Object.assign(product,obj);updated++;}
        else {state.products.push({id:uid('prod'),...obj,createdAt:new Date().toISOString()});added++;}
      }
      addActivity('Catálogo importado', `CSV importado: ${added} artículos nuevos, ${updated} actualizados y ${skipped} filas omitidas.`, 'product');
      persist(); catalogQuery='';catalogSupplierFilter='all';catalogActiveFilter='all';render();toast(`Importación finalizada: ${added} nuevos, ${updated} actualizados, ${skipped} omitidos.`);
    }catch(err){toast(`No se pudo importar el catálogo: ${err.message}`,'error');}
  };
  reader.onerror=()=>toast('No se pudo leer el CSV.','error');
  reader.readAsText(file);
}
function login(form) {
  const data=new FormData(form);const username=String(data.get('username')||'').trim().toLowerCase();const password=String(data.get('password')||'');
  if(username==='admin'&&password==='blunno14'){
    session={role:'admin',username:'admin'};saveSession();currentPage='dashboard';mobileNavOpen=false;render();toast('Bienvenido al panel de administración.');return;
  }
  const branch=state.branches.find(b=>b.active&&b.username.toLowerCase()===username&&b.password===password);
  if(branch){session={role:'branch',username:branch.username,branchId:branch.id};saveSession();currentPage='new-order';mobileNavOpen=false;render();toast(`Bienvenido, ${branch.name}.`);return;}
  document.getElementById('loginError')?.classList.add('show');
}
function logout() {
  session=null;saveSession();currentPage='new-order';mobileNavOpen=false;closeModal();render();
}
function openMobileNav() {
  document.getElementById('sidebar')?.classList.add('mobile-open');
  document.querySelector('.mobile-overlay')?.classList.add('show');
}
function closeMobileNav() {
  mobileNavOpen=false;
  document.getElementById('sidebar')?.classList.remove('mobile-open');
  document.querySelector('.mobile-overlay')?.classList.remove('show');
}
function setPage(page) {
  const allowedForAdmin = canAdmin() && page === 'new-order';
  if (!allowedForAdmin && !availablePages().some(p=>p.id===page)) { toast('Tu perfil no tiene acceso a esa sección.', 'error'); return; }
  currentPage=page; mobileNavOpen=false; closeModal(); render();
}
function saveSupplier(form) {
  if(!canAdmin())return;
  const id=form.dataset.id;const name=form.elements.name.value.trim();
  if(!name){toast('Escribí el nombre del proveedor.','error');return;}
  if(state.suppliers.some(s=>s.id!==id&&s.name.toLocaleLowerCase('es')===name.toLocaleLowerCase('es'))){toast('Ya existe un proveedor con ese nombre.','error');return;}
  const active=form.elements.active.value==='true';const contact=form.elements.contact.value.trim();const notes=form.elements.notes.value.trim();
  if(id){const s=bySupplier(id);if(!s)return;Object.assign(s,{name,active,contact,notes,updatedAt:new Date().toISOString()});addActivity('Proveedor actualizado',`${name} · datos del proveedor modificados.`,'product');}
  else{state.suppliers.push({id:uid('sup'),name,active,contact,notes,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});addActivity('Proveedor agregado',`${name} fue agregado al catálogo.`,'product');}
  persist();closeModal();render();toast('Proveedor guardado correctamente.');
}
function toggleSupplier(id) {
  if(!canAdmin())return;const s=bySupplier(id);if(!s)return;
  const next=!s.active;const action=next?'activar':'desactivar';
  if(!confirm(`¿Querés ${action} el proveedor "${s.name}"? Sus artículos y pedidos históricos se conservarán.`))return;
  s.active=next;s.updatedAt=new Date().toISOString();persist();closeModal();render();toast(`Proveedor ${next?'activado':'desactivado'}.`);
}
function saveProduct(form) {
  if(!canAdmin())return;
  const id=form.dataset.id;const name=form.elements.name.value.trim();const supplierId=form.elements.supplierId.value;const supplier=bySupplier(supplierId);
  if(!name||!supplier){toast('Completá el nombre y elegí un proveedor.','error');return;}
  if(state.products.some(p=>p.id!==id&&p.supplierId===supplierId&&p.name.toLocaleLowerCase('es')===name.toLocaleLowerCase('es'))){toast('Ya existe un artículo con ese nombre en este proveedor.','error');return;}
  let presentations;try{presentations=parsePresentations(form.elements.presentations.value);}catch(err){toast(err.message,'error');return;}
  const data={name,supplierId,category:form.elements.category.value.trim(),presentations,notes:form.elements.notes.value.trim(),active:form.elements.active.value==='true',updatedAt:new Date().toISOString()};
  if(id){const p=byProduct(id);if(!p)return;const previous=p.name;Object.assign(p,data);addActivity('Artículo actualizado',`${previous===name?name:`${previous} → ${name}`} · ${supplier.name} · presentaciones revisadas.`,'product');}
  else{state.products.push({id:uid('prod'),...data,createdAt:new Date().toISOString()});addActivity('Artículo agregado',`${name} se agregó a ${supplier.name}.`,'product');}
  persist();closeModal();render();toast('Artículo guardado correctamente.');
}
function toggleProduct(id) {
  if(!canAdmin())return;const p=byProduct(id);if(!p)return;const next=!p.active;
  if(!confirm(`${next?'¿Reactivar':'¿Desactivar'} el artículo "${p.name}"? Los pedidos anteriores no se borrarán.`))return;
  p.active=next;p.updatedAt=new Date().toISOString();addActivity(`Artículo ${next?'reactivado':'desactivado'}`,`${p.name} · ${bySupplier(p.supplierId)?.name||'Proveedor'}.`,'product');persist();closeModal();render();toast(`Artículo ${next?'reactivado':'desactivado'}.`);
}
function saveBranch(form) {
  if(!canAdmin())return;const id=form.dataset.id;const code=form.elements.code.value.trim();const name=form.elements.name.value.trim();const username=form.elements.username.value.trim().toLowerCase();const password=form.elements.password.value;const active=form.elements.active.value==='true';
  if(!code||!name||!username){toast('Completá el código, nombre y usuario.','error');return;}
  if(state.branches.some(b=>b.id!==id&&b.code.toLowerCase()===code.toLowerCase())){toast('Ya existe una sucursal con ese código.','error');return;}
  if(state.branches.some(b=>b.id!==id&&b.username.toLowerCase()===username)){toast('Ese usuario ya está asignado a otra sucursal.','error');return;}
  if(!id&&!password){toast('Definí una contraseña de demostración.','error');return;}
  if(password&&password.length<4){toast('La contraseña de demostración debe tener al menos 4 caracteres.','error');return;}
  const data={code,name,username,active,notes:form.elements.notes.value.trim(),updatedAt:new Date().toISOString()};
  if(id){const b=byBranch(id);if(!b)return;Object.assign(b,data);if(password)b.password=password;addActivity('Sucursal actualizada',`${name} · datos o acceso de demostración modificados.`,'branch');}
  else{state.branches.push({id:uid('branch'),...data,password,createdAt:new Date().toISOString()});addActivity('Sucursal agregada',`${name} fue agregada al sistema.`,'branch');}
  persist();closeModal();render();toast('Sucursal guardada correctamente.');
}
function toggleBranch(id) {
  if(!canAdmin())return;const b=byBranch(id);if(!b)return;const next=!b.active;
  if(!confirm(`${next?'¿Activar':'¿Desactivar'} ${b.name}? Los pedidos anteriores se conservarán.`))return;
  b.active=next;b.updatedAt=new Date().toISOString();addActivity(`Sucursal ${next?'activada':'desactivada'}`,`${b.name}.`,'branch');persist();render();toast(`Sucursal ${next?'activada':'desactivada'}.`);
}
function showImportInstructions() {
  const body=`<p style="font-size:12px;line-height:1.7;color:#526276;margin-top:0">Prepará un archivo CSV en Excel con estas columnas exactas. Guardalo como CSV UTF-8 separado por punto y coma (;) y después elegí <strong>Importar CSV</strong>.</p><div class="notice-box"><span>▤</span><div><strong>Columnas obligatorias:</strong> proveedor, articulo, presentaciones.<br><strong>Opcionales:</strong> categoria, observaciones, estado.</div></div><pre style="white-space:pre-wrap;overflow-wrap:anywhere;background:#f4f7fb;padding:13px;border-radius:9px;font-size:10px;line-height:1.7">proveedor;articulo;categoria;presentaciones;observaciones;estado
Coca-Cola;Coca-Cola 500 ml;Bebidas;Unidad=1|Pack=9|Caja=36;Verificar equivalencia;Activo
Almacén Norte;Arroz 1 kg;Almacén;Unidad=1|Caja=12;;Activo</pre><p style="font-size:11px;color:#718096;line-height:1.6">Si un proveedor no existe, se crea automáticamente. Si el artículo ya existe en ese mismo proveedor con igual nombre, se actualiza. Los valores de ejemplo no son datos oficiales.</p>`;
  openModal('Importar catálogo desde CSV','Carga o actualización masiva de productos.',body,{footer:`<button class="btn btn-secondary" data-action="close-modal">Cancelar</button><button class="btn btn-primary" data-action="pick-catalog-file">Elegir archivo CSV</button>`});
}
function handleClick(e) {
  const target=e.target.closest('[data-action],[data-page]');
  if(!target)return;
  if(target.dataset.page){e.preventDefault();setPage(target.dataset.page);return;}
  const action=target.dataset.action;const id=target.dataset.id;
  switch(action){
    case 'logout': logout();break;
    case 'toggle-mobile-nav': mobileNavOpen=!mobileNavOpen;render();break;
    case 'close-mobile-nav': closeMobileNav();break;
    case 'close-modal': closeModal();break;
    case 'quick-new-order': createSupplierId=activeSuppliers()[0]?.id||'';createBranchId=state.branches.find(b=>b.active)?.id||'';productQuery='';setPage('new-order');break;
    case 'new-supplier': openSupplierModal();break;
    case 'edit-supplier': openSupplierModal(id);break;
    case 'deactivate-supplier': toggleSupplier(id);break;
    case 'new-product': openProductModal(null,target.dataset.supplier||null);break;
    case 'edit-product': openProductModal(id);break;
    case 'toggle-product': toggleProduct(id);break;
    case 'new-branch': openBranchModal();break;
    case 'edit-branch': openBranchModal(id);break;
    case 'toggle-branch': toggleBranch(id);break;
    case 'view-order': viewOrder(id);break;
    case 'edit-order': closeModal();openEditOrderModal(id);break;
    case 'print-order': printOrder(id);break;
    case 'cancel-own-order': cancelOwnOrder(id);break;
    case 'add-edit-line': { const form=document.getElementById('editOrderForm');if(form)addEditOrderLine(form.dataset.id);break; }
    case 'remove-edit-line': { const rows=document.querySelectorAll('#editOrderLines .edit-order-line');if(rows.length<=1){toast('El pedido debe tener al menos un artículo.','error');break;}target.closest('.edit-order-line')?.remove();break; }
    case 'export-orders': exportOrdersCSV(false);break;
    case 'export-preparation': exportPreparationCSV();break;
    case 'print-preparation': printPreparation();break;
    case 'export-catalog': exportCatalogCSV();break;
    case 'backup-export': exportBackup();break;
    case 'backup-import': document.getElementById('backupFileInput')?.click();break;
    case 'import-catalog': showImportInstructions();break;
    case 'pick-catalog-file': closeModal();document.getElementById('catalogFileInput')?.click();break;
    case 'use-order-suggestion': { orderQuery=target.dataset.query||'';const input=document.getElementById('orderSearch');if(input)input.value=orderQuery;document.getElementById('orderSuggestions')?.classList.remove('show');renderOrdersTableInto();break; }
    case 'use-catalog-suggestion': { catalogQuery=target.dataset.query||'';if(target.dataset.type==='supplier')catalogSupplierFilter=target.dataset.id;const input=document.getElementById('catalogSearch');if(input)input.value=catalogQuery;document.getElementById('catalogSuggestions')?.classList.remove('show');render();break; }
    case 'use-create-suggestion': { productQuery=target.dataset.query||'';const input=document.getElementById('createProductSearch');if(input)input.value=productQuery;document.getElementById('createProductSuggestions')?.classList.remove('show');renderCreateProductListInto();break; }
    case 'clear-order-filters': orderQuery='';orderStatusFilter='all';orderSupplierFilter='all';orderBranchFilter='all';orderMonthFilter='all';render();break;
    case 'clear-catalog-filters': catalogQuery='';catalogSupplierFilter='all';catalogActiveFilter='active';render();break;
    case 'clear-create-search': productQuery='';const inp=document.getElementById('createProductSearch');if(inp)inp.value='';renderCreateProductListInto();break;
    case 'add-extra-presentation': { const product=byProduct(target.dataset.productId);if(!product||product.supplierId!==createSupplierId)break;const draft=getCreateDraft(createSupplierId,product.id);draft.selected=true;draft.extraLines.push({quantity:'1',presentationIndex:String(product.presentations.length>1?1:0)});renderCreateProductListInto();const lbl=document.getElementById('selectedCountLabel');if(lbl){const count=selectedCreateCount();lbl.textContent=`${count} artículo${count===1?'':'s'} seleccionado${count===1?'':'s'}`;}break; }
    case 'remove-extra-presentation': { const draft=getCreateDraft(createSupplierId,target.dataset.productId);const idx=Number(target.dataset.extraIndex);draft.extraLines.splice(idx,1);renderCreateProductListInto();break; }
    default: break;
  }
}
function renderOrdersTableInto(){const wrap=document.getElementById('ordersTableWrap');if(wrap)wrap.innerHTML=renderOrdersTable();}
function renderCreateProductListInto(){const wrap=document.getElementById('createProductList');if(wrap)wrap.innerHTML=renderCreateProductList();}
function handleSubmit(e) {
  const form=e.target;
  if(!(form instanceof HTMLFormElement))return;
  if(form.id==='loginForm'){e.preventDefault();login(form);return;}
  if(form.id==='createOrderForm'){e.preventDefault();if(!canAdmin()&&!currentBranch()?.active){toast('La sucursal está inactiva.','error');return;}confirmOrderFromForm(form);return;}
  if(form.id==='supplierForm'){e.preventDefault();saveSupplier(form);return;}
  if(form.id==='productForm'){e.preventDefault();saveProduct(form);return;}
  if(form.id==='branchForm'){e.preventDefault();saveBranch(form);return;}
  if(form.id==='editOrderForm'){e.preventDefault();saveOrderEdit(form);return;}
}
function handleInput(e) {
  const target=e.target;
  if(target.dataset?.extraField==='quantity') { const draft=getCreateDraft(createSupplierId,target.dataset.extraProduct);const item=draft.extraLines[Number(target.dataset.extraIndex)];if(item)item.quantity=target.value;return; }
  if(target.id==='orderSearch'){orderQuery=target.value;renderOrdersTableInto();renderOrderSuggestions();return;}
  if(target.id==='catalogSearch'){catalogQuery=target.value;render();const again=document.getElementById('catalogSearch');if(again){again.focus();again.setSelectionRange(catalogQuery.length,catalogQuery.length);}renderCatalogSuggestions();return;}
  if(target.id==='createProductSearch'){productQuery=target.value;renderCreateProductListInto();renderCreateProductSuggestions();return;}
  if(target.name==='pickProduct' || target.name.startsWith('quantity-')) {
    const row=target.closest('.product-order-row');const productId=row?.dataset.productRow;const d=productId?getCreateDraft(createSupplierId,productId):null;
    if(d){if(target.name==='pickProduct')d.selected=target.checked;else d.quantity=target.value;}
    const count=selectedCreateCount();const lbl=document.getElementById('selectedCountLabel');if(lbl)lbl.textContent=`${count} artículo${count===1?'':'s'} seleccionado${count===1?'':'s'}`;return;
  }
}
function handleChange(e) {
  const target=e.target;
  if(target.id==='orderStatusFilter'){orderStatusFilter=target.value;renderOrdersTableInto();return;}
  if(target.id==='orderSupplierFilter'){orderSupplierFilter=target.value;renderOrdersTableInto();return;}
  if(target.id==='orderBranchFilter'){orderBranchFilter=target.value;renderOrdersTableInto();return;}
  if(target.id==='orderMonthFilter'){orderMonthFilter=target.value;renderOrdersTableInto();return;}
  if(target.id==='catalogSupplierFilter'){catalogSupplierFilter=target.value;render();return;}
  if(target.id==='catalogActiveFilter'){catalogActiveFilter=target.value;render();return;}
  if(target.id==='createSupplierSelect'){createSupplierId=target.value;productQuery='';render();return;}
  if(target.id==='createBranchSelect'){createBranchId=target.value;return;}
  if(target.dataset?.extraField==='presentationIndex') { const draft=getCreateDraft(createSupplierId,target.dataset.extraProduct);const item=draft.extraLines[Number(target.dataset.extraIndex)];if(item)item.presentationIndex=target.value;return; }
  if(target.name && target.name.startsWith('presentation-')) {const row=target.closest('.product-order-row');const productId=row?.dataset.productRow;if(productId)getCreateDraft(createSupplierId,productId).presentationIndex=target.value;return;}
  if(target.name==='pickProduct') {const row=target.closest('.product-order-row');const productId=row?.dataset.productRow;if(productId)getCreateDraft(createSupplierId,productId).selected=target.checked;const count=selectedCreateCount();const lbl=document.getElementById('selectedCountLabel');if(lbl)lbl.textContent=`${count} artículo${count===1?'':'s'} seleccionado${count===1?'':'s'}`;return;}
  if(target.id==='backupFileInput'&&target.files?.[0]){importBackupFile(target.files[0]);target.value='';return;}
  if(target.id==='catalogFileInput'&&target.files?.[0]){importCatalogFile(target.files[0]);target.value='';return;}
  if(target.classList.contains('line-product')){updateEditLinePresentation(target.closest('.edit-order-line'));return;}
}
function handleKeydown(e) {
  if(e.key==='Escape'){
    if(document.getElementById('activeModalBackdrop'))closeModal();
    else if(mobileNavOpen)closeMobileNav();
  }
  if((e.key==='Enter'||e.key===' ')&&e.target.matches('.suggestion[role="button"]')){e.preventDefault();e.target.click();}
}
function init() {
  const app=document.getElementById('app');
  document.addEventListener('click',handleClick);
  document.addEventListener('input',handleInput);
  document.addEventListener('change',handleChange);
  document.addEventListener('submit',handleSubmit);
  document.addEventListener('keydown',handleKeydown);
  render();
}

init();
