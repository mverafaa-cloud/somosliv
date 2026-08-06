import { getConfig, getPartidos, getEquipos, equiposById } from '../services/store.js';
import { mount, esc, initials, fmtDateLong, fmtTime, parseDate } from '../ui/helpers.js';
import { shell, loading } from '../ui/layout.js';

let _state = { serie: 'all' };

export async function showProgramacion() {
  mount(loading());
  const [config, partidos, equipos] = await Promise.all([getConfig(), getPartidos(), getEquipos()]);
  const byId = equiposById(equipos);
  const series = config.series || [];

  function render() {
    const list = partidos
      .filter(p => _state.serie === 'all' || p.serie === _state.serie)
      .sort((a, b) => (parseDate(a.fecha) - parseDate(b.fecha)) || (a.hora || '').localeCompare(b.hora || ''));

    // Agrupar por fecha
    const groups = {};
    list.forEach(p => { (groups[p.fecha] = groups[p.fecha] || []).push(p); });
    const dates = Object.keys(groups).sort((a, b) => parseDate(a) - parseDate(b));

    const body = dates.length ? dates.map(d => `
      <div class="fixture-day">
        <h3>📅 ${esc(fmtDateLong(d))}</h3>
        ${groups[d].map(p => matchCard(p, byId, series)).join('')}
      </div>`).join('') : emptyBox('Aún no hay partidos programados.');

    document.getElementById('fixture-body').innerHTML = body;
    document.querySelectorAll('#serie-chips .chip').forEach(c => c.classList.toggle('active', c.dataset.serie === _state.serie));
  }

  const inner = `
  <div class="container">
    <span class="eyebrow">Calendario</span>
    <h1>Programación</h1>
    <p class="subtitle mb-3">Días, horarios y canchas de cada jornada en ${esc(config.sede || 'Complejo Deggiano')}.</p>
    ${serieChips(series)}
    <div id="fixture-body"></div>
  </div>`;

  mount(shell(inner, config));
  bindChips(render);
  render();
}

export function serieChips(series) {
  return `<div class="chips" id="serie-chips">
    <button class="chip active" data-serie="all">Todas</button>
    ${series.map(s => `<button class="chip" data-serie="${esc(s.id)}">${esc(s.nombre)}</button>`).join('')}
  </div>`;
}
export function bindChips(onChange) {
  document.querySelectorAll('#serie-chips .chip').forEach(c => {
    c.addEventListener('click', () => { _state.serie = c.dataset.serie; onChange(); });
  });
}
export function emptyBox(msg) {
  return `<div class="empty"><div class="ico">📭</div><p>${esc(msg)}</p></div>`;
}

function matchCard(p, byId, series) {
  const L = byId[p.local]?.nombre || p.local;
  const V = byId[p.visita]?.nombre || p.visita;
  const fin = p.estado === 'finalizado' && p.golesLocal != null;
  const serieName = (series.find(s => s.id === p.serie) || {}).nombre || '';
  const mid = fin
    ? `<div class="score">${esc(p.golesLocal)} - ${esc(p.golesVisita)}</div><div class="meta">Final</div>`
    : `<div class="scheduled">${esc(fmtTime(p.hora)) || '—'}</div><div class="meta">${esc(p.cancha || '')}</div>`;
  return `
  <div class="match-card ${fin ? 'finished' : ''}">
    <div class="team home"><span class="name">${esc(L)}</span><span class="badge">${esc(initials(L))}</span></div>
    <div class="vs">${mid}</div>
    <div class="team"><span class="badge">${esc(initials(V))}</span><span class="name">${esc(V)}</span></div>
  </div>
  <div class="match-meta-row" style="margin:-4px 4px 12px">${serieName ? `<span class="pill pill-grey">${esc(serieName)}</span>` : ''}${p.fecha_num ? `<span class="pill pill-grey">Fecha ${esc(p.fecha_num)}</span>` : ''}</div>`;
}
