import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanupExpired } from '../supabase/functions/cleanup-shop-reels/cleanup.mjs';
const path='11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/33333333-3333-3333-3333-333333333333.mp4';
test('cleanup removes bytes before records; storage failures keep records for retry',async()=>{
 const calls=[],rows=[{offer_id:'failed',path,cutoff:'2026-10-15T00:00:00Z'},{offer_id:'text',path:null,cutoff:'2026-10-15T00:00:00Z'},{offer_id:'video',path,cutoff:'2026-10-15T00:00:00Z'}];let n=0;
 const api={rpc:async()=>({data:rows}),storage:{from:()=>({remove:async()=>{calls.push('file');return n++===0?{error:true}:{}}})},from:()=>({delete(){return this},eq(k,id){calls.push(['row',id]);return this},or(filter){assert.match(filter,/ends_at\.lte.*status\.eq\.rejected/);return this},select:async()=>({data:[{id:'done'}]})})};
 assert.deepEqual(await cleanupExpired(api),{files:1,offers:2,failed:1});assert.equal(calls.some(x=>Array.isArray(x)&&x[1]==='failed'),false);assert.deepEqual(calls.slice(-2),['file',['row','video']]);
});
test('orphan cleanup deletes only media, rejects invalid paths, and DB failure deletes nothing',async()=>{let files=0;const api={rpc:async()=>({data:[{offer_id:null,path},{offer_id:null,path:'../wrong'}]}),storage:{from:()=>({remove:async()=>{files++;return{}}})}};assert.deepEqual(await cleanupExpired(api),{files:1,offers:0,failed:1});assert.equal(files,1);api.rpc=async()=>({error:true});await assert.rejects(cleanupExpired(api));assert.equal(files,1);});
