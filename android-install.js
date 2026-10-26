'use strict';
(() => {
 const button=document.querySelector('#android-app-button');
 if(!button)return;
 const play='https://play.google.com/store/apps/details?id=com.souqdaraya.app';
 const apk='https://github.com/abdallrahimbirekdar-rgb/beep-beep-daraya/releases/download/android-v1.3.0/souq-daraya.apk?v=140';
 const installed=()=>/ShahinAndroid\//.test(navigator.userAgent)||navigator.standalone===true||window.matchMedia('(display-mode: standalone)').matches;
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const copy={
 ar:{button:'تطبيق أندرويد',title:'سوق داريا على أندرويد',intro:'متاجر مدينتك وخدماتها، أقرب إليك.',play:'حمّل التطبيق من Google Play',playNote:'متاح الآن على متجر Google Play.',download:'حمّل النسخة من الموقع',file:'الإصدار 1.4.12 · ملف APK لأجهزة Android 7 أو أحدث',steps:'تعليمات تثبيت نسخة الموقع APK',one:'نزّل الملف، ثم افتحه من قائمة التنزيلات.',two:'إذا طلب هاتفك الإذن، افتح الإعدادات وفعّل «السماح من هذا المصدر» للمتصفح الذي استخدمته، أو «تثبيت تطبيقات من مصادر غير معروفة» بحسب جهازك.',three:'ارجع إلى الملف واضغط «تثبيت». يمكنك إيقاف السماح من هذا المصدر بعد التثبيت.',note:'تختلف أسماء الإعدادات حسب الهاتف. التطبيق يحتاج اتصالًا بالإنترنت.',close:'إغلاق',ios:'هذه النسخة مخصصة لأندرويد. افتح الموقع من هاتف أندرويد لتنزيلها.'},
 en:{button:'Android app',title:'Daraya on Android',intro:'Your city’s shops and services, closer to you.',play:'Get it on Google Play',playNote:'Now available on Google Play.',download:'Download from our website',file:'Version 1.4.12 · APK for Android 7 or later',steps:'How to install the website APK',one:'Download the file, then open it from Downloads.',two:'If your phone asks, open Settings and allow “Install unknown apps” or “Allow from this source” for the browser you used.',three:'Return to the file and tap Install. You can turn this permission off after installation.',note:'Setting names vary by phone. The app needs an internet connection.',close:'Close',ios:'This version is for Android. Open the website on an Android phone to download it.'},
 de:{button:'Android-App',title:'Daraya auf Android',intro:'Die Geschäfte und Angebote deiner Stadt, näher bei dir.',play:'Bei Google Play herunterladen',playNote:'Jetzt bei Google Play verfügbar.',download:'Von unserer Website herunterladen',file:'Version 1.4.12 · APK für Android 7 oder neuer',steps:'So installierst du die APK von der Website',one:'Lade die Datei herunter und öffne sie unter Downloads.',two:'Falls dein Handy fragt, öffne die Einstellungen und erlaube „Unbekannte Apps installieren“ oder „Aus dieser Quelle zulassen“ für den verwendeten Browser.',three:'Öffne die Datei erneut und tippe auf Installieren. Danach kannst du diese Erlaubnis wieder ausschalten.',note:'Die Namen der Einstellungen unterscheiden sich je nach Handy. Die App braucht eine Internetverbindung.',close:'Schließen',ios:'Diese Version ist für Android. Öffne die Website auf einem Android-Handy zum Herunterladen.'}
 };
 const words=()=>copy[window.ShahinI18n?.language||document.documentElement.lang]||copy.ar;
 const dialog=document.createElement('dialog');
 dialog.id='android-install-dialog';dialog.setAttribute('aria-labelledby','android-install-title');dialog.setAttribute('data-no-translate','');
 document.body.append(dialog);
 let lastDownload=0,renderedLanguage=null;
 function render(){
  const language=window.ShahinI18n?.language||document.documentElement.lang||'ar';
  if(renderedLanguage===language)return;
  renderedLanguage=language;
  const t=words();button.querySelector('[data-app-button-label]').textContent=t.button;button.setAttribute('aria-label',t.button);
  dialog.dir=(window.ShahinI18n?.language||document.documentElement.lang||'ar')==='ar'?'rtl':'ltr';
  dialog.innerHTML='<button type="button" class="android-install-close" aria-label="'+t.close+'">×</button><img class="android-install-logo" src="daraya-mark-gold.webp?v=gold-logo-36" width="60" height="60" alt=""><h2 id="android-install-title">'+t.title+'</h2><p class="android-install-intro">'+t.intro+'</p><a class="android-play-link" href="'+play+'" target="_blank" rel="noopener noreferrer"><svg class="android-play-logo" viewBox="0 0 24 26" width="32" height="35" aria-hidden="true" focusable="false"><path fill="#32BBFF" d="M1 1 13 13 1 25Z"/><path fill="#00D26A" d="M1 1 16 9.5 13 13Z"/><path fill="#FFBC00" d="m16 9.5 6 3.5-6 3.5-3-3.5Z"/><path fill="#FF3948" d="M1 25 13 13l3 3.5Z"/></svg><div><strong>'+t.play+'</strong><small>'+t.playNote+'</small></div></a><a class="android-apk-link" href="'+apk+'" target="_blank" rel="noopener noreferrer" download="souq-daraya.apk"><span aria-hidden="true">↓</span><span><strong>'+t.download+'</strong><small>'+t.file+'</small></span></a>'+(ios?'<p class="android-install-note-inline">'+t.ios+'</p>':'')+'<details class="android-install-steps"><summary>'+t.steps+'</summary><ol><li>'+t.one+'</li><li>'+t.two+'</li><li>'+t.three+'</li></ol><p>'+t.note+'</p></details>';
  dialog.querySelector('.android-install-close').onclick=()=>dialog.close();
  dialog.querySelector('.android-apk-link').onclick=()=>{
   // Count requests only. Never gate navigation on analytics or collect identifiers.
   if(installed()||Date.now()-lastDownload<3000)return;
   lastDownload=Date.now();
   try{if(typeof api!=='undefined'&&api)Promise.resolve(api.rpc('record_android_download')).catch(()=>{});}catch(_){}
  };
 }
 function sync(){button.hidden=installed();if(button.hidden&&dialog.open)dialog.close();render();}
 button.onclick=()=>{if(installed())return;render();dialog.showModal();};
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 dialog.addEventListener('close',()=>{if(!button.hidden)button.focus();});
 window.addEventListener('pageshow',sync);
 window.matchMedia('(display-mode: standalone)').addEventListener('change',sync);
 new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 sync();
})();

