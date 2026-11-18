import {createClient} from '@supabase/supabase-js';
import {verifyAdminToken} from '@/lib/admin-auth';
import {growthEvents,growthSources} from '@/app/lib/growth';
import {workflowMetrics} from '@/lib/workspace/growth-metrics';
export async function GET(req:Request){
  const token=req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if(!token || !await verifyAdminToken(token))return Response.json({error:'Admin sign-in required.'},{status:401});
  const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
  const cutoff=new Date(Date.now()-30*86400000).toISOString();
  // Deliberately bounded. A capped sample is never presented as a complete count.
  async function load(table:string,columns:string,column:string){
    let rows:any[]=[];
    for(let offset=0;offset<10000;offset+=1000){
      const {data,error}=await db.from(table).select(columns).gte(column,cutoff).order(column).order(table==='page_views'?'id':'workflow_id').range(offset,offset+999);
      if(error)throw error;
      rows.push(...(data||[]));if((data||[]).length<1000)return {rows,capped:false};
    }
    return {rows,capped:true};
  }
  try{
    const [outcomes,visits]=await Promise.all([load('workspace_workflow_outcomes','workflow_id,user_id,workflow,event,occurred_at','occurred_at'),load('page_views','page,referrer,visited_at','visited_at')]);
    const interactions:Record<string,Record<string,number>>={};
    for(const row of visits.rows){if(!row.page?.startsWith('growth:') || !growthEvents.includes(row.page.slice(7)) || !growthSources.includes(row.referrer))continue;const source=row.referrer;interactions[source]||={};interactions[source][row.page.slice(7)]=(interactions[source][row.page.slice(7)]||0)+1;}
    return Response.json({window_days:30,interactions,workflows:workflowMetrics(outcomes.rows),capped:outcomes.capped||visits.capped,limitations:['Interactions are anonymous, client reported and may repeat; they are not unique signups.','Workflow completions are server recorded. Elapsed time includes pauses and assisted work.','Workflow start may precede the window. Repair outcomes and rent-cycle retention are not yet instrumented.','Anonymous channels cannot yet be joined to confirmed activation or payment.']},{headers:{'Cache-Control':'private, no-store'}});
  }catch{return Response.json({error:'Unable to load metrics. No zero-count substitute was returned.'},{status:503});}
}
