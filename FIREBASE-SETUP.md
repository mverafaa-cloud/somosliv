# Activar Firebase en LIV — guía paso a paso

Con Firebase, el sitio deja el modo demo y pasa a **guardar datos de verdad**: publicas el fixture y los planilleros cargan resultados/tarjetas que se ven al instante para todos.

Todo el código ya está listo. Solo faltan estos pasos en la consola de Firebase (una vez).

---

## 1. Crear el proyecto

1. Entra a **https://console.firebase.google.com** con tu cuenta Google.
2. **Agregar proyecto** → nombre: `LIV` (o el que quieras) → crear. (Analytics: opcional, puedes desactivarlo.)

## 2. Crear la base de datos (Firestore)

1. Menú izquierdo → **Build → Firestore Database** → **Crear base de datos**.
2. Modo: **Producción**. Ubicación: `southamerica-east1` (o la más cercana). Habilitar.

## 3. Activar el login (Authentication)

1. **Build → Authentication → Comenzar**.
2. Pestaña **Sign-in method** → habilita **Correo electrónico/contraseña** → Guardar.
3. Pestaña **Users → Agregar usuario**. Crea **dos** cuentas:
   - **Tu cuenta admin**: tu email + una contraseña.
   - **Cuenta planillero (compartida)**: p. ej. `planillero@somosliv.cl` + una contraseña (esta la comparten todos los planilleros).
4. Copia el **UID** de tu cuenta admin (columna "User UID", botón de copiar). Lo necesitas en los pasos 5 y 6.

## 4. Obtener la configuración web

1. Rueda dentada (arriba izq.) → **Configuración del proyecto**.
2. Baja a **Tus apps** → icono **web `</>`** → registra la app (nombre "LIV web"). **No** actives Hosting.
3. Firebase te muestra un objeto `firebaseConfig` con `apiKey`, `authDomain`, `projectId`, etc. Déjalo a mano.

## 5. Pegar la configuración en el proyecto

Edita el archivo **`public/firebase-config.js`** y reemplaza los valores:

```js
window.__FIREBASE_CONFIG__ = {
  apiKey: "AIza…",                        // ← del paso 4
  authDomain: "liv-xxxx.firebaseapp.com",
  projectId: "liv-xxxx",
  storageBucket: "liv-xxxx.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};

window.__ADMIN_UIDS__ = [
  "PEGA_AQUI_EL_UID_DE_TU_CUENTA_ADMIN"   // ← del paso 3.4
];
```

## 6. Pegar las reglas de seguridad

1. Abre el archivo **`firestore.rules`** (en la raíz del proyecto). Reemplaza `REEMPLAZAR_UID_ADMIN` por tu **UID admin** (el mismo del paso 5).
2. En la consola: **Firestore Database → Rules** → pega **todo** el contenido de `firestore.rules` → **Publicar**.

## 7. Publicar

```
git add -A
git commit -m "Activar Firebase"
git push
```
Purga la caché de Cloudflare. Listo: el sitio ya está conectado (verás "Conectado" en el panel, no "DEMO").

---

## Cómo se usa después

- **Tú (admin)** entras en `/admin` con tu email/contraseña (o con el respaldo **Admin / LIV.2026**). Tienes todo: Sorteo, Resultados, Partidos, Equipos, Disciplina, Inscripciones, Contenido.
- **Publicar el fixture**: en **Sorteo Fixture**, cuando estés conforme, botón **Publicar en la web** → queda grabado en la base y aparece en **Programación** para todos.
- **Planilleros** entran en `/admin` con la cuenta compartida. Solo ven **Resultados** y **Disciplina**: cargan el marcador de cada partido (queda *finalizado* y actualiza Resultados y Posiciones al instante) y registran tarjetas.
- **Inscripciones**: los envíos del formulario de Admisión llegan a la base y los ves en el panel.

## Notas

- El `firebase-config.js` es **público** (no es secreto); puede ir en el repo. La seguridad la dan las **reglas** del paso 6.
- Si vuelves a publicar un sorteo nuevo, se reemplaza el calendario pero **se conservan los marcadores** ya cargados.
- El acceso **Admin / LIV.2026** sigue funcionando como respaldo por si algún día falla el login de Firebase.
