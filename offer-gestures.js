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
  element.addEventListener('touchstart',start,{passive:true});
  element.addEventListener('touchmove',move,{passive:false});
  element.addEventListener('touchend',end,{passive:true});
  element.addEventListener('touchcancel',cancel,{passive:true});
  element.addEventListener('click',click,true);
  return ()=>{for(const [name,fn] of [['touchstart',start],['touchmove',move],['touchend',end],['touchcancel',cancel]])element.removeEventListener(name,fn);element.removeEventListener('click',click,true);gesture=null;};
 }
 window.DarayaOfferGestures={direction,attach};
})();
