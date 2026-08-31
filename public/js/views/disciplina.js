import { getConfig, getDisciplina, getEquipos, getPartidos, equiposById, suspendidosParaFecha } from '../services/store.js';
import { mount, esc, fmtDate, parseDate, teamInline } from '../ui/helpers.js';
import { shell, loading } from '../ui/layout.js';
import { icon } from '../ui/icons.js';
import { serieChips, emptyBox } from './programacion.js';

let _serie = 'all';

// Tipificación de rojas: via 'auto' (firme) o 'comite' (rango, apelable).
const TIPIFICACION = [
  { falta: 'Juego brusco grave (entrada temeraria, sin intención de agredir)', via: 'auto', sancion: '1 fecha' },
  { falta: 'Malograr una ocasión manifiesta de gol (mano o falta)', via: 'auto', sancion: '1 fecha' },
  { falta: 'Lenguaje o gestos ofensivos (no dirigidos como amenaza)', via: 'auto', sancion: '1 fecha' },
  { falta: 'Conducta antideportiva grave (protesta agresiva, provocación)', via: 'comite', sancion: '1 a 2 fechas' },
  { falta: 'Insultos, amenazas o injurias al árbitro, organización o rival', via: 'comite', sancion: '2 a 4 fechas' },
  { falta: 'Escupir a otra persona', via: 'comite', sancion: '3 a 5 fechas' },
  { falta: 'Intento de agresión (a jugador, árbitro u otra persona)', via: 'comite', sancion: '3 a 6 fechas' },
  { falta: 'Agresión física a un jugador u otra persona presente', via: 'comite', sancion: 'Mín. 4 fechas, hasta expulsión' },
  { falta: 'Agresión física al árbitro o a un organizador', via: 'comite', sancion: 'Expulsión inmediata y definitiva de la LIV · Inapelable' },
  { falta: 'Riña, pelea o agresión colectiva', via: 'comite', sancion: 'Expulsión inmediata y definitiva' }
];

const viaAuto = `<span class="pill" style="background:#e4f3ea;color:#0c3b23">Automática</span>`;
const viaComite = `<span class="pill" style="background:#fdecec;color:#9b1c1c">Comité</span>`;

