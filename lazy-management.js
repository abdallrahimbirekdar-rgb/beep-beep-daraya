'use strict';
// Public browsing never downloads management-only tools. No polling or background preload.
(() => {
 const descriptors=[...document.querySelectorAll('script[data-feature="management"][data-src]')];
 if(!descriptors.length)return;
 const sources=descriptors.map(node=>new URL(node.dataset.src,document.baseURI).href);
 const loaded=new Set();let pending=null,ready=false,epoch=0;
 const management=()=>/^#(?:dashboard(?:\/|$)|facebook-studio(?:\/|$)|account-deletion-admin(?:\/|$))/.test(location.hash);
 const t=(ar,en,de)=>({ar,en,de}[window.ShahinI18n?.language||'ar']||ar);
 function script(url){return new Promise((resolve,reject)=>{
  if(loaded.has(url)){resolve();return;}
  const node=document.createElement('script');node.src=url;node.async=false;
  node.onload=()=>{loaded.add(url);resolve();};node.onerror=()=>{node.remove();reject(new Error('Feature download failed'));};
  document.head.append(node);
 });}
 function ensure(){
  if(ready)return Promise.resolve();
  if(!pending)pending=(async()=>{await Promise.all([window.ShahinI18n?.prepareTranslations?.(),(async()=>{for(const url of sources)await script(url);})()]);ready=true;})().finally(()=>{pending=null;});
  return pending;
 }
 function wait(){
  const root=document.getElementById('app'),route=location.hash,request=++epoch;
  if(root&&!root.querySelector('[data-management-loading]')){
   root.innerHTML='<section class="panel" role="status" data-management-loading data-no-translate></section>';
   root.firstElementChild.textContent=t('جاري تحميل أدوات لوحة التحكم…','Loading dashboard tools…','Verwaltungswerkzeuge werden geladen…');
  }
  ensure().then(()=>{if(request===epoch&&route===location.hash)render();}).catch(()=>{
   if(request!==epoch||route!==location.hash||!root)return;
   root.innerHTML='<section class="panel" role="status" data-no-translate><p></p><button type="button"></button></section>';
   root.querySelector('p').textContent=t('تعذر تحميل الأدوات. تحقق من الاتصال وحاول مجددًا.','Could not load tools. Check your connection and try again.','Werkzeuge konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut.');
   const button=root.querySelector('button');button.textContent=t('إعادة المحاولة','Try again','Erneut versuchen');button.onclick=wait;
  });
 }
 const previous=render;render=function(){if(!ready&&management())return wait();epoch++;return previous.apply(this,arguments);};
 const dashboard=renderDashboard;renderDashboard=function(){if(!ready&&management())return wait();return dashboard.apply(this,arguments);};
 window.addEventListener('hashchange',()=>{if(!ready&&management())wait();});
 window.DarayaManagement={ensure,get ready(){return ready;}};
})();
