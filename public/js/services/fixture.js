// ============================================================
//  MOTOR DE SORTEO — Fixture Junior LIV
//  Round-robin (todos contra todos) + asignación balanceada de
//  horarios, canchas, grabaciones, clásicos y marcas de premio.
//  Puro / determinista por semilla. Sin dependencias.
// ============================================================

// RNG seedable (mulberry32)
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Round-robin circle method. ids par. Devuelve (n-1) rondas de n/2 pares [local,visita].
function roundRobin(ids, rand) {
  const arr = shuffle(ids, rand);
  const n = arr.length;
  const rounds = [];
  const rot = arr.slice();
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      let a = rot[i], b = rot[n - 1 - i];
      if (r % 2 === 1 && i === 0) { const t = a; a = b; b = t; } // alterna localía del ancla
      pairs.push([a, b]);
    }
    rounds.push(pairs);
    rot.splice(1, 0, rot.pop()); // rota manteniendo fijo el primero
  }
  return rounds;
}

const CANCHAS = [1, 2, 3, 4];
// Camarines por cancha (parámetro fijo del complejo).
export const CAMARINES = { 1: [1, 2], 3: [3, 4], 2: [5, 6], 4: [7, 8] };

function emptyTally(teamIds, marcas) {
  const t = {};
  teamIds.forEach(id => {
    t[id] = {
      hor: { '10:40': 0, '12:20': 0 },
      cancha: { 1: 0, 2: 0, 3: 0, 4: 0 },
      grab: 0, clasico: 0, local: 0, visita: 0,
      marca: Object.fromEntries(marcas.map(m => [m, 0]))
    };
  });
  return t;
}

// Construye UNA simulación completa dada una semilla.
function buildOne(params, seed) {
  const { teams, fechas, marcas, grabadosPorFecha, preferHorario, rivalries } = params;
  const ids = teams.map(t => t.id);
  const rand = rng(seed);
  const pairsByRound = roundRobin(ids, rand);
  const nRounds = pairsByRound.length;
  const usarFechas = fechas.slice(0, nRounds);
  const T = emptyTally(ids, marcas);
  const HOR = ['10:40', '12:20'];
  const rivSet = new Set((rivalries || []).map(p => [p[0], p[1]].sort().join('|')));

  const rounds = pairsByRound.map((pairs, ri) => {
    const roundsLeft = nRounds - ri;
    let matches = pairs.map(([local, visita]) => ({ local, visita, cancha: null, horario: null, grabado: false, clasico: false, marca: null }));

    // localía tally
    matches.forEach(m => { T[m.local].local++; T[m.visita].visita++; });

    // ---- 1) Clásico de la jornada ----
    let bestIdx = 0, bestScore = -Infinity;
    matches.forEach((m, i) => {
      const cl = T[m.local].clasico, cv = T[m.visita].clasico;
      let s = -(cl + cv) * 2;
      if (cl === 0) s += 40 / roundsLeft;         // cubrir equipos sin clásico, urgente al final
      if (cv === 0) s += 40 / roundsLeft;
      if (rivSet.has([m.local, m.visita].sort().join('|'))) s += 100; // respeta rivalidades definidas
      s += rand() * 0.5;
      if (s > bestScore) { bestScore = s; bestIdx = i; }
    });
    matches[bestIdx].clasico = true;
    T[matches[bestIdx].local].clasico++; T[matches[bestIdx].visita].clasico++;

    // ---- 2) Horarios (cap 4 por horario) ----
    // Deseo por partido; luego se resuelve capacidad.
    const desire = matches.map(m => {
      const pL = preferHorario[m.local], pV = preferHorario[m.visita];
      if (pL && pV && pL === pV) return { m, h: pL, forced: 2 };
      if (pL && !pV) return { m, h: pL, forced: 1 };
      if (pV && !pL) return { m, h: pV, forced: 1 };
      if (pL && pV && pL !== pV) return { m, h: pL, forced: 1 };
      // balance: horario donde ambos han jugado menos
      const a = T[m.local].hor, b = T[m.visita].hor;
      const h = (a['10:40'] + b['10:40']) <= (a['12:20'] + b['12:20']) ? '10:40' : '12:20';
      return { m, h, forced: 0 };
    });
    desire.sort((x, y) => y.forced - x.forced); // primero los forzados por preferencia
    const cap = { '10:40': 0, '12:20': 0 };
    desire.forEach(d => {
      let h = d.h;
      if (cap[h] >= 4) h = (h === '10:40' ? '12:20' : '10:40');
      if (cap[h] >= 4) h = d.h; // ambos llenos (no debería con 5)
      d.m.horario = h; cap[h]++;
      T[d.m.local].hor[h]++; T[d.m.visita].hor[h]++;
    });

    // ---- 3) Canchas (distintas dentro del mismo horario) ----
    HOR.forEach(h => {
      const grp = matches.filter(m => m.horario === h);
      const usadas = new Set();
      grp.forEach(m => {
        let bc = null, bs = Infinity;
        shuffle(CANCHAS, rand).forEach(c => {
          if (usadas.has(c)) return;
          const s = T[m.local].cancha[c] + T[m.visita].cancha[c];
          if (s < bs) { bs = s; bc = c; }
        });
        m.cancha = bc; usadas.add(bc);
        T[m.local].cancha[bc]++; T[m.visita].cancha[bc]++;
      });
    });

    // ---- 4) Grabaciones (grabadosPorFecha por jornada) ----
    const ordenGrab = matches.map((m, i) => ({ i, s: T[m.local].grab + T[m.visita].grab + rand() * 0.3 }))
      .sort((a, b) => a.s - b.s).slice(0, Math.min(grabadosPorFecha, matches.length));
    ordenGrab.forEach(({ i }) => { matches[i].grabado = true; T[matches[i].local].grab++; T[matches[i].visita].grab++; });

    // ---- 5) Marca del premio (equitativo por equipo) ----
    matches.forEach(m => {
      let bm = marcas[0], bs = Infinity;
      shuffle(marcas, rand).forEach(mk => {
        const s = T[m.local].marca[mk] + T[m.visita].marca[mk];
        if (s < bs) { bs = s; bm = mk; }
      });
      m.marca = bm; T[m.local].marca[bm]++; T[m.visita].marca[bm]++;
    });

    // camarines derivados de la cancha
    matches.forEach(m => { m.camarines = CAMARINES[m.cancha] || []; });

    return { n: ri + 1, fecha: usarFechas[ri] || null, matches };
  });

  return { rounds, tally: T };
}

