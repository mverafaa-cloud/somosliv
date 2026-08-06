import { getConfig, getAudiovisual } from '../services/store.js';
import { mount, esc } from '../ui/helpers.js';
import { shell, loading } from '../ui/layout.js';
import { icon } from '../ui/icons.js';

export async function showAudiovisual() {
  mount(loading());
  const [config, av] = await Promise.all([getConfig(), getAudiovisual()]);
  const videos = av.videos || [];
  const galeria = av.galeria || [];

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

    <h2 class="mb-2 mt-3">Galería</h2>
    ${galeria.length ? `<div class="gallery">
        ${galeria.map(src => `<a href="${esc(src)}" target="_blank" rel="noopener"><img src="${esc(src)}" alt="Foto LIV" loading="lazy"></a>`).join('')}
      </div>`
    : `<div class="empty"><div class="ico">${icon('image', { size: 42 })}</div><p>La galería de fotos se irá llenando con cada jornada.</p></div>`}
  </div>`;

  mount(shell(inner, config));
}
