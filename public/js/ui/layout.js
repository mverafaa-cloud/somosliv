import { isDemo } from '../services/store.js';
import { esc } from './helpers.js';

// Banner que avisa cuando estamos en modo demo (Firebase sin configurar).
export function demoNotice() {
  if (!isDemo()) return '';
  return `<div class="alert alert-warn" style="border-radius:0;text-align:center;margin:0;font-size:.85rem;">
    ⚙️ <strong>Modo demo</strong> — datos de ejemplo. Conecta Firebase para cargar equipos, resultados y posiciones reales.
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

export function loading(msg = 'Cargando…') {
  return `<div class="loading-page"><div class="spinner"></div><p>${esc(msg)}</p></div>`;
}
