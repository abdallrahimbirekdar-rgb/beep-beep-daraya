'use strict';
let directoryLastAdded=null;
const qualityReadTranslations=readTranslations;
readTranslations=function(f,s,fields){
 const result=qualityReadTranslations(f,s,fields);
 if(f.has('directory_region')){result._directory={...(result._directory||{}),region:String(f.get('directory_region')||'').trim(),street:String(f.get('directory_street')||'').trim()};
 if(f.has('directory_reviewed'))result._directory.reviewed_at=new Date().toISOString();}
 return result;
};
const qualityBindSave=bindSave;
bindSave=function(callback){return qualityBindSave(async f=>{const result=await callback(f);if(f.has('directory_region'))directoryLastAdded={category:f.get('category'),translations:{_directory:{mode:f.get('page_mode'),kind:f.get('directory_kind'),region:String(f.get('directory_region')||'').trim()}}};return result;});};
function qualityFields(form,s){
 if(!form||form.elements.directory_region)return;const data=s.translations?._directory||{};
 const box=form.elements.address?.closest('label');if(!box)return;
 box.insertAdjacentHTML('beforebegin','<div class="span2 form-grid">'+field('المنطقة — اختياري','directory_region',data.region||'','text','maxlength="100"')+field('الشارع — اختياري','directory_street',data.street||'','text','maxlength="100"')+'</div>');
 box.insertAdjacentHTML('afterend','<label class="span2 quality-review"><input name="directory_reviewed" type="checkbox"> راجعت صحة العنوان وموقع المكان وبيانات التواصل اليوم</label><small class="span2 muted">لا يتغير تاريخ المراجعة إلا عند تحديد هذا الخيار والحفظ.</small>');
 const address=form.elements.address;for(const name of ['directory_region','directory_street'])form.elements[name].addEventListener('change',()=>{if(!address.value.trim())address.value=[form.elements.directory_region.value,form.elements.directory_street.value].filter(Boolean).join('، ');});
}
const qualityEditStore=editStore;editStore=function(s={}){qualityEditStore(s);qualityFields($('#edit-form'),s);};
const qualityMerchantEditor=merchantEditor;merchantEditor=function(s,section){qualityMerchantEditor(s,section);if(section==='details')qualityFields($('#merchant-editor'),s);};
async function shareDirectoryPlace(s){
 const url=placePublicUrl(s);const text=s.name+(s.address?' — '+s.address:'');
 if(navigator.share){try{await navigator.share({title:s.name,text,url});return;}catch(e){if(e.name==='AbortError')return;}}
 modal('<h2>مشاركة صفحة المكان</h2><p>'+esc(s.name)+'</p><a class="button" href="https://wa.me/?text='+encodeURIComponent(text+'\n'+url)+'" target="_blank" rel="noopener noreferrer">مشاركة عبر واتساب</a><label>رابط الصفحة<input readonly dir="ltr" value="'+esc(url)+'"></label><button id="copy-place-link">نسخ الرابط</button>');
 $('#copy-place-link').onclick=async()=>{try{await navigator.clipboard.writeText(url);toast('تم نسخ الرابط');}catch{toast('يمكنك تحديد الرابط ونسخه من الحقل');}};
}
function placeQualityMissing(s){return [!s.image?'صورة الواجهة':'',!s.address?.trim()?'العنوان':'',!storeCoordinates(s)?'موقع GPS':''].filter(Boolean);}
const qualityRenderHome=renderHome;renderHome=function(){qualityRenderHome();document.querySelectorAll('.card').forEach(card=>{
 const s=stores.find(s=>s.id===card.querySelector('a').hash.split('/')[1]);if(!s)return;const body=card.querySelector('.card-body');
 if(s.address)body.insertAdjacentHTML('beforeend','<p class="place-card-address">'+esc(s.address)+'</p>');
 const point=storeCoordinates(s);card.insertAdjacentHTML('beforeend','<div class="place-card-actions">'+(point?'<a href="https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(point.join(','))+'" target="_blank" rel="noopener noreferrer">الاتجاهات</a>':'')+(s.contact_phone?'<a href="tel:'+esc(s.contact_phone)+'">اتصال</a>':'')+'<button type="button" data-share-place>مشاركة</button></div>');card.querySelector('[data-share-place]').onclick=()=>shareDirectoryPlace(s);
 });};
const qualityRenderStore=renderStore;renderStore=function(id){qualityRenderStore(id);const s=stores.find(s=>s.id===id&&s.active),actions=$('.directory-actions');if(!s||!actions)return;
 actions.insertAdjacentHTML('beforeend','<button class="outline" data-share-place>مشاركة الصفحة</button>');actions.querySelector('[data-share-place]').onclick=()=>shareDirectoryPlace(s);
 const reviewed=s.translations?._directory?.reviewed_at;if(reviewed&&!isNaN(Date.parse(reviewed)))actions.insertAdjacentHTML('afterend','<p class="muted place-reviewed">آخر مراجعة للمعلومات: '+new Date(reviewed).toLocaleDateString('ar-SY',{year:'numeric',month:'long',day:'numeric'})+'</p>');
};
const qualityDashboardStores=dashboardStores;dashboardStores=function(ms){qualityDashboardStores(ms);
 const top=$('#dashboard-content .panel .topline');if(top&&directoryLastAdded){top.insertAdjacentHTML('beforeend','<button id="add-similar-place" class="outline">إضافة مكان بنفس التصنيف والمنطقة</button>');$('#add-similar-place').onclick=()=>editStore(structuredClone(directoryLastAdded));}
 document.querySelectorAll('.admin-place-card').forEach(card=>{const id=card.querySelector('.admin-place-actions a').hash.split('/')[2],s=stores.find(s=>s.id===id);if(!s)return;const missing=placeQualityMissing(s);if(missing.length)card.insertAdjacentHTML('beforeend','<p class="place-missing">ينقص: '+esc(missing.join('، '))+'</p>');});
 const missing=ms.filter(s=>placeQualityMissing(s).length);$('#dashboard-content').insertAdjacentHTML('beforeend','<details class="panel"><summary>أماكن تحتاج استكمال البيانات ('+missing.length+')</summary>'+missing.map(s=>'<div class="topline"><div><strong>'+esc(s.name)+'</strong><small class="place-missing">ينقص: '+esc(placeQualityMissing(s).join('، '))+'</small></div><button class="outline" data-quality-edit="'+s.id+'">استكمال</button></div>').join('')+'</details>');document.querySelectorAll('[data-quality-edit]').forEach(b=>b.onclick=()=>editStore(stores.find(s=>s.id===b.dataset.qualityEdit)));
};
