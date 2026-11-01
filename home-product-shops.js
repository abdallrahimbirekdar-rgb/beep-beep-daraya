'use strict';
(() => {
 const t=(ar,en,de)=>({ar,en,de}[window.ShahinI18n?.language||document.documentElement.lang||'ar']||ar);
 let cache=null,pending=null,version=0,stopRotation=()=>{};
 const isHome=()=>['','#home','#'].includes(location.hash)&&!window.darayaHomeShowsResults?.()&&!(typeof search!=='undefined'&&search.trim())&&!(typeof browseFavorites!=='undefined'&&browseFavorites);
 async function catalogs(){if(cache&&Date.now()-cache.at<60000)return cache.rows;if(pending)return pending;const generation=version;
  pending=(async()=>{const rows=[];for(let offset=0;;offset+=100){const r=await api.from('stores').select('id,products!inner(id,name,image)').eq('active',true).eq('is_example',false).is('deleted_at',null).eq('products.available',true).order('created_at',{ascending:false}).order('id').order('id',{referencedTable:'products'}).limit(3,{referencedTable:'products'}).range(offset,offset+99);if(r.error)throw r.error;rows.push(...(r.data||[]));if((r.data||[]).length<100)break;}if(generation===version)cache={rows,at:Date.now()};return rows;})();try{return await pending;}finally{pending=null;}
 }
 const image=(src,alt)=>{const url=typeof safeImage==='function'?safeImage(src):src;if(!url)return null;const img=document.createElement('img');img.src=typeof thumbnailForImage==='function'?thumbnailForImage(url):url;img.alt=alt||'';img.loading='lazy';img.decoding='async';img.onerror=()=>img.remove();return img;};
 function rotate(list,heading){
  stopRotation();
  if(list.children.length<2||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  let frame=null,hover=false,focused=false,dragging=false,paused=false,resumeAt=0;
  const control=document.createElement('button');control.type='button';control.className='home-catalog-motion';control.dataset.noTranslate='';
  const label=()=>{control.textContent=paused?'▶':'Ⅱ';control.setAttribute('aria-pressed',String(paused));control.setAttribute('aria-label',paused?t('استئناف حركة المتاجر','Resume shop movement','Geschäfte weiterbewegen'):t('إيقاف حركة المتاجر','Pause shop movement','Bewegung anhalten'));};label();heading.append(control);
  const cancel=()=>{if(frame!==null)cancelAnimationFrame(frame);frame=null;list.classList.remove('is-auto-scrolling');};
  const rest=()=>{cancel();resumeAt=Date.now()+10000;};
  control.onclick=()=>{paused=!paused;rest();label();};
  const enter=e=>{if(e.pointerType==='mouse'){hover=true;cancel();}},leave=e=>{if(e.pointerType==='mouse'){hover=false;rest();}};
  const down=()=>{dragging=true;rest();},up=()=>{if(dragging){dragging=false;rest();}};
  const focus=()=>{focused=true;cancel();},blur=e=>{if(!list.contains(e.relatedTarget)){focused=false;rest();}};
  list.addEventListener('pointerenter',enter);list.addEventListener('pointerleave',leave);list.addEventListener('focusin',focus);list.addEventListener('focusout',blur);
  list.addEventListener('pointerdown',down,{passive:true});window.addEventListener('pointerup',up,{passive:true});window.addEventListener('pointercancel',up,{passive:true});list.addEventListener('wheel',rest,{passive:true});
  const hide=()=>{if(document.hidden)rest();};document.addEventListener('visibilitychange',hide);
  const timer=setInterval(()=>{
   if(!list.isConnected||!isHome()){stopRotation();return;}
   if(document.hidden||paused||hover||focused||dragging||Date.now()<resumeAt||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
   const max=list.scrollWidth-list.clientWidth,box=list.getBoundingClientRect();if(max<=2||box.bottom<=0||box.top>=window.innerHeight)return;
   cancel();const rtl=getComputedStyle(list).direction==='rtl',cards=[...list.children],edge=rtl?'right':'left';
   let index=0,distance=Infinity;cards.forEach((card,i)=>{const d=Math.abs(card.getBoundingClientRect()[edge]-box[edge]);if(d<distance){distance=d;index=i;}});
   const start=list.scrollLeft,atEnd=Math.abs(start)>=max-2;
   const next=cards[atEnd?0:Math.min(index+1,cards.length-1)],delta=next.getBoundingClientRect()[edge]-box[edge];
   const target=rtl?Math.max(-max,Math.min(0,start+delta)):Math.max(0,Math.min(max,start+delta));
   let began=null;list.classList.add('is-auto-scrolling');
   const step=now=>{if(!list.isConnected||document.hidden){cancel();return;}if(began===null)began=now;const progress=Math.min(1,(now-began)/1600),ease=progress*progress*(3-2*progress);list.scrollLeft=start+(target-start)*ease;if(progress<1)frame=requestAnimationFrame(step);else{frame=null;list.classList.remove('is-auto-scrolling');}};
   frame=requestAnimationFrame(step);
  },3000);
  stopRotation=()=>{clearInterval(timer);cancel();document.removeEventListener('visibilitychange',hide);list.removeEventListener('pointerenter',enter);list.removeEventListener('pointerleave',leave);list.removeEventListener('focusin',focus);list.removeEventListener('focusout',blur);list.removeEventListener('pointerdown',down);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);list.removeEventListener('wheel',rest);control.remove();stopRotation=()=>{};};
 }
 function show(section,rows){
  stopRotation();
  const shops=rows.map(row=>({s:stores.find(s=>s.id===row.id&&s.active&&!s.deleted_at&&!s.is_example),ps:row.products||[]})).filter(x=>x.s&&x.ps.length&&!(typeof directoryIsInfo==='function'&&directoryIsInfo(x.s)));
  if(!shops.length){section.remove();return;}
  section.replaceChildren();const heading=document.createElement('div');heading.className='home-catalog-heading';const text=document.createElement('div'),h=document.createElement('h2');h.textContent=t('متاجر تعرض منتجاتها','Shops with products','Geschäfte mit Produkten');const note=document.createElement('p');note.textContent=t('شاهد المنتجات والصور قبل زيارة المتجر','See products and photos before your visit','Produkte und Fotos vor dem Besuch ansehen');text.append(h,note);const count=document.createElement('span');count.className='home-catalog-count';count.textContent=shops.length+' '+t('متجر','shops','Geschäfte');heading.append(text,count);section.append(heading);
  const list=document.createElement('div');list.className='home-catalog-track';list.setAttribute('role','list');list.setAttribute('aria-label',h.textContent);
  for(const {s,ps} of shops){const article=document.createElement('article');article.className='home-product-shop-card';article.setAttribute('role','listitem');const link=document.createElement('a');link.href='#store/'+encodeURIComponent(s.id);const top=document.createElement('div');top.className='home-catalog-shop';const cover=image(s.image,'');if(cover){cover.className='home-catalog-cover';top.append(cover);}const title=document.createElement('strong');title.textContent=s.name;top.append(title);const pictures=document.createElement('div');pictures.className='home-catalog-products';for(const p of ps.slice(0,3)){const img=image(p.image,p.name);if(img)pictures.append(img);}const action=document.createElement('span');action.className='home-catalog-action';action.textContent=t('تصفّح المنتجات ←','Browse products →','Produkte ansehen →');link.append(top,pictures,action);article.append(link);list.append(article);}section.append(list);rotate(list,heading);
 }
 function mount(){stopRotation();if(!api||!isHome())return;const app=document.querySelector('#app'),delivery=app?.querySelector('.simple-delivery-category'),browse=app?.querySelector('#browse');if(!browse||app.querySelector('.store-banner'))return;let section=app.querySelector('[data-home-product-shops]');if(!section){section=document.createElement('section');section.className='home-product-shops';section.dataset.homeProductShops='';section.dataset.noTranslate='';section.setAttribute('aria-label',t('متاجر تعرض منتجاتها','Shops with products','Geschäfte mit Produkten'));if(delivery)delivery.after(section);else browse.before(section);}if(cache&&Date.now()-cache.at<60000){show(section,cache.rows);return;}section.innerHTML='<p class="home-catalog-loading" role="status"></p>';section.querySelector('p').textContent=t('جاري تحميل المتاجر التي لديها منتجات…','Loading shops with products…','Geschäfte mit Produkten werden geladen…');catalogs().then(rows=>{if(section.isConnected&&isHome())show(section,rows);}).catch(()=>{if(!section.isConnected||!isHome())return;section.replaceChildren();const note=document.createElement('p');note.textContent=t('تعذر تحميل المتاجر الآن. تحقق من الإنترنت وأعد المحاولة.','Could not load shops. Check your internet and try again.','Geschäfte konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut.');const retry=document.createElement('button');retry.type='button';retry.className='outline';retry.textContent=t('إعادة المحاولة','Try again','Erneut versuchen');retry.onclick=()=>{cache=null;mount();};section.append(note,retry);});
 }
 window.addEventListener('hashchange',()=>{if(!isHome())stopRotation();});
 window.DarayaHomeCatalog={invalidate(){version++;cache=null;},mount};
 const previous=renderHome;renderHome=function(){const result=previous.apply(this,arguments);mount();return result;};
 if(document.querySelector('.professional-home'))mount();
})();
