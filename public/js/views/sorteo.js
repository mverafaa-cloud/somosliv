import { isAdmin, logout, getConfig, getEquipos } from '../services/store.js';
import { mount, esc } from '../ui/helpers.js';
import { shell, loading } from '../ui/layout.js';
import { icon } from '../ui/icons.js';
import { toast } from '../ui/toast.js';
import { renderLogin } from './admin.js';
import { generarFixture, sabadosDesde, CAMARINES } from '../services/fixture.js';

const HOR = ['10:40', '12:20'];
let S = null;      // estado: { params, result }
let cfg = {};

function defaultParams(teams, config) {
  const inicio = config.lanzamiento || '2026-08-29';
  const excluir = ['2026-09-19', '2026-10-10'];
  const nRondas = Math.max(1, teams.length - (teams.length % 2 === 0 ? 1 : 0));
  return {
    teams,
    inicio, excluir,
    fechas: sabadosDesde(inicio, excluir, nRondas),
    grabadosPorFecha: 3,
    marcas: ['Marca 1', 'Marca 2', 'Marca 3'],
    preferHorario: Object.fromEntries(teams.map(t => [t.id, ''])),
    rivalries: []
  };
}

function loadState(teams, config) {
  try {
    const raw = localStorage.getItem('liv_sorteo_params');
    if (raw) {
      const p = JSON.parse(raw);
      // reasocia equipos actuales (por si cambian nombres/orden)
      p.teams = teams;
      p.preferHorario = p.preferHorario || {};
      teams.forEach(t => { if (!(t.id in p.preferHorario)) p.preferHorario[t.id] = ''; });
      return p;
    }
  } catch (_) {}
  return defaultParams(teams, config);
}
function persist() {
  try { localStorage.setItem('liv_sorteo_params', JSON.stringify(S.params)); } catch (_) {}
}

export async function showSorteo() {
  if (!isAdmin()) return renderLogin('/sorteo');
  mount(loading('Cargando sorteo…'));
  const [config, equipos] = await Promise.all([getConfig(), getEquipos()]);
  cfg = config;
  const teams = equipos.filter(e => e.serie === 'libre').map(e => ({ id: e.id, nombre: e.nombre }));
  const finalTeams = teams.length ? teams : (config.series || []).length ? [] : [];
  if (!S || S.params.teams.length !== finalTeams.length) {
    S = { params: loadState(finalTeams, config), result: null };
  }
  render();
}

