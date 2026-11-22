const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
test('catalog filters combine section, search and price without losing cart controls or section handlers',async()=>{
 const dom=new JSDOM('<main id="app"><div><nav class="menu-sections"><button data-section="shirts">قمصان</button></nav><div class="products"></div></div></main>',{url:'https://example.com/#store/s',runScripts:'outside-only'});const w=dom.window;
 w.products=[{id:'1',store_id:'s',name:'قميص',price:200,image:'photo',created_at:'2026-01-01'},{id:'2',store_id:'s',name:'بنطال',price:100,translations:{_catalog:{added_at:'2026-02-01'}}},{id:'3',store_id:'s',name:'قميص قديم',price:null}];w.productSection='all';w.renderStore=()=>{};
 const grid=w.document.querySelector('.products');for(const p of w.products){const card=w.document.createElement('article');card.className='product';card.dataset.productId=p.id;card.dataset.productSection=p.id==='2'?'trousers':'shirts';card.innerHTML='<button data-add="'+p.id+'">إضافة</button>';grid.append(card);}
 let sectionFound=false;w.document.querySelector('[data-section]').onclick=()=>{w.productSection='shirts';sectionFound=grid.previousElementSibling.matches('.menu-sections');};
 w.eval(fs.readFileSync('product-filters.js','utf8'));
 const input=(name,value)=>{const e=w.document.querySelector('[name='+name+']');e.value=value;e.dispatchEvent(new w.Event('input',{bubbles:true}));};
 const visible=()=>[...grid.children].filter(c=>!c.hidden).map(c=>c.dataset.productId);
 input('sort','low');assert.deepEqual(visible(),['2','1','3']);input('min','150');assert.deepEqual(visible(),['1']);input('max','100');assert.deepEqual(visible(),[]);assert.equal(w.document.querySelector('[data-filter-error]').hidden,false);
 w.document.querySelector('[data-reset-filters]').click();assert.deepEqual(visible(),['1','2','3']);input('sort','new');assert.deepEqual(visible(),['2','1','3']);assert.equal(w.document.querySelector('[data-date-note]').hidden,false);
 w.document.querySelector('[data-section]').click();await new Promise(r=>setTimeout(r,20));assert.equal(sectionFound,true);assert.deepEqual(visible(),['1','3']);input('search','قديم');assert.deepEqual(visible(),['3']);input('min','0');assert.deepEqual(visible(),[]);assert.equal(grid.querySelectorAll('[data-add]').length,3);
 assert.equal(w.DarayaProductFilters.match({name:'مجاني',price:0}, {search:'',min:'0',max:'0',photos:false,priced:true}),true);
 dom.window.close();
});
