'use strict';
// Public catalog loads only the opened shop and the persisted basket shop.
(() => {
 const TTL=60000, loaded=new Map();
 let fullLoaded=false, navigation=false, pending=false, identity=null, storeCache=null;
 const columns='id,store_id,name,description,price,image,available,translations,section,gallery,option_groups,revision,stock_tracking';
 const management=()=>!!user&&location.hash.startsWith('#dashboard');
 const valid=id=>typeof id==='string'&&/^[0-9a-f-]{36}$/i.test(id);
 function ids(){const result=new Set();const route=location.hash.slice(1).split('/');if(route[0]==='store'&&valid(route[1]))result.add(route[1]);if(valid(cartStore))result.add(cartStore);else{try{const saved=JSON.parse(localStorage.getItem('shahin-cart'));if(valid(saved?.cartStore))result.add(saved.cartStore);}catch{}}return [...result];}
 async function pages(build){const rows=[];for(let offset=0;;offset+=1000){const r=await build().range(offset,offset+999);if(r.error)throw r.error;rows.push(...(r.data||[]));if((r.data||[]).length<1000)return rows;}}
 async function fetchStores(build){const uid=user?.id||'public';if(navigation&&!management()&&storeCache?.uid===uid&&Date.now()-storeCache.at<TTL)return {data:JSON.parse(storeCache.json)};const rows=await pages(build);storeCache={uid,at:Date.now(),json:JSON.stringify(rows)};return {data:rows};}
 async function fetchProducts(){
  const uid=user?.id||'public';if(identity!==uid){identity=uid;loaded.clear();fullLoaded=false;products=[];}
  const all=management();const scope=ids();
  if(all){products=await pages(()=>api.from('products').select(columns).order('id'));fullLoaded=true;for(const p of products)loaded.set(p.store_id,Date.now());return {data:products};}
  fullLoaded=false;
  const wanted=scope.filter(id=>!navigation||Date.now()-(loaded.get(id)||0)>=TTL);
  if(wanted.length){const rows=await pages(()=>api.from('products').select(columns).in('store_id',wanted).order('id'));products=products.filter(p=>!wanted.includes(p.store_id)).concat(rows);wanted.forEach(id=>loaded.set(id,Date.now()));}
  // Keep the basket even when moving between shops; discard other unused catalogs.
  products=products.filter(p=>scope.includes(p.store_id));for(const id of loaded.keys())if(!scope.includes(id))loaded.delete(id);
  return {data:products};
 }
 function deferRender(){
  if(!api||passwordRecovery)return false;
  const route=location.hash.slice(1).split('/');
  const needed=route[0]==='dashboard'&&user&&!fullLoaded||route[0]==='store'&&valid(route[1])&&Date.now()-(loaded.get(route[1])||0)>=TTL;
  if(!needed)return false;
  if(!pending){pending=true;navigation=true;const requestedHash=location.hash;$('#app').innerHTML='<section class="panel" role="status"><p>جاري تحميل بيانات الصفحة…</p></section>';
   reload().then(()=>{pending=false;navigation=false;render();}).catch(()=>{pending=false;navigation=false;fullLoaded=false;loaded.delete(route[1]);if(location.hash!==requestedHash){render();return;}$('#app').innerHTML='<section class="panel"><p>تعذر تحميل البيانات. حاول مرة أخرى.</p><button id="retry-demand">إعادة المحاولة</button></section>';$('#retry-demand').onclick=()=>render();});
  }return true;
 }
 window.DarayaDemand={fetchStores,fetchProducts,deferRender,ids,pages,get navigation(){return navigation;},get management(){return management();}};
 const previousRepeat=repeatOrder;repeatOrder=async function(order){try{const rows=await pages(()=>api.from('products').select(columns).eq('store_id',order.store_id).order('id'));products=products.filter(p=>p.store_id!==order.store_id).concat(rows);loaded.set(order.store_id,Date.now());const ids=rows.filter(p=>p.stock_tracking).map(p=>p.id);if(ids.length){const stock=await api.from('product_stock').select('product_id,variant_key,options,stock,revision').in('product_id',ids);if(stock.error)throw stock.error;for(const p of rows)p.stock_rows=(stock.data||[]).filter(x=>x.product_id===p.id);}window.ShahinI18n?.setCatalog?.(stores,products);previousRepeat(order);}catch{toast('تعذر تحميل المنتجات الحالية. أعد المحاولة.');}};
 // Search matching shop IDs rather than downloading every product and image URL.
 const searchCache=new Map();let timer=null,searchIds=new Set(),matchedTerm='',sequence=0;
 const previousMatches=matchesStore;matchesStore=function(store,term){return previousMatches(store,term)||(term.trim().toLowerCase()===matchedTerm&&searchIds.has(store.id));};
 const previousHome=renderHome;renderHome=function(){previousHome();clearTimeout(timer);const term=search.trim().toLowerCase();if(!term){sequence++;matchedTerm='';searchIds.clear();return;}if(matchedTerm===term)return;const seq=++sequence;timer=setTimeout(async()=>{try{let hit=searchCache.get(term);if(!hit||Date.now()-hit.at>120000){const pattern='%'+term.replace(/[%_,().*"\\]/g,' ')+'%';const fields=['name','description','translations->en->>name','translations->en->>description','translations->de->>name','translations->de->>description'];const rows=await pages(()=>api.from('products').select('id,store_id').eq('available',true).or(fields.map(f=>f+'.ilike.'+pattern).join(',')).order('id'));hit={at:Date.now(),ids:rows.map(p=>p.store_id)};if(searchCache.size>=20)searchCache.delete(searchCache.keys().next().value);searchCache.set(term,hit);}if(seq!==sequence||search.trim().toLowerCase()!==term||location.hash.startsWith('#store')||management())return;matchedTerm=term;searchIds=new Set(hit.ids);const input=$('#search'),focused=document.activeElement===input,pos=input?.selectionStart;renderHome();if(focused&&$('#search')){$('#search').focus();$('#search').setSelectionRange(pos,pos);}}catch{if(seq===sequence)toast('تعذر البحث في المنتجات. يمكنك إعادة المحاولة.');}},350);};
 // No image request before its position approaches the viewport.
 const start=img=>{if(!img.dataset.lazySrc)return;img.src=img.dataset.lazySrc;delete img.dataset.lazySrc;};
 const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){start(entry.target);observer.unobserve(entry.target);}},{rootMargin:'200px'}):null;
 function scan(node){if(node.nodeType!==1)return;const images=[...(node.matches?.('img[data-lazy-src]')?[node]:[]),...node.querySelectorAll('img[data-lazy-src]')];for(const img of images)observer?observer.observe(img):start(img);}
 const mutations=new MutationObserver(records=>{for(const record of records){for(const node of record.removedNodes)if(node.nodeType===1){if(node.matches?.('img'))observer?.unobserve(node);node.querySelectorAll('img').forEach(img=>observer?.unobserve(img));}record.addedNodes.forEach(scan);}});mutations.observe(document.body,{childList:true,subtree:true});scan(document.body);
 window.dispatchEvent(new Event('daraya-demand-ready'));
})();
