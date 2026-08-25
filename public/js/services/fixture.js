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
// Límites por equipo (torneo Junior de 10 equipos, 9 fechas).
const CL_MIN = 2, CL_MAX = 2;   // clásicos por equipo (exactamente 2 → 10 clásicos totales)
const GR_MIN = 5, GR_MAX = 6;   // grabaciones por equipo
const N_1040 = 2;               // partidos a las 10:40 por jornada (el resto va a 12:20)
// Camarines por cancha (parámetro fijo del complejo).
export const CAMARINES = { 1: [1, 2], 3: [3, 4], 2: [5, 6], 4: [7, 8] };

// Normaliza la preferencia de horario: acepta string ('10:40') o {h, pct}.
function normPref(v) {
  if (!v) return null;
  if (typeof v === 'string') return v ? { h: v, pct: 100 } : null;
  if (v.h) return { h: v.h, pct: Math.min(100, Math.max(0, v.pct == null ? 100 : v.pct)) };
  return null;
}
// Objetivo de partidos por horario para cada equipo (según % de preferencia o balance).
function horarioTargets(params) {
  const N = params.teams.length - 1; // partidos por equipo en round-robin par
  const tg = {};
  params.teams.forEach(t => {
    const pr = normPref((params.preferHorario || {})[t.id]);
    if (pr) {
      const a = Math.round(pr.pct / 100 * N);
      const other = pr.h === '10:40' ? '12:20' : '10:40';
      tg[t.id] = { '10:40': 0, '12:20': 0 };
      tg[t.id][pr.h] = a; tg[t.id][other] = N - a;
    } else {
      const a = Math.ceil(N / 2);
      tg[t.id] = { '10:40': a, '12:20': N - a };
    }
  });
  return tg;
}

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
  const targets = horarioTargets(params);
  const rivSet = new Set((rivalries || []).map(p => [p[0], p[1]].sort().join('|')));

  const rounds = pairsByRound.map((pairs, ri) => {
    const roundsLeft = nRounds - ri;
    let matches = pairs.map(([local, visita]) => ({ local, visita, cancha: null, horario: null, grabado: false, clasico: false, marca: null }));

    // localía tally
    matches.forEach(m => { T[m.local].local++; T[m.visita].visita++; });

    // Exposición = grabaciones + clásicos (visibilidad total del equipo).
    // Clásicos y grabaciones se reparten mirando ESTA suma, para que se compensen:
    // quien tiene menos de una, recibe más de la otra.
    const expo = id => T[id].grab + T[id].clasico;

    // ---- 1) Clásicos de la jornada (1 o 2), apuntando a CL_MIN–CL_MAX por equipo ----
    const canCl = m => !m.clasico && T[m.local].clasico < CL_MAX && T[m.visita].clasico < CL_MAX;
    const clScore = m => {
      let s = -(expo(m.local) + expo(m.visita));
      if (T[m.local].clasico < CL_MIN) s += 25 / roundsLeft;   // urgente llegar al mínimo
      if (T[m.visita].clasico < CL_MIN) s += 25 / roundsLeft;
      if (rivSet.has([m.local, m.visita].sort().join('|'))) s += 100; // respeta rivalidades definidas
      return s + rand() * 0.4;
    };
    // Déficit para llegar al mínimo; con 1 clásico/fecha se cubren hasta 2 déficits.
    const deficit = ids.reduce((a, id) => a + Math.max(0, CL_MIN - T[id].clasico), 0);
    const nCl = deficit > (roundsLeft - 1) * 2 ? 2 : 1; // si 1/fecha no alcanza, pon 2
    for (let k = 0; k < nCl; k++) {
      let bi = -1, bs = -Infinity;
      matches.forEach((m, i) => { if (!canCl(m)) return; const s = clScore(m); if (s > bs) { bs = s; bi = i; } });
      if (bi < 0) break;
      matches[bi].clasico = true;
      T[matches[bi].local].clasico++; T[matches[bi].visita].clasico++;
    }

    // ---- 2) Horarios: SIEMPRE 2 partidos a las 10:40 y el resto (3) a las 12:20 ----
    // El split por jornada es FIJO; la preferencia por % solo decide QUÉ partidos
    // caen en cada bloque. "need" = cuántos partidos le faltan a un equipo en ese
    // horario para acercarse a su objetivo (según su % de preferencia).
    const need = (id, h) => targets[id][h] - T[id].hor[h];
    const n1040 = Math.min(N_1040, matches.length); // partidos a las 10:40 (fijo)
    // "want12" alto = ese partido prefiere/necesita más el 12:20.
    const want12 = matches.map(m => ({
      m, w: (need(m.local, '12:20') + need(m.visita, '12:20'))
           - (need(m.local, '10:40') + need(m.visita, '10:40')) + rand() * 0.02
    }));
    want12.sort((a, b) => b.w - a.w); // los que más quieren 12:20 primero
    want12.forEach((it, i) => {
      const h = i < (matches.length - n1040) ? '12:20' : '10:40';
      it.m.horario = h;
      T[it.m.local].hor[h]++; T[it.m.visita].hor[h]++;
    });

    // ---- 3) Grabaciones + canchas ----
    // Regla: los grabados de la jornada deben caber en SOLO 2 canchas (hay 2 cámaras).
    // 2 cámaras × 2 bloques = máx. 4 grabables. Máx. 2 grabados por horario para poder
    // empaquetarlos en 2 canchas.
    const nGrab = Math.min(grabadosPorFecha, 4, matches.length);
    // Prioriza grabar a los equipos con MENOS exposición total (grab + clásico),
    // así se compensa a quien recibió menos clásicos.
    const gval = m => expo(m.local) + expo(m.visita) + rand() * 0.3;
    const orden = matches.slice().sort((a, b) => gval(a) - gval(b));
    const recorded = [];
    // 1ª pasada: respeta el tope GR_MAX por equipo.
    orden.forEach(m => {
      if (recorded.length >= nGrab) return;
      if (recorded.filter(x => x.horario === m.horario).length >= 2) return;
      if (T[m.local].grab >= GR_MAX || T[m.visita].grab >= GR_MAX) return;
      recorded.push(m);
    });
    // 2ª pasada (rara): si los topes impidieron llegar a nGrab, completa igual (lo corrige el score global).
    if (recorded.length < nGrab) {
      orden.forEach(m => {
        if (recorded.length >= nGrab || recorded.includes(m)) return;
        if (recorded.filter(x => x.horario === m.horario).length >= 2) return;
        recorded.push(m);
      });
    }
    recorded.forEach(m => m.grabado = true);

    // Elige el par de canchas-cámara y asigna las canchas de los grabados dentro de él.
    const recByH = { '10:40': recorded.filter(m => m.horario === '10:40'), '12:20': recorded.filter(m => m.horario === '12:20') };
    const PAIRS = [[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]];
    let bestAssign = null, bestSc = Infinity;
    shuffle(PAIRS, rand).forEach(([cA, cB]) => {
      const assign = new Map();
      let ok = true;
      HOR.forEach(h => {
        if (!ok) return;
        const recs = recByH[h], avail = [cA, cB];
        if (recs.length > avail.length) { ok = false; return; }
        const perms = recs.length === 2 ? [[avail[0], avail[1]], [avail[1], avail[0]]]
          : recs.length === 1 ? [[cA], [cB]] : [[]];
        let bp = perms[0], bs = Infinity;
        perms.forEach(perm => {
          let s = 0; recs.forEach((m, i) => { s += T[m.local].cancha[perm[i]] + T[m.visita].cancha[perm[i]]; });
          if (s < bs) { bs = s; bp = perm; }
        });
        recs.forEach((m, i) => assign.set(m, bp[i]));
      });
      if (!ok) return;
      let sc = 0; assign.forEach((c, m) => { sc += T[m.local].cancha[c] + T[m.visita].cancha[c]; });
      if (sc < bestSc) { bestSc = sc; bestAssign = assign; }
    });
    if (bestAssign) bestAssign.forEach((c, m) => { m.cancha = c; });

    // Canchas de los NO grabados (distintas dentro del horario, evitando las ya usadas).
    HOR.forEach(h => {
      const usadas = new Set(matches.filter(m => m.horario === h && m.cancha != null).map(m => m.cancha));
      matches.filter(m => m.horario === h && m.cancha == null).forEach(m => {
        let bc = null, bs = Infinity;
        shuffle(CANCHAS, rand).forEach(c => {
          if (usadas.has(c)) return;
          const s = T[m.local].cancha[c] + T[m.visita].cancha[c];
          if (s < bs) { bs = s; bc = c; }
        });
        m.cancha = bc; usadas.add(bc);
      });
    });

    // Tallies de cancha y grabación.
    matches.forEach(m => {
      T[m.local].cancha[m.cancha]++; T[m.visita].cancha[m.cancha]++;
      if (m.grabado) { T[m.local].grab++; T[m.visita].grab++; }
    });

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

  // ---- 6) Reparación de marcas: hill-climb para acercar todos a 3/3/3 ----
  // El greedy por jornada suele dejar 1-2 equipos en 2/4/3. Recoloreamos partidos
  // (cambia la marca de AMBOS equipos del partido) mientras baje la dispersión total.
  {
    const spr = obj => { const v = Object.values(obj); return Math.max(...v) - Math.min(...v); };
    const allM = rounds.flatMap(r => r.matches);
    let improved = true, guard = 0;
    while (improved && guard++ < 400) {
      improved = false;
      for (const m of allM) {
        const cur = m.marca;
        for (const alt of marcas) {
          if (alt === cur) continue;
          const before = spr(T[m.local].marca) + spr(T[m.visita].marca);
          T[m.local].marca[cur]--; T[m.visita].marca[cur]--;
          T[m.local].marca[alt]++; T[m.visita].marca[alt]++;
          const after = spr(T[m.local].marca) + spr(T[m.visita].marca);
          if (after < before) { m.marca = alt; improved = true; }
          else { T[m.local].marca[cur]++; T[m.visita].marca[cur]++; T[m.local].marca[alt]--; T[m.visita].marca[alt]--; }
        }
      }
    }
  }

  return { rounds, tally: T };
}

// Score global (menor = mejor).
function scoreDraw(T, params) {
  const ids = Object.keys(T);
  const marcas = params.marcas;
  const tg = horarioTargets(params);
  const spread = (obj) => { const v = Object.values(obj); return Math.max(...v) - Math.min(...v); };
  let s = 0;
  ids.forEach(id => {
    const t = T[id];
    // horario: desviación respecto al objetivo (% de preferencia o balance)
    s += (Math.abs(t.hor['10:40'] - tg[id]['10:40']) + Math.abs(t.hor['12:20'] - tg[id]['12:20'])) * 2.5;
    // canchas: penaliza canchas no jugadas + dispersión
    const sinCancha = CANCHAS.filter(c => t.cancha[c] === 0).length;
    s += sinCancha * 25 + spread(t.cancha) * 2;
    // clásico: penaliza 0 fuerte + dispersión
    if (t.clasico === 0) s += 60;
    // marcas: dispersión por equipo (objetivo 3/3/3)
    s += spread(t.marca) * 8;
  });
  // Topes duros por equipo: grabados en [GR_MIN,GR_MAX] y clásicos en [CL_MIN,CL_MAX].
  ids.forEach(id => {
    const g = T[id].grab, c = T[id].clasico;
    if (g < GR_MIN) s += (GR_MIN - g) * 60;
    if (g > GR_MAX) s += (g - GR_MAX) * 60;
    if (c < CL_MIN) s += (CL_MIN - c) * 60;
    if (c > CL_MAX) s += (c - CL_MAX) * 60;
  });
  // Exposición total (grab + clásico): compensa entre equipos.
  const expo = ids.map(id => T[id].grab + T[id].clasico);
  s += (Math.max(...expo) - Math.min(...expo)) * 5;
  return s;
}

// API principal: corre N restarts y devuelve el mejor.
export function generarFixture(params, baseSeed = 1, restarts = 800) {
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
