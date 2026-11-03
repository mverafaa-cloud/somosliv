import { getConfig, getEquipos, getPlanteles, getPartidos, getDisciplina, getGoleadores, computeStandings } from '../services/store.js';
import { mount, esc, initials } from '../ui/helpers.js';
import { shell, loading, logoMarquee, preSeason } from '../ui/layout.js';
import { icon } from '../ui/icons.js';

// ===== LISTA DE EQUIPOS =====
export async function showEquipos() {
  mount(loading());
  const [config, equipos] = await Promise.all([getConfig(), getEquipos()]);
  const series = config.series || [];

  if (!equipos.length) {
    mount(shell(`<div class="container"><span class="eyebrow">Temporada ${esc(config.temporada || '2026')}</span><h1>Equipos</h1>${preSeason(config, 'los equipos inscritos')}</div>`, config));
    return;
  }

  const seen = new Set(); const uniq = [];
  equipos.forEach(e => { if (!seen.has(e.nombre)) { seen.add(e.nombre); uniq.push(e); } });

  const card = (e) => `
    <a class="equipo-card is-clickable" href="/equipos/${esc(e.id)}" data-link>
      <div class="badge-lg">${e.logo
        ? `<img src="${esc(e.logo)}" alt="${esc(e.nombre)}" loading="lazy">`
        : `<span style="font-family:var(--font-display);font-size:1.6rem;color:var(--c-brand)">${esc(initials(e.nombre))}</span>`}</div>
      <div class="nom">${esc(e.nombre)}</div>
      <span class="equipo-cta">Ver equipo</span>
    </a>`;

  const grupo = (s) => {
    const list = equipos.filter(e => e.serie === s.id);
    if (!list.length) return '';
    return `
      <div class="section" style="padding:28px 0">
        <div class="spread">
          <div><span class="eyebrow">Serie</span><h2 style="margin:0">${esc(s.nombre)}</h2></div>
          <span class="pill pill-brand">${list.length} equipos</span>
        </div>
        <div class="equipos-grid mt-2">${list.map(card).join('')}</div>
      </div>`;
  };

  const inner = `
  <div class="container">
    <span class="eyebrow">Temporada ${esc(config.temporada || '2026')}</span>
    <h1>Equipos inscritos</h1>
    <p class="subtitle mb-3">Los equipos confirmados para el estreno de la LIV en ${esc(config.sede || 'Complejo Deggiano')}. Toca un equipo para ver su información y estadísticas.</p>
    ${logoMarquee(uniq)}
    ${series.map(grupo).join('')}
  </div>`;
  mount(shell(inner, config));
  ensureTeamStyles();
}

// ===== PÁGINA DE UN EQUIPO =====
export async function showEquipo(id) {
  mount(loading());
  const [config, equipos, planteles, partidos, tarjetas, goles] = await Promise.all([
    getConfig(), getEquipos(), getPlanteles(), getPartidos(), getDisciplina(), getGoleadores()]);
  const equipo = equipos.find(e => e.id === id);
  if (!equipo) {
    mount(shell(`<div class="container"><a class="eq-back" href="/equipos" data-link>← Equipos</a><h1>Equipo no encontrado</h1><p class="subtitle">Puede que el enlace sea antiguo. Volvé a la lista de equipos.</p></div>`, config));
    ensureTeamStyles();
    return;
  }
  const byId = {}; equipos.forEach(e => byId[e.id] = e);
  const stats = teamStats(equipo, partidos, equipos, tarjetas, {});
  const matches = teamMatches(equipo, partidos, byId);
  const scorer = teamTopScorer(equipo, goles);
  const jugadores = planteles[id] || [];
  const serieNombre = (config.series || []).find(s => s.id === equipo.serie)?.nombre || '';

  const logo = equipo.logo
    ? `<img src="${esc(equipo.logo)}" alt="${esc(equipo.nombre)}">`
    : `<span class="eq-logo-ini">${esc(initials(equipo.nombre))}</span>`;

  const half = Math.ceil(jugadores.length / 2);
  const colList = (arr) => arr.map(p => `
    <li><span class="pm-num">${esc(p.n)}</span><span class="pm-nom">${esc(p.nombre)}</span><span class="pm-nac">${p.nac ? esc(p.nac) : '—'}</span></li>`).join('');
  const roster = jugadores.length ? `
    <div class="ts2-sec">Plantel · ${jugadores.length} jugadores</div>
    <div class="pm-cols">
      <ol class="pm-list" start="1">${colList(jugadores.slice(0, half))}</ol>
      <ol class="pm-list">${colList(jugadores.slice(half))}</ol>
    </div>
    <p class="pm-foot" style="border:0;padding-left:0">Se muestran nombre y fecha de nacimiento. Los RUT se mantienen reservados.</p>` : '';

  const inner = `
  <div class="container eq-page">
    <a class="eq-back" href="/equipos" data-link>← Volver a Equipos</a>
    <div class="eq-hero">
      <div class="eq-logo">${logo}</div>
      <div class="eq-hero-txt">
        <span class="eyebrow">${esc(serieNombre)}</span>
        <h1 class="eq-name">${esc(equipo.nombre)}</h1>
      </div>
    </div>
    ${statsBlock(stats, matches, scorer)}
    ${matchesBlock(matches, equipo)}
    ${roster}
  </div>`;
  mount(shell(inner, config));
  ensureTeamStyles();
}

