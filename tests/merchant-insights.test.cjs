const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function harness(){
 const calls=[],s={id:'shop',active:true,online_ordering:true},p={id:'product',store_id:'shop'},cart={};
 const c={Intl,Date,Number,String,Set,console,communityLang:()=> 'en',ct:(ar,en)=>en,esc:x=>String(x??'').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),
 api:{rpc:async(name,args)=>{calls.push({name,args});return{data:{},error:null}}},admin:false,mine:()=>[],communityEventSession:'existing-session',
 communityRecord:async()=>{},renderStore:()=>{},addLine:(p)=>{if(c.blocked)return;cart[p.id]={quantity:(cart[p.id]?.quantity||0)+1};c.cartStore=p.store_id;},
 gallery:()=>{},lineKey:id=>id,cart,cartStore:null,stores:[s],products:[p],$:selector=>null,location:{hash:'#store/shop'},
 document:{addEventListener:()=>{},querySelectorAll:()=>[]}};
 vm.createContext(c);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../merchant-insights.js'),'utf8'),c);
 return {c,calls,s,p};
}
test('successful cart addition records the existing session and product only',async()=>{
 const {c,calls,p}=harness();c.addLine(p);await new Promise(r=>setImmediate(r));assert.equal(calls.length,1);
 assert.equal(calls[0].name,'record_merchant_interest');assert.equal(calls[0].args.p_kind,'cart_add');assert.equal(calls[0].args.p_session,'existing-session');assert.equal(calls[0].args.p_item,'product');
});
test('blocked cart addition records no event',async()=>{
 const {c,calls,p}=harness();c.blocked=true;c.addLine(p);await new Promise(r=>setImmediate(r));assert.equal(calls.length,0);
});
test('repeat activity in the same session/day is deduplicated',async()=>{
 const {c,calls,s}=harness();await c.merchantInterest(s,'cart_add','product');await c.merchantInterest(s,'cart_add','product');assert.equal(calls.length,1);
});
test('owners and admins are excluded',async()=>{
 const {c,calls,s}=harness();c.admin=true;await c.merchantInterest(s,'product_view','product');c.admin=false;c.mine=()=>[s];await c.merchantInterest(s,'product_view','product');assert.equal(calls.length,0);
});
test('failed event can retry',async()=>{
 const {c,calls,s}=harness();c.api.rpc=async()=>{calls.push(1);return {error:{code:'offline'}}};await c.merchantInterest(s,'cart_add','product');await c.merchantInterest(s,'cart_add','product');assert.equal(calls.length,2);
});
test('zero baseline is described without infinite growth',()=>{
 const {c}=harness();assert.equal(c.merchantInsightChange(8,0),'Activity started in this period');assert.equal(c.merchantInsightChange(0,0),'No activity in either period');assert.equal(c.merchantInsightChange(15,10),'Up 50% from the previous period');
});
test('product names are escaped, separate rankings reflect interest, info pages omit ordering stats',()=>{
 const {c,s}=harness(),data={current:{view:5},products:[{name:'<script>',views:1,carts:8,photos:2},{name:'Most viewed',views:9,carts:1,photos:0}],orders:{total:2,completed:1,cancelled:1}};
 const html=c.merchantInsightHTML(data,s);assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('Completed'));
 const info=c.merchantInsightHTML(data,{online_ordering:false});assert.ok(!info.includes('Recorded orders'));assert.ok(!info.includes('Products most added to cart'));
});
