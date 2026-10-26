// Preserve global classic-script bindings; only local names may be shortened.
const {minify}=require('terser');
let input='';
process.stdin.setEncoding('utf8');
process.stdin.on('data',part=>input+=part);
process.stdin.on('end',async()=>{
 try{
  const result={};
  for(const [name,code] of Object.entries(JSON.parse(input))){
   result[name]=(await minify(code,{
    compress:{defaults:true,toplevel:false},mangle:{toplevel:false},
    keep_fnames:true,keep_classnames:true,format:{comments:false}
   })).code;
  }
  process.stdout.write(JSON.stringify(result));
 }catch(error){process.stderr.write(String(error));process.exitCode=1;}
});
