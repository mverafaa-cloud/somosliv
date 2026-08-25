import { getConfig, getPartidos, getEquipos, computeStandings, getGoleadores, equiposById } from '../services/store.js';
import { mount, esc, initials } from '../ui/helpers.js';
import { shell, loading } from '../ui/layout.js';
import { emptyBox } from './programacion.js';
import { preSeason } from '../ui/layout.js';
import { icon } from '../ui/icons.js';

let _serie = null;

export async function showPosiciones() {
  mount(loading());
  const [config, partidos, equipos, goleadores] = await Promise.all([getConfig(), getPartidos(), getEquipos(), getGoleadores()]);
  const series = config.series || [];
  const byId = equiposById(equipos);

  const jugados = partidos.filter(p => p.estado === 'finalizado' && p.golesLocal != null).length;
  if (!equipos.length || !jugados) {
    mount(shell(`<div class="container"><span class="eyebrow">Tabla</span><h1>Posiciones</h1>${preSeason(config, 'la tabla de posiciones')}</div>`, config));
    return;
  }

  if (!_serie || !series.find(s => s.id === _serie)) _serie = series[0]?.id || null;

  function render() {
    const table = _serie ? computeStandings(partidos, equipos, _serie) : [];
    const jugados = table.reduce((a, r) => a + r.pj, 0);
    const body = (!table.length)
      ? emptyBox('No hay equipos en esta serie todavía.')
      : `<div class="table-wrap"><table class="tbl">
          <thead><tr>
            <th class="num">#</th><th>Equipo</th>
            <th class="num">PJ</th><th class="num">PG</th><th class="num">PE</th><th class="num">PP</th>
            <th class="num">GF</th><th class="num">GC</th><th class="num">DG</th><th class="num">Pts</th>
          </tr></thead>
          <tbody>
            ${table.map((r, i) => `
              <tr class="${i === 0 ? 'row-promote' : ''}">
                <td class="pos">${i + 1}</td>
                <td><div class="team-cell"><span class="badge">${esc(initials(r.equipo.nombre))}</span>${esc(r.equipo.nombre)}</div></td>
                <td class="num">${r.pj}</td><td class="num">${r.pg}</td><td class="num">${r.pe}</td><td class="num">${r.pp}</td>
                <td class="num">${r.gf}</td><td class="num">${r.gc}</td><td class="num">${r.dg > 0 ? '+' : ''}${r.dg}</td>
                <td class="num pts">${r.pts}</td>
              </tr>`).join('')}
          </tbody></table></div>
          ${jugados === 0 ? '<div class="alert alert-info mt-2">La serie aún no registra partidos finalizados. La tabla se actualiza automáticamente al cargar resultados.</div>' : ''}
          <div class="table-legend"><span><span class="dot" style="background:var(--c-green)"></span> Líder</span></div>`;

    document.getElementById('pos-body').innerHTML = body;

    // Goleadores de la serie
    const gs = (goleadores || []).filter(g => g.serie === _serie).sort((a, b) => b.goles - a.goles).slice(0, 10);
    document.getElementById('gol-body').innerHTML = gs.length ? `
      <div class="card">
        <div class="card-header"><h3>${icon('ball', { size: 22 })} Goleadores</h3></div>
        <div class="table-wrap" style="border:none">
          <table class="tbl"><thead><tr><th class="num">#</th><th>Jugador</th><th>Equipo</th><th class="num">Goles</th></tr></thead>
          <tbody>${gs.map((g, i) => `<tr><td class="pos">${i + 1}</td><td style="font-weight:700">${esc(g.jugador)}</td><td class="muted">${esc(byId[g.equipo]?.nombre || g.equipo)}</td><td class="num pts">${g.goles}</td></tr>`).join('')}</tbody></table>
        </div>
      </div>` : '';

    document.querySelectorAll('#pos-chips .chip').forEach(c => c.classList.toggle('active', c.dataset.serie === _serie));
  }

  const inner = `
  <div class="container">
    <span class="eyebrow">Tabla</span>
    <h1>Posiciones</h1>
    <p class="subtitle mb-3">Se actualiza automáticamente a partir de los resultados. 3 puntos por victoria, 1 por empate.</p>
    <div class="chips" id="pos-chips">
      ${series.map(s => `<button class="chip" data-serie="${esc(s.id)}">${esc(s.nombre)}</button>`).join('')}
    </div>
    <div id="pos-body"></div>
    <div id="gol-body" class="mt-3"></div>
  </div>`;

  mount(shell(inner, config));
  document.querySelectorAll('#pos-chips .chip').forEach(c => c.addEventListener('click', () => { _serie = c.dataset.serie; render(); }));
  render();
}
