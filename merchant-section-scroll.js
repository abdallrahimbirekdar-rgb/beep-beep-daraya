'use strict';
(()=>{
 let lastShownRoute='',request=0;
 const mobile=()=>matchMedia('(max-width:900px)').matches||matchMedia('(pointer:coarse)').matches;
 function reveal(route=location.hash,force=false){
  if(!mobile()||(!force&&lastShownRoute===route))return;
  const token=++request;
  // Resolve the final DOM after every dashboard wrapper has finished rendering.
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   if(token!==request||location.hash!==route)return;
   const content=document.querySelector('#dashboard-content.merchant-content');if(!content?.isConnected)return;
   if(content.closest?.('.dashboard-menu-layout'))return;
   content.setAttribute('tabindex','-1');content.focus({preventScroll:true});
   content.scrollIntoView({block:'start',behavior:'auto'});lastShownRoute=route;
  }));
 }
 const previous=merchantDashboard;merchantDashboard=function(){previous.apply(this,arguments);reveal();};
 window.addEventListener('hashchange',()=>{if(!location.hash.startsWith('#dashboard')){lastShownRoute='';request++;}else reveal();});
 document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const link=event.target.closest('.merchant-nav a, #mobile-navigation a, .setup-card, .help-action, .welcome-actions a');
  if(link&&link.getAttribute('href')===location.hash)reveal(location.hash,true);
 });
})();
