import { getConfig } from '../services/store.js';
import { mount, esc } from '../ui/helpers.js';
import { shell, loading } from '../ui/layout.js';
import { icon } from '../ui/icons.js';

export async function showLIV() {
  mount(loading());
  const config = await getConfig();

  const servicios = [
    { i: 'sprout', l: '4 canchas de pasto natural' },
    { i: 'droplets', l: 'Baños, camarines y duchas' },
    { i: 'building', l: 'Club House 2° piso panorámico' },
    { i: 'droplet', l: 'Drenaje superior' },
    { i: 'parking', l: 'Estacionamientos' },
    { i: 'flame', l: 'Quinchos' },
    { i: 'trees', l: 'Áreas verdes' }
  ];

  const experiencia = [
    { i: 'pulse', t: 'Turnos y Kinesiólogos', d: 'Atención primaria garantizada con profesionales de la salud en cancha, stand en el recinto y servicios adicionales como masajes. Turnos con planillas impresas por la propia liga.' },
    { i: 'flag', t: 'Cuerpo Arbitral', d: 'Dirigidos por una terna arbitral calificada, asegurando criterios justos, fluidez en el juego y respeto al reglamento. Evaluamos a cada árbitro fecha a fecha.' },
    { i: 'camera', t: 'Cobertura Total', d: 'Cobertura audiovisual de primer nivel: fotografía profesional, grabación de partidos con tecnología VeoPro y estadísticas completas, todo centralizado en la web y redes.' }
  ];

  const porque = [
    { t: 'Organización de primer nivel', d: 'Cumplimiento de horarios, resultados actualizados al instante, balones oficiales, planillas impresas, registro de CI de jugadores y comité de disciplina.' },
    { t: 'Deporte sano y competitivo', d: 'Un entorno diseñado para sacar el mejor rendimiento de cada plantel. Acá lo único que vale es jugar fútbol: no hay espacio para la violencia.' },
    { t: 'El mejor ambiente de liga', d: 'Tercer tiempo en el Club House con un gran ambiente liguero. Nuestra terraza panorámica te sorprenderá.' },
    { t: 'Estadísticas y análisis', d: 'Registro de goleadores, tarjetas y posiciones al instante en la web, más videos y fotografías de los mejores momentos.' },
    { t: 'Crecimiento proyectado', d: 'Un complejo y una liga en constante crecimiento, buscando la mejor infraestructura de la región. Este es tu momento para ingresar.' }
  ];

  const inner = `
  <div class="container">
    <span class="eyebrow">Nuestra misión</span>
    <h1 class="display">TRANSFORMAR EL FÚTBOL AMATEUR</h1>
    <span class="title-script">El estándar de las mejores ligas</span>

    <div class="grid grid-2 mt-3" style="align-items:start">
      <div class="prose">
        <p>${esc(config.mision || '')}</p>
      </div>
      <div class="card card-tinted-brand">
        <h3 style="color:var(--c-brand)">La LIV en corto</h3>
        <div class="stat-grid" style="margin:14px 0 0">
          <div class="stat" style="background:#fff"><div class="stat-label">Series</div><div class="stat-value">2</div><div class="stat-hint">Todo Competidor y Senior +32</div></div>
          <div class="stat" style="background:#fff"><div class="stat-label">Sede</div><div class="stat-value" style="font-size:1.2rem">${esc(config.sede || 'Complejo Deggiano')}</div><div class="stat-hint">${esc(config.sedeUbicacion || '')}</div></div>
          <div class="stat" style="background:#fff"><div class="stat-label">Se juega</div><div class="stat-value" style="font-size:1.2rem">Sábados</div><div class="stat-hint">Todo el día</div></div>
        </div>
      </div>
    </div>

    <!-- Sede -->
    <div class="section">
      <span class="eyebrow">El torneo</span>
      <h2>¿Dónde latirá la pasión?</h2>
      <p class="subtitle mb-2">${esc(config.sede || 'Complejo Deggiano')} — ${esc(config.sedeUbicacion || 'Peñuelas, entre La Serena y Coquimbo')}, con excelentes accesos y uno de los mejores drenajes deportivos de la región, ideal para no parar de jugar nunca.</p>
      <div class="svc-grid">
        ${servicios.map(s => `<div class="svc"><div class="ico">${icon(s.i, { size: 26 })}</div><div class="lbl">${esc(s.l)}</div></div>`).join('')}
      </div>
    </div>

    <!-- Experiencia profesional -->
    <div class="section">
      <span class="eyebrow">Experiencia profesional</span>
      <h2 class="mb-3">Todo pensado para el jugador</h2>
      <div class="grid grid-3">
        ${experiencia.map(e => `
          <div class="card">
            <div style="color:var(--c-brand)">${icon(e.i, { size: 32 })}</div>
            <h3 style="color:var(--c-brand);margin:8px 0">${esc(e.t)}</h3>
            <p class="muted">${esc(e.d)}</p>
          </div>`).join('')}
      </div>
    </div>

    <!-- Por qué jugar -->
    <div class="section">
      <span class="eyebrow">¿Por qué jugar</span>
      <h2 class="mb-3"><span class="title-script" style="font-size:2.2rem">nuestra liga?</span></h2>
      <div class="grid grid-2">
        ${porque.map(p => `
          <div class="card card-sm">
            <h4 style="color:var(--c-brand)">${esc(p.t)}</h4>
            <p class="muted mt-1">${esc(p.d)}</p>
          </div>`).join('')}
      </div>
    </div>

    <div class="hero-flat">
      <div class="deco">${icon('ball', { size: 210, stroke: 1.2 })}</div>
      <h2>Sé parte de la LIV</h2>
      <p>Cupos limitados por serie. Inscribe a tu equipo y vive cada sábado como el mejor día de la semana.</p>
      <a href="/admision" data-link class="btn btn-primary btn-lg mt-2">Ver admisión</a>
    </div>
  </div>`;

  mount(shell(inner, config));
}
