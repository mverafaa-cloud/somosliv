import { getConfig, getPartidos, getEquipos, getJugadores, equiposById, isAdmin } from '../services/store.js';
import { mount, esc, teamLogo, fmtDateLong } from '../ui/helpers.js';
import { shell, loading } from '../ui/layout.js';
import { icon } from '../ui/icons.js';
import { renderLogin } from './admin.js';

const HOR = ['9:00', '10:40', '12:20'];
const serieLabel = s => s === 'senior' ? 'Senior' : 'Junior';

export async function showActas() {
  if (!isAdmin()) return renderLogin('/actas');
  mount(loading('Preparando actas…'));
  const [config, partidos, equipos, jugadores] = await Promise.all([getConfig(), getPartidos(), getEquipos(), getJugadores().catch(() => [])]);
  const byId = equiposById(equipos);

  // Nómina por equipo (número = orden de inscripción, tomado del id ...-jNN).
  const rosterByTeam = {};
  (jugadores || []).forEach(j => { (rosterByTeam[j.equipo] = rosterByTeam[j.equipo] || []).push(j); });
  Object.values(rosterByTeam).forEach(arr => arr.sort((a, b) => numOf(a) - numOf(b)));

  // Próxima fecha por serie = menor fecha_num no finalizada.
  const series = [...new Set(partidos.map(p => p.serie || 'libre'))];
  const bloques = [];
  series.forEach(sid => {
    const ps = partidos.filter(p => (p.serie || 'libre') === sid && p.fecha_num != null && !p.amistoso);
    const pend = ps.filter(p => p.estado !== 'finalizado');
    if (!pend.length) return;
    const next = Math.min(...pend.map(p => +p.fecha_num));
    const matches = ps.filter(p => +p.fecha_num === next)
      .sort((a, b) => (HOR.indexOf(a.hora) - HOR.indexOf(b.hora)) || ((+a.cancha || 0) - (+b.cancha || 0)));
    if (matches.length) bloques.push({ sid, next, fecha: matches[0].fecha, matches });
  });
  bloques.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

  const nombre = id => byId[id]?.nombre || id;

  const actasHTML = bloques.flatMap(b => b.matches.map(m => acta(m, b, nombre, byId, rosterByTeam, config))).join('');

  const inner = `
  <style>
    .actas-wrap{max-width:900px;margin:0 auto}
    .acta{background:#fff;border:1px solid #d8d8d8;border-radius:10px;padding:20px 22px;margin:0 0 18px}
    .acta-head{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid var(--c-brand,#067a3e);padding-bottom:8px;margin-bottom:10px}
    .acta-head h2{margin:0;font-size:1.05rem;letter-spacing:.5px}
    .acta-meta{font-size:.82rem;color:#444;text-align:right;line-height:1.35}
    .acta-vs{display:flex;gap:18px;align-items:stretch}
    .acta-col{flex:1;min-width:0}
    .acta-team{display:flex;align-items:center;gap:8px;font-weight:800;font-size:1rem;margin-bottom:6px}
    table.acta-tbl{width:100%;border-collapse:collapse;font-size:.8rem}
    table.acta-tbl th,table.acta-tbl td{border:1px solid #cfcfcf;padding:3px 6px;text-align:left}
    table.acta-tbl th{background:var(--c-brand,#067a3e);color:#fff;font-weight:600}
    table.acta-tbl td.n{width:26px;text-align:center;color:#555}
    table.acta-tbl td.g{width:26px}
    .acta-foot{display:flex;justify-content:space-between;gap:16px;margin-top:14px;font-size:.78rem;color:#333}
    .firma{flex:1;text-align:center}
    .firma .line{border-top:1px solid #333;margin-top:34px;padding-top:3px}
    @media print {
      header.app-header, nav.bottom-nav, #liv-menu, .sandbox-bar, .actas-toolbar { display:none !important; }
      body{background:#fff}
      .acta{page-break-after:always;border:none;border-radius:0;padding:0 6px}
      .container{padding:0}
    }
  </style>
  <div class="container">
    <div class="actas-toolbar spread mb-3" style="align-items:center;flex-wrap:wrap;gap:10px">
      <div><span class="eyebrow">Impresión</span><h1 style="margin:0">Actas de partido</h1>
        <p class="muted" style="margin:4px 0 0">Próxima fecha de cada serie · ${bloques.map(b => `${serieLabel(b.sid)} F${b.next}`).join(' · ') || '—'}. Usan la nómina importada en Jugadores.</p></div>
      <div class="row">
        <a href="/admin" data-link class="btn btn-ghost btn-sm">${icon('settings', { size: 15 })} Admin</a>
        <button class="btn btn-primary btn-sm" id="btn-print">${icon('file', { size: 15 })} Imprimir / Guardar PDF</button>
      </div>
    </div>
    <div class="actas-wrap">
      ${actasHTML || '<div class="alert alert-warn">No hay una próxima fecha programada para generar actas.</div>'}
    </div>
  </div>`;

  mount(shell(inner, config));
  const bp = document.getElementById('btn-print'); if (bp) bp.onclick = () => window.print();
}

