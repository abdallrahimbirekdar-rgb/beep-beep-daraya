'use strict';
// Present the existing management tools one section at a time.
(() => {
 const say=(ar,en,de)=>({ar,en,de}[window.ShahinI18n?.language||'ar']||ar);
 const app=document.getElementById('app');
 let lastRoute='';
 const adminHome=()=>!location.hash||['#dashboard','#dashboard/','#dashboard/home'].includes(location.hash);
 const icons={"stores":"🏪","details":"🪪","photos":"📸","products":"🛍️","delivery":"🚚","drivers":"🛵","hours":"⏰","reports":"📊","orders":"📋","new-section":"🆕","tools":"🗓️","workspace-tools":"🧰","overview":"🏠","help":"📖","accounts":"👥","statistics":"📈","usage":"⚡","plans":"👑","bans":"🛡️","document":"📄"};
 const iconMarkup=key=>'<span class="dashboard-color-icon" aria-hidden="true">'+(icons[key]||icons.document)+'</span>';
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
  const tools=section==='workspace-tools',stats=section==='statistics';previousMerchant.call(this,ms,s,tools||stats?'overview':section);
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
   const statsLink=link(merchantHref('statistics',s),say('إحصاءات متجري','My shop stats','Meine Geschäftsstatistik'));card(statsLink,'statistics');nav.append(statsLink);
   const toolLink=link(merchantHref('workspace-tools',s),say('حالة المتجر والتجهيز والباقات','Shop status, setup and plan','Geschäftsstatus, Einrichtung und Tarif'));card(toolLink,'workspace-tools');nav.append(toolLink);
   const guide=top?.querySelector('a[href^="#merchant-help/"]');if(guide){card(guide,'help');nav.append(guide);}
   const refresh=top?.querySelector('#merchant-refresh');if(refresh){refresh.classList.add('dashboard-menu-refresh');sidebar.append(refresh);}
   sidebar.querySelector('.store-identity')?.setAttribute('hidden','');sidebar.querySelector('.setup-mini')?.setAttribute('hidden','');intro(sidebar,true);
  }else{
   sidebar.hidden=true;content.hidden=false;layout.before(back(merchantHref('overview',s),true));
   top?.querySelector('.merchant-actions')?.setAttribute('hidden','');
   if(stats)renderMerchantPageStats(s);
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
