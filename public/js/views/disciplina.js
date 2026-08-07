import { getConfig, getDisciplina, getEquipos, equiposById } from '../services/store.js';
import { mount, esc, fmtDate, parseDate } from '../ui/helpers.js';
import { shell, loading, preSeason } from '../ui/layout.js';
import { serieChips, emptyBox } from './programacion.js';

let _serie = 'all';

export async function showDisciplina() {
  mount(loading());
  const [config, tarjetas, equipos] = await Promise.all([getConfig(), getDisciplina(), getEquipos()]);
  const byId = equiposById(equipos);
  const series = config.series || [];

  if (!tarjetas.length) {
    mount(shell(`<div class="container"><span class="eyebrow">Comité de disciplina</span><h1>Disciplina</h1>${preSeason(config, 'las amonestaciones y sanciones')}</div>`, config));
    return;
  }

  function render() {
    const list = tarjetas
      .filter(t => _serie === 'all' || t.serie === _serie)
      .sort((a, b) => (parseDate(b.fecha) - parseDate(a.fecha)));

    const amar = list.filter(t => t.tipo === 'amarilla').length;
    const rojas = list.filter(t => t.tipo === 'roja').length;

    const body = list.length ? `
      <div class="stat-grid">
        <div class="stat"><div class="stat-label">Amarillas</div><div class="stat-value" style="color:var(--c-accent-deep)">${amar}</div></div>
        <div class="stat"><div class="stat-label">Rojas</div><div class="stat-value" style="color:var(--c-red)">${rojas}</div></div>
        <div class="stat"><div class="stat-label">Sanciones</div><div class="stat-value">${list.filter(t => t.sancion).length}</div></div>
      </div>
      <div class="table-wrap"><table class="tbl">
        <thead><tr><th>Fecha</th><th></th><th>Jugador</th><th>Equipo</th><th>Motivo</th><th>Sanción</th></tr></thead>
        <tbody>
          ${list.map(t => `
            <tr>
              <td class="muted" style="white-space:nowrap">${esc(fmtDate(t.fecha))}</td>
              <td>${t.tipo === 'roja' ? '<span class="pill pill-red"><span class="tarjeta tarjeta-roja"></span> Roja</span>' : '<span class="pill" style="background:var(--c-accent-soft);color:var(--c-accent-deep)"><span class="tarjeta tarjeta-amarilla"></span> Amarilla</span>'}</td>
              <td style="font-weight:700">${esc(t.jugador || '—')}</td>
              <td class="muted">${esc(byId[t.equipo]?.nombre || t.equipo || '—')}</td>
              <td class="muted">${esc(t.motivo || '')}</td>
              <td>${t.sancion ? `<span class="pill pill-dark">${esc(t.sancion)}</span>` : '<span class="muted">—</span>'}</td>
            </tr>`).join('')}
        </tbody>
      </table></div>` : emptyBox('Sin registros de disciplina por ahora. ¡Buen fair play!');

    document.getElementById('disc-body').innerHTML = body;
    document.querySelectorAll('#serie-chips .chip').forEach(c => c.classList.toggle('active', c.dataset.serie === _serie));
  }

  const inner = `
  <div class="container">
    <span class="eyebrow">Comité de disciplina</span>
    <h1>Disciplina</h1>
    <p class="subtitle mb-3">Amonestaciones, expulsiones y sanciones. Cero violencia: los hechos graves se castigan drásticamente.</p>
    ${serieChips(series)}
    <div id="disc-body"></div>
  </div>`;

  mount(shell(inner, config));
  document.querySelectorAll('#serie-chips .chip').forEach(c => c.addEventListener('click', () => { _serie = c.dataset.serie; render(); }));
  render();
}
