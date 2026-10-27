'use strict';
(() => {
 const t=(ar,en,de)=>({ar,en,de}[window.ShahinI18n?.language||'ar']||ar);
 function transferStore(s){
  if(!admin||!user||!s?.id||s.deleted_at)return;
  const actor=user.id,revision=s.revision;
  modal('<section data-no-translate><h2>'+t('نقل المتجر لحساب آخر','Transfer shop to another account','Geschäft auf ein anderes Konto übertragen')+'</h2><p><strong>'+esc(s.name)+'</strong></p><p>'+t('سيستطيع صاحب البريد الجديد إدارة بيانات هذا المتجر وصوره ومنتجاته وأسعاره مباشرة، دون انتظار موافقتك على التعديلات. لا يحصل على صلاحيات إدارة المنصة، وتبقى لك صلاحياتك كمدير.','The new owner can edit this shop, photos, products and prices without your approval. They get no platform admin access. You keep your admin access.','Der neue Inhaber kann Geschäftsdaten, Fotos, Produkte und Preise ohne deine Freigabe bearbeiten. Er erhält keine Plattformverwaltung. Deine Administratorrechte bleiben bestehen.')+'</p><p>'+t('البريد الحالي:','Current email:','Aktuelle E-Mail:')+' <bdi>'+esc(s.owner_email||'—')+'</bdi></p><form data-store-transfer-form><label>'+t('بريد الحساب الجديد','New account email','E-Mail des neuen Kontos')+'<input name="email" type="email" required maxlength="254" autocomplete="off" autocapitalize="none" spellcheck="false" dir="ltr" placeholder="name@example.com"></label><p class="field-hint">'+t('استخدم بريد حسابه في الموقع. إذا لم يكن لديه حساب، يمكنه إنشاء حساب أو الدخول عبر Google بالبريد نفسه. لا نغيّر كلمة مروره ولا نرسل رسالة تلقائية.','Use their account email. If they have no account, they can sign up or use Google with this email. Their password does not change. No email is sent.','Nutze die E-Mail seines Kontos. Ohne Konto kann er sich registrieren oder mit dieser E-Mail über Google anmelden. Das Passwort bleibt unverändert. Es wird keine E-Mail gesendet.')+'</p><label><input name="acknowledge" type="checkbox" required> '+t('راجعت البريد وأريد نقل إدارة هذا المتجر إليه.','I checked the email and want to transfer this shop to it.','Ich habe die E-Mail geprüft und möchte dieses Geschäft darauf übertragen.')+'</label><div class="form-actions"><button type="submit">'+t('نقل إدارة المتجر','Transfer shop management','Geschäftsverwaltung übertragen')+'</button></div></form><p data-store-transfer-status role="status" aria-live="polite"></p></section>');
  const form=document.querySelector('[data-store-transfer-form]'),status=document.querySelector('[data-store-transfer-status]');let saving=false;
  form.onsubmit=async event=>{
   event.preventDefault();if(saving||!form.reportValidity())return;
   const email=form.elements.email.value.trim().toLowerCase();
   if(email===String(s.owner_email||'').trim().toLowerCase()){status.textContent=t('هذا البريد يدير المتجر بالفعل.','This email already manages the shop.','Diese E-Mail verwaltet das Geschäft bereits.');return;}
   if(!admin||user?.id!==actor||!Number.isInteger(revision)){status.textContent=t('حدّث الصفحة وافتح المتجر مجددًا قبل النقل.','Refresh the page and open the shop again.','Lade die Seite neu und öffne das Geschäft erneut.');return;}
   saving=true;const button=form.querySelector('[type="submit"]');button.disabled=true;form.elements.email.readOnly=true;status.textContent=t('جاري نقل إدارة المتجر…','Transferring shop management…','Geschäftsverwaltung wird übertragen…');
   let transferred=false;
   try{
    const result=await api.from('stores').update({owner_email:email}).eq('id',s.id).eq('revision',revision).select('id,revision');
    if(result.error)throw result.error;
    if(!result.data?.length)throw Error(t('تغيّرت بيانات المتجر أو صلاحياتك. حدّث الصفحة ثم أعد المحاولة.','Shop data or access changed. Refresh and try again.','Geschäftsdaten oder Berechtigungen haben sich geändert. Lade neu und versuche es erneut.'));
    transferred=true;if(!form.isConnected||user?.id!==actor)return;
    status.textContent=t('تم نقل إدارة المتجر إلى: ','Shop management transferred to: ','Geschäftsverwaltung übertragen an: ')+email;
    form.replaceChildren();const done=document.createElement('button');done.type='button';done.textContent=t('تم','Done','Fertig');done.onclick=()=>document.querySelector('#modal').close();form.append(done);
    try{await reload();if(user?.id===actor)render();}catch{status.textContent+=' '+t('تم النقل، لكن تعذر تحديث العرض. حدّث الصفحة.','Transfer saved. Refresh the page to see it.','Übertragung gespeichert. Lade die Seite neu.');}
   }catch(error){if(form.isConnected&&user?.id===actor)status.textContent=error.message||t('تعذر نقل المتجر. حاول مجددًا.','Could not transfer the shop. Try again.','Geschäft konnte nicht übertragen werden. Versuche es erneut.');}
   finally{if(!transferred&&form.isConnected){saving=false;button.disabled=false;form.elements.email.readOnly=false;}}
  };
 }
 function makeButton(s){const button=document.createElement('button');button.type='button';button.className='outline';button.dataset.storeTransfer=s.id;button.dataset.noTranslate='';button.textContent=t('نقل المتجر لحساب آخر','Transfer shop to another account','Geschäft auf anderes Konto übertragen');button.onclick=()=>transferStore(s);return button;}
 const originalStores=dashboardStores;
 dashboardStores=function(ms){const result=originalStores.apply(this,arguments);if(!admin)return result;document.querySelectorAll('#dashboard-content [data-edit-store]').forEach(edit=>{const s=ms.find(s=>s.id===edit.dataset.editStore);if(!s||s.deleted_at)return;const target=edit.closest('.admin-place-card')?.querySelector('.admin-place-actions')||edit.parentElement;if(target.querySelector('[data-store-transfer]'))return;target.append(makeButton(s));});return result;};
 const originalDashboard=merchantDashboard;
 merchantDashboard=function(ms,s){const result=originalDashboard.apply(this,arguments);if(!admin||!s||s.deleted_at)return result;
  const nav=document.querySelector('.merchant-nav');if(nav&&!nav.querySelector('[data-store-transfer]')){const button=makeButton(s);button.classList.add('dashboard-menu-card');const icon=document.createElement('span');icon.dataset.dashboardIcon='';icon.setAttribute('aria-hidden','true');icon.textContent='⇄';button.prepend(icon);nav.append(button);}
  const content=document.querySelector('.merchant-content');if(content&&!content.querySelector('[data-store-transfer]')){const panel=document.createElement('section');panel.className='panel store-transfer-panel';panel.dataset.noTranslate='';const title=document.createElement('h2');title.textContent=t('إدارة حساب المتجر','Shop account management','Geschäftskonto verwalten');panel.append(title,makeButton(s));content.prepend(panel);}
  return result;
 };
 const originalEdit=editStore;
 editStore=function(s){const result=originalEdit.apply(this,arguments);const form=document.querySelector('#edit-form');if(admin&&s?.id&&!s.deleted_at&&form&&!document.querySelector('#modal-body [data-store-transfer]')){const button=makeButton(s);button.style.marginBottom='16px';form.before(button);}return result;};
})();