function comiteBlock(config) {
  const filas = TIPIFICACION.map(t => `
    <tr>
      <td>${esc(t.falta)}</td>
      <td style="white-space:nowrap">${t.via === 'auto' ? viaAuto : viaComite}</td>
      <td class="muted">${esc(t.sancion)}</td>
    </tr>`).join('');

  return `
  <!-- Dos vías -->
  <div class="grid grid-2 mb-3">
    <div class="card card-tinted-brand">
      <div class="card-header"><h3 style="color:var(--c-brand)">${icon('check', { size: 20 })} Sanción automática</h3></div>
      <p class="mt-1">Se aplica directo por tabla, sin sesión, y se cumple en la fecha siguiente. Ej.: la roja por <strong>doble amarilla no tiene suspensión</strong> para la fecha siguiente; una <strong>roja directa</strong> son 1 fecha.</p>
    </div>
    <div class="card card-tinted-accent">
      <div class="card-header"><h3>${icon('scale', { size: 20 })} Sanción de comité</h3></div>
      <p class="mt-1">Faltas graves que se tipifican caso a caso. Requiere <strong>sesión del comité</strong>, que fija la sanción dentro de un rango. <strong>Sí admiten apelación.</strong></p>
    </div>
  </div>

  <div class="card mb-3" style="border-left:4px solid var(--c-brand)">
    <p style="margin:0"><strong>Regla práctica:</strong> si la expulsión es automática y nadie apela, el comité <strong>no se reúne</strong>. Solo sesiona cuando hay una falta que tipificar, una apelación válida o un hecho grave que investigar.</p>
  </div>

  <!-- Tipificación de rojas -->
  <span class="eyebrow">Tipificación</span>
  <h2 class="mb-1">Rojas directas: qué es automático y qué va a comité</h2>
  <p class="muted mb-2">En las de comité, el número exacto de fechas lo fija el comité según gravedad, reincidencia y video.</p>
  <div class="table-wrap mb-3"><table class="tbl">
    <thead><tr><th>Falta (roja directa)</th><th>Vía</th><th>Sanción</th></tr></thead>
    <tbody>${filas}</tbody>
  </table></div>

  <!-- Cómo funciona -->
  <div class="grid grid-3 mb-3">
    <div class="card">
      <div class="card-header"><h3>${icon('calendar', { size: 20 })} Sesiones</h3></div>
      <p class="muted mt-1">Los <strong>martes</strong> en la tarde-noche, solo si hay casos en tabla. El Directorio convoca y notifica a los delegados.</p>
    </div>
    <div class="card">
      <div class="card-header"><h3>${icon('users', { size: 20 })} Quórum</h3></div>
      <p class="muted mt-1"><strong>3 votos</strong>: Directorio, cuerpo arbitral y equipos (3 representantes, 1 voto). Quórum: <strong>1 de cada estamento</strong>. El representante de un equipo involucrado se inhabilita.</p>
    </div>
    <div class="card">
      <div class="card-header"><h3>${icon('shield', { size: 20 })} Decisión</h3></div>
      <p class="muted mt-1">Por <strong>mayoría</strong> de los 3 votos. Se resuelve con <strong>informe arbitral y video</strong>.</p>
    </div>
  </div>

  <!-- Apelaciones + descarga -->
  <div class="grid grid-2 mb-3">
    <div class="card">
      <div class="card-header"><h3>${icon('clipboard', { size: 20 })} Apelaciones</h3></div>
      <p class="muted mt-1"><strong>Siempre se puede apelar</strong> presentando <strong>material audiovisual</strong> que pruebe lo contrario a lo sancionado; el comité decide en base a la evidencia. El reclamo va por escrito, vía delegado, dentro de <strong>48 h</strong>.</p>
    </div>
    <div class="card">
      <div class="row" style="gap:12px;align-items:flex-start">
        <span style="color:var(--c-brand)">${icon('file', { size: 28 })}</span>
        <div style="flex:1;min-width:0">
          <h3 style="margin:0">Protocolo completo</h3>
          <p class="muted" style="margin:2px 0 0">Tipificación, sesiones, quórum y flujo (PDF)</p>
        </div>
      </div>
      <div class="row mt-2">
        <a href="/assets/Protocolo-Comite-Disciplina-LIV-2026.pdf" download class="btn btn-primary btn-sm">${icon('download', { size: 16 })} Descargar</a>
        <a href="/assets/Protocolo-Comite-Disciplina-LIV-2026.pdf" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">${icon('eye', { size: 16 })} Ver online</a>
      </div>
    </div>
  </div>`;
}

