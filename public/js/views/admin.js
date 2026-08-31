import {
  getUser, isAdmin, isPlanillero, isDemo, login, logout, adminLogin,
  getConfig, saveConfig,
  getEquipos, saveEquipo, deleteEquipo, importEquipos,
  getPartidos, savePartido, deletePartido,
  getDisciplina, saveTarjeta, deleteTarjeta,
  getInscripciones, updateInscripcion, deleteInscripcion,
  getAudiovisual, saveAudiovisual,
  sandboxOn, setSandbox, resetSandbox,
  equiposById
} from '../services/store.js';
import { mount, esc, fmtDate } from '../ui/helpers.js';
import { shell, loading } from '../ui/layout.js';
import { toast } from '../ui/toast.js';
import { icon } from '../ui/icons.js';

let TAB = 'partidos';
let C = {}; // cache: config, equipos, partidos, disciplina, inscripciones, av

export async function showAdmin() {
  if (!isAdmin() && !isPlanillero()) return renderLogin();
  mount(loading('Cargando panel…'));
  await loadAll();
  if (!isAdmin() && TAB !== 'resultados' && TAB !== 'disciplina') TAB = 'resultados';
  renderPanel();
}

async function loadAll() {
  const [config, equipos, partidos, disciplina, inscripciones, av] = await Promise.all([
    getConfig(), getEquipos(), getPartidos(), getDisciplina(),
    getInscripciones().catch(() => []), getAudiovisual().catch(() => ({ videos: [], galeria: [] }))
  ]);
  C = { config, equipos, partidos, disciplina, inscripciones, av };
}

/* ---------------- LOGIN ---------------- */
export function renderLogin(redirect) {
  const inner = `
  <div class="container-narrow">
    <div class="center mb-3"><img src="/assets/logo-mark.png" alt="LIV" style="height:90px;margin:0 auto"></div>
    <div class="card">
      <h2 class="mb-1">Acceso organización</h2>
      <p class="muted mb-2">Ingresa con tu email y contraseña. ${isDemo() ? '' : 'Planilleros: usen la cuenta que les compartió la organización.'}</p>
      ${isDemo() ? '<div class="alert alert-warn" style="font-size:.9rem">Firebase aún no está activo: por ahora solo funciona el acceso <strong>Admin</strong>. Al activarlo, aquí entran también los planilleros.</div>' : ''}
      <form id="login-form">
        <div class="form-group"><label>Email o usuario</label><input class="input" name="user" autocomplete="username" required placeholder="tucorreo@… o Admin"></div>
        <div class="form-group"><label>Contraseña</label><input class="input" name="pass" type="password" autocomplete="current-password" required></div>
        <button class="btn btn-primary btn-block btn-lg" id="btn-login">Ingresar</button>
      </form>
    </div>
    <p class="center mt-2"><a href="/" data-link class="muted">← Volver al sitio</a></p>
  </div>`;
  mount(shell(inner, {}));
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-login');
    const { user, pass } = Object.fromEntries(new FormData(e.target).entries());
    const id = (user || '').trim();
    btn.disabled = true; btn.textContent = 'Ingresando…';
    try {
      if (id.toLowerCase() === 'admin') {
        // Respaldo local (funciona con o sin Firebase).
        adminLogin('Admin', pass);
        toast('Bienvenido', 'success');
        if (window.renderHeader) window.renderHeader();
        window.__router.handle();
      } else {
        // Cuenta Firebase (admin o planillero).
        await login(id, pass);
        toast('Bienvenido', 'success');
        // main.js re-renderiza al detectar el cambio de sesión.
      }
    } catch (err) {
      toast(err.message || 'No se pudo iniciar sesión', 'error');
      btn.disabled = false; btn.textContent = 'Ingresar';
    }
  });
}

/* ---------------- PANEL ---------------- */
const ALL_TABS = [
  { id: 'resultados', label: `${icon('check', { size: 16 })} Resultados`, roles: ['admin', 'planillero'] },
  { id: 'disciplina', label: `${icon('cards', { size: 16 })} Disciplina`, roles: ['admin', 'planillero'] },
  { id: 'partidos', label: `${icon('calendar', { size: 16 })} Partidos`, roles: ['admin'] },
  { id: 'equipos', label: `${icon('users', { size: 16 })} Equipos`, roles: ['admin'] },
  { id: 'inscripciones', label: `${icon('clipboard', { size: 16 })} Inscripciones`, roles: ['admin'] },
  { id: 'contenido', label: `${icon('settings', { size: 16 })} Contenido`, roles: ['admin'] }
];

function tabsForRole() {
  const role = isAdmin() ? 'admin' : 'planillero';
  return ALL_TABS.filter(t => t.roles.includes(role));
}

