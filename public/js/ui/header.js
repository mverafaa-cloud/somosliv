import { getUser, isAdmin, isLogged, isPlanillero, logout, sandboxOn } from '../services/store.js';
import { icon } from './icons.js';

export const NAV = [
  { href: '/',              label: 'Inicio',       icon: 'home' },
  { href: '/liv',           label: 'LIV',          icon: 'info' },
  { href: '/equipos',       label: 'Equipos',      icon: 'users' },
  { href: '/programacion',  label: 'Programación', icon: 'calendar' },
  { href: '/resultados',    label: 'Resultados',   icon: 'check' },
  { href: '/posiciones',    label: 'Posiciones',   icon: 'trophy' },
  { href: '/disciplina',    label: 'Disciplina',   icon: 'cards' },
  { href: '/reglamentos',   label: 'Reglamentos',  icon: 'book' },
  { href: '/admision',      label: 'Admisión',     icon: 'clipboard' },
  { href: '/audiovisual',   label: 'Audiovisual',  icon: 'video' }
];

// Ítems primarios del bottom nav (mobile). El resto va en el menú.
// Modo torneo en marcha: foco en resultados/tabla/programación (no en admisión).
const BOTTOM = ['/', '/resultados', '/posiciones', '/programacion'];

export function renderHeader() {
  document.querySelector('header.app-header')?.remove();
  document.querySelector('nav.bottom-nav')?.remove();
  document.getElementById('liv-menu')?.remove();
  document.getElementById('sandbox-bar')?.remove();

  // ---- Barra de modo prueba (sandbox privado) ----
  if (sandboxOn()) {
    const bar = document.createElement('div');
    bar.className = 'sandbox-bar';
    bar.id = 'sandbox-bar';
    bar.innerHTML = `<span>🧪 Modo prueba — datos privados de este navegador · <a href="/admin" data-link style="color:inherit;text-decoration:underline">salir</a></span>`;
    document.body.insertBefore(bar, document.body.firstChild);
  }

  const admin = isAdmin();
  const logged = isLogged();

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
      ${admin ? `<a href="/sorteo" data-link class="nav-admin">${icon('shuffle', { size: 16 })} Sorteo</a>` : ''}
      ${isPlanillero() ? `<a href="/admin" data-link class="nav-admin">${icon('check', { size: 16 })} Resultados</a>` : ''}
      ${admin ? `<a href="/admin" data-link class="nav-admin">${icon('settings', { size: 16 })} Admin</a>` : (isPlanillero() ? '' : '<a href="/admin" data-link class="nav-admin" title="Acceso organización">·</a>')}
    </nav>
    <button class="nav-menu-btn" id="btn-menu" aria-label="Menú">${icon('menu', { size: 22 })}</button>
  `;
  document.body.insertBefore(header, document.body.firstChild);

  // ---- Bottom nav (mobile) ----
  const bottom = document.createElement('nav');
  bottom.className = 'bottom-nav';
  const items = NAV.filter(n => BOTTOM.includes(n.href));
  bottom.innerHTML = `
    <div class="bottom-nav-inner">
      ${items.map(n => `<a href="${n.href}" data-link><span class="ic">${icon(n.icon, { size: 22 })}</span><span>${n.label}</span></a>`).join('')}
      <a href="#" id="btn-menu-2"><span class="ic">${icon('menu', { size: 22 })}</span><span>Menú</span></a>
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
      ${NAV.map(n => `<a href="${n.href}" data-link><span class="ic">${icon(n.icon)}</span> ${n.label}</a>`).join('')}
      <div class="divider"></div>
      ${admin ? `<a href="/sorteo" data-link><span class="ic">${icon('shuffle')}</span> Sorteo Fixture</a>` : ''}
      <a href="/admin" data-link><span class="ic">${icon(isPlanillero() ? 'check' : 'settings')}</span> ${admin ? 'Panel Admin' : (isPlanillero() ? 'Cargar resultados' : 'Acceso organización')}</a>
      ${logged ? `<a href="#" id="menu-logout"><span class="ic">${icon('logout')}</span> Cerrar sesión</a>` : ''}
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
    renderHeader();
    if (window.__router) window.__router.go('/', false);
  });
}
