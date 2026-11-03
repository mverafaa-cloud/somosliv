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
  function metaOf(p) {
    if (!p) return '';
    const parts = [];
    if (p.fecha) parts.push(esc(p.fecha));
    if (p.hora) parts.push(esc(p.hora));
    if (p.cancha) parts.push('Cancha ' + esc(p.cancha));
    return parts.join(' · ');
  }
  function brkTeam(teamId, placeholder, score, win) {
    const e = teamId ? byId[teamId] : null;
    const nm = e ? e.nombre : (placeholder || 'Por definir');
    const logo = e ? teamLogo(e.logo, nm, 30) : '<span class="brk2-ph">?</span>';
    return `<div class="brk2-team${win ? ' brk2-win' : ''}${e ? '' : ' brk2-tbd'}">
        <span class="brk2-logo">${logo}</span>
        <span class="brk2-nm">${esc(nm)}</span>
        <span class="brk2-sc">${score === '' || score == null ? '' : esc(score)}</span>
      </div>`;
  }
  function brkMatch(p, phL, phR, cls) {
    const w = winnerId(p);
    const meta = metaOf(p);
    return `<div class="brk2-match${cls ? ' ' + cls : ''}">
        <div class="brk2-teams">
          ${brkTeam(p ? p.local : null, phL, scoreL(p), !!(w && p && w === p.local))}
          ${brkTeam(p ? p.visita : null, phR, scoreV(p), !!(w && p && w === p.visita))}
        </div>
        ${meta ? `<div class="brk2-meta">${meta}</div>` : ''}
      </div>`;
  }
  function renderBracket(serie) {
    const ms = partidos.filter(p => p.serie === serie);
    const sfs = ms.filter(p => /semi/i.test(p.ronda || '')).sort((a, b) => (a.llave || 99) - (b.llave || 99) || (a.hora || '').localeCompare(b.hora || ''));
    const fin = ms.find(p => /final/i.test(p.ronda || '') && !/semi/i.test(p.ronda || ''));
    const sf1 = sfs[0], sf2 = sfs[1];
    const w1 = winnerId(sf1), w2 = winnerId(sf2);
    const fw = winnerId(fin);
    const champ = fw ? byId[fw]?.nombre : null;
    const plata = /plata/i.test(serie);
    const copa = plata ? 'Copa de Plata' : 'Copa de Oro';
    const seeds = plata ? [['5º', '8º'], ['6º', '7º']] : [['1º', '4º'], ['2º', '3º']];
    const phL = (p, i) => (p && p.seedLabelLocal) || seeds[i][0];
    const phR = (p, i) => (p && p.seedLabelVisita) || seeds[i][1];
    const finForRender = fin
      ? { ...fin, local: fin.local || w1 || '', visita: fin.visita || w2 || '' }
      : { local: w1 || '', visita: w2 || '', ronda: 'final' };
    return `
      <div class="brk2 ${plata ? 'is-plata' : 'is-oro'}">
        <div class="brk2-cell brk2-wing">
          <span class="brk2-round">Semifinal 1</span>
          ${brkMatch(sf1, phL(sf1, 0), phR(sf1, 0))}
        </div>
        <div class="brk2-link"></div>
        <div class="brk2-cell brk2-hub">
          <span class="brk2-cup" aria-hidden="true">🏆</span>
          <span class="brk2-round brk2-round-fin">Final · ${esc(copa)}</span>
          ${brkMatch(finForRender, 'Ganador Semifinal 1', 'Ganador Semifinal 2', 'brk2-final')}
        </div>
        <div class="brk2-link"></div>
        <div class="brk2-cell brk2-wing">
          <span class="brk2-round">Semifinal 2</span>
          ${brkMatch(sf2, phL(sf2, 1), phR(sf2, 1))}
        </div>
      </div>
      ${champ ? `<p class="brk2-champ">🏆 Campeón de la <strong>${esc(copa)}</strong>: <strong>${esc(champ)}</strong></p>` : ''}
      <p class="pos-note" style="text-align:center">Eliminación directa a un partido: el ganador de cada semifinal juega la <strong>final</strong>.</p>`;
  }

  // ---------- DESCENSO (un solo partido; el perdedor desciende) ----------
  function renderDescenso() {
    const p = partidos.find(x => x.serie === _serie);
    if (!p) return emptyBox('El partido de descenso se define al terminar la fase regular (9° vs 10°).');
    const w = winnerId(p), loser = w ? (w === p.local ? p.visita : p.local) : null;
    const L = byId[p.local], V = byId[p.visita];
    const row = (e, seedLbl, score, win) => `<div class="brk2-team${win ? ' brk2-win' : ''}${e ? '' : ' brk2-tbd'}">
        <span class="brk2-logo">${e ? teamLogo(e.logo, e.nombre, 30) : '<span class="brk2-ph">?</span>'}</span>
        <span class="brk2-nm">${esc(e?.nombre || seedLbl || 'Por definir')}</span>
        <span class="brk2-sc">${score === '' || score == null ? '' : esc(score)}</span>
      </div>`;
    return `<div class="brk2 brk2-solo">
      <div class="brk2-cell brk2-hub">
        <span class="brk2-round brk2-round-desc">Partido de descenso</span>
        <div class="brk2-match brk2-desc">
          <div class="brk2-teams">
            ${row(L, p.seedLabelLocal, scoreL(p), w === p.local)}
            ${row(V, p.seedLabelVisita, scoreV(p), w === p.visita)}
          </div>
          ${metaOf(p) ? `<div class="brk2-meta">${metaOf(p)}</div>` : ''}
        </div>
      </div>
    </div>
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
      /* ---- Llave de eliminación (bracket) ---- */
      .brk2{display:flex;align-items:center;justify-content:center;margin:52px 0 6px;position:relative}
      .brk2-cell{flex:1 1 0;min-width:0;position:relative}
      .brk2-hub{flex:1.12 1 0}
      .brk2-solo{max-width:440px;margin-left:auto;margin-right:auto;margin-top:34px}
      .brk2-round{position:absolute;left:0;right:0;top:-22px;text-align:center;font-size:.7rem;font-weight:800;letter-spacing:.11em;text-transform:uppercase;color:var(--c-muted,#6B7268)}
      .brk2-round-fin{color:var(--c-brand-2,#056433)}
      .brk2-round-desc{position:static;display:block;margin-bottom:8px;color:#9b1c1c}
      .brk2-cup{position:absolute;left:50%;top:-54px;transform:translateX(-50%);font-size:30px;line-height:1;filter:drop-shadow(0 3px 5px rgba(0,0,0,.18))}
      .brk2-link{flex:0 0 42px;height:4px;align-self:center;background:linear-gradient(90deg,var(--c-brand,#067A3E),var(--c-brand-2,#056433));opacity:.55;border-radius:4px}
      .brk2-match{position:relative;z-index:1;width:100%;background:var(--c-surface,#fff);border:1px solid var(--c-line,#D9E6DE);border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(11,18,12,.07)}
      .brk2-final{border:2px solid var(--c-brand,#067A3E);box-shadow:0 8px 26px rgba(6,122,62,.22)}
      .brk2-final::before,.brk2-final::after{content:'';position:absolute;top:50%;width:11px;height:11px;border-radius:50%;background:var(--c-brand,#067A3E);transform:translateY(-50%);z-index:2}
      .brk2-final::before{left:-7px}.brk2-final::after{right:-7px}
      .brk2-desc{border:2px solid #9b1c1c;box-shadow:0 6px 20px rgba(155,28,28,.16)}
      .brk2-teams{display:flex;flex-direction:column}
      .brk2-team{display:flex;align-items:center;gap:10px;padding:10px 12px}
      .brk2-team+.brk2-team{border-top:1px solid var(--c-line,#D9E6DE)}
      .brk2-logo{display:flex;width:30px;height:30px;flex:0 0 30px;align-items:center;justify-content:center}
      .brk2-logo img{width:30px;height:30px;object-fit:contain}
      .brk2-ph{display:flex;width:30px;height:30px;align-items:center;justify-content:center;border-radius:50%;background:var(--c-brand-soft,#D7EFE1);color:var(--c-brand-2,#056433);font-weight:800;font-size:.85rem}
      .brk2-nm{flex:1;min-width:0;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .brk2-sc{font-weight:800;font-variant-numeric:tabular-nums;min-width:16px;text-align:right;font-size:1.05rem}
      .brk2-win{background:var(--c-brand-soft,#D7EFE1)}.brk2-win .brk2-nm{color:var(--c-brand-2,#056433)}
      .brk2-desc .brk2-win{background:#f7dede}.brk2-desc .brk2-win .brk2-nm{color:#9b1c1c}
      .brk2-tbd .brk2-nm{color:var(--c-muted,#6B7268);font-weight:600;font-style:italic}
      .brk2-meta{font-size:.72rem;color:var(--c-muted,#6B7268);text-align:center;padding:6px 8px;border-top:1px solid var(--c-line,#D9E6DE)}
      .brk2-champ{text-align:center;margin:12px 0 0;font-size:.95rem;color:var(--c-brand-2,#056433)}
      @media(max-width:640px){
        .brk2{flex-direction:column;align-items:stretch;gap:26px;margin-top:8px}
        .brk2-wing{order:1}.brk2-hub{order:3}
        .brk2-round{position:static;display:block;margin-bottom:6px}
        .brk2-cup{position:static;transform:none;display:block;text-align:center;margin:0 auto 2px}
        .brk2-link{display:none}
        .brk2-final::before,.brk2-final::after{display:none}
      }
    </style>
    <div id="pos-chips" class="mb-2"></div>
    <div id="pos-body"></div>
  </div>`;

  mount(shell(inner, config));
  render();
}
