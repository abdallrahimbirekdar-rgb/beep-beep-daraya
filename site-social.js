'use strict';
(()=>{
 const facebook='https://www.facebook.com/share/1GwQP6XvEr/';
 const lang=()=>document.querySelector('#language')?.value||'ar';
 const text=(ar,en,de)=>({ar,en,de})[lang()]||ar;
 const update=()=>document.querySelectorAll('.site-facebook-link span').forEach(node=>node.textContent=text('تابعنا على فيسبوك','Follow us on Facebook','Folge uns auf Facebook'));
 document.querySelector('#language')?.addEventListener('change',update);update();
 document.addEventListener('click',event=>{
  const link=event.target.closest('a[href="mailto:info@damascus-shop.com"]');
  if(!link||link.closest('#modal'))return;
  event.preventDefault();
  modal('<section class="site-contact-panel" data-no-translate><h2>'+text('تواصل معنا','Contact us','Kontaktiere uns')+'</h2><p>'+text('اختر الطريقة المناسبة للتواصل مع فريق سوق داريا الإلكتروني.','Choose how to contact the Daraya Online Market team.','Wähle, wie du das Team des Online-Markts von Daraya kontaktieren möchtest.')+'</p><div class="form-actions"><a class="button" href="'+facebook+'" target="_blank" rel="noopener noreferrer">'+text('إرسال رسالة عبر فيسبوك','Send a message on Facebook','Nachricht über Facebook senden')+'</a><a class="button outline" href="mailto:info@damascus-shop.com">'+text('إرسال بريد إلكتروني','Send an email','E-Mail senden')+'</a></div><p>'+text('يفتح زر فيسبوك صفحتنا؛ اضغط فيها على «رسالة» لإرسال رسالتك.','The Facebook button opens our page. Select Message there to send your message.','Der Facebook-Button öffnet unsere Seite. Tippe dort auf „Nachricht“, um uns zu schreiben.')+'</p><p><bdi dir="ltr">info@damascus-shop.com</bdi></p></section>');
 });
})();
