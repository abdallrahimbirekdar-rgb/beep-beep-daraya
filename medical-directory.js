'use strict';
(()=>{
 const medical=s=>!!s&&directoryIsMedical(s);
 const notice='صفحة تعريفية فقط: الموقع والعنوان والوصف وصورة الطاقم الطبي ورقم الاتصال. لا تتوفر طلبات أو توصيل أو حجز مواعيد عبر الموقع.';
 const normalize=s=>{if(medical(s)){s.online_ordering=false;s.delivery_enabled=false;s.pickup_enabled=false;s.text_only=true;}return s;};
 const previousReload=reload;reload=async function(){const result=await previousReload.apply(this,arguments);stores.forEach(normalize);if(medical(stores.find(s=>s.id===cartStore))){cart={};cartStore=null;}return result;};stores.forEach(normalize);
 const previousRenderStore=renderStore;renderStore=function(id){const s=stores.find(x=>x.id===id&&x.active);if(!medical(s))return previousRenderStore.apply(this,arguments);normalize(s);
 $('#app').innerHTML='<div class="topline"><a class="button outline" href="#home">العودة للقائمة الرئيسية</a></div><section class="store-banner">'+photo(s.image,'صورة الطاقم الطبي — '+s.name,'store-image')+'<div><h1>'+esc(s.name)+'</h1><p style="white-space:pre-wrap">'+esc(s.description||'')+'</p>'+(s.address?'<p><strong>العنوان:</strong> '+esc(s.address)+'</p>':'')+(s.contact_phone?'<p><strong>رقم الاتصال:</strong> <a href="tel:'+esc(s.contact_phone)+'" dir="ltr">'+esc(s.contact_phone)+'</a></p>':'')+'<div class="directory-actions"><button class="outline" data-medical-address>الموقع والعنوان</button>'+(s.contact_phone?'<a class="button" href="tel:'+esc(s.contact_phone)+'">اتصال</a>':'')+'</div></div></section>';
 $('[data-medical-address]').onclick=()=>showStoreAddress(s);
 };
 const previousDashboard=merchantDashboard;merchantDashboard=function(ms,s,section){if(!medical(s))return previousDashboard.apply(this,arguments);normalize(s);const current=['details','photos'].includes(section)?section:'details';previousDashboard(ms,s,current);document.querySelectorAll('.merchant-nav a').forEach(a=>{if(!['details','photos'].some(k=>a.getAttribute('href')===merchantHref(k,s)))a.remove();});
 document.querySelectorAll('.merchant-nav a').forEach(a=>{if(a.getAttribute('href')===merchantHref('photos',s))a.textContent='صورة الطاقم الطبي';});
 const root=$('#dashboard-content');if(root)root.insertAdjacentHTML('afterbegin','<p class="alert">'+esc(notice)+'</p>');
 document.querySelector('.store-identity [data-store-status],.store-identity .tag')?.remove();
 };
 const previousEditor=merchantEditor;merchantEditor=function(s,section){if(medical(s)&&!['details','photos'].includes(section))section='details';previousEditor.call(this,s,section);if(medical(s)&&section==='photos'){const title=document.querySelector('#dashboard-content h2');if(title)title.textContent='صورة الطاقم الطبي';document.querySelectorAll('#dashboard-content .field-hint').forEach(el=>el.textContent='ارفع صورة الطاقم الطبي. تظهر في الصفحة التعريفية.');}restrictForm($('#merchant-editor'),s);};
 function restrictForm(form,s){if(!form)return;const kind=form.elements.directory_kind;if(!kind)return;const sync=()=>{const on=['doctor','pharmacy'].includes(kind.value);let message=form.querySelector('[data-medical-policy]');if(!message){message=document.createElement('p');message.className='alert';message.dataset.medicalPolicy='';message.textContent=notice;form.prepend(message);}message.hidden=!on;
 const blocked=['online_ordering','delivery_enabled','pickup_enabled','delivery_fee','minimum_order','delivery_time','areas','is_open','commission_rate'];
 for(const name of blocked){const input=form.elements[name];if(!input)continue;if(on){if(input.type==='checkbox')input.checked=false;input.required=false;input.disabled=true;}else input.disabled=false;}
 if(on){form.querySelector('.service-options')?.setAttribute('hidden','');const mode=form.elements.page_mode;if(mode)mode.value='info';}
 for(const input of form.querySelectorAll('input,textarea,select')){const name=input.name;if(!name||['directory_kind','page_mode','category','name','description','address','contact_phone','latitude','longitude','gps_link','photo','image','owner_email','active','slug'].includes(name))continue;const label=input.closest('label');if(label){if(on){label.dataset.medicalHidden='';label.hidden=true;input.disabled=true;input.required=false;}else if(label.hasAttribute('data-medical-hidden')){label.hidden=false;label.removeAttribute('data-medical-hidden');input.disabled=false;}}}
 };
 kind.addEventListener('change',sync);form.elements.page_mode?.addEventListener('change',sync);sync();}
 const previousEditStore=editStore;editStore=function(s={}){previousEditStore.apply(this,arguments);restrictForm($('#edit-form'),s);};
 for(const name of ['merchantProducts','dashboardProducts','editProduct']){const previous=window[name];window[name]=function(s){if(medical(s)){toast(notice);return;}return previous.apply(this,arguments);};}
 const previousAdd=add;add=function(id){const p=products.find(x=>x.id===id);if(medical(stores.find(s=>s.id===p?.store_id))){toast(notice);return;}return previousAdd.apply(this,arguments);};
 const previousCheckout=checkout;checkout=function(s){if(medical(s)){toast(notice);return;}return previousCheckout.apply(this,arguments);};
})();