'use strict';
(() => {
 const classify = img => {
  const card=img.closest('.card');if(!card||!img.naturalWidth)return;
  card.classList.toggle('portrait-store-card',img.naturalHeight>img.naturalWidth*1.15);
 };
 const scan = () => document.querySelectorAll('#app .card-cover img.card-image').forEach(img=>{
  if(img.complete)classify(img);
  if(!img.dataset.portraitWatch){img.dataset.portraitWatch='1';img.addEventListener('load',()=>classify(img));}
 });
 let queued=false;
 const root=document.querySelector('#app');if(!root)return;
 new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scan();});}).observe(root,{childList:true,subtree:true});
 scan();
})();
