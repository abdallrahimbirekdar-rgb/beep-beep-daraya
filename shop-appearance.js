'use strict';
(() => {
 const root=document.getElementById('app');
 if(!root)return;
 let activeDraft=null;
 const themes={classic:['كلاسيكي أخضر','#174b36','#f3f8f4'],ocean:['أزرق عصري','#194f83','#eff6fc'],warm:['دافئ للمطاعم','#854017','#fff5eb'],rose:['وردي للموضة','#813856','#fff2f6'],ink:['داكن أنيق','#272738','#f1f1f6']};
 const sections={'sf-products':['المنتجات','products'],'sf-info':['التواصل والمعلومات','contact'],'sf-offers':['العروض والمتابعة','offers'],'sf-tools':['صور المحل','photos']};
 const choices={iconStyle:[['illustrated','رسوم وصور','الرسوم الحالية وصور منتجاتك'],['outline','خطوط بسيطة','رموز خفيفة وواضحة'],['duotone','ألوان هادئة','رموز داخل خلفية بلون المحل'],['letters','حروف كبيرة','اسم القسم هو العنصر الأبرز']],sectionStyle:[['tiles','بطاقات','شبكة متوازنة'],['circles','دوائر','رموز دائرية مع عنوان أسفلها'],['rows','صفوف','كل قسم في سطر واضح'],['compact','اختصارات','أزرار صغيرة بصفوف مرنة']],heroStyle:[['standard','غلاف عريض','الصورة أولًا ثم المعلومات'],['centered','هوية في المنتصف','صورة أصغر واسم في المنتصف'],['compact','رأس مختصر','صورة جانبية ومساحة أقل']],cardStyle:[['soft','ناعمة','زوايا دائرية وظل خفيف'],['bordered','بإطار','حد واضح يحيط بكل منتج'],['flat','بسيطة','تفاصيل نظيفة دون ظل']]};
 const cleanOrder=order=>[...new Set([...(Array.isArray(order)?order:[]).filter(k=>Object.hasOwn(sections,k)),...Object.keys(sections)])];
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function icon(kind,style='outline'){
  if(style==='illustrated'&&window.DarayaShopTileIcon)return window.DarayaShopTileIcon(kind);
  const art={products:'<path d="M5 8h14l1 13H4L5 8Zm3 0V6a4 4 0 0 1 8 0v2"/>',contact:'<path d="M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 0 1 14 0Z"/><circle cx="12" cy="9" r="2"/>',offers:'<path d="m3 12 9-9h8v8l-9 10Z"/><circle cx="16" cy="7" r="1"/><path d="m8 15 7-7"/>',photos:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8" cy="9" r="2"/><path d="m3 17 6-5 4 3 3-4 5 6"/>'};
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(art[kind]||art.products)+'</svg>';
 }
 function decorateNav(value){
  const nav=root.querySelector('.sf-section-nav');if(!nav)return;
  // Saved shop ordering is the sole ordering authority for this navigation.
  nav.dataset.appearanceOrder='managed';
  const cards=[...nav.children];const order=cleanOrder(value.sectionOrder),sorted=[...cards].sort((a,b)=>{const index=n=>order.includes(n.dataset.target)?order.indexOf(n.dataset.target):100+cards.indexOf(n);return index(a)-index(b);});
  sorted.forEach((card,i)=>{if(nav.children[i]!==card)nav.insertBefore(card,nav.children[i]||null);});
  for(const card of sorted){const visual=card.querySelector('.sf-tile-visual');if(!visual)continue;const style=value.iconStyle||'illustrated';if(visual.dataset.appearanceIcon===style)continue;
   if(!visual._appearanceNodes)visual._appearanceNodes=[...visual.childNodes];visual.dataset.appearanceIcon=style;
   if(style==='illustrated')visual.replaceChildren(...visual._appearanceNodes);
   else if(style==='letters'){const letter=document.createElement('b');letter.className='appearance-section-letter';letter.textContent=(card.querySelector('.sf-tile-title')?.textContent||'').trim().slice(0,1);visual.replaceChildren(letter);}
   else visual.innerHTML=icon(sections[card.dataset.target]?.[1]||'products',style);
  }
 }
 function optionCards(key,value){return '<div class="appearance-choice-grid">'+choices[key].map(([id,label,note])=>'<label><input type="radio" name="'+key+'" value="'+id+'" '+(value===id?'checked':'')+'><span class="appearance-option-drawing drawing-'+key+' drawing-'+id+'" aria-hidden="true">'+(key==='iconStyle'?(id==='letters'?'<b>أ</b>':icon('products',id)):'<i></i><i></i><i></i>')+'</span><strong>'+label+'</strong><small>'+note+'</small></label>').join('')+'</div>';}
 function previewMarkup(s,value){
  const ps=(typeof products==='undefined'?[]:products).filter(p=>p.store_id===s.id&&p.available).slice(0,3),items=ps.length?ps:[{name:'مثال منتج',price:null},{name:'منتج آخر',price:null},{name:'منتج ثالث',price:null}];
  const image=p=>{const raw=typeof safeImage==='function'?safeImage(p.image):'';return raw?'<img alt="" loading="lazy" src="'+escape(typeof thumbnailForImage==='function'?thumbnailForImage(raw):raw)+'">':'<span class="appearance-demo-image" aria-hidden="true">'+icon('products',value.iconStyle)+'</span>';};
  const cover=typeof safeImage==='function'?safeImage(s.image):'';const coverHtml=cover?'<img class="appearance-demo-cover" alt="" loading="lazy" src="'+escape(typeof thumbnailForImage==='function'?thumbnailForImage(cover):cover)+'">':'<span class="appearance-demo-cover" aria-hidden="true"></span>';
  return '<div class="appearance-demo-hero">'+coverHtml+'<strong>'+escape(s.name)+'</strong><small>محلك كما يراه الزبون</small></div>'+(value.enabled&&value.text?'<div class="appearance-demo-news">'+escape(value.text)+'</div>':'')+'<div class="appearance-demo-nav">'+cleanOrder(value.sectionOrder).map(id=>'<div><span>'+(value.iconStyle==='letters'?'<b>'+sections[id][0].slice(0,1)+'</b>':icon(sections[id][1],value.iconStyle))+'</span><strong>'+sections[id][0]+'</strong></div>').join('')+'</div><div class="appearance-demo-products">'+items.map(p=>'<article>'+image(p)+'<div><strong>'+escape(p.name)+'</strong><small>'+escape(p.price==null?'السعر حسب المنتج':typeof money==='function'?money(p.price):p.price)+'</small></div></article>').join('')+'</div>';
 }
 function settings(s){
  const value=s.translations?._appearance||{};
  return {iconStyle:choices.iconStyle.some(x=>x[0]===value.iconStyle)?value.iconStyle:'illustrated',sectionStyle:choices.sectionStyle.some(x=>x[0]===value.sectionStyle)?value.sectionStyle:'tiles',heroStyle:choices.heroStyle.some(x=>x[0]===value.heroStyle)?value.heroStyle:'standard',cardStyle:choices.cardStyle.some(x=>x[0]===value.cardStyle)?value.cardStyle:'soft',sectionOrder:cleanOrder(value.sectionOrder),theme:Object.hasOwn(themes,value.theme)?value.theme:'classic',layout:['cards','list','gallery'].includes(value.layout)?value.layout:'cards',density:value.density==='compact'?'compact':'comfortable',imageFit:value.imageFit==='contain'?'contain':'cover',motion:value.motion==='static'?'static':'moving',speed:value.speed==='slow'?'slow':'normal',enabled:value.enabled===true,text:typeof value.text==='string'?value.text.slice(0,240):''};
 }
 function allowed(s){return !!(user&&s&&!s.is_example&&mine().some(item=>item.id===s.id));}
 function paint(s,value){
  for(const key of ['iconStyle','sectionStyle','heroStyle','cardStyle'])root.dataset[key]=value[key]||settings(s)[key];decorateNav(value);
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
 function organizeStudio(panel){
  const form=panel.querySelector('form'),fields=[...form.children].filter(el=>el.tagName==='FIELDSET'),spacing=[...form.children].find(el=>el.classList.contains('appearance-settings-grid')),preview=panel.querySelector('.appearance-preview-box');
  const tabs=document.createElement('div');tabs.className='appearance-studio-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','أقسام أدوات التنسيق');
  const workspace=document.createElement('div');workspace.className='appearance-workspace';const options=document.createElement('div');options.className='appearance-options-pane';workspace.append(options,preview);
  const groups=[['templates','قوالب',[fields[0]]],['identity','الهوية',[fields[1],fields[4]]],['sections','الأقسام',[fields[2],fields[3]]],['products','المنتجات',[fields[5],spacing,fields[6]]],['announcement','الشريط',[fields[7]]]];
  const state={group:'templates',onChange:null};
  state.activate=key=>{state.group=key;for(const button of tabs.children){const selected=button.dataset.studioTab===key;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;}for(const group of options.children)group.hidden=group.dataset.studioGroup!==key;options.scrollTop=0;state.onChange?.();};
  for(const [key,label,nodes] of groups){const tab=document.createElement('button');tab.type='button';tab.dataset.studioTab=key;tab.id='appearance-tab-'+key;tab.textContent=label;tab.setAttribute('role','tab');tab.setAttribute('aria-controls','appearance-group-'+key);tab.onclick=()=>state.activate(key);tabs.append(tab);const group=document.createElement('section');group.dataset.studioGroup=key;group.id='appearance-group-'+key;group.setAttribute('role','tabpanel');group.setAttribute('aria-labelledby',tab.id);group.append(...nodes.filter(Boolean));options.append(group);}
  tabs.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const all=[...tabs.children],i=all.indexOf(document.activeElement),rtl=document.documentElement.dir!=='ltr';let next=event.key==='Home'?0:event.key==='End'?all.length-1:(i+(event.key==='ArrowRight'?(rtl?-1:1):(rtl?1:-1))+all.length)%all.length;all[next].click();all[next].focus();};
  const reset=panel.querySelector('[data-reset]');options.querySelector('[data-studio-group=templates]').append(reset);
  const cancel=panel.querySelector('[data-cancel]');cancel.textContent='إغلاق';cancel.setAttribute('aria-label','إغلاق استوديو المظهر');panel.querySelector('.appearance-heading').append(cancel);
  const jump=panel.querySelector('[data-preview-jump]');jump.textContent='معاينة كاملة';jump.setAttribute('aria-pressed','false');preview.querySelector('.appearance-preview-toolbar').append(jump);
  const context=document.createElement('p');context.dataset.previewContext='';context.setAttribute('role','status');preview.prepend(context);
  const note=preview.querySelector(':scope>p:not([data-preview-context]):not([data-preview-summary])');if(note){const explanation=document.createElement('details'),label=document.createElement('summary');label.textContent='عن المعاينة';explanation.className='appearance-preview-explanation';explanation.append(label,note);preview.append(explanation);}
  form.prepend(tabs,workspace);form.addEventListener('invalid',event=>{const group=event.target.closest('[data-studio-group]');if(group)state.activate(group.dataset.studioGroup);},true);
  state.activate('templates');return state;
 }
 function edit(s){
  if(!allowed(s))return;
  if(root.querySelector('.shop-appearance-editor form[aria-busy=true]')){toast('انتظر اكتمال حفظ شكل المحل');return;}
  const uid=user.id,original=settings(s),revision=s.revision;
  let saving=false,sectionOrder=[...original.sectionOrder];
  const panel=document.createElement('section');panel.className='shop-appearance-editor panel appearance-studio-workspace';panel.dataset.noTranslate='';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','appearance-studio-title');const opener=document.activeElement;
  panel.innerHTML=`<div class="appearance-heading"><h2 id="appearance-studio-title">استوديو مظهر المحل</h2>${help('المعاينة والحفظ','غيّر الخيارات وشاهدها على صفحة محلك فورًا. الحفظ ينشر اختياراتك للزوار، وإلغاء المعاينة يعيد الشكل المحفوظ. يمكنك تجربة أكثر من شكل قبل الحفظ.')}</div><p class="appearance-intro">اختر تبويبًا وعدّل؛ المعاينة أمامك تركز على الجزء الذي تغيّره. التغييرات لا تظهر للزبائن حتى تحفظ.</p><form id="shop-appearance-form">
  <fieldset><legend>ابدأ بقالب جاهز</legend><p>اختصار للبداية؛ يمكنك تعديل كل خيار بعده. نص الشريط وإعداد تفعيله يبقيان كما اخترتهما.</p><div class="appearance-presets">${[['balanced','متوازن','بطاقات مريحة ورموز واضحة'],['boutique','واجهة صور','للأزياء والأثاث والقطع المصوّرة'],['menu','قائمة سريعة','للأطعمة أو المنتجات الكثيرة'],['service','تعريف وخدمات','التواصل والمعلومات أولًا']].map(([id,label,note])=>`<button type="button" class="outline" data-preset="${id}"><span class="preset-dots preset-${id}" aria-hidden="true"><i></i><i></i><i></i></span><strong>${label}</strong><small>${note}</small></button>`).join('')}</div></fieldset>
  <section class="appearance-preview-box" aria-label="معاينة شكل المحل"><div class="appearance-preview-toolbar"><strong>معاينة توضيحية</strong><div><button type="button" data-preview-size="mobile" aria-pressed="true">هاتف</button><button type="button" data-preview-size="desktop" aria-pressed="false">شاشة واسعة</button></div></div><p>الأقسام هنا أمثلة للشكل؛ الأقسام المتاحة في محلك تبقى كما هي. الصور والأسعار الفعلية تُعرض عند وجود منتجات.</p><div class="appearance-preview-stage"><div class="appearance-page-preview" data-size="mobile"></div></div><p data-preview-summary role="status"></p></section>
  <fieldset><legend>شكل رأس المحل</legend>${help('رأس المحل','اختر صورة غلاف عريضة، أو هوية في المنتصف، أو رأسًا مختصرًا ليصل الزبون للأقسام بسرعة. تبقى معلومات التواصل والأزرار متاحة.')}${optionCards('heroStyle',original.heroStyle)}</fieldset>
  <fieldset><legend>رموز أقسام المحل</legend>${help('رموز الأقسام','الرسوم والصور تحافظ على الشكل الحالي. الخطوط رموز بسيطة بلا تحميل صور إضافية. الألوان الهادئة تضيف خلفية من لون المحل. الحروف تعرض أول حرف من اسم القسم مع اسمه كاملًا.')}${optionCards('iconStyle',original.iconStyle)}</fieldset>
  <fieldset><legend>ترتيب شكل الأقسام</legend>${help('شكل الأقسام','اختر بطاقات أو دوائر أو صفوفًا أو اختصارات. هذه خيارات تصميم يحفظها صاحب المحل؛ الزبون يضغط الأقسام للتصفح فقط.')}${optionCards('sectionStyle',original.sectionStyle)}<h3>أي قسم يظهر أولًا؟</h3><p>رتّب الأقسام بالأزرار دون سحب. لا يُحذف أي قسم ولا يُنشأ قسم غير موجود.</p><ol class="appearance-section-order" data-section-order></ol></fieldset>
  <fieldset><legend>ألوان المحل</legend>${help('ألوان المحل','اختر الهوية التي تناسب صور محلك. تتغيّر ألوان العناوين وحدود الأقسام وشريط الأخبار. جرّب الدافئ للمأكولات، والوردي للأزياء، والأزرق للخدمات. كل الألوان متاحة لأي محل.')}<div class="shop-theme-options">${Object.entries(themes).map(([key,v])=>`<label style="--sample:${v[1]};--sample-tint:${v[2]}"><input type="radio" name="theme" value="${key}" ${original.theme===key?'checked':''}><span class="appearance-mini" aria-hidden="true"><i></i><b></b><b></b><b></b></span><span>${v[0]}</span></label>`).join('')}</div></fieldset>
  <fieldset><legend>طريقة عرض المنتجات</legend>${help('طريقة العرض','البطاقات تجمع الصورة والسعر بحجم متوازن. القائمة تعرض صورة صغيرة بجانب التفاصيل لتصفح أسرع. المعرض يعطي الصورة مساحة أكبر، ويصلح للأزياء والأثاث والتفاصيل البصرية.')}<div class="appearance-layout-options">${[['cards','بطاقات','صورة وسعر بتوازن'],['list','قائمة','تصفح سريع للتفاصيل'],['gallery','معرض','صور كبيرة وواضحة']].map(([key,label,note])=>`<label><input type="radio" name="layout" value="${key}" ${original.layout===key?'checked':''}><span class="layout-sketch sketch-${key}" aria-hidden="true"><i></i><i></i><i></i></span><strong>${label}</strong><small>${note}</small></label>`).join('')}</div></fieldset>
  <div class="appearance-settings-grid"><div><div class="appearance-field-title">المسافات ${help('المسافات','المريح يترك فراغًا أكبر بين المنتجات للقراءة. المتقارب يعرض منتجات أكثر على الشاشة، مع بقاء الأزرار سهلة للمس.')}</div><select name="density" aria-label="المسافات"><option value="comfortable">مريحة</option><option value="compact">متقاربة</option></select></div><div><div class="appearance-field-title">إطار الصور ${help('إطار الصور','الصورة كاملة تحافظ على أطراف القطعة مثل الفساتين والأثاث. ملء الإطار يعطي صفوفًا متناسقة وقد يقص أطراف الصورة. اختر الأنسب لصورك.')}</div><select name="imageFit" aria-label="إطار الصور"><option value="cover">ملء الإطار</option><option value="contain">الصورة كاملة</option></select></div></div>
  <fieldset><legend>حدود بطاقات المنتجات</legend>${optionCards('cardStyle',original.cardStyle)}</fieldset><fieldset class="appearance-news-settings"><legend>شريط المعلومات</legend>${help('شريط المعلومات','يظهر شريط رفيع تحت عنوان المحل عند تفعيله وكتابة النص. استخدمه لخبر قصير مثل وقت التوصيل أو وصول بضاعة. يمكنك اختيار نص متحرك أو ثابت وسرعة الحركة.')}<label class="shop-strip-toggle"><input name="enabled" type="checkbox" ${original.enabled?'checked':''}>إظهار الشريط في محلي</label><label>نص الشريط<textarea name="text" maxlength="240" rows="2" placeholder="وصلت تشكيلة الشتاء · التوصيل يومياً حتى ١٠ مساءً"></textarea></label><small data-count></small><div class="appearance-settings-grid"><label>العرض<select name="motion"><option value="moving">متحرك</option><option value="static">ثابت</option></select></label><label data-speed-field>سرعة الحركة<select name="speed"><option value="normal">هادئة</option><option value="slow">أبطأ للقراءة</option></select></label></div></fieldset>
  <div class="appearance-save-bar"><span data-preview-note role="status">معاينة على صفحة محلك</span><div class="form-actions"><button type="submit">حفظ الشكل والشريط</button><button type="button" data-preview-jump class="outline">عرض المعاينة</button><button type="button" data-cancel class="outline">إلغاء المعاينة</button><button type="button" data-reset class="outline">الشكل الافتراضي</button></div><p role="status" data-result></p></div></form>`;
  const ui=organizeStudio(panel);let fullPreview=false;
  const form=panel.querySelector('form');form.elements.layout.value=original.layout;form.elements.text.value=original.text;for(const key of ['density','imageFit','motion','speed'])form.elements[key].value=original[key];
  const value=()=>({iconStyle:form.elements.iconStyle.value,sectionStyle:form.elements.sectionStyle.value,heroStyle:form.elements.heroStyle.value,cardStyle:form.elements.cardStyle.value,sectionOrder:[...sectionOrder],theme:form.elements.theme.value,layout:form.elements.layout.value,density:form.elements.density.value,imageFit:form.elements.imageFit.value,motion:form.elements.motion.value,speed:form.elements.speed.value,enabled:form.elements.enabled.checked,text:form.elements.text.value.trim()});
  const preview=(field)=>{const draft=value();const mapped={theme:'identity',heroStyle:'identity',iconStyle:'sections',sectionStyle:'sections',layout:'products',cardStyle:'products',density:'products',imageFit:'products',enabled:'announcement',text:'announcement',motion:'announcement',speed:'announcement'};const focus=fullPreview?'all':mapped[field]||ui.group;panel.querySelector('.appearance-preview-box').dataset.previewFocus=focus;panel.querySelector('[data-preview-context]').textContent=({all:'معاينة الصفحة كاملة',templates:'معاينة القالب',identity:'معاينة الهوية ورأس المحل',sections:'معاينة رموز الأقسام وترتيبها',products:'معاينة شكل المنتجات',announcement:draft.enabled&&draft.text?'معاينة شريط المعلومات':'الشريط مخفي؛ فعّله واكتب نصًا لمعاينته'}[focus]);paint(s,draft);const demo=panel.querySelector('.appearance-page-preview');for(const key of ['layout','density','imageFit','iconStyle','sectionStyle','heroStyle','cardStyle'])demo.dataset[key]=draft[key];demo.style.setProperty('--shop-accent',themes[draft.theme][1]);demo.style.setProperty('--shop-tint',themes[draft.theme][2]);demo.innerHTML=previewMarkup(s,draft);panel.querySelector('[data-preview-summary]').textContent=themes[draft.theme][0]+' · '+choices.iconStyle.find(x=>x[0]===draft.iconStyle)[1]+' · '+choices.sectionStyle.find(x=>x[0]===draft.sectionStyle)[1]+' · '+({cards:'بطاقات منتجات',list:'قائمة منتجات',gallery:'معرض منتجات'}[draft.layout]);panel.querySelector('[data-count]').textContent=form.elements.text.value.length+' / 240';form.elements.text.required=form.elements.enabled.checked;panel.querySelector('[data-speed-field]').hidden=form.elements.motion.value==='static';};
  ui.onChange=()=>preview();
  form.oninput=event=>{panel.dataset.dirty='true';panel.querySelector('[data-preview-note]').textContent='معاينة غير محفوظة — الزبائن يرون الشكل المحفوظ حتى تضغط حفظ.';if(typeof marketTrackChanges==='function')marketTrackChanges({target:form});preview(event?.target?.name);};form.onchange=form.oninput;
  panel.querySelector('[data-cancel]').onclick=()=>{if(saving)return;const leave=typeof marketConfirmLeave==='function'?marketConfirmLeave():panel.dataset.dirty!=='true'||confirm('لديك معاينة لم تحفظها. هل تريد إغلاقها؟');if(!leave)return;if(typeof marketCleanForm==='function')marketCleanForm(form);activeDraft=null;paint(s,original);panel.remove();document.body.classList.remove('appearance-studio-open');if(opener?.isConnected)opener.focus?.({preventScroll:true});};
  panel.querySelector('[data-reset]').onclick=()=>{panel.dataset.dirty='true';form.elements.theme.value='classic';form.elements.layout.value='cards';sectionOrder=cleanOrder([]);for(const key of Object.keys(choices))form.elements[key].value=settings({})[key];drawOrder();for(const [key,val] of Object.entries({density:'comfortable',imageFit:'cover'}))form.elements[key].value=val;form.oninput();};
  function drawOrder(){const list=panel.querySelector('[data-section-order]');list.replaceChildren();sectionOrder.forEach((id,i)=>{const li=document.createElement('li'),name=document.createElement('strong');name.textContent=sections[id][0];li.append(name);for(const [direction,delta,label] of [['up',-1,'تقديم'],['down',1,'تأخير']]){const button=document.createElement('button');button.type='button';button.className='outline';button.dataset.move=direction;button.dataset.section=id;button.textContent=label;button.setAttribute('aria-label',label+' قسم '+sections[id][0]);button.disabled=i+delta<0||i+delta>=sectionOrder.length;button.onclick=()=>{[sectionOrder[i],sectionOrder[i+delta]]=[sectionOrder[i+delta],sectionOrder[i]];drawOrder();form.oninput();panel.querySelector('[data-section="'+id+'"][data-move="'+direction+'"]')?.focus({preventScroll:true});};li.append(button);}list.append(li);});}
  drawOrder();
  panel.querySelector('[data-preview-jump]').onclick=()=>{fullPreview=!fullPreview;const button=panel.querySelector('[data-preview-jump]');button.setAttribute('aria-pressed',String(fullPreview));button.textContent=fullPreview?'تركيز على الخيار':'معاينة كاملة';preview();};
  panel.querySelectorAll('[data-preview-size]').forEach(button=>button.onclick=()=>{panel.querySelector('.appearance-page-preview').dataset.size=button.dataset.previewSize;panel.querySelectorAll('[data-preview-size]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});
  const presets={balanced:{theme:'classic',layout:'cards',iconStyle:'outline',sectionStyle:'tiles',heroStyle:'standard',cardStyle:'soft',density:'comfortable',imageFit:'cover'},boutique:{theme:'rose',layout:'gallery',iconStyle:'duotone',sectionStyle:'circles',heroStyle:'centered',cardStyle:'flat',density:'comfortable',imageFit:'contain'},menu:{theme:'warm',layout:'list',iconStyle:'outline',sectionStyle:'compact',heroStyle:'compact',cardStyle:'bordered',density:'compact',imageFit:'cover'},service:{theme:'ocean',layout:'cards',iconStyle:'duotone',sectionStyle:'rows',heroStyle:'compact',cardStyle:'flat',density:'comfortable',imageFit:'contain'}};
  panel.querySelectorAll('[data-preset]').forEach(button=>button.onclick=()=>{for(const [key,val] of Object.entries(presets[button.dataset.preset]))form.elements[key].value=val;sectionOrder=button.dataset.preset==='service'?cleanOrder(['sf-info','sf-products']):cleanOrder([]);drawOrder();form.oninput();});
  form.onsubmit=async event=>{
   event.preventDefault();if(saving||user?.id!==uid||!allowed(s))return;
   const draft=value();if(draft.enabled&&!draft.text){ui.activate('announcement');form.elements.text.focus();return;}
   saving=true;form.setAttribute('aria-busy','true');const controls=[...panel.querySelectorAll('button,input,textarea,select')].map(el=>({el,disabled:el.disabled}));controls.forEach(({el})=>el.disabled=true);
   const status=panel.querySelector('[data-result]');status.textContent='جاري حفظ شكل المحل…';
   try{
    const translations={...(s.translations||{}),_appearance:draft};
    const response=await api.from('stores').update({translations}).eq('id',s.id).eq('revision',revision).select('id,revision');
    if(response.error)throw response.error;
    if(!response.data?.length)throw Error('تغيّرت بيانات المحل. انسخ نصك ثم حدّث الصفحة وأعد المحاولة.');
    if(user?.id!==uid)return;
    s.translations=translations;s.revision=response.data[0].revision;if(typeof marketCleanForm==='function')marketCleanForm(form);activeDraft=null;
    window.DarayaHomeCatalog?.invalidate();panel.remove();document.body.classList.remove('appearance-studio-open');if(opener?.isConnected)opener.focus?.({preventScroll:true});paint(s,draft);toast('تم حفظ شكل المحل وشريط المعلومات');
   }catch(error){status.textContent=error.message||'تعذر الحفظ. تحقق من الاتصال وأعد المحاولة.';}
   finally{saving=false;form.removeAttribute('aria-busy');if(panel.isConnected)controls.forEach(({el,disabled})=>el.disabled=disabled);}
  };
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();panel.querySelector('[data-cancel]').click();return;}if(event.key!=='Tab')return;const items=[...panel.querySelectorAll('button,input,select,textarea,summary,a[href]')].filter(el=>!el.disabled&&!el.closest('[hidden]')&&el.type!=='hidden'&&el.tabIndex!==-1),first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}});
  const existing=root.querySelector('.shop-appearance-editor');if(existing?.dataset.dirty==='true'&&!confirm('لديك معاينة لم تحفظها. هل تريد البدء من جديد؟'))return;existing?.remove();activeDraft={uid,id:s.id,panel,get:value};root.querySelector('.store-banner').after(panel);document.body.classList.add('appearance-studio-open');preview();panel.querySelector('[data-studio-tab=templates]').focus({preventScroll:true});
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
  queued=false;if(!root.ownerDocument.defaultView?.document)return;document.body.classList.toggle('appearance-studio-open',!!root.querySelector('.shop-appearance-editor'));
  const banner=root.querySelector('.store-banner');
  const id=banner?.dataset.storefront||location.hash.match(/^#store\/([^/]+)/)?.[1];
  const s=stores.find(item=>item.id===id);
  if(!banner||!s){lastBanner=null;return;}
  const changed=banner!==lastBanner||s.id!==lastStore||user?.id!==lastActor;
  if(changed){lastBanner=banner;lastStore=s.id;lastActor=user?.id;enhance(s);}
  else if(allowed(s)&&!root.querySelector('.shop-appearance-entry'))enhance(s);
  if(activeDraft&&(!activeDraft.panel.isConnected||activeDraft.uid!==user?.id||activeDraft.id!==s.id))activeDraft=null;
  paint(s,activeDraft?activeDraft.get():settings(s));
  const entry=root.querySelector('.shop-appearance-entry'),bar=banner.querySelector('.owner-store-bar');
  if(entry&&bar&&entry.parentElement!==bar)bar.append(entry);
  if(entry&&!allowed(s)){entry.remove();root.querySelector('.shop-appearance-editor')?.remove();paint(s,settings(s));}
 }
 new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(refresh);}}).observe(root,{childList:true,subtree:true});
 const previous=renderStore;
 renderStore=function(id){const result=previous.apply(this,arguments);const s=stores.find(item=>item.id===id);if(s)enhance(s);return result;};
 window.addEventListener('hashchange',()=>{if(!root.querySelector('.store-banner')){delete root.dataset.shopTheme;delete root.dataset.shopLayout;delete root.dataset.shopDensity;delete root.dataset.shopImageFit;for(const key of Object.keys(choices))delete root.dataset[key];activeDraft=null;root.style.removeProperty('--shop-accent');root.style.removeProperty('--shop-tint');}});
 window.DarayaShopAppearance={settings,open:edit,icon};
 refresh();
})();
