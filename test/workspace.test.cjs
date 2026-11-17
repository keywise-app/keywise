const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { belongsToUnit, rentSummary, localDate, leaseIsReadOnly } = require(join(process.env.WORKSPACE_TEST_BUILD,'lib/workspace/records.js'));
const { canAccessLease, requireLease, workspaceAccess, apiError } = require(join(process.env.WORKSPACE_TEST_BUILD,'lib/workspace/access.js'));

test('record IDs take precedence over stale addresses', () => {
 const unit = {id:'unit-a',address:'10 Test St, Unit A'};
 assert.equal(belongsToUnit({property_id:'unit-b',property:unit.address},unit),false);
 assert.equal(belongsToUnit({property_id:'unit-a',property:'Old address'},unit),true);
});
test('legacy addresses cannot mix units or buildings with the same unit label', () => {
 const unit = {id:'a',address:'10 Test St, Unit A'};
 assert.equal(belongsToUnit({property:' 10 TEST St,  Unit A '},unit),true);
 for (const address of ['10 Test St','10 Test St, Unit B','100 Test St, Unit A','20 Test St, Unit A','']) assert.equal(belongsToUnit({property:address},unit),false);
});
test('rent totals reconcile paid, overdue, future and in-flight charges using cents', () => {
 const result = rentSummary([
  {id:'paid',amount:'100.10',status:'paid',due_date:'2026-11-01'},
  {id:'late',amount:200.20,status:'pending',due_date:'2026-11-01'},
  {id:'today',amount:300.30,status:'pending',due_date:'2026-11-16'},
  {id:'in-flight',amount:400.40,status:'processing',due_date:'2026-11-01'},
  {id:'future',amount:50,status:'pending',due_date:'2026-12-01'},
 ],'2026-11-16');
 assert.deepEqual(result,{scheduled:1051,paid:100.1,overdue:200.2,upcoming:350.3,processing:400.4,outstanding:950.9});
});
test('voided, refunded and invalid amounts cannot inflate balances', () => {
 const entries = ['void','voided','cancelled','canceled','refunded'].map((status,i) => ({id:String(i),status,amount:100}));
 entries.push({id:'invalid',amount:'NaN'},{id:'negative',amount:-100});
 assert.equal(rentSummary(entries).outstanding,0);
});
test('overdue status alone cannot make a future charge overdue', () => {
 assert.equal(rentSummary([{id:'1',amount:100,status:'overdue',due_date:'2026-12-01'}],'2026-11-16').overdue,0);
});
test('date keys preserve the local calendar day', () => {
 assert.equal(localDate(new Date(2026,10,16,23,59)),'2026-11-16');
});
test('only the verified landlord or explicitly linked tenant can access a lease', () => {
 const lease = {user_id:'owner',tenant_user_id:'tenant'};
 assert.equal(canAccessLease({id:'owner'},lease),true);
 assert.equal(canAccessLease({id:'tenant'},lease),true);
 assert.equal(canAccessLease({id:'stranger'},lease),false);
 assert.equal(canAccessLease({id:'tenant'},{user_id:'owner'}),false);
});
test('lease lookup rejects another account and distinguishes database errors', async () => {
 const mock = result => ({from:(table) => {const chain={select:()=>chain,eq:()=>chain,maybeSingle:async()=>table==='workspace_tenancy_members'?{data:null}:result};return chain;}});
 await assert.rejects(requireLease(mock({data:{user_id:'other'}}),{id:'tenant'},'lease'),e => e.status === 404);
 await assert.rejects(requireLease(mock({error:new Error('offline')}),{id:'tenant'},'lease'),e => e.status === 500);
 const lease = {user_id:'owner',tenant_user_id:'tenant'};
 assert.deepEqual(await requireLease(mock({data:lease}),{id:'tenant'},'lease'),lease);
});
test('unauthenticated workspace requests fail before any privileged database access', async () => {
 await assert.rejects(workspaceAccess(new Request('https://example.test/api/maintenance')),e => e.status === 401);
});
test('API errors preserve actionable messages without revealing internal errors', async () => {
 const denied = await apiError(new Response('Lease not found.',{status:404}));
 assert.equal(denied.status,404);
 assert.deepEqual(await denied.json(),{error:'Lease not found.'});
});

test('lease remains editable on its final calendar day and archived leases are read only', () => {
 assert.equal(leaseIsReadOnly({end_date:'2026-11-16'},'2026-11-16'),false);
 assert.equal(leaseIsReadOnly({end_date:'2026-11-15'},'2026-11-16'),false);
 assert.equal(leaseIsReadOnly({archived:true},'2026-11-16'),true);
 assert.equal(leaseIsReadOnly({},'2026-11-16'),false);
});

