'use strict';
(()=>{
 async function optimize(file){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>1572864)throw Error('اختر JPG أو PNG أو WebP بحجم لا يتجاوز ١٫٥ ميغابايت');const bitmap=await createImageBitmap(file);try{const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);let blob;for(const q of [.82,.72,.6,.45]){blob=await new Promise(r=>canvas.toBlob(r,'image/webp',q));if(blob?.size<=409600)break;}if(!blob||blob.type!=='image/webp')throw Error('تعذر تجهيز الصورة. جرّب متصفحًا حديثًا.');return blob.size<file.size?blob:file;}finally{bitmap.close?.();}}
 const previous=uploadOrLink;uploadOrLink=async function(f,sid){const file=f.get('photo');if(!file?.size)return previous(f,sid);const optimized=await optimize(file);const endpoint=window.BEEP_CONFIG?.r2UploadUrl;if(!endpoint){const copy=new FormData();for(const [key,value] of f.entries())copy.append(key,key==='photo'?optimized:value);return previous(copy,sid);}// Prepare images before reading the session: compression can take time on phones.
 const thumbnail=await compressMarketImage(optimized);
 const body=new FormData();body.set('store_id',sid);body.set('photo',optimized);body.set('thumbnail',thumbnail);
 const session=await api.auth.getSession();
 let current=session.data?.session;
 if(session.error||!current?.access_token)throw Error('انتهت جلسة الدخول. سجّل الدخول مجددًا ثم عدّل المكان الذي تم إنشاؤه.');
 const owner=current.user?.id;
 const send=token=>fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+token},body});
 let response=await send(current.access_token);
 if(response.status===401){
  // Only authentication failures may be retried, once, with a refreshed session.
  const refreshed=await api.auth.refreshSession();
  current=refreshed.data?.session;
  if(refreshed.error||!current?.access_token||!owner||current.user?.id!==owner)throw Error('تعذر تجديد جلسة الدخول. سجّل الدخول مجددًا ثم عدّل المكان الذي تم إنشاؤه.');
  response=await send(current.access_token);
  if(response.status===401){
   const verified=await api.auth.getUser(current.access_token);
   if(!verified.error&&verified.data?.user?.id===owner)throw Error('جلسة الدخول صالحة، لكن خدمة الصور ترفضها. يمكنك إزالة الصورة وحفظ البيانات مؤقتًا؛ يلزم فحص إعدادات خدمة الصور.');
  }
 }
 const result=await response.json();if(!response.ok)throw Error(result.error||'تعذر رفع الصورة');if(!safeImage(result.url))throw Error('تعذر قراءة رابط الصورة');return result.url;};
 const oldThumbnail=thumbnailForImage;thumbnailForImage=function(url){const endpoint=window.BEEP_CONFIG?.r2UploadUrl;try{if(endpoint){const u=new URL(url),base=new URL(endpoint);if(u.origin===base.origin&&/^\/images\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/original\.(webp|jpg|png)$/.test(u.pathname)){u.pathname=u.pathname.replace(/original\.(webp|jpg|png)$/,'thumbnail.webp');return u.href;}}}catch{}return oldThumbnail(url);};
})();
