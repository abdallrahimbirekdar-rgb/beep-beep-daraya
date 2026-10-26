const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('new image uploads shrink dimensions and retain metadata when using Supabase fallback',async()=>{let received,closed=false;const canvas={getContext:()=>({drawImage(){}}),toBlob:fn=>fn(new Blob(['small'],{type:'image/webp'}))};const c={Blob,FormData,window:{BEEP_CONFIG:{}},document:{createElement:()=>canvas},createImageBitmap:async()=>({width:3200,height:1600,close(){closed=true;}}),uploadOrLink:async f=>{received=f;return 'saved';},thumbnailForImage:u=>u};vm.createContext(c);vm.runInContext(fs.readFileSync('image-storage.js','utf8'),c);const form=new FormData();form.set('photo',new Blob(['1234567890'],{type:'image/jpeg'}));form.set('image','existing');assert.equal(await c.uploadOrLink(form,'shop'),'saved');assert.equal(canvas.width,2560);assert.equal(canvas.height,1280);assert.equal(received.get('photo').type,'image/webp');assert.equal(received.get('image'),'existing');assert.equal(closed,true);});
test('existing links are not reuploaded or recompressed',async()=>{let passed;const c={window:{BEEP_CONFIG:{}},uploadOrLink:async f=>{passed=f;return 'old';},thumbnailForImage:u=>u};vm.createContext(c);vm.runInContext(fs.readFileSync('image-storage.js','utf8'),c);const f={get:()=>null};assert.equal(await c.uploadOrLink(f,'shop'),'old');assert.equal(passed,f);});
function r2Context({statuses=[401,201],refreshError=false,verified=true}={}){
 const calls=[],state={refreshes:0,compressed:0};
 const session=token=>({access_token:token,user:{id:'owner'}});
 const c={Blob,FormData,URL,window:{BEEP_CONFIG:{r2UploadUrl:'https://images.example/upload'}},document:{createElement:()=>({getContext:()=>({drawImage(){}}),toBlob:fn=>fn(new Blob(['small'],{type:'image/webp'}))})},createImageBitmap:async()=>({width:100,height:100,close(){}}),uploadOrLink:async()=>'',thumbnailForImage:u=>u,safeImage:()=>true,compressMarketImage:async file=>{state.compressed++;return new Blob(['thumb'],{type:'image/webp'});},api:{auth:{getSession:async()=>({data:{session:session('old')}}),refreshSession:async()=>{state.refreshes++;return refreshError?{error:Error('expired'),data:{session:null}}:{data:{session:session('fresh')}};},getUser:async()=>verified?{data:{user:{id:'owner'}}}:{error:Error('expired'),data:{user:null}}}},fetch:async(url,options)=>{calls.push(options);const status=statuses[calls.length-1];return {status,ok:status<300,json:async()=>status<300?{url:'https://images.example/image.webp'}:{error:status===403?'ليس لديك صلاحية':'سجّل الدخول مجددًا'}};}};
 vm.createContext(c);vm.runInContext(fs.readFileSync('image-storage.js','utf8'),c);
 const form=new FormData();form.set('photo',new Blob(['1234567890'],{type:'image/jpeg'}));
 return {c,form,calls,state};
}
test('R2 authentication failure refreshes once and reuses prepared images',async()=>{
 const {c,form,calls,state}=r2Context();
 assert.equal(await c.uploadOrLink(form,'shop'),'https://images.example/image.webp');
 assert.equal(state.refreshes,1);assert.equal(state.compressed,1);
 assert.equal(calls[0].headers.Authorization,'Bearer old');assert.equal(calls[1].headers.Authorization,'Bearer fresh');
 assert.equal(calls[0].body,calls[1].body);assert.equal(calls[1].body.get('store_id'),'shop');
});
test('R2 permission rejection is never retried',async()=>{
 const {c,form,calls,state}=r2Context({statuses:[403]});
 await assert.rejects(c.uploadOrLink(form,'shop'),/ليس لديك صلاحية/);
 assert.equal(calls.length,1);assert.equal(state.refreshes,0);
});
test('expired refresh does not attempt another upload',async()=>{
 const {c,form,calls}=r2Context({refreshError:true});
 await assert.rejects(c.uploadOrLink(form,'shop'),/تعذر تجديد جلسة/);assert.equal(calls.length,1);
});
test('valid Supabase session rejected by image service reports configuration problem with bounded retry',async()=>{
 const {c,form,calls,state}=r2Context({statuses:[401,401]});
 await assert.rejects(c.uploadOrLink(form,'shop'),/خدمة الصور ترفضها/);
 assert.equal(calls.length,2);assert.equal(state.refreshes,1);
});
test('changing accounts during refresh prevents retrying upload under another identity',async()=>{
 const {c,form,calls}=r2Context();
 c.api.auth.refreshSession=async()=>({data:{session:{access_token:'other',user:{id:'another-owner'}}}});
 await assert.rejects(c.uploadOrLink(form,'shop'),/تعذر تجديد جلسة/);assert.equal(calls.length,1);
});
test('large iPhone HEIC uses native decode and JPEG storage when WebP encoding is unavailable',async()=>{
 let uploaded,revoked=false,sent=0;const c={Blob,FormData,URL:{createObjectURL:()=> 'blob:iphone',revokeObjectURL(){revoked=true;}},crypto:{randomUUID:()=> 'photo-id'},Image:class{constructor(){this.width=4032;this.height=3024;}set src(v){queueMicrotask(()=>this.onload());}},window:{BEEP_CONFIG:{r2UploadUrl:'https://images.example/upload'}},document:{createElement:()=>({getContext:()=>({fillRect(){},drawImage(){}}),toBlob:(cb,type)=>cb(new Blob(['small jpeg'],{type:type==='image/webp'?'image/png':'image/jpeg'}))})},uploadOrLink:async()=>{throw Error('Old upload should not run');},thumbnailForImage:u=>u,safeImage:()=>true,compressMarketImage:async()=>new Blob(['png thumbnail'],{type:'image/png'}),api:{storage:{from:()=>({upload:async(key,data,options)=>{uploaded={key,data,options};return {};},getPublicUrl:key=>({data:{publicUrl:'https://storage.example/'+key}})})}},fetch:async()=>{sent++;throw Error('Worker should not receive unsupported format');}};
 vm.createContext(c);vm.runInContext(fs.readFileSync('image-storage.js','utf8'),c);const f=new FormData();f.set('photo',new Blob([new Uint8Array(6000000)],{type:'image/heic'}),'IMG.HEIC');const result=await c.uploadOrLink(f,'shop');assert.match(result,/photo-id.jpg$/);assert.equal(uploaded.data.type,'image/jpeg');assert.ok(uploaded.data.size<=1572864);assert.equal(uploaded.options.contentType,'image/jpeg');assert.equal(revoked,true);assert.equal(sent,0);
});

test('compatible photo within limits keeps the original bytes and aspect ratio',async()=>{let received,encoded=0;const c={Blob,FormData,window:{BEEP_CONFIG:{}},document:{createElement:()=>{encoded++;throw Error('No recompression needed');}},createImageBitmap:async()=>({width:900,height:1600,close(){}}),uploadOrLink:async f=>{received=f.get('photo');return 'saved';},thumbnailForImage:u=>u};vm.createContext(c);vm.runInContext(fs.readFileSync('image-storage.js','utf8'),c);const f=new FormData();f.set('photo',new Blob(['original image bytes'],{type:'image/png'}),'portrait.png');await c.uploadOrLink(f,'shop');assert.equal(await received.text(),'original image bytes');assert.equal(encoded,0);});
