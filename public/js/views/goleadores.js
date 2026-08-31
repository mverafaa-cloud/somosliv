import { getConfig, getGoleadores, getEquipos, equiposById } from '../services/store.js';
import { mount, esc, teamInline } from '../ui/helpers.js';
import { shell, loading } from '../ui/layout.js';
import { icon } from '../ui/icons.js';
import { serieChips, emptyBox } from './programacion.js';

let _serie = 'all';

export async function showGoleadores() {
  mount(loading('Cargando goleadores…'));
  const [config, goles, equipos] = await Promise.all([getConfig(), getGoleadores(), getEquipos()]);
  const byId = equiposById(equipos);
  const series = config.series || [];

  function render() {
    // Agrupa por jugador y suma goles.
    const acc = {};
    goles.filter(g => _serie === 'all' || g.serie === _serie).forEach(g => {
      const k = g.jugadorId || `${g.equipo}:${g.nombre}`;
      if (!acc[k]) acc[k] = { nombre: g.nombre || '—', equipo: g.equipo, goles: 0 };
      acc[k].goles += (+g.goles || 0);
    });
    const rows = Object.values(acc).filter(r => r.goles > 0)
      .sort((a, b) => b.goles - a.goles || (a.nombre || '').localeCompare(b.nombre || ''));

    // Ranking con posiciones compartidas (mismo nº de goles = misma posición).
    let pos = 0, prev = null;
    rows.forEach((r, i) => { if (r.goles !== prev) { pos = i + 1; prev = r.goles; } r._pos = pos; });

    const maxG = rows.length ? rows[0].goles : 0;
    const body = rows.length ? `
      <div class="table-wrap"><table class="tbl tbl-pos">
        <thead><tr><th style="width:44px">#</th><th>Jugador</th><th>Equipo</th><th class="num">Goles</th></tr></thead>
        <tbody>
          ${rows.map(r => `
            <tr class="${r._pos === 1 ? 'is-leader' : ''}">
              <td class="num" style="font-weight:700">${r._pos}${r._pos === 1 ? ` ${icon('trophy', { size: 14 })}` : ''}</td>
              <td style="font-weight:700">${esc(r.nombre)}</td>
              <td>${r.equipo ? teamInline(byId[r.equipo]?.logo, byId[r.equipo]?.nombre || r.equipo, { size: 22 }) : '<span class="muted">—</span>'}</td>
              <td class="num"><span class="pill pill-dark" style="font-weight:800">${r.goles}</span></td>
            </tr>`).join('')}
        </tbody>
      </table></div>
      <p class="muted mt-2" style="font-size:.85rem">${rows.length} goleador${rows.length === 1 ? '' : 'es'} · ${rows.reduce((s, r) => s + r.goles, 0)} goles en total${maxG ? ` · puntero con ${maxG}` : ''}.</p>`
      : emptyBox('Todavía no hay goles registrados. Aparecerán aquí en cuanto se carguen los resultados.');

    const el = document.getElementById('gol-body');
    if (el) el.innerHTML = body;
    document.querySelectorAll('#serie-chips .chip').forEach(c => c.classList.toggle('active', c.dataset.serie === _serie));
  }

  const inner = `
  <div class="container">
    <span class="eyebrow">Tabla del torneo</span>
    <h1>Goleadores</h1>
    <p class="subtitle mb-3">Todos los que han convertido, ordenados de mayor a menor. Se actualiza al cargar los resultados de cada fecha.</p>
    ${serieChips(series)}
    <div id="gol-body"></div>
  </div>`;

  mount(shell(inner, config));
  document.querySelectorAll('#serie-chips .chip').forEach(c => c.addEventListener('click', () => { _serie = c.dataset.serie; render(); }));
  render();
}
