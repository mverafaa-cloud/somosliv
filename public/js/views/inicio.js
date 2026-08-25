import { getConfig, getPartidos, getEquipos, equiposById } from '../services/store.js';
import { mount, esc, initials, fmtDateLong, fmtTime, parseDate, everySecond } from '../ui/helpers.js';
import { shell, loading, logoMarquee } from '../ui/layout.js';
import { icon } from '../ui/icons.js';

export async function showInicio() {
  mount(loading('Cargando LIV…'));
  const [config, partidos, equipos] = await Promise.all([getConfig(), getPartidos(), getEquipos()]);
  const byId = equiposById(equipos);

  // Equipos únicos (por nombre) para el banner de logos.
  const seenT = new Set(); const uniqTeams = [];
  equipos.forEach(e => { if (!seenT.has(e.nombre)) { seenT.add(e.nombre); uniqTeams.push(e); } });

  // Próxima fecha programada
  const prog = partidos.filter(p => p.estado === 'programado' && parseDate(p.fecha))
    .sort((a, b) => parseDate(a.fecha) - parseDate(b.fecha));
  const nextDate = prog.length ? prog[0].fecha : null;
  const nextMatches = nextDate ? prog.filter(p => p.fecha === nextDate).slice(0, 6) : [];

  const valores = [
    { ico: 'handshake', t: 'Sana Competencia', d: 'Fomentamos el fair play y el espíritu deportivo: rivalidad estricta dentro de la cancha, respeto y camaradería al finalizar.' },
    { ico: 'shield', t: 'Cero Violencia', d: 'Alejados completamente de la violencia y conductas antideportivas. Los hechos de violencia se castigan drásticamente.' },
    { ico: 'users', t: 'Ambiente Familiar', d: 'Un espacio seguro, limpio y entretenido para que tu familia disfrute acompañándote cada fin de semana.' }
  ];

  const inner = `
  <div class="container">
    <div class="hero-image has-bg" style="--hero-bg:url('/assets/hero.jpg')">
      <div class="corner-stripes"></div>
      <span class="eyebrow">Liga La Cuarta · Temporada ${esc(config.temporada || '2026')}</span>
      <h1 class="display">EL ESTÁNDAR DE<br>LAS MEJORES LIGAS</h1>
      <p>Transformamos el fútbol amateur de la Región de Coquimbo: organización profesional, sana competencia y un ambiente familiar en ${esc(config.sede || 'Complejo Deggiano')}.</p>
      <div class="hero-actions">
        <a href="/admision" data-link class="btn btn-accent btn-lg">Inscribe tu equipo</a>
        <a href="/liv" data-link class="btn btn-ghost-light btn-lg">Conoce la LIV</a>
      </div>
      ${config.lanzamiento ? `<div class="countdown" id="cd"></div>` : ''}
    </div>

    <!-- Accesos rápidos (foco captación) -->
    <div class="grid grid-3 mt-2">
      <a href="/admision" data-link class="card hover card-tinted-accent" style="text-decoration:none">
        <div class="card-header"><h3>${icon('clipboard', { size: 22 })} Inscribe tu equipo</h3></div>
        <p>Cupos limitados por serie (Junior y Senior). Asegura tu lugar antes del estreno.</p>
      </a>
      <a href="/reglamentos" data-link class="card hover" style="text-decoration:none">
        <div class="card-header"><h3>${icon('book', { size: 22 })} Reglamento</h3></div>
        <p class="muted">Categorías, formato, requisitos y descarga del reglamento oficial 2026.</p>
      </a>
      <a href="/liv" data-link class="card hover" style="text-decoration:none">
        <div class="card-header"><h3>${icon('info', { size: 22 })} Conoce la liga</h3></div>
        <p class="muted">Nuestra propuesta, la sede Complejo Deggiano y la experiencia LIV.</p>
      </a>
    </div>

    <!-- Equipos inscritos -->
    ${uniqTeams.length ? `
    <div class="section">
      <div class="spread">
        <div><span class="eyebrow">Ya confirmados</span><h2 style="margin:0">Equipos inscritos</h2></div>
        <a href="/equipos" data-link class="btn btn-ghost btn-sm">Ver todos</a>
      </div>
      <div class="mt-2">${logoMarquee(uniqTeams)}</div>
    </div>` : ''}

    <!-- Próxima fecha -->
    ${nextMatches.length ? `
    <div class="section">
      <div class="spread">
        <div><span class="eyebrow">Lo que viene</span><h2>Próxima fecha</h2></div>
        <a href="/programacion" data-link class="btn btn-ghost btn-sm">Ver todo</a>
      </div>
      <p class="muted mb-2">${esc(fmtDateLong(nextDate))}</p>
      ${nextMatches.map(p => matchRow(p, byId)).join('')}
    </div>` : ''}

    <!-- Valores -->
    <div class="section">
      <span class="eyebrow">Nuestro sello</span>
      <h2 class="mb-3">Una experiencia distinta</h2>
      <div class="grid grid-3">
        ${valores.map((v, i) => `
          <div class="card value-card ${i === 1 ? 'on-brand' : ''}">
            <div class="ico">${icon(v.ico, { size: 34, stroke: 1.8 })}</div>
            <h3>${v.t}</h3>
            <p class="${i === 1 ? '' : 'muted'}" style="${i === 1 ? 'color:rgba(255,255,255,.9)' : ''}">${v.d}</p>
          </div>`).join('')}
      </div>
      <div class="center mt-3">
        <a href="/liv" data-link class="btn btn-secondary">Conoce más de la LIV →</a>
      </div>
    </div>

    <!-- CTA inscripción -->
    <div class="hero-flat">
      <div class="deco">${icon('ball', { size: 210, stroke: 1.2 })}</div>
      <span class="eyebrow" style="color:var(--c-ink)">¿Tienes equipo?</span>
      <h2>Corre por tu lugar cuanto antes</h2>
      <p>Los cupos por serie son limitados (8 a 10 equipos). Conversemos: queremos que seas parte de esta experiencia.</p>
      <a href="/admision" data-link class="btn btn-primary btn-lg mt-2">Quiero inscribirme</a>
    </div>
  </div>`;

  mount(shell(inner, config));

  // Countdown vivo
  if (config.lanzamiento) startCountdown(config.lanzamiento);
}