// Score global (menor = mejor).
function scoreDraw(T, params) {
  const ids = Object.keys(T);
  const marcas = params.marcas;
  const pref = params.preferHorario;
  const spread = (obj) => { const v = Object.values(obj); return Math.max(...v) - Math.min(...v); };
  let s = 0;
  ids.forEach(id => {
    const t = T[id];
    // horario: preferencia respetada, o balance
    if (pref[id]) s += (t.hor[pref[id] === '10:40' ? '12:20' : '10:40']) * 3;
    else s += Math.abs(t.hor['10:40'] - t.hor['12:20']) * 2;
    // canchas: penaliza canchas no jugadas + dispersión
    const sinCancha = CANCHAS.filter(c => t.cancha[c] === 0).length;
    s += sinCancha * 25 + spread(t.cancha) * 2;
    // clásico: penaliza 0 fuerte + dispersión
    if (t.clasico === 0) s += 60;
    // marcas: dispersión por equipo
    s += spread(t.marca) * 3;
  });
  // grabaciones: dispersión global
  const grabs = ids.map(id => T[id].grab);
  s += (Math.max(...grabs) - Math.min(...grabs)) * 4;
  // clásicos: dispersión global
  const cl = ids.map(id => T[id].clasico);
  s += (Math.max(...cl) - Math.min(...cl)) * 3;
  return s;
}

// API principal: corre N restarts y devuelve el mejor.
export function generarFixture(params, baseSeed = 1, restarts = 400) {
  let best = null, bestScore = Infinity;
  for (let i = 0; i < restarts; i++) {
    const seed = (baseSeed * 2654435761 + i * 40503 + 12345) >>> 0;
    const draw = buildOne(params, seed);
    const sc = scoreDraw(draw.tally, params);
    if (sc < bestScore) { bestScore = sc; best = draw; }
  }
  return { ...best, score: bestScore, stats: computeStats(best.tally, params) };
}

// Resumen por equipo para el panel de equilibrio.
export function computeStats(T, params) {
  const byId = Object.fromEntries(params.teams.map(t => [t.id, t.nombre]));
  return params.teams.map(t => {
    const x = T[t.id];
    return {
      id: t.id, nombre: byId[t.id],
      h1040: x.hor['10:40'], h1220: x.hor['12:20'],
      c1: x.cancha[1], c2: x.cancha[2], c3: x.cancha[3], c4: x.cancha[4],
      canchasJugadas: CANCHAS.filter(c => x.cancha[c] > 0).length,
      grab: x.grab, clasico: x.clasico,
      local: x.local, visita: x.visita,
      marca: params.marcas.map(m => x.marca[m])
    };
  });
}

// Fechas por defecto: sábados desde inicio, saltando fechas excluidas, hasta cubrir nRondas.
export function sabadosDesde(inicioISO, excluir, nRondas) {
  const ex = new Set(excluir || []);
  const out = [];
  // parse YYYY-MM-DD en local sin desfase
  const [Y, M, D] = inicioISO.split('-').map(Number);
  let d = new Date(Y, M - 1, D);
  let guard = 0;
  while (out.length < nRondas && guard < 60) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!ex.has(iso)) out.push(iso);
    d.setDate(d.getDate() + 7);
    guard++;
  }
  return out;
}
