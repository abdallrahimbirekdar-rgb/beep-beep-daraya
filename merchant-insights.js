'use strict';
// Uses the existing browser session only; owners receive aggregate counts.
const merchantInsightSent=new Set();
let merchantProductObserver=null;
function merchantInsightNumber(value){return Number(value||0).toLocaleString(communityLang());}
async function merchantInterest(s,kind,item=''){
 if(!s||!api||admin||mine().some(x=>x.id===s.id))return;
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Damascus'}).format(new Date());
 const key=[s.id,kind,item,day].join(':');if(merchantInsightSent.has(key))return;
 merchantInsightSent.add(key);
 try{
  if(!communityEventSession)await communityRecord(s,'view');
  if(!communityEventSession){merchantInsightSent.delete(key);return;}
  const r=await api.rpc('record_merchant_interest',{p_store:s.id,p_session:communityEventSession,p_kind:kind,p_item:item});
  if(r.error)merchantInsightSent.delete(key);
 }catch{merchantInsightSent.delete(key);}
}
const merchantInsightStoreBase=renderStore;
renderStore=function(id){
 merchantProductObserver?.disconnect();merchantInsightStoreBase(id);
 const s=stores.find(x=>x.id===id&&x.active&&!x.deleted_at);if(!s||admin||mine().some(x=>x.id===id))return;
 if(typeof IntersectionObserver==='undefined')return;
 merchantProductObserver=new IntersectionObserver(entries=>{
  for(const entry of entries)if(entry.isIntersecting&&entry.intersectionRatio>=0.5){
   const pid=entry.target.dataset.productId;
   if(pid)merchantInterest(s,'product_view',pid);
   merchantProductObserver.unobserve(entry.target);
  }
 },{threshold:0.5});
 document.querySelectorAll('.product[data-product-id]').forEach(el=>merchantProductObserver.observe(el));
};
const merchantInsightAddBase=addLine;
addLine=function(p,options=[]){
 const key=lineKey(p.id,options),before=Number(cart[key]?.quantity||0);
 merchantInsightAddBase(p,options);
 if(cartStore===p.store_id&&Number(cart[key]?.quantity||0)>before)merchantInterest(stores.find(x=>x.id===p.store_id),'cart_add',p.id);
};
const merchantInsightGalleryBase=gallery;
gallery=function(p){merchantInsightGalleryBase(p);if(p&&$('#modal')?.open&&$('.gallery'))merchantInterest(stores.find(x=>x.id===p.store_id),'photo_open',p.id);};
document.addEventListener('click',e=>{
 if(!location.hash.startsWith('#store/'))return;
 const s=stores.find(x=>x.id===location.hash.split('/')[1]);if(!s)return;
 const a=e.target.closest('a[href]');
 if(a&&/^https:\/\/(www\.)?(google\.[^/]+\/maps|maps\.google\.[^/]+|maps\.app\.goo\.gl|openstreetmap\.org)/.test(a.href))merchantInterest(s,'directions');
});
function merchantInsightChange(now,before){
 if(!Number(before))return Number(now)?ct('بدأ تسجيل نشاط في هذه الفترة','Activity started in this period','Aktivität in diesem Zeitraum begonnen'):ct('لا يوجد نشاط في الفترتين','No activity in either period','Keine Aktivität in beiden Zeiträumen');
 const difference=Number(now)-Number(before),percent=Math.round(Math.abs(difference)/Number(before)*100);
 return difference===0?ct('مثل الفترة السابقة','Same as the previous period','Wie im vorherigen Zeitraum'):
 (difference>0?ct('ارتفع','Up','Gestiegen'):ct('انخفض','Down','Gesunken'))+' '+merchantInsightNumber(percent)+'% '+ct('مقارنة بالفترة السابقة','from the previous period','gegenüber dem vorherigen Zeitraum');
}
function merchantInsightOrderRatio(orders,visits){return Number(visits)>0?Math.round(Number(orders||0)/Number(visits)*1000)/10:null;}
function merchantInsightCard(icon,title,value,note,change=''){
 return '<article class="merchant-insight-card"><span aria-hidden="true">'+icon+'</span><h3>'+esc(title)+'</h3><strong>'+(value===null?ct('غير متاح','Not available','Nicht verfügbar'):merchantInsightNumber(value))+'</strong><p>'+esc(note)+'</p>'+(change?'<small>'+esc(change)+'</small>':'')+'</article>';
}
function merchantInsightHTML(d,s){
 const n=merchantInsightNumber,c=d.current||{},prev=d.previous||{},interest=d.interest||{},o=d.orders||{};
 const commercial=s.online_ordering!==false;
 const metrics=[
  ['👀',ct('زيارات صفحتي','My page visits','Meine Seitenbesuche'),c.view,ct('مرة لكل جلسة متصفح في اليوم، وليست عدد أشخاص.','Once per browser session per day, not a person count.','Einmal je Browsersitzung und Tag, keine Personenzahl.'),merchantInsightChange(c.view,prev.view)],
  ['📞',ct('ضغطات الاتصال','Call button taps','Telefon-Klicks'),c.call,ct('جلسات ضغطت الاتصال؛ لا تؤكد حدوث مكالمة.','Sessions that tapped call; no confirmed calls.','Sitzungen mit Telefon-Klick; keine bestätigten Anrufe.'),merchantInsightChange(c.call,prev.call)],
  ['💬',ct('فتح روابط واتساب','WhatsApp link opens','WhatsApp-Linköffnungen'),c.whatsapp,ct('تشمل روابط التواصل ومشاركة الصفحة؛ لا تؤكد إرسال رسالة.','Includes contact and page sharing links; no confirmed messages.','Umfasst Kontakt- und Teilen-Links; keine bestätigten Nachrichten.'),merchantInsightChange(c.whatsapp,prev.whatsapp)],
  ['🗺️',ct('ضغطات رابط الخريطة','Map link taps','Kartenlink-Klicks'),interest.directions,ct('فتح رابط الوصول؛ لا يعني زيارة المحل فعليًا.','Opening a map link does not confirm a shop visit.','Ein Kartenlink bestätigt keinen Besuch im Geschäft.')],
  ['📸',ct('فتح صور المنتجات','Product photo opens','Geöffnete Produktbilder'),interest.photo_open,ct('فتح معرض صور المنتج، وليس عدد الصور التي رآها الزائر.','Product gallery opens, not individual photo views.','Öffnungen der Produktgalerie, keine einzelnen Bildaufrufe.')]
 ];
 if(commercial)metrics.push(['🛒',ct('إضافة للسلة','Added to cart','In den Warenkorb'),interest.cart_add,ct('تُحسب الإضافة الناجحة مرة لكل منتج وجلسة في اليوم، وليست طلبًا.','Successful additions, once per product and session per day; not orders.','Erfolgreiche Ergänzungen, einmal je Produkt und Sitzung pro Tag; keine Bestellungen.')],['📋',ct('الطلبات المسجّلة','Recorded orders','Erfasste Bestellungen'),o.total,ct('كل الطلبات، بما فيها المفتوحة والملغاة.','All orders, including open and cancelled.','Alle Bestellungen, auch offene und stornierte.'),merchantInsightChange(o.total,d.previous_orders)]);
 if(commercial)metrics.push(['📊',ct('طلبات لكل 100 زيارة','Orders per 100 visits','Bestellungen je 100 Besuche'),merchantInsightOrderRatio(o.total,c.view),ct('مؤشر إجمالي، وليس نسبة أشخاص اشتروا. يشمل الطلبات الملغاة، ولا يربط الزائر بطلبه. لا يُحسب عند غياب الزيارات.','An overall indicator, not the share of people who bought. Includes cancelled orders, without linking visitors to orders. Not calculated when visits are missing.','Gesamtindikator, kein Anteil kaufender Personen. Enthält stornierte Bestellungen, ohne Besucher mit Bestellungen zu verknüpfen. Ohne Besuche nicht berechenbar.')]);
 let html='<div class="merchant-insight-grid">'+metrics.map(x=>merchantInsightCard(...x)).join('')+'</div>';
 if(commercial)html+='<section class="merchant-insight-section"><h3>'+ct('ماذا حدث للطلبات؟','What happened to orders?','Was wurde aus den Bestellungen?')+'</h3><div class="merchant-insight-grid">'+[
  ['✅',ct('مكتملة','Completed','Abgeschlossen'),o.completed,ct('حسب الحالة التي سجلها المتجر؛ لا تؤكد تحصيل الدفع.','Based on the shop status; does not confirm payment.','Nach Geschäftsstatus; bestätigt keine Zahlung.')],
  ['⏳',ct('قيد التنفيذ','In progress','In Bearbeitung'),o.open,ct('طلبات لم تكتمل ولم تُلغَ بعد.','Orders not completed or cancelled yet.','Noch nicht abgeschlossene oder stornierte Bestellungen.')],
  ['❌',ct('ملغاة','Cancelled','Storniert'),o.cancelled,ct('طلبات سُجّلت حالتها ملغي.','Orders marked cancelled.','Als storniert markierte Bestellungen.')]
 ].map(x=>merchantInsightCard(...x)).join('')+'</div></section>';
 const rows=d.products||[],byCart=[...rows].sort((a,b)=>Number(b.carts)-Number(a.carts)),byPhoto=[...rows].sort((a,b)=>Number(b.photos)-Number(a.photos));
 const ranking=(title,list,key,explanation)=>'<section class="merchant-insight-section"><h3>'+title+'</h3><p>'+explanation+'</p>'+((list.filter(p=>Number(p[key])>0).slice(0,5).map((p,i)=>'<div class="merchant-insight-row"><span>'+n(i+1)+'. '+esc(p.name)+'</span><strong>'+n(p[key])+'</strong></div>').join(''))||'<p>'+ct('لا توجد تفاعلات مسجّلة بعد.','No recorded activity yet.','Noch keine erfasste Aktivität.')+'</p>')+'</section>';
 html+=ranking(ct('🏆 المنتجات الأكثر ظهورًا للزوار','🏆 Products visitors saw most','🏆 Am häufigsten sichtbare Produkte'),rows,'views',ct('يُسجّل المنتج عندما يظهر نصف بطاقته على الشاشة. مرة لكل جلسة في اليوم.','Recorded when half the product card is on screen, once per session per day.','Erfasst, wenn die halbe Produktkarte sichtbar ist, einmal je Sitzung pro Tag.'));
 if(commercial)html+=ranking(ct('🛍️ المنتجات الأكثر إضافة للسلة','🛍️ Products most added to cart','🛍️ Am häufigsten im Warenkorb'),byCart,'carts',ct('يساعدك على معرفة الاهتمام؛ الإضافة لا تعني شراءً مكتملًا.','Shows interest; an addition is not a completed purchase.','Zeigt Interesse; eine Ergänzung ist kein abgeschlossener Kauf.'));
 html+=ranking(ct('🖼️ صور المنتجات الأكثر فتحًا','🖼️ Most opened product galleries','🖼️ Am häufigsten geöffnete Produktgalerien'),byPhoto,'photos',ct('العدد يخص فتح معرض المنتج، وليس كل صورة داخله.','Counts product gallery opens, not each photo inside.','Zählt Galerieöffnungen, nicht einzelne Bilder darin.'));
 html+='<section class="merchant-insight-section"><h3>'+ct('⏰ أوقات نشاط الزوار','⏰ Active visitor times','⏰ Aktive Besuchszeiten')+'</h3><p>'+ct('حسب وقت أول زيارة مسجّلة في الجلسة، بتوقيت داريا. ليست مدة البقاء.','Time of the first recorded session visit, in Daraya time. Not time spent.','Zeit des ersten erfassten Sitzungsbesuchs, Ortszeit Daraya. Keine Aufenthaltsdauer.')+'</p>'+((d.hours||[]).map(h=>'<div class="merchant-insight-row"><span dir="ltr">'+String(h.hour).padStart(2,'0')+':00 – '+String((h.hour+1)%24).padStart(2,'0')+':00</span><strong>'+n(h.visits)+' '+ct('زيارة','visits','Besuche')+'</strong></div>').join('')||'<p>'+ct('لا توجد زيارات مسجّلة.','No recorded visits.','Keine erfassten Besuche.')+'</p>')+'</section>';
 html+='<details class="merchant-insight-section"><summary>'+ct('📅 الزيارات يومًا بيوم','📅 Visits by day','📅 Besuche pro Tag')+'</summary>'+((d.daily||[]).map(row=>'<div class="merchant-insight-row"><span>'+esc(row.day)+'</span><strong>'+n(row.visits)+'</strong></div>').join('')||'<p>'+ct('لا توجد بيانات بعد.','No data yet.','Noch keine Daten.')+'</p>')+'</details>';
 return html;
}
function merchantWeeklySummaryHTML(d,s){
 const current=d.current||{},previous=d.previous||{},orders=d.orders||{},n=merchantInsightNumber;
 const best=[...(d.products||[])].filter(p=>Number(p.views)>0).sort((a,b)=>Number(b.views)-Number(a.views))[0];
 const commercial=s.online_ordering!==false;
 const points=[
 ct('سُجّلت لصفحتك '+n(current.view)+' زيارة خلال آخر 7 أيام. ليست عدد أشخاص مختلفين.','Your page recorded '+n(current.view)+' visits in the last 7 days. This is not a count of different people.','Deine Seite verzeichnete '+n(current.view)+' Besuche in den letzten 7 Tagen. Keine Anzahl verschiedener Personen.'),
 merchantInsightChange(current.view,previous.view),
 ct('الاتصال: '+n(current.call)+' · روابط واتساب: '+n(current.whatsapp)+'. هذه ضغطات وليست مكالمات أو رسائل مؤكدة.','Call taps: '+n(current.call)+' · WhatsApp links: '+n(current.whatsapp)+'. These are taps, not confirmed calls or messages.','Telefon-Klicks: '+n(current.call)+' · WhatsApp-Links: '+n(current.whatsapp)+'. Keine bestätigten Anrufe oder Nachrichten.')
 ];
 if(commercial)points.push(ct('طلبات الموقع: '+n(orders.total)+'، منها '+n(orders.completed)+' مكتملة حسب حالة المتجر، و'+n(orders.cancelled)+' ملغاة.','Website orders: '+n(orders.total)+', including '+n(orders.completed)+' marked completed and '+n(orders.cancelled)+' cancelled.','Website-Bestellungen: '+n(orders.total)+', davon '+n(orders.completed)+' als abgeschlossen markiert und '+n(orders.cancelled)+' storniert.'));
 if(best)points.push(ct('أكثر منتج ظهر للزوار: '+best.name+' ('+n(best.views)+').','Most visible product: '+best.name+' ('+n(best.views)+').','Am häufigsten sichtbares Produkt: '+best.name+' ('+n(best.views)+').'));
 let tip;
 if(Number(current.view)<10)tip=ct('البيانات قليلة بعد. شارك رابط محلك وتأكد من اكتمال الصورة والعنوان والوصف، ثم راجع الملخص لاحقًا.','There is little data yet. Share your shop link, check the photo, address and details, then review the summary later.','Noch wenige Daten. Teile deinen Geschäftslink, prüfe Bild, Adresse und Beschreibung und sieh später erneut nach.');
 else if(best&&commercial&&Number(best.views)>=10&&Number(best.carts)===0)tip=ct('راجع صورة ووصف وسعر «'+best.name+'»: ظهر للزوار دون إضافة مسجّلة للسلة. هذا اقتراح للمراجعة، وليس تشخيصًا لسبب عدم الشراء.','Review the photo, details and price of '+best.name+': it was seen without recorded cart additions. This is a review suggestion, not a reason for missing purchases.','Prüfe Bild, Beschreibung und Preis von '+best.name+': sichtbar, aber ohne erfasste Warenkorb-Ergänzungen. Ein Vorschlag, keine Erklärung für fehlende Käufe.');
 else if(best&&commercial&&Number(best.carts)>0)tip=ct('هناك اهتمام بـ«'+best.name+'». تأكد من توفره ومن وضوح سعره وصورته. الإضافة للسلة لا تعني شراءً مكتملًا.','There is interest in '+best.name+'. Check availability and clear price and photo. Cart additions are not completed purchases.','Interesse an '+best.name+'. Prüfe Verfügbarkeit, Preis und Bild. Warenkorb-Ergänzungen sind keine abgeschlossenen Käufe.');
 else tip=ct('راجع معلومات صفحتك وصورتها ورقم التواصل. سجّل أي تغيير في دفتر ملاحظات المحل لتستطيع متابعة الأرقام حول تاريخه.','Review your page details, photo and contact number. Record changes in the notebook so you can check stats around their dates.','Prüfe Seitenangaben, Bild und Telefonnummer. Notiere Änderungen im Notizbuch, um die Statistik zu ihrem Datum zu prüfen.');
 return '<section class="merchant-insight-section merchant-weekly-summary"><h3>'+ct('🗓️ ملخص محلي — آخر 7 أيام','🗓️ My shop summary — last 7 days','🗓️ Geschäftsübersicht — letzte 7 Tage')+'</h3><ul>'+points.map(p=>'<li>'+esc(p)+'</li>').join('')+'</ul><h4>'+ct('💡 خطوة مقترحة','💡 Suggested step','💡 Vorschlag')+'</h4><p>'+esc(tip)+'</p><p>'+ct('يتحدث الملخص عند فتح الإحصاءات أو تحديثها. يعتمد على الأرقام المسجّلة؛ بيانات المنتجات الجديدة تبدأ من تفعيلها.','Updated when you open or refresh stats, using recorded numbers. New product data starts when tracking is enabled.','Aktualisiert beim Öffnen oder Neuladen, anhand erfasster Zahlen. Neue Produktdaten beginnen mit der Aktivierung.')+'</p><a class="button outline" href="'+esc(merchantHref('notebook',s))+'">'+ct('📝 افتح دفتر ملاحظات محلي','📝 Open my shop notebook','📝 Geschäftsnotizbuch öffnen')+'</a></section>';
}

