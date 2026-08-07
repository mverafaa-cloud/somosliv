import { getConfig, getPartidos, getEquipos, equiposById } from '../services/store.js';
import { mount, esc, initials, fmtDateLong, fmtTime, parseDate } from '../ui/helpers.js';
import { shell, loading, preSeason } from '../ui/layout.js';
import { icon } from '../ui/icons.js';

// Selección multi: series = array de ids; fechas = 'all' | array de fecha_num
let _sel = { series: null, fechas: 'all' };

export async function showProgramacion() {
  mount(loading());
  const [config, partidos, equipos] = await Promise.all([getConfig(), getPartidos(), getEquipos()]);
  const byId = equiposById(equipos);
  const series = config.series || [];

  if (!partidos.length) {
    mount(shell(`<div class="container"><span class="eyebrow">Calendario</span><h1>Programación</h1>${preSeason(config, 'la programación de cada jornada')}</div>`, config));
    return;
  }

  // Fechas disponibles (fecha_num distintos), ordenadas por fecha real de calendario
  const fechaDate = {};
  partidos.forEach(p => {
    if (p.fecha_num == null) return;
    const d = parseDate(p.fecha);
    if (!(p.fecha_num in fechaDate) || (d && d < parseDate(fechaDate[p.fecha_num]))) fechaDate[p.fecha_num] = p.fecha;
  });
  const fechas = Object.keys(fechaDate).map(Number).sort((a, b) => parseDate(fechaDate[a]) - parseDate(fechaDate[b]));

  // Reset a "todas" cada vez que se abre la sección
  _sel = { series: series.map(s => s.id), fechas: 'all' };

  const inner = `
  <div class="container">
    <span class="eyebrow">Calendario</span>
    <h1>Programación</h1>
    <p class="subtitle mb-3">Días, horarios y canchas de cada jornada en ${esc(config.sede || 'Complejo Deggiano')}.</p>
    <div id="prog-filters"></div>
    <div id="fixture-body"></div>
  </div>`;
  mount(shell(inner, config));

  function renderFilters() {
    const serieRow = `
      <div class="chips filter-row" id="prog-serie">
        <span class="chips-label">Serie</span>
        ${series.map(s => `<button class="chip ${_sel.series.includes(s.id) ? 'active' : ''}" data-serie="${esc(s.id)}">${esc(s.nombre)}</button>`).join('')}
      </div>`;
    const fechaRow = fechas.length ? `
      <div class="chips filter-row" id="prog-fecha">
        <span class="chips-label">Fecha</span>
        <button class="chip ${_sel.fechas === 'all' ? 'active' : ''}" data-fecha="all">Todas</button>
        ${fechas.map(f => `<button class="chip ${_sel.fechas !== 'all' && _sel.fechas.includes(f) ? 'active' : ''}" data-fecha="${f}">Fecha ${f}</button>`).join('')}
      </div>` : '';
    document.getElementById('prog-filters').innerHTML = serieRow + fechaRow;

    // Serie: multi-toggle (no permitir dejar cero series)
    document.querySelectorAll('#prog-serie .chip').forEach(c => c.addEventListener('click', () => {
      const id = c.dataset.serie;
      const i = _sel.series.indexOf(id);
      if (i >= 0) { if (_sel.series.length > 1) _sel.series.splice(i, 1); }
      else _sel.series.push(id);
      render();
    }));

    // Fecha: "Todas" o multi-selección de fechas
    document.querySelectorAll('#prog-fecha .chip').forEach(c => c.addEventListener('click', () => {
      const val = c.dataset.fecha;
      if (val === 'all') { _sel.fechas = 'all'; }
      else {
        const f = Number(val);
        if (_sel.fechas === 'all') _sel.fechas = [f];
        else {
          const i = _sel.fechas.indexOf(f);
          if (i >= 0) _sel.fechas.splice(i, 1); else _sel.fechas.push(f);
          if (!_sel.fechas.length) _sel.fechas = 'all';
        }
      }
      render();
    }));
  }

  function renderList() {
    const list = partidos
      .filter(p => _sel.series.includes(p.serie))
      .filter(p => _sel.fechas === 'all' || (p.fecha_num != null && _sel.fechas.includes(p.fecha_num)))
      .sort((a, b) => (parseDate(a.fecha) - parseDate(b.fecha)) || (a.hora || '').localeCompare(b.hora || ''));

    const groups = {};
    list.forEach(p => { (groups[p.fecha] = groups[p.fecha] || []).push(p); });
    const dates = Object.keys(groups).sort((a, b) => parseDate(a) - parseDate(b)); // orden calendario

    document.getElementById('fixture-body').innerHTML = dates.length ? dates.map(d => `
      <div class="fixture-day">
        <h3>${icon('calendar', { size: 18 })} ${esc(fmtDateLong(d))}</h3>
        ${groups[d].map(p => matchCard(p, byId, series)).join('')}
      </div>`).join('') : emptyBox('No hay partidos para los filtros seleccionados.');
  }

  function render() { renderFilters(); renderList(); }
  render();
}

// ---- Helpers compartidos por resultados.js / disciplina.js ----
export function serieChips(series) {
  return `<div class="chips" id="serie-chips">
    <button class="chip active" data-serie="all">Todas</button>
    ${series.map(s => `<button class="chip" data-serie="${esc(s.id)}">${esc(s.nombre)}</button>`).join('')}
  </div>`;
}
export function emptyBox(msg) {
  return `<div class="empty"><div class="ico">${icon('inbox', { size: 42 })}</div><p>${esc(msg)}</p></div>`;
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
