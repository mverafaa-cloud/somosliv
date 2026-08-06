import { getConfig } from '../services/store.js';
import { mount, esc, clp } from '../ui/helpers.js';
import { shell, loading } from '../ui/layout.js';

export async function showReglamentos() {
  mount(loading());
  const config = await getConfig();

  const reglas = [
    { t: 'Categorías / Series', b: `<ul>
        <li><strong>Todo Competidor</strong> — jugadores de 18 años en adelante.</li>
        <li><strong>Senior +32</strong> — jugadores de 32 años en adelante.</li>
      </ul>` },
    { t: 'Requisitos de inscripción', b: `<ul>
        <li>Equipos de hasta <strong>30 jugadores</strong> (11 en cancha).</li>
        <li>Uniforme completo y numerado (camiseta, short y calcetines).</li>
        <li>Lista de jugadores con datos completos: nombre, edad, número de camiseta y copia de cédula de identidad.</li>
      </ul>` },
    { t: 'Formato de competencia', b: `<p>Fútbol 11 en canchas de pasto natural. Cada serie disputa un fixture de todos contra todos por fecha, con 3 puntos por victoria, 1 por empate y 0 por derrota. La tabla de posiciones se ordena por puntos, diferencia de gol, goles a favor y luego por orden alfabético.</p>` },
    { t: 'Disciplina y conducta', b: `<p>La LIV promueve el juego sano y la <strong>cero violencia</strong>. Un comité de disciplina evalúa las tarjetas y las conductas antideportivas. La acumulación de amonestaciones y las tarjetas rojas conllevan fechas de suspensión. Los hechos de violencia se castigan drásticamente, pudiendo significar la expulsión del jugador o del equipo del torneo.</p>` },
    { t: 'Arbitraje', b: `<p>Cada partido es dirigido por una terna arbitral calificada. La liga evalúa a cada árbitro fecha a fecha para asegurar criterios justos, fluidez en el juego y respeto al reglamento y a los jugadores.</p>` },
    { t: 'Premios y reconocimientos', b: `<ul>
        <li><strong>1er lugar:</strong> Trofeo + Medallas + Dinero + Otros.</li>
        <li><strong>2do lugar:</strong> Trofeo + Medallas + Otros.</li>
        <li><strong>3er lugar:</strong> Medallas + Otros.</li>
        <li><strong>Reconocimientos individuales:</strong> Goleador del torneo, Mejor portero y MVP — todos con premios de nuestros auspiciadores.</li>
      </ul>` }
  ];

  const inner = `
  <div class="container">
    <span class="eyebrow">Bases del torneo</span>
    <h1>Reglamentos</h1>
    <p class="subtitle mb-3">Todo lo que tu equipo necesita saber para competir en la LIV. Ante cualquier duda, escríbenos.</p>

    <div class="grid grid-2 mb-3">
      <div class="card card-tinted-brand">
        <h3 style="color:var(--c-brand)">Categorías</h3>
        <p><span class="pill pill-dark mt-1">Todo Competidor · 18+</span></p>
        <p><span class="pill pill-dark mt-1">Senior · +32</span></p>
      </div>
      <div class="card card-tinted-accent">
        <h3>Inscripción</h3>
        <div class="price-box mt-1"><span class="amount">${clp(config.valorInscripcion || 1800000)}</span><span class="unit">Semestral por equipo</span></div>
        <a href="/admision" data-link class="btn btn-primary btn-sm mt-2">Inscribir equipo</a>
      </div>
    </div>

    <div class="prose w-100" style="max-width:none">
      ${reglas.map(r => `
        <details class="accordion" ${r === reglas[0] ? 'open' : ''}>
          <summary>${esc(r.t)}</summary>
          <div class="acc-body">${r.b}</div>
        </details>`).join('')}
    </div>
  </div>`;

  mount(shell(inner, config));
}
