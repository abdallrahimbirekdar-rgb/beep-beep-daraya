'use strict';
(() => {
 const root=document.getElementById('app');
 let pending=null,generation=0;
 const dataUrl=new URL('site-owner-guide-data.js?v=20261122-6',document.currentScript?.src||document.baseURI).href;
 const sourceBase='https://github.com/abdallrahimbirekdar-rgb/beep-beep-daraya/blob/main/';
 const normalize=value=>String(value).normalize('NFKD').replace(/[\u0300-\u036f\u064b-\u065f\u0670ـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').toLowerCase();
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
 function load(){
  if(window.DarayaOwnerGuideData)return Promise.resolve(window.DarayaOwnerGuideData);
  if(pending)return pending;
  pending=new Promise((resolve,reject)=>{
   const script=document.createElement('script');let timer;
   const fail=()=>{clearTimeout(timer);script.remove();pending=null;reject(Error('تعذر تحميل الدليل. تحقق من الاتصال وأعد المحاولة.'));};
   script.src=dataUrl;
   script.onload=()=>{clearTimeout(timer);if(window.DarayaOwnerGuideData)resolve(window.DarayaOwnerGuideData);else fail();};script.onerror=fail;
   timer=setTimeout(fail,20000);document.head.append(script);
  });return pending;
 }
 function link(text,href){const a=node('a',text);a.href=href;return a;}
 function build(content,data){
  const section=node('section',undefined,'site-owner-guide');section.dataset.noTranslate='';section.dataset.ownerGuide='';
  const heading=node('div',undefined,'owner-guide-heading');heading.append(node('h1','كيف يعمل الموقع'),node('p','دليل صاحب سوق داريا الإلكتروني. ابحث باسم الميزة أو المشكلة، أو اختر موضوعًا من الفهرس.'));
  heading.append(node('small','مراجعة المحتوى حتى ٢٢ تشرين الثاني ٢٠٢٦ · '+data.chapters.length+' موضوعًا رئيسيًا · '+data.chapters.reduce((n,c)=>n+c.articles.length,0)+' شرحًا.'));
  const notice=node('p','الدليل يوثّق السلوك والإعدادات. أرقام النسخ والحدود التاريخية تحتاج مراجعة مصدرها الحالي، والميزات الاختيارية تحتاج تفعيلها. هذا الدليل لا يتحدّث تلقائيًا مع تطوير ميزات جديدة.','owner-guide-notice');
  const tools=node('div',undefined,'owner-guide-controls');
  const label=node('label','ابحث في الدليل');const search=node('input');search.type='search';search.placeholder='مثال: سيدرة، حفظ، صور، اشتراك، مندوب، Google Play…';search.autocomplete='off';label.append(search);
  const chooseLabel=node('label','الموضوع');const choose=node('select');choose.append(new Option('كل المواضيع','all'));data.chapters.forEach(c=>choose.append(new Option(c.title,c.id)));chooseLabel.append(choose);
  const status=node('p','', 'owner-guide-results');status.setAttribute('role','status');
  const actions=node('div',undefined,'form-actions');
  const button=(text,fn)=>{const b=node('button',text,'outline');b.type='button';b.onclick=fn;actions.append(b);return b;};
  tools.append(label,chooseLabel,actions,status);
  const toc=node('nav',undefined,'owner-guide-index');toc.setAttribute('aria-label','فهرس كيف يعمل الموقع');
  const chapters=node('div',undefined,'owner-guide-chapters'),records=[];
  for(const chapter of data.chapters){
   const group=node('section',undefined,'owner-guide-chapter');group.id='guide-'+chapter.id;group.append(node('h2',chapter.title));
   const entry=node('button',chapter.title);entry.type='button';entry.onclick=()=>{choose.value=chapter.id;search.value='';filter();group.scrollIntoView({block:'start',behavior:'auto'});};toc.append(entry);
   for(const article of chapter.articles){
    const detail=node('details',undefined,'owner-guide-article');detail.id='guide-'+article.id;detail.append(node('summary',article.title));
    const body=node('div',undefined,'owner-guide-answer');article.paragraphs.forEach(p=>body.append(node('p',p)));
    if(article.route){const a=link('افتح الأداة',article.route);a.className='button outline';body.append(a);}
    if(article.sources.length){const refs=node('details',undefined,'owner-guide-sources');refs.append(node('summary','مصادر الشرح وملفات التنفيذ'));const list=node('ul');for(const file of article.sources){const li=node('li');const a=link(file,sourceBase+file);a.target='_blank';a.rel='noopener noreferrer';li.append(a);list.append(li);}refs.append(list);body.append(refs);}
    const copy=node('button','نسخ رابط هذا الشرح','outline owner-guide-copy');copy.type='button';copy.onclick=async()=>{const url=new URL(location.href);url.hash='dashboard/site-guide/'+article.id;try{await navigator.clipboard.writeText(url.href);copy.textContent='تم نسخ الرابط';}catch{copy.textContent='رابط الشرح';const field=node('input');field.readOnly=true;field.value=url.href;copy.after(field);field.focus();field.select();}};body.append(copy);
    detail.append(body);detail.querySelector('summary').addEventListener('click',()=>{if(!detail.open&&location.hash.startsWith('#dashboard/site-guide')&&!search.value)history.replaceState(history.state,'','#dashboard/site-guide/'+article.id);});
    group.append(detail);records.push({detail,group,chapter:chapter.id,text:normalize(chapter.title+' '+article.title+' '+article.paragraphs.join(' ')+' '+article.sources.join(' ')),article});
   }
   chapters.append(group);
  }
  const empty=node('p','لا يوجد شرح يطابق البحث. جرّب كلمة أقصر أو اختر كل المواضيع.','owner-guide-empty');empty.hidden=true;
  function filter(){
   const terms=normalize(search.value.trim()).split(/\s+/).filter(Boolean);let count=0;
   for(const record of records){const visible=(choose.value==='all'||record.chapter===choose.value)&&terms.every(t=>record.text.includes(t));record.detail.hidden=!visible;if(visible){count++;if(terms.length)record.detail.open=true;}}
   for(const group of chapters.children)group.hidden=!records.some(r=>r.group===group&&!r.detail.hidden);
   status.textContent=count+' شرحًا مطابقًا';empty.hidden=count>0;
  }
  button('مسح البحث',()=>{search.value='';choose.value='all';filter();search.focus();});
  button('فتح الشروحات الظاهرة',()=>records.filter(r=>!r.detail.hidden).forEach(r=>r.detail.open=true));
  button('طي الشروحات',()=>records.forEach(r=>r.detail.open=false));
  button('طباعة الدليل كاملًا',()=>window.print());
  search.oninput=filter;choose.onchange=filter;
  section.append(heading,notice,tools,toc,chapters,empty);
  const appendix=node('details',undefined,'owner-guide-inventory');appendix.append(node('summary','فهرس ملفات الواجهة ومراجعها'));
  appendix.append(node('p','هذه أسماء وحدات الواجهة وقت إعداد الدليل. الملفات التي لها شرح مباشر مرفقة بعناوين شروحاتها. الملفات الباقية تنسّق العرض أو أدوات فرعية؛ راجع المصدر عند تطويرها.'));
  const list=node('ul');for(const item of data.inventory){const li=node('li');const a=link(item.file,sourceBase+item.file);a.target='_blank';a.rel='noopener noreferrer';li.append(a);if(item.topics.length)li.append(node('span',' — '+item.topics.join('، ')));list.append(li);}appendix.append(list);section.append(appendix);
  content.replaceChildren(section);filter();
  const target=location.hash.split('/')[2];const selected=records.find(r=>r.article.id===target);if(selected){selected.detail.open=true;requestAnimationFrame(()=>selected.detail.scrollIntoView({block:'start',behavior:'auto'}));}
 }
 async function render(content){
  const current=++generation,uid=user?.id;if(!admin||!uid||!content)return;
  content.dataset.noTranslate='';content.textContent='جاري فتح دليل كيف يعمل الموقع…';
  try{const data=await load();if(current!==generation||!admin||user?.id!==uid||!content.isConnected||!location.hash.startsWith('#dashboard/site-guide'))return;build(content,data);}
  catch(error){if(current!==generation||!admin||user?.id!==uid||!content.isConnected)return;content.replaceChildren(node('p',error.message));const retry=node('button','إعادة المحاولة');retry.type='button';retry.onclick=()=>render(content);content.append(retry);}
 }
 let printState=null;
 window.addEventListener('beforeprint',()=>{const guide=root?.querySelector('[data-owner-guide]');if(!guide||!admin||!user)return;printState=[...guide.querySelectorAll('details,[hidden]')].map(el=>({el,open:el.open,hidden:el.hidden}));guide.querySelectorAll('details').forEach(el=>el.open=true);guide.querySelectorAll('[hidden]').forEach(el=>el.hidden=false);guide.querySelector('.owner-guide-empty').hidden=true;document.body.classList.add('printing-owner-guide');});
 window.addEventListener('afterprint',()=>{for(const state of printState||[]){state.el.hidden=state.hidden;if(state.el.tagName==='DETAILS')state.el.open=state.open;}printState=null;document.body.classList.remove('printing-owner-guide');});
 window.DarayaOwnerGuide={render,normalize};
})();
