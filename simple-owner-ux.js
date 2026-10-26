'use strict';
(() => {
 let currentOwner=null;
 const t=(ar,en,de)=>({ar,en,de}[window.ShahinI18n?.language||'ar']||ar);
 function simplifyOwner(s,section){
  if(section&&!['overview','stores'].includes(section))return;
  const nav=document.querySelector('.merchant-nav.dashboard-menu-grid');if(!nav||!s)return;
  const links=[...nav.querySelectorAll('a')],keys=s.active?['details','photos','products','orders','delivery','drivers']:['details','photos'];
  const primary=keys.map(key=>links.find(a=>a.getAttribute('href')===merchantHref(key,s)&&!a.hidden)).filter(Boolean);
  const extras=links.filter(a=>!a.hidden&&!primary.includes(a));
  primary.forEach(a=>nav.append(a));
  const more=document.createElement('details');more.className='owner-more-tools';
  const summary=document.createElement('summary');summary.dataset.noTranslate='';summary.textContent=t('المزيد من الأدوات','More tools','Weitere Werkzeuge');more.append(summary);
  const group=document.createElement('div');group.className='owner-more-grid';extras.forEach(a=>group.append(a));more.append(group);
  nav.querySelector(':scope > .owner-more-tools')?.remove();if(extras.length)nav.append(more);
  const hint=document.querySelector('.merchant-sidebar .dashboard-menu-hint');if(hint){hint.dataset.noTranslate='';hint.textContent=s.active?t('اختر الأداة المناسبة. الطلبات والتوصيل والسائقون أمامك مباشرة.','Choose a tool. Orders, delivery and drivers are shown here.','Wähle ein Werkzeug. Bestellungen, Lieferung und Fahrer sind direkt sichtbar.'):t('ابدأ بمعلومات المحل وصورته، ثم أرسل طلبك للمعاينة.','Start with your shop details and photo, then send your request.','Beginne mit Angaben und Foto und sende danach deinen Antrag.');}
 }
 const previousMerchant=merchantDashboard;merchantDashboard=function(ms,s,section){const result=previousMerchant.apply(this,arguments);currentOwner=s;simplifyOwner(s,section);return result;};
 const previousHome=renderHome;renderHome=function(){const result=previousHome.apply(this,arguments);const input=document.querySelector('#app.professional-home #search');if(input){input.placeholder=t('ماذا تبحث عنه؟','What are you looking for?','Was suchst du?');input.setAttribute('aria-label',t('ابحث عن محل أو منتج أو خدمة','Find a shop, product or service','Geschäft, Produkt oder Dienstleistung suchen'));}const hint=document.querySelector('#app.professional-home .home-search-hint');if(hint){hint.dataset.noTranslate='';hint.textContent=t('اختر قسمًا أو اكتب ما تبحث عنه','Choose a group or type what you need','Wähle einen Bereich oder gib ein, was du suchst');}return result;};
 let locale=document.documentElement.lang;
 new MutationObserver(()=>{if(locale===document.documentElement.lang)return;locale=document.documentElement.lang;window.BusinessApplications?.refreshLanguage?.();const summary=document.querySelector('.owner-more-tools>summary');if(summary)summary.textContent=t('المزيد من الأدوات','More tools','Weitere Werkzeuge');const hint=document.querySelector('.merchant-sidebar .dashboard-menu-hint');if(hint&&currentOwner)hint.textContent=currentOwner.active?t('اختر الأداة المناسبة. الطلبات والتوصيل والسائقون أمامك مباشرة.','Choose a tool. Orders, delivery and drivers are shown here.','Wähle ein Werkzeug. Bestellungen, Lieferung und Fahrer sind direkt sichtbar.'):t('ابدأ بمعلومات المحل وصورته، ثم أرسل طلبك للمعاينة.','Start with your shop details and photo, then send your request.','Beginne mit Angaben und Foto und sende danach deinen Antrag.');}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
})();
