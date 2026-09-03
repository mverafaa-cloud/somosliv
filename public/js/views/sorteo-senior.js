import { isAdmin, logout, getConfig, getEquipos, getPartidos, saveEquipo, deleteEquipo, savePartido, publishFixture, borrarFixtureSerie, isDemo, sandboxOn } from '../services/store.js';
import { mount, esc, teamInline } from '../ui/helpers.js';
import { shell, loading } from '../ui/layout.js';
import { icon } from '../ui/icons.js';
import { toast } from '../ui/toast.js';
import { renderLogin } from './admin.js';
import { generarFixtureSenior, sabadosDesde, CAMARINES } from '../services/fixture-senior.js';

const HOR = ['9:00', '10:40'];
let S = null;   // { inicio, excluir, rivalries, result, seedUsed }
let cfg = {}, EQS = [], JR = [], SRP = [];

// Equipos senior que deben existir. AFC sale y entra Gunners (toma su lugar).
const REQUIRED = [
  { id: 'sr-ariel-honores', nombre: 'Ariel Honores', serie: 'senior', logo: '/assets/equipos/ariel-honores.png' },
  { id: 'sr-gunners', nombre: 'Gunners', serie: 'senior', logo: '/assets/equipos/gunners.png' },
  { id: 'sr-equipo-8', nombre: 'Equipo 8', serie: 'senior' }
];
const RETIRAR = ['sr-afc']; // equipos que ya no van en el senior
// Fecha 1 fija por pedido: Históricos vs Equipo 8 y Los Pibes vs Ariel Honores.
// Fecha 1 forzada (los 4 partidos) y el partido de las 10:40.
const FORCED_F1 = [
  ['sr-camilo-enriquez', 'sr-arquitectura'],
  ['sr-los-pibes', 'sr-arsenal'],
  ['sr-ariel-honores', 'sr-gunners'],
  ['sr-historicos', 'sr-equipo-8']
];
const FORCE_1040_F1 = ['sr-ariel-honores', 'sr-gunners'];

export async function showSorteoSenior() {
  if (!isAdmin()) return renderLogin('/sorteo-senior');
  mount(loading('Cargando sorteo senior…'));
  const [config, equipos, partidos] = await Promise.all([getConfig(), getEquipos(), getPartidos()]);
  cfg = config;
  EQS = equipos.filter(e => e.serie === 'senior').map(e => ({ id: e.id, nombre: e.nombre, logo: e.logo }));
  JR = partidos.filter(p => (p.serie || 'libre') === 'libre');
  SRP = partidos.filter(p => (p.serie || 'libre') === 'senior');
  if (!S) S = { inicio: '2026-09-05', excluir: ['2026-09-19', '2026-10-10'], rivalries: [], result: null };
  render();
}

function seniorTeams() { return EQS.filter(t => !RETIRAR.includes(t.id)); } // excluye AFC
function equipo8() { return EQS.find(t => t.id === 'sr-equipo-8' || /equipo\s*8/i.test(t.nombre)); }
function faltantes() { return REQUIRED.filter(r => !EQS.some(e => e.id === r.id)); }
function porRetirar() { return RETIRAR.filter(id => EQS.some(e => e.id === id)); }

// Bloqueo de 10:40 por cruce con el Junior (mismo equipo, misma fecha por calendario).
function buildBlock(fechas) {
  const baseToSenior = {}; EQS.forEach(t => { baseToSenior[t.id.replace(/^sr-/, '')] = t.id; });
  const jrByDate = {};
  JR.filter(p => p.hora === '10:40' && p.fecha).forEach(p => { (jrByDate[p.fecha] = jrByDate[p.fecha] || []).push(p.local, p.visita); });
  const block = {};
  fechas.forEach((d, i) => {
    const set = new Set();
    (jrByDate[d] || []).forEach(jid => { const sid = baseToSenior[String(jid).replace(/^jr-/, '')]; if (sid) set.add(sid); });
    if (set.size) block[i] = [...set];
  });
  return block;
}