(() => {
 let request=0;
 const fmt=n=>Math.max(0,Number(n)||0).toLocaleString(document.documentElement.lang||'ar');
 async function loadHost(panel,alive){
  const count=panel.querySelector('[data-host-download-count]'),status=panel.querySelector('[data-host-download-status]');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  count.textContent='—';count.setAttribute('aria-busy','true');status.textContent='جاري جلب العدد من GitHub…';
  try{
   const response=await fetch('https://api.github.com/repos/abdallrahimbirekdar-rgb/beep-beep-daraya/releases/tags/android-v1.3.0',{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer',headers:{Accept:'application/vnd.github+json'}});
   if(!response.ok)throw Error('unavailable');
   const data=await response.json(),asset=Array.isArray(data.assets)?data.assets.find(a=>a.name==='souq-daraya.apk'&&a.state==='uploaded'):null;
   if(!asset||!Number.isSafeInteger(asset.download_count)||asset.download_count<0)throw Error('invalid counter');
   if(!alive())return;
   count.textContent=fmt(asset.download_count);
   status.textContent='المصدر: GitHub · آخر جلب: '+new Date().toLocaleTimeString(document.documentElement.lang||'ar',{hour:'2-digit',minute:'2-digit'});
  }catch{if(alive())status.textContent='تعذر جلب عدد المستضيف مؤقتًا؛ قد يكون الاتصال أو حد الطلبات. اضغط تحديث العدد للمحاولة مجددًا.';}
  finally{clearTimeout(timer);if(alive())count.removeAttribute('aria-busy');}
 }

 async function load(){
  const panel=document.querySelector('#android-download-stats');
  if(!panel||typeof admin==='undefined'||!admin||typeof user==='undefined'||!user)return;
  const ticket=++request,uid=user.id,status=panel.querySelector('[data-download-status]'),values=panel.querySelector('[data-download-values]');
  status.textContent='جاري تحميل الإحصاءات…';values.setAttribute('aria-busy','true');
  const alive=()=>ticket===request&&admin&&user?.id===uid&&panel.isConnected&&location.hash==='#dashboard/statistics';
  loadHost(panel,alive);
  try{
   const r=await api.rpc('admin_android_download_stats');
   if(!alive())return;
   if(r.error||!r.data)throw Error('unavailable');
   values.innerHTML=[['total','الإجمالي منذ بدء العدّ'],['today','اليوم'],['week','آخر ٧ أيام'],['month','آخر ٣٠ يومًا']].map(([key,title])=>'<article class="visitor-metric"><span>'+title+'</span><strong>'+fmt(r.data[key])+'</strong></article>').join('');
   status.textContent=r.data.started?'تبدأ الأرقام من أول طلب تحميل مسجّل · بتوقيت داريا.':'لم تُسجّل طلبات تحميل بعد. يبدأ العدّ من تفعيل هذه الميزة.';
  }catch{if(alive())status.textContent='تعذر تحميل العدد. اضغط تحديث للمحاولة مجددًا.';}
  finally{if(alive())values.removeAttribute('aria-busy');}
 }
 function sync(){
  if(typeof admin==='undefined'||!admin||typeof user==='undefined'||!user||location.hash!=='#dashboard/statistics')return;
  const app=document.querySelector('#app'),content=app?.querySelector('#dashboard-content');
  if(!content||app.dataset.dashboardRoute!==location.hash||document.querySelector('.merchant-layout')||content.querySelector('#android-download-stats'))return;
  content.insertAdjacentHTML('beforeend','<section class="panel visitor-dashboard" id="android-download-stats" data-no-translate><div class="visitor-dashboard-heading"><div><h2>تحميل تطبيق أندرويد</h2><p>طلبات التنزيل من الموقع وإحصائية الملف عند المستضيف.</p></div><button type="button" class="outline" data-refresh-downloads>تحديث العدد</button></div><section class="visitor-report-panel"><h3>تنزيلات ملف التطبيق عند المستضيف</h3><div class="visitor-metrics"><article class="visitor-metric"><span>التنزيلات المسجّلة للملف الحالي</span><strong data-host-download-count>—</strong><small>إحصائية مستقلة من GitHub</small></article></div><p data-host-download-status role="status"></p><small class="muted">يشمل التنزيل من الموقع والرابط المباشر، والتكرار والاختبارات. لا يثبت اكتمال كل تنزيل أو تثبيت التطبيق، ولا يمثل أشخاصًا مختلفين. العدد خاص بملف APK الحالي؛ قد يبدأ من جديد عند استبدال ملف الإصدار. لا يشمل Google Play.</small></section><h3>طلبات التحميل من الموقع</h3><div class="visitor-metrics" data-download-values></div><p role="status" data-download-status></p><small class="muted">هذه طلبات بدء تنزيل، وليست تأكيدًا لاكتمال التحميل أو تثبيت التطبيق، ولا تمثل أشخاصًا مختلفين. لا تشمل التنزيل من Google Play أو الروابط الخارجية المباشرة. قد تتأثر بالتكرار أو حظر الاتصال أو الزيارات الآلية. ضغطات حسابات الإدارة مستبعدة. نحفظ مجموعًا يوميًا فقط دون هوية من قام بالتحميل.</small></section>');
  content.querySelector('[data-refresh-downloads]').onclick=load;load();
 }
 new MutationObserver(sync).observe(document.querySelector('#app'),{childList:true});
 window.addEventListener('hashchange',()=>queueMicrotask(sync));sync();
})();
