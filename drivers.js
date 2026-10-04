'use strict';
let storeDrivers=[],driverMemberships=[],driverDataError='',driverTab='active',driverRefreshBusy=false;
const pendingDriverInvite=()=>sessionStorage.getItem('daraya-driver-invite')||'';
async function loadDriverData(){
 storeDrivers=[];driverMemberships=[];driverDataError='';if(!user)return;
 const uid=user.id;
 const results=await Promise.allSettled([api.from('store_drivers').select('*').order('created_at'),api.rpc('my_driver_memberships')]);
 if(user?.id!==uid)return;
 if(results.some(r=>r.status==='rejected'||r.value.error)){driverDataError='تعذر تحميل بيانات المندوبين. اضغط تحديث للمحاولة مجدداً.';return;}
 storeDrivers=results[0].value.data||[];driverMemberships=results[1].value.data||[];
}
const driversReload=reload;reload=async function(){await driversReload();await loadDriverData();updateDriverNav();};
function updateDriverNav(){
 let link=$('#driver-nav');if(!link){link=document.createElement('a');link.id='driver-nav';link.href='#driver';link.textContent='مهام التوصيل';$('#site-menu')?.append(link);}
 link.hidden=!driverMemberships.length;
}
function driverInviteUrl(d){const url=new URL(location.href);url.hash='driver/invite/'+d.invite_token;url.search='';return url.href;}
function merchantDrivers(s){
 const root=$('#dashboard-content');if(!root)return;
 const ds=storeDrivers.filter(d=>d.store_id===s.id);
 root.innerHTML=`<section class="panel"><span class="eyebrow">فريق التوصيل</span><h2>المندوبون</h2><p>أضف المندوب وأرسل له رابط الدعوة. يدخل بحسابه أو ينشئ حساباً بالبريد الذي تضيفه هنا، ثم يقبل الدعوة.</p>${!storeOffersDelivery(s)?`<p class="alert">خدمة التوصيل غير مفعّلة حالياً. يمكنك تجهيز فريقك، ثم تفعيل التوصيل من <a href="${merchantHref('delivery',s)}">التوصيل والاستلام</a>.</p>`:''}${driverDataError?'<p class="error">'+esc(driverDataError)+'</p>':''}<form id="add-driver"><div class="form-grid">${field('اسم المندوب','name','','text','required maxlength="100" autocomplete="off"')}${field('رقم المندوب','phone','','tel','required maxlength="40" autocomplete="off"')}<label class="span2">بريد حساب المندوب<input name="email" type="email" dir="ltr" required maxlength="254" autocomplete="off" placeholder="driver@example.com"></label></div><button type="submit" ${driverDataError?'disabled':''}>إضافة المندوب وإنشاء الدعوة</button><p id="driver-form-error" role="alert"></p></form></section><section class="panel"><div class="topline"><h3>فريق المتجر</h3><span class="tag">${ds.length} مندوب</span></div><p class="muted">تعيين المندوب للطلب يتم من قسم الطلبات، بعد قبول الدعوة. إيقاف المندوب يمنع وصوله إلى الطلبات؛ أعد تعيين طلباته الجارية عند الحاجة.</p><div class="driver-list">${ds.map(d=>`<article class="driver-card"><div><strong data-no-translate>${esc(d.name)}</strong><span class="tag ${d.active?'':'closed'}">${!d.active?'موقوف':d.user_id?'الحساب مرتبط':'بانتظار قبول الدعوة'}</span><p data-no-translate><bdi>${esc(d.email)}</bdi> · <a href="tel:${esc(d.phone)}"><bdi>${esc(d.phone)}</bdi></a></p><small>${orders.filter(o=>o.driver_id===d.id&&!['تم التسليم','ملغي'].includes(o.status)).length} طلب جارٍ</small></div><div class="form-actions">${d.active&&!d.user_id?`<button type="button" class="outline" data-invite-driver="${d.id}">رابط الدعوة</button>`:''}<button type="button" class="${d.active?'outline':'secondary'}" data-toggle-driver="${d.id}">${d.active?'إيقاف المندوب':'إعادة التفعيل'}</button></div></article>`).join('')||'<div class="empty">لم تضف مندوبين بعد. ابدأ بإضافة أول مندوب من النموذج أعلاه.</div>'}</div><a class="button outline" href="${merchantHref('orders',s)}">الذهاب إلى الطلبات</a></section>`;
 $('#add-driver').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;const f=new FormData(e.target);try{const r=await api.rpc('add_store_driver',{p_store:s.id,p_name:f.get('name'),p_phone:f.get('phone'),p_email:f.get('email')});if(r.error)throw r.error;await reload();render();const d=storeDrivers.find(x=>x.id===r.data);if(d)showDriverInvite(d);toast('تمت إضافة المندوب');}catch(err){if($('#driver-form-error'))$('#driver-form-error').textContent=err.message;if(b.isConnected)b.disabled=false;}};
 root.querySelectorAll('[data-invite-driver]').forEach(b=>b.onclick=()=>showDriverInvite(ds.find(d=>d.id===b.dataset.inviteDriver)));
 root.querySelectorAll('[data-toggle-driver]').forEach(b=>b.onclick=async()=>{b.disabled=true;const d=ds.find(d=>d.id===b.dataset.toggleDriver);try{const r=await api.rpc('set_store_driver_active',{p_driver:d.id,p_active:!d.active});if(r.error)throw r.error;await reload();render();toast(d.active?'تم إيقاف المندوب':'تم تفعيل المندوب');}catch(err){toast(err.message);b.disabled=false;}});
}
function showDriverInvite(d){
 modal(`<h2>دعوة ${esc(d.name)}</h2><p>أرسل هذا الرابط للمندوب. يجب أن يسجل الدخول بالبريد <bdi data-no-translate>${esc(d.email)}</bdi> ثم يضغط «قبول الدعوة».</p><label>رابط الدعوة<input id="driver-invite-url" readonly dir="ltr" value="${esc(driverInviteUrl(d))}"></label><button id="copy-driver-invite">نسخ الرابط</button><p id="driver-copy-status" role="status"></p>`);
 $('#copy-driver-invite').onclick=async()=>{try{await navigator.clipboard.writeText(driverInviteUrl(d));$('#driver-copy-status').textContent='تم نسخ الرابط. أرسله للمندوب.';}catch{$('#driver-invite-url').select();$('#driver-copy-status').textContent='حدد الرابط وانسخه يدوياً.';}};
}
function driverAssignmentMarkup(o){
 if(o.fulfillment_method!=='delivery'||['تم التسليم','ملغي'].includes(o.status))return '';
 const ds=storeDrivers.filter(d=>d.store_id===o.store_id&&d.active&&d.user_id),current=storeDrivers.find(d=>d.id===o.driver_id);
 return `<div class="driver-assignment"><label>مندوب التوصيل<select data-order-driver="${o.id}" ${driverDataError?'disabled':''}><option value="">لم يُعيّن مندوب</option>${current&&!ds.some(d=>d.id===current.id)?`<option value="${current.id}" selected>${esc(current.name)} — موقوف</option>`:''}${ds.map(d=>`<option value="${d.id}" ${o.driver_id===d.id?'selected':''}>${esc(d.name)}</option>`).join('')}</select></label><button type="button" class="secondary" data-assign-driver="${o.id}" ${driverDataError?'disabled':''}>حفظ المندوب</button><small role="status" data-assignment-status="${o.id}">${driverDataError?esc(driverDataError):current?'المندوب الحالي: '+esc(current.name):ds.length?'اختر المندوب ثم احفظ التعيين.':'أضف مندوباً واربط حسابه أولاً من قسم المندوبين.'}</small><a href="${merchantHref('drivers',{id:o.store_id})}">إدارة المندوبين</a></div>`;
}
const driversOrders=dashboardOrders;dashboardOrders=function(ms,s,onlyStore=false){
 driversOrders.apply(this,arguments);
 document.querySelectorAll('#dashboard-content .order').forEach(card=>{
 const id=card.querySelector('[data-status-id]')?.dataset.statusId;if(!id)return;const o=orders.find(x=>x.id===id);if(o)card.insertAdjacentHTML('beforeend',driverAssignmentMarkup(o));
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
function driverOrderCard(o){
 const next=o.status==='قيد التحضير'?'في الطريق':o.status==='في الطريق'?'تم التسليم':'';
 return `<article class="order driver-order"><div class="order-head"><strong>طلب <bdi>${esc(o.id.slice(0,8))}</bdi> · ${esc(o.store_name)}</strong><span class="tag">${esc(o.status)}</span></div><small>${new Date(o.created_at).toLocaleString('ar-SY')}</small><div class="driver-destination"><h3>من المتجر</h3><p data-no-translate>${esc(o.store_name)} · ${esc(o.store_address)}</p>${o.store_phone?`<a class="button outline" href="tel:${esc(o.store_phone)}">الاتصال بالمتجر</a>`:''}<h3>إلى الزبون</h3><p data-no-translate><strong>${esc(o.customer_name)}</strong><br>${esc(o.area)} — ${esc(o.address)}</p><div class="form-actions"><a class="button outline" href="tel:${esc(o.phone)}">الاتصال بالزبون</a>${o.latitude!=null&&o.longitude!=null?`<a class="button outline" href="https://www.openstreetmap.org/?mlat=${Number(o.latitude)}&mlon=${Number(o.longitude)}#map=17/${Number(o.latitude)}/${Number(o.longitude)}" target="_blank" rel="noopener noreferrer">فتح موقع الزبون</a>`:''}</div></div><details><summary>محتويات الطلب (${o.items.reduce((n,i)=>n+i.quantity,0)})</summary>${o.items.map(i=>`<p data-no-translate>${esc(i.name)} × ${i.quantity}${i.option_names?.length?' · '+i.option_names.map(x=>esc(x.name)).join('، '):''}</p>`).join('')}</details>${o.notes?`<p data-no-translate>ملاحظات: ${esc(o.notes)}</p>`:''}<div class="total-row final"><span>${['تم التسليم','ملغي'].includes(o.status)?'إجمالي الطلب':'المبلغ المطلوب من الزبون'}</span><strong>${money(o.total)}</strong></div><small>الإجمالي يشمل رسوم التوصيل: ${money(o.delivery_fee)}</small>${next?`<button class="full" data-driver-status="${o.id}" data-next="${next}">${next==='في الطريق'?'استلمت الطلب — أنا في الطريق':'تأكيد التسليم واستلام المبلغ'}</button>`:!['تم التسليم','ملغي'].includes(o.status)?'<p class="muted">بانتظار تجهيز المتجر للطلب. حدّث القائمة لمعرفة الحالة.</p>':''}</article>`;
}
async function renderDriverDashboard(){
 if(!user){renderCustomerAuth();$('#app').insertAdjacentHTML('afterbegin','<p class="notice">سجل الدخول بحساب المندوب لعرض مهام التوصيل.</p>');return;}
 const uid=user.id;$('#app').classList.remove('professional-home','admin-layout');$('#app').innerHTML=`<section class="driver-dashboard"><div class="topline"><div><span class="eyebrow">مساحة المندوب</span><h1>مهام التوصيل</h1><p>طلباتك المخصصة لك فقط. حدّث الحالة عند الانطلاق وعند التسليم.</p></div><button id="driver-refresh" class="outline">تحديث الطلبات</button></div><nav class="tabs"><button data-driver-tab="active" class="${driverTab==='active'?'selected':'outline'}">التوصيلات الجارية</button><button data-driver-tab="history" class="${driverTab==='history'?'selected':'outline'}">سجل التوصيل</button></nav><div id="driver-orders" aria-live="polite">جاري تحميل مهامك…</div><a href="#account">حسابي وتسجيل الخروج</a></section>`;
 const root=$('#driver-orders');$('#driver-refresh').onclick=renderDriverDashboard;document.querySelectorAll('[data-driver-tab]').forEach(b=>b.onclick=()=>{driverTab=b.dataset.driverTab;renderDriverDashboard();});
 try{const r=await api.rpc('my_driver_orders');if(r.error)throw r.error;if(user?.id!==uid||!root.isConnected)return;const data=r.data||[],active=data.filter(o=>!['تم التسليم','ملغي'].includes(o.status)),shown=driverTab==='active'?active:data.filter(o=>['تم التسليم','ملغي'].includes(o.status));
 root.innerHTML=`<div class="driver-summary"><strong>${active.length}</strong><span>توصيلة جارية</span><small>أحدث ٢٠٠ طلب مخصص لك · التحديث تلقائي أثناء فتح هذه الصفحة.</small></div>${driverDataError?'<p class="error">'+esc(driverDataError)+'</p>':''}${!driverMemberships.some(d=>d.active)?'<p class="alert">لا يوجد ارتباط فعال بمتجر. اطلب رابط الدعوة من صاحب المتجر أو تواصل معه لإعادة تفعيلك.</p>':''}<div class="driver-order-grid">${shown.map(driverOrderCard).join('')||'<div class="empty">'+(driverTab==='active'?'لا توجد توصيلات جارية مخصصة لك.':'لا توجد توصيلات سابقة في القائمة.')+'</div>'}</div>`;
 root.querySelectorAll('[data-driver-status]').forEach(b=>b.onclick=()=>{const o=data.find(x=>x.id===b.dataset.driverStatus);if(b.dataset.next==='تم التسليم'){modal(`<h2>تأكيد تسليم الطلب</h2><p>هل سلمت الطلب للزبون واستلمت المبلغ ${money(o.total)}؟</p><button id="confirm-driver-delivery">نعم، تم التسليم واستلام المبلغ</button><p id="driver-delivery-error" role="alert"></p>`);$('#confirm-driver-delivery').onclick=e=>updateDriverOrder(o.id,'تم التسليم',e.currentTarget);}else updateDriverOrder(o.id,'في الطريق',b);});
 }catch{if(root.isConnected)root.innerHTML='<p class="error">تعذر تحميل مهام التوصيل. اضغط تحديث الطلبات للمحاولة مجدداً.</p>';}
}
async function updateDriverOrder(id,status,button){button.disabled=true;try{const r=await api.rpc('driver_set_order_status',{p_order:id,p_status:status});if(r.error)throw r.error;if($('#modal').open)$('#modal').close();await reload();render();toast('تم تحديث حالة التوصيل');}catch(err){button.disabled=false;if($('#driver-delivery-error'))$('#driver-delivery-error').textContent=err.message;else toast(err.message);}}
function renderDriverInvitation(token){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token||'')){$('#app').innerHTML='<section class="panel"><h1>رابط الدعوة غير صحيح</h1><p>اطلب رابطاً جديداً من صاحب المتجر.</p></section>';return;}
 sessionStorage.setItem('daraya-driver-invite',token);
 $('#app').innerHTML=`<section class="panel customer-auth"><span class="eyebrow">فريق توصيل المتجر</span><h1>دعوة للعمل كمندوب</h1><p>سجل الدخول بالبريد الذي أضافه صاحب المتجر. بعد قبول الدعوة ستظهر لك الطلبات التي يخصصها لك فقط.</p>${user?`<p>الحساب الحالي: <bdi data-no-translate>${esc(user.email)}</bdi></p><button id="accept-driver-invite" class="full">قبول الدعوة وربط حسابي</button><a href="#account">تغيير الحساب</a>`:'<a class="button full" href="#account">تسجيل الدخول أو إنشاء حساب</a>'}<p id="driver-invite-error" role="alert"></p><button id="leave-driver-invite" class="outline">العودة إلى السوق</button></section>`;
 $('#leave-driver-invite').onclick=()=>{sessionStorage.removeItem('daraya-driver-invite');location.hash='home';};
 if($('#accept-driver-invite'))$('#accept-driver-invite').onclick=async e=>{e.currentTarget.disabled=true;try{const r=await api.rpc('accept_driver_invite',{p_token:token});if(r.error)throw r.error;sessionStorage.removeItem('daraya-driver-invite');await reload();location.hash='driver';render();toast('تم ربط حساب المندوب');}catch(err){if($('#driver-invite-error'))$('#driver-invite-error').textContent=err.message;if($('#accept-driver-invite'))$('#accept-driver-invite').disabled=false;}};
}
const driverAccountAuth=renderCustomerAuth;renderCustomerAuth=function(mode='login',nextStore=''){
 driverAccountAuth.apply(this,arguments);
 if(location.hash.startsWith('#driver')||pendingDriverInvite()){
 const title=document.querySelector('.customer-auth h1'),hint=document.querySelector('.customer-auth .muted');
 if(title)title.textContent=mode==='register'?'إنشاء حساب مندوب':'دخول المندوب';
 if(hint)hint.textContent='استخدم البريد الذي أضافه صاحب المتجر. أكد بريدك ثم افتح رابط الدعوة لقبولها ومتابعة توصيلاتك.';
 }
};
const driversRender=render;render=function(){
 const route=location.hash.slice(1).split('/');updateDriverNav();
 if(api&&!passwordRecovery&&route[0]==='driver'){$('#account').hidden=true;$('#dashboard-link').hidden=true;clearInterval(trackingTimer);if(route[1]==='invite')renderDriverInvitation(route[2]);else renderDriverDashboard();return;}
 driversRender();
 if(api&&!passwordRecovery&&route[0]==='account'&&pendingDriverInvite()){
 const token=pendingDriverInvite();$('#app').insertAdjacentHTML('afterbegin',`<div class="panel"><p>لديك دعوة معلّقة للعمل كمندوب. استخدم البريد الذي أضافه صاحب المتجر.</p><a class="button outline" href="#driver/invite/${esc(token)}">العودة إلى دعوة المندوب</a></div>`);
 }
 if(route[0]==='account'&&user&&driverMemberships.length)$('#app').insertAdjacentHTML('afterbegin','<div class="panel"><a class="button" href="#driver">فتح مهام التوصيل</a></div>');
};
window.removeEventListener('hashchange',driversRender);window.addEventListener('hashchange',render);
setInterval(async()=>{if(!api||!user||document.hidden||location.hash!=='#driver'||$('#modal').open||driverRefreshBusy)return;driverRefreshBusy=true;try{await loadDriverData();if(location.hash==='#driver')await renderDriverDashboard();}finally{driverRefreshBusy=false;}},20000);
