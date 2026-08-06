import {
  getUser, isAdmin, isDemo, login, logout,
  getConfig, saveConfig,
  getEquipos, saveEquipo, deleteEquipo,
  getPartidos, savePartido, deletePartido,
  getDisciplina, saveTarjeta, deleteTarjeta,
  getInscripciones, updateInscripcion, deleteInscripcion,
  getAudiovisual, saveAudiovisual,
  equiposById
} from '../services/store.js';
import { mount, esc, fmtDate } from '../ui/helpers.js';
import { shell, loading } from '../ui/layout.js';
import { toast } from '../ui/toast.js';
import { icon } from '../ui/icons.js';

let TAB = 'partidos';
let C = {}; // cache: config, equipos, partidos, disciplina, inscripciones, av

export async function showAdmin() {
  if (!getUser()) return renderLogin();
  if (!isAdmin()) {
    mount(shell(`<div class="container"><div class="alert alert-error">Tu cuenta no tiene permisos de administrador. Pide que agreguen tu UID a la lista.</div><button class="btn btn-ghost" id="lo">Cerrar sesión</button></div>`));
    document.getElementById('lo').onclick = async () => { await logout(); window.__router.go('/', false); };
    return;
  }
  mount(loading('Cargando panel…'));
  await loadAll();
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
function renderLogin() {
  const inner = `
  <div class="container-narrow">
    <div class="center mb-3"><img src="/assets/logo-mark.png" alt="LIV" style="height:90px;margin:0 auto"></div>
    <div class="card">
      <h2 class="mb-1">Acceso organización</h2>
      <p class="muted mb-2">Panel de administración de la LIV.</p>
      ${isDemo() ? '<div class="alert alert-warn">⚙️ Modo demo: para iniciar sesión y guardar datos, primero configura Firebase (ver README).</div>' : ''}
      <form id="login-form">
        <div class="form-group"><label>Email</label><input class="input" name="email" type="email" required></div>
        <div class="form-group"><label>Contraseña</label><input class="input" name="pass" type="password" required></div>
        <button class="btn btn-primary btn-block btn-lg" id="btn-login">Ingresar</button>
      </form>
    </div>
    <p class="center mt-2"><a href="/" data-link class="muted">← Volver al sitio</a></p>
  </div>`;
  mount(shell(inner, {}));
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-login');
    const { email, pass } = Object.fromEntries(new FormData(e.target).entries());
    btn.disabled = true; btn.textContent = 'Ingresando…';
    try { await login(email, pass); toast('Bienvenido', 'success'); /* main re-renderiza al cambiar auth */ }
    catch (err) { toast(err.message || 'No se pudo iniciar sesión', 'error'); btn.disabled = false; btn.textContent = 'Ingresar'; }
  });
}

/* ---------------- PANEL ---------------- */
const TABS = [
  { id: 'partidos', label: `${icon('calendar', { size: 16 })} Partidos` },
  { id: 'equipos', label: `${icon('users', { size: 16 })} Equipos` },
  { id: 'disciplina', label: `${icon('cards', { size: 16 })} Disciplina` },
  { id: 'inscripciones', label: `${icon('clipboard', { size: 16 })} Inscripciones` },
  { id: 'contenido', label: `${icon('settings', { size: 16 })} Contenido` }
];

function renderPanel() {
  const inner = `
  <div class="container">
    <div class="spread mb-2">
      <div><span class="eyebrow">Panel de administración</span><h1 style="margin:0">LIV Admin</h1></div>
      <div class="row">
        <span class="pill ${isDemo() ? 'pill-red' : 'pill-green'}">${isDemo() ? 'DEMO (sin Firebase)' : 'Conectado'}</span>
        <button class="btn btn-ghost btn-sm" id="btn-logout">Cerrar sesión</button>
      </div>
    </div>
    <div class="tabs" id="admin-tabs">
      ${TABS.map(t => `<button data-tab="${t.id}" class="${TAB === t.id ? 'active' : ''}">${t.label}</button>`).join('')}
    </div>
    <div id="tab-content"></div>
  </div>`;
  mount(shell(inner, C.config));
  document.getElementById('btn-logout').onclick = async () => { await logout(); window.__router.go('/', false); };
  document.querySelectorAll('#admin-tabs button').forEach(b => b.onclick = () => { TAB = b.dataset.tab; renderPanel(); });
  renderTab();
}

function renderTab() {
  const el = document.getElementById('tab-content');
  if (TAB === 'equipos') return renderEquipos(el);
  if (TAB === 'partidos') return renderPartidos(el);
  if (TAB === 'disciplina') return renderDisciplina(el);
  if (TAB === 'inscripciones') return renderInscripciones(el);
  if (TAB === 'contenido') return renderContenido(el);
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
    d.fecha_num = d.fecha_num ? +d.fecha_num : null;
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
}
