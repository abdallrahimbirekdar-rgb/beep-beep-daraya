'use strict';
(() => {
  const nativeApp=/ShahinAndroid\//.test(navigator.userAgent);
  if(nativeApp)document.querySelectorAll('[data-android-download]').forEach(el=>{el.hidden=true;});
  const signature=doc=>Array.from(doc.querySelectorAll('script[src],link[rel="stylesheet"]'))
    .map(el=>el.getAttribute('src')||el.getAttribute('href')).join('|');
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
  const installed=Number(navigator.userAgent.match(/DarayaVersion\/(\d+)/)?.[1]||0);
  let checking=false,lastCheck=0;
  const words=(ar,en,de)=>({ar,en,de}[window.ShahinI18n?.language||'ar']||ar);
  async function checkApk(){
    if(document.hidden||checking||Date.now()-lastCheck<21600000)return;
    checking=true;lastCheck=Date.now();
    try{
      const response=await fetch('https://api.github.com/repos/abdallrahimbirekdar-rgb/beep-beep-daraya/releases/tags/android-v1.3.0',{cache:'no-store'});
      if(!response.ok)return;
      const data=await response.json();
      const asset=data.assets?.find(a=>a.name==='shahin.apk');
      const code=Number(asset?.label?.match(/^daraya-version-code:(\d+)$/)?.[1]||0);
      if(!code||code<=installed||!asset.size||!asset.browser_download_url?.startsWith('https://github.com/abdallrahimbirekdar-rgb/beep-beep-daraya/releases/download/'))return;
      try{if(sessionStorage.getItem('daraya-apk-dismissed')===String(code))return;}catch(_){}
      if(document.querySelector('#apk-update-notice'))return;
      const panel=document.createElement('aside');
      panel.id='apk-update-notice';panel.dataset.noTranslate='';
      panel.setAttribute('aria-label',words('تحديث التطبيق','App update','App-Update'));
      panel.style.cssText='margin:10px 14px;padding:12px;border:1px solid #c6a347;border-radius:12px;background:#fff5d7;color:#173b35;display:flex;flex-wrap:wrap;align-items:center;gap:10px';
      const message=document.createElement('strong');
      message.textContent=words('تتوفر نسخة جديدة من تطبيق سوق داريا الإلكتروني','A new app version is ready','Eine neue App-Version ist verfügbar');
      message.setAttribute('role','status');message.style.cssText='flex:1 1 200px;font-size:14px';
      const download=document.createElement('a');download.className='button';download.href=asset.browser_download_url;
      download.textContent=words('تحديث التطبيق','Update app','App aktualisieren');
      download.style.cssText='min-height:44px;padding:8px 12px;font-size:14px';
      const later=document.createElement('button');later.type='button';later.className='outline';
      later.textContent=words('لاحقًا','Later','Später');
      later.style.cssText='min-height:44px;padding:8px 12px;font-size:14px';
      later.onclick=()=>{try{sessionStorage.setItem('daraya-apk-dismissed',String(code));}catch(_){}panel.remove();};
      panel.append(message,download,later);document.querySelector('#app')?.before(panel);
    }catch(_){}
    finally{checking=false;}
  }
  document.addEventListener('visibilitychange',checkApk);
  window.addEventListener('online',checkApk);
  window.addEventListener('daraya-app-resume',checkApk);
  setInterval(checkApk,21600000);checkApk();
})();
