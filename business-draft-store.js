'use strict';
(() => {
 const t=(ar,en,de)=>({ar,en,de}[window.ShahinI18n?.language||'ar']||ar);
 let epoch=0;
 const previous=renderDashboard;
 renderDashboard=function(){
  previous.apply(this,arguments);
  const token=++epoch;
  const route=location.hash.split('/');
  const sid=route[2]||((typeof admin==='undefined'||!admin)&&typeof mine==='function'?mine()[0]?.id:null);
  if(!user||!sid)return;
  api.from('business_applications').select('id,status').eq('store_id',sid).neq('status','approved').maybeSingle().then(r=>{
   if(token!==epoch||r.error||!r.data||!location.hash.startsWith('#dashboard'))return;
   const app=document.querySelector('#app');
   const box=document.createElement('section');box.className='panel business-requirements';
   const waiting=['pending','publishing'].includes(r.data.status);box.dataset.noTranslate='';
   const title=document.createElement('strong');title.textContent=waiting?t('طلبك قيد المراجعة','Your request is being reviewed','Dein Antrag wird geprüft'):t('أكمل طلب متجرك','Finish your shop request','Geschäftsantrag fertigstellen');
   const text=document.createElement('p');text.textContent=waiting?t('لا تحتاج إلى إرسال طلب جديد. يمكنك متابعة حالة طلبك من الزر أدناه.','You do not need a new request. Use the button below to check its status.','Du brauchst keinen neuen Antrag. Über die Schaltfläche siehst du den Status.'):t('أضف المعلومات والصورة، ثم اضغط إرسال الطلب. بقية التفاصيل يمكنك إضافتها لاحقًا.','Add the details and photo, then send your request. You can add more later.','Ergänze Angaben und Foto und sende den Antrag. Weitere Details kannst du später hinzufügen.');
   const link=document.createElement('a');link.className='button';link.href='#business-application/'+r.data.id;link.textContent=waiting?t('متابعة الطلب','Check request status','Antragsstatus ansehen'):t('إكمال الطلب وإرساله','Finish and send request','Antrag fertigstellen und senden');
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
