'use strict';
(()=>{
 let lastRoute='';
 function reveal(route=location.hash){
  if(!matchMedia('(max-width:760px)').matches)return;
  const content=document.querySelector('#dashboard-content.merchant-content');if(!content)return;
  requestAnimationFrame(()=>{if(location.hash!==route||!content.isConnected)return;content.setAttribute('tabindex','-1');content.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});content.focus({preventScroll:true});});
 }
 const previous=merchantDashboard;
 merchantDashboard=function(){previous.apply(this,arguments);const route=location.hash;if(lastRoute!==route){lastRoute=route;reveal(route);}};
 window.addEventListener('hashchange',()=>{if(!location.hash.startsWith('#dashboard'))lastRoute='';});
 document.addEventListener('click',event=>{if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;const link=event.target.closest('.merchant-nav a, #mobile-navigation a, .setup-card, .help-action');if(link&&link.getAttribute('href')===location.hash)reveal();});
})();
