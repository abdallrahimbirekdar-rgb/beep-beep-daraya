'use strict';
let storeDrivers=[],driverMemberships=[],driverDataError='',driverTab='active',driverRefreshBusy=false,orderDriverSummaries=[];
const pendingDriverInvite=()=>sessionStorage.getItem('daraya-driver-invite')||'';
async function loadDriverData(){
 storeDrivers=[];driverMemberships=[];orderDriverSummaries=[];driverDataError='';if(!user)return;
 const uid=user.id;
 const results=await Promise.allSettled([api.from('store_drivers').select('*').order('created_at'),api.rpc('my_driver_memberships'),api.rpc('managed_order_driver_summaries')]);
 if(user?.id!==uid)return;
 if(results.some(r=>r.status==='rejected'||r.value.error)){driverDataError='تعذر تحميل بيانات المندوبين. اضغط تحديث للمحاولة مجدداً.';return;}
 storeDrivers=results[0].value.data||[];driverMemberships=results[1].value.data||[];orderDriverSummaries=results[2].value.data||[];
}
const driversReload=reload;reload=async function(){await driversReload();await loadDriverData();updateDriverNav();};
function updateDriverNav(){
 let link=$('#driver-nav');if(!link){link=document.createElement('a');link.id='driver-nav';link.href='#driver';link.textContent='مهام التوصيل';$('#site-menu')?.append(link);}
 link.hidden=!driverMemberships.length;
}
function driverInviteUrl(d){const url=new URL(location.href);url.hash='driver/invite/'+d.invite_token;url.search='';return url.href;}
function merchantDrivers(s){
 const root=$('#dashboard-content');if(!root)return;
 const platformPage=!!s.platform;const ds=platformPage?storeDrivers:storeDrivers.filter(d=>d.store_id===s.id);
 root.innerHTML=`<section class="panel"><span class="eyebrow">فريق التوصيل</span><h2>${platformPage?'مندوبي الموقع والمحلات':'مندوبي المحل'}</h2>${platformPage?'<p>مندوب الموقع تستطيع الإدارة تعيينه لأي محل. مندوب المحل يأخذ طلبات المحل المرتبط به فقط.</p>':''}<p>أضف المندوب وأرسل له رابط الدعوة. يدخل بحسابه أو ينشئ حساباً بالبريد الذي تضيفه هنا، ثم يقبل الدعوة.</p>${!platformPage&&!storeOffersDelivery(s)?`<p class="alert">خدمة التوصيل غير مفعّلة حالياً. يمكنك تجهيز فريقك، ثم تفعيل التوصيل من <a href="${merchantHref('delivery',s)}">التوصيل والاستلام</a>.</p>`:''}${driverDataError?'<p class="error">'+esc(driverDataError)+'</p>':''}<form id="add-driver">${platformPage?`<div class="form-grid"><label>تبعية المندوب<select id="new-driver-type"><option value="platform">مندوب تابع للموقع — جميع المحلات</option><option value="store">مندوب تابع لمحل معين</option></select></label><label id="new-driver-store-field" hidden>المحل المرتبط<select id="new-driver-store"><option value="">اختر المحل</option>${stores.filter(x=>!x.deleted_at).map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></label></div>`:'<p class="tag">مندوب تابع لهذا المحل فقط</p>'}<div class="form-grid">${field('اسم المندوب','name','','text','required maxlength="100" autocomplete="off"')}${field('رقم المندوب','phone','','tel','required maxlength="40" autocomplete="off"')}<label class="span2">بريد حساب المندوب<input name="email" type="email" dir="ltr" required maxlength="254" autocomplete="off" placeholder="driver@example.com"></label></div><button type="submit" ${driverDataError?'disabled':''}>إضافة المندوب وإنشاء الدعوة</button><p id="driver-form-error" role="alert"></p></form></section><section class="panel"><div class="topline"><h3>${platformPage?'جميع المندوبين':'فريق المتجر'}</h3><span class="tag">${ds.length} مندوب</span></div><p class="muted">تعيين المندوب للطلب يتم من قسم الطلبات، بعد قبول الدعوة. إيقاف المندوب يمنع وصوله إلى الطلبات؛ أعد تعيين طلباته الجارية عند الحاجة.</p><div class="driver-list">${ds.map(d=>`<article class="driver-card"><div><strong data-no-translate>${esc(d.name)}</strong><small class="driver-scope-label">${d.store_id?'مندوب محل: '+esc(stores.find(x=>x.id===d.store_id)?.name||s.name):'مندوب الموقع — جميع المحلات'}</small><span class="tag ${d.active?'':'closed'}">${!d.active?'موقوف':d.user_id?'الحساب مرتبط':'بانتظار قبول الدعوة'}</span><p data-no-translate><bdi>${esc(d.email)}</bdi> · <a href="tel:${esc(d.phone)}"><bdi>${esc(d.phone)}</bdi></a></p><small>${orders.filter(o=>o.driver_id===d.id&&!['تم التسليم','ملغي'].includes(o.status)).length} طلب جارٍ</small></div><div class="form-actions">${d.active&&!d.user_id?`<button type="button" class="outline" data-invite-driver="${d.id}">رابط الدعوة</button>`:''}<button type="button" class="${d.active?'outline':'secondary'}" data-toggle-driver="${d.id}">${d.active?'إيقاف المندوب':'إعادة التفعيل'}</button></div></article>`).join('')||'<div class="empty">لم تضف مندوبين بعد. ابدأ بإضافة أول مندوب من النموذج أعلاه.</div>'}</div><a class="button outline" href="${platformPage?'#dashboard/orders':merchantHref('orders',s)}">الذهاب إلى الطلبات</a></section>`;
 if(platformPage)$('#new-driver-type').onchange=()=>{$('#new-driver-store-field').hidden=$('#new-driver-type').value!=='store';};
 $('#add-driver').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;const f=new FormData(e.target);try{if(platformPage&&$('#new-driver-type').value==='store'&&!$('#new-driver-store').value)throw Error('اختر المحل المرتبط بالمندوب');const r=await api.rpc('add_store_driver',{p_store:platformPage?($('#new-driver-type').value==='platform'?null:$('#new-driver-store').value):s.id,p_name:f.get('name'),p_phone:f.get('phone'),p_email:f.get('email')});if(r.error)throw r.error;await reload();render();const d=storeDrivers.find(x=>x.id===r.data);if(d)showDriverInvite(d);toast('تمت إضافة المندوب');}catch(err){if($('#driver-form-error'))$('#driver-form-error').textContent=err.message;if(b.isConnected)b.disabled=false;}};
 root.querySelectorAll('[data-invite-driver]').forEach(b=>b.onclick=()=>showDriverInvite(ds.find(d=>d.id===b.dataset.inviteDriver)));
 root.querySelectorAll('[data-toggle-driver]').forEach(b=>b.onclick=async()=>{b.disabled=true;const d=ds.find(d=>d.id===b.dataset.toggleDriver);try{const r=await api.rpc('set_store_driver_active',{p_driver:d.id,p_active:!d.active});if(r.error)throw r.error;await reload();render();toast(d.active?'تم إيقاف المندوب':'تم تفعيل المندوب');}catch(err){toast(err.message);b.disabled=false;}});
}
function showDriverInvite(d){
 modal(`<h2>دعوة ${esc(d.name)}</h2><p>أرسل هذا الرابط للمندوب. يجب أن يسجل الدخول بالبريد <bdi data-no-translate>${esc(d.email)}</bdi> ثم يضغط «قبول الدعوة».</p><label>رابط الدعوة<input id="driver-invite-url" readonly dir="ltr" value="${esc(driverInviteUrl(d))}"></label><button id="copy-driver-invite">نسخ الرابط</button><p id="driver-copy-status" role="status"></p>`);
 $('#copy-driver-invite').onclick=async()=>{try{await navigator.clipboard.writeText(driverInviteUrl(d));$('#driver-copy-status').textContent='تم نسخ الرابط. أرسله للمندوب.';}catch{$('#driver-invite-url').select();$('#driver-copy-status').textContent='حدد الرابط وانسخه يدوياً.';}};
}
function driverAssignmentMarkup(o){
 if(o.fulfillment_method!=='delivery'||['تم التسليم','ملغي'].includes(o.status))return '';
 const ds=storeDrivers.filter(d=>(d.store_id===o.store_id||(admin&&d.store_id===null))&&d.active&&d.user_id),current=storeDrivers.find(d=>d.id===o.driver_id)||orderDriverSummaries.find(d=>d.id===o.driver_id);
 if(current?.driver_type==='platform'&&!admin)return `<div class="driver-assignment"><strong>مندوب الموقع: ${esc(current.name)}</strong><small>تعيين مندوب الموقع وتغييره يتم من إدارة الموقع.</small></div>`;
 const option=d=>`<option value="${d.id}" ${o.driver_id===d.id?'selected':''}>${esc(d.name)}${d.store_id===null?' — مندوب الموقع':' — مندوب المحل'}</option>`;
 return `<div class="driver-assignment"><label>مندوب التوصيل<select data-order-driver="${o.id}" ${driverDataError?'disabled':''}><option value="">لم يُعيّن مندوب</option>${current&&!ds.some(d=>d.id===current.id)?`<option value="${current.id}" selected>${esc(current.name)} — موقوف</option>`:''}<optgroup label="مندوبي المحل">${ds.filter(d=>d.store_id!==null).map(option).join('')}</optgroup>${admin?`<optgroup label="مندوبي الموقع — أي محل">${ds.filter(d=>d.store_id===null).map(option).join('')}</optgroup>`:''}</select></label><button type="button" class="secondary" data-assign-driver="${o.id}" ${driverDataError?'disabled':''}>حفظ المندوب</button><small role="status" data-assignment-status="${o.id}">${driverDataError?esc(driverDataError):current?'المندوب الحالي: '+esc(current.name):ds.length?'اختر المندوب ثم احفظ التعيين.':'أضف مندوباً واربط حسابه أولاً من قسم المندوبين.'}</small><a href="${admin?'#dashboard/drivers':merchantHref('drivers',{id:o.store_id})}">إدارة المندوبين</a></div>`;
}
const driversOrders=dashboardOrders;dashboardOrders=function(ms,s,onlyStore=false){
 driversOrders.apply(this,arguments);
 document.querySelectorAll('#dashboard-content .order').forEach(card=>{
 const id=card.querySelector('[data-status-id]')?.dataset.statusId;if(!id)return;const o=orders.find(x=>x.id===id);if(o){card.insertAdjacentHTML('beforeend',driverAssignmentMarkup(o));if(o.status==='في الطريق'&&o.fulfillment_method==='delivery')renderCustomerDriverMap(card,o.id,o.status);}
 });
 document.querySelectorAll('[data-assign-driver]').forEach(b=>b.onclick=async()=>{
 const id=b.dataset.assignDriver,o=orders.find(x=>x.id===id),select=document.querySelector('[data-order-driver="'+id+'"]'),status=document.querySelector('[data-assignment-status="'+id+'"]');b.disabled=true;select.disabled=true;
 try{const r=await api.rpc('assign_order_driver',{p_order:id,p_driver:select.value||null,p_expected:o.driver_id||null});if(r.error)throw r.error;await reload();render();toast('تم حفظ مندوب التوصيل');}catch(err){if(status.isConnected)status.textContent=err.message;b.disabled=false;select.disabled=false;}
 });
};
const driversMerchantDashboard=merchantDashboard;merchantDashboard=function(ms,s,section){
 driversMerchantDashboard.apply(this,arguments);if(!s)return;
 if(directoryIsInfo(s))document.querySelector('.merchant-nav a[href="'+merchantHref('drivers',s)+'"]')?.setAttribute('hidden','');
 if(section==='overview'&&!directoryIsInfo(s)){const actions=document.querySelector('.welcome-actions');if(actions&&!actions.querySelector('a[href="'+merchantHref('orders',s)+'"]'))actions.insertAdjacentHTML('beforeend',`<a class="button outline" href="${merchantHref('orders',s)}">الطلبات والتوصيل</a>`);actions?.insertAdjacentHTML('beforeend',`<a class="button outline" href="${merchantHref('drivers',s)}">إدارة المندوبين</a>`);}
};
const driverAdminDashboard=renderDashboard;renderDashboard=function(tab,sid){
 driverAdminDashboard(tab==='drivers'&&admin?'stores':tab,sid);
 if(!admin||!user||tab==='setup')return;
 const tabs=document.querySelector('#app>.tabs');if(tabs&&!tabs.querySelector('[href="#dashboard/drivers"]'))tabs.insertAdjacentHTML('beforeend',`<a href="#dashboard/drivers" class="${tab==='drivers'?'selected':''}">المندوبون والتوصيل</a>`);
 if(tab==='drivers'){tabs?.querySelectorAll('a').forEach(a=>a.classList.toggle('selected',a.getAttribute('href')==='#dashboard/drivers'));merchantDrivers({id:null,platform:true,name:'فريق الموقع'});}
};
function driverOrderCard(o){
 const next=o.status==='قيد التحضير'?'في الطريق':o.status==='في الطريق'?'تم التسليم':'';
 return `<article class="order driver-order"><div class="order-head"><strong>طلب <bdi>${esc(o.id.slice(0,8))}</bdi> · ${esc(o.store_name)}</strong><span class="tag">${esc(o.status)}</span></div><small>${new Date(o.created_at).toLocaleString('ar-SY')}</small><div class="driver-destination"><h3>من المتجر</h3><p data-no-translate>${esc(o.store_name)} · ${esc(o.store_address)}</p>${o.store_phone?`<a class="button outline" href="tel:${esc(o.store_phone)}">الاتصال بالمتجر</a>`:''}<h3>إلى الزبون</h3><p data-no-translate><strong>${esc(o.customer_name)}</strong><br>${esc(o.area)} — ${esc(o.address)}</p><div class="form-actions"><a class="button outline" href="tel:${esc(o.phone)}">الاتصال بالزبون</a>${o.latitude!=null&&o.longitude!=null?`<a class="button outline" href="https://www.openstreetmap.org/?mlat=${Number(o.latitude)}&mlon=${Number(o.longitude)}#map=17/${Number(o.latitude)}/${Number(o.longitude)}" target="_blank" rel="noopener noreferrer">فتح موقع الزبون</a>`:''}</div></div><details><summary>محتويات الطلب (${o.items.reduce((n,i)=>n+i.quantity,0)})</summary>${o.items.map(i=>`<p data-no-translate>${esc(i.name)} × ${i.quantity}${i.option_names?.length?' · '+i.option_names.map(x=>esc(x.name)).join('، '):''}</p>`).join('')}</details>${o.notes?`<p data-no-translate>ملاحظات: ${esc(o.notes)}</p>`:''}<div class="total-row final"><span>${['تم التسليم','ملغي'].includes(o.status)?'إجمالي الطلب':'المبلغ المطلوب من الزبون'}</span><strong>${money(o.total)}</strong></div><small>الإجمالي يشمل رسوم التوصيل: ${money(o.delivery_fee)}</small>${o.status==='في الطريق'?driverLocationControls(o.id):''}${next?`<button class="full" data-driver-status="${o.id}" data-next="${next}">${next==='في الطريق'?'استلمت الطلب — أنا في الطريق':'تأكيد التسليم واستلام المبلغ'}</button>`:!['تم التسليم','ملغي'].includes(o.status)?'<p class="muted">بانتظار تجهيز المتجر للطلب. حدّث القائمة لمعرفة الحالة.</p>':''}</article>`;
}
async function renderDriverDashboard(){
 if(!user){renderCustomerAuth();$('#app').insertAdjacentHTML('afterbegin','<p class="notice">سجل الدخول بحساب المندوب لعرض مهام التوصيل.</p>');return;}
 const uid=user.id;$('#app').classList.remove('professional-home','admin-layout');$('#app').innerHTML=`<section class="driver-dashboard"><div class="topline"><div><span class="eyebrow">مساحة المندوب</span><h1>مهام التوصيل</h1><p>طلباتك المخصصة لك فقط. حدّث الحالة عند الانطلاق وعند التسليم.</p></div><button id="driver-refresh" class="outline">تحديث الطلبات</button></div><nav class="tabs"><button data-driver-tab="active" class="${driverTab==='active'?'selected':'outline'}">التوصيلات الجارية</button><button data-driver-tab="history" class="${driverTab==='history'?'selected':'outline'}">سجل التوصيل</button></nav><div id="driver-orders" aria-live="polite">جاري تحميل مهامك…</div><a href="#account">حسابي وتسجيل الخروج</a></section>`;
 const root=$('#driver-orders');$('#driver-refresh').onclick=renderDriverDashboard;document.querySelectorAll('[data-driver-tab]').forEach(b=>b.onclick=()=>{driverTab=b.dataset.driverTab;renderDriverDashboard();});
 try{const r=await api.rpc('my_driver_orders');if(r.error)throw r.error;if(user?.id!==uid||!root.isConnected)return;const data=r.data||[];syncDriverLocationOrders(data);const active=data.filter(o=>!['تم التسليم','ملغي'].includes(o.status)),shown=driverTab==='active'?active:data.filter(o=>['تم التسليم','ملغي'].includes(o.status));
 root.innerHTML=`<div class="driver-summary"><strong>${active.length}</strong><span>توصيلة جارية</span><small>أحدث ٢٠٠ طلب مخصص لك · التحديث تلقائي أثناء فتح هذه الصفحة.</small></div>${driverDataError?'<p class="error">'+esc(driverDataError)+'</p>':''}${!driverMemberships.some(d=>d.active)?'<p class="alert">لا يوجد ارتباط فعال بفريق توصيل. اطلب الدعوة من إدارة الموقع أو صاحب المحل.</p>':''}<div class="driver-order-grid">${shown.map(driverOrderCard).join('')||'<div class="empty">'+(driverTab==='active'?'لا توجد توصيلات جارية مخصصة لك.':'لا توجد توصيلات سابقة في القائمة.')+'</div>'}</div>`;
 bindDriverLocationControls(root);
 root.querySelectorAll('[data-driver-status]').forEach(b=>b.onclick=()=>{const o=data.find(x=>x.id===b.dataset.driverStatus);if(b.dataset.next==='تم التسليم'){modal(`<h2>تأكيد تسليم الطلب</h2><p>هل سلمت الطلب للزبون واستلمت المبلغ ${money(o.total)}؟</p><button id="confirm-driver-delivery">نعم، تم التسليم واستلام المبلغ</button><p id="driver-delivery-error" role="alert"></p>`);$('#confirm-driver-delivery').onclick=e=>updateDriverOrder(o.id,'تم التسليم',e.currentTarget);}else updateDriverOrder(o.id,'في الطريق',b);});
 }catch{if(root.isConnected)root.innerHTML='<p class="error">تعذر تحميل مهام التوصيل. اضغط تحديث الطلبات للمحاولة مجدداً.</p>';}
}
async function updateDriverOrder(id,status,button){button.disabled=true;try{const r=await api.rpc('driver_set_order_status',{p_order:id,p_status:status});if(r.error)throw r.error;if(status==='تم التسليم')await stopSharingDriverOrder(id);if($('#modal').open)$('#modal').close();await reload();render();toast('تم تحديث حالة التوصيل');}catch(err){button.disabled=false;if($('#driver-delivery-error'))$('#driver-delivery-error').textContent=err.message;else toast(err.message);}}
function renderDriverInvitation(token){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token||'')){$('#app').innerHTML='<section class="panel"><h1>رابط الدعوة غير صحيح</h1><p>اطلب رابطاً جديداً من صاحب المتجر.</p></section>';return;}
 sessionStorage.setItem('daraya-driver-invite',token);
 $('#app').innerHTML=`<section class="panel customer-auth"><span class="eyebrow">فريق توصيل الموقع أو المحل</span><h1>دعوة للعمل كمندوب</h1><p>سجل الدخول بالبريد الذي أضافه صاحب المحل أو إدارة الموقع. بعد قبول الدعوة ستظهر لك الطلبات التي يخصصها لك فقط.</p>${user?`<p>الحساب الحالي: <bdi data-no-translate>${esc(user.email)}</bdi></p><button id="accept-driver-invite" class="full">قبول الدعوة وربط حسابي</button><a href="#account">تغيير الحساب</a>`:'<a class="button full" href="#account">تسجيل الدخول أو إنشاء حساب</a>'}<p id="driver-invite-error" role="alert"></p><button id="leave-driver-invite" class="outline">العودة إلى السوق</button></section>`;
 $('#leave-driver-invite').onclick=()=>{sessionStorage.removeItem('daraya-driver-invite');location.hash='home';};
 if($('#accept-driver-invite'))$('#accept-driver-invite').onclick=async e=>{e.currentTarget.disabled=true;try{const r=await api.rpc('accept_driver_invite',{p_token:token});if(r.error)throw r.error;sessionStorage.removeItem('daraya-driver-invite');await reload();location.hash='driver';render();toast('تم ربط حساب المندوب');}catch(err){if($('#driver-invite-error'))$('#driver-invite-error').textContent=err.message;if($('#accept-driver-invite'))$('#accept-driver-invite').disabled=false;}};
}
const driverAccountAuth=renderCustomerAuth;renderCustomerAuth=function(mode='login',nextStore=''){
 driverAccountAuth.apply(this,arguments);
 if(location.hash.startsWith('#driver')||pendingDriverInvite()){
 const title=document.querySelector('.customer-auth h1'),hint=document.querySelector('.customer-auth .muted');
 if(title)title.textContent=mode==='register'?'إنشاء حساب مندوب':'دخول المندوب';
 if(hint)hint.textContent='استخدم البريد الذي أضافه صاحب المحل أو إدارة الموقع. أكد بريدك ثم افتح رابط الدعوة لقبولها ومتابعة توصيلاتك.';
 }
};
const driversRender=render;render=function(){
 const route=location.hash.slice(1).split('/');updateDriverNav();if(!user&&gpsSharedOrders.size)stopAllDriverSharing();
 if(api&&!passwordRecovery&&route[0]==='driver'){$('#account').hidden=true;$('#dashboard-link').hidden=true;clearInterval(trackingTimer);if(route[1]==='invite')renderDriverInvitation(route[2]);else renderDriverDashboard();return;}
 driversRender();
 if(api&&!passwordRecovery&&route[0]==='account'&&pendingDriverInvite()){
 const token=pendingDriverInvite();$('#app').insertAdjacentHTML('afterbegin',`<div class="panel"><p>لديك دعوة معلّقة للعمل كمندوب. استخدم البريد الذي أضافه صاحب المحل أو إدارة الموقع.</p><a class="button outline" href="#driver/invite/${esc(token)}">العودة إلى دعوة المندوب</a></div>`);
 }
 if(route[0]==='account'&&user&&driverMemberships.length)$('#app').insertAdjacentHTML('afterbegin','<div class="panel"><a class="button" href="#driver">فتح مهام التوصيل</a></div>');
};
window.removeEventListener('hashchange',driversRender);window.addEventListener('hashchange',render);
setInterval(async()=>{if(!api||!user||document.hidden||location.hash!=='#driver'||$('#modal').open||driverRefreshBusy)return;driverRefreshBusy=true;try{await loadDriverData();if(location.hash==='#driver')await renderDriverDashboard();}finally{driverRefreshBusy=false,orderDriverSummaries=[];}},20000);

