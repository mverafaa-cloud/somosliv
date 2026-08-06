import { getUser, isAdmin, logout } from '../services/store.js';

export const NAV = [
  { href: '/',              label: 'Inicio',       icon: '🏠' },
  { href: '/liv',           label: 'LIV',          icon: '🟢' },
  { href: '/programacion',  label: 'Programación', icon: '📅' },
  { href: '/resultados',    label: 'Resultados',   icon: '✅' },
  { href: '/posiciones',    label: 'Posiciones',   icon: '🏆' },
  { href: '/disciplina',    label: 'Disciplina',   icon: '🟥' },
  { href: '/reglamentos',   label: 'Reglamentos',  icon: '📖' },
  { href: '/admision',      label: 'Admisión',     icon: '📝' },
  { href: '/audiovisual',   label: 'Audiovisual',  icon: '🎥' }
];

// Ítems primarios del bottom nav (mobile). El resto va en el menú.
const BOTTOM = ['/', '/programacion', '/posiciones', '/disciplina'];

export function renderHeader() {
  document.querySelector('header.app-header')?.remove();
  document.querySelector('nav.bottom-nav')?.remove();
  document.getElementById('liv-menu')?.remove();

  const admin = isAdmin();
  const logged = !!getUser();

  // ---- Header top ----
  const header = document.createElement('header');
  header.className = 'app-header';
  header.innerHTML = `
    <a href="/" data-link class="brand">
      <img src="/assets/logo-white.png" alt="LIV — Liga La Cuarta" class="logo-white" />
      <span class="brand-word">Liga La Cuarta</span>
    </a>
    <nav class="desktop-nav">
      ${NAV.map(n => `<a href="${n.href}" data-link>${n.label}</a>`).join('')}
      ${admin ? '<a href="/admin" data-link class="nav-admin">⚙️ Admin</a>' : '<a href="/admin" data-link class="nav-admin" title="Acceso organización">•</a>'}
    </nav>
    <button class="nav-menu-btn" id="btn-menu" aria-label="Menú">☰</button>
  `;
  document.body.insertBefore(header, document.body.firstChild);

  // ---- Bottom nav (mobile) ----
  const bottom = document.createElement('nav');
  bottom.className = 'bottom-nav';
  const items = NAV.filter(n => BOTTOM.includes(n.href));
  bottom.innerHTML = `
    <div class="bottom-nav-inner">
      ${items.map(n => `<a href="${n.href}" data-link><span class="ic">${n.icon}</span><span>${n.label}</span></a>`).join('')}
      <a href="#" id="btn-menu-2"><span class="ic">☰</span><span>Menú</span></a>
    </div>
  `;
  document.body.appendChild(bottom);

  // ---- Overlay de menú ----
  const overlay = document.createElement('div');
  overlay.className = 'menu-overlay';
  overlay.id = 'liv-menu';
  overlay.innerHTML = `
    <div class="menu-panel">
      <div class="menu-head">
        <img src="/assets/logo-mark.png" alt="LIV" />
        <button class="menu-close" id="menu-close" aria-label="Cerrar">✕</button>
      </div>
      ${NAV.map(n => `<a href="${n.href}" data-link><span class="ic">${n.icon}</span> ${n.label}</a>`).join('')}
      <div class="divider"></div>
      <a href="/admin" data-link><span class="ic">⚙️</span> ${admin ? 'Panel Admin' : 'Acceso organización'}</a>
      ${logged ? '<a href="#" id="menu-logout"><span class="ic">🚪</span> Cerrar sesión</a>' : ''}
    </div>
  `;
  document.body.appendChild(overlay);

  // ---- Eventos ----
  const openMenu = (e) => { if (e) e.preventDefault(); overlay.classList.add('open'); };
  const closeMenu = () => overlay.classList.remove('open');
  header.querySelector('#btn-menu')?.addEventListener('click', openMenu);
  bottom.querySelector('#btn-menu-2')?.addEventListener('click', openMenu);
  overlay.querySelector('#menu-close')?.addEventListener('click', closeMenu);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeMenu(); });
  overlay.querySelectorAll('a[data-link]').forEach(a => a.addEventListener('click', closeMenu));
  overlay.querySelector('#menu-logout')?.addEventListener('click', async (e) => {
    e.preventDefault(); closeMenu(); await logout();
    if (window.__router) window.__router.go('/', false);
  });
}
