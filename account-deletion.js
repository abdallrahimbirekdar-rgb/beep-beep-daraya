'use strict';
(() => {
 const messages={
 ar:{title:'حذف حسابي',intro:'يحذف هذا الإجراء حساب الدخول وبياناتك الشخصية والعناوين والمفضلة والمنشورات والمسودات غير المنشورة. تحتفظ المتاجر بقيم الطلبات المكتملة بعد إزالة اسمك وهاتفك وعنوانك وموقعك منها.',confirm:'اكتب DELETE لتأكيد الحذف النهائي',button:'حذف الحساب نهائيًا',cancel:'العودة إلى حسابي',login:'سجّل الدخول إلى الحساب الذي تريد حذفه، ثم ارجع إلى هذه الصفحة.',checking:'جارٍ التحقق من الحساب…',business:'حسابك مرتبط بإدارة أو متجر أو عمل توصيل. اطلب الحذف عبر البريد أدناه لمعالجة بيانات النشاط والصور المرتبطة به.',active:'لديك طلب أو حجز غير مكتمل. يمكنك طلب الحذف عبر البريد الآن، أو إكماله أو إلغاؤه ثم إعادة المحاولة.',files:'توجد صور مرتبطة بحسابك تحتاج معالجة. اطلب الحذف عبر البريد أدناه.',error:'تعذر إكمال الحذف أو تأكيد نتيجته. لم نؤكد حذف الحساب. حاول مجددًا أو تواصل معنا.',done:'تم حذف حسابك وبياناته الشخصية. تمت إزالة هويتك من الطلبات المكتملة.',pending:'جارٍ حذف الحساب…',email:'طلب الحذف عبر البريد',support:'أرسل طلبك من بريد حسابك إلى info@damascus-shop.com. لا ترسل كلمة المرور.',wrong:'اكتب DELETE كما هي لتأكيد الحذف.'},
 en:{title:'Delete my account',intro:'This deletes your sign-in account, personal profile, addresses, favorites, posts and unpublished drafts. Completed order amounts remain for merchant accounting after your name, phone, address and location are removed.',confirm:'Type DELETE to confirm permanent deletion',button:'Permanently delete account',cancel:'Back to my account',login:'Sign in to the account you want to delete, then return here.',checking:'Checking account…',business:'This account is linked to administration, a business or delivery work. Request deletion by email so linked business data and images can be handled.',active:'An order or booking is unfinished. Request deletion by email now, or complete or cancel it and try again.',files:'Images linked to this account need handling. Request deletion by email below.',error:'Deletion could not be completed or confirmed. We have not confirmed account deletion. Try again or contact us.',done:'Your account and personal data were deleted. Your identity was removed from completed orders.',pending:'Deleting account…',email:'Request deletion by email',support:'Send your request from your account email to info@damascus-shop.com. Never send your password.',wrong:'Type DELETE exactly to confirm deletion.'},
 de:{title:'Mein Konto löschen',intro:'Dies löscht dein Anmeldekonto, Profil, Adressen, Favoriten, Beiträge und unveröffentlichte Entwürfe. Beträge abgeschlossener Bestellungen bleiben für die Buchhaltung erhalten; Name, Telefon, Adresse und Standort werden entfernt.',confirm:'Zur endgültigen Löschung DELETE eingeben',button:'Konto endgültig löschen',cancel:'Zurück zu meinem Konto',login:'Melde dich beim zu löschenden Konto an und kehre hierher zurück.',checking:'Konto wird geprüft…',business:'Dieses Konto ist mit Verwaltung, einem Geschäft oder Lieferarbeit verknüpft. Beantrage die Löschung per E-Mail, damit Geschäftsdaten und Bilder bearbeitet werden.',active:'Eine Bestellung oder Buchung ist offen. Beantrage die Löschung jetzt per E-Mail oder schließe sie ab bzw. storniere sie und versuche es erneut.',files:'Verknüpfte Bilder müssen bearbeitet werden. Beantrage die Löschung per E-Mail.',error:'Die Löschung konnte nicht abgeschlossen oder bestätigt werden. Wir haben keine Kontolöschung bestätigt. Versuche es erneut oder kontaktiere uns.',done:'Dein Konto und persönliche Daten wurden gelöscht. Deine Identität wurde aus abgeschlossenen Bestellungen entfernt.',pending:'Konto wird gelöscht…',email:'Löschung per E-Mail beantragen',support:'Sende die Anfrage von deiner Konto-E-Mail an info@damascus-shop.com. Sende niemals dein Passwort.',wrong:'Gib zur Bestätigung genau DELETE ein.'}
 };
 const copy=()=>messages[window.ShahinI18n?.language]||messages.ar;
 const support=c=>`<p>${esc(c.support)}</p><a class="button outline" href="delete-account.html">${esc(c.email)}</a>`;
 let checkingId=0,deleting=false,completed=false;
 async function renderDeletion(){
  const c=copy(),uid=user?.id,check=++checkingId;
  if(uid&&completed)completed=false;
  $('#app').innerHTML=`<section class="panel customer-auth" data-no-translate><h1>${esc(c.title)}</h1><p>${esc(c.intro)}</p><div id="deletion-content" aria-live="polite">${esc(completed?c.done:uid?c.checking:c.login)}</div>${!uid&&!completed?'<a class="button" href="#account">'+esc(c.cancel)+'</a>':''}${support(c)}</section>`;
  if(!uid||completed)return;
  const content=$('#deletion-content');
  try{
   const r=await api.rpc('account_deletion_status');
   if(check!==checkingId||user?.id!==uid||!content.isConnected)return;
   if(r.error||!r.data)throw new Error('status');
   if(!r.data.eligible){content.textContent=r.data.reason==='BUSINESS_ACCOUNT'?c.business:r.data.reason==='ACTIVE_TRANSACTIONS'?c.active:c.files;return;}
   content.innerHTML=`<form id="delete-account-form"><label>${esc(c.confirm)}<input name="confirmation" autocomplete="off" dir="ltr" required pattern="DELETE" aria-label="${esc(c.confirm)}"></label><div class="form-actions"><button type="submit">${esc(c.button)}</button><a href="#account">${esc(c.cancel)}</a></div><p id="deletion-status" role="status"></p></form>`;
   $('#delete-account-form').onsubmit=async e=>{
    e.preventDefault();if(deleting||user?.id!==uid)return;
    const confirmation=new FormData(e.target).get('confirmation');
    const status=$('#deletion-status');
    if(confirmation!=='DELETE'){status.textContent=c.wrong;return;}
    deleting=true;customerAuthPending=true;e.submitter.disabled=true;status.textContent=c.pending;
    try{
     const result=await api.rpc('delete_my_account',{p_confirmation:confirmation});
     if(result.error||result.data?.deleted!==true)throw result.error||new Error('unconfirmed');
     if(user&&user.id!==uid){toast(c.done);return;}
     completed=true;
     try{if(typeof marketOrderCompleted==='function')marketOrderCompleted();sessionStorage.removeItem('daraya-business-return');}catch{}
     // Clear the local session even if the deleted user's server logout returns 403.
     try{await api.auth.signOut({scope:'local'});}catch{}
     try{localStorage.removeItem('beep-beep-daraya-auth');}catch{}
     user=null;admin=false;orders=[];customerProfile=null;customerLoadedFor=null;favoriteIds=[];cart={};cartStore=null;
     try{customerOrders=[];remember.set('orders',[]);remember.set('favorites',[]);saveCart();}catch{}
     updateCustomerNav();renderDeletion();
    }catch(error){
     if(status.isConnected){status.textContent=error?.message==='ACTIVE_TRANSACTIONS'?c.active:error?.message==='BUSINESS_ACCOUNT'?c.business:c.error;e.submitter.disabled=false;}
    }finally{deleting=false;customerAuthPending=false;}
   };
  }catch{if(content.isConnected)content.textContent=c.error;}
 }
 const baseRender=render;
 render=function(){if(location.hash==='#delete-account'&&api&&!passwordRecovery){renderDeletion();return;}checkingId++;baseRender();};
 const baseAccount=renderCustomerAccount;
 renderCustomerAccount=function(){baseAccount();const link=document.querySelector('.account-shortcuts a[href="delete-account.html"]');if(link){link.href='#delete-account';link.textContent=copy().title;}};
})();