// Canchas LIBRES a las 10:40 por fecha = las que el Junior NO ocupa a esa hora.
function buildFree1040(fechas) {
  const jrCourtsByDate = {};
  JR.filter(p => p.hora === '10:40' && p.fecha).forEach(p => { (jrCourtsByDate[p.fecha] = jrCourtsByDate[p.fecha] || new Set()).add(+p.cancha); });
  const free = {};
  fechas.forEach((d, i) => {
    const usadas = jrCourtsByDate[d] || new Set();
    free[i] = [1, 2, 3, 4].filter(c => !usadas.has(c));
  });
  return free;
}

function buildParams() {
  const teams = seniorTeams();
  const n = teams.length;
  const nR = n % 2 === 0 ? n - 1 : n;
  const fechas = sabadosDesde(S.inicio, S.excluir, nR);
  return {
    teams, fechas,
    marcas: ['Auspiciador 1', 'Auspiciador 2', 'Auspiciador 3', 'Auspiciador 4'],
    rivalries: S.rivalries || [],
    block1040: buildBlock(fechas),
    free1040: buildFree1040(fechas),
    forcedFirst: FORCED_F1,
    force1040F1: FORCE_1040_F1,
    equipo8Id: (equipo8() || {}).id || null
  };
}

function render() {
  const teams = seniorTeams();
  const falt = faltantes();
  const retirar = porRetirar();
  const arielSinLogo = EQS.some(e => e.id === 'sr-ariel-honores' && !e.logo);
  const nR = teams.length % 2 === 0 ? teams.length - 1 : teams.length;

  const inner = `
  <div class="container">
    <div class="spread mb-2">
      <div><span class="eyebrow">Panel · Organización</span><h1 style="margin:0">${icon('shuffle', { size: 26 })} Sorteo Fixture — Senior</h1></div>
      <div class="row">
        <a href="/sorteo" data-link class="btn btn-ghost btn-sm">Junior</a>
        <a href="/admin" data-link class="btn btn-ghost btn-sm">${icon('settings', { size: 15 })} Admin</a>
        <button class="btn btn-ghost btn-sm" id="s-logout">Cerrar sesión</button>
      </div>
    </div>
    <p class="subtitle mb-3">Genera el fixture de la serie Senior: 4 partidos por jornada (3 a las 9:00 y 1 a las 10:40), 2 grabados por fecha en cancha 1 y 2, 1 clásico grabado, sin choques de horario con el Junior. La Fecha 1 deja al Equipo 8 sin grabar ni de clásico.</p>

    <div class="card mb-3" style="border-left:4px solid var(--c-brand)">
      <h3 style="margin:0 0 6px">${icon('check', { size: 18 })} Corrección puntual (sin regenerar)</h3>
      <p class="muted" style="margin:0 0 8px">Mantiene el fixture publicado y solo: reemplaza <strong>AFC → Gunners</strong> en todo el torneo, e intercambia <strong>Los Pibes ↔ Históricos</strong> en la <strong>Fecha 1</strong> (deja Históricos vs Equipo 8 y Los Pibes vs Ariel Honores; el resto de la F1 igual). No toca horarios, canchas, grabados ni clásicos.</p>
      <button class="btn btn-primary btn-sm" id="patch-fx">Aplicar corrección al fixture publicado</button>
      <button class="btn btn-danger btn-sm" id="baja-fx" style="margin-left:8px">Bajar fixture senior (quitar de la web)</button>
    </div>

    ${(falt.length || arielSinLogo || retirar.length) ? `
    <div class="card mb-3" style="border-left:4px solid #f59e0b">
      <h3 style="margin:0 0 6px">${icon('users', { size: 18 })} Equipos senior</h3>
      <p class="muted" style="margin:0 0 8px">
        ${retirar.length ? `Se retirará <strong>AFC</strong> y entra <strong>Gunners</strong> en su lugar. ` : ''}
        ${falt.length ? `Faltan por crear: <strong>${falt.map(f => esc(f.nombre)).join(', ')}</strong>. ` : ''}
        ${(!retirar.length && !falt.length && arielSinLogo) ? 'Falta asignar el escudo de Ariel Honores.' : ''}
      </p>
      <button class="btn btn-primary btn-sm" id="crear-eq">Aplicar cambios de equipos (Gunners entra, AFC sale)</button>
      <p class="muted" style="font-size:.82rem;margin:8px 0 0">Crea Gunners (con escudo) y Ariel Honores, retira AFC, y deja el Equipo 8. Luego <strong>renombras el Equipo 8</strong> en <a href="/admin" data-link>Admin → Equipos</a> cuando lo consigas.</p>
    </div>` : ''}

    <div class="card mb-3">
      <h3 class="mb-2">${icon('settings', { size: 18 })} Parámetros</h3>
      <div class="grid grid-2">
        <div><label class="lbl">Debut senior (1ª fecha, sábado)</label><input class="input" type="date" id="p-inicio" value="${esc(S.inicio)}"></div>
        <div><label class="lbl">Equipos senior cargados</label><input class="input" value="${teams.length} equipos · ${nR} fechas" disabled></div>
      </div>
      <label class="lbl mt-2">Días sin juego (excluidos)</label>
      <div id="p-excluir" class="stack-sm">
        ${(S.excluir || []).map((d, i) => `<div class="row"><input class="input" type="date" data-ex="${i}" value="${esc(d)}"><button class="btn btn-danger btn-sm" data-delex="${i}">✕</button></div>`).join('')}
      </div>
      <div class="row mt-1"><button class="btn btn-ghost btn-sm" id="p-addex">+ Día sin juego</button></div>

      <label class="lbl mt-2">Clásicos / rivalidades senior <span class="muted">(opcional)</span></label>
      <div class="row" style="flex-wrap:wrap;gap:8px">
        <select class="select" id="riv-a" style="max-width:200px">${teams.map(t => `<option value="${esc(t.id)}">${esc(t.nombre)}</option>`).join('')}</select>
        <span>vs</span>
        <select class="select" id="riv-b" style="max-width:200px">${teams.map(t => `<option value="${esc(t.id)}">${esc(t.nombre)}</option>`).join('')}</select>
        <button class="btn btn-ghost btn-sm" id="riv-add">+ Agregar</button>
      </div>
      <div id="riv-list" class="row mt-1" style="flex-wrap:wrap;gap:6px">
        ${(S.rivalries || []).map((r, i) => `<span class="pill pill-dark">${esc(nameOf(r[0]))} vs ${esc(nameOf(r[1]))} <a href="#" data-delriv="${i}" style="color:#fff;margin-left:6px">✕</a></span>`).join('')}
      </div>

      <div class="row mt-3">
        <button class="btn btn-primary btn-lg" id="btn-gen" ${teams.length < 8 ? 'disabled' : ''}>${icon('shuffle', { size: 18 })} Generar sorteo</button>
        <button class="btn btn-secondary" id="btn-regen" ${teams.length < 8 ? 'disabled' : ''}>↻ Re-generar</button>
      </div>
    </div>

    <div id="resultado">${S.result ? renderResultado() : ''}</div>
  </div>`;

  mount(shell(inner, cfg));
  bind();
}

