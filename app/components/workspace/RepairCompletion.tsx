'use client';
import {useState} from 'react';
import {workspaceApi} from '../../lib/workspace-api';
import {T,input,btn} from '../../lib/theme';
export default function RepairCompletion({issue,contractors,files,onChange}:{issue:any;contractors:any[];files:any[];onChange:()=>Promise<void>}){
 const [contractor,setContractor]=useState(issue.contractor_snapshot?.id || ''),[name,setName]=useState(''),[contact,setContact]=useState(''),[access,setAccess]=useState(issue.access_snapshot || ''),[estimate,setEstimate]=useState(issue.estimate_cents!=null?String(issue.estimate_cents/100):''),[actual,setActual]=useState(issue.actual_cents!=null?String(issue.actual_cents/100):''),[receipt,setReceipt]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const command=async(operation:string)=>{
  setBusy(true);setError('');
  try{
   let contractorId=contractor;
   if(operation==='assign' && !contractorId){const result=await workspaceApi('/api/workspace/contractors',{method:'POST',body:JSON.stringify({id:crypto.randomUUID(),name,contact})});contractorId=result.contractor.id;setContractor(contractorId);}
   await workspaceApi('/api/maintenance',{method:'POST',body:JSON.stringify({id:issue.id,revision:issue.workflow_revision,operation,contractor_id:contractorId,access_notes:access,estimate_cents:estimate===''?null:Math.round(Number(estimate)*100),actual_cents:actual===''?null:Math.round(Number(actual)*100),receipt_id:receipt || null})});
   await onChange();
  }catch(e:any){setError(e.message);}finally{setBusy(false);}
 };
 return <section aria-label="Private contractor and completion records" style={{background:T.bg,padding:14,borderRadius:10,marginTop:14}}>
  <h4 style={{marginTop:0}}>Contractor and completion · private to you</h4>
  {issue.contractor_snapshot&&<p>Assigned: {issue.contractor_snapshot.name}. Assignment stores a snapshot; no contractor message has been sent.</p>}
  <fieldset disabled={busy} style={{border:0,padding:0,minWidth:0}}>
  <label>Saved contractor<select style={input} value={contractor} onChange={e=>setContractor(e.target.value)}><option value="">Add a contractor</option>{contractors.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
  {!contractor&&<><label>Name<input style={input} value={name} onChange={e=>setName(e.target.value)}/></label><label>Contact (optional)<input style={input} value={contact} onChange={e=>setContact(e.target.value)}/></label></>}
  <label>Private access instructions<textarea style={input} maxLength={2000} value={access} onChange={e=>setAccess(e.target.value)}/></label>
  <label>Estimate to approve ($)<input type="number" step="0.01" min="0" style={input} value={estimate} onChange={e=>setEstimate(e.target.value)}/></label>
  <button style={btn.ghost} disabled={busy || estimate==='' || (!contractor&&!name.trim())} onClick={()=>command('assign')}>Approve estimate and assign</button>
  <hr/>
  <label>Actual invoice cost ($)<input type="number" step="0.01" min="0" style={input} value={actual} onChange={e=>setActual(e.target.value)}/></label>
  <label>Supporting receipt<select style={input} value={receipt} onChange={e=>setReceipt(e.target.value)}><option value="">Select an attached receipt</option>{files.filter(f=>f.type==='receipt').map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
  <p style={{fontSize:12}}>Completion records one repair expense. Reopening keeps that expense and all history. Tax deductibility remains unconfirmed.</p>
  <div style={{display:'flex',flexWrap:'wrap',gap:10}}><button style={btn.primary} disabled={busy||actual===''||(Number(actual)>0&&!receipt)} onClick={()=>command('close')}>Approve actual cost and close</button>{issue.status==='resolved'&&<button style={btn.ghost} disabled={busy} onClick={()=>command('reopen')}>Reopen repair</button>}</div>
  </fieldset>
  {error&&<p role="alert">{error}</p>}
 </section>;
}
