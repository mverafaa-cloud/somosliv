// ============================================================
//  MOTOR DE SORTEO — Fixture SENIOR LIV
//  8 equipos · round-robin (7 fechas) · 4 partidos por jornada.
//  Reglas:
//   · 3 partidos a las 9:00 y 1 a las 10:40.
//   · Se graban 2 por jornada, SIEMPRE en cancha 1 y 2 (como el Junior).
//     Los grabados van a las 9:00 (canchas 1 y 2 libres a esa hora).
//   · 1 clásico por jornada, y el clásico se graba.
//   · Ningún equipo puede jugar 10:40 en Junior y Senior la misma fecha
//     (se pasa `block1040` con los equipos bloqueados por fecha).
//   · Equilibrio de horario, cancha, grabaciones y clásicos.
//   · Fecha 1: el "Equipo 8" (aún sin conseguir) no es clásico ni grabado.
//  Puro / determinista por semilla. Sin dependencias.
// ============================================================

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
function circleFrom(arr) {
  const n = arr.length;
  const rounds = [];
  const rot = arr.slice();
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      let a = rot[i], b = rot[n - 1 - i];
      if (r % 2 === 1 && i === 0) { const t = a; a = b; b = t; }
      pairs.push([a, b]);
    }
    rounds.push(pairs);
    rot.splice(1, 0, rot.pop());
  }
  return rounds;
}
function roundRobin(ids, rand) { return circleFrom(shuffle(ids, rand)); }
// Round-robin cuyo PRIMER round contiene los pares forzados (el resto se baraja).
function roundRobinForced(ids, rand, forcedFirst) {
  const n = ids.length;
  const arr = new Array(n).fill(null);
  const used = new Set();
  (forcedFirst || []).forEach((pair, k) => {
    if (k >= n / 2) return;
    const [a, b] = pair;
    if (ids.includes(a) && ids.includes(b) && !used.has(a) && !used.has(b)) {
      arr[k] = a; arr[n - 1 - k] = b; used.add(a); used.add(b);
    }
  });
  const rest = shuffle(ids.filter(x => !used.has(x)), rand);
  let ri = 0;
  for (let i = 0; i < n; i++) { if (arr[i] === null) arr[i] = rest[ri++]; }
  return circleFrom(arr);
}

export const CAMARINES = { 1: [1, 2], 3: [3, 4], 2: [5, 6], 4: [7, 8] };
const HORS = ['9:00', '10:40'];
const N_10 = 1;         // 1 partido a las 10:40 por jornada
const GRAB_POR_FECHA = 2;

function emptyTally(ids, marcas) {
  const t = {};
  ids.forEach(id => { t[id] = { hor: { '9:00': 0, '10:40': 0 }, cancha: { 1: 0, 2: 0, 3: 0, 4: 0 }, grab: 0, clasico: 0, local: 0, visita: 0, marca: Object.fromEntries(marcas.map(m => [m, 0])) }; });
  return t;
}

