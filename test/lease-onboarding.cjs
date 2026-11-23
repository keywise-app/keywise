// Real upload and batch handlers with isolated doubles; never contacts a provider.
const ts=require('typescript'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const resolve=Module._resolveFilename;Module._resolveFilename=function(r,p,...args){if(r.startsWith('@/'))r=path.join(root,r.slice(2));return resolve.call(this,r,p,...args);};
const owner='11111111-1111-4111-8111-111111111111';let uploadError=null,uploaded,extractionRequest,dbCalls=[];
const api={workspaceApi:async(url,options)=>{extractionRequest={url,body:JSON.parse(options.body)};return {tenant_name:'Sample'};}};
const db={rpc:async(name,args)=>{dbCalls.push({name,args});return {data:name==='workspace_commit_import_batch'?[{id:'lease'}]:args.p_items.map(x=>({id:x.id,revision:x.revision+1,approved_plan:x.plan,approved_digest:x.digest})),error:null};},from:(table)=>({select:()=>({eq:()=>({single:async()=>({data:{subscription_status:'active'}}),eq:()=>({maybeSingle:async()=>({data:null})})})})})};
const load=Module._load;
Module._load=function(r,parent,...args){
 if(parent?.filename.endsWith('/app/lib/lease-upload.ts')&&r==='./supabase')return {supabase:{auth:{getUser:async()=>({data:{user:{id:owner}}})},storage:{from:()=>({upload:async(p,f,o)=>{uploaded={p,f,o};return {error:uploadError};}})}}};
 if(parent?.filename.endsWith('/app/lib/lease-upload.ts')&&r==='./workspace-api')return api;
 if(r==='@/lib/workspace/access')return {workspaceAccess:async()=>({db,user:{id:owner}}),apiError:async e=>Response.json({error:e instanceof Response?await e.text():String(e)},{status:e instanceof Response?e.status:500})};
 return load.call(this,r,parent,...args);
};
(async()=>{
 let assertions=0;const equal=(a,b)=>{assert.deepEqual(a,b);assertions++;};
 const {leaseFileType,uploadLease,extractUploadedLease}=require('../app/lib/lease-upload.ts');
 equal(leaseFileType({name:'LEASE.PDF',type:'',size:1}),'application/pdf');
 equal(leaseFileType({name:'lease.pdf',type:'application/octet-stream',size:1}),'application/pdf');
 equal(leaseFileType({name:'photo.jpeg',type:'',size:1}),'image/jpeg');
 assert.throws(()=>leaseFileType({name:'lease.docx',type:'',size:1}),/PDF/);assertions++;
 assert.throws(()=>leaseFileType({name:'lease.pdf',type:'application/pdf',size:11*1024*1024}),/10 MB/);assertions++;
 const source=await uploadLease(new File(['lease'],'lease.pdf',{type:''}));
 equal(uploaded.o.contentType,'application/pdf');equal(source.fileType,'application/pdf');equal(source.storage_path.startsWith(owner+'/'),true);
 await extractUploadedLease(source);equal(extractionRequest.body.storage_path,source.storage_path);equal(extractionRequest.body.fileType,'application/pdf');
 uploadError={message:'Bucket not found'};await assert.rejects(uploadLease(new File(['lease'],'lease.pdf')),/Bucket not found/);assertions++;
 const {POST}=require('../app/api/workspace/imports/batch/route.ts');
 const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const form={address:'30 Example Rd, Unit A',building_address:'30 Example Rd',unit_number:'A',tenant_name:'Sample',rent:'4300',deposit:'',start_date:'',end_date:'',lifecycle_state:'month_to_month',timezone:'America/Los_Angeles',defer_schedule:true};
 const request=body=>POST(new Request('https://example.test/api/workspace/imports/batch',{method:'POST',body:JSON.stringify(body)}));
 let r=await request({operation:'preview',items:[{id,revision:0,payload:{form}}]});equal(r.status,200);const result=await r.json();equal(result.items[0].preview.plan.building_address,'30 Example Rd');equal(result.items[0].preview.plan.schedule,[]);
 const before=dbCalls.length;
 r=await request({operation:'preview',items:[{id,revision:0,payload:{form,source:{storage_path:'other/lease'}}}]});equal(r.status,404);equal(dbCalls.length,before);
 r=await request({operation:'preview',items:[{id,revision:0,payload:{form}},{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',revision:0,payload:{form}}]});equal(r.status,400);equal(dbCalls.length,before);
 r=await request({operation:'commit',items:[{id,revision:1,digest:result.items[0].preview.digest,payload:{form:{rent:'1'}}}]});equal(r.status,200);equal(Object.keys(dbCalls.at(-1).args.p_items[0]).sort(),['digest','id','revision']);
 r=await request({operation:'commit',items:[{id,revision:1,digest:'unreviewed'}]});equal(r.status,400);
 console.log(`Lease onboarding: ${assertions} assertions passed (file metadata fallback, upload errors, private sources, duplicate units and reviewed batch identity).`);
})().catch(e=>{console.error(e);process.exitCode=1;});