const { tenancyState } = require(join(process.env.WORKSPACE_TEST_BUILD,'lib/workspace/records.js'));
const { paymentSchedule, importPlan, civilDate } = require(join(process.env.WORKSPACE_TEST_BUILD,'lib/workspace/imports.js'));
const { legacyAmountCents, intentMatches } = require(join(process.env.WORKSPACE_TEST_BUILD,'lib/workspace/payments.js'));
const { normalizeExtraction } = require(join(process.env.WORKSPACE_TEST_BUILD,'lib/workspace/extraction.js'));
test('continued month-to-month is active after the original fixed term',()=>{
 assert.equal(tenancyState({lifecycle_state:'month_to_month',end_date:'2026-01-01'},'2026-11-16'),'month_to_month');
 assert.equal(leaseIsReadOnly({lifecycle_state:'month_to_month',end_date:'2026-01-01'},'2026-11-16'),false);
 assert.equal(tenancyState({end_date:'2026-01-01'},'2026-11-16'),'needs_review');
 assert.equal(leaseIsReadOnly({lifecycle_state:'ended'},'2026-11-16'),true);
 assert.equal(leaseIsReadOnly({start_date:'2026-12-01'},'2026-11-16'),true);
});
test('partial rent excludes deposits and pending attempts from confirmed receipts',()=>{
 const p={id:'rent',amount:2000,status:'pending',received_cents:75000,due_date:'2026-11-01',type:'rent'};
 let totals=rentSummary([p,{id:'deposit',type:'security_deposit',amount:2000,status:'paid'}],'2026-11-16');
 assert.equal(totals.outstanding,1250);assert.equal(totals.paid,750);
 totals=rentSummary([{...p,status:'processing'}],'2026-11-16');assert.equal(totals.outstanding,1250);
 totals=rentSummary([{...p,received_cents:105000}],'2026-11-16');assert.equal(totals.outstanding,950);
 totals=rentSummary([{...p,received_cents:75000}],'2026-11-16');assert.equal(totals.outstanding,1250);
 totals=rentSummary([{...p,received_cents:0}],'2026-11-16');assert.equal(totals.outstanding,2000);
});
test('monthly due dates clamp at month end without drifting through leap years',()=>{
 assert.deepEqual(paymentSchedule('2028-01-31','monthly',3,200000).map(p=>p.due_date),['2028-01-31','2028-02-29','2028-03-31']);
 assert.deepEqual(paymentSchedule('2027-01-31','monthly',3,200000,'2027-02-28').map(p=>p.due_date),['2027-01-31','2027-02-28']);
 assert.deepEqual(paymentSchedule('2026-10-31','weekly',3,100).map(p=>p.due_date),['2026-10-31','2026-11-07','2026-11-14']);
 assert.deepEqual(paymentSchedule('2026-10-31','bi-weekly',2,100).map(p=>p.due_date),['2026-10-31','2026-11-14']);
 assert.throws(()=>civilDate('2026-02-30'));assert.throws(()=>paymentSchedule('2026-11-01','daily',3,100));
 assert.throws(()=>paymentSchedule('2026-11-01','monthly',13,100));
});
test('import requires explicit tenancy and schedule approval, with optional contact details',()=>{
 const form={tenant_name:'Sample Tenant',address:'10 Example Ct, Unit A',rent:'2000',deposit:'19.99',lifecycle_state:'month_to_month',timezone:'America/Los_Angeles',defer_schedule:true};
 const a=importPlan({form});assert.deepEqual(a.plan.schedule,[]);assert.equal(a.plan.email,null);assert.equal(a.plan.deposit_cents,1999);
 assert.equal(importPlan({form}).digest,a.digest);assert.notEqual(importPlan({form:{...form,rent:'2100'}}).digest,a.digest);
 assert.throws(()=>importPlan({form:{...form,lifecycle_state:''}}));assert.throws(()=>importPlan({form:{...form,timezone:''}}));
 assert.throws(()=>importPlan({form:{...form,defer_schedule:false,first_due:''}}));
});
test('extraction preserves unknowns and conflicts without invented confidence or defaults',()=>{
 const data=normalizeExtraction({rent:{value:2000,status:'found',quote:'Rent $2000',page:2},payment_day:null,start_date:{value:'2026-02-30'},end_date:{value:'nonsense'},property:{value:'Unit A',status:'conflict',quote:'Unit A / Unit B'}},3);
 assert.equal(data.rent,2000);assert.equal(data.fields.rent.status,'needs_review');assert.equal(data.fields.rent.verified,false);
 assert.equal(data.payment_day,'');assert.equal(data.payment_frequency,'');assert.equal(data.start_date,'');assert.equal(data.end_date,'');
 assert.equal(data.property,'');assert.equal(data.fields.property.status,'conflict');
 assert.equal(normalizeExtraction({rent:{value:1,page:99}},2).fields.rent.suggested_page,null);
 assert.throws(()=>normalizeExtraction([]));
});
test('money adapter rejects ambiguous units and provider identity requires exact matching',()=>{
 assert.equal(legacyAmountCents('2000.01'),200001);
 for(const value of [null,-1,'2e3','1.001','NaN'])assert.throws(()=>legacyAmountCents(value));
 const a={id:'a',payment_id:'p',user_id:'u',amount_cents:200000,currency:'usd',destination:'acct_a'};
 const i={id:'pi_a',amount:200000,currency:'usd',transfer_data:{destination:'acct_a'},metadata:{workspace_attempt_id:'a',payment_id:'p',owner_id:'u'}};
 assert.equal(intentMatches(a,i),true);
 for(const patch of [{amount:200001},{currency:'eur'},{transfer_data:{destination:'acct_b'}},{metadata:{...i.metadata,owner_id:'other'}}])assert.equal(intentMatches(a,{...i,...patch}),false);
});

test('membership revocation overrides a legacy linked tenant and former occupants cannot mutate',async()=>{
 const lease={id:'lease',user_id:'owner',tenant_user_id:'tenant'};
 const mock=member=>({from:table=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:table==='leases'?lease:member})};return q;}});
 await assert.rejects(requireLease(mock({role:'primary',status:'revoked'}),{id:'tenant'},'lease'),e=>e.status===404);
 assert.equal((await requireLease(mock({role:'occupant',status:'active'}),{id:'occupant'},'lease','write')).id,'lease');
 assert.equal((await requireLease(mock({role:'former',status:'active'}),{id:'former'},'lease','read')).id,'lease');
 await assert.rejects(requireLease(mock({role:'former',status:'active'}),{id:'former'},'lease','write'),e=>e.status===404);
 await assert.rejects(requireLease(mock({role:'cosigner',status:'active'}),{id:'cosigner'},'lease','read'),e=>e.status===404);
});
