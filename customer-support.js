'use strict';
(() => {
 const t=(ar,en,de)=>({ar,en,de}[window.ShahinI18n?.language||'ar']||ar);
 function report(){
  const route=location.hash.split('?')[0];
  modal(`<section data-no-translate><h2>${t('الإبلاغ عن مشكلة','Report a problem','Problem melden')}</h2><p>${t('صف ما حدث وما توقعت أن يحدث. لا ترسل كلمة المرور أو رمز الدخول أو عنوانك الشخصي.','Describe what happened and what you expected. Do not include passwords, login codes or your home address.','Beschreibe das Problem und das erwartete Ergebnis. Sende keine Passwörter, Anmeldecodes oder Privatadressen.')}</p><form id="support-report"><label>${t('تفاصيل المشكلة','Problem details','Beschreibung')}<textarea name="details" required maxlength="1500"></textarea></label><button type="submit">${t('فتح البريد لإرسال البلاغ','Open email to send report','E-Mail zum Senden öffnen')}</button><p>${t('يفتح تطبيق بريدك؛ اضغط إرسال فيه ليصل البلاغ. إذا لم يفتح، راسل info@damascus-shop.com مباشرة.','Your email app opens; press Send there. If it does not open, email info@damascus-shop.com directly.','Dein E-Mail-Programm öffnet sich; sende dort die Nachricht. Falls es nicht öffnet, schreibe direkt an info@damascus-shop.com.')}</p></form></section>`);
  document.querySelector('#support-report').onsubmit=e=>{e.preventDefault();const note=new FormData(e.target).get('details');location.href='mailto:info@damascus-shop.com?subject='+encodeURIComponent('سوق داريا الإلكتروني — مشكلة في التطبيق')+'&body='+encodeURIComponent(String(note)+'\n\nPage: '+route+'\nApp: '+(/DarayaVersion\/(\d+)/.exec(navigator.userAgent)?.[1]||'Web'));};
 }
 const checkoutBase=checkout;
 checkout=function(s){if(s?.is_example){toast(t('هذا متجر تجريبي للتوضيح، ولا يستقبل طلبات حقيقية.','This is a sample shop and does not accept real orders.','Dies ist ein Beispielgeschäft und nimmt keine echten Bestellungen an.'));return;}return checkoutBase.apply(this,arguments);};
 function enhance(){
  const menu=document.querySelector('#site-menu');
  if(menu&&!menu.querySelector('[data-support-links]')){const box=document.createElement('div');box.dataset.supportLinks='';box.innerHTML='<button type="button" data-report-app></button><a href="privacy.html" data-privacy-link></a><a href="delete-account.html" data-delete-link></a>';menu.append(box);box.querySelector('button').onclick=report;}
  const account=document.querySelector('.customer-account');
  if(account&&!account.querySelector('[data-account-help]')){const box=document.createElement('div');box.className='panel';box.dataset.accountHelp='';box.innerHTML='<a href="privacy.html" data-privacy-link></a> · <a href="delete-account.html" data-delete-link></a> · <button type="button" class="outline" data-report-app></button>';account.append(box);box.querySelector('button').onclick=report;}
  const values={'[data-report-app]':t('الإبلاغ عن مشكلة','Report a problem','Problem melden'),'[data-privacy-link]':t('سياسة الخصوصية','Privacy policy','Datenschutzerklärung'),'[data-delete-link]':t('طلب حذف الحساب','Request account deletion','Kontolöschung beantragen')};
  for(const [selector,value] of Object.entries(values))document.querySelectorAll(selector).forEach(n=>{n.dataset.noTranslate='';if(n.textContent!==value)n.textContent=value;});
 }
 let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance();});};
 new MutationObserver(schedule).observe(document.querySelector('#app'),{childList:true,subtree:true});
 new MutationObserver(schedule).observe(document.querySelector('#site-menu'),{childList:true,subtree:true});
 window.addEventListener('languagechange',schedule);enhance();
 const banner=document.createElement('aside');banner.className='connection-status';banner.setAttribute('role','status');banner.dataset.noTranslate='';banner.hidden=true;document.querySelector('#app').before(banner);
 function connection(){banner.hidden=navigator.onLine;banner.innerHTML='';if(navigator.onLine)return;const text=document.createElement('span');text.textContent=t('لا يوجد اتصال بالإنترنت. بيانات المتاجر قد لا تكون محدثة؛ تحقق من اتصالك ثم أعد المحاولة.','You are offline. Shop details may be out of date. Check your connection and try again.','Keine Internetverbindung. Geschäftsangaben sind möglicherweise veraltet. Prüfe deine Verbindung und versuche es erneut.');const button=document.createElement('button');button.textContent=t('إعادة المحاولة','Try again','Erneut versuchen');button.onclick=()=>{if(navigator.onLine){connection();if(document.querySelector('#app .loading'))location.reload();else toast(t('عاد الاتصال. يمكنك المتابعة.','You are online again.','Du bist wieder online.'));}else connection();};banner.append(text,button);}
 window.addEventListener('offline',connection);window.addEventListener('online',connection);connection();
})();
