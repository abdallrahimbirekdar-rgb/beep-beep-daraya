// Optional test dependencies: npm install --no-save jsdom @electric-sql/pglite
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {JSDOM}=require("jsdom");
const {PGlite}=require("@electric-sql/pglite");
const source=fs.readFileSync(path.join(__dirname,"../business-applications.js"),"utf8");
const migration=fs.readFileSync(path.join(__dirname,"../supabase/migrations/20261007_business_applications.sql"),"utf8");
const uid="10000000-0000-4000-8000-000000000001",other="10000000-0000-4000-8000-000000000002",admin="10000000-0000-4000-8000-000000000003",id="20000000-0000-4000-8000-000000000001";
const image="data:image/webp;base64,UklGRg==";
async function database(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,email text);
 insert into auth.users values('${uid}','owner@example.com'),('${other}','other@example.com'),('${admin}','admin@example.com');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function public.is_admin() returns boolean language sql stable as $$select auth.uid()='${admin}'::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid(),public.is_admin() to authenticated;
 create table public.stores (
 id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 1 and 100),category text not null check(category in ('shop','restaurant')),
 owner_email text not null,description text not null default '',address text not null default '' check(length(address)<=400),contact_phone text not null default '' check(length(contact_phone)<=30),
 image text not null default '',latitude double precision check(latitude between -90 and 90),longitude double precision check(longitude between -180 and 180),
 active boolean not null default true,is_open boolean not null default true,online_ordering boolean not null default true,delivery_enabled boolean not null default false,pickup_enabled boolean not null default false,
 text_only boolean not null default false,translations jsonb not null default '{}',deleted_at timestamptz,
 check(not online_ordering or delivery_enabled or pickup_enabled),check(deleted_at is null or (not active and not is_open)));
 grant select on public.stores to authenticated,anon;
 alter table public.stores enable row level security;
 create policy stores_read on public.stores for select using(active or public.is_admin());
 `);
 await db.exec(migration);return db;
}
async function asUser(db,user){await db.exec(`reset role;select set_config('request.jwt.claim.sub','${user}',false);set role authenticated;`);}
const data={kind:"services",name:"خدمة اختبار",address:"داريا - شارع اختبار",contact_phone:"+963999999999",contact_method:"telegram",telegram_username:"daraya_test",latitude:33.458,longitude:36.236,description:"",facade_data:image};
async function rpc(db,name,args){const params=args.map((_,i)=>"$"+(i+1)).join(",");return (await db.query(`select public.${name}(${params}) as result`,args)).rows[0].result;}
test("private drafts, required GPS/photo/contact, and admin-only staged approval",async()=>{
 const db=await database();try{
 await asUser(db,uid);
 let a=await rpc(db,"save_business_application",[id,0,JSON.stringify({kind:"services"})]);
 assert.equal(a.status,"draft");assert.equal(a.revision,2);
 await assert.rejects(rpc(db,"submit_business_application",[id,a.revision]),/قبل طلب المعاينة/);
 await assert.rejects(rpc(db,"save_business_application",[id,1,JSON.stringify(data)]),/تغيرت المسودة/);
 await asUser(db,other);assert.equal((await db.query("select id from public.business_applications")).rows.length,0);
 await assert.rejects(rpc(db,"save_business_application",[id,2,JSON.stringify(data)]),/غير مسموح/);
 await assert.rejects(db.query("insert into public.business_applications(id,owner_id) values($1,$2)",[other,other]),/permission denied/);
 await asUser(db,uid);a=await rpc(db,"save_business_application",[id,a.revision,JSON.stringify(data)]);
 a=await rpc(db,"submit_business_application",[id,a.revision]);assert.equal(a.status,"pending");
 const retry=await rpc(db,"submit_business_application",[id,a.revision-1]);assert.equal(retry.revision,a.revision);
 await assert.rejects(rpc(db,"begin_business_application_approval",[id,a.revision]),/غير مسموح/);
 await asUser(db,admin);const sid=await rpc(db,"begin_business_application_approval",[id,a.revision]);
 assert.equal(await rpc(db,"begin_business_application_approval",[id,a.revision]),sid);
 let stores=(await db.query("select * from public.stores")).rows;assert.equal(stores.length,1);assert.equal(stores[0].active,false);assert.equal(stores[0].online_ordering,false);assert.equal(stores[0].owner_email,"owner@example.com");assert.equal(stores[0].translations._directory.kind,"services");
 await assert.rejects(rpc(db,"finish_business_application_approval",[id,"javascript:alert(1)"]),/ارفع صورة/);
 assert.equal((await db.query("select active from public.stores")).rows[0].active,false);
 await rpc(db,"finish_business_application_approval",[id,"https://images.example.com/facade.webp"]);
 assert.equal((await db.query("select active from public.stores")).rows[0].active,true);
 assert.equal(await rpc(db,"finish_business_application_approval",[id,"https://images.example.com/facade.webp"]),sid);
 await asUser(db,uid);a=(await db.query("select * from public.business_applications")).rows[0];assert.equal(a.status,"approved");assert.equal(a.store_id,sid);
 }finally{await db.close();}
});
test("returned applications can be edited and resubmitted; stale withdrawal cannot undo review",async()=>{
 const db=await database();try{
 await asUser(db,uid);let a=await rpc(db,"save_business_application",[id,0,JSON.stringify(data)]);a=await rpc(db,"submit_business_application",[id,a.revision]);
 await asUser(db,admin);await rpc(db,"review_business_application",[id,a.revision,"عدّل الصورة"]);
 await asUser(db,uid);await assert.rejects(rpc(db,"withdraw_business_application",[id,a.revision]),/تغيرت/);
 a=(await db.query("select * from public.business_applications")).rows[0];assert.equal(a.status,"needs_changes");
 a=await rpc(db,"save_business_application",[id,a.revision,JSON.stringify({...data,facade_data:undefined,name:"الاسم المعدل"})]);assert.equal(a.facade_data,image);
 a=await rpc(db,"submit_business_application",[id,a.revision]);assert.equal(a.review_note,"");
 await rpc(db,"withdraw_business_application",[id,a.revision]);a=(await db.query("select * from public.business_applications")).rows[0];assert.equal(a.status,"draft");
 }finally{await db.close();}
});
function page(user=true){
 const dom=new JSDOM("<main id=app></main><dialog id=modal></dialog>",{url:"https://example.com/#business-application/new",runScripts:"outside-only"}),w=dom.window;
 const calls=[];w.user=user?{id:uid}:null;w.admin=false;w.esc=v=>String(v??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));w.render=()=>{};w.renderCustomerAccount=()=>{};w.renderDashboard=()=>{};w.mine=()=>[];w.reload=async()=>{};
 w.storeCoordinates=s=>s.latitude!==null&&s.latitude!==undefined&&s.latitude!==""&&s.longitude!==null&&s.longitude!==undefined&&s.longitude!==""&&Number.isFinite(Number(s.latitude))&&Number.isFinite(Number(s.longitude))?[Number(s.latitude),Number(s.longitude)]:null;
 w.storeLocationFields=s=>`<input type=hidden name=latitude value="${s.latitude??""}"><input type=hidden name=longitude value="${s.longitude??""}">`;
 w.bindStoreLocation=()=>{};w.modal=html=>{w.document.querySelector("#modal").innerHTML=html;};
 w.api={rpc:async(name,args)=>{calls.push({name,args});return {data:{...args.p_data,id:args.p_id,revision:2,status:"draft"}};}};
 w.eval(source);return {dom,w,calls,form:()=>w.document.querySelector("form")};
}
test("missing requirements block submission but allow saving a private draft",async()=>{
 const p=page();try{
 const f=p.form();assert.ok(f);const submit=f.querySelector("button[value=submit]"),save=f.querySelector("button[value=save]");
 await f.onsubmit({preventDefault(){},submitter:submit});assert.equal(p.calls.length,0);assert.match(p.w.document.querySelector("#business-form-status").textContent,/موقع GPS/);
 f.elements.name.value="اختبار";await f.onsubmit({preventDefault(){},submitter:save});assert.equal(p.calls[0].name,"save_business_application");assert.match(p.w.location.hash,/business-application\/[0-9a-f-]+/);
 assert.equal(p.w.BusinessApplications.phone("٠٩٩٩٩٩٩٩٩٩"),"+963999999999");
 assert.equal(p.w.BusinessApplications.phone("0049 123456789"),"+49123456789");
 assert.ok(p.w.BusinessApplications.missing({...data,latitude:null},image).includes("موقع GPS"));
 }finally{p.dom.window.close();}
});
test("signed-out applicants see login and cannot save or publish",()=>{
 const p=page(false);try{assert.equal(p.form(),null);assert.ok(p.w.document.querySelector("#business-sign-in"));assert.equal(p.calls.length,0);}finally{p.dom.window.close();}
});
