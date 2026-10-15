const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
function load(){
 const ctx={ct:a=>a,window:{addEventListener(){}},renderDashboard(){},document:{querySelector:()=>({})},MutationObserver:class{observe(){}},requestAnimationFrame:()=>1};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('offer-reminders.js','utf8'),ctx);return ctx.window.DarayaReminderSettings;
}
test('accepts disabling the campaign and sorts up to six Daraya times',()=>{
 const tool=load();assert.equal(tool.normalize({enabled:false,times:[],timezone:'Asia/Damascus'}).enabled,false);
 assert.equal(tool.normalize({enabled:true,times:['18:00','11:00'],timezone:'Asia/Damascus'}).times.join(','),'11:00,18:00');
});
test('rejects invalid schedules instead of forwarding them to Android',()=>{
 const tool=load();
 for(const data of [
  {enabled:true,times:[]},
  {enabled:true,times:['24:00']},
  {enabled:true,times:['11:00','11:00']},
  {enabled:true,times:['01:00','02:00','03:00','04:00','05:00','06:00','07:00']},
  {enabled:true,times:['11:00'],timezone:'Europe/Berlin'},
 ])assert.throws(()=>tool.normalize({timezone:'Asia/Damascus',...data}));
});
