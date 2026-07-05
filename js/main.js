/* ╔══════════════════════════════════════════════════════════════╗
   ║  TABLÓN DE LA SEMANA  —  EDITA SOLO ESTO CADA SEMANA  👇        ║
   ║  · titulo : la frase de arriba del tablón                      ║
   ║  · cosas  : una línea por novedad (emoji + texto).             ║
   ║             pon **negrita** con <b>...</b>. Añade o quita las  ║
   ║             que quieras (1, 2, 3...).                          ║
   ║  · boton  : texto del botón rosa                               ║
   ╚══════════════════════════════════════════════════════════════╝ */
var TABLON = {
  etiqueta: '🔥 ¡Plazas limitadas!',
  titulo: '¡Llega el <em>verano</em>!',
  cosas: [
    { emo:'☀️', titulo:'Summer Camp', detalle:'Juegos, amigos y aventuras hasta la 1ª semana de septiembre' }
  ],
  gancho: 'Días completos de diversión · grupos reducidos · ¡reserva ya tu semana!',
  boton: 'Reserva tu plaza →'
};
(function(){
  var board = document.querySelector('.hero-board');
  if (!board) return;
  var k = board.querySelector('.hb-kicker'); if (k && TABLON.etiqueta) k.textContent = TABLON.etiqueta;
  var t = board.querySelector('.hb-title'); if (t) t.innerHTML = TABLON.titulo;
  var ga = board.querySelector('.hb-gancho');
  if (ga){ if (TABLON.gancho){ ga.textContent = TABLON.gancho; } else { ga.style.display = 'none'; } }
  var g = board.querySelector('.hb-go'); if (g) g.textContent = TABLON.boton;

  var stage = board.querySelector('.hb-stage');
  var dots  = board.querySelector('.hb-dots');
  if (!stage) return;
  var items = TABLON.cosas;

  var item = stage.querySelector('.hb-item');
  var emo  = item.querySelector('.hb-emo');
  var txt  = item.querySelector('.hb-txt');
  // etiqueta sobre el globo del hero: muestra la oferta de la semana
  var tagEmo = document.querySelector('.balloon-tag .balloon-tag-emo');
  var tagTxt = document.querySelector('.balloon-tag .balloon-tag-txt');
  // los puntitos solo tienen sentido si hay más de una novedad
  if (dots) dots.style.display = (items.length > 1) ? 'flex' : 'none';
  if (dots && items.length > 1) dots.innerHTML = items.map(function(){ return '<span></span>'; }).join('');
  var elDots = (dots && items.length > 1) ? dots.querySelectorAll('span') : [];

  var i = 0;
  function paint(n){
    var c = items[n];
    emo.textContent = c.emo;
    txt.innerHTML = '<b>'+c.titulo+'</b>'+c.detalle;
    if (tagEmo) tagEmo.textContent = c.emo;
    if (tagTxt) tagTxt.textContent = c.titulo;
    for (var k=0;k<elDots.length;k++){ elDots[k].classList.toggle('on', k===n); }
  }
  paint(0);
  if (items.length > 1){
    setInterval(function(){
      // sale el actual hacia la izquierda
      item.style.transition = 'opacity .3s ease, transform .3s ease';
      item.style.opacity = '0';
      item.style.transform = 'translateX(-34px)';
      setTimeout(function(){
        i = (i+1)%items.length; paint(i);
        // coloca el siguiente a la derecha (sin animar) y luego lo desliza a su sitio
        item.style.transition = 'none';
        item.style.transform = 'translateX(34px)';
        void item.offsetWidth;                     // fuerza el repintado
        item.style.transition = 'opacity .35s ease, transform .35s ease';
        item.style.opacity = '1';
        item.style.transform = 'translateX(0)';
      }, 300);
    }, 4000);
  }
})();

// reveal on scroll
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.12,rootMargin:'0px 0px -8% 0px'});
document.querySelectorAll('[data-rv]').forEach(function(el){io.observe(el);});

