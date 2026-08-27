// ============================================================
//  LIV · Publicar en Instagram (carrusel de 2 imágenes)
//  Instagram API con inicio de sesión de Instagram (graph.instagram.com)
//
//  Recibe POST JSON: { secret, caption, images: [<base64>, <base64>] }
//  - secret: debe coincidir con la variable de entorno IG_POST_SECRET
//  - images: 1 a 10 imágenes en base64 (con o sin prefijo data:)
//  Publica como CAROUSEL si vienen 2+, o post simple si viene 1.
//
//  Variables de entorno en Netlify (Site settings → Environment):
//    IG_TOKEN        = token de acceso de @ligalacuarta   (SECRETO)
//    IG_USER_ID      = 17841443138064355
//    IG_POST_SECRET  = una clave inventada por ti (para proteger el endpoint)
//
//  Necesita la dependencia "@netlify/blobs" en package.json.
// ============================================================
import { getStore } from '@netlify/blobs';

const IG_API = 'https://graph.instagram.com/v21.0';

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }

  if (!process.env.IG_POST_SECRET || body.secret !== process.env.IG_POST_SECRET)
    return json({ error: 'unauthorized' }, 401);

  const token = process.env.IG_TOKEN;
  const igId  = process.env.IG_USER_ID;
  if (!token || !igId) return json({ error: 'missing_env_IG_TOKEN_or_IG_USER_ID' }, 500);

  const images  = body.images;
  const caption = body.caption || '';
  if (!Array.isArray(images) || images.length < 1) return json({ error: 'no_images' }, 400);

  // 1) Guardar las imágenes en Netlify Blobs y construir URLs públicas
  const store  = getStore('ig-temp');
  const origin = new URL(req.url).origin;
  const keys = [], urls = [];
  const stamp = Date.now();
  for (let i = 0; i < images.length; i++) {
    const b64 = String(images[i]).replace(/^data:image\/\w+;base64,/, '');
    const key = `post-${stamp}-${i}.jpg`;
    await store.set(key, Buffer.from(b64, 'base64'));
    keys.push(key);
    urls.push(`${origin}/.netlify/functions/ig-image?key=${encodeURIComponent(key)}`);
  }

  try {
    let creationId;
    if (urls.length === 1) {
      creationId = await createContainer({ igId, token, image_url: urls[0], caption });
    } else {
      const children = [];
      for (const u of urls)
        children.push(await createContainer({ igId, token, image_url: u, is_carousel_item: true }));
      creationId = await createCarousel({ igId, token, children, caption });
    }
    const mediaId = await publish({ igId, token, creationId });
    for (const k of keys) { try { await store.delete(k); } catch {} }
    return json({ ok: true, mediaId });
  } catch (e) {
    for (const k of keys) { try { await store.delete(k); } catch {} }
    return json({ ok: false, error: String(e && e.message || e) }, 500);
  }
};

async function createContainer({ igId, token, image_url, caption, is_carousel_item }) {
  const p = new URLSearchParams({ image_url, access_token: token });
  if (caption) p.set('caption', caption);
  if (is_carousel_item) p.set('is_carousel_item', 'true');
  const r = await fetch(`${IG_API}/${igId}/media`, { method: 'POST', body: p });
  const d = await r.json();
  if (!d.id) throw new Error('media_create: ' + JSON.stringify(d));
  return d.id;
}

async function createCarousel({ igId, token, children, caption }) {
  const p = new URLSearchParams({ media_type: 'CAROUSEL', children: children.join(','), access_token: token });
  if (caption) p.set('caption', caption);
  const r = await fetch(`${IG_API}/${igId}/media`, { method: 'POST', body: p });
  const d = await r.json();
  if (!d.id) throw new Error('carousel_create: ' + JSON.stringify(d));
  return d.id;
}

async function publish({ igId, token, creationId }) {
  let last;
  for (let i = 0; i < 8; i++) {              // reintenta: el contenedor tarda en quedar "listo"
    const p = new URLSearchParams({ creation_id: creationId, access_token: token });
    const r = await fetch(`${IG_API}/${igId}/media_publish`, { method: 'POST', body: p });
    const d = await r.json();
    if (d.id) return d.id;
    last = d;
    await new Promise(res => setTimeout(res, 3000));
  }
  throw new Error('publish: ' + JSON.stringify(last));
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}
// URL: https://somosliv.cl/.netlify/functions/ig-post
