'use strict';
// Educational and service pages share the directory, without retail checkout tools.
(() => {
 const service=s=>typeof directoryIsService==='function'&&directoryIsService(s);
 const t=(ar,en,de)=>ct(ar,en,de);
 function normalize(s){if(service(s))Object.assign(s,{text_only:true,online_ordering:false,delivery_enabled:false,pickup_enabled:false});return s;}
 const previousReload=reload;reload=async function(){const result=await previousReload.apply(this,arguments);stores.forEach(normalize);if(service(stores.find(s=>s.id===cartStore))){cart={};cartStore=null;if(typeof saveCart==='function')saveCart();}return result;};stores.forEach(normalize);
 const previousRender=renderStore;renderStore=function(id){const s=stores.find(x=>x.id===id);if(s)normalize(s);const result=previousRender.apply(this,arguments);if(!service(s))return result;
  const root=document.querySelector('#app'),banner=root.querySelector('.store-banner');if(!banner)return result;
  banner.dataset.servicePage=directoryKind(s);
  root.querySelectorAll('#cart,[data-add],.catalog-notice').forEach(n=>n.remove());
  banner.querySelector('.meta')?.remove();
  banner.querySelectorAll('.tag:not([data-store-status])').forEach(n=>{if(/توصيل|استلام/.test(n.textContent))n.remove();});
  const heading=root.querySelector('.store-layout h2');if(heading)heading.textContent=directoryCatalogTitle(s);
  const top=root.querySelector('.topline>a');if(top)top.textContent=t('العودة إلى الدليل','Back to directory','Zurück zum Verzeichnis');
  return result;
 };
 const previousCanOrder=canStoreOrder;canStoreOrder=function(s){return !service(s)&&previousCanOrder.apply(this,arguments);};
 const previousCheckout=checkout;checkout=function(s){if(service(s)){toast(t('تواصل مع الجهة للاستفسار عن خدماتها.','Contact the provider to ask about services.','Kontaktiere den Anbieter für Fragen zu Leistungen.'));return;}return previousCheckout.apply(this,arguments);};
 // Keep the same editor and data model for courses/services; hide retail-only sections.
 const blocked=['orders','delivery','drivers','cards'];
 const previousDashboard=merchantDashboard;merchantDashboard=function(ms,s,section){if(service(s)&&blocked.includes(section))section='details';const result=previousDashboard.call(this,ms,s,section);if(!service(s))return result;normalize(s);
  document.querySelectorAll('.merchant-nav a').forEach(a=>{if(blocked.some(key=>a.getAttribute('href')===merchantHref(key,s))||a.hasAttribute('data-card-settings-link'))a.remove();else if(a.getAttribute('href')===merchantHref('products',s))a.textContent=directoryCatalogTitle(s);});
  document.querySelector('.reception')?.remove();
  const overview=document.querySelector('.welcome-panel');if(overview){const h=overview.querySelector('h2'),p=overview.querySelector('p');if(h)h.textContent=t('صفحتك وخدماتك','Your page and services','Deine Seite und Leistungen');if(p)p.textContent=t('حدّث المعلومات والصور والبرامج أو الخدمات التي تقدمها.','Update your details, photos, programs and services.','Aktualisiere Angaben, Fotos, Angebote und Leistungen.');}
  return result;
 };
 const previousEditor=merchantEditor;merchantEditor=function(s,section){if(service(s)&&blocked.includes(section))section='details';const result=previousEditor.call(this,s,section);if(!service(s))return result;
  const form=document.querySelector('#merchant-editor');if(form){for(const field of ['online_ordering','delivery_enabled','pickup_enabled','delivery_fee','minimum_order','delivery_time','areas']){const input=form.elements[field];if(input){input.disabled=true;input.required=false;if(input.type==='checkbox')input.checked=false;input.closest('label')?.setAttribute('hidden','');}}form.querySelector('.service-options')?.setAttribute('hidden','');}
  return result;
 };
 const previousProducts=merchantProducts;merchantProducts=function(s){const result=previousProducts.apply(this,arguments);if(!service(s))return result;const root=document.querySelector('#dashboard-content');if(!root)return result;
  const heading=root.querySelector('.products-heading h2');if(heading)heading.textContent=directoryCatalogTitle(s);
  const hint=root.querySelector('.products-heading p');if(hint)hint.textContent=t('عرّف الزوار بالبرامج أو الخدمات التي تقدمها، مع الصور والتفاصيل والرسوم إن وجدت.','Show your programs or services with photos, details and fees if needed.','Zeige Angebote oder Leistungen mit Fotos, Details und möglichen Gebühren.');
  root.querySelectorAll('#new-product,#first-product').forEach(b=>b.textContent=t('إضافة برنامج أو خدمة','Add a program or service','Angebot oder Leistung hinzufügen'));
  const empty=root.querySelector('.product-empty h3');if(empty)empty.textContent=t('أضف أول برنامج أو خدمة','Add your first program or service','Erstes Angebot oder erste Leistung hinzufügen');return result;
 };
 const previousProductEditor=editProduct;editProduct=function(s,p){const result=previousProductEditor.apply(this,arguments);if(!service(s))return result;const root=document.querySelector('#modal-body');if(!root)return result;
  const title=root.querySelector('h2');if(title)title.textContent=p?t('تعديل البرنامج أو الخدمة','Edit program or service','Angebot oder Leistung bearbeiten'):t('إضافة برنامج أو خدمة','Add a program or service','Angebot oder Leistung hinzufügen');
  const name=root.querySelector('[name="name"]')?.closest('label');if(name?.firstChild?.nodeType===3)name.firstChild.textContent=t('اسم البرنامج أو الخدمة','Program or service name','Name des Angebots oder der Leistung');return result;
 };
})();
