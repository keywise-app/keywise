import { createHash } from 'node:crypto';
import { legacyAmountCents } from './payments';
export function civilDate(value: unknown): string {
 if (typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Response('Enter a valid calendar date.',{status:400});
 const date=new Date(`${value}T00:00:00Z`);
 if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==value) throw new Response('Enter a valid calendar date.',{status:400});
 return value;
}
export function paymentSchedule(first: string, frequency: string, count: number, amount: number, end?:string) {
 civilDate(first);
 if (!['monthly','weekly','bi-weekly'].includes(frequency) || !Number.isInteger(count) || count<1 || count>12) throw new Response('Review the frequency and schedule horizon (1–12 payments).',{status:400});
 const start=new Date(`${first}T00:00:00Z`),day=start.getUTCDate();
 const dates=[];
 for(let i=0;i<count;i++) {
  let d:Date;
  if(frequency==='monthly') {
   d=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+i,1));
   const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
   d.setUTCDate(Math.min(day,last));
  } else d=new Date(start.getTime()+i*(frequency==='weekly'?7:14)*86400000);
  const date=d.toISOString().slice(0,10);
  if(end && date>end) break;
  dates.push({due_date:date,amount_cents:amount});
 }
 return dates;
}
export function importPlan(payload: any) {
 const f=payload?.form;
 if(!f || typeof f.tenant_name!=='string' || !f.tenant_name.trim() || f.tenant_name.length>200 || typeof f.address!=='string' || !f.address.trim() || f.address.length>500) throw new Response('Enter the tenant name and full property address.',{status:400});
 if(!['active_fixed','month_to_month','future','needs_review'].includes(f.lifecycle_state)) throw new Response('Confirm the current tenancy state.',{status:400});
 const rent=legacyAmountCents(f.rent);
 const deposit=f.deposit==='' || f.deposit==null ? null : Number(f.deposit);
 if(deposit!==null && (!Number.isFinite(deposit) || deposit<0 || !/^\d+(\.\d{1,2})?$/.test(String(f.deposit)))) throw new Response('Review the deposit amount.',{status:400});
 const start=f.start_date ? civilDate(f.start_date):null,end=f.end_date?civilDate(f.end_date):null;
 if(start && end && start>end) throw new Response('The lease end must follow its start date.',{status:400});
 try {new Intl.DateTimeFormat('en-US',{timeZone:f.timezone}).format();} catch {throw new Response('Select a valid property time zone.',{status:400});}
 if(!f.timezone) throw new Response('Confirm the property time zone.',{status:400});
 if(f.email && (typeof f.email!=='string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))) throw new Response('Review the optional email address.',{status:400});
 const schedule=f.defer_schedule===true?[]:paymentSchedule(civilDate(f.first_due),f.frequency,Number(f.horizon),rent,f.lifecycle_state==='active_fixed'?end || undefined:undefined);
 if(f.defer_schedule!==true && (!schedule.length || start && schedule[0].due_date<start)) throw new Response('Review the first payment date against the lease term.',{status:400});
 const buildingAddress=typeof f.building_address==='string'?f.building_address.trim():'';
 if(buildingAddress.length>500) throw new Response('Review the building address.',{status:400});
 const plan={building_address:buildingAddress || null,property_id:f.property_id || null,address:f.address.trim(),unit_number:String(f.unit_number || '').slice(0,50),tenant_name:f.tenant_name.trim(),email:f.email || null,phone:typeof f.phone==='string'?f.phone.slice(0,40):null,rent_cents:rent,deposit_cents:deposit===null?null:Math.round(deposit*100),start_date:start,end_date:end,lifecycle_state:f.lifecycle_state,timezone:f.timezone,schedule,source:payload.source || null,fields:payload.fields || {}};
 return {plan,digest:createHash('sha256').update(JSON.stringify(plan)).digest('hex')};
}
