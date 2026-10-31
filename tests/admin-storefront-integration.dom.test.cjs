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

test('every main shop section exposes its matching owner tools, including offers, cards and sharing',async()=>{
 for(const role of ['admin','owner']){const a=setup({role});try{
  a.run("renderDashboard('setup','shop')");a.$('.owner-manage-toggle').click();await new Promise(r=>setTimeout(r,35));
  for(const id of ['sf-products','sf-offers','sf-videos','sf-tools','sf-orders','sf-share','sf-other-tools']){
   assert.ok(a.$('#'+id+' .owner-edit-controls'),id+' has editing tools');
  }
  assert.ok(a.$('#sf-info .sf-info-accordion-item [data-owner-section-bound]'));
  a.$('[data-owner-add-offer]').click();const form=a.$('#daily-offer-form');assert.ok(form);assert.equal(form.elements.store.value,'shop');assert.equal(a.w.location.hash,'#store/shop');
  a.run("window.offerInsert=null;const originalFrom=api.from;api.from=table=>table==='daily_offers'?{insert(row){window.offerInsert=row;return Promise.resolve({error:null});}}:originalFrom(table);");
  form.elements.kind.value='text';form.elements.title.value='عرض جديد';form.elements.benefit.value='خصم خاص للجميع';form.elements.details.value='عرض بالسعر الموضح لجميع الزبائن';form.elements.agree.checked=true;
  await form.onsubmit({preventDefault(){},submitter:form.querySelector('[type=submit]')});
  assert.ok(a.w.offerInsert,form.querySelector('[data-result]')?.textContent);assert.equal(a.w.offerInsert.store_id,'shop');assert.equal(a.w.offerInsert.user_id,role);assert.equal(a.w.offerInsert.status,'pending');assert.match(form.textContent,/وصل العرض للمراجعة/);assert.deepEqual(a.errors,[]);
 }finally{a.close();}}
});
test('photos, video, page sections and public link tools open their real editors on the storefront',async()=>{
 const a=setup();try{
  a.w.mockStore.translations._page_sections=[{id:'services',title:'خدمات خاصة',content:'خدمات المتجر الإضافية'}];
  a.run("renderDashboard('setup','shop')");a.$('.owner-manage-toggle').click();await new Promise(r=>setTimeout(r,35));
  a.$('#sf-tools .owner-edit-controls button').click();assert.ok(a.$('#merchant-editor'));assert.ok(a.$('#add-place-photo'));a.$('#add-place-photo').click();assert.ok(a.$('#edit-form [name=caption]'));a.$('#modal').close();
  a.$('#sf-videos .owner-edit-controls button').click();assert.ok(a.$('.owner-inline-editor'));assert.equal(a.$('.owner-inline-editor').dataset.editorKey,'videos');assert.ok(a.$('#dashboard-content form'));
  a.$('#sf-share .owner-edit-controls button').click();assert.ok(a.$('#merchant-editor [name=public_slug]'));assert.equal(a.$('.owner-inline-editor').dataset.editorField,'@sharing');
  const custom=a.$('.public-shop-section[data-page-section-id=services]');assert.ok(custom.querySelector('.owner-edit-controls button'));custom.querySelector('.owner-edit-controls button').click();assert.equal(a.$('#page-section-form [name=title]').value,'خدمات خاصة');
  [...a.$('#sf-other-tools .owner-edit-controls').querySelectorAll('button')].find(b=>b.textContent.includes('إضافة قسم')).click();assert.deepEqual(a.errors,[]);assert.ok(a.$('#page-section-form'));assert.equal(a.$('#page-section-form [name=title]').value,'');assert.equal(a.w.location.hash,'#store/shop');assert.deepEqual(a.errors,[]);
 }finally{a.close();}
});
test('card settings render and save in the offers section without navigating away',async()=>{
 const a=setup();try{
  a.run("window.cardCalls=[];api.rpc=async(name,args)=>{window.cardCalls.push([name,args]);window.lastCardRPC=[name,args];return {data:{history_only:true,follow_enabled:true,purchase_enabled:false},error:null};};renderDashboard('setup','shop')");a.$('.owner-manage-toggle').click();await new Promise(r=>setTimeout(r,35));
  const controls=a.$('#sf-offers .owner-edit-controls');const button=[...controls.querySelectorAll('button')].find(b=>b.textContent.includes('إعدادات المتابعة'));assert.ok(button);button.click();await new Promise(r=>setTimeout(r,35));
  const form=a.$('#shop-cards-form');assert.ok(form);assert.ok(form.closest('#sf-offers'));form.elements.follow.checked=false;
  await form.onsubmit({preventDefault(){},submitter:form.querySelector('button')});await new Promise(r=>setTimeout(r,35));
  assert.ok(a.w.cardCalls.some(([name,args])=>name==='save_shop_purchase_cards'&&args.p_store==='shop'&&args.p_follow===false));assert.equal(a.w.location.hash,'#store/shop');assert.ok(a.$('#shop-cards-form'));assert.deepEqual(a.errors,[]);
 }finally{a.close();}
});
test('offer management is scoped to this shop and stays read-only after an account change',async()=>{
 const a=setup({role:'owner'});try{
  a.run("renderDashboard('setup','shop')");a.$('.owner-manage-toggle').click();await new Promise(r=>setTimeout(r,35));
  a.w.queryFilters=[];a.run(`api.from=table=>{const q={select(){return q;},eq(k,v){window.queryFilters.push([k,v]);return q;},order(){return q;},limit(){return q;},then(resolve){return Promise.resolve({data:[{id:'offer',title:'عرض المتجر',status:'pending',store_id:'shop',user_id:'owner',details:'شروط العرض'}],error:null}).then(resolve);}};return q;};`);
  [...a.$('#sf-offers .owner-edit-controls').querySelectorAll('button')].find(b=>b.textContent==='إدارة عروض المتجر').click();await new Promise(r=>setTimeout(r,35));
  assert.ok(a.$('[data-owner-withdraw]'));assert.ok(a.w.queryFilters.some(([k,v])=>k==='store_id'&&v==='shop'));assert.ok(a.w.queryFilters.some(([k,v])=>k==='user_id'&&v==='owner'));
  a.run('user=null');await new Promise(r=>setTimeout(r,35));a.w.confirm=()=>{throw Error('must not ask or mutate after sign-out');};a.$('[data-owner-withdraw]')?.click();assert.deepEqual(a.errors,[]);
 }finally{a.close();}
});

