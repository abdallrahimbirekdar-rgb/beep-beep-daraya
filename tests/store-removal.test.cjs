const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../store-removal.js'),'utf8');
test('shop deletion is available only to platform admins',()=>{
const c={admin:false,dashboardStores(){},editStore(){},modal(){throw Error('Opened a delete dialog without permission')}};
vm.createContext(c);vm.runInContext(source,c);c.removeStoreDialog({id:'s',name:'Shop'});c.restoreStoreDialog({id:'s',deleted_at:'today'});
});
test('confirmation escapes shop names and rejects a mismatched typed name before any API request',async()=>{
const elements={'#cancel-remove-store':{},'#remove-store-form':{},'#remove-store-error':{}};
const c={admin:true,busy:false,dashboardStores(){},editStore(){},esc:s=>String(s).replace(/</g,'&lt;'),modal:html=>c.html=html,$:s=>elements[s],FormData:class{get(){return 'Wrong shop'}},api:{rpc(){throw Error('Unexpected request')}}};
vm.createContext(c);vm.runInContext(source,c);c.removeStoreDialog({id:'s',name:'<Shop>',revision:1});
assert.match(c.html,/&lt;Shop>/);assert.doesNotMatch(c.html,/<Shop>/);
await elements['#remove-store-form'].onsubmit({preventDefault(){},target:{},submitter:{}});
assert.equal(elements['#remove-store-error'].textContent,'اسم المحل غير مطابق');
});

test('editing an existing store exposes deletion to admins only',()=>{
let added=0,opened;
const elements={'#edit-form .form-actions':{insertAdjacentHTML(position,html){added++;assert.match(html,/type="button"/);}},'#edit-remove-store':{}};
const c={admin:true,dashboardStores(){},editStore(){},$:s=>elements[s]};
vm.createContext(c);vm.runInContext(source,c);c.removeStoreDialog=s=>opened=s;
const shop={id:'s',name:'Shop'};c.editStore(shop);assert.equal(added,1);elements['#edit-remove-store'].onclick();assert.equal(opened,shop);
c.admin=false;c.editStore(shop);assert.equal(added,1);
c.admin=true;c.editStore({});c.editStore({...shop,deleted_at:'today'});assert.equal(added,1);
});
test('dashboard deletion sits beside the store identity and opens its confirmation',()=>{
let moved,opened;
const shop={id:'s',name:'Shop'};
const identity={append(node){moved=node;}},button={dataset:{removeStore:'s'},setAttribute(){},closest:()=>({querySelector:()=>identity})};
const c={admin:true,stores:[shop],dashboardStores(){},editStore(){},document:{querySelectorAll:selector=>selector==='[data-remove-store]'?[button]:[],createElement:()=>({append(node){this.child=node;}})},$:()=>({insertAdjacentHTML(){}})};
vm.createContext(c);vm.runInContext(source,c);c.removeStoreDialog=s=>opened=s;c.dashboardStores([shop]);
assert.equal(moved.child,button);assert.equal(button.textContent,'حذف المحل');button.onclick();assert.equal(opened,shop);
});
test('confirmed deletion preserves revision checking and reloads the dashboard',async()=>{
const elements={'#cancel-remove-store':{},'#remove-store-form':{},'#remove-store-error':{},'#modal':{close(){}}};
let request,reloaded=0,rendered=0;
const c={admin:true,busy:false,dashboardStores(){},editStore(){},esc:s=>s,modal(){},$:s=>elements[s],FormData:class{get(){return 'Shop'}},api:{rpc:async(name,params)=>{request={name,params};return {error:null};}},reload:async()=>reloaded++,render:()=>rendered++,toast(){},marketError:e=>e.message};
vm.createContext(c);vm.runInContext(source,c);c.removeStoreDialog({id:'s',name:'Shop',revision:7});
await elements['#remove-store-form'].onsubmit({preventDefault(){},target:{},submitter:{}});
assert.equal(request.name,'admin_set_store_deleted');assert.equal(request.params.p_store,'s');assert.equal(request.params.p_revision,7);assert.equal(request.params.p_deleted,true);
assert.equal(reloaded,1);assert.equal(rendered,1);assert.equal(c.busy,false);
});
