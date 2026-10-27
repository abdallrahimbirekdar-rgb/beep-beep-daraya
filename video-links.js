'use strict';
function videoText(ar,en,de){return document.documentElement.lang==='de'?de:document.documentElement.lang==='en'?en:ar;}
function parsePlaceVideo(value){
 const raw=String(value||'').trim();if(!raw)return null;
 if(raw.length>2000||/[<>\u0000-\u0020]/.test(raw))throw Error('invalid-video-link');
 let u;try{u=new URL(raw);}catch{throw Error('invalid-video-link');}
 const host=u.hostname.toLowerCase();
 if(u.protocol!=='https:'||u.username||u.password||u.port||!host.includes('.')||host.endsWith('.local')||host.endsWith('.localhost')||host==='localhost'||/^[\d.]+$/.test(host)||host.includes(':'))throw Error('invalid-video-link');
 const path=u.pathname,parts=path.split('/').filter(Boolean);let id;
 if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com','youtu.be','www.youtu.be'].includes(host)){
  id=host.endsWith('youtu.be')?parts[0]:parts[0]==='watch'?u.searchParams.get('v'):['shorts','embed','live'].includes(parts[0])?parts[1]:null;
  if(!/^[\w-]{11}$/.test(id||''))throw Error('invalid-video-link');
  const embed=new URL('https://www.youtube-nocookie.com/embed/'+id);embed.searchParams.set('autoplay','0');embed.searchParams.set('playsinline','1');
  const timing=u.searchParams.get('start')||u.searchParams.get('t')||'';let start=0;if(/^\d+$/.test(timing))start=+timing;else{const m=/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(timing);if(m)start=(+m[1]||0)*3600+(+m[2]||0)*60+(+m[3]||0);}if(start>0&&start<86400)embed.searchParams.set('start',String(start));
  return {url:'https://www.youtube.com/watch?v='+id+(start>0&&start<86400?'&t='+start:'') ,kind:'embed',provider:'YouTube',src:embed.href};
 }
 if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(host)){
  const m=/^\/(?:video\/)?(\d+)(?:\/([a-f\d]{6,64}))?\/?$/i.exec(path);if(!m)throw Error('invalid-video-link');
  const hash=m[2]||u.searchParams.get('h')||'';if(hash&&!/^[a-f\d]{6,64}$/i.test(hash))throw Error('invalid-video-link');
  const embed=new URL('https://player.vimeo.com/video/'+m[1]);embed.searchParams.set('autoplay','0');if(hash)embed.searchParams.set('h',hash);
  return {url:'https://vimeo.com/'+m[1]+(hash?'/'+hash:''),kind:'embed',provider:'Vimeo',src:embed.href};
 }
 if(['facebook.com','www.facebook.com','m.facebook.com','web.facebook.com','fb.watch'].includes(host)){
  if(host!=='fb.watch'&&(u.searchParams.has('v')&&/^\d+$/.test(u.searchParams.get('v')||'')||/\/videos\/(?:[^/]+\/)?\d+\/?$/.test(path)||/^\/reel\/\d+\/?$/.test(path))){
   let url;if(/^\/reel\//.test(path))url='https://www.facebook.com'+path;else{const match=/\/videos\/(?:[^/]+\/)?(\d+)\/?$/.exec(path);url='https://www.facebook.com/watch/?v='+(match?match[1]:u.searchParams.get('v'));}
   const embed=new URL('https://www.facebook.com/plugins/video.php');embed.searchParams.set('href',url);embed.searchParams.set('show_text','false');embed.searchParams.set('autoplay','false');
   return {url,kind:'embed',provider:'Facebook',src:embed.href};
  }
  return {url:u.href,kind:'link',provider:'Facebook'};
 }
 if(/\.(mp4|webm|ogv)$/i.test(path))return {url:u.href,kind:'video',provider:host,src:u.href};
 return {url:u.href,kind:'link',provider:host};
}
function placeVideoLink(record){try{return parsePlaceVideo(record.translations?._video_url);}catch{return null;}}
function placeVideoLinks(record){
 const values=Array.isArray(record.translations?._video_urls)?record.translations._video_urls:[record.translations?._video_url];
 const links=[];for(const value of values.slice(0,8)){try{const info=parsePlaceVideo(value);if(info&&!links.some(x=>x.url===info.url))links.push(info);}catch{}}return links;
}
function readShopVideoLinks(value){const links=[];for(const raw of String(value||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean)){let info;try{info=parsePlaceVideo(raw);}catch{throw Error(videoLinkError());}if(info&&!links.includes(info.url))links.push(info.url);}if(links.length>8)throw Error(videoText('يمكن إضافة ٨ فيديوهات للمتجر كحد أقصى.','Add up to 8 shop videos.','Füge höchstens 8 Geschäftsvideos hinzu.'));return links;}
function videoLinkError(){return videoText('أدخل رابط فيديو صحيحًا يبدأ بـ https://، دون كود HTML.','Enter a valid video link starting with https://, without HTML code.','Gib einen gültigen Videolink mit https:// ein, keinen HTML-Code.');}
function videoSurface(info,title){
 const box=document.createElement('div');box.className='place-video-surface';box.dataset.noTranslate='';
 if(info.kind==='link'){
  box.innerHTML='<p>'+videoText('هذا الرابط لا يدعم مشغّلاً داخل الموقع حاليًا. يمكنك مشاهدة الفيديو في مصدره. استخدم رابط الفيديو الكامل بدل رابط مشاركة مختصر إن توفر.','This link has no supported player here. Watch it on its source site. Use the full video link instead of a short share link when possible.','Dieser Link hat hier keinen unterstützten Player. Öffne das Video auf der Quellseite. Nutze möglichst den vollständigen Videolink statt eines kurzen Teilen-Links.')+'</p>';
 }else{
  const button=document.createElement('button');button.type='button';button.className='place-video-launch';button.innerHTML='<span class="place-video-play" aria-hidden="true">▶</span><strong>'+videoText('شاهد الفيديو','Watch video','Video ansehen')+'</strong><small>'+esc(info.provider)+'</small>';
  button.onclick=()=>{
   const stage=document.createElement('div');stage.className='place-video-stage';
   if(info.kind==='video'){const player=document.createElement('video');player.src=info.src;player.controls=true;player.playsInline=true;player.preload='none';player.setAttribute('aria-label',title);stage.append(player);player.addEventListener('error',()=>{const warning=document.createElement('p');warning.className='error';warning.textContent=videoText('تعذر تحميل الفيديو. جرّب الرابط الأصلي أدناه.','Video could not load. Try the original link below.','Video konnte nicht geladen werden. Nutze den Originallink unten.');box.append(warning);},{once:true});}
   else{const frame=document.createElement('iframe');const playback=new URL(info.src);if(info.provider==='YouTube')playback.searchParams.set('autoplay','1');else if(info.provider==='Vimeo')playback.searchParams.set('autoplay','1');else if(info.provider==='Facebook')playback.searchParams.set('autoplay','true');frame.src=playback.href;frame.title=title;frame.allow='autoplay; fullscreen; picture-in-picture; encrypted-media';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';stage.append(frame);}
   button.replaceWith(stage);
  };box.addEventListener('daraya-video-stop',()=>{const stage=box.querySelector('.place-video-stage');if(!stage)return;try{stage.querySelector('video')?.pause();}catch{}stage.replaceWith(button);});box.append(button);
  const hint=document.createElement('p');hint.className='field-hint';hint.textContent=videoText('اضغط للمشاهدة. إذا تعذر التشغيل هنا، افتح الفيديو في مصدره.','Tap to watch. If the video cannot play here, open it on its source site.','Zum Ansehen antippen. Falls das Video hier nicht abspielt, öffne es auf der Quellseite.');box.append(hint);
 }
 const original=document.createElement('a');original.className='place-video-original';original.href=info.url;original.target=/ShahinAndroid\//.test(navigator.userAgent)?'_self':'_blank';original.rel='noopener';original.referrerPolicy='strict-origin-when-cross-origin';original.textContent=videoText('فتح الفيديو في مصدره','Open original video','Originalvideo öffnen');box.append(original);return box;
}
function addVideoFields(form,record,product=false){
 if(!form||form.querySelector('[data-video-editor]'))return;
 const section=document.createElement('fieldset');section.className='place-video-editor';section.dataset.videoEditor='';section.dataset.noTranslate='';
 const label=product?videoText('رابط فيديو المنتج — اختياري','Product video link — optional','Produktvideolink — optional'):videoText('رابط فيديو تعريفي للمتجر — اختياري','Shop video link — optional','Vorstellungsvideo — optional');
 section.innerHTML='<legend>'+videoText('فيديو من رابط','Video from a link','Video per Link')+'</legend><label>'+label+'<input name="video_url" type="url" inputmode="url" dir="ltr" maxlength="2000" autocomplete="off" placeholder="https://www.youtube.com/watch?v=…" value="'+esc(record.translations?._video_url||'')+'"></label><p class="field-hint">'+videoText('ضع رابطًا فقط من يوتيوب أو فيسبوك أو Vimeo أو رابط فيديو مباشر MP4 / WebM. يمكنك حفظ رابط من موقع آخر؛ إذا لم يدعم التشغيل هنا سيفتح في مصدره. فيديوهات المنصات تحتاج السماح بالتضمين. امسح الرابط واحفظ لإزالة الفيديو.','Paste a YouTube, Facebook, Vimeo or direct MP4 / WebM video link. Other site links can be saved; if playback here is not supported, they open on the source site. Platform videos must allow embedding. Clear the link and save to remove the video.','Füge einen YouTube-, Facebook-, Vimeo- oder direkten MP4-/WebM-Link ein. Andere Links können gespeichert werden; ohne unterstützten Player öffnen sie auf der Quellseite. Plattformvideos müssen Einbettung erlauben. Lösche den Link und speichere zum Entfernen.')+'</p><div class="form-actions"><button type="button" class="outline" data-preview-video>'+videoText('معاينة الفيديو','Preview video','Video-Vorschau')+'</button><button type="button" class="outline" data-clear-video>'+videoText('إزالة الرابط','Remove link','Link entfernen')+'</button></div><p data-video-status role="status"></p><div data-video-preview></div>';
 const footer=form.querySelector('.editor-footer,.form-actions');if(footer)footer.before(section);else form.append(section);
 const input=section.querySelector('input'),status=section.querySelector('[data-video-status]'),preview=section.querySelector('[data-video-preview]');
 const clearPreview=()=>{preview.replaceChildren();status.textContent='';input.setCustomValidity('');try{parsePlaceVideo(input.value);}catch{input.setCustomValidity(videoLinkError());}};input.addEventListener('input',clearPreview);clearPreview();
 section.querySelector('[data-preview-video]').onclick=()=>{preview.replaceChildren();try{const info=parsePlaceVideo(input.value);if(!info){status.textContent=videoText('ضع رابط الفيديو أولًا.','Add a video link first.','Füge zuerst einen Videolink ein.');return;}status.textContent='';preview.append(videoSurface(info,label));}catch{status.textContent=videoLinkError();input.reportValidity();}};
 section.querySelector('[data-clear-video]').onclick=()=>{input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));};
}
const videoReadTranslationsBase=readTranslations;
readTranslations=function(form,record,fields){const result=videoReadTranslationsBase.apply(this,arguments);if(form.has('video_url')){let info;try{info=parsePlaceVideo(form.get('video_url'));}catch{throw Error(videoLinkError());}if(info)result._video_url=info.url;else delete result._video_url;if(Array.isArray(result._video_urls)){result._video_urls=[...(info?[info.url]:[]),...result._video_urls.slice(1)].filter((url,i,all)=>all.indexOf(url)===i);if(!result._video_urls.length)delete result._video_urls;}}if(form.has('shop_video_links')){const links=readShopVideoLinks(form.get('shop_video_links'));if(links.length){result._video_urls=links;result._video_url=links[0];}else{delete result._video_urls;delete result._video_url;}}return result;};
const videoMerchantEditorBase=merchantEditor;
merchantEditor=function(s,section){if(section==='videos'){shopVideosEditor(s);return;}videoMerchantEditorBase.apply(this,arguments);if(section==='details')addVideoFields(document.querySelector('#merchant-editor'),s);};
const videoEditStoreBase=editStore;
editStore=function(s={}){videoEditStoreBase.apply(this,arguments);addVideoFields(document.querySelector('#edit-form'),s);};
const videoEditProductBase=editProduct;
editProduct=function(s,p={}){videoEditProductBase.apply(this,arguments);addVideoFields(document.querySelector('#edit-form'),p,true);};
const videoRenderStoreBase=renderStore;
renderStore=function(id){
 videoRenderStoreBase.apply(this,arguments);const s=stores.find(x=>x.id===id&&x.active&&!x.deleted_at),banner=document.querySelector('.store-banner');if(!s||!banner)return;
 const section=document.createElement('section');section.id='sf-videos';section.className='panel place-video-panel';section.dataset.noTranslate='';
 const heading=document.createElement('h2');heading.textContent=videoText('فيديوهات المتجر','Shop videos','Geschäftsvideos');section.append(heading);
 const links=placeVideoLinks(s);if(links.length){links.forEach((info,i)=>{const item=document.createElement('article');item.className='shop-video-item';const h=document.createElement('h3');h.textContent=videoText('فيديو المتجر','Shop video','Geschäftsvideo')+' '+(i+1);item.append(h,videoSurface(info,s.name+' '+(i+1)));section.append(item);});}else{const empty=document.createElement('p');empty.textContent=videoText('لم يضف المتجر فيديوهات بعد.','This shop has not added videos yet.','Dieses Geschäft hat noch keine Videos hinzugefügt.');section.append(empty);}banner.parentElement.append(section);

 document.querySelectorAll('.product[data-product-id]').forEach(card=>{const p=products.find(x=>x.id===card.dataset.productId),video=p&&placeVideoLink(p);if(!video)return;const button=document.createElement('button');button.type='button';button.className='outline product-video-button';button.dataset.noTranslate='';button.innerHTML='<span aria-hidden="true">▶</span> '+videoText('فيديو المنتج','Product video','Produktvideo');button.onclick=()=>{modal('<section class="product-video-dialog" data-no-translate><h2>'+esc(p.name)+'</h2><div data-product-video-player></div></section>');document.querySelector('[data-product-video-player]').append(videoSurface(video,p.name));};card.querySelector(':scope>div')?.append(button);});
};
// Release third-party players and stop direct video playback when a dialog closes.
document.querySelector('#modal').addEventListener('close',()=>{document.querySelectorAll('#modal .place-video-stage').forEach(x=>x.remove());});
if(typeof merchantGuideLessons!=='undefined')merchantGuideLessons.splice(5,0,['details',['فيديو المتجر والمنتج','Shop and product videos','Geschäfts- und Produktvideos'],['ضع رابط فيديو تعريفي في معلومات المتجر، أو رابط فيديو للمنتج في تعديل المنتج. استخدم معاينة الفيديو قبل الحفظ. يدعم المشغّل يوتيوب وفيسبوك وVimeo وروابط MP4 وWebM المباشرة. الروابط الأخرى تُحفظ وتفتح في مصدرها إذا لم يدعم الموقع التضمين. تأكد أن الفيديو يسمح بالتضمين. لإزالته امسح الرابط واحفظ.','Add a shop video link in shop details or a product video link in Edit product. Preview before saving. YouTube, Facebook, Vimeo and direct MP4 / WebM links have players here. Other links open on their source site when embedding is not supported. The video must allow embedding. Clear the link and save to remove it.','Ergänze ein Geschäftsvideo in den Geschäftsinformationen oder ein Produktvideo unter Produkt bearbeiten. Prüfe die Vorschau vor dem Speichern. YouTube, Facebook, Vimeo und direkte MP4-/WebM-Links haben hier Player. Andere Links öffnen ohne Einbettungsunterstützung auf der Quellseite. Einbettung muss erlaubt sein. Lösche den Link und speichere zum Entfernen.']]);

