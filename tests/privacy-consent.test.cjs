const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('cancel business location disclosure does not request GPS or alter the saved point',()=>{
 let requests=0,prompt='';
 const w={ShahinI18n:{language:'en'},confirm:s=>{prompt=s;return false;}};
 const ctx=vm.createContext({window:w,merchantEditor(){},editStore(){},showStoreAddress(){},navigator:{geolocation:{getCurrentPosition(){requests++;}}}});
 vm.runInContext(fs.readFileSync('privacy-controls.js','utf8')+'\n'+fs.readFileSync('store-location.js','utf8'),ctx);
 const nodes={'.store-map':{isConnected:true},'[data-store-map-status]':{},'[data-open-store-map]':{},'[data-clear-store-map]':{},'[data-gps-store-map]':{}};
 const form={elements:{latitude:{value:'33.45'},longitude:{value:'36.23'}},querySelector:s=>nodes[s]};
 ctx.form=form;vm.runInContext('bindStoreLocation(form,{})',ctx);nodes['[data-gps-store-map]'].onclick();
 assert.equal(requests,0);assert.equal(form.elements.latitude.value,'33.45');assert.match(prompt,/public/);
 w.confirm=()=>true;nodes['[data-gps-store-map]'].onclick();assert.equal(requests,1);
});
