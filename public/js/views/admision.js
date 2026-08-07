import { getConfig, addInscripcion } from '../services/store.js';
import { mount, esc, clp } from '../ui/helpers.js';
import { shell, loading } from '../ui/layout.js';
import { toast } from '../ui/toast.js';
import { icon } from '../ui/icons.js';

const encode = (obj) => Object.keys(obj).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k] ?? '')).join('&');

export async function showAdmision() {
  mount(loading());
  const config = await getConfig();
  const series = config.series || [];
  const wnum = (config.contacto?.whatsapp || '').replace(/\D/g, '');

  const inner = `
  <div class="container">
    <div class="hero-image" style="min-height:280px">
      <div class="corner-stripes"></div>
      <span class="eyebrow">Admisión ${esc(config.temporada || '2026')}</span>
      <h1 class="display">¿TIENES EQUIPO?</h1>
      <p class="script" style="font-size:1.8rem;color:#fff">¡Corre por tu lugar cuanto antes!</p>
    </div>

    <div class="grid grid-2 mt-2" style="align-items:start">
      <div>
        <div class="card card-tinted-accent mb-2">
          <span class="eyebrow" style="color:var(--c-ink)">Valor normal</span>
          <div class="price-box"><span class="amount">${clp(config.valorInscripcion || 1800000)}</span><span class="unit">Inscripción semestral por equipo</span></div>
        </div>
        <div class="card">
          <h3 class="mb-2">Requisitos</h3>
          <ul class="prose" style="margin-left:18px">
            <li>Equipos de hasta <strong>30 jugadores</strong> (11 en cancha).</li>
            <li>Uniforme completo y numerado (camiseta, short, calcetines).</li>
            <li>Lista de jugadores con datos completos (nombre, edad, número de camiseta y copia de ID).</li>
          </ul>
          <div class="divider"></div>
          <p class="muted"><strong>Categorías:</strong> Junior (18+) y Senior (+32). Cupos limitados: 8 a 10 equipos por serie.</p>
        </div>
        ${(wnum || config.contacto?.email) ? `
        <div class="card mt-2">
          <h4 class="mb-1">¿Prefieres escribirnos directo?</h4>
          <div class="row">
            ${wnum ? `<a href="https://wa.me/${wnum}" target="_blank" rel="noopener" class="btn btn-success btn-sm">${icon('phone', { size: 16 })} WhatsApp</a>` : ''}
            ${config.contacto?.email ? `<a href="mailto:${esc(config.contacto.email)}" class="btn btn-ghost btn-sm">${icon('mail', { size: 16 })} ${esc(config.contacto.email)}</a>` : ''}
          </div>
        </div>` : ''}
      </div>

      <div class="card">
        <h3 class="mb-2">Inscribe tu equipo</h3>
        <p class="muted mb-2">Déjanos tus datos y te contactamos para coordinar todo. Al enviar, te damos la opción de mandarnos también un WhatsApp con tus datos listos.</p>
        <form id="form-insc">
          <div class="form-group"><label>Nombre del equipo *</label><input class="input" name="equipo" required></div>
          <div class="form-row">
            <div class="form-group"><label>Nombre del contacto *</label><input class="input" name="contacto" required></div>
            <div class="form-group"><label>Teléfono / WhatsApp *</label><input class="input" name="telefono" required inputmode="tel"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Email</label><input class="input" name="email" type="email"></div>
            <div class="form-group"><label>Serie *</label>
              <select class="select" name="serie" required>
                <option value="">Selecciona…</option>
                ${series.map(s => `<option value="${esc(s.nombre)}">${esc(s.nombre)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group"><label>Mensaje (opcional)</label><textarea class="textarea" name="mensaje" placeholder="Cuéntanos de tu equipo…"></textarea></div>
          <button type="submit" class="btn btn-primary btn-block btn-lg" id="btn-insc">Enviar inscripción</button>
        </form>
      </div>
    </div>
  </div>`;

  mount(shell(inner, config));

  document.getElementById('form-insc')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-insc');
    const data = Object.fromEntries(new FormData(e.target).entries());
    if (!data.equipo || !data.contacto || !data.telefono || !data.serie) { toast('Completa los campos obligatorios', 'error'); return; }
    btn.disabled = true; btn.textContent = 'Enviando…';

    // 1) Enviar por Netlify Forms (llega al email configurado)
    let mailOk = false;
    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encode({ 'form-name': 'inscripcion', 'bot-field': '', ...data })
      });
      mailOk = res.ok;
    } catch (_) { /* sin conexión Netlify (ej. local): seguimos con WhatsApp */ }

    // 2) Guardar en Firestore si está configurado (para el panel admin)
    try { await addInscripcion(data); } catch (_) {}

    // 3) Link de WhatsApp prellenado
    const texto = `Hola LIV 👋 Quiero inscribir a mi equipo "${data.equipo}" en la Serie ${data.serie}.\n` +
      `Contacto: ${data.contacto}\nTeléfono: ${data.telefono}` +
      (data.email ? `\nEmail: ${data.email}` : '') +
      (data.mensaje ? `\nMensaje: ${data.mensaje}` : '');
    const wlink = wnum ? `https://wa.me/${wnum}?text=${encodeURIComponent(texto)}` : '';

    document.getElementById('form-insc').outerHTML = `
      <div class="card card-tinted-mint">
        <h3 style="color:var(--c-green-deep)">¡Inscripción recibida!</h3>
        <p class="mt-1">Registramos los datos de <strong>${esc(data.equipo)}</strong>${mailOk ? ' y te enviamos una copia por correo' : ''}. Para agilizar, mándanos también un WhatsApp con tus datos ya cargados:</p>
        ${wlink ? `<a href="${wlink}" target="_blank" rel="noopener" class="btn btn-success btn-block btn-lg mt-2">${icon('phone', { size: 18 })} Enviar por WhatsApp</a>` : ''}
        <p class="muted mt-2" style="font-size:.88rem">Te contactaremos a la brevedad. ¡Nos vemos en la cancha!</p>
      </div>`;
    toast('Inscripción enviada', 'success');

    // Abrir WhatsApp automáticamente (si el navegador lo permite)
    if (wlink) { try { window.open(wlink, '_blank'); } catch (_) {} }
  });
}
