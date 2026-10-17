'use strict';
(()=>{
 const say=(ar,en,de)=>typeof ct==='function'?ct(ar,en,de):ar;
 const accepted=['image/jpeg','image/png','image/webp','image/heic','image/heif'];
 function checkPhoto(file){if(!(accepted.includes(file.type)||!file.type&&/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name||''))||!file.size||file.size>20971520)throw Error('اختر صورة JPG أو PNG أو WebP أو HEIC لا تتجاوز 20 ميغابايت.');}
 const prepared=new WeakMap();
 async function encode(file,maxEdge=1600,maxBytes=409600){
  checkPhoto(file);let bitmap,canvas;
  try{if(typeof createImageBitmap==='function')bitmap=await createImageBitmap(file);}catch{}
  if(!bitmap){const url=URL.createObjectURL(file);try{bitmap=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('تعذر فتح الصورة. جرّب اختيارها من مكتبة الصور أو استخدم صورة JPG.'));img.src=url;});}finally{URL.revokeObjectURL(url);}}
  try{
   if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>60000000)throw Error('الصورة كبيرة جدًا. اختر صورة أصغر.');
   canvas=document.createElement('canvas');
   for(const edge of [maxEdge,Math.round(maxEdge*.75),Math.round(maxEdge*.5)]){
    const scale=Math.min(1,edge/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('تعذر تجهيز الصورة. اختر صورة أصغر.');if(ctx.fillRect){ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);}ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    for(const type of ['image/webp','image/jpeg'])for(const q of [.82,.65,.5,.35]){let blob;try{blob=await new Promise(resolve=>canvas.toBlob(resolve,type,q));}catch{}if(blob?.type!==type)break;if(blob.size<=maxBytes)return blob;}
   }
   throw Error('تعذر تجهيز الصورة. اختر صورة أصغر.');
  }finally{bitmap.close?.();}
 }
 function optimize(file){if(!prepared.has(file)){const result=encode(file).catch(e=>{prepared.delete(file);throw e;});prepared.set(file,result);}return prepared.get(file);}
 // The image Worker requires a WebP thumbnail. Safari may only encode JPEG/PNG.
 // In that case use the existing owner-protected storage bucket with a small JPEG.
 async function saveCompatibleImage(file,sid){
  const image=await encode(file,1000,200000),ext=image.type==='image/jpeg'?'jpg':'webp',key=sid+'/'+crypto.randomUUID()+'.'+ext;
  const bucket=api.storage.from('store-images'),r=await bucket.upload(key,image,{contentType:image.type,cacheControl:'31536000',upsert:false});if(r.error)throw r.error;
  const url=bucket.getPublicUrl(key).data?.publicUrl;if(!safeImage(url))throw Error('تعذر قراءة رابط الصورة');return url;
 }
 if(typeof imageFields==='function'){const oldFields=imageFields;imageFields=function(){return oldFields.apply(this,arguments).replace('accept="image/jpeg,image/png,image/webp"','accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"').replace('JPG أو PNG أو WebP، حتى ١٫٥ ميغابايت. نحفظ الأصل وننشئ صورة مصغّرة خفيفة.',say('اختر صورة حتى 20 ميغابايت؛ نصغّرها تلقائيًا. تُحفظ بعد الضغط على حفظ.','Choose a photo up to 20 MB. We make it smaller. Press Save to keep it.','Wähle ein Foto bis 20 MB. Wir verkleinern es. Tippe zum Speichern auf Speichern.'));};}
 if(typeof bindImagePreview==='function')bindImagePreview=function(form){const input=form.querySelector('input[name="photo"]'),preview=form.querySelector('.image-preview');if(!input||!preview)return;let epoch=0,url;
  input.onchange=async()=>{const file=input.files?.[0],token=++epoch;if(!file)return;preview.textContent=say('جاري تجهيز الصورة…','Preparing the photo…','Foto wird vorbereitet…');try{const image=await optimize(file);if(token!==epoch||!form.isConnected)return;if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(image);const img=document.createElement('img');img.src=url;img.alt='معاينة الصورة المختارة';preview.replaceChildren(img);const note=document.createElement('small');note.dataset.noTranslate='';note.textContent=say('الصورة جاهزة. اضغط حفظ لتثبيتها.','Photo ready. Press Save to keep it.','Foto bereit. Tippe zum Speichern auf Speichern.');preview.append(note);img.onload=()=>URL.revokeObjectURL(img.src);}catch(e){if(token===epoch){input.value='';preview.textContent=e.message;}}};
 };

 const previous=uploadOrLink;uploadOrLink=async function(f,sid){const file=f.get('photo');if(!file?.size)return previous(f,sid);const optimized=await optimize(file);const endpoint=window.BEEP_CONFIG?.r2UploadUrl;if(!endpoint){const copy=new FormData();for(const [key,value] of f.entries())copy.append(key,key==='photo'?optimized:value);return previous(copy,sid);}// Prepare images before reading the session: compression can take time on phones.
 let thumbnail;try{thumbnail=await compressMarketImage(optimized);}catch{thumbnail=await encode(optimized,400,65536);}
 if(thumbnail.type!=='image/webp')return saveCompatibleImage(optimized,sid);
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
