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

  // Periodos: fechas regulares + rondas de playoff (Semifinales, Descenso, Finales).
  const periodOf = (p) => {
    const s = p.serie || '', r = p.ronda || '';
    if (r === 'final' || s.endsWith('-final')) return { key: 'final', label: 'Finales', order: 10002 };
    if (r === 'descenso' || s.endsWith('-descenso')) return { key: 'descenso', label: 'Descenso', order: 10001 };
    if (r === 'semifinal') return { key: 'semi', label: 'Semifinales', order: 10000 };
    if (s.includes('-')) return { key: 'po' + (p.fecha_num ?? ''), label: 'Playoff · Fecha ' + (p.fecha_num ?? ''), order: 9000 + (+p.fecha_num || 0) };
    return { key: 'f' + (p.fecha_num ?? 0), label: 'Fecha ' + (p.fecha_num ?? 0), order: (+p.fecha_num || 0) };
  };
  const serieParent = (p) => (p.serie || '').split('-')[0];   // 'libre-oro' -> 'libre'

  _sel = { serie: 'all', periods: 'all' };

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
        <button class="chip ${_sel.serie === 'all' ? 'active' : ''}" data-serie="all">Todas</button>
        ${series.map(s => `<button class="chip ${_sel.serie === s.id ? 'active' : ''}" data-serie="${esc(s.id)}">${esc(s.nombre)}</button>`).join('')}
      </div>`;
    const perMatches = finished.filter(p => _sel.serie === 'all' || serieParent(p) === _sel.serie);
    const periodMap = {};
    perMatches.forEach(p => { const pr = periodOf(p); if (!periodMap[pr.key]) periodMap[pr.key] = pr; });
    const periods = Object.values(periodMap).sort((a, b) => a.order - b.order);
    const fechaRow = periods.length ? `
      <div class="chips filter-row" id="res-fecha">
        <span class="chips-label">Fecha</span>
        <button class="chip ${_sel.periods === 'all' ? 'active' : ''}" data-per="all">Todas</button>
        ${periods.map(pr => `<button class="chip ${_sel.periods !== 'all' && _sel.periods.includes(pr.key) ? 'active' : ''}" data-per="${esc(pr.key)}">${esc(pr.label)}</button>`).join('')}
      </div>` : '';
    document.getElementById('res-filters').innerHTML = serieRow + fechaRow;

    document.querySelectorAll('#res-serie .chip').forEach(c => c.addEventListener('click', () => {
      _sel.serie = c.dataset.serie;
      _sel.periods = 'all';
      render();
    }));

    document.querySelectorAll('#res-fecha .chip').forEach(c => c.addEventListener('click', () => {
      const val = c.dataset.per;
      if (val === 'all') { _sel.periods = 'all'; }
      else {
        if (_sel.periods === 'all') _sel.periods = [val];
        else {
          const i = _sel.periods.indexOf(val);
          if (i >= 0) _sel.periods.splice(i, 1); else _sel.periods.push(val);
          if (!_sel.periods.length) _sel.periods = 'all';
        }
      }
      render();
    }));
  }

  function renderList() {
    const list = finished
      .filter(p => _sel.serie === 'all' || serieParent(p) === _sel.serie)
      .filter(p => _sel.periods === 'all' || _sel.periods.includes(periodOf(p).key));

    const groups = {};
    list.forEach(p => { const pr = periodOf(p); (groups[pr.key] = groups[pr.key] || { pr, items: [] }).items.push(p); });
    const keys = Object.keys(groups).sort((a, b) => groups[b].pr.order - groups[a].pr.order); // más reciente primero

    document.getElementById('res-body').innerHTML = keys.length ? keys.map(k => {
      const g = groups[k];
      const date = g.items.map(p => p.fecha).filter(Boolean).sort((a, b) => parseDate(b) - parseDate(a))[0];
      g.items.sort((a, b) => parseDate(b.fecha) - parseDate(a.fecha) || (a.hora || '').localeCompare(b.hora || ''));
      return `<div class="fixture-day">
        <h3>${icon('calendar', { size: 18 })} ${esc(g.pr.label)}${date ? ` · ${esc(fmtDateLong(date))}` : ''}</h3>
        ${g.items.map(p => resultCard(p, byId, series)).join('')}
      </div>`;
    }).join('') : emptyBox(finished.length ? 'No hay resultados para los filtros seleccionados.' : 'Aún no se han jugado partidos. Los marcadores aparecerán aquí apenas arranque la fecha 1.');
  }

  function render() { renderFilters(); renderList(); }
  render();
}

function resultCard(p, byId, series) {
  const L = byId[p.local]?.nombre || p.local;
  const V = byId[p.visita]?.nombre || p.visita;
  const gl = +p.golesLocal, gv = +p.golesVisita;
  const hasPen = p.penalesLocal != null && p.penalesVisita != null && gl === gv;
  const pl = +p.penalesLocal, pv = +p.penalesVisita;
  const lWin = gl > gv || (hasPen && pl > pv);
  const vWin = gv > gl || (hasPen && pv > pl);
  const SR_LBL = { 'senior-oro': 'Copa de Oro', 'senior-plata': 'Copa de Plata', 'senior-descenso': 'Descenso', 'libre-oro': 'Copa de Oro', 'libre-plata': 'Copa de Plata', 'libre-descenso': 'Descenso' };
  const serieName = p.amistoso ? 'Amistoso' : ((series.find(s => s.id === p.serie) || {}).nombre || SR_LBL[p.serie] || '');
  return `
  <div class="match-card finished">
    <div class="team home"><span class="name" style="${lWin ? 'font-weight:800' : ''}">${esc(L)}</span>${teamLogo(byId[p.local]?.logo, L, 34)}</div>
    <div class="vs"><div class="score">${gl} - ${gv}</div>${hasPen ? `<div class="meta" style="color:var(--c-brand);font-weight:800">Penales ${pl}–${pv}</div>` : ''}<div class="meta">${serieName ? esc(serieName) : 'Final'}</div></div>
    <div class="team">${teamLogo(byId[p.visita]?.logo, V, 34)}<span class="name" style="${vWin ? 'font-weight:800' : ''}">${esc(V)}</span></div>
  </div>`;
}
