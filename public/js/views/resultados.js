import { getConfig, getPartidos, getEquipos, equiposById } from '../services/store.js';
import { mount, esc, initials, fmtDateLong, parseDate } from '../ui/helpers.js';
import { shell, loading } from '../ui/layout.js';
import { serieChips, emptyBox } from './programacion.js';
import { icon } from '../ui/icons.js';

let _serie = 'all';

export async function showResultados() {
  mount(loading());
  const [config, partidos, equipos] = await Promise.all([getConfig(), getPartidos(), getEquipos()]);
  const byId = equiposById(equipos);
  const series = config.series || [];

  function render() {
    const list = partidos
      .filter(p => p.estado === 'finalizado' && p.golesLocal != null)
      .filter(p => _serie === 'all' || p.serie === _serie)
      .sort((a, b) => (parseDate(b.fecha) - parseDate(a.fecha)));

    const groups = {};
    list.forEach(p => { (groups[p.fecha] = groups[p.fecha] || []).push(p); });
    const dates = Object.keys(groups).sort((a, b) => parseDate(b) - parseDate(a));

    document.getElementById('res-body').innerHTML = dates.length ? dates.map(d => `
      <div class="fixture-day">
        <h3>${icon('calendar', { size: 18 })} ${esc(fmtDateLong(d))}</h3>
        ${groups[d].map(p => resultCard(p, byId, series)).join('')}
      </div>`).join('') : emptyBox('Todavía no hay resultados cargados.');
    document.querySelectorAll('#serie-chips .chip').forEach(c => c.classList.toggle('active', c.dataset.serie === _serie));
  }

  const inner = `
  <div class="container">
    <span class="eyebrow">Marcadores</span>
    <h1>Resultados</h1>
    <p class="subtitle mb-3">Todos los marcadores fecha a fecha de las series de la LIV.</p>
    ${serieChips(series)}
    <div id="res-body"></div>
  </div>`;

  mount(shell(inner, config));
  document.querySelectorAll('#serie-chips .chip').forEach(c => c.addEventListener('click', () => { _serie = c.dataset.serie; render(); }));
  render();
}

function resultCard(p, byId, series) {
  const L = byId[p.local]?.nombre || p.local;
  const V = byId[p.visita]?.nombre || p.visita;
  const gl = +p.golesLocal, gv = +p.golesVisita;
  const serieName = (series.find(s => s.id === p.serie) || {}).nombre || '';
  return `
  <div class="match-card finished">
    <div class="team home"><span class="name" style="${gl > gv ? 'font-weight:800' : ''}">${esc(L)}</span><span class="badge">${esc(initials(L))}</span></div>
    <div class="vs"><div class="score">${gl} - ${gv}</div><div class="meta">${serieName ? esc(serieName) : 'Final'}</div></div>
    <div class="team"><span class="badge">${esc(initials(V))}</span><span class="name" style="${gv > gl ? 'font-weight:800' : ''}">${esc(V)}</span></div>
  </div>`;
}
