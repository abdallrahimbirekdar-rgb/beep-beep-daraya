const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={document:{addEventListener(){}},window:{addEventListener(){}},ct:a=>a,render(){},esc:x=>String(x).replaceAll('"','&quot;').replaceAll('<','&lt;'),URL};vm.createContext(c);vm.runInContext(fs.readFileSync('offer-reels.js','utf8'),c);
test('accept only HTTPS links on supported providers',()=>{for(const u of ['https://youtu.be/abcdefghijk','https://www.facebook.com/reel/123','https://www.instagram.com/reel/abc/'])assert.ok(c.window.DarayaReels.link(u));for(const u of ['javascript:alert(1)','https://youtube.com.evil.test/watch?v=x','https://user:pass@youtube.com/watch?v=x','http://facebook.com/reel/1','https://evil.test/video','https://instagram.com/'])assert.equal(c.window.DarayaReels.link(u),null)});
test('links open externally with safe attributes and no embeds',()=>{const html=c.window.DarayaReels.linkMarkup('https://youtu.be/abcdefghijk');assert.match(html,/target="_blank"/);assert.match(html,/noopener noreferrer/);assert.doesNotMatch(html,/<iframe|<video/)});
test('editor has optional link and no direct video upload',()=>{const s=fs.readFileSync('daily-offers.js','utf8');assert.match(s,/name="video_link"/);assert.doesNotMatch(s,/DarayaReels\.upload|name="reel"|value="video"/)});

test('supported video offers have an inline launch button without preloading iframe',()=>{c.parsePlaceVideo=()=>({kind:'embed',provider:'YouTube',src:'https://www.youtube-nocookie.com/embed/abcdefghijk'});const html=c.window.DarayaReels.linkMarkup('https://youtu.be/abcdefghijk');assert.match(html,/data-offer-play/);assert.doesNotMatch(html,/<iframe/)});

test('offers from the same shop form one group in first appearance order',()=>{const cards=['a','b','a','c','b'].map(id=>({dataset:{storeId:id}}));const result=c.window.DarayaReels.shopGroups(cards);assert.deepEqual(Array.from(result,g=>g.id),['a','b','c']);assert.deepEqual(Array.from(result,g=>g.cards.length),[2,2,1]);assert.equal(result[0].cards[1],cards[2]);});

test('shop alignment scrolls the page vertically without scrolling nested offer containers',()=>{
 const source=fs.readFileSync('offer-reels.js','utf8'),start=source.indexOf('function alignCard('),end=source.indexOf('\n    function activate(',start);
 const calls=[];let active=true;
 const ctx={alive:()=>active,getComputedStyle:()=>({scrollMarginTop:'12px'}),window:{scrollX:0,scrollY:400,scrollTo:options=>calls.push(options)}};
 vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
 const card={hidden:false,getBoundingClientRect:()=>({top:120}),scrollIntoView:()=>{throw Error('nested scrolling causes swipe shake');}};
 ctx.alignCard(card);assert.equal(calls.length,1);assert.equal(calls[0].top,508);assert.equal(calls[0].left,0);assert.equal(calls[0].behavior,'instant');
 card.hidden=true;ctx.alignCard(card);assert.equal(calls.length,1);card.hidden=false;active=false;ctx.alignCard(card);assert.equal(calls.length,1);
});

test('scrolling keeps direction hints stable instead of rebuilding them every frame',()=>{
 const source=fs.readFileSync('offer-reels.js','utf8'),start=source.indexOf('function updateEdges()'),end=source.indexOf('\n    function alignCard(',start);
 let writes=0;const buttons={};
 const node=()=>{let html='',title='';return {dataset:{},classList:{toggle(){}},get innerHTML(){return html;},set innerHTML(value){html=value;writes++;},get title(){return title;},set title(value){title=value;writes++;}};};
 for(const name of ['prev','next','up','down'])buttons['[data-edge-'+name+']']=node();
 const card={getBoundingClientRect:()=>({top:20}),querySelector:()=>({textContent:'Shop'})};
 const ctx={alive:()=>true,groups:()=>[{id:'a',cards:[card]},{id:'b',cards:[card]}],current:{dataset:{storeId:'a'}},track:{getBoundingClientRect:()=>({top:0,bottom:1000})},window:{innerHeight:800},getComputedStyle:()=>({direction:'rtl'}),edges:{querySelector:s=>buttons[s],style:{setProperty(){}}},document:{querySelector:()=>null},t:a=>a,nextOfferCard:null};
 vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);ctx.updateEdges();assert.ok(writes>0);writes=0;for(let i=0;i<60;i++)ctx.updateEdges();assert.equal(writes,0);
});