/* ------------------ RENDER ------------------ */
function render() {
  const p = S.params;
  const teams = p.teams;
  const nRondas = p.fechas.length;

  const inner = `
  <div class="container">
    <div class="spread mb-2">
      <div><span class="eyebrow">Panel · Organización</span><h1 style="margin:0">${icon('shuffle', { size: 26 })} Sorteo Fixture — Junior</h1></div>
      <div class="row">
        <a href="/admin" data-link class="btn btn-ghost btn-sm">${icon('settings', { size: 15 })} Admin</a>
        <button class="btn btn-ghost btn-sm" id="s-logout">Cerrar sesión</button>
      </div>
    </div>
    <p class="subtitle mb-3">Simula el fixture de la serie Junior con todas las condiciones. Ajusta los parámetros y genera; puedes re-generar para obtener otra combinación válida.</p>

    ${!teams.length ? `<div class="alert alert-warn">No hay equipos de la serie Junior cargados.</div>` : ''}

    <!-- PARÁMETROS -->
    <div class="card mb-3">
      <h3 class="mb-2">${icon('settings', { size: 18 })} Parámetros</h3>

      <div class="grid grid-2">
        <div>
          <label class="lbl">Inicio de temporada</label>
          <input class="input" type="date" id="p-inicio" value="${esc(p.inicio)}">
        </div>
        <div>
          <label class="lbl">Grabaciones por jornada</label>
          <input class="input" type="number" min="0" max="${teams.length / 2}" id="p-grab" value="${p.grabadosPorFecha}">
        </div>
      </div>

      <label class="lbl mt-2">Días sin juego (excluidos)</label>
      <div id="p-excluir" class="stack-sm">
        ${p.excluir.map((d, i) => `<div class="row"><input class="input" type="date" data-ex="${i}" value="${esc(d)}"><button class="btn btn-danger btn-sm" data-delex="${i}">✕</button></div>`).join('')}
      </div>
      <div class="row mt-1">
        <button class="btn btn-ghost btn-sm" id="p-addex">+ Día sin juego</button>
        <button class="btn btn-secondary btn-sm" id="p-recalc">↻ Recalcular fechas</button>
      </div>

      <label class="lbl mt-2">Fechas de la temporada (${nRondas} jornadas)</label>
      <div id="p-fechas" class="fechas-grid">
        ${p.fechas.map((d, i) => `<div class="row"><span class="fnum">F${i + 1}</span><input class="input" type="date" data-f="${i}" value="${esc(d)}"></div>`).join('')}
      </div>

      <label class="lbl mt-2">Marcas de premio (MVP)</label>
      <div class="grid grid-3">
        ${p.marcas.map((m, i) => `<input class="input" data-marca="${i}" value="${esc(m)}" placeholder="Marca ${i + 1}">`).join('')}
      </div>

      <label class="lbl mt-2">Preferencia de horario por equipo <span class="muted">(opcional)</span></label>
      <div class="prefs-grid">
        ${teams.map(t => `
          <div class="pref-item">
            <span class="pref-name">${esc(t.nombre)}</span>
            <select class="select" data-pref="${esc(t.id)}">
              <option value="" ${p.preferHorario[t.id] ? '' : 'selected'}>Sin preferencia</option>
              <option value="10:40" ${p.preferHorario[t.id] === '10:40' ? 'selected' : ''}>10:40</option>
              <option value="12:20" ${p.preferHorario[t.id] === '12:20' ? 'selected' : ''}>12:20</option>
            </select>
          </div>`).join('')}
      </div>

      <label class="lbl mt-2">Clásicos / rivalidades <span class="muted">(opcional — si defines pares, se priorizan como clásico de la jornada)</span></label>
      <div class="row" style="flex-wrap:wrap;gap:8px">
        <select class="select" id="riv-a" style="max-width:200px">${teams.map(t => `<option value="${esc(t.id)}">${esc(t.nombre)}</option>`).join('')}</select>
        <span>vs</span>
        <select class="select" id="riv-b" style="max-width:200px">${teams.map(t => `<option value="${esc(t.id)}">${esc(t.nombre)}</option>`).join('')}</select>
        <button class="btn btn-ghost btn-sm" id="riv-add">+ Agregar rivalidad</button>
      </div>
      <div id="riv-list" class="row mt-1" style="flex-wrap:wrap;gap:6px">
        ${p.rivalries.map((r, i) => `<span class="pill pill-dark">${esc(nameOf(r[0]))} vs ${esc(nameOf(r[1]))} <a href="#" data-delriv="${i}" style="color:#fff;margin-left:6px">✕</a></span>`).join('')}
      </div>

      <div class="card-sm mt-2" style="background:var(--c-brand-soft, #eef6f0);border-radius:12px;padding:10px 13px">
        <strong>Camarines (fijo por cancha):</strong>
        Cancha 1 → 1 y 2 · Cancha 3 → 3 y 4 · Cancha 2 → 5 y 6 · Cancha 4 → 7 y 8.
      </div>

      <div class="row mt-3">
        <button class="btn btn-primary btn-lg" id="btn-gen">${icon('shuffle', { size: 18 })} Generar sorteo</button>
        <button class="btn btn-secondary" id="btn-regen">↻ Re-generar</button>
      </div>
    </div>

    <div id="resultado">${S.result ? renderResultado() : ''}</div>
  </div>`;

  mount(shell(inner, cfg));
  bind();
}

function nameOf(id) { return (S.params.teams.find(t => t.id === id) || {}).nombre || id; }

