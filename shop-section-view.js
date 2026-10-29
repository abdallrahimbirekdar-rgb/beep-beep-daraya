'use strict';
// Keep the existing shop controls mounted, but reveal only the chosen section.
(() => {
 const views=new WeakMap(),slides=new Map(),lastStarts=new Map();
 // One visible product photo, with the following photo loaded ahead of time.
 window.DarayaProductTileSlideshow=(visual,sources,key)=>{
  for(const [node,stop] of slides)if(!node.isConnected||node===visual)stop();
  const urls=[...new Set(sources.filter(Boolean))];if(!urls.length)return;
  for(let i=urls.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[urls[i],urls[j]]=[urls[j],urls[i]];}
  const storageKey='daraya-product-tile:'+key;
  let last=lastStarts.get(key);try{last=sessionStorage.getItem(storageKey)||last;}catch{}
  if(urls.length>1&&urls[0]===last)[urls[0],urls[1]]=[urls[1],urls[0]];
  lastStarts.set(key,urls[0]);try{sessionStorage.setItem(storageKey,urls[0]);}catch{}
  visual.classList.add('sf-tile-thumbnails','sf-tile-slideshow');visual.replaceChildren();
  let current=0,timer=null;
  const images=urls.map(src=>{const img=document.createElement('img');img.alt='';img.width=144;img.height=84;img.decoding='async';img.hidden=true;img.dataset.slideSrc=src;visual.append(img);return img;});
  const load=i=>{const img=images[i];if(img&&!img.hasAttribute('src'))img.src=img.dataset.slideSrc;};
  const show=i=>{images.forEach((img,n)=>img.hidden=n!==i);current=i;load(i);load((i+1)%images.length);};
  const stop=()=>{if(timer!==null)clearInterval(timer);slides.delete(visual);};
  images.forEach(img=>{img.onerror=()=>{
   const i=images.indexOf(img);if(i<0)return;images.splice(i,1);img.remove();
   if(!images.length){visual.textContent='🛍️';stop();return;}
   current=images.indexOf(images.find(n=>!n.hidden));show(current<0?i%images.length:current);
   if(images.length===1)stop();
  };});
  show(0);
  if(images.length>1){timer=setInterval(()=>{
   if(!visual.isConnected){stop();return;}
   if(document.hidden||visual.closest('[inert],.sf-section-collapsed')||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
   const next=(current+1)%images.length;load(next);if(images[next].complete&&images[next].naturalWidth>0)show(next);
  },2000);slides.set(visual,stop);}
 };

 window.DarayaShopSections=({root,hero,nav,sections,backLabel})=>{
  let view=views.get(root);
  if(view?.hero===hero){view.baseSections=sections;view.sections=[...sections,...view.extraSections.values()];view.sync();return view;}
  view?.dispose();
  const back=document.createElement('button');back.type='button';back.className='sf-section-return';back.dataset.noTranslate='';back.textContent=backLabel;back.hidden=true;nav.after(back);
  view={hero,nav,sections,baseSections:sections,extraSections:new Map(),active:null,back,trigger:null,disposed:false};views.set(root,view);
  const managed=new Set();
  view.dispose=()=>{
   if(view.disposed)return;for(const [visual,stop] of slides)if(nav.contains(visual))stop();view.disposed=true;view.observer?.disconnect();
   managed.forEach(node=>{node.classList.remove('sf-section-collapsed');node.removeAttribute('inert');delete node.dataset.sfSection;});
   nav.classList.remove('sf-section-collapsed');nav.removeAttribute('inert');back.remove();delete hero.dataset.sfSectionView;
   if(views.get(root)===view)views.delete(root);
  };
  const current=()=>!view.disposed&&hero.parentElement===root&&nav.parentElement===root;
  const direct=node=>{while(node&&node.parentElement!==root)node=node.parentElement;return node;};
  view.sync=()=>{
   // The shared #app also renders home, maps and accounts. Stop at navigation.
   if(!current()){view.dispose();return;}
   const groups=new Map();view.sections.forEach(({id,node,related=[]})=>{[node,...related].filter(Boolean).forEach(n=>{const top=direct(n);if(top)groups.set(top,id);});});
   [...root.children].forEach(node=>{
    if(node===hero||node===nav||node===back||node.matches('.simple-back,.topline,.shop-back-row,.demo-top,.demo-notice'))return;
    const catalogId=view.sections.find(x=>x.id.endsWith('products'))?.id;
    const id=groups.get(node)||(node.matches('.demo-cart-strip,.demo-basket')?catalogId:null)||(node.matches('.public-shop-section')?'sf-info':view.sections.at(-1)?.id);
    managed.add(node);node.dataset.sfSection=id;const hide=id!==view.active;node.classList.toggle('sf-section-collapsed',hide);node.toggleAttribute('inert',hide);
   });
   hero.dataset.sfSectionView=view.active||'sections';
   nav.classList.toggle('sf-section-collapsed',!!view.active);nav.toggleAttribute('inert',!!view.active);back.hidden=!view.active;
   nav.querySelectorAll('[data-target]').forEach(card=>card.setAttribute('aria-expanded',String(card.dataset.target===view.active)));
  };
  view.registerSection=entry=>{view.extraSections.set(entry.id,entry);view.sections=[...view.baseSections,...view.extraSections.values()];view.sync();};
  view.open=(id,trigger)=>{
   if(!current()){view.dispose();return;}
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
 window.DarayaShopSectionView=root=>views.get(root);
})();
