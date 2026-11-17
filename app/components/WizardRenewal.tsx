'use client';
import {useEffect,useRef,useState} from 'react';
import {supabase} from '../lib/supabase';
import {workspaceApi} from '../lib/workspace-api';
import {T,btn,input,label} from '../lib/theme';
export default function WizardRenewal({onClose,initialLeaseId}:{onClose:()=>void;initialLeaseId?:string}){
 const [leases,setLeases]=useState<any[]>([]),[selected,setSelected]=useState<any>(null),[proposals,setProposals]=useState<any[]>([]),[proposal,setProposal]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState(''),[source,setSource]=useState('');
 const [form,setForm]=useState({rent:'',effective_date:'',end_date:'',lifecycle_state:'month_to_month',response_date:'',first_due:'',horizon:'3',timezone:'America/Los_Angeles'});
 const proposalId=useRef(crypto.randomUUID());
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{heading.current?.focus();(async()=>{
  const {data:{user}}=await supabase.auth.getUser();if(!user){setError('Please sign in again.');return;}
  const {data,error}=await supabase.from('leases').select('*').eq('user_id',user.id).eq('archived',false).order('tenant_name');
  if(error){setError('Unable to load tenancies.');return;}setLeases(data || []);
  const id=initialLeaseId || new URLSearchParams(window.location.search).get('lease');if(id)void load(id);
 })();},[]);
 const load=async(id:string)=>{
  setBusy(true);setError('');
  try{const data=await workspaceApi(`/api/workspace/renewals?lease_id=${encodeURIComponent(id)}`);setSelected(data.lease);setProposals(data.proposals || []);setForm(f=>({...f,rent:String(data.lease.rent || ''),end_date:'',effective_date:'',first_due:''}));setProposal(null);setSource('');proposalId.current=crypto.randomUUID();}
  catch(e:any){setError(e.message);}finally{setBusy(false);}
 };
 const change=(key:string,value:string)=>{setForm(f=>({...f,[key]:value}));setProposal(null);setSource('');proposalId.current=crypto.randomUUID();};
 const create=async()=>{
  setBusy(true);setError('');setStatus('');
  try{const data=await workspaceApi('/api/workspace/renewals',{method:'POST',body:JSON.stringify({operation:'create',id:proposalId.current,lease_id:selected.id,base_revision:selected.terms_revision,...form,end_date:form.lifecycle_state==='month_to_month'?null:form.end_date})});setProposal(data.proposal);setProposals(p=>[data.proposal,...p.filter(x=>x.id!==data.proposal.id)]);setStatus('Proposal saved. Current rent and charges are unchanged.');}
  catch(e:any){setError(e.message);}finally{setBusy(false);}
 };
 const upload=async(file:File)=>{
  setBusy(true);setError('');try{
   if(file.type!=='application/pdf'||file.size>10485760)throw new Error('Upload an executed PDF agreement under 10 MB.');
   const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Please sign in again.');
   const path=`${user.id}/executed-renewal-${crypto.randomUUID()}.pdf`;
   const {error}=await supabase.storage.from('workspace-sources').upload(path,file);if(error)throw new Error('Agreement upload failed.');setSource(path);
  }catch(e:any){setError(e.message);}finally{setBusy(false);}
 };
 const act=async(operation:'send'|'execute')=>{
  setBusy(true);setError('');try{
   const data=await workspaceApi('/api/workspace/renewals',{method:'POST',body:JSON.stringify({operation,id:proposal.id,digest:proposal.digest,storage_path:source})});
   if(data.proposal){setProposal(data.proposal);setProposals(p=>p.map(x=>x.id===data.proposal.id?data.proposal:x));}
   setStatus(operation==='send'?'Email accepted by the provider. Delivery and tenant agreement are not yet confirmed.':'Executed agreement recorded. Reviewed future charges are updated once; current rent changes on its effective property date.');
  }catch(e:any){setError(e.message);}finally{setBusy(false);}
 };
 const field=(key:keyof typeof form,title:string,type='text')=><label key={key} style={{display:'block',marginBottom:12}}><span style={label}>{title}</span><input type={type} style={{...input,outline:'auto'}} value={form[key]} onChange={e=>change(key,e.target.value)}/></label>;
 return <div role="dialog" aria-modal="true" aria-labelledby="renewal-title" style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(9,24,44,.6)',display:'flex',alignItems:'center',justifyContent:'center',padding:12}} onKeyDown={e=>{if(e.key==='Escape'&&!busy)onClose();if(e.key==='Tab'){const els=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled)'));if(e.shiftKey&&document.activeElement===els[0]){e.preventDefault();els.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===els.at(-1)){e.preventDefault();els[0]?.focus();}}}}>
  <section style={{background:T.surface,borderRadius:16,padding:24,width:620,maxWidth:'100%',maxHeight:'90dvh',overflowY:'auto',boxSizing:'border-box'}}>
   <div style={{display:'flex',justifyContent:'space-between',gap:12}}><h2 ref={heading} tabIndex={-1} id="renewal-title" style={{marginTop:0,color:T.navy}}>Review a renewal</h2><button style={btn.ghost} disabled={busy} onClick={onClose}>Close</button></div>
   {error&&<p role="alert">{error}</p>}{status&&<p role="status">{status}</p>}
   <label>Tenancy<select style={input} disabled={busy} value={selected?.id || ''} onChange={e=>load(e.target.value)}><option value="">Select a tenancy</option>{leases.map(l=><option key={l.id} value={l.id}>{l.tenant_name} · {l.property}</option>)}</select></label>
   {selected&&<><p>Current rent: ${Number(selected.rent).toFixed(2)}. Current fixed-term end: {selected.end_date || 'not recorded'}.</p><p style={{fontSize:13}}>Market analysis is optional. You can prepare an offer using the current terms without running AI analysis. Statutory notices require their own review.</p>
    <fieldset disabled={busy} style={{border:0,padding:0,minWidth:0}}>
    {field('rent','Proposed monthly rent ($)','number')}{field('effective_date','Effective date','date')}
    <label>Term<select style={input} value={form.lifecycle_state} onChange={e=>change('lifecycle_state',e.target.value)}><option value="month_to_month">Month-to-month</option><option value="active_fixed">Fixed term</option></select></label>
    {form.lifecycle_state==='active_fixed'&&field('end_date','New fixed-term end','date')}{field('response_date','Response deadline (optional)','date')}{field('timezone','Property time zone')}{field('first_due','First full charge date — no automatic proration','date')}{field('horizon','Monthly charges to create or replace (1–12)','number')}
    <button style={btn.primary} onClick={create}>Save and review proposal</button>
    </fieldset>
   </>}
   {proposal&&<section style={{marginTop:18,padding:14,background:T.bg,borderRadius:10}}><h3>Version {proposal.id.slice(0,8)} · {proposal.state}</h3><p>${(proposal.plan.rent_cents/100).toFixed(2)} from {proposal.plan.effective_date}</p><ul>{proposal.plan.schedule.map((p:any)=><li key={p.due_date}>{p.due_date}: ${(p.amount_cents/100).toFixed(2)}</li>)}</ul><p style={{fontSize:12}}>Sending this proposal does not modify the lease or record acceptance.</p><button style={btn.ghost} disabled={busy||proposal.state!=='proposal'} onClick={()=>act('send')}>Approve and email this proposal</button>
    {proposal.state==='proposal'&&<><label style={{display:'block',marginTop:14}}>Executed agreement PDF<input type="file" accept="application/pdf" disabled={busy} style={{maxWidth:'100%',display:'block'}} onChange={e=>{if(e.target.files?.[0])void upload(e.target.files[0]);}}/></label><p style={{fontSize:12}}>By applying, you confirm the uploaded agreement is executed by the required parties and matches the reviewed terms. Uploading alone does not apply it.</p><button style={btn.primary} disabled={busy||!source} onClick={()=>act('execute')}>Confirm executed agreement and apply reviewed terms</button></>}
   </section>}
   {proposals.length>0&&<details style={{marginTop:18}}><summary>Saved proposal versions ({proposals.length})</summary>{proposals.map(p=><p key={p.id}><button style={btn.ghost} onClick={()=>{setProposal(p);setSource('');}}>{p.plan.effective_date} · ${(p.plan.rent_cents/100).toFixed(2)} · {p.state}</button></p>)}</details>}
  </section>
 </div>;
}
