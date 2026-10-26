'use strict';
(() => {
  const nativeApp=/ShahinAndroid\//.test(navigator.userAgent);
  if(nativeApp)document.querySelectorAll('[data-android-download]').forEach(el=>{el.hidden=true;});
  const signature=doc=>Array.from(doc.querySelectorAll('script[defer][src],script[data-feature][data-src],link[rel="stylesheet"]'))
    .map(el=>el.getAttribute('src')||el.getAttribute('data-src')||el.getAttribute('href')).join('|');
  const current=signature(document);
  let lastCheck=0,checking=false,pending=false,dirty=false,reloading=false;
  document.addEventListener('input',e=>{if(e.target.id!=='search')dirty=true;},true);
  function safeToReload(){
    return !document.hidden&&!dirty&&!document.querySelector('dialog[open]')&&
      !/^#(dashboard|cart|checkout|account|driver)/.test(location.hash);
  }
  function applyUpdate(){
    if(!pending||reloading||!safeToReload())return;
    reloading=true;
    const url=new URL(location.href);
    url.searchParams.delete('app-check');
    url.searchParams.set('app-refresh',Date.now().toString());
    location.replace(url.href);
  }
  async function checkUpdate(){
    applyUpdate();
    if(document.hidden||checking||Date.now()-lastCheck<60000)return;
    checking=true;lastCheck=Date.now();
    try{
      const url=new URL('./',location.href);
      url.searchParams.set('app-check',lastCheck.toString());
      const response=await fetch(url.href,{cache:'no-store'});
      if(!response.ok)return;
      const latest=new DOMParser().parseFromString(await response.text(),'text/html');
      if(!latest.querySelector('#app')||!latest.querySelector('script[src]'))return;
      if(signature(latest)!==current){pending=true;applyUpdate();}
    }catch(_){}
    finally{checking=false;}
  }
  document.addEventListener('visibilitychange',checkUpdate);
  window.addEventListener('online',checkUpdate);
  window.addEventListener('daraya-app-resume',checkUpdate);
  window.addEventListener('hashchange',()=>{dirty=false;setTimeout(checkUpdate,500);});
  setInterval(checkUpdate,60000);
  checkUpdate();
})();

(() => {
  if(!/ShahinAndroid\//.test(navigator.userAgent))return;
  const installed=Number(navigator.userAgent.match(/DarayaVersion\/(\d+)/)?.[1]);
  // Unknown versions cannot establish that an update is needed.
  if(!Number.isSafeInteger(installed)||installed<1){document.querySelector('#apk-update-notice')?.remove();return;}
  let checking=false,lastCheck=0;
  async function checkPlay(){
    if(document.hidden||checking||Date.now()-lastCheck<21600000)return;
    checking=true;lastCheck=Date.now();
    try{
      // This record is updated only after a full Production rollout on Google Play.
      // APK builds and test-track releases must never trigger this notice.
      const response=await fetch('/android-play-release.json',{cache:'no-store'});
      if(!response.ok)return;
      const data=await response.json();
      const code=data.versionCode;
      if(data.packageName!=='com.souqdaraya.app'||data.track!=='production'||data.status!=='completed'||!Number.isSafeInteger(code)||code<1||code<=installed){document.querySelector('#apk-update-notice')?.remove();return;}
      try{if(sessionStorage.getItem('daraya-play-dismissed')===String(code))return;}catch(_){}
      if(document.querySelector('#apk-update-notice'))return;
      const panel=document.createElement('aside');
      panel.id='apk-update-notice';
      panel.setAttribute('aria-label','تحديث التطبيق');
      panel.style.cssText='margin:10px 14px;padding:12px;border:1px solid #c6a347;border-radius:12px;background:#fff5d7;color:#173b35;display:flex;flex-wrap:wrap;align-items:center;gap:10px';
      const message=document.createElement('strong');
      message.textContent='يتوفر تحديث جديد لتطبيق سوق داريا الإلكتروني على Google Play';
      message.setAttribute('role','status');message.style.cssText='flex:1 1 200px;font-size:14px';
      const download=document.createElement('a');download.className='button';download.href='https://play.google.com/store/apps/details?id=com.souqdaraya.app';
      download.textContent='تحديث التطبيق';
      download.style.cssText='min-height:44px;padding:8px 12px;font-size:14px';
      const later=document.createElement('button');later.type='button';later.className='outline';
      later.textContent='لاحقًا';
      later.style.cssText='min-height:44px;padding:8px 12px;font-size:14px';
      later.onclick=()=>{try{sessionStorage.setItem('daraya-play-dismissed',String(code));}catch(_){}panel.remove();};
      panel.append(message,download,later);document.querySelector('#app')?.before(panel);
    }catch(_){}
    finally{checking=false;}
  }
  document.addEventListener('visibilitychange',checkPlay);
  window.addEventListener('online',checkPlay);
  window.addEventListener('daraya-app-resume',checkPlay);
  setInterval(checkPlay,21600000);checkPlay();
})();
