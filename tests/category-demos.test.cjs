const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(language='ar'){
 const nodes={},qr=[],banners=[];
 const node=selector=>nodes[selector]||(nodes[selector]={innerHTML:'',hidden:false,classList:{remove(){}},before(n){banners.push(n);}});
 const c={window:{ShahinI18n:{language},addEventListener(){},scrollTo(){},darayaHomeShowsResults:()=>true,darayaSectorKey:k=>k},location:{hash:'#example/restaurant',href:'https://damascus-shop.com/'},document:{querySelectorAll:selector=>selector==='[data-demo-add]'?Array.from({length:3},(_,i)=>{const n=node('add-'+i);n.dataset={demoAdd:String(i)};return n;}):selector==='[data-demo-item]'?Array.from({length:3},(_,i)=>{const n=node('item-'+i);n.dataset={demoItem:String(i)};return n;}):[],createElement:()=>({dataset:{}})},$:node,esc:v=>String(v??''),photo:(src,alt)=>'<img src="'+src+'" alt="'+alt+'">',money:n=>n+' SYP',URL,Blob,QRCode:class{static CorrectLevel={M:0};constructor(box,options){qr.push(options.text);this._oQRCode={getModuleCount:()=>1,isDark:()=>true};}},filter:'restaurant',search:'',browseFavorites:false,stores:[],matchesCategory:()=>true,directoryKind:s=>s.kind,renderHome(){},renderStore(){},render(){},updateCustomerNav(){},modal(){}};
 vm.createContext(c);vm.runInContext(fs.readFileSync('business-sectors.js','utf8').split('(() =>')[0],c);vm.runInContext(fs.readFileSync('category-demos.js','utf8'),c);
 return {c,nodes,qr,banners};
}
test('one showcase exists per sector except mosques, with three illustrated entries',()=>{
 const {c}=setup(),keys=c.window.DarayaDemos.keys();assert.equal(keys.length,15);assert.equal(new Set(keys).size,15);assert.ok(!keys.includes('mosque'));
 for(const key of keys){const rows=c.window.DarayaDemos.items[key];assert.equal(rows.length,3);for(const r of rows)assert.ok(fs.existsSync(r[5]),r[5]);}
});
test('all demo pages render with fictional address, correct QR URL and no real checkout',()=>{
 for(const lang of ['ar','en','de']){
  const {c,nodes,qr}=setup(lang);
  for(const key of c.window.DarayaDemos.keys()){
   c.location.hash='#example/'+key;c.render();const html=nodes['#app'].innerHTML;
   assert.ok(html.includes('data-demo-qr-code'));assert.ok(html.includes('data-demo-search'));assert.equal(qr.at(-1),'https://damascus-shop.com/#example/'+key);
   assert.ok(!html.includes('data-add='));assert.ok(!html.includes('tel:'));assert.ok(!html.includes('data-checkout'));
   assert.equal(html.includes('data-demo-basket'),!['doctor','pharmacy'].includes(key));
  }
 }
});
test('existing example listings are hidden but real stores and mosques stay available',()=>{
 const {c}=setup();assert.equal(c.matchesCategory({kind:'apparel',is_example:true},'apparel'),false);assert.equal(c.matchesCategory({kind:'apparel',is_example:false},'apparel'),true);assert.equal(c.matchesCategory({kind:'mosque',is_example:true},'mosque'),true);
});
test('the review demo shop is discoverable while other demo shops remain hidden',()=>{
 const {c}=setup();
 assert.equal(c.matchesCategory({id:'a5e8abe7-974a-416c-a570-858d6fd03572',kind:'restaurant',is_example:true},'restaurant'),true);
 assert.equal(c.matchesCategory({id:'another-demo',kind:'restaurant',is_example:true},'restaurant'),false);
});
test('category banner links to exactly one demo and leaves mosque section unchanged',()=>{
 const {c,banners}=setup();c.renderHome();assert.equal(banners.length,1);assert.equal(banners[0].href,'#example/restaurant');
 c.filter='mosque';c.renderHome();assert.equal(banners.length,1);
 c.filter='all';c.renderHome();assert.equal(banners.at(-1).href,'#examples');
 c.search='shop';c.renderHome();assert.equal(banners.length,2);
});

test('basket totals and product search are local demonstrations',()=>{
 const {c,nodes}=setup();c.render();nodes['add-0'].onclick();nodes['add-0'].onclick();nodes['add-1'].onclick();
 assert.match(nodes['[data-demo-basket]'].innerHTML,/215000 SYP/);
 nodes['[data-demo-clear]'].onclick();assert.match(nodes['[data-demo-basket]'].innerHTML,/0 SYP/);
 nodes['[data-demo-search]'].oninput({target:{value:'برغر'}});assert.equal(nodes['item-0'].hidden,true);assert.equal(nodes['item-1'].hidden,false);assert.equal(nodes['item-2'].hidden,true);
});
