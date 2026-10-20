'use strict';
// Enhance the rendered, permission-filtered page. Keep existing order/contact handlers.
(() => {
 const root=document.querySelector('#app');if(!root)return;
 const t=(ar,en,de)=>ct(ar,en,de);
 const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 let observed=null,sectionObserver=null,queued=false;
 const motion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
 function positionMenu(menu){
  if(!menu.open)return;
  const panel=menu.querySelector('.sf-more-items'),heading=menu.closest('.sf-heading');if(!panel||!heading)return;
  const box=heading.getBoundingClientRect(),nav=document.querySelector('#mobile-navigation'),navBox=nav?.getBoundingClientRect();
  const bottom=navBox&&navBox.height>0&&navBox.top>0?Math.min(innerHeight,navBox.top):innerHeight;
  const below=bottom-box.bottom-18,above=box.top-18,up=below<200&&above>below;
  panel.style.top=up?'auto':'calc(100% + 6px)';panel.style.bottom=up?'calc(100% + 6px)':'auto';
  panel.style.maxHeight=Math.max(80,Math.min(innerHeight*.65,up?above:below))+'px';
 }
 function go(node){node.scrollIntoView({behavior:motion(),block:'start'});node.setAttribute('tabindex','-1');node.focus({preventScroll:true});}
 function galleryView(container){
  if(!container||container.dataset.storefrontGallery)return;
  const images=[...container.querySelectorAll('img')];if(!images.length)return;
  container.dataset.storefrontGallery='';container.classList.add('sf-lightbox');
  const track=make('div','sf-gallery-track');images.forEach(img=>{const slide=make('div','sf-gallery-slide');slide.append(img);track.append(slide);});container.replaceChildren(track);
  let index=0;const controls=make('div','sf-gallery-controls');
  const prev=make('button','outline',t('السابق','Previous','Zurück')),next=make('button','outline',t('التالي','Next','Weiter')),count=make('span');count.setAttribute('aria-live','polite');
  prev.type=next.type='button';controls.append(prev,count,next);container.append(controls);container.dataset.noTranslate='';
  const update=()=>{count.textContent=(index+1)+' / '+images.length;prev.disabled=index===0;next.disabled=index===images.length-1;};
  const show=i=>{index=Math.max(0,Math.min(images.length-1,i));track.children[index].scrollIntoView({behavior:motion(),block:'nearest',inline:'center'});update();};
  prev.onclick=()=>show(index-1);next.onclick=()=>show(index+1);
  track.addEventListener('scroll',()=>{const box=track.getBoundingClientRect();let distance=Infinity;[...track.children].forEach((slide,i)=>{const r=slide.getBoundingClientRect(),d=Math.abs((r.left+r.right)/2-(box.left+box.right)/2);if(d<distance){distance=d;index=i;}});update();},{passive:true});
  container.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const rtl=getComputedStyle(track).direction==='rtl';show(index+((e.key==='ArrowLeft')===rtl?1:-1));});
  update();
 }
 function showPhotos(images,index=0){
  if(!images.length)return;
  modal('<section data-no-translate><h2>'+esc(t('صور المحل','Shop photos','Geschäftsfotos'))+'</h2><div class="sf-shop-gallery"></div></section>');
  const box=document.querySelector('.sf-shop-gallery');
  images.forEach(source=>{const image=document.createElement('img');image.src=source.dataset.fullImage||source.currentSrc||source.src||source.dataset.lazySrc;image.alt=source.alt;image.decoding='async';box.append(image);});
  galleryView(box);requestAnimationFrame(()=>box.querySelector('.sf-gallery-track')?.children[index]?.scrollIntoView({block:'nearest',inline:'center'}));
 }
 const baseGallery=gallery;
 gallery=function(p){baseGallery.apply(this,arguments);galleryView(document.querySelector('#modal-body .gallery'));};
 function sectionNav(banner){
  const nav=root.querySelector('.sf-section-nav');if(!nav)return;
  const layout=root.querySelector('.store-layout'),offers=root.querySelector('.shop-current-offers'),photos=root.querySelector('.place-photo-gallery'),info=root.querySelector('.sf-information');
  if(offers){
   const box=offers.querySelector('[data-current-shop-offers]');
   // Keep the host mounted: the offers module uses its presence to avoid repeat fetches.
   offers.hidden=!box?.querySelector('.shop-offer,.community-offer,[data-offer-id]');
   offers.classList.add('sf-offers');offers.id='sf-offers';
   const intro=offers.querySelector(':scope>p');if(intro&&!intro.closest('details')){const details=make('details','sf-follow-help'),summary=make('summary','',t('كيف تعمل المتابعة؟','How following works','Wie funktioniert das Folgen?'));details.append(summary,intro);offers.append(details);}
   if(layout&&offers.previousElementSibling!==layout)layout.after(offers);
  }
  const entries=[[layout,t(banner.dataset.service==='1'?'الخدمات':'المنتجات','Products & services','Produkte & Leistungen'),'sf-products'],[offers?.hidden?null:offers,t('العروض','Offers','Angebote'),'sf-offers'],[photos,t('الصور','Photos','Bilder'),'sf-photos'],[info,t('معلومات المحل','Information','Informationen'),'sf-info']].filter(([n])=>n);
  entries.forEach(([node,,id])=>node.id=id);
  const key=entries.map(x=>x[2]).join('|')+'|'+document.documentElement.lang;
  if(nav.dataset.sections===key)return;nav.dataset.sections=key;nav.replaceChildren();
  sectionObserver?.disconnect();
  const active=id=>nav.querySelectorAll('button').forEach(b=>{const on=b.dataset.target===id;b.classList.toggle('active',on);if(on)b.setAttribute('aria-current','location');else b.removeAttribute('aria-current');});
  entries.forEach(([node,label,id],i)=>{const button=make('button','',label);button.type='button';button.dataset.target=id;button.onclick=()=>{go(node);active(id);};nav.append(button);if(!i)active(id);});
  if('IntersectionObserver' in window){sectionObserver=new IntersectionObserver(rows=>{const entry=rows.filter(x=>x.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];if(entry)active(entry.target.id);},{rootMargin:'-8% 0px -55% 0px',threshold:0});entries.forEach(([n])=>sectionObserver.observe(n));}
 }
 function enhance(id){
  const s=stores.find(x=>x.id===id&&x.active&&!x.deleted_at),banner=root.querySelector('.store-banner');if(!s||!banner||banner.dataset.storefront)return;
  banner.dataset.storefront=id;banner.dataset.service=s.text_only?'1':'0';banner.classList.add('storefront');
  const identity=banner.querySelector('.store-identity')||banner.querySelector(':scope>div');if(!identity)return;
  const toolbar=banner.querySelector('.shop-quick-toolbar'),drawer=banner.querySelector('.shop-info-drawer'),actions=banner.querySelector('.directory-actions');
  const title=identity.querySelector('h1');if(!title)return;
  const heading=make('div','sf-heading');title.before(heading);heading.append(title);
  const more=make('details','sf-more'),summary=make('summary','','⋯');summary.setAttribute('aria-label',t('المزيد من أدوات المحل','More shop tools','Weitere Geschäftswerkzeuge'));more.append(summary);heading.append(more);
  const tools=make('div','sf-more-items');tools.dataset.noTranslate='';more.append(tools);
  more.addEventListener('toggle',()=>positionMenu(more));
  const quick=make('div','sf-primary-actions');quick.dataset.noTranslate='';
  const layout=root.querySelector('.store-layout');
  if(layout){const browse=make('button','sf-browse',s.text_only?t('شاهد الخدمات','Explore services','Leistungen ansehen'):/restaurant|مطعم|فلافل|مأكولات/.test(s.category+' '+s.name)?t('شاهد القائمة','View menu','Speisekarte ansehen'):t('تصفّح المنتجات','Browse products','Produkte ansehen'));browse.type='button';browse.onclick=()=>go(layout);quick.append(browse);}
  // Only reuse contacts already present after subscription/privacy filtering.
  const direction=actions?.querySelector('a[href*="/maps/dir/"]'),phone=actions?.querySelector('a[href^="tel:"]');
  if(direction){direction.classList.add('sf-directions');direction.textContent=t('↗ الاتجاهات','↗ Directions','↗ Route');quick.append(direction);}
  if(phone){phone.textContent=t('اتصال','Call','Anrufen');quick.append(phone);}
  if(actions)tools.append(actions);
  banner.querySelectorAll('.shop-catalog-download').forEach(b=>tools.append(b));
  const customer=root.querySelector('.store-customer-tools');
  if(customer){const share=customer.querySelector('button');if(share){share.classList.add('sf-share');share.textContent=t('مشاركة','Share','Teilen');quick.append(share);}}
  if(s.description?.trim()){const subtitle=make('p','sf-subtitle',s.description.trim().split('\n')[0]);subtitle.title=s.description;heading.after(subtitle);}
  const info=make('section','sf-information');info.dataset.noTranslate='';
  const infoTitle=make('h2','',t('تعرّف على المحل','About this business','Über dieses Geschäft'));info.append(infoTitle);
  if(drawer){const content=make('div','sf-info-body');content.append(...[...drawer.children].filter(n=>n.tagName!=='SUMMARY'));info.append(content);drawer.remove();const first=content.querySelector('.shop-info-tabs button');if(first?.getAttribute('aria-expanded')!=='true')first?.click();}
  const whatsapp=root.querySelector('[data-place-whatsapp-share]');if(whatsapp){const row=whatsapp.parentElement;tools.append(whatsapp);if(!row.children.length)row.remove();}
  if(customer)info.append(customer);
  const notice=root.querySelector('.catalog-notice');if(notice)info.append(notice);
  toolbar?.remove();identity.append(quick);
  root.append(info);
  const nav=make('nav','sf-section-nav');nav.dataset.noTranslate='';nav.setAttribute('aria-label',t('أقسام صفحة المحل','Shop page sections','Bereiche der Geschäftsseite'));banner.after(nav);
  if(layout){layout.classList.add('sf-catalog');const h=layout.querySelector('h2');if(h){h.dataset.noTranslate='';h.textContent=s.text_only?t('خدماتنا','Our services','Unsere Leistungen'):/restaurant|مطعم|فلافل|مأكولات/.test(s.category+' '+s.name)?t('قائمتنا','Our menu','Unsere Speisekarte'):t('منتجاتنا','Our products','Unsere Produkte');}
   layout.querySelectorAll('.product').forEach(p=>{const description=p.querySelector('p.muted');if(description&&!description.textContent.trim())description.remove();const shares=[...p.querySelectorAll('.promo-public-share')];if(shares.length){const sharing=make('details','sf-product-share'),label=make('summary','',t('مشاركة المنتج','Share product','Produkt teilen'));sharing.dataset.noTranslate='';sharing.append(label,...shares);p.querySelector('h3')?.parentElement.append(sharing);}});
  }
  const cover=banner.querySelector('img.store-image');
  if(cover){const button=make('button','sf-cover-button');button.type='button';button.setAttribute('aria-label',t('تكبير صورة المحل','Enlarge shop photo','Geschäftsfoto vergrößern'));cover.before(button);button.append(cover);cover.loading='eager';cover.decoding='async';button.onclick=()=>showPhotos([cover]);}
  const photos=root.querySelector('.place-photo-gallery');
  if(photos){photos.classList.add('sf-photos');const heading=make('h2','',t('صور من المحل','Inside the business','Einblicke ins Geschäft'));heading.dataset.noTranslate='';photos.prepend(heading);const images=[...photos.querySelectorAll('img')];images.forEach((img,i)=>{const button=make('button','sf-photo-button');button.type='button';button.setAttribute('aria-label',t('تكبير الصورة','Enlarge photo','Bild vergrößern')+' '+(i+1));img.before(button);button.append(img);img.loading='lazy';button.onclick=()=>showPhotos(images,i);});info.before(photos);}
  sectionNav(banner);
 }
 function refresh(){
  const banner=root.querySelector('.store-banner');if(!banner){sectionObserver?.disconnect();observed=null;return;}
  const id=banner.dataset.storefront||location.hash.split('/')[1];if(id)enhance(id);
  if(banner.dataset.storefront)sectionNav(banner);
  if(observed!==banner){observed=banner;}
 }
 const base=renderStore;renderStore=function(id){const result=base.apply(this,arguments);enhance(id);return result;};
 // An offer can arrive after the page renders; do not poll or reload any catalog data.
 new MutationObserver(records=>{if(!records.some(r=>r.target===root||r.target.closest?.('[data-current-shop-offers]')))return;if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh();});}).observe(root,{childList:true,subtree:true});
 root.addEventListener('click',e=>{root.querySelectorAll('.sf-more[open]').forEach(menu=>{if(!menu.contains(e.target))menu.open=false;});});
 root.addEventListener('keydown',e=>{if(e.key==='Escape')root.querySelectorAll('.sf-more[open]').forEach(menu=>{menu.open=false;menu.querySelector('summary').focus();});});
 let menuFrame=0;const adjustMenus=()=>{if(menuFrame||!root.querySelector('.sf-more[open]'))return;menuFrame=requestAnimationFrame(()=>{menuFrame=0;root.querySelectorAll('.sf-more[open]').forEach(positionMenu);});};
 window.addEventListener('resize',adjustMenus);window.addEventListener('scroll',adjustMenus,{passive:true});
 refresh();
})();
