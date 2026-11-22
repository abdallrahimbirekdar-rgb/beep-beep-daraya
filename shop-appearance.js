'use strict';
(() => {
 const root=document.getElementById('app');
 if(!root)return;
 const themes={classic:['كلاسيكي أخضر','#174b36','#f3f8f4'],ocean:['أزرق عصري','#194f83','#eff6fc'],warm:['دافئ للمطاعم','#854017','#fff5eb'],rose:['وردي للموضة','#813856','#fff2f6'],ink:['داكن أنيق','#272738','#f1f1f6']};
 function settings(s){
  const value=s.translations?._appearance||{};
  return {theme:Object.hasOwn(themes,value.theme)?value.theme:'classic',layout:['cards','list','gallery'].includes(value.layout)?value.layout:'cards',enabled:value.enabled===true,text:typeof value.text==='string'?value.text.slice(0,240):''};
 }
 function allowed(s){return !!(user&&s&&!s.is_example&&mine().some(item=>item.id===s.id));}
 function paint(s,value){
  root.dataset.shopTheme=value.theme;root.dataset.shopLayout=value.layout;
  root.style.setProperty('--shop-accent',themes[value.theme][1]);root.style.setProperty('--shop-tint',themes[value.theme][2]);
  const banner=root.querySelector('.store-banner');if(!banner)return;
  let strip=root.querySelector('.shop-announcement');
  if(!value.enabled||!value.text.trim()){strip?.remove();return;}
  if(!strip){
   strip=document.createElement('aside');strip.className='shop-announcement';strip.dataset.noTranslate='';
   const viewport=document.createElement('div');viewport.className='shop-announcement-viewport';
   const text=document.createElement('p');text.dir='auto';viewport.append(text);
   const pause=document.createElement('button');pause.type='button';pause.className='outline';pause.textContent='إيقاف الحركة';pause.setAttribute('aria-pressed','false');
   pause.onclick=()=>{const paused=strip.classList.toggle('paused');pause.textContent=paused?'تشغيل الحركة':'إيقاف الحركة';pause.setAttribute('aria-pressed',String(paused));};
   strip.append(viewport,pause);banner.after(strip);
  }
  strip.querySelector('p').textContent=value.text;
 }
 function edit(s){
  if(!allowed(s))return;
  const uid=user.id,original=settings(s),revision=s.revision;
  let saving=false;
  const panel=document.createElement('section');panel.className='shop-appearance-editor panel';panel.dataset.noTranslate='';
  panel.innerHTML=`<h2>شكل المحل وشريط المعلومات</h2><form><fieldset><legend>الثيم</legend><div class="shop-theme-options">${Object.entries(themes).map(([key,value])=>`<label style="--sample:${value[1]}"><input type="radio" name="theme" value="${key}" ${original.theme===key?'checked':''}><span class="shop-theme-sample"></span>${value[0]}</label>`).join('')}</div></fieldset><label>طريقة عرض المنتجات<select name="layout"><option value="cards">بطاقات متوازنة</option><option value="list">قائمة سريعة</option><option value="gallery">معرض بصور أكبر</option></select></label><label class="shop-strip-toggle"><input name="enabled" type="checkbox" ${original.enabled?'checked':''}>تفعيل شريط المعلومات</label><label>نص الشريط<textarea name="text" maxlength="240" rows="3" placeholder="مثلاً: التوصيل يومياً من الساعة ١٢ حتى ١٠ مساءً"></textarea></label><small data-count></small><p>التغييرات تظهر لك مباشرة للمعاينة. اضغط حفظ ليشاهدها الزوار.</p><div class="form-actions"><button type="submit">حفظ الشكل والشريط</button><button type="button" data-cancel class="outline">إلغاء المعاينة</button><button type="button" data-reset class="outline">الشكل الافتراضي</button></div><p role="status" data-result></p></form>`;
  const form=panel.querySelector('form');form.elements.layout.value=original.layout;form.elements.text.value=original.text;
  const value=()=>({theme:form.elements.theme.value,layout:form.elements.layout.value,enabled:form.elements.enabled.checked,text:form.elements.text.value.trim()});
  const preview=()=>{paint(s,value());panel.querySelector('[data-count]').textContent=form.elements.text.value.length+' / 240';form.elements.text.required=form.elements.enabled.checked;};
  form.oninput=()=>{panel.dataset.dirty='true';preview();};form.onchange=form.oninput;
  panel.querySelector('[data-cancel]').onclick=()=>{if(saving)return;paint(s,original);panel.remove();};
  panel.querySelector('[data-reset]').onclick=()=>{panel.dataset.dirty='true';form.elements.theme.value='classic';form.elements.layout.value='cards';form.elements.enabled.checked=false;form.elements.text.value='';preview();};
  form.onsubmit=async event=>{
   event.preventDefault();if(saving||user?.id!==uid||!allowed(s))return;
   const draft=value();if(draft.enabled&&!draft.text){form.elements.text.focus();return;}
   saving=true;form.querySelectorAll('button,input,textarea,select').forEach(el=>el.disabled=true);
   const status=panel.querySelector('[data-result]');status.textContent='جاري حفظ شكل المحل…';
   try{
    const translations={...(s.translations||{}),_appearance:draft};
    const response=await api.from('stores').update({translations}).eq('id',s.id).eq('revision',revision).select('id,revision');
    if(response.error)throw response.error;
    if(!response.data?.length)throw Error('تغيّرت بيانات المحل. انسخ نصك ثم حدّث الصفحة وأعد المحاولة.');
    if(user?.id!==uid)return;
    s.translations=translations;s.revision=response.data[0].revision;
    window.DarayaHomeCatalog?.invalidate();panel.remove();paint(s,draft);toast('تم حفظ شكل المحل وشريط المعلومات');
   }catch(error){status.textContent=error.message||'تعذر الحفظ. تحقق من الاتصال وأعد المحاولة.';}
   finally{saving=false;if(panel.isConnected)form.querySelectorAll('button,input,textarea,select').forEach(el=>el.disabled=false);}
  };
  const existing=root.querySelector('.shop-appearance-editor');if(existing?.dataset.dirty==='true'&&!confirm('لديك معاينة لم تحفظها. هل تريد البدء من جديد؟'))return;existing?.remove();root.querySelector('.store-banner').after(panel);preview();panel.scrollIntoView({block:'start',behavior:'smooth'});
 }
 function enhance(s){
  if(!root.querySelector('.store-banner'))return;
  paint(s,settings(s));
  if(allowed(s)&&!root.querySelector('.shop-appearance-entry')){
   const button=document.createElement('button');button.type='button';button.className='outline shop-appearance-entry';button.dataset.noTranslate='';button.textContent='تخصيص شكل المحل والشريط';button.onclick=()=>edit(s);root.querySelector('.store-banner').after(button);
  }
 }
 window.addEventListener('beforeunload',event=>{if(root.querySelector('.shop-appearance-editor[data-dirty="true"]')){event.preventDefault();event.returnValue='';}});
 let lastBanner=null,lastStore=null,lastActor=null,queued=false;
 function refresh(){
  queued=false;
  const banner=root.querySelector('.store-banner');
  const id=banner?.dataset.storefront||location.hash.match(/^#store\/([^/]+)/)?.[1];
  const s=stores.find(item=>item.id===id);
  if(!banner||!s){lastBanner=null;return;}
  const changed=banner!==lastBanner||s.id!==lastStore||user?.id!==lastActor;
  if(changed){lastBanner=banner;lastStore=s.id;lastActor=user?.id;enhance(s);}
  else if(allowed(s)&&!root.querySelector('.shop-appearance-entry'))enhance(s);
  const entry=root.querySelector('.shop-appearance-entry'),bar=banner.querySelector('.owner-store-bar');
  if(entry&&bar&&entry.parentElement!==bar)bar.append(entry);
  if(entry&&!allowed(s)){entry.remove();root.querySelector('.shop-appearance-editor')?.remove();paint(s,settings(s));}
 }
 new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(refresh);}}).observe(root,{childList:true,subtree:true});
 const previous=renderStore;
 renderStore=function(id){const result=previous.apply(this,arguments);const s=stores.find(item=>item.id===id);if(s)enhance(s);return result;};
 window.addEventListener('hashchange',()=>{if(!root.querySelector('.store-banner')){delete root.dataset.shopTheme;delete root.dataset.shopLayout;root.style.removeProperty('--shop-accent');root.style.removeProperty('--shop-tint');}});
 window.DarayaShopAppearance={settings};
 refresh();
})();
