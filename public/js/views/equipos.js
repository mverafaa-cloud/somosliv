import { getConfig, getEquipos } from '../services/store.js';
import { mount, esc, initials } from '../ui/helpers.js';
import { shell, loading, logoMarquee, preSeason } from '../ui/layout.js';
import { icon } from '../ui/icons.js';

export async function showEquipos() {
  mount(loading());
  const [config, equipos] = await Promise.all([getConfig(), getEquipos()]);
  const series = config.series || [];

  if (!equipos.length) {
    mount(shell(`<div class="container"><span class="eyebrow">Temporada ${esc(config.temporada || '2026')}</span><h1>Equipos</h1>${preSeason(config, 'los equipos inscritos')}</div>`, config));
    return;
  }

  // Únicos por nombre para el banner de logos.
  const seen = new Set(); const uniq = [];
  equipos.forEach(e => { if (!seen.has(e.nombre)) { seen.add(e.nombre); uniq.push(e); } });

  const card = (e) => `
    <div class="equipo-card">
      <div class="badge-lg">${e.logo
        ? `<img src="${esc(e.logo)}" alt="${esc(e.nombre)}" loading="lazy">`
        : `<span style="font-family:var(--font-display);font-size:1.6rem;color:var(--c-brand)">${esc(initials(e.nombre))}</span>`}</div>
      <div class="nom">${esc(e.nombre)}</div>
    </div>`;

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
    <p class="subtitle mb-3">Los equipos confirmados para el estreno de la LIV en ${esc(config.sede || 'Complejo Deggiano')}.</p>
    ${logoMarquee(uniq)}
    ${series.map(grupo).join('')}
    <div class="hero-flat mt-4">
      <div class="deco">${icon('ball', { size: 210, stroke: 1.2 })}</div>
      <span class="eyebrow" style="color:var(--c-ink)">¿Aún no estás?</span>
      <h2>Suma a tu equipo a la LIV</h2>
      <p>Quedan cupos por serie. Asegura tu lugar antes del estreno.</p>
      <a href="/admision" data-link class="btn btn-primary btn-lg mt-2">Inscribe tu equipo</a>
    </div>
  </div>`;
  mount(shell(inner, config));
}
