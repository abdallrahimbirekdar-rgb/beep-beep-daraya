'use strict';
(()=>{
 const add=()=>{
  const menu=document.querySelector('#site-menu');
  if(menu&&!menu.querySelector('[data-ideas-link]')){
   const a=document.createElement('a');a.href='ideas.html';a.dataset.ideasLink='';a.textContent='💡 مقترحات الزوار';a.style.order='65';menu.append(a);
  }
 };
 document.addEventListener('DOMContentLoaded',add);
 new MutationObserver(add).observe(document.documentElement,{childList:true,subtree:true});
})();
