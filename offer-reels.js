'use strict';
(() => {
  const BUCKET = 'shop-reels', MAX_BYTES = 50 * 1024 * 1024, MAX_SECONDS = 30;
  const t = (ar, en, de) => ct(ar, en, de);
  const validPath = path => typeof path === 'string' && /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(mp4|webm)$/.test(path);
  let epoch = 0, stop = () => {}, readyUntil = 0, readyValue = false;
  async function ready() {
    if (Date.now() < readyUntil) return readyValue;
    try {
      const r = await api.rpc('shop_reels_ready');
      readyValue = !r.error && r.data === true;
    } catch { readyValue = false; }
    readyUntil = Date.now() + (readyValue ? 60000 : 5000);
    return readyValue;
  }
  async function inspect(file) {
    if (!file?.size || !['video/mp4', 'video/webm'].includes(file.type) || file.size > MAX_BYTES) {
      throw Error(t('اختر فيديو MP4 أو WebM لا يتجاوز ٥٠ ميغابايت.', 'Choose an MP4 or WebM video, up to 50 MB.', 'Wähle ein MP4- oder WebM-Video bis 50 MB.'));
    }
    const src = URL.createObjectURL(file), video = document.createElement('video');
    try {
      const seconds = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Error(t('تعذر قراءة الفيديو. جرّب ملفًا آخر.', 'Could not read the video. Try another file.', 'Video konnte nicht gelesen werden. Versuche eine andere Datei.'))), 15000);
        video.preload = 'metadata'; video.muted = true; video.playsInline = true;
        video.onloadedmetadata = () => { clearTimeout(timer); resolve(video.duration); };
        video.onerror = () => { clearTimeout(timer); reject(Error(t('هذا الفيديو غير قابل للتشغيل. جرّب MP4 بترميز H.264.', 'This video cannot play. Try an H.264 MP4 file.', 'Dieses Video ist nicht abspielbar. Versuche eine H.264-MP4-Datei.'))); };
        video.src = src;
      });
      if (!Number.isFinite(seconds) || seconds <= 0 || seconds > MAX_SECONDS) throw Error(t('مدة الفيديو يجب ألا تتجاوز ٣٠ ثانية.', 'The video must be 30 seconds or less.', 'Das Video darf höchstens 30 Sekunden dauern.'));
      return Math.round(seconds * 100) / 100;
    } finally { video.removeAttribute('src'); video.load(); URL.revokeObjectURL(src); }
  }
  async function resumable(file, path, uid, options = {}) {
    const tus = await import('https://cdn.jsdelivr.net/npm/tus-js-client@4.3.1/+esm');
    const origin = new URL(cfg.supabaseUrl);
    origin.hostname = origin.hostname.replace(/\.supabase\.co$/, '.storage.supabase.co');
    const session = await api.auth.getSession();
    if (session.error || session.data?.session?.user?.id !== uid || user?.id !== uid) throw Error('SIGN_IN_REQUIRED');
    await new Promise((resolve, reject) => {
      let settled = false;
      const finish = err => { if (settled) return; settled = true; options.signal?.removeEventListener('abort', cancel); err ? reject(err) : resolve(); };
      const transfer = new tus.Upload(file, {
        endpoint: origin.origin + '/storage/v1/upload/resumable',
        retryDelays: [0, 1000, 3000, 5000, 10000],
        chunkSize: 6 * 1024 * 1024,
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        storeFingerprintForResuming: false,
        headers: { authorization: 'Bearer ' + session.data.session.access_token, apikey: cfg.supabaseAnonKey, 'x-upsert': 'false' },
        metadata: { bucketName: BUCKET, objectName: path, contentType: file.type, cacheControl: '60' },
        async onBeforeRequest(req) {
          if (options.signal?.aborted || user?.id !== uid) throw Error('UPLOAD_CANCELLED');
          let r = await api.auth.getSession();
          if (r.data?.session?.expires_at * 1000 < Date.now() + 60000) r = await api.auth.refreshSession();
          if (r.error || r.data?.session?.user?.id !== uid) throw Error('SIGN_IN_REQUIRED');
          req.setHeader('authorization', 'Bearer ' + r.data.session.access_token);
        },
        onProgress(sent, total) { if (user?.id === uid) options.onProgress?.(Math.round(sent / total * 100)); },
        onError: finish,
        onSuccess: () => finish()
      });
      function cancel() { transfer.abort().catch(() => {}); finish(Error('UPLOAD_CANCELLED')); }
      if (options.signal?.aborted) return cancel();
      options.signal?.addEventListener('abort', cancel, { once: true });
      transfer.start();
    });
  }
  async function upload(file, uid, storeId, offerId, options = {}) {
    if (!await ready()) throw Error(t('خدمة رفع الفيديو قيد التجهيز. يمكنك نشر صورة أو نص الآن.', 'Video uploads are being set up. You can post an image or text now.', 'Video-Uploads werden eingerichtet. Du kannst jetzt ein Bild oder Text veröffentlichen.'));
    const seconds = await inspect(file);
    const prepared = window.DarayaVideo ? await window.DarayaVideo.prepare(file,{signal:options.signal,onProgress:options.onPrepareProgress}) : {file,compressed:false};
    file = prepared.file;
    options.onPrepared?.(prepared.compressed);
    if (user?.id !== uid) throw Error(t('سجل الدخول مجددًا.', 'Please sign in again.', 'Bitte melde dich erneut an.'));
    const path = uid + '/' + storeId + '/' + offerId + (file.type === 'video/webm' ? '.webm' : '.mp4');
    if (!validPath(path)) throw Error('Invalid video path');
    try {
      if (file.size > 6 * 1024 * 1024) await resumable(file, path, uid, options);
      else {
        const r = await api.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false, cacheControl: '60' });
        if (r.error) throw r.error;
      }
    } catch {
      throw Error(t('تعذر رفع الفيديو. تحقق من الاتصال؛ قد تكون مساحة الفيديو ممتلئة أو لديك فيديو آخر لهذا المحل. يمكنك نشر نص أو صورة.', 'Could not upload. Check your connection. Video space may be full, or this shop may already have a video. You can post text or an image.', 'Upload fehlgeschlagen. Prüfe die Verbindung. Videospeicher kann voll sein oder das Geschäft hat bereits ein Video. Du kannst Text oder Bild veröffentlichen.'));
    }
    return { path, duration: seconds, size: file.size, mime: file.type, compressed:prepared.compressed };
  }
  async function remove(media) {
    if (!validPath(media?.path)) return;
    const r = await api.storage.from(BUCKET).remove([media.path]);
    if (r.error) throw r.error;
  }
  async function videoUrl(media) {
    if (!validPath(media?.path)) throw Error('Invalid video');
    const r = await api.storage.from(BUCKET).createSignedUrl(media.path, 60);
    if (r.error || !r.data?.signedUrl) throw Error('Video unavailable');
    const url = new URL(r.data.signedUrl), base = new URL(cfg.supabaseUrl);
    if (url.origin !== base.origin || url.protocol !== 'https:') throw Error('Invalid media origin');
    return url.href;
  }
  function isPublic(o) {
    const m = window.DarayaOffers?.meta(o), s = stores.find(s => s.id === o.store_id);
    return !!s && window.DarayaOffers?.eligible(s) && o.status === 'approved' && Date.parse(o.ends_at) > Date.now() && !m.exclusive && !window.DarayaShopModeration?.isBlocked(s.id) && !window.DarayaPublisherModeration?.isBlocked(o.user_id);
  }
  function poster(o) {
    const m = window.DarayaOffers.meta(o), s = stores.find(s => s.id === o.store_id);
    return safeImage(m.image || storeCover(s || {}));
  }
  function markup(o) {
    const m = window.DarayaOffers.meta(o), s = stores.find(s => s.id === o.store_id), kind = ['text', 'image', 'video'].includes(m.kind) ? m.kind : (m.video ? 'video' : 'image');
    const media = kind === 'text' ? '<div class="reel-text-art" aria-hidden="true">🏷️</div>' : kind === 'video' && validPath(m.video?.path)
      ? '<video class="reel-video" muted playsinline loop preload="none" poster="' + esc(poster(o)) + '" aria-label="' + esc(o.title) + '"></video><button type="button" class="reel-play" data-play-reel>' + t('▶ تشغيل الفيديو', '▶ Play video', '▶ Video abspielen') + '</button><button type="button" class="reel-sound" data-reel-sound aria-pressed="false">' + t('🔇 تشغيل الصوت', '🔇 Turn sound on', '🔇 Ton einschalten') + '</button><p class="reel-media-status" role="status"></p>'
      : '<img class="reel-photo" src="' + esc(thumbnailForImage(poster(o))) + '" alt="' + esc(o.title) + '" loading="lazy" decoding="async">';
    return '<article class="offer-reel offer-reel-' + kind + '" data-no-translate data-publisher="' + esc(o.user_id) + '" data-store-id="' + esc(o.store_id) + '" data-reel-id="' + esc(o.id) + '">' + media + '<div class="reel-copy"><a class="reel-shop" href="#store/' + esc(s.id) + '">' + esc(s.name) + '</a><h2>' + esc(o.title) + '</h2><p class="reel-benefit">' + esc(m.benefit) + '</p>' + (o.price == null ? '' : '<p class="reel-price">' + (m.original == null ? '' : '<del>' + money(m.original) + '</del> ') + '<strong>' + money(o.price) + '</strong></p>') + '<details><summary>' + t('الوصف والشروط والعنوان', 'Details, terms and address', 'Details, Bedingungen und Adresse') + '</summary><p>' + esc(m.terms) + '</p><p>' + esc(o.address) + '</p></details><small>' + t('ينتهي: ', 'Ends: ', 'Endet: ') + esc(communityDate(o.ends_at)) + '</small><div class="reel-actions"><a class="button" href="#store/' + esc(s.id) + '">' + t('زيارة المحل', 'View shop', 'Geschäft ansehen') + '</a><button type="button" data-share-reel>' + t('مشاركة', 'Share', 'Teilen') + '</button><button type="button" class="outline" data-offer-report="' + esc(o.id) + '">' + t('إبلاغ', 'Report', 'Melden') + '</button></div></div></article>';
  }
  function teardown() { epoch++; stop(); stop = () => {}; }
  async function renderFeed(mode = 'all', focus = '') {
    teardown(); const token = epoch, uid = user?.id;
    communityPublicHeader();
    const app = document.querySelector('#app'); app.classList.remove('professional-home');
    app.innerHTML = '<section class="offers-reels-page" data-no-translate><header class="reels-heading"><a class="button outline" href="#home">' + t('الرئيسية', 'Home', 'Startseite') + '</a><h1>' + t('عروض اليوم', 'Today’s offers', 'Heutige Angebote') + '</h1><button type="button" data-post-reel>' + t('＋ أضف عرضًا', '＋ Add offer', '＋ Angebot hinzufügen') + '</button></header><nav class="reels-tabs"><a href="#offers" aria-current="' + (mode === 'all' ? 'page' : 'false') + '">' + t('كل العروض', 'All offers', 'Alle Angebote') + '</a><a href="#followed-offers" aria-current="' + (mode === 'following' ? 'page' : 'false') + '">' + t('محلات أتابعها', 'Shops I follow', 'Abonnierte Geschäfte') + '</a></nav><p class="reels-hint">' + t('اسحب للأعلى أو الأسفل لاكتشاف فيديو أو صورة أو عرض مكتوب. العروض متاحة للجميع.', 'Swipe up or down for videos, images and text offers. Offers are open to everyone.', 'Wische nach oben oder unten für Videos, Bilder und Textangebote. Angebote gelten für alle.') + '</p><div class="offer-reels-track" tabindex="0" aria-label="' + t('تصفح العروض', 'Browse offers', 'Angebote ansehen') + '"><p role="status">' + t('جاري تحميل العروض…', 'Loading offers…', 'Angebote werden geladen…') + '</p></div><div class="reels-navigation"><button type="button" data-reel-prev>' + t('↑ السابق', '↑ Previous', '↑ Zurück') + '</button><span data-reel-position></span><button type="button" data-reel-next>' + t('التالي ↓', 'Next ↓', 'Weiter ↓') + '</button></div></section>';
    app.querySelector('[data-post-reel]').onclick = () => window.DarayaOffers.edit();
    const track = app.querySelector('.offer-reels-track'), position = app.querySelector('[data-reel-position]');
    const alive = () => token === epoch && track.isConnected && uid === user?.id;
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
    async function play(card, manual = false) {
      const video = card.querySelector('video'), row = rows.find(o => o.id === card.dataset.reelId);
      if (!video || !row || !isPublic(row) || document.hidden) return;
      const stamp = ++mediaEpoch, status = card.querySelector('.reel-media-status'), button = card.querySelector('[data-play-reel]');
      status.textContent = t('جاري تجهيز الفيديو…', 'Loading video…', 'Video wird geladen…');
      try {
        if (!video.getAttribute('src') || Date.now() >= Number(video.dataset.signedUntil || 0)) {
          const url = await videoUrl(window.DarayaOffers.meta(row).video);
          if (!alive() || stamp !== mediaEpoch || current !== card || document.hidden || !isPublic(row)) return;
          video.src = url; video.dataset.signedUntil = String(Date.now() + 50000);
        }
        if (!alive() || stamp !== mediaEpoch || current !== card || document.hidden) return;
        await video.play();
        if (!alive() || current !== card || document.hidden || stamp !== mediaEpoch) { video.pause(); return; }
        button.textContent = t('⏸ إيقاف', '⏸ Pause', '⏸ Pause'); status.textContent = '';
      } catch { if (alive() && current === card) { status.textContent = manual ? t('تعذر تشغيل الفيديو؛ يمكنك قراءة العرض وزيارة المحل.', 'Could not play the video. You can read the offer and view the shop.', 'Video konnte nicht abgespielt werden. Du kannst das Angebot lesen und das Geschäft ansehen.') : ''; button.textContent = t('▶ تشغيل الفيديو', '▶ Play video', '▶ Video abspielen'); } }
    }
    function activate(card) {
      if (!alive() || !card || card.hidden || current === card) return;
      mediaEpoch++; current = card;
      track.querySelectorAll('video').forEach(v => { if (v !== card.querySelector('video')) release(v); });
      const cards = [...track.querySelectorAll('.offer-reel')].filter(c => !c.hidden), index = cards.indexOf(card);
      position.textContent = (index + 1) + ' / ' + cards.length;
      if (!navigator.connection?.saveData && !['2g', 'slow-2g'].includes(navigator.connection?.effectiveType) && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) play(card);
      if (index >= cards.length - 3 && !done) loadMore();
    }
    function bind(card) {
      const row = rows.find(o => o.id === card.dataset.reelId), video = card.querySelector('video');
      card.querySelector('[data-play-reel]')?.addEventListener('click', () => { current = card; if (video.paused) play(card, true); else { mediaEpoch++; video.pause(); card.querySelector('[data-play-reel]').textContent = t('▶ تشغيل الفيديو', '▶ Play video', '▶ Video abspielen'); } });
      card.querySelector('[data-reel-sound]')?.addEventListener('click', e => { video.muted = !video.muted; e.currentTarget.setAttribute('aria-pressed', String(!video.muted)); e.currentTarget.textContent = video.muted ? t('🔇 تشغيل الصوت', '🔇 Turn sound on', '🔇 Ton einschalten') : t('🔊 كتم الصوت', '🔊 Mute', '🔊 Stummschalten'); });
      card.querySelector('[data-share-reel]').onclick = async () => {
        const url = new URL(location.href); url.search = ''; url.hash = '#offers/' + row.id;
        try { if (navigator.share) await navigator.share({ title: row.title, text: window.DarayaOffers.meta(row).benefit, url: url.href }); else { await navigator.clipboard.writeText(url.href); toast(t('تم نسخ رابط العرض', 'Offer link copied', 'Angebotslink kopiert')); } } catch {}
      };
      video?.addEventListener('error', () => { card.querySelector('.reel-media-status').textContent = t('الفيديو غير متاح؛ تفاصيل العرض موجودة أدناه.', 'Video unavailable. Read the offer below.', 'Video nicht verfügbar. Lies das Angebot unten.'); });
      video?.addEventListener('waiting', () => { if(current===card)card.querySelector('.reel-media-status').textContent=t('جارٍ تحميل الفيديو؛ يمكنك قراءة العرض أثناء الانتظار.', 'Video is loading. You can read the offer while waiting.', 'Video wird geladen. Du kannst das Angebot inzwischen lesen.'); });
      video?.addEventListener('playing', () => { if(current===card)card.querySelector('.reel-media-status').textContent=''; });
    }
    async function loadMore() {
      if (!alive() || done || loading) return;
      loading = true;
      try {
        let q = api.from('daily_offers').select('*').eq('status', 'approved').gt('ends_at', new Date().toISOString()).order('created_at', { ascending: false }).order('id', { ascending: false }).range(page * 20, page * 20 + 19);
        if (following) q = q.in('store_id', following);
        const r = await q;
        if (!alive()) return;
        if (r.error) throw r.error;
        done = r.data.length < 20; page++;
        const fresh = r.data.filter(isPublic).filter(o => !rows.some(x => x.id === o.id)); rows.push(...fresh);
        if (page === 1 && !track.querySelector('.offer-reel')) track.innerHTML = '';
        for (const o of fresh) { track.insertAdjacentHTML('beforeend', markup(o)); const card = track.lastElementChild; bind(card); observer?.observe(card); }
        if (!rows.length && done) track.innerHTML = '<div class="reels-empty"><h2>' + t('أول العروض قريبًا', 'First offers coming soon', 'Die ersten Angebote kommen bald') + '</h2><p>' + t('يمكن لصاحب المحل إرسال فيديو أو صورة أو عرض مكتوب للمراجعة.', 'Shop owners can send a video, image or text offer for review.', 'Inhaber können ein Video, Bild oder Textangebot zur Prüfung senden.') + '</p><a class="button outline" href="#home">' + t('تصفح المحلات', 'Browse shops', 'Geschäfte ansehen') + '</a></div>';
        if (!current && rows.length) activate(track.querySelector('.offer-reel'));
        if (!fresh.length && !done) { loading = false; return loadMore(); }
      } catch {
        if (alive()) { const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = t('تعذر التحميل — أعد المحاولة', 'Could not load — retry', 'Laden fehlgeschlagen — erneut versuchen'); retry.onclick = () => { retry.remove(); loadMore(); }; track.append(retry); }
      } finally { loading = false; }
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
        const r = await api.from('daily_offers').select('*').eq('id', focus).eq('status', 'approved').gt('ends_at', new Date().toISOString()).maybeSingle();
        if (!alive()) return;
        if (!r.error && r.data && isPublic(r.data)) { rows.push(r.data); track.innerHTML = markup(r.data); bind(track.firstElementChild); observer?.observe(track.firstElementChild); activate(track.firstElementChild); }
        else track.innerHTML = '<p>' + t('انتهى هذا العرض أو لم يعد متاحًا.', 'This offer has ended or is unavailable.', 'Dieses Angebot ist abgelaufen oder nicht verfügbar.') + '</p>';
      } catch { if (alive()) track.innerHTML = '<p>' + t('تعذر تحميل العرض.', 'Could not load the offer.', 'Angebot konnte nicht geladen werden.') + '</p>'; }
    }
    await loadMore();
  }
  async function preview(media, title) {
    const uid = user?.id;
    modal('<section data-no-translate><h2>' + esc(title) + '</h2><video data-reel-preview controls playsinline preload="none"></video><p role="status">' + t('جاري تجهيز الفيديو…', 'Loading video…', 'Video wird geladen…') + '</p></section>');
    const video = document.querySelector('[data-reel-preview]'), host = video.parentElement;
    try { const url = await videoUrl(media); if (!video.isConnected || !document.querySelector('#modal').open || user?.id !== uid) return; video.src = url; host.querySelector('[role=status]').textContent = ''; }
    catch { if (host.isConnected) host.querySelector('[role=status]').textContent = t('الفيديو غير متاح.', 'Video unavailable.', 'Video nicht verfügbar.'); }
    document.querySelector('#modal').addEventListener('close', () => { video.pause(); video.removeAttribute('src'); video.load(); }, { once: true });
  }
  function decorate() {
    document.querySelectorAll('.shop-offer[data-offer-id]').forEach(card => {
      if (card.querySelector('[data-preview-reel]')) return;
      const media = card.dataset.videoPath;
      if (!validPath(media)) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'outline'; b.dataset.previewReel = '';
      b.textContent = t('▶ معاينة الفيديو', '▶ Preview video', '▶ Video ansehen'); b.onclick = () => preview({ path: media }, card.querySelector('h3')?.textContent || ''); card.prepend(b);
    });
  }
  window.DarayaReels = { render: renderFeed, ready, inspect, upload, remove, videoUrl, isPublic, validPath, preview, MAX_BYTES, MAX_SECONDS };
  window.addEventListener('hashchange', teardown, true);
  const baseRender = render; render = function() { const parts = location.hash.split('/'); if (parts[0] === '#offers' && parts[1]) return window.DarayaReels.render('all', parts[1]); return baseRender.apply(this, arguments); };
  new MutationObserver(decorate).observe(document.body, { childList: true, subtree: true });
  decorate();
})();
