'use strict';
(() => {
 const t=(a,e,d)=>ct(a,e,d),weights={normal:0,gold:1,diamond:2};
 let rules=new Map(),shopOrder=new Map(),ready=false,loadedAt=0,lastAttempt=0,pending=null;
 const key=(kind,id)=>kind+':'+id;
 const get=(kind,id,source=rules)=>source.get(key(kind,id))||{kind,target_id:id,manual_rank:null,tier:'normal',starts_at:null,ends_at:null,pinned_until:null,hidden:false,revision:0};
 function level(r,now=Date.now()){return Date.parse(r.starts_at)<=now&&Date.parse(r.ends_at)>now?(weights[r.tier]||0):0;}
 const pin=(r,now)=>Date.parse(r.pinned_until)>now;
 const rank=r=>Number.isInteger(r.manual_rank)&&r.manual_rank>0?r.manual_rank:2147483647;
 function visible(o,source=rules){return !get('shop',o.store_id,source).hidden&&!get('offer',o.id,source).hidden;}
 function tier(o,source=rules,now=Date.now()){const n=Math.max(level(get('shop',o.store_id,source),now),level(get('offer',o.id,source),now));return ['normal','gold','diamond'][n];}
 function offerCompare(a,b,source=rules,now=Date.now()){
  const x=get('offer',a.id,source),y=get('offer',b.id,source),sx=get('shop',a.store_id,source),sy=get('shop',b.store_id,source);
  return rank(x)-rank(y)||Number(pin(y,now)||pin(sy,now))-Number(pin(x,now)||pin(sx,now))||weights[tier(b,source,now)]-weights[tier(a,source,now)]||Date.parse(b.created_at||0)-Date.parse(a.created_at||0)||String(b.id).localeCompare(String(a.id));
 }
 function shopCompare(a,b,source=rules,now=Date.now()){
  const x=get('shop',a.id,source),y=get('shop',b.id,source);
  const score=g=>({pin:Number(pin(get('shop',g.id,source),now)||g.offers.some(o=>pin(get('offer',o.id,source),now))),tier:Math.max(0,...g.offers.map(o=>weights[tier(o,source,now)])),date:Math.max(0,...g.offers.map(o=>Date.parse(o.created_at)||0))});
  const p=score(a),q=score(b);
  return Number(a.demo)-Number(b.demo)||rank(x)-rank(y)||q.pin-p.pin||q.tier-p.tier||q.date-p.date||String(a.id).localeCompare(String(b.id));
 }
 function sortGroups(groups,offers,source=rules,now=Date.now()){
  const byId=new Map(offers.map(o=>[o.id,o]));
  return groups.map(g=>({...g,demo:g.id.startsWith('demo-'),offers:g.cards.map(c=>byId.get(c.dataset.reelId)).filter(Boolean)})).sort((a,b)=>shopCompare(a,b,source,now)).map(g=>({...g,cards:g.cards.slice().sort((a,b)=>offerCompare(byId.get(a.dataset.reelId)||{id:a.dataset.reelId},byId.get(b.dataset.reelId)||{id:b.dataset.reelId},source,now))}));
 }
 function orderGroups(groups,offers){const sorted=sortGroups(groups,offers);return sorted.sort((a,b)=>Number(a.demo)-Number(b.demo)||(shopOrder.get(a.id)??2147483647)-(shopOrder.get(b.id)??2147483647));}
 function badge(o,source=rules,now=Date.now()){
  if(o.demo)return '';
  const value=tier(o,source,now);if(value==='normal')return '';
  return '<span class="offer-level-banner offer-level-'+value+'">'+(value==='diamond'?t('💎 عرض ماسي','💎 Diamond offer','💎 Diamant-Angebot'):t('★ عرض ذهبي','★ Gold offer','★ Gold-Angebot'))+'</span>';
 }
 async function load(force=false){
  if(!force&&Date.now()-lastAttempt<30000)return ready;
  if(pending)return pending;if(typeof api==='undefined'||!api)return false;
  lastAttempt=Date.now();pending=(async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
   try{
    const all=[];
    for(let offset=0;offset<10000;offset+=500){const r=await api.from('offer_display_rules').select('*').order('kind').order('target_id').range(offset,offset+499).abortSignal(controller.signal);if(r.error)throw r.error;all.push(...r.data);if(r.data.length<500){const order=await api.rpc('get_offer_display_shop_order').abortSignal(controller.signal);if(order.error)throw order.error;rules=new Map(all.map(r=>[key(r.kind,r.target_id),r]));shopOrder=new Map(order.data.map((r,i)=>[r.store_id,i]));ready=true;loadedAt=Date.now();return true;}}
    throw Error('TOO_MANY_RULES');
   }catch{return false;}finally{clearTimeout(timer);}
  })();try{return await pending;}finally{pending=null;}
 }
 function query({offset=0,limit=20,store=null,following=null}={}){
  if(ready)return api.rpc('list_display_daily_offers',{p_offset:offset,p_limit:limit,p_store:store,p_following:following}).select('*,daily_offer_availability(confirmed_at)');
  let q=api.from('daily_offers').select('*,daily_offer_availability(confirmed_at)').eq('status','approved').gt('ends_at',new Date().toISOString()).order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+limit-1);
  if(store)q=q.eq('store_id',store);if(following)q=q.in('store_id',following);return q;
 }
 window.DarayaOfferDisplay={get,level,pin,rank,visible,tier,badge,offerCompare,shopCompare,sortGroups,orderGroups,load,query,key,get ready(){return ready;},snapshot:()=>new Map([...rules].map(([k,v])=>[k,{...v}]))};
})();
