'use strict';
// Explain the existing tools without replacing their save handlers or permissions.
(() => {
 const text=(ar,en,de)=>({ar,en,de}[window.ShahinI18n?.language||'ar']||ar);
 const copy={
  orders:[['طلبات الزبائن','Customer orders','Kundenbestellungen'],['شاهد الطلبات الجديدة وحدّث حالتها','View new orders and update their status','Neue Bestellungen ansehen und Status ändern'],[
   ['افتح الطلب وراجع المنتجات والعنوان وطريقة الاستلام.','Open the order and check the items, address and delivery option.','Bestellung öffnen und Artikel, Adresse und Lieferart prüfen.'],
   ['حدّث حالة الطلب أثناء تجهيزه. لطلب التوصيل اختر السائق ثم اضغط «حفظ السائق للطلب».','Update the order status. For delivery, choose a driver and press Save driver for this order.','Status aktualisieren. Bei Lieferung einen Fahrer wählen und Fahrer speichern drücken.'],
   ['إذا لم يظهر سائق، أضفه أولًا من «سائقو التوصيل». طلبات الطاولات لها قسم مستقل.','If no driver is shown, add one in Delivery drivers. Table orders have their own section.','Falls kein Fahrer erscheint, unter Lieferfahrer einen hinzufügen. Tischbestellungen haben einen eigenen Bereich.']]],
  delivery:[['إعدادات الطلب والتوصيل','Order and delivery settings','Bestell- und Liefereinstellungen'],['فعّل الطلبات وحدّد طرق الاستلام والرسوم','Set order options, delivery areas and fees','Bestellarten, Liefergebiete und Gebühren festlegen'],[
   ['فعّل «استقبال طلبات عبر الموقع» إذا أردت أن يرسل الزبائن طلباتهم من صفحتك.','Turn on Accept website orders if you want customers to order from your page.','Bestellungen über die Website aktivieren, damit Kunden auf deiner Seite bestellen können.'],
   ['اختر التوصيل أو الاستلام من المتجر أو كليهما. إذا فعّلت التوصيل، أضف المناطق والرسوم والمدة المتوقعة.','Choose delivery, pickup, or both. For delivery, add areas, fees and an expected time.','Lieferung, Abholung oder beides wählen. Für Lieferung Gebiete, Gebühren und Dauer angeben.'],
   ['اضغط حفظ. لإضافة سائق افتح «سائقو التوصيل»، ولمتابعة الطلبات افتح «طلبات الزبائن».','Press Save. Add drivers in Delivery drivers and follow orders in Customer orders.','Speichern drücken. Fahrer unter Lieferfahrer hinzufügen und Bestellungen unter Kundenbestellungen verfolgen.']]],
  drivers:[['سائقو التوصيل','Delivery drivers','Lieferfahrer'],['أضف السائق بالاسم والهاتف وأعطه رمز الدخول','Add a driver with a name and phone, then give them the code','Fahrer mit Name und Telefon hinzufügen und Zugangscode weitergeben'],[
   ['اكتب اسم السائق ورقم هاتفه واضغط «إضافة سائق وإنشاء رمز الدخول». لا يحتاج بريدًا إلكترونيًا.','Enter the driver’s name and phone, then press Add driver and create login code. No email is needed.','Name und Telefonnummer eingeben, dann Fahrer hinzufügen und Zugangscode erstellen drücken. Keine E-Mail nötig.'],
   ['انسخ رمز الدخول وسلّمه للسائق بشكل خاص. يفتح الموقع ويختار «دخول مندوب التوصيل» ويكتب الرمز.','Copy the code and give it to the driver in private. They choose Driver sign-in and enter the code.','Code kopieren und privat weitergeben. Der Fahrer wählt die Fahrer-Anmeldung und gibt den Code ein.'],
   ['ارجع إلى «طلبات الزبائن»، واختر السائق داخل طلب التوصيل، ثم احفظ التعيين. تظهر متابعة موقعه للزبون عند تفعيل السائق مشاركة موقعه.','Go to Customer orders, choose the driver in a delivery order and save. Customers can see the driver’s location when the driver turns on location sharing.','Unter Kundenbestellungen einen Fahrer für die Lieferung wählen und speichern. Kunden sehen seinen Standort, wenn er die Standortfreigabe aktiviert.']]],
  tables:[['طلبات الطاولات','Table orders','Tischbestellungen'],['أنشئ طاولاتك واطبع QR وتابع طلباتها','Create tables, print QR codes and follow table orders','Tische anlegen, QR drucken und Tischbestellungen verfolgen'],[
   ['هذه ميزة اختيارية للمطاعم. فعّلها وأنشئ أرقام الطاولات، ثم اطبع رمز كل طاولة وضعه عليها.','This is optional for restaurants. Turn it on, create table numbers and print each table’s QR code.','Für Restaurants freiwillig: aktivieren, Tischnummern anlegen und den QR-Code jedes Tisches ausdrucken.'],
   ['يمسح الزبون رمز الطاولة لعرض القائمة وإرسال الطلب. تابع طلبات الطاولات من هذا القسم.','Customers scan the table code to view the menu and order. Follow these orders in this section.','Kunden scannen den Tischcode, sehen die Speisekarte und bestellen. Diese Bestellungen hier verfolgen.']]]
 };
 const say=values=>text(...values);
 function help(key){
  const c=copy[key];
  modal('<section class="owner-help-dialog" data-no-translate><h2>'+esc(say(c[0]))+'</h2><ol>'+c[2].map(step=>'<li>'+esc(say(step))+'</li>').join('')+'</ol><button type="button" data-owner-help-close>'+esc(text('فهمت','Got it','Verstanden'))+'</button></section>');
  document.querySelector('[data-owner-help-close]')?.addEventListener('click',()=>document.querySelector('#modal').close());
 }
 function infoButton(key){const b=document.createElement('button');b.type='button';b.className='owner-info-button';b.dataset.noTranslate='';b.dataset.ownerHelp=key;b.textContent=text('ⓘ شرح الأداة','ⓘ How to use','ⓘ Anleitung');b.setAttribute('aria-label',text('شرح ','Help: ','Hilfe: ')+say(copy[key][0]));b.onclick=()=>help(key);return b;}
 function setLabel(a,label){
  let span=a.querySelector('.merchant-nav-label');
  if(!span){span=document.createElement('span');span.className='merchant-nav-label';const icon=a.querySelector('[data-dashboard-icon]');const lock=a.querySelector('.nav-lock-label');a.replaceChildren();if(icon)a.append(icon);a.append(span);if(lock)a.append(lock);}
  span.dataset.noTranslate='';span.textContent=label;
 }
 function refreshCopy(){
  document.querySelectorAll('[data-owner-tool]').forEach(cell=>{const c=copy[cell.dataset.ownerTool],a=cell.querySelector('a');if(c&&a){setLabel(a,say(c[0]));const hint=a.querySelector('.owner-tool-hint');if(hint)hint.textContent=say(c[1]);}});
  document.querySelectorAll('[data-owner-help]').forEach(b=>{const c=copy[b.dataset.ownerHelp];b.textContent=text('ⓘ شرح الأداة','ⓘ How to use','ⓘ Anleitung');b.setAttribute('aria-label',text('شرح ','Help: ','Hilfe: ')+say(c[0]));});
  document.querySelectorAll('[data-owner-guide]').forEach(guide=>{guide.querySelector('p').textContent=say(copy[guide.dataset.ownerGuide][1]);for(const a of guide.querySelectorAll('a')){const k=Object.keys(copy).find(k=>a.getAttribute('href')?.includes('/'+k+'/'));if(k)a.textContent=say(copy[k][0]);}});
 }
 let language=document.documentElement.lang;
 new MutationObserver(()=>{if(language===document.documentElement.lang)return;language=document.documentElement.lang;refreshCopy();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 const previousDashboard=merchantDashboard;
 merchantDashboard=function(ms,s,section){
  const result=previousDashboard.apply(this,arguments);if(!s)return result;
  const nav=document.querySelector('.merchant-nav'),content=document.querySelector('#dashboard-content');
  if(nav)for(const a of nav.querySelectorAll('a')){
   const key=Object.keys(copy).find(k=>k==='tables'?a.hasAttribute('data-ts-entry'):a.getAttribute('href')===merchantHref(k,s));if(!key||a.hidden)continue;
   const c=copy[key];setLabel(a,say(c[0]));
   // Keep the original anchor and its lock handler; the help button is a sibling.
   if(a.closest('.owner-tool-card'))continue;
   const cell=document.createElement('div');cell.className='owner-tool-card';cell.dataset.ownerTool=key;a.before(cell);cell.append(a);
   const hint=document.createElement('small');hint.className='owner-tool-hint';hint.dataset.noTranslate='';hint.textContent=say(c[1]);a.querySelectorAll(':scope > small').forEach(n=>n.remove());a.append(hint);cell.append(infoButton(key));
  }
  if(content&&copy[section]&&!content.querySelector('[data-owner-guide]')){
   const guide=document.createElement('aside');guide.className='owner-section-guide';guide.dataset.ownerGuide=section;guide.dataset.noTranslate='';
   const p=document.createElement('p');p.textContent=say(copy[section][1]);guide.append(p,infoButton(section));
   const links=document.createElement('div');links.className='owner-guide-links';
   for(const key of ['orders','delivery','drivers'].filter(k=>k!==section)){const a=document.createElement('a');a.href=merchantHref(key,s);a.textContent=say(copy[key][0]);links.append(a);}guide.append(links);content.prepend(guide);
  }
  return result;
 };
 const previousDrivers=merchantDrivers;
 merchantDrivers=function(s){const result=previousDrivers.apply(this,arguments);const form=document.querySelector('#add-driver');if(!form||s.platform)return result;
  const button=form.querySelector('button[type=submit]');if(button){button.dataset.noTranslate='';button.textContent=text('إضافة سائق وإنشاء رمز الدخول','Add driver and create login code','Fahrer hinzufügen und Zugangscode erstellen');}
  for(const name of ['name','phone']){const input=form.elements[name];if(!input)continue;input.autocomplete=name==='name'?'name':'tel';const label=input.closest('label');if(label){const title=document.createElement('span');title.dataset.noTranslate='';title.textContent=name==='name'?text('اسم السائق','Driver name','Name des Fahrers'):text('رقم هاتف السائق','Driver phone number','Telefonnummer des Fahrers');for(const n of [...label.childNodes])if(n.nodeType===3)n.remove();label.prepend(title);}}
  const steps=document.createElement('ol');steps.className='owner-driver-steps';steps.dataset.noTranslate='';steps.innerHTML=copy.drivers[2].map(step=>'<li>'+esc(say(step))+'</li>').join('');form.before(steps);return result;
 };
 const previousEditor=merchantEditor;
 merchantEditor=function(s,section){const result=previousEditor.apply(this,arguments);if(section!=='delivery')return result;const form=document.querySelector('#merchant-editor');if(!form)return result;
  const title=form.querySelector('[name=online_ordering]')?.closest('label')?.querySelector('strong');if(title){title.dataset.noTranslate='';title.textContent=text('استقبال طلبات عبر الموقع','Accept website orders','Bestellungen über die Website annehmen');}
  const h=document.querySelector('.merchant-content .section-heading h2');if(h){h.dataset.noTranslate='';h.textContent=say(copy.delivery[0]);}const save=form.querySelector('button[type=submit]');if(save){save.dataset.noTranslate='';save.textContent=text('حفظ إعدادات الطلب والتوصيل','Save order and delivery settings','Bestell- und Liefereinstellungen speichern');}return result;
 };
 const previousOrders=dashboardOrders;
 dashboardOrders=function(){const result=previousOrders.apply(this,arguments);document.querySelectorAll('#dashboard-content [data-assign-driver]').forEach(b=>{b.dataset.noTranslate='';b.textContent=text('حفظ السائق للطلب','Save driver for this order','Fahrer für die Bestellung speichern');});return result;};
})();