function buildOne(params, seed) {
  const { teams, fechas, marcas, rivalries, equipo8Id } = params;
  const block1040 = params.block1040 || {};
  const ids = teams.map(t => t.id);
  const rand = rng(seed);
  const pairsByRound = (params.forcedFirst && params.forcedFirst.length)
    ? roundRobinForced(ids, rand, params.forcedFirst)
    : roundRobin(ids, rand);
  const nR = Math.min(pairsByRound.length, fechas.length || pairsByRound.length);
  const T = emptyTally(ids, marcas);
  const rivSet = new Set((rivalries || []).map(p => [p[0], p[1]].sort().join('|')));
  const key = m => [m.local, m.visita].sort().join('|');
  const has8 = m => equipo8Id && (m.local === equipo8Id || m.visita === equipo8Id);

  const rounds = [];
  for (let ri = 0; ri < nR; ri++) {
    const esF1 = ri === 0;
    const block = new Set(block1040[ri] || []);
    const matches = pairsByRound[ri].map(([local, visita]) => ({ local, visita, cancha: null, horario: null, grabado: false, clasico: false, marca: null }));
    matches.forEach(m => { T[m.local].local++; T[m.visita].visita++; });

    // 1) Elegir el partido de las 10:40 (sin equipos bloqueados por cruce con Junior),
    //    balanceando cuántas veces cada equipo jugó a esa hora.
    const cand10 = matches.filter(m => !block.has(m.local) && !block.has(m.visita));
    const pool10 = (cand10.length ? cand10 : matches).slice()
      .sort((a, b) => (T[a.local].hor['10:40'] + T[a.visita].hor['10:40']) - (T[b.local].hor['10:40'] + T[b.visita].hor['10:40']) + (rand() - 0.5));
    const m10 = pool10[0];
    matches.forEach(m => { m.horario = (m === m10) ? '10:40' : '9:00'; });
    matches.forEach(m => { T[m.local].hor[m.horario]++; T[m.visita].hor[m.horario]++; });
    const nueve = matches.filter(m => m.horario === '9:00'); // 3 partidos

    // 2) Clásico: uno de los partidos de las 9:00 (grabable). En F1 no puede ser el Equipo 8.
    const clExpo = m => T[m.local].clasico + T[m.visita].clasico;
    let clCand = nueve.filter(m => !(esF1 && has8(m)));
    if (!clCand.length) clCand = nueve.slice();
    // Prioriza rivalidades si alguna está en juego esta fecha.
    const riv = clCand.filter(m => rivSet.has(key(m)));
    const clPool = (riv.length ? riv : clCand).slice().sort((a, b) => clExpo(a) - clExpo(b) + (rand() - 0.5));
    const clasico = clPool[0];
    clasico.clasico = true; clasico.grabado = true;
    T[clasico.local].clasico++; T[clasico.visita].clasico++;

    // 3) Segundo grabado: otro partido de las 9:00 (en F1 no el Equipo 8), balanceando grabaciones.
    const grExpo = m => T[m.local].grab + T[m.visita].grab;
    let g2Cand = nueve.filter(m => m !== clasico && !(esF1 && has8(m)));
    if (!g2Cand.length) g2Cand = nueve.filter(m => m !== clasico);
    const g2 = g2Cand.slice().sort((a, b) => grExpo(a) - grExpo(b) + (rand() - 0.5))[0];
    if (g2) g2.grabado = true;
    matches.forEach(m => { if (m.grabado) { T[m.local].grab++; T[m.visita].grab++; } });

    // 4) Canchas: grabados → 1 y 2 (balanceando cuál va a 1 vs 2). No grabado 9:00 → 3. 10:40 → 4.
    const grabs = matches.filter(m => m.grabado);
    // asigna 1 y 2 minimizando repetición de cancha por equipo
    const opt = [[1, 2], [2, 1]];
    let bestPerm = opt[0], bestSc = Infinity;
    opt.forEach(perm => {
      let s = 0; grabs.forEach((m, i) => { s += T[m.local].cancha[perm[i]] + T[m.visita].cancha[perm[i]]; });
      s += rand() * 0.1;
      if (s < bestSc) { bestSc = s; bestPerm = perm; }
    });
    grabs.forEach((m, i) => { m.cancha = bestPerm[i]; });
    nueve.filter(m => !m.grabado).forEach(m => { m.cancha = 3; });
    // El partido de las 10:40 va a una cancha LIBRE a esa hora (el Junior ocupa 2 canchas
    // a las 10:40, distintas por fecha). Se prefiere 3/4 y se balancea por equipo.
    const ten = matches.find(m => m.horario === '10:40');
    if (ten) {
      const libres = (params.free1040 && params.free1040[ri]) ? params.free1040[ri] : [3, 4, 1, 2];
      const order = [3, 4, 2, 1].filter(c => libres.includes(c));
      const opts2 = order.length ? order : [4];
      let bc = opts2[0], bs = Infinity;
      opts2.forEach(c => { const s = T[ten.local].cancha[c] + T[ten.visita].cancha[c] + rand() * 0.1; if (s < bs) { bs = s; bc = c; } });
      ten.cancha = bc;
    }
    matches.forEach(m => { T[m.local].cancha[m.cancha]++; T[m.visita].cancha[m.cancha]++; });

    // 5) Marca del premio (equitativo por equipo)
    matches.forEach(m => {
      let bm = marcas[0], bs = Infinity;
      shuffle(marcas, rand).forEach(mk => { const s = T[m.local].marca[mk] + T[m.visita].marca[mk]; if (s < bs) { bs = s; bm = mk; } });
      m.marca = bm; T[m.local].marca[bm]++; T[m.visita].marca[bm]++;
    });

    matches.forEach(m => { m.camarines = CAMARINES[m.cancha] || []; });
    rounds.push({ n: ri + 1, fecha: fechas[ri] || null, matches });
  }
  return { rounds, tally: T };
}

