'use strict';
(() => {
  const t = (ar, en, de) => ct(ar, en, de);
  const key = () => 'daraya-shop-blocks:' + (user?.id || 'guest');
  function blockedIds() {
    try {
      const value = JSON.parse(localStorage.getItem(key()) || '[]');
      return Array.isArray(value) ? value.filter(id => typeof id === 'string') : [];
    } catch { return []; }
  }
  const isBlocked = id => blockedIds().includes(id);
  function save(ids) { localStorage.setItem(key(), JSON.stringify([...new Set(ids)])); }
  function unblock(id) { save(blockedIds().filter(x => x !== id)); render(); }
  function blockShop(s) {
    const scope = key();
    modal('<section data-no-translate><h2>' + t('حظر محتوى المحل', 'Block shop content', 'Geschäftsinhalte blockieren') + '</h2><p>' + esc(s.name) + '</p><p>' + t('ستختفي صفحة المحل ومنتجاته وعروضه من التصفح والخريطة في هذا المتصفح. يمكنك إلغاء الحظر لاحقًا. لا يُرسل بلاغ تلقائيًا.', 'This shop page, products and offers will be hidden from browsing and the map in this browser. You can unblock it later. This does not send a report.', 'Die Geschäftsseite, Produkte und Angebote werden in diesem Browser beim Stöbern und auf der Karte ausgeblendet. Du kannst die Blockierung aufheben. Es wird keine Meldung gesendet.') + '</p><button data-confirm-shop-block>' + t('حظر المحتوى', 'Block content', 'Inhalte blockieren') + '</button><p role="status"></p></section>');
    const button = document.querySelector('[data-confirm-shop-block]');
    button.onclick = () => {
      try {
        if (scope !== key()) throw Error('account changed');
        save([...blockedIds(), s.id]);
        document.querySelector('#modal').close();
        render();
      } catch { button.parentElement.querySelector('[role=status]').textContent = t('تعذر حفظ الحظر. حاول مجددًا.', 'Could not save the block. Try again.', 'Blockierung konnte nicht gespeichert werden. Versuche es erneut.'); }
    };
  }
  const reasons = [
    ['content', 'محتوى أو صور غير مناسبة', 'Harmful content or images', 'Unangemessene Inhalte oder Bilder'],
    ['publisher', 'شكوى عن صاحب المحل أو الناشر', 'Report the owner or publisher', 'Inhaber oder Verfasser melden'],
    ['misleading', 'معلومات أو أسعار مضللة', 'Misleading details or prices', 'Irreführende Angaben oder Preise'],
    ['phone', 'رقم لا يعمل', 'Phone does not work', 'Telefonnummer funktioniert nicht'],
    ['address', 'عنوان غير صحيح', 'Wrong address', 'Falsche Adresse'],
    ['closed', 'المكان مغلق', 'Place is closed', 'Ort geschlossen'],
    ['other', 'سبب آخر', 'Other reason', 'Anderer Grund']
  ];
  function reportShop(s) {
    if (!user || !api) { location.hash = '#account'; toast(t('سجل الدخول لإرسال البلاغ', 'Sign in to send a report', 'Zum Melden bitte anmelden')); return; }
    const uid = user.id;
    modal('<section data-no-translate><h2>' + t('الإبلاغ عن المحل أو محتواه أو ناشره', 'Report shop, content or owner', 'Geschäft, Inhalte oder Inhaber melden') + '</h2><p>' + esc(s.name) + '</p><form id="shop-content-report"><label>' + t('سبب البلاغ', 'Report reason', 'Meldegrund') + '<select name="reason">' + reasons.map(([id, ar, en, de]) => '<option value="' + id + '">' + t(ar, en, de) + '</option>').join('') + '</select></label><label>' + t('التفاصيل — اذكر الصورة أو المنتج أو المشكلة', 'Details — name the image, product or problem', 'Details — Bild, Produkt oder Problem nennen') + '<textarea name="note" required minlength="3" maxlength="900"></textarea></label><button type="submit">' + t('إرسال للإدارة', 'Send to site team', 'An Verwaltung senden') + '</button><p role="status"></p></form></section>');
    const form = document.querySelector('#shop-content-report');
    form.onsubmit = async e => {
      e.preventDefault();
      const button = e.submitter;
      button.disabled = true;
      try {
        if (user?.id !== uid) throw Error('account changed');
        const selected = reasons.find(x => x[0] === form.elements.reason.value);
        const note = form.elements.note.value.trim();
        if (!selected || note.length < 3) throw Error('invalid report');
        // Keep existing database enum and route every complaint to place reports.
        const payload = { p_store: s.id, p_reason: ['phone', 'address', 'closed'].includes(selected[0]) ? selected[0] : 'other', p_note: ('[' + selected[0] + '] ' + t(selected[1], selected[2], selected[3]) + '\n' + note).slice(0, 1000) };
        const result = await api.rpc('create_place_report', payload);
        if (result.error) throw result.error;
        if (!form.isConnected || user?.id !== uid) return;
        form.innerHTML = '<p role="status">' + t('وصل البلاغ إلى الإدارة للمراجعة.', 'The site team received your report.', 'Die Meldung ist bei der Verwaltung eingegangen.') + '</p>';
      } catch {
        if (!form.isConnected) return;
        form.querySelector('[role=status]').textContent = t('تعذر إرسال البلاغ. لم نؤكد وصوله؛ حاول مجددًا.', 'Could not send the report. Please try again.', 'Meldung konnte nicht gesendet werden. Versuche es erneut.');
        button.disabled = false;
      }
    };
  }
  function blockedPage() {
    const app = document.querySelector('#app');
    app.innerHTML = '<section class="panel" data-no-translate><a href="#home">' + t('العودة للرئيسية', 'Back to home', 'Zurück zur Startseite') + '</a><h1>' + t('المحلات المحظورة', 'Blocked shops', 'Blockierte Geschäfte') + '</h1><p>' + t('الحظر محفوظ في هذا المتصفح فقط، وبشكل منفصل لكل حساب.', 'Blocks are saved in this browser only, separately for each account.', 'Blockierungen werden nur in diesem Browser und getrennt je Konto gespeichert.') + '</p>' + (blockedIds().map(id => '<p>' + esc(stores.find(s => s.id === id)?.name || t('محل محظور', 'Blocked shop', 'Blockiertes Geschäft')) + ' <button data-unblock-shop="' + esc(id) + '">' + t('إلغاء الحظر', 'Unblock', 'Entsperren') + '</button></p>').join('') || '<p>' + t('لا توجد محلات محظورة.', 'No blocked shops.', 'Keine blockierten Geschäfte.') + '</p>') + '</section>';
    app.querySelectorAll('[data-unblock-shop]').forEach(b => { b.onclick = () => { try { unblock(b.dataset.unblockShop); } catch { toast(t('تعذر إلغاء الحظر.', 'Could not unblock.', 'Entsperren fehlgeschlagen.')); } }; });
  }
  function decorate() {
    document.querySelectorAll('[data-report-place]').forEach(b => {
      const id = location.hash.split('/')[1], s = stores.find(x => x.id === id);
      if (!s) return;
      const label = t('الإبلاغ عن المحل أو المحتوى', 'Report shop or content', 'Geschäft oder Inhalte melden');
      if (b.textContent !== label) b.textContent = label;
      b.dataset.noTranslate = '';
      b.onclick = () => reportShop(s);
      if (!b.parentElement.querySelector('[data-block-shop]')) {
        const block = document.createElement('button');
        block.type = 'button'; block.className = 'outline'; block.dataset.blockShop = id; block.dataset.noTranslate = '';
        block.textContent = t('حظر محتوى المحل', 'Block shop content', 'Geschäftsinhalte blockieren');
        block.onclick = () => blockShop(s); b.after(block);
      }
    });
    if (['#account', '#blocked-publishers'].includes(location.hash) && !document.querySelector('[data-blocked-shops-link]')) {
      const link = document.createElement('a'); link.href = '#blocked-shops'; link.className = 'button outline'; link.dataset.blockedShopsLink = ''; link.dataset.noTranslate = '';
      link.textContent = t('المحلات المحظورة', 'Blocked shops', 'Blockierte Geschäfte'); document.querySelector('#app')?.prepend(link);
    }
    if (location.hash.startsWith('#dashboard') || location.hash.includes('review') || location.hash.includes('reports')) return;
    document.querySelectorAll('a[href^="#store/"]').forEach(a => {
      const id = a.getAttribute('href').split('/')[1];
      if (isBlocked(id)) (a.closest('.card, .shop-offer, .community-offer') || a).hidden = true;
    });
  }
  window.DarayaShopModeration = { isBlocked, blockedIds, blockShop, reportShop, unblock };
  const baseMatch = matchesCategory;
  matchesCategory = function(s, ...args) { return !isBlocked(s.id) && baseMatch.call(this, s, ...args); };
  const baseStore = renderStore;
  renderStore = function(id) {
    if (isBlocked(id)) {
      document.querySelector('#app').innerHTML = '<section class="panel" data-no-translate><h1>' + t('محتوى هذا المحل محظور لديك', 'You blocked this shop content', 'Du hast diese Geschäftsinhalte blockiert') + '</h1><a class="button outline" href="#home">' + t('الرئيسية', 'Home', 'Startseite') + '</a> <a class="button outline" href="#blocked-shops">' + t('إدارة الحظر', 'Manage blocks', 'Blockierungen verwalten') + '</a></section>';
      return;
    }
    baseStore.apply(this, arguments); decorate();
  };
  const baseRender = render;
  render = function() { if (location.hash === '#blocked-shops') return blockedPage(); return baseRender.apply(this, arguments); };
  window.addEventListener('hashchange', () => { if (location.hash === '#blocked-shops') render(); });
  new MutationObserver(decorate).observe(document.querySelector('#app'), { childList: true, subtree: true });
  decorate();
})();
