import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
const origins=['https://damascus-shop.com','https://www.damascus-shop.com','https://abdallrahimbirekdar-rgb.github.io'];
export function createHandler(userClient,serviceClient){return async req=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Access-Control-Allow-Origin':origins.includes(origin)?origin:origins[0],'Vary':'Origin','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Content-Type':'application/json'};
 const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{error:'METHOD_NOT_ALLOWED'});
 const token=req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return reply(401,{error:'ADMIN_REQUIRED'});
 try{
  const client=userClient(token);
  const {data:auth,error:ae}=await client.auth.getUser();
  if(ae||!auth?.user)return reply(401,{error:'ADMIN_REQUIRED'});
  const raw=await req.text();if(raw.length>4096)return reply(413,{error:'INVALID_REQUEST'});
  const b=JSON.parse(raw);
  const uuid=s=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  if(!uuid(b.user_id)||!uuid(b.file_id)||typeof b.confirmation!=='string'||b.verified!==true)return reply(400,{error:'VERIFICATION_REQUIRED'});
  // The server derives the exact bucket/path from the target owner's records.
  // No client-supplied URL, bucket or filename is ever accepted.
  const {data:f,error}=await client.rpc('admin_account_deletion_file',{p_user:b.user_id,p_resource:b.file_id,p_confirmation:b.confirmation,p_verified:b.verified});
  if(error||!f)return reply(409,{error:error?.message||'RESOURCE_CHANGED'});
  const {error:de}=await serviceClient.storage.from(f.bucket).remove([f.name]);
  if(de)return reply(502,{error:'FILE_DELETE_FAILED'});
  const {data:remaining,error:re}=await client.rpc('admin_account_deletion_details',{p_user:b.user_id});
  if(re||!remaining||remaining.files.some(x=>x.id===b.file_id))return reply(502,{error:'FILE_DELETE_UNCONFIRMED'});
  return reply(200,{removed:true});
 }catch{return reply(500,{error:'FILE_DELETE_FAILED'});}
};}
const url=Deno.env.get('SUPABASE_URL');
const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
const opts={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(url,keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),opts);
Deno.serve(createHandler(token=>createClient(url,Deno.env.get('SUPABASE_ANON_KEY'),{...opts,global:{headers:{Authorization:'Bearer '+token}}}),service));
