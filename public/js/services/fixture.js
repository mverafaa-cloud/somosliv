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
const GRAB_1040 = 1, GRAB_1220 = 2; // grabados por jornada: 1 a las 10:40 y 2 a las 12:20
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

  const clKey = m => [m.local, m.visita].sort().join('|');

  // ===== Fase A: construir todos los partidos + tally de localía =====
  const allRounds = pairsByRound.map((pairs, ri) => ({
    n: ri + 1, fecha: usarFechas[ri] || null,
    matches: pairs.map(([local, visita]) => ({ local, visita, cancha: null, horario: null, grabado: false, clasico: false, marca: null }))
  }));
  allRounds.forEach(rd => rd.matches.forEach(m => { T[m.local].local++; T[m.visita].visita++; }));

  // ===== Fase B: CLÁSICOS (global) =====
  // (a) Las RIVALIDADES definidas son SIEMPRE clásico (son los clásicos reales).
  // (b) Cada fecha debe tener ≥1 clásico.
  // (c) Se completa hasta 2 clásicos por equipo (máx. 2 por fecha, para que TODOS
  //     los clásicos quepan como grabados: 12:20 tiene 2 cámaras y 10:40 una).
  const addCl = m => { m.clasico = true; T[m.local].clasico++; T[m.visita].clasico++; };
  const canClG = m => !m.clasico && T[m.local].clasico < CL_MAX && T[m.visita].clasico < CL_MAX;
  allRounds.forEach(rd => rd.matches.forEach(m => { if (rivSet.has(clKey(m)) && canClG(m)) addCl(m); }));
  allRounds.forEach(rd => {
    if (rd.matches.some(m => m.clasico)) return;
    const cand = rd.matches.filter(canClG)
      .sort((a, b) => (T[a.local].clasico + T[a.visita].clasico) - (T[b.local].clasico + T[b.visita].clasico) + (rand() - 0.5));
    if (cand.length) addCl(cand[0]);
  });
  let clGuard = 0;
  while (ids.some(id => T[id].clasico < CL_MIN) && clGuard++ < 300) {
    let best = null, bs = -Infinity;
    allRounds.forEach(rd => {
      if (rd.matches.filter(m => m.clasico).length >= 2) return; // ≤2 clásicos/fecha
      rd.matches.forEach(m => {
        if (!canClG(m)) return;
        const deficit = (T[m.local].clasico < CL_MIN ? 1 : 0) + (T[m.visita].clasico < CL_MIN ? 1 : 0);
        if (!deficit) return;
        const s = deficit * 10 - (T[m.local].clasico + T[m.visita].clasico) + rand() * 0.6;
        if (s > bs) { bs = s; best = m; }
      });
    });
    if (!best) break;
    addCl(best);
  }

  // ===== Fase C: por ronda → horarios, grabaciones, canchas, marcas =====
  const GRAB_BY_H = { '10:40': GRAB_1040, '12:20': GRAB_1220 };
  const rounds = allRounds.map((rd) => {
    const matches = rd.matches;
    const expo = id => T[id].grab + T[id].clasico;

    // ---- Horarios: 2 a las 10:40 y 3 a las 12:20. Los CLÁSICOS se ubican para que
    //      TODOS puedan grabarse: hasta 2 a las 12:20 (2 cámaras) y como máx. 1 a las 10:40. ----
    const need = (id, h) => targets[id][h] - T[id].hor[h];
    const setH = (m, h) => { m.horario = h; T[m.local].hor[h]++; T[m.visita].hor[h]++; };
    const n1040 = Math.min(N_1040, matches.length);
    const clas = matches.filter(m => m.clasico);
    const noCl = matches.filter(m => !m.clasico);
    // Clásicos que DEBEN ir a 10:40 = los que no caben en las 2 cámaras de 12:20.
    const clTo1040 = Math.min(GRAB_1040, n1040, Math.max(0, clas.length - GRAB_1220));
    let slots1040 = n1040;
    clas.forEach((m, i) => { if (i < clTo1040 && slots1040 > 0) { setH(m, '10:40'); slots1040--; } else setH(m, '12:20'); });
    // No-clásicos: llenan lo que resta de 10:40 (por preferencia) y el resto va a 12:20.
    const want10 = noCl.map(m => ({ m, w: (need(m.local, '10:40') + need(m.visita, '10:40')) - (need(m.local, '12:20') + need(m.visita, '12:20')) + rand() * 0.02 }));
    want10.sort((a, b) => b.w - a.w);
    want10.forEach(({ m }) => { if (slots1040 > 0) { setH(m, '10:40'); slots1040--; } else setH(m, '12:20'); });

    // ---- Grabaciones: TODOS los clásicos grabados + completar a 1@10:40 y 2@12:20. ----
    const gval = m => expo(m.local) + expo(m.visita) + rand() * 0.3;
    const orden = matches.slice().sort((a, b) => gval(a) - gval(b));
    const recorded = new Set(matches.filter(m => m.clasico)); // clásicos forzados
    HOR.forEach(h => {
      const cap = GRAB_BY_H[h];
      let have = [...recorded].filter(m => m.horario === h).length;
      const pool = orden.filter(m => m.horario === h && !recorded.has(m));
      for (const m of pool) { if (have >= cap) break; if (T[m.local].grab >= GR_MAX || T[m.visita].grab >= GR_MAX) continue; recorded.add(m); have++; }
      for (const m of pool) { if (have >= cap) break; if (!recorded.has(m)) { recorded.add(m); have++; } }
    });
    recorded.forEach(m => m.grabado = true);

    // Elige el par de canchas-cámara y asigna las canchas de los grabados dentro de él.
    const recArr = [...recorded];
    const recByH = { '10:40': recArr.filter(m => m.horario === '10:40'), '12:20': recArr.filter(m => m.horario === '12:20') };
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

    return { n: rd.n, fecha: rd.fecha, matches };
  });

  // ---- 6) Reparación de marcas: hill-climb para acercar todos a 3/3/3 ----
  // El greedy por jornada suele dejar 1-2 equipos en 2/4/3. Recoloreamos partidos
  // (cambia la marca de AMBOS equipos del partido) mientras baje la dispersión total.
  {
    const spr = obj => { const v = Object.values(obj); return Math.max(...v) - Math.min(...v); };
    const totalSpread = () => ids.reduce((a, id) => a + spr(T[id].marca), 0);
    const setMarca = (m, mk) => { T[m.local].marca[m.marca]--; T[m.visita].marca[m.marca]--; m.marca = mk; T[m.local].marca[mk]++; T[m.visita].marca[mk]++; };
    const allM = rounds.flatMap(r => r.matches);
    let improved = true, guard = 0;
    while (improved && guard++ < 400) {
      improved = false;
      // (a) recolorear un partido si baja la dispersión total
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
      // (b) intercambiar las marcas de DOS partidos (saca de mínimos locales del
      //     paso (a), donde mover un solo partido queda neutro pero un swap sí ayuda)
      if (!improved) {
        for (let i = 0; i < allM.length && !improved; i++) {
          for (let j = i + 1; j < allM.length; j++) {
            const a = allM[i], b = allM[j];
            if (a.marca === b.marca) continue;
            const before = totalSpread();
            const ma = a.marca, mb = b.marca;
            setMarca(a, mb); setMarca(b, ma);
            if (totalSpread() < before) { improved = true; break; }
            setMarca(a, ma); setMarca(b, mb); // revertir
          }
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
    // Penalizaciones de reglas duras (el mejor sorteo debe cumplirlas todas):
    //  · cada fecha con ≥1 clásico  · rivalidades siempre clásico
    //  · TODO clásico grabado  · grabados 1@10:40 + 2@12:20
    const rivKeys = new Set((params.rivalries || []).map(p => [p[0], p[1]].sort().join('|')));
    let pen = 0;
    draw.rounds.forEach(rd => {
      if (!rd.matches.some(m => m.clasico)) pen += 500;
      const g1040 = rd.matches.filter(m => m.grabado && m.horario === '10:40').length;
      const g1220 = rd.matches.filter(m => m.grabado && m.horario === '12:20').length;
      pen += Math.abs(g1040 - 1) * 200 + Math.abs(g1220 - 2) * 200;
      rd.matches.forEach(m => {
        if (m.clasico && !m.grabado) pen += 300;
        if (rivKeys.has([m.local, m.visita].sort().join('|')) && !m.clasico) pen += 300;
      });
    });
    const sc = scoreDraw(draw.tally, params) + pen;
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
