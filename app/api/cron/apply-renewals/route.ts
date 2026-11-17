import {createClient} from '@supabase/supabase-js';
export async function GET(req:Request){
 if(!process.env.CRON_SECRET || req.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return Response.json({error:'Unauthorized'},{status:401});
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
 const {data,error:applyError}=await db.rpc('workspace_apply_renewals',{p_at:new Date().toISOString()});
 if(applyError)return Response.json({error:'Renewal application needs reconciliation.'},{status:503});
 return Response.json({applied:data});
}
