// ═══════════════════════════════════════════════════════════════════════
//  /inventa  —  Cloudflare Pages Function (vive en functions/inventa.js)
//
//  La madre escribe su idea en el Party Studio → esta función se la pide a
//  fal.ai (FLUX schnell) con una PLANTILLA FIJA de acuarela, como las 20
//  láminas de la web, y devuelve la imagen YA DESCARGADA (mismo origen):
//  así el cartel se puede pintar en un <canvas> sin problemas de CORS.
//
//  Secretos y topes (se ponen en Cloudflare → Pages → proyecto → Settings):
//    FAL_KEY        (secreto)  clave de fal.ai — nunca va en la página
//    INVENTA_KV     (binding)  KV opcional para el tope diario
//    INVENTA_MAX    (variable) tope de imágenes/día, por defecto 120
//
//  Sin FAL_KEY la función responde 503 con un mensaje claro: la página lo
//  enseña y no se queda colgada.
// ═══════════════════════════════════════════════════════════════════════

const PLANTILLA =
  'Soft pastel watercolour illustration for a children\'s birthday party backdrop, ' +
  'portrait. Pastel balloons in the top corners, scattered confetti and gold foil ' +
  'speckles, light rays from above. Theme objects, animals and scenery of: {IDEA}. ' +
  'Bottom third: an empty cream parchment area with a thin ornamental gold line frame ' +
  'and small flourishes in the corners, left blank for a name. Delicate hand-painted ' +
  'watercolour texture, cream paper background, gold accents, dreamy and elegant. ' +
  'No people, no faces, no children, no text, no letters, no watermark.';

// Lo que NO puede pedir una madre (se ignora, no se bloquea): palabras que
// llevarían al generador a pintar personas o cosas que no pintamos.
const QUITAR = /\b(ni[ñn][oa]s?|nens?|nenas?|kids?|children|child|beb[ée]s?|baby|cara|face|persona|people|foto|photo|realista|realistic|texto|text|letras)\b/gi;

function limpiar(idea){
  return String(idea || '')
    .replace(/[<>{}\[\]`$]/g, ' ')      // nada que parezca código
    .replace(QUITAR, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function hoy(){ return new Date().toISOString().slice(0, 10); }

export async function onRequestPost(context){
  const { request, env } = context;
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

  if(!env.FAL_KEY){
    return json({ error: 'sin_clave', mensaje: 'Falta FAL_KEY en Cloudflare: el dibujo automático está apagado.' }, 503);
  }

  let body = {};
  try { body = await request.json(); } catch(_) {}
  const idea = limpiar(body.idea);
  if(idea.length < 3) return json({ error: 'idea_vacia', mensaje: 'Escribe tu idea (3 letras como mínimo).' }, 400);

  // ── Tope diario (si hay KV): nadie puede vaciar el saldo en una tarde ──
  const max = parseInt(env.INVENTA_MAX || '120', 10);
  if(env.INVENTA_KV){
    const k = 'inventa:' + hoy();
    const n = parseInt((await env.INVENTA_KV.get(k)) || '0', 10);
    if(n >= max) return json({ error: 'tope', mensaje: 'Hoy ya se han dibujado muchas fiestas. Escríbenos tu idea por WhatsApp y te la dibujamos nosotros.' }, 429);
    await env.INVENTA_KV.put(k, String(n + 1), { expirationTtl: 60 * 60 * 36 });
  }

  // ── fal.ai · FLUX schnell · API de COLA (la documentada): enviar → esperar → recoger ──
  //    Cabecera confirmada en fal.ai/docs/model-apis/model-endpoints/queue:
  //    "Authorization: Key $FAL_KEY" · host queue.fal.run · schnell tarda ~2-4 s.
  const H = { 'Authorization': 'Key ' + env.FAL_KEY, 'Content-Type': 'application/json' };
  const prompt = PLANTILLA.replace('{IDEA}', idea);
  const fail = (code, mensaje, detalle) => json({ error: code, mensaje, detalle: (detalle || '').slice(0, 200) }, 502);
  let sub;
  try {
    sub = await fetch('https://queue.fal.run/fal-ai/flux/schnell', {
      method: 'POST', headers: H,
      body: JSON.stringify({
        prompt,
        image_size: { width: 832, height: 1120 },   // misma proporción 3:4 que las 20 láminas (821×1100)
        num_images: 1,
        num_inference_steps: 4,
        enable_safety_checker: true,
        output_format: 'jpeg'
      })
    });
  } catch(e){ return fail('red', 'No se ha podido contactar con el dibujante. Prueba otra vez.'); }
  if(!sub.ok) return fail('fal_' + sub.status, 'El dibujante ha fallado (' + sub.status + ').', await sub.text().catch(() => ''));
  const job = await sub.json().catch(() => null);
  if(!job || !job.status_url || !job.response_url) return fail('cola', 'El dibujante no ha aceptado el encargo.');

  // esperar como mucho ~25 s (schnell suele tardar 2-4)
  let listo = false;
  for(let i = 0; i < 25 && !listo; i++){
    await new Promise(r => setTimeout(r, 1000));
    const st = await fetch(job.status_url, { headers: H }).then(r => r.json()).catch(() => null);
    if(!st) continue;
    if(st.status === 'COMPLETED') listo = true;
    else if(st.status === 'FAILED' || st.status === 'CANCELLED') return fail('fal_estado', 'El dibujante ha fallado (' + st.status + ').');
  }
  if(!listo) return fail('tiempo', 'El dibujante tarda demasiado. Prueba otra vez en un momento.');

  const data = await fetch(job.response_url, { headers: H }).then(r => r.json()).catch(() => null);
  const url = data && data.images && data.images[0] && data.images[0].url;
  if(!url) return fail('sin_imagen', 'El dibujante no ha devuelto ninguna imagen.');

  // ── La imagen vuelve por AQUÍ (mismo origen) para que el <canvas> del cartel pueda usarla ──
  const img = await fetch(url);
  if(!img.ok) return json({ error: 'descarga', mensaje: 'No se ha podido descargar el dibujo.' }, 502);
  const tipo = img.headers.get('content-type') || 'image/jpeg';
  return new Response(img.body, {
    status: 200,
    headers: {
      'content-type': tipo,
      'cache-control': 'private, max-age=86400',
      'x-inventa-idea': encodeURIComponent(idea)
    }
  });
}

export async function onRequestGet(){
  return new Response('Usa POST con {"idea":"..."}', { status: 405 });
}
