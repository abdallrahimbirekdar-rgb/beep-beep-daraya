'use strict';
(() => {
 const root=document.getElementById('app');if(!root)return;
 const states=new Map(),bound=new WeakSet();
 const defaults=()=>({search:'',sort:'default',min:'',max:'',photos:false,priced:false});
 const knownPrice=p=>p.price!==null&&p.price!==undefined&&p.price!==''&&Number.isFinite(Number(p.price));
 const added=p=>{const time=Date.parse(p.created_at||p.translations?._catalog?.added_at||'');return Number.isFinite(time)?time:null;};
 function match(p,state){
  const term=state.search.trim();
  if(term&&!(typeof matchesProduct==='function'?matchesProduct(p,term):(p.name+' '+(p.description||'')).toLocaleLowerCase().includes(term.toLocaleLowerCase())))return false;
  if((state.priced||state.min!==''||state.max!=='')&&!knownPrice(p))return false;
  if(state.min!==''&&Number(p.price)<Number(state.min)||state.max!==''&&Number(p.price)>Number(state.max))return false;
  return !state.photos||!!(p.image||p.gallery?.length);
 }
 function compare(a,b,sort){
  if(sort==='low'||sort==='high'){if(!knownPrice(a)||!knownPrice(b))return Number(knownPrice(b))-Number(knownPrice(a));return (Number(a.price)-Number(b.price))*(sort==='high'?-1:1);}
  if(sort==='new'||sort==='old'){const x=added(a),y=added(b);if(x===null||y===null)return Number(y!==null)-Number(x!==null);return (x-y)*(sort==='new'?-1:1);}
  return sort==='name'?String(a.name).localeCompare(String(b.name),'ar'):0;
 }
 function bind(){
  const grid=root.querySelector('.products');if(!grid||bound.has(grid))return;
  const cards=[...grid.querySelectorAll(':scope>.product[data-product-id],:scope>.product[data-promo-product-id]')];if(!cards.length)return;
  const first=products.find(p=>p.id===(cards[0].dataset.productId||cards[0].dataset.promoProductId));if(!first)return;
  bound.add(grid);const state=states.get(first.store_id)||defaults();states.set(first.store_id,state);
  const box=document.createElement('section');box.className='catalog-filters';box.dataset.noTranslate='';
  box.innerHTML='<div class="catalog-filter-primary"><label>ابحث ضمن المنتجات<input type="search" name="search" placeholder="اسم المنتج أو وصفه" autocomplete="off"></label><label>الترتيب<select name="sort"><option value="default">ترتيب المحل</option><option value="low">السعر من الأقل للأعلى</option><option value="high">السعر من الأعلى للأقل</option><option value="new">الأحدث إضافة</option><option value="old">الأقدم إضافة</option><option value="name">الاسم أبجديًا</option></select></label></div><details><summary>تصفية المنتجات <span data-active-count></span></summary><div class="catalog-filter-options"><label>السعر من — ل.س<input name="min" type="number" inputmode="decimal" min="0" step="any" placeholder="بدون حد"></label><label>إلى — ل.س<input name="max" type="number" inputmode="decimal" min="0" step="any" placeholder="بدون حد"></label><label class="catalog-filter-check"><input name="photos" type="checkbox">مع صور فقط</label><label class="catalog-filter-check"><input name="priced" type="checkbox">بسعر معلن فقط</label></div></details><div class="catalog-filter-status"><span role="status" data-results></span><button type="button" class="outline" data-reset-filters>مسح الفلاتر</button></div><p data-filter-error role="alert" hidden>السعر الأدنى أكبر من الأعلى. عدّل مجال السعر.</p><small data-date-note hidden>المنتجات التي لا يتوفر تاريخ إضافتها تظهر في نهاية القائمة.</small><small data-price-note hidden>الترتيب حسب السعر الأساسي للمنتج، قبل إضافات المقاس أو الخيارات.</small>';
  const categories=grid.previousElementSibling;
  if(categories?.matches('.menu-sections'))categories.before(box);else grid.before(box);
  for(const key of ['search','sort','min','max'])box.querySelector('[name='+key+']').value=state[key];
  for(const key of ['photos','priced'])box.querySelector('[name='+key+']').checked=state[key];
  const empty=document.createElement('div');empty.className='empty';empty.textContent='لا توجد منتجات تطابق اختياراتك. جرّب توسيع مجال السعر أو مسح الفلاتر.';empty.hidden=true;grid.after(empty);
  const rows=cards.map((card,index)=>({card,index,p:products.find(p=>p.id===(card.dataset.productId||card.dataset.promoProductId))})).filter(row=>row.p);
  function apply(){
   const invalid=state.min!==''&&state.max!==''&&Number(state.min)>Number(state.max);
   box.querySelector('[data-filter-error]').hidden=!invalid;
   let count=0;
   const section=typeof productSection==='string'?productSection:'all';
   for(const {card,p} of rows){card.hidden=invalid||!match(p,state)||(section!=='all'&&card.dataset.productSection!==section);if(!card.hidden)count++;}
   const sorted=rows.slice().sort((a,b)=>compare(a.p,b.p,state.sort)||a.index-b.index);
   for(let i=0;i<sorted.length;i++)if(grid.children[i]!==sorted[i].card)grid.insertBefore(sorted[i].card,grid.children[i]||null);
   empty.hidden=count>0;box.querySelector('[data-results]').textContent=count+' منتج من '+rows.length;
   const active=['min','max','search'].filter(k=>state[k]!=='').length+Number(state.photos)+Number(state.priced);
   box.querySelector('[data-active-count]').textContent=active?'('+active+')':'';
   box.querySelector('[data-date-note]').hidden=!['new','old'].includes(state.sort)||!rows.some(r=>added(r.p)===null);
   box.querySelector('[data-price-note]').hidden=!['low','high'].includes(state.sort)&&state.min===''&&state.max==='';
  }
  box.addEventListener('input',event=>{const el=event.target;if(!el.name)return;state[el.name]=el.type==='checkbox'?el.checked:el.value;apply();});
  box.addEventListener('change',event=>{if(event.target.tagName==='SELECT'){state[event.target.name]=event.target.value;apply();}});
  box.querySelector('[data-reset-filters]').onclick=()=>{Object.assign(state,defaults());for(const input of box.querySelectorAll('input,select')){if(input.type==='checkbox')input.checked=false;else input.value=state[input.name];}apply();};
  grid.parentElement.querySelectorAll('[data-section]').forEach(button=>button.addEventListener('click',()=>queueMicrotask(apply)));
  apply();
 }
 let queued=false;new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(()=>{queued=false;bind();});}}).observe(root,{childList:true,subtree:true});
 const previous=renderStore;renderStore=function(){const result=previous.apply(this,arguments);bind();return result;};
 window.DarayaProductFilters={match,compare};bind();
})();
