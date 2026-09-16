import { getConfig, getAudiovisual } from '../services/store.js';
import { mount, esc } from '../ui/helpers.js';
import { shell, loading } from '../ui/layout.js';
import { icon } from '../ui/icons.js';

// Canales oficiales LIV Media (fotos en Facebook, videos en YouTube).
const FB_PAGE   = 'https://www.facebook.com/profile.php?id=61593144355500';
const YT_CHANNEL = 'https://www.youtube.com/@LIVMedia-2026';

export async function showAudiovisual() {
  mount(loading());
  const [config, av] = await Promise.all([getConfig(), getAudiovisual()]);
  const videos = av.videos || [];
  const galeria = av.galeria || [];

  const fbBlue = `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#1877F2"/><path fill="#fff" d="M13.4 21v-8h2.2l.35-2.6H13.4V8.7c0-.75.22-1.26 1.3-1.26h1.35V5.1c-.24-.03-1.05-.1-2-.1-1.98 0-3.34 1.2-3.34 3.42V10.4H8.5V13h2.2v8h2.7z"/></svg>`;
  const fbWhite = `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M13.4 21v-8h2.2l.35-2.6H13.4V8.7c0-.75.22-1.26 1.3-1.26h1.35V5.1c-.24-.03-1.05-.1-2-.1-1.98 0-3.34 1.2-3.34 3.42V10.4H8.5V13h2.2v8h2.7z"/></svg>`;
  const ytIcon = `<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#FF0000" d="M23 12s0-3.2-.4-4.7a2.4 2.4 0 0 0-1.7-1.7C19.4 5.2 12 5.2 12 5.2s-7.4 0-8.9.4A2.4 2.4 0 0 0 1.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7c.2.9.9 1.5 1.7 1.7 1.5.4 8.9.4 8.9.4s7.4 0 8.9-.4a2.4 2.4 0 0 0 1.7-1.7C23 15.2 23 12 23 12z"/><path fill="#fff" d="M9.8 15.3V8.7l5.7 3.3-5.7 3.3z"/></svg>`;
  // Pills de canal (mismo formato que la píldora de Facebook existente).
  const ytPill = `<a class="gi-fbpill" style="background:#FF0000;color:#fff" href="${YT_CHANNEL}" target="_blank" rel="noopener">${ytIcon} Canal en <b style="color:#fff">YouTube</b></a>`;
  const fbPill = `<a class="gi-fbpill" href="${FB_PAGE}" target="_blank" rel="noopener">${fbBlue} Fotos en <b>Facebook</b></a>`;

  const giSizes = '(max-width:600px) 46vw, (max-width:1000px) 30vw, 250px';
  const gTile = (src) => {
    const b = String(src).replace(/\.jpg$/i, '');
    return `<a class="gi-frame" href="${esc(src)}" target="_blank" rel="noopener">
      <picture>
        <source type="image/avif" srcset="${esc(b)}-420.avif 420w, ${esc(b)}-640.avif 640w, ${esc(b)}-960.avif 960w" sizes="${giSizes}">
        <source type="image/webp" srcset="${esc(b)}-420.webp 420w, ${esc(b)}-640.webp 640w, ${esc(b)}-960.webp 960w" sizes="${giSizes}">
        <img src="${esc(b)}-640.jpg" alt="Foto LIV · Fecha 1" loading="lazy" decoding="async">
      </picture>
    </a>`;
  };

  const inner = `
  <div class="container">
    <span class="eyebrow">Cobertura total</span>
    <h1>Audiovisual</h1>
    <p class="subtitle mb-3">Fotografía profesional, grabación de partidos con tecnología <strong>VeoPro</strong> y los mejores momentos de cada fecha. Acá va una muestra: las <strong>fotos</strong> completas viven en nuestro <strong>Facebook</strong> y los <strong>partidos</strong> completos en nuestro canal de <strong>YouTube</strong>.</p>

    <div class="card card-tinted-dark mb-3">
      <div class="grid grid-3" style="gap:20px">
        <div><div style="color:#fff">${icon('camera', { size: 28 })}</div><h4 style="color:#fff;margin-top:6px">Fotografía</h4><p style="color:rgba(255,255,255,.85)">Registro profesional de cada jornada, por fecha, en Facebook.</p></div>
        <div><div style="color:#fff">${icon('video', { size: 28 })}</div><h4 style="color:#fff;margin-top:6px">Video VeoPro</h4><p style="color:rgba(255,255,255,.85)">Partidos completos, subidos a YouTube.</p></div>
        <div><div style="color:#fff">${icon('chart', { size: 28 })}</div><h4 style="color:#fff;margin-top:6px">Estadísticas</h4><p style="color:rgba(255,255,255,.85)">Goleadores, tarjetas y datos de cada equipo.</p></div>
      </div>
    </div>

    <!-- ===== VIDEOS (YouTube) ===== -->
    <div class="gi-head">
      <div><span class="eyebrow">Cobertura en video</span><h2 class="gi-title">Los partidos, en YouTube</h2></div>
      ${ytPill}
    </div>
    <p class="subtitle" style="margin-top:8px;max-width:660px">Grabamos cada partido completo con VeoPro y lo subimos a nuestro canal, ordenados por partido. Acá tienes una muestra; míralos todos en YouTube.</p>

    ${videos.length ? `<div class="media-grid mb-2">
        ${videos.map(v => `<div>
          <div class="media-item"><iframe src="https://www.youtube-nocookie.com/embed/${esc(v.id)}" title="${esc(v.titulo || 'Video LIV')}" allowfullscreen loading="lazy"></iframe></div>
          ${v.titulo ? `<p class="mt-1" style="font-weight:700">${esc(v.titulo)}</p>` : ''}
        </div>`).join('')}
      </div>
      <div style="text-align:center;margin:6px 0 8px">
        <a class="btn btn-primary" href="${YT_CHANNEL}" target="_blank" rel="noopener">${ytIcon} Ver todos los partidos en YouTube</a>
      </div>`
    : `<a class="gi-fbtile" href="${YT_CHANNEL}" target="_blank" rel="noopener" style="display:flex;max-width:860px;margin:14px auto 8px;aspect-ratio:16/7;background:linear-gradient(135deg,#7a0000,#c00,#ff2d2d)">
        <span class="k">${ytIcon} YouTube</span>
        <span class="big">Partidos completos<br><em>LIV Media</em></span>
        <span class="go">Ver el canal en YouTube →</span>
      </a>`}

    <!-- ===== FOTOS (Facebook) ===== -->
    <div class="gi-head" style="margin-top:28px">
      <div><span class="eyebrow">Audiovisual</span><h2 class="gi-title">La liga en imágenes</h2></div>
      ${fbPill}
    </div>
    <p class="subtitle" style="margin-top:8px;max-width:660px">Una selección de las mejores tomas. El álbum completo de cada fecha vive en nuestro Facebook, ordenado jornada por jornada.</p>
    ${galeria.length ? `
      <span class="gi-datepill">Última fecha · muestra</span>
      <div class="gi-grid">
        ${galeria.slice(0, 6).map(gTile).join('')}
        <a class="gi-fbtile" href="${FB_PAGE}" target="_blank" rel="noopener">
          <span class="k">${fbWhite} Facebook</span>
          <span class="big">Todas las fotos<br><em>fecha por fecha</em></span>
          <span class="go">Ver los álbumes →</span>
        </a>
        ${galeria.slice(6).map(gTile).join('')}
      </div>
      <div class="gi-banner"><div class="gi-banner-in">
        <div>
          <span class="k">Galería completa</span>
          <h3>¿Buscas la foto de tu equipo?</h3>
          <p>Todas las fotos de cada jornada, en alta y ordenadas por fecha, están en nuestro Facebook.</p>
        </div>
        <a class="gi-btn-white" href="${FB_PAGE}" target="_blank" rel="noopener">${fbBlue} Ir a las fotos en Facebook</a>
      </div></div>
      <p class="mt-2" style="color:var(--c-muted);font-size:.85rem">Fotografías: <strong>El Dso Fotografía</strong></p>`
    : `<div class="empty"><div class="ico">${icon('image', { size: 42 })}</div><p>La galería de fotos se irá llenando con cada jornada.</p>
        <a href="${FB_PAGE}" target="_blank" rel="noopener" class="btn btn-primary btn-sm mt-2">${fbWhite} Ver las fotos en Facebook</a></div>`}
  </div>`;

  mount(shell(inner, config));
}
