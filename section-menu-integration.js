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
  if(root.dataset.promotedTools){topTile(page,page.querySelector('#showcase-orders'),'showcase-orders',t('الطلبات والتوصيل','Orders and delivery','Bestellungen und Lieferung'),t('الطلبات والسائقون وإعدادات التوصيل','Orders, drivers and delivery settings','Bestellungen, Fahrer und Liefereinstellungen'),'🚚');topTile(page,page.querySelector('#showcase-other-tools'),'showcase-other-tools',t('أدوات المتجر','Shop tools','Geschäftswerkzeuge'),t('المنيو وQR والتعديل والحسابات','Menu, QR, editing and accounts','Speisekarte, QR, Bearbeitung und Abrechnung'),'🧰');return;}
  const extras=root.querySelector('[data-demo-extras]'),dispatch=app.querySelector('.demo-dispatch-workspace');if(dispatch){root.append(dispatch);dispatch.classList.remove('sf-section-collapsed');dispatch.removeAttribute('inert');delete dispatch.dataset.sfSection;}
  if(extras){while(extras.firstChild)root.append(extras.firstChild);extras.remove();}
  const groups={photos:[],editor:[],products:[],share:[],orders:[],reports:[],help:[]};
  for(const node of [...root.children]){
   if(node.tagName==='SUMMARY'){node.hidden=true;continue;}
   if(dispatch&&node.querySelector('[data-demo-order-status]')){node.hidden=true;node.setAttribute('inert','');continue;}
   const key=node===dispatch||node.querySelector('[data-demo-order-status],[data-demo-delivery-settings]')?'orders':node.matches('.demo-qr-panel,.showcase-export')||node.querySelector('[data-demo-poster],[data-demo-share]')?'share':node.querySelector('[data-demo-variant]')?'products':node.querySelector('[data-demo-sales],[data-demo-note]')?'reports':node.querySelector('[data-demo-owner-save],[data-demo-custom-sections]')?'editor':node.matches('.demo-video')||node.querySelector('[data-demo-gallery]')?'photos':'help';groups[key].push(node);
  }
  const orders=document.createElement('section');orders.id='showcase-orders';orders.className='promoted-shop-section';orders.dataset.noTranslate='';
  const other=document.createElement('section');other.id='showcase-other-tools';other.className='promoted-shop-section';other.dataset.noTranslate='';page.append(orders,other);groups.orders.forEach(n=>orders.append(n));
  const sections=[group('editor',t('تعديل الصفحة وأقسامها','Edit page and sections','Seite und Bereiche bearbeiten'),'✏️',groups.editor),group('products',t('خيارات المنتجات والمخزون','Product options and stock','Produktoptionen und Bestand'),'🛍️',groups.products),group('share',t('المنيو وQR والمشاركة','Menu, QR and sharing','Speisekarte, QR und Teilen'),'▦',groups.share),group('reports',t('الحسابات والملاحظات','Accounts and notes','Abrechnung und Notizen'),'📊',groups.reports),group('help',t('الدليل والباقات','Guide and plans','Anleitung und Tarife'),'📖',groups.help)];
  for(const g of sections)for(const n of g.nodes)other.append(n);mount(other,sections,t('أقسام أدوات المتجر','Shop tool sections','Geschäftswerkzeuge'));
  // The main shop menu now owns these sections, so they never appear under Photos.
  root.dataset.promotedTools='1';topTile(page,orders,orders.id,t('الطلبات والتوصيل','Orders and delivery','Bestellungen und Lieferung'),t('الطلبات والسائقون وإعدادات التوصيل','Orders, drivers and delivery settings','Bestellungen, Fahrer und Liefereinstellungen'),'🚚');topTile(page,other,other.id,t('أدوات المتجر','Shop tools','Geschäftswerkzeuge'),t('المنيو وQR والتعديل والحسابات','Menu, QR, editing and accounts','Speisekarte, QR, Bearbeitung und Abrechnung'),'🧰');
 }
 function publicShopTools(){
  const root=app.querySelector('.sf-tools'),banner=app.querySelector('.store-banner[data-storefront]');if(!root||!banner)return;const page=banner.parentElement,view=window.DarayaShopSectionView?.(page);if(!view)return;
  let other=page.querySelector('#sf-other-tools'),orders=page.querySelector('#sf-orders');
  if(!other){other=document.createElement('section');other.id='sf-other-tools';other.className='panel promoted-shop-section';other.dataset.noTranslate='';const h=document.createElement('h2');h.textContent=t('أدوات المتجر والمشاركة','Shop tools and sharing','Geschäftswerkzeuge und Teilen');other.append(h);for(const n of [...root.children])if(!n.matches('h2,.sf-photos')){if(n.matches('.sf-more')&&n.querySelector('.sf-more-items')){while(n.querySelector('.sf-more-items').firstChild)other.append(n.querySelector('.sf-more-items').firstChild);n.remove();}else other.append(n);}page.append(other);if(root.children.length===1){const empty=document.createElement('p');empty.textContent=t('لم تُضف صور إضافية بعد.','No extra photos have been added yet.','Noch keine weiteren Fotos vorhanden.');root.append(empty);}}
  topTile(page,other,other.id,t('أدوات المتجر','Shop tools','Geschäftswerkzeuge'),t('المشاركة وQR والملفات المتاحة','Sharing, QR and available files','Teilen, QR und verfügbare Dateien'),'🧰');
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
 function merchantMenu(){
  const nav=app.querySelector('.merchant-nav.dashboard-menu-grid');if(!nav||mounted.get(nav)?.valid())return;
  const groups={page:[],products:[],orders:[],growth:[],reports:[],settings:[]};
  for(const a of [...nav.querySelectorAll('a')]){
   const cell=a.closest('.owner-tool-card')||a;nav.append(cell);if(a.hidden){cell.hidden=true;continue;}
   const href=a.getAttribute('href')||'',key=/\/(orders|delivery|drivers)\/|#table-service\//.test(href)?'orders':/\/products\//.test(href)?'products':/\/(statistics|reports|notebook)\//.test(href)?'reports':/\/(workspace-tools|plans|usage)\//.test(href)?'settings':/\/(details|photos|hours|new-section|page-[^/]+)\//.test(href)?'page':'growth';groups[key].push(cell);
  }
  nav.querySelectorAll(':scope > details').forEach(d=>{if(!d.querySelector('a'))d.remove();});
  mount(nav,[group('page',t('معلومات الصفحة وصورها','Page details and photos','Seitenangaben und Fotos'),'🏪',groups.page),group('products',t('المنتجات والأسعار','Products and prices','Produkte und Preise'),'🛍️',groups.products),group('orders',t('الطلبات والتوصيل','Orders and delivery','Bestellungen und Lieferung'),'🚚',groups.orders),group('growth',t('المشاركة والترويج والمساعدة','Sharing, promotion and help','Teilen, Werbung und Hilfe'),'📣',groups.growth),group('reports',t('الإحصاءات والحسابات','Statistics and accounts','Statistik und Abrechnung'),'📊',groups.reports),group('settings',t('التجهيز والباقات','Setup and plans','Einrichtung und Tarife'),'⚙️',groups.settings)],t('أقسام لوحة المتجر','Shop dashboard sections','Bereiche der Geschäftsverwaltung'));
 }
 function driverSections(){
  const root=app.querySelector('#dashboard-content'),form=root?.querySelector('#add-driver');if(!form||mounted.get(root)?.valid())return;
  const add=form.closest('.panel'),list=root.querySelector('.driver-list')?.closest('.panel');if(!add||!list)return;
  mount(root,[group('add',t('إضافة سائق ورمز الدخول','Add a driver and login code','Fahrer und Zugangscode hinzufügen'),'➕',[add]),group('team',t('السائقون وإدارة رموزهم','Drivers and their codes','Fahrer und ihre Codes'),'🛵',[list])],t('أقسام سائقو التوصيل','Delivery driver sections','Lieferfahrerbereiche'));
 }
 function customerSections(){
  const root=app.querySelector('.customer-account'),shortcuts=root?.querySelector('.account-shortcuts'),profile=root?.querySelector('#customer-profile-form')?.closest('.panel');if(!root||!shortcuts||!profile||mounted.get(root)?.valid())return;
  const buckets={orders:[],business:[],settings:[]};
  for(const n of [...shortcuts.children]){const href=n.getAttribute('href')||'';buckets[/#dashboard|business-application/.test(href)?'business':n.id==='customer-signout'||/delete-account/.test(href)?'settings':'orders'].push(n);}
  const wrap=nodes=>{if(!nodes.length)return null;const box=document.createElement('section');box.className='section-menu-panel';const row=document.createElement('div');row.className='account-shortcuts';nodes.forEach(n=>row.append(n));box.append(row);root.append(box);return box;};
  const privacy=[...root.children].find(n=>n.matches('p')&&n.querySelector('a[href="#privacy"]'));shortcuts.remove();
  mount(root,[group('orders',t('مشترياتي والمحلات المحفوظة','My orders and saved shops','Bestellungen und gemerkte Geschäfte'),'🛍️',[wrap(buckets.orders)]),group('profile',t('بياناتي وعنواني','My details and address','Meine Angaben und Adresse'),'🪪',[profile]),group('business',t('نشاطي وطلبات إنشاء الصفحة','My business and page requests','Mein Geschäft und Seitenanträge'),'🏪',[wrap(buckets.business)]),group('settings',t('الحساب والخصوصية','Account and privacy','Konto und Datenschutz'),'⚙️',[wrap(buckets.settings),privacy])],t('أقسام حسابي','My account sections','Meine Kontobereiche'));
 }
 function applicationSections(){
  const form=app.querySelector('#business-application-form');if(!form||mounted.get(form)?.valid())return;
  const steps=[...form.querySelectorAll(':scope > fieldset')];if(steps.length<2)return;
  const extras=[...form.querySelectorAll(':scope > details,:scope > .business-design-tools')];
  mount(form,[...steps.map((n,i)=>group('step-'+i,[t('اسم النشاط وصورته','Business name and photo','Name und Foto'),t('العنوان والموقع الاختياري','Address and optional map location','Adresse und freiwilliger Kartenstandort'),t('بيانات التواصل','Contact details','Kontaktangaben')][i]||'', ['🏪','📍','☎️'][i]||'▦',[n])),group('extras',t('أدوات وتفاصيل اختيارية','Optional tools and details','Freiwillige Werkzeuge und Angaben'),'🧰',extras)],t('أقسام طلب إنشاء الصفحة','Page request sections','Bereiche des Seitenantrags'));
 }
 function workspaceSections(){
  if(app.dataset.dashboardSection!=='workspace-tools')return;
  const root=app.querySelector('#dashboard-content');if(!root||mounted.get(root)?.valid())return;
  const nodes=[...root.children],setup=[],status=[],other=[];
  for(const n of nodes){if(n.matches('.reception'))status.push(n);else if(n.matches('.welcome-panel,.setup-grid,.setup-review,.merchant-setup'))setup.push(n);else other.push(n);}
  if([setup,status,other].filter(a=>a.length).length<2)return;
  mount(root,[group('setup',t('تجهيز الصفحة','Page setup','Seite einrichten'),'🏪',setup),group('status',t('حالة استقبال الطلبات','Order availability','Bestellannahme'),'🟢',status),group('other',t('الباقات وبقية الإعدادات','Plans and other settings','Tarife und weitere Einstellungen'),'⚙️',other)],t('أقسام التجهيز والإعدادات','Setup and settings','Einrichtung und Einstellungen'));
 }
 function adminSections(){
  const root=app.querySelector('.tabs.admin-menu-organized');if(!root)return;
  const groups=[...root.querySelectorAll(':scope > [data-admin-group]')];if(!groups.length)return;
  const menu=mount(root,groups.map(n=>group(n.dataset.adminGroup,n.querySelector('h3')?.textContent||'',({shops:'🏪',offers:'🏷️',people:'👥',moderation:'🛡️',growth:'📊',settings:'⚙️'})[n.dataset.adminGroup],[n])),t('أقسام الإدارة','Admin sections','Verwaltungsbereiche'));
  const input=app.querySelector('#admin-tool-search');if(input&&!input.dataset.sectionMenuSearch){input.dataset.sectionMenuSearch='';input.addEventListener('input',()=>{if(input.value.trim()){menu.nav.hidden=true;menu.bar.hidden=false;menu.bar.querySelector('h3').textContent=t('نتائج البحث','Search results','Suchergebnisse');}else menu.close(false);});const old=menu.back.onclick;menu.back.onclick=()=>{if(input.value){input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));}old();};}
 }
 let tableTab=null,tableRoute='';
 function tableSections(){
  const nav=app.querySelector('.ts-owner-tabs'),host=app.querySelector('[data-ts-owner-content]');if(!nav||!host||nav.dataset.sectionMenuTabs)return;
  if(tableRoute!==location.hash){tableRoute=location.hash;tableTab=null;}nav.dataset.sectionMenuTabs='';nav.classList.add('section-menu-grid');
  for(const b of nav.querySelectorAll('button')){b.classList.add('section-menu-tile');const old=b.onclick;b.onclick=e=>{tableTab=b.dataset.tsTab;if(b.classList.contains('selected')){nav.hidden=true;host.hidden=false;host.removeAttribute('inert');back.hidden=false;back.focus({preventScroll:true});}else old?.call(b,e);};}
  const back=document.createElement('button');back.type='button';back.className='section-menu-back';back.dataset.noTranslate='';back.textContent=t('‹ العودة إلى أقسام الطاولات','‹ Back to table sections','‹ Zurück zu den Tischbereichen');host.before(back);
  nav.hidden=!!tableTab;host.hidden=!tableTab;host.toggleAttribute('inert',!tableTab);back.hidden=!tableTab;
  back.onclick=()=>{tableTab=null;nav.hidden=false;host.hidden=true;host.setAttribute('inert','');back.hidden=true;nav.querySelector('button')?.focus({preventScroll:true});nav.scrollIntoView?.({block:'start'});};
 }
 const parentBacks=new Map();
 function updateTrail(){
  const bars=[...app.querySelectorAll('.section-menu-bar')].filter(n=>!n.hidden&&!n.closest('[inert],.sf-section-collapsed')&&!n.parentElement.closest('[hidden]'));
  const deepest=bars.at(-1);for(const bar of bars){bar.classList.toggle('section-menu-parent',bar!==deepest);const b=bar.querySelector('.section-menu-back');if(b)b.hidden=bar!==deepest;}
  if(deepest){for(const b of app.querySelectorAll('.sf-section-return,.dashboard-menu-back')){if(!parentBacks.has(b))parentBacks.set(b,b.hidden);b.hidden=true;}}
  else {for(const [b,hidden] of parentBacks)if(b.isConnected)b.hidden=hidden;parentBacks.clear();}
 }
 app.addEventListener('daraya-section-state',updateTrail);
 function adapt(){queued=false;observer.disconnect();try{demoTools();publicShopTools();merchantMenu();driverSections();customerSections();applicationSections();workspaceSections();adminSections();tableSections();updateTrail();}finally{observer.observe(app,{childList:true,subtree:true});}}
 const observer=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(adapt);});
 window.DarayaRefreshSectionMenus=adapt;adapt();
 window.addEventListener('hashchange',()=>{tableTab=null;tableRoute='';if(!queued){queued=true;queueMicrotask(adapt);}});
})();