test('custom section saves preserve page editing and the existing store revision check',async()=>{
 const a=setup();try{
  a.run("renderDashboard('setup','shop')");a.$('.owner-manage-toggle').click();await new Promise(r=>setTimeout(r,35));
  [...a.$('#sf-other-tools .owner-edit-controls').querySelectorAll('button')].find(b=>b.textContent.includes('إضافة قسم')).click();
  const form=a.$('#page-section-form');form.elements.title.value='خدماتنا';form.elements.content.value='خدمات المتجر الإضافية';
  a.run(`window.sectionFilters=[];api.from=table=>({update(payload){window.sectionPayload=payload;return this;},eq(k,v){window.sectionFilters.push([k,v]);return this;},select(){return this;},single(){return Promise.resolve({data:{translations:window.sectionPayload.translations,revision:2},error:null});}});`);
  await form.onsubmit({preventDefault(){},submitter:form.querySelector('[type=submit]')});await new Promise(r=>setTimeout(r,35));
  assert.equal(a.w.location.hash,'#store/shop');assert.equal(a.$('#app').classList.contains('owner-view-clean'),false);assert.equal(a.w.sectionPayload.translations._page_sections[0].title,'خدماتنا');assert.ok(a.w.sectionFilters.some(([k,v])=>k==='revision'&&v===1));assert.ok(a.$('.public-shop-section'));assert.deepEqual(a.errors,[]);
 }finally{a.close();}
});
test('populated product pages add in the selected category through the native product save handler',async()=>{
 for(const role of ['admin','owner']){const a=setup({role});try{
  a.run(`products=[{id:'existing',store_id:'shop',name:'قميص',price:1000,available:true,section:'ألبسة',revision:3,translations:{},option_groups:[]}];renderDashboard('setup','shop');`);
  a.$('.owner-manage-toggle').click();await new Promise(r=>setTimeout(r,35));a.$('[data-target="sf-products"]').click();a.$('.menu-sections [data-section="ألبسة"]').click();await new Promise(r=>setTimeout(r,35));
  assert.equal(a.$('#app').classList.contains('owner-view-clean'),false);assert.equal(a.$('#sf-products').hasAttribute('inert'),false);a.$('#sf-products .owner-add-product').click();
  const form=a.$('#edit-form');assert.ok(form);assert.equal(form.elements.section.value,'ألبسة');form.elements.name.value='قميص جديد';form.elements.price.value='2000';
  a.run(`api.rpc=async(name,args)=>{if(name==='save_market_product')window.productRPC=[name,args];return {data:args.p_data?.id,error:null};};window.DarayaSaveFeedback.complete=async(form)=>{form.dataset.saveCommitted='true';};`);
  await form.onsubmit({preventDefault(){},submitter:form.querySelector('[type=submit]')});
  assert.equal(a.w.productRPC?.[0],'save_market_product',a.$('#form-error')?.textContent);assert.equal(a.w.productRPC[1].p_data.store_id,'shop');assert.equal(a.w.productRPC[1].p_data.section,'ألبسة');assert.equal(a.w.productRPC[1].p_revision,0);assert.equal(form.dataset.saveCommitted,'true');assert.deepEqual(a.errors,[]);
 }finally{a.close();}}
});
test('each visible product has a confirmed store- and revision-scoped delete action that returns to Products',async()=>{
 for(const role of ['admin','owner']){const a=setup({role});try{
  a.run(`products=[{id:'existing',store_id:'shop',name:'قميص',price:1000,available:true,section:'ألبسة',revision:3,translations:{},option_groups:[]}];renderDashboard('setup','shop');`);a.$('.owner-manage-toggle').click();await new Promise(r=>setTimeout(r,35));a.$('[data-target="sf-products"]').click();
  const del=a.$('.product .owner-delete-product');assert.ok(del);del.click();const form=a.$('#owner-delete-product-form');assert.ok(form);assert.equal(a.$('#modal').open,true);
  a.run(`window.deleteFilters=[];window.deleteCount=0;const nativeFrom=api.from;api.from=table=>table!=='products'?nativeFrom(table):({delete(){window.deleteCount++;window.deleteTable=table;return this;},eq(k,v){window.deleteFilters.push([k,v]);return this;},select(){return Promise.resolve({data:[{id:'existing'}],error:null});}});reload=async()=>{products=[];};`);
  await form.onsubmit({preventDefault(){},submitter:form.querySelector('[type=submit]')});await new Promise(r=>setTimeout(r,35));
  assert.equal(a.w.deleteTable,'products');for(const [k,v] of [['id','existing'],['store_id','shop'],['revision',3]])assert.ok(a.w.deleteFilters.some(([key,value])=>key===k&&value===v));assert.equal(a.w.deleteCount,1);assert.equal(a.w.location.hash,'#store/shop');assert.equal(a.$('.product'),null);assert.equal(a.$('#sf-products').hasAttribute('inert'),false);assert.equal(a.$('#app').classList.contains('owner-view-clean'),false);assert.deepEqual(a.errors,[]);
 }finally{a.close();}}
});
test('failed or stale deletion keeps the product and shows an error instead of false success',async()=>{
 const a=setup();try{
  a.run(`products=[{id:'existing',store_id:'shop',name:'منتج',price:1000,available:true,section:'منتجات',revision:3,translations:{},option_groups:[]}];renderDashboard('setup','shop');`);a.$('.owner-manage-toggle').click();await new Promise(r=>setTimeout(r,35));a.$('.owner-delete-product').click();
  const form=a.$('#owner-delete-product-form');a.run(`api.from=()=>({delete(){return this;},eq(){return this;},select(){return Promise.resolve({data:[],error:null});}});`);await form.onsubmit({preventDefault(){},submitter:form.querySelector('[type=submit]')});
  assert.match(form.querySelector('#form-error').textContent,/تغيّر|تغير|حدّث|صلاحية/);assert.ok(a.$('.product'));assert.notEqual(form.dataset.saveCommitted,'true');assert.equal(form.querySelector('button').disabled,false);assert.deepEqual(a.errors,[]);
 }finally{a.close();}
});

