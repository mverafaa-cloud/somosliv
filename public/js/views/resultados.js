import { getConfig, getPartidos, getEquipos, equiposById } from '../services/store.js';
import { mount, esc, initials, fmtDateLong, parseDate, teamLogo } from '../ui/helpers.js';
import { shell, loading, preSeason } from '../ui/layout.js';
import { emptyBox } from './programacion.js';
import { icon } from '../ui/icons.js';

// Selección multi: series = array de ids; fechas = 'all' | array de fecha_num
let _sel = { series: null, fechas: 'all' };

export async function showResultados() {
  mount(loading());
  const [config, partidos, equipos] = await Promise.all([getConfig(), getPartidos(), getEquipos()]);
  const byId = equiposById(equipos);
  const series = config.series || [];
  const finished = partidos.filter(p => p.estado === 'finalizado' && p.golesLocal != null);

  // Activa apenas hay fixture publicado. Si aún no se juega nada, muestra un
  // estado vacío amable (no la portada de "temporada por comenzar").
  if (!partidos.length && !equipos.length) {
    mount(shell(`<div class="container"><span class="eyebrow">Marcadores</span><h1>Resultados</h1>${preSeason(config, 'los marcadores de cada fecha')}</div>`, config));
    return;
  }

  // Fechas disponibles (de partidos finalizados), ordenadas por calendario
  const fechaDate = {};
  finished.forEach(p => {
    if (p.fecha_num == null) return;
    const d = parseDate(p.fecha);
    if (!(p.fecha_num in fechaDate) || (d && d < parseDate(fechaDate[p.fecha_num]))) fechaDate[p.fecha_num] = p.fecha;
  });
  const fechas = Object.keys(fechaDate).map(Number).sort((a, b) => parseDate(fechaDate[a]) - parseDate(fechaDate[b]));

  _sel = { series: series.map(s => s.id), fechas: 'all' };

  const inner = `
  <div class="container">
    <span class="eyebrow">Marcadores</span>
    <h1>Resultados</h1>
    <p class="subtitle mb-3">Todos los marcadores fecha a fecha de las series de la LIV.</p>
    <div id="res-filters"></div>
    <div id="res-body"></div>
  </div>`;
  mount(shell(inner, config));

  function renderFilters() {
    const serieRow = `
      <div class="chips filter-row" id="res-serie">
        <span class="chips-label">Serie</span>
        ${series.map(s => `<button class="chip ${_sel.series.includes(s.id) ? 'active' : ''}" data-serie="${esc(s.id)}">${esc(s.nombre)}</button>`).join('')}
      </div>`;
    const fechaRow = fechas.length ? `
      <div class="chips filter-row" id="res-fecha">
        <span class="chips-label">Fecha</span>
        <button class="chip ${_sel.fechas === 'all' ? 'active' : ''}" data-fecha="all">Todas</button>
        ${fechas.map(f => `<button class="chip ${_sel.fechas !== 'all' && _sel.fechas.includes(f) ? 'active' : ''}" data-fecha="${f}">Fecha ${f}</button>`).join('')}
      </div>` : '';
    document.getElementById('res-filters').innerHTML = serieRow + fechaRow;

    document.querySelectorAll('#res-serie .chip').forEach(c => c.addEventListener('click', () => {
      const id = c.dataset.serie;
      const i = _sel.series.indexOf(id);
      if (i >= 0) { if (_sel.series.length > 1) _sel.series.splice(i, 1); }
      else _sel.series.push(id);
      render();
    }));

    document.querySelectorAll('#res-fecha .chip').forEach(c => c.addEventListener('click', () => {
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
    const list = finished
      .filter(p => _sel.series.includes(p.serie))
      .filter(p => _sel.fechas === 'all' || (p.fecha_num != null && _sel.fechas.includes(p.fecha_num)))
      .sort((a, b) => parseDate(b.fecha) - parseDate(a.fecha)); // más reciente primero

    const groups = {};
    list.forEach(p => { (groups[p.fecha] = groups[p.fecha] || []).push(p); });
    const dates = Object.keys(groups).sort((a, b) => parseDate(b) - parseDate(a)); // descendente

    document.getElementById('res-body').innerHTML = dates.length ? dates.map(d => `
      <div class="fixture-day">
        <h3>${icon('calendar', { size: 18 })} ${esc(fmtDateLong(d))}</h3>
        ${groups[d].map(p => resultCard(p, byId, series)).join('')}
      </div>`).join('') : emptyBox(finished.length ? 'No hay resultados para los filtros seleccionados.' : 'Aún no se han jugado partidos. Los marcadores aparecerán aquí apenas arranque la fecha 1.');
  }

  function render() { renderFilters(); renderList(); }
  render();
}

function resultCard(p, byId, series) {
  const L = byId[p.local]?.nombre || p.local;
  const V = byId[p.visita]?.nombre || p.visita;
  const gl = +p.golesLocal, gv = +p.golesVisita;
  const serieName = p.amistoso ? 'Amistoso' : ((series.find(s => s.id === p.serie) || {}).nombre || '');
  return `
  <div class="match-card finished">
    <div class="team home"><span class="name" style="${gl > gv ? 'font-weight:800' : ''}">${esc(L)}</span>${teamLogo(byId[p.local]?.logo, L, 34)}</div>
    <div class="vs"><div class="score">${gl} - ${gv}</div><div class="meta">${serieName ? esc(serieName) : 'Final'}</div></div>
    <div class="team">${teamLogo(byId[p.visita]?.logo, V, 34)}<span class="name" style="${gv > gl ? 'font-weight:800' : ''}">${esc(V)}</span></div>
  </div>`;
}
