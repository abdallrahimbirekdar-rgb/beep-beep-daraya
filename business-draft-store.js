'use strict';
(() => {
 let epoch=0;
 const previous=renderDashboard;
 renderDashboard=function(){
  previous.apply(this,arguments);
  const token=++epoch;
  const route=location.hash.split('/');
  const sid=route[1]==='setup'?route[2]:route[2];
  if(!user||!sid)return;
  api.from('business_applications').select('id,status').eq('store_id',sid).neq('status','approved').maybeSingle().then(r=>{
   if(token!==epoch||r.error||!r.data||!location.hash.startsWith('#dashboard'))return;
   const app=document.querySelector('#app');
   const box=document.createElement('section');box.className='panel business-requirements';
   const title=document.createElement('strong');title.textContent='صفحتك مسودة مخفية عن الزوار';
   const text=document.createElement('p');text.textContent='جهّز المنتجات والصور والأقسام والروابط والتوصيل وأوقات العمل باستخدام أدوات المتجر. التجهيز الكامل اختياري؛ تكفي صورة واضحة وعنوان مع موقع على الخريطة ووصف جيد للنشاط ورقم تواصل لطلب المعاينة وإنشاء صفحتك بعد الموافقة. إنشاء الصفحة مجاني وسيبقى مجانيًا؛ بقية الأقسام اختيارية.';
   const link=document.createElement('a');link.className='button';link.href='#business-application/'+r.data.id;link.textContent='العودة إلى طلب المعاينة';
   box.append(title,text,link);app.prepend(box);
  });
 };
 // Reuse the public page layout for a private owner/admin preview.
 const previousOrder=canStoreOrder;canStoreOrder=function(s){return !!s?.active&&previousOrder.apply(this,arguments);};
 const previousStore=renderStore;
 renderStore=function(id){
  const s=stores.find(x=>x.id===id&&!x.deleted_at);
  const allowed=s&&!s.active&&!!user&&(admin||mine().some(x=>x.id===id));
  if(!allowed)return previousStore.apply(this,arguments);
  const active=s.active,open=s.is_open;
  try{s.active=true;s.is_open=false;previousStore.apply(this,arguments);}
  finally{s.active=active;s.is_open=open;}
  const bar=document.createElement('section');bar.className='panel business-requirements';
  const label=document.createElement('strong');label.textContent='معاينة خاصة — الصفحة غير منشورة ولا تستقبل طلبات';
  const link=document.createElement('a');link.className='button outline';link.href=merchantHref('overview',s);link.textContent='العودة إلى تصميم الصفحة';
  bar.append(label,link);document.querySelector('#app').prepend(bar);
 };
})();
