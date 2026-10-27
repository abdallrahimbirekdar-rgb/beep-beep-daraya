'use strict';
// Present the existing management tools one section at a time.
(() => {
 const say=(ar,en,de)=>({ar,en,de}[window.ShahinI18n?.language||'ar']||ar);
 const app=document.getElementById('app');
 let lastRoute='';
 const adminHome=()=>!location.hash||['#dashboard','#dashboard/','#dashboard/home'].includes(location.hash);
 const icons={"stores":"🏪","details":"🪪","photos":"📸","videos":"🎬","products":"🛍️","delivery":"🚚","drivers":"🛵","hours":"⏰","reports":"📊","orders":"📋","new-section":"🆕","tools":"🗓️","workspace-tools":"🧰","overview":"🏠","help":"📖","accounts":"👥","statistics":"📈","notebook":"📝","usage":"⚡","plans":"👑","bans":"🛡️","document":"📄","offer-reminders":"🔔","offer-display":"💎","facebook":"📣"};
 const iconMarkup=key=>'<span class="dashboard-color-icon" aria-hidden="true">'+(icons[key]||icons.document)+'</span>';
 window.DarayaDashboardIcon=iconMarkup;
 function link(href,label){const a=document.createElement('a');a.href=href;a.textContent=label;a.dataset.noTranslate='';return a;}
 function back(href,owner=false){const a=link(href,owner?say('العودة إلى الرئيسية من لوحة متجري','Back to my dashboard menu','Zurück zum Geschäftsmenü'):say('العودة إلى اللوحة الرئيسية','Back to main dashboard','Zurück zur Hauptübersicht'));a.className='button dashboard-menu-back';a.dataset.dashboardBack='';return a;}
 function card(a,key){
  a.classList.add('dashboard-menu-card');a.classList.remove('selected');a.removeAttribute('aria-current');a.removeAttribute('aria-controls');
  if(!a.querySelector('[data-dashboard-icon]')){const icon=document.createElement('span');icon.dataset.dashboardIcon='';icon.setAttribute('aria-hidden','true');icon.innerHTML=iconMarkup(key||(a.hash==='#board-reports'?'reports':a.hash==='#banned-ad-accounts'?'bans':a.hash==='#data-requests'?'document':a.hash.startsWith('#merchant-help')?'help':'document'));a.prepend(icon);}
 }
 function startAtTop(){
  const route=location.hash;if(lastRoute===route)return;lastRoute=route;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   if(location.hash!==route)return;window.scrollTo(0,0);
   const target=app.querySelector('[data-dashboard-back],.dashboard-menu-title');
   if(target){if(target.tagName!=='A')target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}
  }));
 }
 function intro(target,owner=false){const h=document.createElement('h2');h.className='dashboard-menu-title';h.dataset.noTranslate='';h.textContent=owner?say('القائمة الرئيسية لمتجري','My shop menu','Mein Geschäftsmenü'):say('أقسام اللوحة الرئيسية','Main dashboard sections','Bereiche der Hauptübersicht');const p=document.createElement('p');p.className='dashboard-menu-hint';p.dataset.noTranslate='';p.textContent=owner?say('اختر قسمًا لفتحه','Choose a section to open','Wähle einen Bereich'):say('اختر الأداة من مجموعتها، أو ابحث عنها بالاسم.','Choose a tool from its group or search by name.','Wähle ein Werkzeug aus seiner Gruppe oder suche nach dem Namen.');target.prepend(h,p);}
 const previousMerchant=merchantDashboard;
 merchantDashboard=function(ms,s,section){
  const tools=section==='workspace-tools',stats=section==='statistics',notebook=section==='notebook';previousMerchant.call(this,ms,s,tools||stats||notebook?'overview':section);
  if(!s)return;const layout=app.querySelector('.merchant-layout'),sidebar=app.querySelector('.merchant-sidebar'),nav=app.querySelector('.merchant-nav'),content=app.querySelector('.merchant-content');
  if(!layout||!sidebar||!nav||!content)return;
  const home=!section||section==='overview'||section==='stores';
  app.dataset.dashboardSection=section||'overview';
  app.dataset.dashboardRoute=location.hash;
  app.classList.remove('dashboard-menu-home','dashboard-menu-section');app.classList.add('dashboard-menu-layout',home?'dashboard-menu-home':'dashboard-menu-section');layout.classList.add('dashboard-single-layout');
  const top=app.querySelector('.merchant-top');top?.querySelector('p.muted')?.setAttribute('hidden','');
  if(home){
   content.hidden=true;sidebar.hidden=false;nav.classList.add('dashboard-menu-grid');nav.setAttribute('aria-label',say('أقسام لوحة متجري','My shop sections','Geschäftsbereiche'));
   // Move original links instead of copying them, preserving feature handlers and locks.
   const links=[...nav.querySelectorAll('a')];links.forEach(a=>nav.append(a));nav.querySelectorAll('details').forEach(d=>d.remove());
   links.forEach(a=>{const key=Object.keys(icons).find(k=>a.getAttribute('href')===merchantHref(k,s));if(a.getAttribute('href')===merchantHref('overview',s)){a.remove();return;}card(a,key);});
   const statsLink=link(merchantHref('statistics',s),say('إحصاءات متجري','My shop stats','Meine Geschäftsstatistik'));card(statsLink,'statistics');nav.append(statsLink);
   const noteLink=link(merchantHref('notebook',s),say('دفتر ملاحظات محلي','My shop notebook','Mein Geschäftsnotizbuch'));card(noteLink,'notebook');nav.append(noteLink);
   const toolLink=link(merchantHref('workspace-tools',s),say('حالة المتجر والتجهيز والباقات','Shop status, setup and plan','Geschäftsstatus, Einrichtung und Tarif'));card(toolLink,'workspace-tools');nav.append(toolLink);
   const guide=top?.querySelector('a[href^="#merchant-help/"]');if(guide){card(guide,'help');nav.append(guide);}
   const refresh=top?.querySelector('#merchant-refresh');if(refresh){refresh.classList.add('dashboard-menu-refresh');sidebar.append(refresh);}
   sidebar.querySelector('.store-identity')?.setAttribute('hidden','');sidebar.querySelector('.setup-mini')?.setAttribute('hidden','');intro(sidebar,true);
  }else{
   sidebar.hidden=true;content.hidden=false;layout.before(back(merchantHref('overview',s),true));
   top?.querySelector('.merchant-actions')?.setAttribute('hidden','');
   if(stats)renderMerchantPageStats(s);
   if(notebook)renderMerchantNotebook(s);
   if(tools){content.querySelector('.merchant-daily')?.remove();content.querySelectorAll('details.merchant-extra,details.setup-review').forEach(d=>d.open=true);}
  }
  startAtTop();
 };
 const adminGroups=[
  ['shops',['المحلات والطلبات','Shops and orders','Geschäfte und Bestellungen']],
  ['offers',['عروض اليوم','Today’s offers','Heutige Angebote']],
  ['people',['المستخدمون والحسابات','Users and accounts','Nutzer und Konten']],
  ['moderation',['البلاغات ومراجعة المحتوى','Reports and moderation','Meldungen und Moderation']],
  ['growth',['الإحصاءات والترويج','Statistics and promotion','Statistik und Werbung']],
  ['settings',['الإعدادات والبيانات','Settings and data','Einstellungen und Daten']]
 ];
 // Each shortcut retains its original anchor and click handlers.
 const adminTools=[
  ['#admin-notifications','moderation',['إشعارات الإدارة','Admin notifications','Verwaltungsbenachrichtigungen'],['الأحداث الجديدة والبلاغات والطلبات','New events, reports and requests','Neue Ereignisse, Meldungen und Anträge'],'reports'],
  ['#business-reviews','shops',['طلبات إنشاء المحلات والخدمات','Business page requests','Anträge für Geschäftsseiten'],['معاينة الطلبات الجديدة والموافقة عليها','Review and approve new requests','Neue Anträge prüfen und freigeben'],'new-section'],
  ['#dashboard/stores','shops',['المحلات والأماكن','Shops and places','Geschäfte und Orte'],['إضافة الأماكن وتعديل صفحاتها وعناوينها','Add places and edit pages and addresses','Orte hinzufügen und Seiten bearbeiten'],'stores'],
  ['#dashboard/products','shops',['المنتجات والخدمات','Products and services','Produkte und Dienste'],['تعديل منتجات المحلات والصور والأسعار','Manage shop products, photos and prices','Produkte, Fotos und Preise verwalten'],'products'],
  ['#dashboard/orders','shops',['طلبات الزبائن','Customer orders','Kundenbestellungen'],['متابعة الطلبات وحالاتها','Track orders and their status','Bestellungen und Status prüfen'],'orders'],
  ['#dashboard/drivers','shops',['مندوبو التوصيل','Delivery drivers','Lieferfahrer'],['إدارة المندوبين وخدمة التوصيل','Manage drivers and delivery','Fahrer und Lieferung verwalten'],'drivers'],
  ['#offer-review','offers',['عروض بانتظار الموافقة','Offers awaiting approval','Angebote zur Freigabe'],['مراجعة العروض الجديدة والموافقة أو الرفض','Review, approve or reject new offers','Neue Angebote prüfen und freigeben'],'products'],
  ['#published-shop-offers','offers',['إدارة العروض المنشورة','Manage published offers','Veröffentlichte Angebote verwalten'],['عرض العروض المنشورة وإيقاف أي عرض','View published offers and stop an offer','Veröffentlichte Angebote ansehen oder beenden'],'products'],
  ['#dashboard/offer-display','offers',['ترتيب وتمييز العروض','Offer order and highlights','Angebote sortieren und hervorheben'],['ترتيب الظهور والتثبيت ومستويات التمييز','Set order, pins and highlight levels','Reihenfolge und Hervorhebungen festlegen'],'offer-display'],
  ['#dashboard/offer-reminders','offers',['إشعارات عروض اليوم','Offer notifications','Angebotsbenachrichtigungen'],['إعداد أوقات الإشعارات وإرسالها','Set notification times and send reminders','Zeiten einstellen und Erinnerungen senden'],'offer-reminders'],
  ['#dashboard/accounts','people',['حسابات المستخدمين وأصحاب المحلات','User and shop owner accounts','Nutzer- und Geschäftsinhaberkonten'],['البحث بالحسابات وربط أصحاب الأنشطة بمحلاتهم','Find accounts and link owners to shops','Konten suchen und Geschäfte zuordnen'],'accounts'],
  ['#account-deletion-admin','people',['طلبات حذف الحسابات','Account deletion requests','Anträge auf Kontolöschung'],['معاينة طلبات الحذف ومعالجتها','Review and handle deletion requests','Löschanträge prüfen und bearbeiten'],'accounts'],
  ['#dashboard/place-reports','moderation',['بلاغات المحلات والأماكن','Place reports','Meldungen zu Orten'],['تصحيح معلومات الأماكن ومراجعة بلاغات الزوار','Review visitor reports about place details','Meldungen zu Ortsangaben prüfen'],'reports'],
  ['#board-reports','moderation',['بلاغات الإعلانات والمستعمل','Ad and used-item reports','Meldungen zu Anzeigen'],['مراجعة محتوى الإعلانات وسوق المستعمل','Review ads and used-item content','Anzeigen und Gebrauchtmarkt prüfen'],'reports'],
  ['#offer-reports','moderation',['بلاغات عروض اليوم','Offer reports','Meldungen zu Angeboten'],['مراجعة البلاغات المتعلقة بالعروض','Review reports about offers','Meldungen zu Angeboten prüfen'],'reports'],
  ['#blocked-publishers','moderation',['الناشرون المحظورون','Blocked publishers','Blockierte Verfasser'],['مراجعة قائمة الناشرين المحظورين','Review blocked publishers','Blockierte Verfasser ansehen'],'bans'],
  ['#banned-ad-accounts','moderation',['حسابات ممنوعة من نشر الإعلانات','Accounts banned from posting','Für Anzeigen gesperrte Konten'],['إدارة منع الحسابات من النشر','Manage posting restrictions','Veröffentlichungssperren verwalten'],'bans'],
  ['#moderation','moderation',['مركز مراجعة المحتوى','Moderation centre','Moderationszentrale'],['جميع مسارات مراجعة المحتوى والبلاغات','All content review and reporting tools','Alle Werkzeuge zur Inhaltsprüfung'],'bans'],
  ['#dashboard/statistics','growth',['الزيارات والإحصاءات','Visits and statistics','Besuche und Statistik'],['متابعة زيارات الموقع وأرقامه','Track site visits and figures','Website-Besuche und Zahlen ansehen'],'statistics'],
  ['#dashboard/reports','growth',['تقارير المتاجر والطلبات','Shop and order reports','Geschäfts- und Bestellberichte'],['تقارير الأداء ومراجعة المتاجر','Performance reports and shop review','Leistungsberichte und Geschäftsprüfung'],'reports'],
  ['#facebook-studio','growth',['تجهيز منشورات فيسبوك','Facebook post studio','Facebook-Beiträge vorbereiten'],['إنشاء تصاميم ومنشورات للترويج','Prepare promotional designs and posts','Werbebilder und Beiträge vorbereiten'],'facebook'],
  ['#dashboard/plans','growth',['باقات الاشتراك','Subscription plans','Tarife'],['إدارة الباقات وخيارات الاشتراك','Manage plans and subscriptions','Tarife und Abonnements verwalten'],'plans'],
  ['#dashboard/usage','settings',['استهلاك الخدمات','Service usage','Dienstnutzung'],['متابعة استهلاك الخدمات المرتبطة بالموقع','View usage of connected services','Nutzung verbundener Dienste ansehen'],'usage'],
  ['#data-requests','settings',['طلبات البيانات والخصوصية','Data and privacy requests','Daten- und Datenschutzanfragen'],['متابعة طلبات المستخدمين المتعلقة ببياناتهم','Handle user data requests','Anfragen zu Nutzerdaten bearbeiten'],'document'],
  ['#dashboard/tools','settings',['أدوات الإدارة وتحديث البيانات','Admin tools and refresh','Werkzeuge und Aktualisieren'],['تحديث البيانات وفتح أدوات الإدارة العامة','Refresh data and open general admin tools','Daten aktualisieren und Werkzeuge öffnen'],'tools']
 ];
 const adminToolFor=href=>adminTools.find(x=>href===x[0]||x[0].startsWith('#dashboard/')&&href.startsWith(x[0]+'/'));
 const adminNormalize=value=>value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ـ/g,'');
 let adminMenuQuery='';
 function organizeAdminMenu(tabs){
  if(!admin||!user||!adminHome()||!tabs.isConnected)return;
  const links=[...tabs.querySelectorAll('a')];
  const pending=links.filter(a=>!a.hasAttribute('data-admin-menu-placed')||a.parentElement?.className!=='admin-menu-group-grid');
  let controls=tabs.previousElementSibling;
  if(!controls?.classList.contains('admin-menu-search')){
   controls=document.createElement('div');controls.className='admin-menu-search';controls.dataset.noTranslate='';
   const label=document.createElement('label');label.htmlFor='admin-tool-search';label.textContent=say('ابحث في اللوحة الرئيسية','Search the main dashboard','Hauptübersicht durchsuchen');
   const row=document.createElement('div'),input=document.createElement('input'),clear=document.createElement('button');input.type='search';input.id='admin-tool-search';input.value=adminMenuQuery;input.autocomplete='off';input.placeholder=say('مثال: عرض، حساب، محل، إشعار…','Try: offer, account, shop, notification…','Zum Beispiel: Angebot, Konto, Geschäft…');clear.type='button';clear.className='outline';clear.textContent=say('مسح البحث','Clear search','Suche löschen');row.append(input,clear);
   const status=document.createElement('p');status.className='admin-menu-search-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
   controls.append(label,row,status);tabs.before(controls);
   input.oninput=()=>{adminMenuQuery=input.value;filterAdminMenu(tabs);};clear.onclick=()=>{input.value='';adminMenuQuery='';filterAdminMenu(tabs);input.focus();};
  }
  tabs.classList.add('admin-menu-organized');
  for(const [key,title] of adminGroups){
   if(tabs.querySelector('[data-admin-group="'+key+'"]'))continue;
   const group=document.createElement('section');group.dataset.adminGroup=key;group.className='admin-menu-group';group.dataset.noTranslate='';
   const h=document.createElement('h3');h.id='admin-group-'+key;h.textContent=say(...title);group.setAttribute('aria-labelledby',h.id);
   const grid=document.createElement('div');grid.className='admin-menu-group-grid';group.append(h,grid);tabs.append(group);
  }
  for(const a of pending){
   const spec=adminToolFor(a.getAttribute('href')||''),title=spec?say(...spec[2]):a.textContent.trim();
   card(a,spec?.[4]||a.dataset.dashboardMenuKey);const icon=a.querySelector('[data-dashboard-icon]');
   for(const child of [...a.childNodes])if(child!==icon)child.remove();
   const label=document.createElement('span');label.className='admin-menu-label';label.textContent=title;a.append(label);
   if(spec){const description=document.createElement('small');description.className='admin-menu-description';description.textContent=say(...spec[3]);a.append(description);}
   const groupKey=spec?.[1]||'settings';a.dataset.adminMenuPlaced='';a.dataset.adminSearch=adminNormalize(title+' '+(spec?spec[2].join(' ')+' '+spec[3].join(' '):'')+' '+a.getAttribute('href'));
   tabs.querySelector('[data-admin-group="'+groupKey+'"] .admin-menu-group-grid').append(a);
  }
  // Stable task order, including shortcuts inserted later by other features.
  for(const group of tabs.querySelectorAll('[data-admin-group]')){
   const grid=group.querySelector('.admin-menu-group-grid'),items=[...grid.children];
   const ordered=[...items].sort((a,b)=>{const rank=x=>{const spec=adminToolFor(x.getAttribute('href')||'');return spec?adminTools.indexOf(spec):999;};return rank(a)-rank(b);});
   if(items.some((a,i)=>a!==ordered[i]))grid.append(...ordered);
  }
  filterAdminMenu(tabs);
 }
 function filterAdminMenu(tabs){
  const terms=adminNormalize(adminMenuQuery.trim()).split(/\s+/).filter(Boolean);let count=0;
  for(const group of tabs.querySelectorAll('[data-admin-group]')){let visible=0;for(const a of group.querySelectorAll('a')){a.hidden=!terms.every(term=>(a.dataset.adminSearch||'').includes(term));if(!a.hidden){visible++;count++;}}group.hidden=!visible;}
  const status=tabs.previousElementSibling?.querySelector('.admin-menu-search-status');
  if(status)status.textContent=count?(terms.length?say('نتائج البحث: ','Search results: ','Suchergebnisse: '):say('أدوات الإدارة: ','Admin tools: ','Verwaltungswerkzeuge: '))+count:say('لا توجد أداة مطابقة. جرّب كلمة مثل «عرض» أو «حساب».','No matching tool. Try “offer” or “account”.','Kein passendes Werkzeug. Versuche „Angebot“ oder „Konto“.');
 }

 const previousDashboard=renderDashboard;
 renderDashboard=function(tab,sid){
  previousDashboard.apply(this,arguments);
  if(!admin||!user||tab==='setup'||app.querySelector('.merchant-layout'))return;
  const tabs=app.querySelector('.tabs'),content=app.querySelector('#dashboard-content'),sidebar=app.querySelector('.admin-sidebar'),heading=app.querySelector('.admin-heading');if(!tabs||!content||!heading)return;
  const title=heading.querySelector('h1');if(title){title.dataset.noTranslate='';title.textContent=say('اللوحة الرئيسية','Main dashboard','Hauptübersicht');}
  const home=adminHome();app.classList.remove('dashboard-menu-home','dashboard-menu-section');app.classList.add('dashboard-menu-layout',home?'dashboard-menu-home':'dashboard-menu-section');
  app.dataset.dashboardSection=home?'home':tab;
  app.dataset.dashboardRoute=location.hash;
  const workspace=app.querySelector('.admin-workspace');workspace?.classList.add('dashboard-single-layout');
  const extra=[['#data-requests',say('طلبات البيانات والخصوصية','Data and privacy requests','Daten- und Datenschutzanfragen'),'document'],['#offer-review',say('عروض بانتظار الموافقة','Offers awaiting approval','Angebote zur Freigabe'),'products'],['#published-shop-offers',say('إدارة العروض المنشورة','Manage published offers','Veröffentlichte Angebote verwalten'),'products'],['#offer-reports',say('بلاغات عروض اليوم','Offer reports','Meldungen zu Angeboten'),'reports'],['#moderation',say('مركز مراجعة المحتوى','Moderation centre','Moderationszentrale'),'bans'],['#blocked-publishers',say('الناشرون المحظورون','Blocked publishers','Blockierte Verfasser'),'bans'],['#facebook-studio',say('تجهيز منشورات فيسبوك','Facebook post studio','Facebook-Beiträge vorbereiten'),'facebook'],['#dashboard/offer-display',say('ترتيب وتمييز عروض اليوم','Offer order and levels','Angebotsreihenfolge und Stufen'),'offer-display'],['#dashboard/offer-reminders',say('إشعارات عروض اليوم','Offer reminders','Angebotserinnerungen'),'offer-reminders'],['#dashboard/place-reports',say('بلاغات الأماكن','Place reports','Ortsmeldungen'),'place-reports'],['#dashboard/reports',say('التقارير ومراجعة المتاجر','Reports and shop review','Berichte und Geschäftsprüfung'),'reports'],['#dashboard/statistics',say('الزيارات والإحصاءات','Visits and statistics','Besuche und Statistik'),'statistics'],['#dashboard/plans',say('باقات الاشتراك','Subscription plans','Tarife'),'plans'],['#banned-ad-accounts',say('الحسابات المحظورة من الإعلانات','Accounts blocked from ads','Für Anzeigen gesperrte Konten'),'bans'],['#dashboard/tools',say('أدوات الإدارة وتحديث البيانات','Admin tools and refresh','Werkzeuge und Aktualisieren'),'tools']];
  extra.forEach(([href,title,key])=>{if(![...tabs.querySelectorAll('a')].some(a=>a.getAttribute('href')===href)){const a=link(href,title);a.dataset.dashboardMenuKey=key;tabs.append(a);}});
  const request=heading.querySelector('a[href="#data-requests"]');if(request){tabs.querySelector('a[href="#data-requests"]')?.remove();tabs.append(request);}
  const planButtons=[...heading.querySelectorAll(':scope > button')];const tools=heading.querySelector('.admin-tools');
  if(home){
   content.hidden=true;if(sidebar)sidebar.hidden=false;tabs.hidden=false;tabs.classList.add('dashboard-menu-grid');
   tabs.querySelectorAll('a').forEach(a=>card(a,a.dataset.dashboardMenuKey||a.hash.split('/')[1]));
   intro(sidebar||tabs.parentElement);organizeAdminMenu(tabs);
  }else{
   content.hidden=false;if(sidebar)sidebar.hidden=true;else tabs.hidden=true;
   heading.after(back('#dashboard'));
   if(tab==='place-reports'){
    content.innerHTML='<section class="panel" data-no-translate><h2>'+say('بلاغات الأماكن','Place reports','Ortsmeldungen')+'</h2><p>'+say('راجع بلاغات الزوار عن معلومات الأماكن ومحتواها، ثم علّم البلاغ بعد معالجته.','Review visitor reports about place details and content, then mark them reviewed.','Prüfe Besuchermeldungen zu Ortsangaben und Inhalten und markiere sie anschließend als geprüft.')+'</p><button type="button" class="outline" data-refresh-place-reports>'+say('تحديث البلاغات','Refresh reports','Meldungen aktualisieren')+'</button><div data-place-reports-list role="status"></div></section>';
    const box=content.querySelector('[data-place-reports-list]');
    const refresh=()=>{box.textContent=say('جاري تحميل البلاغات…','Loading reports…','Meldungen werden geladen…');communityAdminReports(box).catch(()=>{if(box.isConnected)box.textContent=say('تعذر تحميل البلاغات. حاول مجددًا.','Could not load reports. Try again.','Meldungen konnten nicht geladen werden. Versuche es erneut.');});};
    content.querySelector('[data-refresh-place-reports]').onclick=refresh;refresh();
   }
   if(tab==='statistics'){content.replaceChildren();const h=document.createElement('h2');h.textContent=say('الزيارات والإحصاءات','Visits and statistics','Besuche und Statistik');h.dataset.noTranslate='';content.append(h);const stats=app.querySelector(':scope > .stats');if(stats)content.append(stats);}
   if(tab==='plans'||tab==='tools'){
    content.replaceChildren();const panel=document.createElement('section');panel.className='panel dashboard-tools-panel';const h=document.createElement('h2');h.dataset.noTranslate='';h.textContent=tab==='plans'?say('باقات الاشتراك','Subscription plans','Tarife'):say('أدوات الإدارة','Admin tools','Verwaltungswerkzeuge');panel.append(h);
    if(tab==='plans')planButtons.forEach(b=>panel.append(b));
    else if(tools){const items=tools.querySelector('.admin-tools-items');if(items)while(items.firstChild)panel.append(items.firstChild);}
    content.append(panel);
   }
  }
  if(tools)tools.hidden=true;planButtons.filter(b=>heading.contains(b)).forEach(b=>b.hidden=true);
  heading.querySelector('.form-actions')?.setAttribute('hidden','');startAtTop();
 };
 function externalBack(){
  const route=location.hash.split('/')[0];
  if(admin&&user&&['#board-reports','#banned-ad-accounts','#data-requests','#offer-review','#published-shop-offers','#offer-reports','#moderation','#blocked-publishers','#facebook-studio'].includes(route)){
   app.classList.remove('dashboard-menu-home','dashboard-menu-section');app.classList.add('dashboard-menu-external');
   const existing=app.querySelector('.simple-back');if(existing&&route!=='#banned-ad-accounts'){existing.replaceWith(back('#dashboard'));}else if(!app.querySelector('[data-dashboard-back]'))app.prepend(back('#dashboard'));
   startAtTop();
  }else if(route==='#merchant-help'&&user){
   const s=mine().find(x=>x.id===location.hash.split('/')[1])||mine()[0];if(!s)return;
   app.querySelector(':scope > .simple-back')?.remove();if(!app.querySelector('[data-dashboard-back]'))app.prepend(back(merchantHref('overview',s),true));startAtTop();
  }
 }
 const previousRender=render;render=function(){if(!location.hash.startsWith('#dashboard'))app.classList.remove('dashboard-menu-layout','dashboard-menu-home','dashboard-menu-section');app.classList.remove('dashboard-menu-external');const result=previousRender.apply(this,arguments);externalBack();return result;};
 // Some older routes register a renderer directly; the hash listener also fixes their back link.
 window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#dashboard')){if(app.dataset.dashboardRoute!==location.hash)render();}else externalBack();});
 new MutationObserver(()=>{externalBack();if(admin&&user&&adminHome()){const tabs=app.querySelector('.admin-sidebar .tabs, :scope > .tabs');if(tabs&&[...tabs.querySelectorAll('a')].some(a=>!a.hasAttribute('data-admin-menu-placed')||!a.closest('.admin-menu-group-grid')))organizeAdminMenu(tabs);}}).observe(app,{childList:true,subtree:true});
})();

