'use strict';
// Reuse the existing, permission-checked editors on the actual shop page.
(() => {
 const app=document.getElementById('app');if(!app)return;
 const t=(ar,en,de)=>({ar,en,de}[window.ShahinI18n?.language||'ar']||ar);
 const editingViews=new Set();let queued=false,returnTo=null,managementEntries=[];
 const currentStore=id=>stores.find(s=>s.id===id&&!s.deleted_at);
 const canEdit=s=>!!(user&&s&&!s.is_example&&!s._mosqueCatalog&&typeof mine==='function'&&mine().some(x=>x.id===s.id));
 const editHref=(s,key)=>typeof merchantHref==='function'?merchantHref(key,s):admin?'#dashboard/setup/'+s.id+'/'+key:'#dashboard/'+key+'/'+s.id;
 const pageStore=()=>{
  if(location.hash.split('/')[0]==='#store')return currentStore(location.hash.split('/')[1]);
  if(location.hash||typeof placeSlug!=='function')return null;
  const match=location.pathname.match(/^\/darayya\/([^/]+)\/?$/);if(!match)return null;
  let slug;try{slug=decodeURIComponent(match[1]);}catch{return null;}
  return stores.find(s=>s.active&&!s.deleted_at&&placeSlug(s)===slug)||null;
 };
 const view=()=>window.DarayaShopSectionView?.(app);
 const button=(label,action,cls='outline')=>{const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;b.onclick=e=>{e.preventDefault();e.stopPropagation();action();};return b;};
 const link=(label,href,cls='button outline')=>{const a=document.createElement('a');a.className=cls;a.textContent=label;a.href=href;return a;};
 function syncManagement(s){
  const expanded=editingViews.has(user.id+':'+s.id),bar=app.querySelector('.owner-store-bar');
  app.classList.toggle('owner-view-clean',!expanded);bar?.classList.toggle('owner-management-closed',!expanded);
  const toggle=bar?.querySelector('.owner-manage-toggle'),panel=bar?.querySelector('.owner-page-management');
  if(toggle){toggle.setAttribute('aria-expanded',String(expanded));toggle.textContent=expanded?t('إغلاق الإدارة','Close management','Verwaltung schließen'):t('إدارة الصفحة','Manage page','Seite verwalten');}
  if(panel){panel.hidden=!expanded;panel.toggleAttribute('inert',!expanded);}
 }
 function remember(s,section){returnTo={uid:user.id,id:s.id,section:section||view()?.active||null};}
 function closeEditor(panel,confirmChanges=true){if(panel?.dataset.dirty==='true'&&confirmChanges&&!confirm(t('لديك تعديلات لم تُحفظ. هل تريد إغلاق التعديل؟','You have unsaved changes. Close this editor?','Du hast ungespeicherte Änderungen. Bearbeitung schließen?')))return false;panel?.remove();return true;}
 function openInline(id,key,target){
  const s=currentStore(id);if(!canEdit(s))return;
  const existing=app.querySelector('.owner-inline-editor');if(existing?.dataset.editorKey===key){existing.scrollIntoView?.({block:'start',behavior:'auto'});return;}
  if(existing&&!closeEditor(existing))return;
  const host=app.querySelector('#'+target);if(!host){location.hash=editHref(s,key);return;}
  remember(s,target);view()?.open(target);
  const panel=document.createElement('section');panel.className='owner-inline-editor';panel.dataset.editorKey=key;panel.dataset.noTranslate='';
  const head=document.createElement('div');head.className='owner-editor-heading';const title=document.createElement('strong');title.textContent=t('تعديل هذا القسم','Edit this section','Diesen Bereich bearbeiten');
  const close=button(t('إغلاق التعديل','Close editor','Bearbeitung schließen'),()=>{if(closeEditor(panel)){returnTo=null;host.querySelector('h2')?.focus?.();}});head.append(title,close);
  const content=document.createElement('div');content.id='dashboard-content';content.className='owner-inline-content';panel.append(head,content);
  const controls=host.querySelector(':scope>.owner-edit-controls');if(controls)controls.after(panel);else host.prepend(panel);
  panel.addEventListener('input',()=>panel.dataset.dirty='true');panel.addEventListener('change',()=>panel.dataset.dirty='true');
  try{if(key==='products')merchantProducts(s);else merchantEditor(s,key);}catch(error){panel.remove();returnTo=null;window.DarayaFeedback?.showError?.(error);return;}
  panel.scrollIntoView?.({block:'start',behavior:'auto'});const input=panel.querySelector('input:not([type=hidden]),textarea,select');input?.focus({preventScroll:true});
 }
 function editItem(id,pid){const existing=app.querySelector('.owner-inline-editor');if(existing&&!closeEditor(existing))return;const s=currentStore(id),p=pid&&products.find(p=>p.id===pid&&p.store_id===id);if(!canEdit(s)||pid&&!p)return;remember(s,'sf-products');editProduct(s,p||{});const dialog=document.getElementById('modal');if(dialog)dialog.dataset.ownerLiveEdit=id;}
 function actions(host,s,key,build){if(!host||host.querySelector(':scope>.owner-edit-controls'))return;const row=document.createElement('div');row.className='owner-edit-controls';row.dataset.noTranslate='';row.setAttribute('aria-label',t('تعديل القسم','Edit section','Bereich bearbeiten'));build(row);const heading=host.querySelector(':scope>h2'),bar=host.querySelector(':scope>.owner-store-bar');if(bar)bar.after(row);else if(heading)heading.after(row);else host.prepend(row);}
 function enhance(){
  queued=false;observer.disconnect();if(!app.ownerDocument.defaultView?.document)return;try{
   const s=pageStore(),hero=app.querySelector('.store-banner');
   if(!canEdit(s)||!hero||hero.dataset.storefront&&hero.dataset.storefront!==s.id){app.classList.remove('owner-live-store','owner-view-clean');app.querySelectorAll('.owner-store-bar,.owner-edit-controls,.owner-product-actions,.owner-inline-editor').forEach(n=>n.remove());return;}
   const medical=typeof directoryIsMedical==='function'&&directoryIsMedical(s);app.classList.add('owner-live-store');const editKey=user.id+':'+s.id;app.classList.toggle('owner-view-clean',!editingViews.has(editKey));
   if(!hero.querySelector('.owner-store-bar')){
    const bar=document.createElement('section');bar.className='owner-store-bar';bar.dataset.noTranslate='';bar.dataset.ownerStoreId=s.id;bar.dataset.ownerUserId=user.id;const label=document.createElement('strong');label.textContent=s.active?t('صفحة متجرك — يمكنك التعديل مباشرة','Your shop page — edit directly','Deine Geschäftsseite — direkt bearbeiten'):t('معاينة خاصة — المتجر غير منشور ولا يستقبل طلبات','Private preview — shop is not published and takes no orders','Private Vorschau — Geschäft ist nicht veröffentlicht und nimmt keine Bestellungen an');
    const controls=document.createElement('div');controls.className='owner-store-navigation';if(admin)controls.append(link(t('إدارة المنصة','Platform admin','Plattformverwaltung'),'#dashboard/stores'));
    const tools=document.createElement('details');tools.className='owner-management-tools';const summary=document.createElement('summary');summary.textContent=t('أدوات الإدارة','Management tools','Verwaltungswerkzeuge');tools.append(summary);const menu=document.createElement('div');
    menu.append(...managementEntries);
    for(const entry of managementEntries){const locked=entry.classList.contains('locked-plan-nav');entry.className='button outline'+(locked?' locked-plan-nav':'');entry.removeAttribute('aria-current');}
    if(!menu.querySelector('a[href^="#merchant-help/"]'))menu.append(link(t('دليل صاحب المتجر','Shop owner guide','Geschäftsanleitung'),'#merchant-help/'+s.id));
    tools.append(menu);controls.append(tools);
    const owned=typeof mine==='function'?mine().filter(x=>!x.deleted_at&&!x.is_example):[];if(owned.length>1){const picker=document.createElement('select');picker.setAttribute('aria-label',t('اختيار المتجر','Choose shop','Geschäft auswählen'));for(const shop of owned){const option=document.createElement('option');option.value=shop.id;option.textContent=shop.name;option.selected=shop.id===s.id;picker.append(option);}picker.onchange=()=>{location.hash='#store/'+picker.value;};controls.append(picker);}
    const toggle=button(t('إدارة الصفحة','Manage page','Seite verwalten'),()=>{
     if(!canEdit(currentStore(s.id)))return;
     if(editingViews.has(editKey)){const editor=app.querySelector('.owner-inline-editor');if(editor&&!closeEditor(editor))return;editingViews.delete(editKey);returnTo=null;}
     else editingViews.add(editKey);
     syncManagement(s);
    });toggle.className='outline owner-manage-toggle';toggle.setAttribute('aria-controls','owner-page-management');
    const panel=document.createElement('div');panel.id='owner-page-management';panel.className='owner-page-management';panel.append(label,controls);
    const edits=document.createElement('div');edits.className='owner-management-shortcuts';
    for(const [key,target,ar,en,de] of [['details','sf-info','معلومات المتجر','Shop details','Geschäftsdaten'],['photos','sf-tools','صور المتجر','Shop photos','Geschäftsfotos'],['products','sf-products','المنتجات والأسعار','Products and prices','Produkte und Preise'],['videos','sf-videos','فيديوهات المتجر','Shop videos','Geschäftsvideos'],['hours','sf-info','أوقات الدوام','Opening hours','Öffnungszeiten'],['delivery','sf-orders','الطلب والتوصيل','Orders and delivery','Bestellung und Lieferung']]){
     if(medical&&!['details','photos'].includes(key))continue;
     const deferredOrders=key==='delivery'&&!(typeof directoryIsInfo==='function'&&directoryIsInfo(s))&&!(typeof directoryIsService==='function'&&directoryIsService(s));
     if(!app.querySelector('#'+target)&&!deferredOrders)continue;
     edits.append(button(t(ar,en,de),()=>openInline(s.id,key,target)));
    }
    panel.append(edits);bar.append(toggle,panel);hero.prepend(bar);
   }
   syncManagement(s);
   actions(hero,s,'identity',row=>row.append(button(t('تعديل الاسم والمعلومات','Edit name and details','Name und Angaben bearbeiten'),()=>openInline(s.id,'details','sf-info')),button(t('تغيير صورة المتجر','Change shop photo','Geschäftsfoto ändern'),()=>openInline(s.id,'photos','sf-tools'))));
   actions(app.querySelector('#sf-products'),s,'products',row=>row.append(button(t('+ إضافة منتج','+ Add product','+ Produkt hinzufügen'),()=>editItem(s.id)),button(t('إدارة المنتجات والأقسام','Manage products and categories','Produkte und Kategorien verwalten'),()=>openInline(s.id,'products','sf-products'))));
   actions(app.querySelector('#sf-info'),s,'details',row=>{row.append(button(t('تعديل معلومات المتجر والتواصل','Edit shop and contact details','Geschäfts- und Kontaktdaten bearbeiten'),()=>openInline(s.id,'details','sf-info')));if(!medical)row.append(button(t('تعديل أوقات الدوام','Edit opening hours','Öffnungszeiten bearbeiten'),()=>openInline(s.id,'hours','sf-info')));});
   actions(app.querySelector('#sf-tools'),s,'photos',row=>row.append(button(t('تعديل صورة المتجر وإضافة صور','Edit shop photo and add photos','Geschäftsfoto bearbeiten und Bilder hinzufügen'),()=>openInline(s.id,'photos','sf-tools'))));
   if(!medical)actions(app.querySelector('#sf-videos'),s,'videos',row=>row.append(button(t('إضافة الفيديوهات وتعديلها','Add and edit videos','Videos hinzufügen und bearbeiten'),()=>openInline(s.id,'videos','sf-videos'))));
   actions(app.querySelector('#sf-orders'),s,'delivery',row=>row.append(button(t('تعديل إعدادات الطلب والتوصيل','Edit order and delivery settings','Bestell- und Liefereinstellungen bearbeiten'),()=>openInline(s.id,'delivery','sf-orders')),link(t('الطلبات الواردة','Incoming orders','Eingehende Bestellungen'),editHref(s,'orders'))));
   for(const card of app.querySelectorAll('.product')){if(card.querySelector('.owner-product-actions'))continue;const id=card.dataset.productId||card.dataset.promoProductId||card.querySelector('[data-add]')?.dataset.add;const p=products.find(p=>p.id===id&&p.store_id===s.id);if(!p)continue;const row=document.createElement('div');row.className='owner-product-actions';row.dataset.noTranslate='';row.append(button(t('✎ تعديل المنتج والسعر','✎ Edit product and price','✎ Produkt und Preis bearbeiten'),()=>editItem(s.id,p.id)));(card.querySelector(':scope>div')||card).append(row);}
  }finally{observer.observe(app,{childList:true,subtree:true});}
 }
 const observer=new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(enhance);}});
 const previousStore=renderStore;renderStore=function(id){
  const s=currentStore(id),privatePreview=canEdit(s)&&!s.active,active=s?.active,open=s?.is_open;
  const oldBar=app.querySelector('.owner-store-bar'),liveState=canEdit(s)&&oldBar?.dataset.ownerStoreId===id&&oldBar.dataset.ownerUserId===user.id?{uid:user.id,id,section:view()?.active}:null;
  const dialog=document.getElementById('modal');if(returnTo&&(app.querySelector('.owner-inline-editor [data-save-committed="true"]')||dialog?.querySelector('[data-save-committed="true"]')&&(dialog.dataset.ownerLiveEdit===id||app.querySelector('.owner-inline-editor'))))returnTo.ready=true;
  // Retain the original tool nodes and their access checks/handlers, then render
  // only the storefront. No second dashboard is mounted beside it.
  managementEntries=[];
  if(canEdit(s)){
   previousDashboard.call(this,mine(),s,'overview');
   const editorRoutes=['overview',...Object.keys(editableSections)].map(key=>editHref(s,key));
   managementEntries=[...app.querySelectorAll('.merchant-nav a,.merchant-nav [data-store-transfer]')].filter(a=>!a.hidden&&!editorRoutes.includes(a.getAttribute('href')));
   app.classList.remove('professional-home','dashboard-menu-home','dashboard-menu-section','dashboard-menu-layout');
   delete app.dataset.dashboardSection;delete app.dataset.dashboardRoute;
  }
  let result;try{if(privatePreview){s.active=true;s.is_open=false;}result=previousStore.apply(this,arguments);}finally{if(privatePreview){s.active=active;s.is_open=open;}}
  enhance();const restore=returnTo?.ready?returnTo:liveState;if(restore&&restore.uid===user?.id&&restore.id===id){if(returnTo?.ready)returnTo=null;requestAnimationFrame(()=>{if(!app.ownerDocument.defaultView?.document)return;if(pageStore()?.id!==id||user?.id!==restore.uid)return;window.DarayaRefreshSectionMenus?.();enhance();if(restore.section)view()?.open(restore.section);});}return result;
 };
 const previousDashboard=merchantDashboard;
 const editableSections={details:'sf-info',photos:'sf-tools',hours:'sf-info',videos:'sf-videos',delivery:'sf-orders',products:'sf-products'};
 merchantDashboard=function(ms,s,section){
  if(canEdit(s)&&(!section||['overview','stores'].includes(section)||editableSections[section])){
   // Old dashboard links open the same shop surface, never a second edit menu.
   if(editableSections[section])editingViews.add(user.id+':'+s.id);else editingViews.delete(user.id+':'+s.id);
   history.replaceState(history.state,'','#store/'+s.id);
   app.classList.remove('professional-home','dashboard-menu-home','dashboard-menu-section','dashboard-menu-layout');
   delete app.dataset.dashboardSection;delete app.dataset.dashboardRoute;
   renderStore(s.id);
   if(editableSections[section]){window.DarayaRefreshSectionMenus?.();enhance();openInline(s.id,section,editableSections[section]);}
   return;
  }
  const result=previousDashboard.apply(this,arguments);if(!canEdit(s))return result;
  for(const a of app.querySelectorAll('.merchant-preview,.dashboard-menu-back')){a.dataset.noTranslate='';a.href='#store/'+s.id;a.textContent=t('العودة إلى لوحة متجري','Back to my shop','Zurück zu meinem Geschäft');}
  return result;
 };
 document.getElementById('modal')?.addEventListener('close',()=>{const dialog=document.getElementById('modal');const saved=!!dialog.querySelector('[data-save-committed="true"]');if(saved&&returnTo)returnTo.ready=true;if(!dialog.dataset.ownerLiveEdit)return;if(!saved)returnTo=null;delete dialog.dataset.ownerLiveEdit;});
 app.addEventListener('click',event=>{if(!event.target.closest?.('.menu-sections [data-section]'))return;const panel=app.querySelector('.owner-inline-editor');if(!panel)return;if(!closeEditor(panel)){event.preventDefault();event.stopImmediatePropagation();}else returnTo=null;},true);
 window.addEventListener('hashchange',()=>{if(!location.hash.startsWith('#store/'))returnTo=null;enhance();});
 window.addEventListener('languagechange',()=>{app.querySelectorAll('.owner-store-bar,.owner-edit-controls,.owner-product-actions').forEach(n=>n.remove());enhance();});
 enhance();
})();
