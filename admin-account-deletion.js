'use strict';
(() => {
 const route='#account-deletion-admin';
 const t=(ar,en,de)=>ct(ar,en,de);
 const title=()=>t('حذف الحسابات','Delete accounts','Konten löschen');
 const link=()=>'<a class="button outline" data-no-translate href="'+route+'">'+title()+'</a>';
 let generation=0;
 function error(e){
  const key=e?.message||'';
  const messages={
   ADMIN_REQUIRED:t('هذه الأداة لإدارة المنصة فقط.','This tool is for platform admins only.','Dieses Werkzeug ist nur für die Plattformverwaltung.'),
   ACCOUNT_NOT_FOUND:t('لم نجد حسابًا بهذه الهوية. تحقق من البريد أو رقم الهاتف.','No account found. Check the email or phone number.','Kein Konto gefunden. Prüfe E-Mail oder Telefonnummer.'),
   ACCOUNT_NEEDS_HANDLING:t('تغيّرت حالة الحساب أو يحتاج معالجة أولًا. اعرض المعاينة مجددًا.','The account needs handling first. Load its preview again.','Das Konto muss zuerst bearbeitet werden. Lade die Vorschau erneut.'),
   CONFIRMATION_REQUIRED:t('اكتب هوية الحساب كما تظهر في المعاينة.','Enter the account identity exactly as shown.','Gib die Kontokennung genau wie angezeigt ein.'),
   VERIFICATION_REQUIRED:t('أكد أنك تحققت من ملكية صاحب الطلب.','Confirm that you checked the request owner.','Bestätige die Prüfung des Antragstellers.'),
   REQUEST_MISMATCH:t('الطلب لا يخص هذا الحساب. حدّث القائمة.','The request does not match this account. Refresh the list.','Der Antrag gehört nicht zu diesem Konto. Aktualisiere die Liste.')
  };
  return messages[key]||t('تعذر إكمال العملية. لم نؤكد حذف الحساب؛ حدّث المعاينة أو أعد المحاولة.','The action could not be confirmed. Refresh the preview or try again.','Der Vorgang konnte nicht bestätigt werden. Aktualisiere die Vorschau oder versuche es erneut.');
 }
 function blocker(code){return {
  SELF_ACCOUNT:t('لا يمكنك حذف الحساب الذي تستخدمه للإدارة.','You cannot delete your current admin account.','Dein aktuelles Verwaltungskonto kann nicht gelöscht werden.'),
  ADMIN_ACCOUNT:t('هذا الحساب مرتبط بالإدارة أو بسجلات إجراءات إدارية؛ يحتاج معالجة مخصصة.','This account has admin access or admin records and needs separate handling.','Dieses Konto hat Verwaltungsrechte oder Verwaltungsprotokolle und muss gesondert bearbeitet werden.'),
  BUSINESS_ACCOUNT:t('الحساب مرتبط بمحل أو مندوب أو طلب نشاط معتمد. عالج بيانات النشاط وملكيته أولًا.','This account is linked to a shop, courier or approved business. Handle the business and its ownership first.','Das Konto ist mit einem Geschäft, Kurier oder freigegebenen Angebot verknüpft. Bearbeite zuerst das Angebot und dessen Inhaber.'),
  ACTIVE_TRANSACTIONS:t('توجد طلبات أو حجوزات مفتوحة. أكملها أو ألغها من أدواتها، ثم أعد المعاينة.','There are open orders or bookings. Complete or cancel them using their tools, then preview again.','Es gibt offene Bestellungen oder Buchungen. Schließe sie ab oder storniere sie und lade die Vorschau erneut.'),
  STORED_FILES:t('توجد ملفات أو صور منشورات تحتاج حذفًا من خدمة التخزين أولًا، حتى لا تبقى خارج قاعدة البيانات.','Stored files or post images need removal from their storage service first.','Dateien oder Beitragsbilder müssen zuerst beim Speicherdienst entfernt werden.')
 }[code]||t('الحساب يحتاج معالجة قبل الحذف.','The account needs handling before deletion.','Das Konto muss vor dem Löschen bearbeitet werden.');}
 function previewMarkup(s){
  const stats=[
   [t('الطلبات التي ستزال منها الهوية','Orders to make anonymous','Zu anonymisierende Bestellungen'),s.orders],
   [t('المحفوظات','Saved shops','Gespeicherte Geschäfte'),s.favorites],
   [t('المنشورات','Posts','Beiträge'),s.posts],
   [t('مسودات طلبات النشاط','Business application drafts','Angebotsentwürfe'),s.drafts],
   [t('سجلات المشتريات الشخصية','Personal purchase records','Persönliche Kaufdatensätze'),s.purchases]
  ];
  return '<section class="panel"><h2>'+t('معاينة الحساب قبل الحذف','Account preview before deletion','Kontovorschau vor dem Löschen')+'</h2><p><strong dir="ltr">'+esc(s.identity)+'</strong></p>'+(s.display_name?'<p>'+esc(s.display_name)+'</p>':'')+'<dl class="account-deletion-counts">'+stats.map(([label,n])=>'<div><dt>'+label+'</dt><dd>'+Number(n||0)+'</dd></div>').join('')+'</dl><p>'+t('سيُحذف حساب الدخول وملفه الشخصي وعناوينه ومحفوظاته ومنشوراته وطلباته الشخصية والمسودات وسجل مشترياته. تُحفظ مبالغ الطلبات المكتملة أو الملغاة بعد إزالة هوية الزبون وبيانات تواصله وموقعه وإلغاء روابط التتبع القديمة.','The sign-in account, profile, addresses, saved shops, posts, personal requests, drafts and purchase history will be removed. Completed or cancelled order amounts stay, with the customer identity, contact details and location removed and old tracking links disabled.','Anmeldekonto, Profil, Adressen, Favoriten, Beiträge, persönliche Anfragen, Entwürfe und Kaufverlauf werden entfernt. Beträge abgeschlossener oder stornierter Bestellungen bleiben ohne Kundenidentität, Kontaktdaten oder Standort erhalten; alte Trackinglinks werden ungültig.')+'</p>'+
   (s.eligible?'<form data-confirm-delete><label class="choice-card"><input type="checkbox" name="verified" required><span>'+t('تحققت من أن صاحب الحساب طلب الحذف ومن ملكيته للحساب.','I checked that the account owner requested deletion and owns this account.','Ich habe den Löschwunsch und die Kontoinhaberschaft geprüft.')+'</span></label><label>'+t('للتأكيد، اكتب البريد أو الرقم المعروض أعلاه','To confirm, enter the email or number shown above','Zur Bestätigung die oben angezeigte E-Mail oder Nummer eingeben')+'<input name="identity" type="text" dir="ltr" autocomplete="off" required></label><p>'+t('الحذف نهائي ولا يمكن التراجع عنه.','Deletion is permanent and cannot be undone.','Die Löschung ist endgültig und kann nicht rückgängig gemacht werden.')+'</p><button class="danger" type="submit" disabled>'+t('حذف الحساب وبياناته نهائيًا','Permanently delete account and data','Konto und Daten endgültig löschen')+'</button></form>':'<div role="alert"><h3>'+t('تحتاج معالجة قبل الحذف','Needs handling before deletion','Vor dem Löschen zu bearbeiten')+'</h3><ul>'+(s.blockers||[]).map(code=>'<li>'+esc(blocker(code))+'</li>').join('')+'</ul><p>'+t('طلبات مفتوحة: ','Open orders: ','Offene Bestellungen: ')+Number(s.open_orders||0)+' · '+t('حجوزات مفتوحة: ','Open bookings: ','Offene Buchungen: ')+Number(s.open_bookings||0)+'</p>'+((s.shops||[]).length?'<p>'+t('المحلات المرتبطة: ','Linked shops: ','Verknüpfte Geschäfte: ')+Number(s.shops.length)+'</p>':'')+(s.shops||[]).slice(0,8).map(shop=>'<a class="button outline" href="#dashboard/setup/'+esc(shop.id)+'/overview">'+esc(shop.name)+'</a>').join('')+((s.shops||[]).length>8?'<p><a href="#dashboard">'+t('عرض باقي المحلات من لوحة التحكم','View remaining shops in the dashboard','Weitere Geschäfte im Dashboard anzeigen')+'</a></p>':'')+'<p><a class="button outline" href="#dashboard/orders">'+t('إدارة الطلبات','Manage orders','Bestellungen verwalten')+'</a></p></div>')+'</section>';
 }
 async function renderPage(){
  const token=++generation,actor=user?.id,app=document.querySelector('#app');
  if(!actor||!admin){app.innerHTML='<section class="panel" data-no-translate><h1>'+title()+'</h1><p>'+error({message:'ADMIN_REQUIRED'})+'</p><a href="#account">'+t('تسجيل الدخول','Sign in','Anmelden')+'</a></section>';return;}
  const alive=()=>token===generation&&user?.id===actor&&admin&&location.hash===route;
  app.classList.remove('professional-home','dashboard-menu-home','dashboard-menu-section');
  app.innerHTML='<section class="panel admin-deletion-page" data-no-translate><a class="button outline" href="#dashboard">'+t('العودة إلى لوحة الإدارة','Back to admin dashboard','Zurück zur Verwaltung')+'</a><h1>'+title()+'</h1><p>'+t('نفّذ طلب الحذف بعد التحقق من صاحبه. المعاينة لا تحذف أي بيانات.','Handle a deletion request after checking its owner. Previewing does not delete data.','Bearbeite einen Löschantrag nach Prüfung des Inhabers. Die Vorschau löscht keine Daten.')+'</p><form data-deletion-lookup><label>'+t('بريد الحساب أو رقم الهاتف — للطلبات التي تصل بالإيميل','Account email or phone — for requests received by email','Konto-E-Mail oder Telefon — für Anträge per E-Mail')+'<input name="identity" type="text" dir="ltr" autocomplete="off" maxlength="254" required></label><button type="submit">'+t('معاينة الحساب','Preview account','Konto prüfen')+'</button></form><p data-deletion-status role="status" aria-live="polite"></p><div data-deletion-preview></div><hr><h2>'+t('طلبات الحذف من داخل الموقع','Deletion requests from the site','Löschanträge aus der Website')+'</h2><p>'+t('تظهر أقدم ١٠٠ طلب حذف قيد المراجعة. طلبات البريد لا تظهر تلقائيًا؛ استخدم البحث أعلاه.','Shows the oldest 100 pending deletion requests. Email requests do not appear here; use the search above.','Zeigt die ältesten 100 offenen Löschanträge. E-Mail-Anträge erscheinen nicht automatisch; verwende die Suche oben.')+'</p><button class="outline" data-refresh-deletions>'+t('تحديث الطلبات','Refresh requests','Anträge aktualisieren')+'</button><div data-deletion-requests role="status"></div></section>';
  const get=s=>app.querySelector(s),status=get('[data-deletion-status]');let lookup=0,busy=false;
  async function loadRequests(){
   const host=get('[data-deletion-requests]');host.textContent=t('جاري تحميل الطلبات…','Loading requests…','Anträge werden geladen…');
   try{const r=await api.rpc('admin_account_deletion_requests');if(!alive())return;if(r.error)throw r.error;
    host.innerHTML=r.data.length?r.data.map(row=>'<article class="panel"><h3 dir="ltr">'+esc(typeof accountIdentityLabel==='function'?accountIdentityLabel(row.email):row.email)+'</h3><small>'+esc(new Date(row.created_at).toLocaleString())+'</small><p>'+esc(row.note||'')+'</p><button class="outline" data-preview-request="'+esc(row.id)+'">'+t('معاينة طلب الحذف','Preview deletion request','Löschantrag prüfen')+'</button></article>').join(''):'<p>'+t('لا توجد طلبات حذف معلقة.','No pending deletion requests.','Keine offenen Löschanträge.')+'</p>';
    host.querySelectorAll('[data-preview-request]').forEach(b=>b.onclick=()=>{const row=r.data.find(x=>x.id===b.dataset.previewRequest);get('[data-deletion-lookup] input').value=typeof accountIdentityLabel==='function'?accountIdentityLabel(row.email):row.email;preview(row.email,row.id,row.user_id);});
   }catch(e){if(alive())host.textContent=error(e);}
  }
  async function preview(identity,request=null,expectedUser=null){
   if(busy)return;const ticket=++lookup;get('[data-deletion-preview]').replaceChildren();status.textContent=t('جارٍ فحص الحساب…','Checking account…','Konto wird geprüft…');
   try{const r=await api.rpc('admin_account_deletion_preview',{p_identity:identity.trim()});if(!alive()||ticket!==lookup)return;if(r.error)throw r.error;
    const s=r.data;if(expectedUser&&s.user_id!==expectedUser)throw {message:'REQUEST_MISMATCH'};
    status.textContent='';const box=get('[data-deletion-preview]');box.innerHTML=previewMarkup(s);
    const form=box.querySelector('[data-confirm-delete]');if(!form)return;const button=form.querySelector('button');
    const sync=()=>button.disabled=busy||!form.elements.verified.checked||form.elements.identity.value.trim()!==s.identity;
    form.addEventListener('input',sync);form.addEventListener('change',sync);
    form.onsubmit=async e=>{e.preventDefault();if(busy||button.disabled||!alive())return;busy=true;button.disabled=true;status.textContent=t('جارٍ تنفيذ الحذف…','Deleting account…','Konto wird gelöscht…');
     try{const result=await api.rpc('admin_execute_account_deletion',{p_user:s.user_id,p_confirmation:'DELETE '+form.elements.identity.value.trim(),p_verified:form.elements.verified.checked,p_request:request});if(!alive())return;if(result.error)throw result.error;if(result.data?.deleted!==true)throw Error('unconfirmed');
      box.replaceChildren();status.textContent=t('تم حذف الحساب وبياناته الشخصية بنجاح. رقم العملية: ','The account and personal data were deleted. Receipt: ','Konto und persönliche Daten wurden gelöscht. Beleg: ')+result.data.receipt;get('[data-deletion-lookup]').reset();await loadRequests();
     }catch(e){if(alive()){status.textContent=error(e);box.replaceChildren();}}
     finally{busy=false;}
    };
   }catch(e){if(alive()&&ticket===lookup)status.textContent=error(e);}
  }
  get('[data-deletion-lookup]').onsubmit=e=>{e.preventDefault();if(busy)return;preview(e.target.elements.identity.value);};
  get('[data-refresh-deletions]').onclick=()=>{if(!busy)loadRequests();};
  await loadRequests();
 }
 const oldRequests=renderDataRequests;
 renderDataRequests=function(){const result=oldRequests.apply(this,arguments);if(user&&admin)document.querySelector('#app>section')?.insertAdjacentHTML('afterbegin',link());return result;};
 const oldAccounts=dashboardAccounts;
 dashboardAccounts=function(){oldAccounts.apply(this,arguments);if(user&&admin)document.querySelector('#dashboard-content')?.insertAdjacentHTML('afterbegin','<p>'+link()+'</p>');};
 const oldDashboard=renderDashboard;
 renderDashboard=function(){oldDashboard.apply(this,arguments);if(user&&admin&&!document.querySelector('.merchant-layout')){const nav=document.querySelector('#app .tabs');if(nav&&!nav.querySelector('a[href="'+route+'"]'))nav.insertAdjacentHTML('beforeend',link());}};
 const oldRender=render;
 render=function(){if(location.hash===route)return renderPage();generation++;return oldRender.apply(this,arguments);};
 window.addEventListener('hashchange',()=>{if(location.hash===route)renderPage();else generation++;});
 window.DarayaAdminDeletion={previewMarkup,error,blocker};
})();
