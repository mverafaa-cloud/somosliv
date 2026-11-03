import { getConfig, getPartidos, getEquipos, computeStandings, equiposById } from '../services/store.js';
import { mount, esc, teamInline, teamLogo } from '../ui/helpers.js';
import { shell, loading, preSeason } from '../ui/layout.js';
import { emptyBox } from './programacion.js';
import { seriesNavHTML, resolveNav, defaultSerie, isPlayoffSerie, isDescensoSerie, SNAV_CSS } from '../ui/series-nav.js';

let _serie = null;

export async function showPosiciones() {
  mount(loading());
  const [config, partidos, equipos] = await Promise.all([getConfig(), getPartidos(), getEquipos()]);
  const byId = equiposById(equipos);
  const seriesPresentes = new Set([...(config.series || []).map(s => s.id), ...partidos.map(p => p.serie).filter(Boolean)]);
  const has = (id) => seriesPresentes.has(id);
  // ¿Esta serie de playoff es por llave (semifinal/final) o liga (todos contra todos)?
  const esLlave = (serie) => partidos.some(p => p.serie === serie && /semi|final/i.test(p.ronda || ''));

  if (!equipos.length) {
    mount(shell(`<div class="container"><span class="eyebrow">Tabla</span><h1>Posiciones</h1>${preSeason(config, 'la tabla de posiciones')}</div>`, config));
    return;
  }

  if (!_serie || !has(_serie)) _serie = defaultSerie(has) || 'libre';

  function render() {
    let body;
    if (isDescensoSerie(_serie)) body = renderDescenso();
    else if (isPlayoffSerie(_serie) && esLlave(_serie)) body = renderBracket(_serie);
    else body = renderTabla();
    document.getElementById('pos-body').innerHTML = body;
    renderNav();
  }

  // ---------- TABLA (regular + playoffs tipo liga, como Senior) ----------
  function renderTabla() {
    const table = computeStandings(partidos, equipos, _serie);
    const jugados = table.reduce((a, r) => a + r.pj, 0);
    const n = table.length;
    const playoff = isPlayoffSerie(_serie);
    const hasProm = n > 8;
    const zona = (i) => playoff
      ? (i === 0 ? 'pos-oro' : '')
      : (i < 4 ? 'pos-oro' : (i < 8 ? 'pos-plata' : (hasProm && i >= 8 ? 'pos-prom' : '')));
    const rowCls = (i) => {
      const cls = [zona(i)];
      if (!playoff && i === 3 && n > 4) cls.push('zend');
      if (!playoff && i === 7 && hasProm) cls.push('zend');
      return cls.filter(Boolean).join(' ');
    };
    if (!table.length) return emptyBox('No hay equipos en esta serie todavía.');
    return `<div class="table-wrap"><table class="tbl">
        <thead><tr>
          <th class="num">#</th><th>Equipo</th>
          <th class="num">PJ</th><th class="num">PG</th><th class="num">PE</th><th class="num">PP</th>
          <th class="num">GF</th><th class="num">GC</th><th class="num">DG</th><th class="num">Pts</th>
        </tr></thead>
        <tbody>
          ${table.map((r, i) => `
            <tr class="${rowCls(i)}">
              <td class="pos">${i + 1}</td>
              <td>${teamInline(r.equipo.logo, r.equipo.nombre, { size: 26 })}</td>
              <td class="num">${r.pj}</td><td class="num">${r.pg}</td><td class="num">${r.pe}</td><td class="num">${r.pp}</td>
              <td class="num">${r.gf}</td><td class="num">${r.gc}</td><td class="num">${r.dg > 0 ? '+' : ''}${r.dg}</td>
              <td class="num pts">${r.pts}</td>
            </tr>`).join('')}
        </tbody></table></div>
        ${jugados === 0 ? '<div class="alert alert-info mt-2">La serie aún no registra partidos finalizados. La tabla se actualiza automáticamente al cargar resultados.</div>' : ''}
        ${playoff ? `
        <div class="table-legend"><span><span class="dot dot-oro"></span> 1° = Campeón de la copa</span></div>
        <p class="pos-note">Todos contra todos. El equipo con más puntos gana la copa. Ante igualdad define el <strong>enfrentamiento directo</strong> y luego la <strong>diferencia de goles</strong>.</p>` : `
        <div class="table-legend">
          <span><span class="dot dot-oro"></span> Clasifican a Copa de Oro (1°–4°)</span>
          <span><span class="dot dot-plata"></span> Clasifican a Copa de Plata (5°–8°)</span>
          ${hasProm ? '<span><span class="dot dot-prom"></span> Zona de descenso (9°–10°)</span>' : ''}
        </div>
        <p class="pos-note">Ante igualdad de puntos define el <strong>enfrentamiento directo</strong>; si persiste, la <strong>diferencia de goles</strong> (reglamento LIV).</p>`}`;
  }

  // ---------- BRACKET / LLAVE (playoffs Junior: semifinal + final) ----------
  const winnerId = (p) => (!p || p.estado !== 'finalizado' || p.golesLocal == null) ? null : (+p.golesLocal > +p.golesVisita ? p.local : (+p.golesVisita > +p.golesLocal ? p.visita : null));
  const scoreL = (p) => (p && p.estado === 'finalizado' && p.golesLocal != null) ? p.golesLocal : '';
  const scoreV = (p) => (p && p.estado === 'finalizado' && p.golesVisita != null) ? p.golesVisita : '';
  function side(teamId, score, win, placeholder) {
    const e = teamId ? byId[teamId] : null;
    const nm = e ? e.nombre : (placeholder || 'Por definir');
    const logo = e ? teamLogo(e.logo, nm, 24) : '<span class="badge" style="width:24px;height:24px">·</span>';
    return `<div class="brk-side ${win ? 'brk-win' : ''} ${e ? '' : 'brk-tbd'}">${logo}<span class="brk-nm">${esc(nm)}</span><span class="brk-sc">${score === '' || score == null ? '' : esc(score)}</span></div>`;
  }
  function matchBox(title, center, t1, t2, s1, s2, w1, w2, meta, ph1, ph2) {
    return `<div class="brk-match${center ? ' brk-final' : ''}">
      <div class="brk-title">${esc(title)}</div>
      <div class="brk-box">${side(t1, s1, w1, ph1)}${side(t2, s2, w2, ph2)}</div>
      ${meta ? `<div class="brk-meta">${meta}</div>` : ''}
    </div>`;
  }
  function metaOf(p) {
    if (!p) return '';
    const parts = [];
    if (p.fecha) { const d = p.fecha; parts.push(esc(d)); }
    if (p.hora) parts.push(esc(p.hora));
    if (p.cancha) parts.push('Cancha ' + esc(p.cancha));
    return parts.join(' · ');
  }
  function sfBox(p, title) {
    if (!p) return matchBox(title, false, null, null, '', '', false, false, 'Por jugar', 'Por definir', 'Por definir');
    const w = winnerId(p);
    return matchBox(title, false, p.local, p.visita, scoreL(p), scoreV(p), w === p.local, w === p.visita, metaOf(p),
                    p.seedLabelLocal || 'Por definir', p.seedLabelVisita || 'Por definir');
  }
  function renderBracket(serie) {
    const ms = partidos.filter(p => p.serie === serie);
    const sfs = ms.filter(p => /semi/i.test(p.ronda || '')).sort((a, b) => (a.llave || 99) - (b.llave || 99) || (a.hora || '').localeCompare(b.hora || ''));
    const fin = ms.find(p => /final/i.test(p.ronda || '') && !/semi/i.test(p.ronda || ''));
    const sf1 = sfs[0], sf2 = sfs[1];
    const w1 = winnerId(sf1), w2 = winnerId(sf2);
    const ft1 = (fin && fin.local) || w1 || null;
    const ft2 = (fin && fin.visita) || w2 || null;
    const fw = winnerId(fin);
    const finBox = matchBox('Final', true, ft1, ft2, scoreL(fin), scoreV(fin), fw && fw === ft1, fw && fw === ft2, metaOf(fin), 'Ganador Semifinal 1', 'Ganador Semifinal 2');
    const champ = fw ? byId[fw]?.nombre : null;
    return `<div class="bracket">
      <div class="brk-col">${sfBox(sf1, 'Semifinal 1')}</div>
      <div class="brk-col brk-center">${finBox}</div>
      <div class="brk-col">${sfBox(sf2, 'Semifinal 2')}</div>
    </div>
    <p class="pos-note" style="text-align:center">Eliminación directa: el ganador de cada semifinal juega la <strong>final</strong>.${champ ? ` 🏆 Campeón: <strong>${esc(champ)}</strong>.` : ''}</p>`;
  }

  // ---------- DESCENSO (un solo partido; el perdedor desciende) ----------
  function renderDescenso() {
    const p = partidos.find(x => x.serie === _serie);
    if (!p) return emptyBox('El partido de descenso se define al terminar la fase regular (9° vs 10°).');
    const w = winnerId(p), loser = w ? (w === p.local ? p.visita : p.local) : null;
    const L = byId[p.local], V = byId[p.visita];
    return `<div class="bracket"><div class="brk-col brk-center" style="max-width:420px;margin:0 auto">
      <div class="brk-match brk-final">
        <div class="brk-title" style="background:#9b1c1c">Partido de descenso</div>
        <div class="brk-box">
          <div class="brk-side ${w === p.local ? 'brk-win' : ''} ${L ? '' : 'brk-tbd'}">${teamLogo(L?.logo, L?.nombre, 28)}<span class="brk-nm">${esc(L?.nombre || p.seedLabelLocal || 'Por definir')}</span><span class="brk-sc">${esc(scoreL(p))}</span></div>
          <div class="brk-side ${w === p.visita ? 'brk-win' : ''} ${V ? '' : 'brk-tbd'}">${teamLogo(V?.logo, V?.nombre, 28)}<span class="brk-nm">${esc(V?.nombre || p.seedLabelVisita || 'Por definir')}</span><span class="brk-sc">${esc(scoreV(p))}</span></div>
        </div>
        ${metaOf(p) ? `<div class="brk-meta">${metaOf(p)}</div>` : ''}
      </div>
    </div></div>
    <p class="pos-note" style="text-align:center">Un solo partido entre el <strong>9°</strong> y el <strong>10°</strong>. El <strong>perdedor desciende</strong> la próxima temporada.${loser ? ` 🔻 Desciende: <strong>${esc(byId[loser]?.nombre || '')}</strong>.` : ''}</p>`;
  }

  // ---------- NAV ----------
  function renderNav() {
    const el = document.getElementById('pos-chips');
    el.innerHTML = seriesNavHTML(_serie, has, esc);
    el.querySelectorAll('[data-nav]').forEach(c => c.addEventListener('click', () => {
      _serie = resolveNav(c.dataset.nav, has) || _serie;
      render();
    }));
  }

  const inner = `
  <div class="container">
    <span class="eyebrow">Tabla</span>
    <h1>Posiciones</h1>
    <p class="subtitle mb-3">Se actualiza automáticamente a partir de los resultados. 3 puntos por victoria, 1 por empate.</p>
    <style>${SNAV_CSS}
      .bracket{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;align-items:center;margin-top:8px}
      .brk-col{display:flex;flex-direction:column;gap:18px;justify-content:center;min-width:0}
      .brk-match{background:var(--c-surface,#fff);border:1px solid var(--c-line,#D9E6DE);border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(11,18,12,.06)}
      .brk-final{box-shadow:0 4px 16px rgba(6,122,62,.16)}
      .brk-title{background:var(--c-brand,#067A3E);color:#fff;font-size:.72rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase;padding:5px 10px;text-align:center}
      .brk-final .brk-title{background:#0B120C}
      .brk-side{display:flex;align-items:center;gap:8px;padding:8px 10px}
      .brk-side+.brk-side{border-top:1px solid var(--c-line,#D9E6DE)}
      .brk-nm{flex:1;min-width:0;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .brk-sc{font-weight:800;font-variant-numeric:tabular-nums;min-width:14px;text-align:right}
      .brk-win{background:var(--c-brand-soft,#D7EFE1)}.brk-win .brk-nm{color:var(--c-brand-2,#056433)}
      .brk-tbd .brk-nm{color:var(--c-muted,#6B7268);font-weight:500;font-style:italic}
      .brk-meta{font-size:.72rem;color:var(--c-muted,#6B7268);text-align:center;padding:4px 8px;border-top:1px solid var(--c-line,#D9E6DE)}
      @media(max-width:640px){.bracket{grid-template-columns:1fr;gap:12px}.brk-center{order:3}}
    </style>
    <div id="pos-chips" class="mb-2"></div>
    <div id="pos-body"></div>
  </div>`;

  mount(shell(inner, config));
  render();
}
