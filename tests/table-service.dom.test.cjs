const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../table-service.js'),'utf8');
const STORE='11111111-1111-4111-8111-111111111111',TABLE='22222222-2222-4222-8222-222222222222',PRODUCT='33333333-3333-4333-8333-333333333333',ORDER='44444444-4444-4444-8444-444444444444';
const tick=()=>new Promise(r=>setTimeout(r,0));
function setup(hash,loggedIn=false){
 const dom=new JSDOM('<main id="app"></main><dialog id="modal"><div id="modal-body"></div></dialog>',{url:'https://damascus-shop.com/'+hash,runScripts:'outside-only'}),w=dom.window;
 w.scrollTo=()=>{};w.passwordRecovery=false;w.user=loggedIn?{id:STORE}:null;w.admin=false;w.confirm=()=>true;
 w.esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');w.money=n=>n+' ل.س';w.photo=()=>'';w.toast=()=>{};
 w.selectionPrice=(p,options)=>{if(p.option_groups?.some(g=>g.required&&!options.some(x=>x.group===g.id)))return null;return p.price;};w.lineKey=(id,options)=>id+JSON.stringify(options);
 w.modal=html=>{w.document.querySelector('#modal-body').innerHTML=html;w.document.querySelector('#modal').setAttribute('open','');};w.document.querySelector('#modal').close=function(){this.removeAttribute('open');};
 w.render=()=>{w.document.querySelector('#app').innerHTML='<p data-normal>Normal route</p>';};w.merchantHref=(section,s)=>'#dashboard/'+section+'/'+s.id;w.directoryKind=()=> 'restaurant';w.merchantDashboard=()=>{w.document.querySelector('#app').innerHTML='<nav class="dashboard-menu-grid"></nav>';};
 w.setInterval=fn=>{w.poll=fn;return 1;};w.clearInterval=()=>{};
 w.QRCode=function(){this._oQRCode={getModuleCount:()=>21,isDark:(r,c)=>(r+c)%2===0};};w.QRCode.CorrectLevel={M:1};
 const menu={table_number:7,store:{id:STORE,name:'مطعم الاختبار'},products:[{id:PRODUCT,name:'وجبة',price:1000,section:'الوجبات',option_groups:[]}]};
 let board={store:menu.store,enabled:false,tables:[{id:TABLE,token:TABLE,number:7,active:true}],orders:[],history:[],history_total:0,page:0};const calls=[];let failure=null;
 w.api={rpc:async(name,args)=>{calls.push({name,args});if(failure&&name==='table_service_place')return {error:{message:'Network failed'}};
  if(name==='table_service_menu')return {data:structuredClone(menu)};
  if(name==='table_service_place')return {data:{id:ORDER,token:TABLE,total:1000}};
  if(name==='table_service_receipt')return {data:{...menu.store,id:ORDER,store_id:STORE,store_name:menu.store.name,table_number:7,created_at:new Date().toISOString(),status:'new',items:[{name:'وجبة',price:1000,quantity:1}],total:1000}};
  if(name==='table_service_owner'){
   if(!w.user)return {error:{message:'Forbidden'}};
   if(args.p_action==='settings')board.enabled=args.p_enabled;
   if(args.p_action==='status'){board.orders=board.orders.map(o=>o.id===args.p_order?{...o,status:args.p_status}:o);}
   return {data:structuredClone(board)};
  }
  throw Error(name);
 }};
 w.eval(source);return {dom,w,calls,menu,setFailure:v=>failure=v,setBoard:v=>board=v,board:()=>board};
}
test('guest orders without an account and without name, phone or delivery fields',async()=>{
 const h=setup('#table/'+TABLE),{w,dom,calls}=h;try{w.render();await tick();assert.equal(w.user,null);assert.match(w.document.querySelector('#app').textContent,/7/);w.document.querySelector('[data-ts-add]').click();w.document.querySelector('[data-ts-cart]').click();
 const form=w.document.querySelector('[data-ts-send]');assert.equal(form.querySelectorAll('input').length,0);form.elements.notes.value='بدون ملح';form.dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();await tick();
 const placed=calls.find(c=>c.name==='table_service_place');assert.ok(placed);assert.equal(placed.args.p_token,TABLE);assert.deepEqual(JSON.parse(JSON.stringify(placed.args.p_items)),[{id:PRODUCT,quantity:1,options:[]}]);assert.equal(placed.args.p_notes,'بدون ملح');assert.match(w.location.hash,/#table-receipt/);assert.match(w.document.querySelector('#app').textContent,/وصل طلبك/);
 }finally{dom.window.close();}
});
test('a retry reuses the request ID after an uncertain send',async()=>{
 const h=setup('#table/'+TABLE),{w,dom,calls}=h;try{w.render();await tick();w.document.querySelector('[data-ts-add]').click();w.document.querySelector('[data-ts-cart]').click();h.setFailure(true);
 const form=w.document.querySelector('[data-ts-send]');form.dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();form.dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();const sends=calls.filter(c=>c.name==='table_service_place');assert.equal(sends.length,2);assert.equal(sends[0].args.p_request,sends[1].args.p_request);assert.ok(w.document.querySelector('[data-ts-send-error]').textContent);
 }finally{dom.window.close();}
});
test('owner enables the optional feature and sees table/time/items in clear status lanes',async()=>{
 const h=setup('#table-service/'+STORE,true),{w,dom}=h;try{const b=h.board();b.orders=[{id:ORDER,table_number:7,created_at:new Date().toISOString(),status:'new',notes:'<img src=x onerror=alert(1)>',items:[{name:'وجبة',quantity:2,price:1000}],total:2000}];h.setBoard(b);
 w.render();await tick();assert.equal(w.document.querySelectorAll('.ts-lane').length,3);assert.equal(w.document.querySelector('.ts-ticket header strong').textContent,'7');assert.ok(w.document.querySelector('.ts-ticket time'));assert.equal(w.document.querySelector('.ts-notes img'),null);
 w.document.querySelector('[data-ts-tab="tables"]').click();assert.match(w.document.querySelector('[data-ts-action="toggle"]').textContent,/تفعيل/);w.document.querySelector('[data-ts-action="toggle"]').click();await tick();assert.equal(h.board().enabled,true);assert.ok(w.document.querySelector('[data-ts-qr] svg'));
 w.document.querySelector('[data-ts-tab="orders"]').click();w.document.querySelector('[data-ts-status="preparing"]').click();await tick();assert.equal(w.document.querySelector('.ts-lane-preparing .ts-ticket header strong').textContent,'7');
 }finally{dom.window.close();}
});
test('leaving a guest route clears the page-specific layout',async()=>{
 const {w,dom}=setup('#table/'+TABLE);try{w.render();await tick();w.location.hash='#home';w.render();await tick();assert.ok(w.document.querySelector('[data-normal]'));assert.equal(w.document.querySelector('#app').classList.contains('table-service-page'),false);assert.equal(w.document.querySelector('#app').hasAttribute('data-no-translate'),false);}finally{dom.window.close();}
});
test('owner route is gated and merchant menu links to the separate table dashboard',async()=>{
 const {w,dom,calls}=setup('#table-service/'+STORE);try{w.render();await tick();assert.equal(calls.length,0);assert.match(w.document.querySelector('#app').textContent,/سجّل الدخول/);w.merchantDashboard([],{id:STORE});assert.equal(w.document.querySelector('[data-ts-entry]').hash,'#table-service/'+STORE);}finally{dom.window.close();}
});
