const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
function app({kind='school',lang='ar',courses=true}={}){
 const dom=new JSDOM('<main id="app"></main><dialog id="modal"><div id="modal-body"></div></dialog>',{url:'https://damascus-shop.com/#store/school',runScripts:'outside-only',pretendToBeVisual:true}),c=dom.getInternalVMContext();
 const s={id:'school',active:true,name:kind==='school'?'الآنسة غنى حبيبة':'المحل',category:'shop',text_only:false,online_ordering:true,pickup_enabled:true,delivery_enabled:true,address:'مقابل المدرسة',description:'معلومات الصفحة',opening_hours:{},image:'https://example.com/cover.webp',contact_phone:'+963900000000',areas:['داريا'],translations:{_directory:{kind,mode:'business'}}};
 Object.assign(c,{stores:[s],products:courses?[{id:'course',store_id:s.id,name:'دورة رياضيات',description:'تعليم الرياضيات',available:true,price:0,image:'https://example.com/course.webp'}]:[],user:null,cart:{},cartStore:null,productSection:'all',gallery(){},reload:async()=>{},checkout(){c.checkoutCalled=true;},canStoreOrder:()=>true,merchantDashboard(){},merchantEditor(){},merchantProducts(){},editProduct(){},toast(){},mine:()=>[],$:x=>c.document.querySelector(x),esc:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),ct:(a,e,d)=>({ar:a,en:e,de:d}[lang]),money:n=>n+' SYP',storeCover:s=>s.image,photo:(url,alt,cls)=>'<img class="'+cls+'" src="'+url+'" alt="'+alt+'">',publicHours:()=>'',isStoreOpen:()=>true,storeStatus:()=>'',storeService:()=>'',renderCart(){},add(){},modal:html=>c.document.querySelector('#modal-body').innerHTML=html});
 c.matchMedia=()=>({matches:true});c.HTMLElement.prototype.scrollIntoView=()=>{};
 vm.runInContext(fs.readFileSync('directory.js','utf8').split('const directoryReadTranslations')[0],c);
 const appSource=fs.readFileSync('app.js','utf8');vm.runInContext(appSource.slice(appSource.indexOf('function showStoreAddress(s)'),appSource.indexOf('\nfunction add(id)')),c);
 c.storeCoordinates=()=>[33,36];
 c.oldRenderStore=c.renderStore;vm.runInContext(fs.readFileSync('features.js','utf8').split('\n').find(l=>l.startsWith('renderStore=function(id)')),c);
 const directorySource=fs.readFileSync('directory.js','utf8');vm.runInContext(directorySource.slice(directorySource.indexOf('const directoryRenderStore=renderStore;'),directorySource.indexOf('const directoryMerchantOverview')),c);
 for(const file of ['service-pages.js','store-compact.js','shop-section-view.js','storefront.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
 c.renderStore(s.id);return {dom,c,s,$:c.$};
}
test('school pages use an educational catalog and neutral contact details, without checkout or delivery',()=>{
 const a=app();assert.equal(a.s.text_only,true);assert.equal(a.s.online_ordering,false);assert.equal(a.$('#cart'),null);assert.equal(a.$('[data-add]'),null);assert.equal(a.$('.catalog-notice'),null);
 assert.match(a.$('.sf-information>h2').textContent,/الجهة التعليمية/);assert.match(a.$('[data-target="sf-products"] strong').textContent,/البرامج/);assert.match(a.$('.sf-catalog h2').textContent,/البرامج/);assert.ok(a.$('.sf-catalog .product-image'));assert.equal(a.$('.sf-catalog .price'),null);
 const text=a.$('#app').textContent;for(const bad of ['الشراء بزيارة المتجر','التوصيل والاستلام','عنوان المتجر:','تعرّف على المحل'])assert.ok(!text.includes(bad),bad);
 a.$('[data-target="sf-info"]').click();assert.equal(a.$('.sf-information').classList.contains('sf-section-collapsed'),false);assert.equal(a.$('.sf-section-return').textContent,'‹ العودة إلى أقسام الصفحة');a.c.showStoreAddress(a.s);assert.equal(a.$('#modal-body h2').textContent,'العنوان');a.c.checkout(a.s);assert.ok(!a.c.checkoutCalled);a.dom.window.close();
});
test('school without programs retains its contact section and all four entry cards',()=>{const a=app({courses:false});assert.equal(a.$('.sf-section-nav').children.length,4);assert.equal(a.$('[data-target="sf-products"]').disabled,true);assert.ok(a.$('.sf-contact-actions a[href^="tel:"]'));a.dom.window.close();});
test('retail pages retain shopping, delivery tabs and cart behavior',()=>{const a=app({kind:'shop'});assert.equal(a.s.text_only,false);assert.ok(a.$('#cart'));assert.ok(a.$('[data-add]'));assert.match(a.$('#app').textContent,/التوصيل والاستلام/);a.c.checkout(a.s);assert.equal(a.c.checkoutCalled,true);a.dom.window.close();});
test('service saves cannot turn schools back into shops and English/German titles are localized',()=>{
 const a=app();const f=new a.c.FormData();f.set('directory_kind','school');f.set('page_mode','business');const payload=a.c.directoryPagePayload(f,a.s);assert.equal(payload.text_only,true);assert.equal(payload.online_ordering,false);assert.equal(payload.delivery_enabled,false);assert.equal(payload.pickup_enabled,false);a.dom.window.close();
 for(const lang of ['en','de']){const b=app({lang});assert.ok(!/[\u0600-\u06ff]/.test(b.$('.sf-information>h2').textContent));assert.ok(!/[\u0600-\u06ff]/.test(b.$('[data-target="sf-products"] strong').textContent));b.dom.window.close();}
});

test('retail category changes keep the catalog open and show only matching products',()=>{
 const a=app({kind:'shop'});a.c.products=[{id:'set',store_id:a.s.id,name:'طقم نسائي',section:'أطقم نسائية',available:true,price:5},{id:'lingerie',store_id:a.s.id,name:'لانجري',section:'لانجري',available:true,price:7}];a.c.renderStore(a.s.id);
 a.$('[data-target="sf-products"]').click();
 for(const section of ['أطقم نسائية','لانجري','all','أطقم نسائية']){
  [...a.c.document.querySelectorAll('.menu-sections button')].find(b=>b.dataset.section===section).click();
  assert.equal(a.$('#sf-products').classList.contains('sf-section-collapsed'),false);
  assert.equal(a.$('.sf-section-nav').classList.contains('sf-section-collapsed'),true);
  assert.equal(a.$('.menu-sections .selected').dataset.section,section);
  assert.equal(a.$('.products').children.length,section==='all'?2:1);
  if(section!=='all')assert.match(a.$('.products').textContent,section==='لانجري'?/لانجري/:/طقم نسائي/);
  assert.equal(a.c.document.activeElement,a.$('.menu-sections .selected'));
 }
 a.$('.sf-section-return').click();assert.equal(a.$('.sf-section-nav').classList.contains('sf-section-collapsed'),false);a.dom.window.close();
});
