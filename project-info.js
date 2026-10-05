'use strict';
(() => {
 const tools=[
  ['صفحة خاصة باسمك','اعرض اسم متجرك أو نشاطك، وصفه، صوره، عنوانه ووسائل التواصل معه، وشارك رابط الصفحة مع زبائنك.'],
  ['منتجاتك وأسعارك','أضف منتجاتك أو خدماتك مع الصور والأسعار والوصف، ونظّمها ضمن أقسام، وعدّلها عند الحاجة.'],
  ['لوحة تحكم خاصة بك','حدّث معلومات صفحتك ومنتجاتك وصورها وأوقات العمل، وأضف أقسامًا مثل «من نحن» و«خدماتنا».'],
  ['طلبات وتوصيل حسب اختيارك','يمكنك الاكتفاء بعرض البضائع والتواصل، أو تفعيل الطلب عبر الموقع مع التوصيل أو الاستلام حسب ما توفره. أنت تحدد مناطق التوصيل ورسومه والحد الأدنى للطلب.'],
  ['إدارة ومتابعة','عند تفعيل الطلبات، تابع الطلبات الواردة وحالاتها، واستفد من أدوات المخزون وخيارات المنتجات والحسابات والتقارير وإدارة مندوبي التوصيل.'],
  ['ظهور أسهل أمام الزبائن','تظهر صفحتك ضمن القسم المناسب والبحث، وعلى الخريطة عند إضافة موقعها. ويمكنك إضافة روابط حساباتك الاجتماعية ومشاركة رابط صفحتك ورمز QR الخاص بها.']
 ];
 const steps=[
  'تواصل مع إدارة سوق داريا الإلكتروني لطلب إنشاء صفحة لمتجرك أو نشاطك المنزلي.',
  'جهّز اسم النشاط ووصفه وصور البضائع وأسعارها ومعلومات التواصل وطريقة تسليم الطلبات.',
  'بعد إنشاء صفحتك وتفعيل حساب صاحب النشاط، ادخل إلى لوحة التحكم بالحساب المخصص لك.',
  'أكمل معلومات الصفحة وأضف المنتجات والصور والأسعار، وحدد إن كنت تريد العرض فقط أو استقبال الطلبات.',
  'عاين الصفحة وراجع المعلومات، ثم شارك رابطها مع الزبائن وحدّثها كلما تغيرت بضائعك أو أسعارك.'
 ];
 const pages={
  'shop-owner':{title:'هل أنت صاحب متجر؟',lead:'متجرك يمكن أن يكون جزءًا من سوق داريا الإلكتروني. نساعدك على تقديم نشاطك على الإنترنت، وإظهار منتجاتك وما تتميز به، وتسهيل وصول الزبائن إليك.',body:'سواء كنت صاحب محل أو مطعم أو تقدم خدمة، تستطيع الحصول على صفحة تعرّف الناس بنشاطك. أنت تدير محتواها من لوحة خاصة، وتختار طريقة التعامل مع الزبائن بحسب طبيعة عملك.',tools:true,steps:true},
  'home-business':{title:'فرصتك للعمل من المنزل',lead:'إذا كانت لديك بضائع أو منتجات تصنعها في المنزل، يمكنك عرضها أو بيعها عبر صفحة خاصة بنشاطك في سوق داريا الإلكتروني، دون الحاجة إلى محل لاستقبال الزبائن.',body:'هذه فرصة لأصحاب البضائع والأنشطة المنزلية، مثل المأكولات والحلويات والأعمال اليدوية والملابس وغيرها. تحتاج إلى منتجات فعلية تستطيع توفيرها، وصور واضحة وأسعار ومعلومات صحيحة، والقدرة على تجهيز الطلبات وتسليمها وفق ما تتفق عليه مع زبائنك. هذه ليست وظيفة براتب من الموقع؛ أنت تعرض بضائعك وتدير نشاطك الخاص.',tools:true,steps:true},
  'who-we-are':{title:'من نحن؟',lead:'نحن شباب من أبناء مدينة داريا، نسعى إلى أن تكون مدينتنا حاضرة وممثلة على الإنترنت، كما هي المدن المتطورة. نحتسب الأجر عند الله في خدمة مدينتنا وأهلها.',sections:[
   ['ماذا نريد لداريا؟','نريد أن نجمع متاجر المدينة وخدماتها وأماكنها في مساحة تسهّل التعرف عليها والوصول إليها، وأن نعطي أصحاب المتاجر والأنشطة فرصة لعرض منتجاتهم وخدماتهم وإبراز ما يتميزون به.'],
   ['كيف يستمر المشروع؟','يحتاج المشروع إلى تكاليف شهرية تشمل تطوير الموقع وقاعدة البيانات وصيانة الموقع والإعلان، وأجور المتفرغين لخدمته ومتابعته. نسعى في البداية إلى تأمين التمويل الذي يغطي هذه التكاليف ويحافظ على استمرار الخدمة وتطويرها.'],
   ['ما موقفنا من الربح؟','إلى جانب هدفنا الخدمي، نسعى إلى تحقيق الربح بالطرق السوية والمشروعة، بما يساعد على استمرار المشروع وتطويره، مع الوضوح في أي خدمات مدفوعة أو اتفاقات مع أصحاب الأنشطة.']
  ]}
 };
 function section(title,body){return '<section class="project-info-section"><h2>'+esc(title)+'</h2><p>'+esc(body)+'</p></section>';}
 function show(key){const page=pages[key];if(!page)return;const app=document.querySelector('#app');app.classList.remove('professional-home');app.innerHTML='<article class="panel project-info"><div class="topline"><h1>'+esc(page.title)+'</h1><a class="button outline" href="#home">العودة للسوق</a></div><p class="project-info-lead">'+esc(page.lead)+'</p>'+(page.body?'<p>'+esc(page.body)+'</p>':'')+(page.sections?page.sections.map(x=>section(...x)).join(''):'')+(page.tools?'<section class="project-info-section"><h2>ما الأدوات التي نقدمها لك؟</h2><div class="project-tool-grid">'+tools.map(([title,body])=>'<div class="project-tool"><h3>'+esc(title)+'</h3><p>'+esc(body)+'</p></div>').join('')+'</div></section>':'')+(page.steps?'<section class="project-info-section"><h2>كيف تبدأ وتُنشئ صفحتك؟</h2><ol class="project-start-steps">'+steps.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol><div class="project-info-actions"><a class="button" href="mailto:info@damascus-shop.com?subject='+encodeURIComponent(key==='home-business'?'طلب صفحة لنشاط منزلي':'طلب صفحة لمتجر أو خدمة')+'">تواصل معنا لإنشاء صفحتك</a><a class="button outline" href="#dashboard">دخول أصحاب المتاجر والأنشطة</a></div></section>':'')+'</article>';}
 const previous=render;render=function(){const key=location.hash.slice(1);if(pages[key]){show(key);return;}return previous.apply(this,arguments);};
 const menu=document.querySelector('#site-menu');if(menu){for(const [key,page] of Object.entries(pages)){if(menu.querySelector('a[href="#'+key+'"]'))continue;const link=document.createElement('a');link.href='#'+key;link.textContent=page.title;menu.append(link);}}
 window.addEventListener('hashchange',()=>show(location.hash.slice(1)));
 document.querySelector('#language')?.addEventListener('change',()=>show(location.hash.slice(1)));
 show(location.hash.slice(1));
})();