function scoreDraw(draw, params) {
  const T = draw.tally;
  const ids = Object.keys(T);
  const block1040 = params.block1040 || {};
  const equipo8Id = params.equipo8Id;
  const spread = obj => { const v = Object.values(obj); return Math.max(...v) - Math.min(...v); };
  let s = 0;
  ids.forEach(id => {
    s += spread(T[id].hor) * 2;                    // horario balanceado
    s += spread({ a: T[id].cancha[3], b: T[id].cancha[4] }) * 1; // reparto 3 vs 4
  });
  // dispersión global de grabaciones, clásicos y 10:40
  const arrGrab = ids.map(id => T[id].grab), arrCl = ids.map(id => T[id].clasico), arr10 = ids.map(id => T[id].hor['10:40']);
  s += (Math.max(...arrGrab) - Math.min(...arrGrab)) * 6;
  s += (Math.max(...arrCl) - Math.min(...arrCl)) * 6;
  s += (Math.max(...arr10) - Math.min(...arr10)) * 5;
  // marcas
  ids.forEach(id => { s += spread(T[id].marca) * 4; });
  // Penalizaciones duras
  draw.rounds.forEach((rd, ri) => {
    const block = new Set(block1040[ri] || []);
    const m10 = rd.matches.find(m => m.horario === '10:40');
    if (m10 && (block.has(m10.local) || block.has(m10.visita))) s += 800; // cruce de equipo Junior/Senior
    if (m10) { const libres = (params.free1040 && params.free1040[ri]) ? params.free1040[ri] : [1, 2, 3, 4]; if (!libres.includes(m10.cancha)) s += 700; } // cancha 10:40 ocupada por el Junior
    if (rd.matches.filter(m => m.clasico).length !== 1) s += 500;
    if (rd.matches.filter(m => m.grabado).length !== GRAB_POR_FECHA) s += 500;
    if (rd.matches.filter(m => m.horario === '10:40').length !== N_10) s += 500;
    rd.matches.forEach(m => { if (m.clasico && !m.grabado) s += 400; if (m.grabado && (m.cancha !== 1 && m.cancha !== 2)) s += 400; });
    if (ri === 0 && equipo8Id) rd.matches.forEach(m => { if ((m.local === equipo8Id || m.visita === equipo8Id) && (m.clasico || m.grabado)) s += 600; });
  });
  return s;
}

export function generarFixtureSenior(params, baseSeed = 1, restarts = 700) {
  let best = null, bestScore = Infinity;
  for (let i = 0; i < restarts; i++) {
    const seed = (baseSeed * 2654435761 + i * 40503 + 12345) >>> 0;
    const draw = buildOne(params, seed);
    const sc = scoreDraw(draw, params);
    if (sc < bestScore) { bestScore = sc; best = draw; }
  }
  return { ...best, score: bestScore, stats: computeStats(best.tally, params) };
}

export function computeStats(T, params) {
  const byId = Object.fromEntries(params.teams.map(t => [t.id, t.nombre]));
  return params.teams.map(t => {
    const x = T[t.id];
    return {
      id: t.id, nombre: byId[t.id],
      h9: x.hor['9:00'], h10: x.hor['10:40'],
      c1: x.cancha[1], c2: x.cancha[2], c3: x.cancha[3], c4: x.cancha[4],
      grab: x.grab, clasico: x.clasico, local: x.local, visita: x.visita,
      marca: params.marcas.map(m => x.marca[m])
    };
  });
}

// Sábados desde una fecha inicial, saltando exclusiones, hasta cubrir n fechas.
export function sabadosDesde(inicioISO, excluir, n) {
  const ex = new Set(excluir || []);
  const out = [];
  const [Y, M, D] = inicioISO.split('-').map(Number);
  let d = new Date(Y, M - 1, D);
  let guard = 0;
  while (out.length < n && guard < 80) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!ex.has(iso)) out.push(iso);
    d.setDate(d.getDate() + 7); guard++;
  }
  return out;
}
