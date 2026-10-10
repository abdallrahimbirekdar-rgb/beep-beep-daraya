'use strict';
window.DARAYA_SECTORS=[["restaurant","مطاعم ومقاهٍ وحلويات","Food, cafés and sweets","Restaurants, Cafés und Süßwaren","🍽️","#e76f20"],["grocery","بقاليات وخضار","Groceries and vegetables","Lebensmittel und Gemüse","🛒","#25834b"],["shop","تسوق وملابس وجوالات","Shopping, clothes and phones","Einkaufen, Kleidung und Handys","🛍️","#bd3c89"],["household","منزل ومفروشات","Home and furniture","Haushalt und Möbel","🛋️","#a4693e"],["services","مهن وخدمات","Trades and services","Handwerk und Dienstleistungen","🛠️","#8056bd"],["vehicles","سيارات ودراجات","Cars and bikes","Autos und Fahrräder","🚗","#52647d"],["doctor","أطباء وعيادات","Doctors and clinics","Ärzte und Praxen","🩺","#d73848"],["pharmacy","صيدليات","Pharmacies","Apotheken","💊","#00a38c"],["school","مدارس وتعليم","Schools and education","Schulen und Bildung","🎓","#c08700"],["mosque","مساجد","Mosques","Moscheen","🕌","#187b87"]];
(() => {
 const previous=directoryKind;
 const norm=v=>String(v||'').replace(/[أإآ]/g,'ا').replace(/[ًٌٍَُِّْـ]/g,'');
 const aliases={bakery:'restaurant',produce:'grocery',furniture:'household',construction:'services',personal:'services',stationery:'shop',property:'services',leisure:'shop',public:'services',lawyer:'services',apparel:'shop',mobile:'shop'};
 window.darayaSectorKey=key=>aliases[key]||key;
 directoryKinds.splice(0,directoryKinds.length,...window.DARAYA_SECTORS.map(x=>[x[0],x[1]]));
 directoryKind=function(s){
  const name=norm(s.name),saved=s.translations?._directory?.kind,original=previous(s);
  if(/صيدل/.test(name)||original==='pharmacy')return 'pharmacy';
  if(/طبيب|عيادة|دكتور/.test(name)||original==='doctor')return 'doctor';
  if(/مسجد|جامع/.test(name)||original==='mosque')return 'mosque';
  if(/مكتبة|قرطاسية|طباعة|العاب|اطفال|طفولة|عصافير|اسماك|فون|جوال|هاتف|موبايل|تلفون|ملابس|البسة|عرائس|عرايس|اراكيل/.test(name))return 'shop';
  if(/مدرسة|مدارس|معهد|تعليم/.test(name)||original==='school')return 'school';
  if(/سيارات|دراجات|ميكانيك|كراج/.test(name))return 'vehicles';
  if(/عقاري|معقب|معاملات|محام|مديرية|مناسبات|نجار|نجارة|المنيوم|بديل خشب|بديل رخام|جبسن|البايسون|اكساء|حلاقة|صالون|تجميل|بخاخ/.test(name))return 'services';
  if(/مفروشات|موبيليا|سجاد|موكيت|فرشات|بياضات|ادوات المنزلية|ادوات منزلية|كهربائيات|منظمات الكهربائية|تدفئة مركزية/.test(name))return 'household';
  if(/بقال|بزوري|غذائي|غذائيات|محمصة|خضراوات|خضروات|خضار|فواكه|المؤسسة السورية للتجارة/.test(name))return 'grocery';
  if(/مطعم|مشاوي|مشوي|فلافل|فول|فروج|لحم|فرن|مخبز|حلويات|بوظة|باتيسيري|فطاير|فطائر|برغر|شيكن|كافتيريا|مقهى/.test(name))return 'restaurant';
  const fallback=window.darayaSectorKey(saved||original);
  return directoryKinds.some(x=>x[0]===fallback)?fallback:'shop';
 };
 const match=matchesCategory;
 matchesCategory=function(s,key=filter){const canonical=window.darayaSectorKey(key);return directoryKinds.some(x=>x[0]===canonical)?directoryKind(s)===canonical:match(s,key);};
 const home=renderHome;
 renderHome=function(){if(typeof filter==='string')filter=window.darayaSectorKey(filter);home.apply(this,arguments);const track=document.querySelector('.filters .browse-category-track')||document.querySelector('.filters');if(!track)return;const allowed=new Set(['all',...directoryKinds.map(x=>x[0])]);track.querySelectorAll('[data-filter]').forEach(b=>{if(!allowed.has(b.dataset.filter))b.remove();});for(const key of allowed){const b=track.querySelector('[data-filter="'+key+'"]');if(b)track.append(b);}};
})();