function renderPanel() {
  const admin = isAdmin();
  const sb = sandboxOn();
  const tabs = tabsForRole();
  if (!tabs.some(t => t.id === TAB)) TAB = tabs[0].id;
  const inner = `
  <div class="container">
    <div class="spread mb-2">
      <div><span class="eyebrow">${admin ? 'Panel de administración' : 'Carga de resultados'}</span><h1 style="margin:0">${admin ? 'LIV Admin' : 'Planillero'}</h1></div>
      <div class="row">
        <span class="pill ${sb ? 'pill-amber' : (isDemo() ? 'pill-red' : 'pill-green')}">${sb ? 'MODO PRUEBA' : (isDemo() ? 'DEMO (sin Firebase)' : 'Conectado')}</span>
        ${admin ? `<a href="/sorteo" data-link class="btn btn-ghost btn-sm">${icon('shuffle', { size: 15 })} Sorteo</a>` : ''}
        <button class="btn btn-ghost btn-sm" id="btn-logout">Cerrar sesión</button>
      </div>
    </div>
    ${admin ? `
    <div class="card" style="background:${sb ? 'rgba(245,158,11,.08)' : 'var(--surface, #fff)'};border:1px dashed ${sb ? '#f59e0b' : 'var(--border,#ddd)'};padding:12px 16px;margin-bottom:14px">
      <div class="spread" style="gap:12px;flex-wrap:wrap;align-items:center">
        <div style="min-width:220px">
          <strong>${icon('lock', { size: 15 })} Entorno de prueba</strong>
          <div class="muted" style="font-size:.85rem">${sb
            ? 'Estás en un sandbox privado (solo este navegador). Genera el fixture, carga resultados y tarjetas sin afectar la web real.'
            : 'Prueba cómo se verá la página al cargar el fixture, resultados y tarjetas — sin tocar los datos reales. Solo visible para ti en este navegador.'}</div>
        </div>
        <div class="row" style="gap:8px">
          ${sb
            ? `<button class="btn btn-secondary btn-sm" id="btn-sb-reset">Vaciar datos de prueba</button>
               <button class="btn btn-primary btn-sm" id="btn-sb-off">Salir del modo prueba</button>`
            : `<button class="btn btn-primary btn-sm" id="btn-sb-on">Activar modo prueba</button>`}
        </div>
      </div>
    </div>` : ''}
    <div class="tabs" id="admin-tabs">
      ${tabs.map(t => `<button data-tab="${t.id}" class="${TAB === t.id ? 'active' : ''}">${t.label}</button>`).join('')}
    </div>
    <div id="tab-content"></div>
  </div>`;
  mount(shell(inner, C.config));
  document.getElementById('btn-logout').onclick = async () => { await logout(); if (window.renderHeader) window.renderHeader(); window.__router.go('/', false); };
  document.querySelectorAll('#admin-tabs button').forEach(b => b.onclick = () => { TAB = b.dataset.tab; renderPanel(); });
  const bOn = document.getElementById('btn-sb-on');
  if (bOn) bOn.onclick = async () => {
    bOn.disabled = true; bOn.textContent = 'Activando…';
    setSandbox(true);
    try { const eq = await getEquipos(); if (!eq.length) await importEquipos(); } catch (_) {}
    if (window.renderHeader) window.renderHeader();
    await loadAll(); renderPanel();
    toast('Modo prueba activado — datos privados de este navegador', 'success');
  };
  const bOff = document.getElementById('btn-sb-off');
  if (bOff) bOff.onclick = async () => {
    setSandbox(false);
    if (window.renderHeader) window.renderHeader();
    await loadAll(); renderPanel();
    toast('Volviste a los datos reales', 'success');
  };
  const bRst = document.getElementById('btn-sb-reset');
  if (bRst) bRst.onclick = async () => {
    if (!confirm('¿Vaciar todos los datos de prueba (fixture, resultados, tarjetas)? Los datos reales no se tocan.')) return;
    resetSandbox();
    try { await importEquipos(); } catch (_) {}
    await loadAll(); renderPanel();
    toast('Datos de prueba vaciados', 'success');
  };
  renderTab();
}

function renderTab() {
  const el = document.getElementById('tab-content');
  if (TAB === 'resultados') return renderResultados(el);
  if (TAB === 'equipos') return renderEquipos(el);
  if (TAB === 'partidos') return renderPartidos(el);
  if (TAB === 'disciplina') return renderDisciplina(el);
  if (TAB === 'inscripciones') return renderInscripciones(el);
  if (TAB === 'contenido') return renderContenido(el);
}

