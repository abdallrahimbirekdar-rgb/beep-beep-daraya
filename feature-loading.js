'use strict';
(() => {
  let ready = false, pending = null, generation = 0;
  const management = () => location.hash.startsWith('#dashboard') ||
    ['#facebook-studio', '#account-deletion-admin', '#admin-notifications', '#data-requests'].includes(location.hash);
  function load() {
    if (ready) return Promise.resolve();
    if (pending) return pending;
    const markers = [...document.querySelectorAll('script[data-feature="management"][data-src]')];
    pending = (async() => {
      for (const marker of markers) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = marker.dataset.src;
          script.async = false;
          script.onload = () => { marker.dataset.loaded = 'true'; resolve(); };
          script.onerror = () => { script.remove(); reject(Error('Feature loading failed')); };
          if (marker.dataset.loaded === 'true') resolve();
          else document.head.append(script);
        });
      }
      ready = true;
    })().finally(() => { pending = null; });
    return pending;
  }
  function open() {
    const route = location.hash, request = ++generation;
    const app = document.getElementById('app');
    app.innerHTML = '<p class="loading" role="status">' +
      ({ar:'جاري فتح أدوات الإدارة…',en:'Opening management tools…',de:'Verwaltungswerkzeuge werden geöffnet…'}[window.ShahinI18n?.language || 'ar']) +
      '</p>';
    load().then(() => {
      if (location.hash === route && request === generation) render();
    }).catch(() => {
      if (location.hash !== route || request !== generation) return;
      app.innerHTML = '<section class="panel"><p>تعذر تحميل الصفحة. أعد المحاولة.</p><button data-retry-feature>إعادة المحاولة</button></section>';
      app.querySelector('[data-retry-feature]').onclick = open;
    });
  }
  const previous = render;
  render = function() {
    if (!ready && api && user && management() && !window.DarayaStartup?.pending) {
      open();
      return;
    }
    return previous.apply(this, arguments);
  };
  window.addEventListener('hashchange', event => {
    if (!ready && api && user && management() && !window.DarayaStartup?.pending) {
      event.stopImmediatePropagation();
      open();
    }
  }, true);
})();