function numOf(j) { const m = String(j.id || '').match(/-j(\d+)$/); return m ? +m[1] : 999; }

function rosterTable(teamId, rosterByTeam) {
  const arr = rosterByTeam[teamId] || [];
  const rows = arr.length
    ? arr.map(j => `<tr><td class="n">${numOf(j) === 999 ? '' : numOf(j)}</td><td>${esc(j.nombre)}</td><td class="g"></td><td class="g"></td><td class="g"></td></tr>`).join('')
    : Array.from({ length: 16 }, (_, i) => `<tr><td class="n">${i + 1}</td><td></td><td class="g"></td><td class="g"></td><td class="g"></td></tr>`).join('');
  return `<table class="acta-tbl">
    <thead><tr><th class="n">N°</th><th>Jugador</th><th class="g">G</th><th class="g">A</th><th class="g">R</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
}

function acta(m, b, nombre, byId, rosterByTeam, config) {
  const L = nombre(m.local), V = nombre(m.visita);
  return `
  <div class="acta">
    <div class="acta-head">
      <h2>${esc((config.nombre || 'LIV — Liga La Cuarta'))} · ACTA DE PARTIDO</h2>
      <div class="acta-meta">
        <strong>${serieLabel(b.sid)} · Fecha ${b.next}</strong><br>
        ${esc(fmtDateLong(m.fecha))} · ${esc(m.hora || '')} · Cancha ${esc(m.cancha ?? '—')}${m.clasico ? ' · CLÁSICO' : ''}
      </div>
    </div>
    <div class="acta-vs">
      <div class="acta-col">
        <div class="acta-team">${teamLogo(byId[m.local]?.logo, L, 26)} ${esc(L)} <span style="font-weight:400;color:#777;font-size:.8rem">(local)</span></div>
        ${rosterTable(m.local, rosterByTeam)}
      </div>
      <div class="acta-col">
        <div class="acta-team">${teamLogo(byId[m.visita]?.logo, V, 26)} ${esc(V)} <span style="font-weight:400;color:#777;font-size:.8rem">(visita)</span></div>
        ${rosterTable(m.visita, rosterByTeam)}
      </div>
    </div>
    <div class="acta-foot">
      <div class="firma"><div class="line">Delegado ${esc(L)}</div></div>
      <div class="firma"><div class="line">Árbitro · Resultado: ____ - ____</div></div>
      <div class="firma"><div class="line">Delegado ${esc(V)}</div></div>
    </div>
    <p style="font-size:.72rem;color:#888;margin:8px 0 0">G = goles · A = amarilla · R = roja (para llenar durante el partido).</p>
  </div>`;
}
