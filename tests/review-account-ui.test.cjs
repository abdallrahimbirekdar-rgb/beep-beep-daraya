const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
let JSDOM;try{({JSDOM}=require('jsdom'));}catch{}
function setup(html,hash='#account'){
 const dom=new JSDOM('<main id="app">'+html+'</main>',{url:'https://damascus-shop.com/'+hash,runScripts:'outside-only'}),w=dom.window;
 Object.assign(w,{user:{id:'customer-id'},admin:false,api:{},ct:a=>a,esc:s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),render(){},renderHome(){},renderStore(){},renderDataRequests(){},dashboardAccounts(){},renderDashboard(){},toast(){},browseFavorites:false,stores:[]});
 w.requestAnimationFrame=fn=>setTimeout(fn,0);w.HTMLElement.prototype.scrollIntoView=function(){};
 return {dom,w,load:p=>w.eval(fs.readFileSync(p,'utf8'))};
}
const settle=()=>new Promise(r=>setTimeout(r,15));
test('account request history shows escaped admin replies, refreshes, and focuses the deletion form',{skip:!JSDOM},async()=>{
 const {dom,w,load}=setup('<form id="data-request-form"><select name="kind"><option value="correction">Correction</option><option value="deletion">Deletion</option></select><textarea name="note"></textarea></form>');let reads=0;
 w.document.querySelector('form').onsubmit=async()=>{};w.sessionStorage.setItem('daraya-deletion-request-focus','customer-id');
 w.api.from=()=>({select:()=>({eq:()=>({order:()=>({limit:async()=>{reads++;return {data:[{kind:'deletion',status:'pending',admin_reply:'<img src=x onerror=bad()>Need photo handling'}]};}})})})});
 load('customer-ux.js');await settle();assert.equal(w.document.querySelector('select').value,'deletion');assert.equal(w.sessionStorage.getItem('daraya-deletion-request-focus'),null);
 const box=w.document.querySelector('[data-request-history]');assert.match(box.textContent,/Need photo handling/);assert.equal(box.querySelector('img'),null);assert.match(box.textContent,/قيد المراجعة/);
 box.querySelector('button').click();await settle();assert.equal(reads,2);dom.window.close();
});
test('admin can save a request reply, with clear pending wording and escaped request text',{skip:!JSDOM},async()=>{
 const {dom,w,load}=setup('','#account-deletion-admin');w.admin=true;const calls=[];
 w.api.rpc=async(name,args)=>{calls.push({name,args});return name==='admin_account_deletion_requests'?{data:[{id:'request-id',user_id:'customer-id',email:'test@example.invalid',created_at:'2026-10-17T12:00:00Z',note:'<script>bad()</script>',admin_reply:''}]}:{data:null};};
 load('admin-account-deletion.js');await w.render();await settle();const form=w.document.querySelector('[data-reply-deletion]');assert.ok(form);assert.equal(w.document.querySelector('script'),null);
 form.elements.reply.value='Please finish the open order.';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settle();
 assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1))),{name:'admin_reply_account_deletion',args:{p_request:'request-id',p_reply:'Please finish the open order.'}});assert.match(form.textContent,/بانتظار إكمال الحذف/);dom.window.close();
});
test('ordinary user cannot open the admin request queue',{skip:!JSDOM},async()=>{
 const {dom,w,load}=setup('','#account-deletion-admin');let called=false;w.api.rpc=async()=>{called=true;return {data:[]};};load('admin-account-deletion.js');await w.render();assert.equal(called,false);dom.window.close();
});