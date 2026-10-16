'use strict';
(()=>{
 const cfg=window.BEEP_CONFIG||{},root=document.querySelector('#ideas-list'),adminPanel=document.querySelector('#admin-panel');
 const client=window.supabase?.createClient && cfg.supabaseUrl && cfg.supabaseAnonKey ? window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{storageKey:'beep-beep-daraya-auth'}}) : null;
 const $=s=>document.querySelector(s);
 const el=(tag,cls,txt)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(txt!==undefined)node.textContent=txt;return node;};
 const statuses={pending:'بانتظار المراجعة',rejected:'مرفوض',published:'منشور',in_progress:'قيد التنفيذ',implemented:'منفذ'};
 async function rpc(name,args){const {data,error}=await client.rpc(name,args);if(error)throw error;return data;}
 async function load(){
  if(!client){root.textContent='تعذر الاتصال بخدمة الاقتراحات.';return;}
  try{
   const items=await rpc('community_ideas_public');root.replaceChildren();
   if(!items.length)root.textContent='لا توجد أفكار منشورة بعد.';
   for(const item of items){
    const card=el('article','idea'),title=el('h3','',item.title),description=el('p','',item.details),meta=el('small','',statuses[item.status]+' · '+new Date(item.created_at).toLocaleDateString('ar-SY'));
    const actions=el('div','actions'),vote=el('button','vote','👍 '+item.votes);vote.type='button';
    vote.onclick=async()=>{vote.disabled=true;try{const {data:{user}}=await client.auth.getUser();if(!user){if(confirm('التصويت يتطلب تسجيل الدخول. هل تريد الانتقال إلى صفحة الحساب؟'))location.href='./#account';return;}await rpc('community_idea_vote',{p_id:item.id,p_vote:true});vote.textContent='✓ تم تسجيل صوتك';await load();}catch(e){alert(e.message||'تعذر التصويت');}finally{vote.disabled=false;}};
    actions.append(vote);card.append(title,description,meta,actions);root.append(card);
   }
  }catch(e){root.textContent='الأفكار غير متاحة حاليًا. حاول تحديث الصفحة لاحقًا.';}
 }
 $('#idea-form').onsubmit=async event=>{
  event.preventDefault();const form=event.currentTarget,button=form.querySelector('button'),status=$('#submit-status'),data=new FormData(form);
  if(!client){status.textContent='تعذر الاتصال بخدمة الاقتراحات.';return;}
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError || !user){status.textContent='سجّل الدخول أولًا لإرسال اقتراح.';return;}
  button.disabled=true;status.textContent='جارٍ إرسال الاقتراح…';
  try{
   await rpc('community_idea_submit',{p_title:data.get('title'),p_details:data.get('details'),p_category:data.get('category')});
   form.reset();status.textContent='وصل اقتراحك للمراجعة. شكرًا لمشاركتك!';
  }catch(e){status.textContent='تعذر الإرسال: '+(e.message||'حاول لاحقًا');}
  finally{button.disabled=false;}
 };
 async function loadAdmin(){
  if(!client)return;
  try{
   const {data:{user}}=await client.auth.getUser();if(!user)return;
   const ideas=await rpc('community_ideas_admin');adminPanel.hidden=false;const list=$('#admin-list');list.replaceChildren();
   if(!ideas.length)list.textContent='لا توجد اقتراحات.';
   for(const item of ideas){
    const card=el('article','idea');card.append(el('h3','',item.title),el('p','',item.details),el('small','',new Date(item.created_at).toLocaleString('ar-SY')));
    const actions=el('div','actions'),select=el('select');for(const [value,label] of Object.entries(statuses)){const option=el('option','',label);option.value=value;option.selected=item.status===value;select.append(option);}
    const button=el('button','','حفظ الحالة');button.onclick=async()=>{button.disabled=true;try{await rpc('community_idea_moderate',{p_id:item.id,p_status:select.value});await Promise.all([load(),loadAdmin()]);}catch(e){alert(e.message||'تعذر التعديل');}finally{button.disabled=false;}};
    actions.append(select,button);card.append(actions);list.append(card);
   }
  }catch{/* Not an administrator; do not show private submissions. */}
 }
 load();loadAdmin();
})();