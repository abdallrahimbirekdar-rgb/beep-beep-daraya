'use strict';
(() => {
 const button=document.querySelector('#android-app-button');
 if(!button)return;
 const apk='https://github.com/abdallrahimbirekdar-rgb/beep-beep-daraya/releases/download/android-v1.3.0/souq-daraya.apk';
 const installed=()=>/ShahinAndroid\//.test(navigator.userAgent)||navigator.standalone===true||window.matchMedia('(display-mode: standalone)').matches;
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const copy={
 ar:{button:'تطبيق أندرويد',title:'سوق داريا على أندرويد',intro:'متاجر مدينتك وخدماتها، أقرب إليك.',soon:'قريبًا على Google Play',soonNote:'ستتوفر نسخة المتجر هنا عند إطلاقها.',download:'حمّل النسخة من الموقع',file:'ملف APK لأجهزة Android 7 أو أحدث',steps:'كيف تثبّت التطبيق؟',one:'نزّل الملف، ثم افتحه من قائمة التنزيلات.',two:'إذا طلب هاتفك الإذن، افتح الإعدادات وفعّل «السماح من هذا المصدر» للمتصفح الذي استخدمته، أو «تثبيت تطبيقات من مصادر غير معروفة» بحسب جهازك.',three:'ارجع إلى الملف واضغط «تثبيت». يمكنك إيقاف السماح من هذا المصدر بعد التثبيت.',note:'تختلف أسماء الإعدادات حسب الهاتف. التطبيق يحتاج اتصالًا بالإنترنت.',close:'إغلاق',ios:'هذه النسخة مخصصة لأندرويد. افتح الموقع من هاتف أندرويد لتنزيلها.'},
 en:{button:'Android app',title:'Daraya on Android',intro:'Your city’s shops and services, closer to you.',soon:'Coming soon on Google Play',soonNote:'The store version will be linked here when it launches.',download:'Download from our website',file:'APK file for Android 7 or later',steps:'How to install',one:'Download the file, then open it from Downloads.',two:'If your phone asks, open Settings and allow “Install unknown apps” or “Allow from this source” for the browser you used.',three:'Return to the file and tap Install. You can turn this permission off after installation.',note:'Setting names vary by phone. The app needs an internet connection.',close:'Close',ios:'This version is for Android. Open the website on an Android phone to download it.'},
 de:{button:'Android-App',title:'Daraya auf Android',intro:'Die Geschäfte und Angebote deiner Stadt, näher bei dir.',soon:'Bald bei Google Play',soonNote:'Zum Start findest du hier den Link zur Store-Version.',download:'Von unserer Website herunterladen',file:'APK-Datei für Android 7 oder neuer',steps:'So installierst du die App',one:'Lade die Datei herunter und öffne sie unter Downloads.',two:'Falls dein Handy fragt, öffne die Einstellungen und erlaube „Unbekannte Apps installieren“ oder „Aus dieser Quelle zulassen“ für den verwendeten Browser.',three:'Öffne die Datei erneut und tippe auf Installieren. Danach kannst du diese Erlaubnis wieder ausschalten.',note:'Die Namen der Einstellungen unterscheiden sich je nach Handy. Die App braucht eine Internetverbindung.',close:'Schließen',ios:'Diese Version ist für Android. Öffne die Website auf einem Android-Handy zum Herunterladen.'}
 };
 const words=()=>copy[window.ShahinI18n?.language||document.documentElement.lang]||copy.ar;
 const dialog=document.createElement('dialog');
 dialog.id='android-install-dialog';dialog.setAttribute('aria-labelledby','android-install-title');dialog.setAttribute('data-no-translate','');
 document.body.append(dialog);
 let lastDownload=0;
 function render(){
  const t=words();button.querySelector('[data-app-button-label]').textContent=t.button;button.setAttribute('aria-label',t.button);
  dialog.dir=(window.ShahinI18n?.language||document.documentElement.lang||'ar')==='ar'?'rtl':'ltr';
  dialog.innerHTML='<button type="button" class="android-install-close" aria-label="'+t.close+'">×</button><img class="android-install-logo" src="daraya-mark-gold.webp?v=gold-logo-36" width="60" height="60" alt=""><h2 id="android-install-title">'+t.title+'</h2><p class="android-install-intro">'+t.intro+'</p><div class="android-play-soon" aria-disabled="true"><span aria-hidden="true">▷</span><div><strong>'+t.soon+'</strong><small>'+t.soonNote+'</small></div></div><a class="android-apk-link" href="'+apk+'" target="_blank" rel="noopener noreferrer" download="souq-daraya.apk"><span aria-hidden="true">↓</span><span><strong>'+t.download+'</strong><small>'+t.file+'</small></span></a>'+(ios?'<p class="android-install-note-inline">'+t.ios+'</p>':'')+'<section class="android-install-steps"><h3>'+t.steps+'</h3><ol><li>'+t.one+'</li><li>'+t.two+'</li><li>'+t.three+'</li></ol><p>'+t.note+'</p></section>';
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
 async function load(){
  const panel=document.querySelector('#android-download-stats');
  if(!panel||typeof admin==='undefined'||!admin||typeof user==='undefined'||!user)return;
  const ticket=++request,uid=user.id,status=panel.querySelector('[data-download-status]'),values=panel.querySelector('[data-download-values]');
  status.textContent='جاري تحميل الإحصاءات…';values.setAttribute('aria-busy','true');
  const alive=()=>ticket===request&&admin&&user?.id===uid&&panel.isConnected&&location.hash==='#dashboard/statistics';
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
  content.insertAdjacentHTML('beforeend','<section class="panel visitor-dashboard" id="android-download-stats" data-no-translate><div class="visitor-dashboard-heading"><div><h2>طلبات تحميل تطبيق أندرويد من الموقع</h2><p>عدد الضغطات لبدء تنزيل ملف APK من زر الموقع.</p></div><button type="button" class="outline" data-refresh-downloads>تحديث العدد</button></div><div class="visitor-metrics" data-download-values></div><p role="status" data-download-status></p><small class="muted">هذه طلبات بدء تنزيل، وليست تأكيدًا لاكتمال التحميل أو تثبيت التطبيق، ولا تمثل أشخاصًا مختلفين. لا تشمل التنزيل من Google Play أو الروابط الخارجية المباشرة. قد تتأثر بالتكرار أو حظر الاتصال أو الزيارات الآلية. ضغطات حسابات الإدارة مستبعدة. نحفظ مجموعًا يوميًا فقط دون هوية من قام بالتحميل.</small></section>');
  content.querySelector('[data-refresh-downloads]').onclick=load;load();
 }
 new MutationObserver(sync).observe(document.querySelector('#app'),{childList:true});
 window.addEventListener('hashchange',()=>queueMicrotask(sync));sync();
})();
