'use strict';
(()=>{
 const t=(a,e,d)=>ct(a,e,d),uuid=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x||'');
 const storageKey=()=> 'daraya-saved-offers-v1:'+(user?.id||'guest');
 function saved(){try{const rows=JSON.parse(localStorage.getItem(storageKey())||'[]');return Array.isArray(rows)?rows.filter(x=>x&&typeof x.id==='string'&&typeof x.title==='string').slice(0,100):[];}catch{return [];}}
 function savedButton(o){const yes=saved().some(x=>x.id===o.id);return '<button type="button" class="outline" data-save-offer="'+esc(o.id)+'" aria-pressed="'+yes+'">'+t(yes?'♥ محفوظ':'♡ حفظ العرض',yes?'♥ Saved':'♡ Save offer',yes?'♥ Gespeichert':'♡ Angebot merken')+'</button>';}
 function dayKey(value){try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Damascus',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));}catch{return '';}}
 function nav(mode){return '<nav class="reels-tabs offer-section-tabs" aria-label="'+t('أقسام عروض اليوم','Offer sections','Angebotsbereiche')+'">'+[['all','#offers',t('كل العروض','All offers','Alle Angebote'),'🏷️'],['saved','#saved-offers',t('العروض المحفوظة','Saved offers','Gemerkte Angebote'),'♥']].map(([key,href,label,icon])=>'<a href="'+href+'"'+(mode===key?' aria-current="page"':'')+'><span aria-hidden="true">'+icon+'</span><strong>'+label+'</strong></a>').join('')+'</nav>';}
 function countdownParts(ends,now=Date.now()){
  const end=Date.parse(ends);if(!Number.isFinite(end))return null;
  const total=Math.max(0,Math.ceil((end-now)/1000));return {days:Math.floor(total/86400),hours:Math.floor(total/3600)%24,minutes:Math.floor(total/60)%60,seconds:total%60,total};
 }
 function countdownText(parts){
  if(!parts.total)return t('انتهى العرض','Offer ended','Angebot abgelaufen');
  if(parts.total<3600)return t('ينتهي قريبًا — أقل من ساعة','Ends soon — less than an hour','Endet bald — unter einer Stunde');
  const n=x=>Number(x).toLocaleString(communityLang());
  if(parts.days)return t('متبقّي '+n(parts.days)+' يوم و'+n(parts.hours)+' ساعة',n(parts.days)+' days and '+n(parts.hours)+' hours left','Noch '+n(parts.days)+' Tage und '+n(parts.hours)+' Std.');
  return t('متبقّي '+n(parts.hours)+' ساعة و'+n(parts.minutes)+' دقيقة',n(parts.hours)+' hours and '+n(parts.minutes)+' min left','Noch '+n(parts.hours)+' Std. und '+n(parts.minutes)+' Min.');
 }
 function countdown(o){const parts=countdownParts(o.ends_at);if(!parts)return '';return '<section class="offer-countdown offer-countdown-compact'+(parts.total<3600?' offer-countdown-urgent':'')+'" data-offer-countdown="'+esc(o.ends_at)+'"><span aria-hidden="true">◷</span><strong data-count-heading>'+countdownText(parts)+'</strong><small class="offer-exact-end">'+t('حتى: ','Until: ','Bis: ')+esc(communityDate(o.ends_at))+'</small></section>';}
 function updateCountdown(host){host.querySelectorAll('.reel-current [data-offer-countdown]').forEach(box=>{const parts=countdownParts(box.dataset.offerCountdown);if(!parts)return;box.classList.toggle('offer-countdown-urgent',parts.total<3600);const node=box.querySelector('[data-count-heading]'),value=countdownText(parts);if(node&&node.textContent!==value)node.textContent=value;});}
 function availability(o,now=Date.now()){
  if(o.demo)return '';
  const value=o.daily_offer_availability?.confirmed_at||o.daily_offer_availability?.[0]?.confirmed_at;
  const stamp=Date.parse(value);if(!Number.isFinite(stamp)||stamp>now||stamp<Date.parse(o.created_at)||stamp>=Date.parse(o.ends_at))return '';
  const today=dayKey(value)===dayKey(now);
  return '<p class="offer-availability">✓ '+esc(today?t('أكّد المحل توفره اليوم','Shop confirmed it is available today','Geschäft hat Verfügbarkeit heute bestätigt'):t('آخر تأكيد من المحل: ','Last shop confirmation: ','Letzte Bestätigung: ')+communityDate(value))+'</p>';
 }
 function details(o){const m=window.DarayaOffers.meta(o),text=String(m.terms||'');if(m.kind==='text'&&!m.video_link)return '<section class="reel-details offer-expand-details"><h3>'+t('العروض والتفاصيل','Offers and details','Angebote und Details')+'</h3><p>'+esc(text)+'</p></section>'+(o.address?'<p class="reel-address">'+esc(o.address)+'</p>':'');return '<details class="reel-details offer-expand-details"><summary><span class="offer-details-preview">'+esc(text)+'</span><strong>'+t('تفاصيل العرض','Offer details','Angebotsdetails')+' ▾</strong></summary><p>'+esc(text)+'</p></details>'+(o.address?'<p class="reel-address">'+esc(o.address)+'</p>':'');}
 function badges(o,now=Date.now()){
  if(!Number.isFinite(Date.parse(o.ends_at))||Date.parse(o.ends_at)<=now)return '';
  const today=dayKey(now),end=dayKey(o.ends_at),created=dayKey(o.created_at);
  return '<div class="offer-time-badges">'+(created&&created===today?'<span>'+t('أُضيف اليوم','Added today','Heute hinzugefügt')+'</span>':'')+(end===today?'<span class="offer-ending">'+t('ينتهي اليوم','Ends today','Endet heute')+'</span>':'')+'</div>';
 }
 function savings(o){const m=window.DarayaOffers.meta(o),original=Number(m.original),price=Number(o.price);return m.original!=null&&o.price!=null&&Number.isFinite(original)&&Number.isFinite(price)&&original>price&&price>=0?'<p class="offer-savings">'+t('وفّر ','Save ','Spare ')+esc(money(original-price))+'</p>':'';}
 function contactLinks(o,s,locationOnly=false){
  if(o.demo)return locationOnly?'<div class="offer-contact-actions offer-location-actions"><button type="button" class="button outline offer-location-link" data-offer-demo-location><span aria-hidden="true">📍</span> '+t('الموقع والاتجاهات','Location & directions','Standort & Route')+'</button></div>':'';
  if(!s)return '';
  let wa='';try{const u=new URL(s.translations?._social_links?.whatsapp||'');if(u.protocol==='https:'&&!u.username&&!u.password&&['wa.me','api.whatsapp.com','www.whatsapp.com','whatsapp.com'].includes(u.hostname)){
   const offerUrl='https://damascus-shop.com/#offers/'+encodeURIComponent(o.id);
   u.searchParams.set('text',t('مرحبًا، أريد الاستفسار عن العرض: ','Hello, I would like to ask about: ','Hallo, ich habe eine Frage zum Angebot: ')+String(o.title||'')+'\n'+offerUrl);wa=u.href;
  }}catch{}
  const phone=String(s.contact_phone||'').trim(),validPhone=/^\+?[0-9 ()-]{6,25}$/.test(phone);
  const point=typeof storeCoordinates==='function'?storeCoordinates(s):null;
  if(locationOnly){
   const address=String(s.address||o.address||'').trim();
   const destination=point?point.join(','):address?[s.name,address,'داريا','سوريا'].filter(Boolean).join('، '):'';
   return destination?'<div class="offer-contact-actions offer-location-actions"><a class="button outline offer-location-link" data-offer-contact="'+esc(o.id)+'" href="https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(destination)+'" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">📍</span> '+t('الموقع والاتجاهات','Location & directions','Standort & Route')+'</a></div>':'';
  }
  return wa?'<a class="button offer-ask" data-offer-contact="'+esc(o.id)+'" href="'+esc(wa)+'" target="_blank" rel="noopener noreferrer">'+t('اسأل عن العرض ↗','Ask about this offer ↗','Zum Angebot fragen ↗')+'</a>':validPhone?'<a class="button offer-ask" data-offer-contact="'+esc(o.id)+'" href="tel:'+esc(phone)+'">'+t('اسأل المحل ☎','Call the shop ☎','Geschäft anrufen ☎')+'</a>':'';
 }
 function summary(s,rows){const region=s.demo?t('عنوان تجريبي','Demo address','Beispieladresse'):typeof communityRegion==='function'?communityRegion(s):s.address||'';const category=typeof directoryKind==='function'&&!s.demo?window.DARAYA_SECTORS?.find(x=>x[0]===directoryKind(s)):null;const lang=typeof communityLang==='function'?communityLang():'ar';return '<strong>'+rows.length+' '+t('عروض سارية','active offers','gültige Angebote')+'</strong>'+ (category?' · '+esc(category[lang==='de'?3:lang==='en'?2:1]):'')+(region?' · '+esc(region):'');}
 const sent=new Set();let metricsMissing=false;
 async function record(o,kind){
  if(o.demo||!uuid(o.id)||metricsMissing||!api||admin||mine().some(s=>s.id===o.store_id))return;
  let session;try{session=sessionStorage.getItem('daraya-offer-session');if(!uuid(session)){session=crypto.randomUUID();sessionStorage.setItem('daraya-offer-session',session);}}catch{return;}
  const key=[o.id,kind,session,dayKey(Date.now())].join(':');if(sent.has(key))return;sent.add(key);
  try{const r=await api.rpc('record_daily_offer_event',{p_offer:o.id,p_session:session,p_kind:kind});if(r.error){sent.delete(key);if(r.error.code==='PGRST202'||r.error.code==='42883')metricsMissing=true;}}catch{sent.delete(key);}
 }
 function bind(card,o){
  const demoLocation=card.querySelector('[data-offer-demo-location]');
  if(demoLocation)demoLocation.onclick=()=>modal('<section data-no-translate><h2>'+t('الموقع والاتجاهات','Location & directions','Standort & Route')+'</h2><p>'+t('هذا عرض تجريبي بعنوان افتراضي، وليس موقع محل حقيقي. في العروض الحقيقية يفتح هذا الزر موقع المحل والاتجاهات إليه عبر خرائط جوجل.','This is a demo offer with an example address, not a real shop location. For real offers, this button opens the shop location and directions in Google Maps.','Dieses Beispielangebot hat eine fiktive Adresse, keinen echten Geschäftsstandort. Bei echten Angeboten öffnet diese Taste den Standort und die Route in Google Maps.')+'</p>'+(o.address?'<p>'+esc(o.address)+'</p>':'')+'</section>');
  const save=card.querySelector('[data-save-offer]');if(save)save.onclick=()=>{
   const uid=user?.id||null,rows=saved(),index=rows.findIndex(x=>x.id===o.id),s=stores.find(s=>s.id===o.store_id);
   if(index>=0)rows.splice(index,1);else{if(rows.length>=100){toast(t('يمكن حفظ ١٠٠ عرض. احذف عرضًا قديمًا أولًا.','You can save 100 offers. Remove an old one first.','Bis zu 100 Angebote. Entferne zuerst ein altes.'));return;}rows.unshift({id:o.id,title:o.title,store_id:o.store_id,shop_name:o.shop_name||s?.name||'',ends_at:o.ends_at,demo:!!o.demo,user_id:o.user_id||null});}
   try{localStorage.setItem(storageKey(),JSON.stringify(rows));}catch{toast(t('تعذر حفظ العرض على هذا الجهاز.','Could not save the offer on this device.','Angebot konnte auf diesem Gerät nicht gespeichert werden.'));return;}
   if((user?.id||null)!==uid)return;
   card.querySelector('[data-save-offer]').outerHTML=savedButton(o);bind(card,o);
   if(index<0)record(o,'save');
  };
  card.querySelectorAll('[data-offer-contact]').forEach(a=>a.onclick=()=>{record(o,'contact');});
 }
 function guide(host){
  let seen=false;try{seen=localStorage.getItem('daraya-offers-guide-v1')==='yes';}catch{}if(seen)return;
  const section=document.createElement('aside');section.className='offer-first-guide';section.dataset.noTranslate='';section.innerHTML='<strong>'+t('↕ عروض المحل نفسه · ↔ محلات أخرى','↕ Same shop offers · ↔ Other shops','↕ Angebote dieses Geschäfts · ↔ Andere Geschäfte')+'</strong><p>'+t('انزل لمشاهدة بقية عروض المحل. اسحب جانبيًا أو استخدم أزرار المحلات للتغيير.','Scroll down for this shop’s other offers. Swipe sideways or use the shop buttons to change shops.','Scrolle für weitere Angebote dieses Geschäfts nach unten. Wische seitlich oder nutze die Tasten zum Geschäftswechsel.')+'</p><button type="button">'+t('فهمت','Got it','Verstanden')+'</button>';
  section.querySelector('button').onclick=()=>{try{localStorage.setItem('daraya-offers-guide-v1','yes');}catch{}section.remove();};host.before(section);
 }
 let savedGeneration=0;
 async function renderSaved(){
  const serial=++savedGeneration,uid=user?.id||null,key=storageKey(),rows=saved();communityPublicHeader();const app=document.querySelector('#app');app.classList.remove('professional-home');app.innerHTML='<section class="offers-saved-page" data-no-translate><a class="button outline" href="#offers">'+t('عودة لعروض اليوم','Back to today’s offers','Zurück zu den Angeboten')+'</a><h1>'+t('عروضي المحفوظة','My saved offers','Meine gemerkten Angebote')+'</h1>'+nav('saved')+'<p>'+t('محفوظة على هذا الجهاز والمتصفح. يظهر تنبيه عند انتهاء العرض أو سحبه.','Saved on this device and browser. Ended or removed offers show a notice.','Auf diesem Gerät und Browser gespeichert. Abgelaufene oder entfernte Angebote zeigen einen Hinweis.')+'</p><div data-saved-offers-list role="status">'+t('جاري التحقق…','Checking…','Wird geprüft…')+'</div></section>';
  const box=app.querySelector('[data-saved-offers-list]');if(!rows.length){box.textContent=t('لم تحفظ عروضًا بعد. اضغط ♡ بجانب أي عرض.','No saved offers yet. Tap ♡ on an offer.','Noch keine Angebote gemerkt. Tippe auf ♡.');return;}
  let live=[],failed=false;const ids=rows.filter(o=>uuid(o.id)).map(o=>o.id);
  try{if(ids.length){const r=await api.from('daily_offers').select('*').in('id',ids).eq('status','approved').gt('ends_at',new Date().toISOString());if(r.error)throw r.error;live=r.data;}live.push(...(window.DarayaDemoOfferCatalog?.()||[]));}catch{failed=true;}
  if(serial!==savedGeneration||!box.isConnected||key!==storageKey()||uid!==(user?.id||null))return;
  box.innerHTML=rows.filter(o=>!window.DarayaShopModeration?.isBlocked(o.store_id)&&!window.DarayaPublisherModeration?.isBlocked(o.user_id)).map(o=>{const active=live.find(x=>x.id===o.id&&window.DarayaReels.isPublic(x)),expired=Date.parse(o.ends_at)<=Date.now();return '<article class="panel offer-saved-card"><small>'+esc(o.shop_name)+'</small><h2>'+esc(o.title)+'</h2><p>'+ (active?t('عرض سارٍ','Active offer','Gültiges Angebot'):expired?t('انتهى العرض','Offer ended','Angebot abgelaufen'):failed?t('تعذر التحقق من حالة العرض؛ حاول مجددًا.','Could not check the offer. Try again.','Angebot konnte nicht geprüft werden. Versuche es erneut.'):t('سُحب العرض أو لم يعد متاحًا.','The offer was removed or is unavailable.','Das Angebot wurde entfernt oder ist nicht verfügbar.'))+'</p>'+(active?'<a class="button" href="#offers/'+esc(o.id)+'">'+t('عرض التفاصيل','View details','Details ansehen')+'</a>':'')+'<button type="button" class="outline" data-remove-saved-offer="'+esc(o.id)+'">'+t('إزالة من المحفوظات','Remove saved offer','Nicht mehr merken')+'</button></article>';}).join('');
  box.querySelectorAll('[data-remove-saved-offer]').forEach(b=>b.onclick=()=>{try{localStorage.setItem(storageKey(),JSON.stringify(saved().filter(o=>o.id!==b.dataset.removeSavedOffer)));renderSaved();}catch{toast(t('تعذرت الإزالة.','Could not remove.','Entfernen fehlgeschlagen.'));}});
 }
 async function ownerStats(host,rows){
  const uid=user?.id;if(!uid||!host.isConnected||!rows.length)return;
  const eligible=rows.filter(o=>o.user_id===uid||admin);if(!eligible.length)return;
  const ids=[...new Set(eligible.map(o=>o.store_id))];
  for(const id of ids){
   const section=document.createElement('section');section.className='panel offer-owner-stats';section.dataset.noTranslate='';const s=stores.find(s=>s.id===id);section.innerHTML='<h2>'+t('إحصاءات العروض: ','Offer stats: ','Angebotsstatistik: ')+esc(s?.name||'')+'</h2><p role="status">'+t('جارٍ تحميل إحصاءات آخر ٣٠ يومًا…','Loading stats for the last 30 days…','Statistik der letzten 30 Tage wird geladen…')+'</p>';host.before(section);
   try{const r=await api.rpc('daily_offer_stats',{p_store:id});if(user?.id!==uid||!section.isConnected)return;if(r.error)throw r.error;section.querySelector('[role=status]').remove();section.insertAdjacentHTML('beforeend','<p>'+t('مرة لكل جلسة متصفح وعرض ونوع نشاط في اليوم. هذه ليست عمليات شراء، والحفظ لا يعني عدد المحفوظات الحالية.','Once per browser session, offer and action type each day. These are not purchases. Saves are not the current saved total.','Einmal je Browsersitzung, Angebot und Aktivitätsart pro Tag. Keine Käufe. Speicherungen sind kein aktueller Merkbestand.')+'</p><div class="offer-stats-grid">'+[['views',t('مشاهدات العروض','Offer views','Angebotsansichten')],['saves',t('مرات حفظ العروض','Offer saves','Angebotsmerkungen')],['contacts',t('ضغطات التواصل والموقع','Contact and map taps','Kontakt- und Kartenklicks')]].map(([k,label])=>'<div><strong>'+Number(r.data?.[k]||0).toLocaleString(communityLang())+'</strong><span>'+label+'</span></div>').join('')+'</div>');if(Array.isArray(r.data?.offers)&&r.data.offers.length)section.insertAdjacentHTML('beforeend','<div class="offer-stats-table"><table><thead><tr><th>'+t('العرض','Offer','Angebot')+'</th><th>'+t('مشاهدة','Views','Ansichten')+'</th><th>'+t('حفظ','Saves','Merkungen')+'</th><th>'+t('تواصل / موقع','Contact / map','Kontakt / Karte')+'</th></tr></thead><tbody>'+r.data.offers.map(x=>'<tr><td>'+esc(eligible.find(o=>o.id===x.offer_id)?.title||t('عرض سابق','Past offer','Früheres Angebot'))+'</td><td>'+Number(x.views||0)+'</td><td>'+Number(x.saves||0)+'</td><td>'+Number(x.contacts||0)+'</td></tr>').join('')+'</tbody></table></div>');}catch{section.querySelector('[role=status]').textContent=t('إحصاءات العروض بانتظار تفعيل قاعدة البيانات، أو تعذر تحميلها. لا توجد أرقام مؤكدة لعرضها الآن.','Offer stats need database setup, or could not load. No confirmed counts are shown.','Angebotsstatistik benötigt die Datenbank-Einrichtung oder konnte nicht geladen werden. Keine bestätigten Zahlen verfügbar.');}
  }
 }
 window.DarayaOfferTools={savedButton,badges,savings,contactLinks,summary,record,bind,guide,renderSaved,ownerStats,dayKey,nav,countdownParts,countdownText,countdown,updateCountdown,availability,details};
 const baseRender=render;render=function(){if(location.hash==='#saved-offers')return renderSaved();return baseRender.apply(this,arguments);};
 window.addEventListener('hashchange',()=>{if(location.hash==='#saved-offers')renderSaved();});
})();
