'use client';
import {useEffect,useState} from 'react';
import {workspaceApi} from '../../lib/workspace-api';
import {input,btn} from '../../lib/theme';
export default function TenancyAccess({leaseId}:{leaseId:string}){
 const [members,setMembers]=useState<any[]>([]),[email,setEmail]=useState(''),[role,setRole]=useState('occupant'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const load=async()=>{try{const result=await workspaceApi(`/api/workspace/members?lease_id=${encodeURIComponent(leaseId)}`);setMembers(result.members);}catch(e:any){setError(e.message);}};
 useEffect(()=>{void load();},[leaseId]);
 const save=async(values:any)=>{setBusy(true);setError('');try{await workspaceApi('/api/workspace/members',{method:'POST',body:JSON.stringify({lease_id:leaseId,...values})});setEmail('');await load();}catch(e:any){setError(e.message);}finally{setBusy(false);}};
 return <details style={{margin:'12px 0'}}><summary>Manage linked occupant access</summary><p style={{fontSize:12}}>Add an existing account by email. Occupants can use shared tenancy records and repairs. Former occupants keep read-only history. Revoking access blocks these workspace APIs; previously downloaded files and unexpired links cannot be recalled. Co-signer access remains blocked until documents are separately shared.</p>
 {members.map(m=><div key={m.user_id} style={{marginBottom:8}}>{m.account?.email || m.account?.full_name || 'Linked account'} · {m.role} · {m.status}<button style={btn.ghost} disabled={busy} onClick={()=>save({user_id:m.user_id,role:m.role,status:m.status==='active'?'revoked':'active'})}>{m.status==='active'?'Revoke access':'Restore access'}</button></div>)}
 <label>Account email<input type="email" style={input} value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Role<select style={input} value={role} onChange={e=>setRole(e.target.value)}><option value="occupant">Current occupant</option><option value="former">Former occupant — history only</option><option value="cosigner">Co-signer — access blocked pending sharing</option></select></label><button style={btn.ghost} disabled={busy||!email.trim()} onClick={()=>save({email,role,status:'active'})}>Link reviewed account</button>{error&&<p role="alert">{error}</p>}
 </details>;
}
