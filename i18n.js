'use strict';
// Arabic source text and submitted form values are preserved.
(()=>{
const dictionary=new Map();let dictionaryReady=false,loadingCatalog=null,records=[[],[]];
let catalogDictionary=new Map();
let lang='ar',wanted='ar';try{const saved=localStorage.getItem('shahin-language');if(['ar','en','de'].includes(saved))wanted=saved;else if(saved==='tr'){wanted='en';localStorage.setItem('shahin-language','en');}}catch{}
const sources=new WeakMap(),attributes=new WeakMap();
const protectedSelector='script,style,textarea,input,[data-no-translate]';
const normalize=text=>text.replace(/المحلات/g,'المتاجر').replace(/محلات/g,'متاجر').replace(/المحل/g,'المتجر').replace(/صاحب محل/g,'صاحب متجر').replace(/محل فعلي/g,'متجر فعلي').replace(/محلاً فعلياً/g,'متجراً فعلياً').replace(/التركية/g,'الإنكليزية');
let phrasePattern=null;
function installCatalog(){
 for(const [ar,en,de] of window.DarayaTranslationRows||[])dictionary.set(ar,{en,de});
 delete window.DarayaTranslationRows;
for(const [source,entry] of [...dictionary]){const key=normalize(source);if(!dictionary.has(key))dictionary.set(key,entry);}
const baseKeys=[...dictionary.keys()].filter(k=>/[\u0621-\u064a]/.test(k)&&k.length>=4).sort((a,b)=>b.length-a.length);
const escapeRegex=s=>s.replace(/[.*+?^$()|{}\[\]\\]/g,'\\$&');
phrasePattern=new RegExp('(?<![\\u0621-\\u064a])(?:'+baseKeys.map(escapeRegex).join('|')+')(?![\\u0621-\\u064a])','gu');
 dictionaryReady=true;
}
function loadCatalog(){
 if(dictionaryReady)return Promise.resolve();
 if(window.DarayaTranslationRows){installCatalog();return Promise.resolve();}
 if(!loadingCatalog)loadingCatalog=new Promise((resolve,reject)=>{
  const node=document.createElement('script');
  node.src=new URL(document.querySelector('script[data-feature="translations"]')?.dataset.src||'i18n-catalog.js?v=slow-network-1',document.baseURI).href;
  node.onload=()=>{if(!window.DarayaTranslationRows){node.remove();reject(new Error('Translation data missing'));return;}installCatalog();resolve();};
  node.onerror=()=>{node.remove();reject(new Error('Translation download failed'));};document.head.append(node);
 }).finally(()=>{loadingCatalog=null;});
 return loadingCatalog;
}
function changeLanguage(next){
 if(!['ar','en','de'].includes(next))return Promise.resolve(false);
 wanted=next;
 const commit=()=>{lang=next;try{localStorage.setItem('shahin-language',lang);}catch{}window.ShahinI18n.setCatalog(...records);};
 if(next==='ar'||dictionaryReady){commit();return Promise.resolve(true);}
 const picker=document.querySelector('#language');if(picker)picker.value=lang;
 return loadCatalog().then(()=>{if(wanted!==next)return false;commit();picker?.dispatchEvent(new Event('change',{bubbles:true}));window.dispatchEvent(new Event('languagechange'));return true;}).catch(()=>{if(wanted===next){if(picker)picker.value=lang;window.toast?.('تعذر تحميل اللغة. تحقق من الاتصال وحاول مجددًا.');}return false;});
}
function translate(text,target=lang){
 if(!text)return text;
 text=text.replace(/([−-]?[\d٠-٩۰-۹][\d٠-٩۰-۹\s.,٬٫]*)\s*(SYP|ل\.س)/g,(_match,raw)=>{const digits=raw.replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))),value=Number(digits.replace(/−/g,'-').replace(/[^0-9-]/g,''));return value.toLocaleString(target==='ar'?'ar-SY':target==='en'?'en-GB':'de-DE')+(target==='ar'?' ل.س':' SYP');});
 if(target==='ar')return text;
 const trim=text.trim(),normal=normalize(trim),entry=catalogDictionary.get(trim)||dictionary.get(trim)||dictionary.get(normal);
 if(entry?.[target]&&entry[target]!==trim)return text.replace(trim,entry[target]);
 const choose=(en,de)=>target==='en'?en:de;
 if(normal.includes(' · '))return normal.split(' · ').map(part=>translate(part,target)).join(' · ');
 let example=normal.match(/^داريا، سوريا — شارع المثال، بناء افتراضي ([١٢٣٤٥٦1-6])؛ ليس عنواناً فعلياً\.$/);if(example){const n='١٢٣٤٥٦'.includes(example[1])?'١٢٣٤٥٦'.indexOf(example[1])+1:example[1];return choose('Daraya, Syria — example street, fictional building '+n+'; not a real address.','Daraya, Syrien — Beispielstraße, fiktives Gebäude '+n+'; keine echte Adresse.');}
 let m=normal.match(/^أضف بقيمة (.+) للوصول إلى الحد الأدنى\.$/);if(m)return choose('Add products worth '+translate(m[1],target)+' to reach the minimum order.','Füge Produkte für '+translate(m[1],target)+' hinzu, um den Mindestbestellwert zu erreichen.');
 m=normal.match(/^تأكيد طلبك من (.+)$/);if(m)return choose('Confirm your order from ','Bestellung bestätigen bei ')+translate(m[1],target);
 m=normal.match(/^حسابات (.+) فقط\. اختر الفترة لعرض المبيعات والمصروفات\.$/);if(m)return choose('Accounts for '+translate(m[1],target)+'. Choose a period to view sales and expenses.','Abrechnung für '+translate(m[1],target)+'. Wähle einen Zeitraum für Verkäufe und Ausgaben.');
 m=normal.match(/^(\d+) من 5 خطوات مكتملة$/);if(m)return choose(m[1]+' of 5 steps complete',m[1]+' von 5 Schritten abgeschlossen');
 m=normal.match(/^(\d+) أماكن متاحة$/);if(m)return m[1]+choose(' places available',' Orte verfügbar');
 m=normal.match(/^(\d+) متاجر متاحة$/);if(m)return m[1]+choose(' shops available',' Geschäfte verfügbar');
 m=normal.match(/^صفحة (\d+) من (\d+)$/);if(m)return choose('Page '+m[1]+' of '+m[2],'Seite '+m[1]+' von '+m[2]);
 m=normal.match(/^(\d+) من (\d+) صورة إجمالاً$/);if(m)return choose(m[1]+' of '+m[2]+' photos in total',m[1]+' von '+m[2]+' Fotos insgesamt');
 m=normal.match(/^هذه الخدمة مقفلة في اشتراك (.+)\.$/);if(m)return choose('This service is locked on the ','Diese Funktion ist gesperrt im ')+translate(m[1],target)+choose(' plan.','-Paket.');
 const arabicDigits=s=>s.replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)));
 if(/^[\d٠-٩\s.,٬٫–−-]+ ل\.س$/.test(normal)){const raw=arabicDigits(normal).replace(/٬/g,',').replace(/٫/g,'.').replace(/−/g,'-').replace(/[^0-9.-]/g,''),n=Number(raw);if(Number.isFinite(n))return n.toLocaleString(target==='en'?'en-GB':'de-DE')+' SYP';}
 let output=phrasePattern?normal.replace(phrasePattern,key=>dictionary.get(key)?.[target]||key):normal;
 output=output.replace(' · داريا',' · Daraya');
 return arabicDigits(output);
}
function sourceValue(node,value,cache){const prev=cache.get(node);return prev&&value===prev.output?prev.source:value;}
function apply(){
 observer.disconnect();
 document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';
 document.title=lang==='ar'?'سوق داريا الإلكتروني | داريا':lang==='en'?'Daraya Online Market | Daraya':'Daraya Online-Markt | Daraya';
 const picker=document.querySelector('#language');if(picker)picker.value=lang;
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
 while(node=walker.nextNode()){
  if(!node.parentElement||node.parentElement.closest(protectedSelector)||node.parentElement.closest('#language'))continue;
  const value=node.nodeValue,source=sourceValue(node,value,sources),output=translate(source);
  if(node.parentElement.tagName==='OPTION'&&!node.parentElement.hasAttribute('value'))node.parentElement.value=source.trim();
  sources.set(node,{source,output});if(value!==output)node.nodeValue=output;
 }
 document.querySelectorAll('[placeholder],[aria-label],[alt],[title]').forEach(el=>{
  if(el.closest('[data-no-translate],#language'))return;
  let cache=attributes.get(el);if(!cache){cache={};attributes.set(el,cache);}
  for(const attr of ['placeholder','aria-label','alt','title']){if(!el.hasAttribute(attr))continue;const value=el.getAttribute(attr),previous=cache[attr],source=previous&&value===previous.output?previous.source:value,output=translate(source);cache[attr]={source,output};if(value!==output)el.setAttribute(attr,output);}
 });
 observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','aria-label','alt','title']});
}
const observer=new MutationObserver(apply);
window.ShahinI18n={translate,prepareTranslations:()=>loadCatalog().then(()=>window.ShahinI18n.setCatalog(...records)),translationFor(text,target){return (catalogDictionary.get(text)||dictionary.get(text)||dictionary.get(normalize(text)))?.[target]||'';},setCatalog(stores,products){
 records=[stores,products];
 catalogDictionary=new Map();
 const add=(source,en,de,preferBase=false)=>{if(!source)return;const base=dictionary.get(source)||dictionary.get(normalize(source));if(en||de||base)catalogDictionary.set(source,{en:(preferBase?base?.en:null)||en||base?.en||source,de:(preferBase?base?.de:null)||de||base?.de||source});};
 for(const record of [...stores,...products]){
  for(const key of ['name','description','address','delivery_time','section'])add(record[key],record.translations?.en?.[key],record.translations?.de?.[key],key==='name');
  for(const [i,area] of (record.areas||[]).entries())add(area,record.translations?.en?.areas?.[i],record.translations?.de?.areas?.[i]);
  for(const group of record.option_groups||[]){add(group.name,group.name_en,group.name_de);for(const option of group.options)add(option.name,option.name_en,option.name_de);}
 }
 apply();
},get language(){return lang;},money(n){return Number(n).toLocaleString(lang==='ar'?'ar-SY':lang==='en'?'en-GB':'de-DE')+(lang==='ar'?' ل.س':' SYP');},setLanguage:changeLanguage};
for(const name of ['confirm','alert']){const original=window[name].bind(window);window[name]=text=>original(translate(String(text)));}
document.querySelector('#language').addEventListener('change',e=>window.ShahinI18n.setLanguage(e.target.value));
if(window.DarayaTranslationRows)installCatalog();
apply();
if(wanted!=='ar')changeLanguage(wanted);
})();

