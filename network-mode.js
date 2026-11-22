'use strict';
(() => {
 const key='daraya-network-mode';let mode='auto',waiting=false;
 try{const saved=localStorage.getItem(key);if(['auto','save','normal'].includes(saved))mode=saved;}catch{}
 const connection=navigator.connection;
 function low(){return mode==='save'||mode==='auto'&&!!(connection?.saveData||['slow-2g','2g','3g'].includes(connection?.effectiveType)||connection?.downlink>0&&connection.downlink<1.5);}
 const t=(ar,en,de)=>({ar,en,de}[window.ShahinI18n?.language||document.documentElement.lang||'ar']||ar);
 const status=document.createElement('div');status.className='network-status';status.dataset.noTranslate='';status.setAttribute('role','status');status.hidden=true;document.body.prepend(status);
 function update(){document.documentElement.classList.toggle('low-data',low());status.hidden=navigator.onLine!==false&&!waiting;status.textContent=navigator.onLine===false?t('الاتصال مقطوع. احتفظ بالصفحة؛ أعد محاولة الطلب أو الحفظ بعد عودة الإنترنت.','You are offline. Keep the page open and retry after the internet returns.','Du bist offline. Lass die Seite offen und versuche es nach der Verbindung erneut.'):t('الاتصال بطيء. ما زلنا نحاول تحميل البيانات…','The connection is slow. Still loading…','Die Verbindung ist langsam. Daten werden noch geladen…');document.querySelector('[data-network-mode]')?.querySelectorAll('option').forEach(option=>{option.selected=option.value===mode;});window.dispatchEvent(new Event('daraya-network-change'));}
 function mount(){if(!document)return;const menu=document.getElementById('site-menu');if(!menu||menu.querySelector('[data-network-mode]'))return;const label=document.createElement('label');label.className='network-mode-control';label.dataset.noTranslate='';label.textContent=t('وضع الاتصال','Connection mode','Verbindungsmodus');const select=document.createElement('select');select.dataset.networkMode='';select.setAttribute('aria-label',label.textContent);for(const [value,text] of [['auto',t('تلقائي','Automatic','Automatisch')],['save',t('توفير البيانات','Save data','Daten sparen')],['normal',t('عادي','Normal','Normal')]]){const option=document.createElement('option');option.value=value;option.textContent=text;option.selected=value===mode;select.append(option);}select.onchange=()=>{mode=select.value;try{localStorage.setItem(key,mode);}catch{}update();};label.append(select);menu.append(label);}
 async function read(build){
  for(let attempt=0;attempt<2;attempt++){
   const controller=new AbortController();let timer;
   try{
    let query=build();if(typeof query.abortSignal==='function')query=query.abortSignal(controller.signal);
    const result=await Promise.race([query,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error(t('انتهت مهلة الاتصال. أعد المحاولة.','The request took too long. Try again.','Die Anfrage dauerte zu lange. Versuche es erneut.')));},low()?45000:25000);})]);
    if(attempt===0&&(result?.status>=500||result?.error&&result.status===0))continue;
    return result;
   }catch(error){if(attempt||navigator.onLine===false)throw error;}
   finally{clearTimeout(timer);}
  }
 }
 window.DarayaNetwork={low,read,showWaiting(value){waiting=value;update();},imageError(img){if(low()){img.onerror=null;img.removeAttribute('src');img.alt=t('الصورة لم تتحمل. افتحها لإعادة المحاولة.','Photo did not load. Open it to try again.','Foto konnte nicht laden. Zum Wiederholen öffnen.');return;}if(img.src!==img.dataset.fullImage)img.src=img.dataset.fullImage;else img.hidden=true;}};
 window.addEventListener('online',update);window.addEventListener('offline',update);connection?.addEventListener?.('change',update);
 function languageChanged(){document.querySelector('.network-mode-control')?.remove();mount();update();}
 window.addEventListener('languagechange',languageChanged);
 new MutationObserver(languageChanged).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});mount();update();
})();
