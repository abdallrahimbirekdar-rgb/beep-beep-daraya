const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function harness(){
 let writes=0,callback;
 const toggle={textContent:'',dataset:{},hasAttribute:()=>true,setAttribute(){writes++;}};
 const menu={querySelectorAll:()=>[],querySelector:()=>null};
 const window={ShahinI18n:{language:'ar'}};
 const ctx={window,document:{querySelector:s=>s==='#site-menu'?menu:s==='#menu-toggle'?toggle:null,addEventListener(){}},MutationObserver:class{constructor(f){callback=f;}observe(){}},renderHome(){},renderStore(){}};
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
