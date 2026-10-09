'use strict';
function merchantNoteToday(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Damascus',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');}
function merchantNoteError(error){
 if(/changed or unavailable/.test(error?.message||''))return ct('تغيّرت الملاحظة من جلسة أخرى. انسخ تعديلك، ثم حدّث القائمة وأعد المحاولة.','This note changed in another session. Copy your edits, refresh the list and try again.','Die Notiz wurde in einer anderen Sitzung geändert. Kopiere deine Änderungen, lade die Liste neu und versuche es erneut.');
 if(/limit reached/.test(error?.message||''))return ct('وصل الدفتر إلى الحد الأقصى. أرشف ملاحظات قديمة ثم أضف الجديدة.','The notebook is full. Archive old notes before adding new ones.','Das Notizbuch ist voll. Archiviere alte Notizen vor neuen Einträgen.');
 return ct('تعذر إتمام العملية. لم نحذف النص الذي كتبته؛ حاول مجددًا.','Could not finish. Your entered text is still here; try again.','Der Vorgang ist fehlgeschlagen. Dein eingegebener Text bleibt erhalten; versuche es erneut.');
}
function merchantNoteComparisonHTML(d,s){
 const labels=[['view',ct('زيارات الصفحة','Page visits','Seitenbesuche')],['call',ct('ضغطات الاتصال','Call taps','Telefon-Klicks')],['whatsapp',ct('روابط واتساب','WhatsApp links','WhatsApp-Links')]];
 if(s.online_ordering!==false)labels.push(['orders',ct('كل طلبات الموقع','All website orders','Alle Website-Bestellungen')]);
 return '<section class="merchant-insight-section"><h3>'+ct('مقارنة حول تاريخ الملاحظة','Comparison around the note date','Vergleich zum Notizdatum')+'</h3><p>'+ct('قبل التاريخ:','Before the date:','Vor dem Datum:')+' '+esc(d.before_start)+' — '+esc(d.before_end)+'<br>'+ct('من التاريخ:','From the date:','Ab dem Datum:')+' '+esc(d.after_start)+' — '+esc(d.after_end)+'</p>'+(!d.after_complete?'<p class="merchant-note-status">'+ct('الفترة التالية لم تكتمل إلى 7 أيام بعد. الأرقام مؤقتة؛ لا تقارن المجموعين كأن مدتهما متساوية.','The later period has not reached 7 days. These are partial totals; the periods are not yet equal.','Der spätere Zeitraum hat noch keine 7 Tage. Vorläufige Summen; die Zeiträume sind noch nicht gleich lang.')+'</p>':'')+'<div class="merchant-note-comparison"><div><strong>'+ct('المؤشر','Metric','Kennzahl')+'</strong><strong>'+ct('قبل — 7 أيام','Before — 7 days','Vorher — 7 Tage')+'</strong><strong>'+ct('من التاريخ','From the date','Ab dem Datum')+'</strong></div>'+labels.map(([key,label])=>'<div><span>'+label+'</span><strong>'+merchantInsightNumber(d.before?.[key])+'</strong><strong>'+merchantInsightNumber(d.after?.[key])+'</strong></div>').join('')+'</div><p>'+ct('المقارنة تبدأ من بداية اليوم المحدد بتوقيت داريا، وليس ساعة كتابة الملاحظة. الأرقام لا تثبت أن التعديل وحده سبب الفرق؛ الطلبات تشمل الملغاة، والضغطات لا تؤكد مكالمة أو رسالة.','Comparison uses the start of the selected day in Daraya time, not the time the note was written. It does not prove the change caused the difference. Orders include cancellations; taps do not confirm calls or messages.','Der Vergleich beginnt am Tagesanfang in Daraya, nicht zur Uhrzeit der Notiz. Er beweist keine Ursache. Bestellungen enthalten Stornierungen; Klicks bestätigen keine Anrufe oder Nachrichten.')+'</p></section>';
}
function merchantNoteListHTML(notes,archived){
 return notes.map(n=>'<article class="merchant-note-card"><div class="topline"><h3>'+esc(n.title)+'</h3><small>'+esc(n.note_day)+'</small></div><p class="merchant-note-body">'+esc(n.body)+'</p><div class="form-actions">'+(archived?'<button type="button" class="outline" data-note-restore="'+esc(n.id)+'">'+ct('استعادة','Restore','Wiederherstellen')+'</button>':'<button type="button" class="outline" data-note-edit="'+esc(n.id)+'">'+ct('تعديل','Edit','Bearbeiten')+'</button><button type="button" class="outline" data-note-compare="'+esc(n.id)+'">'+ct('مقارنة الإحصاءات','Compare stats','Statistik vergleichen')+'</button><button type="button" class="outline" data-note-archive="'+esc(n.id)+'">'+ct('أرشفة','Archive','Archivieren')+'</button>')+'</div><div data-note-result="'+esc(n.id)+'" aria-live="polite"></div></article>').join('')||'<p>'+ct(archived?'لا توجد ملاحظات مؤرشفة.':'دفترك فارغ. سجّل أول تغيير تريد متابعة نتيجته.',archived?'No archived notes.':'Your notebook is empty. Record a change you want to follow.',archived?'Keine archivierten Notizen.':'Dein Notizbuch ist leer. Notiere eine Änderung, die du verfolgen möchtest.')+'</p>';
}
async function renderMerchantNotebook(s){
 const box=$('.merchant-content')||$('#dashboard-content');if(!box)return;
 box.dataset.noTranslate='';
 box.innerHTML='<section class="panel"><h2>'+ct('📝 دفتر ملاحظات محلي','📝 My shop notebook','📝 Mein Geschäftsnotizbuch')+'</h2><p>'+ct('دفتر داخلي للمحل لا يظهر للزوار. سجّل تغييرًا في صورة أو سعر أو وصف، ثم راجع الأرقام حول تاريخ التغيير.','An internal notebook, hidden from visitors. Record a photo, price or description change, then check stats around its date.','Internes Notizbuch, für Besucher unsichtbar. Notiere Bild-, Preis- oder Textänderungen und prüfe die Statistik zum Datum.')+'</p><form data-note-form><h3 data-note-form-title>'+ct('ملاحظة جديدة','New note','Neue Notiz')+'</h3><label>'+ct('تاريخ التغيير أو الملاحظة','Change or note date','Änderungs- oder Notizdatum')+'<input type="date" name="note_day" required max="'+merchantNoteToday()+'" value="'+merchantNoteToday()+'"></label><label>'+ct('عنوان قصير','Short title','Kurzer Titel')+'<input name="title" required maxlength="100" placeholder="'+ct('مثال: تغيير صورة المنتج','Example: new product photo','Beispiel: neues Produktbild')+'"></label><label>'+ct('ما الذي غيّرته أو تريد متابعته؟','What changed, or what do you want to follow?','Was wurde geändert oder soll verfolgt werden?')+'<textarea name="body" maxlength="2000" rows="4" placeholder="'+ct('مثال: وضعت صورة أوضح للسندويشة وعدّلت وصفها.','Example: I added a clearer sandwich photo and changed the details.','Beispiel: klareres Sandwichbild und neue Beschreibung.')+'"></textarea></label><div class="form-actions"><button type="submit">'+ct('حفظ الملاحظة','Save note','Notiz speichern')+'</button><button type="button" class="outline" data-note-cancel hidden>'+ct('إلغاء التعديل','Cancel edit','Bearbeitung abbrechen')+'</button></div><p data-note-save-status role="status"></p></form><hr><div class="form-actions"><label>'+ct('عرض','Show','Anzeigen')+'<select data-note-filter><option value="active">'+ct('ملاحظاتي','My notes','Meine Notizen')+'</option><option value="archived">'+ct('الأرشيف','Archive','Archiv')+'</option></select></label><button type="button" class="outline" data-note-refresh>'+ct('تحديث القائمة','Refresh list','Liste aktualisieren')+'</button></div><p>'+ct('تظهر أحدث 200 ملاحظة. الأرشفة تخفي الملاحظة من القائمة ويمكن استعادتها.','Shows the latest 200 notes. Archived notes can be restored.','Zeigt die neuesten 200 Notizen. Archivierte Notizen lassen sich wiederherstellen.')+'</p><div data-note-list aria-live="polite"></div></section>';
 const form=box.querySelector('[data-note-form]'),status=box.querySelector('[data-note-save-status]'),list=box.querySelector('[data-note-list]'),filter=box.querySelector('[data-note-filter]'),refresh=box.querySelector('[data-note-refresh]'),cancel=box.querySelector('[data-note-cancel]');
 let notes=[],editing=null,loading=0,saving=false;
 const reset=()=>{editing=null;form.reset();form.elements.note_day.value=merchantNoteToday();form.querySelector('[data-note-form-title]').textContent=ct('ملاحظة جديدة','New note','Neue Notiz');cancel.hidden=true;};
 const load=async()=>{
  const request=++loading;refresh.disabled=true;list.textContent=ct('جاري تحميل الملاحظات…','Loading notes…','Notizen werden geladen…');
  try{const r=await api.rpc('list_merchant_notes',{p_store:s.id,p_archived:filter.value==='archived'});if(r.error)throw r.error;if(!Array.isArray(r.data))throw Error('Invalid notes');if(!list.isConnected||request!==loading)return;notes=r.data;list.innerHTML=merchantNoteListHTML(notes,filter.value==='archived');bind();}
  catch(err){if(list.isConnected&&request===loading)list.textContent=merchantNoteError(err);}
  finally{if(request===loading)refresh.disabled=false;}
 };
 const archive=async(id,archived,button)=>{
  const n=notes.find(n=>n.id===id);if(!n)return;
  button.disabled=true;const result=list.querySelector('[data-note-result="'+CSS.escape(id)+'"]');
  try{const r=await api.rpc('archive_merchant_note',{p_store:s.id,p_id:id,p_revision:n.revision,p_archived:archived});if(r.error)throw r.error;await load();}
  catch(err){if(result?.isConnected)result.textContent=merchantNoteError(err);}
  finally{if(button.isConnected)button.disabled=false;}
 };
 function bind(){
  list.querySelectorAll('[data-note-edit]').forEach(b=>b.onclick=()=>{
   if(saving)return;const n=notes.find(n=>n.id===b.dataset.noteEdit);if(!n)return;
   if((editing||form.elements.title.value||form.elements.body.value)&&!confirm(ct('استبدال النص غير المحفوظ بهذه الملاحظة؟','Replace the unsaved text with this note?','Ungespeicherten Text durch diese Notiz ersetzen?')))return;
   editing={...n};form.elements.title.value=n.title;form.elements.body.value=n.body;form.elements.note_day.value=n.note_day;
   form.querySelector('[data-note-form-title]').textContent=ct('تعديل الملاحظة','Edit note','Notiz bearbeiten');cancel.hidden=false;status.textContent='';form.scrollIntoView({behavior:'smooth',block:'start'});form.elements.title.focus({preventScroll:true});
  });
  list.querySelectorAll('[data-note-archive]').forEach(b=>b.onclick=()=>archive(b.dataset.noteArchive,true,b));
  list.querySelectorAll('[data-note-restore]').forEach(b=>b.onclick=()=>archive(b.dataset.noteRestore,false,b));
  list.querySelectorAll('[data-note-compare]').forEach(b=>b.onclick=async()=>{
   const id=b.dataset.noteCompare,result=list.querySelector('[data-note-result="'+CSS.escape(id)+'"]');b.disabled=true;result.textContent=ct('جاري المقارنة…','Loading comparison…','Vergleich wird geladen…');
   try{const r=await api.rpc('merchant_note_comparison',{p_store:s.id,p_id:id});if(r.error)throw r.error;if(!r.data)throw Error('Missing comparison');if(result.isConnected)result.innerHTML=merchantNoteComparisonHTML(r.data,s);}
   catch(err){if(result.isConnected)result.textContent=merchantNoteError(err);}
   finally{if(b.isConnected)b.disabled=false;}
  });
 }
 form.onsubmit=async e=>{
  e.preventDefault();if(saving)return;saving=true;const button=form.querySelector('[type="submit"]');button.disabled=true;cancel.disabled=true;status.textContent=ct('جاري الحفظ…','Saving…','Wird gespeichert…');
  const data=new FormData(form);
  try{const r=await api.rpc('save_merchant_note',{p_store:s.id,p_id:editing?.id||null,p_day:data.get('note_day'),p_title:String(data.get('title')||'').trim(),p_body:String(data.get('body')||'').trim(),p_revision:editing?.revision||0});if(r.error)throw r.error;if(!r.data?.id)throw Error('Unconfirmed save');if(!form.isConnected)return;reset();status.textContent=ct('تم حفظ الملاحظة.','Note saved.','Notiz gespeichert.');filter.value='active';await load();}
  catch(err){if(status.isConnected)status.textContent=merchantNoteError(err);}
  finally{saving=false;if(button.isConnected)button.disabled=false;cancel.disabled=false;}
 };
 cancel.onclick=()=>{if(!saving){reset();status.textContent='';}};filter.onchange=load;refresh.onclick=load;
 await load();
}
