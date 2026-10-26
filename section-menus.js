'use strict';
// A local menu reveals mounted controls; going back never resets a form.
(() => {
 const menus=new WeakMap();
 window.DarayaRevealSection=node=>node?.dispatchEvent(new CustomEvent('daraya-reveal-section',{bubbles:true,detail:{node}}));
 window.DarayaSectionMenu=function({root,groups,title='',backLabel,initial=null,onChange,buttonKey}){
  const old=menus.get(root);if(old?.valid())return old;old?.dispose();
  groups=groups.map(g=>({...g,nodes:(g.nodes||[]).filter(Boolean)})).filter(g=>g.nodes.length);
  if(!groups.length)return null;
  const duplicateHeadings=new Map();for(const g of groups)for(const n of g.nodes){const h=n.firstElementChild;if(h?.matches('h2,h3')&&h.textContent.trim()===g.title)duplicateHeadings.set(h,h.hidden);}
  const original=new Map();for(const g of groups)for(const n of g.nodes)if(!original.has(n))original.set(n,{hidden:n.hidden,inert:n.hasAttribute('inert')});
  const nav=document.createElement('nav');nav.className='section-menu-grid';nav.dataset.noTranslate='';nav.setAttribute('aria-label',title);
  const bar=document.createElement('div');bar.className='section-menu-bar';bar.dataset.noTranslate='';
  const back=document.createElement('button');back.type='button';back.className='section-menu-back';back.textContent=backLabel;
  const heading=document.createElement('h3');bar.append(back,heading);root.prepend(nav,bar);
  const menu={root,groups,nav,bar,back,active:null,disposed:false};menus.set(root,menu);
  menu.valid=()=>!menu.disposed&&nav.parentElement===root&&groups.every(g=>g.nodes.every(n=>root.contains(n)));
  function paint(){
   for(const h of duplicateHeadings.keys())h.hidden=true;
   for(const [n,o] of original){const show=menu.active&&groups.some(g=>g.id===menu.active&&g.nodes.includes(n));n.hidden=o.hidden||!show;n.toggleAttribute('inert',o.inert||!show);}
   nav.hidden=!!menu.active;bar.hidden=!menu.active;heading.textContent=groups.find(g=>g.id===menu.active)?.title||'';
   nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.sectionKey===menu.active)));
  }
  menu.sync=paint;
  menu.open=(id,focus=true)=>{if(!menu.valid()||!groups.some(g=>g.id===id))return;menu.active=id;paint();onChange?.(id);root.dispatchEvent(new CustomEvent('daraya-section-state',{bubbles:true}));if(focus){const focusBack=back.hidden?[...root.querySelectorAll('.section-menu-back')].find(b=>!b.hidden&&!b.closest('[hidden],[inert],.sf-section-collapsed')):back;focusBack?.focus({preventScroll:true});(focusBack?.closest('.section-menu-bar')||bar).scrollIntoView?.({block:'start',behavior:'auto'});}};
  menu.close=(focus=true)=>{const id=menu.active;menu.active=null;paint();onChange?.(null);root.dispatchEvent(new CustomEvent('daraya-section-state',{bubbles:true}));if(focus){nav.querySelector('[data-section-key="'+id+'"]')?.focus({preventScroll:true});nav.scrollIntoView?.({block:'start',behavior:'auto'});}};
  const reveal=event=>{const target=event.detail?.node||event.target;const g=groups.find(g=>g.nodes.some(n=>n===target||n.contains(target)));if(g)menu.open(g.id,false);};root.addEventListener('daraya-reveal-section',reveal);root.addEventListener('invalid',reveal,true);
  menu.dispose=()=>{if(menu.disposed)return;menu.disposed=true;for(const [h,hidden] of duplicateHeadings)h.hidden=hidden;root.removeEventListener('daraya-reveal-section',reveal);root.removeEventListener('invalid',reveal,true);for(const [n,o] of original){n.hidden=o.hidden;n.toggleAttribute('inert',o.inert);}nav.remove();bar.remove();if(menus.get(root)===menu)menus.delete(root);};
  for(const g of groups){const b=document.createElement('button');b.type='button';b.className='section-menu-tile';b.dataset.sectionKey=g.id;if(buttonKey)b.dataset[buttonKey]=g.id;const icon=document.createElement('span');icon.className='section-menu-icon';icon.setAttribute('aria-hidden','true');icon.textContent=g.icon||'▦';const label=document.createElement('strong');label.textContent=g.title;b.append(icon,label);if(g.note){const small=document.createElement('small');small.textContent=g.note;b.append(small);}b.onclick=()=>menu.open(g.id);nav.append(b);}
  back.onclick=()=>menu.close();paint();if(initial)menu.open(initial,false);return menu;
 };
})();
