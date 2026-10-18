'use strict';
(() => {
 const drawings={
  all:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect class="icon-gold" x="14" y="3" width="7" height="7" rx="1.5"/><rect class="icon-gold" x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  restaurant:'<circle class="icon-gold" cx="14.5" cy="12" r="5.5"/><path d="M4 3v6m3-6v6M2.5 3v5a3 3 0 0 0 6 0V3M5.5 11v10M21 3v18m0-18c-3 2-3 7 0 8"/>',
  grocery:'<path d="M4 10h16l-2 10H6L4 10Zm3 0 4-7m6 7-3-5M9 13v4m6-4v4"/><path class="icon-gold" d="M14 6c0-3 3-4 6-3 0 3-3 5-6 3Z"/>',
  apparel:'<path d="m8 4-5 3 2 5 3-1v10h8V11l3 1 2-5-5-3"/><path class="icon-gold" d="M8 4a4 4 0 0 0 8 0M9 17h6"/>',
  stationery:'<path d="M12 5C9 3 5 3 2.5 4.5V20c3-1.5 6.5-1 9.5.5 3-1.5 6.5-2 9.5-.5V4.5C19 3 15 3 12 5Zm0 0v15.5"/><path class="icon-gold" d="M6 8h2m-2 4h2m8-4h2m-2 4h2"/>',
  toys:'<circle cx="12" cy="8" r="5"/><path d="M8 4C5 0 1 5 6.8 7M16 4c3-4 7 1 1.2 3M8 12c-4 2-4 8 0 8h8c4 0 4-6 0-8M8 20l-2 1m10-1 2 1"/><path class="icon-gold" d="M11 9h2m-1 0v2m-2 5h4"/>',
  beauty:'<rect x="6" y="9" width="12" height="12" rx="3"/><path d="M9 9V6h6v3m-5-3V3h4v3"/><path class="icon-gold" d="M10 15h4M20 4v4m-2-2h4"/>',
  pets:'<ellipse cx="5" cy="10" rx="2" ry="2.5"/><ellipse cx="9.5" cy="5.5" rx="2" ry="2.5"/><ellipse cx="15.5" cy="5.5" rx="2" ry="2.5"/><ellipse cx="20" cy="10" rx="2" ry="2.5"/><path class="icon-gold" d="M7 15c2-5 8-5 10 0 5 6-1 7-5 4-4 3-10 2-5-4Z"/>',
  shop:'<path d="M4 10v11h16V10M2 10l2-7h16l2 7M3 10c0 4 5 4 5 0 0 4 8 4 8 0 0 4 5 4 5 0"/><path class="icon-gold" d="M9 21v-6h6v6M8 3l-1 7m9-7 1 7"/>',
  mobile:'<rect x="6" y="2" width="12" height="20" rx="3"/><path class="icon-gold" d="M10 5h4m-3 14h2"/><path d="M9 8h6"/>',
  household:'<path d="M5 11V7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4M5 17v4m14-4v4"/><path class="icon-gold" d="M5 13h14"/><path d="M5 11a2 2 0 0 0-4 0v7h22v-7a2 2 0 0 0-4 0v4H5v-4Z"/>',
  services:'<path d="M14 4a5 5 0 0 0-6 6L2.5 16a3 3 0 0 0 4 4L12 14a5 5 0 0 0 7-6l-4 3-3-3 3-4Z"/><path class="icon-gold" d="m16 15 5 6m-2-7 3 3M5 18h.01"/>',
  vehicles:'<path d="m4 10 2-6h12l2 6M3 17v3h3v-3m12 0v3h3v-3M3 10h18l1 7H2l1-7Z"/><path class="icon-gold" d="M5 13h3m8 0h3M9 17h6"/>',
  doctor:'<path d="M5 3v6a5 5 0 0 0 10 0V3M3 3h4m6 0h4m-7 11v2a5 5 0 0 0 10 0v-2"/><circle class="icon-gold" cx="20" cy="11" r="3"/>',
  pharmacy:'<path d="m4 12 8-8a5.7 5.7 0 0 1 8 8l-8 8a5.7 5.7 0 0 1-8-8Z"/><path class="icon-gold" d="m8 8 8 8m0-10 2 2"/>',
  school:'<path d="m2 8 10-5 10 5-10 5L2 8Zm4 2v7c4 3 8 3 12 0v-7"/><path class="icon-gold" d="M22 8v9m-1 0h2"/>',
  mosque:'<path d="M6 21V11h12v10M7 11c0-4 5-6 5-6s5 2 5 6M10 21v-5a2 2 0 0 1 4 0v5M2 21V9m20 12V9M1 9h3m16 0h3M1 21h22"/><path class="icon-gold" d="M12 5V2m-10 7V5m20 4V5"/>',
  lawyer:'<path d="M12 3v18m-6 0h12M4 6h16M6 6l-4 8h8L6 6Zm12 0-4 8h8l-4-8Z"/><path class="icon-gold" d="M2 14c0 4 8 4 8 0m4 0c0 4 8 4 8 0"/>'
 };
 function decorate(){
  const lang=window.ShahinI18n?.language||'ar',column={ar:1,en:2,de:3}[lang]||1;
  document.querySelectorAll('#app .browse-category-track button[data-filter]').forEach(button=>{
   const key=button.dataset.filter;if(key==='delivery')return;
   const sector=(window.DARAYA_SECTORS||[]).find(x=>x[0]===key);
   const title=key==='all'?({ar:'الكل',en:'All',de:'Alle'}[lang]||'الكل'):sector?.[column]||button.querySelector('.category-symbol-label')?.textContent||button.textContent;
   let label=button.querySelector('.category-symbol-label');
   if(!label){const badge=document.createElement('span');badge.className='category-symbol';badge.setAttribute('aria-hidden','true');badge.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(drawings[key]||drawings.shop)+'</svg>';label=document.createElement('span');label.className='category-symbol-label';button.replaceChildren(badge,label);button.classList.add('has-category-symbol');delete button.dataset.categoryIcon;}
   if(label.textContent!==title)label.textContent=title;button.setAttribute('aria-label',title);
  });
 }
 const previous=renderHome;renderHome=function(){const result=previous.apply(this,arguments);decorate();return result;};
 let locale=document.documentElement.lang;new MutationObserver(()=>{if(locale===document.documentElement.lang)return;locale=document.documentElement.lang;decorate();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 decorate();
})();
