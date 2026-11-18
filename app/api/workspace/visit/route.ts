import {workspaceAccess,apiError} from '@/lib/workspace/access';
import {growthSources} from '@/app/lib/growth';
export async function POST(req:Request){
 try{
  const {db,user}=await workspaceAccess(req);
  const body=await req.json();if(!growthSources.includes(body.source))return new Response(null,{status:400});
  const {data:profile,error:profileError}=await db.from('profiles').select('role').eq('id',user.id).maybeSingle();
  if(profileError)throw profileError;
  if(!profile)return new Response(null,{status:503});
  if(profile.role==='tenant')return new Response(null,{status:204});
  const {error:cohortError}=await db.from('workspace_growth_cohorts').upsert({user_id:user.id,source:body.source,signup_at:user.created_at},{onConflict:'user_id',ignoreDuplicates:true});
  if(cohortError)throw cohortError;
  const {error:visitError}=await db.from('workspace_growth_visits').upsert({user_id:user.id,visited_on:new Date().toISOString().slice(0,10)},{onConflict:'user_id,visited_on',ignoreDuplicates:true});
  if(visitError)throw visitError;
  return new Response(null,{status:204});
 }catch(e){return apiError(e);}
}