function startCountdown(target) {
  const el = document.getElementById('cd');
  if (!el) return;
  const t = parseDate(target);
  if (!t) return;
  everySecond(() => {
    let diff = Math.max(0, t - new Date());
    const d = Math.floor(diff / 86400000); diff -= d * 86400000;
    const h = Math.floor(diff / 3600000); diff -= h * 3600000;
    const m = Math.floor(diff / 60000); diff -= m * 60000;
    const s = Math.floor(diff / 1000);
    const cell = (n, l) => `<div class="cd-cell"><div class="cd-num">${String(n).padStart(2, '0')}</div><div class="cd-lbl">${l}</div></div>`;
    el.innerHTML = (d + h + m + s > 0)
      ? `<div style="width:100%;color:#fff;font-weight:700;margin-bottom:2px;display:flex;align-items:center;gap:7px;">${icon('rocket', { size: 18 })} Estreno de la temporada</div>${cell(d, 'días')}${cell(h, 'hrs')}${cell(m, 'min')}${cell(s, 'seg')}`
      : `<div class="cd-cell" style="min-width:auto;padding:14px 22px;"><div class="cd-num" style="font-size:1.5rem;display:flex;align-items:center;gap:8px;">${icon('ball', { size: 26 })} ¡Temporada en juego!</div></div>`;
  });
}

function matchRow(p, byId) {
  const L = byId[p.local]?.nombre || p.local;
  const V = byId[p.visita]?.nombre || p.visita;
  return `
  <div class="match-card">
    <div class="team home"><span class="name">${esc(L)}</span><span class="badge">${esc(initials(L))}</span></div>
    <div class="vs"><div class="scheduled">${esc(fmtTime(p.hora))}</div><div class="meta">${esc(p.cancha || '')}</div></div>
    <div class="team"><span class="badge">${esc(initials(V))}</span><span class="name">${esc(V)}</span></div>
  </div>`;
}
