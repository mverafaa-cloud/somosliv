import { esc, fmtDateLong } from './helpers.js';
import { icon } from './icons.js';

// Banner de modo demo — desactivado para el lanzamiento comercial.
export function demoNotice() {
  return '';
}

// Estado "temporada por comenzar" para las secciones sin datos aún.
export function preSeason(config = {}, que = 'la información') {
  const fecha = config.lanzamiento ? fmtDateLong(config.lanzamiento) : null;
  return `
  <div class="card center" style="padding:56px 24px;max-width:640px;margin:8px auto">
    <div style="color:var(--c-brand)">${icon('calendar', { size: 46 })}</div>
    <h2 class="mt-2" style="margin-bottom:6px">La temporada 2026 aún no comienza</h2>
    ${fecha ? `<p class="subtitle">Estreno: <strong>${esc(fecha)}</strong> en ${esc(config.sede || 'Complejo Deggiano')}.</p>` : ''}
    <p class="muted mt-1">Muy pronto verás acá ${esc(que)}, fecha a fecha.</p>
    <div class="row mt-3" style="justify-content:center">
      <a href="/admision" data-link class="btn btn-primary">Inscribe tu equipo</a>
      <a href="/reglamentos" data-link class="btn btn-ghost">Ver reglamento</a>
    </div>
  </div>`;
}

export function footer(config = {}) {
  const ig = config?.contacto?.instagram;
  const email = config?.contacto?.email;
  const wsp = config?.contacto?.whatsapp;
  return `
  <div class="stripes stripes-accent"></div>
  <footer class="site-footer">
    <div class="foot-inner">
      <div>
        <div class="logo-txt">LIV</div>
        <p style="max-width:280px;color:rgba(255,255,255,.75);font-size:.9rem;margin-top:6px;">
          Liga La Cuarta — fútbol amateur de primer nivel en la Región de Coquimbo.
          Sede: ${esc(config.sede || 'Complejo Deggiano')}.
        </p>
      </div>
      <div class="foot-links">
        <strong style="color:#fff;margin-bottom:4px;">Secciones</strong>
        <a href="/programacion" data-link>Programación</a>
        <a href="/posiciones" data-link>Posiciones</a>
        <a href="/reglamentos" data-link>Reglamentos</a>
        <a href="/admision" data-link>Admisión</a>
      </div>
      <div class="foot-links">
        <strong style="color:#fff;margin-bottom:4px;">Contacto</strong>
        ${ig ? `<a href="${esc(ig)}" target="_blank" rel="noopener">Instagram</a>` : ''}
        ${wsp ? `<a href="https://wa.me/${esc(String(wsp).replace(/\D/g,''))}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
        ${email ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : ''}
        <a href="/admision" data-link>Inscribe tu equipo</a>
      </div>
    </div>
    <div class="foot-inner"><div class="foot-copy">© ${new Date().getFullYear()} LIV · Liga La Cuarta · Región de Coquimbo</div></div>
  </footer>`;
}

// Arma la página completa: banner demo + contenido + footer.
export function shell(innerHtml, config = {}) {
  return `${demoNotice()}${innerHtml}${footer(config)}`;
}

// Banner de logos de equipos (marquee horizontal auto-desplazable).
export function logoMarquee(teams = []) {
  const list = teams.filter(t => t.logo);
  if (!list.length) return '';
  const chip = (t) => `<div class="logo-chip" title="${esc(t.nombre)}"><img src="${esc(t.logo)}" alt="${esc(t.nombre)}" loading="lazy"></div>`;
  // Duplicamos la lista para un loop continuo.
  const track = list.concat(list).map(chip).join('');
  return `<div class="logo-marquee"><div class="logo-track">${track}</div></div>`;
}

export function loading(msg = 'Cargando…') {
  return `<div class="loading-page"><div class="spinner"></div><p>${esc(msg)}</p></div>`;
}
