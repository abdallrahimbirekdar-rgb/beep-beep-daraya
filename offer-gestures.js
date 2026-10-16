'use strict';
(() => {
 const clock=()=>performance.now();
 function direction({dx,dy,duration,width=360,axis=null}){
  if(axis==='vertical'||Math.abs(dx)<Math.abs(dy)*1.05)return null;
  const distance=Math.abs(dx),threshold=Math.max(28,Math.min(44,width*.085));
  const flick=duration>0&&duration<=280&&distance>=18&&distance/duration>=.28;
  return distance>=threshold||flick?(dx<0?'left':'right'):null;
 }
 function attach(element,onSwipe){
  let gesture=null,blockClickUntil=0;
  const start=e=>{
   gesture=null;blockClickUntil=0;
   if(e.touches.length!==1||e.target.closest?.('input,textarea,select,[contenteditable],video,iframe,[data-no-swipe]'))return;
   const p=e.touches[0];gesture={id:p.identifier,x:p.clientX,y:p.clientY,time:clock(),axis:null};
  };
  const point=list=>[...list].find(p=>p.identifier===gesture?.id);
  const move=e=>{
   if(!gesture)return;if(e.touches.length!==1){gesture=null;return;}
   const p=point(e.touches);if(!p)return;
   const x=Math.abs(p.clientX-gesture.x),y=Math.abs(p.clientY-gesture.y);
   if(!gesture.axis&&Math.max(x,y)>=12){if(x>y*1.15)gesture.axis='horizontal';else if(y>x*1.15)gesture.axis='vertical';}
   if(gesture.axis==='horizontal'&&e.cancelable)e.preventDefault();
  };
  const end=e=>{
   if(!gesture)return;const p=point(e.changedTouches),g=gesture;gesture=null;if(!p)return;
   const value=direction({dx:p.clientX-g.x,dy:p.clientY-g.y,duration:clock()-g.time,width:element.clientWidth||360,axis:g.axis});
   if(value){blockClickUntil=clock()+350;onSwipe(value);}
  };
  const cancel=()=>{gesture=null;};
  const click=e=>{if(e.detail!==0&&clock()<blockClickUntil){blockClickUntil=0;e.preventDefault();e.stopImmediatePropagation();}};
  // Chromium/WebView on Android supports Pointer Events. Use one event family
  // per device so a single swipe cannot be processed twice.
  if(window.PointerEvent){
   const pointers=new Set();
   const down=e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    if(e.isPrimary===true)pointers.clear();
    pointers.add(e.pointerId);gesture=null;
    if(pointers.size!==1||e.isPrimary===false||e.target.closest?.('input,textarea,select,[contenteditable],video,iframe,[data-no-swipe]'))return;
    blockClickUntil=0;gesture={id:e.pointerId,x:e.clientX,y:e.clientY,time:clock(),axis:null};
   };
   const pointerMove=e=>{
    if(!gesture||e.pointerId!==gesture.id)return;
    const x=Math.abs(e.clientX-gesture.x),y=Math.abs(e.clientY-gesture.y);
    if(!gesture.axis&&Math.max(x,y)>=8){if(x>y*1.15)gesture.axis='horizontal';else if(y>x*1.15)gesture.axis='vertical';}
    if(gesture.axis==='horizontal'){
     if(e.cancelable)e.preventDefault();
     try{if(!element.hasPointerCapture?.(e.pointerId))element.setPointerCapture?.(e.pointerId);}catch{}
    }
   };
   const finish=e=>{
    pointers.delete(e.pointerId);if(!gesture||e.pointerId!==gesture.id)return;
    const g=gesture;gesture=null;
    const value=direction({dx:e.clientX-g.x,dy:e.clientY-g.y,duration:clock()-g.time,width:element.clientWidth||360,axis:g.axis});
    if(value){blockClickUntil=clock()+350;onSwipe(value);}
   };
   const pointerCancel=e=>{pointers.delete(e.pointerId);if(gesture?.id===e.pointerId)gesture=null;};
   const lost=e=>{
    // Touchscreens implicitly capture to the starting child. Its loss event
    // bubbles when capture moves here; that transfer is not a cancelled swipe.
    if(e.target!==element||element.hasPointerCapture?.(e.pointerId))return;
    if(gesture?.id===e.pointerId)gesture=null;
   };
   const drag=e=>{if(gesture)e.preventDefault();};
   const handlers=[['pointerdown',down],['pointermove',pointerMove],['pointerup',finish],['pointercancel',pointerCancel],['lostpointercapture',lost],['dragstart',drag]];
   for(const [name,fn] of handlers)element.addEventListener(name,fn,{passive:false});
   element.addEventListener('click',click,true);
   return ()=>{for(const [name,fn] of handlers)element.removeEventListener(name,fn);element.removeEventListener('click',click,true);pointers.clear();gesture=null;};
  }
  element.addEventListener('touchstart',start,{passive:true});
  element.addEventListener('touchmove',move,{passive:false});
  element.addEventListener('touchend',end,{passive:true});
  element.addEventListener('touchcancel',cancel,{passive:true});
  element.addEventListener('click',click,true);
  return ()=>{for(const [name,fn] of [['touchstart',start],['touchmove',move],['touchend',end],['touchcancel',cancel]])element.removeEventListener(name,fn);element.removeEventListener('click',click,true);gesture=null;};
 }
 window.DarayaOfferGestures={direction,attach};
})();

