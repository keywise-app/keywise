const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { belongsToUnit, rentSummary, localDate, leaseIsReadOnly } = require(join(process.env.WORKSPACE_TEST_BUILD,'records.js'));
const { canAccessLease, requireLease, workspaceAccess, apiError } = require(join(process.env.WORKSPACE_TEST_BUILD,'access.js'));

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
 const mock = result => ({from:() => ({select:() => ({eq:() => ({maybeSingle:async () => result})})})});
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
 assert.equal(leaseIsReadOnly({end_date:'2026-11-15'},'2026-11-16'),true);
 assert.equal(leaseIsReadOnly({archived:true},'2026-11-16'),true);
 assert.equal(leaseIsReadOnly({},'2026-11-16'),false);
});
