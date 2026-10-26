'use strict';
// Persistent, accessible feedback; never replace a form or discard entered values.
(() => {
 const t=(ar,en,de)=>typeof ct==='function'?ct(ar,en,de):({ar,en,de}[window.ShahinI18n?.language||'ar']||ar);
 let notice,body,target,firstInvalid=null,invalidQueued=false;
 const seen=new WeakMap();
 function close(){if(notice)notice.hidden=true;target=null;}
 function show(message,field=null){
  if(!message)return;
  if(!notice){
   notice=document.createElement('section');notice.id='daraya-feedback';notice.className='clear-user-feedback';notice.dataset.noTranslate='';notice.hidden=true;
   notice.setAttribute('role','alert');notice.setAttribute('aria-live','assertive');notice.setAttribute('aria-atomic','true');
   const title=document.createElement('strong');title.dataset.feedbackTitle='';notice.append(title);
   body=document.createElement('p');notice.append(body);
   const actions=document.createElement('div');actions.className='feedback-actions';
   const go=document.createElement('button');go.type='button';go.dataset.feedbackGo='';go.onclick=()=>{if(!target?.isConnected)return;window.DarayaRevealSection?.(target);const details=target.closest('details');if(details)details.open=true;target.focus({preventScroll:true});target.scrollIntoView?.({block:'center',behavior:'auto'});};
   const dismiss=document.createElement('button');dismiss.type='button';dismiss.className='outline';dismiss.dataset.feedbackClose='';dismiss.onclick=close;actions.append(go,dismiss);notice.append(actions);document.body.append(notice);
  }
  const host=document.querySelector('dialog[open]')||document.body;if(notice.parentElement!==host)host.append(notice);
  target=field?.isConnected?field:null;
  notice.querySelector('[data-feedback-title]').textContent=t('تنبيه — يرجى مراجعة المعلومات','Please check this information','Bitte prüfe diese Angaben');
  body.textContent=String(message);
  const go=notice.querySelector('[data-feedback-go]');go.hidden=!target;go.textContent=t('الانتقال إلى الحقل','Go to the field','Zum Eingabefeld');
  notice.querySelector('[data-feedback-close]').textContent=t('فهمت، إغلاق التنبيه','Got it, close','Verstanden, schließen');notice.hidden=false;
 }
 window.DarayaFeedback={show,close};
 document.addEventListener('invalid',event=>{
  const field=event.target;if(!field.matches?.('input,select,textarea'))return;event.preventDefault();
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
  for(const n of candidates){if(n===notice||notice?.contains(n))continue;if(n.classList.contains('success')){seen.delete(n);continue;}const text=n.textContent.trim();if(!text){seen.delete(n);continue;}if(seen.get(n)===text)continue;seen.set(n,text);if(n.closest('[hidden]'))continue;show(text);}
 }
 const observer=new MutationObserver(records=>{for(const r of records){inspect(r.target.nodeType===3?r.target.parentElement:r.target);for(const n of r.addedNodes||[])inspect(n);}});
 observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','hidden']});
 // Cover action failures that were previously only visible as a short-lived toast.
 if(typeof toast==='function'){const previous=toast;toast=function(message){previous.apply(this,arguments);if(/تعذر|خطأ|غير صالح|غير مسموح|لا يمكن|لم يتم|لم تُ|اختر صورة|أدخل|failed|invalid|could not|not allowed|ungültig|fehlgeschlagen|nicht möglich/i.test(String(message)))show(message);};}
})();
