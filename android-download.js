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
