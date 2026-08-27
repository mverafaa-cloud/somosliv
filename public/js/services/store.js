// ============================================================
//  STORE — capa de datos de la LIV
//  Si Firebase está configurado (firebase-config.js con valores reales),
//  usa Firestore + Auth. Si no, funciona en modo DEMO con datos de seed.js.
//  El SDK de Firebase se importa on-demand desde gstatic (permitido por CSP).
// ============================================================
import { SEED } from '../data/seed.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.0';

let mode = 'demo';           // 'demo' | 'firebase'
let fb = null;               // { app, auth, db, authMod, fsMod }
let _user = null;
const authCbs = [];

// ---- Admin local (gate simple, sin Firebase) ----
// Nota: es un candado de conveniencia del lado del cliente para la organización,
// no seguridad fuerte. Sirve para el panel interno y el Sorteo Fixture.
const ADMIN_USER = 'Admin';
const ADMIN_PASS = 'LIV.2026';
let _localAdmin = false;
try { _localAdmin = sessionStorage.getItem('liv_admin') === '1'; } catch (_) {}
function notifyAuth() { authCbs.forEach(cb => cb(getUser())); }

export function adminLogin(user, pass) {
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    _localAdmin = true;
    try { sessionStorage.setItem('liv_admin', '1'); } catch (_) {}
    notifyAuth();
    return true;
  }
  throw new Error('Usuario o contraseña incorrectos.');
}
export function adminLogout() {
  _localAdmin = false;
  try { sessionStorage.removeItem('liv_admin'); } catch (_) {}
  notifyAuth();
}
export function isLogged() { return !!_user || _localAdmin; }
// Planillero = usuario autenticado en Firebase que NO es admin.
export function isPlanillero() { return !!_user && !isAdmin(); }

// ---------- MODO PRUEBA (sandbox local, solo en tu navegador) ----------
// Cuando está activo, TODAS las lecturas/escrituras van a localStorage en vez de
// Firestore. Sirve para probar el sitio (cargar fixture, resultados, tarjetas)
// sin tocar los datos reales ni que nadie más lo vea.
const SB_KEY = 'liv_sandbox';
export function sandboxOn() { try { return localStorage.getItem(SB_KEY) === '1'; } catch (_) { return false; } }
export function setSandbox(on) { try { on ? localStorage.setItem(SB_KEY, '1') : localStorage.removeItem(SB_KEY); } catch (_) {} }
export function resetSandbox() { ['partidos', 'disciplina', 'equipos', 'config', 'audiovisual'].forEach(c => { try { localStorage.removeItem('liv_sb_' + c); } catch (_) {} }); }
function sbGet(coll) { try { return JSON.parse(localStorage.getItem('liv_sb_' + coll) || '[]'); } catch (_) { return []; } }
function sbSet(coll, arr) { try { localStorage.setItem('liv_sb_' + coll, JSON.stringify(arr)); } catch (_) {} }
function sbUpsert(coll, data) {
  const arr = sbGet(coll);
  let { id, ...rest } = data;
  if (!id) id = 'sb' + Date.now() + Math.floor(Math.random() * 1000);
  const i = arr.findIndex(x => x.id === id);
  const rec = i >= 0 ? { ...arr[i], ...rest, id } : { id, ...rest };
  if (i >= 0) arr[i] = rec; else arr.push(rec);
  sbSet(coll, arr);
  return id;
}

function configReal() {
  const c = window.__FIREBASE_CONFIG__ || {};
  return c.apiKey && c.apiKey !== 'REEMPLAZAR' && c.projectId && c.projectId !== 'REEMPLAZAR';
}

export function getMode() { return mode; }
export function isDemo() { return mode === 'demo'; }

