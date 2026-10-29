const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM,VirtualConsole}=require('jsdom');
// Load the entire shipped script chain: reduced mocks missed an earlier catalog-removal wrapper.
function setup({role='admin',ordering=false,readable=false}={}){
 const html=fs.readFileSync('index.html','utf8'),errors=[],vc=new VirtualConsole();
 vc.on('jsdomError',e=>{if(!/navigation|scrollTo|HTMLCanvasElement/.test(e.message))errors.push(e.message);});
 const dom=new JSDOM(html,{url:readable?'https://damascus-shop.com/darayya/test-shop/':'https://damascus-shop.com/#dashboard/setup/shop/overview',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window,context=dom.getInternalVMContext();
 w.structuredClone=structuredClone;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};w.matchMedia=()=>({matches:true,addEventListener(){}});
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.fetch=async()=>({ok:true,json:async()=>({}),text:async()=>''});
 const query=new Proxy({then:resolve=>Promise.resolve({data:[],error:null}).then(resolve)},{get:(target,key)=>key in target?target[key]:()=>query});
 w.mockApi={from:()=>query,rpc:()=>query,auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}},storage:{from:()=>query},channel:()=>query,removeChannel(){}};
 w.mockStore={id:'shop',name:'سوبر ماركت بيت العائلة',category:'shop',description:'سوبر ماركت',address:'داريا، شارع السوق',contact_phone:'+963900000000',image:'https://damascus-shop.com/daraya-mark-gold.webp',active:true,is_open:true,areas:[],translations:{_directory:{kind:'shop',slug:'test-shop'}},opening_hours:{},revision:1,online_ordering:ordering,owner_email:'owner@example.com'};
 w.mockUser=role==='visitor'?null:{id:role,email:role+'@example.com'};w.mockAdmin=role==='admin';
 for(const src of [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(x=>x[1])){
  const path=src.split('?')[0].replace(/^\//,'');let source=fs.readFileSync(path,'utf8');
  if(path==='app.js')source=source.replace(/init\(\);\s*$/,'');
  vm.runInContext(source,context,{filename:path});
  if(path==='app.js')vm.runInContext('api=window.mockApi;user=window.mockUser;admin=window.mockAdmin;stores=[window.mockStore];products=[];orders=[];',context);
 }
 return {w,context,errors,$:s=>w.document.querySelector(s),run:code=>vm.runInContext(code,context),close:()=>dom.window.close()};
}
test('main administration can open an empty display-only shop and the real add-product form',()=>{
 const a=setup();try{a.run("renderDashboard('setup','shop')");assert.equal(a.w.location.hash,'#store/shop');assert.ok(a.$('.owner-store-bar'));assert.equal(a.$('[data-target="sf-products"]').disabled,false);
  a.$('.owner-manage-toggle').click();a.$('[data-target="sf-products"]').click();a.$('#sf-products .owner-edit-controls button').click();assert.equal(a.$('#modal').open,true);assert.ok(a.$('#edit-form [name="name"]'));assert.ok(a.$('#edit-form [name="price"]'));assert.deepEqual(a.errors,[]);
 }finally{a.close();}
});
test('main administration opens the real information editor from the storefront',async()=>{
 const a=setup();try{a.run("renderDashboard('setup','shop')");a.$('.owner-manage-toggle').click();await new Promise(r=>setTimeout(r,35));a.$('#sf-info [data-sf-info-row="about"]').click();assert.ok(a.$('#merchant-editor [name="name"]'));assert.equal(a.$('#merchant-editor [name="name"]').value,'سوبر ماركت بيت العائلة');assert.equal(a.$('.owner-inline-editor').dataset.editorKey,'details');assert.deepEqual(a.errors,[]);}finally{a.close();}
});
test('empty shops remain editable with online ordering enabled or disabled',()=>{
 for(const role of ['admin','owner'])for(const ordering of [true,false]){const a=setup({role,ordering});try{a.run("history.replaceState(null,'','#store/shop');renderStore('shop')");assert.equal(a.$('[data-target="sf-products"]').disabled,false);assert.ok(a.$('#sf-products .owner-edit-controls button'),role+' ordering='+ordering+' '+a.w.location.hash);assert.deepEqual(a.errors,[]);}finally{a.close();}}
});
test('direct readable shop links retain administrator editing controls',async()=>{
 const a=setup({readable:true});try{a.run("renderStore('shop')");assert.equal(a.w.location.hash,'');assert.ok(a.$('.owner-store-bar'));assert.equal(a.$('[data-target="sf-products"]').disabled,false);a.$('.owner-manage-toggle').click();await new Promise(r=>setTimeout(r,35));a.$('#sf-info [data-sf-info-row="about"]').click();assert.ok(a.$('#merchant-editor'));assert.deepEqual(a.errors,[]);}finally{a.close();}
});
test('visitors and unrelated signed-in users never gain editing controls',()=>{
 for(const role of ['visitor','other']){const a=setup({role});try{a.run("history.replaceState(null,'','#store/shop');renderStore('shop')");assert.equal(a.$('.owner-store-bar'),null);assert.equal(a.$('.owner-edit-controls'),null);assert.equal(a.$('[data-target="sf-products"]').disabled,true);assert.deepEqual(a.errors,[]);}finally{a.close();}}
});
test('opening information sections in edit mode mounts the matching form inside that section',async()=>{
 for(const role of ['admin','owner']){const a=setup({role});try{
  a.run("history.replaceState(null,'','#store/shop');renderStore('shop')");a.$('.owner-manage-toggle').click();await new Promise(r=>setTimeout(r,35));
  assert.equal(a.$('#sf-info>.owner-edit-controls'),null);assert.equal(a.$('#sf-info .owner-field-fallback'),null);assert.equal(a.$('#sf-info .owner-field-action'),null);
  a.$('#sf-info [data-sf-info-row="contact"][aria-controls]').click();
  const form=a.$('#merchant-editor'),panel=form.closest('.shop-info-panel');assert.equal(panel.dataset.sfInfoKind,'contact');assert.equal(panel.hidden,false);
  assert.ok(form.elements.address);assert.ok(form.elements.contact_phone);assert.ok(form.querySelector('[data-social-editor]'));assert.ok(form.querySelector('.store-location-editor'));
  form.elements.contact_phone.value='+963911111111';
  a.$('#sf-info [data-sf-info-row="about"]').click();assert.equal(a.$('#merchant-editor'),form);assert.equal(form.elements.contact_phone.value,'+963911111111');assert.equal(form.closest('.shop-info-panel').dataset.sfInfoKind,'about');assert.ok(['name','page_mode'].includes(a.w.document.activeElement.name));assert.deepEqual(a.errors,[]);
 }finally{a.close();}}
});
test('field pencils stay absent for visitors and disappear when leaving editing mode',async()=>{
 for(const role of ['visitor','other']){const a=setup({role});try{a.run("history.replaceState(null,'','#store/shop');renderStore('shop')");assert.equal(a.$('.owner-field-action'),null);assert.equal(a.$('.owner-field-fallback'),null);}finally{a.close();}}
 const a=setup();try{a.run("renderDashboard('setup','shop')");assert.ok(a.$('.owner-field-action'));assert.ok(a.$('#app').classList.contains('owner-view-clean'));a.$('.owner-manage-toggle').click();assert.equal(a.$('#app').classList.contains('owner-view-clean'),false);a.$('.owner-manage-toggle').click();assert.equal(a.$('#app').classList.contains('owner-view-clean'),true);}finally{a.close();}
});
test('phone and address changes use the existing revision-checked save handler',async()=>{
 const a=setup();try{a.run("renderDashboard('setup','shop')");a.$('.owner-manage-toggle').click();await new Promise(r=>setTimeout(r,35));a.$('#sf-info [data-sf-info-row="contact"][aria-controls]').click();
  const form=a.$('#merchant-editor');form.elements.contact_phone.value='+963922222222';form.elements.address.value='داريا، عنوان جديد';
  a.w.savedPayload=null;a.w.savedFilters=[];
  a.run(`api.from=table=>({update(payload){window.savedPayload=payload;window.savedTable=table;return this;},eq(key,value){window.savedFilters.push([key,value]);return this;},select(){return Promise.resolve({data:[{id:'shop'}],error:null});}});window.DarayaSaveFeedback.complete=async form=>{form.dataset.saveCommitted='true';};const originalFail=window.DarayaSaveFeedback.fail;window.DarayaSaveFeedback.fail=(error,...args)=>{window.saveError=error.stack;return originalFail(error,...args);};`);
  await form.onsubmit({preventDefault(){},target:form,submitter:form.querySelector('[type="submit"]')});
  assert.equal(a.w.savedTable,'stores',a.w.saveError||a.$('#editor-error')?.textContent);assert.equal(a.w.savedPayload.contact_phone,'+963922222222');assert.equal(a.w.savedPayload.address,'داريا، عنوان جديد');assert.ok(a.w.savedFilters.some(([key,value])=>key==='id'&&value==='shop'));assert.ok(a.w.savedFilters.some(([key,value])=>key==='revision'&&value===1));assert.equal(form.dataset.saveCommitted,'true');
 }finally{a.close();}
});

test('section editors show only relevant fields, protect drafts and disappear in visitor mode',async()=>{
 const a=setup();try{
  const style=a.w.document.createElement('style');style.textContent=fs.readFileSync('owner-store-editor.css','utf8');a.w.document.head.append(style);
  a.run("renderDashboard('setup','shop')");a.$('.owner-manage-toggle').click();await new Promise(r=>setTimeout(r,35));
  assert.match(a.$('.owner-edit-mode-notice').textContent,/أنت الآن في وضع التعديل/);
  a.$('#sf-info [data-sf-info-row="contact"][aria-controls]').click();
  const form=a.$('#merchant-editor');assert.equal(a.w.getComputedStyle(form.elements.name.closest('label')).display,'none');assert.notEqual(a.w.getComputedStyle(form.elements.contact_phone.closest('label')).display,'none');
  form.elements.contact_phone.value='+963911111111';form.dispatchEvent(new a.w.Event('input',{bubbles:true}));
  a.w.confirm=()=>false;a.$('#sf-info [data-sf-info-row="hours"]').click();assert.equal(a.$('#merchant-editor'),form);assert.equal(form.closest('.shop-info-panel').hidden,false);
  a.w.confirm=()=>true;a.$('#sf-info [data-sf-info-row="hours"]').click();assert.equal(a.$('.owner-inline-editor').dataset.editorKey,'hours');assert.equal(a.$('#merchant-editor').closest('.shop-info-panel').dataset.sfInfoKind,'hours');assert.ok(a.$('#merchant-editor input[type="time"]'));
  a.$('.owner-manage-toggle').click();assert.equal(a.$('.owner-inline-editor'),null);assert.equal(a.w.getComputedStyle(a.$('.owner-edit-mode-notice')).display,'none');
  a.$('#sf-info [data-sf-info-row="about"]').click();assert.equal(a.$('.owner-inline-editor'),null);assert.deepEqual(a.errors,[]);
 }finally{a.close();}
});
