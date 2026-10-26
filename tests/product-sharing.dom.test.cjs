const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
function app(){
 const dom=new JSDOM('<main id="app"></main>',{url:'https://damascus-shop.com/#store/shop',runScripts:'outside-only'}),w=dom.window;
 w.stores=[{id:'shop',name:'متجر الاختبار',active:true,address:'داريا'}];w.products=[{id:'product',store_id:'shop',name:'منتج & اختبار',price:25000,available:true}];
 w.money=n=>n+' ل.س';w.directoryIsInfo=()=>false;w.merchantProducts=()=>{};w.dashboardProducts=()=>{};w.merchantDashboard=()=>{};w.toast=s=>w.lastToast=s;w.modal=s=>w.lastModal=s;
 w.renderStore=()=>w.document.querySelector('#app').innerHTML='<article class="product"><div><h3>منتج &amp; اختبار</h3><button data-add="product">إضافة</button></div></article>';
 w.eval(fs.readFileSync('merchant-promo.js','utf8'));w.renderStore('shop');return {dom,w,button:w.document.querySelector('.product-share-direct')};
}
test('visible product sharing uses device share options with exact product link and details',async()=>{const a=app();try{let payload;a.w.navigator.share=async p=>payload=p;assert.ok(a.button);assert.equal(a.button.closest('details'),null);await a.button.onclick();assert.equal(payload.title,'منتج & اختبار');assert.ok(payload.text.includes('25000 ل.س'));assert.ok(payload.text.includes('https://damascus-shop.com/#store/shop/product/product'));}finally{a.dom.window.close();}});
test('product sharing falls back to copying details when device sharing is unavailable',async()=>{const a=app();try{let copied;Object.defineProperty(a.w.navigator,'clipboard',{value:{writeText:async text=>copied=text}});await a.button.onclick();assert.ok(copied.includes('#store/shop/product/product'));assert.ok(a.w.lastToast.includes('تم نسخ'));}finally{a.dom.window.close();}});
