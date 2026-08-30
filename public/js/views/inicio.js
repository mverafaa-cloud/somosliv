import { getConfig, getPartidos, getEquipos, equiposById } from '../services/store.js';
import { mount, esc, fmtDateLong, fmtTime, parseDate, teamLogo } from '../ui/helpers.js';
import { shell, loading, logoMarquee } from '../ui/layout.js';
import { icon } from '../ui/icons.js';

const serieLabel = (s) => s === 'senior' ? 'Senior' : (s === 'libre' ? 'Junior' : '');

export async function showInicio() {
  mount(loading('Cargando LIV…'));
  const [config, partidos, equipos] = await Promise.all([getConfig(), getPartidos(), getEquipos()]);
  const byId = equiposById(equipos);

  // Equipos únicos (por nombre) para el banner de logos.
  const seenT = new Set(); const uniqTeams = [];
  equipos.forEach(e => { if (!seenT.has(e.nombre)) { seenT.add(e.nombre); uniqTeams.push(e); } });

  // Últimos resultados (fecha jugada más reciente)
  const finished = partidos.filter(p => p.estado === 'finalizado' && p.golesLocal != null);
  const finGroups = {};
  finished.forEach(p => { (finGroups[p.fecha] = finGroups[p.fecha] || []).push(p); });
  const finDates = Object.keys(finGroups).sort((a, b) => parseDate(b) - parseDate(a));
  const lastDate = finDates[0] || null;
  const lastResults = lastDate ? finGroups[lastDate].slice(0, 8) : [];
  const lastFechaNum = lastResults.length ? lastResults[0].fecha_num : null;

  // Próxima fecha programada
  const prog = partidos.filter(p => p.estado === 'programado' && parseDate(p.fecha))
    .sort((a, b) => parseDate(a.fecha) - parseDate(b.fecha));
  const nextDate = prog.length ? prog[0].fecha : null;
  const nextMatches = nextDate ? prog.filter(p => p.fecha === nextDate) : [];
  const nextFechaNum = nextMatches.length ? nextMatches[0].fecha_num : null;

  const valores = [
    { ico: 'handshake', t: 'Sana Competencia', d: 'Fomentamos el fair play y el espíritu deportivo: rivalidad estricta dentro de la cancha, respeto y camaradería al finalizar.' },
    { ico: 'shield', t: 'Cero Violencia', d: 'Alejados completamente de la violencia y conductas antideportivas. Los hechos de violencia se castigan drásticamente.' },
    { ico: 'users', t: 'Ambiente Familiar', d: 'Un espacio seguro, limpio y entretenido para que tu familia disfrute acompañándote cada fin de semana.' }
  ];

  const inner = `
  <div class="container">
    ${uniqTeams.length ? `
    <a href="/equipos" data-link class="top-teams-band" aria-label="Ver equipos inscritos">
      ${logoMarquee(uniqTeams)}
    </a>` : ''}

    <div class="hero-image has-bg" style="--hero-bg:url('/assets/hero.jpg')">
      <div class="corner-stripes"></div>
      <span class="eyebrow">Liga La Cuarta · Temporada ${esc(config.temporada || '2026')} · Torneo en juego</span>
      <h1 class="display">EL ESTÁNDAR DE<br>LAS MEJORES LIGAS</h1>
      <p>El torneo ya está en marcha en ${esc(config.sede || 'Complejo Deggiano')}. Revisa los últimos marcadores, la tabla de posiciones y la programación de la próxima fecha.</p>
      <div class="hero-actions">
        <a href="/resultados" data-link class="btn btn-accent btn-lg">${icon('check', { size: 18 })} Últimos resultados</a>
        <a href="/posiciones" data-link class="btn btn-ghost-light btn-lg">${icon('trophy', { size: 18 })} Tabla de posiciones</a>
      </div>
      <a href="/admision" data-link class="hero-senior">${icon('shield', { size: 16 })} Categoría <strong>Senior</strong>: quedan los últimos cupos · <u>inscribe tu equipo</u></a>
    </div>

    <!-- Accesos rápidos (foco torneo) -->
    <div class="grid grid-3 mt-2">
      <a href="/resultados" data-link class="card hover card-tinted-accent" style="text-decoration:none">
        <div class="card-header"><h3>${icon('check', { size: 22 })} Resultados</h3></div>
        <p>Todos los marcadores de la jornada, fecha por fecha.</p>
      </a>
      <a href="/posiciones" data-link class="card hover" style="text-decoration:none">
        <div class="card-header"><h3>${icon('trophy', { size: 22 })} Tabla de posiciones</h3></div>
        <p class="muted">Cómo va la tabla en Junior y Senior, fecha a fecha.</p>
      </a>
      <a href="/programacion" data-link class="card hover" style="text-decoration:none">
        <div class="card-header"><h3>${icon('calendar', { size: 22 })} Programación</h3></div>
        <p class="muted">Horarios y canchas de la próxima fecha del torneo.</p>
      </a>
    </div>

    <!-- Últimos resultados -->
    ${lastResults.length ? `
    <div class="section">
      <div class="spread">
        <div><span class="eyebrow">Lo último</span><h2>Resultados${lastFechaNum ? ` · Fecha ${esc(lastFechaNum)}` : ''}</h2></div>
        <a href="/resultados" data-link class="btn btn-ghost btn-sm">Ver todos</a>
      </div>
      <p class="muted mb-2">${esc(fmtDateLong(lastDate))}</p>
      ${lastResults.map(p => resultRow(p, byId)).join('')}
    </div>` : ''}

    <!-- Próxima fecha -->
    ${nextMatches.length ? `
    <div class="section">
      <div class="spread">
        <div><span class="eyebrow">Lo que viene</span><h2>Próxima fecha${nextFechaNum ? ` · Fecha ${esc(nextFechaNum)}` : ''}</h2></div>
        <a href="/programacion" data-link class="btn btn-ghost btn-sm">Ver todo</a>
      </div>
      <p class="muted mb-2">${esc(fmtDateLong(nextDate))}</p>
      ${nextMatches.slice(0, 6).map(p => matchRow(p, byId)).join('')}
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
    </div>

    <!-- CTA reclutamiento SOLO Senior -->
    <div class="hero-flat">
      <div class="deco">${icon('ball', { size: 210, stroke: 1.2 })}</div>
      <span class="eyebrow" style="color:var(--c-ink)">Categoría Senior · +32</span>
      <h2>Quedan los últimos cupos Senior</h2>
      <p>El torneo ya arrancó, pero todavía puedes sumar tu equipo a la serie Senior. Cupos muy limitados: conversemos y aseguramos tu lugar.</p>
      <a href="/admision" data-link class="btn btn-primary btn-lg mt-2">Inscribe tu equipo Senior</a>
    </div>
  </div>`;

  mount(shell(inner, config));
}

function resultRow(p, byId) {
  const L = byId[p.local]?.nombre || p.local;
  const V = byId[p.visita]?.nombre || p.visita;
  const gl = +p.golesLocal, gv = +p.golesVisita;
  const sl = serieLabel(p.serie);
  return `
  <div class="match-card finished">
    <div class="team home"><span class="name" style="${gl > gv ? 'font-weight:800' : ''}">${esc(L)}</span>${teamLogo(byId[p.local]?.logo, L, 34)}</div>
    <div class="vs"><div class="score">${gl} - ${gv}</div><div class="meta">${sl ? esc(sl) : 'Final'}</div></div>
    <div class="team">${teamLogo(byId[p.visita]?.logo, V, 34)}<span class="name" style="${gv > gl ? 'font-weight:800' : ''}">${esc(V)}</span></div>
  </div>`;
}

function matchRow(p, byId) {
  const L = byId[p.local]?.nombre || p.local;
  const V = byId[p.visita]?.nombre || p.visita;
  return `
  <div class="match-card">
    <div class="team home"><span class="name">${esc(L)}</span>${teamLogo(byId[p.local]?.logo, L, 34)}</div>
    <div class="vs"><div class="scheduled">${esc(fmtTime(p.hora))}</div><div class="meta">${esc(p.cancha || '')}</div></div>
    <div class="team">${teamLogo(byId[p.visita]?.logo, V, 34)}<span class="name">${esc(V)}</span></div>
  </div>`;
}