export async function showDisciplina() {
  mount(loading());
  const [config, tarjetas, equipos, partidos] = await Promise.all([getConfig(), getDisciplina(), getEquipos(), getPartidos()]);
  const byId = equiposById(equipos);
  const series = config.series || [];

  // Próxima fecha: la primera programada; si no hay, la siguiente a la última jugada.
  const prog = partidos.filter(p => p.estado !== 'finalizado' && p.fecha_num != null).map(p => +p.fecha_num);
  const jug = partidos.filter(p => p.estado === 'finalizado' && p.fecha_num != null).map(p => +p.fecha_num);
  const proxFecha = prog.length ? Math.min(...prog) : (jug.length ? Math.max(...jug) + 1 : null);

  function renderSusp() {
    const el = document.getElementById('disc-susp');
    if (!el) return;
    if (!proxFecha) { el.innerHTML = ''; return; }
    const susp = suspendidosParaFecha(tarjetas, proxFecha).filter(s => _serie === 'all' || s.serie === _serie);
    el.innerHTML = `
      <div class="card mb-3" style="border-left:4px solid var(--c-red)">
        <div class="card-header"><h3 style="margin:0">${icon('shield', { size: 20 })} Suspendidos para la Fecha ${proxFecha}</h3></div>
        ${susp.length ? `
        <div class="table-wrap mt-2"><table class="tbl">
          <thead><tr><th>Jugador</th><th>Equipo</th><th>Motivo</th><th>Se pierde</th></tr></thead>
          <tbody>${susp.map(s => `<tr>
            <td style="font-weight:700">${esc(s.nombre || '—')}</td>
            <td>${s.equipo ? teamInline(byId[s.equipo]?.logo, byId[s.equipo]?.nombre || s.equipo, { size: 22 }) : '<span class="muted">—</span>'}</td>
            <td class="muted">${esc(s.motivo || '')}</td>
            <td><span class="pill pill-red">${s.definitivo ? 'Expulsado de la LIV' : (s.hasta > s.desde ? `Fechas ${s.desde}–${s.hasta}` : `Fecha ${s.desde}`)}</span></td>
          </tr>`).join('')}</tbody>
        </table></div>`
        : `<p class="muted mt-1" style="margin:0">Sin suspendidos para la próxima fecha. ✔️</p>`}
      </div>`;
  }

  function renderData() {
    const list = tarjetas
      .filter(t => _serie === 'all' || t.serie === _serie)
      .sort((a, b) => (parseDate(b.fecha) - parseDate(a.fecha)));

    const amar = list.filter(t => t.tipo === 'amarilla').length;
    const rojas = list.filter(t => t.tipo === 'roja').length;

    const body = list.length ? `
      <div class="stat-grid">
        <div class="stat"><div class="stat-label">Amarillas</div><div class="stat-value" style="color:var(--c-accent-deep)">${amar}</div></div>
        <div class="stat"><div class="stat-label">Rojas</div><div class="stat-value" style="color:var(--c-red)">${rojas}</div></div>
        <div class="stat"><div class="stat-label">Sanciones</div><div class="stat-value">${list.filter(t => t.sancion).length}</div></div>
      </div>
      <div class="table-wrap"><table class="tbl">
        <thead><tr><th>Fecha</th><th></th><th>Jugador</th><th>Equipo</th><th>Motivo</th><th>Sanción</th></tr></thead>
        <tbody>
          ${list.map(t => `
            <tr>
              <td class="muted" style="white-space:nowrap">${esc(fmtDate(t.fecha))}</td>
              <td>${t.tipo === 'roja' ? '<span class="pill pill-red"><span class="tarjeta tarjeta-roja"></span> Roja</span>' : '<span class="pill" style="background:var(--c-accent-soft);color:var(--c-accent-deep)"><span class="tarjeta tarjeta-amarilla"></span> Amarilla</span>'}</td>
              <td style="font-weight:700">${esc(t.jugador || '—')}</td>
              <td>${t.equipo ? teamInline(byId[t.equipo]?.logo, byId[t.equipo]?.nombre || t.equipo, { size: 22 }) : '<span class="muted">—</span>'}</td>
              <td class="muted">${esc(t.motivo || '')}</td>
              <td>${t.sancion ? `<span class="pill pill-dark">${esc(t.sancion)}</span>` : '<span class="muted">—</span>'}</td>
            </tr>`).join('')}
        </tbody>
      </table></div>` : emptyBox('Sin registros de disciplina por ahora. ¡Buen fair play!');

    const el = document.getElementById('disc-body');
    if (el) el.innerHTML = body;
    document.querySelectorAll('#serie-chips .chip').forEach(c => c.classList.toggle('active', c.dataset.serie === _serie));
  }

  const inner = `
  <div class="container">
    <span class="eyebrow">Comité de disciplina</span>
    <h1>Disciplina</h1>
    <p class="subtitle mb-3">Cómo se sancionan las expulsiones en LIV. Lo simple se aplica por tabla; lo grave lo resuelve el comité. Cero violencia.</p>

    ${comiteBlock(config)}

    <span class="eyebrow">Registro de la temporada</span>
    <h2 class="mb-2">Tarjetas y sanciones</h2>
    ${serieChips(series)}
    <div id="disc-susp"></div>
    <div id="disc-body"></div>
  </div>`;

  mount(shell(inner, config));
  document.querySelectorAll('#serie-chips .chip').forEach(c => c.addEventListener('click', () => { _serie = c.dataset.serie; renderSusp(); renderData(); }));
  renderSusp();
  renderData();
}
