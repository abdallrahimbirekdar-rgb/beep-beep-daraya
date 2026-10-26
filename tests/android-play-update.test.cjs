const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('android-download.js','utf8');
const release=JSON.parse(fs.readFileSync('android-play-release.json','utf8'));
async function setup({installed=133,record=release,offline=false,native=true}={}){
 const dom=new JSDOM('<main id="app"></main>',{url:'https://damascus-shop.com/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,requests=[];
 Object.defineProperty(w.navigator,'userAgent',{value:native?'ShahinAndroid/1.2 DarayaVersion/'+installed:'Chrome'});
 w.setInterval=()=>0;w.fetch=async url=>{requests.push(String(url));if(String(url)==='/android-play-release.json'){if(offline)throw Error('offline');return {ok:true,json:async()=>record};}return {ok:true,text:async()=>'<main id="app"></main>'};};
 w.eval(source);await new Promise(setImmediate);
 return {w,requests,notice:()=>w.document.querySelector('#apk-update-notice'),close:()=>w.close()};
}
test('installed public version and newer test version do not show an update notice',async()=>{
 for(const installed of [133,140]){const h=await setup({installed});try{assert.equal(h.notice(),null);assert.ok(h.requests.includes('/android-play-release.json'));assert.equal(h.requests.some(u=>u.includes('api.github.com')),false);}finally{h.close();}}
});
test('older app sees a Google Play link only for confirmed completed production',async()=>{
 const h=await setup({installed:132});try{assert.ok(h.notice());assert.match(h.notice().textContent,/Google Play/);assert.equal(h.notice().querySelector('a').href,'https://play.google.com/store/apps/details?id=com.souqdaraya.app');h.notice().querySelector('button').click();assert.equal(h.notice(),null);assert.equal(h.w.sessionStorage.getItem('daraya-play-dismissed'),'133');}finally{h.close();}
});
test('test tracks, pending rollouts, invalid records and offline checks never claim an update',async()=>{
 const invalid=[{...release,track:'open'},{...release,status:'inProgress'},{...release,packageName:'another.app'},{...release,versionCode:'140'},{...release,versionCode:0},{}];
 for(const record of invalid){const h=await setup({installed:132,record});try{assert.equal(h.notice(),null);}finally{h.close();}}
 const h=await setup({installed:132,offline:true});try{assert.equal(h.notice(),null);}finally{h.close();}
});
test('unknown installed versions and browsers cannot trigger app update notices',async()=>{
 for(const options of [{installed:0},{installed:'unknown'},{native:false}]){const h=await setup(options);try{assert.equal(h.notice(),null);assert.equal(h.requests.includes('/android-play-release.json'),false);}finally{h.close();}}
});
