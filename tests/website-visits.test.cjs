const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('website-visits.js','utf8');
const totals={total:100,visitors:60,today:5,today_visitors:4,week:20,month:80};
function report(days=7){return {days,from:'2026-10-16',to:'2026-10-22',tracking_started:'2026-10-03',coverage_days:days,previous_coverage_days:days,current:{visits:20,visitors:10,known_sessions:20,unknown_sessions:0,active_days:5},previous:{visits:10,visitors:7},audience:{new:7,returning:3,multiple_sessions:4},daily:[{day:'2026-10-22',visits:20,visitors:10}],hours:[{hour:19,visits:8}],activity:{shop_views:30,calls:4},top_shops:[{id:'11111111-1111-4111-8111-111111111111',name:'<img src=x onerror=alert(1)>',views:9,contacts:2}],top_categories:[{category:'restaurant',views:12}]};}
function setup({admin=true,pending=false,fail=false,storage={},visitFailure=false}={}){
 const dom=new JSDOM('<main id="app" data-dashboard-route="#dashboard/statistics"><section id="dashboard-content"></section></main>',{url:admin?'https://damascus-shop.com/#dashboard/statistics':'https://damascus-shop.com/#home',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,calls=[],queue=[];
 for(const [key,value] of Object.entries(storage))w.localStorage.setItem(key,value);
 w.admin=admin;w.user=admin?{id:'admin'}:null;w.live=true;w.directoryKinds=[['restaurant','مطاعم ومقاهٍ']];w.api={rpc(name,args){calls.push({name,args});if(name==='website_visit_stats')return Promise.resolve({data:totals});if(name==='record_website_visit')return Promise.resolve(visitFailure?{error:{message:'offline'}}:{data:null});if(pending)return new Promise(resolve=>queue.push({days:args.p_days,resolve}));return Promise.resolve(fail?{error:{message:'missing'}}:{data:report(args.p_days)});}};
 w.eval(source);return {dom,w,calls,queue,flush:()=>new Promise(setImmediate),close:()=>dom.window.close()};
}
test('admin report shows aggregate audience, trends, activity and rankings with escaped shop names',async()=>{
 const h=setup();try{await h.flush();const doc=h.w.document;assert.match(doc.querySelector('[data-visitor-report]').textContent,/زوار عائدون/);assert.match(doc.querySelector('[data-visitor-report]').textContent,/ارتفاع 100/);assert.match(doc.querySelector('[data-visitor-report]').textContent,/مطاعم ومقاهٍ/);assert.equal(doc.querySelector('.visitor-ranking img'),null);assert.ok(doc.querySelector('.visitor-ranking a'));assert.equal(doc.querySelectorAll('.visitor-day').length,1);assert.equal(h.calls.some(c=>c.name==='record_website_visit'),false);}finally{h.close();}
});
test('visitor recording keeps its existing two fields and regular visitors cannot load admin reports',async()=>{
 const h=setup({admin:false});try{await h.flush();assert.equal(h.w.document.querySelector('#website-visit-stats'),null);assert.equal(h.calls.length,1);assert.equal(h.calls[0].name,'record_website_visit');assert.deepEqual(Object.keys(h.calls[0].args).sort(),['p_session','p_visitor']);assert.ok(h.w.localStorage.getItem('daraya-visitor-id'));}finally{h.close();}
});
test('rapid period changes discard older responses and preserve the newest selection',async()=>{
 const h=setup({pending:true});try{const select=h.w.document.querySelector('[data-visitor-period]');for(const days of [30,90]){select.value=String(days);select.dispatchEvent(new h.w.Event('change'));}const last=h.queue.find(x=>x.days===90);last.resolve({data:report(90)});await h.flush();const result=h.w.document.querySelector('[data-visitor-report]');assert.match(result.textContent,/2026-10-16/);const html=result.innerHTML;for(const q of h.queue.filter(x=>x.days!==90))q.resolve({data:{...report(q.days),from:'1990-01-01'}});await h.flush();assert.equal(result.innerHTML,html);assert.equal(select.value,'90');}finally{h.close();}
});
test('logout or navigation prevents a pending admin response from appearing',async()=>{
 for(const action of ['logout','navigate']){const h=setup({pending:true});try{if(action==='logout')h.w.user=null;else h.w.history.replaceState(null,'','#home');h.queue[0].resolve({data:report()});await h.flush();assert.equal(h.w.document.querySelector('[data-visitor-report]').innerHTML,'');}finally{h.close();}}
});
test('unavailable detailed reporting retains the existing totals and an explicit retry message',async()=>{
 const h=setup({fail:true});try{await h.flush();assert.match(h.w.document.querySelector('[data-visit-numbers]').textContent,/100/);assert.match(h.w.document.querySelector('[data-visitor-report]').textContent,/تعذر تحميل التحليل التفصيلي/);assert.equal(h.w.document.querySelector('[aria-busy=true]'),null);}finally{h.close();}
});
test('incomplete historic coverage and zero previous visits do not invent growth percentages',async()=>{
 const h=setup({pending:true});try{const p=report(30);p.previous_coverage_days=0;p.previous.visits=0;h.queue[0].resolve({data:p});await h.flush();const text=h.w.document.querySelector('[data-visitor-report]').textContent;assert.match(text,/الفترة السابقة غير مكتملة/);assert.doesNotMatch(text,/ارتفاع|Infinity|NaN/);}finally{h.close();}
});


test('another tab or reopened app reuses the active browser session',async()=>{
 const a=setup({admin:false});let storage;try{await a.flush();storage=Object.fromEntries(['daraya-visit-session','daraya-visitor-id'].map(k=>[k,a.w.localStorage.getItem(k)]));}finally{a.close();}
 const b=setup({admin:false,storage});try{await b.flush();assert.equal(b.calls.filter(c=>c.name==='record_website_visit').length,0);assert.equal(JSON.parse(b.w.localStorage.getItem('daraya-visit-session')).id,JSON.parse(storage['daraya-visit-session']).id);}finally{b.close();}
});
test('a failed request persists its session ID for a retry in another tab',async()=>{
 const a=setup({admin:false,visitFailure:true});let storage,id;try{await a.flush();id=a.calls[0].args.p_session;storage=Object.fromEntries(['daraya-visit-session','daraya-visitor-id'].map(k=>[k,a.w.localStorage.getItem(k)]));assert.equal(JSON.parse(storage['daraya-visit-session']).recorded,false);}finally{a.close();}
 const b=setup({admin:false,storage});try{await b.flush();assert.equal(b.calls[0].args.p_session,id);assert.equal(JSON.parse(b.w.localStorage.getItem('daraya-visit-session')).recorded,true);}finally{b.close();}
});
test('thirty minutes of inactivity starts a new session for the same visitor',async()=>{
 const visitor='11111111-1111-4111-8111-111111111111',session='22222222-2222-4222-8222-222222222222';const h=setup({admin:false,storage:{'daraya-visitor-id':visitor,'daraya-visit-session':JSON.stringify({id:session,last:Date.now()-31*60*1000,recorded:true})}});try{await h.flush();assert.equal(h.calls[0].args.p_visitor,visitor);assert.notEqual(h.calls[0].args.p_session,session);}finally{h.close();}
});
