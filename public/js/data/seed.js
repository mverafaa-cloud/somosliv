// ============================================================
//  SEED / CONTENIDO BASE DE LA LIV
//  - `config`: textos e info institucional (editable desde el panel admin).
//  - equipos / partidos / disciplina: DATOS DE EJEMPLO para el modo demo
//    (cuando Firebase todavía no está configurado). El panel admin los
//    reemplaza por los reales una vez conectado Firebase.
// ============================================================

export const SEED = {
  config: {
    nombre: 'LIV',
    nombreLargo: 'Liga La Cuarta',
    temporada: '2026',
    lema: 'El estándar de las mejores ligas',
    lanzamiento: '2026-08-29',           // sábado de estreno
    sede: 'Complejo Deggiano',
    sedeUbicacion: 'Peñuelas, entre La Serena y Coquimbo',
    mision: 'Nuestra misión es transformar radicalmente el fútbol amateur en la región. Queremos implementar un ambiente familiar y de sana competencia dentro de un complejo deportivo de primer nivel. Ofrecemos un servicio de alta calidad, donde el jugador y su familia son el núcleo central dentro de un marco organizativo profesional. Una experiencia distinta a lo que la región está acostumbrada, donde tendremos servicios de altísima calidad para que tu equipo espere cada sábado como el mejor día de la semana.',
    valorInscripcion: 1800000,
    contacto: {
      instagram: 'https://instagram.com/',
      whatsapp: '',
      email: '',
      telefono: ''
    },
    series: [
      { id: 'libre',  nombre: 'Todo Competidor', detalle: '18 años en adelante' },
      { id: 'senior', nombre: 'Senior +32',      detalle: '32 años en adelante' }
    ]
  },

  // ---- Equipos de ejemplo (serie: libre | senior) ----
  equipos: [
    { id: 'lib1', nombre: 'Deportivo Peñuelas',   serie: 'libre',  grupo: '' },
    { id: 'lib2', nombre: 'Real La Serena FC',    serie: 'libre',  grupo: '' },
    { id: 'lib3', nombre: 'Coquimbo City',        serie: 'libre',  grupo: '' },
    { id: 'lib4', nombre: 'Atlético El Faro',     serie: 'libre',  grupo: '' },
    { id: 'lib5', nombre: 'Unión Las Compañías',  serie: 'libre',  grupo: '' },
    { id: 'lib6', nombre: 'Sporting Tierras Blancas', serie: 'libre', grupo: '' },
    { id: 'sen1', nombre: 'Veteranos del Elqui',  serie: 'senior', grupo: '' },
    { id: 'sen2', nombre: 'Old Boys Serena',      serie: 'senior', grupo: '' },
    { id: 'sen3', nombre: 'Pirata Senior',        serie: 'senior', grupo: '' },
    { id: 'sen4', nombre: 'Deportivo Guayacán',   serie: 'senior', grupo: '' },
    { id: 'sen5', nombre: 'Amigos de Peñuelas',   serie: 'senior', grupo: '' },
    { id: 'sen6', nombre: 'Club La Pampa',        serie: 'senior', grupo: '' }
  ],

  // ---- Fixture de ejemplo. estado: 'finalizado' | 'programado' | 'en_vivo' ----
  partidos: [
    // Fecha 1 — LIBRE (finalizada)
    { id: 'm01', serie: 'libre', fecha_num: 1, fecha: '2026-08-29', hora: '10:00', cancha: 'Cancha 1', local: 'lib1', visita: 'lib2', golesLocal: 2, golesVisita: 1, estado: 'finalizado' },
    { id: 'm02', serie: 'libre', fecha_num: 1, fecha: '2026-08-29', hora: '11:30', cancha: 'Cancha 2', local: 'lib3', visita: 'lib4', golesLocal: 0, golesVisita: 0, estado: 'finalizado' },
    { id: 'm03', serie: 'libre', fecha_num: 1, fecha: '2026-08-29', hora: '13:00', cancha: 'Cancha 1', local: 'lib5', visita: 'lib6', golesLocal: 3, golesVisita: 2, estado: 'finalizado' },
    // Fecha 1 — SENIOR (finalizada)
    { id: 'm04', serie: 'senior', fecha_num: 1, fecha: '2026-08-29', hora: '10:00', cancha: 'Cancha 3', local: 'sen1', visita: 'sen2', golesLocal: 1, golesVisita: 1, estado: 'finalizado' },
    { id: 'm05', serie: 'senior', fecha_num: 1, fecha: '2026-08-29', hora: '11:30', cancha: 'Cancha 4', local: 'sen3', visita: 'sen4', golesLocal: 2, golesVisita: 0, estado: 'finalizado' },
    { id: 'm06', serie: 'senior', fecha_num: 1, fecha: '2026-08-29', hora: '13:00', cancha: 'Cancha 3', local: 'sen5', visita: 'sen6', golesLocal: 1, golesVisita: 3, estado: 'finalizado' },
    // Fecha 2 — LIBRE (finalizada)
    { id: 'm07', serie: 'libre', fecha_num: 2, fecha: '2026-09-05', hora: '10:00', cancha: 'Cancha 1', local: 'lib2', visita: 'lib3', golesLocal: 1, golesVisita: 2, estado: 'finalizado' },
    { id: 'm08', serie: 'libre', fecha_num: 2, fecha: '2026-09-05', hora: '11:30', cancha: 'Cancha 2', local: 'lib4', visita: 'lib5', golesLocal: 2, golesVisita: 2, estado: 'finalizado' },
    { id: 'm09', serie: 'libre', fecha_num: 2, fecha: '2026-09-05', hora: '13:00', cancha: 'Cancha 1', local: 'lib6', visita: 'lib1', golesLocal: 0, golesVisita: 4, estado: 'finalizado' },
    // Fecha 2 — SENIOR (finalizada)
    { id: 'm10', serie: 'senior', fecha_num: 2, fecha: '2026-09-05', hora: '10:00', cancha: 'Cancha 3', local: 'sen2', visita: 'sen3', golesLocal: 0, golesVisita: 1, estado: 'finalizado' },
    { id: 'm11', serie: 'senior', fecha_num: 2, fecha: '2026-09-05', hora: '11:30', cancha: 'Cancha 4', local: 'sen4', visita: 'sen5', golesLocal: 3, golesVisita: 3, estado: 'finalizado' },
    { id: 'm12', serie: 'senior', fecha_num: 2, fecha: '2026-09-05', hora: '13:00', cancha: 'Cancha 3', local: 'sen6', visita: 'sen1', golesLocal: 2, golesVisita: 1, estado: 'finalizado' },
    // Fecha 3 — próxima (programada)
    { id: 'm13', serie: 'libre', fecha_num: 3, fecha: '2026-09-12', hora: '10:00', cancha: 'Cancha 1', local: 'lib1', visita: 'lib3', golesLocal: null, golesVisita: null, estado: 'programado' },
    { id: 'm14', serie: 'libre', fecha_num: 3, fecha: '2026-09-12', hora: '11:30', cancha: 'Cancha 2', local: 'lib5', visita: 'lib2', golesLocal: null, golesVisita: null, estado: 'programado' },
    { id: 'm15', serie: 'libre', fecha_num: 3, fecha: '2026-09-12', hora: '13:00', cancha: 'Cancha 1', local: 'lib4', visita: 'lib6', golesLocal: null, golesVisita: null, estado: 'programado' },
    { id: 'm16', serie: 'senior', fecha_num: 3, fecha: '2026-09-12', hora: '10:00', cancha: 'Cancha 3', local: 'sen1', visita: 'sen3', golesLocal: null, golesVisita: null, estado: 'programado' },
    { id: 'm17', serie: 'senior', fecha_num: 3, fecha: '2026-09-12', hora: '11:30', cancha: 'Cancha 4', local: 'sen5', visita: 'sen2', golesLocal: null, golesVisita: null, estado: 'programado' },
    { id: 'm18', serie: 'senior', fecha_num: 3, fecha: '2026-09-12', hora: '13:00', cancha: 'Cancha 3', local: 'sen4', visita: 'sen6', golesLocal: null, golesVisita: null, estado: 'programado' }
  ],

  // ---- Disciplina de ejemplo. tipo: 'amarilla' | 'roja' ----
  disciplina: [
    { id: 'd1', fecha: '2026-08-29', fecha_num: 1, serie: 'libre',  equipo: 'lib2', jugador: 'J. Rojas',   tipo: 'roja',     motivo: 'Doble amonestación', sancion: '1 fecha' },
    { id: 'd2', fecha: '2026-08-29', fecha_num: 1, serie: 'senior', equipo: 'sen4', jugador: 'M. Araya',   tipo: 'amarilla', motivo: 'Juego brusco',       sancion: '' },
    { id: 'd3', fecha: '2026-09-05', fecha_num: 2, serie: 'libre',  equipo: 'lib6', jugador: 'P. Muñoz',   tipo: 'amarilla', motivo: 'Reclamo',            sancion: '' },
    { id: 'd4', fecha: '2026-09-05', fecha_num: 2, serie: 'senior', equipo: 'sen2', jugador: 'C. Tapia',   tipo: 'roja',     motivo: 'Conducta violenta',  sancion: '3 fechas' }
  ],

  // ---- Goleadores de ejemplo (opcional; también se puede derivar) ----
  goleadores: [
    { jugador: 'D. Fuentes', equipo: 'lib1', serie: 'libre',  goles: 5 },
    { jugador: 'R. Contreras', equipo: 'lib5', serie: 'libre', goles: 4 },
    { jugador: 'H. Pizarro', equipo: 'sen6', serie: 'senior', goles: 4 }
  ],

  // ---- Audiovisual de ejemplo (YouTube IDs / imágenes) ----
  audiovisual: {
    videos: [
      // { id: 'youtube_id', titulo: 'Resumen Fecha 1' }
    ],
    galeria: [
      // '/assets/galeria/foto1.jpg'
    ]
  }
};
