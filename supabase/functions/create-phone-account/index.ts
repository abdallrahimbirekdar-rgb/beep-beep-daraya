import { createClient } from 'npm:@supabase/supabase-js@2';
const allowed = ['https://damascus-shop.com','https://www.damascus-shop.com','https://abdallrahimbirekdar-rgb.github.io'];
export function normalizePhone(value) {
 let s=String(value||'').trim().replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[\s().-]/g,'');
 if(s.startsWith('00'))s='+'+s.slice(2);
 if(/^09\d{8}$/.test(s))s='+963'+s.slice(1);
 if(/^9639\d{8}$/.test(s))s='+'+s;
 if(!/^\+[1-9]\d{7,14}$/.test(s))throw Error('أدخل رقم واتساب مع رمز الدولة، مثل +9639XXXXXXXX');
 return s;
}
export function createHandler(client, scopedForToken = () => client) { return async req=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Access-Control-Allow-Origin':allowed.includes(origin)?origin:allowed[0],'Vary':'Origin','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Content-Type':'application/json'};
 const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{error:'الطريقة غير مسموحة'});
 try {
 const token=req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return reply(401,{error:'سجل الدخول أولاً'});
 const {data:auth,error:ae}=await client.auth.getUser(token);
 if(ae||!auth?.user)return reply(401,{error:'سجل الدخول مجدداً'});
 const {data:permission,error:pe}=await client.from('platform_admins').select('user_id').eq('user_id',auth.user.id).maybeSingle();
 if(pe)return reply(503,{error:'تعذر التحقق من الصلاحيات'});
 if(!permission)return reply(403,{error:'إنشاء الحسابات متاح لمدير الموقع فقط'});
 const raw=await req.text();if(raw.length>4096)return reply(413,{error:'البيانات أكبر من المسموح'});
 let body;try{body=JSON.parse(raw);}catch{return reply(400,{error:'بيانات غير صالحة'});}
 let phone;try{phone=normalizePhone(body.phone);}catch(e){return reply(400,{error:e.message});}
 if(typeof body.password!=='string'||!/^\d{12,24}$/.test(body.password))return reply(400,{error:'كلمة السر يجب أن تكون من 12 إلى 24 رقماً'});
 if(/^(\d)\1+$/.test(body.password)||'012345678901234567890123456789'.includes(body.password)||'987654321098765432109876543210'.includes(body.password))return reply(400,{error:'اختر أرقاماً غير متكررة أو متسلسلة'});
 const name=typeof body.name==='string'?body.name.trim():'';
 if(!name||name.length>100)return reply(400,{error:'أدخل اسم الشخص'});
 let store=null;
 if(body.store_id){
 if(typeof body.store_id!=='string'||! /^[0-9a-f-]{36}$/i.test(body.store_id))return reply(400,{error:'اختر متجراً صالحاً'});
 const {data,error}=await client.from('stores').select('id,name,owner_email,revision').eq('id',body.store_id).is('deleted_at',null).maybeSingle();
 if(error)return reply(503,{error:'تعذر قراءة المتجر'});if(!data)return reply(404,{error:'المتجر غير موجود'});store=data;
 }
 const email=phone.slice(1)+'@phone.damascus-shop.invalid';
 const {data:created,error}=await client.auth.admin.createUser({email,password:body.password,email_confirm:true,user_metadata:{display_name:name,contact_phone:phone},app_metadata:{managed_phone_account:true}});
 if(error){if(/exists|registered/i.test(error.message)||['email_exists','user_already_exists'].includes(error.code))return reply(409,{error:'هذا الرقم لديه حساب بالفعل. لم يتم تغيير كلمة سره'});return reply(400,{error:'تعذر إنشاء الحساب. تحقق من كلمة السر وحاول مجدداً'});}
 if(!created?.user)return reply(502,{error:'تعذر تأكيد إنشاء الحساب'});
 if(store){
 const {data,error}=await scopedForToken(token).from('stores').update({owner_email:email}).eq('id',store.id).eq('revision',store.revision).select('id');
 if(error||!data?.length){await client.auth.admin.deleteUser(created.user.id);return reply(409,{error:'تعذر ربط المتجر؛ ربما تغيرت بياناته. حدّث الصفحة وحاول مجدداً'});}
 }
 return reply(201,{phone,name,store_name:store?.name||null});
 }catch{return reply(500,{error:'تعذر إكمال العملية'});}
};}
const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
const client=createClient(Deno.env.get('SUPABASE_URL'),keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(createHandler(client, token=>createClient(Deno.env.get('SUPABASE_URL'),keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}})));
