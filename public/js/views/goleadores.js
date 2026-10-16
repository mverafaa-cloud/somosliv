import { getConfig, getGoleadores, getEquipos, equiposById } from '../services/store.js';
import { mount, esc, teamInline } from '../ui/helpers.js';
import { shell, loading } from '../ui/layout.js';
import { icon } from '../ui/icons.js';
import { serieChips, emptyBox } from './programacion.js';

let _serie = 'all';

const TOP_N = 5;   // Se muestra solo el Top 5 de goleadores por serie.

export async function showGoleadores() {
  mount(loading('Cargando goleadores…'));
  const [config, goles, equipos] = await Promise.all([getConfig(), getGoleadores(), getEquipos()]);
  const byId = equiposById(equipos);
  const series = config.series || [];

  // Ranking de goleadores de UNA serie, limitado al Top 5.
  // El corte es por posición (r._pos <= 5), así los empates en el 5º puesto
  // se muestran todos y no se deja a nadie fuera por desempate arbitrario.
  function rankSerie(serieId) {
    const acc = {};
    goles.filter(g => g.serie === serieId).forEach(g => {
      const k = g.jugadorId || `${g.equipo}:${g.nombre}`;
      if (!acc[k]) acc[k] = { nombre: g.nombre || '—', equipo: g.equipo, goles: 0 };
      acc[k].goles += (+g.goles || 0);
    });
    const rows = Object.values(acc).filter(r => r.goles > 0)
      .sort((a, b) => b.goles - a.goles || (a.nombre || '').localeCompare(b.nombre || ''));
    let pos = 0, prev = null;
    rows.forEach((r, i) => { if (r.goles !== prev) { pos = i + 1; prev = r.goles; } r._pos = pos; });
    return rows.filter(r => r._pos <= TOP_N);
  }

  function serieTable(serieId, serieNombre) {
    const rows = rankSerie(serieId);
    if (!rows.length) return `
      <h2 class="mb-2">${esc(serieNombre)}</h2>
      ${emptyBox('Todavía no hay goles registrados en esta serie.')}`;
    return `
      <h2 class="mb-2">${esc(serieNombre)} · Top ${TOP_N}</h2>
      <div class="table-wrap mb-3"><table class="tbl tbl-pos">
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
      </table></div>`;
  }

  function render() {
    const shown = (_serie === 'all') ? series : series.filter(s => s.id === _serie);
    const body = shown.length
      ? shown.map(s => serieTable(s.id, s.nombre)).join('')
      : emptyBox('Todavía no hay goles registrados. Aparecerán aquí en cuanto se carguen los resultados.');

    const el = document.getElementById('gol-body');
    if (el) el.innerHTML = body;
    document.querySelectorAll('#serie-chips .chip').forEach(c => c.classList.toggle('active', c.dataset.serie === _serie));
  }

  const inner = `
  <div class="container">
    <span class="eyebrow">Tabla del torneo</span>
    <h1>Goleadores</h1>
    <p class="subtitle mb-3">El Top ${TOP_N} de goleadores de cada serie. Se actualiza al cargar los resultados de cada fecha.</p>
    ${serieChips(series)}
    <div id="gol-body"></div>
  </div>`;

  mount(shell(inner, config));
  document.querySelectorAll('#serie-chips .chip').forEach(c => c.addEventListener('click', () => { _serie = c.dataset.serie; render(); }));
  render();
}
