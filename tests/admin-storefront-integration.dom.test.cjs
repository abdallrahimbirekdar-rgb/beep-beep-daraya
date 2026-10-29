const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM,VirtualConsole}=require('jsdom');
// Load the entire shipped script chain: reduced mocks missed an earlier catalog-removal wrapper.
function setup({role='admin',ordering=false,readable=false}={}){
 const html=fs.readFileSync('index.html','utf8'),errors=[],vc=new VirtualConsole();
 vc.on('jsdomError',e=>{if(!/navigation|scrollTo|HTMLCanvasElement/.test(e.message))errors.push(e.message);});
 const dom=new JSDOM(html,{url:readable?'https://damascus-shop.com/darayya/test-shop/':'https://damascus-shop.com/#dashboard/setup/shop/overview',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window,context=dom.getInternalVMContext();
 w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};w.matchMedia=()=>({matches:true,addEventListener(){}});
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.fetch=async()=>({ok:true,json:async()=>({}),text:async()=>''});
 const query=new Proxy({then:resolve=>Promise.resolve({data:[],error:null}).then(resolve)},{get:(target,key)=>key in target?target[key]:()=>query});
 w.mockApi={from:()=>query,rpc:()=>query,auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}},storage:{from:()=>query},channel:()=>query,removeChannel(){}};
 w.mockStore={id:'shop',name:'سوبر ماركت بيت العائلة',category:'shop',description:'سوبر ماركت',address:'داريا',image:'',active:true,is_open:true,areas:[],translations:{_directory:{kind:'shop',slug:'test-shop'}},opening_hours:{},revision:1,online_ordering:ordering,owner_email:'owner@example.com'};
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
