const origins=['https://damascus-shop.com','https://www.damascus-shop.com','https://abdallrahimbirekdar-rgb.github.io'];
export function allowed(raw){try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&['maps.app.goo.gl','goo.gl','www.google.com','google.com','maps.google.com'].includes(u.hostname)&&(u.hostname==='maps.app.goo.gl'||u.pathname.startsWith('/maps'));}catch{return false;}}
export function point(raw){let value;try{value=decodeURIComponent(raw);}catch{value=raw;}const m=value.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)||value.match(/(?:@|[?&](?:q|query|ll)=)(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);if(!m)return null;const latitude=Number(m[1]),longitude=Number(m[2]);return Number.isFinite(latitude)&&Number.isFinite(longitude)&&Math.abs(latitude)<=90&&Math.abs(longitude)<=180?{latitude,longitude}:null;}
export function createHandler(fetcher=fetch){return async req=>{
 const origin=req.headers.get('origin')||'',headers={'Access-Control-Allow-Origin':origins.includes(origin)?origin:origins[0],'Vary':'Origin','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Content-Type':'application/json'};
 const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{error:'الطريقة غير مسموحة'});
 try{
 const token=req.headers.get('authorization');if(!token)return reply(401,{error:'سجل الدخول أولاً'});
 const auth=await fetcher(Deno.env.get('SUPABASE_URL')+'/auth/v1/user',{headers:{Authorization:token,apikey:Deno.env.get('SUPABASE_ANON_KEY')},signal:AbortSignal.timeout(5000)});
 if(!auth.ok)return reply(401,{error:'سجل الدخول مجددًا ثم أعد لصق الرابط'});
 const raw=await req.text();if(raw.length>4096)return reply(413,{error:'الرابط طويل جدًا'});
 let url=JSON.parse(raw).url;if(typeof url!=='string'||url.length>2048||!allowed(url))return reply(400,{error:'أدخل رابط مشاركة صحيحًا من خرائط Google'});
 const signal=AbortSignal.timeout(10000);
 for(let i=0;i<6;i++){
 const coordinates=point(url);if(coordinates)return reply(200,coordinates);
 const response=await fetcher(url,{redirect:'manual',signal,headers:{'User-Agent':'Mozilla/5.0'}});
 const next=response.headers.get('location');await response.body?.cancel();
 if(response.status<300||response.status>=400||!next)break;
 const target=new URL(next,url).href;if(!allowed(target))break;url=target;
 }
 return reply(422,{error:'تعذر استخراج مكان من الرابط. أعد نسخ رابط مشاركة المكان من خرائط Google أو امسح الرابط وحدد الموقع على الخريطة.'});
 }catch{return reply(503,{error:'تعذر قراءة رابط الخرائط الآن. تحقق من الإنترنت وأعد لصقه، أو امسح الرابط وحدد الموقع على الخريطة.'});}
};}
Deno.serve(createHandler());
