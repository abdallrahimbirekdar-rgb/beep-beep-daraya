'use strict';
const placeSlugLetters={"ا":"a","أ":"a","إ":"i","آ":"a","ب":"b","ت":"t","ث":"th","ج":"j","ح":"h","خ":"kh","د":"d","ذ":"dh","ر":"r","ز":"z","س":"s","ش":"sh","ص":"s","ض":"d","ط":"t","ظ":"z","ع":"a","غ":"gh","ف":"f","ق":"q","ك":"k","ل":"l","م":"m","ن":"n","ه":"h","ة":"a","و":"w","ؤ":"w","ي":"y","ى":"a","ئ":"y","ء":""};
function placeSlug(s){
const saved=s.translations?._directory?.slug;if(saved&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(saved))return saved;
if(s.id==='a5e8abe7-974a-416c-a570-858d6fd03572')return 'falafel-alsultan';
const name=Array.from(String(s.name||'').normalize('NFKD')).map(c=>placeSlugLetters[c]??c).join('').toLowerCase().replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'place';
return name+'-'+String(s.id).slice(0,8);
}
function placePublicUrl(s){return 'https://damascus-shop.com/darayya/'+placeSlug(s)+'/';}
(function(){
const originalTranslations=readTranslations;
readTranslations=function(f,s,fields){const result=originalTranslations(f,s,fields);if(f.has('public_slug')){const slug=String(f.get('public_slug')||'').trim().toLowerCase();if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new Error('اكتب رابطاً بحروف إنكليزية وأرقام وشرطات فقط');if(stores.some(x=>x.id!==s.id&&!x.deleted_at&&placeSlug(x)===slug))throw new Error('هذا الرابط مستخدم لمكان آخر');result._directory={...(result._directory||{}),slug};}return result;};
function fields(form,s){if(!form||form.elements.public_slug)return;const id=s.id||crypto.randomUUID();const value=placeSlug({...s,id});form.insertAdjacentHTML('beforeend','<label>اسم المكان في الرابط<input name="public_slug" dir="ltr" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="100" value="'+esc(value)+'"><small dir="ltr">damascus-shop.com/darayya/…</small></label><p class="field-hint">استخدم حروفاً إنكليزية وشرطات، مثل falafel-alsultan. تغيير الرابط لاحقاً يتطلب تحديث QR المطبوع. قد يحتاج نشر الرابط الجديد حتى ساعة.</p>');}
const edit=editStore;editStore=function(s={}){edit.apply(this,arguments);fields(document.querySelector('#edit-form'),s);};
const merchant=merchantEditor;merchantEditor=function(s,section){merchant.apply(this,arguments);if(section==='details')fields(document.querySelector('#merchant-editor'),s);};
const previousRender=render;
render=function(){
const match=location.pathname.match(/^\/darayya\/([^/]+)\/?$/);
if(match&&!location.hash&&api){let slug;try{slug=decodeURIComponent(match[1]);}catch{}const s=stores.find(x=>x.active&&!x.deleted_at&&placeSlug(x)===slug);if(s){renderStore(s.id);document.querySelector('link[rel=canonical]')?.setAttribute('href',placePublicUrl(s));return;}else{document.querySelector('#app').innerHTML='<section class="empty"><h1>المكان غير متاح</h1><a class="button" href="/">العودة إلى الموقع</a></section>';return;}}
previousRender.apply(this,arguments);
const parts=location.hash.split('/');const s=parts[0]==='#store'?stores.find(x=>x.id===parts[1]):null;
if(s){document.querySelector('link[rel=canonical]')?.setAttribute('href',placePublicUrl(s));}
};
})();