test('visitors see all four information accordions with saved data and no editing tools',async()=>{
 const a=setup({role:'visitor'});try{
  a.w.mockStore.opening_hours={sat:{closed:false,open:'09:00',close:'21:00'}};
  a.run("history.replaceState(null,'','#store/shop');renderStore('shop')");await new Promise(r=>setTimeout(r,35));a.$('[data-target="sf-info"]').click();
  for(const kind of ['about','contact','delivery','hours']){
   const panel=a.$('.shop-info-panel[data-sf-info-kind="'+kind+'"]');assert.ok(panel,kind);const button=a.w.document.getElementById(panel.getAttribute('aria-labelledby'));assert.ok(button);assert.equal(panel.hidden,false,kind);assert.ok(panel.textContent.trim(),kind+' contains public information');
  }
  const contact=a.$('.shop-info-panel[data-sf-info-kind="contact"]');assert.match(contact.textContent,/داريا، شارع السوق/);assert.ok(contact.querySelector('a[href="tel:+963900000000"]'));
  assert.equal(a.$('.owner-store-bar'),null);assert.equal(a.$('.owner-inline-editor'),null);assert.equal(a.$('.owner-edit-controls'),null);assert.deepEqual(a.errors,[]);
 }finally{a.close();}
});
test('empty information groups stay available to visitors with honest placeholders',async()=>{
 const a=setup({role:'visitor'});try{
  a.w.mockStore.description='';a.w.mockStore.address='';a.w.mockStore.contact_phone='';
  a.run("history.replaceState(null,'','#store/shop');renderStore('shop')");await new Promise(r=>setTimeout(r,35));
  for(const kind of ['about','contact','delivery','hours']){const panel=a.$('.shop-info-panel[data-sf-info-kind="'+kind+'"]');assert.ok(panel,kind);assert.equal(panel.hidden,false);}
  assert.match(a.$('.shop-info-panel[data-sf-info-kind="hours"]').textContent,/غير محددة/);assert.equal(a.$('.owner-inline-editor'),null);assert.deepEqual(a.errors,[]);
 }finally{a.close();}
});
test('storefront videos have Add new video at the top and an independent editor beside each video',async()=>{
 const a=setup();try{
  a.w.mockStore.translations._video_urls=['https://www.youtube.com/watch?v=M7lc1UVf-VE','https://vimeo.com/76979871'];
  a.run("renderDashboard('setup','shop')");a.$('.owner-manage-toggle').click();await new Promise(r=>setTimeout(r,35));a.$('[data-target=sf-videos]').click();
  assert.equal(a.w.document.querySelectorAll('#sf-videos .owner-video-actions button').length,2);
  a.$('#sf-videos .owner-video-actions button').click();let form=a.$('#merchant-videos-form');assert.equal(form.querySelectorAll('fieldset:not([hidden])').length,1);assert.equal(form.querySelector('fieldset:not([hidden]) [data-shop-video-url]').value,'https://www.youtube.com/watch?v=M7lc1UVf-VE');assert.ok(a.$('.owner-inline-editor').previousElementSibling.classList.contains('shop-video-item'));
  form.querySelector('[data-shop-video-url]').value='https://vimeo.com/22439234';form.dispatchEvent(new a.w.Event('input',{bubbles:true}));a.w.confirm=()=>false;a.w.document.querySelectorAll('#sf-videos .owner-video-actions button')[1].click();assert.equal(a.$('#merchant-videos-form'),form);
  a.w.confirm=()=>true;a.w.document.querySelectorAll('#sf-videos .owner-video-actions button')[1].click();assert.notEqual(a.$('#merchant-videos-form'),form);assert.equal(a.$('#merchant-videos-form fieldset:not([hidden]) [data-shop-video-url]').value,'https://vimeo.com/76979871');
  a.$('#sf-videos>.owner-edit-controls button').click();assert.equal(a.$('#merchant-videos-form fieldset:not([hidden]) [data-shop-video-url]').value,'');assert.deepEqual(a.errors,[]);
 }finally{a.close();}
});

