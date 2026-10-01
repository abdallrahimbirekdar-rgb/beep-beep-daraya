'use strict';
(() => {
  // The installed application already provides access to Shahin.
  if (/ShahinAndroid\//.test(navigator.userAgent)) {
    document.querySelectorAll('[data-android-download]').forEach(el => { el.hidden = true; });
  }
})();