renderMerchantPageStats=async function(s){
 const box=$('.merchant-content')||$('#dashboard-content');if(!box)return;
 box.dataset.noTranslate='';
 box.innerHTML='<section class="panel"><h2>'+ct('📈 إحصاءات متجري','📈 My shop stats','📈 Meine Geschäftsstatistik')+'</h2><p>'+ct('اعرف ما يجذب الزوار إلى محلك. كل رقم تحته شرح معناه.','See what draws visitors to your shop. Each number has a simple explanation.','Erkenne, was Besucher interessiert. Jede Zahl wird einfach erklärt.')+'</p><div class="form-actions"><label>'+ct('الفترة','Period','Zeitraum')+'<select data-insight-days><option value="7">'+ct('آخر 7 أيام','Last 7 days','Letzte 7 Tage')+'</option><option value="30" selected>'+ct('آخر 30 يومًا','Last 30 days','Letzte 30 Tage')+'</option></select></label><button class="outline" data-insight-refresh>'+ct('تحديث','Refresh','Aktualisieren')+'</button></div><p>'+ct('المقارنة مع الأيام السابقة بالمدة نفسها. زياراتك وزيارات الإدارة مستبعدة. الإحصاءات الجديدة تبدأ من تفعيلها، ولا نستنتج أرقامًا للماضي.','Compared with the previous period of the same length. Owner and admin visits are excluded. New stats start when enabled; past numbers are not guessed.','Vergleich mit dem vorherigen gleich langen Zeitraum. Inhaber und Verwaltung werden ausgeschlossen. Neue Statistiken beginnen mit der Aktivierung; frühere Zahlen werden nicht geschätzt.')+'</p><div data-insight-result aria-live="polite"></div><details class="merchant-insight-section"><summary>'+ct('كيف أستفيد من هذه الأرقام؟','How can I use these numbers?','Wie nutze ich diese Zahlen?')+'</summary><p>'+ct('منتج يظهر كثيرًا وقليل الإضافة؟ راجع صورته ووصفه وسعره. منتج يضاف كثيرًا؟ تأكد من توفره. أوقات النشاط تساعدك على اختيار وقت نشر عروضك. زيادة الزيارات وحدها لا تعني زيادة المبيعات.','Many views but few cart additions? Check the photo, details and price. Many additions? Check stock. Active times can help you choose when to post offers. More visits alone do not mean more sales.','Viele Aufrufe, wenige Warenkorb-Ergänzungen? Prüfe Bild, Beschreibung und Preis. Viele Ergänzungen? Prüfe den Bestand. Aktive Zeiten helfen bei Angeboten. Mehr Besuche allein bedeuten nicht mehr Verkäufe.')+'</p><p>'+ct('ترى أرقامًا إجمالية فقط، دون أسماء الزوار أو أرقامهم. لا نسجل نصوص البحث أو محتوى المكالمات أو رسائل واتساب لهذه الإحصاءات.','You see totals, without visitor names or phone numbers. These stats do not record search text, calls or WhatsApp message content.','Du siehst Summen ohne Besuchernamen oder Telefonnummern. Diese Statistik erfasst keine Suchtexte, Anrufe oder WhatsApp-Nachrichteninhalte.')+'</p></details></section>';
 const target=box.querySelector('[data-insight-result]'),button=box.querySelector('[data-insight-refresh]'),select=box.querySelector('[data-insight-days]');
 let serial=0;
 const update=async()=>{
  const request=++serial;button.disabled=true;target.textContent=ct('جاري تحميل الأرقام…','Loading numbers…','Zahlen werden geladen…');
  try{const days=Number(select.value);const [r,weekly]=await Promise.all([api.rpc('merchant_insights',{p_store:s.id,p_days:days}),days===7?Promise.resolve(null):api.rpc('merchant_insights',{p_store:s.id,p_days:7})]);if(r.error)throw r.error;if(!r.data)throw Error('Missing statistics');const w=weekly||r;const weeklyHTML=w.error||!w.data?'<p>'+ct('تعذر تحميل الملخص الأسبوعي. حاول التحديث.','Weekly summary could not load. Try refresh.','Wochenübersicht konnte nicht geladen werden. Bitte aktualisieren.')+'</p>':merchantWeeklySummaryHTML(w.data,s);if(target.isConnected&&request===serial)target.innerHTML=weeklyHTML+merchantInsightHTML(r.data,s);}
  catch(err){if(target.isConnected&&request===serial)target.textContent=ct('تعذر تحميل الإحصاءات. حاول التحديث؛ هذه ليست نتيجة صفر.','Stats could not load. Try refresh; this is not a zero result.','Statistik konnte nicht geladen werden. Aktualisiere erneut; dies ist kein Null-Ergebnis.');}
  finally{if(request===serial)button.disabled=false;}
 };
 button.onclick=update;select.onchange=update;await update();
};
