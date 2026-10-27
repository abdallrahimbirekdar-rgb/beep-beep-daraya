const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const c={URL,merchantEditor(){},editStore(){},showStoreAddress(){}};vm.createContext(c);vm.runInContext(fs.readFileSync('store-location.js','utf8'),c);
const shared='https://maps.app.goo.gl/vwabcBDMhPhg4Lui6?g_st=ac';
const expanded='https://www.google.com/maps/place/Darayya/data=!4m6!3m5!1splace!7e2!8m2!3d33.4641999!4d36.232664299999996!18m1!1e1?g_st=ac';
test('Google place coordinates take precedence over viewport; encoded and zero coordinates work',()=>{
 assert.equal(JSON.stringify(c.parseStoreMapPoint(expanded)),'[33.4641999,36.232664299999996]');
 assert.equal(JSON.stringify(c.parseStoreMapPoint('https://www.google.com/maps/@50,10,12z/data=!3d33.4!4d36.2')),'[33.4,36.2]');
 assert.equal(JSON.stringify(c.parseStoreMapPoint('https://www.google.com/maps?query=0%2C0')),'[0,0]');
 assert.equal(c.parseStoreMapPoint('https://www.google.com/maps?q=200,999'),null);
 for(const link of ['https://evil.com/maps?q=1,2','https://maps.app.goo.gl.evil.com/x','javascript:alert(1)','https://www.google.com.evil.com/maps','https://user@maps.app.goo.gl/x'])assert.equal(c.isStoreMapLink(link),false);
 assert.equal(c.isStoreMapLink(shared),true);
});
test('short link resolves into saved fields, while pending lookup prevents premature save',async()=>{
 let complete; c.api={functions:{invoke:()=>new Promise(resolve=>complete=resolve)}};
 const input={value:shared,isConnected:true,setCustomValidity(v){this.error=v;}},status={};const form={elements:{gps_link:input,latitude:{value:''},longitude:{value:''}},querySelector:s=>s==='[data-gps-link-status]'?status:null};
 c.bindStoreMapLink(form);const pending=input.onchange();assert.match(input.error,/انتظر/);complete({data:{latitude:33.4641999,longitude:36.2326643}});await pending;assert.equal(form.elements.latitude.value,33.4641999);assert.equal(input.error,'');
 const next=input.onchange();input.value='';input.oninput();complete({data:{latitude:9,longitude:9}});await next;assert.equal(form.elements.latitude.value,33.4641999);
});
const edge={URL,Response,Request,AbortSignal,fetch,Deno:{env:{get:()=>''},serve(){}}};vm.createContext(edge);vm.runInContext(fs.readFileSync('supabase/functions/resolve-map-link/index.ts','utf8').replaceAll('export ',''),edge);
test('resolver follows the provided Google short link redirect and never fetches an external redirect',async()=>{
 const calls=[];const handler=edge.createHandler(async(url)=>{calls.push(url);return url.includes('/auth/v1/user')?new Response('{}'):new Response(null,{status:302,headers:{location:expanded}});});
 const request=()=>new Request('https://local/',{method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({url:shared})});
 const response=await handler(request());assert.equal(response.status,200);assert.deepEqual(await response.json(),{latitude:33.4641999,longitude:36.232664299999996});assert.equal(calls.length,2);
 const blocked=[];const bad=edge.createHandler(async(url)=>{blocked.push(url);return url.includes('/auth/v1/user')?new Response('{}'):new Response(null,{status:302,headers:{location:'https://evil.com/maps?q=1,2'}});});
 assert.equal((await bad(request())).status,422);assert.equal(blocked.length,2);
 const unauth=edge.createHandler(async()=>new Response('',{status:401}));assert.equal((await unauth(request())).status,401);
});
