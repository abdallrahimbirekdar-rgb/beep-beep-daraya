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
    const facebook=item.provider==='Facebook',providerName=facebook?t('فيسبوك','Facebook','Facebook'):item.provider,icon=facebook?'<svg class="offer-facebook-icon" aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.03 1.8-4.7 4.54-4.7 1.31 0 2.69.24 2.69.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z"/></svg>':'';
    return (embedded?'<button type="button" class="button" data-offer-play="'+esc(item.url)+'">'+t('تشغيل الفيديو هنا','Play video here','Video hier abspielen')+'</button>':'')+'<a class="button outline offer-provider-link'+(facebook?' offer-provider-facebook':'')+'" href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer">'+icon+'<span>'+t('افتح على ','Open on ','Öffnen auf ')+esc(providerName)+'</span></a>';
  }
  function clearExternal(card){card.querySelector('.reel-video-stage')?.remove();card.classList.remove('has-external-video');card.querySelectorAll('[data-offer-play]').forEach(b=>b.textContent=t('تشغيل الفيديو هنا','Play video here','Video hier abspielen'));}
  document.addEventListener('click',e=>{
    const add=e.target.closest?.('[data-post-reel]');if(add){e.preventDefault();window.DarayaOffers.edit();return;}
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
    if(window.DarayaOfferDisplay&&!window.DarayaOfferDisplay.visible(o))return false;
    const m = window.DarayaOffers?.meta(o), s = stores.find(s => s.id === o.store_id);
    return !!s && window.DarayaOffers?.eligible(s) && o.status === 'approved' && Date.parse(o.ends_at) > Date.now() && !m.exclusive && !window.DarayaShopModeration?.isBlocked(s.id) && !window.DarayaPublisherModeration?.isBlocked(o.user_id);
  }
  function posterSources(o) {
    const m=window.DarayaOffers.meta(o),s=stores.find(s=>s.id===o.store_id);
    const cover=o.demo?o.shop_logo:storeCover(s||{}),raw=link(m.video_link)&&!['product','upload'].includes(m.poster_source)?[cover,m.image]:[m.image,cover];
    const urls=[];
    for(const value of raw){if(typeof value!=='string'||!value.trim()||['null','undefined'].includes(value))continue;const url=safeImage(value);if(url)urls.push(thumbnailForImage(url),url);}
    urls.push(new URL('images/services/generic.svg',location.href).href);
    return [...new Set(urls.filter(Boolean))];
  }
  document.addEventListener('error',e=>{
    const img=e.target;if(!img?.matches?.('img[data-offer-poster]'))return;
    let remaining;try{remaining=JSON.parse(img.dataset.offerPoster);}catch{remaining=[];}
    const next=remaining.shift();img.dataset.offerPoster=JSON.stringify(remaining);
    if(next)img.src=next;else img.hidden=true;
  },true);
  function markup(o,display=window.DarayaOfferDisplay) {
    const m = window.DarayaOffers.meta(o), s = o.demo ? {id:o.store_id,name:o.shop_name} : stores.find(s => s.id === o.store_id), route=o.demo?o.shop_route:'#store/'+s.id, kind = m.kind === 'text' ? 'text' : 'image';
    const video=link(m.video_link),sources=kind!=='text'||video?posterSources(o):[];
    let media = kind === 'text'&&!video ? '<div class="reel-text-art" aria-hidden="true">🏷️</div>' : '<img class="reel-photo" src="' + esc(sources[0]) + '" data-offer-poster="'+esc(JSON.stringify(sources.slice(1)))+'" alt="' + esc(o.title) + '" loading="lazy" decoding="async">';
    if(link(m.video_link)){const links=linkMarkup(m.video_link),buttonEnd=links.indexOf('</button>');const launch=buttonEnd>=0?links.slice(0,buttonEnd+9):links;media='<div class="reel-media">'+media+'<div class="reel-media-launch">'+launch+'</div><span class="reel-video-label">'+t('عرض مع فيديو','Video offer','Angebot mit Video')+'</span></div>';}
    const original=Number(m.original),price=Number(o.price),discount=m.original!=null&&o.price!=null&&original>price&&price>=0?Math.round((original-price)/original*100):0;
    if(kind!=='text'||link(m.video_link))media='<div class="reel-visual">'+media+(discount>0?'<span class="offer-discount">'+t('خصم ','Save ','Rabatt ')+discount.toLocaleString(communityLang())+'%</span>':'')+'</div>';
    const logo=safeImage(o.demo?o.shop_logo:storeCover(s));
    const identity='<a class="reel-identity" href="'+esc(route)+'">'+(logo?'<img class="reel-shop-logo" src="'+esc(thumbnailForImage(logo))+'" alt="'+esc(s.name)+'" loading="lazy" decoding="async">':'<span class="reel-shop-logo reel-logo-fallback" aria-hidden="true">🏪</span>')+'<span><small>'+t('المحل','Shop','Geschäft')+'</small><strong>'+esc(s.name)+'</strong></span></a>';
    return '<article class="offer-reel offer-reel-' + kind + ' offer-tier-'+(display?.tier(o)||'normal')+'" data-no-translate data-publisher="' + esc(o.user_id) + '" data-store-id="' + esc(o.store_id) + '" data-reel-id="' + esc(o.id) + '">' + identity + (o.demo ? '<strong class="reel-demo-note reel-demo-banner">'+t('عرض تجريبي — غير متاح للشراء','Demo offer — not for sale','Beispielangebot — nicht kaufbar')+'</strong>' : '') + (display?.badge(o)||'') + media + '<div class="reel-copy">' + (kind==='text'?'<span class="reel-format-label">'+t('عرض نصي','Text offer','Textangebot')+'</span>':'') + (window.DarayaOfferTools?.badges(o)||'') + '<h2>' + esc(o.title) + '</h2><p class="reel-benefit">' + esc(m.benefit) + '</p>' + '<div class="offer-price-panel">' + (o.price == null ? '' : '<p class="reel-price">' + (m.original == null ? '' : '<del>' + money(m.original) + '</del> ') + '<strong>' + money(o.price) + '</strong></p>') + (window.DarayaOfferTools?.savings(o)||'') + (window.DarayaOfferTools?.contactLinks(o,s)||'') + '</div>' + (window.DarayaOfferTools?.availability(o)||'') + (window.DarayaOfferTools?.details(o)||'') + (window.DarayaOfferTools?.countdown(o)||'') + (window.DarayaOfferTools?.contactLinks(o,s,true)||'') + '<div class="reel-actions">' + (window.DarayaOfferTools?.savedButton(o)||'') + linkMarkup(m.video_link) + '<a class="button" href="' + esc(route) + '">' + t('زيارة المحل', 'View shop', 'Geschäft ansehen') + '</a><button type="button" data-share-reel>' + t('مشاركة', 'Share', 'Teilen') + '</button><button type="button" data-offer-share-image>'+t('بطاقة للمشاركة','Share image','Bild zum Teilen')+'</button>' + (o.demo?'':'<button type="button" class="outline" data-offer-report="' + esc(o.id) + '">' + t('إبلاغ', 'Report', 'Melden') + '</button>') + '</div></div></article>';
  }
  function teardown() { epoch++; stop(); stop = () => {}; }
  async function renderFeed(mode = 'all', focus = '') {
    const examples = mode === 'all' && (focus === 'examples' || focus.startsWith('demo-'));
    if (focus === 'examples') focus = '';
    teardown(); const token = epoch, uid = user?.id;
    document.querySelector('#app').innerHTML='<p role="status" data-no-translate>'+t('جاري تحميل العروض…','Loading offers…','Angebote werden geladen…')+'</p>';
    await window.DarayaOfferDisplay?.load();if(token!==epoch||uid!==user?.id)return;
    communityPublicHeader();
    const app = document.querySelector('#app'); app.classList.remove('professional-home');
    app.innerHTML = '<section class="offers-reels-page" data-no-translate><header class="reels-heading"><a class="button outline" href="#home">' + t('الرئيسية', 'Home', 'Startseite') + '</a><div class="reels-heading-copy"><span>'+t('عروض من محلات مدينتك','Offers from local shops','Angebote lokaler Geschäfte')+'</span><h1>' + t('عروض اليوم', 'Today’s offers', 'Heutige Angebote') + '</h1></div><button type="button" data-post-reel>' + t('＋ أضف عرضًا', '＋ Add offer', '＋ Angebot hinzufügen') + '</button></header>' + (window.DarayaOfferTools?.nav(mode)||'') + '<div class="offer-shop-summary" data-shop-summary></div><p class="reels-hint">' + t('اسحب للأعلى لرؤية بقية عروض المحل، ويمينًا أو يسارًا للانتقال إلى محل آخر. العروض متاحة للجميع.', 'Scroll down for more offers from this shop. Swipe left or right for another shop. Offers are open to everyone.', 'Scrolle nach unten für weitere Angebote dieses Geschäfts. Wische seitlich zum nächsten Geschäft. Angebote gelten für alle.') + '</p><div class="offer-reels-track" tabindex="0" aria-label="' + t('تصفح العروض', 'Browse offers', 'Angebote ansehen') + '"><p role="status">' + t('جاري تحميل العروض…', 'Loading offers…', 'Angebote werden geladen…') + '</p></div><div class="reels-navigation"><button type="button" data-reel-prev>' + t('المحل السابق →', 'Previous shop →', 'Vorheriges Geschäft →') + '</button><span data-reel-position></span><button type="button" data-reel-next>' + t('← المحل التالي', '← Next shop', '← Nächstes Geschäft') + '</button></div></section>';
    const track = app.querySelector('.offer-reels-track'), position = app.querySelector('[data-reel-position]');
    if (examples) {
      app.querySelector('h1').textContent=t('أمثلة على عروض اليوم','Example daily offers','Beispiele für Tagesangebote');
      app.querySelector('.reels-heading-copy > span').textContent=t('للتوضيح فقط — غير متاحة للشراء','For display only — not for sale','Nur zur Veranschaulichung — nicht kaufbar');
      app.querySelector('.reels-heading > a').href='#offers';
      app.querySelector('.reels-heading > a').textContent=t('العودة إلى عروض اليوم','Back to today’s offers','Zurück zu heutigen Angeboten');
    }
    const dots=document.createElement('nav');dots.className='offer-shop-dots';dots.setAttribute('aria-label',t('اختيار المحل','Choose shop','Geschäft wählen'));app.querySelector('.reels-hint').before(dots);
    const edges=document.createElement('div');edges.className='offer-edge-navigation';edges.setAttribute('aria-hidden','true');
    edges.innerHTML='<div class="offer-edge-side" data-edge-prev hidden></div><div class="offer-edge-side" data-edge-next hidden></div><div class="offer-edge-up" data-edge-up hidden>↑</div><div class="offer-edge-down" data-edge-down hidden>↓</div>';
    app.querySelector('.offers-reels-page').append(edges);
    let edgeFrame=0,nextOfferCard=null;
    const queueEdges=()=>{if(!edgeFrame)edgeFrame=requestAnimationFrame(()=>{edgeFrame=0;updateEdges();});};
    window.addEventListener('scroll',queueEdges,{passive:true});window.addEventListener('resize',queueEdges,{passive:true});
    const viewObserver=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting&&(e.intersectionRatio>=.15||e.intersectionRect.height>=120)){const row=rows.find(o=>o.id===e.target.dataset.reelId);if(row&&isPublic(row))window.DarayaOfferTools?.record(row,'view');}},{threshold:[0,.15,.5]});
    const alive = () => token === epoch && track.isConnected && uid === user?.id;
    const demos=examples?(window.DarayaDemoOfferCatalog?.()||[]).filter(isPublic):[];
    let page = 0, done = examples, loading = false, rows = [], following = null, current = null, mediaEpoch = 0, observer, expiryTimer;
    const release = video => { video.pause(); video.removeAttribute('src'); video.load(); };
    stop = () => { window.removeEventListener('scroll',queueEdges);window.removeEventListener('resize',queueEdges);cancelAnimationFrame(edgeFrame);edges.remove();mediaEpoch++; observer?.disconnect();viewObserver?.disconnect(); clearInterval(expiryTimer); track.querySelectorAll('video').forEach(release);track.querySelectorAll('.has-external-video').forEach(clearExternal); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('daraya-blocks-changed', checkExpiry); };
    function visibility() { if (document.hidden) { track.querySelectorAll('.has-external-video').forEach(clearExternal);mediaEpoch++; track.querySelectorAll('video').forEach(v => v.pause()); } }
    document.addEventListener('visibilitychange', visibility);
    if (mode === 'following') {
      if (!user) { track.innerHTML = '<p>' + t('سجل الدخول لرؤية عروض المحلات التي تتابعها.', 'Sign in to see offers from shops you follow.', 'Melde dich an, um Angebote abonnierter Geschäfte zu sehen.') + '</p><a class="button" href="#account">' + t('تسجيل الدخول', 'Sign in', 'Anmelden') + '</a>'; return; }
      try { const f = await api.from('customer_favorites').select('store_id').eq('user_id', uid); if (f.error) throw f.error; following = f.data.map(x => x.store_id); }
      catch { if (alive()) track.innerHTML = '<p>' + t('تعذر تحميل المحلات. حاول مجددًا.', 'Could not load shops. Try again.', 'Geschäfte konnten nicht geladen werden. Versuche es erneut.') + '</p>'; return; }
      if (!alive()) return;
      if (!following.length) { track.innerHTML = '<p>' + t('احفظ محلًا من صفحته لتظهر عروضه هنا.', 'Save a shop from its page to see its offers here.', 'Speichere ein Geschäft auf seiner Seite, um Angebote hier zu sehen.') + '</p>'; return; }
    }
    let initialMobileOfferAligned=false;
    function groups(){const all=shopGroups([...track.querySelectorAll('.offer-reel')].filter(c=>!c.hidden));return window.DarayaOfferDisplay?.ready?window.DarayaOfferDisplay.orderGroups(all,rows):all;}
    function orderCards(){
      const desired=groups().flatMap(g=>g.cards),actual=[...track.querySelectorAll('.offer-reel')].filter(c=>!c.hidden);
      if(desired.every((card,i)=>card===actual[i])||track.querySelector('.has-external-video'))return;
      const anchor=current&&actual.find(c=>c.classList.contains('reel-current')&&c.getBoundingClientRect().bottom>0),top=anchor?.getBoundingClientRect().top;
      for(const card of desired)track.append(card);
      if(anchor&&Number.isFinite(top)){const delta=anchor.getBoundingClientRect().top-top;if(Math.abs(delta)>1)window.scrollBy(0,delta);}
    }
    let displayRefresh=false;
    function refreshDisplay(){
      const display=window.DarayaOfferDisplay;if(!display)return;
      track.querySelectorAll('.offer-reel').forEach(card=>{const row=rows.find(o=>o.id===card.dataset.reelId);if(!row)return;const level=display.tier(row);card.classList.toggle('offer-tier-gold',level==='gold');card.classList.toggle('offer-tier-diamond',level==='diamond');const banner=card.querySelector('.offer-level-banner'),html=display.badge(row);if(banner?.outerHTML!==html){banner?.remove();if(html)card.querySelector('.reel-identity')?.insertAdjacentHTML('afterend',html);}});
      if(!displayRefresh){displayRefresh=true;display.load().then(()=>{if(alive()){checkExpiry();orderCards();if(current)activate(current,true);}}).finally(()=>displayRefresh=false);}
    }
    function updateEdges(){
      if(!alive())return;
      const all=groups(),index=all.findIndex(g=>g.id===current?.dataset.storeId),selected=all[index];
      const bounds=track.getBoundingClientRect(),height=window.innerHeight;
      const visible=!!selected&&bounds.top<height*.85&&bounds.bottom>height*.25;
      const rtl=getComputedStyle(track).direction==='rtl';
      for(const [key,delta] of [['prev',-1],['next',1]]){
        const button=edges.querySelector('[data-edge-'+key+']'),target=all[index+delta];
        button.hidden=!visible||!target;if(!target)continue;
        const right=(delta>0)===rtl;
        button.classList.toggle('edge-right',right);button.classList.toggle('edge-left',!right);
        const name=target.cards[0].querySelector('.reel-identity strong')?.textContent||'';
        const label=t('اسحب','Swipe','Wischen');
        const cue=(right?'right:':'left:')+label;
        if(button.dataset.cue!==cue){button.dataset.cue=cue;button.innerHTML='<span aria-hidden="true">'+(right?'›':'‹')+'</span><small>'+label+'</small>';}
        const title=label+' — '+name;if(button.title!==title)button.title=title;
      }
      nextOfferCard=null;let previousOfferCard=null;
      if(selected){let shown=0;selected.cards.forEach((c,i)=>{if(c.getBoundingClientRect().top<=height*.35)shown=i;});nextOfferCard=selected.cards[shown+1]||null;previousOfferCard=selected.cards[shown-1]||null;}
      edges.querySelector('[data-edge-down]').hidden=!visible||!nextOfferCard;
      edges.querySelector('[data-edge-up]').hidden=!visible||!previousOfferCard;
      const nav=document.querySelector('#mobile-navigation'),navBounds=nav?.getBoundingClientRect();
      edges.style.setProperty('--offer-edge-bottom',(navBounds&&navBounds.height&&navBounds.top<height?height-navBounds.top+10:18)+'px');
    }
    function alignCard(card){
      if(!alive()||!card||card.hidden)return;
      // Scroll only the page, never the clipped horizontal offer container.
      const margin=parseFloat(getComputedStyle(card).scrollMarginTop)||12;
      window.scrollTo({left:window.scrollX,top:Math.max(0,window.scrollY+card.getBoundingClientRect().top-margin),behavior:'instant'});
    }
    function activate(card,refresh=false) {
      if(!alive()||!card||card.hidden||current===card&&!refresh)return;
      const previousShop=current?.dataset.storeId,shopId=card.dataset.storeId;mediaEpoch++;
      track.querySelectorAll('.offer-reel').forEach(c=>{const same=c.dataset.storeId===shopId&&!c.hidden;c.classList.toggle('reel-current',same);if(!same&&c.classList.contains('has-external-video'))clearExternal(c);});
      current=card;
      // Open mobile browsing at the same card position used by shop navigation.
      // Only align once: later loads and countdown updates must not move the reader.
      if(!initialMobileOfferAligned&&matchMedia('(max-width: 767px)').matches){
        initialMobileOfferAligned=true;
        requestAnimationFrame(()=>requestAnimationFrame(()=>{
          if(alive()&&current===card&&!card.hidden)alignCard(card);
        }));
      }
      const all=groups(),index=all.findIndex(g=>g.id===shopId),selected=all[index];if(!selected)return;
      const groupRows=selected.cards.map(c=>rows.find(o=>o.id===c.dataset.reelId)).filter(Boolean),sample=groupRows[0],shop=sample?.demo?{demo:true,name:sample.shop_name}:stores.find(s=>s.id===shopId);
      const summary=app.querySelector('[data-shop-summary]');if(shop&&summary){const html='<span>'+esc(shop.name)+'</span><p>'+(window.DarayaOfferTools?.summary(shop,groupRows)||'')+'</p>';if(summary.innerHTML!==html)summary.innerHTML=html;}
      position.textContent=t('المحل ','Shop ','Geschäft ')+(index+1)+' / '+all.length;
      const hint=app.querySelector('.reels-hint');hint.textContent=t('لهذا المحل '+selected.cards.length+' عروض — انزل لرؤيتها. اسحب جانبيًا لتغيير المحل.','This shop has '+selected.cards.length+' offers — scroll down to see them. Swipe sideways to change shops.','Dieses Geschäft hat '+selected.cards.length+' Angebote — scrolle nach unten. Seitlich zum nächsten Geschäft wischen.');
      const dotsMarkup=all.map((g,i)=>'<button type="button" data-shop-dot="'+i+'" aria-label="'+esc(t('المحل ','Shop ','Geschäft ')+(i+1))+'" aria-current="'+(i===index?'true':'false')+'"><span aria-hidden="true"></span><span class="offer-shop-chip-label">'+esc(stores.find(s=>s.id===g.id)?.name||rows.find(o=>o.store_id===g.id)?.shop_name||t('المحل ','Shop ','Geschäft ')+(i+1))+'</span></button>').join('');
      if(dots.innerHTML!==dotsMarkup)dots.innerHTML=dotsMarkup;
      dots.querySelectorAll('button').forEach(b=>b.onclick=()=>{const next=all[Number(b.dataset.shopDot)]?.cards[0];if(next){activate(next);alignCard(next);}});

      selected.cards.forEach((c,i)=>{let badge=c.querySelector('.reel-step-badge');if(!badge){badge=document.createElement('span');badge.className='reel-step-badge';c.append(badge);}badge.textContent=t('العرض ','Offer ','Angebot ')+(i+1)+' / '+selected.cards.length;});
      app.querySelector('[data-reel-prev]').disabled=index<=0;
      app.querySelector('[data-reel-next]').disabled=done&&index>=all.length-1;
      if(index>=all.length-3&&!done)loadMore();
      queueEdges();
      window.DarayaOfferTools?.updateCountdown(track);
      if(previousShop!==shopId&&!done)loadShop(shopId);
    }
    function bind(card) {
      const row = rows.find(o => o.id === card.dataset.reelId);
      const actions=card.querySelector('.reel-actions'),secondary=[...card.querySelectorAll('[data-share-reel],[data-offer-share-image],[data-offer-report]')];
      if(actions&&secondary.length){const tools=document.createElement('details'),summary=document.createElement('summary'),body=document.createElement('div');tools.className='offer-card-tools';summary.textContent=t('مشاركة والمزيد','Share & more','Teilen & mehr');body.append(...secondary);tools.append(summary,body);actions.append(tools);}
      window.DarayaOfferTools?.bind(card,row);viewObserver?.observe(card);
      card.querySelector('[data-offer-share-image]').onclick=()=>window.DarayaOfferSharing?.open(row);
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
          const query=window.DarayaOfferDisplay?window.DarayaOfferDisplay.query({store:id,offset,limit:30}):api.from('daily_offers').select('*,daily_offer_availability(confirmed_at)').eq('store_id',id).eq('status','approved').gt('ends_at',new Date().toISOString()).order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+29);const r=await query.abortSignal(controller.signal);
          if(!alive()||controller.signal.aborted)return;if(r.error)throw r.error;
          const fresh=r.data.filter(isPublic).filter(o=>!rows.some(x=>x.id===o.id));rows.push(...fresh);
          for(const o of fresh){track.insertAdjacentHTML('beforeend',markup(o));bind(track.lastElementChild);}
          orderCards();if(current?.dataset.storeId===id)activate(current,true);
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
        let q = window.DarayaOfferDisplay?window.DarayaOfferDisplay.query({offset:page*20,limit:20,following}):api.from('daily_offers').select('*,daily_offer_availability(confirmed_at)').eq('status','approved').gt('ends_at',new Date().toISOString()).order('created_at',{ascending:false}).order('id',{ascending:false}).range(page*20,page*20+19);
        if(following&&!window.DarayaOfferDisplay)q=q.in('store_id',following);
        const r = await q.abortSignal(requestController.signal);
        if (!alive()) return;
        if (r.error) throw r.error;
        done = r.data.length < 20; page++;
        const fresh = r.data.filter(isPublic).filter(o => !rows.some(x => x.id === o.id)); rows.push(...fresh);
        if (page === 1 && !track.querySelector('.offer-reel')) track.innerHTML = '';
        for (const o of fresh) { track.insertAdjacentHTML('beforeend', markup(o)); const card = track.lastElementChild; bind(card); observer?.observe(card); }
        if (!rows.length && done) {
          track.innerHTML = '<div class="offers-empty-state"><p><a class="offers-example-link" href="#offers/examples">' + t('شاهد أمثلة لشرح عروض اليوم', 'See examples explaining today’s offers', 'Beispiele zur Erklärung der Tagesangebote ansehen') + '</a></p><p role="status">' + t('لا توجد عروض الآن', 'No offers right now', 'Derzeit keine Angebote') + '</p></div>';
          app.querySelector('.reels-hint').hidden=true;
          app.querySelector('.reels-navigation').hidden=true;
        }
        orderCards();if(rows.length)activate(current||groups()[0]?.cards[0],true);
        if (!fresh.length && !done) { loading = false; return loadMore(); }
      } catch {
        if (alive()) { const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = t('تعذر التحميل — أعد المحاولة', 'Could not load — retry', 'Laden fehlgeschlagen — erneut versuchen'); retry.onclick = () => { retry.remove(); loadMore(); }; track.append(retry); }
      } finally { clearTimeout(requestTimeout);loading = false; }
    }
    function move(delta) {
      const all=groups(),index=Math.max(0,all.findIndex(g=>g.id===current?.dataset.storeId));
      const next=all[Math.max(0,Math.min(all.length-1,index+delta))]?.cards[0];
      if(next&&next.dataset.storeId!==current?.dataset.storeId){track.dataset.direction=delta>0?'next':'prev';activate(next);alignCard(next);}
    }
    app.querySelector('[data-reel-prev]').onclick=()=>move(-1);app.querySelector('[data-reel-next]').onclick=()=>move(1);
    track.addEventListener('keydown',e=>{if(e.target!==track)return;if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const rtl=getComputedStyle(track).direction==='rtl';move((e.key==='ArrowLeft')===rtl?1:-1);}});
    const detachGestures=window.DarayaOfferGestures?.attach(app.querySelector('.offers-reels-page'),direction=>{const rtl=getComputedStyle(track).direction==='rtl';move((direction==='left')===rtl?1:-1);});
    const stopWithGestures=stop;stop=()=>{detachGestures?.();stopWithGestures();};
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
    let displayTick=0;expiryTimer = setInterval(()=>{window.DarayaOfferTools?.updateCountdown(track);checkExpiry();if(++displayTick%15===0)refreshDisplay();},1000);
    window.addEventListener('daraya-blocks-changed', checkExpiry);
    // A shared offer is checked separately and still must be public and unexpired.
    if (focus) {
      try {
        const demo=demos.find(o=>o.id===focus);
        const r = demo?{data:demo}:await api.from('daily_offers').select('*,daily_offer_availability(confirmed_at)').eq('id', focus).eq('status', 'approved').gt('ends_at', new Date().toISOString()).maybeSingle();
        if (!alive()) return;
        if (!r.error && r.data && isPublic(r.data)) { rows.push(r.data); track.innerHTML = markup(r.data); bind(track.firstElementChild); observer?.observe(track.firstElementChild); activate(track.firstElementChild); }
        else track.innerHTML = '<p>' + t('انتهى هذا العرض أو لم يعد متاحًا.', 'This offer has ended or is unavailable.', 'Dieses Angebot ist abgelaufen oder nicht verfügbar.') + '</p>';
      } catch { if (alive()) track.innerHTML = '<p>' + t('تعذر تحميل العرض.', 'Could not load the offer.', 'Angebot konnte nicht geladen werden.') + '</p>'; }
    }
    if(demos.length){
      if(!track.querySelector('.offer-reel'))track.innerHTML='';
      for(const o of demos){if(rows.some(x=>x.id===o.id))continue;rows.push(o);track.insertAdjacentHTML('beforeend',markup(o));const card=track.lastElementChild;bind(card);observer?.observe(card);}
      // Wait for the first server page before choosing the initial shop.
    }
    await loadMore();
    if(alive() && rows.length) window.DarayaOfferTools?.guide(track);
    if(alive()&&!current&&rows.length){orderCards();activate(groups()[0]?.cards[0],true);}
  }
  window.DarayaReels = { render: renderFeed, isPublic, link, linkMarkup, shopGroups, markup };
  // Run after the existing route listeners. Cleanup must never cancel a newly rendered feed.
  window.addEventListener('hashchange',()=>{const parts=location.hash.split('/');if(parts[0]==='#offers')renderFeed('all',parts[1]||'');else if(parts[0]==='#followed-offers')renderFeed('following');else teardown();});
  const baseRender = render; render = function() { const parts = location.hash.split('/'); if (parts[0] === '#offers' && parts[1]) return window.DarayaReels.render('all', parts[1]); return baseRender.apply(this, arguments); };
})();

