'use strict';
(() => {
 window.DarayaShowcase=({key,name,rows,t,language})=>{
  if(!['restaurant','apparel','syrian'].includes(key))return;
  const root=document.querySelector('.demo-page'),hero=root?.querySelector('.demo-hero'),catalog=root?.querySelector('.demo-catalog');if(!root||!hero||!catalog)return;
  const cover=hero.querySelector('img.demo-image');if(cover?.parentElement.parentElement===hero)cover.parentElement.classList.add('sf-demo-media');
  if(cover&&!cover.closest('button')){const zoom=document.createElement('button');zoom.type='button';zoom.className='sf-demo-cover';zoom.setAttribute('aria-label',t('تكبير صورة المحل','Enlarge shop photo','Geschäftsfoto vergrößern'));cover.before(zoom);zoom.append(cover);zoom.onclick=()=>{modal('<section class="sf-cover-popout"><h2>'+t('صورة المتجر','Shop photo','Geschäftsfoto')+'</h2></section>');const image=document.createElement('img');image.src=cover.dataset.fullImage||cover.currentSrc||cover.src;image.alt=cover.alt;document.querySelector('#modal-body .sf-cover-popout')?.append(image);};}
  root.classList.add('rich-showcase',key!=='apparel'?'pizza-showcase':'fashion-showcase');
  const menu=key!=='apparel',tagline=key==='syrian'?t('نكهات سورية أصيلة، من الفلافل والحمّص إلى السودة والسلطات.','Authentic Syrian flavours, from falafel to fresh salads.','Syrische Küche, von Falafel bis zu frischen Salaten.'):menu?t('عجينة ذهبية، مكونات مختارة، ونكهة تحب ترجع إلها.','Golden crust, selected ingredients, made to enjoy.','Goldener Teig, ausgewählte Zutaten, voller Genuss.'):t('إطلالات متكاملة، تفاصيل أنيقة، واختيارات لكل يوم.','Complete looks, thoughtful details, everyday style.','Komplette Looks, schöne Details, Stil für jeden Tag.');
  hero.querySelector('p').textContent=tagline;
  const badge=document.createElement('span');badge.className='showcase-kicker';badge.textContent=menu?(key==='syrian'?'A TASTE OF DAMASCUS':'PIZZA & MORE'):'THE STYLE EDIT';hero.querySelector('h1').before(badge);
  const exportBox=document.createElement('section');exportBox.className='showcase-export';exportBox.dataset.noTranslate='';exportBox.innerHTML='<div><small>'+t('جرّب النتيجة التي ستحصل عليها لمحلك','Try what your own shop can have','So könnte dein Geschäft aussehen')+'</small><h2>'+t(menu?'منيو مطعمك… جاهز للمشاركة':'كتالوج محلك… بإطلالة جديدة',menu?'Your menu, ready to share':'Your collection, ready to share',menu?'Deine Speisekarte zum Teilen':'Dein Katalog zum Teilen')+'</h2><p>'+t('صور المنتجات وأسعارها، غلاف أنيق ورمز QR يفتح الصفحة.','Product photos and prices, an elegant cover, and a page QR code.','Produktfotos und Preise, stilvolles Titelblatt und Seiten-QR-Code.')+'</p></div>';
  const button=document.createElement('button');button.type='button';button.textContent=t(menu?'اصنع المينو الآن ↗':'اصنع الكتالوج الآن ↗',menu?'Create the menu ↗':'Create the catalog ↗',menu?'Speisekarte erstellen ↗':'Katalog erstellen ↗');
  const exportData=()=>({name:root.querySelector('h1')?.textContent||name,category:menu?'restaurant':'shop',is_example:true,page_url:'https://damascus-shop.com/#example/'+key,address:t('داريا — عنوان افتراضي للتوضيح','Daraya — fictional example address','Daraya — fiktive Beispieladresse'),description:tagline});
  const exportProducts=()=>rows.map((r,i)=>({id:'demo-'+key+'-'+i,name:r[language()],description:language()===0?r[6]||'':r[language()],section:language()===0?r[7]||'':'',price:r[3],image:new URL(r[5],location.href).href,available:true}));
  button.onclick=()=>window.DarayaCatalogPdf.open(exportData(),exportProducts());exportBox.append(button);hero.after(exportBox);exportBox.after(catalog);
  const labels={restaurant:[t('البيتزا','Pizza','Pizza'),t('المقبلات','Sides','Beilagen'),t('الحلويات والمشروبات','Desserts & drinks','Desserts & Getränke')],apparel:[t('نسائي','Women','Damen'),t('رجالي','Men','Herren'),t('أطفال','Kids','Kinder'),t('أحذية وإكسسوارات','Shoes & accessories','Schuhe & Accessoires')]};
  labels.syrian=[t('السندويشات','Sandwiches','Sandwiches'),t('الأطباق الشعبية','Syrian plates','Syrische Gerichte'),t('السلطات','Salads','Salate'),t('الإضافات والمشروبات','Sides & drinks','Beilagen & Getränke')];
  if(menu){const switcher=document.createElement('nav');switcher.className='showcase-demo-links';switcher.innerHTML='<a href="#example/restaurant">'+t('نموذج البيتزا','Pizza example','Pizzabeispiel')+'</a><a href="#example/syrian">'+t('نموذج الفلافل والمأكولات السورية','Syrian restaurant example','Syrisches Restaurantbeispiel')+'</a>';exportBox.before(switcher);}
  const sourceGroups=[...new Set(rows.map(r=>r[7]))];let selected='';const chips=document.createElement('nav');chips.className='showcase-chips';chips.setAttribute('aria-label',t('أقسام المنتجات','Product categories','Produktbereiche'));
  const input=root.querySelector('[data-demo-search]');
  const update=()=>{const query=input.value.trim().toLocaleLowerCase();let count=0;root.querySelectorAll('[data-demo-item]').forEach(n=>{const r=rows[Number(n.dataset.demoItem)];n.hidden=!!(selected&&r[7]!==selected)||!r[language()].toLocaleLowerCase().includes(query);if(!n.hidden)count++;});root.querySelector('[data-demo-empty]').hidden=count>0;chips.querySelectorAll('button').forEach(b=>{const active=b.dataset.group===selected;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});};
  ['',...sourceGroups].forEach((group,i)=>{const b=document.createElement('button');b.type='button';b.className='outline';b.dataset.group=group;b.textContent=i?labels[key][i-1]:t('الكل','All','Alle');b.onclick=()=>{selected=group;update();};chips.append(b);});input.closest('label').before(chips);input.oninput=update;update();
  const extras=root.querySelector('[data-demo-extras]');if(extras){const details=document.createElement('details');details.className='showcase-owner-tools';const summary=document.createElement('summary');summary.textContent=t('اكتشف باقي إمكانيات الصفحة وأدوات صاحب المحل','Explore more page features and owner tools','Weitere Seitenfunktionen und Anbieterwerkzeuge');extras.before(details);details.append(summary,extras);for(const node of [...root.children].filter(n=>n.matches('.demo-social,.demo-video')))extras.prepend(node);}
  // Demo pages bypass renderStore, so give them the same four entry cards.
  const info=root.querySelector('.demo-info'),tools=root.querySelector('.showcase-owner-tools');
  if(info){
   const actions=hero.querySelector('.demo-actions');if(actions)info.prepend(actions);
   const social=extras?.querySelector('.demo-social');if(social)info.append(social);
  }
  const offers=extras?.querySelector('[data-demo-offer]')?.closest('section');
  if(offers){offers.classList.add('showcase-demo-offers');root.append(offers);}
  if(tools){
   tools.querySelector(':scope>summary').after(exportBox);
   const switcher=root.querySelector('.showcase-demo-links');if(switcher)tools.append(switcher);
   const qr=root.querySelector('.demo-qr-panel');if(qr)tools.append(qr);
   root.append(tools);
  }
  const nav=document.createElement('nav');nav.className='sf-section-nav showcase-section-cards';nav.setAttribute('aria-label',t('أقسام صفحة المحل','Shop page sections','Bereiche der Geschäftsseite'));nav.dataset.noTranslate='';
  const icons={contact:'<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',offers:'<path d="m3 12 9-9h8v8l-9 9Z"/><circle cx="16" cy="7" r="1"/>',tools:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'};
  const entries=[
   [catalog,'products',t(menu?'المنتجات والمينو':'المنتجات',menu?'Products & menu':'Products',menu?'Produkte & Speisekarte':'Produkte'),t('شاهد الصور والأسعار','See photos and prices','Fotos und Preise ansehen')],
   [info,'contact',t('التواصل ومعلومات المحل','Contact & information','Kontakt & Informationen'),t('العنوان وأوقات الدوام','Address and hours','Adresse und Öffnungszeiten')],
   [offers,'offers',t('عروض المحل','Shop offers','Geschäftsangebote'),t('شاهد مثال العروض والخصومات','See example offers','Beispielangebote ansehen')],
   [tools,'tools',t('صور المتجر','Shop photos','Geschäftsfotos'),t('شاهد صور المتجر','View shop photos','Geschäftsfotos ansehen')]
  ];
  entries.forEach(([target,kind,label,note])=>{
   if(!target)return;target.id='showcase-'+kind;
   const card=document.createElement('button');card.type='button';card.className='sf-section-tile sf-tile-'+kind;card.dataset.target=target.id;card.setAttribute('aria-controls',target.id);
   const visual=document.createElement('span');visual.className='sf-tile-visual';visual.setAttribute('aria-hidden','true');
   if(kind==='products'){
    window.DarayaProductTileSlideshow(visual,rows.filter(row=>row[5]).map(row=>new URL(row[5],location.href).href),'demo:'+key);
   }else visual.innerHTML=window.DarayaShopTileIcon(kind==='tools'?'photos':kind)||'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+icons[kind]+'</svg>';
   const title=document.createElement('strong');title.className='sf-tile-title';title.textContent=label;
   const hint=document.createElement('span');hint.className='sf-tile-note';hint.textContent=note;card.append(visual,title,hint);
   card.setAttribute('aria-expanded','false');card.onclick=()=>view.open(target.id,card);nav.append(card);
  });
  hero.after(nav);
  const view=window.DarayaShopSections({root,hero,nav,sections:entries.map(([node,kind])=>({node,id:'showcase-'+kind,related:kind==='products'?[root.querySelector('.demo-basket')]:[]})),backLabel:t('‹ العودة إلى أقسام المحل','‹ Back to shop sections','‹ Zurück zu den Geschäftsbereichen')});
  const old=root.querySelector('[data-demo-pdf]');if(old){old.textContent=t(menu?'إنشاء المينو مع QR':'إنشاء الكتالوج مع QR',menu?'Create menu with QR':'Create catalog with QR',menu?'Speisekarte mit QR erstellen':'Katalog mit QR erstellen');old.onclick=button.onclick;}
 };
})();
