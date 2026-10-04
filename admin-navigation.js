'use strict';
// Keep the selected section visible; background refreshes preserve the scroll position.
let lastAdminDashboardRoute='';
function revealAdminDashboardSection(route=location.hash){
 const tabs=document.querySelector('#app.admin-layout > .tabs'),content=document.querySelector('#dashboard-content');
 if(!tabs||!content)return;
 requestAnimationFrame(()=>{
  if(location.hash!==route||!tabs.isConnected||!content.isConnected)return;
  tabs.scrollIntoView({block:'start',behavior:'auto'});
  content.focus({preventScroll:true});
 });
}
const navigationDashboard=renderDashboard;
renderDashboard=function(tab,sid){
 navigationDashboard.apply(this,arguments);
 if(!admin||!user||tab==='setup'){lastAdminDashboardRoute='';return;}
 const tabs=document.querySelector('#app.admin-layout > .tabs'),content=document.querySelector('#dashboard-content');
 if(!tabs||!content)return;
 const names={stores:'الأماكن والعناوين',products:'المنتجات',orders:'الطلبات',accounts:'حسابات أصحاب المتاجر',drivers:'مندوبو التوصيل والتوصيل',reports:'التقارير'};
 content.setAttribute('tabindex','-1');content.setAttribute('aria-label',names[tab]||'محتوى قسم الإدارة');
 tabs.querySelectorAll('a').forEach(a=>{a.setAttribute('aria-controls','dashboard-content');if(a.classList.contains('selected'))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 const route=location.hash;
 if(lastAdminDashboardRoute!==route){lastAdminDashboardRoute=route;revealAdminDashboardSection(route);}
};
document.addEventListener('click',event=>{
 if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
 const link=event.target.closest('#app.admin-layout > .tabs a');
 if(link&&link.getAttribute('href')===location.hash)revealAdminDashboardSection();
});
