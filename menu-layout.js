'use strict';
(() => {
 const menu=document.querySelector('#site-menu');if(!menu)return;
 function block(title,cls='',fold=false){const node=document.createElement('section');node.className='side-menu-group '+cls;const label=document.createElement(fold?'button':'h2');label.textContent=title;node.append(label);if(fold){label.type='button';label.className='side-menu-toggle';label.setAttribute('aria-expanded','false');const content=document.createElement('div');content.className='side-menu-items';content.hidden=true;node.append(content);label.onclick=()=>{const open=label.getAttribute('aria-expanded')!=='true';label.setAttribute('aria-expanded',String(open));content.hidden=!open;};}return node;}
 function move(node,group,icon){if(!node)return;if(icon)node.dataset.menuIcon=icon;(group.querySelector('.side-menu-items')||group).append(node);}
 function organize(){
  const owner=menu.querySelector('a[href="#shop-owner"]'),home=menu.querySelector('a[href="#home-business"]');
  if(!owner||!home)return;
  const get=selector=>menu.querySelector(selector);
  const join=block('كن جزءًا من سوق داريا','side-menu-join');move(owner,join,'▣');move(home,join,'⌂');
  const account=block('الحساب والطلبات','side-menu-account');move(get('#customer-account'),account,'○');move(get('#dashboard-link'),account,'▦');move(get('#account'),account,'▦');move(get('#driver-code-entry'),account,'↗');move(get('#driver-code-signout'),account,'↪');
  const discover=block('اكتشف داريا','side-menu-discover');move(get('a[href="#map"]'),discover,'⌖');
  const about=block('المساعدة وعن الموقع','side-menu-about',true);move(get('a[href="#who-we-are"]'),about,'◈');move(get('a[href="#about"]'),about,'؟');move(get('a[href^="mailto:"]'),about,'✉');
  const apps=block('تحميل التطبيق','side-menu-apps',true);menu.querySelectorAll('[data-android-download],[data-ios-install]').forEach(node=>{if(node.matches('a[data-android-download]')){node.hidden=false;node.textContent='تحميل تطبيق أندرويد';}move(node,apps,'↓');});
  const language=block('اللغة','side-menu-language');move(get('.language-switch'),language);

  // Preserve dynamically supplied controls and their click handlers.
  for(const node of [...menu.children])if(node.matches('a,button'))move(node,account);
  menu.querySelectorAll(':scope>.side-menu-group').forEach(node=>node.remove());
  menu.append(account);if(discover.querySelector('a'))menu.append(discover);menu.append(join,language);if(apps.querySelector('a,button'))menu.append(apps);menu.append(about);const support=menu.querySelector('[data-support-links]');if(support)menu.append(support);
 }
 organize();
 new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&n.matches('a,button'))))organize();}).observe(menu,{childList:true});
})();
