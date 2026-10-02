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
test('GPS requests only on click, keeps old pin on denial, and clears cancel late results',async()=>{
const fields={latitude:{value:'33.45'},longitude:{value:'36.23'}},box={isConnected:true,hidden:true},status={},open={},clear={},gps={};
const form={id:'merchant-editor',elements:fields,querySelector:s=>({'.store-map':box,'[data-store-map-status]':status,'[data-open-store-map]':open,'[data-clear-store-map]':clear,'[data-gps-store-map]':gps}[s])};let success,failure,count=0;
const map={setView(){return this},on(){return this},invalidateSize(){}},marker={addTo(){return this},on(){return this},setLatLng(){},remove(){}};
c.navigator={geolocation:{getCurrentPosition:(ok,bad,opts)=>{success=ok;failure=bad;count++;assert.equal(opts.maximumAge,0);}}};
c.loadLeaflet=async()=>{};c.L={map:()=>map,tileLayer:()=>({addTo(){}}),marker:()=>marker};
c.bindStoreLocation(form,{});assert.equal(count,0);
gps.onclick();failure({code:1});assert.equal(fields.latitude.value,'33.45');assert.equal(gps.disabled,false);
gps.onclick();clear.onclick();await success({coords:{latitude:33.458,longitude:36.236}});assert.equal(fields.latitude.value,'');
gps.onclick();await success({coords:{latitude:33.458,longitude:36.236}});assert.equal(fields.latitude.value,'33.458000');assert.equal(fields.longitude.value,'36.236000');assert.equal(box.hidden,false);
});
