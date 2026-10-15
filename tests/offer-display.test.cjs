const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={ct:a=>a,window:{},renderDashboard(){},Date,Map,Intl};vm.createContext(context);
vm.runInContext(fs.readFileSync('offer-display.js','utf8'),context);vm.runInContext(fs.readFileSync('offer-display-admin.js','utf8'),context);
const D=context.window.DarayaOfferDisplay,A=context.window.DarayaOfferDisplayAdmin;
const now=Date.parse('2026-10-16T10:00:00Z');
const rule=(kind,id,fields={})=>({kind,target_id:id,manual_rank:null,tier:'normal',starts_at:null,ends_at:null,pinned_until:null,hidden:false,revision:0,...fields});
const map=rows=>new Map(rows.map(r=>[D.key(r.kind,r.target_id),r]));
const offer=(id,store='a',created='2026-10-15T00:00:00Z')=>({id,store_id:store,created_at:created});
const promotion={tier:'gold',starts_at:'2026-10-16T09:00:00Z',ends_at:'2026-10-17T10:00:00Z'};
test('promotion starts inclusively, ends exclusively and never restarts',()=>{
 const r=rule('offer','a',promotion);assert.equal(D.level(r,Date.parse(r.starts_at)-1),0);assert.equal(D.level(r,Date.parse(r.starts_at)),1);assert.equal(D.level(r,Date.parse(r.ends_at)),0);assert.equal(D.level(r,Date.parse(r.ends_at)+86400000),0);
});
test('manual order overrides pins and diamond level; pin overrides level',()=>{
 const a=offer('a'),b=offer('b');let rules=map([rule('offer','a',{manual_rank:1}),rule('offer','b',{...promotion,tier:'diamond',pinned_until:'2026-10-17T10:00:00Z'})]);assert.ok(D.offerCompare(a,b,rules,now)<0);
 rules=map([rule('offer','a',{pinned_until:'2026-10-17T10:00:00Z'}),rule('offer','b',{...promotion,tier:'diamond'})]);assert.ok(D.offerCompare(a,b,rules,now)<0);
});
test('diamond is above gold; equal levels sort newest then stable ID',()=>{
 const a=offer('a'),b=offer('b');let rules=map([rule('offer','a',promotion),rule('offer','b',{...promotion,tier:'diamond'})]);assert.ok(D.offerCompare(b,a,rules,now)<0);
 assert.ok(D.offerCompare(offer('a','a','2026-10-16T00:00:00Z'),b,new Map(),now)<0);assert.ok(D.offerCompare(b,a,new Map(),now)<0);
});
test('shop level applies to all its offers and offer level can raise a shop',()=>{
 const a=offer('x','a'),b=offer('y','b'),rules=map([rule('offer','x',{...promotion,tier:'diamond'}),rule('shop','b',promotion)]);
 assert.equal(D.tier(a,rules,now),'diamond');assert.equal(D.tier(b,rules,now),'gold');assert.ok(D.shopCompare({id:'a',demo:false,offers:[a]},{id:'b',demo:false,offers:[b]},rules,now)<0);
});
test('hidden shop or offer wins over all promotion and pin settings',()=>{
 const a=offer('x');assert.equal(D.visible(a,map([rule('shop','a',{hidden:true,...promotion})])),false);assert.equal(D.visible(a,map([rule('offer','x',{hidden:true,pinned_until:'2026-10-17T10:00:00Z'})])),false);
});
test('expired promotion and pin no longer confer priority',()=>{
 const a=offer('a'),b=offer('b','a','2026-10-16T00:00:00Z');const rules=map([rule('offer','a',{...promotion,ends_at:'2026-10-16T10:00:00Z',pinned_until:'2026-10-16T10:00:00Z'})]);assert.equal(D.tier(a,rules,now),'normal');assert.ok(D.offerCompare(b,a,rules,now)<0);
});
test('demo offers never show paid-style levels and real shops precede demos',()=>{
 assert.equal(D.badge({...offer('x'),demo:true},map([rule('offer','x',promotion)]),now),'');assert.ok(D.shopCompare({id:'a',demo:false,offers:[]},{id:'demo-a',demo:true,offers:[]},new Map(),now)<0);
});
test('Damascus input roundtrips across dates and rejects invalid dates',()=>{
 assert.equal(A.localTime('2026-10-15T22:30:00Z'),'2026-10-16T01:30');assert.equal(A.utc('2026-10-16T01:30'),'2026-10-15T22:30:00.000Z');assert.throws(()=>A.utc('2026-02-30T12:00'));assert.equal(A.utc(''),null);
});
test('invalid ranks and promotions cannot be saved; normal clears priority without requiring dates',()=>{
 for(const value of [0,-1,1.2,100001,'x'])assert.throws(()=>A.validate(rule('shop','a',{manual_rank:value})));
 assert.throws(()=>A.validate(rule('offer','x',{tier:'gold'})));assert.throws(()=>A.validate(rule('offer','x',{...promotion,ends_at:promotion.starts_at})));
 assert.equal(A.validate(rule('shop','a',{manual_rank:''})).manual_rank,null);
});
test('backend denies merchant writes, protects direct reads, handles conflicts and orders before pagination',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261016_offer_display_management.sql','utf8');assert.match(sql,/revoke all on public\.offer_display_rules from public,anon,authenticated/);assert.doesNotMatch(sql,/grant (insert|update|delete).*offer_display_rules/i);assert.match(sql,/if auth.uid\(\) is null or not public.is_admin\(\)/);assert.match(sql,/as restrictive for select/);assert.match(sql,/existing.revision=old_revision/);assert.match(sql,/DISPLAY_RULE_CHANGED_RELOAD/);assert.match(sql,/o.status='approved' and o.ends_at>now\(\)/);assert.match(sql,/order by coalesce\(shop_rank[\s\S]+offset greatest/);
});