// Location sharing is opt-in for each delivery and runs only in the foreground.
const gpsSharedOrders=new Set(),deliveryMaps=new Set();
let gpsWatch=null,gpsRefreshTimer=null,gpsSendBusy=false,gpsLastSent=0,gpsSessionUser=null,gpsPending=Promise.resolve(),gpsMessage='';
function driverLocationControls(id){return `<div class="driver-location-controls"><p>شارك موقعك مع زبون هذا الطلب أثناء التوصيل فقط. أبقِ الصفحة مفتوحة وGPS مفعّلاً.</p><button class="outline" type="button" data-share-driver-location="${id}">${gpsSharedOrders.has(id)?'إيقاف مشاركة موقعي':'مشاركة موقعي مع الزبون'}</button><small role="status" data-gps-status="${id}">${esc(gpsSharedOrders.has(id)?gpsMessage:'المشاركة متوقفة')}</small></div>`;}
function refreshDriverGPSLabels(){document.querySelectorAll('[data-share-driver-location]').forEach(b=>{const enabled=gpsSharedOrders.has(b.dataset.shareDriverLocation);b.textContent=enabled?'إيقاف مشاركة موقعي':'مشاركة موقعي مع الزبون';const msg=document.querySelector('[data-gps-status="'+b.dataset.shareDriverLocation+'"]');if(msg)msg.textContent=enabled?gpsMessage:'المشاركة متوقفة';});}
function bindDriverLocationControls(root){root.querySelectorAll('[data-share-driver-location]').forEach(b=>b.onclick=async()=>{const id=b.dataset.shareDriverLocation;if(gpsSharedOrders.has(id)){b.disabled=true;await stopSharingDriverOrder(id);if(b.isConnected)b.disabled=false;refreshDriverGPSLabels();return;}if(!navigator.geolocation){toast('هذا الجهاز لا يدعم تحديد الموقع');return;}gpsSharedOrders.add(id);gpsMessage='اسمح بالوصول للموقع لبدء المشاركة…';gpsLastSent=0;refreshDriverGPSLabels();startDriverGPS();});}
function startDriverGPS(){
 if(gpsWatch!==null)return;gpsSessionUser=user?.id;
 const options={enableHighAccuracy:true,timeout:20000,maximumAge:5000};
 const error=err=>{gpsMessage=err.code===1?'لم تسمح بالوصول للموقع. المشاركة متوقفة.':'تعذر تحديث الموقع. تأكد من تشغيل GPS والإنترنت.';refreshDriverGPSLabels();if(err.code===1){toast(gpsMessage);stopAllDriverSharing();}};
 gpsWatch=navigator.geolocation.watchPosition(publishDriverPosition,error,options);
 gpsRefreshTimer=setInterval(()=>{if(!document.hidden&&gpsSharedOrders.size)navigator.geolocation.getCurrentPosition(publishDriverPosition,error,options);},20000);
}
function publishDriverPosition(position){
 if(!user||user.id!==gpsSessionUser||location.hash!=='#driver'||document.hidden||!gpsSharedOrders.size)return;
 if(gpsSendBusy||Date.now()-gpsLastSent<15000)return;
 const {latitude,longitude,accuracy}=position.coords;
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||!Number.isFinite(accuracy)||accuracy>500||Date.now()-position.timestamp>60000){gpsMessage='إشارة GPS غير دقيقة حالياً. انتقل إلى مكان مفتوح.';refreshDriverGPSLabels();return;}
 const ids=[...gpsSharedOrders],uid=user.id;gpsSendBusy=true;gpsLastSent=Date.now();
 gpsPending=(async()=>{let failed=false;for(const id of ids){if(user?.id!==uid||!gpsSharedOrders.has(id))continue;try{const r=await api.rpc('update_driver_location',{p_order:id,p_lat:latitude,p_lng:longitude,p_accuracy:accuracy});if(r.error)failed=true;}catch{failed=true;}}
 gpsMessage=failed?'تعذر إرسال تحديث الموقع. تحقق من الإنترنت ومن حالة الطلب.':'تم تحديث موقعك للزبون — '+new Date().toLocaleTimeString('ar-SY');refreshDriverGPSLabels();})().finally(()=>{gpsSendBusy=false;});
}
function clearDriverGPSWatch(){if(gpsWatch!==null)navigator.geolocation?.clearWatch(gpsWatch);gpsWatch=null;clearInterval(gpsRefreshTimer);gpsRefreshTimer=null;gpsSessionUser=null;}
async function stopSharingDriverOrder(id){gpsSharedOrders.delete(id);if(!gpsSharedOrders.size)clearDriverGPSWatch();refreshDriverGPSLabels();await gpsPending;try{const r=await api.rpc('stop_driver_location',{p_order:id});if(r.error)throw r.error;}catch{toast('توقف تحديث الموقع. تعذر إخفاء آخر موقع فوراً؛ سيختفي تلقائياً بعد انتهاء صلاحيته.');}}
async function stopAllDriverSharing(){const ids=[...gpsSharedOrders];gpsSharedOrders.clear();clearDriverGPSWatch();refreshDriverGPSLabels();await gpsPending;await Promise.allSettled(ids.map(id=>api.rpc('stop_driver_location',{p_order:id})));}
function syncDriverLocationOrders(data){for(const id of [...gpsSharedOrders])if(!data.some(o=>o.id===id&&o.status==='في الطريق'))stopSharingDriverOrder(id);}
function deliveryLocationFreshness(updatedAt,now=Date.now()){const age=Math.max(0,(now-Date.parse(updatedAt))/1000);return !Number.isFinite(age)||age>300?'expired':age>60?'stale':'fresh';}
async function renderCustomerDriverMap(root,id,status){
 for(const map of deliveryMaps)if(!map.getContainer().isConnected){map.remove();deliveryMaps.delete(map);}
 if(!root.isConnected)return;
 const oldBox=root.querySelector('[data-location-order="'+id+'"]');oldBox?.remove();for(const map of deliveryMaps)if(!map.getContainer().isConnected){map.remove();deliveryMaps.delete(map);}
 const box=document.createElement('section');box.dataset.locationOrder=id;box.className='delivery-live-map panel';box.innerHTML='<h3>موقع المندوب على الخريطة</h3><p class="delivery-map-status" role="status"></p>';root.append(box);
 const message=box.querySelector('.delivery-map-status');
 if(status!=='في الطريق'){message.textContent=status==='تم التسليم'?'اكتمل التسليم وتوقفت مشاركة موقع المندوب.':status==='ملغي'?'أُلغي الطلب وتوقفت مشاركة الموقع.':'يظهر موقع المندوب بعد انطلاقه وتشغيل مشاركة موقعه.';return;}
 message.textContent='جاري تحميل آخر موقع للمندوب…';
 try{const r=await api.rpc('order_driver_location',{p_order:id});if(!box.isConnected)return;if(r.error)throw r.error;const point=r.data;
 if(!point||deliveryLocationFreshness(point.updated_at)==='expired'){message.textContent='لا يتوفر موقع حديث حالياً. قد تكون المشاركة متوقفة أو صفحة المندوب مغلقة.';return;}
 message.textContent=(deliveryLocationFreshness(point.updated_at)==='stale'?'الموقع المعروض قديم؛ لم يصل تحديث حديث. ':'آخر موقع متاح للمندوب. ')+'آخر تحديث: '+new Date(point.updated_at).toLocaleTimeString('ar-SY')+' · دقة GPS نحو '+Math.round(point.accuracy)+' متر.';
 const url='https://www.openstreetmap.org/?mlat='+Number(point.latitude)+'&mlon='+Number(point.longitude)+'#map=16/'+Number(point.latitude)+'/'+Number(point.longitude);
 box.insertAdjacentHTML('beforeend',`<p>${esc(point.driver_name)} · ${point.driver_type==='platform'?'مندوب الموقع':'مندوب المحل'}</p><div class="delivery-map-canvas" aria-label="خريطة آخر موقع للمندوب"></div><a class="button outline" href="${esc(url)}" target="_blank" rel="noopener noreferrer">فتح الخريطة بحجم كامل</a><small>تحديث كل ٢٠ ثانية أثناء فتح صفحة المتابعة. لا يعني ظهور الموقع أن المندوب وصل إلى عنوانك.</small>`);
 await loadLeaflet();if(!box.isConnected)return;const map=L.map(box.querySelector('.delivery-map-canvas')).setView([point.latitude,point.longitude],16);deliveryMaps.add(map);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);L.marker([point.latitude,point.longitude]).addTo(map);if(point.accuracy)L.circle([point.latitude,point.longitude],{radius:point.accuracy,color:'#173e34',weight:1}).addTo(map);
 }catch{if(box.isConnected)message.textContent='تعذر تحميل موقع المندوب. ستتم المحاولة عند التحديث القادم.';}
}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&gpsSharedOrders.size)stopAllDriverSharing();});
window.addEventListener('hashchange',()=>{if(location.hash!=='#driver'&&gpsSharedOrders.size)stopAllDriverSharing();for(const map of deliveryMaps){map.remove();}deliveryMaps.clear();});

window.addEventListener('daraya-app-pause',()=>{if(gpsSharedOrders.size)stopAllDriverSharing();});

let dashboardMapRefreshBusy=false;
setInterval(async()=>{
 if(!api||!user||document.hidden||!location.hash.startsWith('#dashboard')||dashboardMapRefreshBusy)return;
 dashboardMapRefreshBusy=true;
 try{const boxes=[...document.querySelectorAll('#dashboard-content [data-location-order]')];await Promise.allSettled(boxes.map(box=>{const order=orders.find(o=>o.id===box.dataset.locationOrder);if(order&&box.parentElement)return renderCustomerDriverMap(box.parentElement,order.id,order.status);}));}
 finally{dashboardMapRefreshBusy=false;}
},20000);
