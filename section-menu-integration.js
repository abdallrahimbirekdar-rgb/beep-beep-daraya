'use strict';
(() => {
 const app=document.querySelector('#app');
 const t=(ar,en,de)=>({ar,en,de}[window.ShahinI18n?.language||'ar']||ar);
 const back=()=>t('‹ العودة إلى الأقسام','‹ Back to sections','‹ Zurück zu den Bereichen');
 const mounted=new WeakMap();let queued=false;
 function mount(root,groups,title,onChange){
  if(!root||!window.DarayaSectionMenu)return null;
  const old=mounted.get(root);if(old?.valid()){old.sync();return old;}
  const menu=window.DarayaSectionMenu({root,groups,title,backLabel:back(),onChange});if(menu)mounted.set(root,menu);return menu;
 }
 const group=(id,title,icon,nodes,note='')=>({id,title,icon,nodes,note});
 function topTile(page,node,id,title,note,icon){
  const view=window.DarayaShopSectionView?.(page);if(!view||!node)return;
  view.registerSection({id,node});let button=view.nav.querySelector('[data-target="'+id+'"]');if(button)return;
  button=document.createElement('button');button.type='button';button.className='sf-section-tile sf-tile-tools';button.dataset.target=id;button.dataset.noTranslate='';button.setAttribute('aria-controls',id);button.setAttribute('aria-expanded','false');
  const visual=document.createElement('span');visual.className='sf-tile-visual';visual.setAttribute('aria-hidden','true');if(id.endsWith('-share'))visual.innerHTML=window.DarayaShopTileIcon('share');else if(id.endsWith('-videos'))visual.innerHTML=window.DarayaShopTileIcon('videos');else visual.textContent=icon;visual.style.fontSize='30px';const h=document.createElement('strong');h.className='sf-tile-title';h.textContent=title;const small=document.createElement('span');small.className='sf-tile-note';small.textContent=note;button.append(visual,h,small);button.onclick=()=>view.open(id,button);view.nav.append(button);
 }
 function demoTools(){
  const root=app.querySelector('.showcase-owner-tools');if(!root)return;const page=root.parentElement;
  if(root.dataset.promotedTools){topTile(page,page.querySelector('#showcase-share'),'showcase-share',t('الكتالوج وQR والمشاركة','Catalog, QR and sharing','Katalog, QR und Teilen'),t('تحميل الكتالوج ورمز المحل ومشاركته','Download the catalog, shop QR and sharing','Katalog herunterladen, Geschäfts-QR und Teilen'),'▦');topTile(page,page.querySelector('#showcase-orders'),'showcase-orders',t('الطلبات والتوصيل','Orders and delivery','Bestellungen und Lieferung'),t('الطلبات والسائقون وإعدادات التوصيل','Orders, drivers and delivery settings','Bestellungen, Fahrer und Liefereinstellungen'),'🚚');topTile(page,page.querySelector('#showcase-other-tools'),'showcase-other-tools',t('أدوات المتجر','Shop tools','Geschäftswerkzeuge'),t('التعديل والمخزون والحسابات','Editing, stock and accounts','Bearbeitung, Bestand und Abrechnung'),'🧰');return;}
  const extras=root.querySelector('[data-demo-extras]'),dispatch=app.querySelector('.demo-dispatch-workspace');if(dispatch){root.append(dispatch);dispatch.classList.remove('sf-section-collapsed');dispatch.removeAttribute('inert');delete dispatch.dataset.sfSection;}
  if(extras){while(extras.firstChild)root.append(extras.firstChild);extras.remove();}
  const groups={photos:[],editor:[],products:[],share:[],orders:[],reports:[],help:[]};
  for(const node of [...root.children]){
   if(node.tagName==='SUMMARY'){node.hidden=true;continue;}
   if(dispatch&&node.querySelector('[data-demo-order-status]')){node.hidden=true;node.setAttribute('inert','');continue;}
   const key=node===dispatch||node.querySelector('[data-demo-order-status],[data-demo-delivery-settings]')?'orders':node.matches('.demo-qr-panel,.showcase-export')||node.querySelector('[data-demo-poster],[data-demo-share]')?'share':node.querySelector('[data-demo-variant]')?'products':node.querySelector('[data-demo-sales],[data-demo-note]')?'reports':node.querySelector('[data-demo-owner-save],[data-demo-custom-sections]')?'editor':node.matches('.demo-video')||node.querySelector('[data-demo-gallery]')?'photos':'help';groups[key].push(node);
  }
  const orders=document.createElement('section');orders.id='showcase-orders';orders.className='promoted-shop-section';orders.dataset.noTranslate='';
  const other=document.createElement('section');other.id='showcase-other-tools';other.className='promoted-shop-section';other.dataset.noTranslate='';const share=document.createElement('section');share.id='showcase-share';share.className='promoted-shop-section';share.dataset.noTranslate='';const shareHeading=document.createElement('h2');shareHeading.textContent=t('الكتالوج وQR والمشاركة','Catalog, QR and sharing','Katalog, QR und Teilen');share.append(shareHeading,...groups.share);page.append(orders,share,other);groups.orders.forEach(n=>orders.append(n));
  const sections=[group('editor',t('تعديل الصفحة وأقسامها','Edit page and sections','Seite und Bereiche bearbeiten'),'✏️',groups.editor),group('products',t('خيارات المنتجات والمخزون','Product options and stock','Produktoptionen und Bestand'),'🛍️',groups.products),group('reports',t('الحسابات والملاحظات','Accounts and notes','Abrechnung und Notizen'),'📊',groups.reports),group('help',t('الدليل والباقات','Guide and plans','Anleitung und Tarife'),'📖',groups.help)];
  for(const g of sections)for(const n of g.nodes)other.append(n);mount(other,sections,t('أقسام أدوات المتجر','Shop tool sections','Geschäftswerkzeuge'));
  // The main shop menu now owns these sections, so they never appear under Photos.
  root.dataset.promotedTools='1';topTile(page,share,share.id,t('الكتالوج وQR والمشاركة','Catalog, QR and sharing','Katalog, QR und Teilen'),t('تحميل الكتالوج ورمز المحل ومشاركته','Download the catalog, shop QR and sharing','Katalog herunterladen, Geschäfts-QR und Teilen'),'▦');topTile(page,orders,orders.id,t('الطلبات والتوصيل','Orders and delivery','Bestellungen und Lieferung'),t('الطلبات والسائقون وإعدادات التوصيل','Orders, drivers and delivery settings','Bestellungen, Fahrer und Liefereinstellungen'),'🚚');topTile(page,other,other.id,t('أدوات المتجر','Shop tools','Geschäftswerkzeuge'),t('التعديل والمخزون والحسابات','Editing, stock and accounts','Bearbeitung, Bestand und Abrechnung'),'🧰');
 }
 function shareCards(section){
  const controls=[...section.querySelectorAll(':scope>.sf-share,:scope>.shop-catalog-download,:scope>[data-place-qr],:scope>[data-place-whatsapp-share]')];
  let grid=section.querySelector(':scope>.sf-share-cards');
  if(!grid&&controls.length){grid=document.createElement('div');grid.className='sf-share-cards';section.append(grid);}
  if(!grid)return;
  for(const control of controls)grid.append(control);
  const paths={qr:'<path d="M3 3h6v6H3zm12 0h6v6h-6zM3 15h6v6H3zm12 0h3v3h3m-6 3h3m3-9v1M12 3v6m0 3h3m-3 3v6"/>',whatsapp:'<path d="M20 11a8 8 0 0 1-12 7l-5 2 2-5a8 8 0 1 1 15-4Z"/><path d="m9 7 1 3-1 1c1 2 2 3 4 4l1-1 3 1"/>',catalog:'<path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/><path d="M6 8h3m-3 4h3m6-4h3m-3 4h3"/>',share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 10 6-4m-6 8 6 4"/>'};
  for(const control of grid.children){
   if(control.dataset.sfShareCard)continue;
   const kind=control.hasAttribute('data-place-qr')?'qr':control.hasAttribute('data-place-whatsapp-share')?'whatsapp':control.matches('.shop-catalog-download')?'catalog':'share';
   const text={qr:[t('رمز QR للمتجر','Shop QR code','Geschäfts-QR-Code'),t('بطاقة المتجر للحفظ والطباعة','Save or print your shop card','Geschäftskarte speichern oder drucken')],whatsapp:[t('المشاركة عبر واتساب','Share on WhatsApp','Über WhatsApp teilen'),t('أرسل رابط المتجر مباشرة','Send the shop link directly','Geschäftslink direkt versenden')],catalog:[t('إنشاء الكتالوج','Create a catalog','Katalog erstellen'),t('تصميم وتحميل مع رمز QR','Design and download with QR','Gestalten und mit QR herunterladen')],share:[t('مشاركة رابط المتجر','Share shop link','Geschäftslink teilen'),t('اختر التطبيق الذي تريده','Choose an app to share with','App zum Teilen auswählen')]}[kind];
   const icon=document.createElement('span');icon.className='sf-share-card-icon';icon.setAttribute('aria-hidden','true');icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+paths[kind]+'</svg>';
   const copy=document.createElement('span');copy.className='sf-share-card-copy';const title=document.createElement('strong');title.textContent=text[0];const note=document.createElement('small');note.textContent=text[1];copy.append(title,note);
   const arrow=document.createElement('span');arrow.className='sf-share-card-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent='‹';
   control.dataset.sfShareCard=kind;control.replaceChildren(icon,copy,arrow);
  }
 }
 function publicShopTools(){
  const root=app.querySelector('.sf-tools'),banner=app.querySelector('.store-banner[data-storefront]');if(!root||!banner)return;const page=banner.parentElement,view=window.DarayaShopSectionView?.(page);if(!view)return;
  let other=page.querySelector('#sf-other-tools'),orders=page.querySelector('#sf-orders');
  if(!other){other=document.createElement('section');other.id='sf-other-tools';other.className='panel promoted-shop-section';other.dataset.noTranslate='';const h=document.createElement('h2');h.textContent=t('أدوات المتجر','Shop tools','Geschäftswerkzeuge');other.append(h);for(const n of [...root.children])if(!n.matches('h2,.sf-photos')){if(n.matches('.sf-more')&&n.querySelector('.sf-more-items')){while(n.querySelector('.sf-more-items').firstChild)other.append(n.querySelector('.sf-more-items').firstChild);n.remove();}else other.append(n);}page.append(other);if(root.children.length===1){const empty=document.createElement('p');empty.textContent=t('لم تُضف صور إضافية بعد.','No extra photos have been added yet.','Noch keine weiteren Fotos vorhanden.');root.append(empty);}}
  let share=page.querySelector('#sf-share');
  if(!share){share=document.createElement('section');share.id='sf-share';share.className='panel promoted-shop-section';share.dataset.noTranslate='';const h=document.createElement('h2');h.textContent=t('الكتالوج وQR والمشاركة','Catalog, QR and sharing','Katalog, QR und Teilen');share.append(h);page.append(share);}
  for(const node of other.querySelectorAll('.sf-share,.shop-catalog-download,[data-place-qr],[data-place-whatsapp-share]'))share.append(node);
  shareCards(share);
  if(share.children.length>1)topTile(page,share,share.id,t('الكتالوج وQR والمشاركة','Catalog, QR and sharing','Katalog, QR und Teilen'),t('تحميل الكتالوج ورمز المحل ومشاركته','Download the catalog, shop QR and sharing','Katalog herunterladen, Geschäfts-QR und Teilen'),'▦');else share.remove();
  topTile(page,other,other.id,t('أدوات المتجر','Shop tools','Geschäftswerkzeuge'),t('المعلومات والأدوات الإضافية','Information and more tools','Informationen und weitere Werkzeuge'),'🧰');
  const s=typeof stores!=='undefined'?stores.find(s=>s.id===banner.dataset.storefront):null;
  const info=s&&(s.text_only||typeof directoryIsInfo==='function'&&directoryIsInfo(s)||typeof directoryIsService==='function'&&directoryIsService(s));
  if(s&&!info&&!orders){
   orders=document.createElement('section');orders.id='sf-orders';orders.className='panel promoted-shop-section';orders.dataset.noTranslate='';const h=document.createElement('h2');h.textContent=t('الطلبات والتوصيل','Orders and delivery','Bestellungen und Lieferung');orders.append(h);
   const p=document.createElement('p');const available=typeof canStoreOrder==='function'?canStoreOrder(s):s.online_ordering!==false;
   p.textContent=available?t('اختر المنتجات من القائمة وأضفها إلى السلة، ثم أكمل بيانات طلبك.','Choose items from the list, add them to the basket, then complete your order details.','Artikel auswählen, in den Warenkorb legen und Bestellangaben ergänzen.'):t('الطلبات عبر الموقع غير متاحة حاليًا. يمكنك التواصل مع المحل للاستفسار.','Website orders are not available now. Contact the shop for details.','Onlinebestellungen sind derzeit nicht verfügbar. Wende dich an das Geschäft.');orders.append(p);
   if(s.delivery_enabled){const d=document.createElement('p');d.textContent=t('التوصيل متاح حسب المناطق والرسوم التي يحددها المحل.','Delivery depends on the shop’s areas and fees.','Lieferung nach Gebieten und Gebühren des Geschäfts.');orders.append(d);}if(s.pickup_enabled){const p=document.createElement('p');p.textContent=t('يتوفر الاستلام من المحل.','Pickup from the shop is available.','Abholung im Geschäft ist möglich.');orders.append(p);}
   const button=document.createElement('button');button.type='button';button.textContent=available?t('اختر المنتجات وابدأ طلبك','Choose products and start an order','Produkte wählen und Bestellung beginnen'):t('التواصل مع المحل','Contact the shop','Geschäft kontaktieren');button.onclick=()=>view.open(available?'sf-products':'sf-info',button);orders.append(button);const history=document.createElement('a');history.href='#my-orders';history.className='button outline';history.textContent=t('متابعة طلباتي','View my orders','Meine Bestellungen ansehen');orders.append(history);page.append(orders);
  }
  if(orders)topTile(page,orders,orders.id,t('الطلبات والتوصيل','Orders and delivery','Bestellungen und Lieferung'),t('ابدأ طلبك وتعرّف على الاستلام والتوصيل','Order, pickup and delivery options','Bestellung, Abholung und Lieferung'),'🚚');
 }
 function shopVideos(){
  const banner=app.querySelector('.store-banner[data-storefront]'),demo=app.querySelector('.showcase-owner-tools');
  const page=banner?.parentElement||demo?.parentElement;if(!page)return;
  const id=banner?'sf-videos':'showcase-videos';let section=page.querySelector('#'+id);
  if(!section){section=document.createElement('section');section.id=id;section.className='panel place-video-panel';section.dataset.noTranslate='';const h=document.createElement('h2');h.textContent=t('فيديوهات المتجر','Shop videos','Geschäftsvideos');section.append(h);page.append(section);}
  if(demo)for(const video of page.querySelectorAll('.demo-video'))if(!section.contains(video))section.append(video);
  if(!section.querySelector('.place-video-surface,.demo-video')&&!section.querySelector('p')){const p=document.createElement('p');p.textContent=t('لم يضف المتجر فيديوهات بعد.','This shop has not added videos yet.','Dieses Geschäft hat noch keine Videos hinzugefügt.');section.append(p);}
  topTile(page,section,id,t('فيديوهات المتجر','Shop videos','Geschäftsvideos'),t('شاهد فيديوهات المتجر','Watch shop videos','Geschäftsvideos ansehen'),'▶');
  const nav=window.DarayaShopSectionView?.(page)?.nav;
  const photos=nav?.querySelector('[data-target="'+(banner?'sf-tools':'showcase-tools')+'"]'),videos=nav?.querySelector('[data-target="'+id+'"]');
  if(photos&&videos&&[...nav.children].indexOf(photos)<[...nav.children].indexOf(videos)){const slot=document.createComment('video position');videos.replaceWith(slot);photos.replaceWith(videos);slot.replaceWith(photos);}
 }
 function polishShopTools(){
  const banner=app.querySelector('.store-banner[data-storefront]');if(!banner)return;
  const pin='<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>';
  const route='<path d="m12 3 9 9-9 9-9-9Z"/><path d="M8 15v-4h8m-3-3 3 3-3 3"/>';
  const icon=path=>{const n=document.createElement('span');n.className='sf-utility-icon';n.setAttribute('aria-hidden','true');n.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+path+'</svg>';return n;};
  let location=banner.querySelector('.sf-cover-location-actions');
  const map=app.querySelector('#sf-other-tools .directory-actions a[href*="/maps/search/"]'),directions=app.querySelector('.sf-contact-actions .sf-directions,#sf-other-tools .directory-actions a[href*="/maps/dir/"]');
  if(!location&&(map||directions)){location=document.createElement('div');location.className='sf-cover-location-actions';location.dataset.noTranslate='';location.setAttribute('aria-label',t('موقع المتجر والاتجاهات','Shop location and directions','Geschäftsstandort und Route'));const cover=banner.querySelector('.sf-cover-button,.store-image');if(cover)cover.after(location);else banner.prepend(location);}
  for(const [control,kind,title,path] of [[map,'location',t('موقع المحل','Shop location','Standort'),pin],[directions,'directions',t('الاتجاهات','Directions','Route'),route]])if(control&&location){control.dataset.coverLocation=kind;const text=document.createElement('span');text.textContent=title;control.replaceChildren(icon(path),text);location.append(control);}
  const paths={appointment:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 5 3 3 5-5"/>',tool:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',report:'<path d="M5 21V3m0 1c5-4 9 4 14 0v11c-5 4-9-4-14 0"/>',block:'<path d="M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7Z"/><path d="m8 8 8 8m0-8-8 8"/>',share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 10 6-4m-6 8 6 4"/>',order:'<path d="M5 7h14l1 14H4ZM9 7V5a3 3 0 0 1 6 0v2"/>',history:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',contact:'<path d="m8 3 2 5-3 2c2 4 3 5 7 7l2-3 5 2-1 4c-8 3-20-9-16-16Z"/>'};
  for(const section of app.querySelectorAll('#sf-other-tools,#sf-orders')){
   section.classList.add('sf-polished-tools');
   for(const control of section.querySelectorAll(':scope>button,:scope>a,.directory-actions>button,.directory-actions>a')){
    if(control.dataset.utilityCard||control.closest('.owner-edit-controls,.owner-inline-editor'))continue;
    const title=control.textContent.trim(),kind=control.hasAttribute('data-report-place')?'report':control.hasAttribute('data-block-shop')?'block':/موعد|appointment|Termin/i.test(title)?'appointment':section.id==='sf-other-tools'?(/مشاركة|share|teilen/i.test(title)?'share':'tool'):control.getAttribute('href')==='#my-orders'?'history':/التواصل|Contact|Kontakt/.test(title)?'contact':'order';
    const note={appointment:t('تواصل مع المتجر لطلب موعد أو خدمة','Contact the shop for an appointment or service','Geschäft für einen Termin oder Service kontaktieren'),tool:t('افتح الأداة للاطلاع على خياراتها','Open this tool to view its options','Werkzeug und seine Optionen öffnen'),report:t('أخبرنا عن خطأ في المعلومات أو المحتوى','Tell us about incorrect information or content','Fehlerhafte Angaben oder Inhalte melden'),block:t('إخفاء محتوى هذا المحل من تصفحك','Hide this shop’s content from your browsing','Inhalte dieses Geschäfts ausblenden'),share:t('أرسل رابط الصفحة لمن تريد','Send the page link to others','Seitenlink an andere senden'),history:t('عرض الطلبات ومتابعة حالتها','View orders and track their status','Bestellungen und ihren Status ansehen'),contact:t('تواصل مباشرة مع المتجر','Contact the shop directly','Geschäft direkt kontaktieren'),order:t('انتقل إلى المنتجات لاختيار طلبك','Browse products to choose your order','Produkte für deine Bestellung auswählen')}[kind];
    const copy=document.createElement('span');copy.className='sf-utility-copy';const strong=document.createElement('strong');strong.textContent=title;const small=document.createElement('small');small.textContent=note;copy.append(strong,small);control.dataset.utilityCard=kind;control.classList.add('sf-utility-card');control.replaceChildren(icon(paths[kind]),copy);
   }
  }
 }
 const parentBacks=new Map();
 function updateTrail(){
  const bars=[...app.querySelectorAll('.section-menu-bar')].filter(n=>!n.hidden&&!n.closest('[inert],.sf-section-collapsed')&&!n.parentElement.closest('[hidden]'));
  const deepest=bars.at(-1);for(const bar of bars){bar.classList.toggle('section-menu-parent',bar!==deepest);const b=bar.querySelector('.section-menu-back');if(b)b.hidden=bar!==deepest;}
  if(deepest){for(const b of app.querySelectorAll('.sf-section-return,.dashboard-menu-back')){if(!parentBacks.has(b))parentBacks.set(b,b.hidden);b.hidden=true;}}
  else {for(const [b,hidden] of parentBacks)if(b.isConnected)b.hidden=hidden;parentBacks.clear();}
 }
 app.addEventListener('daraya-section-state',updateTrail);
 function adapt(){queued=false;observer.disconnect();try{demoTools();publicShopTools();shopVideos();polishShopTools();updateTrail();}finally{observer.observe(app,{childList:true,subtree:true});}}
 const observer=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(adapt);});
 window.DarayaRefreshSectionMenus=adapt;adapt();
 window.addEventListener('hashchange',()=>{if(!queued){queued=true;queueMicrotask(adapt);}});
})();
