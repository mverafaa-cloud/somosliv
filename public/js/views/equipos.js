import { getConfig, getEquipos, getPlanteles } from '../services/store.js';
import { mount, esc, initials } from '../ui/helpers.js';
import { shell, loading, logoMarquee, preSeason } from '../ui/layout.js';
import { icon } from '../ui/icons.js';

export async function showEquipos() {
  mount(loading());
  const [config, equipos, planteles] = await Promise.all([getConfig(), getEquipos(), getPlanteles()]);
  const series = config.series || [];

  if (!equipos.length) {
    mount(shell(`<div class="container"><span class="eyebrow">Temporada ${esc(config.temporada || '2026')}</span><h1>Equipos</h1>${preSeason(config, 'los equipos inscritos')}</div>`, config));
    return;
  }

  // Únicos por nombre para el banner de logos.
  const seen = new Set(); const uniq = [];
  equipos.forEach(e => { if (!seen.has(e.nombre)) { seen.add(e.nombre); uniq.push(e); } });

  const nPlantel = (e) => (planteles[e.id] || []).length;

  const card = (e) => {
    const n = nPlantel(e);
    const hint = n ? `<span class="equipo-cta">${n} jugadores · ver planilla</span>` : '';
    return `
    <button type="button" class="equipo-card${n ? ' is-clickable' : ''}" ${n ? `data-eid="${esc(e.id)}"` : 'disabled'}>
      <div class="badge-lg">${e.logo
        ? `<img src="${esc(e.logo)}" alt="${esc(e.nombre)}" loading="lazy">`
        : `<span style="font-family:var(--font-display);font-size:1.6rem;color:var(--c-brand)">${esc(initials(e.nombre))}</span>`}</div>
      <div class="nom">${esc(e.nombre)}</div>
      ${hint}
    </button>`;
  };

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
    <p class="subtitle mb-3">Los equipos confirmados para el estreno de la LIV en ${esc(config.sede || 'Complejo Deggiano')}. Toca un equipo para ver su planilla de jugadores inscritos.</p>
    ${logoMarquee(uniq)}
    ${series.map(grupo).join('')}
  </div>`;
  const app = mount(shell(inner, config));

  // ---- Modal de planilla por equipo (nombre + fecha de nacimiento, sin RUT) ----
  ensurePlantelStyles();
  const byId = {}; equipos.forEach(e => byId[e.id] = e);

  app.querySelectorAll('.equipo-card.is-clickable').forEach(btn => {
    btn.addEventListener('click', () => openPlantel(byId[btn.dataset.eid], planteles[btn.dataset.eid] || []));
  });
}

function openPlantel(equipo, jugadores) {
  if (!equipo) return;
  document.getElementById('plantel-modal')?.remove();

  const half = Math.ceil(jugadores.length / 2);
  const colList = (arr) => arr.map(p => `
    <li>
      <span class="pm-num">${esc(p.n)}</span>
      <span class="pm-nom">${esc(p.nombre)}</span>
      <span class="pm-nac">${p.nac ? esc(p.nac) : '—'}</span>
    </li>`).join('');

  const logo = equipo.logo
    ? `<img src="${esc(equipo.logo)}" alt="" class="pm-logo">`
    : `<span class="pm-logo pm-logo-ini">${esc(initials(equipo.nombre))}</span>`;

  const back = document.createElement('div');
  back.id = 'plantel-modal';
  back.className = 'pm-back';
  back.innerHTML = `
    <div class="pm-card" role="dialog" aria-modal="true" aria-label="Planilla de ${esc(equipo.nombre)}">
      <div class="pm-head">
        ${logo}
        <div class="pm-ht">
          <span class="pm-kick">Planilla inscrita · ${jugadores.length} jugadores</span>
          <h3>${esc(equipo.nombre)}</h3>
        </div>
        <button class="pm-close" aria-label="Cerrar">&times;</button>
      </div>
      <div class="pm-cols">
        <ol class="pm-list" start="1">${colList(jugadores.slice(0, half))}</ol>
        <ol class="pm-list">${colList(jugadores.slice(half))}</ol>
      </div>
      <div class="pm-foot">Se muestran nombre y fecha de nacimiento. Los RUT se mantienen reservados.</div>
    </div>`;
  document.body.appendChild(back);

  const close = () => back.remove();
  back.querySelector('.pm-close').addEventListener('click', close);
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  document.addEventListener('keydown', function escClose(ev) {
    if (ev.key === 'Escape') { close(); document.removeEventListener('keydown', escClose); }
  });
}

function ensurePlantelStyles() {
  if (document.getElementById('plantel-css')) return;
  const st = document.createElement('style');
  st.id = 'plantel-css';
  st.textContent = `
  .equipo-card.is-clickable{cursor:pointer;border:0;background:var(--c-surface,#fff);font:inherit;text-align:center;transition:transform .12s ease,box-shadow .12s ease}
  .equipo-card.is-clickable:hover{transform:translateY(-3px);box-shadow:var(--shadow-md,0 8px 24px rgba(6,122,62,.14))}
  .equipo-card[disabled]{opacity:.65;cursor:default}
  .equipo-cta{display:block;margin-top:6px;font-size:.72rem;font-weight:700;letter-spacing:.02em;color:var(--c-brand,#067A3E);text-transform:uppercase}
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
  @media (max-width:560px){.pm-cols{grid-template-columns:1fr}.pm-head h3{font-size:1.25rem}}
  `;
  document.head.appendChild(st);
}