function nameOf(id) { return (EQS.find(t => t.id === id) || {}).nombre || id; }
function ausp(slot) { const m = (cfg && cfg.auspiciadores) || {}; const r = m[slot]; return (r && String(r).trim()) ? String(r).trim() : slot; }
function fmt(iso) {
  if (!iso) return '';
  const [Y, M, D] = iso.split('-').map(Number);
  const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'], meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const d = new Date(Y, M - 1, D);
  return `${dias[d.getDay()]} ${D} ${meses[M - 1]}`;
}

function renderResultado() {
  const R = S.result;
  const byId = Object.fromEntries(EQS.map(t => [t.id, t]));
  const marcas = ['Auspiciador 1', 'Auspiciador 2', 'Auspiciador 3', 'Auspiciador 4'];
  const nPart = R.rounds.reduce((a, r) => a + r.matches.length, 0);

  const fechaCard = (rd) => {
    const cams = [...new Set(rd.matches.filter(m => m.grabado).map(m => m.cancha))].sort((a, b) => a - b);
    return `
    <div class="card mb-2">
      <div class="spread mb-1">
        <h3 style="margin:0">Fecha ${rd.n} <span class="muted" style="font-weight:400;font-size:.9rem">· ${esc(fmt(rd.fecha))}</span></h3>
        <span class="muted" style="font-size:.85rem">${icon('video', { size: 14 })} ${rd.matches.filter(m => m.grabado).length} grabados · cámaras cancha ${cams.join(' y ')}</span>
      </div>
      <div class="table-wrap"><table class="tbl sorteo-tbl">
        <thead><tr><th>Partido</th><th>Hora</th><th>Cancha</th><th>Camarines</th><th>Grab.</th><th>Premio</th></tr></thead>
        <tbody>
          ${rd.matches.slice().sort((a, b) => HOR.indexOf(a.horario) - HOR.indexOf(b.horario) || a.cancha - b.cancha).map(m => `
            <tr class="${m.clasico ? 'is-clasico' : ''}">
              <td><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">${teamInline(byId[m.local]?.logo, byId[m.local]?.nombre || m.local, { size: 22 })} <span class="muted">vs</span> ${teamInline(byId[m.visita]?.logo, byId[m.visita]?.nombre || m.visita, { size: 22 })}${m.clasico ? `<span class="pill pill-brand">${icon('flame', { size: 12 })} Clásico</span>` : ''}</div></td>
              <td>${m.horario}</td>
              <td>Cancha ${m.cancha}</td>
              <td class="muted">${(m.camarines || []).join(' y ')}</td>
              <td>${m.grabado ? icon('video', { size: 16, cls: 'ico-grab' }) : '<span class="muted">—</span>'}</td>
              <td><span class="pill pill-grey">${esc(ausp(m.marca))}</span></td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
  };

  const balRow = (s) => `
    <tr>
      <td>${teamInline(byId[s.id]?.logo, s.nombre, { size: 22 })}</td>
      <td class="num">${s.h9}</td><td class="num">${s.h10}</td>
      <td class="num">${s.c1}</td><td class="num">${s.c2}</td><td class="num">${s.c3}</td><td class="num">${s.c4}</td>
      <td class="num"><strong>${s.grab}</strong></td><td class="num"><strong>${s.clasico}</strong></td>
      <td class="num muted">${s.local}/${s.visita}</td>
    </tr>`;

  return `
    <div class="spread mb-2">
      <div><span class="eyebrow">Resultado</span><h2 style="margin:0">Fixture Senior generado</h2></div>
      <div class="row" style="flex-wrap:wrap">
        <span class="pill pill-green">${R.rounds.length} fechas · ${nPart} partidos</span>
        <span class="pill pill-grey">equilibrio ${R.score}</span>
        <button class="btn btn-primary btn-sm" id="btn-publish">${icon('rocket', { size: 15 })} Publicar en la web</button>
      </div>
    </div>
    <div id="publish-help"></div>
    ${R.rounds.map(fechaCard).join('')}
    <span class="eyebrow mt-3">Verificación</span>
    <h2 class="mb-2">Equilibrio por equipo</h2>
    <div class="table-wrap"><table class="tbl sorteo-bal">
      <thead><tr><th>Equipo</th><th class="num">9:00</th><th class="num">10:40</th><th class="num">C1</th><th class="num">C2</th><th class="num">C3</th><th class="num">C4</th><th class="num">Grab</th><th class="num">Clás</th><th class="num">L/V</th></tr></thead>
      <tbody>${R.stats.map(balRow).join('')}</tbody>
    </table></div>
    <p class="muted mt-1" style="font-size:.85rem">Después de publicar puedes ajustar canchas y premios en <strong>Admin → Fixture</strong> (elige serie Senior) y cargar goles/tarjetas en <strong>Goles y tarjetas</strong>.</p>`;
}

