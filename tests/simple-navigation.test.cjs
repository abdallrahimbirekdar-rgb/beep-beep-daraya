const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function harness(){
 let writes=0,callback;
 const toggle={textContent:'',dataset:{},hasAttribute:()=>true,setAttribute(){writes++;}};
 const menu={querySelectorAll:()=>[],querySelector:()=>null};
 const window={ShahinI18n:{language:'ar'}};
 const ctx={window,document:{querySelector:s=>s==='#site-menu'?menu:s==='#menu-toggle'?toggle:null,addEventListener(){}},MutationObserver:class{constructor(f){callback=f;}observe(){}},renderHome(){},renderStore(){},render(){}};
 vm.runInNewContext(fs.readFileSync('simple-navigation.js','utf8'),ctx);
 return {window,toggle,run:()=>callback(),writes:()=>writes};
}
test('translation observer settles instead of rewriting the menu forever',()=>{
 const h=harness(),initial=h.writes();
 for(let i=0;i<100;i++)h.run();
 assert.equal(h.writes(),initial);
 assert.equal(h.toggle.textContent,'☰ المزيد');
 h.window.ShahinI18n.language='de';h.run();assert.equal(h.toggle.textContent,'☰ Mehr');
 const after=h.writes();for(let i=0;i<100;i++)h.run();assert.equal(h.writes(),after);
 h.window.ShahinI18n.language='en';h.run();assert.equal(h.toggle.textContent,'☰ More');
 h.window.ShahinI18n.language='ar';h.run();assert.equal(h.toggle.textContent,'☰ المزيد');
});
test('Android refresh stays in its menu group across translation callbacks',()=>{
 let moves=0;const observers=[];
 const group={append(n){moves++;n.parentElement=this;}};
 const account={closest:()=>group};
 const menu={hidden:true,querySelector:()=>account,addEventListener(){}};
 const toggle={setAttribute(){},focus(){}};
 const bottom={style:{},dataset:{},innerHTML:''};
 const refresh={parentElement:group,classList:{contains:()=>false},textContent:'تحديث العرض',setAttribute(){}};
 const document={documentElement:{},querySelector:s=>({'#site-menu':menu,'#menu-toggle':toggle,'#mobile-navigation':bottom,'#android-refresh':refresh,'#app':{}}[s]||null),addEventListener(){}};
 vm.runInNewContext(fs.readFileSync('site-navigation.js','utf8'),{document,window:{ShahinI18n:{language:'ar'},addEventListener(){}},location:{hash:'#home'},admin:false,MutationObserver:class{constructor(f){observers.push(f);}observe(){}}});
 for(let i=0;i<100;i++)observers.forEach(f=>f());
 assert.equal(moves,0);assert.equal(refresh.parentElement,group);
 assert.equal(bottom.style.gridTemplateColumns,'repeat(4,minmax(0,1fr))');
});

test('saved places use a focused route and main-menu return resets it',()=>{
 const events={};let hidden=false,removed=0;
 const hero={querySelector:()=>null,set hidden(v){hidden=v;}};
 const heading={textContent:'',dataset:{},hasAttribute:()=>true};
 const browse={prepend(){}};
 const menu={querySelectorAll:()=>[],querySelector:()=>null};
 const toggle={textContent:'',dataset:{},hasAttribute:()=>true,setAttribute(){}};
 const nodes={'#site-menu':menu,'#menu-toggle':toggle,'.shahin-hero':hero,'#browse':browse,'#browse h2':heading,'.featured-places':{remove(){removed++;}}};
 const document={querySelector:s=>nodes[s]||null,querySelectorAll:()=>[],addEventListener:(name,fn)=>events[name]=fn,createElement:()=>({dataset:{},hasAttribute:()=>true})};
 const ctx={document,window:{scrollTo(){},ShahinI18n:{language:'ar'}},location:{hash:'#home'},filter:'all',search:'',browseFavorites:false,MutationObserver:class{observe(){}},renderHome(){},renderStore(){},render(){this.renderHome();}};
 vm.runInNewContext(fs.readFileSync('simple-navigation.js','utf8'),ctx);
 events.click({target:{closest:s=>s==='#mobile-navigation a'?{hash:'#saved'}:null},preventDefault(){}});
 assert.equal(ctx.location.hash,'#saved');ctx.renderHome();
 assert.equal(hidden,true);assert.equal(removed,1);assert.equal(heading.textContent,'محلاتي المحفوظة');
});
