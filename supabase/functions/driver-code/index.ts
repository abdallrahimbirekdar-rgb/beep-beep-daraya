import { createClient } from 'npm:@supabase/supabase-js@2';
const origins=['https://damascus-shop.com','https://www.damascus-shop.com','https://abdallrahimbirekdar-rgb.github.io'];
export function generateDriverCode(){let code='';while(code.length<12){const bytes=new Uint8Array(24);crypto.getRandomValues(bytes);for(const n of bytes){if(n<250)code+=String(n%10);if(code.length===12)break;}}return code;}
export async function driverCodeEmail(code){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code));return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')+'@driver.damascus-shop.invalid';}
export function createHandler(client){return async req=>{
 const origin=req.headers.get('origin')||'',headers={'Access-Control-Allow-Origin':origins.includes(origin)?origin:origins[0],'Vary':'Origin','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Content-Type':'application/json'};
 const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{error:'الطريقة غير مسموحة'});
 try{
 const token=req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];if(!token)return reply(401,{error:'سجل الدخول أولاً'});
 const {data:auth,error:ae}=await client.auth.getUser(token);if(ae||!auth?.user)return reply(401,{error:'سجل الدخول مجدداً'});
 const raw=await req.text();if(raw.length>4096)return reply(413,{error:'البيانات أكبر من المسموح'});
 let body;try{body=JSON.parse(raw);}catch{return reply(400,{error:'بيانات غير صالحة'});}
 const uuid=s=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
 let previous=null,storeId=body.store_id||null,name=body.name,phone=body.phone;
 if(body.driver_id){if(!uuid(body.driver_id))return reply(400,{error:'المندوب غير صالح'});const {data,error}=await client.from('store_drivers').select('id,store_id,user_id,name,phone,email,active').eq('id',body.driver_id).maybeSingle();if(error)return reply(503,{error:'تعذر قراءة المندوب'});if(!data)return reply(404,{error:'المندوب غير موجود'});previous=data;storeId=data.store_id;name=data.name;phone=data.phone;}
 if(storeId!==null&&!uuid(storeId))return reply(400,{error:'اختر المحل'});
 const {data:permission,error:pe}=await client.from('platform_admins').select('user_id').eq('user_id',auth.user.id).maybeSingle();if(pe)return reply(503,{error:'تعذر التحقق من الصلاحيات'});
 if(!permission){if(storeId===null)return reply(403,{error:'مندوبي الموقع متاحون للإدارة فقط'});const {data:store,error}=await client.from('stores').select('owner_email,deleted_at').eq('id',storeId).maybeSingle();if(error)return reply(503,{error:'تعذر قراءة المتجر'});if(!store||store.deleted_at||store.owner_email?.toLowerCase()!==auth.user.email?.toLowerCase())return reply(403,{error:'لا تملك صلاحية إدارة هذا المندوب'});}
 if(previous&&!previous.active)return reply(400,{error:'أعد تفعيل المندوب أولاً'});
 if(typeof name!=='string'||!name.trim()||name.trim().length>100||typeof phone!=='string'||!phone.trim()||phone.length>40)return reply(400,{error:'أدخل اسم المندوب ورقم هاتفه'});
 const code=generateDriverCode(),email=await driverCodeEmail(code);
 const {data:created,error:ce}=await client.auth.admin.createUser({email,password:code,email_confirm:true,user_metadata:{display_name:name.trim()},app_metadata:{driver_code_only:true}});
 if(ce||!created?.user)return reply(502,{error:'تعذر إنشاء الرمز. حاول مجدداً'});
 const id=previous?.id||crypto.randomUUID();
 const {error:bindError}=await client.rpc('provision_driver_code',{p_actor:auth.user.id,p_store:storeId,p_driver:id,p_user:created.user.id,p_name:name,p_phone:phone,p_email:email,p_expected_user:previous?.user_id||null});
 if(bindError){await client.auth.admin.deleteUser(created.user.id);return reply(409,{error:'تعذر ربط الرمز. حدّث بيانات المندوب وحاول مجدداً'});}
 // Old sessions lose their driver membership immediately; never ban a normal invited account.
 if(previous?.user_id&&previous.email.endsWith('@driver.damascus-shop.invalid'))await client.auth.admin.updateUserById(previous.user_id,{ban_duration:'876000h'});
 return reply(201,{driver_id:id,name,code});
 }catch{return reply(500,{error:'تعذر إكمال العملية'});}
};}
const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
const client=createClient(Deno.env.get('SUPABASE_URL'),keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(createHandler(client));