function readParams() {
  S.inicio = document.getElementById('p-inicio')?.value || S.inicio;
  S.excluir = [...document.querySelectorAll('[data-ex]')].map(i => i.value).filter(Boolean);
}

function generar(nuevo) {
  readParams();
  const p = buildParams();
  if (p.teams.length < 8) { toast('Faltan equipos senior (se necesitan 8)', 'error'); return; }
  if (p.fechas.length < p.teams.length - 1) { toast(`Faltan fechas: se necesitan ${p.teams.length - 1}`, 'error'); return; }
  const seed = nuevo ? Math.floor(Math.random() * 1e9) + 1 : (S.seedUsed || 12345);
  ['btn-gen', 'btn-regen'].forEach(id => { const b = document.getElementById(id); if (b) b.disabled = true; });
  setTimeout(() => {
    try {
      const R = generarFixtureSenior(p, seed, 1200);
      R.seedUsed = seed; S.seedUsed = seed; S.result = R; S.lastParams = p;
      render();
      document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast(nuevo ? 'Nueva combinación generada' : 'Sorteo senior generado', 'success');
    } catch (err) {
      toast(err.message || 'Error al generar', 'error');
      ['btn-gen', 'btn-regen'].forEach(id => { const b = document.getElementById(id); if (b) b.disabled = false; });
    }
  }, 30);
}

