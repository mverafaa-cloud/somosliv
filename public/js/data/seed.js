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
    ],
    // Marcas que presentan el premio al MVP. Se sortean como 4 espacios
    // ("Auspiciador 1..4"); el admin define aquí qué marca real es cada uno y
    // recién ahí se revela en el fixture. Vacío = se muestra "Auspiciador N".
    auspiciadores: { 'Auspiciador 1': '', 'Auspiciador 2': '', 'Auspiciador 3': '', 'Auspiciador 4': '' }
  },

  // Equipos inscritos 2026 (con logo). serie: 'libre' = Junior · 'senior' = Senior.
  equipos: [
    // ---- Junior ----
    { id: 'jr-los-pibes',       nombre: 'Los Pibes',           serie: 'libre',  logo: '/assets/equipos/los-pibes.png' },
    { id: 'jr-camilo-enriquez', nombre: 'Camilo Henríquez',     serie: 'libre',  logo: '/assets/equipos/camilo-enriquez.png' },
    { id: 'jr-bunker',          nombre: 'Bunker',              serie: 'libre',  logo: '/assets/equipos/bunker.png' },
    { id: 'jr-mesa-cuadrada',   nombre: 'Mesa Cuadrada',       serie: 'libre',  logo: '/assets/equipos/mesa-cuadrada.png' },
    { id: 'jr-huracan',         nombre: 'Huracán',             serie: 'libre',  logo: '/assets/equipos/huracan.png' },
    { id: 'jr-40-grados',       nombre: '40 Grados',           serie: 'libre',  logo: '/assets/equipos/40-grados.png' },
    { id: 'jr-capibara',        nombre: 'Capibara',            serie: 'libre',  logo: '/assets/equipos/capibara.png' },
    { id: 'jr-bayern',          nombre: 'Bayern Llevenpilsen', serie: 'libre',  logo: '/assets/equipos/bayern.png' },
    { id: 'jr-los-prados',      nombre: 'Los Prados',          serie: 'libre',  logo: '/assets/equipos/los-prados.png' },
    { id: 'jr-arquitectura',    nombre: 'Arquitectura',        serie: 'libre',  logo: '/assets/equipos/arquitectura.png' },
    // ---- Senior ----
    { id: 'sr-arquitectura',    nombre: 'Arquitectura',        serie: 'senior', logo: '/assets/equipos/arquitectura.png' },
    { id: 'sr-camilo-enriquez', nombre: 'Camilo Henríquez',     serie: 'senior', logo: '/assets/equipos/camilo-enriquez.png' },
    { id: 'sr-afc',             nombre: 'AFC',                 serie: 'senior', logo: '/assets/equipos/afc.png' },
    { id: 'sr-arsenal',         nombre: 'Arsenal',             serie: 'senior', logo: '/assets/equipos/arsenal.png' },
    { id: 'sr-los-pibes',       nombre: 'Los Pibes',           serie: 'senior', logo: '/assets/equipos/los-pibes.png' },
    { id: 'sr-historicos',      nombre: 'Históricos FC',       serie: 'senior', logo: '/assets/equipos/historicos.png' }
  ],
  partidos: [],
  disciplina: [],
  goleadores: [],

  audiovisual: {
    videos: [],
    galeria: []
  }
};
