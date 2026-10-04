const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function check(total,oldCount,newCount,limit=50){const c=vm.createContext({placePhotoCount:()=>total,storePlan:()=>({features:{max_photos:limit}})});vm.runInContext(fs.readFileSync('store-photo-limit.js','utf8').split('(()=>{')[0],c);return ()=>c.checkStorePhotoBudget({},oldCount,newCount);}
test('50 total photos are allowed, but combined gallery additions over the limit are blocked',()=>{assert.doesNotThrow(check(49,0,1));assert.throws(check(49,0,2),/50/);assert.throws(check(50,0,1),/50/);});
test('replacement and reduction remain possible even for existing shops above the limit',()=>{assert.doesNotThrow(check(50,1,1));assert.doesNotThrow(check(55,3,1));assert.throws(check(55,1,2),/50/);});
test('an enabled plan with a smaller budget is respected',()=>{assert.throws(check(20,0,1,20),/20/);});
