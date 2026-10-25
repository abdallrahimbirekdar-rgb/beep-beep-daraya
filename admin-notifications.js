'use strict';
(() => {
 const route='#admin-notifications',app=document.getElementById('app');
 const t=(ar,en,de)=>({ar,en,de}[window.ShahinI18n?.language||'ar']||ar);
 const groups={all:['الكل','All','Alle'],reports:['البلاغات','Reports','Meldungen'],orders:['الطلبات','Orders','Bestellungen'],pages:['إنشاء الصفحات','Page requests','Seitenanträge'],offers:['العروض','Offers','Angebote'],accounts:['المستخدمون','Users','Nutzer'],privacy:['البيانات والحذف','Data and deletion','Daten und Löschung'],community:['نشاط السوق','Market activity','Marktaktivität'],bookings:['الحجوزات','Bookings','Buchungen']};
 const management=new Set(['#business-reviews','#offer-review','#offer-reports','#board-reports','#published-shop-offers','#account-deletion-admin','#data-requests','#moderation','#blocked-publishers','#banned-ad-accounts','#facebook-studio',route]);
 let owner=null,ticket=0,activeLoad=null,timer=null,data=null,error='',category='all',page=0,unreadOnly=false,latestSeen=null,loadedAt=0,lastView=null;
 const eligible=()=>!!(api&&user&&admin&&!passwordRecovery&&(location.hash.startsWith('#dashboard')||location.hash.startsWith('#review-business/')||management.has(location.hash)));
 const isHome=()=>['#dashboard','#dashboard/','#dashboard/home'].includes(location.hash);
 const date=s=>new Date(s).toLocaleString(({ar:'ar-SY',en:'en-GB',de:'de-DE'})[window.ShahinI18n?.language||'ar']);
 function clear(){owner=null;ticket++;activeLoad=null;data=null;error='';latestSeen=null;loadedAt=0;lastView=null;clearInterval(timer);timer=null;document.querySelector('[data-admin-inbox-bar]')?.remove();document.querySelector('[data-admin-inbox-preview]')?.remove();}
 function safeTarget(value){return typeof value==='string'&&/^#(?:dashboard(?:\/|$)|review-business\/[0-9a-f-]{36}$|ad\/[0-9a-f-]{36}$|offer-review$|offer-reports$|board-reports$|account-deletion-admin$|data-requests$|requests$)/.test(value)?value:'#dashboard';}
 function validFeed(d){return !!d&&Array.isArray(d.items)&&Number.isSafeInteger(d.unread)&&d.unread>=0&&Number.isSafeInteger(d.total)&&d.total>=0&&Number.isSafeInteger(d.latest_id)&&d.latest_id>=0&&d.page_size===30&&d.items.every(n=>Number.isSafeInteger(n.id)&&n.id>0&&typeof n.title==='string'&&typeof n.read==='boolean'&&Number.isFinite(Date.parse(n.created_at)));}
 function row(n){return '<article class="admin-notice '+(n.read?'is-read':'is-unread')+'" data-notice-id="'+n.id+'"><div class="admin-notice-content"><small>'+esc(t(...(groups[n.category]||groups.all)))+' · '+esc(date(n.created_at))+'</small><h3><span class="admin-notice-dot" aria-hidden="true"></span>'+esc(n.title)+'</h3>'+(n.detail?'<p>'+esc(n.detail)+'</p>':'')+'<span class="admin-notice-read-label">'+t(n.read?'مقروء':'غير مقروء',n.read?'Read':'Unread',n.read?'Gelesen':'Ungelesen')+'</span></div><div class="admin-notice-actions"><button type="button" data-notice-open="'+n.id+'">'+t('فتح العنصر','Open item','Eintrag öffnen')+'</button>'+(!n.read?'<button type="button" class="outline" data-notice-read="'+n.id+'">'+t('تمت القراءة','Mark read','Als gelesen markieren')+'</button>':'')+'</div></article>';}
 function header(){return '<div class="admin-inbox-heading"><div><span class="eyebrow">'+t('اللوحة الرئيسية','Main dashboard','Hauptübersicht')+'</span><h1>'+t('إشعارات الإدارة','Admin notifications','Verwaltungsbenachrichtigungen')+'</h1><p>'+t('القراءة تخص حسابك؛ معالجة الطلب أو البلاغ تتم من قسمه.','Read status belongs to your account. Handle requests and reports in their own sections.','Der Lesestatus gilt für dein Konto. Bearbeite Anträge und Meldungen im jeweiligen Bereich.')+'</p></div><a class="button outline" href="#dashboard">'+t('اللوحة الرئيسية','Main dashboard','Hauptübersicht')+'</a></div>';}
 function pageShell(){
  const entering=!app.classList.contains('admin-inbox-page');
  app.className='admin-inbox-page';
  app.innerHTML='<section class="panel" data-no-translate>'+header()+'<div class="admin-inbox-filters"><label>'+t('نوع الإشعار','Notification type','Benachrichtigungsart')+'<select data-notice-category>'+Object.entries(groups).map(([key,label])=>'<option value="'+key+'" '+(key===category?'selected':'')+'>'+esc(t(...label))+'</option>').join('')+'</select></label><label class="admin-inbox-check"><input type="checkbox" data-notice-unread '+(unreadOnly?'checked':'')+'>'+t('غير المقروء فقط','Unread only','Nur ungelesene')+'</label></div><div class="admin-inbox-toolbar"><button class="outline" type="button" data-notice-refresh>'+t('تحديث','Refresh','Aktualisieren')+'</button><button class="outline" type="button" data-notice-all>'+t('تحديد الكل كمقروء','Mark all read','Alle als gelesen markieren')+'</button><strong data-notice-count></strong></div><p class="admin-inbox-status" data-notice-status role="status" aria-live="polite"></p><div data-notice-list></div><div class="admin-inbox-pagination"><button class="outline" data-notice-prev>'+t('السابق','Previous','Zurück')+'</button><span data-notice-page></span><button class="outline" data-notice-next>'+t('التالي','Next','Weiter')+'</button></div></section>';
  if(entering){window.scrollTo(0,0);const heading=app.querySelector('h1');heading.tabIndex=-1;heading.focus({preventScroll:true});}
  app.querySelector('[data-notice-category]').onchange=e=>{category=e.target.value;page=0;load();};
  app.querySelector('[data-notice-unread]').onchange=e=>{unreadOnly=e.target.checked;page=0;load();};
  app.querySelector('[data-notice-refresh]').onclick=()=>load();
  app.querySelector('[data-notice-all]').onclick=()=>readAll();
  app.querySelector('[data-notice-prev]').onclick=()=>{if(page){page--;load();}};
  app.querySelector('[data-notice-next]').onclick=()=>{if(data&&(page+1)*30<data.total){page++;load();}};
 }
 function bindRows(host){host.querySelectorAll('[data-notice-read]').forEach(b=>b.onclick=()=>mark(Number(b.dataset.noticeRead)));host.querySelectorAll('[data-notice-open]').forEach(b=>b.onclick=()=>openItem(Number(b.dataset.noticeOpen)));}
 function paint(){
  if(!eligible())return;
  const bar=document.querySelector('[data-admin-inbox-bar]');
  if(bar){bar.querySelector('[data-notice-badge]').textContent=data?(data.unread>99?'99+':String(data.unread)):'…';bar.querySelector('[data-notice-badge]').hidden=!!data&&!data.unread;bar.querySelector('[data-notice-bar-state]').textContent=error?t('تعذر تحديث الإشعارات','Notifications could not refresh','Benachrichtigungen nicht aktualisiert'):data?t('غير مقروء: ','Unread: ','Ungelesen: ')+data.unread:t('جارٍ التحديث…','Updating…','Wird aktualisiert…');}
  if(location.hash===route){
   const status=app.querySelector('[data-notice-status]');if(!status)return;
   status.textContent=error||(activeLoad?t('جارٍ تحديث الإشعارات…','Updating notifications…','Benachrichtigungen werden aktualisiert…'):t('تحديث تلقائي كل ٢٠ ثانية أثناء فتح لوحة الإدارة.','Updates every 20 seconds while the admin dashboard is visible.','Aktualisierung alle 20 Sekunden bei sichtbarer Verwaltung.'));
   app.querySelector('[data-notice-count]').textContent=data?t('غير المقروء: ','Unread: ','Ungelesen: ')+data.unread:'';
   const list=app.querySelector('[data-notice-list]');list.innerHTML=data?(data.items.map(row).join('')||'<p class="empty">'+t('لا توجد إشعارات ضمن هذا الاختيار.','No notifications for this filter.','Keine Benachrichtigungen für diesen Filter.')+'</p>'):'';bindRows(list);
   app.querySelector('[data-notice-all]').disabled=!data||!data.unread||!!activeLoad;
   app.querySelector('[data-notice-prev]').disabled=!page||!!activeLoad;
   app.querySelector('[data-notice-next]').disabled=!data||(page+1)*30>=data.total||!!activeLoad;
   app.querySelector('[data-notice-page]').textContent=data?t('صفحة ','Page ','Seite ')+(page+1)+' / '+Math.max(1,Math.ceil(data.total/30)):'';
  }

 }
 async function load(){
  if(!eligible())return;const uid=user.id,id=++ticket;
  const params=location.hash===route?{p_category:category,p_page:page,p_unread_only:unreadOnly}:{p_category:'all',p_page:0,p_unread_only:false};
  const pending=api.rpc('admin_notifications_feed',params);activeLoad=pending;paint();
  try{const r=await pending;if(!eligible()||owner!==uid||id!==ticket)return;if(r.error)throw r.error;if(!validFeed(r.data))throw Error('Invalid inbox data');
   if(page&&location.hash===route&&page*30>=r.data.total){page=Math.max(0,Math.ceil(r.data.total/30)-1);activeLoad=null;return load();}
   const previous=latestSeen;data=r.data;error='';loadedAt=Date.now();latestSeen=data.latest_id;
   if(previous!==null&&data.latest_id>previous&&typeof toast==='function')toast(t('وصل إشعار إداري جديد','New admin notification','Neue Verwaltungsbenachrichtigung'));
  }catch(e){if(!eligible()||owner!==uid||id!==ticket)return;error=t('تعذر تحميل الإشعارات. تحقق من الاتصال ثم اضغط تحديث.','Could not load notifications. Check your connection and refresh.','Benachrichtigungen konnten nicht geladen werden. Prüfe die Verbindung und aktualisiere.');}
  finally{if(id===ticket){activeLoad=null;paint();}}
 }
 async function mark(id){
  if(!eligible()||!data)return false;const uid=user.id;ticket++;activeLoad=null;
  try{const r=await api.rpc('admin_notifications_read',{p_id:id});if(r.error)throw r.error;if(!eligible()||owner!==uid)return false;await load();return true;}
  catch{if(eligible()&&owner===uid){error=t('تعذر حفظ القراءة. حاول مجددًا.','Could not save read status. Try again.','Lesestatus konnte nicht gespeichert werden. Versuche es erneut.');paint();}return false;}
 }
 async function readAll(){
  if(!eligible()||!data||!data.unread)return;const uid=user.id,through=data.latest_id;ticket++;activeLoad=null;
  try{const r=await api.rpc('admin_notifications_read',{p_through_id:through});if(r.error)throw r.error;if(!eligible()||owner!==uid)return;page=0;await load();}
  catch{if(eligible()&&owner===uid){error=t('تعذر حفظ القراءة. حاول مجددًا.','Could not save read status. Try again.','Lesestatus konnte nicht gespeichert werden. Versuche es erneut.');paint();}}
 }
 async function openItem(id){
  if(!eligible())return;const n=data?.items.find(n=>n.id===id);if(!n)return;const uid=user.id;
  // A fresh visit to the inbox need not have loaded the global order list.
  if(n.category==='orders'&&/^[0-9a-f-]{36}$/.test(n.source_id||'')){
   try{const r=await api.from('orders').select('*').eq('id',n.source_id).maybeSingle();if(!eligible()||owner!==uid)return;if(r.error||!r.data)throw Error();orders=[r.data,...orders.filter(o=>o.id!==r.data.id)];}
   catch{if(eligible()){error=t('تعذر فتح الطلب. أعد المحاولة.','Could not open the order. Try again.','Bestellung konnte nicht geöffnet werden. Versuche es erneut.');paint();}return;}
  }
  if(!n.read&&!await mark(id))return;if(!eligible()||owner!==uid)return;
  location.hash=safeTarget(n.target);
 }
 function sync(){
  if(!eligible()){clear();return;}
  if(owner!==user.id){clear();owner=user.id;category='all';page=0;unreadOnly=false;}
  // The inbox is a standalone screen; dashboard pages show only its shortcut.
  document.querySelector('[data-admin-inbox-preview]')?.remove();
  if(location.hash===route)document.querySelector('[data-admin-inbox-bar]')?.remove();
  if(location.hash!==route&&!document.querySelector('[data-admin-inbox-bar]')){
   const bar=document.createElement('aside');bar.className='admin-inbox-bar';bar.dataset.adminInboxBar='';bar.dataset.noTranslate='';bar.innerHTML='<a href="'+route+'" class="admin-inbox-bell"><svg aria-hidden="true" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M9 21h6"/></svg> '+t('إشعارات الإدارة','Admin notifications','Verwaltungsbenachrichtigungen')+' <b data-notice-badge>…</b></a><span data-notice-bar-state role="status"></span>';app.before(bar);
  }
  if(!timer)timer=setInterval(()=>{if(!eligible()){clear();return;}if(document.visibilityState!=='hidden'&&navigator.onLine!==false&&!activeLoad)load();},20000);
  const view=location.hash===route?'inbox':isHome()?'home':'bar',changed=lastView!==view;lastView=view;
  paint();if((changed||!activeLoad)&&(changed||Date.now()-loadedAt>5000||location.hash===route))load();
 }
 const oldRender=render;render=function(){
  if(location.hash===route&&api&&!passwordRecovery){
   if(!user||!admin){clear();app.className='';app.innerHTML='<section class="panel" data-no-translate><h1>'+t('إشعارات الإدارة','Admin notifications','Verwaltungsbenachrichtigungen')+'</h1><p>'+t('هذا القسم متاح لحسابات الإدارة فقط.','Only admin accounts can open this section.','Dieser Bereich ist nur für Verwaltungskonten zugänglich.')+'</p><a href="#account" class="button">'+t('حسابي','My account','Mein Konto')+'</a></section>';return;}
   pageShell();sync();return;
  }
  const result=oldRender.apply(this,arguments);sync();return result;
 };
 const oldDashboard=renderDashboard;renderDashboard=function(){const r=oldDashboard.apply(this,arguments);sync();return r;};
 window.addEventListener('hashchange',()=>{if(location.hash===route)render();else sync();});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='hidden')sync();});window.addEventListener('online',sync);
 window.addEventListener('languagechange',()=>{if(location.hash===route)pageShell();document.querySelector('[data-admin-inbox-bar]')?.remove();sync();});
 window.DarayaAdminInbox={validFeed,safeTarget};sync();
})();

