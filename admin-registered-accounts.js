'use strict';
(() => {
 const say=(ar,en,de)=>({ar,en,de}[window.ShahinI18n?.language||'ar']||ar);
 const previous=dashboardAccounts;
 dashboardAccounts=function(){
  previous.apply(this,arguments);
  if(!admin||!user||location.hash!=='#dashboard/accounts')return;
  const content=document.getElementById('dashboard-content');if(!content)return;
  const panel=document.createElement('section');panel.className='panel';panel.dataset.noTranslate='';
  panel.innerHTML='<h2>👥 '+say('الحسابات المسجلة في الموقع','Registered website accounts','Registrierte Website-Konten')+'</h2><p>'+say('لإدارة الحسابات والدعم فقط. لا تُستخدم هذه القائمة للإعلانات دون موافقة مستقلة.','For account management and support only. Do not use this list for ads without separate consent.','Nur für Kontoverwaltung und Support. Keine Werbung ohne gesonderte Einwilligung.')+'</p><form data-account-search><label>'+say('البحث بالبريد الإلكتروني','Search by email','Nach E-Mail suchen')+'<input type="search" name="query" dir="ltr" maxlength="254" autocomplete="off"></label><div class="form-actions"><button type="submit">'+say('بحث','Search','Suchen')+'</button><button type="button" class="outline" data-account-refresh>'+say('تحديث','Refresh','Aktualisieren')+'</button></div></form><p data-account-status role="status" aria-live="polite"></p><div data-account-rows></div><div class="form-actions"><button type="button" class="outline" data-account-prev>'+say('السابق','Previous','Zurück')+'</button><button type="button" class="outline" data-account-next>'+say('التالي','Next','Weiter')+'</button></div>';
  content.prepend(panel);
  const get=s=>panel.querySelector(s),owner=user.id;let page=0,query='',request=0;
  const active=()=>panel.isConnected&&admin&&user?.id===owner&&location.hash==='#dashboard/accounts';
  async function fetchPage(){
   if(!active())return;const ticket=++request;
   get('[data-account-status]').textContent=say('جارٍ تحميل الحسابات…','Loading accounts…','Konten werden geladen…');get('[data-account-rows]').replaceChildren();
   get('[data-account-prev]').disabled=true;get('[data-account-next]').disabled=true;
   try{
    const r=await api.rpc('admin_registered_accounts',{p_search:query,p_page:page});if(!active()||ticket!==request)return;if(r.error)throw r.error;
    const d=r.data;if(!d||!Array.isArray(d.accounts)||!Number.isFinite(d.total)||!Number.isFinite(d.matched))throw Error('Invalid response');
    get('[data-account-status]').textContent=say('كل الحسابات: ','All accounts: ','Alle Konten: ')+d.total+' · '+say('نتائج البحث: ','Search results: ','Suchergebnisse: ')+d.matched;
    get('[data-account-rows]').innerHTML=d.accounts.length?'<div class="table-wrap"><table><thead><tr><th>'+say('البريد الإلكتروني','Email','E-Mail')+'</th><th>'+say('تاريخ التسجيل','Registration date','Registriert am')+'</th><th>'+say('تأكيد البريد','Email confirmation','E-Mail-Bestätigung')+'</th></tr></thead><tbody>'+d.accounts.map(a=>'<tr><td dir="ltr">'+esc(a.email||say('دون بريد — حساب بطريقة أخرى','No email — another sign-in method','Keine E-Mail — andere Anmeldung'))+'</td><td>'+esc(new Date(a.created_at).toLocaleDateString(({ar:'ar',en:'en',de:'de'})[window.ShahinI18n?.language||'ar']))+'</td><td>'+say(a.email_confirmed?'مؤكد':'غير مؤكد',a.email_confirmed?'Confirmed':'Not confirmed',a.email_confirmed?'Bestätigt':'Nicht bestätigt')+'</td></tr>').join('')+'</tbody></table></div>':'<p>'+say('لا توجد حسابات مطابقة.','No matching accounts.','Keine passenden Konten.')+'</p>';
    get('[data-account-prev]').disabled=page===0;get('[data-account-next]').disabled=(page+1)*d.page_size>=d.matched;
   }catch(e){if(!active()||ticket!==request)return;
    get('[data-account-status]').textContent=['PGRST202','42883'].includes(e.code)?say('يلزم تفعيل ملف إعداد قائمة الحسابات في SQL Editor في Supabase أولًا.','Run the account directory setup file in Supabase SQL Editor first.','Führe zuerst die Kontolisten-Einrichtung im Supabase SQL Editor aus.'):say('تعذر قراءة الحسابات. تحقق من جلسة الإدارة وأعد المحاولة.','Could not load accounts. Check your admin session and retry.','Konten konnten nicht geladen werden. Prüfe die Verwaltungssitzung und versuche es erneut.');
    if(['PGRST202','42883'].includes(e.code)){const link=document.createElement('a');link.href='https://raw.githubusercontent.com/abdallrahimbirekdar-rgb/beep-beep-daraya/main/supabase/migrations/20261011_admin_registered_accounts.sql';link.target='_blank';link.rel='noopener noreferrer';link.textContent=say('فتح ملف الإعداد','Open setup file','Einrichtungsdatei öffnen');get('[data-account-rows]').append(link);}
   }
  }
  get('[data-account-search]').onsubmit=e=>{e.preventDefault();query=get('input').value.trim();page=0;fetchPage();};
  get('[data-account-refresh]').onclick=()=>fetchPage();
  get('[data-account-prev]').onclick=()=>{if(page>0){page--;fetchPage();}};
  get('[data-account-next]').onclick=()=>{page++;fetchPage();};
  fetchPage();
 };
})();
