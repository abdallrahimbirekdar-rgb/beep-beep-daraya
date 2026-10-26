const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const code=fs.readFileSync('android-download.js','utf8');
async function fixture({changed=false,featureChanged=false}={}){
 const calls=[],listeners={};const asset=src=>({getAttribute:key=>key==='src'?src:null});
 const feature=version=>({getAttribute:key=>key==='data-src'?'management-'+version+'.js':null});
 const original={querySelectorAll:selector=>selector.includes('script[defer]')?[asset('app.js?v=1'),...(selector.includes('data-feature')?[feature(1)]:[])]:[asset('app.js?v=1'),asset('lazy-language.js')]};
 const document={...original,hidden:false,querySelector:()=>null,addEventListener:(name,fn)=>listeners[name]=fn};
 const c=vm.createContext({navigator:{userAgent:'Chrome'},document,location:{href:'https://damascus-shop.com/#store/shop',hash:'#store/shop',replace:url=>calls.push(url)},window:{addEventListener(){}},URL,Date,setInterval(){},setTimeout(){},DOMParser:class{parseFromString(){return {querySelector:()=>true,querySelectorAll:()=>[asset(changed?'app.js?v=2':'app.js?v=1'),feature(featureChanged?2:1)]};}},fetch:async()=>({ok:true,text:async()=>''})});
 vm.runInContext(code,c);
 await new Promise(setImmediate);return calls;
}
test('a dynamically loaded language or dashboard script does not trigger a page refresh',async()=>{assert.equal((await fixture()).length,0);});
test('an actual change to eager assets still refreshes the current route',async()=>{const calls=await fixture({changed:true});assert.equal(calls.length,1);assert.equal(new URL(calls[0]).hash,'#store/shop');});

test('a newly deployed management-only bundle is detected even before it is loaded',async()=>{assert.equal((await fixture({featureChanged:true})).length,1);});
