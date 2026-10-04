/* One explicitly selected store; originals are retained for rollback. */
(()=>{
 const SID='a5e8abe7-974a-416c-a570-858d6fd03572';let running=false;
 const owned=url=>typeof url==='string'&&url.startsWith(window.BEEP_CONFIG.supabaseUrl+'/storage/v1/object/public/store-images/');
 async function prepare(blob){
  const bytes=new Uint8Array(await blob.slice(0,12).arrayBuffer());
  const type=bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n)?'image/png':new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP'?'image/webp':null;
  if(!type)throw Error('صيغة إحدى الصور القديمة غير مدعومة');
  const file=new Blob([blob],{type});if(file.size<=1572864)return file;
  const bitmap=await createImageBitmap(file);
  try{const canvas=document.createElement('canvas'),scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);for(const quality of [.82,.72,.6,.45]){const result=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));if(result?.type==='image/webp'&&result.size<=1572864)return result;}throw Error('تعذر تقليل حجم الصورة القديمة');}finally{bitmap.close?.();}
 }
 const check=url=>new Promise((resolve,reject)=>{const img=new Image();const timer=setTimeout(()=>reject(Error('انتهت مهلة التحقق من الصورة')),20000);img.onload=()=>{clearTimeout(timer);img.naturalWidth?resolve():reject(Error('الصورة غير قابلة للعرض'));};img.onerror=()=>{clearTimeout(timer);reject(Error('تعذر عرض الصورة المنقولة'));};img.src=url;});
 async function run(status){
  if(running||!admin||!user) return;running=true;
  try{
   if(!window.BEEP_CONFIG.r2UploadUrl)throw Error('رفع Cloudflare غير مفعل');
   const results=await Promise.all([api.from('stores').select('id,name,image,revision').eq('id',SID).single(),api.from('products').select('id,image,gallery,revision').eq('store_id',SID),api.from('store_page_photos').select('id,image').eq('store_id',SID)]);
   for(const r of results)if(r.error)throw r.error;
   const s=results[0].data,rows=[{table:'stores',row:s},...results[1].data.map(row=>({table:'products',row})),...results[2].data.map(row=>({table:'store_page_photos',row}))];
   const urls=[...new Set(rows.flatMap(({row})=>[row.image,...(row.gallery||[])]).filter(owned))];
   if(!urls.length){status.textContent='لا توجد صور متبقية في Supabase لهذا المتجر. لن ينتقل النظام إلى متجر آخر.';return;}
   const key='daraya-r2-migration-'+SID;let backup=JSON.parse(localStorage.getItem(key)||'null');
   if(!backup)backup={store:SID,name:s.name,started:new Date().toISOString(),rows,mapping:{},completed:[]};
   const save=()=>localStorage.setItem(key,JSON.stringify(backup));save();
   for(let i=0;i<urls.length;i++){
    const old=urls[i];status.textContent=`نقل صور ${s.name}: ${i+1} من ${urls.length}`;
    if(!backup.mapping[old]){
     const response=await fetch(old);if(!response.ok)throw Error('تعذر تحميل الصورة الأصلية');const blob=await prepare(await response.blob());
     const f=new FormData();f.set('photo',new File([blob],'migration.'+(blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg'),{type:blob.type}));
     const next=await uploadOrLink(f,SID);await check(next);await check(thumbnailForImage(next));backup.mapping[old]=next;save();
    }else{await check(backup.mapping[old]);await check(thumbnailForImage(backup.mapping[old]));}
   }
   for(const {table,row} of rows){
    const patch={};if(backup.mapping[row.image])patch.image=backup.mapping[row.image];
    if(table==='products'&&(row.gallery||[]).some(x=>backup.mapping[x]))patch.gallery=row.gallery.map(x=>backup.mapping[x]||x);
    if(!Object.keys(patch).length)continue;
    let query=api.from(table).update(patch).eq('id',row.id);
    if(row.revision!=null)query=query.eq('revision',row.revision);else query=query.eq('image',row.image);
    const updated=await query.select('id,image'+(table==='products'?',gallery':'')).single();
    if(updated.error)throw updated.error;if(!updated.data)throw Error('تغيرت البيانات أثناء النقل؛ أعد المحاولة');
    for(const field of Object.keys(patch))if(JSON.stringify(updated.data[field])!==JSON.stringify(patch[field]))throw Error('تعذر تأكيد حفظ روابط الصور');
    backup.completed.push({table,id:row.id});save();
   }
   await reload();status.textContent=`تم نقل ${urls.length} صورة من ${s.name} والتحقق من ظهور النسخ الأصلية والمصغرات وحفظ الروابط. بقيت نسخ Supabase محفوظة. توقف النقل هنا؛ أخبرنا إن كنت تريد المتابعة.`;backup.finished=new Date().toISOString();save();toast('تم نقل صور '+s.name);
  }catch(e){status.textContent='توقف النقل: '+e.message+' . النسخ الأصلية محفوظة، وقد اكتمل جزء من النقل. يمكن إعادة المحاولة.';}
  finally{running=false;}
 }
 async function cleanup(status){
  if(running||!admin||!user)return;running=true;
  try{
   const backup=JSON.parse(localStorage.getItem('daraya-r2-migration-'+SID)||'null');if(!backup?.mapping||!Object.keys(backup.mapping).length)throw Error('افتح من نفس المتصفح الذي نقل الصور؛ سجل النقل غير موجود هنا');
   const catalog=[];for(const table of ['stores','products','store_page_photos']){for(let start=0;;start+=500){const result=await api.from(table).select(table==='products'?'id,image,gallery,translations':table==='stores'?'id,image,translations':'id,image').range(start,start+499);if(result.error)throw result.error;catalog.push(...result.data);if(result.data.length<500)break;}}
   const references=JSON.stringify(catalog),prefix=window.BEEP_CONFIG.supabaseUrl+'/storage/v1/object/public/store-images/';let deleted=0,kept=0;
   for(const [old,next] of Object.entries(backup.mapping)){
    if(!owned(old)||!next.startsWith(new URL(window.BEEP_CONFIG.r2UploadUrl).origin+'/images/'+SID+'/'))throw Error('سجل نقل غير صالح');
    const key=decodeURIComponent(old.slice(prefix.length).split('?')[0]);if(!key.startsWith(SID+'/')||key.includes('..'))throw Error('الصورة خارج متجر فلافل السلطان');
    if(references.includes(old)||references.includes(key)){kept++;continue;}
    await check(next);await check(thumbnailForImage(next));
    const candidates=[key];if(/\/original\.(jpg|png|webp)$/.test(key)){const thumb=key.replace(/original\.(jpg|png|webp)$/,'thumbnail.webp');if(!references.includes(thumb))candidates.push(thumb);}
    const result=await api.storage.from('store-images').remove(candidates);if(result.error)throw result.error;
    const folder=key.slice(0,key.lastIndexOf('/')),name=key.slice(key.lastIndexOf('/')+1),remaining=await api.storage.from('store-images').list(folder,{search:name,limit:100});if(remaining.error)throw remaining.error;if(remaining.data.some(x=>x.name===name))throw Error('صلاحية حذف الصور غير مفعلة في Supabase؛ شغّل ملف إعداد الحذف ثم أعد المحاولة');
    deleted++;backup.deleted=Array.from(new Set([...(backup.deleted||[]),old]));localStorage.setItem('daraya-r2-migration-'+SID,JSON.stringify(backup));
   }
   status.textContent=`تم حذف نسخ Supabase لـ ${deleted} صورة من فلافل السلطان بعد التحقق من Cloudflare.${kept?' أُبقيت '+kept+' صورة لأنها ما زالت مستخدمة.':''} لم يُحذف شيء من متجر آخر.`;toast('انتهى تنظيف صور المتجر');
  }catch(e){status.textContent='توقف الحذف: '+e.message;}finally{running=false;}
 }
 function mount(){if(!admin||!user||!location.hash.startsWith('#dashboard')||document.getElementById('r2-migration-one'))return;const host=document.getElementById('dashboard-content')||document.getElementById('app');if(!host)return;const box=document.createElement('section');box.id='r2-migration-one';box.className='panel';box.innerHTML='<h2>نقل صور فلافل السلطان</h2><p>ينقل صور هذا المتجر فقط إلى Cloudflare. يمكن حذف نسخ Supabase بعد التحقق من اكتمال النقل.</p><button type="button" data-migrate>نقل صور هذا المتجر فقط</button> <button type="button" class="outline" data-cleanup>حذف نسخ Supabase المنقولة</button><p role="status" aria-live="polite"></p>';for(const [selector,action] of [['[data-migrate]',run],['[data-cleanup]',cleanup]])box.querySelector(selector).onclick=async()=>{box.querySelectorAll('button').forEach(b=>b.disabled=true);await action(box.querySelector('[role="status"]'));box.querySelectorAll('button').forEach(b=>b.disabled=false);};host.append(box);}
 new MutationObserver(mount).observe(document.getElementById('app'),{childList:true,subtree:true});window.addEventListener('hashchange',mount);mount();
})();
