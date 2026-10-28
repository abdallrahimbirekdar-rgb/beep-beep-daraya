'use strict';
// Reuse the existing, permission-checked editors on the actual shop page.
(() => {
 const app=document.getElementById('app');if(!app)return;
 const t=(ar,en,de)=>({ar,en,de}[window.ShahinI18n?.language||'ar']||ar);
 const cleanViews=new Set();let queued=false,returnTo=null;
 const currentStore=id=>stores.find(s=>s.id===id&&!s.deleted_at);
 const canEdit=s=>!!(user&&s&&!s.is_example&&!s._mosqueCatalog&&typeof mine==='function'&&mine().some(x=>x.id===s.id));
 const editHref=(s,key)=>typeof merchantHref==='function'?merchantHref(key,s):admin?'#dashboard/setup/'+s.id+'/'+key:'#dashboard/'+key+'/'+s.id;
 const pageStore=()=>location.hash.split('/')[0]==='#store'?currentStore(location.hash.split('/')[1]):null;
 const view=()=>window.DarayaShopSectionView?.(app);
 const button=(label,action,cls='outline')=>{const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;b.onclick=e=>{e.preventDefault();e.stopPropagation();action();};return b;};
 const link=(label,href,cls='button outline')=>{const a=document.createElement('a');a.className=cls;a.textContent=label;a.href=href;return a;};
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
  try{merchantEditor(s,key);}catch(error){panel.remove();returnTo=null;window.DarayaFeedback?.showError?.(error);return;}
  panel.scrollIntoView?.({block:'start',behavior:'auto'});const input=panel.querySelector('input:not([type=hidden]),textarea,select');input?.focus({preventScroll:true});
 }
 function editItem(id,pid){const existing=app.querySelector('.owner-inline-editor');if(existing&&!closeEditor(existing))return;const s=currentStore(id),p=pid&&products.find(p=>p.id===pid&&p.store_id===id);if(!canEdit(s)||pid&&!p)return;remember(s,'sf-products');editProduct(s,p||{});const dialog=document.getElementById('modal');if(dialog)dialog.dataset.ownerLiveEdit=id;}
 function actions(host,s,key,build){if(!host||host.querySelector(':scope>.owner-edit-controls'))return;const row=document.createElement('div');row.className='owner-edit-controls';row.dataset.noTranslate='';row.setAttribute('aria-label',t('تعديل القسم','Edit section','Bereich bearbeiten'));build(row);const heading=host.querySelector(':scope>h2'),bar=host.querySelector(':scope>.owner-store-bar');if(bar)bar.after(row);else if(heading)heading.after(row);else host.prepend(row);}
 function enhance(){
  queued=false;observer.disconnect();if(!app.ownerDocument.defaultView?.document)return;try{
   const s=pageStore(),hero=app.querySelector('.store-banner');
   if(!canEdit(s)||!hero||hero.dataset.storefront&&hero.dataset.storefront!==s.id){app.classList.remove('owner-live-store','owner-view-clean');app.querySelectorAll('.owner-store-bar,.owner-edit-controls,.owner-product-actions,.owner-inline-editor').forEach(n=>n.remove());return;}
   const medical=typeof directoryIsMedical==='function'&&directoryIsMedical(s);app.classList.add('owner-live-store');const cleanKey=user.id+':'+s.id;app.classList.toggle('owner-view-clean',cleanViews.has(cleanKey));
   if(!hero.querySelector('.owner-store-bar')){
    const bar=document.createElement('section');bar.className='owner-store-bar';bar.dataset.noTranslate='';bar.dataset.ownerStoreId=s.id;bar.dataset.ownerUserId=user.id;const label=document.createElement('strong');label.textContent=s.active?t('صفحة متجرك — يمكنك التعديل مباشرة','Your shop page — edit directly','Deine Geschäftsseite — direkt bearbeiten'):t('معاينة خاصة — المتجر غير منشور ولا يستقبل طلبات','Private preview — shop is not published and takes no orders','Private Vorschau — Geschäft ist nicht veröffentlicht und nimmt keine Bestellungen an');
    const controls=document.createElement('div');controls.className='owner-store-navigation';controls.append(link(t('العودة إلى لوحة التحكم','Back to dashboard','Zurück zur Verwaltung'),editHref(s,'overview')));
    const toggle=button(cleanViews.has(cleanKey)?t('إظهار أزرار التعديل','Show edit buttons','Bearbeitung einblenden'):t('إخفاء أزرار التعديل','Hide edit buttons','Bearbeitung ausblenden'),()=>{if(!canEdit(currentStore(s.id)))return;if(cleanViews.has(cleanKey))cleanViews.delete(cleanKey);else cleanViews.add(cleanKey);app.classList.toggle('owner-view-clean',cleanViews.has(cleanKey));toggle.textContent=cleanViews.has(cleanKey)?t('إظهار أزرار التعديل','Show edit buttons','Bearbeitung einblenden'):t('إخفاء أزرار التعديل','Hide edit buttons','Bearbeitung ausblenden');});controls.append(toggle);bar.append(label,controls);hero.prepend(bar);
   }
   actions(hero,s,'identity',row=>row.append(button(t('تعديل الاسم والمعلومات','Edit name and details','Name und Angaben bearbeiten'),()=>openInline(s.id,'details','sf-info')),button(t('تغيير صورة المتجر','Change shop photo','Geschäftsfoto ändern'),()=>openInline(s.id,'photos','sf-tools'))));
   actions(app.querySelector('#sf-products'),s,'products',row=>row.append(button(t('+ إضافة منتج','+ Add product','+ Produkt hinzufügen'),()=>editItem(s.id)),link(t('إدارة جميع المنتجات','Manage all products','Alle Produkte verwalten'),editHref(s,'products'))));
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
  let result;try{if(privatePreview){s.active=true;s.is_open=false;}result=previousStore.apply(this,arguments);}finally{if(privatePreview){s.active=active;s.is_open=open;}}
  enhance();const restore=returnTo?.ready?returnTo:liveState;if(restore&&restore.uid===user?.id&&restore.id===id){if(returnTo?.ready)returnTo=null;requestAnimationFrame(()=>{if(!app.ownerDocument.defaultView?.document)return;if(pageStore()?.id!==id||user?.id!==restore.uid)return;window.DarayaRefreshSectionMenus?.();enhance();if(restore.section)view()?.open(restore.section);});}return result;
 };
 const previousDashboard=merchantDashboard;merchantDashboard=function(ms,s,section){const result=previousDashboard.apply(this,arguments);if(!canEdit(s))return result;const home=!section||section==='overview';for(const a of app.querySelectorAll('.merchant-preview')){a.dataset.noTranslate='';a.textContent=home?t('فتح متجري والتعديل','Open and edit my shop','Mein Geschäft öffnen und bearbeiten'):t('العودة إلى صفحة متجري','Back to my shop page','Zurück zu meiner Geschäftsseite');a.title=t('شاهد صفحة متجرك وعدّل أقسامها مباشرة','See your shop page and edit its sections directly','Geschäftsseite ansehen und Bereiche direkt bearbeiten');}for(const back of app.querySelectorAll('.dashboard-menu-back')){back.dataset.noTranslate='';back.textContent=t('العودة إلى لوحة التحكم','Back to dashboard','Zurück zur Verwaltung');}return result;};
 document.getElementById('modal')?.addEventListener('close',()=>{const dialog=document.getElementById('modal');const saved=!!dialog.querySelector('[data-save-committed="true"]');if(saved&&returnTo)returnTo.ready=true;if(!dialog.dataset.ownerLiveEdit)return;if(!saved)returnTo=null;delete dialog.dataset.ownerLiveEdit;});
 app.addEventListener('click',event=>{if(!event.target.closest?.('.menu-sections [data-section]'))return;const panel=app.querySelector('.owner-inline-editor');if(!panel)return;if(!closeEditor(panel)){event.preventDefault();event.stopImmediatePropagation();}else returnTo=null;},true);
 window.addEventListener('hashchange',()=>{if(!location.hash.startsWith('#store/'))returnTo=null;enhance();});
 window.addEventListener('languagechange',()=>{app.querySelectorAll('.owner-store-bar,.owner-edit-controls,.owner-product-actions').forEach(n=>n.remove());enhance();});
 enhance();
})();
