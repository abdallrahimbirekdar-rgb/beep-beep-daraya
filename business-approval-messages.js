'use strict';
// Approval itself is the durable message. Only the applicant can acknowledge it.
(() => {
 const t=(ar,en,de)=>({ar,en,de}[window.ShahinI18n?.language||'ar']||ar);
 const validId=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
 let owner=null,generation=0,pending=null,lastFetched=0,timer=null,item=null,paintKey='',client=null;
 const eligible=()=>!!(api&&user?.id&&!passwordRecovery);
 function clear(){generation++;owner=null;pending=null;item=null;lastFetched=0;paintKey='';clearInterval(timer);timer=null;document.getElementById('business-approval-message')?.remove();}
 function paint(){
  if(!eligible()||owner!==user.id||!item){document.getElementById('business-approval-message')?.remove();paintKey='';return;}
  const key=JSON.stringify([owner,item.id,item.name,item.store_id,admin,window.ShahinI18n?.language]);
  if(paintKey===key&&document.getElementById('business-approval-message'))return;
  document.getElementById('business-approval-message')?.remove();paintKey=key;
  const box=document.createElement('section');box.id='business-approval-message';box.className='business-approval-message';box.dataset.noTranslate='';box.setAttribute('role','status');box.setAttribute('aria-live','polite');
  const title=document.createElement('h2');title.textContent=t('✓ تمت الموافقة على متجرك','✓ Your shop has been approved','✓ Dein Geschäft wurde freigegeben');
  const message=document.createElement('p');message.textContent=t('تمت الموافقة على طلب إنشاء «'+item.name+'». صفحة متجرك جاهزة الآن على سوق داريا الإلكتروني.','Your request to create “'+item.name+'” has been approved. Your shop page is now ready on Souq Daraya.','Dein Antrag für „'+item.name+'“ wurde genehmigt. Deine Geschäftsseite ist jetzt auf Souq Daraya bereit.');
  const help=document.createElement('p');help.className='business-approval-help';help.textContent=t('اضغط «عرض متجري» لفتح صفحتك، أو «إدارة متجري» لإضافة المنتجات والصور والأسعار وتعديل معلومات المتجر. ويمكنك العودة إلى لوحة متجرك من قائمة «المزيد».','Choose “View my shop” to open your page, or “Manage my shop” to add products, photos and prices and edit shop details. You can return to your dashboard from the More menu.','Öffne „Mein Geschäft ansehen“ für deine Seite oder „Mein Geschäft verwalten“, um Produkte, Fotos und Preise hinzuzufügen und Angaben zu ändern. Über „Mehr“ gelangst du wieder zur Verwaltung.');
  const actions=document.createElement('div');actions.className='business-approval-actions';
  const view=document.createElement('a');view.className='button';view.href='#store/'+item.store_id;view.textContent=t('عرض متجري','View my shop','Mein Geschäft ansehen');view.dataset.approvalView='';
  const manage=document.createElement('a');manage.className='button outline';manage.href=admin?'#dashboard/setup/'+item.store_id+'/overview':'#dashboard/overview/'+item.store_id;manage.textContent=t('إدارة متجري','Manage my shop','Mein Geschäft verwalten');manage.dataset.approvalManage='';
  const dismiss=document.createElement('button');dismiss.type='button';dismiss.className='outline';dismiss.textContent=t('فهمت، إخفاء الرسالة','Got it, dismiss','Verstanden, schließen');dismiss.dataset.approvalDismiss='';
  const status=document.createElement('p');status.className='business-approval-result';status.setAttribute('role','status');
  const current=item,uid=owner,token=generation;
  dismiss.onclick=async()=>{if(dismiss.disabled)return;dismiss.disabled=true;status.textContent='';try{const result=await api.rpc('acknowledge_business_approval',{p_id:current.id});if(result.error)throw result.error;if(token!==generation||user?.id!==uid||!box.isConnected)return;generation++;pending=null;item=null;paint();lastFetched=0;await load(true);}catch{if(token!==generation||user?.id!==uid||!box.isConnected)return;status.className='business-approval-result error';status.textContent=t('تعذر حفظ قراءة الرسالة. تحقق من اتصالك وحاول مجددًا. يمكنك فتح متجرك من الأزرار أعلاه.','Could not save the read status. Check your connection and try again. You can still open your shop using the buttons above.','Der Lesestatus konnte nicht gespeichert werden. Prüfe deine Verbindung und versuche es erneut. Du kannst dein Geschäft mit den Schaltflächen oben öffnen.');dismiss.disabled=false;}};
  actions.append(view,manage,dismiss);box.append(title,message,help,actions,status);
  const app=document.getElementById('app');if(!app)return;app.before(box);
 }
 async function load(force=false){
  if(!eligible()||owner!==user.id||pending||document.visibilityState==='hidden'||navigator.onLine===false)return;
  if(!force&&Date.now()-lastFetched<30000)return;
  const uid=owner,token=generation;lastFetched=Date.now();const work={};pending=work;
  try{const result=await api.from('business_applications').select('id,owner_id,name,store_id,status,reviewed_at,approval_message_read_at').eq('owner_id',uid).eq('status','approved').is('approval_message_read_at',null).order('reviewed_at',{ascending:false,nullsFirst:false}).limit(1);
   if(token!==generation||user?.id!==uid)return;if(result.error)return;
   const row=result.data?.[0];item=row&&row.owner_id===uid&&row.status==='approved'&&row.approval_message_read_at===null&&validId(row.id)&&validId(row.store_id)&&typeof row.name==='string'?row:null;paint();
  }catch{}finally{if(pending===work)pending=null;}
 }
 function sync(force=false){
  if(!eligible()){clear();return;}
  if(owner!==user.id){clear();owner=user.id;}
  if(client!==api&&api.auth?.onAuthStateChange){client=api;api.auth.onAuthStateChange(()=>setTimeout(()=>sync(true),0));}
  if(!timer)timer=setInterval(()=>sync(),60000);
  paint();load(force);
 }
 const previous=render;render=function(){const result=previous.apply(this,arguments);sync();return result;};
 window.addEventListener('hashchange',()=>sync());
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='hidden')sync(true);});
 window.addEventListener('online',()=>sync(true));window.addEventListener('languagechange',()=>{paintKey='';sync();});
 window.DarayaApprovalMessages={refresh:()=>sync(true)};sync();
})();
