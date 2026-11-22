'use strict';
(() => {
 const root=document.getElementById('app');
 if(!root)return;
 const themes={classic:['كلاسيكي أخضر','#174b36','#f3f8f4'],ocean:['أزرق عصري','#194f83','#eff6fc'],warm:['دافئ للمطاعم','#854017','#fff5eb'],rose:['وردي للموضة','#813856','#fff2f6'],ink:['داكن أنيق','#272738','#f1f1f6']};
 function settings(s){
  const value=s.translations?._appearance||{};
  return {theme:Object.hasOwn(themes,value.theme)?value.theme:'classic',layout:['cards','list','gallery'].includes(value.layout)?value.layout:'cards',density:value.density==='compact'?'compact':'comfortable',imageFit:value.imageFit==='contain'?'contain':'cover',motion:value.motion==='static'?'static':'moving',speed:value.speed==='slow'?'slow':'normal',enabled:value.enabled===true,text:typeof value.text==='string'?value.text.slice(0,240):''};
 }
 function allowed(s){return !!(user&&s&&!s.is_example&&mine().some(item=>item.id===s.id));}
 function paint(s,value){
  root.dataset.shopTheme=value.theme;root.dataset.shopLayout=value.layout;root.dataset.shopDensity=value.density||'comfortable';root.dataset.shopImageFit=value.imageFit||'cover';
  root.style.setProperty('--shop-accent',themes[value.theme][1]);root.style.setProperty('--shop-tint',themes[value.theme][2]);
  const banner=root.querySelector('.store-banner');if(!banner)return;
  let strip=root.querySelector('.shop-announcement');
  if(!value.enabled||!value.text.trim()){strip?.remove();return;}
  if(!strip){
   strip=document.createElement('aside');strip.className='shop-announcement';strip.dataset.noTranslate='';
   const viewport=document.createElement('div');viewport.className='shop-announcement-viewport';
   const text=document.createElement('p');text.dir='auto';viewport.append(text);
   strip.append(viewport);banner.after(strip);
  }
  const text=strip.querySelector('p');if(text.textContent!==value.text)text.textContent=value.text;
  strip.dataset.motion=value.motion||'moving';strip.style.setProperty('--news-duration',Math.max(16,value.text.length*(value.speed==='slow'?0.55:0.35))+'s');
 }
 function help(title,text){return '<details class="appearance-help"><summary aria-label="شرح '+title+'">؟</summary><p>'+text+'</p></details>';}
 function edit(s){
  if(!allowed(s))return;
  const uid=user.id,original=settings(s),revision=s.revision;
  let saving=false;
  const panel=document.createElement('section');panel.className='shop-appearance-editor panel';panel.dataset.noTranslate='';
  panel.innerHTML=`<div class="appearance-heading"><h2>صمّم واجهة محلك</h2>${help('المعاينة والحفظ','غيّر الخيارات وشاهدها على صفحة محلك فورًا. الحفظ ينشر اختياراتك للزوار، وإلغاء المعاينة يعيد الشكل المحفوظ. يمكنك تجربة أكثر من شكل قبل الحفظ.')}</div><form>
  <fieldset><legend>ألوان المحل</legend>${help('ألوان المحل','اختر الهوية التي تناسب صور محلك. تتغيّر ألوان العناوين وحدود الأقسام وشريط الأخبار. جرّب الدافئ للمأكولات، والوردي للأزياء، والأزرق للخدمات. كل الألوان متاحة لأي محل.')}<div class="shop-theme-options">${Object.entries(themes).map(([key,v])=>`<label style="--sample:${v[1]};--sample-tint:${v[2]}"><input type="radio" name="theme" value="${key}" ${original.theme===key?'checked':''}><span class="appearance-mini" aria-hidden="true"><i></i><b></b><b></b><b></b></span><span>${v[0]}</span></label>`).join('')}</div></fieldset>
  <fieldset><legend>طريقة عرض المنتجات</legend>${help('طريقة العرض','البطاقات تجمع الصورة والسعر بحجم متوازن. القائمة تعرض صورة صغيرة بجانب التفاصيل لتصفح أسرع. المعرض يعطي الصورة مساحة أكبر، ويصلح للأزياء والأثاث والتفاصيل البصرية.')}<div class="appearance-layout-options">${[['cards','بطاقات','صورة وسعر بتوازن'],['list','قائمة','تصفح سريع للتفاصيل'],['gallery','معرض','صور كبيرة وواضحة']].map(([key,label,note])=>`<label><input type="radio" name="layout" value="${key}" ${original.layout===key?'checked':''}><span class="layout-sketch sketch-${key}" aria-hidden="true"><i></i><i></i><i></i></span><strong>${label}</strong><small>${note}</small></label>`).join('')}</div></fieldset>
  <div class="appearance-settings-grid"><div><div class="appearance-field-title">المسافات ${help('المسافات','المريح يترك فراغًا أكبر بين المنتجات للقراءة. المتقارب يعرض منتجات أكثر على الشاشة، مع بقاء الأزرار سهلة للمس.')}</div><select name="density" aria-label="المسافات"><option value="comfortable">مريحة</option><option value="compact">متقاربة</option></select></div><div><div class="appearance-field-title">إطار الصور ${help('إطار الصور','الصورة كاملة تحافظ على أطراف القطعة مثل الفساتين والأثاث. ملء الإطار يعطي صفوفًا متناسقة وقد يقص أطراف الصورة. اختر الأنسب لصورك.')}</div><select name="imageFit" aria-label="إطار الصور"><option value="cover">ملء الإطار</option><option value="contain">الصورة كاملة</option></select></div></div>
  <fieldset class="appearance-news-settings"><legend>شريط المعلومات</legend>${help('شريط المعلومات','يظهر شريط رفيع تحت عنوان المحل عند تفعيله وكتابة النص. استخدمه لخبر قصير مثل وقت التوصيل أو وصول بضاعة. يمكنك اختيار نص متحرك أو ثابت وسرعة الحركة.')}<label class="shop-strip-toggle"><input name="enabled" type="checkbox" ${original.enabled?'checked':''}>إظهار الشريط في محلي</label><label>نص الشريط<textarea name="text" maxlength="240" rows="2" placeholder="وصلت تشكيلة الشتاء · التوصيل يومياً حتى ١٠ مساءً"></textarea></label><small data-count></small><div class="appearance-settings-grid"><label>العرض<select name="motion"><option value="moving">متحرك</option><option value="static">ثابت</option></select></label><label data-speed-field>سرعة الحركة<select name="speed"><option value="normal">هادئة</option><option value="slow">أبطأ للقراءة</option></select></label></div></fieldset>
  <div class="appearance-save-bar"><span data-preview-note role="status">معاينة على صفحة محلك</span><div class="form-actions"><button type="submit">حفظ الشكل والشريط</button><button type="button" data-cancel class="outline">إلغاء المعاينة</button><button type="button" data-reset class="outline">الشكل الافتراضي</button></div><p role="status" data-result></p></div></form>`;
  const form=panel.querySelector('form');form.elements.layout.value=original.layout;form.elements.text.value=original.text;for(const key of ['density','imageFit','motion','speed'])form.elements[key].value=original[key];
  const value=()=>({theme:form.elements.theme.value,layout:form.elements.layout.value,density:form.elements.density.value,imageFit:form.elements.imageFit.value,motion:form.elements.motion.value,speed:form.elements.speed.value,enabled:form.elements.enabled.checked,text:form.elements.text.value.trim()});
  const preview=()=>{paint(s,value());panel.querySelector('[data-count]').textContent=form.elements.text.value.length+' / 240';form.elements.text.required=form.elements.enabled.checked;panel.querySelector('[data-speed-field]').hidden=form.elements.motion.value==='static';};
  form.oninput=()=>{panel.dataset.dirty='true';preview();};form.onchange=form.oninput;
  panel.querySelector('[data-cancel]').onclick=()=>{if(saving)return;paint(s,original);panel.remove();};
  panel.querySelector('[data-reset]').onclick=()=>{panel.dataset.dirty='true';form.elements.theme.value='classic';form.elements.layout.value='cards';form.elements.enabled.checked=false;form.elements.text.value='';for(const [key,val] of Object.entries({density:'comfortable',imageFit:'cover',motion:'moving',speed:'normal'}))form.elements[key].value=val;preview();};
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
 window.addEventListener('hashchange',()=>{if(!root.querySelector('.store-banner')){delete root.dataset.shopTheme;delete root.dataset.shopLayout;delete root.dataset.shopDensity;delete root.dataset.shopImageFit;root.style.removeProperty('--shop-accent');root.style.removeProperty('--shop-tint');}});
 window.DarayaShopAppearance={settings,open:edit};
 refresh();
})();
