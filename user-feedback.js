'use strict';
// Persistent, accessible feedback; never replace a form or discard entered values.
(() => {
 const t=(ar,en,de)=>typeof ct==='function'?ct(ar,en,de):({ar,en,de}[window.ShahinI18n?.language||'ar']||ar);
 let notice,body,target,firstInvalid=null,invalidQueued=false;
 const seen=new WeakMap();
 function explain(error){
  const raw=String(error?.message||error||''),code=String(error?.code||error?.status||''),value=code+' '+raw;let reason,next;
  if(/تم.*(لكن|لم يكتمل)/.test(raw))return {kind:'warning',message:raw+'\n'+t('لا تعِد إنشاء المتجر. اتبع الخطوات أعلاه لإكمال البيانات.','Do not create the shop again. Follow the steps above.','Erstelle das Geschäft nicht erneut. Befolge die Schritte oben.')};
  if(navigator.onLine===false||/failed to fetch|network|load failed|timeout|timed out|انقطاع|اتصال.*إنترنت/i.test(value)){reason=t('تعذر الاتصال بالخادم أو انتهت مهلة الانتظار.','The server could not be reached or took too long.','Der Server ist nicht erreichbar oder antwortet zu spät.');next=t('تحقق من الإنترنت ثم أعد الحفظ. احتفظ بالبيانات المكتوبة حتى تتأكد من النتيجة.','Check your internet and try Save again. Keep your entered details until you know the result.','Prüfe die Internetverbindung und speichere erneut. Behalte die Eingaben, bis das Ergebnis feststeht.');}
  else if(/PGRST30[12]|401|jwt|token.*expired|session.*expired|جلسة الدخول|تسجيل الدخول|سجّل الدخول/i.test(value)){reason=t('انتهت جلسة الدخول أو تعذر التحقق من الحساب.','Your sign-in session ended or could not be checked.','Die Anmeldung ist abgelaufen oder konnte nicht geprüft werden.');next=t('انسخ تعديلاتك أولًا، ثم سجّل الدخول بالحساب المرتبط بالمتجر وأعد المحاولة.','Copy your changes first. Sign in with the shop account and try again.','Kopiere zuerst deine Änderungen. Melde dich mit dem Geschäftskonto an und versuche es erneut.');}
  else if(/42501|403|row.level|permission denied|not authorized|ليس لديك صلاحية|لا تملك صلاحية/i.test(value)){reason=t('هذا الحساب لا يملك صلاحية تنفيذ التعديل على المتجر.','This account cannot make this change to the shop.','Dieses Konto darf das Geschäft nicht ändern.');next=t('تأكد أنك تستخدم حساب صاحب المتجر. إذا نُقل المتجر إلى بريد آخر، ادخل بذلك البريد أو تواصل مع الإدارة.','Use the shop owner account. If the shop moved to another email, use that email or contact the team.','Nutze das Inhaberkonto. Bei einer Übertragung nutze die neue E-Mail oder kontaktiere die Verwaltung.');}
  else if(/PGRST116|revision|تغيّرت|تغيرت|حدّث الصفحة.*حاول|since.*opened/i.test(value)){reason=t('تغيّرت بيانات المتجر منذ فتح هذه الصفحة.','The shop details changed after you opened this page.','Die Geschäftsdaten haben sich seit dem Öffnen geändert.');next=t('انسخ تعديلاتك، ثم حدّث الصفحة وافتح القسم مجددًا وأعد تطبيقها قبل الحفظ.','Copy your changes. Refresh the page, open the section again and apply your changes before saving.','Kopiere deine Änderungen. Lade neu, öffne den Bereich und trage sie vor dem Speichern erneut ein.');}
  else if(/413|too large|maximum.*size|حجم الصورة|ميغابايت|الصورة كبيرة/i.test(value)){reason=/[\u0600-\u06ff]/.test(raw)?raw:t('ملف الصورة أكبر من الحجم المسموح.','The image file is too large.','Die Bilddatei ist zu groß.');next=t('اختر صورة أصغر ضمن الحجم الموضّح بجانب حقل الصورة، ثم أعد الحفظ.','Choose a smaller image within the shown size limit and save again.','Wähle ein kleineres Bild innerhalb der angezeigten Grenze und speichere erneut.');}
  else if(/unsupported|mime|صيغة|نوع الملف|تعذر فتح الصورة|تجهيز الصورة/i.test(value)){reason=/[\u0600-\u06ff]/.test(raw)?raw:t('تعذر قراءة الصورة أو أن نوعها غير مدعوم.','The image could not be read or its type is not supported.','Das Bild ist nicht lesbar oder das Format wird nicht unterstützt.');next=t('اختر صورة JPG أو PNG أو WebP من جهازك ثم أعد المحاولة.','Choose a JPG, PNG or WebP image from your device and try again.','Wähle ein JPG-, PNG- oder WebP-Bild vom Gerät und versuche es erneut.');}
  else if(/429|rate.limit|too many requests/i.test(value)){reason=t('هناك محاولات كثيرة خلال وقت قصير.','There were too many tries in a short time.','Es gab zu viele Versuche in kurzer Zeit.');next=t('انتظر قليلًا ثم أعد الحفظ مرة واحدة.','Wait a little, then try Save once.','Warte kurz und speichere dann einmal erneut.');}
  else if(/23505|duplicate|unique constraint/i.test(value)){reason=t('توجد بيانات مطابقة محفوظة من قبل.','The same details are already saved.','Diese Angaben sind bereits gespeichert.');next=t('راجع البيانات الموجودة قبل إعادة الإضافة، وعدّل القيمة المكررة إذا لزم.','Check the saved details before adding again. Change the repeated value if needed.','Prüfe die vorhandenen Angaben und ändere den doppelten Wert bei Bedarf.');}
  else{reason=/[\u0600-\u06ff]/.test(raw)?raw:t('لم يستطع الخادم إكمال العملية.','The server could not finish this action.','Der Server konnte die Aktion nicht abschließen.');next=t('راجع البيانات ثم أعد المحاولة. إذا استمر الخطأ، أرسل صورة الرسالة إلى إدارة الموقع.','Check the details and try again. If it keeps failing, send a picture of this message to the site team.','Prüfe die Angaben und versuche es erneut. Bei weiteren Fehlern sende einen Screenshot an die Verwaltung.');}
  return {kind:'error',message:t('السبب: ','Reason: ','Grund: ')+reason+'\n'+t('ماذا تفعل؟ ','What to do: ','Was tun? ')+next};
 }
 function showError(error,field=null,element=null){const info=explain(error);if(element)seen.set(element,element.textContent.trim());show(info.message,field,{kind:info.kind,title:info.kind==='warning'?t('تم حفظ جزء من البيانات','Some details were saved','Ein Teil der Daten wurde gespeichert'):t('تعذر إكمال العملية','Could not finish this action','Aktion nicht abgeschlossen')});}
 function success(message){show(message||t('تم حفظ التعديل بنجاح.','Your change was saved.','Deine Änderung wurde gespeichert.'),null,{kind:'success',title:t('تمت العملية بنجاح','Done successfully','Erfolgreich abgeschlossen')});}

 function close(){if(notice)notice.hidden=true;target=null;}
 function show(message,field=null,options={}){
  if(!message)return;
  if(!notice){
   notice=document.createElement('section');notice.id='daraya-feedback';notice.className='clear-user-feedback';notice.dataset.noTranslate='';notice.hidden=true;
   notice.setAttribute('role','alert');notice.setAttribute('aria-live','assertive');notice.setAttribute('aria-atomic','true');
   const title=document.createElement('strong');title.dataset.feedbackTitle='';notice.append(title);
   body=document.createElement('p');notice.append(body);
   const actions=document.createElement('div');actions.className='feedback-actions';
   const go=document.createElement('button');go.type='button';go.dataset.feedbackGo='';go.onclick=()=>{if(!target?.isConnected)return;window.DarayaRevealSection?.(target);const details=target.closest('details');if(details)details.open=true;target.focus({preventScroll:true});target.scrollIntoView?.({block:'center',behavior:'auto'});};
   const dismiss=document.createElement('button');dismiss.type='button';dismiss.className='outline';dismiss.dataset.feedbackClose='';dismiss.onclick=close;const retry=document.createElement('button');retry.type='button';retry.dataset.feedbackRetry='';retry.hidden=true;actions.append(go,retry,dismiss);notice.append(actions);document.body.append(notice);
  }
  const host=document.querySelector('dialog[open]')||document.body;if(notice.parentElement!==host)host.append(notice);
  target=field?.isConnected?field:null;const kind=options.kind||'error';notice.dataset.feedbackKind=kind;notice.setAttribute('role',kind==='success'?'status':'alert');notice.setAttribute('aria-live',kind==='success'?'polite':'assertive');
  notice.querySelector('[data-feedback-title]').textContent=options.title||t('تنبيه — يرجى مراجعة المعلومات','Please check this information','Bitte prüfe diese Angaben');
  body.textContent=String(message);const retry=notice.querySelector('[data-feedback-retry]');retry.hidden=!options.onRetry;retry.disabled=false;retry.textContent=options.retryLabel||t('إعادة المحاولة','Try again','Erneut versuchen');retry.onclick=async()=>{retry.disabled=true;try{await options.onRetry?.();}finally{retry.disabled=false;}};
  const go=notice.querySelector('[data-feedback-go]');go.hidden=!target;go.textContent=t('الانتقال إلى الحقل','Go to the field','Zum Eingabefeld');
  notice.querySelector('[data-feedback-close]').textContent=t('فهمت، إغلاق التنبيه','Got it, close','Verstanden, schließen');notice.hidden=false;
 }
 window.DarayaFeedback={show,showError,success,explain,close};
 document.addEventListener('invalid',event=>{
  const field=event.target;if(!field.matches?.('input,select,textarea'))return;event.preventDefault();
  if(field.dataset.mapPending==='true')return;
  field.setAttribute('aria-invalid','true');if(!firstInvalid)firstInvalid=field;
  if(invalidQueued)return;invalidQueued=true;
  queueMicrotask(()=>{
   invalidQueued=false;const input=firstInvalid;firstInvalid=null;if(!input?.isConnected)return;
   const label=input.labels?.[0];const name=input.getAttribute('aria-label')||[...label?.childNodes||[]].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').trim()||input.name||t('هذا الحقل','This field','Dieses Feld');
   const v=input.validity;
   const reason=v.valueMissing?t('هذا الحقل مطلوب. أكمله للمتابعة.','This field is required. Fill it in to continue.','Dieses Feld ist erforderlich. Fülle es aus, um fortzufahren.'):
    v.typeMismatch?t('الصيغة غير صحيحة. تحقق من البريد أو الرابط المطلوب.','The format is not valid. Check the required email or link.','Das Format ist ungültig. Prüfe die E-Mail-Adresse oder den Link.'):
    v.tooShort?t('النص أقصر من الحد المطلوب: '+input.minLength+' أحرف على الأقل.','Use at least '+input.minLength+' characters.','Verwende mindestens '+input.minLength+' Zeichen.'):
    v.rangeUnderflow||v.rangeOverflow?t('أدخل قيمة ضمن الحد المحدد: '+(input.min||'…')+' — '+(input.max||'…')+'.','Enter a value within the shown limits: '+input.min+' — '+input.max+'.','Gib einen Wert innerhalb der Grenzen ein: '+input.min+' — '+input.max+'.'):
    input.validationMessage||t('تحقق من قيمة هذا الحقل.','Check this field.','Prüfe dieses Feld.');
   show(name+': '+reason,input);window.DarayaRevealSection?.(input);input.focus({preventScroll:true});input.scrollIntoView?.({block:'center',behavior:'auto'});
  });
 },true);
 document.addEventListener('input',e=>{if(e.target.matches?.('[aria-invalid="true"]')&&e.target.validity?.valid)e.target.removeAttribute('aria-invalid');},true);
 document.addEventListener('submit',close,true);window.addEventListener('hashchange',close);
 const errorSelector='.error,[role="alert"]';
 function inspect(node){
  if(!node||node.nodeType!==1||node===notice||notice?.contains(node))return;
  const candidates=new Set();if(node.matches(errorSelector))candidates.add(node);const parent=node.closest(errorSelector);if(parent)candidates.add(parent);node.querySelectorAll(errorSelector).forEach(n=>candidates.add(n));
  if(seen.has(node)&&!node.matches(errorSelector))seen.delete(node);
  for(const n of candidates){if(n===notice||notice?.contains(n))continue;if(n.classList.contains('success')){seen.delete(n);continue;}const text=n.textContent.trim();if(!text){seen.delete(n);continue;}if(seen.get(n)===text)continue;seen.set(n,text);if(n.closest('[hidden]'))continue;showError(text,null,n);}
 }
 const observer=new MutationObserver(records=>{for(const r of records){inspect(r.target.nodeType===3?r.target.parentElement:r.target);for(const n of r.addedNodes||[])inspect(n);}});
 observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','hidden']});
 // Cover action failures that were previously only visible as a short-lived toast.
 if(typeof toast==='function'){const previous=toast;toast=function(message){previous.apply(this,arguments);if(/تعذر|خطأ|غير صالح|غير مسموح|لا يمكن|لم يتم|لم تُ|اختر صورة|أدخل|failed|invalid|could not|not allowed|ungültig|fehlgeschlagen|nicht möglich/i.test(String(message)))showError(message);else if(/تم(?:ت)?\s+(?:ال)?(?:حفظ|تحديث|إضافة|حذف|نقل|رفع)|saved|updated|deleted|gespeichert|aktualisiert/i.test(String(message)))success(message);};}
})();
