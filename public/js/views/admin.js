import {
  getUser, isAdmin, isPlanillero, isDemo, login, logout, adminLogin,
  getConfig, saveConfig,
  getEquipos, saveEquipo, deleteEquipo, importEquipos,
  getPartidos, savePartido, deletePartido,
  getDisciplina, saveTarjeta, deleteTarjeta,
  getGoleadores, saveGoleador, deleteGoleador,
  FALTAS_ROJA, faltaById, sancionTexto, suspendidosParaFecha, AMARILLAS_PARA_SUSPENSION,
  getInscripciones, updateInscripcion, deleteInscripcion,
  getPagos, savePagos,
  getJugadores, saveJugador, deleteJugador, importJugadores,
  getAudiovisual, saveAudiovisual,
  sandboxOn, setSandbox, resetSandbox,
  equiposById, camarinesPorCancha
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
  const [config, equipos, partidos, disciplina, inscripciones, av, jugadores, goleadores] = await Promise.all([
    getConfig(), getEquipos(), getPartidos(), getDisciplina(),
    getInscripciones().catch(() => []), getAudiovisual().catch(() => ({ videos: [], galeria: [] })),
    getJugadores().catch(() => []), getGoleadores().catch(() => [])
  ]);
  const pagos = await getPagos().catch(() => []);
  C = { config, equipos, partidos, disciplina, inscripciones, av, jugadores, goleadores, pagos };
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
  { id: 'anotaciones', label: `${icon('ball', { size: 16 })} Goles y tarjetas`, roles: ['admin', 'planillero'] },
  { id: 'disciplina', label: `${icon('cards', { size: 16 })} Disciplina`, roles: ['admin', 'planillero'] },
  { id: 'fixture', label: `${icon('calendar', { size: 16 })} Fixture`, roles: ['admin'] },
  { id: 'partidos', label: `${icon('calendar', { size: 16 })} Partidos`, roles: ['admin'] },
  { id: 'equipos', label: `${icon('users', { size: 16 })} Equipos`, roles: ['admin'] },
  { id: 'jugadores', label: `${icon('users', { size: 16 })} Jugadores`, roles: ['admin'] },
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
  if (TAB === 'anotaciones') return renderAnotaciones(el);
  if (TAB === 'equipos') return renderEquipos(el);
  if (TAB === 'fixture') return renderFixture(el);
  if (TAB === 'jugadores') return renderJugadores(el);
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

/* ---------- ANOTACIONES (goles y tarjetas por partido) ---------- */
let anotFecha = null;
let anotMatch = null;

function renderAnotaciones(el) {
  const byId = equiposById(C.equipos);
  const jmap = {}; (C.jugadores || []).forEach(j => { jmap[j.id] = j; });
  const nm = id => byId[id]?.nombre || id;

  const partidos = C.partidos.slice().filter(p => p.fecha_num != null && !p.amistoso);
  const fechas = [...new Set(partidos.map(p => p.fecha_num))].sort((a, b) => a - b);
  if (!fechas.length) { el.innerHTML = `<div class="alert alert-warn">No hay fixture publicado todavía.</div>`; return; }
  if (anotFecha == null || !fechas.includes(anotFecha)) anotFecha = fechas[0];

  const matches = partidos.filter(p => p.fecha_num === anotFecha)
    .sort((a, b) => (a.hora || '').localeCompare(b.hora || '') || ((+a.cancha || 0) - (+b.cancha || 0)));
  if (!anotMatch || !matches.some(m => m.id === anotMatch)) anotMatch = matches.length ? matches[0].id : null;
  const p = matches.find(m => m.id === anotMatch);

  // Rosters de los dos equipos (base de jugadores)
  const rosterL = p ? (C.jugadores || []).filter(j => j.equipo === p.local).sort((a, b) => a.nombre.localeCompare(b.nombre)) : [];
  const rosterV = p ? (C.jugadores || []).filter(j => j.equipo === p.visita).sort((a, b) => a.nombre.localeCompare(b.nombre)) : [];
  const playerOpts = (selId) => {
    const grp = (label, arr) => arr.length ? `<optgroup label="${esc(label)}">${arr.map(j => `<option value="${esc(j.id)}" ${selId === j.id ? 'selected' : ''}>${esc(j.nombre)}</option>`).join('')}</optgroup>` : '';
    return `<option value="">— jugador —</option>` + (p ? grp(nm(p.local), rosterL) + grp(nm(p.visita), rosterV) : '');
  };
  const golRow = (jid = '', g = '') => `<div class="anot-row" style="display:flex;gap:8px;margin-bottom:6px;align-items:center">
    <select class="select gol-j" style="flex:1;min-width:160px">${playerOpts(jid)}</select>
    <input class="input gol-n" type="number" min="1" value="${esc(g || '')}" placeholder="Goles" style="width:90px">
    <button type="button" class="btn btn-danger btn-sm anot-del" title="Quitar">✕</button>
  </div>`;
  const cardRow = (jid = '', tipo = 'amarilla') => `<div class="anot-row" style="display:flex;gap:8px;margin-bottom:6px;align-items:center">
    <select class="select card-j" style="flex:1;min-width:160px">${playerOpts(jid)}</select>
    <select class="select card-t" style="width:130px"><option value="amarilla" ${tipo === 'amarilla' ? 'selected' : ''}>🟨 Amarilla</option><option value="roja" ${tipo === 'roja' ? 'selected' : ''}>🟥 Roja</option></select>
    <button type="button" class="btn btn-danger btn-sm anot-del" title="Quitar">✕</button>
  </div>`;

  const curGoles = p ? (C.goleadores || []).filter(g => g.partidoId === p.id) : [];
  const curCards = p ? (C.disciplina || []).filter(d => d.partidoId === p.id) : [];
  const totGoles = curGoles.reduce((s, g) => s + (+g.goles || 0), 0);
  const sinRoster = p && !rosterL.length && !rosterV.length;

  el.innerHTML = `
    ${isDemo() ? '<div class="alert alert-warn">Modo demo: los cambios no se guardan.</div>' : '<p class="muted mb-2">Elige la fecha y el partido, carga los goleadores y las tarjetas, y presiona <strong>Guardar</strong>. Alimenta la tabla de goleadores y la disciplina.</p>'}
    <div class="chips filter-row mb-2" id="anot-fechas">
      <span class="chips-label">Fecha</span>
      ${fechas.map(f => `<button class="chip ${anotFecha === f ? 'active' : ''}" data-f="${f}">Fecha ${f}</button>`).join('')}
    </div>
    <div class="form-group mb-2" style="max-width:520px">
      <label>Partido</label>
      <select class="select" id="anot-match">
        ${matches.map(m => {
          const res = m.golesLocal != null ? ` (${m.golesLocal}-${m.golesVisita})` : '';
          return `<option value="${esc(m.id)}" ${anotMatch === m.id ? 'selected' : ''}>${esc(nm(m.local))} vs ${esc(nm(m.visita))}${res}</option>`;
        }).join('')}
      </select>
    </div>
    ${!p ? '<div class="alert alert-warn">No hay partidos en esta fecha.</div>' : `
    <div class="card">
      <div class="spread mb-2" style="align-items:center;flex-wrap:wrap;gap:8px">
        <h3 style="margin:0">${esc(nm(p.local))} <span class="muted">vs</span> ${esc(nm(p.visita))}</h3>
        <span class="pill ${p.estado === 'finalizado' ? 'pill-green' : 'pill-grey'}">${p.golesLocal != null ? `${p.golesLocal} - ${p.golesVisita}` : 'sin marcador'}</span>
      </div>
      ${sinRoster ? `<div class="alert alert-warn" style="font-size:.88rem">No hay jugadores importados para estos equipos, así que no puedo ofrecer la lista. Importa jugadores en la pestaña <strong>Jugadores</strong> o usa la pestaña <strong>Disciplina</strong> para tarjetas con nombre libre.</div>` : ''}

      <div class="mb-3">
        <div class="spread" style="align-items:center"><h4 style="margin:0 0 8px">${icon('ball', { size: 16 })} Goleadores</h4>
          <span class="muted" style="font-size:.82rem">Marcador del partido: ${p.golesLocal != null ? esc(+p.golesLocal + +p.golesVisita) : '—'} goles</span></div>
        <div id="gol-list">${curGoles.length ? curGoles.map(g => golRow(g.jugadorId, g.goles)).join('') : golRow()}</div>
        <button type="button" class="btn btn-ghost btn-sm" id="gol-add">+ Agregar goleador</button>
      </div>

      <div class="mb-3">
        <h4 style="margin:0 0 8px">${icon('cards', { size: 16 })} Tarjetas</h4>
        <div id="card-list">${curCards.length ? curCards.map(d => cardRow(d.jugadorId, d.tipo)).join('') : cardRow()}</div>
        <button type="button" class="btn btn-ghost btn-sm" id="card-add">+ Agregar tarjeta</button>
      </div>

      <div class="row"><button class="btn btn-primary" id="anot-save">Guardar goles y tarjetas</button></div>
    </div>`}`;

  // Selección de fecha / partido
  el.querySelectorAll('#anot-fechas .chip').forEach(c => c.onclick = () => { anotFecha = +c.dataset.f; anotMatch = null; renderTab(); });
  const msel = el.querySelector('#anot-match');
  if (msel) msel.onchange = () => { anotMatch = msel.value; renderTab(); };
  if (!p) return;

  // Agregar/quitar filas
  el.querySelector('#gol-add').onclick = () => el.querySelector('#gol-list').insertAdjacentHTML('beforeend', golRow());
  el.querySelector('#card-add').onclick = () => el.querySelector('#card-list').insertAdjacentHTML('beforeend', cardRow());
  const delDeleg = (ev) => { const b = ev.target.closest('.anot-del'); if (b) b.closest('.anot-row').remove(); };
  el.querySelector('#gol-list').onclick = delDeleg;
  el.querySelector('#card-list').onclick = delDeleg;

  // Guardar (diff contra lo existente del partido)
  el.querySelector('#anot-save').onclick = async () => {
    const btn = el.querySelector('#anot-save');
    // Goles deseados: jugadorId -> goles (suma si se repite)
    const desiredG = {};
    el.querySelectorAll('#gol-list .anot-row').forEach(r => {
      const jid = r.querySelector('.gol-j').value;
      const g = +r.querySelector('.gol-n').value;
      if (jid && g > 0) desiredG[jid] = (desiredG[jid] || 0) + g;
    });
    // Tarjetas deseadas: `${jid}__${tipo}`
    const desiredC = {};
    el.querySelectorAll('#card-list .anot-row').forEach(r => {
      const jid = r.querySelector('.card-j').value;
      const tipo = r.querySelector('.card-t').value;
      if (jid) desiredC[`${jid}__${tipo}`] = { jid, tipo };
    });

    const ops = [];
    // Goles: upserts
    Object.entries(desiredG).forEach(([jid, g]) => {
      const j = jmap[jid];
      ops.push(saveGoleador({ id: `${p.id}__${jid}`, partidoId: p.id, jugadorId: jid, nombre: j?.nombre || '', equipo: j?.equipo || '', serie: p.serie || 'libre', fecha: p.fecha || '', fecha_num: p.fecha_num, goles: g }));
    });
    // Goles: borra los que ya no están
    curGoles.forEach(g => { if (!(g.jugadorId in desiredG)) ops.push(deleteGoleador(g.id)); });
    // Tarjetas: upserts
    Object.values(desiredC).forEach(({ jid, tipo }) => {
      const j = jmap[jid];
      ops.push(saveTarjeta({ id: `${p.id}__${jid}__${tipo}`, partidoId: p.id, jugadorId: jid, jugador: j?.nombre || '', equipo: j?.equipo || '', serie: p.serie || 'libre', fecha: p.fecha || '', fecha_num: p.fecha_num, tipo }));
    });
    // Tarjetas: borra las que ya no están (solo las de este partido con id determinista)
    curCards.forEach(d => { const key = `${d.jugadorId}__${d.tipo}`; if (d.jugadorId && !(key in desiredC)) ops.push(deleteTarjeta(d.id)); });

    if (!ops.length) { toast('No hay nada que guardar.'); return; }
    btn.disabled = true; btn.textContent = 'Guardando…';
    try {
      for (const op of ops) await op;
      toast('Goles y tarjetas guardados ✓', 'success');
      await loadAll(); renderTab();
    } catch (err) { toast(err.message || 'Error al guardar', 'error'); btn.disabled = false; btn.textContent = 'Guardar goles y tarjetas'; }
  };
}

/* ---------- JUGADORES (base de datos del plantel: nombre + edad) ---------- */
let editJug = null;
let jugEq = 'all';
let jugQ = '';

function renderJugadores(el) {
  const byId = equiposById(C.equipos);
  const equiposJr = C.equipos.slice()
    .filter(e => (e.serie || 'libre') === 'libre')
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  const eqOpts = (sel) => equiposJr.map(e => `<option value="${esc(e.id)}" ${sel === e.id ? 'selected' : ''}>${esc(e.nombre)}</option>`).join('');
  const jugs = (C.jugadores || []).slice();
  const nEq = {}; jugs.forEach(j => { nEq[j.equipo] = (nEq[j.equipo] || 0) + 1; });

  const q = jugQ.trim().toLowerCase();
  const list = jugs
    .filter(j => jugEq === 'all' || j.equipo === jugEq)
    .filter(j => !q || (j.nombre || '').toLowerCase().includes(q))
    .sort((a, b) => (byId[a.equipo]?.nombre || a.equipo).localeCompare(byId[b.equipo]?.nombre || b.equipo) || (a.nombre || '').localeCompare(b.nombre || ''));

  const jp = editJug || {};
  el.innerHTML = `
    <div class="card mb-3" style="background:var(--c-brand-soft);border-radius:12px">
      <h3 class="mb-1">${icon('users', { size: 18 })} Base de jugadores</h3>
      <p class="muted" style="font-size:.9rem;margin:0 0 10px">La plataforma guarda <strong>nombre completo y edad</strong> de cada jugador (sin RUT ni fecha de nacimiento — esos quedan solo en tus planillas). Sirve de base para goles, tarjetas, goleadores y el XI ideal.</p>
      <div class="row" style="gap:10px;flex-wrap:wrap;align-items:center">
        <input type="file" id="jugfile" accept=".json,application/json" class="input" style="max-width:320px">
        <button class="btn btn-primary btn-sm" id="jugimport" type="button">Importar / actualizar desde archivo</button>
      </div>
      <p class="muted" style="font-size:.82rem;margin:8px 0 0">Elige el archivo <code>jugadores.json</code> (te lo dejé en tu carpeta Planillas). Re-importar actualiza sin duplicar.</p>
    </div>

    <div class="card mb-3">
      <h3 class="mb-2">${editJug ? 'Editar jugador' : 'Agregar jugador'}</h3>
      <form id="f-jug">
        <div class="form-row-3" style="align-items:end">
          <div class="form-group"><label>Equipo</label><select class="select" name="equipo" required>${eqOpts(jp.equipo)}</select></div>
          <div class="form-group"><label>Nombre completo</label><input class="input" name="nombre" value="${esc(jp.nombre ?? '')}" required></div>
          <div class="form-group"><label>Edad</label><input class="input" name="edad" type="number" min="10" max="90" value="${esc(jp.edad ?? '')}" placeholder="—"></div>
        </div>
        <div class="row">
          <button class="btn btn-primary">${editJug ? 'Guardar cambios' : 'Agregar jugador'}</button>
          ${editJug ? '<button type="button" class="btn btn-ghost" id="jug-cancel">Cancelar</button>' : ''}
        </div>
      </form>
    </div>

    <div class="spread mb-2" style="flex-wrap:wrap;gap:10px;align-items:center">
      <div class="chips filter-row" id="jug-eq">
        <span class="chips-label">Equipo</span>
        <button class="chip ${jugEq === 'all' ? 'active' : ''}" data-eq="all">Todos (${jugs.length})</button>
        ${equiposJr.map(e => `<button class="chip ${jugEq === e.id ? 'active' : ''}" data-eq="${esc(e.id)}">${esc(e.nombre)} (${nEq[e.id] || 0})</button>`).join('')}
      </div>
      <input class="input" id="jug-q" placeholder="Buscar por nombre…" value="${esc(jugQ)}" style="max-width:220px">
    </div>

    <div class="table-wrap"><table class="tbl">
      <thead><tr><th style="width:40px">#</th><th>Nombre</th><th>Equipo</th><th class="num">Edad</th><th></th></tr></thead>
      <tbody>${list.map((j, i) => `<tr>
        <td class="muted">${i + 1}</td>
        <td style="font-weight:600">${esc(j.nombre)}</td>
        <td>${esc(byId[j.equipo]?.nombre || j.equipo)}</td>
        <td class="num">${j.edad ?? '—'}</td>
        <td style="text-align:right;white-space:nowrap"><button class="btn btn-secondary btn-sm" data-edit="${esc(j.id)}">✎</button> <button class="btn btn-danger btn-sm" data-del="${esc(j.id)}">✕</button></td>
      </tr>`).join('') || `<tr><td colspan="5" class="muted center">${jugs.length ? 'Sin jugadores para el filtro.' : 'Aún no hay jugadores. Importa el archivo jugadores.json arriba.'}</td></tr>`}</tbody>
    </table></div>
    ${list.length ? `<p class="muted mt-2" style="font-size:.85rem">Mostrando ${list.length} de ${jugs.length} jugadores.</p>` : ''}`;

  // Importación masiva
  el.querySelector('#jugimport').onclick = async () => {
    const f = el.querySelector('#jugfile').files?.[0];
    if (!f) { toast('Primero elige el archivo jugadores.json', 'error'); return; }
    let arr;
    try { arr = JSON.parse(await f.text()); } catch (_) { toast('El archivo no es un JSON válido', 'error'); return; }
    if (!Array.isArray(arr) || !arr.length) { toast('El JSON no tiene jugadores', 'error'); return; }
    const clean = arr.filter(j => j && j.id && j.nombre && j.equipo)
      .map(j => ({ id: String(j.id), equipo: String(j.equipo), nombre: String(j.nombre), edad: (j.edad == null || j.edad === '') ? null : +j.edad }));
    if (!clean.length) { toast('El JSON no tiene el formato esperado (id, equipo, nombre)', 'error'); return; }
    if (!confirm(`Se importarán/actualizarán ${clean.length} jugadores en la base. No se borra nada existente. ¿Continuar?`)) return;
    const btn = el.querySelector('#jugimport'); btn.disabled = true; btn.textContent = 'Importando…';
    try { const n = await importJugadores(clean); toast(`Listo: ${n} jugadores en la base ✓`, 'success'); await loadAll(); renderTab(); }
    catch (err) { toast(err.message || 'Error al importar', 'error'); btn.disabled = false; btn.textContent = 'Importar / actualizar desde archivo'; }
  };

  // Alta / edición manual
  el.querySelector('#f-jug').onsubmit = (ev) => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    d.edad = d.edad === '' ? null : +d.edad;
    if (editJug) d.id = editJug.id;
    else d.id = `${d.equipo}-m${Date.now().toString(36)}`; // id manual único
    reload('jug', () => saveJugador(d)).then(() => { editJug = null; });
  };
  el.querySelector('#jug-cancel') && (el.querySelector('#jug-cancel').onclick = () => { editJug = null; renderTab(); });
  el.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => { editJug = (C.jugadores || []).find(x => x.id === b.dataset.edit); renderTab(); window.scrollTo(0, 0); });
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (confirm('¿Eliminar este jugador de la base?')) reload('jug', () => deleteJugador(b.dataset.del)); });

  // Filtros
  el.querySelectorAll('#jug-eq .chip').forEach(c => c.onclick = () => { jugEq = c.dataset.eq; renderTab(); });
  const qi = el.querySelector('#jug-q');
  if (qi) qi.oninput = (e) => { jugQ = e.target.value; const pos = e.target.selectionStart; renderTab(); const n = document.getElementById('jug-q'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) {} } };
}

