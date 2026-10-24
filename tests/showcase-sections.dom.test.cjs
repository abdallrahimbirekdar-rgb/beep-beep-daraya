const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
function app(key='restaurant',language='ar'){
 const dom=new JSDOM('<main id="app"></main><button id="account"></button><a id="dashboard-link"></a>',{url:'https://damascus-shop.com/#example/'+key,runScripts:'outside-only',pretendToBeVisual:true}),c=dom.window;
 c.ShahinI18n={language};c.DARAYA_SECTORS=[['restaurant','مطعم','Restaurant','Restaurant'],['apparel','ملابس','Clothes','Kleidung']];
 c.$=s=>c.document.querySelector(s);c.esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');c.money=n=>n+' SYP';
 c.matchesCategory=()=>true;c.renderStore=()=>{};c.renderHome=()=>{};c.render=()=>{};c.directoryKind=s=>s.kind;c.stores=[];c.filter='restaurant';c.search='';c.browseFavorites=false;
 c.matchMedia=()=>({matches:true});c.scrollTo=()=>{};c.HTMLElement.prototype.scrollIntoView=function(){c.lastScroll=this;};c.modal=html=>{c.lastModal=html;};c.parsePlaceVideo=()=>({});c.videoSurface=()=>c.document.createElement('div');c.videoLinkError=()=>'';
 c.QRCode=class{static CorrectLevel={M:0};constructor(){this._oQRCode={getModuleCount:()=>1,isDark:()=>true};}};c.DarayaCatalogPdf={open(){c.pdfOpened=true;}};
 for(const file of ['showcase-products.js','category-demos.js','demo-owner-features.js','showcase-layout.js'])c.eval(fs.readFileSync(file,'utf8'));
 c.render();return {dom,c,$:c.$};
}
test('pizza demo shows four entry cards immediately after its hero, with actual pizza photos',()=>{
 const a=app();assert.match(a.$('h1').textContent,/بيتزا التنور/);const nav=a.$('.showcase-section-cards');assert.equal(nav.children.length,4);assert.equal(nav.previousElementSibling,a.$('.demo-hero'));assert.equal(a.$('.demo-hero .demo-actions'),null);assert.equal(nav.querySelectorAll('img').length,4);assert.match(nav.querySelector('img').src,/images\/showcase\/pizza-/);
 for(const card of nav.children){card.click();const target=a.c.document.getElementById(card.getAttribute('aria-controls'));assert.equal(a.c.lastScroll,target);assert.equal(a.c.document.activeElement,target);}
 assert.equal(a.$('.showcase-owner-tools').open,true);assert.equal(a.$('.showcase-owner-tools').firstElementChild.tagName,'SUMMARY');a.dom.window.close();
});
test('moving demo controls preserves search, basket, contact, offer and PDF actions',()=>{
 const a=app();a.$('[data-demo-add]').click();assert.match(a.$('[data-demo-basket]').textContent,/SYP/);a.$('[data-demo-contact]').click();assert.match(a.c.lastModal,/طرق التواصل/);a.$('[data-demo-offer]').click();assert.match(a.$('[data-demo-offer-status]').textContent,/المحاكاة/);a.$('[data-demo-pdf]').click();assert.equal(a.c.pdfOpened,true);
 const input=a.$('[data-demo-search]');input.value='بيبروني';input.dispatchEvent(new a.c.Event('input'));assert.ok([...a.c.document.querySelectorAll('[data-demo-item]')].some(n=>n.hidden));assert.ok([...a.c.document.querySelectorAll('[data-demo-item]')].some(n=>!n.hidden));a.dom.window.close();
});
test('all rich demo types and languages retain four working cards without duplicates on rerender',()=>{
 for(const key of ['restaurant','apparel','syrian'])for(const lang of ['ar','en','de']){const a=app(key,lang);a.c.render();assert.equal(a.c.document.querySelectorAll('.showcase-section-cards').length,1);assert.equal(a.$('.showcase-section-cards').children.length,4);assert.ok(a.$('#showcase-contact [data-demo-contact]'));assert.ok(a.$('#showcase-tools [data-demo-qr-code]'));a.dom.window.close();}
});
