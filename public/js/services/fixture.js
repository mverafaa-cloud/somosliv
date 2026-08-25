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

    // ---- 2) Horarios (hacia el objetivo por equipo; cap 4 por horario) ----
    // "need" = cuántos partidos le faltan a un equipo en ese horario para su objetivo.
    const need = (id, h) => targets[id][h] - T[id].hor[h];
    const items = matches.map(m => {
      const d1040 = need(m.local, '10:40') + need(m.visita, '10:40');
      const d1220 = need(m.local, '12:20') + need(m.visita, '12:20');
      return { m, h: d1040 >= d1220 ? '10:40' : '12:20', strength: Math.abs(d1040 - d1220) + rand() * 0.01 };
    });
    items.sort((a, b) => b.strength - a.strength); // resuelve primero las preferencias fuertes
    const cap = { '10:40': 0, '12:20': 0 };
    items.forEach(it => {
      let h = it.h;
      if (cap[h] >= 4) h = (h === '10:40' ? '12:20' : '10:40');
      it.m.horario = h; cap[h]++;
      T[it.m.local].hor[h]++; T[it.m.visita].hor[h]++;
    });

    // ---- 3) Grabaciones + canchas ----
    // Regla: los grabados de la jornada deben caber en SOLO 2 canchas (hay 2 cámaras).
    // 2 cámaras × 2 bloques = máx. 4 grabables. Máx. 2 grabados por horario para poder
    // empaquetarlos en 2 canchas.
    const nGrab = Math.min(grabadosPorFecha, 4, matches.length);
    const gval = m => T[m.local].grab + T[m.visita].grab + rand() * 0.3;
    const recorded = [];
    matches.slice().sort((a, b) => gval(a) - gval(b)).forEach(m => {
      if (recorded.length >= nGrab) return;
      if (recorded.filter(x => x.horario === m.horario).length >= 2) return;
      recorded.push(m);
    });
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
