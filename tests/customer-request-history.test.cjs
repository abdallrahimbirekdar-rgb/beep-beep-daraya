const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(){
 const frames=[],statuses=[];let observer,queries=0,submissions=0;
 const changed=()=>observer?.();
 const form={dataset:{},hasAttribute(name){return name==='data-request-tracking'&&Object.hasOwn(this.dataset,'requestTracking');},after(node){statuses.push(node);changed();},onsubmit:async()=>{submissions++;}};
 let currentForm=form;
 const context={window:{ShahinI18n:{language:'de'}},renderHome(){},renderStore(){},user:{id:'customer-a'},api:{from(name){assert.equal(name,'customer_data_requests');queries++;const q={select(){return q;},eq(){return q;},order(){return q;},async limit(){return {data:[{kind:'correction',status:'pending'}]};}};return q;}},document:{querySelector(selector){return selector==='#data-request-form'?currentForm:selector==='#app'?{}:null;},querySelectorAll(){return [];},createElement(){const node={dataset:{},isConnected:true,setAttribute(){}};Object.defineProperty(node,'innerHTML',{get(){return this.html||'';},set(value){this.html=value;changed();}});return node;}},requestAnimationFrame:fn=>frames.push(fn),MutationObserver:class{constructor(fn){observer=fn;}observe(){}}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('customer-ux.js','utf8'),context);
 async function settle(){for(let i=0;i<20;i++){await Promise.resolve();const pending=frames.splice(0);for(const fn of pending)fn();}}
 return {context,form,statuses,settle,changed,queries:()=>queries,submissions:()=>submissions,replace(){currentForm={...form,dataset:{}};changed();return currentForm;}};
}
test('history DOM changes do not add duplicate sections or trigger repeated queries',async()=>{const s=setup();await s.settle();for(let i=0;i<15;i++){s.changed();await s.settle();}assert.equal(s.statuses.length,1);assert.equal(s.queries(),1);assert.match(s.statuses[0].innerHTML,/Meine Datenanfragen/);assert.equal(s.form.dataset.requestTracking,'yes');});
test('an empty tracking attribute is still recognized as already bound',async()=>{const s=setup();await s.settle();s.form.dataset.requestTracking='';s.changed();await s.settle();assert.equal(s.statuses.length,1);assert.equal(s.queries(),1);});
test('submit handler is wrapped once and a double submit does not send two requests',async()=>{const s=setup();await s.settle();const handler=s.form.onsubmit;for(let i=0;i<8;i++){s.changed();await s.settle();}assert.equal(s.form.onsubmit,handler);await Promise.all([handler({preventDefault(){}}),handler({preventDefault(){}})]);await s.settle();assert.equal(s.submissions(),1);assert.equal(s.queries(),2);assert.equal(s.statuses.length,1);});
test('a rebuilt account form loads its own history once',async()=>{const s=setup();await s.settle();s.replace();await s.settle();assert.equal(s.queries(),2);assert.equal(s.statuses.length,2);});
