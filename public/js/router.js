// Router minimalista con soporte para parámetros (/equipo/:id)
export class Router {
  constructor(routes) {
    this.routes = routes;
    window.addEventListener('popstate', () => this.handle());
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-link]');
      if (!a) return;
      e.preventDefault();
      const href = a.getAttribute('href');
      if (href) this.go(href);
    });
  }

  go(path, push = true) {
    if (push) history.pushState({}, '', path);
    else history.replaceState({}, '', path);
    window.scrollTo(0, 0);
    this.handle();
  }

  handle() {
    const path = window.location.pathname || '/';
    for (const pattern in this.routes) {
      const re = new RegExp('^' + pattern.replace(/:[^/]+/g, '([^/]+)') + '$');
      const m = path.match(re);
      if (!m) continue;
      const keys = (pattern.match(/:[^/]+/g) || []).map(k => k.slice(1));
      const params = {};
      keys.forEach((k, i) => params[k] = decodeURIComponent(m[i + 1]));
      try {
        this.routes[pattern](params);
      } catch (err) {
        console.error('Error renderizando ruta', path, err);
        const app = document.getElementById('app');
        if (app) app.innerHTML = '<div class="container"><div class="alert alert-error">Error: ' + (err.message || err) + '</div></div>';
      }
      this.highlight(path);
      return;
    }
    // 404 → home
    if (path !== '/') { history.replaceState({}, '', '/'); this.handle(); }
  }

  highlight(path) {
    document.querySelectorAll('header.app-header nav a, nav.bottom-nav a').forEach(a => {
      const href = a.getAttribute('href');
      if (!href) return;
      const active = href === '/' ? path === '/' : (path === href || path.startsWith(href + '/'));
      a.classList.toggle('active', active);
    });
  }
}
