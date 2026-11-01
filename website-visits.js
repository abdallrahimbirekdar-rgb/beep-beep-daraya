'use strict';
(()=>{
let recording=false;
async function record(){
 if(!api||!live||admin||document.visibilityState==='hidden'||/^#(?:dashboard|account|my-order|privacy|data-requests|shop-cards|shop-card|purchase-card|redeem-card)/.test(location.hash)||recording)return;
 recording=true;
 const run=async()=>{
  const key='daraya-visit-session',now=Date.now();let saved;
  try{saved=JSON.parse(localStorage.getItem(key)||'null');}catch{}
  if(!saved)try{saved=JSON.parse(sessionStorage.getItem(key)||'null');}catch{}
  const save=()=>{const value=JSON.stringify(saved);try{localStorage.setItem(key,value);}catch{}try{sessionStorage.setItem(key,value);}catch{}};
  let visitor;try{visitor=localStorage.getItem('daraya-visitor-id');if(!/^[0-9a-f-]{36}$/i.test(visitor||'')){visitor=crypto.randomUUID();localStorage.setItem('daraya-visitor-id',visitor);}}catch{visitor=crypto.randomUUID();}
  if(!saved||!/^[0-9a-f-]{36}$/i.test(saved.id||'')||!Number.isFinite(saved.last)||now-saved.last>=30*60*1000||saved.last>now)saved={id:crypto.randomUUID(),last:now,recorded:false};
  if(saved.recorded){saved.last=now;save();return;}
  // Share the pending ID before the request; retries and tabs reuse its server key.
  save();const r=await api.rpc('record_website_visit',{p_session:saved.id,p_visitor:visitor});
  if(!r.error){saved.recorded=true;saved.last=now;save();}
 };
 try{if(navigator.locks?.request)await navigator.locks.request('daraya-visit-session',run);else await run();}finally{recording=false;}
}
let requestId=0,selectedDays=7;
const safeText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const numeric=value=>Number.isFinite(Number(value))&&Number(value)>=0?Number(value):0;
const number=value=>numeric(value).toLocaleString(document.documentElement.lang||'ar',{maximumFractionDigits:1});
function metric(title,value,note){return '<article class="visitor-metric"><span>'+safeText(title)+'</span><strong>'+safeText(value)+'</strong><small>'+safeText(note)+'</small></article>';}
function reportHTML(data){
 const c=data.current||{},a=data.audience||{},previous=data.previous||{},activity=data.activity||{},days=numeric(data.days),visitors=numeric(c.visitors);
 const returning=visitors?number(numeric(a.returning)/visitors*100)+'٪':'غير متاح';
 let comparison='';
 if(numeric(data.previous_coverage_days)<days)comparison='بيانات الفترة السابقة غير مكتملة؛ لا تُحسب نسبة نمو.';
 else if(!numeric(previous.visits))comparison=numeric(c.visits)?'توجد زيارات في الفترة الحالية، وكانت الفترة السابقة دون زيارات.':'لم تسجل زيارات في الفترتين.';
 else{const change=(numeric(c.visits)-numeric(previous.visits))/numeric(previous.visits)*100;comparison=(change>0?'ارتفاع ':change<0?'انخفاض ':'دون تغير ')+(change?number(Math.abs(change))+'٪ ':'')+'مقارنة بالفترة السابقة ('+number(previous.visits)+' زيارة).';}
 const daysNote=numeric(data.coverage_days)<days?'التسجيل متاح منذ '+safeText(data.tracking_started||'بدء التفعيل')+'؛ بعض أيام الفترة تسبق التسجيل.':'الفترة تشمل اليوم الجاري، ولذلك قد تتغير أرقامها.';
 const daily=Array.isArray(data.daily)?data.daily:[],maximum=Math.max(1,...daily.map(d=>numeric(d.visits)));
 const dailyHTML=daily.length?'<div class="visitor-daily" role="list" aria-label="الزيارات يومًا بيوم">'+daily.map(row=>'<div class="visitor-day" role="listitem"><time>'+safeText(row.day)+'</time><span class="visitor-bar-track" aria-hidden="true"><span style="width:'+Math.min(100,numeric(row.visits)/maximum*100).toFixed(2)+'%"></span></span><strong>'+number(row.visits)+'</strong><small>'+number(row.visitors)+' زائرًا تقديريًا</small></div>').join('')+'</div>':'<p class="visitor-empty">لا توجد بيانات لهذه الفترة.</p>';
 const hours=(Array.isArray(data.hours)?data.hours:[]).filter(h=>numeric(h.visits)>0).sort((a,b)=>numeric(b.visits)-numeric(a.visits)||numeric(a.hour)-numeric(b.hour)).slice(0,3);
 const times=hours.length?'<div class="visitor-peak-grid">'+hours.map(h=>'<div><strong dir="ltr">'+String(numeric(h.hour)).padStart(2,'0')+':00 – '+String((numeric(h.hour)+1)%24).padStart(2,'0')+':00</strong><span>'+number(h.visits)+' زيارة</span></div>').join('')+'</div>':'<p class="visitor-empty">لا توجد أوقات نشاط مسجلة بعد.</p>';
 const rank=(rows,category=false)=>{
  if(!Array.isArray(rows)||!rows.length)return '<p class="visitor-empty">لا توجد مشاهدات مسجلة لهذه الفترة.</p>';
  return '<ol class="visitor-ranking">'+rows.map(row=>{const label=category?(typeof directoryKinds!=='undefined'?directoryKinds.find(k=>k[0]===row.category)?.[1]:null)||row.category||'غير محدد':row.name;const validId=/^[0-9a-f-]{36}$/i.test(row.id||'');return '<li>'+(validId&&!category?'<a href="#store/'+safeText(row.id)+'">'+safeText(label)+'</a>':'<span>'+safeText(label)+'</span>')+'<strong>'+number(row.views)+' مشاهدة</strong>'+(!category?'<small>'+number(row.contacts)+' ضغطة اتصال أو واتساب</small>':'')+'</li>';}).join('')+'</ol>';
 };
 return '<section class="visitor-report"><div class="visitor-period-summary"><h3>الزيارات خلال الفترة المختارة</h3><p>'+safeText(data.from)+' — '+safeText(data.to)+' · توقيت داريا</p><p>'+comparison+'</p><small>'+daysNote+'</small></div><div class="visitor-metrics">'+
 metric('جلسات الزيارة',number(c.visits),'الجلسة ليست عدد الأشخاص.')+
 metric('الزوار المختلفون — تقديري',number(c.visitors),'حسب معرّف المتصفح المسجل سابقًا.')+
 metric('زوار جدد — تقديري',number(a.new),'أول ظهور مسجل لهم كان خلال الفترة.')+
 metric('زوار عائدون — تقديري',number(a.returning),'لديهم ظهور مسجل قبل بداية الفترة.')+
 metric('نسبة الزوار العائدين',returning,'من الزوار ذوي المعرّف خلال الفترة.')+
 metric('أكثر من جلسة خلال الفترة',number(a.multiple_sessions),'زوار لهم جلستان مسجلتان أو أكثر.')+
 metric('متوسط الجلسات لكل زائر',visitors?number(numeric(c.known_sessions)/visitors):'غير متاح','للجلسات التي تحتوي على معرّف متصفح.')+
 metric('أيام فيها زيارات',number(c.active_days)+' / '+number(days),'عدد الأيام التي سجلت جلسة واحدة أو أكثر.')+
 '</div>'+(numeric(c.unknown_sessions)?'<p class="visitor-data-note">'+number(c.unknown_sessions)+' جلسة قديمة دون معرّف متصفح؛ تدخل في الزيارات ولا تدخل في أعداد الزوار.</p>':'')+
 '<section class="visitor-report-panel"><h3>الزيارات يومًا بيوم</h3><p>الأعمدة تمثل جلسات الزيارة، وبجانبها عدد الزوار التقديري لكل يوم. لا تجمع أعداد الزوار اليومية للحصول على عدد زوار الفترة.</p>'+dailyHTML+'</section>'+
 '<section class="visitor-report-panel"><h3>أكثر أوقات بدء الزيارات نشاطًا</h3><p>حسب وقت تسجيل الجلسة بتوقيت داريا؛ لا تقيس مدة البقاء داخل الموقع.</p>'+times+'</section>'+
 '<div class="visitor-ranking-grid"><section class="visitor-report-panel"><h3>المحلات والأماكن الأكثر مشاهدة</h3>'+rank(data.top_shops)+'</section><section class="visitor-report-panel"><h3>الأقسام الأكثر مشاهدة لصفحاتها</h3><p>بحسب زيارات صفحات الأماكن داخل كل قسم، وليست ضغطات زر القسم.</p>'+rank(data.top_categories,true)+'</section></div>'+
 '<section class="visitor-report-panel"><h3>تفاعل الزوار مع المحلات</h3><p>للأماكن الحقيقية النشطة فقط، دون الصفحات التجريبية. كل مؤشر مستقل؛ لا تمثل هذه الأرقام مسار الشخص نفسه بين الخطوات.</p><div class="visitor-metrics visitor-activity">'+
 [['زيارات صفحات الأماكن','shop_views'],['ضغطات الاتصال','calls'],['فتح واتساب','whatsapp'],['فتح الاتجاهات','directions'],['ظهور المنتجات','product_views'],['فتح الصور','photo_opens'],['إضافات إلى السلة','cart_adds'],['مشاهدات العروض','offer_views'],['حفظ العروض','offer_saves'],['تواصل من عرض','offer_contacts']].map(([label,key])=>metric(label,number(activity[key]),'')).join('')+
 '</div><small>الضغط لا يؤكد إجراء مكالمة أو إرسال رسالة أو زيارة المحل، والإضافة إلى السلة لا تؤكد شراءً. تبدأ الأرقام من تاريخ تفعيل تسجيل كل ميزة.</small></section></section>';
}
async function stats(){
 const box=document.querySelector('#website-visit-stats');if(!box||!admin||!user)return;
 const ticket=++requestId,uid=user.id,status=box.querySelector('[data-visit-status]'),result=box.querySelector('[data-visitor-report]');
 status.textContent='جاري تحميل الإحصاءات…';result.setAttribute('aria-busy','true');
 const alive=()=>ticket===requestId&&admin&&user?.id===uid&&box.isConnected&&location.hash==='#dashboard/statistics';
 try{
  const [totals,report]=await Promise.all([api.rpc('website_visit_stats'),api.rpc('admin_visitor_insights',{p_days:selectedDays})]);
  if(!alive())return;
  if(totals.error){box.querySelector('[data-visit-numbers]').textContent='تعذر تحميل الإجماليات.';}else{
   const data=totals.data||{};box.querySelector('[data-visit-numbers]').innerHTML=[['visitors','الزوار المختلفون — تقديري'],['total','إجمالي الزيارات'],['today_visitors','زوار اليوم المختلفون'],['today','جلسات اليوم'],['week','زيارات آخر ٧ أيام'],['month','زيارات آخر ٣٠ يومًا']].map(([key,label])=>metric(label,number(data[key]),'')).join('');
  }
  if(report.error||!report.data){result.innerHTML='<p class="visitor-data-note">تعذر تحميل التحليل التفصيلي. تبقى الإجماليات المتاحة أعلاه مستقلة عنه. اضغط تحديث الإحصاءات للمحاولة مجددًا.</p>';status.textContent='لم يكتمل تحميل التحليل التفصيلي.';}
  else{result.innerHTML=reportHTML(report.data);status.textContent='آخر تحديث: '+new Date().toLocaleTimeString(document.documentElement.lang||'ar',{hour:'2-digit',minute:'2-digit'})+' · الأيام والساعات حسب توقيت داريا.';}
 }catch{if(alive()){result.innerHTML='<p class="visitor-data-note">تعذر الاتصال لتحميل الإحصاءات. حاول مجددًا.</p>';status.textContent='لم يكتمل التحديث.';}}
 finally{if(alive())result.removeAttribute('aria-busy');}
}
function sync(){
 record().catch(()=>{});
 if(!admin||!user||location.hash!=='#dashboard/statistics'||document.querySelector('.merchant-layout'))return;
 if(document.querySelector('#website-visit-stats'))return;
 const app=document.querySelector('#app');if(app.dataset.dashboardRoute!==location.hash||!app.querySelector('#dashboard-content'))return;
 app.querySelector('#dashboard-content').insertAdjacentHTML('beforeend','<section class="panel visitor-dashboard" id="website-visit-stats" data-no-translate><div class="visitor-dashboard-heading"><div><h2>زوار الموقع وتفاعلهم</h2><p>اعرف متى يأتي الزوار وما الذي يجذب اهتمامهم.</p></div><button type="button" class="outline" data-refresh-visits>تحديث الإحصاءات</button></div><details class="visitor-all-time"><summary>إجماليات الزيارات منذ بدء التسجيل</summary><div class="visitor-metrics" data-visit-numbers></div></details><div class="visitor-period-controls"><label>الفترة<select data-visitor-period><option value="7">آخر ٧ أيام</option><option value="30">آخر ٣٠ يومًا</option><option value="90">آخر ٩٠ يومًا</option></select></label><p data-visit-status role="status"></p></div><div data-visitor-report></div><details class="visitor-method"><summary>كيف تُحسب الأرقام؟</summary><p>الزوار تقدير حسب معرّف المتصفح، وليس إثباتًا لهوية الأشخاص. جهاز آخر أو حذف بيانات المتصفح قد يحسب الزائر مرة أخرى. الجدد والعائدون يُحدّدان حسب أول ظهور مسجل، ولا يكشفان هوية الزائر.</p><p>الزيارات جلسات تصفح؛ قد يعود المتصفح نفسه عدة مرات. تبدأ جلسة جديدة بعد ٣٠ دقيقة من عدم النشاط المسجل. تبويبات المتصفح تشترك في الجلسة، والتنقل وإعادة التحميل خلالها لا يضيفان زيارة جديدة. السجلات لا تقيس مدة البقاء، وقد تتأثر بحظر التخزين أو الزيارات الآلية. زيارات الإدارة مستبعدة من عداد الموقع، وقد تختلف تواريخ بدء تسجيل المؤشرات المختلفة.</p><p>هذا التقرير يلخّص سجلات الزيارات والتفاعلات الموجودة بالفعل، ولا يعرض معرّفات الزوار أو بيانات تواصلهم.</p></details></section>');
 const period=app.querySelector('[data-visitor-period]');period.value=String(selectedDays);period.onchange=()=>{selectedDays=Number(period.value);stats();};
 app.querySelector('[data-refresh-visits]').onclick=stats;stats();
}
new MutationObserver(sync).observe(document.querySelector('#app'),{childList:true});
window.addEventListener('hashchange',sync);document.addEventListener('visibilitychange',sync);sync();
})();