export async function initFirebase() {
  if (!configReal()) { mode = 'demo'; return; }
  const [appMod, authMod, fsMod] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`)
  ]);
  const app = appMod.initializeApp(window.__FIREBASE_CONFIG__);
  const auth = authMod.getAuth(app);
  const db = fsMod.getFirestore(app);
  fb = { app, auth, db, authMod, fsMod };
  mode = 'firebase';
  authMod.onAuthStateChanged(auth, (u) => { _user = u; authCbs.forEach(cb => cb(u)); });
}

// ---------- AUTH ----------
export function onAuthChange(cb) { authCbs.push(cb); cb(_user); }
export function getUser() { return _user; }
export function isAdmin() {
  if (_localAdmin) return true;
  if (!_user) return false;
  const ids = window.__ADMIN_UIDS__ || [];
  return ids.length ? ids.includes(_user.uid) : true; // sin lista: cualquier usuario autenticado es admin
}
export async function login(email, pass) {
  if (mode !== 'firebase') throw new Error('Configura Firebase para iniciar sesión (modo demo activo).');
  await fb.authMod.signInWithEmailAndPassword(fb.auth, email, pass);
}
export async function logout() {
  if (_localAdmin) adminLogout();
  if (mode === 'firebase') await fb.authMod.signOut(fb.auth);
}

// ---------- Helpers internos Firestore ----------
function requireFb() {
  if (mode !== 'firebase') throw new Error('Modo demo: configura Firebase para guardar cambios.');
}
async function readAll(coll, seedKey) {
  if (sandboxOn()) return sbGet(coll).map(x => ({ ...x }));
  if (mode === 'demo') return (SEED[seedKey] || []).map(x => ({ ...x }));
  const { collection, getDocs } = fb.fsMod;
  const snap = await getDocs(collection(fb.db, coll));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function upsert(coll, data) {
  if (sandboxOn()) return sbUpsert(coll, data);
  requireFb();
  const { collection, doc, addDoc, setDoc } = fb.fsMod;
  const { id, ...rest } = data;
  if (id) { await setDoc(doc(fb.db, coll, id), rest, { merge: true }); return id; }
  const ref = await addDoc(collection(fb.db, coll), rest);
  return ref.id;
}
async function remove(coll, id) {
  if (sandboxOn()) { sbSet(coll, sbGet(coll).filter(x => x.id !== id)); return; }
  requireFb();
  const { doc, deleteDoc } = fb.fsMod;
  await deleteDoc(doc(fb.db, coll, id));
}

// ---------- CONFIG ----------
export async function getConfig() {
  if (sandboxOn()) return { ...JSON.parse(JSON.stringify(SEED.config)), ...(sbGet('config')[0] || {}) };
  if (mode === 'demo') return JSON.parse(JSON.stringify(SEED.config));
  const { doc, getDoc } = fb.fsMod;
  const snap = await getDoc(doc(fb.db, 'config', 'general'));
  return snap.exists() ? { ...SEED.config, ...snap.data() } : JSON.parse(JSON.stringify(SEED.config));
}
export async function saveConfig(data) {
  if (sandboxOn()) { sbSet('config', [{ ...(sbGet('config')[0] || {}), ...data }]); return; }
  requireFb();
  const { doc, setDoc } = fb.fsMod;
  await setDoc(doc(fb.db, 'config', 'general'), data, { merge: true });
}

// ---------- EQUIPOS ----------
export const getEquipos = () => readAll('equipos', 'equipos');
export const saveEquipo = (d) => upsert('equipos', d);
export const deleteEquipo = (id) => remove('equipos', id);

// Importa el catálogo de equipos (seed) a Firestore de una vez. Usa los mismos
// ids, así que re-ejecutar no duplica (actualiza). Solo tiene sentido en Firebase.
export async function importEquipos() {
  const lista0 = SEED.equipos || [];
  if (sandboxOn()) { sbSet('equipos', lista0.map(e => ({ ...e }))); return lista0.length; }
  requireFb();
  const { doc, writeBatch } = fb.fsMod;
  const batch = writeBatch(fb.db);
  const lista = SEED.equipos || [];
  lista.forEach(e => {
    const { id, ...rest } = e;
    batch.set(doc(fb.db, 'equipos', id), rest, { merge: true });
  });
  await batch.commit();
  return lista.length;
}

// ---------- PARTIDOS ----------
export const getPartidos = () => readAll('partidos', 'partidos');
export const savePartido = (d) => upsert('partidos', d);
export const deletePartido = (id) => remove('partidos', id);

// ---------- DISCIPLINA ----------
export const getDisciplina = () => readAll('disciplina', 'disciplina');
export const saveTarjeta = (d) => upsert('disciplina', d);
export const deleteTarjeta = (id) => remove('disciplina', id);

// ---------- INSCRIPCIONES (formulario público de Admisión) ----------
export async function addInscripcion(data) {
  if (mode === 'demo') { console.log('[demo] inscripción', data); return 'demo'; }
  const { collection, addDoc } = fb.fsMod;
  const ref = await addDoc(collection(fb.db, 'inscripciones'), { ...data, estado: 'nueva', creada: Date.now() });
  return ref.id;
}
export const getInscripciones = () => readAll('inscripciones', '__none__');
export const updateInscripcion = (d) => upsert('inscripciones', d);
export const deleteInscripcion = (id) => remove('inscripciones', id);

// ---------- FIXTURE PUBLICADO ----------
// En modo Firebase: se arma desde la colección 'partidos' (lo que cargan/editan
// admin y planilleros en vivo). En modo demo: archivo estático /data/fixture.json.
function assembleFixture(partidos, equipos) {
  const jr = partidos.filter(p => (p.serie || 'libre') === 'libre' && p.fecha_num != null);
  if (!jr.length) return null;
  const byId = {}; equipos.forEach(e => byId[e.id] = e);
  const groups = {};
  jr.forEach(p => { (groups[p.fecha_num] = groups[p.fecha_num] || []).push(p); });
  const fechas = Object.keys(groups).map(Number).sort((a, b) => a - b).map(n => {
    const ps = groups[n];
    const fecha = ps.map(p => p.fecha).filter(Boolean).sort()[0] || null;
    return {
      n, fecha,
      partidos: ps.map(p => ({
        localId: p.local, visitaId: p.visita,
        local: byId[p.local]?.nombre || p.local, visita: byId[p.visita]?.nombre || p.visita,
        logoLocal: byId[p.local]?.logo || null, logoVisita: byId[p.visita]?.logo || null,
        horario: p.hora, cancha: p.cancha, camarinLocal: p.camarinLocal, camarinVisita: p.camarinVisita,
        grabado: !!p.grabado, clasico: !!p.clasico, premio: p.premio,
        estado: p.estado, golesLocal: p.golesLocal, golesVisita: p.golesVisita
      }))
    };
  });
  return { serie: 'Junior', fechas };
}
export async function getFixture() {
  if (sandboxOn()) return assembleFixture(sbGet('partidos'), sbGet('equipos'));
  if (mode === 'firebase') {
    const [partidos, equipos] = await Promise.all([readAll('partidos', 'partidos'), readAll('equipos', 'equipos')]);
    return assembleFixture(partidos, equipos);
  }
  // demo: archivo estático
  try {
    const r = await fetch('/data/fixture.json', { cache: 'no-store' });
    if (!r.ok) return null;
    const data = await r.json();
    return (data && Array.isArray(data.fechas) && data.fechas.length) ? data : null;
  } catch (_) { return null; }
}

// Publica el fixture del sorteo a Firestore (colección 'partidos').
// Reemplaza el calendario pero PRESERVA los marcadores ya cargados (mismo id).
export async function publishFixture(fixture) {
  if (sandboxOn()) {
    const prevArr = sbGet('partidos');
    const existing = {}; prevArr.forEach(p => existing[p.id] = p);
    const arr = [];
    (fixture.fechas || []).forEach(f => (f.partidos || []).forEach(p => {
      const id = `f${f.n}-${p.localId}-${p.visitaId}`.replace(/[^a-zA-Z0-9_-]/g, '');
      const prev = existing[id];
      arr.push({
        id, serie: fixture.serieId || 'libre', fecha_num: f.n, fecha: f.fecha || '', hora: p.horario || '',
        local: p.localId, visita: p.visitaId, cancha: p.cancha,
        camarinLocal: p.camarinLocal ?? null, camarinVisita: p.camarinVisita ?? null,
        grabado: !!p.grabado, clasico: !!p.clasico, premio: p.premio || '',
        golesLocal: prev?.golesLocal ?? null, golesVisita: prev?.golesVisita ?? null,
        estado: prev?.estado || 'programado'
      });
    }));
    sbSet('partidos', arr);
    return arr.length;
  }
  requireFb();
  const { collection, doc, getDocs, writeBatch } = fb.fsMod;
  const snap = await getDocs(collection(fb.db, 'partidos'));
  const existing = {}; snap.docs.forEach(d => existing[d.id] = d.data());
  const batch = writeBatch(fb.db);
  snap.docs.forEach(d => batch.delete(doc(fb.db, 'partidos', d.id)));
  let count = 0;
  (fixture.fechas || []).forEach(f => (f.partidos || []).forEach(p => {
    const id = `f${f.n}-${p.localId}-${p.visitaId}`.replace(/[^a-zA-Z0-9_-]/g, '');
    const prev = existing[id];
    batch.set(doc(fb.db, 'partidos', id), {
      serie: fixture.serieId || 'libre', fecha_num: f.n, fecha: f.fecha || '', hora: p.horario || '',
      local: p.localId, visita: p.visitaId, cancha: p.cancha,
      camarinLocal: p.camarinLocal ?? null, camarinVisita: p.camarinVisita ?? null,
      grabado: !!p.grabado, clasico: !!p.clasico, premio: p.premio || '',
      golesLocal: prev?.golesLocal ?? null, golesVisita: prev?.golesVisita ?? null,
      estado: prev?.estado || 'programado'
    });
    count++;
  }));
  await batch.commit();
  return count;
}

// ---------- AUDIOVISUAL ----------
export async function getAudiovisual() {
  if (sandboxOn()) return sbGet('audiovisual')[0] || JSON.parse(JSON.stringify(SEED.audiovisual));
  if (mode === 'demo') return JSON.parse(JSON.stringify(SEED.audiovisual));
  const { doc, getDoc } = fb.fsMod;
  const snap = await getDoc(doc(fb.db, 'config', 'audiovisual'));
  return snap.exists() ? snap.data() : { videos: [], galeria: [] };
}
export async function saveAudiovisual(data) {
  if (sandboxOn()) { sbSet('audiovisual', [{ ...(sbGet('audiovisual')[0] || {}), ...data }]); return; }
  requireFb();
  const { doc, setDoc } = fb.fsMod;
  await setDoc(doc(fb.db, 'config', 'audiovisual'), data, { merge: true });
}

// ============================================================
//  LÓGICA DE LIGA
// ============================================================

// Mapa id→equipo para lookups rápidos.
export function equiposById(equipos) {
  const m = {};
  equipos.forEach(e => m[e.id] = e);
  return m;
}

// Tabla de posiciones calculada desde los partidos finalizados de una serie.
export function computeStandings(partidos, equipos, serieId) {
  const teams = equipos.filter(e => e.serie === serieId);
  const table = {};
  teams.forEach(t => table[t.id] = { equipo: t, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 });

  partidos
    .filter(p => p.serie === serieId && !p.amistoso && p.estado === 'finalizado' && p.golesLocal != null && p.golesVisita != null)
    .forEach(p => {
      const L = table[p.local], V = table[p.visita];
      if (!L || !V) return;
      const gl = +p.golesLocal, gv = +p.golesVisita;
      L.pj++; V.pj++; L.gf += gl; L.gc += gv; V.gf += gv; V.gc += gl;
      if (gl > gv) { L.pg++; L.pts += 3; V.pp++; }
      else if (gl < gv) { V.pg++; V.pts += 3; L.pp++; }
      else { L.pe++; V.pe++; L.pts++; V.pts++; }
    });

  return Object.values(table)
    .map(r => ({ ...r, dg: r.gf - r.gc }))
    .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.equipo.nombre.localeCompare(b.equipo.nombre));
}

// Goleadores: usa la colección/seed si existe.
export async function getGoleadores() {
  if (mode === 'demo') return (SEED.goleadores || []).map(x => ({ ...x }));
  return readAll('goleadores', '__none__');
}
