// ============================================================
//  LIV · Sirve temporalmente las imágenes para que Instagram las descargue
//  (Instagram exige que la imagen esté en una URL pública).
//  GET /api/ig-image?key=post-....jpg  → devuelve la imagen desde Netlify Blobs.
// ============================================================
import { getStore } from '@netlify/blobs';

export default async (req) => {
  const key = new URL(req.url).searchParams.get('key');
  if (!key) return new Response('missing key', { status: 400 });
  const store = getStore('ig-temp');
  const data = await store.get(key, { type: 'arrayBuffer' });
  if (!data) return new Response('not found', { status: 404 });
  return new Response(data, {
    headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=600' }
  });
};
// URL: https://somosliv.cl/.netlify/functions/ig-image?key=...
