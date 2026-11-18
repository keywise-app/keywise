import {createClient} from '@supabase/supabase-js';
import {growthEvents, growthSources} from '@/app/lib/growth';
export async function POST(req: Request) {
  if (req.headers.get('sec-fetch-site') === 'cross-site') return new Response(null,{status:403});
  try {
    const text=await req.text();
    if(text.length>512)return new Response(null,{status:413});
    const body=JSON.parse(text);
    if(!growthEvents.includes(body.event) || !growthSources.includes(body.source))return new Response(null,{status:400});
    const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
    // Existing visit log, no new data migration or identity storage.
    const {error}=await db.from('page_views').insert({page:`growth:${body.event}`,referrer:body.source,user_agent:'keywise-growth-v1'});
    return new Response(null,{status:error?503:204});
  } catch {return new Response(null,{status:400});}
}