/* ---------- FIXTURE (vista Programación editable: cancha + premio) ---------- */
let FXSERIE = null;
const FX_HORDEN = ['10:40', '12:20'];
const FX_CANCHAS = [1, 2, 3, 4];

function renderFixture(el) {
  const byId = equiposById(C.equipos);
  const series = [...new Set(C.partidos.map(p => p.serie || 'libre'))];
  if (!FXSERIE || !series.includes(FXSERIE)) FXSERIE = series.includes('libre') ? 'libre' : series[0];
  const serieName = id => (C.config.series || []).find(s => s.id === id)?.nombre || id;
  const nm = id => esc(byId[id]?.nombre || id);
  const logo = id => { const l = byId[id]?.logo; return l ? `<img src="${esc(l)}" alt="" style="width:22px;height:22px;border-radius:50%;object-fit:cover;vertical-align:middle">` : ''; };

  const list = C.partidos.filter(p => (p.serie || 'libre') === FXSERIE && !p.amistoso && p.fecha_num != null);
  const groups = {};
  list.forEach(p => { (groups[p.fecha_num] = groups[p.fecha_num] || []).push(p); });
  const fechas = Object.keys(groups).map(Number).sort((a, b) => a - b);
  const sortRows = arr => arr.slice().sort((a, b) =>
    (FX_HORDEN.indexOf(a.hora) - FX_HORDEN.indexOf(b.hora)) || ((+a.cancha || 0) - (+b.cancha || 0)));

  const serieChipRow = series.length > 1 ? `
    <div class="chips filter-row mb-2" id="fx-serie-sel">
      <span class="chips-label">Serie</span>
      ${series.map(s => `<button class="chip ${FXSERIE === s ? 'active' : ''}" data-serie="${esc(s)}">${esc(serieName(s))}</button>`).join('')}
    </div>` : '';

  if (!fechas.length) {
    el.innerHTML = `${serieChipRow}<div class="alert alert-warn">No hay fixture publicado para esta serie.</div>`;
    el.querySelectorAll('#fx-serie-sel .chip').forEach(c => c.onclick = () => { FXSERIE = c.dataset.serie; renderTab(); });
    return;
  }

  el.innerHTML = `
    <p class="muted mb-2">Misma vista que la <a href="/programacion" data-link>Programación</a>, editable. Cambia la <strong>cancha</strong> y escribe el <strong>premio</strong> (marca que presenta el premio al mejor jugador) de cada partido. El desplegable de cancha respeta la única regla dura: <strong>grabados y clásicos van sí o sí en cancha 1 o 2</strong>. Los no grabados pueden ir en cualquier cancha que esté libre en ese horario (incluida la 1 o 2 si no la usa un grabado), y nunca dos partidos en la misma cancha y horario. Guarda por fecha. No modifica horarios, rivales, grabados ni clásicos.</p>
    ${serieChipRow}
    ${fechas.map(n => {
      const rows = sortRows(groups[n]);
      const cams = [...new Set(rows.filter(p => p.grabado).map(p => p.cancha))].sort((a, b) => a - b);
      const nGrab = rows.filter(p => p.grabado).length;
      const jugada = rows.some(p => p.estado === 'finalizado');
      return `
      <div class="card mb-2" data-fxfecha="${n}">
        <div class="spread mb-2" style="align-items:center">
          <h3 style="margin:0">Fecha ${n}${jugada ? ' <span class="pill pill-green" style="font-weight:600">jugada</span>' : ''}</h3>
          ${nGrab ? `<span class="muted" style="font-size:.85rem">${icon('video', { size: 14 })} ${nGrab} grabados · cámaras cancha ${cams.join(' y ')}</span>` : ''}
        </div>
        <div class="table-wrap"><table class="tbl fixture-pub">
          <thead><tr><th>Hora</th><th>Cancha</th><th>Partido</th><th>Camarín. L/V</th><th>Grab.</th><th>Premio</th></tr></thead>
          <tbody>
            ${rows.map(p => {
              // Única regla dura: grabado/clásico → cancha 1 o 2. No grabado → cualquier cancha libre.
              const allowed = (p.grabado || p.clasico) ? [1, 2] : [1, 2, 3, 4];
              const occupied = rows.filter(o => o.id !== p.id && (o.hora || '') === (p.hora || '')).map(o => String(o.cancha));
              const show = [...new Set([...allowed.map(String), String(p.cancha)])]
                .filter(v => v && v !== 'null' && v !== 'undefined').sort();
              const opts = show.map(c => {
                const taken = occupied.includes(String(c));
                const seld = String(p.cancha) === String(c);
                return `<option value="${c}" ${seld ? 'selected' : ''} ${taken && !seld ? 'disabled' : ''}>Cancha ${c}${taken && !seld ? ' (ocupada)' : ''}</option>`;
              }).join('');
              return `<tr class="${p.clasico ? 'is-clasico' : ''}" data-row="${esc(p.id)}" data-hora="${esc(p.hora || '')}" data-allowed="${allowed.join(',')}" data-cancha0="${esc(p.cancha ?? '')}" data-premio0="${esc(p.premio ?? '')}">
                <td style="white-space:nowrap;font-weight:600">${esc(p.hora || '—')}</td>
                <td><select class="select fx-cancha" style="min-width:130px">${opts}</select></td>
                <td><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">${logo(p.local)} <span style="font-weight:600">${nm(p.local)}</span> <span class="muted">vs</span> ${logo(p.visita)} <span style="font-weight:600">${nm(p.visita)}</span>${p.clasico ? `<span class="pill pill-brand">${icon('flame', { size: 12 })} Clásico</span>` : ''}</div></td>
                <td class="muted fx-cam" style="white-space:nowrap">${(cam => `${cam[0] ?? '—'} / ${cam[1] ?? '—'}`)(camarinesPorCancha(p.cancha))}</td>
                <td>${p.grabado ? icon('video', { size: 16, cls: 'ico-grab' }) : '<span class="muted">—</span>'}</td>
                <td><input class="input fx-premio" style="min-width:160px" value="${esc(p.premio ?? '')}" placeholder="Marca del premio"></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table></div>
        <div class="row mt-2"><button class="btn btn-primary btn-sm" data-savefx="${n}">Guardar cambios de la Fecha ${n}</button></div>
      </div>`;
    }).join('')}
  `;

  el.querySelectorAll('#fx-serie-sel .chip').forEach(c => c.onclick = () => { FXSERIE = c.dataset.serie; renderTab(); });

  // Desplegables de cancha reactivos: al cambiar uno, recalcula qué canchas quedan libres
  // en cada horario para permitir intercambios (swaps) sin bloqueos.
  const fxRefresh = (card) => {
    const rows = [...card.querySelectorAll('tr[data-row]')].map(tr => ({
      tr, hora: tr.dataset.hora, val: String(tr.querySelector('.fx-cancha').value),
      allowed: (tr.dataset.allowed || '').split(',').filter(Boolean)
    }));
    rows.forEach(row => {
      const occ = rows.filter(o => o.tr !== row.tr && o.hora === row.hora).map(o => o.val);
      const sel = row.tr.querySelector('.fx-cancha');
      const chosen = String(sel.value);
      const show = [...new Set([...row.allowed, chosen])].filter(v => v && v !== 'null' && v !== 'undefined').sort();
      sel.innerHTML = show.map(c => {
        const taken = occ.includes(String(c));
        const seld = chosen === String(c);
        return `<option value="${c}" ${seld ? 'selected' : ''} ${taken && !seld ? 'disabled' : ''}>Cancha ${c}${taken && !seld ? ' (ocupada)' : ''}</option>`;
      }).join('');
      // Camarines siguen a la cancha: C1→1,2 · C3→3,4 · C2→5,6 · C4→7,8
      const camCell = row.tr.querySelector('.fx-cam');
      if (camCell) { const cam = camarinesPorCancha(chosen); camCell.textContent = `${cam[0] ?? '—'} / ${cam[1] ?? '—'}`; }
    });
  };
  el.querySelectorAll('[data-fxfecha]').forEach(card => {
    fxRefresh(card);
    card.querySelectorAll('.fx-cancha').forEach(s => s.addEventListener('change', () => fxRefresh(card)));
  });

  el.querySelectorAll('[data-savefx]').forEach(btn => btn.onclick = async () => {
    const card = btn.closest('[data-fxfecha]');
    const fn = card.dataset.fxfecha;
    const trs = [...card.querySelectorAll('tr[data-row]')];
    // Validar: una cancha por partido en cada horario
    const seen = {};
    let dup = null;
    for (const tr of trs) {
      const key = tr.dataset.hora + '|' + tr.querySelector('.fx-cancha').value;
      if (seen[key]) { dup = tr.querySelector('.fx-cancha').value; break; }
      seen[key] = true;
    }
    if (dup) { toast(`Dos partidos quedaron en la Cancha ${dup} a la misma hora. Corrige antes de guardar.`, 'error'); return; }
    // Única regla dura: grabado/clásico debe ir en cancha 1 o 2.
    let bad = null;
    for (const tr of trs) {
      const p = C.partidos.find(x => x.id === tr.dataset.row);
      const c = +tr.querySelector('.fx-cancha').value;
      if (p && (p.grabado || p.clasico) && !(c === 1 || c === 2)) {
        bad = 'Los grabados/clásicos deben ir en cancha 1 o 2.'; break;
      }
    }
    if (bad) { toast(bad, 'error'); return; }
    // Diff cancha + premio
    const ups = [];
    trs.forEach(tr => {
      const chg = {};
      const c = tr.querySelector('.fx-cancha').value;
      const pr = tr.querySelector('.fx-premio').value.trim();
      if (String(c) !== String(tr.dataset.cancha0)) {
        chg.cancha = +c;
        // Los camarines se guardan según la cancha (C1→1,2 · C3→3,4 · C2→5,6 · C4→7,8)
        const cam = camarinesPorCancha(c);
        chg.camarinLocal = cam[0]; chg.camarinVisita = cam[1];
      }
      if (pr !== (tr.dataset.premio0 || '')) chg.premio = pr;
      if (Object.keys(chg).length) { chg.id = tr.dataset.row; ups.push(chg); }
    });
    if (!ups.length) { toast('No hay cambios en esta fecha.'); return; }
    btn.disabled = true; btn.textContent = 'Guardando…';
    try {
      for (const u of ups) await savePartido(u);
      toast(`Guardado: ${ups.length} partido(s) de la Fecha ${fn} ✓`, 'success');
      await loadAll(); renderTab();
    } catch (err) {
      toast(err.message || 'Error al guardar', 'error');
      btn.disabled = false; btn.textContent = `Guardar cambios de la Fecha ${fn}`;
    }
  });
}

/* ---------- DISCIPLINA ---------- */
let discFecha = 'all';
let editT = null;

function renderDisciplina(el) {
  const byId = equiposById(C.equipos);
  const nmEq = id => byId[id]?.nombre || id || '—';
  const cards = C.disciplina.slice();

  // Fechas disponibles (de tarjetas + fixture)
  const fechasSet = new Set();
  cards.forEach(t => { if (t.fecha_num != null) fechasSet.add(+t.fecha_num); });
  C.partidos.forEach(p => { if (p.fecha_num != null) fechasSet.add(+p.fecha_num); });
  const fechas = [...fechasSet].sort((a, b) => a - b);

  // Próxima fecha (para el panel de suspendidos)
  const prog = C.partidos.filter(p => p.estado !== 'finalizado' && p.fecha_num != null).map(p => +p.fecha_num);
  const jug = C.partidos.filter(p => p.estado === 'finalizado' && p.fecha_num != null).map(p => +p.fecha_num);
  const proxFecha = prog.length ? Math.min(...prog) : (jug.length ? Math.max(...jug) + 1 : null);
  const susp = proxFecha ? suspendidosParaFecha(cards, proxFecha) : [];

  const list = cards
    .filter(t => discFecha === 'all' || +t.fecha_num === +discFecha)
    .sort((a, b) => (+a.fecha_num || 0) - (+b.fecha_num || 0) || (a.jugador || '').localeCompare(b.jugador || ''));

  const tipoBadge = t => t.tipo === 'roja'
    ? `<span class="pill pill-red"><span class="tarjeta tarjeta-roja"></span> ${t.claseRoja === 'doble' ? 'Roja (2ª amarilla)' : 'Roja'}</span>`
    : `<span class="pill" style="background:var(--c-accent-soft,#fdf3d7);color:var(--c-accent-deep,#8a5a00)"><span class="tarjeta tarjeta-amarilla"></span> Amarilla</span>`;

  const t = editT ? cards.find(x => x.id === editT) : null;

  // ---- Panel editor (arriba) ----
  let editorHTML = '';
  if (t) {
    if (t.tipo === 'amarilla') {
      editorHTML = `
        <div class="card mb-3" style="border-left:4px solid var(--c-accent,#eab308)">
          <h3 class="mb-1">Editar amarilla — ${esc(t.jugador || '—')} <span class="muted" style="font-weight:400">· ${esc(nmEq(t.equipo))} · Fecha ${esc(t.fecha_num ?? '—')}</span></h3>
          <p class="muted" style="font-size:.88rem">Las amarillas no tienen suspensión por sí solas. Al acumular <strong>${AMARILLAS_PARA_SUSPENSION}</strong> en el torneo se aplica <strong>1 fecha</strong> automática.</p>
          <div class="form-group"><label>Motivo (opcional)</label><input class="input" id="t-motivo" value="${esc(t.motivo || '')}" placeholder="Ej: juego brusco"></div>
          <div class="row"><button class="btn btn-primary" id="t-save">Guardar</button><button class="btn btn-ghost" id="t-cancel">Cancelar</button></div>
        </div>`;
    } else {
      const clase = t.claseRoja || 'directa';
      const faltaOpts = FALTAS_ROJA.map(f => `<option value="${f.id}" ${t.faltaId === f.id ? 'selected' : ''}>${esc(f.falta)} — ${sancionTexto(f)}</option>`).join('');
      editorHTML = `
        <div class="card mb-3" style="border-left:4px solid var(--c-red)">
          <h3 class="mb-1">Editar roja — ${esc(t.jugador || '—')} <span class="muted" style="font-weight:400">· ${esc(nmEq(t.equipo))} · Fecha ${esc(t.fecha_num ?? '—')}</span></h3>
          <div class="form-group"><label>Clase de roja</label>
            <select class="select" id="t-clase">
              <option value="directa" ${clase === 'directa' ? 'selected' : ''}>Roja directa</option>
              <option value="doble" ${clase === 'doble' ? 'selected' : ''}>Doble amarilla (doble amonestación)</option>
            </select>
          </div>
          <div id="t-doble-note" class="muted" style="font-size:.88rem;display:${clase === 'doble' ? 'block' : 'none'};margin-bottom:8px">La doble amonestación <strong>no tiene suspensión</strong> para la fecha siguiente.</div>
          <div id="t-directa" style="display:${clase === 'directa' ? 'block' : 'none'}">
            <div class="form-group"><label>Falta tipificada (reglamento de disciplina)</label>
              <select class="select" id="t-falta"><option value="">— elige la falta —</option>${faltaOpts}</select>
            </div>
            <div class="form-group" id="t-fechas-wrap" style="display:none;max-width:220px"><label>Fechas de suspensión (comité)</label><input class="input" id="t-fechas" type="number" min="1" value="${esc(t.fechas ?? '')}"></div>
            <div id="t-sancion-preview" class="mb-2"></div>
          </div>
          <div class="row"><button class="btn btn-primary" id="t-save">Guardar</button><button class="btn btn-ghost" id="t-cancel">Cancelar</button></div>
        </div>`;
    }
  }

  el.innerHTML = `
    ${proxFecha ? `
    <div class="card mb-3" style="border-left:4px solid var(--c-red)">
      <div class="spread" style="align-items:center"><h3 style="margin:0">${icon('shield', { size: 18 })} Suspendidos para la Fecha ${proxFecha}</h3><span class="muted" style="font-size:.85rem">Se calcula solo</span></div>
      ${susp.length ? `<div class="table-wrap mt-2"><table class="tbl">
        <thead><tr><th>Jugador</th><th>Equipo</th><th>Motivo</th><th>Se pierde</th></tr></thead>
        <tbody>${susp.map(s => `<tr><td style="font-weight:700">${esc(s.nombre || '—')}</td><td class="muted">${esc(nmEq(s.equipo))}</td><td class="muted">${esc(s.motivo || '')}</td><td><span class="pill pill-red">${s.definitivo ? 'Expulsado' : (s.hasta > s.desde ? `Fechas ${s.desde}–${s.hasta}` : `Fecha ${s.desde}`)}</span></td></tr>`).join('')}</tbody>
      </table></div>` : '<p class="muted mt-1" style="margin:0">Sin suspendidos para la próxima fecha ✔️</p>'}
    </div>` : ''}

    ${editorHTML}

    <div class="spread mb-2" style="flex-wrap:wrap;gap:8px;align-items:center">
      <h3 style="margin:0">Tarjetas registradas</h3>
      <div class="chips filter-row" id="disc-fechas">
        <span class="chips-label">Fecha</span>
        <button class="chip ${discFecha === 'all' ? 'active' : ''}" data-f="all">Todas</button>
        ${fechas.map(f => `<button class="chip ${+discFecha === f ? 'active' : ''}" data-f="${f}">Fecha ${f}</button>`).join('')}
      </div>
    </div>
    <p class="muted mb-2" style="font-size:.88rem">Las tarjetas se cargan en <strong>Goles y tarjetas</strong>. Aquí editas cada <strong>roja</strong> para tipificar la falta y fijar la sanción automáticamente.</p>
    <div class="table-wrap"><table class="tbl">
      <thead><tr><th>Fecha</th><th>Tipo</th><th>Jugador</th><th>Equipo</th><th>Falta / motivo</th><th>Sanción</th><th></th></tr></thead>
      <tbody>${list.map(t => `<tr>
        <td class="muted">${esc(t.fecha_num != null ? 'F' + t.fecha_num : fmtDate(t.fecha))}</td>
        <td style="white-space:nowrap">${tipoBadge(t)}</td>
        <td style="font-weight:600">${esc(t.jugador || '—')}</td>
        <td class="muted">${esc(nmEq(t.equipo))}</td>
        <td class="muted">${esc(t.falta || t.motivo || (t.tipo === 'roja' ? '— sin tipificar —' : ''))}</td>
        <td>${t.sancion ? `<span class="pill pill-dark">${esc(t.sancion)}</span>` : (t.tipo === 'roja' ? '<span class="pill" style="background:#fde68a;color:#78350f">pendiente</span>' : '<span class="muted">—</span>')}</td>
        <td style="text-align:right;white-space:nowrap"><button class="btn btn-secondary btn-sm" data-edit="${esc(t.id)}">✎</button> <button class="btn btn-danger btn-sm" data-del="${esc(t.id)}">✕</button></td>
      </tr>`).join('') || `<tr><td colspan="7" class="muted center">${cards.length ? 'Sin tarjetas para esta fecha.' : 'Sin tarjetas. Cárgalas en «Goles y tarjetas».'}</td></tr>`}</tbody>
    </table></div>`;

  // Filtros de fecha
  el.querySelectorAll('#disc-fechas .chip').forEach(c => c.onclick = () => { discFecha = c.dataset.f === 'all' ? 'all' : +c.dataset.f; renderTab(); });
  // Editar / borrar
  el.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => { editT = b.dataset.edit; renderTab(); window.scrollTo(0, 0); });
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (confirm('¿Eliminar esta tarjeta?')) { editT = null; reload('d', () => deleteTarjeta(b.dataset.del)); } });

  // Wiring del editor
  if (t) {
    el.querySelector('#t-cancel').onclick = () => { editT = null; renderTab(); };
    if (t.tipo === 'amarilla') {
      el.querySelector('#t-save').onclick = () => {
        const motivo = el.querySelector('#t-motivo').value.trim();
        editT = null;
        reload('d', () => saveTarjeta({ id: t.id, motivo }));
      };
    } else {
      const claseSel = el.querySelector('#t-clase');
      const directa = el.querySelector('#t-directa');
      const dobleNote = el.querySelector('#t-doble-note');
      const faltaSel = el.querySelector('#t-falta');
      const fechasWrap = el.querySelector('#t-fechas-wrap');
      const fechasInp = el.querySelector('#t-fechas');
      const preview = el.querySelector('#t-sancion-preview');
      const refreshFalta = () => {
        const f = faltaById(faltaSel.value);
        if (!f) { preview.innerHTML = ''; fechasWrap.style.display = 'none'; return; }
        preview.innerHTML = `<span class="pill ${f.via === 'auto' ? 'pill-green' : 'pill-dark'}">${f.via === 'auto' ? 'Automática' : 'Comité'}</span> <strong>${esc(sancionTexto(f))}</strong>`;
        if (f.definitivo) { fechasWrap.style.display = 'none'; }
        else if (f.via === 'comite') { fechasWrap.style.display = 'block'; if (!fechasInp.value) fechasInp.value = f.min; fechasInp.min = f.min; if (f.max) fechasInp.max = f.max; }
        else { fechasWrap.style.display = 'none'; } // auto: 1 fecha fija
      };
      const refreshClase = () => {
        const dir = claseSel.value === 'directa';
        directa.style.display = dir ? 'block' : 'none';
        dobleNote.style.display = dir ? 'none' : 'block';
      };
      claseSel.onchange = refreshClase;
      faltaSel.onchange = refreshFalta;
      refreshClase(); refreshFalta();
      el.querySelector('#t-save').onclick = () => {
        let doc;
        if (claseSel.value === 'doble') {
          doc = { id: t.id, claseRoja: 'doble', faltaId: null, falta: 'Doble amonestación', via: null, definitivo: false, fechas: 0, sancion: 'Sin suspensión (doble amarilla)' };
        } else {
          const f = faltaById(faltaSel.value);
          if (!f) { toast('Elige la falta tipificada.', 'error'); return; }
          let fechas = 0, sancion = '';
          if (f.definitivo) { fechas = null; sancion = 'Expulsión definitiva de la LIV'; }
          else if (f.via === 'auto') { fechas = 1; sancion = sancionTexto(f); }
          else { fechas = Math.max(f.min, +fechasInp.value || f.min); sancion = `${fechas} fecha${fechas > 1 ? 's' : ''} (comité · rango ${sancionTexto(f)})`; }
          doc = { id: t.id, claseRoja: 'directa', faltaId: f.id, falta: f.falta, via: f.via, definitivo: !!f.definitivo, fechas, sancion };
        }
        editT = null;
        reload('d', () => saveTarjeta(doc));
      };
    }
  }
}

/* ---------- INSCRIPCIONES ---------- */
const CUOTAS_DEF = [
  { label: '1ª cuota', venc: 'Antes del inicio del torneo (29 ago)' },
  { label: '2ª cuota', venc: 'Antes del 18 de septiembre' },
  { label: '3ª cuota', venc: 'Antes del 1er sábado de octubre (3 oct)' },
  { label: '4ª cuota', venc: 'Antes del 1er sábado de noviembre (7 nov)' }
];
const clp = n => (+n || 0).toLocaleString('es-CL');

function renderInscripciones(el) {
  const rows = (C.inscripciones || []).slice().sort((a, b) => (b.creada || 0) - (a.creada || 0));
  const serieName = id => (C.config.series || []).find(s => s.id === id)?.nombre || (id === 'senior' ? 'Senior' : 'Junior');
  const equipos = C.equipos.slice().sort((a, b) => (a.serie || '').localeCompare(b.serie || '') || a.nombre.localeCompare(b.nombre));
  const pagoMap = {}; (C.pagos || []).forEach(p => { pagoMap[p.id] = p; });
  const getM = (eq, i) => { const p = pagoMap[eq]; return p && p.montos ? (p.montos[i] ?? '') : ''; };
  const getP = (eq, i) => { const p = pagoMap[eq]; return !!(p && p.pagadas && p.pagadas[i]); };

  const rowFn = e => `
    <tr data-eq="${esc(e.id)}">
      <td style="font-weight:600;line-height:1.25">${esc(e.nombre)}</td>
      ${[0, 1, 2, 3].map(i => `
        <td><input class="input cuota-m" data-i="${i}" type="number" min="0" step="1000" value="${esc(getM(e.id, i))}" placeholder="0"></td>
        <td style="text-align:center"><input type="checkbox" class="cuota-p" data-i="${i}" ${getP(e.id, i) ? 'checked' : ''}></td>`).join('')}
      <td class="num row-total" style="font-weight:700">$0</td>
      <td class="num row-pag" style="font-weight:600;color:var(--c-brand)">$0</td>
    </tr>`;
  const tablaGrupo = (titulo, eqs) => !eqs.length ? '' : `
    <h4 style="margin:16px 0 6px">${titulo} <span class="muted" style="font-weight:400;font-size:.85rem">· ${eqs.length} equipo${eqs.length === 1 ? '' : 's'}</span></h4>
    <div class="table-wrap"><table class="tbl pagos-tbl">
      <colgroup>
        <col class="c-eq">
        ${[0, 1, 2, 3].map(() => '<col class="c-m"><col class="c-chk">').join('')}
        <col class="c-tot"><col class="c-tot">
      </colgroup>
      <thead>
        <tr>
          <th rowspan="2" style="vertical-align:bottom">Equipo</th>
          ${CUOTAS_DEF.map(c => `<th colspan="2" style="text-align:center">${c.label}<div style="font-weight:400;font-size:.72rem;color:rgba(255,255,255,.82)">${c.venc}</div></th>`).join('')}
          <th rowspan="2" class="num" style="vertical-align:bottom">Total</th>
          <th rowspan="2" class="num" style="vertical-align:bottom">Pagado</th>
        </tr>
        <tr>${CUOTAS_DEF.map(() => `<th class="num" style="font-weight:600">Monto</th><th style="text-align:center;font-weight:600">✓</th>`).join('')}</tr>
      </thead>
      <tbody>${eqs.map(rowFn).join('')}</tbody>
      <tfoot>
        <tr style="border-top:2px solid var(--border,#ddd);font-weight:700">
          <td>Total ${esc(titulo)}</td>
          ${[0, 1, 2, 3].map(i => `<td class="num col-total" data-i="${i}">$0</td><td></td>`).join('')}
          <td class="num grp-total">$0</td>
          <td class="num grp-pag" style="color:var(--c-brand)">$0</td>
        </tr>
      </tfoot>
    </table></div>`;

  const junior = equipos.filter(e => (e.serie || 'libre') !== 'senior');
  const senior = equipos.filter(e => e.serie === 'senior');

  const pagosCard = `
    <div class="card mb-3">
      <div class="spread mb-1" style="align-items:center;flex-wrap:wrap;gap:8px">
        <h3 style="margin:0">${icon('clipboard', { size: 18 })} Cuotas por equipo</h3>
        <button class="btn btn-primary btn-sm" id="pagos-save">Guardar cambios de cuotas</button>
      </div>
      <p class="muted mb-2" style="font-size:.86rem">Cada equipo tiene su propio trato: escribe el monto de cada cuota (en pesos) y marca ✓ cuando esté pagada. El total y lo pagado se calculan solos. Datos privados (solo admin).</p>
      <style>
        .pagos-tbl{width:100%;table-layout:fixed;font-size:.82rem}
        .pagos-tbl th,.pagos-tbl td{padding:7px 5px}
        .pagos-tbl col.c-eq{width:15%}
        .pagos-tbl col.c-m{width:12.5%}
        .pagos-tbl col.c-chk{width:3.6%}
        .pagos-tbl col.c-tot{width:9%}
        .pagos-tbl .cuota-m{width:100%;min-width:0;box-sizing:border-box;padding:6px 6px;text-align:right}
        .pagos-tbl .cuota-p{margin:0}
        .pagos-tbl .num{white-space:nowrap}
      </style>
      <div id="pagos-wrap">
        ${tablaGrupo('Junior', junior)}
        ${tablaGrupo('Senior', senior)}
      </div>
    </div>`;

  el.innerHTML = `
    ${pagosCard}
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

  // ---- Cuotas: totales en vivo (por grupo Junior/Senior) ----
  const wrap = el.querySelector('#pagos-wrap');
  const recompute = () => {
    if (!wrap) return;
    wrap.querySelectorAll('.pagos-tbl').forEach(tbl => {
      const colTot = [0, 0, 0, 0]; let grand = 0, grandPag = 0;
      tbl.querySelectorAll('tbody tr[data-eq]').forEach(tr => {
        let tot = 0, pag = 0;
        tr.querySelectorAll('.cuota-m').forEach(inp => {
          const i = +inp.dataset.i; const v = +inp.value || 0;
          tot += v; colTot[i] += v;
          const chk = tr.querySelector(`.cuota-p[data-i="${i}"]`);
          if (chk && chk.checked) pag += v;
        });
        tr.querySelector('.row-total').textContent = '$' + clp(tot);
        tr.querySelector('.row-pag').textContent = '$' + clp(pag);
        grand += tot; grandPag += pag;
      });
      tbl.querySelectorAll('.col-total').forEach(td => { td.textContent = '$' + clp(colTot[+td.dataset.i]); });
      const gt = tbl.querySelector('.grp-total'); if (gt) gt.textContent = '$' + clp(grand);
      const gp = tbl.querySelector('.grp-pag'); if (gp) gp.textContent = '$' + clp(grandPag);
    });
  };
  if (wrap) { wrap.addEventListener('input', recompute); wrap.addEventListener('change', recompute); recompute(); }

  // ---- Guardar cuotas (solo equipos que cambiaron) ----
  el.querySelector('#pagos-save').onclick = async () => {
    const btn = el.querySelector('#pagos-save');
    const ups = [];
    wrap.querySelectorAll('tbody tr[data-eq]').forEach(tr => {
      const eq = tr.dataset.eq;
      const montos = [null, null, null, null], pagadas = [false, false, false, false];
      tr.querySelectorAll('.cuota-m').forEach(inp => { montos[+inp.dataset.i] = inp.value === '' ? null : (+inp.value || 0); });
      tr.querySelectorAll('.cuota-p').forEach(chk => { pagadas[+chk.dataset.i] = chk.checked; });
      const prev = pagoMap[eq] || {}; const pM = prev.montos || [], pP = prev.pagadas || [];
      const changed = JSON.stringify(montos) !== JSON.stringify([0, 1, 2, 3].map(i => pM[i] ?? null))
        || JSON.stringify(pagadas) !== JSON.stringify([0, 1, 2, 3].map(i => !!pP[i]));
      if (changed) ups.push({ id: eq, montos, pagadas });
    });
    if (!ups.length) { toast('No hay cambios en las cuotas.'); return; }
    btn.disabled = true; btn.textContent = 'Guardando…';
    try { for (const u of ups) await savePagos(u); toast(`Cuotas guardadas: ${ups.length} equipo(s) ✓`, 'success'); await loadAll(); renderTab(); }
    catch (err) { toast(err.message || 'Error al guardar', 'error'); btn.disabled = false; btn.textContent = 'Guardar cambios de cuotas'; }
  };
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
  // Fecha 1 (ya jugada): clásicos reales = Arquitectura-Bayern y Mesa Cuadrada-Los Prados. NO se tocan sus grabados.
  const CLASICOS = ['f1-jr-arquitectura-jr-bayern', 'f1-jr-mesa-cuadrada-jr-los-prados', 'f2-jr-los-pibes-jr-camilo-enriquez', 'f3-jr-40-grados-jr-capibara', 'f4-jr-bunker-jr-arquitectura', 'f5-jr-bayern-jr-huracan', 'f6-jr-los-prados-jr-bunker', 'f7-jr-camilo-enriquez-jr-mesa-cuadrada', 'f8-jr-los-pibes-jr-40-grados', 'f9-jr-huracan-jr-capibara'];
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
