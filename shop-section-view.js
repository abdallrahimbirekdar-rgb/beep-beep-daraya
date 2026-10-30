'use strict';
// Keep the existing shop controls mounted, but reveal only the chosen section.
(() => {
 // Small illustrations share the shop palette and remain crisp on every screen.
 window.DarayaShopTileIcon=kind=>{
  const art={
   photos:`<ellipse cx="72" cy="96" rx="53" ry="5" fill="#173b35" opacity=".08"/><circle cx="72" cy="49" r="43" fill="#f6edcf"/><g transform="rotate(-12 46 45)"><rect x="13" y="12" width="66" height="74" rx="7" fill="#e7cf8e" stroke="#bd9342" stroke-width="2"/><rect x="20" y="19" width="52" height="49" rx="3" fill="#fffdf5"/></g><g transform="rotate(8 90 56)"><rect x="47" y="19" width="81" height="72" rx="7" fill="#fffdf5" stroke="#d3b365" stroke-width="2"/><rect x="54" y="26" width="67" height="49" rx="4" fill="#e3ebdf"/><circle cx="103" cy="38" r="7" fill="#d4ad54"/><path d="m54 69 19-23 16 18 11-11 21 22H54Z" fill="#397060"/><path d="m67 74 20-22 18 22Z" fill="#173b35"/><path d="M75 83h27" stroke="#d3b365" stroke-width="3" stroke-linecap="round"/></g>`,
   orders:`<ellipse cx="72" cy="96" rx="56" ry="5" fill="#173b35" opacity=".08"/><circle cx="72" cy="49" r="43" fill="#f6edcf"/><rect x="15" y="36" width="72" height="48" rx="7" fill="#173b35"/><path d="M87 47h25l19 22v15H87Z" fill="#397060"/><path d="M94 53h15l13 16H94Z" fill="#fffdf5"/><path d="M9 84h125" stroke="#bd9342" stroke-width="5" stroke-linecap="round"/><circle cx="37" cy="84" r="12" fill="#173b35" stroke="#fffdf5" stroke-width="3"/><circle cx="37" cy="84" r="4" fill="#d3b365"/><circle cx="111" cy="84" r="12" fill="#173b35" stroke="#fffdf5" stroke-width="3"/><circle cx="111" cy="84" r="4" fill="#d3b365"/><rect x="29" y="16" width="45" height="44" rx="5" fill="#d9b766" stroke="#fffdf5" stroke-width="2"/><path d="M47 17h9v17l-4-3-5 3Z" fill="#fff4d1"/><path d="M39 48h12" stroke="#8d6c2e" stroke-width="3" stroke-linecap="round"/><path d="M8 52h14M4 63h18" stroke="#bd9342" stroke-width="3" stroke-linecap="round"/>`,
   tools:`<ellipse cx="72" cy="96" rx="53" ry="5" fill="#173b35" opacity=".08"/><circle cx="72" cy="49" r="43" fill="#f6edcf"/><path d="M47 43V31a7 7 0 0 1 7-7h25a7 7 0 0 1 7 7v12" fill="none" stroke="#bd9342" stroke-width="9"/><rect x="17" y="40" width="101" height="50" rx="9" fill="#173b35"/><path d="M17 52c32 14 69 14 101 0v-5a7 7 0 0 0-7-7H24a7 7 0 0 0-7 7Z" fill="#397060"/><rect x="58" y="54" width="19" height="18" rx="4" fill="#ddbd6e"/><path d="M67 59v7" stroke="#173b35" stroke-width="3" stroke-linecap="round"/><g transform="rotate(32 112 42)"><path d="M104 18c-8 5-9 16-2 23v35a7 7 0 0 0 14 0V41c7-7 6-18-2-23v12h-10Z" fill="#e7cf8e" stroke="#fffdf5" stroke-width="2"/><circle cx="109" cy="75" r="2.5" fill="#173b35"/></g>`,
   products:`<ellipse cx="72" cy="96" rx="50" ry="5" fill="#173b35" opacity=".08"/><circle cx="72" cy="49" r="43" fill="#f6edcf"/><path d="M34 32h65l8 58H26Z" fill="#173b35" stroke="#fffdf5" stroke-width="2"/><path d="M48 36V25a18 18 0 0 1 36 0v11" fill="none" stroke="#bd9342" stroke-width="6" stroke-linecap="round"/><path d="m56 60 10 10 20-22" fill="none" stroke="#ddbd6e" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><rect x="94" y="53" width="31" height="38" rx="4" fill="#ddbd6e" stroke="#fffdf5" stroke-width="2"/><path d="M105 54h9v13l-4-3-5 3Z" fill="#fff4d1"/>`,

   contact:`<ellipse cx="72" cy="94" rx="54" ry="5" fill="#173b35" opacity=".08"/><circle cx="72" cy="49" r="43" fill="#f6edcf"/><g transform="rotate(-12 38 49)"><rect x="14" y="15" width="43" height="66" rx="10" fill="#173b35"/><rect x="19" y="22" width="33" height="48" rx="5" fill="#fffdf5"/><path d="m28 34 5-2 4 9-4 3c3 5 5 7 10 9l3-4 8 4-2 6c-12 7-34-16-24-25Z" fill="#bd9342"/><path d="M32 76h8" stroke="#ead9a0" stroke-width="3" stroke-linecap="round"/></g><path d="M113 15c-14 0-24 10-24 23 0 17 24 37 24 37s24-20 24-37c0-13-10-23-24-23Z" fill="#c8983e" stroke="#fff9e8" stroke-width="3"/><circle cx="113" cy="37" r="9" fill="#fff9e8"/><circle cx="76" cy="70" r="24" fill="#fffdf5" stroke="#173b35" stroke-width="3"/><circle cx="76" cy="70" r="18" fill="#f7efd8"/><path d="M76 56v15l10 6" fill="none" stroke="#173b35" stroke-width="3" stroke-linecap="round"/><circle cx="76" cy="70" r="3" fill="#bd9342"/>`,
   offers:`<ellipse cx="72" cy="94" rx="50" ry="5" fill="#173b35" opacity=".08"/><circle cx="72" cy="49" r="43" fill="#f6edcf"/><path d="m25 31 25-17 67 16 12 26-43 34-62-16Z" fill="#ddba68"/><path d="m20 38 26-17 65 17 13 27-44 29-61-19Z" fill="#173b35" stroke="#fff9e8" stroke-width="3"/><circle cx="39" cy="47" r="5" fill="#f6e6b4"/><path d="M39 43c-22-11-22-27-10-29" fill="none" stroke="#bd9342" stroke-width="3" stroke-linecap="round"/><path d="m66 71 27-23" stroke="#fff7dc" stroke-width="5" stroke-linecap="round"/><circle cx="68" cy="49" r="6" fill="none" stroke="#fff7dc" stroke-width="4"/><circle cx="92" cy="72" r="6" fill="none" stroke="#fff7dc" stroke-width="4"/><circle cx="115" cy="23" r="15" fill="#bd6450" stroke="#fff9e8" stroke-width="3"/><path d="M115 15v15m-6-6 6 6 6-6" fill="none" stroke="#fff9e8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`,
   videos:`<ellipse cx="72" cy="96" rx="53" ry="5" fill="#173b35" opacity=".08"/><circle cx="72" cy="49" r="43" fill="#f6edcf"/><g transform="rotate(-9 42 46)"><rect x="12" y="10" width="61" height="76" rx="13" fill="#fffdf5" stroke="#d3b365" stroke-width="2"/><rect x="19" y="17" width="47" height="62" rx="9" fill="#3973b8"/><path d="M47 79V52h9l2-11H47v-7c0-3 2-5 6-5h5V19c-2 0-5-1-9-1-11 0-16 6-16 16v7h-7v11h7v27Z" fill="#fffdf5"/></g><g transform="rotate(7 97 64)"><rect x="59" y="36" width="77" height="58" rx="13" fill="#fffdf5" stroke="#d3b365" stroke-width="2"/><rect x="66" y="44" width="63" height="41" rx="11" fill="#d9584b"/><path d="m91 53 19 12-19 11Z" fill="#fffdf5"/></g><path d="m102 14 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#bd9342"/>`,
   share:`<ellipse cx="72" cy="96" rx="53" ry="5" fill="#173b35" opacity=".08"/><circle cx="72" cy="49" r="43" fill="#f6edcf"/><g transform="rotate(-7 51 49)"><path d="M9 16c16-7 30-6 43 1 13-7 27-8 43-1v69c-17-6-30-6-43 1-13-7-27-7-43-1Z" fill="#173b35"/><path d="M14 20c13-5 25-4 36 2v57c-12-5-24-5-36-1Zm40 2c11-6 23-7 36-2v58c-12-4-24-4-36 1Z" fill="#fffdf5"/><path d="M52 21v61" stroke="#d3b365" stroke-width="2"/><rect x="20" y="29" width="23" height="21" rx="3" fill="#f1dfac"/><path d="m24 43 5-7 5 5 5-4" fill="none" stroke="#173b35" stroke-width="2" stroke-linejoin="round"/><circle cx="37" cy="34" r="2" fill="#bd9342"/><rect x="61" y="29" width="23" height="21" rx="3" fill="#e4ebe0"/><path d="m65 43 5-7 5 5 5-4" fill="none" stroke="#173b35" stroke-width="2" stroke-linejoin="round"/><path d="M21 58h21m-21 7h15m26-7h20m-20 7h14" stroke="#bd9342" stroke-width="3" stroke-linecap="round"/></g><rect x="73" y="36" width="61" height="58" rx="8" fill="#fffdf5" stroke="#d3b365" stroke-width="2"/><g fill="none" stroke="#173b35" stroke-width="3"><path d="M81 44h14v14H81zm29 0h14v14h-14zM81 73h14v14H81z"/></g><g fill="#173b35"><path d="M86 49h4v4h-4zm29 0h4v4h-4zM86 78h4v4h-4zm16-34h4v17h-4zm-21 20h10v4H81zm14 0h11v9h-4v-5h-7zm15 0h5v9h-5zm9 0h5v5h-5zm-17 14h4v9h-4zm8 0h10v4h-6v5h-4zm10 5h4v4h-4z"/></g>`
  };
  return art[kind]?'<svg class="sf-illustrated-icon" viewBox="0 0 144 104" fill="none" aria-hidden="true" focusable="false">'+art[kind]+'</svg>':'';
 };
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
   nav.classList.toggle('sf-portrait-nav',!!nav.querySelector('.sf-tile-products:not(:disabled)'));
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
