'use strict';
// Public catalog loads only the opened shop and the persisted basket shop.
(() => {
 const TTL=60000, loaded=new Map();
 let fullLoaded=false, navigation=false, pending=false, identity=null, storeCache=null,productSequence=0,storeSequence=0;
 const columns='id,store_id,name,description,price,image,available,translations,section,gallery,option_groups,revision,stock_tracking';
 const management=()=>!!user&&location.hash.startsWith('#dashboard');
 const valid=id=>typeof id==='string'&&/^[0-9a-f-]{36}$/i.test(id);
 function routeStoreId(){
  const route=location.hash.slice(1).split('/');if(route[0]==='store'&&valid(route[1]))return route[1];
  if(location.hash)return null;
  const match=String(location.pathname||'').match(/^\/darayya\/([^/]+)\/?$/);if(!match||typeof stores==='undefined'||typeof placeSlug!=='function')return null;
  let slug;try{slug=decodeURIComponent(match[1]);}catch{return null;}
  return stores.find(s=>s.active&&!s.deleted_at&&placeSlug(s)===slug)?.id||null;
 }
 function ids(){const result=new Set(),sid=routeStoreId();if(valid(sid))result.add(sid);if(valid(cartStore))result.add(cartStore);else{try{const saved=JSON.parse(localStorage.getItem('shahin-cart'));if(valid(saved?.cartStore))result.add(saved.cartStore);}catch{}}return [...result];}
 async function pages(build){const rows=[];for(let offset=0;;offset+=1000){const r=window.DarayaNetwork?await window.DarayaNetwork.read(()=>build().range(offset,offset+999)):await build().range(offset,offset+999);if(r.error)throw r.error;rows.push(...(r.data||[]));if((r.data||[]).length<1000)return rows;}}
 async function fetchStores(build){const uid=user?.id||'public',request=++storeSequence;if(navigation&&!management()&&storeCache?.uid===uid&&Date.now()-storeCache.at<(window.DarayaNetwork?.low()?180000:TTL))return {data:JSON.parse(storeCache.json)};const rows=await pages(build);if(request===storeSequence&&(user?.id||'public')===uid)storeCache={uid,at:Date.now(),json:JSON.stringify(rows)};return {data:rows};}
 async function fetchProducts(){
  const uid=user?.id||'public',request=++productSequence;const current=()=>request===productSequence&&(user?.id||'public')===uid;if(identity!==uid){identity=uid;loaded.clear();fullLoaded=false;products=[];}
  const all=management();const scope=ids();
  if(all){const rows=await pages(()=>api.from('products').select(columns).order('id'));if(!current())return {data:products};products=rows;fullLoaded=true;for(const p of products)loaded.set(p.store_id,Date.now());return {data:products};}
  fullLoaded=false;
  const wanted=scope.filter(id=>!navigation||Date.now()-(loaded.get(id)||0)>=TTL);
  if(wanted.length){const rows=await pages(()=>api.from('products').select(columns).in('store_id',wanted).order('id'));if(!current())return {data:products};products=products.filter(p=>!wanted.includes(p.store_id)).concat(rows);wanted.forEach(id=>loaded.set(id,Date.now()));}
  // Keep the basket even when moving between shops; discard other unused catalogs.
  products=products.filter(p=>scope.includes(p.store_id));for(const id of loaded.keys())if(!scope.includes(id))loaded.delete(id);
  return {data:products};
 }
 function deferRender(){
  if(!api||passwordRecovery)return false;
  const route=location.hash.slice(1).split('/'),sid=routeStoreId();
  const needed=route[0]==='dashboard'&&user&&!fullLoaded||valid(sid)&&Date.now()-(loaded.get(sid)||0)>=TTL;
  if(!needed)return false;
  if(!pending){pending=true;navigation=true;const requestedHash=location.hash;$('#app').innerHTML='<section class="panel" role="status"><p class="loading">جاري تحميل بيانات الصفحة…</p></section>';
   reload().then(()=>{pending=false;navigation=false;render();}).catch(()=>{pending=false;navigation=false;fullLoaded=false;loaded.delete(sid);if(location.hash!==requestedHash){render();return;}$('#app').innerHTML='<section class="panel"><p>تعذر تحميل البيانات. حاول مرة أخرى.</p><button id="retry-demand">إعادة المحاولة</button></section>';$('#retry-demand').onclick=()=>render();});
  }return true;
 }
 window.DarayaDemand={fetchStores,fetchProducts,deferRender,ids,pages,get navigation(){return navigation;},get management(){return management();}};
 const previousRepeat=repeatOrder;repeatOrder=async function(order){try{const rows=await pages(()=>api.from('products').select(columns).eq('store_id',order.store_id).order('id'));products=products.filter(p=>p.store_id!==order.store_id).concat(rows);loaded.set(order.store_id,Date.now());const ids=rows.filter(p=>p.stock_tracking).map(p=>p.id);if(ids.length){const stock=await api.from('product_stock').select('product_id,variant_key,options,stock,revision').in('product_id',ids);if(stock.error)throw stock.error;for(const p of rows)p.stock_rows=(stock.data||[]).filter(x=>x.product_id===p.id);}window.ShahinI18n?.setCatalog?.(stores,products);previousRepeat(order);}catch{toast('تعذر تحميل المنتجات الحالية. أعد المحاولة.');}};
 // Search matching shop IDs rather than downloading every product and image URL.
 const searchCache=new Map();let timer=null,searchIds=new Set(),matchedTerm='',searchRows=[],sequence=0,matchedAt=0,searchIdentity=user?.id||'public',searchPendingTerm='';
 const home=()=>['','#home','#browse'].includes(location.hash)&&!routeStoreId();
 function searchState(kind){
  const host=document.querySelector?.('#browse')||document.querySelector?.('#app');if(!host)return;
  host.querySelector('[data-product-search-state]')?.remove();host.querySelectorAll('[data-search-waiting-empty]').forEach(el=>{el.hidden=false;el.removeAttribute('data-search-waiting-empty');});
  if(!kind)return;
  const state=document.createElement('div');state.dataset.productSearchState=kind;state.className='panel';state.setAttribute('role',kind==='error'?'alert':'status');
  const text=document.createElement('p');text.textContent=kind==='error'?'تعذر إكمال البحث في المنتجات. نتائج المتاجر المتاحة ظاهرة؛ أعد المحاولة للبحث في المنتجات.':'جاري البحث في المنتجات… نتائج المتاجر المتاحة ظاهرة الآن.';state.append(text);
  host.querySelectorAll('.grid > .empty').forEach(el=>{if(!el.hidden){el.dataset.searchWaitingEmpty='';el.hidden=true;}});
  if(kind==='error'){const button=document.createElement('button');button.type='button';button.className='outline';button.textContent='إعادة البحث';button.onclick=()=>{matchedTerm='';renderHome();};state.append(button);}
  const filters=host.querySelector('.filters');if(filters)filters.after(state);else host.prepend(state);
 }
 const previousMatches=matchesStore;matchesStore=function(store,term){return previousMatches(store,term)||(term.trim().toLowerCase()===matchedTerm&&searchIds.has(store.id));};
 const previousSearchProducts=searchProducts;searchProducts=function(term){const original=products;try{const combined=new Map(original.map(p=>[p.id,p]));if(term.trim().toLowerCase()===matchedTerm)for(const p of searchRows)if(!combined.has(p.id))combined.set(p.id,p);products=[...combined.values()];return previousSearchProducts(term);}finally{products=original;}};
 const previousHome=renderHome;renderHome=function(){
  const uid=user?.id||'public';if(searchIdentity!==uid){searchIdentity=uid;searchCache.clear();matchedTerm='';searchRows=[];searchIds.clear();sequence++;searchPendingTerm='';}
  previousHome();if(!home())return;
  const term=search.trim().toLowerCase();if(!term){clearTimeout(timer);sequence++;matchedTerm='';searchRows=[];searchIds.clear();searchPendingTerm='';searchState(null);return;}
  if(matchedTerm===term&&Date.now()-matchedAt<120000){clearTimeout(timer);sequence++;searchPendingTerm='';searchState(null);return;}
  searchState('loading');if(searchPendingTerm===term)return;
  clearTimeout(timer);const seq=++sequence;searchPendingTerm=term;
  const current=()=>seq===sequence&&(user?.id||'public')===uid&&search.trim().toLowerCase()===term&&home();
  timer=setTimeout(async()=>{try{
   let hit=searchCache.get(term);if(!hit||Date.now()-hit.at>120000){
    const pattern='%'+term.replace(/[%_,().*"\\]/g,' ')+'%';const fields=['name','description','section','translations->en->>name','translations->en->>description','translations->de->>name','translations->de->>description'];
    const rows=await pages(()=>api.from('products').select('id,store_id,name,description,section,price,image,available,translations').eq('available',true).or(fields.map(f=>f+'.ilike.'+pattern).join(',')).order('id'));
    if((user?.id||'public')!==uid)return;hit={at:Date.now(),rows,ids:rows.map(p=>p.store_id)};if(searchCache.size>=20)searchCache.delete(searchCache.keys().next().value);searchCache.set(term,hit);
   }
   if(!current())return;matchedTerm=term;matchedAt=hit.at;searchRows=hit.rows;searchIds=new Set(hit.ids);searchPendingTerm='';
   const input=$('#search'),focused=document.activeElement===input,pos=input?.selectionStart;renderHome();if(focused&&$('#search')){$('#search').focus({preventScroll:true});$('#search').setSelectionRange(pos,pos);}
  }catch{if(current())searchState('error');}finally{if(seq===sequence)searchPendingTerm='';}},window.DarayaNetwork?.low()?700:350);
 };
 window.addEventListener?.('hashchange',()=>{clearTimeout(timer);sequence++;searchPendingTerm='';});
 // No image request before its position approaches the viewport.
 const start=img=>{if(!img.dataset.lazySrc)return;img.src=img.dataset.lazySrc;delete img.dataset.lazySrc;};
 const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){start(entry.target);observer.unobserve(entry.target);}},{rootMargin:window.DarayaNetwork?.low()?'0px':'200px'}):null;
 function scan(node){if(node.nodeType!==1)return;const images=[...(node.matches?.('img[data-lazy-src]')?[node]:[]),...node.querySelectorAll('img[data-lazy-src]')];for(const img of images)observer?observer.observe(img):start(img);}
 const mutations=new MutationObserver(records=>{for(const record of records){for(const node of record.removedNodes)if(node.nodeType===1&&!node.isConnected){if(node.matches?.('img'))observer?.unobserve(node);node.querySelectorAll('img').forEach(img=>observer?.unobserve(img));}record.addedNodes.forEach(scan);}});mutations.observe(document.body,{childList:true,subtree:true});scan(document.body);
 window.dispatchEvent(new Event('daraya-demand-ready'));
})();
