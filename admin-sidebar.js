'use strict';
(()=>{
 const mobile=window.matchMedia('(max-width:900px)');
 function mount(){
  if(!admin||!user||!location.hash.startsWith('#dashboard')||location.hash.includes('/setup/'))return;
  const app=document.getElementById('app');if(!app?.classList.contains('admin-layout'))return;
  if(app.querySelector('.admin-workspace'))return;
  const tabs=app.querySelector(':scope > .tabs'),content=app.querySelector(':scope > #dashboard-content');if(!tabs||!content)return;
  const workspace=document.createElement('div');workspace.className='admin-workspace';
  const sidebar=document.createElement('aside');sidebar.className='admin-sidebar';sidebar.setAttribute('aria-label','أقسام لوحة الإدارة');
  const toggle=document.createElement('button');toggle.type='button';toggle.className='admin-sidebar-toggle outline';toggle.setAttribute('aria-controls','admin-sidebar-navigation');
  tabs.id='admin-sidebar-navigation';tabs.setAttribute('aria-label','أقسام لوحة الإدارة');
  const label=document.createElement('strong');label.className='admin-sidebar-title';label.textContent='أقسام لوحة الإدارة';
  sidebar.append(label,toggle,tabs);workspace.append(sidebar,content);app.append(workspace);
  const update=()=>{const selected=tabs.querySelector('[aria-current="page"],.selected');toggle.textContent='أقسام الإدارة'+(selected?' — '+selected.textContent:'')+' ▾';tabs.hidden=app.classList.contains('dashboard-menu-home')?false:mobile.matches;toggle.setAttribute('aria-expanded',String(!tabs.hidden));};
  toggle.onclick=()=>{tabs.hidden=!tabs.hidden;toggle.setAttribute('aria-expanded',String(!tabs.hidden));};
  update();
 }
 const previous=renderDashboard;renderDashboard=function(){previous.apply(this,arguments);mount();};
 document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const link=event.target.closest('.admin-sidebar .tabs a');if(!link||!mobile.matches)return;
  const aside=link.closest('.admin-sidebar'),tabs=aside.querySelector('.tabs'),toggle=aside.querySelector('.admin-sidebar-toggle');tabs.hidden=true;toggle.setAttribute('aria-expanded','false');
 });
 mobile.addEventListener('change',()=>{const tabs=document.querySelector('.admin-sidebar .tabs'),toggle=document.querySelector('.admin-sidebar-toggle');if(tabs){const app=document.getElementById('app');tabs.hidden=app?.classList.contains('dashboard-menu-home')?false:app?.classList.contains('dashboard-menu-section')?true:mobile.matches;toggle?.setAttribute('aria-expanded',String(!tabs.hidden));}});
 const app=document.getElementById('app');if(app)new MutationObserver(mount).observe(app,{childList:true});mount();
})();
