'use strict';
(()=>{
 const t=(a,e,d)=>typeof ct==='function'?ct(a,e,d):a;
 const slides=[
  {image:'search',title:['كل اللي تحتاجه، أقرب إلك','Find what you need nearby','Finde, was du brauchst'],body:['ابحث عن محل أو مطعم أو خدمة، وشاهد المعلومات المتاحة.','Find a shop, food or a service and see its details.','Suche Geschäfte, Restaurants oder Dienste und sieh ihre Angaben.'],action:['ابحث الآن','Search now','Jetzt suchen'],target:'search'},
  {image:'map',title:['اعرف وين المكان','See where it is','Finde den Ort'],body:['شاهد المحلات على خريطة داريا، وحدد وجهتك قبل الزيارة.','Find places on the Daraya map before your visit.','Finde Orte auf der Daraya-Karte vor deinem Besuch.'],action:['افتح الخريطة','Open the map','Karte öffnen'],target:'map'},
  {image:'contact',title:['تعرّف على المحل وتواصل','Get to know a shop','Lerne ein Geschäft kennen'],body:['افتح صفحة المحل لتشاهد صوره وعنوانه وطرق التواصل المتاحة.','Open a shop page for photos, its address and contact options.','Öffne eine Geschäftsseite für Fotos, Adresse und Kontakt.'],action:['استكشف المحلات','Explore shops','Geschäfte entdecken'],target:'search'},
  {image:'saved',title:['محلاتك المفضلة بمكان واحد','Keep your favorite places','Deine Lieblingsorte'],body:['اضغط على القلب لحفظ المحل، وارجع له بسهولة من المحفوظات.','Tap the heart to save a shop and find it again in Saved.','Merke Geschäfte mit dem Herz und finde sie unter Gemerkt wieder.'],action:['افتح المحفوظات','Open saved places','Gemerkte Orte öffnen'],target:'saved'}
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
  root.innerHTML='<div class="visitor-guide-main"><div class="visitor-guide-copy"><h2 data-guide-title></h2><p data-guide-description></p><a class="visitor-guide-action" data-guide-action></a></div><div class="visitor-guide-art">'+slides.map((s,i)=>'<img data-guide-image="'+i+'" data-src="assets/home-guide/'+s.image+'-384.webp" data-srcset="assets/home-guide/'+s.image+'-384.webp 384w, assets/home-guide/'+s.image+'-640.webp 640w" sizes="(max-width: 600px) 115px, 175px" width="384" height="384" alt="" decoding="async" loading="lazy"'+(i!==current?' hidden':'')+'>').join('')+'</div></div><div class="visitor-guide-controls"><button type="button" data-visitor-prev></button><div class="visitor-guide-dots">'+slides.map((s,i)=>'<button type="button" data-visitor-dot="'+i+'"><span></span></button>').join('')+'</div><button type="button" data-visitor-pause></button><button type="button" data-visitor-next></button></div>';
  const offer=filters.querySelector('.daily-offers-preview');if(offer)offer.after(root);else input.closest('.search-wrap,.search-box,.search-field').after(root);
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let timer=null,visible=false,hovered=false,focused=false,paused=false,dead=false,observer=null,start=null;
  const stop=()=>{if(timer!==null)clearTimeout(timer);timer=null;};
  const hydrate=()=>{if(!visible)return;const img=root.querySelector('[data-guide-image="'+current+'"]');if(!img.getAttribute('src')){img.srcset=img.dataset.srcset;img.src=img.dataset.src;}};
  const canPlay=()=>!paused&&!reduced?.matches;
  function schedule(){stop();if(!dead&&root.isConnected&&visible&&!hovered&&!focused&&!document.hidden&&canPlay())timer=setTimeout(()=>show(current+1,false),4000);}
  function labels(){
   const prev=root.querySelector('[data-visitor-prev]'),next=root.querySelector('[data-visitor-next]'),pause=root.querySelector('[data-visitor-pause]'),rtl=document.documentElement.dir!=='ltr';
   prev.textContent=rtl?'→':'←';next.textContent=rtl?'←':'→';prev.setAttribute('aria-label',t('السلايد السابق','Previous slide','Vorherige Folie'));next.setAttribute('aria-label',t('السلايد التالي','Next slide','Nächste Folie'));
   pause.textContent=paused?'▶':'Ⅱ';pause.setAttribute('aria-label',paused?t('تشغيل التبديل التلقائي','Start auto play','Automatisch abspielen'):t('إيقاف التبديل التلقائي','Pause auto play','Automatik anhalten'));pause.setAttribute('aria-pressed',String(paused));pause.hidden=Boolean(reduced?.matches);
   root.querySelectorAll('[data-visitor-dot]').forEach((b,i)=>{b.setAttribute('aria-label',t('السلايد ','Slide ','Folie ')+(i+1)+': '+t(...slides[i].title));b.setAttribute('aria-pressed',String(i===current));});
  }
  function show(index,manual=true){if(dead)return;current=(index+slides.length)%slides.length;const s=slides[current];root.querySelector('[data-guide-title]').textContent=t(...s.title);root.querySelector('[data-guide-description]').textContent=t(...s.body);const link=root.querySelector('[data-guide-action]');link.textContent=t(...s.action);link.href=s.target==='search'?'#home':'#'+s.target;root.querySelectorAll('[data-guide-image]').forEach((img,i)=>img.hidden=i!==current);root.dataset.slide=String(current);if(manual){root.querySelector('.visitor-guide-copy').setAttribute('aria-live','polite');}else root.querySelector('.visitor-guide-copy').setAttribute('aria-live','off');hydrate();labels();schedule();}
  root.querySelector('[data-visitor-prev]').onclick=()=>show(current-1);root.querySelector('[data-visitor-next]').onclick=()=>show(current+1);root.querySelectorAll('[data-visitor-dot]').forEach((b,i)=>b.onclick=()=>show(i));
  root.querySelector('[data-visitor-pause]').onclick=()=>{paused=!paused;labels();schedule();};
  root.querySelector('[data-guide-action]').onclick=e=>{if(slides[current].target!=='search')return;e.preventDefault();input.focus();input.scrollIntoView({behavior:reduced?.matches?'auto':'smooth',block:'center'});};
  root.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){hovered=true;stop();}});root.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'){hovered=false;schedule();}});
  root.addEventListener('focusin',e=>{focused=e.target.matches(':focus-visible');if(focused)stop();});root.addEventListener('focusout',e=>{if(!root.contains(e.relatedTarget)){focused=false;schedule();}});
  root.addEventListener('touchstart',e=>{if(e.touches.length!==1){start=null;return;}start={x:e.touches[0].clientX,y:e.touches[0].clientY};stop();},{passive:true});
  root.addEventListener('touchend',e=>{if(start&&e.changedTouches.length){const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3){const rtl=document.documentElement.dir!=='ltr';show(current+((dx>0)===rtl?1:-1));}}start=null;schedule();},{passive:true});root.addEventListener('touchcancel',()=>{start=null;schedule();},{passive:true});
  const visibility=()=>schedule(),motion=()=>{labels();schedule();};document.addEventListener('visibilitychange',visibility);reduced?.addEventListener?.('change',motion);
  if('IntersectionObserver'in window){observer=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);hydrate();schedule();},{threshold:.15});observer.observe(root);}else{visible=true;hydrate();}
  show(current,false);
  cleanup=()=>{dead=true;stop();observer?.disconnect();document.removeEventListener('visibilitychange',visibility);reduced?.removeEventListener?.('change',motion);};
 }
 const previous=renderHome;renderHome=function(){cleanup();previous.apply(this,arguments);mount();};
 window.addEventListener('hashchange',()=>{if(!['','#','#home'].includes(location.hash))cleanup();});
 let lastLocale=document.documentElement.lang+'|'+document.documentElement.dir;
 new MutationObserver(()=>{const locale=document.documentElement.lang+'|'+document.documentElement.dir;if(locale===lastLocale)return;lastLocale=locale;if(document.querySelector('.home-visitor-guide'))mount();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang','dir']});
 if(document.querySelector('#app.professional-home #browse>.filters'))mount();
})();
