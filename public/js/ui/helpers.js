// Utilidades compartidas por las vistas.

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// Iniciales para el "badge" del equipo cuando no hay escudo.
export function initials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// Parseo defensivo de fechas (acepta 'YYYY-MM-DD', ISO o timestamp).
export function parseDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(v);
  if (typeof v === 'object' && typeof v.seconds === 'number') return new Date(v.seconds * 1000); // Firestore Timestamp
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

export function fmtDate(v, withWeekday = false) {
  const d = parseDate(v);
  if (!d) return '—';
  const base = `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
  return withWeekday ? `${DIAS[d.getDay()]} ${base}` : base;
}

export function fmtDateLong(v) {
  const d = parseDate(v);
  if (!d) return '—';
  const dia = DIAS[d.getDay()];
  return `${dia.charAt(0).toUpperCase() + dia.slice(1)} ${d.getDate()} de ${['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][d.getMonth()]}`;
}

export function fmtTime(v) {
  if (!v) return '';
  if (typeof v === 'string' && /^\d{1,2}:\d{2}/.test(v)) return v.slice(0, 5);
  const d = parseDate(v);
  if (!d) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Formato de plata chilena.
export function clp(n) {
  const num = Number(n) || 0;
  return '$' + num.toLocaleString('es-CL');
}

// Helper para crear elementos con innerHTML.
export function h(tag, className, html) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (html != null) el.innerHTML = html;
  return el;
}

// Registro de timers de página (se limpian al montar una vista nueva).
let _timers = [];
export function clearTimers() { _timers.forEach(clearInterval); _timers = []; }
export function everySecond(fn) { fn(); const id = setInterval(fn, 1000); _timers.push(id); return id; }

// Monta HTML en #app y devuelve el nodo. Limpia timers de la vista anterior.
export function mount(html) {
  clearTimers();
  const app = document.getElementById('app');
  app.innerHTML = html;
  return app;
}

// Días restantes hasta una fecha (para countdowns).
export function daysUntil(v) {
  const d = parseDate(v);
  if (!d) return null;
  const now = new Date();
  return Math.ceil((d - now) / 86400000);
}
