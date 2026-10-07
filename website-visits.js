'use strict';
(()=>{
let recording=false,statsLoading=false;
async function record(){
 if(!api||!live||admin||document.visibilityState==='hidden'||/^#(?:dashboard|account|my-order|privacy|data-requests)/.test(location.hash)||recording)return;
 let saved;try{saved=JSON.parse(sessionStorage.getItem('daraya-visit-session')||'null');}catch{}
 let visitor;try{visitor=localStorage.getItem('daraya-visitor-id');if(!/^[0-9a-f-]{36}$/i.test(visitor||'')){visitor=crypto.randomUUID();localStorage.setItem('daraya-visitor-id',visitor);}}catch{visitor=crypto.randomUUID();}
 const now=Date.now();
 if(saved?.recorded&&now-saved.last<30*60*1000){saved.last=now;try{sessionStorage.setItem('daraya-visit-session',JSON.stringify(saved));}catch{}return;}
 if(!saved||now-saved.last>=30*60*1000)saved={id:crypto.randomUUID(),last:now,recorded:false};
 recording=true;
 try{const r=await api.rpc('record_website_visit',{p_session:saved.id,p_visitor:visitor});if(!r.error){saved.recorded=true;saved.last=now;try{sessionStorage.setItem('daraya-visit-session',JSON.stringify(saved));}catch{}}}finally{recording=false;}
}
async function stats(){
 const box=document.querySelector('#website-visit-stats');if(!box||!admin||statsLoading)return;statsLoading=true;
 const status=box.querySelector('[data-visit-status]');status.textContent='جاري تحميل الإحصاءات…';
 try{const r=await api.rpc('website_visit_stats');if(r.error)throw r.error;if(!box.isConnected)return;
 const data=r.data;box.querySelector('[data-visit-numbers]').innerHTML=[['visitors','الزوار المختلفون — تقديري'],['total','إجمالي الزيارات'],['today_visitors','زوار اليوم المختلفون'],['today','زيارات اليوم'],['week','زيارات آخر ٧ أيام'],['month','زيارات آخر ٣٠ يوماً']].map(([key,label])=>'<div class="stat"><span>'+label+'</span><strong>'+Number(data[key]||0).toLocaleString(document.documentElement.lang)+'</strong></div>').join('');
 status.textContent=data.started?'بدء التسجيل: '+data.started+' · الأيام حسب توقيت سوريا':'لم تسجل زيارات بعد.';
 }catch{if(box.isConnected)status.textContent='عداد الزيارات غير مفعّل في قاعدة البيانات بعد، أو تعذر الاتصال. لا تتوفر أرقام حالياً.';}finally{statsLoading=false;const current=document.querySelector('#website-visit-stats');if(location.hash==='#dashboard/statistics'&&current&&current!==box)queueMicrotask(stats);}
}
function sync(){
 record().catch(()=>{});
 if(!admin||location.hash!=='#dashboard/statistics'||document.querySelector('.merchant-layout'))return;
 if(document.querySelector('#website-visit-stats'))return;
 const app=document.querySelector('#app');if(app.dataset.dashboardRoute!==location.hash||!app.querySelector('#dashboard-content'))return;
 app.querySelector('#dashboard-content').insertAdjacentHTML('beforeend','<section class="panel" id="website-visit-stats"><div class="topline"><h2>زيارات الموقع</h2><button type="button" class="outline" data-refresh-visits>تحديث الإحصاءات</button></div><div class="stats" data-visit-numbers></div><p data-visit-status role="status"></p><small class="muted">الزوار المختلفون تقدير حسب المتصفح، وليس إثباتاً لهوية الأشخاص. استخدام جهاز آخر أو حذف بيانات المتصفح قد يحسب الزائر مرة أخرى. الزيارات هي جلسات تصفح منذ التفعيل. التنقل وإعادة التحميل خلال الجلسة لا يضيفان زيارة جديدة. قد تتأثر الأرقام بحظر التخزين أو الزيارات الآلية.</small></section>');
 app.querySelector('[data-refresh-visits]').onclick=stats;stats();
}
new MutationObserver(sync).observe(document.querySelector('#app'),{childList:true});
window.addEventListener('hashchange',sync);document.addEventListener('visibilitychange',sync);sync();
})();