// ---- Cálculos por equipo (compartidos) ----
function teamStats(e, partidos, equipos, tarjetas, cache) {
  const serie = e.serie;
  if (!(serie in cache)) cache[serie] = computeStandings(partidos, equipos, serie);
  const table = cache[serie];
  const idx = table.findIndex(r => r.equipo.id === e.id);
  const r = idx >= 0 ? table[idx] : null;
  const pj = r?.pj || 0, pts = r?.pts || 0, obten = pj * 3;
  const vallas = partidos.filter(p => (p.local === e.id || p.visita === e.id) && p.serie === serie
    && p.estado === 'finalizado' && p.golesLocal != null
    && ((p.local === e.id ? +p.golesVisita : +p.golesLocal) === 0)).length;
  return {
    pos: idx >= 0 ? idx + 1 : null, total: table.length,
    pj, pg: r?.pg || 0, pe: r?.pe || 0, pp: r?.pp || 0,
    gf: r?.gf || 0, gc: r?.gc || 0, dg: r?.dg || 0, pts, vallas,
    rend: obten ? Math.round((pts / obten) * 100) : null,
    amar: tarjetas.filter(t => t.equipo === e.id && t.tipo === 'amarilla').length,
    rojas: tarjetas.filter(t => t.equipo === e.id && t.tipo === 'roja').length,
  };
}
const _serieTag = (s) => /oro$/.test(s) ? 'Oro' : (/plata$/.test(s) ? 'Plata' : (/descenso$/.test(s) ? 'Descenso' : ''));
function teamMatches(e, partidos, byId) {
  return partidos
    .filter(p => (p.local === e.id || p.visita === e.id) && p.estado === 'finalizado' && p.golesLocal != null && p.golesVisita != null)
    .map(p => {
      const home = p.local === e.id;
      const gf = +(home ? p.golesLocal : p.golesVisita);
      const gc = +(home ? p.golesVisita : p.golesLocal);
      return { fecha: p.fecha, fnum: p.fecha_num, home, gf, gc,
        rival: byId[home ? p.visita : p.local] || null,
        res: gf > gc ? 'G' : (gf < gc ? 'P' : 'E'), tag: _serieTag(p.serie || '') };
    })
    .sort((a, b) => (new Date(a.fecha || 0) - new Date(b.fecha || 0)) || ((a.fnum || 0) - (b.fnum || 0)));
}
function teamTopScorer(e, goles) {
  const acc = {};
  goles.filter(g => g.equipo === e.id).forEach(g => {
    const k = g.jugadorId || `${g.nombre || '—'}`;
    if (!acc[k]) acc[k] = { nombre: g.nombre || '—', goles: 0 };
    acc[k].goles += (+g.goles || 0);
  });
  return Object.values(acc).filter(r => r.goles > 0).sort((a, b) => b.goles - a.goles)[0] || null;
}

const C_WIN = '#067A3E', C_DRAW = '#9AA39B', C_LOSS = '#C23B3B';

