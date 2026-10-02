const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('oversized images are rejected before decoding or upload',async()=>{
const code=fs.readFileSync('public/market-tools.js','utf8');const start=code.indexOf('async function compressMarketImage('),end=code.indexOf('\nconst marketUploadOriginal',start);
let decoded=false;const c={createImageBitmap:()=>{decoded=true;throw Error('unexpected');}};vm.createContext(c);vm.runInContext(code.slice(start,end),c);
await assert.rejects(c.compressMarketImage({type:'image/jpeg',size:1572865}));assert.equal(decoded,false);
});
test('directions use the saved coordinates and maps load only after asking',()=>{
const c={merchantEditor(){},editStore(){},showStoreAddress(){},esc:s=>s,modal:s=>{c.html=s;},loadLeaflet:()=>{throw Error('map loaded without click')},$:s=>s==='#modal'?{addEventListener(){}}:{isConnected:true}};
vm.createContext(c);vm.runInContext(fs.readFileSync('public/store-location.js','utf8'),c);
c.showStoreAddress({name:'Shop',address:'Street',latitude:33.458,longitude:36.236});
assert.match(c.html,/destination=33.458%2C36.236/);assert.match(c.html,/maps.apple.com/);assert.match(c.html,/id="public-store-map" hidden/);
c.showStoreAddress({name:'Shop',address:'Street'});assert.doesNotMatch(c.html,/destination=/);
});
