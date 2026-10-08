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
 let sectionToolsOpen=false;
 const compactStyle=document.createElement('style');
 compactStyle.textContent='.professional-home .section-tools{margin:8px 0!important;padding:0!important;border:0!important;background:transparent!important}.section-tools>summary{display:flex;align-items:center;justify-content:center;width:max-content;max-width:100%;min-height:44px;padding:6px 14px;box-sizing:border-box;border:1px solid #d8c58b;border-radius:10px;color:#173b35;background:#fff9e7;font-size:14px;cursor:pointer;list-style:none}.section-tools>summary::-webkit-details-marker{display:none}.section-tools>summary:focus-visible{outline:3px solid #173b35;outline-offset:2px}.professional-home .section-tools:not([open]) .community-controls,.professional-home .section-tools:not([open])>p{display:none!important}.professional-home .section-tools[open]{padding:10px!important;border:1px solid #e4dcc7!important;border-radius:12px!important}.section-tools[open]>summary{margin-bottom:8px}.professional-home .section-tools .community-controls>a{display:none!important}';
 document.head.append(compactStyle);
 function openSection(key){
  sectionOpen=true;sectionToolsOpen=false;filter=key;search='';browseFavorites=false;
  if(typeof communityState!=='undefined'){communityState.open=false;communityState.region='';communityState.near=false;}
  renderHome();window.scrollTo(0,0);
 }
 function mainMenu(){sectionOpen=false;filter='all';search='';browseFavorites=false;if(location.hash!=='#home')location.hash='#home';else renderHome();window.scrollTo(0,0);}
 const homeBase=renderHome;
 renderHome=function(){
  homeBase.apply(this,arguments);
  document.querySelector('#app')?.classList.toggle('search-results-view',Boolean(search.trim()));
  const hero=document.querySelector('.shahin-hero');if(!hero)return;
  document.querySelector('.welcome-guide')?.remove();
  const input=document.querySelector('#search');
  if(input){input.dataset.noTranslate='';input.placeholder=text('ماذا تبحث عن؟ مطعم، طبيب، صيدلية، محل…','What do you need? A shop, doctor or food…','Was suchst du? Restaurant, Arzt, Apotheke…');input.setAttribute('aria-label',input.placeholder);}
  label(document.querySelector('.home-search-hint'),['ابحث أو اختر قسمًا من الأقسام التالية','Search or choose a group below','Suche oder wähle einen Bereich']);
  const filters=hero.querySelector('.filters'),browse=document.querySelector('#browse');if(filters&&browse)browse.prepend(filters);
  document.querySelectorAll('.filters [data-filter]').forEach(b=>{const key=b.dataset.filter;if(!words[key])return;label(b,words[key]);b.setAttribute('aria-pressed',String(filter===key));b.dataset.categoryIcon=icons[key];b.onclick=()=>openSection(key);});
  const saved=document.querySelector('#favorite-filter');if(saved)saved.hidden=true;
  const delivery=document.querySelector('.delivery-hero-button');label(delivery,['اطلب توصيلًا إلى منزلك','Order home delivery','Lieferung nach Hause']);
  if(delivery){
   delivery.onclick=()=>openSection('delivery');
   label(delivery,['التوصيل إلى منزلك','Home delivery','Lieferung nach Hause']);
   const action=delivery.closest('.delivery-hero-action'),track=document.querySelector('.browse-category-track');
   if(action&&track){
    action.classList.add('simple-delivery-category');
    track.prepend(action);
    const info=action.querySelector('.delivery-info-button');
    if(info){
     label(info,['؟','?','?']);
     info.setAttribute('aria-label',text('كيف تعمل خدمة التوصيل؟','How does delivery work?','Wie funktioniert die Lieferung?'));
     info.onclick=e=>{e.preventDefault();e.stopPropagation();modal('<section class="delivery-info-panel" data-no-translate><h2>'+text('التوصيل إلى منزلك','Home delivery','Lieferung nach Hause')+'</h2><p>'+text('اضغط على زر التوصيل لعرض المحلات التي توفر التوصيل إلى منزلك. اختر المحل ثم شاهد منتجاته وخيارات الطلب ورسوم التوصيل.','Press home delivery to see shops that deliver. Choose a shop to see its products, order options and delivery fees.','Tippe auf Lieferung, um Läden mit Lieferung nach Hause zu sehen. Wähle einen Laden für Produkte, Bestellmöglichkeiten und Lieferkosten.')+'</p><p>'+text('لباقي المحلات والخدمات، اختر قسمًا من القائمة أو استخدم البحث.','For other places and services, choose a group or use search.','Für andere Orte und Dienste wähle einen Bereich oder nutze die Suche.')+'</p></section>');};
    }
   }
  }
  label(document.querySelector('[data-near-me]'),['رتّب حسب الأقرب إليك','Sort by nearest','Nach Entfernung sortieren']);
  label(document.querySelector('#browse h2'),browseFavorites?['محلاتي المحفوظة','My saved places','Meine gemerkten Orte']:filter==='delivery'?['محلات توفر التوصيل','Shops with delivery','Läden mit Lieferung']:search?['نتائج البحث','Search results','Suchergebnisse']:['الأماكن والخدمات','Places and services','Orte und Dienste']);
  document.querySelectorAll('.card-bottom strong').forEach(n=>label(n,['عرض المكان','View place','Ort ansehen']));
  if(sectionOpen||browseFavorites||search||filter!=='all'){
   hero.hidden=true;
   document.querySelector('.featured-places')?.remove();
   document.querySelector('.browse-category-track')?.setAttribute('hidden','');
   document.querySelector('.home-search-hint')?.setAttribute('hidden','');
   document.querySelector('.brand-note')?.setAttribute('hidden','');
   if(!browseFavorites&&!search&&words[filter])label(document.querySelector('#browse h2'),words[filter]);
   if(!search)document.querySelector('#browse>.filters')?.setAttribute('hidden','');
   const tools=document.querySelector('.community-search');
   if(tools&&!browseFavorites){
    const details=document.createElement('details');
    details.className='community-search section-tools';details.dataset.noTranslate='';
    details.open=sectionToolsOpen;
    const summary=document.createElement('summary');
    const active=typeof communityState!=='undefined'?[communityState.open,communityState.near,Boolean(communityState.region)].filter(Boolean).length:0;
    label(summary,[active?'تصفية النتائج ('+active+') ▾':'تصفية النتائج ▾',active?'Filter results ('+active+') ▾':'Filter results ▾',active?'Ergebnisse filtern ('+active+') ▾':'Ergebnisse filtern ▾']);
    details.append(summary);
    while(tools.firstChild)details.append(tools.firstChild);
    tools.replaceWith(details);
    details.addEventListener('toggle',()=>{if(details.isConnected)sectionToolsOpen=details.open;});
   }
   if(browseFavorites){document.querySelector('#browse>.filters')?.setAttribute('hidden','');document.querySelector('.community-search')?.remove();document.querySelector('.mosques-entry')?.remove();}
  }
  if(sectionOpen||filter!=='all'||browseFavorites||search){const b=document.createElement('button');b.type='button';b.className='outline simple-back';label(b,['العودة إلى القائمة الرئيسية','Back to main menu','Zurück zum Hauptmenü']);b.onclick=mainMenu;document.querySelector('#browse')?.prepend(b);}
 };
 let previousScroll=0;
 document.addEventListener('click',e=>{if(e.target.closest('header .brand')){sectionOpen=false;filter='all';search='';browseFavorites=false;if(location.hash==='#home')renderHome();}if(e.target.closest('.card a[href^="#store/"]'))previousScroll=window.scrollY;
  const a=e.target.closest('#mobile-navigation a');if(!a)return;
  if(a.hash==='#more'){e.preventDefault();e.stopPropagation();menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden));if(!menu.hidden)menu.querySelector('a,button,select')?.focus();}
  if(a.hash==='#saved'){e.preventDefault();sectionOpen=true;browseFavorites=true;filter='all';search='';if(location.hash!=='#saved')location.hash='#saved';else render();window.scrollTo(0,0);}
  if(a.hash==='#home'){sectionOpen=false;browseFavorites=false;filter='all';search='';if(location.hash==='#home')renderHome();}
 },true);
 const pageBase=render;
 render=function(){
  if(location.hash==='#saved'){sectionOpen=true;browseFavorites=true;filter='all';search='';}
  pageBase.apply(this,arguments);
  const app=document.querySelector('#app');
  const route=location.hash.slice(1).split('/')[0];
  if(app&&route&&!['home','browse','more','dashboard'].includes(route)&&!app.querySelector('.simple-back')){
   const back=document.createElement('button');back.type='button';back.className='outline simple-back';label(back,['العودة إلى القائمة الرئيسية','Back to main menu','Zurück zum Hauptmenü']);back.onclick=mainMenu;app.prepend(back);
  }
 };
 const storeBase=renderStore;
 renderStore=function(){storeBase.apply(this,arguments);const back=document.querySelector('#app > .topline a[href="#home"]');if(back){label(back,['العودة إلى قائمة الأماكن','Back to places','Zurück zur Liste']);back.onclick=e=>{e.preventDefault();location.hash='#home';requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo(0,previousScroll)));};}};
 new MutationObserver(menuLabels).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 menuLabels();
})();
