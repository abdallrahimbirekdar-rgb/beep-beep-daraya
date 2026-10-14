const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup({fail=false}={}) {
 const values=new Map(),nodes={},calls=[];const app={innerHTML:'',querySelectorAll:()=>[],prepend(){}};
 const form={isConnected:true,elements:{reason:{value:'publisher'},note:{value:'The owner posted harmful images'}},innerHTML:'',querySelector:()=>nodes.status};
 nodes.status={textContent:''};nodes['#shop-content-report']=form;nodes['#app']=app;nodes['#modal']={close(){calls.push('closed')}};
 nodes['[data-confirm-shop-block]']={parentElement:{querySelector:()=>nodes.status}};
 const c={window:{addEventListener(){}},user:{id:'customer'},api:{rpc:async(name,payload)=>{calls.push({name,payload});return fail?{error:true}:{data:'report'}}},stores:[{id:'shop',name:'Shop'}],ct:a=>a,esc:x=>String(x),toast:x=>calls.push(x),modal:x=>calls.push(x),localStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},location:{hash:'#home'},document:{querySelector:s=>nodes[s],querySelectorAll:()=>[]},matchesCategory:()=>true,renderStore:id=>calls.push(['renderStore',id]),render:()=>calls.push('render'),MutationObserver:class{observe(){}}};
 vm.createContext(c);vm.runInContext(fs.readFileSync('shop-moderation.js','utf8'),c);
 return {c,values,calls,form,app,button:{disabled:false},blockButton:nodes['[data-confirm-shop-block]']};
}
test('shop blocks survive reload, stay separate for accounts, and can be reversed',()=>{
 const h=setup(),m=h.c.window.DarayaShopModeration;m.blockShop(h.c.stores[0]);h.blockButton.onclick();assert.equal(m.isBlocked('shop'),true);
 assert.equal(h.c.matchesCategory({id:'shop'}),false);h.c.user={id:'other'};assert.equal(m.isBlocked('shop'),false);h.c.user={id:'customer'};assert.equal(m.isBlocked('shop'),true);m.unblock('shop');assert.equal(m.isBlocked('shop'),false);
});
test('opening a blocked shop shows unblock navigation rather than products',()=>{
 const h=setup(),m=h.c.window.DarayaShopModeration;m.blockShop(h.c.stores[0]);h.blockButton.onclick();h.c.renderStore('shop');assert.match(h.app.innerHTML,/#blocked-shops/);assert.equal(h.calls.some(x=>Array.isArray(x)&&x[0]==='renderStore'),false);
});
test('owner complaints go to the existing admin report queue with their type intact',async()=>{
 const h=setup();h.c.window.DarayaShopModeration.reportShop(h.c.stores[0]);await h.form.onsubmit({preventDefault(){},submitter:h.button});const r=h.calls.find(x=>x.name==='create_place_report');assert.equal(r.payload.p_reason,'other');assert.match(r.payload.p_note,/\[publisher\]/);assert.equal(r.payload.p_store,'shop');assert.match(h.form.innerHTML,/role="status"/);
});
test('failed reports do not show success, and guests cannot submit',async()=>{
 const h=setup({fail:true});h.c.window.DarayaShopModeration.reportShop(h.c.stores[0]);await h.form.onsubmit({preventDefault(){},submitter:h.button});assert.equal(h.form.innerHTML,'');assert.equal(h.button.disabled,false);h.c.user=null;h.c.window.DarayaShopModeration.reportShop(h.c.stores[0]);assert.equal(h.c.location.hash,'#account');assert.equal(h.calls.filter(x=>x.name==='create_place_report').length,1);
});
test('switching accounts with a report or block dialog open never acts for the new account',async()=>{
 const h=setup(),m=h.c.window.DarayaShopModeration;m.reportShop(h.c.stores[0]);m.blockShop(h.c.stores[0]);h.c.user={id:'other'};await h.form.onsubmit({preventDefault(){},submitter:h.button});h.blockButton.onclick();assert.equal(h.calls.some(x=>x.name==='create_place_report'),false);assert.equal(m.isBlocked('shop'),false);
});
