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
  if (!_user) return false;
  const ids = window.__ADMIN_UIDS__ || [];
  return ids.length ? ids.includes(_user.uid) : true; // sin lista: cualquier usuario autenticado es admin
}
export async function login(email, pass) {
  if (mode !== 'firebase') throw new Error('Configura Firebase para iniciar sesión (modo demo activo).');
  await fb.authMod.signInWithEmailAndPassword(fb.auth, email, pass);
}
export async function logout() {
  if (mode === 'firebase') await fb.authMod.signOut(fb.auth);
}

// ---------- Helpers internos Firestore ----------
function requireFb() {
  if (mode !== 'firebase') throw new Error('Modo demo: configura Firebase para guardar cambios.');
}
async function readAll(coll, seedKey) {
  if (mode === 'demo') return (SEED[seedKey] || []).map(x => ({ ...x }));
  const { collection, getDocs } = fb.fsMod;
  const snap = await getDocs(collection(fb.db, coll));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function upsert(coll, data) {
  requireFb();
  const { collection, doc, addDoc, setDoc } = fb.fsMod;
  const { id, ...rest } = data;
  if (id) { await setDoc(doc(fb.db, coll, id), rest, { merge: true }); return id; }
  const ref = await addDoc(collection(fb.db, coll), rest);
  return ref.id;
}
async function remove(coll, id) {
  requireFb();
  const { doc, deleteDoc } = fb.fsMod;
  await deleteDoc(doc(fb.db, coll, id));
}

// ---------- CONFIG ----------
export async function getConfig() {
  if (mode === 'demo') return JSON.parse(JSON.stringify(SEED.config));
  const { doc, getDoc } = fb.fsMod;
  const snap = await getDoc(doc(fb.db, 'config', 'general'));
  return snap.exists() ? { ...SEED.config, ...snap.data() } : JSON.parse(JSON.stringify(SEED.config));
}
export async function saveConfig(data) {
  requireFb();
  const { doc, setDoc } = fb.fsMod;
  await setDoc(doc(fb.db, 'config', 'general'), data, { merge: true });
}

// ---------- EQUIPOS ----------
export const getEquipos = () => readAll('equipos', 'equipos');
export const saveEquipo = (d) => upsert('equipos', d);
export const deleteEquipo = (id) => remove('equipos', id);

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

// ---------- AUDIOVISUAL ----------
export async function getAudiovisual() {
  if (mode === 'demo') return JSON.parse(JSON.stringify(SEED.audiovisual));
  const { doc, getDoc } = fb.fsMod;
  const snap = await getDoc(doc(fb.db, 'config', 'audiovisual'));
  return snap.exists() ? snap.data() : { videos: [], galeria: [] };
}
export async function saveAudiovisual(data) {
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
    .filter(p => p.serie === serieId && p.estado === 'finalizado' && p.golesLocal != null && p.golesVisita != null)
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
