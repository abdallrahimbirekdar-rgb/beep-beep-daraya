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
  if(toggle){toggle.setAttribute('aria-expanded',String(expanded));toggle.textContent=expanded?t('إنهاء التعديل','Finish editing','Bearbeitung beenden'):t('إدارة الصفحة','Manage page','Seite verwalten');}
  if(panel){panel.hidden=!expanded;panel.toggleAttribute('inert',!expanded);}
 }
 function remember(s,section){returnTo={uid:user.id,id:s.id,section:section||view()?.active||null};}
 function closeEditor(panel,confirmChanges=true){if(panel?.dataset.dirty==='true'&&confirmChanges&&!confirm(t('لديك تعديلات لم تُحفظ. هل تريد إغلاق التعديل؟','You have unsaved changes. Close this editor?','Du hast ungespeicherte Änderungen. Bearbeitung schließen?')))return false;panel?.remove();return true;}
 function focusEditor(panel,field){
  const input=(field&&!field.startsWith('@')&&panel.querySelector('[name="'+field+'"]'))||panel.querySelector('.owner-scope-field input:not([type=hidden]),.owner-scope-field textarea,.owner-scope-field select')||panel.querySelector('input:not([type=hidden]),textarea,select');
  if(!input)return;
  if(field)panel.dataset.editorField=field;
  window.DarayaRevealSection?.(input);
  for(let parent=input.parentElement;parent&&parent!==panel;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
  const accordion=input.closest('.shop-info-panel[hidden]');if(accordion){const trigger=document.getElementById(accordion.getAttribute('aria-labelledby'));trigger?.click();}
  input.focus({preventScroll:true});if(input.tagName==='TEXTAREA'||['text','tel','email','search','url','password'].includes(input.type))input.select?.();input.scrollIntoView?.({block:'center',behavior:'auto'});
 }
 // Keep the native form and save checks, showing only the chosen field.
 function scopeEditor(panel,field,anchor){
  panel.querySelectorAll('.owner-scope-path,.owner-scope-field').forEach(n=>n.classList.remove('owner-scope-path','owner-scope-field'));
  const form=panel.querySelector('#merchant-editor');
  const groups={'@about':['name','category','description','page_mode','directory_kind'],'@contact':['address','contact_phone','directory_region','directory_street','directory_reviewed'],'@sharing':['public_slug']};
  const inputs=(groups[field]||[field]).map(name=>name&&form?.elements.namedItem(name)).filter(Boolean);
  panel.classList.toggle('owner-single-field',!!inputs.length&&panel.dataset.editorKey==='details');
  if(panel.classList.contains('owner-single-field')){
   const mark=label=>{if(!label)return;label.classList.add('owner-scope-field');for(let n=label.parentElement;n&&n!==form;n=n.parentElement)n.classList.add('owner-scope-path');};
   for(const input of inputs)mark(input.closest('label')||input);
   if(field==='@contact'){mark(form.querySelector('[data-social-editor]'));mark(form.querySelector('.store-location-editor'));}
   panel.querySelector('.owner-editor-heading strong').textContent=field==='@about'?t('تعديل بيانات المتجر','Edit shop information','Geschäftsdaten bearbeiten'):field==='@contact'?t('تعديل العنوان وطرق التواصل','Edit address and contact','Adresse und Kontakt bearbeiten'):t('تعديل','Edit','Bearbeiten');
   form.querySelector('[type="submit"]').textContent=t('حفظ','Save','Speichern');
   if(anchor?.isConnected){panel.querySelector(':focus')?.blur();const row=anchor.closest('.owner-field-pair,p.sf-contact-detail')||anchor;row.after(panel);}
  }
 }
 function fieldAction(node,s,field,label,key='details',target='sf-info'){
  if(!node||node.closest('.owner-inline-editor,form'))return;
  const existing=node.querySelector(':scope>.owner-field-action')||node.nextElementSibling;
  if(existing?.classList.contains('owner-field-action')&&existing.dataset.ownerField===field){if(node.matches('p.sf-contact-detail')&&existing.parentElement!==node)node.append(existing);return;}
  const action=document.createElement('span');action.className='owner-field-action';action.dataset.ownerField=field;action.dataset.noTranslate='';
  const edit=button(t('✎ تعديل','✎ Edit','✎ Bearbeiten'),()=>{if(!canEdit(currentStore(s.id)))return;openInline(s.id,key,target,field,action);});
  edit.setAttribute('aria-label',label);edit.title=label;action.append(edit);
  if(node.matches('p.sf-contact-detail'))node.append(action);else if(node.parentElement.matches('.sf-contact-actions')&&node.dataset.sfInfoRow){const pair=document.createElement('div');pair.className='owner-field-pair';node.before(pair);pair.append(node,action);}else node.after(action);
 }
 function fieldControls(s){
  const hero=app.querySelector('.store-banner');if(!hero)return;
  fieldAction(hero.querySelector('h1'),s,'name',t('تعديل اسم المتجر','Edit shop name','Geschäftsnamen bearbeiten'));
  fieldAction(hero.querySelector('.sf-cover-button,.store-image'),s,'photo',t('تغيير صورة المتجر','Change shop photo','Geschäftsfoto ändern'),'photos','sf-tools');
  // Information is edited inside the visitor's existing accordion sections.
  const nav=app.querySelector('#sf-info .sf-info-accordion');
  const missing=[['about',t('عن المتجر','About the shop','Über das Geschäft')],['contact',t('العنوان وطرق التواصل','Address and contact','Adresse und Kontakt')]];
  if(!(typeof directoryIsMedical==='function'&&directoryIsMedical(s)))missing.push(['hours',t('أوقات الدوام','Opening hours','Öffnungszeiten')]);
  for(const [kind,label] of missing){
   if(!nav||nav.querySelector('.shop-info-panel[data-sf-info-kind="'+kind+'"]'))continue;
   const item=document.createElement('section');item.className='sf-info-accordion-item owner-only-section';item.dataset.open='false';
   const trigger=button(label,()=>{});trigger.className='sf-info-row';trigger.dataset.sfInfoRow=kind;trigger.id='owner-info-toggle-'+kind;
   const panel=document.createElement('section');panel.className='shop-info-panel';panel.id='owner-info-'+kind;panel.dataset.sfInfoKind=kind;panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-labelledby',trigger.id);trigger.setAttribute('aria-controls',panel.id);trigger.setAttribute('aria-expanded','false');
   trigger.onclick=()=>{const opening=panel.hidden;for(const sibling of nav.querySelectorAll(':scope>.sf-info-accordion-item')){sibling.querySelector(':scope>.shop-info-panel').hidden=true;sibling.querySelector(':scope>button').setAttribute('aria-expanded','false');sibling.dataset.open='false';}panel.hidden=!opening;trigger.setAttribute('aria-expanded',String(opening));item.dataset.open=String(opening);};item.append(trigger,panel);nav.append(item);
  }
  for(const trigger of app.querySelectorAll('#sf-info .sf-info-accordion-item>button[aria-controls]')){
   if(trigger.dataset.ownerSectionBound)continue;
   const host=document.getElementById(trigger.getAttribute('aria-controls')),kind=host?.dataset.sfInfoKind;
   const custom=host?.querySelector('[data-page-section-id]')?.dataset.pageSectionId;const key={about:'details',contact:'details',hours:'hours',delivery:'delivery'}[kind]||(custom?'page-'+custom:null);if(!key)continue;
   trigger.dataset.ownerSectionBound='true';const original=trigger.onclick;
   trigger.onclick=function(event){
    const active=canEdit(currentStore(s.id))&&editingViews.has(user.id+':'+s.id),opening=host.hidden;
    if(active&&opening){const old=app.querySelector('.owner-inline-editor');if(old&&old.dataset.editorKey!==key&&!closeEditor(old))return;}
    original?.call(this,event);
    if(active&&!host.hidden){openInline(s.id,key,host.id,key==='details'?'@'+kind:undefined);}
   };
  }
 }
 function openInline(id,key,target,field,anchor){
  const s=currentStore(id);if(!canEdit(s))return;
  const existing=app.querySelector('.owner-inline-editor');if(existing?.dataset.editorKey===key){if(field?.startsWith('@')||key==='hours'||key==='delivery'){const host=app.querySelector('#'+target);if(host?.matches('.shop-info-panel')){host.prepend(existing);remember(s,'sf-info');returnTo.group=host.dataset.sfInfoKind;}}scopeEditor(existing,field,anchor);existing.scrollIntoView?.({block:'start',behavior:'auto'});focusEditor(existing,field);return;}
  if(existing&&!closeEditor(existing))return;
  const host=app.querySelector('#'+target);if(!host){location.hash=editHref(s,key);return;}
  const section=host.closest('#sf-info')?'sf-info':target;remember(s,section);if(host.dataset.sfInfoKind)returnTo.group=host.dataset.sfInfoKind;view()?.open(section);
  const panel=document.createElement('section');panel.className='owner-inline-editor';panel.dataset.editorKey=key;panel.dataset.noTranslate='';
  const head=document.createElement('div');head.className='owner-editor-heading';const title=document.createElement('strong');title.textContent=t('تعديل هذا القسم','Edit this section','Diesen Bereich bearbeiten');
  const close=button(t('إلغاء','Cancel','Abbrechen'),()=>{if(closeEditor(panel)){returnTo=null;host.querySelector('h2')?.focus?.();}});head.append(title,close);
  const content=document.createElement('div');content.id='dashboard-content';content.className='owner-inline-content';panel.append(head,content);
  const controls=host.querySelector(':scope>.owner-edit-controls');if(controls)controls.after(panel);else host.prepend(panel);
  panel.addEventListener('input',()=>panel.dataset.dirty='true');panel.addEventListener('change',()=>panel.dataset.dirty='true');
  try{if(key==='products'){merchantProducts(s);for(const add of content.querySelectorAll('#new-product,#first-product'))add.onclick=()=>editItem(s.id);for(const edit of content.querySelectorAll('[data-edit-product]'))edit.onclick=()=>editItem(s.id,edit.dataset.editProduct);for(const del of content.querySelectorAll('[data-delete-product]'))del.onclick=()=>removeItem(s.id,del.dataset.deleteProduct);}else if(key==='cards')window.DarayaShopCards.settings(s.id,content);else if(key==='new-section'||key.startsWith('page-'))window.DarayaPageSections.edit(s,key,()=>{if(!canEdit(currentStore(s.id)))return;returnTo.ready=true;renderStore(s.id);});else merchantEditor(s,key);}catch(error){panel.remove();returnTo=null;window.DarayaFeedback?.showError?.(error);return;}
  scopeEditor(panel,field,anchor);
  panel.addEventListener('invalid',e=>{scopeEditor(panel,e.target.name);focusEditor(panel,e.target.name);},true);
  panel.scrollIntoView?.({block:'start',behavior:'auto'});focusEditor(panel,field);
 }
 function openOffer(s){
  if(!canEdit(currentStore(s.id)))return;
  const old=app.querySelector('.owner-inline-editor');if(old&&!closeEditor(old))return;
  remember(s,'sf-offers');window.DarayaOffers?.edit(s);
 }
 function sectionTools(s){
  const offers=app.querySelector('#sf-offers');
  const cards=managementEntries.some(x=>x.matches('[data-card-settings-link]'));
  if(window.DarayaOffers?.eligible(s)||cards)actions(offers,s,'offers',row=>{
   const add=button(t('+ إضافة عرض','+ Add offer','+ Angebot hinzufügen'),()=>openOffer(s));add.dataset.ownerAddOffer='';if(window.DarayaOffers?.eligible(s))row.append(add);if(cards&&window.DarayaShopCards)row.append(button(t('إعدادات المتابعة والبطاقات','Follow and card settings','Follower- und Karteneinstellungen'),()=>openInline(s.id,'cards','sf-offers')));
   row.append(button(t('إدارة عروض المتجر','Manage shop offers','Geschäftsangebote verwalten'),()=>{
    if(!canEdit(currentStore(s.id)))return;
    const box=offers.querySelector('[data-owner-offer-list]')||document.createElement('div');box.dataset.ownerOfferList='';box.className='owner-offer-list';offers.append(box);window.DarayaOffers.manage(s,box);
   }));
  });
  actions(app.querySelector('#sf-share'),s,'sharing',row=>{
   row.append(button(t('تعديل رابط المتجر','Edit shop link','Geschäftslink bearbeiten'),()=>openInline(s.id,'details','sf-share','@sharing')),
   button(t('تعديل بيانات المنيو','Edit menu information','Menüdaten bearbeiten'),()=>openInline(s.id,'products','sf-share')));
  });
  const other=app.querySelector('#sf-other-tools');other?.querySelectorAll(':scope>.owner-edit-controls[data-owner-controls-key="photos"]').forEach(n=>n.remove());actions(other,s,'tools',row=>{
   if(window.DarayaPageSections)row.append(button(t('+ إضافة قسم للصفحة','+ Add page section','+ Seitenbereich hinzufügen'),()=>openInline(s.id,'new-section','sf-other-tools')));
  });
  // Reuse the original permission/plan-checked links and their event handlers.
  const tools=other?.querySelector(':scope>.owner-edit-controls'),offerTools=offers?.querySelector(':scope>.owner-edit-controls');
  for(const entry of managementEntries){
   if(entry.matches('[data-card-settings-link]')&&window.DarayaShopCards){entry.remove();continue;}const target=entry.matches('[data-card-settings-link]')?offerTools:tools;if(!target||target.contains(entry))continue;target.append(entry);
  }
  for(const section of app.querySelectorAll('.public-shop-section[data-page-section-id]')){
   const key='page-'+section.dataset.pageSectionId;actions(section,s,key,row=>row.append(button(t('تعديل هذا القسم','Edit this section','Diesen Bereich bearbeiten'),()=>{
    if(!section.id)section.id='owner-page-'+section.dataset.pageSectionId;openInline(s.id,key,section.id);
   })));
  }
 }
 function editItem(id,pid){
  const s=currentStore(id),p=pid&&products.find(p=>p.id===pid&&p.store_id===id);if(!canEdit(s)||pid&&!p)return;
  const existing=app.querySelector('.owner-inline-editor');if(existing&&!closeEditor(existing))return;
  remember(s,'sf-products');
  try{const section=typeof productSection==='string'&&productSection!=='all'?productSection:undefined;editProduct(s,p||(section?{section}:{}));const dialog=document.getElementById('modal');if(dialog)dialog.dataset.ownerLiveEdit=id;}
  catch(error){window.DarayaFeedback?.showError(error);}
 }
 function removeItem(id,pid){
  const s=currentStore(id),p=products.find(p=>p.id===pid&&p.store_id===id);if(!canEdit(s)||!p)return;
  const existing=app.querySelector('.owner-inline-editor');if(existing&&!closeEditor(existing))return;
  remember(s,'sf-products');
  modal('<section data-no-translate><h2>'+esc(t('حذف المنتج؟','Delete product?','Produkt löschen?'))+'</h2><p>'+esc(p.name)+'</p><p>'+esc(t('سيختفي المنتج من المتجر. تبقى تفاصيل الطلبات السابقة محفوظة.','The product will disappear from the shop. Previous order details are kept.','Das Produkt verschwindet aus dem Geschäft. Bisherige Bestelldaten bleiben erhalten.'))+'</p><form id="owner-delete-product-form"><button type="submit" class="danger">'+esc(t('تأكيد حذف المنتج','Confirm product deletion','Löschen bestätigen'))+'</button><p id="form-error" role="alert"></p></form></section>');
  const dialog=document.getElementById('modal'),form=document.getElementById('owner-delete-product-form');dialog.dataset.ownerLiveEdit=id;
  form.onsubmit=async e=>{
   e.preventDefault();if(form.dataset.saveCommitted==='true'||form.dataset.saving==='true')return;
   const actor=user?.id,submit=e.submitter||form.querySelector('[type=submit]');form.dataset.saving='true';submit.disabled=true;window.DarayaSaveFeedback?.start(form);
   try{
    if(!canEdit(currentStore(id)))throw Error(t('لم تعد تملك صلاحية تعديل هذا المتجر.','You no longer have permission to edit this shop.','Du darfst dieses Geschäft nicht mehr bearbeiten.'));
    let request=api.from('products').delete().eq('id',pid).eq('store_id',id);if(p.revision!=null)request=request.eq('revision',p.revision);
    const r=await request.select('id');if(r.error)throw r.error;if(!r.data?.length)throw Error(t('تغيّر المنتج أو لم تعد تملك صلاحية حذفه. حدّث الصفحة وأعد المحاولة.','The product changed or cannot be deleted. Refresh and try again.','Produkt geändert oder Löschen nicht erlaubt. Aktualisieren und erneut versuchen.'));
    if(user?.id!==actor||!form.isConnected)return;
    if(window.DarayaSaveFeedback)await window.DarayaSaveFeedback.complete(form,t('تم حذف المنتج بنجاح.','Product deleted.','Produkt gelöscht.'),{closeModal:true});
    else{form.dataset.saveCommitted='true';await reload();dialog.close();render();}
   }catch(error){if(user?.id===actor&&form.isConnected){window.DarayaSaveFeedback?.fail(error,form,'#form-error');submit.disabled=false;}}
   finally{form.dataset.saving='false';}
  };
 }
 function actions(host,s,key,build){if(!host||host.querySelector(':scope>.owner-edit-controls[data-owner-controls-key="'+key+'"]'))return;const row=document.createElement('div');row.className='owner-edit-controls';row.dataset.ownerControlsKey=key;row.dataset.noTranslate='';row.setAttribute('aria-label',t('تعديل القسم','Edit section','Bereich bearbeiten'));build(row);const heading=host.querySelector(':scope>h2'),bar=host.querySelector(':scope>.owner-store-bar');if(bar)bar.after(row);else if(heading)heading.after(row);else host.prepend(row);}
 function enhance(){
  queued=false;observer.disconnect();if(!app.ownerDocument.defaultView?.document)return;try{
   const s=pageStore(),hero=app.querySelector('.store-banner');
   if(!canEdit(s)||!hero||hero.dataset.storefront&&hero.dataset.storefront!==s.id){app.classList.remove('owner-live-store','owner-view-clean');app.querySelectorAll('.owner-store-bar,.owner-edit-controls,.owner-product-actions,.owner-inline-editor,.owner-field-action,.owner-field-fallback,.owner-only-section,.owner-offer-list').forEach(n=>n.remove());app.querySelectorAll('.owner-field-pair').forEach(n=>n.replaceWith(...n.childNodes));return;}
   const medical=typeof directoryIsMedical==='function'&&directoryIsMedical(s);app.classList.add('owner-live-store');const editKey=user.id+':'+s.id;app.classList.toggle('owner-view-clean',!editingViews.has(editKey));
   if(!hero.querySelector('.owner-store-bar')){
    const bar=document.createElement('section');bar.className='owner-store-bar';bar.dataset.noTranslate='';bar.dataset.ownerStoreId=s.id;bar.dataset.ownerUserId=user.id;
    const controls=document.createElement('div');controls.className='owner-store-navigation';
    const tools=document.createElement('details');tools.className='owner-management-tools';const summary=document.createElement('summary');summary.textContent=t('أدوات الإدارة','Management tools','Verwaltungswerkzeuge');tools.append(summary);const menu=document.createElement('div');
    if(admin)menu.append(link(t('إدارة المنصة','Platform admin','Plattformverwaltung'),'#dashboard/stores'));
    menu.append(...managementEntries);
    for(const entry of managementEntries){const locked=entry.classList.contains('locked-plan-nav');entry.className='button outline'+(locked?' locked-plan-nav':'');entry.removeAttribute('aria-current');}
    if(!menu.querySelector('a[href^="#merchant-help/"]'))menu.append(link(t('دليل صاحب المتجر','Shop owner guide','Geschäftsanleitung'),'#merchant-help/'+s.id));
    tools.append(menu);controls.append(tools);
    const owned=typeof mine==='function'?mine().filter(x=>!x.deleted_at&&!x.is_example):[];if(owned.length>1){const picker=document.createElement('select');picker.setAttribute('aria-label',t('اختيار المتجر','Choose shop','Geschäft auswählen'));for(const shop of owned){const option=document.createElement('option');option.value=shop.id;option.textContent=shop.name;option.selected=shop.id===s.id;picker.append(option);}picker.onchange=()=>{location.hash='#store/'+picker.value;};menu.append(picker);}
    const toggle=button(t('إدارة الصفحة','Manage page','Seite verwalten'),()=>{
     if(!canEdit(currentStore(s.id)))return;
     if(editingViews.has(editKey)){const editor=app.querySelector('.owner-inline-editor');if(editor&&!closeEditor(editor))return;editingViews.delete(editKey);returnTo=null;}
     else editingViews.add(editKey);
     syncManagement(s);
     if(editingViews.has(editKey)){fieldControls(s);const host=app.querySelector('#sf-info .shop-info-panel:not([hidden])'),kind=host?.dataset.sfInfoKind,key={about:'details',contact:'details',hours:'hours',delivery:'delivery'}[kind];if(key)openInline(s.id,key,host.id,key==='details'?'@'+kind:undefined);}
    });toggle.className='outline owner-manage-toggle';toggle.setAttribute('aria-controls','owner-page-management');
    const panel=document.createElement('div');panel.id='owner-page-management';panel.className='owner-page-management';panel.append(controls);
    const notice=document.createElement('p');notice.className='owner-edit-mode-notice';notice.setAttribute('role','status');notice.textContent=t('أنت الآن في وضع التعديل. افتح أي قسم لتعديل معلوماته. أدوات التعديل لا تظهر للزوار.','You are in edit mode. Open a section to edit its information. Visitors do not see these editing tools.','Du bist im Bearbeitungsmodus. Öffne einen Bereich, um seine Daten zu bearbeiten. Besucher sehen diese Werkzeuge nicht.');bar.append(toggle,panel,notice);
    if(!s.active){const notice=document.createElement('small');notice.className='owner-private-notice';notice.textContent=t('معاينة خاصة — المتجر غير منشور ولا يستقبل طلبات','Private preview — shop is not published and takes no orders','Private Vorschau — Geschäft ist nicht veröffentlicht und nimmt keine Bestellungen an');bar.append(notice);}
    hero.prepend(bar);
   }
   syncManagement(s);
   fieldControls(s);sectionTools(s);
   actions(app.querySelector('#sf-products'),s,'products',row=>row.append(button(t('+ إضافة منتج جديد','+ Add new product','+ Neues Produkt hinzufügen'),()=>editItem(s.id),'owner-add-product'),button(t('إدارة المنتجات والأقسام','Manage products and categories','Produkte und Kategorien verwalten'),()=>openInline(s.id,'products','sf-products'))));

   const info=app.querySelector('#sf-info');
   if(info?.querySelector('.shop-info-tabs'))info.querySelector(':scope>.owner-edit-controls')?.remove();
   else actions(info,s,'details',row=>row.append(button(t('تعديل معلومات المتجر','Edit shop information','Geschäftsdaten bearbeiten'),()=>openInline(s.id,'details','sf-info'))));
   actions(app.querySelector('#sf-tools'),s,'photos',row=>row.append(button(t('تعديل صورة المتجر وإضافة صور','Edit shop photo and add photos','Geschäftsfoto bearbeiten und Bilder hinzufügen'),()=>openInline(s.id,'photos','sf-tools'))));
   if(!medical)actions(app.querySelector('#sf-videos'),s,'videos',row=>row.append(button(t('إضافة الفيديوهات وتعديلها','Add and edit videos','Videos hinzufügen und bearbeiten'),()=>openInline(s.id,'videos','sf-videos'))));
   actions(app.querySelector('#sf-orders'),s,'delivery',row=>row.append(button(t('تعديل إعدادات الطلب والتوصيل','Edit order and delivery settings','Bestell- und Liefereinstellungen bearbeiten'),()=>openInline(s.id,'delivery','sf-orders')),link(t('الطلبات الواردة','Incoming orders','Eingehende Bestellungen'),editHref(s,'orders'))));
   for(const card of app.querySelectorAll('.product')){if(card.querySelector('.owner-product-actions'))continue;const id=card.dataset.productId||card.dataset.promoProductId||card.querySelector('[data-add]')?.dataset.add;const p=products.find(p=>p.id===id&&p.store_id===s.id);if(!p)continue;const row=document.createElement('div');row.className='owner-product-actions';row.dataset.noTranslate='';row.append(button(t('✎ تعديل المنتج والسعر','✎ Edit product and price','✎ Produkt und Preis bearbeiten'),()=>editItem(s.id,p.id)),button(t('حذف المنتج','Delete product','Produkt löschen'),()=>removeItem(s.id,p.id),'outline danger owner-delete-product'));(card.querySelector(':scope>div')||card).append(row);}
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
   const editorRoutes=['overview',...Object.keys(editableSections),'new-section',...(s.translations?._page_sections||[]).map(x=>'page-'+x.id)].map(key=>editHref(s,key));
   managementEntries=[...app.querySelectorAll('.merchant-nav a,.merchant-nav [data-store-transfer]')].filter(a=>!a.hidden&&!editorRoutes.includes(a.getAttribute('href')));
   app.classList.remove('professional-home','dashboard-menu-home','dashboard-menu-section','dashboard-menu-layout');
   delete app.dataset.dashboardSection;delete app.dataset.dashboardRoute;
  }
  let result;try{if(privatePreview){s.active=true;s.is_open=false;}result=previousStore.apply(this,arguments);}finally{if(privatePreview){s.active=active;s.is_open=open;}}
  enhance();const restore=returnTo?.ready?returnTo:liveState;if(restore&&restore.uid===user?.id&&restore.id===id){if(returnTo?.ready)returnTo=null;requestAnimationFrame(()=>{if(!app.ownerDocument.defaultView?.document)return;if(pageStore()?.id!==id||user?.id!==restore.uid)return;window.DarayaRefreshSectionMenus?.();enhance();if(restore.section)view()?.open(restore.section);if(restore.group){const group=app.querySelector('.shop-info-panel[data-sf-info-kind="'+restore.group+'"]');if(group?.hidden)document.getElementById(group.getAttribute('aria-labelledby'))?.click();}});}return result;
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
 window.addEventListener('languagechange',()=>{app.querySelectorAll('.owner-store-bar,.owner-edit-controls,.owner-product-actions,.owner-field-action,.owner-field-fallback,.owner-only-section,.owner-offer-list').forEach(n=>n.remove());enhance();});
 enhance();
})();
