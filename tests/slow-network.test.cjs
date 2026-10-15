const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('oversized images are rejected before decoding or upload',async()=>{
const code=fs.readFileSync('market-tools.js','utf8');const start=code.indexOf('async function compressMarketImage('),end=code.indexOf('\nconst marketUploadOriginal',start);
let decoded=false;const c={createImageBitmap:()=>{decoded=true;throw Error('unexpected');}};vm.createContext(c);vm.runInContext(code.slice(start,end),c);
await assert.rejects(c.compressMarketImage({type:'image/jpeg',size:1572865}));assert.equal(decoded,false);
});
test('directions use the saved coordinates and maps load only after asking',()=>{
const c={merchantEditor(){},editStore(){},showStoreAddress(){},esc:s=>s,modal:s=>{c.html=s;},loadLeaflet:()=>{throw Error('map loaded without click')},$:s=>s==='#modal'?{addEventListener(){}}:{isConnected:true}};
vm.createContext(c);vm.runInContext(fs.readFileSync('store-location.js','utf8'),c);
c.showStoreAddress({name:'Shop',address:'Street',latitude:33.458,longitude:36.236});
assert.match(c.html,/destination=33.458%2C36.236/);assert.match(c.html,/maps.apple.com/);assert.match(c.html,/id="public-store-map" hidden/);
c.showStoreAddress({name:'Shop',address:'Street'});assert.doesNotMatch(c.html,/destination=/);
});

test('startup exposes retry after 25 seconds and recovers if loading finishes late',async()=>{
 const code=fs.readFileSync('app.js','utf8');
 let resolveSdk,timeout,cleared=false,unavailable=0,rendered=0;
 const sdk=new Promise(resolve=>{resolveSdk=resolve;});
 const c={live:true,cfg:{},window:{},api:null,user:null,console,
 setTimeout(fn,ms){assert.equal(ms,25000);timeout=fn;return 17;},clearTimeout(id){assert.equal(id,17);cleared=true;},
 mockSdk:()=>sdk,renderUnavailable(){unavailable++;},reload:async()=>{},render(){rendered++;}};
 vm.createContext(c);
 const source=code.slice(code.indexOf('async function init()'),code.indexOf('\nfunction renderUnavailable')).replace(/import\('[^']+'\)/,'mockSdk()');
 vm.runInContext(source,c);const pending=c.init();timeout();assert.equal(unavailable,1);assert.equal(rendered,0);
 resolveSdk({createClient:()=>({auth:{onAuthStateChange(){},getSession:async()=>({data:{session:null}})}})});
 await pending;assert.equal(rendered,1);assert.equal(cleared,true);
});
