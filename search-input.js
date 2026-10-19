'use strict';
// Keep native typing out of the legacy renderHome chain. All search fields are
// handled here once, including fields recreated by asynchronous product results.
(() => {
 const delay=280;
 let timer=null,composing=false;
 const isHome=()=>['','#home','#browse'].includes(location.hash);
 const isSearch=node=>node?.id==='search'&&node.isConnected;
 const cancel=()=>{if(timer!==null)clearTimeout(timer);timer=null;};
 function flush(){
  cancel();
  const input=document.querySelector('#search');
  if(!isHome()||!isSearch(input)||composing)return;
  search=input.value;
  renderHome();
 }
 function schedule(){cancel();timer=setTimeout(flush,delay);}
 // Product fetches may finish while another word is being typed. Leave the field
 // and page alone until the same scheduled render can include both updates.
 const previousHome=renderHome;
 renderHome=function(){
  const input=document.querySelector('#search');
  const focused=isSearch(input)&&document.activeElement===input;
  if(focused&&composing&&isHome())return;
  const preserve=focused&&input.value===search&&isHome();
  if(preserve&&(timer!==null||composing))return;
  cancel();
  const start=preserve?input.selectionStart:null,end=preserve?input.selectionEnd:null,direction=preserve?input.selectionDirection:null;
  const result=previousHome.apply(this,arguments);
  const replacement=document.querySelector('#search');
  if(preserve&&replacement&&replacement!==input){
   // Reuse the original control and its selection instead of focusing a fresh
   // control after every letter. Do not force a scroll on every search update.
   for(const attribute of [...input.attributes])input.removeAttribute(attribute.name);
   for(const attribute of [...replacement.attributes])input.setAttribute(attribute.name,attribute.value);
   input.value=search;
   input.oninput=replacement.oninput;
   replacement.replaceWith(input);
   input.focus({preventScroll:true});
   if(start!==null)try{input.setSelectionRange(start,end,direction);}catch{}
  }
  return result;
 };
 document.addEventListener('input',event=>{
  const input=event.target;if(!isSearch(input)||!isHome())return;
  event.stopImmediatePropagation();
  search=input.value;
  if(typeof customerSearchLimit!=='undefined')customerSearchLimit=24;
  if(composing||event.isComposing){cancel();return;}
  schedule();
 },true);
 document.addEventListener('compositionstart',event=>{
  if(!isSearch(event.target)||!isHome())return;
  composing=true;cancel();
 },true);
 document.addEventListener('compositionend',event=>{
  if(!isSearch(event.target))return;
  composing=false;search=event.target.value;
  if(isHome())schedule();
 },true);
 document.addEventListener('keydown',event=>{
  if(!isSearch(event.target)||!isHome()||event.key!=='Enter'||composing||event.isComposing)return;
  event.preventDefault();event.stopImmediatePropagation();flush();
 },true);
 window.addEventListener('hashchange',()=>{cancel();composing=false;});
})();
