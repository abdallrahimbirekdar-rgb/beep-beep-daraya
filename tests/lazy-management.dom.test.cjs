const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('lazy-management.js','utf8'),tick=()=>new Promise(setImmediate);
function setup(hash='#home'){
 const dom=new JSDOM('<html><head></head><body><main id="app"></main><script type="application/x-daraya-feature" data-feature="management" data-src="one.js?v=1"></script><script type="application/x-daraya-feature" data-feature="management" data-src="two.js?v=2"></script></body></html>',{url:'https://damascus-shop.com/'+hash,runScripts:'outside-only'}),w=dom.window,requests=[],renders=[];
 w.render=()=>renders.push(w.location.hash);w.renderDashboard=()=>renders.push('dashboard');
 w.document.head.append=node=>requests.push(node);w.eval(source);
 return {w,requests,renders,async complete(index){requests[index].onload();await tick();},close:()=>w.close()};
}
test('browsing, shop, offers and account routes do not request management tools',()=>{
 for(const hash of ['#home','#store/shop','#offers','#account','#example/restaurant']){const h=setup(hash);try{h.w.render();assert.equal(h.requests.length,0);assert.deepEqual(h.renders,[hash]);}finally{h.close();}}
});
test('direct dashboard load waits for scripts in order and duplicate renders share one load',async()=>{
 const h=setup('#dashboard/notebook/shop');try{h.w.render();h.w.render();h.w.renderDashboard();assert.equal(h.requests.length,1);assert.equal(h.renders.length,0);assert.ok(h.w.document.querySelector('[data-management-loading]'));assert.match(h.requests[0].src,/one.js\?v=1$/);await h.complete(0);assert.equal(h.requests.length,2);assert.match(h.requests[1].src,/two.js\?v=2$/);await h.complete(1);assert.equal(h.w.DarayaManagement.ready,true);assert.deepEqual(h.renders,['#dashboard/notebook/shop']);h.w.renderDashboard();assert.equal(h.requests.length,2);assert.equal(h.renders.at(-1),'dashboard');}finally{h.close();}
});
test('navigation to a custom management route triggers loading and late results do not navigate back',async()=>{
 const h=setup();try{h.w.location.hash='#facebook-studio';await new Promise(r=>setTimeout(r,10));assert.equal(h.requests.length,1);h.w.location.hash='#home';h.w.render();await h.complete(0);await h.complete(1);assert.equal(h.w.location.hash,'#home');assert.deepEqual(h.renders,['#home']);}finally{h.close();}
});
test('retry resumes after a failed download without evaluating previous scripts twice',async()=>{
 const h=setup('#account-deletion-admin');try{h.w.render();await h.complete(0);h.requests[1].onerror();await tick();assert.equal(h.w.DarayaManagement.ready,false);const button=h.w.document.querySelector('#app button');assert.ok(button);button.click();await tick();assert.equal(h.requests.length,3);assert.match(h.requests[2].src,/two.js/);await h.complete(2);assert.equal(h.w.DarayaManagement.ready,true);assert.deepEqual(h.renders,['#account-deletion-admin']);}finally{h.close();}
});
test('lazily installed render wrappers retain the existing render chain',async()=>{
 const h=setup('#dashboard');try{h.w.render();await h.complete(0);const old=h.w.render;h.w.render=function(){h.renders.push('feature');return old.apply(this,arguments);};await h.complete(1);assert.deepEqual(h.renders,['feature','#dashboard']);}finally{h.close();}
});
