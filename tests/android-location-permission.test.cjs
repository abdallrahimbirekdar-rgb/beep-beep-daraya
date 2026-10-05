const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('community-tools.js','utf8');
const handler=code.slice(code.indexOf(' nearButton.onclick=()=>{'),code.indexOf('\n if(communityState.near&&communityState.point){'));
for(const [agent,wait,gps] of [['ShahinAndroid/1.2',60000,45000],['Chrome',10000,8000]])test('location wait for '+agent,()=>{
 const note={},button={},state={locationRequest:0,locating:false};let deadline,options;
 const ctx={nearButton:button,communityState:state,$:selector=>selector==='[data-location-note]'?note:button,ct:ar=>ar,setTimeout:(fn,ms)=>{deadline=ms;return 1},clearTimeout(){},navigator:{userAgent:agent,geolocation:{getCurrentPosition(ok,error,o){options=o;}}}};
 vm.runInNewContext(handler,ctx);button.onclick();assert.equal(deadline,wait);assert.equal(options.timeout,gps);assert.equal(state.locating,true);
});

