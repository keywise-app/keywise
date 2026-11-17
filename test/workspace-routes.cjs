// Route-boundary tests execute the real handlers with all network requests prohibited.
const ts=require('typescript');const fs=require('node:fs');const path=require('node:path');const Module=require('node:module');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);
const resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...args){if(request.startsWith('@/'))request=path.join(root,request.slice(2));return resolve.call(this,request,parent,...args);};
process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-placeholder';process.env.STRIPE_SECRET_KEY='sk_test_placeholder';process.env.RESEND_API_KEY='re_placeholder';
let network=0;global.fetch=async()=>{network++;throw new Error('A route attempted a network request before authentication');};
(async()=>{
 const routes=['tenant/charge','tenant/setup-payment','tenant/save-payment-method','mark-payment-paid','stripe/payment-link','stripe/checkout','stripe/subscribe','stripe/connect','send-email','extract-lease','payment-request','workspace/imports','workspace/receipts','workspace/renewals','workspace/members','workspace/contractors','maintenance'];
 let assertions=0;
 for(const route of routes){
  const handler=require(path.join(root,'app/api',route,'route.ts'));
  const response=await handler.POST(new Request(`https://example.test/api/${route}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({payment_id:'foreign',amount:1,customer_id:'foreign',landlord_stripe_account_id:'foreign',to:'foreign@example.test',fileUrl:'http://169.254.169.254/latest/meta-data'})}));
  assert.equal(response.status,401,`${route} rejects anonymous invocation`);assertions++;
 }
 for(const route of ['cron/process-autopay','cron/apply-renewals','check-renewals']){
  delete process.env.CRON_SECRET;
  const response=await require(path.join(root,'app/api',route,'route.ts')).GET(new Request(`https://example.test/api/${route}`,{headers:{authorization:'Bearer undefined'}}));
  assert.equal(response.status,401);assertions++;
 }
 const exportResponse=await require(path.join(root,'app/api/workspace/export/route.ts')).GET(new Request('https://example.test/api/workspace/export?lease_id=foreign'));assert.equal(exportResponse.status,401);assertions++;
 assert.equal(network,0);assertions++;
 console.log(`Route boundaries: ${assertions} assertions passed; no provider or database request before authentication.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
