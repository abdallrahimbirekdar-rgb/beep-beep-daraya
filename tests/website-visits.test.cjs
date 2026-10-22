const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('website-visits.js','utf8');
const totals={total:100,visitors:60,today:5,today_visitors:4,week:20,month:80};
function report(days=7){return {days,from:'2026-10-16',to:'2026-10-22',tracking_started:'2026-10-03',coverage_days:days,previous_coverage_days:days,current:{visits:20,visitors:10,known_sessions:20,unknown_sessions:0,active_days:5},previous:{visits:10,visitors:7},audience:{new:7,returning:3,multiple_sessions:4},daily:[{day:'2026-10-22',visits:20,visitors:10}],hours:[{hour:19,visits:8}],activity:{shop_views:30,calls:4},top_shops:[{id:'11111111-1111-4111-8111-111111111111',name:'<img src=x onerror=alert(1)>',views:9,contacts:2}],top_categories:[{category:'restaurant',views:12}]};}
function setup({admin=true,pending=false,fail=false}={}){
 const dom=new JSDOM('<main id="app" data-dashboard-route="#dashboard/statistics"><section id="dashboard-content"></section></main>',{url:admin?'https://damascus-shop.com/#dashboard/statistics':'https://damascus-shop.com/#home',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,calls=[],queue=[];
 w.admin=admin;w.user=admin?{id:'admin'}:null;w.live=true;w.directoryKinds=[['restaurant','مطاعم ومقاهٍ']];w.api={rpc(name,args){calls.push({name,args});if(name==='website_visit_stats')return Promise.resolve({data:totals});if(name==='record_website_visit')return Promise.resolve({data:null});if(pending)return new Promise(resolve=>queue.push({days:args.p_days,resolve}));return Promise.resolve(fail?{error:{message:'missing'}}:{data:report(args.p_days)});}};
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