test('orders and couriers are grouped under the main shop orders tile with compact tool cards',async()=>{
 for(const role of ['admin','owner']){const a=setup({role});try{
  a.run("history.replaceState(null,'','#store/shop');renderStore('shop')");
  a.$('.owner-manage-toggle').click();await new Promise(r=>setTimeout(r,35));
  const href=key=>role==='admin'?'#dashboard/setup/shop/'+key:'#dashboard/'+key+'/shop';
  const tile=a.$('.sf-section-nav [data-target="sf-orders"]');assert.ok(tile);tile.click();
  for(const key of ['orders','drivers']){
   const selector='a[href="'+href(key)+'"]';
   assert.ok(a.$('#sf-orders .owner-tools-grid '+selector),role+' '+key);
   assert.equal(a.$('#sf-other-tools '+selector),null);
   assert.equal(a.w.document.querySelectorAll(selector).length,1);
  }
  assert.ok(a.$('#sf-orders .owner-tool-label'));
  assert.equal(a.$('#sf-orders .dashboard-color-icon'),null);
  assert.equal(a.$('#sf-orders').classList.contains('sf-section-collapsed'),false);
  assert.deepEqual(a.errors,[]);
 }finally{a.close();}}
});

test('portrait shop navigation retains cover enlargement and owner section actions',async()=>{
 const a=setup({role:'owner'});try{
  a.run("history.replaceState(null,'','#store/shop');renderStore('shop')");await new Promise(r=>setTimeout(r,35));
  assert.ok(a.$('.sf-section-nav.sf-portrait-nav'));
  const cover=a.$('.sf-cover-button');assert.ok(cover);cover.click();
  assert.equal(a.$('#modal').open,true);assert.ok(a.$('#modal-body .sf-shop-gallery img'));assert.equal(a.$('#modal-body .sf-shop-gallery img').getAttribute('src'),a.$('.store-banner img.store-image').getAttribute('data-full-image'));
  a.$('#modal').close();a.$('.owner-manage-toggle').click();a.$('[data-target="sf-products"]').click();assert.equal(a.$('.store-banner').dataset.sfSectionView,'sf-products');assert.ok(a.$('#sf-products .owner-edit-controls'));a.$('.sf-section-return').click();assert.equal(a.$('.store-banner').dataset.sfSectionView,'sections');assert.deepEqual(a.errors,[]);
 }finally{a.close();}
});

