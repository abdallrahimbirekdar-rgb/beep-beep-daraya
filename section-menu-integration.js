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
  const visual=document.createElement('span');visual.className='sf-tile-visual';visual.setAttribute('aria-hidden','true');visual.textContent=icon;visual.style.fontSize='30px';const h=document.createElement('strong');h.className='sf-tile-title';h.textContent=title;const small=document.createElement('span');small.className='sf-tile-note';small.textContent=note;button.append(visual,h,small);button.onclick=()=>view.open(id,button);view.nav.append(button);
 }
 function demoTools(){
  const root=app.querySelector('.showcase-owner-tools');if(!root)return;const page=root.parentElement;
  if(root.dataset.promotedTools){topTile(page,page.querySelector('#showcase-share'),'showcase-share',t('المنيو وQR والمشاركة','Menu, QR and sharing','Speisekarte, QR und Teilen'),t('تحميل المنيو ورمز المحل ومشاركته','Download the menu, shop QR and sharing','Speisekarte herunterladen, Geschäfts-QR und Teilen'),'▦');topTile(page,page.querySelector('#showcase-orders'),'showcase-orders',t('الطلبات والتوصيل','Orders and delivery','Bestellungen und Lieferung'),t('الطلبات والسائقون وإعدادات التوصيل','Orders, drivers and delivery settings','Bestellungen, Fahrer und Liefereinstellungen'),'🚚');topTile(page,page.querySelector('#showcase-other-tools'),'showcase-other-tools',t('أدوات المتجر','Shop tools','Geschäftswerkzeuge'),t('التعديل والمخزون والحسابات','Editing, stock and accounts','Bearbeitung, Bestand und Abrechnung'),'🧰');return;}
  const extras=root.querySelector('[data-demo-extras]'),dispatch=app.querySelector('.demo-dispatch-workspace');if(dispatch){root.append(dispatch);dispatch.classList.remove('sf-section-collapsed');dispatch.removeAttribute('inert');delete dispatch.dataset.sfSection;}
  if(extras){while(extras.firstChild)root.append(extras.firstChild);extras.remove();}
  const groups={photos:[],editor:[],products:[],share:[],orders:[],reports:[],help:[]};
  for(const node of [...root.children]){
   if(node.tagName==='SUMMARY'){node.hidden=true;continue;}
   if(dispatch&&node.querySelector('[data-demo-order-status]')){node.hidden=true;node.setAttribute('inert','');continue;}
   const key=node===dispatch||node.querySelector('[data-demo-order-status],[data-demo-delivery-settings]')?'orders':node.matches('.demo-qr-panel,.showcase-export')||node.querySelector('[data-demo-poster],[data-demo-share]')?'share':node.querySelector('[data-demo-variant]')?'products':node.querySelector('[data-demo-sales],[data-demo-note]')?'reports':node.querySelector('[data-demo-owner-save],[data-demo-custom-sections]')?'editor':node.matches('.demo-video')||node.querySelector('[data-demo-gallery]')?'photos':'help';groups[key].push(node);
  }
  const orders=document.createElement('section');orders.id='showcase-orders';orders.className='promoted-shop-section';orders.dataset.noTranslate='';
  const other=document.createElement('section');other.id='showcase-other-tools';other.className='promoted-shop-section';other.dataset.noTranslate='';const share=document.createElement('section');share.id='showcase-share';share.className='promoted-shop-section';share.dataset.noTranslate='';const shareHeading=document.createElement('h2');shareHeading.textContent=t('المنيو وQR والمشاركة','Menu, QR and sharing','Speisekarte, QR und Teilen');share.append(shareHeading,...groups.share);page.append(orders,share,other);groups.orders.forEach(n=>orders.append(n));
  const sections=[group('editor',t('تعديل الصفحة وأقسامها','Edit page and sections','Seite und Bereiche bearbeiten'),'✏️',groups.editor),group('products',t('خيارات المنتجات والمخزون','Product options and stock','Produktoptionen und Bestand'),'🛍️',groups.products),group('reports',t('الحسابات والملاحظات','Accounts and notes','Abrechnung und Notizen'),'📊',groups.reports),group('help',t('الدليل والباقات','Guide and plans','Anleitung und Tarife'),'📖',groups.help)];
  for(const g of sections)for(const n of g.nodes)other.append(n);mount(other,sections,t('أقسام أدوات المتجر','Shop tool sections','Geschäftswerkzeuge'));
  // The main shop menu now owns these sections, so they never appear under Photos.
  root.dataset.promotedTools='1';topTile(page,share,share.id,t('المنيو وQR والمشاركة','Menu, QR and sharing','Speisekarte, QR und Teilen'),t('تحميل المنيو ورمز المحل ومشاركته','Download the menu, shop QR and sharing','Speisekarte herunterladen, Geschäfts-QR und Teilen'),'▦');topTile(page,orders,orders.id,t('الطلبات والتوصيل','Orders and delivery','Bestellungen und Lieferung'),t('الطلبات والسائقون وإعدادات التوصيل','Orders, drivers and delivery settings','Bestellungen, Fahrer und Liefereinstellungen'),'🚚');topTile(page,other,other.id,t('أدوات المتجر','Shop tools','Geschäftswerkzeuge'),t('التعديل والمخزون والحسابات','Editing, stock and accounts','Bearbeitung, Bestand und Abrechnung'),'🧰');
 }
 function publicShopTools(){
  const root=app.querySelector('.sf-tools'),banner=app.querySelector('.store-banner[data-storefront]');if(!root||!banner)return;const page=banner.parentElement,view=window.DarayaShopSectionView?.(page);if(!view)return;
  let other=page.querySelector('#sf-other-tools'),orders=page.querySelector('#sf-orders');
  if(!other){other=document.createElement('section');other.id='sf-other-tools';other.className='panel promoted-shop-section';other.dataset.noTranslate='';const h=document.createElement('h2');h.textContent=t('أدوات المتجر والمشاركة','Shop tools and sharing','Geschäftswerkzeuge und Teilen');other.append(h);for(const n of [...root.children])if(!n.matches('h2,.sf-photos')){if(n.matches('.sf-more')&&n.querySelector('.sf-more-items')){while(n.querySelector('.sf-more-items').firstChild)other.append(n.querySelector('.sf-more-items').firstChild);n.remove();}else other.append(n);}page.append(other);if(root.children.length===1){const empty=document.createElement('p');empty.textContent=t('لم تُضف صور إضافية بعد.','No extra photos have been added yet.','Noch keine weiteren Fotos vorhanden.');root.append(empty);}}
  let share=page.querySelector('#sf-share');
  if(!share){share=document.createElement('section');share.id='sf-share';share.className='panel promoted-shop-section';share.dataset.noTranslate='';const h=document.createElement('h2');h.textContent=t('المنيو وQR والمشاركة','Menu, QR and sharing','Speisekarte, QR und Teilen');share.append(h);page.append(share);}
  for(const node of other.querySelectorAll('.sf-share,.shop-catalog-download,[data-place-qr],[data-place-whatsapp-share]'))share.append(node);
  if(share.children.length>1)topTile(page,share,share.id,t('المنيو وQR والمشاركة','Menu, QR and sharing','Speisekarte, QR und Teilen'),t('تحميل المنيو ورمز المحل ومشاركته','Download the menu, shop QR and sharing','Speisekarte herunterladen, Geschäfts-QR und Teilen'),'▦');else share.remove();
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
 const parentBacks=new Map();
 function updateTrail(){
  const bars=[...app.querySelectorAll('.section-menu-bar')].filter(n=>!n.hidden&&!n.closest('[inert],.sf-section-collapsed')&&!n.parentElement.closest('[hidden]'));
  const deepest=bars.at(-1);for(const bar of bars){bar.classList.toggle('section-menu-parent',bar!==deepest);const b=bar.querySelector('.section-menu-back');if(b)b.hidden=bar!==deepest;}
  if(deepest){for(const b of app.querySelectorAll('.sf-section-return,.dashboard-menu-back')){if(!parentBacks.has(b))parentBacks.set(b,b.hidden);b.hidden=true;}}
  else {for(const [b,hidden] of parentBacks)if(b.isConnected)b.hidden=hidden;parentBacks.clear();}
 }
 app.addEventListener('daraya-section-state',updateTrail);
 function adapt(){queued=false;observer.disconnect();try{demoTools();publicShopTools();shopVideos();updateTrail();}finally{observer.observe(app,{childList:true,subtree:true});}}
 const observer=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(adapt);});
 window.DarayaRefreshSectionMenus=adapt;adapt();
 window.addEventListener('hashchange',()=>{if(!queued){queued=true;queueMicrotask(adapt);}});
})();
