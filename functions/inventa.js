// ═══════════════════════════════════════════════════════════════════════
//  /inventa  —  Cloudflare Pages Function (vive en functions/inventa.js)
//
//  La madre escribe su idea en el Party Studio → esta función se la pide a
//  fal.ai (FLUX schnell) con una PLANTILLA FIJA de acuarela, como las 20
//  láminas de la web, y devuelve la imagen YA DESCARGADA (mismo origen):
//  así el cartel se puede pintar en un <canvas> sin problemas de CORS.
//
//  Antes de dibujar, un modelo de texto pequeño (fal · OpenRouter, la misma
//  FAL_KEY, < 0,001 $ por idea) pasa la idea a inglés y a cosas pintables:
//  FLUX solo entiende inglés — con "dragones y fuego" ESCRIBÍA las palabras en
//  vez de dibujarlas (comprobado en vivo el 2026-10-31). Si falla, va tal cual.
//
//  Secretos y topes (se ponen en Cloudflare → Pages → proyecto → Settings):
//    FAL_KEY        (secreto)  clave de fal.ai — nunca va en la página
//    INVENTA_KV     (binding)  KV con los contadores del día — OBLIGATORIO
//    INVENTA_MAX    (variable) tope de imágenes/día entre todos, por defecto 50
//
//  Topes (decididos con Barbara el 2026-10-31): sin móvil no se dibuja,
//  3 dibujos por móvil y día, 10 por conexión (por si alguien va cambiando
//  de móvil) y 50 al día entre todos (≈ 15 céntimos). Sin INVENTA_KV no se
//  dibuja nada: sin contadores no hay topes, y no se deja el saldo abierto.
//
//  Sin FAL_KEY la función responde 500 con un mensaje claro: la página lo
//  enseña y no se queda colgada.
//
//  ⚠️ Los errores van SIEMPRE con estado 500, nunca 502/503/504: Cloudflare
//  sustituye esos tres por su propia página ("error code: 502") y se pierde
//  el JSON con el motivo (comprobado en vivo el 2026-10-30).
// ═══════════════════════════════════════════════════════════════════════

// Ojo: aquí NO se habla de "nombre", "texto" ni "letras": al leerlo, FLUX se
// inventaba un nombre en el hueco crema ("Iminien", 2026-10-31).
// Escena en la mitad de ARRIBA y crema vacía en la de abajo, como las 20 láminas: el
// nombre se pinta al 74 % de alto (party-studio.html, ty 0.74) y tiene que caer en limpio.
// Con "en el centro" los unicornios salían casi en blanco y el dragón, abajo (2026-10-31).
// Sin la palabra "birthday": con ella FLUX escribía «Happy Birthday» arriba (Frozen, 2026-10-31).
const PLANTILLA =
  'Pastel watercolour backdrop for a children\'s party, portrait. The upper half ' +
  'is a detailed, cheerful scene of {TEMA}, with pastel balloons and gold confetti around it. ' +
  'The lower half is plain, empty cream paper that softly blends into the scene above, ' +
  'with delicate watercolour leaves and flowers only in the two bottom corners. A thin gold ' +
  'border runs around the edge. Hand-painted watercolour texture, gold accents, dreamy and ' +
  'elegant. No people, no faces.';

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

// Móvil → forma única: «600 11 22 33», «+34600112233» y «0034 600…» cuentan como el mismo.
// En España, móvil = 9 cifras empezando por 6 o 7 (los fijos 8/9 no: no tienen WhatsApp);
// de fuera, + y 8 a 15 cifras.
function telValido(t){
  let s = String(t || '').replace(/[\s().-]/g, '');
  if(s.startsWith('00')) s = '+' + s.slice(2);
  if(/^34[67]\d{8}$/.test(s)) s = '+' + s;
  if(/^\+34[67]\d{8}$/.test(s)) return s;
  if(/^[67]\d{8}$/.test(s)) return '+34' + s;
  if(/^\+(?!34)[1-9]\d{7,14}$/.test(s)) return s;
  return null;
}

