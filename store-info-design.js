'use strict';
(() => {
 const app=document.querySelector('#app');if(!app)return;
 const t=(ar,en,de)=>({ar,en,de}[window.ShahinI18n?.language||document.documentElement.lang||'ar']||ar);
 const paths={
  about:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  contact:'<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  directions:'<path d="m12 3 9 9-9 9-9-9Z"/><path d="M8 15v-4h8m-3-3 3 3-3 3"/>',
  phone:'<path d="m8 3 2 5-3 2c2 4 3 5 7 7l2-3 5 2-1 4c-8 3-20-9-16-16Z"/>',
  delivery:'<path d="M3 6h11v11H3Zm11 4h4l3 4v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  hours:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 6 9-6"/>',
  website:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>',
  whatsapp:'<path d="M4 17a9 9 0 1 1 4 3l-5 1Z"/><path d="m9 7 1 3-1 1 4 4 1-1 3 1c-1 5-11-3-10-6Z"/>',
  instagram:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17 7h.01"/>',
  facebook:'<path d="M14 21v-8h3l1-4h-4V7c0-1 1-2 2-2h2V2h-3c-4 0-5 2-5 5v2H7v4h3v8"/>',
  telegram:'<path d="m3 10 18-7-4 18-6-6-4 3 1-6Zm5 2L21 3M11 15l6-7"/>',
  youtube:'<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3Z"/>',
  tiktok:'<path d="M14 3v13a4 4 0 1 1-4-4M14 3c1 4 3 5 6 5"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  chevron:'<path d="m7 10 5 5 5-5"/>'
 };
 function icon(kind){const holder=document.createElement('span');holder.className='sf-info-row-icon';holder.setAttribute('aria-hidden','true');holder.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(paths[kind]||paths.info)+'</svg>';return holder;}
 const labels={about:()=>[t('عن المتجر','About the shop','Über das Geschäft'),t('نبذة عن المتجر ونشاطه','About the shop and its work','Das Geschäft und sein Angebot')],contact:()=>[t('العنوان وطرق التواصل','Address and contact','Adresse und Kontakt'),t('الموقع والهاتف وروابط التواصل','Location, phone and contact links','Standort, Telefon und Kontaktlinks')],delivery:()=>[t('التوصيل والاستلام','Delivery and pickup','Lieferung und Abholung'),t('خيارات التوصيل أو زيارة المتجر','Delivery or a visit to the shop','Lieferung oder Besuch im Geschäft')],hours:()=>[t('أوقات الدوام','Opening hours','Öffnungszeiten'),t('مواعيد الفتح والإغلاق','Opening and closing times','Öffnungs- und Schließzeiten')]};
 function row(control,kind,title,note,chevron=true){
  if(control.dataset.sfInfoRow)return;control.dataset.sfInfoRow=kind;control.classList.add('sf-info-row');
  const copy=document.createElement('span');copy.className='sf-info-row-copy';const strong=document.createElement('strong');strong.textContent=title;copy.append(strong);if(note){const small=document.createElement('small');small.textContent=note;copy.append(small);}control.replaceChildren(icon(kind),copy);if(chevron){const arrow=icon('chevron');arrow.className='sf-info-row-chevron';control.append(arrow);}
 }
 function network(href){try{const u=new URL(href,location.href),h=u.hostname.toLowerCase();if(u.protocol==='tel:')return 'phone';if(u.protocol==='mailto:')return 'mail';if(/(^|\.)(wa.me|whatsapp.com)$/.test(h))return 'whatsapp';if(/(^|\.)(facebook.com|fb.com|fb.me)$/.test(h))return 'facebook';if(/(^|\.)instagram.com$/.test(h))return 'instagram';if(/(^|\.)(t.me|telegram.me)$/.test(h))return 'telegram';if(/(^|\.)(youtube.com|youtu.be)$/.test(h))return 'youtube';if(/(^|\.)tiktok.com$/.test(h))return 'tiktok';}catch{}return 'website';}
 function enhance(){
  if(!app.ownerDocument.defaultView?.document)return;
  for(const info of app.querySelectorAll('.sf-information')){
   info.classList.add('sf-info-refined');const heading=info.querySelector(':scope>h2');if(heading&&/تعرّف على المحل|About this business|Über dieses Geschäft/.test(heading.textContent))heading.textContent=t('معلومات المتجر','Shop information','Geschäftsinformationen');
   for(const a of info.querySelectorAll('.sf-contact-actions>a')){const call=a.getAttribute('href')?.startsWith('tel:');row(a,call?'phone':'directions',call?t('اتصل بالمتجر','Call the shop','Geschäft anrufen'):t('الاتجاهات على الخريطة','Get directions','Route auf der Karte'),call?a.getAttribute('href').slice(4):t('افتح المسار للوصول إلى المتجر','Find your way to the shop','Den Weg zum Geschäft finden'),false);if(call){const small=a.querySelector('small');if(small){small.dir='ltr';small.classList.add('sf-info-phone-number');}}}
   for(const button of info.querySelectorAll('.shop-info-tabs button')){
    if(button.dataset.sfInfoRow)continue;const text=button.textContent;let kind=/العنوان|Address|contact|Adresse|Kontakt/i.test(text)?'contact':/التوصيل|Delivery|Lieferung/i.test(text)?'delivery':/الدوام|hours|Öffnungszeiten/i.test(text)?'hours':/عن المحل|نبذة|About|Über/i.test(text)?'about':'info';
    const panel=document.getElementById(button.getAttribute('aria-controls'));if(panel)panel.dataset.sfInfoKind=kind;const details=labels[kind]?.();row(button,kind,details?.[0]||text,details?.[1]||'');
   }
   for(const panel of info.querySelectorAll('.shop-info-panel[data-sf-info-kind="contact"]')){
    for(const p of panel.querySelectorAll(':scope>p')){if(p.dataset.sfContactDetail)continue;p.dataset.sfContactDetail='';p.classList.add('sf-contact-detail');const a=p.querySelector('a'),kind=a?network(a.getAttribute('href')):'contact';const content=document.createElement('div');content.className='sf-contact-detail-copy';content.append(...p.childNodes);p.append(icon(kind),content);}
    for(const visit of panel.querySelectorAll('[data-visit-store]'))row(visit,'contact',t('عرض موقع المتجر','View shop location','Geschäftsstandort ansehen'),t('العنوان ومكان المتجر على الخريطة','Address and location on the map','Adresse und Standort auf der Karte'),false);
    for(const a of panel.querySelectorAll('.store-social-link')){if(a.dataset.sfNetworkIcon)continue;a.dataset.sfNetworkIcon='';const badge=a.querySelector('.social-network-icon');if(badge){const svg=icon(network(a.getAttribute('href'))).firstElementChild;badge.replaceChildren(svg);}}
   }
  }
 }
 let queued=false;const observer=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;observer.disconnect();try{enhance();}finally{observer.observe(app,{childList:true,subtree:true});}});});
 observer.observe(app,{childList:true,subtree:true});enhance();
})();
