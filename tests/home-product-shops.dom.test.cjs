const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const tick=()=>new Promise(r=>setTimeout(r,0));
function app(data,error=null,{rotation=false,reduced=false}={}){const dom=new JSDOM('<main id="app" class="professional-home"></main>',{url:'https://damascus-shop.com/#home',runScripts:'outside-only'}),w=dom.window,calls=[];w.search='';w.browseFavorites=false;w.stores=[{id:'real',name:'آيلا',active:true,is_example:false,image:'https://example.com/shop.jpg'},{id:'demo',name:'تجريبي',active:true,is_example:true},{id:'empty',name:'بلا منتجات',active:true,is_example:false}];w.renderHome=()=>w.document.querySelector('#app').innerHTML='<section class="simple-delivery-category">توصيل</section><section id="browse">الأقسام</section>';w.safeImage=x=>x;w.thumbnailForImage=x=>x;w.api={from(table){calls.push(['from',table]);const q={};for(const name of ['select','eq','is','order','limit'])q[name]=(...args)=>{calls.push([name,...args]);return q;};q.range=async()=>({data,error});return q;}};if(rotation){let id=0;w.rotationClock=0;w.rotationTimers=new Map();w.rotationFrames=new Map();w.Date.now=()=>w.rotationClock;w.setInterval=(fn,delay)=>{w.rotationTimers.set(++id,{fn,delay});return id;};w.clearInterval=id=>w.rotationTimers.delete(id);w.requestAnimationFrame=fn=>{w.rotationFrames.set(++id,fn);return id;};w.cancelAnimationFrame=id=>w.rotationFrames.delete(id);Object.defineProperty(w.document,'hidden',{get:()=>false,configurable:true});w.matchMedia=()=>({matches:reduced});}w.eval(fs.readFileSync('home-product-shops.js','utf8'));return {dom,w,calls,$:s=>w.document.querySelector(s)};}
test('real shops with products appear below delivery and before categories',async()=>{const a=app([{id:'real',products:[{id:'p',name:'قطعة ملابس',image:'https://example.com/p.jpg'}]},{id:'demo',products:[{id:'d'}]},{id:'empty',products:[]}]);try{a.w.renderHome();await tick();const section=a.$('[data-home-product-shops]');assert.equal(section.previousElementSibling.className,'simple-delivery-category');assert.equal(section.nextElementSibling.id,'browse');assert.equal(section.querySelectorAll('.home-product-shop-card').length,1);assert.match(section.textContent,/آيلا/);assert.doesNotMatch(section.textContent,/تجريبي|بلا منتجات/);assert.equal(section.querySelector('a').getAttribute('href'),'#store/real');assert.ok(a.calls.some(x=>x[0]==='limit'&&x[1]===3&&x[2].referencedTable==='products'));assert.ok(a.calls.some(x=>x[0]==='eq'&&x[1]==='is_example'&&x[2]===false));}finally{a.dom.window.close();}});
test('no eligible shops leaves no empty homepage section',async()=>{const a=app([]);try{a.w.renderHome();await tick();assert.equal(a.$('[data-home-product-shops]'),null);}finally{a.dom.window.close();}});
test('loading failure shows retry instead of claiming that no shops have products',async()=>{const a=app(null,{message:'offline'});try{a.w.renderHome();await tick();assert.match(a.$('[data-home-product-shops]').textContent,/تعذر تحميل/);assert.match(a.$('[data-home-product-shops] button').textContent,/إعادة المحاولة/);}finally{a.dom.window.close();}});

async function rotating(direction='ltr',reduced=false){
 const rows=['first','second','third'].map(id=>({id,products:[{name:id,image:'https://example.com/p.jpg'}]})),a=app(rows,null,{rotation:true,reduced});
 a.w.stores=rows.map(r=>({id:r.id,name:r.id,active:true,is_example:false}));a.w.renderHome();await tick();
 const list=a.$('.home-catalog-track');list.style.direction=direction;Object.defineProperties(list,{clientWidth:{value:100},scrollWidth:{value:300}});list.getBoundingClientRect=()=>({left:0,right:100,top:0,bottom:100});
 [...list.children].forEach((card,i)=>card.getBoundingClientRect=()=>{const left=(direction==='rtl'?-i:i)*100-list.scrollLeft;return {left,right:left+100,top:0,bottom:100};});
 a.advance=()=>{for(const {fn} of [...a.w.rotationTimers.values()])fn();};a.frame=time=>{const frames=[...a.w.rotationFrames.values()];a.w.rotationFrames.clear();frames.forEach(fn=>fn(time));};a.list=list;return a;
}
test('shops advance slowly in both directions and return to the first at the end',async()=>{
 for(const direction of ['ltr','rtl']){const a=await rotating(direction);try{
 assert.equal([...a.w.rotationTimers.values()][0].delay,6000);a.advance();a.frame(0);a.frame(800);assert.equal(Math.abs(a.list.scrollLeft),50);a.frame(1600);assert.equal(a.list.scrollLeft,direction==='rtl'?-100:100);assert.equal(a.list.classList.contains('is-auto-scrolling'),false);
 a.list.scrollLeft=direction==='rtl'?-200:200;a.advance();a.frame(2000);a.frame(3600);assert.equal(a.list.scrollLeft,0);
 }finally{a.dom.window.close();}}
});
test('manual pause and a held touch stop movement, with a delay after interaction',async()=>{
 const a=await rotating();try{const button=a.$('.home-catalog-motion');button.click();assert.equal(button.getAttribute('aria-pressed'),'true');a.w.rotationClock=20000;a.advance();assert.equal(a.w.rotationFrames.size,0);button.click();a.w.rotationClock=31000;
 a.list.dispatchEvent(new a.w.Event('pointerdown'));a.w.rotationClock=50000;a.advance();assert.equal(a.w.rotationFrames.size,0);
 a.w.dispatchEvent(new a.w.Event('pointerup'));a.advance();assert.equal(a.w.rotationFrames.size,0);a.w.rotationClock=61000;a.advance();assert.equal(a.w.rotationFrames.size,1);
 }finally{a.dom.window.close();}
});
test('rerender replaces the timer, navigation cleans it up and reduced motion does not rotate',async()=>{
 const a=await rotating();try{assert.equal(a.w.rotationTimers.size,1);a.w.renderHome();assert.equal(a.w.rotationTimers.size,1);a.w.location.hash='#store/first';a.w.dispatchEvent(new a.w.Event('hashchange'));assert.equal(a.w.rotationTimers.size,0);assert.equal(a.w.rotationFrames.size,0);}finally{a.dom.window.close();}
 const reduced=await rotating('rtl',true);try{assert.equal(reduced.w.rotationTimers.size,0);assert.equal(reduced.$('.home-catalog-motion'),null);}finally{reduced.dom.window.close();}
});
