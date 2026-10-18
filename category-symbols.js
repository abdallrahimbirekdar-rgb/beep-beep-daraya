'use strict';
(() => {
 const shortNames={'board-used':['سوق المستعمل','Used items','Gebrauchtmarkt'],'board-ads':['إعلانات داريا','Daraya notices','Daraya-Anzeigen'],restaurant:['مطاعم ومقاهٍ','Food & cafés','Restaurants'],grocery:['بقاليات وخضار','Groceries','Lebensmittel'],apparel:['ملابس وأحذية','Clothes & shoes','Kleidung'],stationery:['قرطاسية','Stationery','Schreibwaren'],toys:['ألعاب وأطفال','Toys & kids','Spielzeuge'],beauty:['عطور وتجميل','Beauty','Kosmetik'],pets:['حيوانات أليفة','Pets','Haustiere'],shop:['متاجر أخرى','Other shops','Weitere Läden'],mobile:['جوالات','Phones','Handys'],household:['منزل ومفروشات','Home & furniture','Wohnen'],services:['مهن وخدمات','Services','Handwerk'],vehicles:['سيارات ودراجات','Cars & bikes','Fahrzeuge'],doctor:['أطباء','Doctors','Ärzte'],pharmacy:['صيدليات','Pharmacies','Apotheken'],school:['مدارس وتعليم','Education','Bildung'],mosque:['مساجد','Mosques','Moscheen']};
 const reference={restaurant:[163,565],grocery:[525,565],apparel:[163,783],mobile:[525,783],services:[163,1001],household:[525,1001],doctor:[163,1218],pharmacy:[525,1218]};
 const drawings={all:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'};
 function artwork(key){
  if(key==='all')return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" aria-hidden="true">'+drawings.all+'</svg>';
  const xy=reference[key],img=document.createElement('img');img.alt='';img.loading='lazy';img.decoding='async';
  img.src='assets/categories/'+(xy?'reference-photos':key)+'.webp';
  if(xy){img.className='reference-category-photo';img.style.cssText='width:301.1765%;height:1037.8379%;left:-'+(xy[0]/340*100)+'%;top:-'+(xy[1]/148*100)+'%';}
  else{img.width=480;img.height=240;}
  return img.outerHTML;
 }
 function decorate(){
  const lang=window.ShahinI18n?.language||'ar',column={ar:1,en:2,de:3}[lang]||1;
  document.querySelectorAll('#app .browse-category-track button[data-filter]').forEach(button=>{
   const key=button.dataset.filter;if(key==='delivery')return;
   const sector=(window.DARAYA_SECTORS||[]).find(x=>x[0]===key);
   const title=key==='all'?({ar:'الكل',en:'All',de:'Alle'}[lang]||'الكل'):sector?.[column]||(key.startsWith('board-')?shortNames[key]?.[column-1]:null)||button.querySelector('.category-symbol-label')?.textContent||button.textContent;
   let label=button.querySelector('.category-symbol-label');
   if(!label){const badge=document.createElement('span');badge.className='category-symbol';badge.setAttribute('aria-hidden','true');badge.innerHTML=artwork(key);label=document.createElement('span');label.className='category-symbol-label';button.replaceChildren(badge,label);button.classList.add('has-category-symbol');delete button.dataset.categoryIcon;}
   button.classList.toggle('category-all',key==='all');const short=shortNames[key]?.[column-1]||title;if(label.textContent!==short)label.textContent=short;button.setAttribute('aria-label',title);button.title=title;
  });
  const track=document.querySelector('#app.professional-home .browse-category-track');
  if(track){for(const key of ['all','grocery','restaurant','mobile','apparel','household','services','pharmacy','doctor','stationery','toys','beauty','pets','vehicles','school','mosque','shop','board-used','board-ads']){const button=track.querySelector('button[data-filter="'+key+'"]');if(button)track.append(button);}}
  const app=document.querySelector('#app.professional-home'),guide=app?.querySelector('.home-visitor-guide'),offer=app?.querySelector('.daily-offers-preview'),delivery=app?.querySelector('.simple-delivery-category');
  if(guide&&(offer||delivery)){
   let quick=app.querySelector('.home-quick-actions');if(!quick){quick=document.createElement('div');quick.className='home-quick-actions';}guide.after(quick);if(offer)quick.append(offer);if(delivery)quick.append(delivery);
   const offerLink=offer?.querySelector('a.button');if(offerLink){let label=offerLink.querySelector('.quick-offer-label');if(!label){offerLink.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 3h8l10 10-8 8L3 11V3Z"/><circle cx="7.5" cy="7.5" r="1.2"/></svg><span class="quick-offer-label"></span>';label=offerLink.querySelector('span');}label.textContent=({ar:'عروض اليوم',en:'Today’s offers',de:'Angebote'}[lang]||'عروض اليوم');}
   const deliveryButton=delivery?.querySelector('.delivery-hero-button'),note=deliveryButton?.querySelector('.delivery-pending-note');if(deliveryButton&&note){let title=deliveryButton.querySelector('.quick-delivery-label');if(!title){title=document.createElement('span');title.className='quick-delivery-label';deliveryButton.replaceChildren(title,note);}title.textContent=({ar:'التوصيل',en:'Home delivery',de:'Lieferung'}[lang]||'التوصيل');note.textContent=({ar:'غير مفعّل حاليًا',en:'Not active yet',de:'Noch nicht aktiv'}[lang]||'غير مفعّل حاليًا');}
  }
 }
 const previous=renderHome;renderHome=function(){const result=previous.apply(this,arguments);decorate();return result;};
 let locale=document.documentElement.lang;new MutationObserver(()=>{if(locale===document.documentElement.lang)return;locale=document.documentElement.lang;decorate();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 decorate();
})();
