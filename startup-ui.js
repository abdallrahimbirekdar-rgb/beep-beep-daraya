'use strict';
(() => {
  let pending = false;
  const home = () => ['','/','/index.html'].includes(location.pathname) &&
    ['', '#', '#home', '#browse', '#saved'].includes(location.hash);
  const message = () => ({
    ar: 'جاري تحديث بيانات المحلات… يمكنك اختيار القسم أو كتابة بحثك.',
    en: 'Loading shops… You can choose a category or enter your search.',
    de: 'Geschäfte werden geladen… Wähle eine Kategorie oder gib deine Suche ein.'
  }[window.ShahinI18n?.language || 'ar']);
  const previousHome = renderHome;
  renderHome = function() {
    const result = previousHome.apply(this, arguments);
    const app = document.getElementById('app');
    app.classList.toggle('catalog-pending', pending);
    if (pending) {
      const status = document.createElement('p');
      status.className = 'catalog-pending-status';
      status.setAttribute('role', 'status');
      status.dataset.noTranslate = '';
      status.textContent = message();
      (app.querySelector('#browse') || app).prepend(status);
    }
    return result;
  };
  const previousRender = render;
  render = function() {
    if (pending && api && !passwordRecovery) {
      if (home()) return previousRender.apply(this, arguments);
      document.getElementById('app').innerHTML =
        '<p class="loading" role="status">جاري تحميل بيانات الصفحة…</p>';
      return;
    }
    return previousRender.apply(this, arguments);
  };
  window.addEventListener('hashchange', event => {
    if (!pending || !api || passwordRecovery) return;
    event.stopImmediatePropagation();
    render();
  }, true);
  window.DarayaStartup = {
    get pending() { return pending; },
    show() { pending = true; if (home()) renderHome(); },
    complete() {
      const input = document.getElementById('search');
      const focused = input && document.activeElement === input;
      const start = input?.selectionStart, end = input?.selectionEnd;
      pending = false;
      document.getElementById('app').classList.remove('catalog-pending');
      render();
      const replacement = document.getElementById('search');
      if (focused && replacement) {
        replacement.focus({preventScroll:true});
        replacement.setSelectionRange(start, end);
      }
    }
  };
})();
