import { getConfig, getAudiovisual } from '../services/store.js';
import { mount, esc } from '../ui/helpers.js';
import { shell, loading } from '../ui/layout.js';
import { icon } from '../ui/icons.js';

export async function showAudiovisual() {
  mount(loading());
  const [config, av] = await Promise.all([getConfig(), getAudiovisual()]);
  const videos = av.videos || [];
  const galeria = av.galeria || [];

  const FB = 'https://www.facebook.com/share/p/19Kq4jn7mt/';
  const fbBlue = `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#1877F2"/><path fill="#fff" d="M13.4 21v-8h2.2l.35-2.6H13.4V8.7c0-.75.22-1.26 1.3-1.26h1.35V5.1c-.24-.03-1.05-.1-2-.1-1.98 0-3.34 1.2-3.34 3.42V10.4H8.5V13h2.2v8h2.7z"/></svg>`;
  const fbWhite = `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M13.4 21v-8h2.2l.35-2.6H13.4V8.7c0-.75.22-1.26 1.3-1.26h1.35V5.1c-.24-.03-1.05-.1-2-.1-1.98 0-3.34 1.2-3.34 3.42V10.4H8.5V13h2.2v8h2.7z"/></svg>`;
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
    <p class="subtitle mb-3">Fotografía profesional, grabación de partidos con tecnología <strong>VeoPro</strong> y los mejores momentos de cada fecha, centralizados acá y en nuestras redes.</p>

    <div class="card card-tinted-dark mb-3">
      <div class="grid grid-3" style="gap:20px">
        <div><div style="color:#fff">${icon('camera', { size: 28 })}</div><h4 style="color:#fff;margin-top:6px">Fotografía</h4><p style="color:rgba(255,255,255,.85)">Registro profesional de cada jornada.</p></div>
        <div><div style="color:#fff">${icon('video', { size: 28 })}</div><h4 style="color:#fff;margin-top:6px">Video VeoPro</h4><p style="color:rgba(255,255,255,.85)">Grabación de partidos con cámaras de última tecnología.</p></div>
        <div><div style="color:#fff">${icon('chart', { size: 28 })}</div><h4 style="color:#fff;margin-top:6px">Estadísticas</h4><p style="color:rgba(255,255,255,.85)">Goleadores, tarjetas y datos de cada equipo.</p></div>
      </div>
    </div>

    <h2 class="mb-2">Videos</h2>
    ${videos.length ? `<div class="media-grid mb-3">
        ${videos.map(v => `<div>
          <div class="media-item"><iframe src="https://www.youtube.com/embed/${esc(v.id)}" title="${esc(v.titulo || 'Video LIV')}" allowfullscreen loading="lazy"></iframe></div>
          ${v.titulo ? `<p class="mt-1" style="font-weight:700">${esc(v.titulo)}</p>` : ''}
        </div>`).join('')}
      </div>`
    : `<div class="empty"><div class="ico">${icon('film', { size: 42 })}</div><p>Pronto subiremos los resúmenes de cada fecha.<br>Síguenos en Instagram para no perderte nada.</p>
        ${config?.contacto?.instagram ? `<a href="${esc(config.contacto.instagram)}" target="_blank" rel="noopener" class="btn btn-primary btn-sm mt-2">Ir a Instagram</a>` : ''}</div>`}

    <div class="gi-head">
      <div><span class="eyebrow">Audiovisual</span><h2 class="gi-title">La liga en imágenes</h2></div>
      <a class="gi-fbpill" href="${FB}" target="_blank" rel="noopener">${fbBlue} Álbum completo en <b>Facebook</b></a>
    </div>
    <p class="subtitle" style="margin-top:8px;max-width:640px">Una selección de las mejores tomas de cada fecha, en alta. ¿Quieres verlas todas? El álbum completo vive en nuestro Facebook.</p>
    ${galeria.length ? `
      <span class="gi-datepill">Fecha 1 · Sábado 29 de agosto</span>
      <div class="gi-grid">
        ${galeria.slice(0, 6).map(gTile).join('')}
        <a class="gi-fbtile" href="${FB}" target="_blank" rel="noopener">
          <span class="k">${fbWhite} Facebook</span>
          <span class="big">+200 fotos<br><em>de la Fecha 1</em></span>
          <span class="go">Ver el álbum completo →</span>
        </a>
        ${galeria.slice(6).map(gTile).join('')}
      </div>
      <div class="gi-banner"><div class="gi-banner-in">
        <div>
          <span class="k">Galería completa</span>
          <h3>¿Buscas la foto de tu equipo?</h3>
          <p>Todas las fotos de la jornada, en alta, están en nuestro Facebook.</p>
        </div>
        <a class="gi-btn-white" href="${FB}" target="_blank" rel="noopener">${fbBlue} Ir al álbum en Facebook</a>
      </div></div>
      <p class="mt-2" style="color:var(--c-muted);font-size:.85rem">Fotografías: <strong>El Dso Fotografía</strong></p>`
    : `<div class="empty"><div class="ico">${icon('image', { size: 42 })}</div><p>La galería de fotos se irá llenando con cada jornada.</p></div>`}
  </div>`;

  mount(shell(inner, config));
}