// nav scrolled + progress bar
var hdr=document.getElementById('hdr'),prog=document.getElementById('prog');
function onScroll(){var y=window.scrollY||0;if(hdr)hdr.classList.toggle('scrolled',y>30);if(prog){var h=document.documentElement.scrollHeight-window.innerHeight;prog.style.width=(h>0?(y/h*100):0)+'%';}}
window.addEventListener('scroll',onScroll,{passive:true});onScroll();

// mobile menu
var nav=document.getElementById('nav');
document.querySelectorAll('.navlinks a').forEach(function(a){a.addEventListener('click',function(){if(nav)nav.classList.remove('open');});});

// hero parallax
var hv=document.querySelector('.hero-visual');
window.addEventListener('scroll',function(){if(window.innerWidth>900&&hv){hv.style.transform='translateY('+(window.scrollY*0.06)+'px)';}},{passive:true});

// card tilt
document.querySelectorAll('.zona,.pcard').forEach(function(c){
  c.addEventListener('mousemove',function(e){var r=c.getBoundingClientRect();var x=(e.clientX-r.left)/r.width-.5;var y=(e.clientY-r.top)/r.height-.5;c.style.transform='translateY(-8px) perspective(700px) rotateX('+(-y*5)+'deg) rotateY('+(x*5)+'deg)';});
  c.addEventListener('mouseleave',function(){c.style.transform='';});
});

// gallery lightbox
var lb=document.getElementById('lightbox');
if(lb){var lbimg=lb.querySelector('img');
  document.querySelectorAll('.gal img').forEach(function(im){im.addEventListener('click',function(){lbimg.src=im.src;lb.classList.add('on');});});
  lb.addEventListener('click',function(){lb.classList.remove('on');});
}

// youtube facade (carga el iframe al pulsar)
var yt=document.getElementById('ytvideo');
if(yt){yt.addEventListener('click',function(){
  var id=yt.getAttribute('data-yt');
  if(!id||id==='YOUR_VIDEO_ID'){ alert('Pega aquí el enlace de tu vídeo de YouTube 🙂'); return; }
  yt.innerHTML='<iframe src="https://www.youtube.com/embed/'+id+'?autoplay=1&rel=0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>';
});}

// boletín (suscripción) — abre el correo; luego conectamos Mailchimp/Brevo
function suscribirBoletin(e){e.preventDefault();var em=document.getElementById('news-email').value;
  window.location.href='mailto:kidsandkafe@gmail.com?subject=Suscripción al boletín&body=Quiero suscribirme al boletín: '+encodeURIComponent(em);
  return false;}

// Botón flotante "Reservar" (en todas las páginas)
(function(){
  var rf=document.createElement('a');
  rf.href = (location.pathname.indexOf('contacto')>-1) ? '#app' : 'contacto.html#app';
  rf.className='reserve-float';
  rf.innerHTML='📅 Reservar';
  rf.setAttribute('aria-label','Reservar');
  document.body.appendChild(rf);
})();

// El globo del hero reacciona al ratón (parallax suave)
(function(){
  var hero=document.querySelector('.hero'), balloon=document.querySelector('.balloon');
  if(!hero||!balloon||window.innerWidth<=900) return;
  hero.addEventListener('mousemove',function(e){
    var r=hero.getBoundingClientRect();
    var x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
    balloon.style.transition='transform .25s ease-out';
    balloon.style.transform='translate('+(x*30)+'px,'+(y*22)+'px) rotate('+(x*5)+'deg)';
  });
  hero.addEventListener('mouseleave',function(){ balloon.style.transition='transform .6s ease'; balloon.style.transform=''; });
})();

/* ╔══════════════════════════════════════════════════════════════╗
   ║  COOKIES + LEGAL  —  banner de consentimiento + enlaces pie    ║
   ║  · Bloquea el mapa de Google hasta que el usuario acepta.      ║
   ║  · Aislado en su propio try/catch: si algo fallara, el resto   ║
   ║    de la web sigue funcionando igual.                          ║
   ║  · Sin innerHTML: todo se construye con métodos DOM seguros.   ║
   ╚══════════════════════════════════════════════════════════════╝ */
