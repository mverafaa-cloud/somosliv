// ============================================================
//  SEED / CONTENIDO BASE DE LA LIV
//  - `config`: textos e info institucional (editable desde el panel admin).
//  - equipos / partidos / disciplina: VACÍOS hasta que arranque la temporada.
//    Se cargan desde el panel admin (Firebase). Antes del estreno, las
//    secciones muestran un estado "temporada por comenzar".
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
      instagram: '',
      whatsapp: '+56976136043',
      email: 'liv.torneos@gmail.com',
      telefono: '+56976136043'
    },
    series: [
      { id: 'libre',  nombre: 'Junior', detalle: '18 años en adelante' },
      { id: 'senior', nombre: 'Senior', detalle: '+32 · nacidos 1994 o antes' }
    ]
  },

  // La temporada aún no comienza: sin datos hasta la carga oficial.
  equipos: [],
  partidos: [],
  disciplina: [],
  goleadores: [],

  audiovisual: {
    videos: [],
    galeria: []
  }
};
