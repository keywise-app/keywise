'use client';
import {useEffect,useRef,useState} from 'react';
import {supabase} from '../lib/supabase';
import {workspaceApi} from '../lib/workspace-api';
import {uploadLease,extractUploadedLease} from '../lib/lease-upload';
import {trackGrowth} from '../lib/growth';
import {T,input,label,btn} from '../lib/theme';

type Props={onClose:()=>void;onComplete?:(lease:any)=>void;initialFiles?:File[];preselectedUnit?:{id:string;address?:string;unit_number?:string;building_id?:string;current_rent?:number}|null};
const blank={property_id:'',building_address:'',address:'',unit_number:'',tenant_name:'',email:'',phone:'',rent:'',deposit:'',start_date:'',end_date:'',lifecycle_state:'needs_review',timezone:'America/Los_Angeles',defer_schedule:true,first_due:'',frequency:'monthly',horizon:'3'};
type Form=typeof blank;
type Entry={id:string;revision:number;form:Form;source:any;fields:Record<string,any>;status?:string;error?:string;file?:File;preview?:any;current:boolean};
const newEntry=(form:Partial<Form>={}):Entry=>({id:crypto.randomUUID(),revision:0,form:{...blank,...form},source:null,fields:{},current:false});
export default function AddTenantWizard({onClose,onComplete,preselectedUnit,initialFiles}:Props) {
 const [entries,setEntries]=useState<Entry[]>([]),[units,setUnits]=useState<any[]>([]),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(''),[reviewing,setReviewing]=useState(false),[created,setCreated]=useState<any[]|null>(null);
 const items=useRef(entries);items.current=entries;
 const owner=useRef<string|null>(null),active=useRef(true),pending=useRef(0),queue=useRef<Promise<any>>(Promise.resolve());
 const heading=useRef<HTMLHeadingElement>(null),fileInput=useRef<HTMLInputElement>(null),returnFocus=useRef<HTMLElement|null>(null);
 const patch=(id:string,update:Partial<Entry>)=>setEntries(old=>old.map(e=>e.id===id?{...e,...update}:e));
 const change=(id:string,key:keyof Form,value:any)=>{setEntries(old=>old.map(e=>e.id===id?{...e,form:{...e.form,[key]:value,...(!e.form.property_id&&(key==='building_address'||key==='unit_number')&&(key==='building_address'?value:e.form.building_address)?{address:`${key==='building_address'?value:e.form.building_address}${(key==='unit_number'?value:e.form.unit_number)?`, Unit ${key==='unit_number'?value:e.form.unit_number}`:''}`}:{})},current:false,preview:undefined}:e));setReviewing(false);setError('');};
 const persist=(operation:'save'|'preview',snapshot:Entry[])=>{
  const actor=owner.current;
  const task=queue.current.then(async()=>{
   if(!active.current||actor!==owner.current)throw new Error('Your session changed. Reopen setup.');
   // Resolve revisions at execution time so queued autosaves cannot overwrite a newer revision.
   const result=await workspaceApi('/api/workspace/imports/batch',{method:'POST',body:JSON.stringify({operation,items:snapshot.map(e=>({id:e.id,revision:items.current.find(x=>x.id===e.id)?.revision ?? e.revision,payload:{form:e.form,source:e.source,fields:e.fields}}))})});
   if(!active.current||actor!==owner.current)throw new Error('Your session changed. Reopen setup.');
   setEntries(old=>old.map(e=>{const r=result.items.find((x:any)=>x.draft.id===e.id);return r?{...e,revision:r.draft.revision,preview:r.preview}:e;}));
   // Keep the revision synchronously available to the next queued request.
   items.current=items.current.map(e=>{const r=result.items.find((x:any)=>x.draft.id===e.id);return r?{...e,revision:r.draft.revision}:e;});
   return result;
  });
  queue.current=task.catch(()=>{});return task;
 };
 const readLease=async(entry:Entry,file?:File)=>{
  pending.current++;setBusy(true);patch(entry.id,{status:'Uploading…',error:''});
  try {
   let source=entry.source;
   if(!source) {if(!file)throw new Error('Choose the lease again to retry.');source=await uploadLease(file);if(!active.current)return;patch(entry.id,{source});}
   patch(entry.id,{status:'Reading lease…'});
   const data=await extractUploadedLease(source);
   if(!active.current)return;
   setEntries(old=>old.map(e=>{
    if(e.id!==entry.id)return e;
    const form={...e.form};
    for(const k of ['tenant_name','email','phone','rent','deposit','start_date','end_date','unit_number'] as const) if(!form[k]&&data[k]!==''&&data[k]!=null)form[k]=String(data[k]);
    form.address ||= data.property || '';
    form.building_address ||= data.building_address || '';
    if(data.payment_frequency) form.frequency=data.payment_frequency;
    return {...e,form,source:{...source,...data.source},fields:data.fields,status:'Ready to review',error:'',current:false};
   }));
  }catch(e:any){if(active.current)patch(entry.id,{status:'Needs attention',error:e.message});}
  finally{pending.current--;if(active.current)setBusy(pending.current>0);}
 };
 const addFiles=async(files:File[])=>{
  if(!files.length)return;
  const old=items.current;
  const onlyEmpty=old.length===1&&!old[0].source&&!old[0].file;
  const base=onlyEmpty?[]:old;
  if(base.length+files.length>10){setError('Add up to ten leases at a time.');return;}
  if(preselectedUnit&&base.length+files.length>1){setError('This unit accepts one lease. Start from Leases to add several units.');return;}
  const next=files.map(file=>({...newEntry(onlyEmpty?old[0].form:{}),file}));
  setEntries([...base,...next]);items.current=[...base,...next];setReviewing(false);setError('');
  // Two documents at a time keeps requests responsive without overwhelming extraction.
  let cursor=0;
  await Promise.all(Array.from({length:Math.min(2,next.length)},async()=>{while(cursor<next.length){const e=next[cursor++];await readLease(e,e.file);}}));
 };
 useEffect(()=>{
  active.current=true;returnFocus.current=document.activeElement as HTMLElement;heading.current?.focus();
  (async()=>{try{
   const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Please sign in again.');owner.current=user.id;
   const [{data,error:unitError},drafts]=await Promise.all([supabase.from('properties').select('id,address,unit_number,current_rent,building_id').eq('user_id',user.id).eq('is_unit',true).order('address'),workspaceApi('/api/workspace/imports?all=1')]);
   if(unitError)throw new Error('Unable to load existing units.');if(!active.current)return;
   setUnits(data || []);
   const restored=initialFiles?.length?[]:drafts.drafts.filter((d:any)=>!preselectedUnit||d.payload.form?.property_id===preselectedUnit.id);
   const next:Entry[]=restored.length?restored.map((d:any)=>({id:d.id,revision:d.revision,form:{...blank,...d.payload.form},source:d.payload.source,fields:d.payload.fields || {},current:false})): [newEntry(preselectedUnit?{property_id:preselectedUnit.id,address:preselectedUnit.address || '',unit_number:preselectedUnit.unit_number || '',rent:String(preselectedUnit.current_rent || '')}:{})];
   items.current=next;setEntries(next);setReady(true);setSaved(restored.length?'Restored your saved rentals.':'');trackGrowth('import_opened','occupied-import');
   if(initialFiles?.length)await addFiles(initialFiles);
  }catch(e:any){if(active.current)setError(e.message);}})();
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{if(owner.current&&session?.user.id!==owner.current){active.current=false;items.current=[];setEntries([]);setReady(false);setError('Your session changed. Close setup and sign in again.');}});
  return()=>{active.current=false;subscription.unsubscribe();returnFocus.current?.focus();};
 },[]);
 useEffect(()=>{
  if(!ready||busy||reviewing||created||!entries.length)return;
  const timer=setTimeout(()=>{setSaved('Saving draft…');persist('save',entries).then(()=>setSaved('Draft saved.')).catch((e:any)=>{setSaved('Draft not saved.');setError(e.message);});},900);
  return()=>clearTimeout(timer);
 },[entries.map(e=>JSON.stringify([e.id,e.form,e.source,e.fields])).join('|'),ready,busy,reviewing,created]);
 const close=async()=>{if(busy)return;setBusy(true);try{if(ready&&!created&&entries.length)await persist('save',items.current);onClose();}catch(e:any){setError(e.message);}finally{setBusy(false);}};
 const remove=async(id:string)=>{
  setBusy(true);setError('');
  try {
   await queue.current;
   const e=items.current.find(x=>x.id===id);
   if(e?.revision)await workspaceApi('/api/workspace/imports',{method:'DELETE',body:JSON.stringify({id,revision:e.revision})});
   setEntries(old=>old.filter(x=>x.id!==id));setReviewing(false);
  }catch(e:any){setError(e.message);}finally{setBusy(false);}
 };
 const review=async()=>{
  if(entries.some(e=>!e.current)){setError('Confirm the current terms for each rental before reviewing.');return;}
  setBusy(true);setError('');try{await persist('preview',items.current);setReviewing(true);trackGrowth('import_reviewed','occupied-import');heading.current?.focus();}catch(e:any){setError(e.message);}finally{setBusy(false);}
 };
 const commit=async()=>{setBusy(true);setError('');try{await queue.current;const result=await workspaceApi('/api/workspace/imports/batch',{method:'POST',body:JSON.stringify({operation:'commit',items:items.current.map(e=>({id:e.id,revision:e.revision,digest:e.preview?.digest}))})});setCreated(result.leases);trackGrowth('import_saved','occupied-import');heading.current?.focus();}catch(e:any){setError(e.message);}finally{setBusy(false);}};
 const newEntries=entries.filter(e=>!e.form.property_id);
 const commonBuilding=newEntries.length>1&&newEntries.every(e=>e.form.building_address.trim()===newEntries[0].form.building_address.trim())?newEntries[0].form.building_address:'';
 const field=(e:Entry,key:keyof Form,title:string,type='text')=><label style={{...label,display:'block'}} key={key}>{title}<input type={type} style={{...input,width:'100%',boxSizing:'border-box',marginTop:5}} value={String(e.form[key])} onChange={event=>change(e.id,key,event.target.value)}/>{e.fields[key]?.status==='conflict'&&<span style={{color:'#9d2c18'}}>Conflicting terms: resolve before saving.</span>}</label>;
 return <div role="dialog" aria-modal="true" aria-labelledby="occupied-title" style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(9,24,44,.6)',display:'flex',alignItems:'center',justifyContent:'center',padding:12}} onKeyDown={e=>{if(e.key==='Escape'&&!busy)void close();if(e.key==='Tab'){const els=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')).filter(el=>el.getClientRects().length);const first=els[0],last=els[els.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===heading.current)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}}>
 <section style={{background:T.surface,borderRadius:16,padding:24,width:900,maxWidth:'100%',maxHeight:'92dvh',overflowY:'auto',boxSizing:'border-box'}}>
 <div style={{display:'flex',justifyContent:'space-between',gap:12}}><h2 id="occupied-title" ref={heading} tabIndex={-1} style={{color:T.navy,margin:0}}>{created?'Your rentals are ready':reviewing?'Confirm your rentals':'Add rentals from your leases'}</h2><button style={btn.ghost} disabled={busy} onClick={close}>Close</button></div>
 <p role="status" aria-live="polite">{busy?'Working on your rentals…':saved}</p>{error&&<p role="alert" style={{background:'#fff0ed',color:'#9d2c18',padding:12}}>{error}</p>}
 {created?<><p>{created.length} rental{created.length===1?'':'s'} saved with connected unit and tenant records.</p><button style={btn.primary} onClick={()=>{onComplete?.(created[0]);onClose();}}>Done</button></>:<>
 {!reviewing&&<><p>Drop your leases together. Review the building, units and tenants once. Existing payment arrangements can stay as they are.</p>
 <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(ready&&!busy)void addFiles(Array.from(e.dataTransfer.files));}} style={{border:`2px dashed ${T.teal}`,borderRadius:12,padding:22,textAlign:'center',marginBottom:20}}>
 <label style={label} htmlFor="lease-source">Drop lease PDFs or photos here, or choose files</label><input ref={fileInput} id="lease-source" type="file" multiple={!preselectedUnit} accept=".pdf,.jpg,.jpeg,.png,.webp" disabled={!ready||busy} onChange={e=>{void addFiles(Array.from(e.target.files || []));e.target.value='';}} style={{maxWidth:'100%'}}/><p style={{fontSize:12}}>Up to 10 leases · 10 MB each · PDFs up to 40 pages</p></div></>}
 <fieldset disabled={!ready||busy} style={{border:0,padding:0,minWidth:0}}>
 {!reviewing&&entries.length>1&&<div style={{background:T.tealLight,padding:14,borderRadius:10,marginBottom:16}}><label style={label} htmlFor="shared-building">Same building? Enter its address once to apply to all new units.</label><input id="shared-building" style={{...input,width:'100%',boxSizing:'border-box'}} placeholder="Street address, city, state and ZIP" value={commonBuilding} onChange={event=>{const address=event.target.value;setEntries(old=>old.map(x=>x.form.property_id?x:{...x,current:false,form:{...x.form,building_address:address,address:address+(x.form.unit_number?`, Unit ${x.form.unit_number}`:'')}}));}}/><p style={{fontSize:12}}>Unit labels below keep each rental separate. Leave blank for different buildings.</p></div>}
 {entries.map((e,index)=><article key={e.id} style={{border:`1px solid ${T.border}`,borderRadius:12,padding:16,marginBottom:16}}>
 <h3 style={{marginTop:0}}>{e.form.unit_number?`Unit ${e.form.unit_number}`:`Rental ${index+1}`} {e.source?.filename&&<small style={{fontWeight:400}}>· {e.source.filename}</small>}</h3>
 {!reviewing&&<button style={btn.ghost} onClick={()=>void remove(e.id)}>Remove rental</button>}
 {e.status&&<p role="status">{e.status}</p>}{e.error&&<div role="alert"><p>{e.error}</p><button style={btn.ghost} onClick={()=>void readLease(e,e.file)}>Retry this document</button><p>You can also enter the details below and keep the uploaded source.</p></div>}
 {reviewing&&e.preview?<><p><strong>{e.preview.plan.tenant_name}</strong><br/>{e.preview.plan.address}<br/>Rent ${(e.preview.plan.rent_cents/100).toFixed(2)} · Deposit {e.preview.plan.deposit_cents===null?'not recorded':`$${(e.preview.plan.deposit_cents/100).toFixed(2)}`}<br/>{e.preview.plan.lifecycle_state.replaceAll('_',' ')} · {e.preview.plan.start_date || 'Start not recorded'} → {e.preview.plan.end_date || 'No fixed end recorded'}</p>{e.preview.plan.schedule.length?<ul>{e.preview.plan.schedule.map((p:any)=><li key={p.due_date}>{p.due_date}: ${(p.amount_cents/100).toFixed(2)}</li>)}</ul>:<p>Rent schedule deferred; no charges created.</p>}</>:<>
 <label style={label}>Rental unit<select style={{...input,width:'100%',marginTop:5,marginBottom:12}} value={e.form.property_id} onChange={event=>{const unit=units.find(u=>u.id===event.target.value);patch(e.id,{current:false,form:{...e.form,property_id:unit?.id || '',address:unit?.address || e.form.address,unit_number:unit?.unit_number || e.form.unit_number,rent:String(unit?.current_rent || e.form.rent)}});}}><option value="">New unit — create with this lease</option>{units.map(u=><option value={u.id} key={u.id}>{u.address}</option>)}</select></label>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,220px),1fr))',gap:12}}>
 {!e.form.property_id&&!commonBuilding&&field(e,'building_address','Building address (without unit)')}{!e.form.property_id&&field(e,'unit_number','Unit label (A, B, etc.)')}{!commonBuilding&&!e.form.property_id&&field(e,'address','Full rental address')}{field(e,'tenant_name','Tenant name')}{field(e,'rent','Rent amount ($)','number')}{field(e,'deposit','Deposit ($, optional)','number')}{field(e,'start_date','Lease start (optional)','date')}{field(e,'end_date','Fixed-term end (optional)','date')}
 </div>
 {(commonBuilding||e.form.property_id)&&<p>{e.form.address}</p>}
 <label style={{...label,display:'block',marginTop:12}}>Current tenancy<select style={{...input,width:'100%',marginTop:5}} value={e.form.lifecycle_state} onChange={event=>change(e.id,'lifecycle_state',event.target.value)}><option value="needs_review">Keep as needs review</option><option value="active_fixed">Active fixed term</option><option value="month_to_month">Continuing month-to-month</option><option value="future">Starts in the future</option></select></label>
 <details style={{marginTop:14}}><summary>Contact details, rent schedule and source excerpts</summary><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,220px),1fr))',gap:12,marginTop:12}}>{field(e,'email','Email (optional)','email')}{field(e,'phone','Phone (optional)','tel')}{field(e,'timezone','Property time zone')}</div>
 <label style={{display:'block',margin:'12px 0'}}><input type="checkbox" checked={e.form.defer_schedule} onChange={event=>change(e.id,'defer_schedule',event.target.checked)}/>Set up rent charges later</label>
 {!e.form.defer_schedule&&<>{field(e,'first_due','First full rent due date','date')}<label style={label}>Frequency<select style={input} value={e.form.frequency} onChange={event=>change(e.id,'frequency',event.target.value)}><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="bi-weekly">Every two weeks</option></select></label>{field(e,'horizon','Charges to create (1–12)','number')}<p>No automatic proration or historical paid balances.</p></>}
 {Object.entries(e.fields).filter(([,f])=>f.quote||f.status==='conflict').map(([key,f])=><p key={key} style={{fontSize:12}}><strong>{key.replaceAll('_',' ')} ({f.status})</strong>: {f.quote || 'Conflicting terms need review.'}{f.suggested_page?` · Suggested page ${f.suggested_page} (unverified)`:''}</p>)}
 </details>
 <label style={{display:'block',marginTop:16}}><input type="checkbox" checked={e.current} onChange={event=>patch(e.id,{current:event.target.checked})}/>I reviewed these details and the current tenancy state, including any changes since this lease.</label>
 </>}
 </article>)}
 </fieldset>
 <p style={{fontSize:12}}>Saving adds the reviewed records only. Tenant invitations, messages and online payments are separate.</p>
 <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>{reviewing?<><button style={btn.ghost} disabled={busy} onClick={()=>setReviewing(false)}>Edit details</button><button style={btn.primary} disabled={busy} onClick={commit}>{busy?'Saving…':`Confirm and save ${entries.length} rental${entries.length===1?'':'s'}`}</button></>:<><button style={btn.primary} disabled={!ready||busy||!entries.length} onClick={review}>Review {entries.length===1?'rental':`${entries.length} rentals`}</button>{!preselectedUnit&&<button style={btn.ghost} disabled={!ready||busy||entries.length>=10} onClick={()=>setEntries(old=>[...old,newEntry(commonBuilding?{building_address:commonBuilding,address:commonBuilding}:{})])}>Add unit manually</button>}</>}</div>
 </>}
 </section></div>;
}
