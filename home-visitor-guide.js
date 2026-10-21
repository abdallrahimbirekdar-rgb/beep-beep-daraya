'use strict';
(()=>{
 const t=(a,e,d)=>typeof ct==='function'?ct(a,e,d):a;
 const slides=[
  {image:'search',title:['كل اللي تحتاجه، أقرب إلك','Find what you need nearby','Finde, was du brauchst'],body:['ابحث عن محل أو مطعم أو خدمة، وشاهد المعلومات المتاحة.','Find a shop, food or a service and see its details.','Suche Geschäfte, Restaurants oder Dienste und sieh ihre Angaben.'],action:['ابحث الآن','Search now','Jetzt suchen'],target:'search'},
  {image:'map',title:['اعرف وين المكان','See where it is','Finde den Ort'],body:['شاهد المحلات على خريطة داريا، وحدد وجهتك قبل الزيارة.','Find places on the Daraya map before your visit.','Finde Orte auf der Daraya-Karte vor deinem Besuch.'],action:['افتح الخريطة','Open the map','Karte öffnen'],target:'map'},
  {image:'contact',title:['تعرّف على المحل وتواصل','Get to know a shop','Lerne ein Geschäft kennen'],body:['افتح صفحة المحل لتشاهد صوره وعنوانه وطرق التواصل المتاحة.','Open a shop page for photos, its address and contact options.','Öffne eine Geschäftsseite für Fotos, Adresse und Kontakt.'],action:['استكشف المحلات','Explore shops','Geschäfte entdecken'],target:'search'},
  {image:'saved',title:['محلاتك المفضلة بمكان واحد','Keep your favorite places','Deine Lieblingsorte'],body:['اضغط على القلب لحفظ المحل، وارجع له بسهولة من المحفوظات.','Tap the heart to save a shop and find it again in Saved.','Merke Geschäfte mit dem Herz und finde sie unter Gemerkt wieder.'],action:['افتح المحفوظات','Open saved places','Gemerkte Orte öffnen'],target:'saved'},
  {image:'contact',title:['عروض اليوم من محلات داريا','Today’s shop offers','Heutige Angebote'],body:['شاهد عروض المحلات والأسعار والتفاصيل المتاحة.','See shop offers, prices and details.','Sieh Angebote, Preise und Angaben der Geschäfte.'],action:['شاهد العروض','View offers','Angebote ansehen'],target:'offers'},
  {image:'search',title:['المنتجات والأسعار قبل الزيارة','See products and prices','Produkte und Preise ansehen'],body:['افتح صفحة المحل لتشاهد المنتجات والصور والأسعار التي أضافها.','Open a shop page to see the products, photos and prices it has added.','Öffne eine Geschäftsseite für die dort hinzugefügten Produkte, Fotos und Preise.'],action:['استكشف المحلات','Explore shops','Geschäfte entdecken'],target:'search'},
  {image:'contact',title:['عندك محل أو خدمة؟','Do you own a shop?','Hast du ein Geschäft?'],body:['أنشئ صفحة لنشاطك مجانًا وأرسلها للإدارة لمعاينتها.','Create a free page for your business and send it for review.','Erstelle eine kostenlose Seite für dein Angebot und sende sie zur Prüfung.'],action:['افتح صفحة لنشاطك','Create a business page','Geschäftsseite erstellen'],target:'business-applications'}
 ];
 let cleanup=()=>{},current=0;
 function mount(){
  cleanup();cleanup=()=>{};
  if(!['','#','#home'].includes(location.hash)||typeof search!=='undefined'&&search.trim()||typeof browseFavorites!=='undefined'&&browseFavorites||window.darayaHomeShowsResults?.())return;
  const app=document.querySelector('#app'),filters=app?.querySelector('#browse>.filters'),input=app?.querySelector('#search');
  if(!filters||!input)return;
  app.querySelector('.home-visitor-guide')?.remove();
  input.placeholder=t('ابحث عن محل أو خدمة…','Find a shop or service…','Geschäft oder Dienst suchen…');
  input.setAttribute('aria-label',t('ابحث عن محل أو خدمة','Find a shop or service','Geschäft oder Dienst suchen'));
  const root=document.createElement('section');root.className='home-visitor-guide';root.dataset.noTranslate='';root.setAttribute('role','region');root.setAttribute('aria-roledescription',t('عارض شرائح','carousel','Karussell'));root.setAttribute('aria-label',t('ماذا يمكنك أن تفعل في سوق داريا؟','What can you do on Souq Daraya?','Was kannst du auf Souq Daraya tun?'));
  const sequence=[slides.length-1,...slides.map((_,i)=>i),0];
  root.innerHTML='<div class="visitor-guide-viewport"><div class="visitor-guide-track">'+sequence.map(i=>{const s=slides[i];return '<article class="visitor-guide-main" data-guide-card="'+i+'" aria-hidden="true" inert><div class="visitor-guide-copy"><h2>'+t(...s.title)+'</h2><p>'+t(...s.body)+'</p><a class="visitor-guide-action" href="'+(s.target==='search'?'#home':'#'+s.target)+'">'+t(...s.action)+'</a></div><div class="visitor-guide-art"><img data-guide-image="'+s.image+'" data-src="assets/home-guide/'+s.image+'-384.webp" data-srcset="assets/home-guide/'+s.image+'-384.webp 384w, assets/home-guide/'+s.image+'-640.webp 640w" sizes="(max-width: 600px) 76px, 145px" width="384" height="384" alt="" decoding="async" loading="lazy"></div></article>';}).join('')+'</div></div><div class="visitor-guide-controls"><button type="button" data-visitor-prev></button><div class="visitor-guide-dots">'+slides.map((s,i)=>'<button type="button" data-visitor-dot="'+i+'"><span></span></button>').join('')+'</div><button type="button" data-visitor-pause></button><button type="button" data-visitor-next></button></div>';

  app.prepend(root);
  const hero=app.querySelector('.shahin-hero');if(hero)hero.hidden=true;
  const offer=app.querySelector('.daily-offers-preview'),delivery=app.querySelector('.simple-delivery-category');
  if(offer)root.after(offer);
  if(delivery)(offer||root).after(delivery);
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const track=root.querySelector('.visitor-guide-track'),cards=[...track.children];
  let hasShown=false,animation=null,position=current+1;
  let timer=null,visible=false,hovered=false,focused=false,paused=false,dead=false,observer=null,start=null,touchInput=false,blockClickUntil=0;
  const stop=()=>{if(timer!==null)clearTimeout(timer);timer=null;};
  const hydrate=()=>{if(!visible)return;for(const slot of new Set([position,position+1,current+1,(current+1)%slides.length+1])){const img=cards[slot]?.querySelector('img');if(img&&!img.getAttribute('src')){img.loading='eager';img.srcset=img.dataset.srcset;img.src=img.dataset.src;}}};
  const transform=slot=>'translateX('+((document.documentElement.dir==='ltr'?-1:1)*slot*(cards[0].getBoundingClientRect().width+10))+'px)';
  function align(animate=false){
   const from=getComputedStyle(track).transform;animation?.cancel();animation=null;const target=transform(position);track.style.transform=target;
   const settle=()=>{position=current+1;track.style.transform=transform(position);};
   if(animate&&!reduced?.matches&&typeof track.animate==='function'){animation=track.animate([{transform:from},{transform:target}],{duration:480,easing:'cubic-bezier(.22,.7,.2,1)'});animation.onfinish=()=>{animation=null;settle();};}else settle();
  }
  const resize=()=>align();window.addEventListener('resize',resize);

  // Reduced motion removes visual transitions in CSS; content still changes without animation.
  const canPlay=()=>!paused;
  function schedule(){stop();if(!dead&&root.isConnected&&visible&&!hovered&&!focused&&!document.hidden&&canPlay())timer=setTimeout(()=>show(current+1,false),4000);}
  function labels(){
   const prev=root.querySelector('[data-visitor-prev]'),next=root.querySelector('[data-visitor-next]'),pause=root.querySelector('[data-visitor-pause]'),rtl=document.documentElement.dir!=='ltr';
   prev.textContent=rtl?'→':'←';next.textContent=rtl?'←':'→';prev.setAttribute('aria-label',t('السلايد السابق','Previous slide','Vorherige Folie'));next.setAttribute('aria-label',t('السلايد التالي','Next slide','Nächste Folie'));
   pause.textContent=paused?'▶':'Ⅱ';pause.setAttribute('aria-label',paused?t('تشغيل التبديل التلقائي','Start auto play','Automatisch abspielen'):t('إيقاف التبديل التلقائي','Pause auto play','Automatik anhalten'));pause.setAttribute('aria-pressed',String(paused));pause.hidden=false;
   root.querySelectorAll('[data-visitor-dot]').forEach((b,i)=>{b.setAttribute('aria-label',t('السلايد ','Slide ','Folie ')+(i+1)+': '+t(...slides[i].title));b.setAttribute('aria-pressed',String(i===current));});
  }
  function show(index,manual=true){
   if(dead)return;const previousSlide=current;current=(index+slides.length)%slides.length;
   cards.forEach((card,slot)=>{const active=slot===current+1;card.setAttribute('aria-hidden',String(!active));card.toggleAttribute('inert',!active);card.classList.toggle('is-current',active);card.querySelector('h2').toggleAttribute('data-guide-title',active);card.querySelector('p').toggleAttribute('data-guide-description',active);card.querySelector('a').toggleAttribute('data-guide-action',active);card.querySelector('.visitor-guide-copy').setAttribute('aria-live',active&&manual?'polite':'off');});
   position=hasShown&&previousSlide===slides.length-1&&index===slides.length?cards.length-1:hasShown&&previousSlide===0&&index===-1?0:current+1;
   root.dataset.slide=String(current);hydrate();align(hasShown&&previousSlide!==current);
   const dot=root.querySelector('[data-visitor-dot="'+current+'"]'),dots=root.querySelector('.visitor-guide-dots');if(dot&&dots)dots.scrollLeft=dot.offsetLeft-dots.offsetLeft-(dots.clientWidth-dot.offsetWidth)/2;
   labels();hasShown=true;schedule();
  }

  root.querySelector('[data-visitor-prev]').onclick=()=>show(current-1);root.querySelector('[data-visitor-next]').onclick=()=>show(current+1);root.querySelectorAll('[data-visitor-dot]').forEach((b,i)=>b.onclick=()=>show(i));
  root.querySelector('[data-visitor-pause]').onclick=()=>{paused=!paused;labels();schedule();};
  root.addEventListener('click',e=>{const link=e.target.closest?.('[data-guide-action]');if(!link||slides[current].target!=='search')return;e.preventDefault();input.focus();input.scrollIntoView({behavior:reduced?.matches?'auto':'smooth',block:'center'});});
  root.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){hovered=true;stop();}});root.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'){hovered=false;schedule();}});
  const keyboard=()=>{touchInput=false;};
  root.addEventListener('keydown',keyboard);
  root.addEventListener('focusin',e=>{focused=false;if(!touchInput){try{focused=e.target.matches(':focus-visible');}catch{focused=true;}}schedule();});root.addEventListener('focusout',e=>{if(!root.contains(e.relatedTarget)){focused=false;schedule();}});
  root.addEventListener('touchstart',e=>{touchInput=true;focused=false;if(e.touches.length!==1){start=null;return;}align();start={x:e.touches[0].clientX,y:e.touches[0].clientY,axis:null};stop();},{passive:true});
  root.addEventListener('touchmove',e=>{if(!start||e.touches.length!==1)return;const dx=e.touches[0].clientX-start.x,dy=e.touches[0].clientY-start.y;if(!start.axis&&Math.max(Math.abs(dx),Math.abs(dy))>8)start.axis=Math.abs(dx)>Math.abs(dy)*1.3?'x':'y';if(start.axis==='x'){const base=(document.documentElement.dir==='ltr'?-1:1)*position*(cards[0].getBoundingClientRect().width+10);track.style.transform='translateX('+(base+dx)+'px)';blockClickUntil=Date.now()+400;}},{passive:true});
  root.addEventListener('click',e=>{if(Date.now()<blockClickUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
  root.addEventListener('touchend',e=>{let changed=false;if(start&&e.changedTouches.length){const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(start.axis!=='y'&&Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3){const rtl=document.documentElement.dir!=='ltr';show(current+((dx>0)===rtl?1:-1));changed=true;blockClickUntil=Date.now()+400;}}if(!changed)align(!!start&&start.axis==='x');start=null;schedule();},{passive:true});root.addEventListener('touchcancel',()=>{start=null;align(true);schedule();},{passive:true});

  // iOS can restore the standalone app without a new intersection notification.
  const resume=()=>{if(dead||document.hidden)return;hovered=false;if(touchInput)focused=false;const rect=root.getBoundingClientRect();visible=rect.width>0&&rect.height>0&&rect.bottom>0&&rect.top<window.innerHeight&&rect.right>0&&rect.left<window.innerWidth;hydrate();schedule();};
  const visibility=()=>{if(document.hidden)stop();else resume();},motion=()=>{align();labels();schedule();};document.addEventListener('visibilitychange',visibility);window.addEventListener('pageshow',resume);window.addEventListener('focus',resume);reduced?.addEventListener?.('change',motion);
  if('IntersectionObserver'in window){observer=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);hydrate();schedule();},{threshold:.15});observer.observe(root);}else{visible=true;hydrate();}
  show(current,false);
  cleanup=()=>{dead=true;stop();animation?.cancel();window.removeEventListener('resize',resize);observer?.disconnect();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pageshow',resume);window.removeEventListener('focus',resume);reduced?.removeEventListener?.('change',motion);};
 }
 const previous=renderHome;renderHome=function(){cleanup();previous.apply(this,arguments);mount();};
 window.addEventListener('hashchange',()=>{if(!['','#','#home'].includes(location.hash))cleanup();});
 let lastLocale=document.documentElement.lang+'|'+document.documentElement.dir;
 new MutationObserver(()=>{const locale=document.documentElement.lang+'|'+document.documentElement.dir;if(locale===lastLocale)return;lastLocale=locale;if(document.querySelector('.home-visitor-guide'))mount();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang','dir']});
 if(document.querySelector('#app.professional-home #browse>.filters'))mount();
})();