test('admin-owned pizza gives customers the real basket and checkout rather than demo ordering',()=>{
 const a=setup({role:'other'});try{
  a.run(`const sid='a87c5210-2cb6-4dd7-b997-d43b9e2d206a';stores=[{...window.mockStore,id:sid,name:'بيتزا التنور',category:'restaurant',text_only:false,is_example:false,translations:{_directory:{kind:'restaurant'}},online_ordering:true,delivery_enabled:true,pickup_enabled:false,delivery_fee:10000,minimum_order:0,areas:['وسط داريا'],auto_hours:false}];products=[{id:'pizza-product',store_id:sid,name:'مارغريتا',description:'بيتزا',price:55000,image:'',available:true,section:'البيتزا',option_groups:[],gallery:[],translations:{}}];subscriptionSystemEnabled=false;history.replaceState(null,'','#store/'+sid);renderStore(sid);`);
  assert.equal(a.$('.owner-store-bar'),null);
  assert.equal(a.$('.demo-order-enabled'),null);
  a.$('[data-target="sf-products"]').click();a.$('[data-add="pizza-product"]').click();
  assert.equal(a.$('#checkout').disabled,false);assert.equal(a.$('#fulfillment-method').value,'delivery');
  a.$('#checkout').click();assert.ok(a.$('#order-form'));assert.ok(a.$('#order-form [name="address"]'));
  assert.equal(a.$('[data-demo-checkout]'),null);assert.deepEqual(a.errors,[]);
 }finally{a.close();}
});

test('administrators can buy from the delivery test restaurant, with editing retained and other shops unchanged',()=>{
 const a=setup();try{
  a.run(`const sid='a87c5210-2cb6-4dd7-b997-d43b9e2d206a';stores=[{...window.mockStore,id:sid,name:'بيتزا التنور',category:'restaurant',text_only:false,is_example:false,translations:{_directory:{kind:'restaurant'}},online_ordering:true,delivery_enabled:true,pickup_enabled:false,delivery_fee:10000,minimum_order:0,areas:['وسط داريا'],auto_hours:false}];products=[{id:'pizza-product',store_id:sid,name:'مارغريتا',description:'بيتزا',price:55000,image:'',available:true,section:'البيتزا',option_groups:[],gallery:[],translations:{}}];subscriptionSystemEnabled=false;history.replaceState(null,'','#store/'+sid);renderStore(sid);`);
  assert.ok(a.$('.owner-store-bar'));
  assert.equal(a.$('.demo-order-enabled'),null);
  a.$('[data-target="sf-products"]').click();a.$('[data-add="pizza-product"]').click();
  assert.equal(a.$('#checkout').disabled,false);assert.equal(a.$('#fulfillment-method').value,'delivery');
  a.$('#checkout').click();assert.ok(a.$('#order-form'));assert.ok(a.$('#order-form [name="address"]'));
  assert.equal(a.$('[data-demo-checkout]'),null);
  a.run(`document.querySelector('#modal').close();stores[0].id='ordinary-shop';products[0].store_id='ordinary-shop';history.replaceState(null,'','#store/ordinary-shop');renderStore('ordinary-shop');`);
  assert.ok(a.$('.owner-store-bar'));assert.equal(a.$('[data-add]'),null);assert.equal(a.$('#cart'),null);assert.deepEqual(a.errors,[]);
 }finally{a.close();}
});
