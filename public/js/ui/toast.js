export function toast(msg, type = 'info', ms = 3200) {
  const cont = document.getElementById('toast-container');
  if (!cont) { alert(msg); return; }
  const el = document.createElement('div');
  el.className = 'toast toast-' + type;
  el.textContent = msg;
  cont.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .25s, transform .25s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(() => el.remove(), 260);
  }, ms);
}