/* ------------------ RESULTADO ------------------ */
function renderResultado() {
  const R = S.result;
  const teams = S.params.teams;
  const marcas = S.params.marcas;
  const byId = Object.fromEntries(teams.map(t => [t.id, t.nombre]));
  const nPart = R.rounds.reduce((a, r) => a + r.matches.length, 0);

  const fechaCard = (rd) => `
    <div class="card mb-2">
      <div class="spread mb-1">
        <h3 style="margin:0">Fecha ${rd.n} <span class="muted" style="font-weight:400;font-size:.9rem">· ${esc(fmt(rd.fecha))}</span></h3>
        <span class="muted" style="font-size:.85rem">${rd.matches.filter(m => m.grabado).length} grabados</span>
      </div>
      <div class="table-wrap"><table class="tbl sorteo-tbl">
        <thead><tr><th>Partido</th><th>Hora</th><th>Cancha</th><th>Camarines</th><th>Grab.</th><th>Premio</th></tr></thead>
        <tbody>
          ${rd.matches.slice().sort((a, b) => HOR.indexOf(a.horario) - HOR.indexOf(b.horario) || a.cancha - b.cancha).map(m => `
            <tr class="${m.clasico ? 'is-clasico' : ''}">
              <td>${m.clasico ? `<span class="pill pill-brand" style="margin-right:6px">${icon('flame', { size: 12 })} Clásico</span>` : ''}<strong>${esc(byId[m.local] || m.local)}</strong> <span class="muted">vs</span> <strong>${esc(byId[m.visita] || m.visita)}</strong></td>
              <td>${m.horario}</td>
              <td>Cancha ${m.cancha}</td>
              <td class="muted">${(m.camarines || []).join(' y ')}</td>
              <td>${m.grabado ? icon('video', { size: 16, cls: 'ico-grab' }) : '<span class="muted">—</span>'}</td>
              <td><span class="pill pill-grey">${esc(m.marca)}</span></td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;

  const stat = R.stats;
  const balRow = (s) => `
    <tr>
      <td style="font-weight:700">${esc(s.nombre)}</td>
      <td class="num">${s.h1040}</td><td class="num">${s.h1220}</td>
      <td class="num">${s.c1}</td><td class="num">${s.c2}</td><td class="num">${s.c3}</td><td class="num">${s.c4}</td>
      <td class="num"><strong>${s.grab}</strong></td>
      <td class="num"><strong>${s.clasico}</strong></td>
      ${s.marca.map(v => `<td class="num">${v}</td>`).join('')}
      <td class="num muted">${s.local}/${s.visita}</td>
    </tr>`;

  return `
    <div class="spread mb-2">
      <div><span class="eyebrow">Resultado</span><h2 style="margin:0">Fixture generado</h2></div>
      <div class="row" style="flex-wrap:wrap">
        <span class="pill pill-green">${R.rounds.length} fechas · ${nPart} partidos</span>
        <span class="pill pill-grey">equilibrio ${R.score}</span>
        <button class="btn btn-ghost btn-sm" id="btn-print">${icon('file', { size: 15 })} Imprimir</button>
        <button class="btn btn-ghost btn-sm" id="btn-json">${icon('download', { size: 15 })} JSON</button>
      </div>
    </div>

    ${R.rounds.map(fechaCard).join('')}

    <span class="eyebrow mt-3">Verificación</span>
    <h2 class="mb-2">Equilibrio por equipo</h2>
    <div class="table-wrap"><table class="tbl sorteo-bal">
      <thead><tr>
        <th>Equipo</th><th class="num">10:40</th><th class="num">12:20</th>
        <th class="num">C1</th><th class="num">C2</th><th class="num">C3</th><th class="num">C4</th>
        <th class="num">Grab</th><th class="num">Clás</th>
        ${marcas.map(m => `<th class="num">${esc(abbr(m))}</th>`).join('')}
        <th class="num">L/V</th>
      </tr></thead>
      <tbody>${stat.map(balRow).join('')}</tbody>
    </table></div>
    <p class="muted mt-1" style="font-size:.85rem">Grab = partidos grabados · Clás = clásicos jugados · C1–C4 = veces en cada cancha · L/V = local/visita. Todos juegan las 4 canchas; grabaciones y marcas quedan lo más parejas posible.</p>`;
}

function abbr(s) { return s.length > 8 ? s.slice(0, 7) + '…' : s; }
function fmt(iso) {
  if (!iso) return '';
  const [Y, M, D] = iso.split('-').map(Number);
  const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const d = new Date(Y, M - 1, D);
  return `${dias[d.getDay()]} ${D} ${meses[M - 1]}`;
}

