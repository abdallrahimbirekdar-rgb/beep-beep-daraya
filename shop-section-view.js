'use strict';
// Keep the existing shop controls mounted, but reveal only the chosen section.
(() => {
 const views=new WeakMap();
 window.DarayaShopSections=({root,hero,nav,sections,backLabel})=>{
  let view=views.get(root);
  if(view?.hero===hero){view.sections=sections;view.sync();return view;}
  view?.observer.disconnect();
  const back=document.createElement('button');back.type='button';back.className='sf-section-return';back.dataset.noTranslate='';back.textContent=backLabel;back.hidden=true;nav.after(back);
  view={hero,nav,sections,active:null,back,trigger:null};views.set(root,view);
  const direct=node=>{while(node&&node.parentElement!==root)node=node.parentElement;return node;};
  view.sync=()=>{
   const groups=new Map();view.sections.forEach(({id,node,related=[]})=>{[node,...related].filter(Boolean).forEach(n=>{const top=direct(n);if(top)groups.set(top,id);});});
   [...root.children].forEach(node=>{
    if(node===hero||node===nav||node===back||node.matches('.simple-back,.topline,.shop-back-row,.demo-top,.demo-notice'))return;
    const catalogId=view.sections.find(x=>x.id.endsWith('products'))?.id;
    const id=groups.get(node)||(node.matches('.demo-cart-strip,.demo-basket')?catalogId:null)||(node.matches('.public-shop-section')?'sf-info':view.sections.at(-1)?.id);
    node.dataset.sfSection=id;const hide=id!==view.active;node.classList.toggle('sf-section-collapsed',hide);node.toggleAttribute('inert',hide);
   });
   hero.dataset.sfSectionView=view.active||'sections';
   nav.classList.toggle('sf-section-collapsed',!!view.active);nav.toggleAttribute('inert',!!view.active);back.hidden=!view.active;
   nav.querySelectorAll('[data-target]').forEach(card=>card.setAttribute('aria-expanded',String(card.dataset.target===view.active)));
  };
  view.open=(id,trigger)=>{
   const entry=view.sections.find(x=>x.id===id);if(!entry?.node)return;
   view.active=id;view.trigger=trigger||nav.querySelector('[data-target="'+id+'"]');
   if(entry.node.tagName==='DETAILS')entry.node.open=true;
   view.sync();entry.node.setAttribute('tabindex','-1');entry.node.focus({preventScroll:true});
   back.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  };
  back.onclick=()=>{view.active=null;view.sync();const target=view.trigger?.isConnected?view.trigger:nav.querySelector('button:not(:disabled)');target?.focus({preventScroll:true});nav.scrollIntoView({behavior:'auto',block:'start'});};
  view.sync();view.observer=new MutationObserver(()=>view.sync());view.observer.observe(root,{childList:true});
  return view;
 };
})();
