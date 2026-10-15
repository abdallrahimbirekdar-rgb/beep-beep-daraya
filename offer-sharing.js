'use strict';
(()=>{
 const t=(a,e,d)=>ct(a,e,d);
 const url=o=>'https://damascus-shop.com/#offers/'+encodeURIComponent(o.id);
 function wrap(ctx,text,maxWidth,maxLines){
  const words=String(text||'').trim().split(/\s+/),all=[];let line='';
  for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width<=maxWidth||!line)line=next;else{all.push(line);line=word;}}
  if(line)all.push(line);const lines=all.slice(0,maxLines);
  if(all.length>maxLines&&lines.length)lines[lines.length-1]+='…';
  return lines.map(value=>{if(ctx.measureText(value).width<=maxWidth)return value;while(value.length&&ctx.measureText(value+'…').width>maxWidth)value=value.slice(0,-1);return value+'…';});
 }
 function image(src){return new Promise(resolve=>{if(!src){resolve(null);return;}const img=new Image();let finished=false;const done=value=>{if(finished)return;finished=true;clearTimeout(timer);resolve(value);};const timer=setTimeout(()=>done(null),6000);img.crossOrigin='anonymous';img.onload=()=>done(img);img.onerror=()=>done(null);img.src=src;});}
 async function make(o){
  const m=window.DarayaOffers.meta(o),s=stores.find(s=>s.id===o.store_id),rtl=communityLang()==='ar';
  if(document.fonts?.ready)await document.fonts.ready;
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
  const gold=ctx.createLinearGradient(0,0,1080,220);gold.addColorStop(0,'#d3ac4d');gold.addColorStop(.5,'#fff0be');gold.addColorStop(1,'#dfbd60');ctx.fillStyle='#fffdf7';ctx.fillRect(0,0,1080,1350);ctx.fillStyle=gold;ctx.fillRect(0,0,1080,210);
  ctx.direction=rtl?'rtl':'ltr';ctx.textAlign='center';ctx.fillStyle='#38332c';ctx.font='bold 46px sans-serif';
  wrap(ctx,o.shop_name||s?.name||t('عروض اليوم','Today’s offers','Heutige Angebote'),960,2).forEach((line,i)=>ctx.fillText(line,540,80+i*60));
  const poster=safeImage(m.image||(o.demo?o.shop_logo:storeCover(s||{}))),photo=await image(poster?thumbnailForImage(poster):'');
  if(photo){const scale=Math.min(960/photo.width,390/photo.height),w=photo.width*scale,h=photo.height*scale;ctx.drawImage(photo,(1080-w)/2,235+(390-h)/2,w,h);}else{ctx.fillStyle='#faf1d7';ctx.fillRect(60,235,960,390);ctx.fillStyle='#8b7339';ctx.font='bold 52px sans-serif';ctx.fillText(t('عروض اليوم','Today’s offers','Heutige Angebote'),540,445);}
  ctx.fillStyle='#38332c';ctx.font='bold 43px sans-serif';wrap(ctx,o.title,960,2).forEach((line,i)=>ctx.fillText(line,540,685+i*55));
  let y=825;if(o.price!=null){ctx.font='bold 60px sans-serif';ctx.fillText(money(o.price),540,820);y=890;}
  ctx.font='30px sans-serif';wrap(ctx,m.benefit,950,2).forEach((line,i)=>ctx.fillText(line,540,y+i*42));
  ctx.font='24px sans-serif';ctx.fillStyle='#686054';ctx.fillText(t('حتى: ','Until: ','Bis: ')+communityDate(o.ends_at),540,1000);
  if(o.demo){ctx.fillStyle='#8a4f2f';ctx.font='bold 25px sans-serif';ctx.fillText(t('عرض تجريبي — غير متاح للشراء','Demo offer — not for sale','Beispielangebot — nicht kaufbar'),540,1042);}
  if(typeof QRCode!=='function')throw Error('QR unavailable');
  const holder=document.createElement('div'),qr=new QRCode(holder,{text:url(o),width:190,height:190,correctLevel:QRCode.CorrectLevel.M,useSVG:true}),model=qr._oQRCode,n=model.getModuleCount(),unit=200/(n+8),left=80,top=1090;
  ctx.fillStyle='#fff';ctx.fillRect(left,top,200,200);ctx.fillStyle='#000';for(let row=0;row<n;row++)for(let col=0;col<n;col++)if(model.isDark(row,col))ctx.fillRect(left+(col+4)*unit,top+(row+4)*unit,Math.ceil(unit),Math.ceil(unit));
  ctx.textAlign=rtl?'right':'left';ctx.fillStyle='#38332c';ctx.font='bold 33px sans-serif';ctx.fillText(t('سوق داريا الإلكتروني','Souq Daraya','Souq Daraya'),rtl?1000:330,1150);ctx.font='27px sans-serif';ctx.fillText('damascus-shop.com',rtl?1000:330,1200);ctx.font='22px sans-serif';ctx.fillText(t('امسح الرمز لتفاصيل العرض وشروطه','Scan for offer details and terms','Scannen für Details und Bedingungen'),rtl?1000:330,1250);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Image unavailable')),'image/jpeg',.9));
 }
 async function open(o){
  if(!window.DarayaReels.isPublic(o)){toast(t('انتهى العرض أو لم يعد متاحًا.','Offer ended or unavailable.','Angebot abgelaufen oder nicht verfügbar.'));return;}
  modal('<section class="offer-share-dialog" data-no-translate><h2>'+t('بطاقة العرض للمشاركة','Offer image to share','Angebotsbild zum Teilen')+'</h2><p role="status">'+t('جارٍ تجهيز الصورة…','Making image…','Bild wird erstellt…')+'</p><div data-share-preview></div></section>');
  const host=document.querySelector('.offer-share-dialog');let objectUrl='';const clean=()=>{if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl='';};document.querySelector('#modal').addEventListener('close',clean,{once:true});
  try{const blob=await make(o);if(!host.isConnected||!document.querySelector('#modal').open)return;objectUrl=URL.createObjectURL(blob);host.querySelector('[role=status]').textContent=t('شارك الصورة على واتساب أو فيسبوك. رمز QR يفتح العرض وشروطه.','Share on WhatsApp or Facebook. The QR code opens the offer and terms.','Teile das Bild über WhatsApp oder Facebook. Der QR-Code öffnet das Angebot und seine Bedingungen.');
   const img=document.createElement('img');img.src=objectUrl;img.alt=o.title;host.querySelector('[data-share-preview]').append(img);
   const actions=document.createElement('div');actions.className='form-actions';const download=document.createElement('a');download.className='button';download.href=objectUrl;download.download='daraya-offer-'+o.id+'.jpg';download.textContent=t('تنزيل الصورة','Download image','Bild herunterladen');actions.append(download);
   const file=new File([blob],download.download,{type:'image/jpeg'});if(navigator.canShare?.({files:[file]})){const b=document.createElement('button');b.textContent=t('مشاركة الصورة','Share image','Bild teilen');b.onclick=async()=>{try{await navigator.share({files:[file],title:o.title});}catch(err){if(err.name!=='AbortError')toast(t('استخدم تنزيل الصورة ثم شاركها.','Download the image, then share it.','Lade das Bild herunter und teile es dann.'));}};actions.append(b);}host.append(actions);
  }catch{if(host.isConnected)host.querySelector('[role=status]').textContent=t('تعذر تجهيز الصورة. حاول مجددًا أو استخدم مشاركة الرابط.','Could not make the image. Try again or share the link.','Bild konnte nicht erstellt werden. Erneut versuchen oder Link teilen.');}
 }
 window.DarayaOfferSharing={open,wrap,url};
})();