function buildFixturePublic() {
  const R = S.result;
  const byId = Object.fromEntries(EQS.map(t => [t.id, t.nombre]));
  return {
    serie: 'Senior', serieId: 'senior', temporada: cfg.temporada || '2026',
    publicado: new Date().toISOString(), camarinesPorCancha: CAMARINES,
    fechas: R.rounds.map(rd => ({
      n: rd.n, fecha: rd.fecha,
      partidos: rd.matches.slice().sort((a, b) => (HOR.indexOf(a.horario) - HOR.indexOf(b.horario)) || (a.cancha - b.cancha)).map(m => ({
        localId: m.local, visitaId: m.visita, local: byId[m.local], visita: byId[m.visita],
        horario: m.horario, cancha: m.cancha,
        camarinLocal: (m.camarines || [])[0] ?? null, camarinVisita: (m.camarines || [])[1] ?? null,
        grabado: !!m.grabado, clasico: !!m.clasico, premio: m.marca
      }))
    }))
  };
}

async function publicar() {
  if (!S.result) { toast('Primero genera un sorteo', 'error'); return; }
  const data = buildFixturePublic();
  const help = document.getElementById('publish-help');
  const btn = document.getElementById('btn-publish');
  if (btn) { btn.disabled = true; btn.textContent = 'Publicando…'; }
  try {
    const n = await publishFixture(data);
    const sb = sandboxOn();
    toast(sb ? `Fixture senior publicado en modo prueba (${n}).` : `Fixture senior publicado (${n} partidos). Ya está en vivo.`, 'success');
    if (help) help.innerHTML = `
      <div class="card mb-3" style="border-left:4px solid var(--c-brand)">
        <h3 style="margin:0 0 6px">${icon('check', { size: 18 })} Fixture Senior publicado</h3>
        <p style="margin:0">Quedó en la base junto al Junior (no lo pisa) y aparece en <a href="/programacion" data-link>Programación</a>. Ajusta canchas/premios en <a href="/admin" data-link>Admin → Fixture</a> (serie Senior).</p>
      </div>`;
  } catch (err) {
    toast(err.message || 'No se pudo publicar', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = `${icon('rocket', { size: 15 })} Publicar en la web`; }
  }
}

