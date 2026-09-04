import { getConfig } from '../services/store.js';
import { mount, esc, clp } from '../ui/helpers.js';
import { shell, loading } from '../ui/layout.js';
import { icon } from '../ui/icons.js';

export async function showReglamentos() {
  mount(loading());
  const config = await getConfig();

  const highlights = [
    { v: clp(config.valorInscripcion || 1800000), l: 'Inscripción', h: '3 cuotas de $600.000' },
    { v: '16–35', l: 'Planilla', h: 'jugadores por equipo' },
    { v: '10 min', l: 'Tolerancia', h: 'menos de 9 = riesgo de W.O. + multa $80.000' },
    { v: '≥ 1 fecha', l: 'Roja directa', h: 'suspensión mínima' },
    { v: '≥ 4 fechas', l: 'Agresión física', h: 'hasta expulsión' },
    { v: '48 h', l: 'Reclamos', h: 'hábiles · al correo LIV' }
  ];

  const secciones = [
    { t: 'Inscripción y pagos', b: `<ul>
        <li>Valor por equipo: <strong>${clp(config.valorInscripcion || 1800000)}</strong>, pagadero en <strong>3 cuotas de $600.000</strong>: Cuota 1 al confirmar la inscripción; Cuota 2 en la 1ª/2ª fecha; Cuota 3 antes de la 5ª fecha.</li>
        <li>Atraso mayor a <strong>7 días</strong>: suspensión de la fecha siguiente. Atraso mayor a <strong>15 días</strong>: expulsión de la Liga sin reembolso.</li>
        <li>Los montos pagados <strong>no son reembolsables</strong>. Todo acuerdo particular debe constar por escrito (correo); ningún acuerdo verbal es válido.</li>
      </ul>` },
    { t: 'Participación y planilla de buena fe', b: `<ul>
        <li>Planilla de buena fe de <strong>16 a 35 jugadores</strong> antes del inicio de la fase regular.</li>
        <li><strong>Documentos válidos para jugar:</strong> cédula de identidad, comprobante de cédula en trámite, pasaporte o licencia de conducir (vigentes). No se aceptan credenciales de trabajo o estudio, tarjetas bancarias ni fotocopias. La Liga puede exigir el documento en cualquier momento, incluso durante el partido.</li>
        <li><strong>Si a un jugador se le queda el carnet:</strong> puede jugar mostrando una <strong>foto de su carnet</strong> únicamente si <strong>ambos delegados están de acuerdo</strong> y se deja constancia escrita y firmada en la planilla. Sin documento válido ni esa autorización firmada, no juega.</li>
        <li>Cambios de planilla solo hasta la <strong>fecha 3</strong>, aprobados por el Directorio.</li>
        <li>Cada equipo designa un <strong>delegado oficial</strong> como único interlocutor ante la Liga.</li>
        <li><strong>Categorías:</strong> Junior — libre, 18 años o más; excepcionalmente pueden jugar los de <strong>17 años con autorización notarial de sus padres</strong>. Senior — nacidos en 1994 o antes (+32), con un máximo de 2 jugadores nacidos en 1995/1996.</li>
      </ul>` },
    { t: 'Uniforme y equipamiento', b: `<ul>
        <li>Todos los jugadores de un mismo equipo en cancha deben estar uniformados con la <strong>misma camiseta, el mismo short y el mismo color de medias</strong>.</li>
        <li>El uso de <strong>canilleras es obligatorio</strong>. Sin este equipamiento, el jugador no puede ingresar a la cancha.</li>
      </ul>` },
    { t: 'Sustituciones y reingresos', b: `<ul>
        <li>Los <strong>cambios son ilimitados</strong> durante el partido.</li>
        <li><strong>Reingresos permitidos:</strong> en la categoría <strong>Junior, 1 reingreso</strong> por jugador; en la categoría <strong>Senior, 2 reingresos</strong> por jugador. Un reingreso es cuando un jugador que salió vuelve a entrar.</li>
        <li>Toda sustitución se avisa a la mesa; el planillero registra las <strong>entradas y salidas</strong> para controlar los reingresos.</li>
      </ul>` },
    { t: 'Formato de competencia', b: `<ul>
        <li><strong>10 equipos</strong>, fase regular de todos contra todos según el fixture oficial.</li>
        <li>Al terminar la fase regular: <strong>1° a 4°</strong> → semifinales de la <strong>Copa de Oro</strong> (define al campeón); <strong>5° a 8°</strong> → <strong>Copa de Plata</strong>; <strong>9° y 10°</strong> → partido de promoción, el perdedor desciende.</li>
        <li>Ante <strong>igualdad de puntos</strong> en la tabla, define un <strong>partido entre los empatados</strong>; si persiste, la <strong>diferencia de goles</strong>.</li>
        <li>Solo pueden disputar los <strong>playoffs</strong> (semifinales y finales de copa) y el <strong>partido de descenso</strong> los jugadores con <strong>al menos 3 firmas</strong> en planilla durante la fase regular.</li>
        <li>A futuro, LIV se disputará con sistema de <strong>Primera y Segunda División</strong>.</li>
        <li>Fixture, horarios y canchas los define el Directorio y son <strong>obligatorios</strong>: ningún equipo los modifica unilateralmente.</li>
      </ul>` },
    { t: 'Días, horarios y complejo', b: `<p>La competencia se juega los <strong>sábados</strong> en el <strong>Complejo Deggiano</strong>. Horarios de inicio por categoría:</p>
      <div class="table-wrap" style="margin:10px 0"><table class="tbl"><thead><tr><th>Horario de inicio</th><th>Categoría</th></tr></thead><tbody>
        <tr><td>09:00</td><td>Senior</td></tr>
        <tr><td>10:40</td><td>Senior / Junior</td></tr>
        <tr><td>12:20</td><td>Junior</td></tr>
      </tbody></table></div>
      <p><strong>Senior</strong> juega a las 09:00 y 10:40; <strong>Junior</strong> juega a las 10:40 y 12:20.</p>
      <li style="list-style:none;margin-left:0"><strong>Camarines:</strong> la Liga designa y asigna los camarines a cada equipo; se debe respetar esa asignación.</li>
      <p style="margin-top:8px">La banca es exclusiva para jugadores en planilla, cuerpo técnico y delegado; no se permiten espectadores en ella.</p>` },
    { t: 'Presentación de equipos y walkover (W.O.)', b: `<ul>
        <li>Para jugar, cada equipo debe presentarse con un <strong>mínimo de 9 jugadores habilitados</strong>. Tolerancia máxima de <strong>10 minutos</strong> desde la hora oficial de inicio.</li>
        <li>Cumplida la tolerancia con <strong>menos de 9</strong>, el partido puede declararse <strong>W.O.</strong> No es automático: el rival puede <strong>optar por esperar</strong>, pero los <strong>minutos transcurridos se descuentan</strong> del tiempo de juego.</li>
        <li>El W.O. implica <strong>multa de $80.000</strong> más la derrota deportiva por <strong>0-3</strong> (3 puntos para el rival).</li>
        <li>Retirarse de la cancha antes del final sin causa justificada: walkover + sanción del Comité.</li>
        <li>El W.O. no exime del pago de cuotas ni multas.</li>
      </ul>` },
    { t: 'Disciplina en cancha', b: `<ul>
        <li>Tarjetas amarillas y rojas aplicadas por la terna arbitral.</li>
        <li><strong>Dos amarillas en un mismo partido</strong> equivalen a roja; esa expulsión <strong>no conlleva suspensión</strong> para la fecha siguiente.</li>
        <li><strong>Roja directa:</strong> suspensión mínima de <strong>1 fecha</strong> (ampliable por el Comité).</li>
        <li>Las suspensiones se cumplen en la fecha <strong>inmediatamente siguiente</strong> del calendario.</li>
      </ul>` },
    { t: 'Agresión física individual', b: `<ul>
        <li>Todo jugador expulsado por <strong>agredir físicamente</strong> a un rival, compañero, árbitro, miembro de la organización, cuerpo técnico o cualquier persona presente: <strong>suspensión mínima de 4 fechas</strong>.</li>
        <li>Según la gravedad, consecuencias, reincidencia y demás antecedentes, la sanción puede aumentar hasta la <strong>expulsión definitiva del jugador de la LIV</strong>.</li>
      </ul>` },
    { t: 'Riñas, peleas y agresiones colectivas', b: `<p class="mb-2"><strong>Tolerancia cero.</strong></p><ul>
        <li>Quien <strong>participe activamente</strong> en una riña o pelea con agresiones físicas: <strong>expulsión inmediata y definitiva de la LIV</strong>.</li>
        <li>Si participan <strong>dos o más jugadores de un mismo equipo</strong>: además de la expulsión individual, el <strong>equipo completo queda expulsado de la competencia</strong>.</li>
        <li><strong>Participación activa</strong> = golpes, patadas, empujones violentos o cualquier conducta física agresiva. <strong>No</strong> cuenta intervenir solo para separar o contener.</li>
        <li>La responsabilidad se determina con el <strong>informe arbitral, los registros audiovisuales</strong> y demás antecedentes.</li>
      </ul>` },
    { t: 'Escala de sanciones', b: `<div class="table-wrap"><table class="tbl"><thead><tr><th>Nivel</th><th>Conductas (ejemplos)</th><th>Sanciones</th></tr></thead><tbody>
        <tr><td><span class="pill pill-grey">Leve</span></td><td>Atrasos, presentación incompleta, descuido menor de instalaciones, reclamos improcedentes.</td><td>Amonestación, apercibimiento y/o multa menor.</td></tr>
        <tr><td><span class="pill" style="background:var(--c-accent-soft);color:var(--c-accent-deep)">Grave</span></td><td>Agresiones verbales al arbitraje, conducta antideportiva reiterada, atraso en pagos, daño a instalaciones.</td><td>Suspensión de 1 a 3 fechas, multa y/o pérdida de puntos.</td></tr>
        <tr><td><span class="pill pill-red">Gravísima</span></td><td>Agresión física, riñas o peleas colectivas, suplantación, falsificación de edad/documentos, fraude.</td><td>Suspensión prolongada o eliminación, derrota 0-3 y/o expulsión definitiva sin reembolso.</td></tr>
      </tbody></table></div>` },
    { t: 'Conducta de dirigentes, cuerpo técnico y público', b: `<ul>
        <li>Dirigentes y cuerpo técnico son <strong>responsables solidarios</strong> de la conducta de jugadores, suplentes y público de su equipo.</li>
        <li><strong>Agresión física</strong> de cualquier integrante (incluido el público) a un árbitro, jugador u organizador: <strong>expulsión inmediata y definitiva del equipo</strong>, sin reembolso.</li>
        <li>Agresiones verbales graves o reiteradas al arbitraje: suspensión mínima de <strong>2 fechas</strong> y amonestación al equipo.</li>
      </ul>` },
    { t: 'Identidad y control de jugadores', b: `<ul>
        <li>Prohibida la suplantación de identidad (<em>"jugador fantasma"</em>): 0-3 en contra, suspensión del suplantado y del suplantador por el <strong>resto de la temporada</strong> y multa.</li>
        <li>Solo pueden jugar los inscritos en la planilla vigente. Al <strong>firmar la planilla</strong>, cada jugador debe <strong>exhibir su documento de identidad</strong>; los planilleros lo verifican en ese momento.</li>
        <li><strong>Firma de la planilla:</strong> el delegado entrega <strong>todos los carnets al comienzo del partido</strong>. Todos los presentes pueden firmar; los <strong>titulares deben firmar en el entretiempo</strong> y el resto de los jugadores puede firmar una vez <strong>iniciado el segundo tiempo</strong>.</li>
        <li>La Liga puede controlar la identidad <strong>antes, durante o después</strong> del partido. Negarse a exhibir el documento: partido perdido 0-3.</li>
      </ul>` },
    { t: 'Instalaciones y consumo', b: `<ul>
        <li>Los equipos cuidan las instalaciones; todo daño se cobra según el costo real de reparación.</li>
        <li>El alcohol solo se consume en <strong>zonas habilitadas</strong>. En el <strong>Club House</strong> solo se podrá consumir alcohol comercializado por LIV (suspendido mientras se obtienen las autorizaciones).</li>
        <li>En los <strong>quinchos</strong> se permite alcohol adquirido fuera del complejo; cada quincho se arrienda de forma exclusiva por un equipo.</li>
        <li>Prohibido el consumo de sustancias ilícitas y de alcohol antes o durante los partidos.</li>
      </ul>` },
    { t: 'Salud, seguros y fuerza mayor', b: `<ul>
        <li>Cada jugador participa bajo su <strong>propia responsabilidad</strong>; se recomienda contar con seguro de accidentes deportivos.</li>
        <li>Ante lluvia, canchas inutilizables u otras emergencias, el Directorio puede suspender y <strong>reprogramar</strong> (programación obligatoria). No se suspende por motivos particulares.</li>
      </ul>` },
    { t: 'Comité Disciplinario', b: `<ul>
        <li>Integrado por <strong>3 votos</strong>: <strong>1 del cuerpo arbitral</strong>, <strong>1 del Directorio</strong> y <strong>1 de los equipos</strong> (representados por 3 delegados).</li>
        <li><strong>Quórum mínimo</strong> para sesionar: 1 representante de cada estamento (Directorio, cuerpo arbitral y equipos).</li>
        <li>Se ocupa <strong>todo el material audiovisual disponible</strong> para impartir justicia y esclarecer los hechos.</li>
      </ul>` },
    { t: 'Reclamos y apelaciones', b: `<ul>
        <li>Los reclamos a <strong>sanciones, tarjetas o expulsiones</strong> se presentan <strong>por escrito al correo <a href="mailto:liv.torneos@gmail.com">liv.torneos@gmail.com</a></strong>, por el delegado oficial, dentro de un plazo de <strong>48 horas hábiles</strong> del partido o hecho —es decir, <strong>hasta las 23:59 del día martes</strong>.</li>
        <li>No se cursan reclamos verbales, anónimos o fuera de plazo. El Comité resuelve en <strong>5 días hábiles</strong>.</li>
        <li><strong>Siempre se puede apelar</strong> una sanción presentando <strong>material audiovisual</strong> que pruebe lo contrario a lo sancionado; el <strong>Comité de Disciplina decide</strong> en base a la evidencia presentada.</li>
      </ul>` },
    { t: 'Causales de expulsión de la Liga', b: `<ul>
        <li>Atraso en el pago de cuotas superior a 15 días.</li>
        <li>Agresión física de cualquier integrante del equipo.</li>
        <li>Participación activa en riñas o peleas colectivas (dos o más jugadores del equipo).</li>
        <li>Suplantación de identidad comprobada.</li>
        <li>Falsificación de edad, documentos o antecedentes.</li>
        <li>Reincidencia en walkover (2 veces).</li>
        <li>Fraude, soborno o manipulación de resultados.</li>
      </ul>` },
    { t: 'Premios y reconocimientos', b: `<ul>
        <li>Premio en efectivo al equipo campeón (monto informado antes de cada temporada) y reconocimiento al mejor jugador de cada partido.</li>
        <li>Reconocimientos individuales: <strong>Mejor Jugador del Campeonato</strong>, <strong>Mejor Arquero</strong>, <strong>MVP de la Temporada</strong>, <strong>Goleador</strong> y <strong>Fair Play</strong>, patrocinados por los auspiciadores.</li>
      </ul>` },
    { t: 'Derechos audiovisuales e imagen', b: `<p>La inscripción autoriza de forma expresa e irrevocable el uso de imágenes, videos y material audiovisual captado en la competencia con fines deportivos, promocionales, comerciales e institucionales de LIV, sin compensación. Ningún equipo puede explotar el material oficial sin autorización escrita del Directorio.</p>` },
    { t: 'Código de Conducta LIV', b: `<p>Todos los participantes se comprometen a promover:</p><ul>
        <li>Respeto al árbitro, al rival y a las instalaciones.</li>
        <li>Puntualidad, juego limpio y buena convivencia.</li>
        <li><strong>Cero violencia</strong> y cuidado del Complejo Deggiano.</li>
        <li>Respeto hacia niños, mujeres y familias, y representar con orgullo a su club.</li>
      </ul>` }
  ];

  const dl = (serie, file) => `
    <div class="card">
      <div class="row" style="gap:12px;align-items:flex-start">
        <span style="color:var(--c-brand)">${icon('file', { size: 30 })}</span>
        <div class="grow" style="flex:1;min-width:0">
          <h3 style="margin:0">Reglamento ${esc(serie)}</h3>
          <p class="muted" style="margin:2px 0 0">Documento oficial 2026 · aceptación obligatoria (PDF)</p>
        </div>
      </div>
      <div class="row mt-2">
        <a href="/assets/${file}" download class="btn btn-primary btn-sm">${icon('download', { size: 16 })} Descargar</a>
        <a href="/assets/${file}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">${icon('eye', { size: 16 })} Ver online</a>
      </div>
    </div>`;

  const inner = `
  <div class="container">
    <span class="eyebrow">Bases del torneo</span>
    <h1>Reglamentos</h1>
    <p class="subtitle mb-3">Reglamento oficial de LIV — Temporada 2026. Descarga el documento completo de tu serie y revisa acá lo más relevante.</p>

    <div class="grid grid-2 mb-3">
      ${dl('Junior', 'Reglamento-LIV-Junior-2026.pdf')}
      ${dl('Senior', 'Reglamento-LIV-Senior-2026.pdf')}
    </div>

    <div class="card mb-3">
      <div class="row" style="gap:12px;align-items:flex-start">
        <span style="color:var(--c-brand)">${icon('scale', { size: 30 })}</span>
        <div style="flex:1;min-width:0">
          <h3 style="margin:0">Protocolo del Comité de Disciplina</h3>
          <p class="muted" style="margin:2px 0 0">Tipificación de faltas, sanciones automáticas y de comité, sesiones y quórum (PDF)</p>
        </div>
        <a href="/disciplina" data-link class="btn btn-ghost btn-sm">Ver sistema →</a>
      </div>
      <div class="row mt-2">
        <a href="/assets/Protocolo-Comite-Disciplina-LIV-2026.pdf" download class="btn btn-primary btn-sm">${icon('download', { size: 16 })} Descargar</a>
        <a href="/assets/Protocolo-Comite-Disciplina-LIV-2026.pdf" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">${icon('eye', { size: 16 })} Ver online</a>
      </div>
    </div>

    <div class="grid grid-2 mb-3">
      <div class="card card-tinted-brand">
        <h3 style="color:var(--c-brand)">Categorías</h3>
        <p class="mt-1"><span class="pill pill-dark">Junior (Jr)</span> &nbsp;Libre · 18+ (17 con autorización notarial)</p>
        <p class="mt-1"><span class="pill pill-dark">Senior (Sr)</span> &nbsp;+32 (nacidos 1994 o antes) · máx. 2 de 1995/1996</p>
      </div>
      <div class="card card-tinted-accent">
        <h3>Inscripción</h3>
        <div class="price-box mt-1"><span class="amount">${clp(config.valorInscripcion || 1800000)}</span><span class="unit">Por equipo · 3 cuotas de $600.000</span></div>
        <a href="/admision" data-link class="btn btn-primary btn-sm mt-2">Inscribir equipo</a>
      </div>
    </div>

    <span class="eyebrow">Lo esencial</span>
    <h2 class="mb-2">Puntos clave del reglamento</h2>
    <div class="stat-grid">
      ${highlights.map(s => `<div class="stat"><div class="stat-label">${esc(s.l)}</div><div class="stat-value" style="font-size:1.5rem">${esc(s.v)}</div><div class="stat-hint">${esc(s.h)}</div></div>`).join('')}
    </div>

    <h2 class="mt-4 mb-2">Reglamento en detalle</h2>
    <div class="prose w-100" style="max-width:none">
      ${secciones.map((r, i) => `
        <details class="accordion" ${i === 0 ? 'open' : ''}>
          <summary>${esc(r.t)}</summary>
          <div class="acc-body">${r.b}</div>
        </details>`).join('')}
    </div>

    <p class="muted mt-3" style="font-size:.9rem">Este resumen es referencial y no reemplaza el reglamento oficial. Ante cualquier diferencia, prevalece el documento PDF completo. El Directorio puede modificar el reglamento entre temporadas avisando con al menos 15 días de anticipación.</p>
  </div>`;

  mount(shell(inner, config));
}
