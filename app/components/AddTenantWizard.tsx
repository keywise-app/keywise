'use client';
import {useEffect,useRef,useState} from 'react';
import {supabase} from '../lib/supabase';
import {workspaceApi} from '../lib/workspace-api';
import {T,input,label,btn} from '../lib/theme';

type Props={onClose:()=>void;onComplete?:(lease:any)=>void;preselectedUnit?:{id:string;address?:string;unit_number?:string;building_id?:string;current_rent?:number}|null};
const blank={property_id:'',address:'',unit_number:'',tenant_name:'',email:'',phone:'',rent:'',deposit:'',start_date:'',end_date:'',lifecycle_state:'',timezone:'America/Los_Angeles',defer_schedule:true,first_due:'',frequency:'monthly',horizon:'3'};
export default function AddTenantWizard({onClose,onComplete,preselectedUnit}:Props) {
 const [form,setForm]=useState({...blank,...(preselectedUnit?{property_id:preselectedUnit.id,address:preselectedUnit.address || '',unit_number:preselectedUnit.unit_number || '',rent:String(preselectedUnit.current_rent || '')}:{})});
 const [units,setUnits]=useState<any[]>([]),[step,setStep]=useState(0),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(''),[preview,setPreview]=useState<any>(null),[created,setCreated]=useState<any>(null),[source,setSource]=useState<any>(null),[fields,setFields]=useState<Record<string,any>>({});
 const draft=useRef({id:crypto.randomUUID(),revision:0});
 const queue=useRef<Promise<any>>(Promise.resolve());
 const formRef=useRef(form);formRef.current=form;
 const ownerRef=useRef<string|null>(null);
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{heading.current?.focus();},[step,created]);
 useEffect(()=>{
  let active=true;
  (async()=>{
   try {
    const {data:{user}}=await supabase.auth.getUser();
    if(!user) throw new Error('Please sign in again.');
    ownerRef.current=user.id;
    // Discard the old unscoped browser draft, which could contain another account's data.
    localStorage.removeItem('kw_wizard_draft');
    const [{data:properties,error:propertyError},result]=await Promise.all([supabase.from('properties').select('id,address,unit_number,current_rent').eq('user_id',user.id).eq('is_unit',true).order('address'),workspaceApi('/api/workspace/imports')]);
    if(propertyError) throw new Error('Unable to load properties.');
    if(!active)return;
    setUnits(properties || []);
    const d=result.draft;
    if(d && (!preselectedUnit || d.payload.form?.property_id===preselectedUnit.id)) {
     draft.current={id:d.id,revision:d.revision};setForm({...blank,...d.payload.form});setSource(d.payload.source || null);setFields(d.payload.fields || {});setSaved('Restored your saved draft.');
    }
    setReady(true);
   } catch(e:any) {if(active)setError(e.message);}
  })();
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
   if(ownerRef.current && session?.user.id!==ownerRef.current){setForm({...blank});setSource(null);setFields({});setPreview(null);setReady(false);setError('Your session changed. Close this draft and sign in again.');}
  });
  return ()=>{active=false;subscription.unsubscribe();};
 },[]);
 const persist=(operation:'save'|'preview',payload:any)=>{
  const task=queue.current.then(async()=>{
   const result=await workspaceApi('/api/workspace/imports',{method:'POST',body:JSON.stringify({...draft.current,operation,payload})});
   draft.current={id:result.draft.id,revision:result.draft.revision};return result;
  });
  queue.current=task.catch(()=>{});return task;
 };
 useEffect(()=>{
  if(!ready || created || preview)return;
  setSaved('Saving draft…');
  const timer=setTimeout(()=>{persist('save',{form,source,fields}).then(()=>setSaved('Draft saved.')).catch((e:any)=>{setSaved('Draft not saved.');setError(e.message);});},700);
  return ()=>clearTimeout(timer);
 },[form,source,fields,ready,created,preview]);
 const change=(key:keyof typeof blank,value:any)=>{setForm(f=>({...f,[key]:value}));setPreview(null);setError('');};
 const close=async()=>{
  if(busy)return;
  setBusy(true);
  try {if(ready && !created && !preview)await persist('save',{form:formRef.current,source,fields});onClose();}
  catch(e:any){setError(e.message);}finally{setBusy(false);}
 };
 const extract=async(file:File)=>{
  setBusy(true);setError('');
  try {
   if(file.size>10*1024*1024)throw new Error('Use a PDF or image under 10 MB. You can also enter everything manually.');
   const {data:{user}}=await supabase.auth.getUser();
   if(!user)throw new Error('Please sign in again.');
   const path=`${user.id}/lease-${crypto.randomUUID()}`;
   const {error:uploadError}=await supabase.storage.from('workspace-sources').upload(path,file,{contentType:file.type});
   if(uploadError)throw new Error('Upload failed. Your draft is safe; retry or enter manually.');
   setSource({storage_path:path,filename:file.name});
   const data=await workspaceApi('/api/extract-lease',{method:'POST',body:JSON.stringify({storage_path:path,fileType:file.type})});
   setSource({...data.source,filename:file.name});setFields(data.fields);
   // Preserve existing entries: extraction supplies suggestions for empty fields only.
   setForm(f=>({...f,...Object.fromEntries(['tenant_name','email','phone','rent','deposit','start_date','end_date','unit_number'].filter(k=>!(f as any)[k]&&data[k]!==''&&data[k]!=null).map(k=>[k,String(data[k])])),address:f.address || data.property || ''}));
   setSaved('Extraction ready. Confirm every field; source excerpts are suggestions.');
  } catch(e:any){setError(e.message);} finally{setBusy(false);}
 };
 const review=async()=>{
  setBusy(true);setError('');
  try {const result=await persist('preview',{form,source,fields});setPreview(result.preview);setStep(2);} catch(e:any){setError(e.message);} finally{setBusy(false);}
 };
 const commit=async()=>{
  if(!preview)return;setBusy(true);setError('');
  try {
   await queue.current;
   const result=await workspaceApi('/api/workspace/imports',{method:'POST',body:JSON.stringify({...draft.current,operation:'commit',digest:preview.digest})});
   setCreated(result.lease);setSaved('Rental saved.');
  }catch(e:any){setError(e.message);}finally{setBusy(false);}
 };
 const field=(key:keyof typeof blank,title:string,type='text')=><div key={key} style={{marginBottom:14}}><label style={label} htmlFor={`import-${key}`}>{title}</label><input id={`import-${key}`} type={type} style={{...input,width:'100%',boxSizing:'border-box',outline:'auto'}} value={String(form[key])} onChange={e=>change(key,e.target.value)}/>{fields[key]&&<details style={{fontSize:12,color:T.inkMuted,marginTop:5}}><summary>Source: {fields[key].status} — verify before saving</summary><p>{fields[key].quote || 'No supporting excerpt was found.'}{fields[key].suggested_page?` (Suggested page ${fields[key].suggested_page}; unverified)` : ''}</p></details>}</div>;
 return <div role="dialog" aria-modal="true" aria-labelledby="occupied-title" style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(9,24,44,.6)',display:'flex',alignItems:'center',justifyContent:'center',padding:12}} onKeyDown={e=>{if(e.key==='Escape'&&!busy)void close();if(e.key==='Tab'){const elements=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]'));const first=elements[0],last=elements[elements.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}}>
  <section style={{background:T.surface,borderRadius:16,padding:24,width:640,maxWidth:'100%',maxHeight:'90dvh',overflowY:'auto',boxSizing:'border-box'}}>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',gap:16}}><h2 id="occupied-title" tabIndex={-1} ref={heading} style={{color:T.navy,margin:'0 0 12px'}}>{created?'Rental ready':'Set up an occupied rental'}</h2><button disabled={busy} onClick={close} aria-label="Close rental setup" style={btn.ghost}>Close</button></div>
   <p role="status" aria-live="polite" style={{fontSize:13,color:T.inkMuted}}>{saved}</p>
   {error&&<p role="alert" style={{padding:12,background:'#fff0ed',color:'#9d2c18',borderRadius:8}}>{error}</p>}
   {created?<><p>{created.tenant_name} · {created.property}</p><p>The rental and reviewed schedule are saved. No invitation or legal notice was sent. You can invite the tenant from their record.</p><button style={btn.primary} onClick={()=>{onComplete?.(created);onClose();}}>Open rental workspace</button></>:<>
    <p style={{fontSize:13}}>Step {step+1} of 3 · {['Rental and tenant','Terms and payment schedule','Review and approve'][step]}</p>
    <fieldset disabled={!ready||busy} style={{border:0,padding:0,margin:0,minWidth:0}}>
    {step===0&&<>
     <label htmlFor="lease-source" style={label}>Optional lease PDF or image · 10 MB maximum, PDF up to 40 pages</label><input id="lease-source" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];if(file)void extract(file);}} style={{maxWidth:'100%',marginBottom:18}}/>
     <label htmlFor="import-property" style={label}>Rental unit</label><select id="import-property" style={{...input,width:'100%',marginBottom:14}} value={form.property_id} onChange={e=>{const unit=units.find(u=>u.id===e.target.value);setForm(f=>({...f,property_id:e.target.value,address:unit?.address || '',unit_number:unit?.unit_number || '',rent:unit?.current_rent?String(unit.current_rent):f.rent}));}}><option value="">Create a new unit</option>{units.map(u=><option key={u.id} value={u.id}>{u.address}</option>)}</select>
     {field('address','Full address, including unit')}{!form.property_id&&field('unit_number','Unit label (optional)')}{field('tenant_name','Tenant name')}{field('email','Tenant email (optional)','email')}{field('phone','Phone (optional)','tel')}
     <p style={{fontSize:12}}>Multiple occupants and co-signer permissions require separate linked accounts; entering a name here does not grant access.</p>
    </>}
    {step===1&&<>
     {field('rent','Rent amount ($)','number')}{field('deposit','Deposit amount ($, optional; kept separate from rent)','number')}{field('start_date','Lease start (optional)','date')}{field('end_date','Original fixed-term end (optional)','date')}
     <label htmlFor="tenancy-state" style={label}>Current tenancy — confirm explicitly</label><select id="tenancy-state" style={{...input,width:'100%',marginBottom:14}} value={form.lifecycle_state} onChange={e=>change('lifecycle_state',e.target.value)}><option value="">Select current state</option><option value="active_fixed">Active fixed term</option><option value="month_to_month">Continuing month-to-month</option><option value="future">Starts in the future</option><option value="needs_review">Needs review</option></select>
     {field('timezone','Property time zone (for example, America/Los_Angeles)')}
     <label style={{display:'flex',gap:8,margin:'12px 0'}}><input type="checkbox" checked={form.defer_schedule} onChange={e=>change('defer_schedule',e.target.checked)}/>Defer the rent schedule; create no charges yet</label>
     {!form.defer_schedule&&<>{field('first_due','First full rent charge date — no automatic proration','date')}<label htmlFor="import-frequency" style={label}>Frequency</label><select id="import-frequency" style={{...input,width:'100%',marginBottom:14}} value={form.frequency} onChange={e=>change('frequency',e.target.value)}><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="bi-weekly">Every two weeks</option></select>{field('horizon','Number of charges to generate (1–12)','number')}<p style={{fontSize:12}}>The schedule stops at the fixed-term end when applicable. No late fees or deposit charges are added.</p></>}
    </>}
    {step===2&&preview&&<><p><strong>{preview.plan.tenant_name}</strong><br/>{preview.plan.address}</p><p>Rent ${(preview.plan.rent_cents/100).toFixed(2)} · {preview.plan.lifecycle_state.replaceAll('_',' ')}<br/>Deposit {preview.plan.deposit_cents===null?'not recorded':`$${(preview.plan.deposit_cents/100).toFixed(2)}`} · {preview.plan.timezone}</p><p>No email, SMS, card charge, or legal notice will be sent.</p>{preview.plan.schedule.length?<div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'left'}}><caption>Exact rent charges to create</caption><thead><tr><th scope="col">Due date</th><th scope="col">Amount</th></tr></thead><tbody>{preview.plan.schedule.map((p:any)=><tr key={p.due_date}><td>{p.due_date}</td><td>${(p.amount_cents/100).toFixed(2)}</td></tr>)}</tbody></table></div>:<p>Schedule deferred: no rent charges will be created.</p>}<p style={{fontSize:12}}>Confirm the source and dates above. Saving creates the unit (if new), tenancy and listed charges together. Retrying this approval returns the same tenancy.</p></>}
    </fieldset>
    <div style={{display:'flex',flexWrap:'wrap',gap:10,marginTop:20}}>{step>0&&<button disabled={busy} style={btn.ghost} onClick={()=>{setPreview(null);setStep(step-1);}}>Back</button>}{step===0?<button disabled={!ready||busy} style={btn.primary} onClick={()=>setStep(1)}>Continue to terms</button>:step===1?<button disabled={!ready||busy} style={btn.primary} onClick={review}>{busy?'Preparing…':'Review exact records'}</button>:<button disabled={busy} style={btn.primary} onClick={commit}>{busy?'Saving…':'Approve and save rental'}</button>}</div>
   </>}
  </section>
 </div>;
}
