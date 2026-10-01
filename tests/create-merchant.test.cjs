const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const code=fs.readFileSync('supabase/functions/create-merchant/index.ts','utf8').replace(/^import .*\n/,'').split('\nconst keys =')[0].replace('export function','function');
const factory=new Function(code+'; return createHandler;')();
const sid='11111111-1111-4111-8111-111111111111';
function fixture({authorized=true,valid=true,exists=false}={}){
 let calls=[];
 const client={auth:{getUser:async token=>({data:{user:valid?{id:'admin'}:null},error:valid?null:{}}),admin:{createUser:async payload=>{calls.push(payload);return exists?{error:{code:'email_exists',message:'exists'}}:{data:{user:{id:'new'}}};}}},from:table=>({select:()=>({eq:()=>({maybeSingle:async()=>table==='platform_admins'?{data:authorized?{user_id:'admin'}:null}:{data:{id:sid,name:'Shop',owner_email:'Owner@example.com'}}})})})};
 return {handler:factory(client),calls};
}
function req(body={store_id:sid,password:'a-long-test-password'},token=true){return new Request('https://example.com',{method:'POST',headers:{'Content-Type':'application/json',...(token?{authorization:'Bearer test'}:{})},body:JSON.stringify(body)});}
test('anonymous and invalid sessions cannot create users',async()=>{for(const valid of [true,false]){const f=fixture({valid});assert.equal((await f.handler(req(undefined,!valid))).status,401);assert.equal(f.calls.length,0);}});
test('merchant cannot create users',async()=>{const f=fixture({authorized:false});assert.equal((await f.handler(req())).status,403);assert.equal(f.calls.length,0);});
test('reject invalid store and weak password',async()=>{const f=fixture();assert.equal((await f.handler(req({store_id:'invalid',password:'a-long-test-password'}))).status,400);assert.equal((await f.handler(req({store_id:sid,password:'short'}))).status,400);assert.equal(f.calls.length,0);});
test('admin creates only account with server store email, no role and no leaked password',async()=>{const f=fixture();const res=await f.handler(req({store_id:sid,password:'a-long-test-password',email:'attacker@example.com',role:'admin'}));assert.equal(res.status,201);assert.deepEqual(f.calls[0],{email:'owner@example.com',password:'a-long-test-password',email_confirm:true});assert.deepEqual(await res.json(),{email:'owner@example.com',store_name:'Shop'});assert.equal(res.headers.get('cache-control'),'no-store');});
test('existing account is not overwritten',async()=>{const f=fixture({exists:true});assert.equal((await f.handler(req())).status,409);assert.equal(f.calls.length,1);});
test('CORS preflight performs no auth mutation',async()=>{const f=fixture();const res=await f.handler(new Request('https://example.com',{method:'OPTIONS'}));assert.equal(res.status,204);assert.equal(f.calls.length,0);});
