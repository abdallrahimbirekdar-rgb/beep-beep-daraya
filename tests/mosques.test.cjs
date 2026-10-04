const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function fixture(){
 const context=vm.createContext({window:{},document:{baseURI:'https://damascus-shop.com/',querySelector:()=>null},URL,stores:[],nativeRows:[],reload:async function(){context.stores=context.nativeRows.slice();},render(){},renderHome(){},renderStore(){},dashboardStores(){},$:()=>null,directoryKind:s=>s.translations?._directory?.kind,console});
 vm.runInContext(fs.readFileSync('mosques-data.js','utf8'),context);
 vm.runInContext(fs.readFileSync('mosques.js','utf8'),context);
 return context;
}
test('all 29 mosque pages are information pages, with ten sourced coordinates and no guessed points',()=>{
 const ctx=fixture();assert.equal(ctx.stores.length,29);assert.equal(new Set(ctx.stores.map(s=>s.id)).size,29);
 const located=ctx.stores.filter(s=>s.latitude!==null);assert.equal(located.length,10);
 for(const s of ctx.stores){assert.equal(s.online_ordering,false);assert.equal(s.delivery_enabled,false);assert.equal(s.translations._directory.mode,'info');if(s.latitude!==null){assert.ok(s.latitude>33.43&&s.latitude<33.49);assert.ok(s.longitude>36.2&&s.longitude<36.27);assert.ok(s.translations._directory.location_source);}}
});
test('native saved coordinates and names take priority; repeated reloads do not duplicate pages',async()=>{
 const ctx=fixture(),seed=ctx.stores[0];ctx.nativeRows=[{...seed,_mosqueCatalog:false,name:'جامع سعد بن معاذ',latitude:33.46,longitude:36.24}];
 await ctx.reload();await ctx.reload();assert.equal(ctx.stores.length,29);assert.equal(ctx.stores[0].latitude,33.46);assert.equal(ctx.stores[0].name,'جامع سعد بن معاذ');
});
test('a native mosque with another UUID is matched by name',async()=>{
 const ctx=fixture();ctx.nativeRows=[{...ctx.stores[0],id:'native-id',_mosqueCatalog:false,name:'جامع سعد بن معاذ'}];await ctx.reload();assert.equal(ctx.stores.length,29);assert.equal(ctx.stores.filter(s=>/سعد بن معاذ/.test(s.name)).length,1);
});
test('deleted native records are never replaced by a public fallback',async()=>{
 const ctx=fixture();ctx.nativeRows=[{...ctx.stores[0],active:false,deleted_at:'2026-10-04',_mosqueCatalog:false}];await ctx.reload();assert.equal(ctx.stores.length,29);assert.equal(ctx.stores[0].active,false);
});
