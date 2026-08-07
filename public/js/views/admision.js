import { getConfig, addInscripcion, isDemo } from '../services/store.js';
import { mount, esc, clp } from '../ui/helpers.js';
import { shell, loading } from '../ui/layout.js';
import { toast } from '../ui/toast.js';

export async function showAdmision() {
  mount(loading());
  const config = await getConfig();

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
      </div>

      <div class="card">
        <h3 class="mb-2">Inscribe tu equipo</h3>
        <p class="muted mb-2">Déjanos tus datos y te contactamos para coordinar todo. Conversemos, ¡queremos que seas parte de esta experiencia!</p>
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
                ${(config.series || []).map(s => `<option value="${esc(s.id)}">${esc(s.nombre)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group"><label>Mensaje (opcional)</label><textarea class="textarea" name="mensaje" placeholder="Cuéntanos de tu equipo…"></textarea></div>
          <button type="submit" class="btn btn-primary btn-block btn-lg" id="btn-insc">Enviar inscripción</button>
          ${isDemo() ? '<p class="help mt-1">Modo demo: al conectar Firebase, las inscripciones se guardan y aparecen en el panel admin.</p>' : ''}
        </form>
      </div>
    </div>
  </div>`;

  mount(shell(inner, config));

  document.getElementById('form-insc')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-insc');
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    if (!data.equipo || !data.contacto || !data.telefono || !data.serie) { toast('Completa los campos obligatorios', 'error'); return; }
    btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      await addInscripcion(data);
      document.getElementById('form-insc').outerHTML = `
        <div class="alert alert-success"><strong>¡Listo!</strong> Recibimos la inscripción de <strong>${esc(data.equipo)}</strong>. Te contactaremos pronto.</div>`;
      toast('Inscripción enviada', 'success');
    } catch (err) {
      toast(err.message || 'No se pudo enviar', 'error');
      btn.disabled = false; btn.textContent = 'Enviar inscripción';
    }
  });
}