function bind() {
  document.getElementById('s-logout').onclick = async () => { await logout(); if (window.renderHeader) window.renderHeader(); window.__router.go('/', false); };
  const ce = document.getElementById('crear-eq');
  if (ce) ce.onclick = async () => {
    ce.disabled = true; ce.textContent = 'Guardando…';
    try {
      for (const r of REQUIRED) {
        const exists = EQS.some(e => e.id === r.id);
        if (r.id === 'sr-equipo-8') { if (!exists) await saveEquipo({ ...r }); } // no pisar rename del Equipo 8
        else await saveEquipo({ ...r }); // Gunners / Ariel Honores: upsert con escudo (merge)
      }
      for (const id of RETIRAR) { if (EQS.some(e => e.id === id)) await deleteEquipo(id); } // retira AFC
      const equipos = await getEquipos();
      EQS = equipos.filter(e => e.serie === 'senior').map(e => ({ id: e.id, nombre: e.nombre, logo: e.logo }));
      toast('Equipos senior actualizados (Gunners entra, AFC sale) ✓', 'success'); render();
    } catch (err) { toast(err.message || 'No se pudieron guardar', 'error'); ce.disabled = false; ce.textContent = 'Aplicar cambios de equipos (Gunners entra, AFC sale)'; }
  };
  const pf = document.getElementById('patch-fx');
  if (pf) pf.onclick = async () => {
    if (!SRP.length) { toast('No hay fixture senior publicado para corregir', 'error'); return; }
    const SWAP = { 'sr-los-pibes': 'sr-historicos', 'sr-historicos': 'sr-los-pibes' };
    const ups = [];
    SRP.forEach(p => {
      let local = p.local, visita = p.visita;
      if (local === 'sr-afc') local = 'sr-gunners';        // AFC → Gunners (todo el torneo)
      if (visita === 'sr-afc') visita = 'sr-gunners';
      if (+p.fecha_num === 1) { local = SWAP[local] || local; visita = SWAP[visita] || visita; } // swap solo F1
      if (local !== p.local || visita !== p.visita) ups.push({ id: p.id, local, visita });
    });
    if (!ups.length) { toast('El fixture ya está corregido ✓'); return; }
    if (!confirm(`Se ajustarán ${ups.length} partidos (AFC→Gunners y swap de la Fecha 1). No cambia horarios, canchas, grabados ni clásicos. ¿Continuar?`)) return;
    pf.disabled = true; pf.textContent = 'Aplicando…';
    try {
      for (const u of ups) await savePartido(u);
      toast(`Corrección aplicada: ${ups.length} partidos ✓`, 'success');
      setTimeout(() => location.reload(), 800);
    } catch (err) { toast(err.message || 'Error al aplicar', 'error'); pf.disabled = false; pf.textContent = 'Aplicar corrección al fixture publicado'; }
  };
  const bf = document.getElementById('baja-fx');
  if (bf) bf.onclick = async () => {
    if (!confirm('¿Bajar TODO el fixture senior de la web? Se elimina de la Programación (el Junior no se toca). Podrás volver a generarlo/publicarlo después.')) return;
    bf.disabled = true; bf.textContent = 'Bajando…';
    try {
      const n = await borrarFixtureSerie('senior');
      toast(`Fixture senior dado de baja (${n || 0} partidos) ✓`, 'success');
      setTimeout(() => location.reload(), 800);
    } catch (err) { toast(err.message || 'No se pudo bajar', 'error'); bf.disabled = false; bf.textContent = 'Bajar fixture senior (quitar de la web)'; }
  };
  const bg = document.getElementById('btn-gen'); if (bg) bg.onclick = () => generar(false);
  const br = document.getElementById('btn-regen'); if (br) br.onclick = () => generar(true);
  const ba = document.getElementById('p-addex'); if (ba) ba.onclick = () => { readParams(); S.excluir.push(''); render(); };
  document.querySelectorAll('[data-delex]').forEach(b => b.onclick = () => { readParams(); S.excluir.splice(+b.dataset.delex, 1); render(); });
  const ra = document.getElementById('riv-add'); if (ra) ra.onclick = () => {
    readParams();
    const a = document.getElementById('riv-a').value, b = document.getElementById('riv-b').value;
    if (a && b && a !== b) {
      const key = [a, b].sort().join('|');
      if (!S.rivalries.some(r => [r[0], r[1]].sort().join('|') === key)) S.rivalries.push([a, b]);
      render();
    } else toast('Elige dos equipos distintos', 'error');
  };
  document.querySelectorAll('[data-delriv]').forEach(a => a.onclick = (e) => { e.preventDefault(); readParams(); S.rivalries.splice(+a.dataset.delriv, 1); render(); });
  const bpub = document.getElementById('btn-publish'); if (bpub) bpub.onclick = publicar;
}
