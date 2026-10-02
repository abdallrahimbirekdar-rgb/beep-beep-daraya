const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('catalogue uses thumbnail while gallery uses original and old images still render',()=>{
const code=fs.readFileSync('public/app.js','utf8'),start=code.indexOf('function safeImage('),end=code.indexOf('\nfunction toast',start);
const c={URL,location:{href:'https://example.com/beep-beep-daraya/'},esc:s=>s,navigator:{}};vm.createContext(c);vm.runInContext(code.slice(start,end),c);
const original='https://nxnqsudwccjlvyepuxfg.supabase.co/storage/v1/object/public/store-images/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/original.jpg';
assert.match(c.photo(original,'Item','product-image'),/src="[^"]+thumbnail.webp"/);
assert.match(c.photo(original,'Item','gallery-image'),/src="[^"]+original.jpg"/);
assert.equal(c.thumbnailForImage('https://example.com/old.png'),'https://example.com/old.png');
assert.equal(c.thumbnailForImage(original.replace('nxnqsudwccjlvyepuxfg.supabase.co','other.example')),original.replace('nxnqsudwccjlvyepuxfg.supabase.co','other.example'));
});
test('upload keeps original bytes and stores a separate thumbnail; both must succeed',async()=>{
const code=fs.readFileSync('public/market-tools.js','utf8'),start=code.indexOf('const marketUploadOriginal'),end=code.indexOf('\nconst marketReload',start);
const uploads=[],original={type:'image/jpeg',size:100000},thumbnail={type:'image/webp',size:20000};
const bucket={upload:async(key,data)=>{uploads.push({key,data});return{};},getPublicUrl:key=>({data:{publicUrl:'https://example.com/'+key}}),remove:async()=>({})};
const c={uploadOrLink:async()=>'',compressMarketImage:async()=>thumbnail,crypto:{randomUUID:()=> 'draft-id'},$:()=>null,api:{storage:{from:()=>bucket}},marketError:e=>e.message};
vm.createContext(c);vm.runInContext(code.slice(start,end),c);
const result=await c.uploadOrLink({get:()=>original},'shop-id');
assert.equal(uploads[0].data,original);assert.equal(uploads[1].data,thumbnail);assert.match(result,/original.jpg$/);assert.match(uploads[1].key,/thumbnail.webp$/);
bucket.upload=async key=>({error:key.endsWith('thumbnail.webp')?Error('Upload failed'):null});
await assert.rejects(c.uploadOrLink({get:()=>original},'shop-id'),/Upload failed/);
});
