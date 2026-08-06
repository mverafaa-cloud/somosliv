# Guía de puesta en marcha — LIV

Sigue estos pasos en orden. El sitio ya funciona en **modo demo** sin hacer nada;
esta guía lo conecta a datos reales y lo publica en internet.

---

## 1) Firebase (base de datos + login del admin)

1. Entra a https://console.firebase.google.com → **Add project** → nómbralo `liv-liga` (o lo que prefieras).
2. **Authentication** → Get started → pestaña **Sign-in method** → habilita **Email/Password**.
3. **Authentication** → Users → **Add user**: crea tu usuario admin (ej. `max@liv.cl` + una contraseña). Repite para Diego, Mau y Lucas si quieres que administren.
   - Copia el **User UID** de cada uno (columna UID).
4. **Firestore Database** → Create database → modo **Production** → región `southamerica-west1` (Santiago) o la más cercana.
5. **Project settings** (⚙️) → General → *Your apps* → ícono **</>** (Web) → registra la app → copia el objeto `firebaseConfig`.
6. Pega esos valores en **`public/firebase-config.js`** (reemplaza los `"REEMPLAZAR"`).
7. En el mismo archivo, pon los UID del paso 3 en `window.__ADMIN_UIDS__` (para mostrar el panel solo a ustedes).
8. **Reglas de seguridad**: Firestore → pestaña **Rules** → pega el contenido de **`firestore.rules`** → **Publish**.
   - (Opcional, más seguro) dentro de `firestore.rules` cambia `isSignedIn()` por `isAdmin()` en los `write` y pega los UID en la lista de la función `isAdmin()`.

Con esto, al entrar a `/admin` podrás iniciar sesión y cargar equipos, fixture, resultados, etc.

---

## 2) Repositorio + Netlify (hosting)

1. Sube esta carpeta a un repo de GitHub (`liv` o `liga-la-cuarta`).
   ```
   git init && git add -A && git commit -m "init LIV"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/liv.git
   git push -u origin main
   ```
2. En https://app.netlify.com → **Add new site** → **Import from GitHub** → elige el repo.
3. Build settings: **Publish directory** = `public` · Build command = vacío (o `echo ok`). El `netlify.toml` ya lo define.
4. Deploy. Queda en `https://TU-SITIO.netlify.app`.
5. De ahí en adelante, cada `git push` a `main` redeploya solo.

---

## 3) Dominio somosliv.cl (NIC Chile) + Cloudflare + Netlify

El dominio se compró en **NIC Chile** (los `.cl` no se pueden registrar en Cloudflare).
Cloudflare se usa solo como **DNS**, y Netlify aloja el sitio.

**3.1 — Netlify: agregar el dominio**
- Netlify → tu sitio → **Domain management** → **Add a domain** → `somosliv.cl` → Add.
- Netlify quedará "esperando DNS externo" (normal).

**3.2 — Cloudflare: crear la zona**
- https://dash.cloudflare.com → **Add a site** → `somosliv.cl` → plan **Free**.
- Cloudflare no encontrará registros (dominio nuevo) y te dará **2 nameservers**, del tipo
  `xxxx.ns.cloudflare.com` y `yyyy.ns.cloudflare.com`. Cópialos.

**3.3 — NIC Chile: apuntar a Cloudflare**
- Panel NIC → `somosliv.cl` → **Configuración Técnica** → **Servidores DNS**
  (NO "Redireccionamiento Web") → pega los 2 nameservers de Cloudflare → Guardar.
- Propagación: 1 a 24 h (normalmente < 1 h).

**3.4 — Cloudflare: registros que apuntan a Netlify**
En Cloudflare → **DNS → Records → Add record**:

| Tipo  | Nombre | Destino                          | Proxy            |
|-------|--------|----------------------------------|------------------|
| CNAME | `@`    | `apex-loadbalancer.netlify.com`  | **DNS only** (gris) |
| CNAME | `www`  | `TU-SITIO.netlify.app`           | **DNS only** (gris) |

- Cloudflare "aplana" el CNAME en la raíz automáticamente. (Alternativa a la raíz: registro **A** `@` → `75.2.60.5`.)
- ⚠️ Deja las nubes en **GRIS (DNS only)** hasta que Netlify emita el HTTPS. Si las pones naranjas con SSL "Flexible" se producen **bucles de redirección**.

**3.5 — SSL**
- Netlify → **Domain management → HTTPS** → **Verify DNS / Provision certificate** (Let's Encrypt).
  Espera a que diga *"Your site has HTTPS enabled"*.
- (Opcional, ya con HTTPS OK) Si quieres el proxy/caché de Cloudflare: en Cloudflare **SSL/TLS → modo Full (strict)** y recién ahí pon la nube **naranja** en `www` (y en `@` si quieres).

**3.6 — Dominio principal**
- Netlify → Domain management → define `somosliv.cl` (o `www.somosliv.cl`) como **Primary domain** y activa el redirect del otro.

**3.7 — Firebase: autorizar el dominio**
- Firebase Console → **Authentication → Settings → Authorized domains** → agrega `somosliv.cl` y `www.somosliv.cl` (si no, el login del admin falla en el dominio real).

---

## 4) Cargar los datos reales

En `/admin` (ya con Firebase conectado):

1. **Equipos** → agrega los equipos de cada serie (Libre y Senior +32).
2. **Partidos** → carga el fixture (serie, fecha, hora, cancha, local, visita). Deja el estado en *Programado*.
3. Cada sábado, edita cada partido, pon el marcador y cambia el estado a **Finalizado** → la **tabla de Posiciones se actualiza sola**.
4. **Disciplina** → registra tarjetas y sanciones.
5. **Inscripciones** → acá llegan los equipos que envían el formulario de Admisión.
6. **Contenido** → edita textos (misión, sede, valor de inscripción, redes) y agrega videos de YouTube para la sección Audiovisual.

> Los datos de ejemplo (equipos "Deportivo Peñuelas", etc.) solo existen en modo demo. Al conectar Firebase, empiezas con la base vacía y cargas lo real.

---

## Checklist
```
[ ] firebase-config.js con valores reales
[ ] __ADMIN_UIDS__ con los UID de los administradores
[ ] firestore.rules publicadas en la consola
[ ] Repo en GitHub + sitio en Netlify
[ ] Dominio en Cloudflare apuntando a Netlify + HTTPS
[ ] Equipos y fixture cargados desde /admin
```
Cualquier duda, el código está comentado en español. ¡Éxito con el estreno del 29 de agosto! ⚽
