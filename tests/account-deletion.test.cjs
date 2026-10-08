const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup({guest=false,blocked=false,error=false,unconfirmed=false,logoutError=false}={}){
 const elements={},calls=[],removed=[],saved=[];
 const node=s=>elements[s]||(elements[s]={innerHTML:'',textContent:'',isConnected:true,hidden:false});
 const context=vm.createContext({window:{},document:{querySelector:node},location:{hash:'#delete-account'},
 localStorage:{removeItem:k=>removed.push(k)},sessionStorage:{removeItem:k=>removed.push(k)},
 FormData:class{constructor(form){this.form=form;}get(){return this.form.confirmation;}},
 user:guest?null:{id:'own'},api:{rpc:async(name,args)=>{calls.push({name,args});return name==='account_deletion_status'?{data:{eligible:!blocked,reason:'BUSINESS_ACCOUNT'}}:error?{error:{message:'failure'}}:{data:{deleted:!unconfirmed}};},auth:{signOut:async()=>{if(logoutError)throw Error('403');}}},
 $:node,esc:s=>String(s),render(){},renderCustomerAccount(){},passwordRecovery:false,
 customerAuthPending:false,customerProfile:{address:'private'},customerLoadedFor:'own',admin:false,orders:[1],favoriteIds:[1],customerOrders:[1],cart:{p:1},cartStore:'s',
 remember:{set:(k,v)=>saved.push([k,v])},saveCart(){},updateCustomerNav(){},toast(){},marketOrderCompleted(){removed.push('pending-own');}});
 vm.runInContext(fs.readFileSync('public/account-deletion.js','utf8'),context);
 const run=s=>vm.runInContext(s,context);
 return {elements,calls,removed,saved,run,async render(){run('render()');await new Promise(setImmediate);},async submit(value='DELETE'){const event={preventDefault(){},target:{confirmation:value},submitter:{disabled:false}};await elements['#delete-account-form'].onsubmit(event);return event;}};
}
test('guest cannot call deletion or eligibility APIs',async()=>{const a=setup({guest:true});await a.render();assert.equal(a.calls.length,0);assert.match(a.elements['#app'].innerHTML,/سجّل الدخول/);});
test('linked business account is routed to support without deletion form',async()=>{const a=setup({blocked:true});await a.render();assert.match(a.elements['#deletion-content'].textContent,/مرتبط/);assert.equal(a.elements['#delete-account-form'],undefined);});
test('incorrect confirmation never invokes deletion',async()=>{const a=setup();await a.render();await a.submit('delete');assert.equal(a.calls.length,1);assert.equal(a.run('user.id'),'own');});
for(const mode of [{error:true},{unconfirmed:true}])test('failed or unconfirmed deletion preserves the local account: '+JSON.stringify(mode),async()=>{const a=setup(mode);await a.render();const event=await a.submit();assert.equal(a.run('user.id'),'own');assert.equal(a.removed.length,0);assert.equal(event.submitter.disabled,false);assert.match(a.elements['#deletion-status'].textContent,/لم نؤكد/);});
test('confirmed deletion removes session and local personal data despite logout error',async()=>{const a=setup({logoutError:true});await a.render();await a.submit();assert.deepEqual(a.calls[1],{name:'delete_my_account',args:a.calls[1].args});assert.equal(a.calls[1].args.p_confirmation,'DELETE');assert.equal(Object.keys(a.calls[1].args).length,1);assert.equal(a.run('user'),null);assert.equal(a.run('customerProfile'),null);assert.equal(a.run('cartStore'),null);assert.equal(a.run('customerOrders.length'),0);assert.ok(a.removed.includes('beep-beep-daraya-auth'));assert.ok(a.removed.includes('pending-own'));assert.match(a.elements['#app'].innerHTML,/تم حذف حسابك/);});
