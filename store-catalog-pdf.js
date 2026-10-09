'use strict';
(() => {
 const t=(ar,en,de)=>({ar,en,de}[window.ShahinI18n?.language||'ar']||ar);
 const encoder=new TextEncoder();
 const bytes=s=>encoder.encode(s);
 function join(parts){const size=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(size);let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out;}
 // Canvas shapes Arabic with the site's font; embedding each page preserves its layout on every PDF reader.
 function pdf(images){
  const objects=[null,null,null];
  const ids=[];
  for(const image of images){
   const pageId=objects.length;ids.push(pageId);objects.push(null);
   const imageId=objects.length;objects.push(join([bytes('<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+image.length+' >>\nstream\n'),image,bytes('\nendstream')]));
   const contentId=objects.length,content='q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ';
   objects.push(bytes('<< /Length '+bytes(content).length+' >>\nstream\n'+content+'\nendstream'));
   objects[pageId]=bytes('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 '+imageId+' 0 R >> >> /Contents '+contentId+' 0 R >>');
  }
  objects[1]=bytes('<< /Type /Catalog /Pages 2 0 R >>');objects[2]=bytes('<< /Type /Pages /Count '+ids.length+' /Kids ['+ids.map(id=>id+' 0 R').join(' ')+'] >>');
  const parts=[bytes('%PDF-1.4\n')],offsets=[0];let size=parts[0].length;
  for(let id=1;id<objects.length;id++){offsets.push(size);const obj=join([bytes(id+' 0 obj\n'),objects[id],bytes('\nendobj\n')]);parts.push(obj);size+=obj.length;}
  parts.push(bytes('xref\n0 '+objects.length+'\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+objects.length+' /Root 1 0 R >>\nstartxref\n'+size+'\n%%EOF\n'));
  return new Blob(parts,{type:'application/pdf'});
 }
 function lines(ctx,value,width){const result=[];let line='';for(const word of String(value||'').split(/\s+/)){const next=line?line+' '+word:word;if(ctx.measureText(next).width>width&&line){result.push(line);line=word;}else line=next;}if(line)result.push(line);return result;}
 async function create(s,ps,now=new Date()){
  await document.fonts.ready;
  const lang=window.ShahinI18n?.language||'ar',rtl=lang==='ar',locale=rtl?'ar-SY':lang==='de'?'de-DE':'en-GB';
  const date=now.toLocaleString(locale,{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
  const pages=[];let canvas,ctx,y,page=0;
  const translated=value=>window.ShahinI18n?.translate?.(String(value||''))||String(value||'');
  function draw(value,x,yy,width,font,color='#173b35',align=rtl?'right':'left'){ctx.font=font;ctx.fillStyle=color;ctx.textAlign=align;ctx.direction=rtl?'rtl':'ltr';const ls=lines(ctx,value,width);ls.forEach((l,i)=>ctx.fillText(l,x,yy+i*42));return ls.length*42;}
  function finish(){
   ctx.fillStyle='#173b35';ctx.fillRect(0,1650,1240,104);ctx.font='24px Cairo, sans-serif';ctx.textAlign='center';ctx.direction='ltr';ctx.fillStyle='#fffaf0';ctx.fillText('damascus-shop.com',620,1690);ctx.fillText(String(page),620,1726);
   const raw=atob(canvas.toDataURL('image/jpeg',0.9).split(',')[1]);pages.push(Uint8Array.from(raw,c=>c.charCodeAt(0)));
  }
  function start(){
   page++;canvas=document.createElement('canvas');canvas.width=1240;canvas.height=1754;ctx=canvas.getContext('2d');ctx.fillStyle='#fffaf0';ctx.fillRect(0,0,1240,1754);ctx.fillStyle='#173b35';ctx.fillRect(0,0,1240,210);
   draw(translated(s.name),620,82,1100,'bold 46px Cairo, sans-serif','#f0d787','center');draw(t('قائمة المنتجات والأسعار','Products and prices','Produkte und Preise'),620,176,1100,'30px Cairo, sans-serif','#ffffff','center');
   y=270;const x=rtl?1160:80;
   y+=draw(t('العنوان: ','Address: ','Adresse: ')+translated(s.address||t('غير مضاف','Not provided','Nicht angegeben')),x,y,1080,'27px Cairo, sans-serif');
   if(s.contact_phone){ctx.font='26px Cairo, sans-serif';ctx.fillStyle='#173b35';ctx.textAlign=rtl?'right':'left';ctx.direction='ltr';ctx.fillText(s.contact_phone,x,y);y+=42;}
   y+=draw(t('تاريخ التحميل: ','Downloaded: ','Heruntergeladen: ')+date,x,y,1080,'26px Cairo, sans-serif');
   if(s.is_example)y+=draw(t('متجر تجريبي — بيانات للتوضيح فقط','Example shop — demonstration data','Beispielgeschäft — Demodaten'),x,y,1080,'25px Cairo, sans-serif','#896820');
   y+=12;ctx.fillStyle='#ebd89d';ctx.fillRect(70,y,1100,60);draw(t('المنتج','Product','Produkt'),rtl?1140:90,y+40,760,'bold 28px Cairo, sans-serif');draw(t('السعر','Price','Preis'),rtl?90:1140,y+40,240,'bold 28px Cairo, sans-serif','#173b35',rtl?'left':'right');y+=76;
  }
  start();
  for(const p of ps){
   ctx.font='30px Cairo, sans-serif';const name=translated(p.name),nameLines=lines(ctx,name,740),height=Math.max(74,nameLines.length*42+24);
   if(y+height>1550){finish();start();}
   draw(name,rtl?1140:90,y+38,740,'30px Cairo, sans-serif');
   const price=p.price!==null&&p.price!==''&&Number.isFinite(Number(p.price))?Number(p.price).toLocaleString(locale)+(rtl?' ل.س':' SYP'):t('غير محدد','Not set','Nicht angegeben');
   draw(price,rtl?90:1140,y+38,270,'bold 27px Cairo, sans-serif','#896820',rtl?'left':'right');
   y+=height;ctx.strokeStyle='#dfd7bd';ctx.beginPath();ctx.moveTo(80,y);ctx.lineTo(1160,y);ctx.stroke();
  }
  draw(t('الأسعار حسب المعلومات المنشورة وقت التحميل وقد تتغيّر.','Prices reflect the published information at download time and may change.','Preise entsprechen den Angaben beim Download und können sich ändern.'),620,1600,1080,'22px Cairo, sans-serif','#65716b','center');finish();return pdf(pages);
 }
 async function save(s,ps,button){
  if(button.disabled)return;button.disabled=true;const old=button.textContent;button.textContent=t('جاري تجهيز PDF…','Preparing PDF…','PDF wird erstellt…');
  try{
   const native=/ShahinAndroid\//.test(navigator.userAgent),version=Number(navigator.userAgent.match(/DarayaVersion\/(\d+)/)?.[1]||0);
   if(native&&(!window.DarayaImageShare||version<126)){modal('<section data-no-translate><h2>'+t('تحميل قائمة المنتجات PDF','Download product list PDF','Produktliste als PDF herunterladen')+'</h2><p>'+t('لتنزيل الملف من هذه النسخة، افتح صفحة المحل في Chrome. يدعم إصدار التطبيق الجديد حفظ ومشاركة PDF مباشرة.','Open this shop in Chrome to download the file from this app version. The new app version supports saving and sharing PDFs directly.','Öffne dieses Geschäft in Chrome, um die Datei mit dieser App-Version herunterzuladen. Die neue App-Version unterstützt das Speichern und Teilen von PDFs direkt.')+'</p><p dir="ltr">https://damascus-shop.com/#store/'+encodeURIComponent(s.id)+'</p><button id="catalog-copy">'+t('نسخ رابط المحل','Copy shop link','Geschäftslink kopieren')+'</button></section>');document.querySelector('#catalog-copy').onclick=async()=>{try{await navigator.clipboard.writeText('https://damascus-shop.com/#store/'+encodeURIComponent(s.id));toast(t('تم نسخ الرابط','Link copied','Link kopiert'));}catch{toast(t('انسخ الرابط الظاهر وافتحه في Chrome','Copy the shown link and open it in Chrome','Kopiere den angezeigten Link und öffne ihn in Chrome'));}};return;}
   const blob=await create(s,ps);
   if(native){const reader=new FileReader();const data=await new Promise((resolve,reject)=>{reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob);});await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Share timed out')),15000);window.DarayaImageShare.onmessage=e=>{clearTimeout(timer);try{JSON.parse(e.data).ok?resolve():reject(new Error('Share failed'));}catch{reject(new Error('Share failed'));}};window.DarayaImageShare.postMessage(JSON.stringify({pdf:data,text:s.name}));});return;}
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='daraya-products-'+s.id+'-'+new Date().toISOString().slice(0,10)+'.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch{toast(t('تعذر تجهيز الملف. حاول مرة أخرى.','Could not create the file. Please try again.','Die Datei konnte nicht erstellt werden. Bitte versuche es erneut.'));}finally{button.disabled=false;button.textContent=old;}
 }
 const base=renderStore;renderStore=function(id){base.apply(this,arguments);const s=stores.find(x=>x.id===id&&x.active&&!x.deleted_at);if(!s||directoryIsInfo(s))return;const ps=products.filter(p=>p.store_id===id&&p.available);if(!ps.length)return;const host=document.querySelector('.store-banner');if(!host)return;const b=document.createElement('button');b.type='button';b.className='outline';b.dataset.noTranslate='';b.dataset.catalogPdf='';b.style.cssText='margin:12px 0;min-height:44px';b.textContent=t('📄 تحميل المنتجات والأسعار PDF','📄 Download products and prices PDF','📄 Produkte und Preise als PDF');b.onclick=()=>save(s,ps,b);host.after(b);};
 new MutationObserver(()=>{document.querySelectorAll('[data-catalog-pdf]').forEach(b=>{if(!b.disabled)b.textContent=t('📄 تحميل المنتجات والأسعار PDF','📄 Download products and prices PDF','📄 Produkte und Preise als PDF');});}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 window.DarayaCatalogPdf={create,pdf};
})();