// El contador no guarda el móvil ni la IP tal cual, solo una huella que no se puede deshacer
// (mezclada con la FAL_KEY, que nadie más tiene).
async function huella(env, txt){
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(env.FAL_KEY + '|' + txt));
  return [...new Uint8Array(h).slice(0, 12)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const POR_MOVIL = 3;        // si cambia, cambiar también el «3» de inv_tel_lab e inv_lim (party-studio.html, ES/CA/EN)
const POR_CONEXION = 10;

// ── La idea → inglés y cosas que se pueden pintar (personajes y marcas → cosas genéricas) ──
// El primer elemento es el protagonista (si no, el unicornio se perdía entre nubes), y nada
// oscuro: "starry night sky" o "black" volvían la lámina azul marino (2026-10-31).
const TRADUCTOR =
  'You turn a parent\'s idea for a child\'s birthday party (it may be written in Spanish, ' +
  'Catalan or English) into a short English list of things to paint in a cute pastel ' +
  'watercolour party backdrop. Rules: English only; 3 to 6 items separated by commas, 25 words ' +
  'at most; the first item is the main subject the child loves (an animal, creature, vehicle ' +
  'or object), painted cute and friendly; the other items are things from its world (places, ' +
  'plants, food, weather); keep the colours the parent mentions and add no dark colours; ' +
  'nothing scary and no night scenes unless the parent asks for them; never write the name of ' +
  'a character, brand, film, game or famous person: replace it with generic things that evoke ' +
  'it (for example "Frozen" becomes "a sparkling ice castle, snowflakes, snowy mountains", ' +
  '"Spiderman" becomes "a red and blue spider web, city rooftops, a sunny sky" and "Mickey ' +
  'Mouse" becomes "a cute little grey mouse, red and yellow balloons, polka dots"); never people, faces, ' +
  'names, words, letters or numbers. Reply with the list only.';
// Sin ejemplo de unicornio: el modelo lo copiaba y con «Frozen» salió un unicornio (2026-10-31).
// Se prueban por orden: si uno no responde, el siguiente. Todos cuestan céntimos de céntimo.
const MODELOS = ['google/gemini-2.5-flash-lite', 'openai/gpt-4o-mini', 'anthropic/claude-haiku-4.5'];

// Lo que vuelve del traductor: solo letras inglesas, comas y espacios, y sin personas por si acaso.
const SIN_GENTE = /\b(girls?|boys?|kids?|child(ren)?|bab(y|ies)|people|persons?|faces?|m[ae]n|wom[ae]n|princess(es)?|names?|text|letters?|words?)\b/gi;
// Personajes con dueño (Disney, Marvel…): si el traductor se salta la norma, se prueba el
// siguiente modelo, y en el plan B se quitan de la idea. Con «un niño con mickey mouse» salió
// "A cute Mickey Mouse" y FLUX pintó el Mickey de Disney tal cual (2026-10-31).
const MARCAS = /\b(mickey|minnie|disney|pixar|marvel|elsa|olaf|spider[\s-]?man|batman|superman|hulk|iron[\s-]?man|avengers|vengadores|paw\s?patrol|patrulla\s+canina|peppa|pok[eé]mon|pikachu|bluey|barbie|sonic|mario|luigi|minecraft|fortnite|roblox|hello\s?kitty|mc\s?queen|toy\s?story|stitch|moana|vaiana|ariel|cenicienta|cinderella|rapunzel|blancanieves|harry\s?potter|star\s?wars|encanto|gabby|pocoy[oó]?|doraemon|minions?|my\s?little\s?pony|cocomelon|baby\s?shark|pj\s?masks|nemo|simba|winnie|snoopy)(?![a-z0-9])/i;   // no \b al final: con «Pocoyó» dejaba la «ó»
function limpiarTema(t){
  if(MARCAS.test(String(t || ''))) return null;
  const s = String(t || '').split('\n')[0]
    .replace(/[^A-Za-z ,'-]/g, ' ')
    .replace(SIN_GENTE, ' ')
    .replace(/\s*,[\s,]*/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,]+|[\s,]+$/g, '')
    .slice(0, 200);
  const n = s.split(/[\s,]+/).filter(Boolean).length;
  return (n >= 1 && n <= 35 && !/\b(sorry|cannot|unable)\b/i.test(s)) ? s : null;
}

async function aIngles(idea, H){
  const fin = Date.now() + 8000;                       // entre todos los intentos, como mucho ~8 s
  for(const model of MODELOS){
    if(Date.now() > fin) break;
    try{
      const sub = await fetch('https://queue.fal.run/openrouter/router', {
        method: 'POST', headers: H,
        body: JSON.stringify({ model, system_prompt: TRADUCTOR, prompt: idea, temperature: 0.2, max_tokens: 60 })
      });
      if(!sub.ok) continue;
      const job = await sub.json().catch(() => null);
      if(!job || !job.status_url || !job.response_url) continue;
      let st = null;
      while(Date.now() < fin){
        await new Promise(r => setTimeout(r, 300));
        st = await fetch(job.status_url, { headers: H }).then(r => r.json()).catch(() => null);
        if(st && /^(COMPLETED|FAILED|CANCELLED|ERROR)$/.test(st.status)) break;
      }
      if(!st || st.status !== 'COMPLETED') continue;
      const out = await fetch(job.response_url, { headers: H }).then(r => r.json()).catch(() => null);
      const tema = limpiarTema(out && !out.error && out.output);
      if(tema) return tema;
    }catch(_){}
  }
  return null;
}

export async function onRequestPost(context){
  const { request, env } = context;
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

  if(!env.FAL_KEY){
    return json({ error: 'sin_clave', mensaje: 'Falta FAL_KEY en Cloudflare: el dibujo automático está apagado.' }, 500);
  }

  let body = {};
  try { body = await request.json(); } catch(_) {}
  const idea = limpiar(body.idea);
  if(idea.length < 3) return json({ error: 'idea_vacia', mensaje: 'Escribe tu idea (3 letras como mínimo).' }, 400);

  // ── Sin móvil no se dibuja (Barbara, 2026-10-31) ──
  const tel = telValido(body.tel);
  if(!tel) return json({ error: 'tel', mensaje: 'Escribe tu móvil para que te la dibujemos.' }, 400);

  // ── Topes del día: por móvil, por conexión y entre todos. Sin KV no hay contadores → no se dibuja ──
  const KV = env.INVENTA_KV;
  if(!KV) return json({ error: 'sin_kv', mensaje: 'El dibujo automático está en pausa. Escríbenos tu idea por WhatsApp y te la dibujamos nosotros.' }, 500);
  const dia = hoy();
  const claves = [
    'inventa:' + dia,
    'inventa:tel:' + dia + ':' + await huella(env, tel),
    'inventa:ip:' + dia + ':' + await huella(env, request.headers.get('CF-Connecting-IP') || 'sin-ip')
  ];
  const [nTotal, nMovil, nRed] = (await Promise.all(claves.map(k => KV.get(k)))).map(v => parseInt(v || '0', 10) || 0);
  if(nMovil >= POR_MOVIL) return json({ error: 'limite', mensaje: 'Ya has hecho ' + POR_MOVIL + ' dibujos hoy. Mañana puedes hacer más, o escríbenos por WhatsApp.' }, 429);
  if(nRed >= POR_CONEXION) return json({ error: 'limite_conexion', mensaje: 'Desde esta conexión ya se han hecho muchos dibujos hoy. Escríbenos tu idea por WhatsApp y te la dibujamos nosotros.' }, 429);
  if(nTotal >= parseInt(env.INVENTA_MAX || '50', 10)) return json({ error: 'tope', mensaje: 'Hoy ya se han dibujado muchas fiestas. Escríbenos tu idea por WhatsApp y te la dibujamos nosotros.' }, 429);
  // Se apunta ANTES de dibujar: diez clics seguidos no se cuelan mientras el primero aún dibuja.
  const TTL = { expirationTtl: 60 * 60 * 36 };
  await Promise.all(claves.map((k, i) => KV.put(k, String([nTotal, nMovil, nRed][i] + 1), TTL)));
  // Si al final no hay dibujo, el intento no cuenta (con fal sin saldo, nadie se queda sin sus 3).
  const devolver = () => Promise.all(claves.map(async k => {
    const n = parseInt((await KV.get(k)) || '0', 10) || 0;
    if(n > 0) await KV.put(k, String(n - 1), TTL);
  })).catch(() => {});

  // ── fal.ai · FLUX schnell · API de COLA (la documentada): enviar → esperar → recoger ──
  //    Cabecera confirmada en fal.ai/docs/model-apis/model-endpoints/queue:
  //    "Authorization: Key $FAL_KEY" · host queue.fal.run · schnell tarda ~2-4 s.
  const H = { 'Authorization': 'Key ' + env.FAL_KEY, 'Content-Type': 'application/json' };
  const tema = (await aIngles(idea, H))               // FLUX solo entiende inglés
            || idea.replace(new RegExp(MARCAS.source, 'gi'), ' ').replace(/\s+/g, ' ').trim()
            || 'pastel balloons, stars and flowers';
  const prompt = PLANTILLA.replace('{TEMA}', tema);
  const fail = async (code, mensaje, detalle) => {
    await devolver();
    return json({ error: code, mensaje, detalle: (detalle || '').slice(0, 200) }, 500);
  };
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
  const img = await fetch(url).catch(() => null);
  if(!img || !img.ok) return fail('descarga', 'No se ha podido descargar el dibujo.');
  const tipo = img.headers.get('content-type') || 'image/jpeg';
  return new Response(img.body, {
    status: 200,
    headers: {
      'content-type': tipo,
      'cache-control': 'private, max-age=86400',
      'x-inventa-idea': encodeURIComponent(idea),
      'x-inventa-tema': encodeURIComponent(tema),
      'x-inventa-quedan': String(Math.max(0, POR_MOVIL - nMovil - 1))   // dibujos que le quedan hoy a ese móvil
    }
  });
}

export async function onRequestGet(){
  return new Response('Usa POST con {"idea":"..."}', { status: 405 });
}
