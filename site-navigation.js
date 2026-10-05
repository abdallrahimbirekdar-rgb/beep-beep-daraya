(()=>{
const menu=document.querySelector('#site-menu'),toggle=document.querySelector('#menu-toggle'),bottom=document.querySelector('#mobile-navigation');
const refresh=document.querySelector('#android-refresh');
const close=()=>{menu.hidden=true;toggle.setAttribute('aria-expanded','false');};
toggle.onclick=()=>{menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden));};
document.addEventListener('click',e=>{if(!e.target.closest('header'))close();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){close();toggle.focus();}});
menu.addEventListener('click',e=>{if(e.target.closest('a'))close();});
function sync(){
 const parts=location.hash.slice(1).split('/');
 const managing=parts[0]==='dashboard';
 const shopPanel=managing&&(!admin||parts[1]==='setup');
 const s=shopPanel?(mine().find(x=>x.id===parts[2])||mine()[0]):null;
 const items=s&&typeof directoryIsInfo==='function'&&directoryIsInfo(s)?[['▦','لوحتي',merchantHref('overview',s)],['○','المعلومات',merchantHref('details',s)],['▤','الصور',merchantHref('photos',s)]]:s?[['▦','لوحتي',merchantHref('overview',s)],['▤','المنتجات',merchantHref('products',s)],['▧','الطلبات الواردة',merchantHref('orders',s)]]:[['⌂','المتاجر','#home'],...(!managing?[['⌖','خريطة داريا','#map']]:[]),['▤',managing?'الإدارة':'طلباتي',managing?'#dashboard':'#my-orders'],['○','حسابي','#account']];
 const html=items.map(([icon,label,href])=>'<a href="'+href+'"'+(location.hash===href?' aria-current="page"':'')+'><span aria-hidden="true">'+icon+'</span><span>'+label+'</span></a>').join('');
 bottom.style.gridTemplateColumns='repeat('+(items.length+(refresh?1:0))+',minmax(0,1fr))';
 if(bottom.dataset.navigationMarkup!==html){bottom.innerHTML=html;bottom.dataset.navigationMarkup=html;}if(refresh&&refresh.parentElement!==bottom)bottom.append(refresh);
 const oldOrders=document.querySelector('#my-orders-link');if(oldOrders)oldOrders.hidden=true;
}
window.addEventListener('hashchange',()=>{close();sync();});
new MutationObserver(sync).observe(document.querySelector('#app'),{childList:true});
sync();
})();
