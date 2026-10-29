const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
function app(key='restaurant',language='ar',ordering=false){
 const dom=new JSDOM('<main id="app"></main><button id="account"></button><a id="dashboard-link"></a>',{url:'https://damascus-shop.com/#example/'+key,runScripts:'outside-only',pretendToBeVisual:true}),c=dom.window;
 c.ShahinI18n={language};c.DARAYA_SECTORS=[['restaurant','مطعم','Restaurant','Restaurant'],['apparel','ملابس','Clothes','Kleidung']];
 c.$=s=>c.document.querySelector(s);c.esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');c.money=n=>n+' SYP';
 c.matchesCategory=()=>true;c.renderStore=()=>{};c.renderHome=()=>{};c.render=()=>{};c.directoryKind=s=>s.kind;c.stores=[];c.filter='restaurant';c.search='';c.browseFavorites=false;
 c.matchMedia=()=>({matches:true});c.scrollTo=()=>{};c.HTMLElement.prototype.scrollIntoView=function(){c.lastScroll=this;};c.modal=html=>{c.lastModal=html;};c.parsePlaceVideo=()=>({});c.videoSurface=()=>c.document.createElement('div');c.videoLinkError=()=>'';
 c.QRCode=class{static CorrectLevel={M:0};constructor(){this._oQRCode={getModuleCount:()=>1,isDark:()=>true};}};c.DarayaCatalogPdf={open(){c.pdfOpened=true;}};
 for(const file of ['section-menus.js','shop-section-view.js','showcase-products.js','category-demos.js','demo-owner-features.js','showcase-layout.js'])c.eval(fs.readFileSync(file,'utf8'));
 if(ordering)c.eval(fs.readFileSync('demo-ordering.js','utf8'));c.render();return {dom,c,$:c.$};
}
test('pizza demo shows four entry cards immediately after its hero, with actual pizza photos',()=>{
 const a=app();assert.match(a.$('h1').textContent,/بيتزا التنور/);const nav=a.$('.showcase-section-cards');assert.equal(nav.children.length,4);assert.equal(nav.previousElementSibling,a.$('.demo-hero'));assert.equal(a.$('.demo-hero .demo-actions'),null);assert.equal(nav.querySelectorAll('img:not([hidden])').length,1);assert.ok(nav.querySelector('.sf-tile-slideshow'));assert.match(nav.querySelector('img').src,/images\/showcase\/pizza-/);
 for(const card of nav.children){card.click();const target=a.c.document.getElementById(card.getAttribute('aria-controls'));assert.equal(a.c.lastScroll,a.$('.sf-section-return'));assert.equal(a.c.document.activeElement,target);}
 assert.equal(a.$('.showcase-owner-tools').open,true);assert.equal(a.$('.showcase-owner-tools').firstElementChild.tagName,'SUMMARY');a.dom.window.close();
});
test('moving demo controls preserves search, basket, contact, offer and PDF actions',()=>{
 const a=app();a.$('[data-demo-add]').click();assert.match(a.$('[data-demo-basket]').textContent,/SYP/);a.$('[data-demo-contact]').click();assert.match(a.c.lastModal,/طرق التواصل/);a.$('[data-demo-offer]').click();assert.match(a.$('[data-demo-offer-status]').textContent,/المحاكاة/);a.$('[data-demo-pdf]').click();assert.equal(a.c.pdfOpened,true);
 const input=a.$('[data-demo-search]');input.value='بيبروني';input.dispatchEvent(new a.c.Event('input'));assert.ok([...a.c.document.querySelectorAll('[data-demo-item]')].some(n=>n.hidden));assert.ok([...a.c.document.querySelectorAll('[data-demo-item]')].some(n=>!n.hidden));a.dom.window.close();
});
test('all rich demo types and languages retain four working cards without duplicates on rerender',()=>{
 for(const key of ['restaurant','apparel','syrian'])for(const lang of ['ar','en','de']){const a=app(key,lang);a.c.render();assert.equal(a.c.document.querySelectorAll('.showcase-section-cards').length,1);assert.equal(a.$('.showcase-section-cards').children.length,4);assert.ok(a.$('#showcase-contact [data-demo-contact]'));assert.ok(a.$('#showcase-tools [data-demo-qr-code]'));a.dom.window.close();}
});
test('QR demo arrival shows only cards; products and basket open together and tools stay closed',()=>{
 const a=app(),hidden=n=>n.classList.contains('sf-section-collapsed');
 for(const id of ['showcase-products','showcase-contact','showcase-offers','showcase-tools'])assert.ok(hidden(a.$('#'+id)));
 assert.ok(hidden(a.$('.demo-basket')));assert.equal(a.$('.sf-section-return').hidden,true);
 a.$('[data-target="showcase-products"]').click();assert.ok(!hidden(a.$('#showcase-products')));assert.ok(!hidden(a.$('.demo-basket')));assert.ok(hidden(a.$('#showcase-tools')));assert.ok(hidden(a.$('.showcase-section-cards')));
 a.$('.sf-section-return').click();assert.ok(hidden(a.$('.demo-basket')));assert.ok(!hidden(a.$('.showcase-section-cards')));
 a.$('[data-target="showcase-tools"]').click();assert.ok(!hidden(a.$('#showcase-tools')));assert.equal(a.$('#showcase-tools').open,true);assert.ok(hidden(a.$('#showcase-products')));a.dom.window.close();
});

