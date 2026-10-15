'use strict';
(() => {
 const t=(ar,en,de)=>ct(ar,en,de);
 const defaults=['11:00','18:00','09:00','13:00','15:00','20:00'];
 const columns='enabled,times,timezone,updated_at';
 let lastSync=0,syncing=false,adminSerial=0;
 function normalize(raw){
  if(!raw||typeof raw.enabled!=='boolean'||raw.timezone!=='Asia/Damascus'||!Array.isArray(raw.times)||raw.times.length>6||raw.enabled&&!raw.times.length)throw Error(t('إعدادات التذكير غير صالحة.','Invalid reminder settings.','Ungültige Erinnerungseinstellungen.'));
  const times=raw.times.map(String);
  if(times.some(v=>!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(v))||new Set(times).size!==times.length)throw Error(t('اختر أوقاتًا صحيحة ومختلفة.','Choose valid, different times.','Wähle gültige, unterschiedliche Zeiten.'));
  return {enabled:raw.enabled,times:times.sort(),timezone:'Asia/Damascus',updated_at:raw.updated_at};
 }
 async function load(){
  if(typeof api==='undefined'||!api)throw Error(t('انتظر الاتصال وأعد المحاولة.','Wait for a connection and try again.','Warte auf die Verbindung und versuche es erneut.'));
  const r=await api.from('offer_reminder_settings').select(columns).eq('id',true).single();
  if(r.error)throw r.error;
  return normalize(r.data);
 }
 function bridge(body){
  if(typeof window.DarayaOfferReminders?.postMessage!=='function')return false;
  window.DarayaOfferReminders.postMessage(JSON.stringify(body));return true;
 }
 async function sync(force=false){
  if(!window.DarayaOfferReminders||typeof api==='undefined'||!api||syncing||!force&&Date.now()-lastSync<60000)return;
  syncing=true;
  try { const config=await load();bridge({action:'sync',config});lastSync=Date.now(); }
  catch(_) { /* Keep the last valid device schedule. Never invent a successful sync. */ }
  finally {syncing=false;}
 }
 function attach(){
  const page=document.querySelector('.offers-reels-page');
  if(!page||!window.DarayaOfferReminders||page.querySelector('[data-offer-reminder-settings]'))return;
  const button=document.createElement('button');button.type='button';button.className='outline offer-reminder-settings';button.dataset.offerReminderSettings='';button.dataset.noTranslate='';
  button.textContent=t('🔔 تذكير بعروض اليوم','🔔 Offer reminders','🔔 Angebotserinnerungen');
  button.onclick=async()=>{button.disabled=true;try{await sync(true);bridge({action:'settings'});}finally{if(button.isConnected)button.disabled=false;}};
  page.querySelector('.reels-hint')?.after(button);sync();
 }
 async function renderAdmin(host){
  if(!admin||!user)return;
  const serial=++adminSerial,uid=user.id;
  host.innerHTML='<section class="panel offer-reminder-admin" data-no-translate><h2>'+t('إشعارات عروض اليوم','Offer reminder settings','Angebotserinnerungen')+'</h2><p>'+t('حدد عدد التذكيرات اليومية وأوقاتها بتوقيت داريا. نص الإشعار: «شاهد عروض اليوم».','Choose the daily reminder count and times in Daraya time. Message: “شاهد عروض اليوم”.','Anzahl und Uhrzeiten der täglichen Erinnerungen in Daraya-Zeit. Text: „شاهد عروض اليوم“.')+'</p><p class="field-hint">'+t('تصل التغييرات عند فتح تطبيق أندرويد واتصاله بالإنترنت، وليست إرسالًا فوريًا إلى التطبيقات المغلقة. يحتاج المستخدم إلى النسخة 1.4.7 أو أحدث والموافقة على الإشعارات. الأوقات تقريبية وقد يتأخر الإشعار بسبب قيود أندرويد وتوفير البطارية. يتوقف التذكير بعد أسبوع دون مزامنة حتى فتح التطبيق مجددًا.','Changes sync when the Android app opens online. This does not send an instant message to closed apps. Users need version 1.4.7 or later and must allow notifications. Times are approximate. Android and battery saving may delay reminders. Reminders pause after a week without syncing until the app opens again.','Änderungen werden beim Öffnen der Android-App mit Internet synchronisiert. Kein Sofortversand an geschlossene Apps. Version 1.4.7 oder neuer und Zustimmung erforderlich. Uhrzeiten sind ungefähr. Android und Energiesparen können Erinnerungen verzögern. Nach einer Woche ohne Synchronisierung pausieren Erinnerungen bis zum erneuten Öffnen.')+'</p><form data-reminder-form><label>'+t('عدد الإشعارات يوميًا','Reminders per day','Erinnerungen pro Tag')+'<select name="count">'+Array.from({length:7},(_,n)=>'<option value="'+n+'">'+(n?n:t('٠ — إيقاف التذكيرات','0 — Turn off reminders','0 — Erinnerungen aus'))+'</option>').join('')+'</select></label><div class="offer-reminder-times" data-reminder-times></div><div class="form-actions"><button type="submit" disabled>'+t('حفظ الإعدادات','Save settings','Einstellungen speichern')+'</button><button type="button" class="outline" data-reminder-reload>'+t('إعادة التحميل','Reload','Neu laden')+'</button></div><p role="status" data-reminder-status>'+t('جاري تحميل الإعدادات…','Loading settings…','Einstellungen werden geladen…')+'</p></form><p data-reminder-setup hidden>'+t('يحتاج حفظ الإعدادات إلى تشغيل ملف تجهيز قاعدة البيانات مرة واحدة في Supabase.','Saving needs the database setup script to be run once in Supabase.','Zum Speichern muss das Datenbank-Skript einmal in Supabase ausgeführt werden.')+' <a href="https://github.com/abdallrahimbirekdar-rgb/beep-beep-daraya/blob/main/supabase/migrations/20261015_offer_reminder_settings.sql" target="_blank" rel="noopener noreferrer">'+t('فتح ملف التجهيز','Open setup script','Einrichtungsskript öffnen')+'</a></p></section>';
  const form=host.querySelector('[data-reminder-form]'),count=form.elements.count,status=form.querySelector('[data-reminder-status]'),save=form.querySelector('[type=submit]'),timesBox=form.querySelector('[data-reminder-times]');
  const alive=()=>serial===adminSerial&&host.isConnected&&form.isConnected&&admin&&user?.id===uid;
  let ready=false,times=[...defaults];
  function fields(){
   timesBox.querySelectorAll('input').forEach((input,i)=>times[i]=input.value);
   timesBox.innerHTML=Array.from({length:Number(count.value)},(_,i)=>'<label>'+t('الإشعار ','Reminder ','Erinnerung ')+(i+1)+'<input type="time" required value="'+esc(times[i]||defaults[i])+'"></label>').join('');
  }
  count.onchange=fields;
  async function refresh(){
   ready=false;save.disabled=true;
   status.textContent=t('جاري تحميل الإعدادات…','Loading settings…','Einstellungen werden geladen…');
   try {
    const config=await load();if(!alive())return;
    times=[...config.times,...defaults.filter(v=>!config.times.includes(v))];count.value=String(config.enabled?config.times.length:0);timesBox.replaceChildren();fields();ready=true;save.disabled=false;host.querySelector('[data-reminder-setup]').hidden=true;
    status.textContent=t('الإعدادات الحالية محمّلة. الأوقات بتوقيت داريا.','Current settings loaded. Times use Daraya time.','Aktuelle Einstellungen geladen. Uhrzeiten gelten für Daraya.');
   } catch(e){if(!alive())return;status.textContent=t('تعذر تحميل الإعدادات. تحقق من الاتصال وتجهيز قاعدة البيانات.','Could not load settings. Check the connection and database setup.','Einstellungen konnten nicht geladen werden. Verbindung und Datenbank-Einrichtung prüfen.');host.querySelector('[data-reminder-setup]').hidden=false;}
  }
  form.querySelector('[data-reminder-reload]').onclick=refresh;
  form.onsubmit=async e=>{
   e.preventDefault();if(!ready||!alive())return;
   save.disabled=true;status.textContent=t('جاري الحفظ…','Saving…','Wird gespeichert…');
   try {
    const selected=[...timesBox.querySelectorAll('input')].map(input=>input.value);
    const config=normalize({enabled:selected.length>0,times:selected,timezone:'Asia/Damascus'});
    const r=await api.from('offer_reminder_settings').update({enabled:config.enabled,times:config.times}).eq('id',true).select(columns).single();
    if(r.error)throw r.error;
    normalize(r.data);if(!alive())return;
    status.textContent=t('تم حفظ العدد والأوقات. تتحدث على الأجهزة عند فتح التطبيق واتصاله بالإنترنت.','Count and times saved. Devices update when the app opens online.','Anzahl und Zeiten gespeichert. Geräte übernehmen sie beim Öffnen der App mit Internet.');sync(true);
   } catch(e){if(alive())status.textContent=t('لم تُحفظ الإعدادات: ','Settings were not saved: ','Einstellungen nicht gespeichert: ')+String(e.message||e);}
   finally{if(alive())save.disabled=false;}
  };
  await refresh();
 }
 const previousDashboard=renderDashboard;
 renderDashboard=function(tab){
  const result=previousDashboard.apply(this,arguments);
  if(admin&&user&&tab==='offer-reminders'){
   const content=document.querySelector('#dashboard-content');if(content)renderAdmin(content);
  }
  return result;
 };
 window.DarayaReminderSettings={normalize,renderAdmin,sync};
 let frame=0;
 const queue=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;attach();sync();});};
 new MutationObserver(queue).observe(document.querySelector('#app'),{childList:true,subtree:true});
 window.addEventListener('daraya-app-resume',()=>{sync(true);queue();});
 window.addEventListener('online',()=>sync(true));
 window.addEventListener('hashchange',queue);
 queue();sync();
})();
