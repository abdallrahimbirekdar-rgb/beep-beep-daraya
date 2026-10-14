'use strict';
(() => {
  const t = (ar, en, de) => ct(ar, en, de);
  let epoch = 0, stop = () => {};
  function link(raw) {
    if (!raw) return null;
    try {
      if (typeof raw !== 'string' || raw.length > 500 || /[<>\s]/.test(raw)) return null;
      const u = new URL(raw), host = u.hostname.toLowerCase();
      const providers = {'youtube.com':'YouTube','www.youtube.com':'YouTube','m.youtube.com':'YouTube','youtu.be':'YouTube','facebook.com':'Facebook','www.facebook.com':'Facebook','m.facebook.com':'Facebook','web.facebook.com':'Facebook','fb.watch':'Facebook','instagram.com':'Instagram','www.instagram.com':'Instagram'};
      if (u.protocol !== 'https:' || u.username || u.password || u.port || !providers[host] || u.pathname === '/' && !u.search) return null;
      return {url:u.href, provider:providers[host]};
    } catch { return null; }
  }
  function linkMarkup(raw) {
    const item = link(raw);
    return item ? '<a class="button outline" href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer">'+t('▶ شاهد الفيديو على ', '▶ Watch video on ', '▶ Video ansehen auf ')+esc(item.provider)+'</a>' : '';
  }
  function isPublic(o) {
    if(o.demo) return Date.parse(o.ends_at)>Date.now();
    const m = window.DarayaOffers?.meta(o), s = stores.find(s => s.id === o.store_id);
    return !!s && window.DarayaOffers?.eligible(s) && o.status === 'approved' && Date.parse(o.ends_at) > Date.now() && !m.exclusive && !window.DarayaShopModeration?.isBlocked(s.id) && !window.DarayaPublisherModeration?.isBlocked(o.user_id);
  }
  function poster(o) {
    const m = window.DarayaOffers.meta(o), s = stores.find(s => s.id === o.store_id);
    return safeImage(m.image || storeCover(s || {}));
  }
  function markup(o) {
    const m = window.DarayaOffers.meta(o), s = o.demo ? {id:o.store_id,name:o.shop_name} : stores.find(s => s.id === o.store_id), route=o.demo?o.shop_route:'#store/'+s.id, kind = m.kind === 'text' ? 'text' : 'image';
    const media = kind === 'text' ? '<div class="reel-text-art" aria-hidden="true">🏷️</div>' : '<img class="reel-photo" src="' + esc(thumbnailForImage(poster(o))) + '" alt="' + esc(o.title) + '" loading="lazy" decoding="async">';
    const logo=safeImage(o.demo?o.shop_logo:storeCover(s));
    const identity='<a class="reel-identity" href="'+esc(route)+'">'+(logo?'<img class="reel-shop-logo" src="'+esc(thumbnailForImage(logo))+'" alt="'+esc(s.name)+'" loading="lazy" decoding="async">':'<span class="reel-shop-logo reel-logo-fallback" aria-hidden="true">🏪</span>')+'<span><small>'+t('المحل','Shop','Geschäft')+'</small><strong>'+esc(s.name)+'</strong></span></a>';
    return '<article class="offer-reel offer-reel-' + kind + '" data-no-translate data-publisher="' + esc(o.user_id) + '" data-store-id="' + esc(o.store_id) + '" data-reel-id="' + esc(o.id) + '">' + identity + media + '<div class="reel-copy">' + (o.demo ? '<strong class="reel-demo-note">'+t('عرض تجريبي — غير متاح للشراء','Demo offer — not for sale','Beispielangebot — nicht kaufbar')+'</strong>' : '') + (kind==='text'?'<span class="reel-format-label">'+t('عرض نصي','Text offer','Textangebot')+'</span>':'') + '<h2>' + esc(o.title) + '</h2><p class="reel-benefit">' + esc(m.benefit) + '</p>' + (o.price == null ? '' : '<p class="reel-price">' + (m.original == null ? '' : '<del>' + money(m.original) + '</del> ') + '<strong>' + money(o.price) + '</strong></p>') + (kind==='text'?'<p class="reel-visible-text">'+esc(m.terms)+'</p>':'') + '<details><summary>' + t('الوصف والشروط والعنوان', 'Details, terms and address', 'Details, Bedingungen und Adresse') + '</summary><p>' + esc(m.terms) + '</p><p>' + esc(o.address) + '</p></details><small>' + t('ينتهي: ', 'Ends: ', 'Endet: ') + esc(communityDate(o.ends_at)) + '</small><div class="reel-actions">' + linkMarkup(m.video_link) + '<a class="button" href="' + esc(route) + '">' + t('زيارة المحل', 'View shop', 'Geschäft ansehen') + '</a><button type="button" data-share-reel>' + t('مشاركة', 'Share', 'Teilen') + '</button>' + (o.demo?'':'<button type="button" class="outline" data-offer-report="' + esc(o.id) + '">' + t('إبلاغ', 'Report', 'Melden') + '</button>') + '</div></div></article>';
  }
  function teardown() { epoch++; stop(); stop = () => {}; }
  async function renderFeed(mode = 'all', focus = '') {
    teardown(); const token = epoch, uid = user?.id;
    communityPublicHeader();
    const app = document.querySelector('#app'); app.classList.remove('professional-home');
    app.innerHTML = '<section class="offers-reels-page" data-no-translate><header class="reels-heading"><a class="button outline" href="#home">' + t('الرئيسية', 'Home', 'Startseite') + '</a><h1>' + t('عروض اليوم', 'Today’s offers', 'Heutige Angebote') + '</h1><button type="button" data-post-reel>' + t('＋ أضف عرضًا', '＋ Add offer', '＋ Angebot hinzufügen') + '</button></header><nav class="reels-tabs"><a href="#offers" aria-current="' + (mode === 'all' ? 'page' : 'false') + '">' + t('كل العروض', 'All offers', 'Alle Angebote') + '</a><a href="#followed-offers" aria-current="' + (mode === 'following' ? 'page' : 'false') + '">' + t('محلات أتابعها', 'Shops I follow', 'Abonnierte Geschäfte') + '</a></nav><p class="reels-hint">' + t('اسحب للأعلى أو الأسفل لاكتشاف الصور والعروض المكتوبة وروابط الفيديو. العروض متاحة للجميع.', 'Swipe up or down for images, text offers and video links. Offers are open to everyone.', 'Wische nach oben oder unten für Bilder, Textangebote und Videolinks. Angebote gelten für alle.') + '</p><div class="offer-reels-track" tabindex="0" aria-label="' + t('تصفح العروض', 'Browse offers', 'Angebote ansehen') + '"><p role="status">' + t('جاري تحميل العروض…', 'Loading offers…', 'Angebote werden geladen…') + '</p></div><div class="reels-navigation"><button type="button" data-reel-prev>' + t('↑ السابق', '↑ Previous', '↑ Zurück') + '</button><span data-reel-position></span><button type="button" data-reel-next>' + t('التالي ↓', 'Next ↓', 'Weiter ↓') + '</button></div></section>';
    app.querySelector('[data-post-reel]').onclick = () => window.DarayaOffers.edit();
    const track = app.querySelector('.offer-reels-track'), position = app.querySelector('[data-reel-position]');
    const alive = () => token === epoch && track.isConnected && uid === user?.id;
    const demos=mode==='all'?(window.DarayaDemoOfferCatalog?.()||[]).filter(isPublic):[];
    let page = 0, done = false, loading = false, rows = [], following = null, current = null, mediaEpoch = 0, observer, expiryTimer;
    const release = video => { video.pause(); video.removeAttribute('src'); video.load(); };
    stop = () => { mediaEpoch++; observer?.disconnect(); clearInterval(expiryTimer); track.querySelectorAll('video').forEach(release); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('daraya-blocks-changed', checkExpiry); };
    function visibility() { if (document.hidden) { mediaEpoch++; track.querySelectorAll('video').forEach(v => v.pause()); } }
    document.addEventListener('visibilitychange', visibility);
    if (mode === 'following') {
      if (!user) { track.innerHTML = '<p>' + t('سجل الدخول لرؤية عروض المحلات التي تتابعها.', 'Sign in to see offers from shops you follow.', 'Melde dich an, um Angebote abonnierter Geschäfte zu sehen.') + '</p><a class="button" href="#account">' + t('تسجيل الدخول', 'Sign in', 'Anmelden') + '</a>'; return; }
      try { const f = await api.from('customer_favorites').select('store_id').eq('user_id', uid); if (f.error) throw f.error; following = f.data.map(x => x.store_id); }
      catch { if (alive()) track.innerHTML = '<p>' + t('تعذر تحميل المحلات. حاول مجددًا.', 'Could not load shops. Try again.', 'Geschäfte konnten nicht geladen werden. Versuche es erneut.') + '</p>'; return; }
      if (!alive()) return;
      if (!following.length) { track.innerHTML = '<p>' + t('احفظ محلًا من صفحته لتظهر عروضه هنا.', 'Save a shop from its page to see its offers here.', 'Speichere ein Geschäft auf seiner Seite, um Angebote hier zu sehen.') + '</p>'; return; }
    }
    function activate(card) {
      if (!alive() || !card || card.hidden || current === card) return;
      mediaEpoch++; current = card;
      track.querySelectorAll('video').forEach(v => { if (v !== card.querySelector('video')) release(v); });
      const cards = [...track.querySelectorAll('.offer-reel')].filter(c => !c.hidden), index = cards.indexOf(card);
      position.textContent = (index + 1) + ' / ' + cards.length;
      if (index >= cards.length - 3 && !done) loadMore();
    }
    function bind(card) {
      const row = rows.find(o => o.id === card.dataset.reelId);
      card.querySelector('[data-share-reel]').onclick = async () => {
        const url = new URL(location.href); url.search = ''; url.hash = '#offers/' + row.id;
        try { if (navigator.share) await navigator.share({ title: row.title, text: window.DarayaOffers.meta(row).benefit, url: url.href }); else { await navigator.clipboard.writeText(url.href); toast(t('تم نسخ رابط العرض', 'Offer link copied', 'Angebotslink kopiert')); } } catch {}
      };
    }
    let requestController=null;
    const stopFeed=stop; stop=()=>{requestController?.abort();stopFeed();};
    async function loadMore() {
      if (!alive() || done || loading) return;
      loading = true;
      requestController=new AbortController();
      const requestTimeout=setTimeout(()=>requestController?.abort(),15000);
      try {
        let q = api.from('daily_offers').select('*').eq('status', 'approved').gt('ends_at', new Date().toISOString()).order('created_at', { ascending: false }).order('id', { ascending: false }).range(page * 20, page * 20 + 19);
        if (following) q = q.in('store_id', following);
        const r = await q.abortSignal(requestController.signal);
        if (!alive()) return;
        if (r.error) throw r.error;
        done = r.data.length < 20; page++;
        const fresh = r.data.filter(isPublic).filter(o => !rows.some(x => x.id === o.id)); rows.push(...fresh);
        if (page === 1 && !track.querySelector('.offer-reel')) track.innerHTML = '';
        for (const o of fresh) { track.insertAdjacentHTML('beforeend', markup(o)); const card = track.lastElementChild; bind(card); observer?.observe(card); }
        if (!rows.length && done) track.innerHTML = '<div class="reels-empty"><h2>' + t('أول العروض قريبًا', 'First offers coming soon', 'Die ersten Angebote kommen bald') + '</h2><p>' + t('يمكن لصاحب المحل إرسال صورة أو عرض مكتوب مع رابط فيديو اختياري للمراجعة.', 'Shop owners can send an image or text offer with an optional video link for review.', 'Inhaber können ein Bild oder Textangebot mit optionalem Videolink zur Prüfung senden.') + '</p><a class="button outline" href="#home">' + t('تصفح المحلات', 'Browse shops', 'Geschäfte ansehen') + '</a></div>';
        if (!current && rows.length) activate(track.querySelector('.offer-reel'));
        if (!fresh.length && !done) { loading = false; return loadMore(); }
      } catch {
        if (alive()) { const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = t('تعذر التحميل — أعد المحاولة', 'Could not load — retry', 'Laden fehlgeschlagen — erneut versuchen'); retry.onclick = () => { retry.remove(); loadMore(); }; track.append(retry); }
      } finally { clearTimeout(requestTimeout);loading = false; }
    }
    if (typeof IntersectionObserver !== 'undefined') observer = new IntersectionObserver(entries => { const entry = entries.filter(e => e.isIntersecting && e.intersectionRatio >= .65).sort((a,b) => b.intersectionRatio-a.intersectionRatio)[0]; if (entry) activate(entry.target); }, { root: track, threshold: [.65, .9] });
    function move(delta) { const cards = [...track.querySelectorAll('.offer-reel')].filter(c => !c.hidden); const index = Math.max(0, cards.indexOf(current)); const next = cards[Math.max(0, Math.min(cards.length - 1, index + delta))]; if (next) { next.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' }); activate(next); } }
    app.querySelector('[data-reel-prev]').onclick = () => move(-1); app.querySelector('[data-reel-next]').onclick = () => move(1);
    track.addEventListener('keydown', e => { if (e.target !== track) return; if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); move(e.key === 'ArrowDown' ? 1 : -1); } });
    if (!observer) track.addEventListener('scroll', () => { const cards = [...track.querySelectorAll('.offer-reel')].filter(c=>!c.hidden), top = track.getBoundingClientRect().top; activate(cards.sort((a,b)=>Math.abs(a.getBoundingClientRect().top-top)-Math.abs(b.getBoundingClientRect().top-top))[0]); });
    function checkExpiry() {
      if (!alive()) return teardown();
      track.querySelectorAll('.offer-reel').forEach(card => {
        const row = rows.find(o => o.id === card.dataset.reelId);
        if (!row || !isPublic(row)) {
          card.querySelectorAll('video').forEach(release); card.hidden = true;
          if (card === current) { current = null; activate([...track.querySelectorAll('.offer-reel')].find(c => !c.hidden)); }
        }
      });
    }
    expiryTimer = setInterval(checkExpiry, 10000);
    window.addEventListener('daraya-blocks-changed', checkExpiry);
    // A shared offer is checked separately and still must be public and unexpired.
    if (focus) {
      try {
        const demo=demos.find(o=>o.id===focus);
        const r = demo?{data:demo}:await api.from('daily_offers').select('*').eq('id', focus).eq('status', 'approved').gt('ends_at', new Date().toISOString()).maybeSingle();
        if (!alive()) return;
        if (!r.error && r.data && isPublic(r.data)) { rows.push(r.data); track.innerHTML = markup(r.data); bind(track.firstElementChild); observer?.observe(track.firstElementChild); activate(track.firstElementChild); }
        else track.innerHTML = '<p>' + t('انتهى هذا العرض أو لم يعد متاحًا.', 'This offer has ended or is unavailable.', 'Dieses Angebot ist abgelaufen oder nicht verfügbar.') + '</p>';
      } catch { if (alive()) track.innerHTML = '<p>' + t('تعذر تحميل العرض.', 'Could not load the offer.', 'Angebot konnte nicht geladen werden.') + '</p>'; }
    }
    if(demos.length){
      if(!track.querySelector('.offer-reel'))track.innerHTML='';
      for(const o of demos){if(rows.some(x=>x.id===o.id))continue;rows.push(o);track.insertAdjacentHTML('beforeend',markup(o));const card=track.lastElementChild;bind(card);observer?.observe(card);}
      if(!current)activate(track.querySelector('.offer-reel'));
    }
    await loadMore();
  }
  window.DarayaReels = { render: renderFeed, isPublic, link, linkMarkup };
  // Run after the existing route listeners. Cleanup must never cancel a newly rendered feed.
  window.addEventListener('hashchange',()=>{const parts=location.hash.split('/');if(parts[0]==='#offers')renderFeed('all',parts[1]||'');else if(parts[0]==='#followed-offers')renderFeed('following');else teardown();});
  const baseRender = render; render = function() { const parts = location.hash.split('/'); if (parts[0] === '#offers' && parts[1]) return window.DarayaReels.render('all', parts[1]); return baseRender.apply(this, arguments); };
})();
