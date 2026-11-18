'use client';
import {useState} from 'react';
import {workspaceApi} from '../../lib/workspace-api';
import {btn} from '../../lib/theme';
export default function HistoryExport({leaseId}:{leaseId:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[selection,setSelection]=useState(['rent','repairs','documents']);
 const run=async()=>{setBusy(true);setError('');try{const manifest=await workspaceApi(`/api/workspace/export?lease_id=${encodeURIComponent(leaseId)}&include=${selection.join(',')}`);const blob=new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='keywise-history.json';a.click();URL.revokeObjectURL(url);setError(manifest.missing.length?`${manifest.missing.length} originals were unavailable; see the missing list in the manifest.`:'');}catch(e:any){setError(e.message);}finally{setBusy(false);}};
 return <details style={{margin:'12px 0'}}><summary>Export selected history</summary><p style={{fontSize:12}}>Downloads a JSON manifest with selected records and original-file links valid for one minute. Private owner fields are filtered for tenant exports.</p><div style={{display:'flex',flexWrap:'wrap',gap:12}}>{['rent','repairs','documents'].map(key=><label key={key}><input type="checkbox" checked={selection.includes(key)} onChange={e=>setSelection(s=>e.target.checked?[...s,key]:s.filter(x=>x!==key))}/>{key}</label>)}</div><button style={btn.ghost} disabled={busy||!selection.length} onClick={run}>{busy?'Preparing…':'Download history manifest'}</button>{error&&<p role="status">{error}</p>}</details>;
}
