// Bootstrap del SPA de la LIV.
console.log('[LIV] main.js cargado');

import { initFirebase, onAuthChange, getUser } from './services/store.js';
import { Router } from './router.js';
import { renderHeader } from './ui/header.js';
import { toast } from './ui/toast.js';

import { showInicio } from './views/inicio.js';
import { showLIV } from './views/liv.js';
import { showEquipos } from './views/equipos.js';
import { showProgramacion } from './views/programacion.js';
import { showResultados } from './views/resultados.js';
import { showPosiciones } from './views/posiciones.js';
import { showDisciplina } from './views/disciplina.js';
import { showReglamentos } from './views/reglamentos.js';
import { showGoleadores } from './views/goleadores.js';
import { showAdmision } from './views/admision.js';
import { showAudiovisual } from './views/audiovisual.js';
import { showAdmin } from './views/admin.js';
import { showSorteo } from './views/sorteo.js';
import { showSorteoSenior } from './views/sorteo-senior.js';

const app = document.getElementById('app');

async function boot() {
  // Init Firebase con timeout tolerante: si tarda, arrancamos igual en demo/anon.
  const initPromise = initFirebase().catch(err => { console.warn('[LIV] Firebase init falló:', err.message); });
  await Promise.race([initPromise, new Promise(r => setTimeout(r, 8000))]);

  renderHeader();

  const router = new Router({
    '/':             () => showInicio(),
    '/liv':          () => showLIV(),
    '/equipos':      () => showEquipos(),
    '/programacion': () => showProgramacion(),
    '/resultados':   () => showResultados(),
    '/posiciones':   () => showPosiciones(),
    '/goleadores':   () => showGoleadores(),
    '/disciplina':   () => showDisciplina(),
    '/reglamentos':  () => showReglamentos(),
    '/admision':     () => showAdmision(),
    '/audiovisual':  () => showAudiovisual(),
    '/admin':        () => showAdmin(),
    '/sorteo':       () => showSorteo(),
    '/sorteo-senior':() => showSorteoSenior()
  });

  window.__router = router;
  window.toast = toast;
  window.renderHeader = renderHeader;

  // Re-render de header cuando cambia el estado de sesión (para mostrar/ocultar Admin).
  let lastUid = undefined;
  onAuthChange((u) => {
    const uid = u?.uid || null;
    if (uid === lastUid) return;
    lastUid = uid;
    renderHeader();
    router.highlight(window.location.pathname);
    // Si estamos en una vista con sesión, re-render para reflejar login/logout.
    const pth = window.location.pathname;
    if (pth === '/admin' || pth === '/sorteo') router.handle();
  });

  router.handle();
  console.log('[LIV] listo. Modo:', (getUser() ? 'auth' : 'anon'));
}

boot().catch(err => {
  console.error('[LIV] excepción global:', err);
  app.innerHTML = '<div class="loading-page"><h2>⚠️ Error de carga</h2><pre>' + (err.message || err) + '</pre></div>';
});