/* ------------------ LÓGICA / EVENTOS ------------------ */
function readParams() {
  const p = S.params;
  p.inicio = document.getElementById('p-inicio')?.value || p.inicio;
  p.grabadosPorFecha = Math.max(0, +(document.getElementById('p-grab')?.value || 3));
  p.excluir = [...document.querySelectorAll('[data-ex]')].map(i => i.value).filter(Boolean);
  p.fechas = [...document.querySelectorAll('[data-f]')].map(i => i.value).filter(Boolean);
  p.marcas = [...document.querySelectorAll('[data-marca]')].map((i, k) => i.value.trim() || `Marca ${k + 1}`);
  document.querySelectorAll('[data-pref]').forEach(sel => { p.preferHorario[sel.dataset.pref] = sel.value; });
  persist();
}

function generar(nuevo) {
  readParams();
  const p = S.params;
  if (!p.teams.length) { toast('No hay equipos Junior cargados', 'error'); return; }
  if (p.fechas.length < p.teams.length - 1) { toast(`Faltan fechas: se necesitan ${p.teams.length - 1}`, 'error'); return; }
  const seed = nuevo ? Math.floor(Math.random() * 1e9) + 1 : (S.result?.seedUsed || 1);
  const btnIds = ['btn-gen', 'btn-regen'];
  btnIds.forEach(id => { const b = document.getElementById(id); if (b) b.disabled = true; });
  // pequeño defer para que el botón muestre estado
  setTimeout(() => {
    try {
      const R = generarFixture(p, seed, 400);
      R.seedUsed = seed;
      S.result = R;
      render();
      document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast(nuevo ? 'Nueva combinación generada' : 'Sorteo generado', 'success');
    } catch (err) {
      toast(err.message || 'Error al generar', 'error');
      btnIds.forEach(id => { const b = document.getElementById(id); if (b) b.disabled = false; });
    }
  }, 30);
}

function bind() {
  document.getElementById('s-logout').onclick = async () => { await logout(); if (window.renderHeader) window.renderHeader(); window.__router.go('/', false); };

  document.getElementById('btn-gen').onclick = () => generar(false);
  document.getElementById('btn-regen').onclick = () => generar(true);

  document.getElementById('p-recalc').onclick = () => {
    readParams();
    const p = S.params;
    p.fechas = sabadosDesde(p.inicio, p.excluir, p.teams.length - 1);
    persist(); render();
  };
  document.getElementById('p-addex').onclick = () => {
    readParams(); S.params.excluir.push(''); persist(); render();
  };
  document.querySelectorAll('[data-delex]').forEach(b => b.onclick = () => {
    readParams(); S.params.excluir.splice(+b.dataset.delex, 1); persist(); render();
  });

  document.getElementById('riv-add').onclick = () => {
    readParams();
    const a = document.getElementById('riv-a').value, b = document.getElementById('riv-b').value;
    if (a && b && a !== b) {
      const key = [a, b].sort().join('|');
      if (!S.params.rivalries.some(r => [r[0], r[1]].sort().join('|') === key)) S.params.rivalries.push([a, b]);
      persist(); render();
    } else toast('Elige dos equipos distintos', 'error');
  };
  document.querySelectorAll('[data-delriv]').forEach(a => a.onclick = (e) => {
    e.preventDefault(); readParams(); S.params.rivalries.splice(+a.dataset.delriv, 1); persist(); render();
  });

  // Resultado
  const bp = document.getElementById('btn-print'); if (bp) bp.onclick = () => window.print();
  const bj = document.getElementById('btn-json'); if (bj) bj.onclick = downloadJSON;
}

function downloadJSON() {
  const R = S.result; if (!R) return;
  const byId = Object.fromEntries(S.params.teams.map(t => [t.id, t.nombre]));
  const data = {
    serie: 'Junior', generado: new Date().toISOString(),
    fechas: R.rounds.map(rd => ({
      fecha: rd.n, dia: rd.fecha,
      partidos: rd.matches.map(m => ({
        local: byId[m.local], visita: byId[m.visita], horario: m.horario,
        cancha: m.cancha, camarines: m.camarines, grabado: m.grabado, clasico: m.clasico, premio: m.marca
      }))
    })),
    equilibrio: R.stats
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'fixture-junior-liv-2026.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
