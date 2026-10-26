'use strict';
// Keep existing save handlers, access rules and subscription controls.
(() => {
 const say=(ar,en,de)=>({ar,en,de})[window.ShahinI18n?.language||'ar'];
 const labels={
  overview:()=>say('الرئيسية','Home','Start'),
  orders:()=>say('طلباتي','My orders','Meine Bestellungen'),
  products:()=>say('منتجاتي وأسعاري','My products and prices','Produkte und Preise'),
  details:()=>say('معلومات متجري','My shop details','Geschäftsdaten'),
  photos:()=>say('صور متجري','My shop photos','Geschäftsfotos'),
  hours:()=>say('أوقات العمل','Opening hours','Öffnungszeiten'),
  delivery:()=>say('الطلب والتوصيل','Orders and delivery','Bestellung und Lieferung')
 };
 function fold(nodes,title,className='merchant-extra'){
  const visible=nodes.filter(n=>n&&!n.hidden);
  if(!visible.length)return null;
  const box=document.createElement('details');box.className=className;
  const summary=document.createElement('summary');summary.textContent=title;
  visible[0].before(box);box.append(summary);visible.forEach(n=>box.append(n));
  return box;
 }
 function shortcut(link,title,hint,icon){
  if(!link||link.hidden)return '';
  return '<a class="merchant-daily-card'+(link.classList.contains('locked-plan-nav')?' locked-plan-nav':'')+'" href="'+esc(link.getAttribute('href'))+'"><span aria-hidden="true">'+icon+'</span><strong>'+esc(title)+'</strong><small>'+esc(hint)+'</small></a>';
 }
 const previousDashboard=merchantDashboard;
 merchantDashboard=function(ms,s,section){
  previousDashboard.apply(this,arguments);if(!s)return;
  const nav=document.querySelector('.merchant-nav'),content=document.querySelector('.merchant-content');
  if(!nav||!content)return;
  const info=directoryIsInfo(s),links=[...nav.querySelectorAll(':scope > a')];
  const keyOf=a=>Object.keys(labels).find(k=>a.getAttribute('href')===merchantHref(k,s));
  if(info)links.filter(a=>['products','orders','delivery','drivers','reports'].some(k=>a.getAttribute('href')===merchantHref(k,s))).forEach(a=>a.hidden=true);
  const get=k=>links.find(a=>a.getAttribute('href')===merchantHref(k,s));
  links.forEach(a=>{
   const key=keyOf(a);if(!key)return;
   const icon=a.querySelector(':scope > span'),lock=a.querySelector('.nav-lock-label');
   a.replaceChildren();if(icon)a.append(icon);
   const title=document.createElement('span');title.className='merchant-nav-label';title.dataset.noTranslate='';title.textContent=labels[key]();a.append(title);if(lock)a.append(lock);
  });
  const extras=links.filter(a=>!keyOf(a));
  const extraBox=fold(extras,say('خيارات إضافية','More options','Weitere Optionen'),'merchant-extra merchant-extra-nav');
  if(extraBox&&extras.some(a=>a.classList.contains('selected')))extraBox.open=true;
  const top=document.querySelector('.merchant-top p.muted');
  if(top){top.dataset.noTranslate='';top.textContent=say('اختر ما تريد تعديله، ثم اضغط حفظ.','Choose what to change, then press Save.','Wähle einen Bereich und drücke danach Speichern.');}
  if(!section||section==='overview'){
   const welcome=content.querySelector('.welcome-panel');
   if(welcome){
    const daily=document.createElement('section');daily.className='merchant-daily';daily.dataset.noTranslate='';
    daily.innerHTML='<h2>'+say('ماذا تريد أن تفعل؟','What would you like to do?','Was möchtest du tun?')+'</h2><div class="merchant-daily-grid">'+
     shortcut(get('orders'),labels.orders(),say('شاهد الطلبات الجديدة وتابع تجهيزها','See new orders and their progress','Neue Bestellungen ansehen und bearbeiten'),'≡')+
     shortcut(get('products'),labels.products(),say('غيّر سعرًا أو أضف منتجًا وصورة','Change a price or add a product and photo','Preis ändern oder Produkt mit Foto ergänzen'),'▦')+
     shortcut(get('details'),labels.details(),say('الاسم والعنوان ورقم التواصل','Name, address and phone','Name, Adresse und Telefon'),'▤')+
     '<div class="merchant-daily-card merchant-daily-times"><span aria-hidden="true">◷</span><strong>'+say('أوقات العمل والتوصيل','Hours and delivery','Öffnungszeiten und Lieferung')+'</strong><div>'+
     [get('hours'),get('delivery')].filter(a=>a&&!a.hidden).map(a=>'<a class="button outline" href="'+esc(a.getAttribute('href'))+'">'+labels[keyOf(a)]()+'</a>').join('')+'</div></div></div>';
    welcome.before(daily);
    daily.querySelectorAll('a').forEach(a=>{const original=links.find(l=>l.getAttribute('href')===a.getAttribute('href'));if(original?.onclick)a.onclick=event=>original.onclick.call(original,event);});
   }
   const review=content.querySelector(':scope > .setup-review');
   if(!review&&welcome){const grid=content.querySelector(':scope > .setup-grid');fold([welcome,grid],say('تجهيز الصفحة لأول مرة','Set up your page','Seite einrichten'),'merchant-extra merchant-setup');}
   else if(welcome&&review)review.prepend(welcome);
   const optional=[...content.querySelectorAll(':scope > .merchant-metrics, :scope > .panel:not(.reception)')];
   fold(optional,say('التقارير والباقات وأدوات أخرى','Reports, plans and other tools','Berichte, Pakete und weitere Werkzeuge'));
  }
  const counter=content.querySelector('.merchant-section-counter');if(counter)counter.hidden=true;
  content.querySelectorAll('.editor-footer a').forEach(a=>{a.dataset.noTranslate='';a.textContent=say('العودة إلى الرئيسية','Back to home','Zurück zur Startseite');});
  const reception=content.querySelector('.reception');
  if(reception){const heading=reception.querySelector('h3');if(heading){heading.dataset.noTranslate='';heading.textContent=say(s.is_open?'أستقبل طلبات الآن':'استقبال الطلبات متوقف',s.is_open?'I accept orders now':'Orders are paused',s.is_open?'Ich nehme Bestellungen an':'Bestellannahme pausiert');}}
 };
 const previousProducts=merchantProducts;
 merchantProducts=function(s){
  previousProducts.apply(this,arguments);
  document.querySelectorAll('.merchant-product').forEach(card=>{
   const edit=card.querySelector('[data-edit-product]'),p=products.find(p=>p.id===edit?.dataset.editProduct);if(!p)return;
   const quick=document.createElement('button');quick.type='button';quick.className='merchant-price-button';
   quick.dataset.noTranslate='';quick.textContent=say('تغيير السعر','Change price','Preis ändern');
   quick.onclick=()=>{editProduct(s,p);const price=document.querySelector('#edit-form [name="price"]');price?.focus();price?.select();price?.scrollIntoView({block:'center'});};
   edit.before(quick);
   const available=card.querySelector('.merchant-product-body > .tag');
   if(available){available.dataset.noTranslate='';available.textContent=p.available?say('متاح للبيع','For sale','Verfügbar'):say('نفد مؤقتًا','Out of stock','Zurzeit ausverkauft');}
   const toggle=card.querySelector('[data-availability]');
   if(toggle){toggle.dataset.noTranslate='';toggle.textContent=p.available?say('نفد مؤقتًا','Mark as out of stock','Als ausverkauft markieren'):say('متاح للبيع مجددًا','Available again','Wieder verfügbar');}
  });
 };
 const previousEdit=editProduct;
 editProduct=function(){
  previousEdit.apply(this,arguments);const form=document.querySelector('#edit-form');if(!form)return;
  const extra=['cost_price','gallery_files','gallery_links'].map(name=>form.elements[name]?.closest('label')).filter(Boolean);
  fold(extra,say('صور إضافية وتكلفة الشراء — اختياري','Extra photos and buying cost — optional','Weitere Fotos und Einkaufskosten — optional'),'merchant-extra merchant-product-extra');
  const hint=document.createElement('p');hint.className='field-hint';hint.dataset.noTranslate='';
  hint.textContent=say('لتغيير السعر فقط: عدّل خانة السعر واضغط حفظ المنتج. تبقى بقية البيانات كما هي.','To change the price: edit the price and press Save product. Other details stay the same.','Für eine Preisänderung: Preis bearbeiten und Produkt speichern. Die übrigen Angaben bleiben erhalten.');
  form.prepend(hint);
 };
 const previousToast=toast;
 toast=function(message){
  previousToast.apply(this,arguments);
  if(!document.querySelector('.merchant-layout')||!/^تم (?:حفظ|الحفظ)/.test(message||''))return;
  const content=document.querySelector('.merchant-content');if(!content)return;
  content.querySelector('[data-merchant-saved]')?.remove();
  const status=document.createElement('div');status.className='merchant-save-status';status.dataset.merchantSaved='';status.dataset.noTranslate='';status.setAttribute('role','status');
  const text=document.createElement('span');text.textContent=say('✓ تم الحفظ بنجاح. يمكنك مشاهدة النتيجة على صفحة متجرك.','✓ Saved. You can view the result on your shop page.','✓ Gespeichert. Du kannst das Ergebnis auf deiner Geschäftsseite ansehen.');
  const preview=document.querySelector('.merchant-preview');
  status.append(text);if(preview){const link=document.createElement('a');link.href=preview.getAttribute('href');link.className='button outline';link.textContent=say('شاهد صفحة متجرك','View your shop page','Geschäftsseite ansehen');status.append(link);}
  content.prepend(status);
 };
})();
