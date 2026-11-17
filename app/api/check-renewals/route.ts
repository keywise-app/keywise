import {createClient} from '@supabase/supabase-js';
import {sendWorkspaceEmail,escapeHtml} from '@/lib/workspace/email';
export async function GET(req:Request){
 if(!process.env.CRON_SECRET || req.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return Response.json({error:'Unauthorized'},{status:401});
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
 const horizon=new Date(Date.now()+90*86400000).toISOString().slice(0,10);
 const {data:leases,error}=await db.from('leases').select('id,user_id,tenant_name,property,end_date,lifecycle_state').eq('end_date',horizon).eq('archived',false).or('renewal_flagged.is.null,renewal_flagged.eq.false');
 if(error)return Response.json({error:'Unable to load renewals.'},{status:503});
 let accepted=0,failed=0;
 for(const lease of leases || []){
  if(['ended','archived','month_to_month'].includes(lease.lifecycle_state))continue;
  const {data:owner}=await db.from('profiles').select('email').eq('id',lease.user_id).single();if(!owner?.email)continue;
  try{
   await sendWorkspaceEmail(db,{actorId:lease.user_id,leaseId:lease.id,to:owner.email,requestId:`renewal-reminder-${lease.id}-${lease.end_date}`,subject:'Lease review due in 90 days',html:`<p>${escapeHtml(lease.tenant_name || '')}: ${escapeHtml(lease.property || '')}</p><p>Recorded fixed-term end: ${lease.end_date}. Confirm the current tenancy and review renewal terms. No tenant offer or statutory notice has been sent.</p><p><a href="https://keywise.app/?page=tenants&lease=${lease.id}&tab=overview">Review tenancy</a></p>`});
   const {error:saveError}=await db.from('leases').update({renewal_flagged:true,renewal_flagged_at:new Date().toISOString()}).eq('id',lease.id);if(saveError)throw saveError;accepted++;
  }catch{failed++;}
 }
 return Response.json({provider_accepted:accepted,failed});
}
