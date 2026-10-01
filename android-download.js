'use strict';
(() => {
  if (!/ShahinAndroid\//.test(navigator.userAgent)) return;
  document.querySelectorAll('[data-android-download]').forEach(el => { el.hidden = true; });
  const button = document.createElement('button');
  button.id = 'android-refresh';
  button.type = 'button';
  button.className = 'android-nav';
  button.textContent = 'تحديث العرض';
  document.querySelector('header nav').append(button);
  button.onclick = () => {
    if ((location.hash.startsWith('#dashboard') || document.querySelector('dialog[open]')) &&
        !confirm(window.ShahinI18n?.translate('احفظ تعديلاتك قبل تحديث الصفحة. هل تريد المتابعة؟') || 'احفظ تعديلاتك قبل تحديث الصفحة. هل تريد المتابعة؟')) return;
    const url = new URL(location.href);
    url.searchParams.set('app-refresh', Date.now().toString());
    location.replace(url.href);
  };
  // Offer updates without discarding a checkout or an unfinished merchant edit.
  const signature = doc => Array.from(doc.querySelectorAll('script[src],link[rel="stylesheet"]'))
    .map(el => el.getAttribute('src') || el.getAttribute('href')).join('|');
  const current = signature(document);
  let lastCheck = 0, checking = false;
  async function checkUpdate() {
    if (document.hidden || checking || Date.now() - lastCheck < 60000) return;
    checking = true;
    lastCheck = Date.now();
    try {
      const url = new URL('./', location.href);
      url.searchParams.set('app-check', lastCheck.toString());
      const response = await fetch(url.href, {cache:'no-store'});
      if (!response.ok) return;
      const latest = new DOMParser().parseFromString(await response.text(), 'text/html');
      if (!latest.querySelector('#app') || !latest.querySelector('script[src]')) return;
      if (signature(latest) !== current) {
        button.textContent = 'تحديث متاح';
        button.classList.add('android-update-ready');
      }
    } catch (_) { /* Keep the current page usable when offline. */ }
    finally { checking = false; }
  }
  document.addEventListener('visibilitychange', checkUpdate);
  window.addEventListener('online', checkUpdate);
  checkUpdate();
})();
