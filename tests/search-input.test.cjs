const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
function setup(){
 const dom=new JSDOM('<main id="app"></main><button id="other">Other</button>',{url:'https://damascus-shop.com/#home',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 let renders=0,scrolls=0,next=0;const tasks=new Map();
 w.search='';w.customerSearchLimit=96;w.homeStoreLimit=120;
 const stores=Array.from({length:500},(_,i)=>i===499?'صيدلية داريا':'متجر '+i);
 w.renderHome=()=>{
  renders++;const app=w.document.querySelector('#app');app.innerHTML='<div class="search-wrap"><input id="search"></div><section id="results"></section>';
  const input=w.document.querySelector('#search');input.value=w.search;
  // This is the synchronous legacy behavior the production controller replaces.
  input.oninput=e=>{w.search=e.target.value;w.renderHome();};
  app.querySelector('#results').textContent=stores.filter(s=>s.includes(w.search)).join('|');
 };
 w.scrollTo=()=>{scrolls++;};
 w.setTimeout=(fn,ms)=>{assert.equal(ms,280);tasks.set(++next,fn);return next;};w.clearTimeout=id=>tasks.delete(id);
 w.renderHome();w.eval(fs.readFileSync('search-input.js','utf8'));
 const input=w.document.querySelector('#search');input.focus();
 return {w,dom,input,tasks,get renders(){return renders;},get scrolls(){return scrolls;},type(value,options={}){input.value=value;input.setSelectionRange(value.length,value.length);input.dispatchEvent(new w.InputEvent('input',{bubbles:true,isComposing:options.composing||false}));},flush(){for(const [id,fn] of [...tasks]){tasks.delete(id);fn();}},close(){dom.window.close();}};
}
test('a typing burst updates the native value immediately and renders 500-store results only once',()=>{
 const a=setup();for(const value of ['ص','صي','صيد','صيدل','صيدلي','صيدلية'])a.type(value);
 assert.equal(a.input.value,'صيدلية');assert.equal(a.w.search,'صيدلية');assert.equal(a.renders,1);assert.equal(a.tasks.size,1);assert.equal(a.w.customerSearchLimit,24);assert.equal(a.w.homeStoreLimit,12);
 a.flush();assert.equal(a.renders,2);assert.equal(a.tasks.size,0);assert.equal(a.w.document.querySelector('#results').textContent,'صيدلية داريا');assert.equal(a.w.document.querySelector('#search'),a.input);assert.equal(a.w.document.activeElement,a.input);assert.equal(a.input.selectionStart,6);assert.equal(a.scrolls,0);a.close();
});
test('async result refresh waits for pending typing and preserves the original caret selection',()=>{
 const a=setup();a.type('صيدلية');a.input.setSelectionRange(1,4,'backward');a.w.renderHome();assert.equal(a.renders,1);a.flush();assert.equal(a.renders,2);assert.equal(a.input.selectionStart,1);assert.equal(a.input.selectionEnd,4);assert.equal(a.input.selectionDirection,'backward');
 a.w.renderHome();assert.equal(a.renders,3);assert.equal(a.w.document.activeElement,a.input);assert.equal(a.w.document.querySelector('#search'),a.input);a.close();
});
test('composition input never renders partial words, including an external refresh before input fires',()=>{
 const a=setup();a.input.dispatchEvent(new a.w.CompositionEvent('compositionstart',{bubbles:true}));a.input.value='ص';a.w.renderHome();assert.equal(a.renders,1);
 a.type('صيد',{composing:true});assert.equal(a.tasks.size,0);a.input.dispatchEvent(new a.w.KeyboardEvent('keydown',{bubbles:true,key:'Enter',isComposing:true}));assert.equal(a.renders,1);
 a.input.value='صيدلية';a.input.dispatchEvent(new a.w.CompositionEvent('compositionend',{bubbles:true}));assert.equal(a.tasks.size,1);a.flush();assert.equal(a.renders,2);assert.equal(a.w.search,'صيدلية');a.close();
});
test('Enter flushes once and clearing the field removes previous results',()=>{
 const a=setup();a.type('صيدلية');a.input.dispatchEvent(new a.w.KeyboardEvent('keydown',{bubbles:true,cancelable:true,key:'Enter'}));assert.equal(a.tasks.size,0);assert.equal(a.renders,2);a.flush();assert.equal(a.renders,2);
 a.type('');assert.equal(a.renders,2);a.flush();assert.equal(a.renders,3);assert.match(a.w.document.querySelector('#results').textContent,/متجر 0/);a.close();
});
test('navigation cancels pending searches and does not pull a visitor back from another page',()=>{
 const a=setup();a.type('صيدلية');a.w.location.hash='#offers';a.w.dispatchEvent(new a.w.HashChangeEvent('hashchange'));a.flush();assert.equal(a.renders,1);assert.equal(a.tasks.size,0);a.close();
});
test('an explicit reset is not postponed or overwritten by an old typing timer',()=>{
 const a=setup();a.type('صيدلية');a.w.search='';a.w.renderHome();assert.equal(a.renders,2);assert.equal(a.w.document.querySelector('#search').value,'');assert.equal(a.tasks.size,0);a.flush();assert.equal(a.renders,2);a.close();
});
test('the controller is loaded after all legacy render wrappers',()=>{
 const html=fs.readFileSync('index.html','utf8');assert.ok(html.indexOf('search-input.js?')>html.lastIndexOf('category-symbols.js?'));assert.equal((html.match(/src="search-input\.js/g)||[]).length,1);
});

test('the complete production render chain keeps typing focused and returns the right shop',async()=>{
 const path=require('node:path'),root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const dom=new JSDOM(html,{url:'https://damascus-shop.com/#home',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
 w.fetch=async()=>({ok:true,json:async()=>({})});w.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}};
 const scripts=[...html.matchAll(/<script[^>]*\bsrc="([^"?]+)[^"]*"[^>]*>/g)].map(m=>m[1]).filter(s=>!s.includes('://'));
 const sources=scripts.map(s=>fs.readFileSync(path.join(root,s),'utf8').replace(/\binit\(\);\s*$/,'')).join('\n;\n');
 try{
  w.eval(sources+`\nwindow.__fixture=()=>{stores=Array.from({length:500},(_,i)=>({id:'shop-'+i,name:i===499?'صيدلية داريا':'متجر '+i,active:true,category:'shop',description:'',online_ordering:false,opening_hours:{}}));products=[];heroStores=[];renderHome();};`);
  w.__fixture();const input=w.document.querySelector('#search');input.focus();
  // The first letter matches almost the entire directory: never build 499 cards.
  input.value='م';input.dispatchEvent(new w.InputEvent('input',{bubbles:true}));
  await new Promise(resolve=>setTimeout(resolve,360));
  assert.equal(w.document.querySelectorAll('#browse > .grid .card').length,12);
  assert.ok(parseInt(w.document.querySelector('.store-count').textContent,10)>=499);
  assert.equal(w.document.querySelector('#search'),input);assert.equal(w.document.activeElement,input);
  const firstIds=[...w.document.querySelectorAll('#browse > .grid .card a')].map(a=>a.hash);
  w.document.querySelector('#more-store-results').click();
  assert.equal(w.document.querySelectorAll('#browse > .grid .card').length,24);
  assert.deepEqual([...w.document.querySelectorAll('#browse > .grid .card a')].slice(0,12).map(a=>a.hash),firstIds);
  for(const value of ['ص','صي','صيد','صيدل','صيدلي','صيدلية']){input.value=value;input.dispatchEvent(new w.InputEvent('input',{bubbles:true}));}
  await new Promise(resolve=>setTimeout(resolve,360));
  assert.equal(w.document.querySelector('#search'),input);assert.equal(w.document.activeElement,input);assert.equal(input.value,'صيدلية');
  assert.equal(w.document.querySelectorAll('#browse .grid .card').length,1);assert.match(w.document.querySelector('#browse .grid').textContent,/صيدلية داريا/);
  assert.equal(w.document.querySelector('#more-store-results'),null);
  input.value='م';input.dispatchEvent(new w.InputEvent('input',{bubbles:true}));
  await new Promise(resolve=>setTimeout(resolve,360));
  assert.equal(w.document.querySelectorAll('#browse > .grid .card').length,12);
 }finally{dom.window.close();}
});
