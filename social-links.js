'use strict';
(() => {
 const networks=[
  ['facebook','فيسبوك','Facebook','facebook.com', 'f'],
  ['instagram','إنستغرام','Instagram','instagram.com','◎'],
  ['whatsapp','واتساب','WhatsApp','wa.me','◉'],
  ['telegram','تيليغرام','Telegram','t.me','➤'],
  ['tiktok','تيك توك','TikTok','tiktok.com','♪'],
  ['youtube','يوتيوب','YouTube','youtube.com','▶'],
  ['website','الموقع الإلكتروني','Website','example.com','↗']
 ];
 function label(n){return document.documentElement.lang==='ar'?n[1]:n[2];}
 function normalize(key,value){
  const raw=String(value||'').trim();if(!raw)return '';
  const u=new URL(/^https?:\/\//i.test(raw)?raw:'https://'+raw);
  if(!['http:','https:'].includes(u.protocol)||u.username||u.password||!u.hostname.includes('.'))throw Error('رابط غير صالح');
  const hosts={facebook:['facebook.com','fb.com','fb.me'],instagram:['instagram.com'],whatsapp:['wa.me','api.whatsapp.com','chat.whatsapp.com','whatsapp.com'],telegram:['t.me','telegram.me'],tiktok:['tiktok.com'],youtube:['youtube.com','youtu.be']};
  const host=u.hostname.toLowerCase();if(hosts[key]&&!hosts[key].some(h=>host===h||host.endsWith('.'+h)))throw Error('استخدم رابط '+(networks.find(n=>n[0]===key)?.[1]||key));
  u.protocol='https:';return u.href;
 }
 function links(s){const saved=s.translations?._social_links||{};return networks.flatMap(n=>{try{const url=normalize(n[0],saved[n[0]]);return url?[{network:n,url}]:[];}catch{return [];}});}
 function fields(form,s){if(!form||form.querySelector('[data-social-editor]'))return;
  const saved=s.translations?._social_links||{};
  const html='<fieldset class="social-links-editor" data-social-editor><legend>روابط التواصل الاجتماعي</legend><p class="field-hint">أضف روابط حسابات المكان. تظهر للزوار فقط الوسائل التي وضعت رابطها. لحذف وسيلة امسح رابطها ثم احفظ.</p><input type="hidden" name="social_links_present" value="1"><div class="form-grid">'+networks.map(n=>'<label>'+esc(label(n))+'<input type="text" inputmode="url" dir="ltr" autocomplete="off" maxlength="2000" name="social_'+n[0]+'" value="'+esc(saved[n[0]]||'')+'" placeholder="https://'+n[3]+'/…"></label>').join('')+'</div></fieldset>';
  const footer=form.querySelector('.editor-footer,.form-actions');if(footer)footer.insertAdjacentHTML('beforebegin',html);else form.insertAdjacentHTML('beforeend',html);
  for(const n of networks){const input=form.elements['social_'+n[0]];const validate=()=>{try{normalize(n[0],input.value);input.setCustomValidity('');}catch{input.setCustomValidity('أدخل رابطًا صالحًا لـ '+n[1]);}};input.addEventListener('input',validate);validate();}
 }
 const previousRead=readTranslations;readTranslations=function(f,s,names){const result=previousRead.apply(this,arguments);if(f.has('social_links_present')){const saved={};for(const n of networks){let url;try{url=normalize(n[0],f.get('social_'+n[0]));}catch{throw Error('أدخل رابطًا صالحًا لـ '+n[1]);}if(url)saved[n[0]]=url;}result._social_links=saved;}return result;};
 const previousEditor=merchantEditor;merchantEditor=function(s,section){previousEditor.apply(this,arguments);if(section==='details')fields(document.querySelector('#merchant-editor'),s);};
 const previousEdit=editStore;editStore=function(s={}){previousEdit.apply(this,arguments);fields(document.querySelector('#edit-form'),s);};
 const previousStore=renderStore;renderStore=function(id){previousStore.apply(this,arguments);const s=stores.find(x=>x.id===id&&x.active&&!x.deleted_at);const banner=document.querySelector('.store-banner');document.querySelectorAll('[data-store-social]').forEach(x=>x.remove());if(!s||!banner)return;const saved=links(s);if(!saved.length)return;banner.insertAdjacentHTML('afterend','<section class="panel store-social-links" data-store-social aria-label="'+(document.documentElement.lang==='ar'?'تواصل مع المكان':'Social links')+'"><h2>'+(document.documentElement.lang==='ar'?'تابعنا وتواصل معنا':document.documentElement.lang==='de'?'Folge uns und kontaktiere uns':'Follow and contact us')+'</h2><div class="store-social-buttons">'+saved.map(({network:n,url})=>'<a class="store-social-link" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" aria-label="'+esc(label(n))+'"><span class="social-network-icon" aria-hidden="true">'+n[4]+'</span><span>'+esc(label(n))+'</span></a>').join('')+'</div></section>');};
})();
