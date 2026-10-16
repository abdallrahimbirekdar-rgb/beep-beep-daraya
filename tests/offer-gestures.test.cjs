const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(pointer=false){let now=0;const c={window:pointer?{PointerEvent:function(){}}:{},performance:{now:()=>now}};vm.createContext(c);vm.runInContext(fs.readFileSync('offer-gestures.js','utf8'),c);return {tool:c.window.DarayaOfferGestures,time:value=>now=value};}
test('short clear swipes and quick flicks work without requiring a long drag',()=>{const {tool}=setup();assert.equal(tool.direction({dx:-34,dy:8,duration:400,width:390}),'left');assert.equal(tool.direction({dx:22,dy:3,duration:65,width:390}),'right');assert.equal(tool.direction({dx:22,dy:3,duration:500,width:390}),null);});
test('vertical scrolling, tiny movements and a locked vertical gesture never switch shops',()=>{const {tool}=setup();for(const p of [{dx:25,dy:100,duration:200},{dx:8,dy:2,duration:20},{dx:100,dy:10,duration:200,axis:'vertical'}])assert.equal(tool.direction(p),null);});
function element(){const handlers=new Map();return {handlers,clientWidth:390,addEventListener:(name,fn)=>handlers.set(name,fn),removeEventListener:name=>handlers.delete(name)};}
const touch=(x,y,id=1)=>({clientX:x,clientY:y,identifier:id});
const event=(touches,changedTouches=touches,editable=false)=>({touches,changedTouches,target:{closest:()=>editable},cancelable:true,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}});
test('horizontal moves are handled once and their synthetic click cannot press the next offer button',()=>{const {tool,time}=setup(),el=element(),calls=[];tool.attach(el,value=>calls.push(value));el.handlers.get('touchstart')(event([touch(150,50)]));time(80);const move=event([touch(115,54)]);el.handlers.get('touchmove')(move);assert.equal(move.prevented,true);el.handlers.get('touchend')(event([],[touch(115,54)]));el.handlers.get('touchend')(event([],[touch(110,55)]));assert.deepEqual(calls,['left']);const click={detail:1,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};el.handlers.get('click')(click);assert.equal(click.prevented,true);assert.equal(click.stopped,true);});
test('vertical gestures stay native, multitouch and cancelled gestures do not navigate',()=>{const {tool,time}=setup(),el=element(),calls=[];tool.attach(el,v=>calls.push(v));const start=()=>el.handlers.get('touchstart')(event([touch(100,100)]));start();const move=event([touch(105,160)]);el.handlers.get('touchmove')(move);assert.equal(move.prevented,undefined);time(200);el.handlers.get('touchend')(event([],[touch(180,200)]));start();el.handlers.get('touchcancel')();el.handlers.get('touchend')(event([],[touch(30,100)]));start();el.handlers.get('touchmove')(event([touch(40,100),touch(130,100,2)]));el.handlers.get('touchend')(event([],[touch(30,100)]));assert.equal(calls.length,0);});
test('form controls keep their gestures and cleanup removes all listeners',()=>{const {tool,time}=setup(),el=element(),calls=[];const stop=tool.attach(el,v=>calls.push(v));el.handlers.get('touchstart')(event([touch(100,100)],undefined,true));time(100);el.handlers.get('touchend')(event([],[touch(30,100)]));assert.equal(calls.length,0);stop();assert.equal(el.handlers.size,0);});


const pointer=(x,y,id=1,extra={})=>({pointerId:id,pointerType:'touch',isPrimary:id===1,clientX:x,clientY:y,button:0,target:{closest:()=>false},cancelable:true,preventDefault(){this.prevented=true;},...extra});
test('Android pointer swipe works on media, captures a horizontal drag and runs once',()=>{
 const {tool,time}=setup(true),el=element(),calls=[];let captured;
 el.setPointerCapture=id=>captured=id;tool.attach(el,v=>calls.push(v));
 assert.equal(el.handlers.has('touchstart'),false);
 el.handlers.get('pointerdown')(pointer(200,100));time(120);
 const move=pointer(145,108);el.handlers.get('pointermove')(move);
 assert.equal(move.prevented,true);assert.equal(captured,1);
 el.handlers.get('pointerup')(pointer(135,110));el.handlers.get('pointerup')(pointer(135,110));
 assert.deepEqual(calls,['left']);
 const click={detail:1,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};
 el.handlers.get('click')(click);assert.equal(click.prevented,true);
});
test('Android pointer scrolling remains native and never changes shop after vertical intent',()=>{
 const {tool,time}=setup(true),el=element(),calls=[];tool.attach(el,v=>calls.push(v));
 el.handlers.get('pointerdown')(pointer(100,100));const move=pointer(104,140);el.handlers.get('pointermove')(move);assert.equal(move.prevented,undefined);time(150);el.handlers.get('pointerup')(pointer(160,190));assert.deepEqual(calls,[]);
});
test('pinch and cancelled pointer gestures do not navigate, a later primary swipe recovers',()=>{
 const {tool,time}=setup(true),el=element(),calls=[];tool.attach(el,v=>calls.push(v));
 el.handlers.get('pointerdown')(pointer(100,100));el.handlers.get('pointerdown')(pointer(130,100,2));time(100);el.handlers.get('pointerup')(pointer(30,100));assert.deepEqual(calls,[]);
 el.handlers.get('pointerdown')(pointer(100,100));el.handlers.get('pointercancel')(pointer(50,100));el.handlers.get('pointerup')(pointer(10,100));assert.deepEqual(calls,[]);
 el.handlers.get('pointerdown')(pointer(100,100));time(200);el.handlers.get('pointerup')(pointer(35,100));assert.deepEqual(calls,['left']);
});
test('pointer form fields and iframe/video players are excluded and all listeners detach',()=>{
 const {tool,time}=setup(true),el=element(),calls=[];const stop=tool.attach(el,v=>calls.push(v));
 el.handlers.get('pointerdown')(pointer(100,100,1,{target:{closest:()=>true}}));time(100);el.handlers.get('pointerup')(pointer(20,100));assert.deepEqual(calls,[]);stop();assert.equal(el.handlers.size,0);
});
test('lost capture does not navigate and a fresh swipe is still accepted',()=>{
 const {tool,time}=setup(true),el=element(),calls=[];tool.attach(el,v=>calls.push(v));
 el.handlers.get('pointerdown')(pointer(100,100));el.handlers.get('lostpointercapture')(pointer(40,100,1,{target:el}));el.handlers.get('pointerup')(pointer(30,100));assert.deepEqual(calls,[]);
 el.handlers.get('pointerdown')(pointer(100,100));time(100);el.handlers.get('pointerup')(pointer(155,105));assert.deepEqual(calls,['right']);
});
test('Android implicit capture transfer from an image or play button must not cancel the swipe',()=>{
 const {tool,time}=setup(true),el=element(),calls=[];
 tool.attach(el,v=>calls.push(v));
 const image={closest:()=>false};
 el.setPointerCapture=id=>el.handlers.get('lostpointercapture')({pointerId:id,target:image});
 el.handlers.get('pointerdown')(pointer(200,100,1,{target:image}));time(100);
 el.handlers.get('pointermove')(pointer(140,104,1,{target:image}));
 el.handlers.get('pointerup')(pointer(130,104));
 assert.deepEqual(calls,['left']);
});
