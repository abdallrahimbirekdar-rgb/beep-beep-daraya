/* One explicitly selected store; originals are retained for rollback. */
(()=>{
 const SID='a5e8abe7-974a-416c-a570-858d6fd03572';let running=false;
 const owned=url=>typeof url==='string'&&url.startsWith(window.BEEP_CONFIG.supabaseUrl+'/storage/v1/object/public/store-images/');
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
     const response=await fetch(old);if(!response.ok)throw Error('تعذر تحميل الصورة الأصلية');const blob=await response.blob();
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
 function mount(){if(!admin||!user||!location.hash.startsWith('#dashboard')||document.getElementById('r2-migration-one'))return;const host=document.getElementById('dashboard-content')||document.getElementById('app');if(!host)return;const box=document.createElement('section');box.id='r2-migration-one';box.className='panel';box.innerHTML='<h2>نقل صور فلافل السلطان</h2><p>ينقل صور هذا المتجر فقط إلى Cloudflare، مع إبقاء النسخ الأصلية. لا ينتقل إلى متجر آخر.</p><button type="button">نقل صور هذا المتجر فقط</button><p role="status" aria-live="polite"></p>';box.querySelector('button').onclick=async e=>{e.target.disabled=true;await run(box.querySelector('[role="status"]'));e.target.disabled=false;};host.append(box);}
 new MutationObserver(mount).observe(document.getElementById('app'),{childList:true,subtree:true});window.addEventListener('hashchange',mount);mount();
})();
