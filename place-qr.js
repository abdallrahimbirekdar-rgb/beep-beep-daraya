'use strict';
function showPlaceQr(s){
const url='https://damascus-shop.com/#store/'+encodeURIComponent(s.id);
modal('<section class="place-qr-panel"><span class="section-kicker">سوق داريا الإلكتروني</span><h2 data-no-translate>'+esc(s.name)+'</h2><p>امسح الرمز لفتح صفحة المكان مباشرة</p><div id="place-qr-code" aria-label="رمز QR"></div><div class="form-actions"><button type="button" id="download-place-qr">تنزيل QR باسم المكان</button><a class="button outline" href="'+esc(url)+'">فتح الصفحة</a></div><p class="field-hint">يمكن طباعة الصورة وتعليقها على واجهة المكان.</p></section>');
const qr=new QRCode(document.querySelector('#place-qr-code'),{text:url,width:256,height:256,correctLevel:QRCode.CorrectLevel.M,useSVG:true});
document.querySelector('#download-place-qr').onclick=()=>{
const model=qr._oQRCode,n=model.getModuleCount(),scale=12,quiet=4,size=(n+quiet*2)*scale;
const canvas=document.createElement('canvas');canvas.width=Math.max(720,size+96);canvas.height=size+240;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#173b35';ctx.font='bold 30px sans-serif';ctx.textAlign='center';ctx.direction='rtl';ctx.fillText(s.name,canvas.width/2,52,canvas.width-64);
const left=(canvas.width-size)/2;ctx.fillStyle='#000';for(let row=0;row<n;row++)for(let col=0;col<n;col++)if(model.isDark(row,col))ctx.fillRect(left+(col+quiet)*scale,80+(row+quiet)*scale,scale,scale);
ctx.fillStyle='#173b35';ctx.font='24px sans-serif';ctx.fillText('سوق داريا الإلكتروني',canvas.width/2,size+134);ctx.font='19px sans-serif';ctx.direction='ltr';ctx.fillText('damascus-shop.com',canvas.width/2,size+175);
canvas.toBlob(blob=>{if(!blob)return;const link=document.createElement('a');const objectUrl=URL.createObjectURL(blob);link.href=objectUrl;link.download='daraya-'+s.id+'-qr.png';link.click();setTimeout(()=>URL.revokeObjectURL(objectUrl),10000);},'image/png');
};
}
(function(){
const previous=renderStore;renderStore=function(id){previous.apply(this,arguments);const s=stores.find(x=>x.id===id&&x.active&&!x.deleted_at),actions=document.querySelector('.directory-actions');if(!s||!actions)return;const b=document.createElement('button');b.className='outline';b.textContent='رمز QR للمكان';b.onclick=()=>showPlaceQr(s);actions.append(b);};
const previousList=dashboardStores;dashboardStores=function(ms){previousList.apply(this,arguments);document.querySelectorAll('.admin-place-card').forEach(card=>{const preview=card.querySelector('a[href^="#store/"]');const s=ms.find(x=>x.id===preview?.getAttribute('href').split('/')[1]);if(!s)return;const b=document.createElement('button');b.className='outline';b.textContent='تنزيل رمز QR';b.onclick=()=>showPlaceQr(s);card.querySelector('.admin-place-more')?.append(b);});};
})();
