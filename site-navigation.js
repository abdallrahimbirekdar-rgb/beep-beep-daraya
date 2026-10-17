(()=>{
const menu=document.querySelector('#site-menu'),toggle=document.querySelector('#menu-toggle'),bottom=document.querySelector('#mobile-navigation');
const refresh=document.querySelector('#android-refresh');
const close=()=>{menu.hidden=true;toggle.setAttribute('aria-expanded','false');};
toggle.onclick=()=>{menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden));};
document.addEventListener('click',e=>{if(!e.target.closest('header'))close();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){close();toggle.focus();}});
menu.addEventListener('click',e=>{if(e.target.closest('a'))close();});
const labels={
en:{'الرئيسية':'Home','المحفوظات':'Saved','المزيد':'More','المتاجر':'Shops','خريطة داريا':'Map','طلباتي':'Orders','حسابي':'Account','الإدارة':'Admin','لوحتي':'Dashboard','المعلومات':'Details','الصور':'Photos','المنتجات':'Products','الطلبات الواردة':'Orders'},
de:{'الرئيسية':'Start','المحفوظات':'Merkliste','المزيد':'Mehr','المتاجر':'Läden','خريطة داريا':'Karte','طلباتي':'Bestellungen','حسابي':'Konto','الإدارة':'Verwaltung','لوحتي':'Übersicht','المعلومات':'Infos','الصور':'Fotos','المنتجات':'Produkte','الطلبات الواردة':'Bestellungen'}
};
function refreshLabel(){
 if(!refresh)return;
 const lang=window.ShahinI18n?.language||'ar',ready=refresh.classList.contains('android-update-ready');
 const label=lang==='de'?(ready?'Update':'Neu laden'):lang==='en'?(ready?'Update':'Refresh'):(ready?'تحديث متاح':'تحديث العرض');
 refresh.setAttribute('data-no-translate','');if(refresh.textContent!==label)refresh.textContent=label;
}
function sync(){
 const parts=location.hash.slice(1).split('/');
 const managing=parts[0]==='dashboard';
 const shopPanel=managing&&(!admin||parts[1]==='setup');
 const s=shopPanel?(mine().find(x=>x.id===parts[2])||mine()[0]):null;
 const items=s&&typeof directoryIsInfo==='function'&&directoryIsInfo(s)?[['overview','لوحتي',merchantHref('overview',s)],['details','المعلومات',merchantHref('details',s)],['photos','الصور',merchantHref('photos',s)]]:s?[['overview','لوحتي',merchantHref('overview',s)],['products','المنتجات',merchantHref('products',s)],['orders','الطلبات الواردة',merchantHref('orders',s)]]:[['🏠','الرئيسية','#home'],...(!managing?[['🗺️','خريطة داريا','#map']]:[]),...(managing?[['▤','الإدارة','#dashboard'],['○','حسابي','#account']]:[['💖','المحفوظات','#saved']])];
 const lang=window.ShahinI18n?.language||'ar';
 const html=items.map(([icon,label,href])=>'<a href="'+href+'"'+(location.hash===href?' aria-current="page"':'')+' data-no-translate><span aria-hidden="true">'+(s?(window.DarayaDashboardIcon?window.DarayaDashboardIcon(icon):({overview:'⌂',details:'ℹ',photos:'📷',products:'📦',orders:'📋'}[icon]||icon)):icon)+'</span><span>'+(labels[lang]?.[label]||label)+'</span></a>').join('');
 bottom.style.gridTemplateColumns='repeat('+(items.length)+',minmax(0,1fr))';
 if(bottom.dataset.navigationMarkup!==html){bottom.innerHTML=html;bottom.dataset.navigationMarkup=html;}if(refresh){const target=menu.querySelector('#customer-account')?.closest('.side-menu-group')||menu;if(refresh.parentElement!==target)target.append(refresh);}
 refreshLabel();
 const oldOrders=document.querySelector('#my-orders-link');if(oldOrders)oldOrders.hidden=true;
}
window.addEventListener('hashchange',()=>{close();sync();});
new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
if(refresh)new MutationObserver(refreshLabel).observe(refresh,{childList:true,attributes:true,attributeFilter:['class']});
new MutationObserver(sync).observe(document.querySelector('#app'),{childList:true});
sync();
})();
