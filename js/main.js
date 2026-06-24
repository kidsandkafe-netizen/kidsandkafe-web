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
