const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function harness(){
 const status={textContent:'',isConnected:true},result={textContent:'',innerHTML:'',isConnected:true},filter={value:'active'},refresh={disabled:false},cancel={hidden:true,disabled:false},button={disabled:false,isConnected:true},title={textContent:''};
 const controls={title:{value:''},body:{value:''},note_day:{value:'2026-10-09'}},editButton={dataset:{noteEdit:'note-id'}},compareButton={dataset:{noteCompare:'note-id'}};
 const list={textContent:'',innerHTML:'',isConnected:true,querySelector:()=>result,querySelectorAll:s=>s==='[data-note-edit]'?[editButton]:s==='[data-note-compare]'?[compareButton]:[]};
 const form={elements:controls,isConnected:true,reset(){for(const v of Object.values(controls))v.value='';},querySelector:s=>s==='[type="submit"]'?button:title,scrollIntoView(){}};
 controls.title.focus=()=>{};
 const map={'[data-note-form]':form,'[data-note-save-status]':status,'[data-note-list]':list,'[data-note-filter]':filter,'[data-note-refresh]':refresh,'[data-note-cancel]':cancel};
 const box={dataset:{},innerHTML:'',querySelector:s=>map[s]},calls=[];
 const c={Intl,Date,Number,String,console,communityLang:()=> 'en',ct:(ar,en)=>en,esc:x=>String(x??'').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),merchantInsightNumber:x=>Number(x||0).toLocaleString('en'),CSS:{escape:x=>x},confirm:()=>true,$:()=>box,
 FormData:class{constructor(f){this.values=f.elements;}get(k){return this.values[k].value;}},
 api:{rpc:async(name,args)=>{calls.push({name,args});return {data:name==='list_merchant_notes'?[{id:'note-id',title:'Old title',body:'Old body',note_day:'2026-10-01',revision:3}]:{id:'note-id'},error:null};}}};
 vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'merchant-notebook.js'),'utf8'),c);
 return {c,calls,controls,status,form,button,editButton,compareButton,result,list,s:{id:'shop',online_ordering:true}};
}
test('new notes are saved with shop scope and a confirmed result before clearing fields',async()=>{
 const h=harness();await h.c.renderMerchantNotebook(h.s);h.controls.title.value='New photo';h.controls.body.value='Changed image';h.controls.note_day.value='2026-10-01';
 await h.form.onsubmit({preventDefault(){}});
 const save=h.calls.find(x=>x.name==='save_merchant_note');assert.equal(save.args.p_store,'shop');assert.equal(save.args.p_id,null);assert.equal(save.args.p_title,'New photo');assert.equal(h.controls.title.value,'');assert.equal(h.status.textContent,'Note saved.');assert.equal(h.button.disabled,false);
});
test('failed or unconfirmed saves preserve the note text',async()=>{
 const h=harness();await h.c.renderMerchantNotebook(h.s);h.controls.title.value='Keep this';h.controls.body.value='Keep details';h.c.api.rpc=async()=>({error:{message:'offline'}});
 await h.form.onsubmit({preventDefault(){}});assert.equal(h.controls.title.value,'Keep this');assert.equal(h.controls.body.value,'Keep details');assert.match(h.status.textContent,/still here/);assert.equal(h.button.disabled,false);
 h.c.api.rpc=async()=>({data:{}});await h.form.onsubmit({preventDefault(){}});assert.equal(h.controls.title.value,'Keep this');
});
test('editing passes the loaded revision to prevent lost updates',async()=>{
 const h=harness();await h.c.renderMerchantNotebook(h.s);h.editButton.onclick();h.controls.title.value='Edited';
 await h.form.onsubmit({preventDefault(){}});const save=h.calls.find(x=>x.name==='save_merchant_note');assert.equal(save.args.p_id,'note-id');assert.equal(save.args.p_revision,3);
});
test('partial comparison is clearly marked and names and note text are escaped',()=>{
 const h=harness();const html=h.c.merchantNoteListHTML([{id:'1',title:'<script>',body:'<img src=x>',note_day:'2026-10-01'}],false);assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));
 const comparison=h.c.merchantNoteComparisonHTML({before:{view:9},after:{view:3},after_complete:false},h.s);assert.match(comparison,/partial totals/);assert.match(comparison,/does not prove/);
 const info=h.c.merchantNoteComparisonHTML({before:{},after:{},after_complete:true},{online_ordering:false});assert.ok(!info.includes('All website orders'));
});
test('archive cards offer restoration and do not offer permanent deletion',()=>{
 const h=harness(),html=h.c.merchantNoteListHTML([{id:'1',title:'old',body:'',note_day:'2026-10-01'}],true);assert.ok(html.includes('data-note-restore'));assert.ok(!html.includes('data-note-edit'));assert.ok(!html.includes('delete'));
});
test('weekly summary escapes product names, uses only recorded numbers, and handles sparse data',()=>{
 const h=harness(),c=h.c;c.Set=Set;c.communityEventSession='session';c.admin=false;c.mine=()=>[];c.renderStore=()=>{};c.addLine=()=>{};c.gallery=()=>{};c.document={addEventListener(){}};c.location={hash:'#home'};c.merchantHref=()=> '#dashboard/notebook/shop';
 vm.runInContext(fs.readFileSync(path.join(root,'merchant-insights.js'),'utf8'),c);
 const html=c.merchantWeeklySummaryHTML({current:{view:20},previous:{view:10},orders:{total:2,completed:1},products:[{name:'<script>',views:15,carts:0}]},h.s);
 assert.ok(html.includes('Up 100%'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('review suggestion'));assert.ok(!html.includes('NaN'));
 const sparse=c.merchantWeeklySummaryHTML({current:{view:0}},h.s);assert.ok(sparse.includes('little data'));const info=c.merchantWeeklySummaryHTML({current:{view:20},orders:{total:2}},{online_ordering:false});assert.ok(!info.includes('Website orders:'));
});
