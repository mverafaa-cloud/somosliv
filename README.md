# LIV — Liga La Cuarta

Sitio web oficial de la **LIV (Liga La Cuarta)**, liga de fútbol amateur de la Región de Coquimbo.
Mismo stack y ADN visual que lachileanpolla: **Netlify + vanilla JS + CSS variables + Firebase**, sin build step.

## Secciones
Inicio · LIV · Programación · Resultados · Posiciones · Disciplina · Reglamentos · Admisión · Audiovisual
\+ **Panel de administración** (`/admin`) para cargar equipos, partidos, resultados, disciplina, inscripciones y contenido.

## Modo demo vs. producción
- **Sin Firebase configurado** → el sitio funciona en **modo demo** con datos de ejemplo (`public/js/data/seed.js`). Ideal para ver el diseño de inmediato.
- **Con Firebase configurado** → lee y escribe datos reales desde Firestore; el panel `/admin` queda operativo.

La **tabla de Posiciones se calcula automáticamente** a partir de los resultados cargados (3 pts victoria, 1 empate; desempate por diferencia de gol y goles a favor).

## Correr en local
Doble click en **`start.bat`** (Windows) o `./start.sh` (Mac/Linux). Levanta `netlify dev` en http://localhost:8888
(la primera vez instala Netlify CLI si falta).

Alternativa rápida sin Netlify CLI:
```
cd public
python -m http.server 8888
```

## Deploy
Netlify está conectado al repo y deploya en cada `git push`:
```
git add -A
git commit -m "qué cambió"
git push
```
> Los cambios en `firestore.rules` NO se deployan con push: hay que publicarlos en Firebase Console → Firestore → Rules.

## Estructura
```
public/                    ← raíz estática (Netlify publish)
  index.html
  firebase-config.js       ← config pública de Firebase (reemplazar valores)
  css/styles.css           ← todo el CSS. Paleta LIV en el bloque :root de arriba.
  assets/                  ← logo.png, logo-white.png, logo-mark.png
  js/
    main.js                ← boot + router
    router.js
    data/seed.js           ← contenido base + datos demo
    services/store.js      ← capa de datos (Firebase + fallback demo) y cálculo de tabla
    ui/                    ← header, helpers, toast, layout
    views/                 ← una vista por sección + admin.js
firestore.rules            ← reglas de seguridad (publicar manual en consola)
netlify.toml               ← publish + redirects SPA + CSP
scripts/check-js.mjs       ← `npm run check` verifica sintaxis de todo el JS
```

## Rebrand / colores
Toda la marca vive en el bloque `:root` al inicio de `public/css/styles.css`
(`--c-brand`, `--c-accent`, etc.). Colores oficiales LIV: verde `#067a3e`, blanco `#fffefe`, oscuro `#23271f`.

Ver **SETUP_GUIDE.md** para conectar Firebase, Netlify y el dominio en Cloudflare paso a paso.
