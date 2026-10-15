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
    const item = link(raw); if(!item)return '';
    let embedded=false;try{embedded=typeof parsePlaceVideo==='function'&&parsePlaceVideo(item.url)?.kind==='embed';}catch{}
    return (embedded?'<button type="button" class="button" data-offer-play="'+esc(item.url)+'">'+t('▶ تشغيل الفيديو هنا','▶ Play video here','▶ Video hier abspielen')+'</button>':'')+'<a class="button outline" href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer">'+t('فتح على ','Open on ','Öffnen auf ')+esc(item.provider)+'</a>';
  }
  function clearExternal(card){card.querySelector('.reel-video-stage')?.remove();card.classList.remove('has-external-video');card.querySelectorAll('[data-offer-play]').forEach(b=>b.textContent=t('▶ تشغيل الفيديو هنا','▶ Play video here','▶ Video hier abspielen'));}
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-offer-play]');if(!b)return;
    const card=b.closest('.offer-reel,.shop-offer');if(!card)return;
    if(card.querySelector('.reel-video-stage')){clearExternal(card);return;}
    const item=link(b.dataset.offerPlay);if(!item)return;
    let info;try{info=parsePlaceVideo(item.url);}catch{return;}if(info?.kind!=='embed')return;
    const src=new URL(info.src);src.searchParams.set('autoplay',info.provider==='Facebook'?'true':'1');
    document.querySelectorAll('.offer-reel.has-external-video').forEach(other=>{if(other!==card)clearExternal(other);});
    const stage=document.createElement('div');stage.className='reel-video-stage';
    const frame=document.createElement('iframe');frame.src=src.href;frame.title=card.querySelector('h2,h3')?.textContent||t('فيديو العرض','Offer video','Angebotsvideo');frame.allow='autoplay; fullscreen; picture-in-picture; encrypted-media';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';stage.append(frame);const media=card.querySelector('.reel-photo,.reel-text-art');if(media)media.before(stage);else card.prepend(stage);card.classList.add('has-external-video');card.querySelectorAll('[data-offer-play]').forEach(button=>button.textContent=t('⏹ إيقاف الفيديو','⏹ Stop video','⏹ Video stoppen'));
  });
  function shopGroups(cards){const result=[],byId=new Map();for(const card of cards){const id=card.dataset.storeId;if(!byId.has(id)){const group={id,cards:[]};byId.set(id,group);result.push(group);}byId.get(id).cards.push(card);}return result;}
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
    let media = kind === 'text' ? '<div class="reel-text-art" aria-hidden="true">🏷️</div>' : '<img class="reel-photo" src="' + esc(thumbnailForImage(poster(o))) + '" alt="' + esc(o.title) + '" loading="lazy" decoding="async">';
    if(link(m.video_link)){const links=linkMarkup(m.video_link),buttonEnd=links.indexOf('</button>');const launch=buttonEnd>=0?links.slice(0,buttonEnd+9):links;media='<div class="reel-media">'+media+'<div class="reel-media-launch">'+launch+'</div><span class="reel-video-label">'+t('عرض مع فيديو','Video offer','Angebot mit Video')+'</span></div>';}
    const logo=safeImage(o.demo?o.shop_logo:storeCover(s));
    const identity='<a class="reel-identity" href="'+esc(route)+'">'+(logo?'<img class="reel-shop-logo" src="'+esc(thumbnailForImage(logo))+'" alt="'+esc(s.name)+'" loading="lazy" decoding="async">':'<span class="reel-shop-logo reel-logo-fallback" aria-hidden="true">🏪</span>')+'<span><small>'+t('المحل','Shop','Geschäft')+'</small><strong>'+esc(s.name)+'</strong></span></a>';
    return '<article class="offer-reel offer-reel-' + kind + '" data-no-translate data-publisher="' + esc(o.user_id) + '" data-store-id="' + esc(o.store_id) + '" data-reel-id="' + esc(o.id) + '">' + identity + media + '<div class="reel-copy">' + (o.demo ? '<strong class="reel-demo-note">'+t('عرض تجريبي — غير متاح للشراء','Demo offer — not for sale','Beispielangebot — nicht kaufbar')+'</strong>' : '') + (kind==='text'?'<span class="reel-format-label">'+t('عرض نصي','Text offer','Textangebot')+'</span>':'') + (window.DarayaOfferTools?.badges(o)||'') + '<h2>' + esc(o.title) + '</h2><p class="reel-benefit">' + esc(m.benefit) + '</p>' + (o.price == null ? '' : '<p class="reel-price">' + (m.original == null ? '' : '<del>' + money(m.original) + '</del> ') + '<strong>' + money(o.price) + '</strong></p>') + (window.DarayaOfferTools?.savings(o)||'') + '<div class="reel-details"><p>'+esc(m.terms)+'</p><p class="reel-address">'+esc(o.address)+'</p></div><small>' + t('ينتهي: ', 'Ends: ', 'Endet: ') + esc(communityDate(o.ends_at)) + '</small>' + (window.DarayaOfferTools?.contactLinks(o,s)||'') + '<div class="reel-actions">' + (window.DarayaOfferTools?.savedButton(o)||'') + linkMarkup(m.video_link) + '<a class="button" href="' + esc(route) + '">' + t('زيارة المحل', 'View shop', 'Geschäft ansehen') + '</a><button type="button" data-share-reel>' + t('مشاركة', 'Share', 'Teilen') + '</button>' + (o.demo?'':'<button type="button" class="outline" data-offer-report="' + esc(o.id) + '">' + t('إبلاغ', 'Report', 'Melden') + '</button>') + '</div></div></article>';
  }
  function teardown() { epoch++; stop(); stop = () => {}; }
  async function renderFeed(mode = 'all', focus = '') {
    teardown(); const token = epoch, uid = user?.id;
    communityPublicHeader();
    const app = document.querySelector('#app'); app.classList.remove('professional-home');
    app.innerHTML = '<section class="offers-reels-page" data-no-translate><header class="reels-heading"><a class="button outline" href="#home">' + t('الرئيسية', 'Home', 'Startseite') + '</a><h1>' + t('عروض اليوم', 'Today’s offers', 'Heutige Angebote') + '</h1><button type="button" data-post-reel>' + t('＋ أضف عرضًا', '＋ Add offer', '＋ Angebot hinzufügen') + '</button></header><nav class="reels-tabs"><a href="#offers" aria-current="' + (mode === 'all' ? 'page' : 'false') + '">' + t('كل العروض', 'All offers', 'Alle Angebote') + '</a><a href="#followed-offers" aria-current="' + (mode === 'following' ? 'page' : 'false') + '">' + t('محلات أتابعها', 'Shops I follow', 'Abonnierte Geschäfte') + '</a><a class="offer-saved-link" href="#saved-offers">' + t('♥ العروض المحفوظة','♥ Saved offers','♥ Gemerkte Angebote') + '</a></nav><div class="offer-shop-summary" data-shop-summary></div><p class="reels-hint">' + t('اسحب للأعلى لرؤية بقية عروض المحل، ويمينًا أو يسارًا للانتقال إلى محل آخر. العروض متاحة للجميع.', 'Scroll down for more offers from this shop. Swipe left or right for another shop. Offers are open to everyone.', 'Scrolle nach unten für weitere Angebote dieses Geschäfts. Wische seitlich zum nächsten Geschäft. Angebote gelten für alle.') + '</p><div class="offer-reels-track" tabindex="0" aria-label="' + t('تصفح العروض', 'Browse offers', 'Angebote ansehen') + '"><p role="status">' + t('جاري تحميل العروض…', 'Loading offers…', 'Angebote werden geladen…') + '</p></div><div class="reels-navigation"><button type="button" data-reel-prev>' + t('المحل السابق →', 'Previous shop →', 'Vorheriges Geschäft →') + '</button><span data-reel-position></span><button type="button" data-reel-next>' + t('← المحل التالي', '← Next shop', '← Nächstes Geschäft') + '</button></div></section>';
    app.querySelector('[data-post-reel]').onclick = () => window.DarayaOffers.edit();
    const track = app.querySelector('.offer-reels-track'), position = app.querySelector('[data-reel-position]');
    window.DarayaOfferTools?.guide(track);
    const viewObserver=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting&&(e.intersectionRatio>=.15||e.intersectionRect.height>=120)){const row=rows.find(o=>o.id===e.target.dataset.reelId);if(row&&isPublic(row))window.DarayaOfferTools?.record(row,'view');}},{threshold:[0,.15,.5]});
    const alive = () => token === epoch && track.isConnected && uid === user?.id;
    const demos=mode==='all'?(window.DarayaDemoOfferCatalog?.()||[]).filter(isPublic):[];
    let page = 0, done = false, loading = false, rows = [], following = null, current = null, mediaEpoch = 0, observer, expiryTimer;
    const release = video => { video.pause(); video.removeAttribute('src'); video.load(); };
    stop = () => { mediaEpoch++; observer?.disconnect();viewObserver?.disconnect(); clearInterval(expiryTimer); track.querySelectorAll('video').forEach(release);track.querySelectorAll('.has-external-video').forEach(clearExternal); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('daraya-blocks-changed', checkExpiry); };
    function visibility() { if (document.hidden) { track.querySelectorAll('.has-external-video').forEach(clearExternal);mediaEpoch++; track.querySelectorAll('video').forEach(v => v.pause()); } }
    document.addEventListener('visibilitychange', visibility);
    if (mode === 'following') {
      if (!user) { track.innerHTML = '<p>' + t('سجل الدخول لرؤية عروض المحلات التي تتابعها.', 'Sign in to see offers from shops you follow.', 'Melde dich an, um Angebote abonnierter Geschäfte zu sehen.') + '</p><a class="button" href="#account">' + t('تسجيل الدخول', 'Sign in', 'Anmelden') + '</a>'; return; }
      try { const f = await api.from('customer_favorites').select('store_id').eq('user_id', uid); if (f.error) throw f.error; following = f.data.map(x => x.store_id); }
      catch { if (alive()) track.innerHTML = '<p>' + t('تعذر تحميل المحلات. حاول مجددًا.', 'Could not load shops. Try again.', 'Geschäfte konnten nicht geladen werden. Versuche es erneut.') + '</p>'; return; }
      if (!alive()) return;
      if (!following.length) { track.innerHTML = '<p>' + t('احفظ محلًا من صفحته لتظهر عروضه هنا.', 'Save a shop from its page to see its offers here.', 'Speichere ein Geschäft auf seiner Seite, um Angebote hier zu sehen.') + '</p>'; return; }
    }
    function groups(){return shopGroups([...track.querySelectorAll('.offer-reel')].filter(c=>!c.hidden));}
    function activate(card,refresh=false) {
      if(!alive()||!card||card.hidden||current===card&&!refresh)return;
      const previousShop=current?.dataset.storeId,shopId=card.dataset.storeId;mediaEpoch++;
      track.querySelectorAll('.offer-reel').forEach(c=>{const same=c.dataset.storeId===shopId&&!c.hidden;c.classList.toggle('reel-current',same);if(!same)clearExternal(c);});
      current=card;
      const all=groups(),index=all.findIndex(g=>g.id===shopId),selected=all[index];if(!selected)return;
      const groupRows=selected.cards.map(c=>rows.find(o=>o.id===c.dataset.reelId)).filter(Boolean),sample=groupRows[0],shop=sample?.demo?{demo:true,name:sample.shop_name}:stores.find(s=>s.id===shopId);
      const summary=app.querySelector('[data-shop-summary]');if(shop&&summary)summary.innerHTML='<span>'+esc(shop.name)+'</span><p>'+(window.DarayaOfferTools?.summary(shop,groupRows)||'')+'</p>';
      position.textContent=t('المحل ','Shop ','Geschäft ')+(index+1)+' / '+all.length;
      selected.cards.forEach((c,i)=>{let badge=c.querySelector('.reel-step-badge');if(!badge){badge=document.createElement('span');badge.className='reel-step-badge';c.append(badge);}badge.textContent=t('العرض ','Offer ','Angebot ')+(i+1)+' / '+selected.cards.length;});
      app.querySelector('[data-reel-prev]').disabled=index<=0;
      app.querySelector('[data-reel-next]').disabled=done&&index>=all.length-1;
      if(index>=all.length-3&&!done)loadMore();
      if(previousShop!==shopId&&!done)loadShop(shopId);
    }
    function bind(card) {
      const row = rows.find(o => o.id === card.dataset.reelId);
      window.DarayaOfferTools?.bind(card,row);viewObserver?.observe(card);
      card.querySelector('[data-share-reel]').onclick = async () => {
        const url = new URL(location.href); url.search = ''; url.hash = '#offers/' + row.id;
        try { if (navigator.share) await navigator.share({ title: row.title, text: window.DarayaOffers.meta(row).benefit, url: url.href }); else { await navigator.clipboard.writeText(url.href); toast(t('تم نسخ رابط العرض', 'Offer link copied', 'Angebotslink kopiert')); } } catch {}
      };
    }
    const loadedShops=new Set();let shopController=null;
    async function loadShop(id){
      if(id.startsWith('demo-')||loadedShops.has(id))return;
      shopController?.abort();const controller=new AbortController();shopController=controller;
      const timer=setTimeout(()=>controller.abort(),20000);
      try{
        for(let offset=0;alive()&&!controller.signal.aborted;offset+=30){
          const r=await api.from('daily_offers').select('*').eq('store_id',id).eq('status','approved').gt('ends_at',new Date().toISOString()).order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+29).abortSignal(controller.signal);
          if(!alive()||controller.signal.aborted)return;if(r.error)throw r.error;
          const fresh=r.data.filter(isPublic).filter(o=>!rows.some(x=>x.id===o.id));rows.push(...fresh);
          for(const o of fresh){track.insertAdjacentHTML('beforeend',markup(o));bind(track.lastElementChild);}
          if(current?.dataset.storeId===id)activate(current,true);
          if(r.data.length<30){loadedShops.add(id);break;}
        }
      }catch{if(alive()&&!controller.signal.aborted)toast(t('تعذر تحميل بقية عروض المحل. افتح المحل مجددًا للمحاولة.','Could not load all shop offers. Open the shop again to retry.','Weitere Angebote konnten nicht geladen werden. Öffne das Geschäft erneut.'));}
      finally{clearTimeout(timer);}
    }
    let requestController=null;
    const stopFeed=stop; stop=()=>{requestController?.abort();shopController?.abort();stopFeed();};
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
        if(rows.length)activate(current||track.querySelector('.offer-reel'),true);
        if (!fresh.length && !done) { loading = false; return loadMore(); }
      } catch {
        if (alive()) { const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = t('تعذر التحميل — أعد المحاولة', 'Could not load — retry', 'Laden fehlgeschlagen — erneut versuchen'); retry.onclick = () => { retry.remove(); loadMore(); }; track.append(retry); }
      } finally { clearTimeout(requestTimeout);loading = false; }
    }
    function move(delta) {
      const all=groups(),index=Math.max(0,all.findIndex(g=>g.id===current?.dataset.storeId));
      const next=all[Math.max(0,Math.min(all.length-1,index+delta))]?.cards[0];
      if(next&&next.dataset.storeId!==current?.dataset.storeId){track.dataset.direction=delta>0?'next':'prev';activate(next);next.scrollIntoView({behavior:'auto',block:'start'});}
    }
    app.querySelector('[data-reel-prev]').onclick=()=>move(-1);app.querySelector('[data-reel-next]').onclick=()=>move(1);
    track.addEventListener('keydown',e=>{if(e.target!==track)return;if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const rtl=getComputedStyle(track).direction==='rtl';move((e.key==='ArrowLeft')===rtl?1:-1);}});
    let touchStart=null;
    track.addEventListener('touchstart',e=>{if(e.touches.length===1)touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});
    track.addEventListener('touchend',e=>{if(!touchStart)return;const end=e.changedTouches[0],dx=end.clientX-touchStart.x,dy=end.clientY-touchStart.y;touchStart=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4){const rtl=getComputedStyle(track).direction==='rtl';move((dx<0)===rtl?1:-1);}},{passive:true});
    function checkExpiry() {
      if (!alive()) return teardown();
      track.querySelectorAll('.offer-reel').forEach(card => {
        const row = rows.find(o => o.id === card.dataset.reelId);
        if (!row || !isPublic(row)) {
          clearExternal(card);card.querySelectorAll('video').forEach(release); card.hidden = true;
          if(card===current){const same=[...track.querySelectorAll('.offer-reel')].find(c=>!c.hidden&&c.dataset.storeId===card.dataset.storeId);current=null;activate(same||[...track.querySelectorAll('.offer-reel')].find(c=>!c.hidden));}
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
      activate(current||track.querySelector('.offer-reel'),true);
    }
    await loadMore();
  }
  window.DarayaReels = { render: renderFeed, isPublic, link, linkMarkup, shopGroups };
  // Run after the existing route listeners. Cleanup must never cancel a newly rendered feed.
  window.addEventListener('hashchange',()=>{const parts=location.hash.split('/');if(parts[0]==='#offers')renderFeed('all',parts[1]||'');else if(parts[0]==='#followed-offers')renderFeed('following');else teardown();});
  const baseRender = render; render = function() { const parts = location.hash.split('/'); if (parts[0] === '#offers' && parts[1]) return window.DarayaReels.render('all', parts[1]); return baseRender.apply(this, arguments); };
})();
