(()=>{
const menu=document.querySelector('#site-menu'),toggle=document.querySelector('#menu-toggle'),bottom=document.querySelector('#mobile-navigation');
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
 const items=s?[['▦','لوحتي',merchantHref('overview',s)],['▤','المنتجات',merchantHref('products',s)],['▧','الطلبات الواردة',merchantHref('orders',s)]]:[['⌂','المحلات','#home'],['▤',managing?'الإدارة':'طلباتي',managing?'#dashboard':'#my-orders'],['○','حسابي','#account']];
 const html=items.map(([icon,label,href])=>'<a href="'+href+'"'+(location.hash===href?' aria-current="page"':'')+'><span aria-hidden="true">'+icon+'</span><span>'+label+'</span></a>').join('');
 if(bottom.innerHTML!==html)bottom.innerHTML=html;
 const directory=document.querySelector('#admin-directory-link');
 directory.hidden=!(admin&&managing);
 const oldOrders=document.querySelector('#my-orders-link');if(oldOrders)oldOrders.hidden=true;
}
window.addEventListener('hashchange',()=>{close();sync();});
new MutationObserver(sync).observe(document.querySelector('#app'),{childList:true});
sync();
})();