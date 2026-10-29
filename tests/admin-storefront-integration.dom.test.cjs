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
test('main administration opens the real information editor from the storefront',()=>{
 const a=setup();try{a.run("renderDashboard('setup','shop')");a.$('.owner-manage-toggle').click();a.$('#sf-info .owner-edit-controls button').click();assert.ok(a.$('#merchant-editor [name="name"]'));assert.equal(a.$('#merchant-editor [name="name"]').value,'سوبر ماركت بيت العائلة');assert.equal(a.$('.owner-inline-editor').dataset.editorKey,'details');assert.deepEqual(a.errors,[]);}finally{a.close();}
});
test('empty shops remain editable with online ordering enabled or disabled',()=>{
 for(const role of ['admin','owner'])for(const ordering of [true,false]){const a=setup({role,ordering});try{a.run("history.replaceState(null,'','#store/shop');renderStore('shop')");assert.equal(a.$('[data-target="sf-products"]').disabled,false);assert.ok(a.$('#sf-products .owner-edit-controls button'),role+' ordering='+ordering+' '+a.w.location.hash);assert.deepEqual(a.errors,[]);}finally{a.close();}}
});
test('direct readable shop links retain administrator editing controls',()=>{
 const a=setup({readable:true});try{a.run("renderStore('shop')");assert.equal(a.w.location.hash,'');assert.ok(a.$('.owner-store-bar'));assert.equal(a.$('[data-target="sf-products"]').disabled,false);a.$('.owner-manage-toggle').click();a.$('#sf-info .owner-edit-controls button').click();assert.ok(a.$('#merchant-editor'));assert.deepEqual(a.errors,[]);}finally{a.close();}
});
test('visitors and unrelated signed-in users never gain editing controls',()=>{
 for(const role of ['visitor','other']){const a=setup({role});try{a.run("history.replaceState(null,'','#store/shop');renderStore('shop')");assert.equal(a.$('.owner-store-bar'),null);assert.equal(a.$('.owner-edit-controls'),null);assert.equal(a.$('[data-target="sf-products"]').disabled,true);assert.deepEqual(a.errors,[]);}finally{a.close();}}
});
test('phone and address have direct edit buttons that focus their real form fields without discarding a draft',async()=>{
 for(const role of ['admin','owner']){const a=setup({role});try{
  a.run("history.replaceState(null,'','#store/shop');renderStore('shop')");a.$('.owner-manage-toggle').click();await new Promise(r=>setTimeout(r,35));
  assert.ok(a.$('#sf-info a[href^="tel:"]'));
  const phone=a.$('#sf-info .owner-field-action[data-owner-field="contact_phone"] button');assert.ok(phone);phone.click();
  const form=a.$('#merchant-editor');assert.ok(form.elements.contact_phone);assert.equal(a.w.document.activeElement.name,'contact_phone');form.elements.contact_phone.value='+963911111111';
  const address=a.$('#sf-info .owner-field-action[data-owner-field="address"] button');assert.ok(address);address.click();
  assert.equal(a.$('#merchant-editor'),form);assert.equal(form.elements.contact_phone.value,'+963911111111');assert.deepEqual(a.errors,[]);assert.equal(a.w.document.activeElement.name,'address');assert.equal(form.elements.address.value,'داريا، شارع السوق');assert.equal(a.w.location.hash,'#store/shop');assert.deepEqual(a.errors,[]);
 }finally{a.close();}}
});
test('field pencils stay absent for visitors and disappear when leaving editing mode',async()=>{
 for(const role of ['visitor','other']){const a=setup({role});try{a.run("history.replaceState(null,'','#store/shop');renderStore('shop')");assert.equal(a.$('.owner-field-action'),null);assert.equal(a.$('.owner-field-fallback'),null);}finally{a.close();}}
 const a=setup();try{a.run("renderDashboard('setup','shop')");assert.ok(a.$('.owner-field-action'));assert.ok(a.$('#app').classList.contains('owner-view-clean'));a.$('.owner-manage-toggle').click();assert.equal(a.$('#app').classList.contains('owner-view-clean'),false);a.$('.owner-manage-toggle').click();assert.equal(a.$('#app').classList.contains('owner-view-clean'),true);}finally{a.close();}
});
test('phone and address changes use the existing revision-checked save handler',async()=>{
 const a=setup();try{a.run("renderDashboard('setup','shop')");a.$('.owner-manage-toggle').click();await new Promise(r=>setTimeout(r,35));a.$('#sf-info .owner-field-action[data-owner-field="contact_phone"] button').click();
  const form=a.$('#merchant-editor');form.elements.contact_phone.value='+963922222222';form.elements.address.value='داريا، عنوان جديد';
  a.w.savedPayload=null;a.w.savedFilters=[];
  a.run(`api.from=table=>({update(payload){window.savedPayload=payload;window.savedTable=table;return this;},eq(key,value){window.savedFilters.push([key,value]);return this;},select(){return Promise.resolve({data:[{id:'shop'}],error:null});}});window.DarayaSaveFeedback.complete=async form=>{form.dataset.saveCommitted='true';};const originalFail=window.DarayaSaveFeedback.fail;window.DarayaSaveFeedback.fail=(error,...args)=>{window.saveError=error.stack;return originalFail(error,...args);};`);
  await form.onsubmit({preventDefault(){},target:form,submitter:form.querySelector('[type="submit"]')});
  assert.equal(a.w.savedTable,'stores',a.w.saveError||a.$('#editor-error')?.textContent);assert.equal(a.w.savedPayload.contact_phone,'+963922222222');assert.equal(a.w.savedPayload.address,'داريا، عنوان جديد');assert.ok(a.w.savedFilters.some(([key,value])=>key==='id'&&value==='shop'));assert.ok(a.w.savedFilters.some(([key,value])=>key==='revision'&&value===1));assert.equal(form.dataset.saveCommitted,'true');
 }finally{a.close();}
});

test('direct editing shows only the chosen field beside its value and restores the full section editor',async()=>{
 const a=setup();try{
  const style=a.w.document.createElement('style');style.textContent=fs.readFileSync('owner-store-editor.css','utf8');a.w.document.head.append(style);
  a.run("renderDashboard('setup','shop')");a.$('.owner-manage-toggle').click();await new Promise(r=>setTimeout(r,35));
  a.$('.owner-field-action[data-owner-field="name"] button').click();
  const panel=a.$('.owner-inline-editor'),form=a.$('#merchant-editor');
  assert.ok(panel.closest('.store-banner'));assert.ok(panel.classList.contains('owner-single-field'));
  assert.equal(a.w.getComputedStyle(form.elements.contact_phone.closest('label')).display,'none');
  assert.notEqual(a.w.getComputedStyle(form.elements.name.closest('label')).display,'none');
  assert.equal(form.querySelector('[type="submit"]').textContent,'حفظ');
  form.elements.name.value='اسم جديد';
  a.$('.owner-field-action[data-owner-field="contact_phone"] button').click();
  assert.equal(a.$('#merchant-editor'),form);assert.equal(form.elements.name.value,'اسم جديد');
  assert.equal(a.w.getComputedStyle(form.elements.name.closest('label')).display,'none');
  assert.notEqual(a.w.getComputedStyle(form.elements.contact_phone.closest('label')).display,'none');
  a.$('#sf-info .owner-edit-controls button').click();assert.equal(panel.classList.contains('owner-single-field'),false);assert.deepEqual(a.errors,[]);
 }finally{a.close();}
});