(function(){
  try {
    var KEY='kk_cookie_consent';
    // idioma según carpeta (/ca/ /en/); prefijo para enlazar a las páginas legales (solo existen en la raíz)
    var p=location.pathname;
    var lang = /\/en\//.test(p) ? 'en' : (/\/ca\//.test(p) ? 'ca' : 'es');
    var pre  = (lang==='es') ? '' : '../';
    var T = {
      es:{ txt:'Usamos cookies técnicas necesarias y, solo si aceptas, contenido de Google Maps.', more:'Política de cookies', ok:'Aceptar', no:'Solo necesarias', legal:['Aviso legal','Privacidad','Cookies'], mapTxt:'Para ver el mapa, acepta las cookies de Google Maps.', mapBtn:'Ver el mapa', mapLink:'Abrir en Google Maps' },
      ca:{ txt:'Fem servir galetes tècniques necessàries i, només si acceptes, contingut de Google Maps.', more:'Política de galetes', ok:'Acceptar', no:'Només necessàries', legal:['Avís legal','Privadesa','Galetes'], mapTxt:'Per veure el mapa, accepta les galetes de Google Maps.', mapBtn:'Veure el mapa', mapLink:'Obrir a Google Maps' },
      en:{ txt:'We use necessary technical cookies and, only if you accept, Google Maps content.', more:'Cookie policy', ok:'Accept', no:'Only necessary', legal:['Legal notice','Privacy','Cookies'], mapTxt:'To see the map, accept Google Maps cookies.', mapBtn:'Show map', mapLink:'Open in Google Maps' }
    };
    var t = T[lang];
    var LINKS = [pre+'aviso-legal.html', pre+'privacidad.html', pre+'cookies.html'];

    function getConsent(){ try{ return localStorage.getItem(KEY); }catch(e){ return null; } }
    function setConsent(v){ try{ localStorage.setItem(KEY,v); }catch(e){} }
    // helper DOM seguro: crea elemento con estilo y TEXTO (nunca HTML)
    function mk(tag,css,txt){ var e=document.createElement(tag); if(css)e.style.cssText=css; if(txt!=null)e.textContent=txt; return e; }

    // ── estilos (inyectados, sin tocar style.css) ──
    var st=document.createElement('style');
    st.textContent =
      '#kk-cookie{position:fixed;left:50%;transform:translateX(-50%);bottom:16px;z-index:9999;max-width:640px;width:calc(100% - 24px);background:#fff;border-radius:18px;box-shadow:0 18px 50px -14px rgba(90,60,45,.45);padding:16px 18px;font-family:Inter,system-ui,sans-serif;display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;border:1px solid #E1ECCD}'+
      '#kk-cookie p{margin:0;flex:1 1 260px;font-size:13.5px;line-height:1.5;color:#3f3a34}'+
      '#kk-cookie a.kk-more{color:#5E8240;font-weight:700;text-decoration:underline}'+
      '#kk-cookie .kk-btns{display:flex;gap:8px;flex:0 0 auto}'+
      '#kk-cookie button{border:none;border-radius:12px;padding:10px 16px;font-weight:700;font-size:13.5px;cursor:pointer;font-family:inherit}'+
      '#kk-cookie .kk-no{background:#F2F7E8;color:#5A463C}'+
      '#kk-cookie .kk-ok{background:#6B8268;color:#fff}'+
      '.kk-mapblock{background:#F2F7E8;border:1px dashed #C2D29C;border-radius:18px;padding:26px 20px;text-align:center;color:#5A463C;font-family:Inter,sans-serif}'+
      '.kk-mapblock p{margin:0 0 12px;font-size:14px}'+
      '.kk-mapblock .kk-map-ok{background:#6B8268;color:#fff;border:none;border-radius:12px;padding:11px 18px;font-weight:700;cursor:pointer;font-family:inherit;font-size:14px}'+
      '.kk-mapblock a{display:inline-block;margin-top:10px;color:#5E8240;font-weight:700;text-decoration:underline;font-size:13px}';
    document.head.appendChild(st);

    // ── 1) enlaces legales en el pie (todas las páginas) ──
    (function(){
      var foot=document.querySelector('footer');
      if(!foot || foot.querySelector('.kk-legal-links')) return;
      var bar=mk('div','text-align:center;padding:14px 16px 4px;font-size:13px;font-family:Inter,sans-serif;display:flex;gap:16px;justify-content:center;flex-wrap:wrap');
      bar.className='kk-legal-links';
      t.legal.forEach(function(lbl,i){
        var a=mk('a','color:rgba(255,255,255,.75);text-decoration:none;font-weight:600',lbl);
        a.href=LINKS[i]; bar.appendChild(a);
      });
      (foot.querySelector('.wrap')||foot).appendChild(bar);
    })();

    // ── 2) bloqueo del mapa hasta aceptar ──
    function loadMaps(){
      document.querySelectorAll('iframe[data-src]').forEach(function(f){
        f.src=f.getAttribute('data-src'); f.removeAttribute('data-src');
      });
      document.querySelectorAll('.kk-mapblock').forEach(function(b){
        var url=b.getAttribute('data-map');
        var f=mk('iframe','border:0;display:block'); f.title='Kids & Kafé map';
        f.width='100%'; f.height='420'; f.loading='lazy';
        f.setAttribute('referrerpolicy','no-referrer-when-downgrade'); f.src=url;
        b.parentNode.replaceChild(f,b);
      });
    }
    function blockMaps(){
      document.querySelectorAll('iframe[data-src]').forEach(function(f){
        var url=f.getAttribute('data-src');
        var d=mk('div'); d.className='kk-mapblock'; d.setAttribute('data-map',url);
        var btn=mk('button','',t.mapBtn); btn.className='kk-map-ok'; btn.type='button';
        var a=mk('a',null,t.mapLink+' ↗'); a.href=url.replace('&output=embed',''); a.target='_blank'; a.rel='noopener';
        d.appendChild(mk('p',null,'🗺️ '+t.mapTxt));
        d.appendChild(btn); d.appendChild(document.createElement('br')); d.appendChild(a);
        btn.addEventListener('click',function(){ setConsent('all'); loadMaps(); });
        f.parentNode.replaceChild(d,f);
      });
    }

    // ── 3) banner ──
    function showBanner(){
      if(document.getElementById('kk-cookie')) return;
      var box=mk('div'); box.id='kk-cookie';
      var pEl=mk('p',null,'🍪 '+t.txt+' ');
      var more=mk('a',null,t.more); more.className='kk-more'; more.href=LINKS[2];
      pEl.appendChild(more); pEl.appendChild(document.createTextNode('.'));
      var btns=mk('div'); btns.className='kk-btns';
      var no=mk('button',null,t.no); no.className='kk-no'; no.type='button';
      var ok=mk('button',null,t.ok); ok.className='kk-ok'; ok.type='button';
      btns.appendChild(no); btns.appendChild(ok);
      box.appendChild(pEl); box.appendChild(btns);
      document.body.appendChild(box);
      ok.addEventListener('click',function(){ setConsent('all'); box.remove(); loadMaps(); });
      no.addEventListener('click',function(){ setConsent('necessary'); box.remove(); });
    }

    // ── arranque ──
    var c=getConsent();
    if(c==='all'){ loadMaps(); }
    else { blockMaps(); if(c!=='necessary') showBanner(); }

    // API pública para el botón "cambiar preferencias" en cookies.html
    window.KKCookies={ reset:function(){ try{localStorage.removeItem(KEY);}catch(e){} location.reload(); } };
  } catch(err){ /* si algo falla, la web sigue igual */ }
})();
