const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const code=fs.readFileSync('public/android-download.js','utf8');
function app({android=true,latest='v2',offline=false,dialog=false,confirm=true}={}){
 const calls=[];let button;
 const assets=v=>[{getAttribute:n=>n==='src'?'app.js?v='+v:null}];
 const ctx=vm.createContext({navigator:{userAgent:android?'ShahinAndroid/1.0':'Chrome'},URL,Date,Array,confirm:()=>confirm,location:{href:'https://example.com/shop/?keep=yes#store/abc',hash:'#store/abc',replace:url=>calls.push(url)},document:{hidden:false,querySelectorAll:s=>s==='[data-android-download]'?[]:assets('v1'),querySelector:s=>s==='header nav'?{append:b=>button=b}:s==='dialog[open]'&&dialog?{}:null,createElement:()=>({classList:{add(){}}}),addEventListener(){}},window:{addEventListener(){}},DOMParser:class{parseFromString(){return {querySelector:()=>({}),querySelectorAll:()=>assets(latest)}}},fetch:async()=>{if(offline)throw Error('offline');return {ok:true,text:async()=>''}}});
 vm.runInContext(code,ctx);return {calls,get button(){return button}};
}
test('Android update detection offers refresh without navigating or losing a form',async()=>{const a=app();await new Promise(setImmediate);assert.equal(a.button.textContent,'تحديث متاح');assert.equal(a.calls.length,0);a.button.onclick();const u=new URL(a.calls[0]);assert.equal(u.hash,'#store/abc');assert.equal(u.searchParams.get('keep'),'yes');assert.ok(u.searchParams.get('app-refresh'));});
test('unchanged or offline site keeps manual refresh usable',async()=>{for(const options of [{latest:'v1'},{offline:true}]){const a=app(options);await new Promise(setImmediate);assert.equal(a.button.textContent,'تحديث العرض');assert.equal(a.calls.length,0);}});
test('cancel refresh preserves open editing dialogs; browser users have no app control',()=>{const a=app({dialog:true,confirm:false});a.button.onclick();assert.equal(a.calls.length,0);assert.equal(app({android:false}).button,undefined);});