test('the full pizza order demo keeps its late cart strip within the products section',async()=>{
 const a=app('restaurant','ar',true);await new Promise(r=>setTimeout(r,0));const collapsed=n=>n.classList.contains('sf-section-collapsed');
 assert.ok(collapsed(a.$('.demo-cart-strip')));assert.ok(collapsed(a.$('.demo-dispatch-workspace')));
 a.$('[data-target="showcase-products"]').click();a.$('[data-demo-add]').click();assert.equal(a.$('.demo-cart-strip').hidden,false);assert.ok(!collapsed(a.$('.demo-cart-strip')));a.$('[data-open-demo-basket]').click();assert.equal(a.$('.demo-basket').hidden,false);assert.ok(!collapsed(a.$('.demo-basket')));assert.ok(a.$('[data-demo-checkout]'));
 a.$('.sf-section-return').click();assert.ok(collapsed(a.$('.demo-cart-strip')));assert.ok(collapsed(a.$('.demo-basket')));a.$('[data-target="showcase-tools"]').click();assert.ok(!collapsed(a.$('.demo-dispatch-workspace')));a.dom.window.close();
});

test('pizza owner demo adds a driver by name and phone, shows a demo code and completes assigned delivery',()=>{
 const a=app('restaurant','ar',true);try{
 a.$('[data-target="showcase-tools"]').click();
 a.$('[data-dispatch-body] [data-section-key=drivers]').click();const f=a.$('[data-add-demo-driver]');assert.ok(f);assert.equal(f.elements.email,undefined);assert.equal(f.querySelectorAll('input').length,2);
 f.elements.name.value='<img src=x onerror=bad>';f.dispatchEvent(new a.c.Event('submit',{bubbles:true,cancelable:true}));
 assert.equal(a.$('[data-demo-driver-code]').value,'0000 0000 0000');assert.equal(a.$('[data-accept-demo-driver]'),null);assert.match(a.$('.demo-driver-card').textContent,/جاهز/);assert.equal(a.$('.demo-driver-card img'),null);
 a.$('[data-dispatch-body] .section-menu-back').click();a.$('[data-dispatch-body] [data-section-key=orders]').click();a.$('[data-seed-demo-order]').click();assert.equal(a.$('[data-assign-demo-driver]').disabled,false);a.$('[data-assign-demo-driver]').click();assert.match(a.$('[data-assign-demo-driver]').textContent,/تم حفظ/);
 a.$('[data-owner-prepare]').click();a.$('[data-owner-prepare]').click();a.$('[data-dispatch-view="driver"]').click();assert.ok(a.$('[data-driver-advance]'));a.$('[data-driver-advance]').click();a.$('[data-driver-advance]').click();assert.match(a.$('[data-dispatch-body]').textContent,/تم تسليم الطلب/);
 }finally{a.dom.window.close();}
});
test('demo tool shortcuts and help keep working in Arabic, English and German',()=>{
 for(const lang of ['ar','en','de']){const a=app('restaurant',lang,true);try{
 a.$('[data-target="showcase-tools"]').click();const tools=a.$('[data-dispatch-body] .section-menu-grid');assert.equal(tools.querySelectorAll('button').length,3);
 a.$('[data-dispatch-body] [data-section-key=drivers]').click();assert.equal(a.$('[data-demo-driver-setup]').hidden,false);assert.equal(a.$('[data-demo-customer-orders]').hidden,true);assert.equal(a.$('[data-add-demo-driver] input[type=email]'),null);
 a.$('[data-dispatch-body] .section-menu-back').click();a.$('[data-dispatch-body] [data-section-key=orders]').click();assert.equal(a.$('[data-demo-customer-orders]').hidden,false);
 a.$('[data-dispatch-body] .section-menu-back').click();a.$('[data-dispatch-body] [data-section-key=delivery]').click();assert.equal(a.$('[data-demo-delivery-settings]').hidden,false);
 const copy=a.$('.demo-dispatch-workspace').textContent;assert.equal(/[\u0621-\u064a]/.test(copy),lang==='ar');assert.ok(a.$('.demo-tool-help summary'));
 }finally{a.dom.window.close();}}
});
