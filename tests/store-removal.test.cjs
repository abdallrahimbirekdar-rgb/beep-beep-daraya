const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('public/store-removal.js','utf8');
test('shop deletion is available only to platform admins',()=>{
const c={admin:false,dashboardStores(){},modal(){throw Error('Opened a delete dialog without permission')}};
vm.createContext(c);vm.runInContext(source,c);c.removeStoreDialog({id:'s',name:'Shop'});c.restoreStoreDialog({id:'s',deleted_at:'today'});
});
test('confirmation escapes shop names and rejects a mismatched typed name before any API request',async()=>{
const elements={'#cancel-remove-store':{},'#remove-store-form':{},'#remove-store-error':{}};
const c={admin:true,busy:false,dashboardStores(){},esc:s=>String(s).replace(/</g,'&lt;'),modal:html=>c.html=html,$:s=>elements[s],FormData:class{get(){return 'Wrong shop'}},api:{rpc(){throw Error('Unexpected request')}}};
vm.createContext(c);vm.runInContext(source,c);c.removeStoreDialog({id:'s',name:'<Shop>',revision:1});
assert.match(c.html,/&lt;Shop>/);assert.doesNotMatch(c.html,/<Shop>/);
await elements['#remove-store-form'].onsubmit({preventDefault(){},target:{},submitter:{}});
assert.equal(elements['#remove-store-error'].textContent,'اسم المحل غير مطابق');
});
