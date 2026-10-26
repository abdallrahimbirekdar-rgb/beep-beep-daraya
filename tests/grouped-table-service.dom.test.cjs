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
test('table owner keeps its original tabs and visible order board',async()=>{const h=setup('#table-service/'+STORE,true),{w,dom}=h;try{w.HTMLElement.prototype.scrollIntoView=function(){};w.eval(fs.readFileSync('section-menus.js','utf8'));w.eval(fs.readFileSync('section-menu-integration.js','utf8'));w.render();await tick();await tick();const nav=w.document.querySelector('.ts-owner-tabs');assert.equal(nav.classList.contains('section-menu-grid'),false);assert.equal(nav.hidden,false);assert.equal(w.document.querySelector('[data-ts-owner-content]').hidden,false);assert.equal(w.document.querySelector('.section-menu-back'),null);w.document.querySelector('[data-ts-tab="tables"]').click();await tick();assert.equal(w.document.querySelector('.ts-owner-tabs').hidden,false);assert.ok(w.document.querySelector('[data-ts-create] input'));}finally{dom.window.close();}});
