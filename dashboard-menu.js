'use strict';
// Present the existing management tools one section at a time.
(() => {
 const say=(ar,en,de)=>({ar,en,de}[window.ShahinI18n?.language||'ar']||ar);
 const app=document.getElementById('app');
 let lastRoute='';
 const adminHome=()=>!location.hash||['#dashboard','#dashboard/','#dashboard/home'].includes(location.hash);
 const icons={"stores":"<path d=\"M3 10h18M4 10v11h16V10M8 21v-6h5v6M3 10l2-7h14l2 7M3 10c0 3 4 3 4 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 4 3 4 0\"/>","details":"<rect x=\"4\" y=\"3\" width=\"16\" height=\"18\" rx=\"2\"/><circle cx=\"12\" cy=\"8\" r=\"1\"/><path d=\"M12 12v5M8 18h8\"/>","photos":"<path d=\"M8 5l2-2h4l2 2h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z\"/><circle cx=\"12\" cy=\"13\" r=\"4\"/><path d=\"M18 8h1\"/>","products":"<path d=\"M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10M7 5l9 4\"/>","delivery":"<path d=\"M3 5h12v12H3zM15 9h4l3 4v4h-7M3 17h2M9 17h8\"/><circle cx=\"7\" cy=\"18\" r=\"2\"/><circle cx=\"19\" cy=\"18\" r=\"2\"/>","drivers":"<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M8 7h8M9 4V2h6v2M4 21v-3a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v3M9 15l3 3 3-3M12 18v3\"/>","hours":"<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 6v6l4 2\"/>","reports":"<path d=\"M3 3v18h18M7 17v-5M12 17V8M17 17V5\"/>","orders":"<rect x=\"5\" y=\"4\" width=\"14\" height=\"17\" rx=\"2\"/><rect x=\"9\" y=\"2\" width=\"6\" height=\"4\" rx=\"1\"/><path d=\"M8 11l1 1 2-2M13 11h3M8 16l1 1 2-2M13 16h3\"/>","new-section":"<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"3\"/><path d=\"M12 7v10M7 12h10\"/>","tools":"<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M7 2v6M17 2v6M3 10h18M7 17v-3M12 17v-5M17 17v-2\"/>","workspace-tools":"<path d=\"M9 3l-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>","overview":"<path d=\"M3 10l9-7 9 7M5 9v12h14V9M9 21v-7h6v7\"/>","help":"<path d=\"M12 5v16M12 5C9 3 5 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 1M5 8h3M5 12h3M16 8h3M16 12h3\"/>","accounts":"<circle cx=\"9\" cy=\"7\" r=\"3\"/><path d=\"M2 21v-3a7 7 0 0 1 14 0v3M17 4a3 3 0 0 1 0 6M19 14a6 6 0 0 1 3 5v2\"/>","statistics":"<path d=\"M3 3v18h18M7 16l4-5 4 2 6-7M17 6h4v4\"/>","usage":"<path d=\"M4 19a10 10 0 1 1 16 0zM12 12l5-5M6 12H4M12 4v2M20 12h-2\"/><circle cx=\"12\" cy=\"12\" r=\"1\"/>","plans":"<path d=\"M3 7l5 4 4-8 4 8 5-4-2 13H5zM5 16h14\"/>","bans":"<path d=\"M12 2l9 4v6c0 6-9 10-9 10S3 18 3 12V6zM8 8l8 8\"/>","document":"<path d=\"M14 2H5v20h14V7zM14 2v5h5M8 12h8M8 16h8\"/>"};
 const iconMarkup=key=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">'+(icons[key]||icons.document)+'</svg>';
 window.DarayaDashboardIcon=iconMarkup;
 function link(href,label){const a=document.createElement('a');a.href=href;a.textContent=label;a.dataset.noTranslate='';return a;}
 function back(href,owner=false){const a=link(href,owner?say('العودة إلى الرئيسية من لوحة متجري','Back to my dashboard menu','Zurück zum Geschäftsmenü'):say('العودة إلى الرئيسية من الإدارة','Back to admin menu','Zurück zum Verwaltungsmenü'));a.className='button dashboard-menu-back';a.dataset.dashboardBack='';return a;}
 function card(a,key){
  a.classList.add('dashboard-menu-card');a.classList.remove('selected');a.removeAttribute('aria-current');a.removeAttribute('aria-controls');
  if(!a.querySelector('[data-dashboard-icon]')){const icon=document.createElement('span');icon.dataset.dashboardIcon='';icon.setAttribute('aria-hidden','true');icon.innerHTML=iconMarkup(key||(a.hash==='#board-reports'?'reports':a.hash==='#banned-ad-accounts'?'bans':a.hash==='#data-requests'?'document':a.hash.startsWith('#merchant-help')?'help':'document'));a.prepend(icon);}
 }
 function startAtTop(){
  const route=location.hash;if(lastRoute===route)return;lastRoute=route;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   if(location.hash!==route)return;window.scrollTo(0,0);
   const target=app.querySelector('[data-dashboard-back],.dashboard-menu-title');
   if(target){if(target.tagName!=='A')target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}
  }));
 }
 function intro(target,owner=false){const h=document.createElement('h2');h.className='dashboard-menu-title';h.dataset.noTranslate='';h.textContent=owner?say('القائمة الرئيسية لمتجري','My shop menu','Mein Geschäftsmenü'):say('القائمة الرئيسية للإدارة','Admin menu','Verwaltungsmenü');const p=document.createElement('p');p.className='dashboard-menu-hint';p.dataset.noTranslate='';p.textContent=say('اختر قسمًا لفتحه','Choose a section to open','Wähle einen Bereich');target.prepend(h,p);}
 const previousMerchant=merchantDashboard;
 merchantDashboard=function(ms,s,section){
  const tools=section==='workspace-tools';previousMerchant.call(this,ms,s,tools?'overview':section);
  if(!s)return;const layout=app.querySelector('.merchant-layout'),sidebar=app.querySelector('.merchant-sidebar'),nav=app.querySelector('.merchant-nav'),content=app.querySelector('.merchant-content');
  if(!layout||!sidebar||!nav||!content)return;
  const home=!section||section==='overview'||section==='stores';
  app.dataset.dashboardSection=section||'overview';
  app.dataset.dashboardRoute=location.hash;
  app.classList.remove('dashboard-menu-home','dashboard-menu-section');app.classList.add('dashboard-menu-layout',home?'dashboard-menu-home':'dashboard-menu-section');layout.classList.add('dashboard-single-layout');
  const top=app.querySelector('.merchant-top');top?.querySelector('p.muted')?.setAttribute('hidden','');
  if(home){
   content.hidden=true;sidebar.hidden=false;nav.classList.add('dashboard-menu-grid');nav.setAttribute('aria-label',say('أقسام لوحة متجري','My shop sections','Geschäftsbereiche'));
   // Move original links instead of copying them, preserving feature handlers and locks.
   const links=[...nav.querySelectorAll('a')];links.forEach(a=>nav.append(a));nav.querySelectorAll('details').forEach(d=>d.remove());
   links.forEach(a=>{const key=Object.keys(icons).find(k=>a.getAttribute('href')===merchantHref(k,s));if(a.getAttribute('href')===merchantHref('overview',s)){a.remove();return;}card(a,key);});
   const toolLink=link(merchantHref('workspace-tools',s),say('حالة المتجر والتجهيز والباقات','Shop status, setup and plan','Geschäftsstatus, Einrichtung und Tarif'));card(toolLink,'workspace-tools');nav.append(toolLink);
   const guide=top?.querySelector('a[href^="#merchant-help/"]');if(guide){card(guide,'help');nav.append(guide);}
   const refresh=top?.querySelector('#merchant-refresh');if(refresh){refresh.classList.add('dashboard-menu-refresh');sidebar.append(refresh);}
   sidebar.querySelector('.store-identity')?.setAttribute('hidden','');sidebar.querySelector('.setup-mini')?.setAttribute('hidden','');intro(sidebar,true);
  }else{
   sidebar.hidden=true;content.hidden=false;layout.before(back(merchantHref('overview',s),true));
   top?.querySelector('.merchant-actions')?.setAttribute('hidden','');
   if(tools){content.querySelector('.merchant-daily')?.remove();content.querySelectorAll('details.merchant-extra,details.setup-review').forEach(d=>d.open=true);}
  }
  startAtTop();
 };
 const previousDashboard=renderDashboard;
 renderDashboard=function(tab,sid){
  previousDashboard.apply(this,arguments);
  if(!admin||!user||tab==='setup'||app.querySelector('.merchant-layout'))return;
  const tabs=app.querySelector('.tabs'),content=app.querySelector('#dashboard-content'),sidebar=app.querySelector('.admin-sidebar'),heading=app.querySelector('.admin-heading');if(!tabs||!content||!heading)return;
  const home=adminHome();app.classList.remove('dashboard-menu-home','dashboard-menu-section');app.classList.add('dashboard-menu-layout',home?'dashboard-menu-home':'dashboard-menu-section');
  app.dataset.dashboardSection=home?'home':tab;
  app.dataset.dashboardRoute=location.hash;
  const workspace=app.querySelector('.admin-workspace');workspace?.classList.add('dashboard-single-layout');
  const extra=[['#dashboard/reports',say('التقارير ومراجعة المتاجر','Reports and shop review','Berichte und Geschäftsprüfung'),'reports'],['#dashboard/statistics',say('الزيارات والإحصاءات','Visits and statistics','Besuche und Statistik'),'statistics'],['#dashboard/plans',say('باقات الاشتراك','Subscription plans','Tarife'),'plans'],['#banned-ad-accounts',say('الحسابات المحظورة من الإعلانات','Accounts blocked from ads','Für Anzeigen gesperrte Konten'),'bans'],['#dashboard/tools',say('أدوات الإدارة وتحديث البيانات','Admin tools and refresh','Werkzeuge und Aktualisieren'),'tools']];
  extra.forEach(([href,title,key])=>{if(![...tabs.querySelectorAll('a')].some(a=>a.getAttribute('href')===href)){const a=link(href,title);a.dataset.dashboardMenuKey=key;tabs.append(a);}});
  const request=heading.querySelector('a[href="#data-requests"]');if(request)tabs.append(request);
  const planButtons=[...heading.querySelectorAll(':scope > button')];const tools=heading.querySelector('.admin-tools');
  if(home){
   content.hidden=true;if(sidebar)sidebar.hidden=false;tabs.hidden=false;tabs.classList.add('dashboard-menu-grid');
   tabs.querySelectorAll('a').forEach(a=>card(a,a.dataset.dashboardMenuKey||a.hash.split('/')[1]));
   intro(sidebar||tabs.parentElement);
  }else{
   content.hidden=false;if(sidebar)sidebar.hidden=true;else tabs.hidden=true;
   heading.after(back('#dashboard'));
   if(tab==='statistics'){content.replaceChildren();const h=document.createElement('h2');h.textContent=say('الزيارات والإحصاءات','Visits and statistics','Besuche und Statistik');h.dataset.noTranslate='';content.append(h);const stats=app.querySelector(':scope > .stats');if(stats)content.append(stats);}
   if(tab==='plans'||tab==='tools'){
    content.replaceChildren();const panel=document.createElement('section');panel.className='panel dashboard-tools-panel';const h=document.createElement('h2');h.dataset.noTranslate='';h.textContent=tab==='plans'?say('باقات الاشتراك','Subscription plans','Tarife'):say('أدوات الإدارة','Admin tools','Verwaltungswerkzeuge');panel.append(h);
    if(tab==='plans')planButtons.forEach(b=>panel.append(b));
    else if(tools){const items=tools.querySelector('.admin-tools-items');if(items)while(items.firstChild)panel.append(items.firstChild);}
    content.append(panel);
   }
  }
  if(tools)tools.hidden=true;planButtons.filter(b=>heading.contains(b)).forEach(b=>b.hidden=true);
  heading.querySelector('.form-actions')?.setAttribute('hidden','');startAtTop();
 };
 function externalBack(){
  const route=location.hash.split('/')[0];
  if(admin&&user&&['#board-reports','#banned-ad-accounts','#data-requests'].includes(route)){
   app.classList.remove('dashboard-menu-home','dashboard-menu-section');app.classList.add('dashboard-menu-external');
   const existing=app.querySelector('.simple-back');if(existing&&route!=='#banned-ad-accounts'){existing.replaceWith(back('#dashboard'));}else if(!app.querySelector('[data-dashboard-back]'))app.prepend(back('#dashboard'));
   startAtTop();
  }else if(route==='#merchant-help'&&user){
   const s=mine().find(x=>x.id===location.hash.split('/')[1])||mine()[0];if(!s)return;
   app.querySelector(':scope > .simple-back')?.remove();if(!app.querySelector('[data-dashboard-back]'))app.prepend(back(merchantHref('overview',s),true));startAtTop();
  }
 }
 const previousRender=render;render=function(){if(!location.hash.startsWith('#dashboard'))app.classList.remove('dashboard-menu-layout','dashboard-menu-home','dashboard-menu-section');app.classList.remove('dashboard-menu-external');const result=previousRender.apply(this,arguments);externalBack();return result;};
 // Some older routes register a renderer directly; the hash listener also fixes their back link.
 window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#dashboard')){if(app.dataset.dashboardRoute!==location.hash)render();}else externalBack();});
 new MutationObserver(externalBack).observe(app,{childList:true});
})();