function donutSVG(st) {
  const seg = [{ v: st.pg, c: C_WIN }, { v: st.pe, c: C_DRAW }, { v: st.pp, c: C_LOSS }];
  const total = st.pj || 0;
  const r = 52, cx = 60, cy = 60, sw = 15, circ = 2 * Math.PI * r;
  let off = 0;
  const arcs = total ? seg.filter(s => s.v > 0).map(s => {
    const len = (s.v / total) * circ;
    const el = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.c}" stroke-width="${sw}" stroke-dasharray="${len.toFixed(2)} ${(circ - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`;
    off += len; return el;
  }).join('') : '';
  return `<svg viewBox="0 0 120 120" class="ts2-ring" role="img" aria-label="Partidos jugados">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#E3EDE6" stroke-width="${sw}"/>
    ${arcs}
    <text x="60" y="58" text-anchor="middle" class="ts2-ring-num">${total}</text>
    <text x="60" y="76" text-anchor="middle" class="ts2-ring-lbl">Jugados</text>
  </svg>`;
}

function statsBlock(st, matches, scorer) {
  if (!st) return '';
  const nf = (n) => (Math.round(n * 100) / 100).toString().replace('.', ',');
  const med = (v) => st.pj ? `${nf(v / st.pj)} por partido` : '—';
  const pos = st.pos ? `${st.pos}º` : '—';
  const rend = st.rend == null ? 0 : st.rend;
  const dg = (st.dg > 0 ? '+' : '') + st.dg;
  const resWord = { G: 'Ganó', E: 'Empató', P: 'Perdió' };
  const last5 = (matches || []).slice(-5);
  const formStrip = last5.length
    ? `<div class="ts2-form"><span class="ts2-form-lbl">Últimos</span>${last5.map(m => `<span class="ts2-dot ts2-d-${m.res}" title="${resWord[m.res]} ${m.gf}-${m.gc}">${m.res}</span>`).join('')}</div>`
    : '';
  const scorerCard = scorer
    ? `<div class="ts2-scorer"><span class="ts2-sc-ico">${icon('ball', { size: 20 })}</span>
        <div class="ts2-sc-txt"><span class="ts2-sc-lbl">Goleador del equipo</span><span class="ts2-sc-nom">${esc(scorer.nombre)}</span></div>
        <span class="ts2-sc-goles">${scorer.goles}<small>${scorer.goles === 1 ? 'gol' : 'goles'}</small></span></div>`
    : '';
  const metric = (val, lbl, sub, cls, ico) => `
    <div class="ts2-m${cls ? ' ' + cls : ''}">
      ${ico || ''}<span class="ts2-m-v">${val}</span>
      <span class="ts2-m-l">${lbl}</span>
      ${sub ? `<span class="ts2-m-s">${sub}</span>` : ''}
    </div>`;
  const cardIco = (c) => `<span class="ts2-card" style="background:${c}"></span>`;
  return `
    <div class="ts2-sec">Estadísticas · fase regular</div>
    <div class="ts2-top">
      <div class="ts2-donut">
        ${donutSVG(st)}
        <ul class="ts2-leg">
          <li><i style="background:${C_WIN}"></i>Ganados<b>${st.pg}</b></li>
          <li><i style="background:${C_DRAW}"></i>Empates<b>${st.pe}</b></li>
          <li><i style="background:${C_LOSS}"></i>Perdidos<b>${st.pp}</b></li>
        </ul>
      </div>
      <div class="ts2-side">
        <div class="ts2-kpis">
          <div class="ts2-kpi"><span class="ts2-kpi-v">${pos}</span><span class="ts2-kpi-l">Posición</span></div>
          <div class="ts2-kpi"><span class="ts2-kpi-v">${st.pts}</span><span class="ts2-kpi-l">Puntos</span></div>
        </div>
        <div class="ts2-rend">
          <div class="ts2-rend-top"><span>Rendimiento</span><b>${st.rend == null ? '—' : st.rend + '%'}</b></div>
          <div class="ts2-bar"><i style="width:${rend}%"></i></div>
          <span class="ts2-rend-sub">${st.pts} de ${st.pj * 3} puntos posibles</span>
        </div>
        ${formStrip}
      </div>
    </div>
    ${scorerCard}
    <div class="ts2-metrics">
      ${metric(st.gf, 'Goles a favor', `${med(st.gf)}`)}
      ${metric(st.gc, 'Goles en contra', `${med(st.gc)}`)}
      ${metric(dg, 'Diferencia de gol')}
      ${metric(st.vallas, 'Vallas invictas', 'partidos sin recibir')}
      ${metric(st.amar, 'Amarillas', med(st.amar), '', cardIco('#E3B008'))}
      ${metric(st.rojas, 'Rojas', med(st.rojas), '', cardIco('#C23B3B'))}
    </div>`;
}

function matchesBlock(matches, equipo) {
  if (!matches || !matches.length) return '';
  const resWord = { G: 'Ganó', E: 'Empató', P: 'Perdió' };
  const row = (m) => {
    const rn = m.rival?.nombre || 'Rival';
    const logo = m.rival?.logo
      ? `<img src="${esc(m.rival.logo)}" alt="" class="mt-logo">`
      : `<span class="mt-logo mt-logo-ini">${esc(initials(rn))}</span>`;
    const fx = m.tag ? m.tag : (m.fnum ? 'F' + m.fnum : '');
    return `<li class="mt-row mt-${m.res}">
      <span class="mt-fx">${esc(fx)}</span>
      <span class="mt-loc" title="${m.home ? 'Local' : 'Visita'}">${m.home ? 'L' : 'V'}</span>
      ${logo}<span class="mt-team">${esc(rn)}</span>
      <span class="mt-score">${m.gf}<i>-</i>${m.gc}</span>
      <span class="mt-badge mt-b-${m.res}" title="${resWord[m.res]}">${m.res}</span>
    </li>`;
  };
  return `
    <div class="ts2-sec">Partidos jugados · ${matches.length}</div>
    <ul class="mt-list">${matches.map(row).join('')}</ul>`;
}

function ensureTeamStyles() {
  if (document.getElementById('plantel-css')) return;
  const st = document.createElement('style');
  st.id = 'plantel-css';
  st.textContent = `
  a.equipo-card{display:block;text-decoration:none;color:inherit}
  .equipo-card.is-clickable{cursor:pointer;transition:transform .12s ease,box-shadow .12s ease}
  .equipo-card.is-clickable:hover{transform:translateY(-3px);box-shadow:var(--shadow-md,0 8px 24px rgba(6,122,62,.14))}
  .equipo-cta{display:block;margin-top:6px;font-size:.74rem;font-weight:800;letter-spacing:.04em;color:var(--c-brand,#067A3E);text-transform:uppercase}
  /* página de equipo */
  .eq-back{display:inline-flex;align-items:center;gap:6px;font-weight:700;color:var(--c-brand,#067A3E);text-decoration:none;font-size:.9rem;margin-bottom:12px}
  .eq-back:hover{text-decoration:underline}
  .eq-hero{display:flex;align-items:center;gap:16px;margin-bottom:4px}
  .eq-logo{width:84px;height:84px;flex:0 0 84px;border-radius:16px;background:var(--c-bg-alt,#EEF3EE);display:flex;align-items:center;justify-content:center;padding:10px}
  .eq-logo img{max-width:100%;max-height:100%;object-fit:contain}
  .eq-logo-ini{font-family:var(--font-display,Anton),sans-serif;font-size:2rem;color:var(--c-brand,#067A3E)}
  .eq-name{margin:2px 0 0;font-size:2.1rem;line-height:1}
  .eq-page .ts2-sec,.eq-page .ts2-top,.eq-page .ts2-metrics,.eq-page .mt-list,.eq-page .pm-cols{padding-left:0;padding-right:0}
  .eq-page .ts2-scorer{margin-left:0;margin-right:0}
  .pm-back{position:fixed;inset:0;background:rgba(11,18,12,.62);display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px;animation:pmf .15s ease}
  @keyframes pmf{from{opacity:0}to{opacity:1}}
  .pm-card{background:var(--c-bg,#F4F8F5);border-radius:18px;width:100%;max-width:640px;max-height:88vh;overflow:auto;box-shadow:0 24px 70px rgba(11,18,12,.4)}
  .pm-head{position:sticky;top:0;display:flex;align-items:center;gap:14px;padding:18px 20px;background:var(--c-brand,#067A3E);color:#fff}
  .pm-logo{width:46px;height:46px;border-radius:10px;object-fit:contain;background:#fff;padding:3px;flex:0 0 auto}
  .pm-logo-ini{display:flex;align-items:center;justify-content:center;font-family:var(--font-display,Anton),sans-serif;font-size:1.3rem;color:var(--c-brand,#067A3E)}
  .pm-ht{flex:1;min-width:0}
  .pm-kick{font-size:.68rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--c-lime,#C8F542)}
  .pm-head h3{margin:2px 0 0;font-family:var(--font-display,Anton),sans-serif;font-weight:400;text-transform:uppercase;font-size:1.5rem;line-height:1;letter-spacing:.01em}
  .pm-close{margin-left:auto;background:rgba(255,255,255,.16);border:0;color:#fff;width:34px;height:34px;border-radius:9px;font-size:1.4rem;line-height:1;cursor:pointer;flex:0 0 auto}
  .pm-close:hover{background:rgba(255,255,255,.28)}
  .pm-cols{display:grid;grid-template-columns:1fr 1fr;gap:4px 22px;padding:16px 20px}
  .pm-list{list-style:none;margin:0;padding:0}
  .pm-list li{display:flex;align-items:center;gap:10px;padding:6px 2px;border-bottom:1px solid var(--c-line,#D9E6DE);font-size:.9rem}
  .pm-num{flex:0 0 22px;text-align:center;font-weight:700;font-size:.72rem;color:var(--c-muted,#6B7268)}
  .pm-nom{flex:1;min-width:0;font-weight:600;color:var(--c-ink,#23271F);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pm-nac{flex:0 0 auto;font-variant-numeric:tabular-nums;color:var(--c-muted,#6B7268);font-size:.82rem}
  .pm-foot{padding:12px 20px 18px;font-size:.76rem;color:var(--c-muted,#6B7268);border-top:1px solid var(--c-line,#D9E6DE)}
  .ts2-sec{padding:18px 20px 0;font-size:.7rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--c-brand-2,#056433)}
  /* resumen: dona + kpis + barra */
  .ts2-top{display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:center;padding:12px 20px 4px}
  .ts2-donut{display:flex;align-items:center;gap:14px}
  .ts2-ring{width:118px;height:118px;flex:0 0 118px}
  .ts2-ring-num{font-family:var(--font-display,Anton),sans-serif;font-size:34px;fill:var(--c-ink,#23271F)}
  .ts2-ring-lbl{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;fill:var(--c-muted,#6B7268)}
  .ts2-leg{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}
  .ts2-leg li{display:flex;align-items:center;gap:8px;font-size:.84rem;color:var(--c-ink,#23271F);font-weight:600}
  .ts2-leg i{width:11px;height:11px;border-radius:50%;flex:0 0 11px}
  .ts2-leg b{margin-left:auto;font-weight:800;font-variant-numeric:tabular-nums}
  .ts2-side{display:flex;flex-direction:column;gap:12px;min-width:0}
  .ts2-kpis{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .ts2-kpi{background:var(--c-brand,#067A3E);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:2px}
  .ts2-kpi-v{font-family:var(--font-display,Anton),sans-serif;font-size:1.9rem;line-height:1;color:#fff}
  .ts2-kpi-l{font-size:.63rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--c-lime,#C8F542)}
  .ts2-rend{background:var(--c-surface,#fff);border:1px solid var(--c-line,#D9E6DE);border-radius:12px;padding:10px 14px}
  .ts2-rend-top{display:flex;justify-content:space-between;align-items:baseline;font-size:.72rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--c-muted,#6B7268)}
  .ts2-rend-top b{font-family:var(--font-display,Anton),sans-serif;font-size:1.3rem;color:var(--c-brand-2,#056433);letter-spacing:0}
  .ts2-bar{height:9px;background:#E3EDE6;border-radius:6px;overflow:hidden;margin:6px 0 5px}
  .ts2-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--c-brand,#067A3E),var(--c-lime,#5DBB63));border-radius:6px}
  .ts2-rend-sub{font-size:.72rem;color:var(--c-muted,#6B7268)}
  /* racha últimos 5 */
  .ts2-form{display:flex;align-items:center;gap:6px}
  .ts2-form-lbl{font-size:.63rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--c-muted,#6B7268);margin-right:2px}
  .ts2-dot{width:22px;height:22px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:800;color:#fff}
  .ts2-d-G{background:${C_WIN}}.ts2-d-E{background:${C_DRAW}}.ts2-d-P{background:${C_LOSS}}
  /* goleador del equipo */
  .ts2-scorer{display:flex;align-items:center;gap:12px;margin:12px 20px 0;padding:11px 14px;border-radius:12px;background:linear-gradient(90deg,var(--c-brand,#067A3E),var(--c-brand-2,#056433));color:#fff}
  .ts2-sc-ico{display:flex;width:34px;height:34px;flex:0 0 34px;align-items:center;justify-content:center;border-radius:9px;background:rgba(255,255,255,.16);color:#fff}
  .ts2-sc-txt{display:flex;flex-direction:column;min-width:0;flex:1}
  .ts2-sc-lbl{font-size:.64rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--c-lime,#C8F542)}
  .ts2-sc-nom{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ts2-sc-goles{font-family:var(--font-display,Anton),sans-serif;font-size:1.7rem;line-height:1;display:flex;align-items:baseline;gap:5px}
  .ts2-sc-goles small{font-family:inherit;font-size:.62rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.85}
  /* métricas */
  .ts2-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:12px 20px 4px}
  .ts2-m{background:var(--c-surface,#fff);border:1px solid var(--c-line,#D9E6DE);border-radius:12px;padding:12px 14px;position:relative;box-shadow:0 1px 3px rgba(11,18,12,.05)}
  .ts2-m-v{display:block;font-family:var(--font-display,Anton),sans-serif;font-size:1.9rem;line-height:1;color:var(--c-ink,#23271F)}
  .ts2-m-l{display:block;margin-top:4px;font-size:.78rem;font-weight:700;color:var(--c-ink,#23271F)}
  .ts2-m-s{display:block;font-size:.7rem;color:var(--c-muted,#6B7268);margin-top:1px}
  .ts2-card{position:absolute;top:13px;right:14px;width:15px;height:20px;border-radius:3px;box-shadow:0 1px 2px rgba(0,0,0,.18)}
  /* lista de partidos */
  .mt-list{list-style:none;margin:0;padding:8px 20px 4px;display:flex;flex-direction:column;gap:6px}
  .mt-row{display:flex;align-items:center;gap:9px;padding:7px 10px;background:var(--c-surface,#fff);border:1px solid var(--c-line,#D9E6DE);border-left-width:4px;border-radius:10px}
  .mt-row.mt-G{border-left-color:${C_WIN}}.mt-row.mt-E{border-left-color:${C_DRAW}}.mt-row.mt-P{border-left-color:${C_LOSS}}
  .mt-fx{flex:0 0 auto;min-width:30px;font-size:.66rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--c-muted,#6B7268)}
  .mt-loc{flex:0 0 18px;width:18px;height:18px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:.62rem;font-weight:800;background:var(--c-bg,#EEF3EE);color:var(--c-muted,#6B7268)}
  .mt-logo{width:24px;height:24px;flex:0 0 24px;object-fit:contain;border-radius:5px}
  .mt-logo-ini{display:flex;align-items:center;justify-content:center;background:var(--c-brand-soft,#D7EFE1);color:var(--c-brand-2,#056433);font-weight:800;font-size:.6rem}
  .mt-team{flex:1;min-width:0;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.9rem}
  .mt-score{flex:0 0 auto;font-family:var(--font-display,Anton),sans-serif;font-size:1.15rem;letter-spacing:.02em;color:var(--c-ink,#23271F)}
  .mt-score i{font-style:normal;color:var(--c-muted,#9aa39b);margin:0 3px}
  .mt-badge{flex:0 0 22px;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:800;color:#fff}
  .mt-b-G{background:${C_WIN}}.mt-b-E{background:${C_DRAW}}.mt-b-P{background:${C_LOSS}}
  @media (max-width:560px){
    .pm-cols{grid-template-columns:1fr}.pm-head h3{font-size:1.25rem}
    .ts2-top{grid-template-columns:1fr;justify-items:center;text-align:center}
    .ts2-side{width:100%}
    .ts2-metrics{grid-template-columns:repeat(2,1fr)}
  }
  `;
  document.head.appendChild(st);
}
