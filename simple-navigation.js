'use strict';
(() => {
 const text=(ar,en,de)=>({ar,en,de}[window.ShahinI18n?.language||'ar']||ar);
 const menu=document.querySelector('#site-menu'),toggle=document.querySelector('#menu-toggle');
 const words={all:['الكل','All','Alle'],restaurant:['مطاعم ومقاهٍ','Food and cafés','Restaurants und Cafés'],shop:['متاجر وبقاليات','Shops and food stores','Läden und Lebensmittel'],apparel:['ملابس وتسوق','Clothes','Kleidung'],mobile:['جوالات وإكسسوارات','Phones','Handys und Zubehör'],services:['حرفيون وخدمات','Local services','Handwerk und Dienste'],doctor:['أطباء وعيادات','Doctors','Ärzte und Praxen'],pharmacy:['صيدليات','Pharmacies','Apotheken'],school:['مدارس','Schools','Schulen'],mosque:['مساجد','Mosques','Moscheen'],lawyer:['محامون','Lawyers','Anwälte']};
 const icons={all:'▦',restaurant:'🍽️',shop:'🛒',apparel:'👕',mobile:'📱',services:'🛠️',doctor:'🩺',pharmacy:'✚',school:'📚',mosque:'🕌',lawyer:'⚖️'};
 function label(node,words){if(!node)return;if(!node.hasAttribute('data-no-translate'))node.dataset.noTranslate='';const value=text(...words);if(node.textContent!==value)node.textContent=value;}
 let menuLanguage=null;
 function menuLabels(){
  const languageKey=window.ShahinI18n?.language||'ar';
  if(menuLanguage===languageKey)return;
  menuLanguage=languageKey;
  const groups=[...menu.querySelectorAll('.side-menu-group')];
  const account=groups.find(g=>g.querySelector('#customer-account'));
  const language=groups.find(g=>g.querySelector('#language'));
  const apps=groups.find(g=>g.querySelector('[data-android-download]'));
  const about=groups.find(g=>g.querySelector('a[href="#about"]'));
  const join=groups.find(g=>g.querySelector('a[href="#shop-owner"]'));
  [account,language,apps,about,join,...groups].filter((g,i,a)=>g&&a.indexOf(g)===i).forEach(g=>menu.append(g));
  label(account?.querySelector('h2'),['الحساب والطلبات','Account and orders','Konto und Bestellungen']);
  label(language?.querySelector('h2'),['اللغة','Language','Sprache']);
  label(apps?.querySelector('.side-menu-toggle'),['تحميل التطبيق','Get the app','App installieren']);
  label(about?.querySelector('.side-menu-toggle'),['المساعدة وعن الموقع','Help and about','Hilfe und Infos']);
  label(join?.querySelector('h2'),['لأصحاب المحلات والأنشطة','For business owners','Für Anbieter']);
  if(account&&!document.querySelector('#simple-orders')){const a=document.createElement('a');a.id='simple-orders';a.href='#my-orders';account.append(a);}
  label(document.querySelector('#simple-orders'),['طلباتي','My orders','Meine Bestellungen']);
  label(toggle,['☰ المزيد','☰ More','☰ Mehr']);
  toggle.setAttribute('aria-label',text('فتح المزيد','Open more','Mehr öffnen'));
 }
 let sectionOpen=false;
 function openSection(key){
  sectionOpen=true;filter=key;search='';browseFavorites=false;
  if(typeof communityState!=='undefined'){communityState.open=false;communityState.region='';communityState.near=false;}
  renderHome();window.scrollTo(0,0);
 }
 function mainMenu(){sectionOpen=false;filter='all';search='';browseFavorites=false;renderHome();window.scrollTo(0,0);}
 const homeBase=renderHome;
 renderHome=function(){
  homeBase.apply(this,arguments);
  const hero=document.querySelector('.shahin-hero');if(!hero)return;
  document.querySelector('.welcome-guide')?.remove();
  const input=document.querySelector('#search');
  if(input){input.dataset.noTranslate='';input.placeholder=text('ماذا تبحث عن؟ مطعم، طبيب، صيدلية، محل…','What do you need? A shop, doctor or food…','Was suchst du? Restaurant, Arzt, Apotheke…');input.setAttribute('aria-label',input.placeholder);}
  label(document.querySelector('.home-search-hint'),['ابحث أو اختر قسمًا من الأقسام التالية','Search or choose a group below','Suche oder wähle einen Bereich']);
  const filters=hero.querySelector('.filters'),browse=document.querySelector('#browse');if(filters&&browse)browse.prepend(filters);
  document.querySelectorAll('.filters [data-filter]').forEach(b=>{const key=b.dataset.filter;if(!words[key])return;label(b,words[key]);b.setAttribute('aria-pressed',String(filter===key));b.dataset.categoryIcon=icons[key];b.onclick=()=>openSection(key);});
  const saved=document.querySelector('#favorite-filter');if(saved)saved.hidden=true;
  const delivery=document.querySelector('.delivery-hero-button');label(delivery,['اطلب توصيلًا إلى منزلك','Order home delivery','Lieferung nach Hause']);
  if(delivery){delivery.onclick=()=>openSection('delivery');const hint=document.createElement('p');hint.className='simple-delivery-hint';label(hint,['اعرض المحلات التي توفر التوصيل','See shops with delivery','Läden mit Lieferung anzeigen']);delivery.parentElement.after(hint);}
  label(document.querySelector('[data-near-me]'),['رتّب حسب الأقرب إليك','Sort by nearest','Nach Entfernung sortieren']);
  label(document.querySelector('#browse h2'),browseFavorites?['محلاتي المحفوظة','My saved places','Meine gemerkten Orte']:filter==='delivery'?['محلات توفر التوصيل','Shops with delivery','Läden mit Lieferung']:search?['نتائج البحث','Search results','Suchergebnisse']:['الأماكن والخدمات','Places and services','Orte und Dienste']);
  document.querySelectorAll('.card-bottom strong').forEach(n=>label(n,['عرض المكان','View place','Ort ansehen']));
  if(sectionOpen){
   hero.hidden=true;
   document.querySelector('.browse-category-track')?.setAttribute('hidden','');
   document.querySelector('.home-search-hint')?.setAttribute('hidden','');
   document.querySelector('.brand-note')?.setAttribute('hidden','');
   if(words[filter])label(document.querySelector('#browse h2'),words[filter]);
  }
  if(sectionOpen||filter!=='all'||browseFavorites||search){const b=document.createElement('button');b.type='button';b.className='outline simple-back';label(b,['العودة إلى القائمة الرئيسية','Back to main menu','Zurück zum Hauptmenü']);b.onclick=mainMenu;document.querySelector('#browse')?.prepend(b);}
 };
 let previousScroll=0;
 document.addEventListener('click',e=>{if(e.target.closest('header .brand')){sectionOpen=false;filter='all';search='';browseFavorites=false;if(location.hash==='#home')renderHome();}if(e.target.closest('.card a[href^="#store/"]'))previousScroll=window.scrollY;
  const a=e.target.closest('#mobile-navigation a');if(!a)return;
  if(a.hash==='#more'){e.preventDefault();e.stopPropagation();menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden));if(!menu.hidden)menu.querySelector('a,button,select')?.focus();}
  if(a.hash==='#saved'){e.preventDefault();sectionOpen=false;browseFavorites=true;filter='all';search='';if(!['','#home','#browse'].includes(location.hash))location.hash='#home';else renderHome();window.scrollTo(0,0);}
  if(a.hash==='#home'){sectionOpen=false;browseFavorites=false;filter='all';search='';if(location.hash==='#home')renderHome();}
 },true);
 const storeBase=renderStore;
 renderStore=function(){storeBase.apply(this,arguments);const back=document.querySelector('#app > .topline a[href="#home"]');if(back){label(back,['العودة إلى قائمة الأماكن','Back to places','Zurück zur Liste']);back.onclick=e=>{e.preventDefault();location.hash='#home';requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo(0,previousScroll)));};}};
 new MutationObserver(menuLabels).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 menuLabels();
})();
