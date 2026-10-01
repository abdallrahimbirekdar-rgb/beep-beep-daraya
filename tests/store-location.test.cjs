const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const c={merchantEditor(){},editStore(){},showStoreAddress(){}};vm.createContext(c);vm.runInContext(fs.readFileSync('public/store-location.js','utf8'),c);
test('shop coordinates require a finite valid pair and support clearing',()=>{
for(const s of [{},{latitude:'',longitude:''},{latitude:33,longitude:null},{latitude:91,longitude:36},{latitude:33,longitude:Infinity}])assert.equal(c.storeCoordinates(s),null);
assert.equal(JSON.stringify(c.storeCoordinates({latitude:0,longitude:0})),'[0,0]');
const data=values=>({get:k=>values[k]});
assert.equal(JSON.stringify(c.readStoreCoordinates(data({latitude:'',longitude:''}))), '{"latitude":null,"longitude":null}');
assert.throws(()=>c.readStoreCoordinates(data({latitude:'33',longitude:''})));
assert.equal(JSON.stringify(c.readStoreCoordinates(data({latitude:'33.458',longitude:'36.236'}))), '{"latitude":33.458,"longitude":36.236}');
});
