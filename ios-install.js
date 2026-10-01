'use strict';
(() => {
  const standalone = () => navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  const controls = document.querySelectorAll('[data-ios-install]');
  const cards = document.querySelectorAll('[data-ios-install-card]');
  function updateVisibility() {
    const hidden = standalone() || /ShahinAndroid\//.test(navigator.userAgent);
    controls.forEach(el => { el.hidden = hidden; });
    cards.forEach(el => { el.hidden = hidden; });
  }
  controls.forEach(button => button.addEventListener('click', () => {
    modal(`<div class="ios-install-guide"><span class="ios-install-kicker">خطوات بسيطة</span><h2>تثبيت سوق داريا على آيفون</h2><p>افتح هذا الموقع في Safari على آيفون، ثم اتبع الخطوات:</p><ol><li><strong>افتح قائمة المشاركة</strong><span>اضغط رمز المشاركة، أو افتح قائمة المتصفح ثم اختر مشاركة.</span></li><li><strong>اختر إضافة إلى الشاشة الرئيسية</strong><span>إذا لم يظهر الخيار، افتح تعديل الإجراءات وأضفه للقائمة.</span></li><li><strong>اضغط إضافة</strong><span>إذا ظهر خيار فتح كتطبيق ويب، اتركه مفعلاً.</span></li></ol><p class="ios-install-note">ستجد أيقونة سوق داريا بين تطبيقاتك. يحتاج السوق اتصالاً بالإنترنت للتصفح وإرسال الطلبات.</p><button type="button" id="ios-install-done">فهمت</button></div>`);
    document.querySelector('#ios-install-done').onclick = () => document.querySelector('#modal').close();
  }));
  window.addEventListener('pageshow', updateVisibility);
  window.matchMedia('(display-mode: standalone)').addEventListener('change', updateVisibility);
  updateVisibility();
})();