function shopVideosEditor(s){
 const box=document.querySelector('#dashboard-content');if(!box)return;
 box.innerHTML='<section class="panel" data-no-translate><h2>'+videoText('فيديوهات المتجر','Shop videos','Geschäftsvideos')+'</h2><p>'+videoText('أضف حتى ٨ روابط فيديو. ضع كل رابط في سطر منفصل. تظهر الفيديوهات في قسم مستقل بصفحة متجرك.','Add up to 8 video links, one per line. Videos appear in their own section on your shop page.','Füge bis zu 8 Videolinks hinzu, einen pro Zeile. Videos erscheinen in einem eigenen Bereich auf deiner Geschäftsseite.')+'</p><form id="merchant-videos-form"><label>'+videoText('روابط فيديوهات المتجر','Shop video links','Links zu Geschäftsvideos')+'<textarea name="shop_video_links" dir="ltr" rows="8" maxlength="16008" placeholder="https://www.youtube.com/watch?v=…">'+esc(placeVideoLinks(s).map(x=>x.url).join('\n'))+'</textarea></label><p class="field-hint">'+videoText('يدعم يوتيوب وفيسبوك وVimeo وروابط MP4 وWebM. الروابط الأخرى تفتح في مصدرها. لحذف فيديو، امسح سطره ثم احفظ.','Supports YouTube, Facebook, Vimeo and MP4/WebM links. Other links open on their source site. Delete a video by clearing its line and saving.','Unterstützt YouTube, Facebook, Vimeo und MP4/WebM-Links. Andere Links öffnen auf ihrer Quellseite. Lösche eine Videozeile und speichere, um es zu entfernen.')+'</p><div class="form-actions"><button type="submit">'+videoText('حفظ فيديوهات المتجر','Save shop videos','Geschäftsvideos speichern')+'</button><button type="button" class="outline" data-shop-video-preview>'+videoText('معاينة الفيديوهات','Preview videos','Videos ansehen')+'</button></div><div data-shop-video-status role="status"></div><div data-shop-video-preview-list></div></form></section>';
 const form=box.querySelector('form'),status=form.querySelector('[data-shop-video-status]'),input=form.elements.shop_video_links,preview=form.querySelector('[data-shop-video-preview-list]');
 input.oninput=()=>{input.setCustomValidity('');status.className='';status.textContent='';preview.replaceChildren();};
 const fail=error=>{status.className='error';status.textContent=error.message||videoLinkError();};
 form.querySelector('[data-shop-video-preview]').onclick=()=>{preview.replaceChildren();try{const links=readShopVideoLinks(input.value);for(const link of links)preview.append(videoSurface(parsePlaceVideo(link),s.name));if(!links.length)status.textContent=videoText('أضف رابط فيديو للمعاينة.','Add a video link to preview.','Füge einen Videolink für die Vorschau hinzu.');}catch(error){fail(error);}};
 form.onsubmit=async event=>{event.preventDefault();const button=form.querySelector('[type="submit"]');if(button.disabled)return;button.disabled=true;const uid=user?.id;try{const translations=readTranslations(new FormData(form),s,[]);if(new TextEncoder().encode(JSON.stringify(translations)).length>20000)throw Error(videoText('الروابط طويلة جدًا. قلّل عدد الروابط أو استخدم روابط أقصر.','The links are too long. Use fewer or shorter links.','Die Links sind zu lang. Verwende weniger oder kürzere Links.'));let query=api.from('stores').update({translations}).eq('id',s.id).eq('revision',s.revision);const result=await query.select('id');if(result.error)throw result.error;if(!result.data?.length)throw Error(videoText('تغيّرت بيانات المتجر. حدّث الصفحة ثم أعد المحاولة.','Shop details changed. Refresh and try again.','Geschäftsdaten wurden geändert. Lade neu und versuche es erneut.'));if(!form.isConnected||user?.id!==uid)return;await reload();if(!form.isConnected||user?.id!==uid)return;render();toast(videoText('تم حفظ فيديوهات المتجر','Shop videos saved','Geschäftsvideos gespeichert'));}catch(error){if(form.isConnected)fail(error);}finally{if(form.isConnected)button.disabled=false;}};
}

document.querySelector('#app')?.addEventListener('click',event=>{if(!event.target.closest?.('.sf-section-return,.sf-section-tile'))return;document.querySelectorAll('#app .place-video-surface').forEach(surface=>surface.dispatchEvent(new Event('daraya-video-stop')));});