/* ---------- RESULTADOS (carga rápida de marcadores) ---------- */
function renderResultados(el) {
  const byId = equiposById(C.equipos);
  const rows = C.partidos.slice()
    .sort((a, b) => ((a.fecha_num || 0) - (b.fecha_num || 0)) || (a.hora || '').localeCompare(b.hora || ''));
  if (!rows.length) {
    el.innerHTML = `<div class="alert alert-warn">Todavía no hay fixture publicado. ${isAdmin() ? 'Genera y publica el sorteo desde <a href="/sorteo" data-link>Sorteo Fixture</a>.' : 'Pídele al administrador que publique el fixture.'}</div>`;
    return;
  }
  const groups = {};
  rows.forEach(p => { (groups[p.fecha_num || 0] = groups[p.fecha_num || 0] || []).push(p); });
  const fechas = Object.keys(groups).map(Number).sort((a, b) => a - b);

  el.innerHTML = `
    ${isDemo() ? '<div class="alert alert-warn">Modo demo: los cambios no se guardan. Activa Firebase para cargar resultados en vivo.</div>' : '<p class="muted mb-2">Ingresa el marcador y presiona <strong>Guardar</strong>. Al guardar con ambos marcadores, el partido queda <strong>finalizado</strong> y se actualiza al instante en Resultados y Posiciones.</p>'}
    ${fechas.map(n => `
      <div class="card mb-2">
        <h3 class="mb-2">Fecha ${n}</h3>
        <div class="rmatches">
          ${groups[n].map(p => {
            const L = byId[p.local]?.nombre || p.local, V = byId[p.visita]?.nombre || p.visita;
            const fin = p.estado === 'finalizado';
            return `<div class="rmatch ${fin ? 'is-fin' : ''}">
              <div class="rmatch-top">
                <span class="rmatch-meta">${esc(p.hora || '—')}${p.cancha ? ' · Cancha ' + esc(p.cancha) : ''}</span>
                <span class="pill ${fin ? 'pill-green' : 'pill-grey'}">${fin ? 'Finalizado' : 'Pendiente'}</span>
              </div>
              <div class="rteam"><span class="rteam-name">${esc(L)}</span>
                <input class="rscore" type="number" inputmode="numeric" min="0" data-gl="${esc(p.id)}" value="${p.golesLocal ?? ''}" placeholder="0"></div>
              <div class="rteam"><span class="rteam-name">${esc(V)}</span>
                <input class="rscore" type="number" inputmode="numeric" min="0" data-gv="${esc(p.id)}" value="${p.golesVisita ?? ''}" placeholder="0"></div>
              <div class="rmatch-actions">
                <button class="btn btn-primary btn-block" data-saveres="${esc(p.id)}">Guardar</button>
                ${fin ? `<button class="btn btn-ghost" data-reabrir="${esc(p.id)}">Reabrir</button>` : ''}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`).join('')}`;

  el.querySelectorAll('[data-saveres]').forEach(b => b.onclick = () => {
    const id = b.dataset.saveres;
    const gl = el.querySelector(`[data-gl="${id}"]`).value;
    const gv = el.querySelector(`[data-gv="${id}"]`).value;
    const both = gl !== '' && gv !== '';
    reload('res', () => savePartido({ id, golesLocal: gl === '' ? null : +gl, golesVisita: gv === '' ? null : +gv, estado: both ? 'finalizado' : 'programado' }));
  });
  el.querySelectorAll('[data-reabrir]').forEach(b => b.onclick = () => {
    reload('res', () => savePartido({ id: b.dataset.reabrir, estado: 'programado' }));
  });
}

async function reload(key, fn) {
  try { await fn(); toast('Guardado', 'success'); await loadAll(); renderTab(); }
  catch (err) { toast(err.message || 'Error al guardar', 'error'); }
}
function serieOptions(sel) {
  return (C.config.series || []).map(s => `<option value="${esc(s.id)}" ${sel === s.id ? 'selected' : ''}>${esc(s.nombre)}</option>`).join('');
}

/* ---------- EQUIPOS ---------- */
function renderEquipos(el) {
  const rows = C.equipos.slice().sort((a, b) => (a.serie || '').localeCompare(b.serie) || (a.nombre || '').localeCompare(b.nombre));
  el.innerHTML = `
    ${!isDemo() ? `
    <div class="card mb-3" style="border-left:4px solid var(--c-brand)">
      <div class="spread" style="flex-wrap:wrap;gap:10px">
        <div><h3 style="margin:0">${rows.length ? 'Sincronizar catálogo' : 'Cargar los equipos del catálogo'}</h3><p class="muted" style="margin:4px 0 0">${rows.length ? 'Agrega los equipos del catálogo que falten (con su logo) sin borrar los actuales.' : 'Sube de una vez los 16 equipos (10 Junior + 6 Senior) con sus logos.'}</p></div>
        <button class="btn btn-primary" id="btn-import-eq">${icon('users', { size: 16 })} ${rows.length ? 'Sincronizar catálogo (16)' : 'Importar catálogo (16)'}</button>
      </div>
    </div>` : ''}
    <div class="card mb-3">
      <h3 class="mb-2">Agregar equipo</h3>
      <form id="f-eq" class="form-row-3">
        <div class="form-group"><label>Nombre</label><input class="input" name="nombre" required></div>
        <div class="form-group"><label>Serie</label><select class="select" name="serie" required>${serieOptions()}</select></div>
        <div class="form-group" style="justify-content:end"><button class="btn btn-primary">Agregar</button></div>
      </form>
    </div>
    <div class="table-wrap"><table class="tbl">
      <thead><tr><th>Equipo</th><th>Serie</th><th></th></tr></thead>
      <tbody>${rows.map(e => `<tr>
        <td style="font-weight:700">${esc(e.nombre)}</td>
        <td>${esc((C.config.series.find(s => s.id === e.serie) || {}).nombre || e.serie)}</td>
        <td style="text-align:right"><button class="btn btn-danger btn-sm" data-del="${esc(e.id)}">Eliminar</button></td>
      </tr>`).join('') || '<tr><td colspan="3" class="muted center">Sin equipos aún.</td></tr>'}</tbody>
    </table></div>`;
  el.querySelector('#f-eq').onsubmit = (ev) => { ev.preventDefault(); const d = Object.fromEntries(new FormData(ev.target).entries()); reload('eq', () => saveEquipo(d)); };
  const bimp = el.querySelector('#btn-import-eq');
  if (bimp) bimp.onclick = () => { bimp.disabled = true; bimp.textContent = 'Importando…'; reload('eq', () => importEquipos()); };
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (confirm('¿Eliminar equipo?')) reload('eq', () => deleteEquipo(b.dataset.del)); });
}

/* ---------- PARTIDOS ---------- */
let editP = null;
function renderPartidos(el) {
  const byId = equiposById(C.equipos);
  const rows = C.partidos.slice().sort((a, b) => (a.fecha || '').localeCompare(b.fecha) || (a.hora || '').localeCompare(b.hora));
  const p = editP || {};
  const eqOpts = (sel) => C.equipos.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map(e => `<option value="${esc(e.id)}" ${sel === e.id ? 'selected' : ''}>${esc(e.nombre)} · ${esc(e.serie)}</option>`).join('');
  el.innerHTML = `
    <div class="card mb-3">
      <h3 class="mb-2">${editP ? 'Editar partido' : 'Agregar partido'}</h3>
      <form id="f-p">
        <div class="form-row-3">
          <div class="form-group"><label>Serie</label><select class="select" name="serie" required>${serieOptions(p.serie)}</select></div>
          <div class="form-group"><label>N° Fecha</label><input class="input" name="fecha_num" type="number" min="1" value="${esc(p.fecha_num ?? '')}"></div>
          <div class="form-group"><label>Cancha</label><input class="input" name="cancha" value="${esc(p.cancha ?? '')}"></div>
        </div>
        <div class="form-group" style="margin:-2px 0 10px">
          <label style="display:flex;align-items:center;gap:8px;font-weight:600;cursor:pointer">
            <input type="checkbox" name="amistoso" ${p.amistoso ? 'checked' : ''}>
            Partido amistoso <span class="muted" style="font-weight:400">(no cuenta para la tabla ni para una fecha)</span>
          </label>
        </div>
        <div class="form-row-3">
          <div class="form-group"><label>Fecha</label><input class="input" name="fecha" type="date" value="${esc(p.fecha ?? '')}" required></div>
          <div class="form-group"><label>Hora</label><input class="input" name="hora" type="time" value="${esc(p.hora ?? '')}"></div>
          <div class="form-group"><label>Estado</label><select class="select" name="estado">
            <option value="programado" ${p.estado === 'programado' ? 'selected' : ''}>Programado</option>
            <option value="en_vivo" ${p.estado === 'en_vivo' ? 'selected' : ''}>En vivo</option>
            <option value="finalizado" ${p.estado === 'finalizado' ? 'selected' : ''}>Finalizado</option>
          </select></div>
        </div>
        <div class="form-row-3" style="align-items:end">
          <div class="form-group"><label>Local</label><select class="select" name="local" required>${eqOpts(p.local)}</select></div>
          <div class="form-group"><label>Goles L / V</label>
            <div class="row" style="gap:8px"><input class="input" name="golesLocal" type="number" min="0" style="width:70px" value="${p.golesLocal ?? ''}"><span>-</span><input class="input" name="golesVisita" type="number" min="0" style="width:70px" value="${p.golesVisita ?? ''}"></div>
          </div>
          <div class="form-group"><label>Visita</label><select class="select" name="visita" required>${eqOpts(p.visita)}</select></div>
        </div>
        <div class="row">
          <button class="btn btn-primary">${editP ? 'Guardar cambios' : 'Agregar partido'}</button>
          ${editP ? '<button type="button" class="btn btn-ghost" id="cancel-edit">Cancelar</button>' : ''}
        </div>
      </form>
    </div>
    <div class="table-wrap"><table class="tbl">
      <thead><tr><th>Fecha</th><th>Serie</th><th>Partido</th><th class="num">Marcador</th><th>Estado</th><th></th></tr></thead>
      <tbody>${rows.map(m => `<tr>
        <td class="muted" style="white-space:nowrap">${esc(fmtDate(m.fecha))} ${esc(m.hora || '')}</td>
        <td>${esc(m.serie)}</td>
        <td style="font-weight:600">${esc(byId[m.local]?.nombre || m.local)} vs ${esc(byId[m.visita]?.nombre || m.visita)}</td>
        <td class="num">${m.golesLocal != null ? `${m.golesLocal}-${m.golesVisita}` : '—'}</td>
        <td><span class="pill ${m.estado === 'finalizado' ? 'pill-green' : m.estado === 'en_vivo' ? 'pill-red' : 'pill-grey'}">${esc(m.estado)}</span></td>
        <td style="text-align:right;white-space:nowrap"><button class="btn btn-secondary btn-sm" data-edit="${esc(m.id)}">✎</button> <button class="btn btn-danger btn-sm" data-del="${esc(m.id)}">✕</button></td>
      </tr>`).join('') || '<tr><td colspan="6" class="muted center">Sin partidos.</td></tr>'}</tbody>
    </table></div>`;

  el.querySelector('#f-p').onsubmit = (ev) => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    d.amistoso = !!d.amistoso;
    d.fecha_num = d.amistoso ? null : (d.fecha_num ? +d.fecha_num : null);
    d.golesLocal = d.golesLocal === '' ? null : +d.golesLocal;
    d.golesVisita = d.golesVisita === '' ? null : +d.golesVisita;
    if (editP) d.id = editP.id;
    reload('p', () => savePartido(d)).then(() => { editP = null; });
  };
  el.querySelector('#cancel-edit') && (el.querySelector('#cancel-edit').onclick = () => { editP = null; renderTab(); });
  el.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => { editP = C.partidos.find(x => x.id === b.dataset.edit); renderTab(); window.scrollTo(0, 0); });
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (confirm('¿Eliminar partido?')) reload('p', () => deletePartido(b.dataset.del)); });
}

/* ---------- DISCIPLINA ---------- */
function renderDisciplina(el) {
  const byId = equiposById(C.equipos);
  const rows = C.disciplina.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha));
  const eqOpts = C.equipos.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map(e => `<option value="${esc(e.id)}">${esc(e.nombre)}</option>`).join('');
  el.innerHTML = `
    <div class="card mb-3">
      <h3 class="mb-2">Registrar tarjeta / sanción</h3>
      <form id="f-d">
        <div class="form-row-3">
          <div class="form-group"><label>Serie</label><select class="select" name="serie">${serieOptions()}</select></div>
          <div class="form-group"><label>Equipo</label><select class="select" name="equipo">${eqOpts}</select></div>
          <div class="form-group"><label>Jugador</label><input class="input" name="jugador"></div>
        </div>
        <div class="form-row-3">
          <div class="form-group"><label>Tipo</label><select class="select" name="tipo"><option value="amarilla">Amarilla</option><option value="roja">Roja</option></select></div>
          <div class="form-group"><label>Fecha</label><input class="input" name="fecha" type="date"></div>
          <div class="form-group"><label>Sanción (opcional)</label><input class="input" name="sancion" placeholder="Ej: 1 fecha"></div>
        </div>
        <div class="form-group"><label>Motivo</label><input class="input" name="motivo"></div>
        <button class="btn btn-primary">Registrar</button>
      </form>
    </div>
    <div class="table-wrap"><table class="tbl">
      <thead><tr><th>Fecha</th><th>Tipo</th><th>Jugador</th><th>Equipo</th><th>Sanción</th><th></th></tr></thead>
      <tbody>${rows.map(t => `<tr>
        <td class="muted">${esc(fmtDate(t.fecha))}</td>
        <td>${t.tipo === 'roja' ? '<span class="tarjeta tarjeta-roja"></span>' : '<span class="tarjeta tarjeta-amarilla"></span>'}</td>
        <td style="font-weight:600">${esc(t.jugador || '—')}</td>
        <td class="muted">${esc(byId[t.equipo]?.nombre || t.equipo)}</td>
        <td>${esc(t.sancion || '—')}</td>
        <td style="text-align:right"><button class="btn btn-danger btn-sm" data-del="${esc(t.id)}">✕</button></td>
      </tr>`).join('') || '<tr><td colspan="6" class="muted center">Sin registros.</td></tr>'}</tbody>
    </table></div>`;
  el.querySelector('#f-d').onsubmit = (ev) => { ev.preventDefault(); const d = Object.fromEntries(new FormData(ev.target).entries()); reload('d', () => saveTarjeta(d)); };
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (confirm('¿Eliminar registro?')) reload('d', () => deleteTarjeta(b.dataset.del)); });
}

/* ---------- INSCRIPCIONES ---------- */
function renderInscripciones(el) {
  const rows = (C.inscripciones || []).slice().sort((a, b) => (b.creada || 0) - (a.creada || 0));
  el.innerHTML = `
    <h3 class="mb-2">Inscripciones recibidas (${rows.length})</h3>
    ${isDemo() ? '<div class="alert alert-warn">⚙️ En modo demo no hay inscripciones reales. Con Firebase, los envíos del formulario de Admisión aparecen acá.</div>' : ''}
    <div class="table-wrap"><table class="tbl">
      <thead><tr><th>Equipo</th><th>Contacto</th><th>Teléfono</th><th>Serie</th><th>Estado</th><th></th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td style="font-weight:700">${esc(r.equipo)}</td>
        <td>${esc(r.contacto || '')}${r.email ? `<br><span class="muted">${esc(r.email)}</span>` : ''}</td>
        <td>${esc(r.telefono || '')}</td>
        <td>${esc((C.config.series.find(s => s.id === r.serie) || {}).nombre || r.serie || '')}</td>
        <td><select class="select" data-estado="${esc(r.id)}" style="padding:6px 10px">
          ${['nueva', 'contactado', 'confirmado', 'descartado'].map(s => `<option ${r.estado === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select></td>
        <td style="text-align:right"><button class="btn btn-danger btn-sm" data-del="${esc(r.id)}">✕</button></td>
      </tr>`).join('') || '<tr><td colspan="6" class="muted center">Sin inscripciones aún.</td></tr>'}</tbody>
    </table></div>`;
  el.querySelectorAll('[data-estado]').forEach(s => s.onchange = () => reload('i', () => updateInscripcion({ id: s.dataset.estado, estado: s.value })));
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (confirm('¿Eliminar inscripción?')) reload('i', () => deleteInscripcion(b.dataset.del)); });
}

/* ---------- CONTENIDO ---------- */
function renderContenido(el) {
  const c = C.config;
  const av = C.av || { videos: [], galeria: [] };
  el.innerHTML = `
    <div class="card mb-3">
      <h3 class="mb-2">Textos e información</h3>
      <form id="f-c">
        <div class="form-row">
          <div class="form-group"><label>Sede</label><input class="input" name="sede" value="${esc(c.sede || '')}"></div>
          <div class="form-group"><label>Ubicación sede</label><input class="input" name="sedeUbicacion" value="${esc(c.sedeUbicacion || '')}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Fecha de lanzamiento</label><input class="input" name="lanzamiento" type="date" value="${esc(c.lanzamiento || '')}"></div>
          <div class="form-group"><label>Valor inscripción (CLP)</label><input class="input" name="valorInscripcion" type="number" value="${esc(c.valorInscripcion || '')}"></div>
        </div>
        <div class="form-group"><label>Misión</label><textarea class="textarea" name="mision" style="min-height:120px">${esc(c.mision || '')}</textarea></div>
        <div class="form-row-3">
          <div class="form-group"><label>Instagram (URL)</label><input class="input" name="instagram" value="${esc(c.contacto?.instagram || '')}"></div>
          <div class="form-group"><label>WhatsApp</label><input class="input" name="whatsapp" value="${esc(c.contacto?.whatsapp || '')}"></div>
          <div class="form-group"><label>Email</label><input class="input" name="email" value="${esc(c.contacto?.email || '')}"></div>
        </div>
        <button class="btn btn-primary">Guardar contenido</button>
      </form>
    </div>
    <div class="card mb-3">
      <h3 class="mb-2">Auspiciadores del premio (MVP)</h3>
      <p class="muted mb-2" style="font-size:.9rem">El fixture se sortea con 4 espacios (“Auspiciador 1–4”). Escribe aquí la marca real de cada uno y se revelará en la <a href="/programacion" data-link>Programación</a>. Deja en blanco para mantener el nombre genérico.</p>
      <form id="f-ausp" class="grid grid-2">
        ${['Auspiciador 1', 'Auspiciador 2', 'Auspiciador 3', 'Auspiciador 4'].map(slot => `
          <div class="form-group"><label>${esc(slot)}</label>
            <input class="input" data-ausp="${esc(slot)}" value="${esc((c.auspiciadores || {})[slot] || '')}" placeholder="Marca real (ej: Red Bull)"></div>`).join('')}
        <div class="form-group" style="justify-content:end"><button class="btn btn-primary">Guardar auspiciadores</button></div>
      </form>
    </div>
    <div class="card">
      <h3 class="mb-2">Videos (YouTube)</h3>
      <form id="f-v" class="form-row" style="align-items:end">
        <div class="form-group"><label>ID del video</label><input class="input" name="id" placeholder="Ej: dQw4w9WgXcQ"></div>
        <div class="form-group"><label>Título</label><input class="input" name="titulo"></div>
        <div class="form-group" style="justify-content:end"><button class="btn btn-primary">Agregar video</button></div>
      </form>
      <div class="stack mt-2">
        ${(av.videos || []).map((v, i) => `<div class="spread card-sm" style="border:1px solid var(--c-line);border-radius:12px"><span>${icon('video', { size: 16 })} ${esc(v.titulo || v.id)} <span class="muted">(${esc(v.id)})</span></span><button class="btn btn-danger btn-sm" data-delvid="${i}">✕</button></div>`).join('') || '<p class="muted">Sin videos.</p>'}
      </div>
    </div>
    <div class="card mt-3">
      <h3 class="mb-2">Galería de fotos</h3>
      <p class="muted mb-2" style="font-size:.9rem">Una URL por línea (usa la versión grande <code>.jpg</code>; las variantes AVIF/WebP se sirven solas). Las fotos van en <code>/assets/galeria/</code> y se muestran en <a href="/audiovisual" data-link>Audiovisual</a>. Hay <strong>${(av.galeria || []).length}</strong> cargadas.</p>
      <textarea class="textarea" id="galtext" style="min-height:150px;font-family:monospace;font-size:.82rem">${esc((av.galeria || []).join('\n'))}</textarea>
      <div class="spread mt-2">
        <button class="btn btn-ghost btn-sm" id="galf1" type="button">Insertar Fecha 1 (20 fotos)</button>
        <button class="btn btn-primary btn-sm" id="galsave" type="button">Guardar galería</button>
      </div>
    </div>
    <div class="card mt-3">
      <h3 class="mb-2">Canchas del fixture</h3>
      <p class="muted mb-2" style="font-size:.9rem">Reasigna el <strong>número de cancha</strong> de todos los partidos según la regla: los <strong>grabados</strong> van siempre en <strong>cancha 1 y 2</strong>, y los no grabados en 3 y 4. No cambia horarios, rivales, ni la condición de grabado/clásico, ni los resultados.</p>
      <button class="btn btn-primary btn-sm" id="fixcanchas" type="button">Reasignar canchas (grabados → C1 y C2)</button>
    </div>
    <div class="card mt-3">
      <h3 class="mb-2">Grabaciones del fixture</h3>
      <p class="muted mb-2" style="font-size:.9rem"><strong>3 grabados por fecha</strong>; el <strong>clásico</strong> de cada fecha (2 en la Fecha 1) debe ser uno de los grabados. Objetivo: cada equipo <strong>2 clásicos</strong> y <strong>Capibara 4 grabados</strong> (el resto 5–6). Los grabados van en cancha 1 y 2. No cambia horarios ni rivales.</p>
      <div class="form-group" style="max-width:220px"><label>Fecha</label><select class="input" id="grabfecha"></select></div>
      <div id="grabbody" class="mt-2"><p class="muted">Cargando fixture…</p></div>
      <div class="mt-2" style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" id="grabsave" type="button" disabled>Guardar grabaciones de esta fecha</button>
        <button class="btn btn-ghost btn-sm" id="autoclas" type="button" title="Asigna 1 clásico por fecha (2 en la Fecha 1), 2 por equipo, entre los grabados">Auto-asignar clásicos (2 por equipo)</button>
      </div>
      <div class="mt-3"><h4 class="mb-1" style="font-size:.95rem">Equilibrio por equipo</h4><div id="grabbalance"></div></div>
    </div>`;
  el.querySelector('#f-c').onsubmit = (ev) => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    const data = {
      sede: d.sede, sedeUbicacion: d.sedeUbicacion, lanzamiento: d.lanzamiento,
      valorInscripcion: d.valorInscripcion ? +d.valorInscripcion : c.valorInscripcion, mision: d.mision,
      contacto: { ...(c.contacto || {}), instagram: d.instagram, whatsapp: d.whatsapp, email: d.email }
    };
    reload('c', () => saveConfig(data));
  };
  el.querySelector('#f-ausp').onsubmit = (ev) => {
    ev.preventDefault();
    const auspiciadores = {};
    el.querySelectorAll('[data-ausp]').forEach(i => { auspiciadores[i.dataset.ausp] = i.value.trim(); });
    reload('c', () => saveConfig({ auspiciadores }));
  };
  el.querySelector('#f-v').onsubmit = (ev) => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    if (!d.id) return;
    const videos = [...(av.videos || []), { id: d.id.trim(), titulo: d.titulo || '' }];
    reload('v', () => saveAudiovisual({ videos, galeria: av.galeria || [] }));
  };
  el.querySelectorAll('[data-delvid]').forEach(b => b.onclick = () => {
    const videos = (av.videos || []).filter((_, i) => i !== +b.dataset.delvid);
    reload('v', () => saveAudiovisual({ videos, galeria: av.galeria || [] }));
  });
  const F1_GAL = Array.from({ length: 20 }, (_, i) => `/assets/galeria/liv-f1-${String(i + 1).padStart(2, '0')}.jpg`);
  el.querySelector('#galf1').onclick = () => { el.querySelector('#galtext').value = F1_GAL.join('\n'); };
  el.querySelector('#galsave').onclick = () => {
    const galeria = el.querySelector('#galtext').value.split('\n').map(s => s.trim()).filter(Boolean);
    reload('v', () => saveAudiovisual({ videos: av.videos || [], galeria }));
  };
  el.querySelector('#fixcanchas').onclick = async (ev) => {
    const btn = ev.currentTarget;
    const partidos = await getPartidos();
    // Agrupa por serie + fecha + horario; grabados -> canchas 1,2 ; no grabados -> 3,4.
    const groups = {};
    partidos.forEach(p => { const k = `${p.serie}|${p.fecha_num}|${p.hora}`; (groups[k] = groups[k] || []).push(p); });
    const ups = [];
    Object.values(groups).forEach(arr => {
      if (arr.some(p => p.estado === 'finalizado')) return; // no tocar fechas ya jugadas
      const grabs = arr.filter(p => p.grabado).sort((a, b) => (+a.cancha || 0) - (+b.cancha || 0));
      const nogr = arr.filter(p => !p.grabado).sort((a, b) => (+a.cancha || 0) - (+b.cancha || 0));
      grabs.forEach((p, i) => { const nc = i + 1; if (+p.cancha !== nc) ups.push({ id: p.id, cancha: nc }); });
      nogr.forEach((p, i) => { const nc = 3 + i; if (+p.cancha !== nc) ups.push({ id: p.id, cancha: nc }); });
    });
    if (!ups.length) { toast('Las canchas ya cumplen la regla ✓'); return; }
    if (!confirm(`Se reasignarán ${ups.length} partidos de cancha (grabados → 1 y 2). No se toca nada más. ¿Continuar?`)) return;
    btn.disabled = true; btn.textContent = `Aplicando… (0/${ups.length})`;
    let n = 0;
    for (const u of ups) { await savePartido(u); btn.textContent = `Aplicando… (${++n}/${ups.length})`; }
    toast(`Listo: ${ups.length} canchas reasignadas ✓`);
    setTimeout(() => location.reload(), 700);
  };

  // Auto-asignar clásicos: 1 por fecha (2 en F1), 2 por equipo, siempre entre los grabados.
  const CLASICOS = ['f1-jr-arquitectura-jr-bayern', 'f1-jr-los-pibes-jr-capibara', 'f2-jr-arquitectura-jr-huracan', 'f3-jr-40-grados-jr-capibara', 'f4-jr-los-prados-jr-huracan', 'f5-jr-bunker-jr-mesa-cuadrada', 'f6-jr-los-prados-jr-bunker', 'f7-jr-camilo-enriquez-jr-mesa-cuadrada', 'f8-jr-los-pibes-jr-40-grados', 'f9-jr-camilo-enriquez-jr-bayern'];
  el.querySelector('#autoclas').onclick = async (ev) => {
    const btn = ev.currentTarget;
    const setC = new Set(CLASICOS);
    const ps = (await getPartidos()).filter(p => p.serie === 'libre');
    const ups = ps.filter(p => !!p.clasico !== setC.has(p.id)).map(p => ({ id: p.id, clasico: setC.has(p.id) }));
    if (!ups.length) { toast('Los clásicos ya están asignados ✓'); return; }
    if (!confirm(`Se ajustará la marca de clásico en ${ups.length} partidos para dejar 1 por fecha (2 en la F1) y 2 por equipo. No toca grabados, rivales ni horarios. ¿Continuar?`)) return;
    btn.disabled = true; btn.textContent = 'Aplicando…';
    for (const u of ups) await savePartido(u);
    toast('Listo: clásicos reasignados ✓');
    setTimeout(() => location.reload(), 700);
  };

  // ---- Editor de grabaciones por fecha ----
  (async () => {
    const sel = el.querySelector('#grabfecha');
    const body = el.querySelector('#grabbody');
    const saveBtn = el.querySelector('#grabsave');
    const balanceDiv = el.querySelector('#grabbalance');
    if (!sel) return;
    const [partidos, equipos] = await Promise.all([getPartidos(), getEquipos()]);
    const NAME = equiposById(equipos);
    const nm = id => (NAME[id] && NAME[id].nombre) || id;
    const libre = partidos.filter(p => p.serie === 'libre');

    // Estado efectivo: usa lo marcado en la UI para la fecha en edición, y lo guardado para el resto.
    function updateBalance() {
      const ui = {};
      body.querySelectorAll('[data-grab]').forEach(g => {
        const id = g.dataset.grab;
        const clas = !!(body.querySelector(`[data-clas="${id}"]`) || {}).checked;
        ui[id] = { clas, grab: clas || g.checked };
      });
      const tally = {};
      libre.forEach(p => {
        const st = ui[p.id] || { grab: !!p.grabado, clas: !!p.clasico };
        [p.local, p.visita].forEach(t => { tally[t] = tally[t] || { grab: 0, clas: 0 }; });
        if (st.grab) { tally[p.local].grab++; tally[p.visita].grab++; }
        if (st.clas) { tally[p.local].clas++; tally[p.visita].clas++; }
      });
      const ids = Object.keys(tally).sort((a, b) => nm(a).localeCompare(nm(b), 'es'));
      const tgt = id => id === 'jr-capibara' ? [4, 4] : [5, 6];
      const cell = (v, lo, hi) => `<td style="text-align:center;font-weight:800;padding:3px 6px;color:${(v < lo || v > hi) ? '#c0392b' : 'var(--c-brand-2)'}">${v}</td>`;
      balanceDiv.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:.85rem">
        <thead><tr style="border-bottom:1px solid var(--c-line)"><th style="text-align:left;padding:3px 6px">Equipo</th><th style="padding:3px 6px">Grabados</th><th style="padding:3px 6px">Clásicos</th></tr></thead>
        <tbody>${ids.map(id => { const [lo, hi] = tgt(id); return `<tr style="border-bottom:1px solid var(--c-line)"><td style="padding:3px 6px">${esc(nm(id))}</td>${cell(tally[id].grab, lo, hi)}${cell(tally[id].clas, 2, 2)}</tr>`; }).join('')}</tbody>
      </table>
      <p class="muted mt-1" style="font-size:.78rem">Objetivo: grabados <strong>Capibara 4</strong> / resto <strong>5–6</strong>; clásicos <strong>2 por equipo</strong> (en rojo si queda fuera). Suma todas las fechas y cambia en vivo con lo que marcas.</p>`;
    }
    const prog = partidos.filter(p => p.serie === 'libre' && p.estado !== 'finalizado');
    const fechas = [...new Set(prog.map(p => p.fecha_num))].sort((a, b) => a - b);
    if (!fechas.length) { body.innerHTML = '<p class="muted">No hay fechas programadas para editar.</p>'; return; }
    sel.innerHTML = fechas.map(n => `<option value="${n}">Fecha ${n}</option>`).join('');

    function renderFecha(fn) {
      const ms = prog.filter(p => p.fecha_num === fn);
      body.innerHTML = `<div id="grabcount" style="font-size:.85rem;margin-bottom:6px"></div>` + ['10:40', '12:20'].map(h => {
        const slot = ms.filter(p => p.hora === h).sort((a, b) => (+a.cancha || 0) - (+b.cancha || 0));
        if (!slot.length) return '';
        return `<div class="mb-2"><div style="font-weight:700;font-size:.82rem;color:var(--c-muted);margin:8px 0 4px">${h}</div>` +
          slot.map(p => `<div class="spread card-sm" style="border:1px solid var(--c-line);border-radius:10px;margin-bottom:6px;padding:8px 12px">
            <span>${esc(nm(p.local))} <span class="muted">vs</span> ${esc(nm(p.visita))}</span>
            <span style="display:flex;gap:14px;align-items:center;font-size:.85rem;white-space:nowrap">
              <label style="display:flex;gap:5px;align-items:center;cursor:pointer"><input type="checkbox" data-grab="${esc(p.id)}" ${p.grabado ? 'checked' : ''} ${p.clasico ? 'disabled' : ''}> Grabar</label>
              <label style="display:flex;gap:5px;align-items:center;cursor:pointer"><input type="checkbox" data-clas="${esc(p.id)}" ${p.clasico ? 'checked' : ''}> Clásico</label>
            </span>
          </div>`).join('') + `</div>`;
      }).join('');
      const needClas = fn === 1 ? 2 : 1;
      const cnt = () => {
        const g = [...body.querySelectorAll('[data-grab]')].filter(x => x.checked).length;
        const c = [...body.querySelectorAll('[data-clas]')].filter(x => x.checked).length;
        const c2 = body.querySelector('#grabcount');
        if (c2) c2.innerHTML = `Grabados: <strong style="color:${g === 3 ? 'var(--c-brand-2)' : '#c0392b'}">${g}/3</strong> &nbsp;·&nbsp; Clásicos: <strong style="color:${c === needClas ? 'var(--c-brand-2)' : '#c0392b'}">${c}/${needClas}</strong>`;
      };
      body.querySelectorAll('input[type=checkbox]').forEach(cb => cb.addEventListener('change', () => {
        if (cb.dataset.clas) { const g = body.querySelector(`[data-grab="${cb.dataset.clas}"]`); if (cb.checked) { g.checked = true; g.disabled = true; } else { g.disabled = false; } }
        updateBalance(); cnt();
      }));
      saveBtn.disabled = false;
      cnt();
      updateBalance();
    }
    sel.onchange = () => renderFecha(+sel.value);
    renderFecha(fechas[0]);

    saveBtn.onclick = async () => {
      const fn = +sel.value;
      const ms = prog.filter(p => p.fecha_num === fn);
      const desired = ms.map(p => {
        const clas = !!(body.querySelector(`[data-clas="${p.id}"]`) || {}).checked;
        const grab = clas || !!(body.querySelector(`[data-grab="${p.id}"]`) || {}).checked;
        return { p, clas, grab };
      });
      // Cambios de grabado/clásico
      const merged = {};
      desired.forEach(({ p, clas, grab }) => {
        const chg = {};
        if (!!p.clasico !== clas) chg.clasico = clas;
        if (!!p.grabado !== grab) chg.grabado = grab;
        if (Object.keys(chg).length) merged[p.id] = { id: p.id, ...(merged[p.id] || {}), ...chg };
      });
      // Reasignar canchas: grabados -> 1,2 ; no grabados -> 3,4 (por horario)
      const byh = {};
      desired.forEach(d => { (byh[d.p.hora] = byh[d.p.hora] || []).push(d); });
      Object.values(byh).forEach(arr => {
        const gr = arr.filter(d => d.grab).sort((a, b) => (+a.p.cancha || 0) - (+b.p.cancha || 0));
        const no = arr.filter(d => !d.grab).sort((a, b) => (+a.p.cancha || 0) - (+b.p.cancha || 0));
        gr.forEach((d, i) => { const nc = i + 1; if (+d.p.cancha !== nc) merged[d.p.id] = { id: d.p.id, ...(merged[d.p.id] || {}), cancha: nc }; });
        no.forEach((d, i) => { const nc = 3 + i; if (+d.p.cancha !== nc) merged[d.p.id] = { id: d.p.id, ...(merged[d.p.id] || {}), cancha: nc }; });
      });
      const list = Object.values(merged);
      if (!list.length) { toast('Sin cambios en esta fecha.'); return; }
      if (!confirm(`Fecha ${fn}: se aplicarán ${list.length} cambios (grabado/clásico y cancha). No se tocan rivales ni horarios. ¿Continuar?`)) return;
      saveBtn.disabled = true; saveBtn.textContent = 'Aplicando…';
      for (const u of list) await savePartido(u);
      toast(`Fecha ${fn}: cambios aplicados ✓`);
      setTimeout(() => location.reload(), 700);
    };
  })();
}
