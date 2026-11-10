// Requires a fresh local PostgreSQL cluster. See docs/competitive-intelligence-repair.md.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const { load } = require('./load.cjs');
const port = Number(process.env.INTELLIGENCE_TEST_PGPORT);
if (!port) {
  test('delivery integration (set INTELLIGENCE_TEST_PGPORT on a disposable local cluster)', { skip: true }, () => {});
} else {
  const { Pool } = require('pg');
  const config = { host: '127.0.0.1', port, user: process.env.PGUSER || 'postgres' };
  const admin = new Pool({ ...config, database: 'postgres' });
  const dbName = 'intelligence_test_' + process.pid;
  const db = new Pool({ ...config, database: dbName });
  const sql = (query, args) => db.query(query, args);
  const migration = name => fs.readFileSync('supabase/migrations/' + name, 'utf8');
  const day = '2026-11-10';
  const first = day + 'T23:59:58Z';
  const tomorrow = '2026-11-11T00:00:01Z';
  const helper = load('lib/intelligence/generate.ts');
  const sample = { summary: 'A verified competitive update with a specific operational implication.', urgent: [],
    opportunities: [{ title: 'Improve setup', description: 'Reduce setup effort', source: 'research' }],
    trends: [], competitor_updates: [] };

  before(async () => {
    await admin.query('create database ' + dbName);
    for (const role of ['anon', 'authenticated', 'service_role']) {
      await admin.query(`do $$ begin create role ${role}; exception when duplicate_object then null; end $$`);
    }
    const reports = migration('20260822000000_dashboard_schema_fixes.sql').match(/create table if not exists intelligence_reports \([\s\S]*?\n\);/i)[0];
    await sql(reports);
    await sql(migration('20260522170000_build_queue.sql').split('alter table build_queue')[0]);
    await sql(migration('20261110000000_daily_intelligence_delivery.sql'));
  });
  after(async () => {
    await db.end();
    await admin.query('drop database if exists ' + dbName);
    await admin.end();
  });
  beforeEach(() => sql('truncate daily_intelligence_deliveries, intelligence_reports, build_queue'));
  const adapter = { rpc: async (_, a) => {
    const result = await sql('select daily_intelligence_step($1,$2,$3,$4,$5) as data',
      [a.p_day,a.p_recipient,a.p_token,a.p_step,a.p_args]);
    return result.rows[0];
  }};
  const ledger = async () => (await sql('select * from daily_intelligence_deliveries')).rows[0];
  function fixture(options = {}) {
    const calls = [], accepted = new Map();
    let generations = 0;
    let now = first;
    const env = { VERCEL_ENV: 'production', VERCEL_PROJECT_ID: 'owner', INTELLIGENCE_OWNER_PROJECT_ID: 'owner', RESEND_API_KEY: 'test' };
    const daily = load('lib/intelligence/daily.ts', {
      '@/lib/intelligence/generate': { ...helper, generateIntelligence: async () => {
        generations++;
        if (options.generate) await options.generate();
        return sample;
      } },
      '@/agent-tools/pipeline/propose': { computeDedupeHash: (t,c) => createHash('sha256').update(t.toLowerCase()+'|'+c).digest('hex') },
      resend: { Resend: class { emails = { send: async (payload,{idempotencyKey: key}) => {
        calls.push({payload,key});
        if (options.reject) return {error:{name:'invalid_api_key'}};
        accepted.set(key,'email-' + key);
        if (options.timeout) throw new Error('timeout');
        return {data:{id:accepted.get(key)}};
      }}; } },
    }, { process: { env }, Date: class extends Date { constructor(...args) { super(...(args.length ? args : [now])); } } });
    return { calls, accepted, env, setClock: value => now = value, generations: () => generations,
      run: (trigger = 'cron', requestedDay) => daily.runIntelligence(options.db || adapter, trigger, requestedDay) };
  }

  test('concurrent cron and admin claims use independent SQL connections and commit exactly once', async () => {
    let resume, started;
    const waiting = new Promise(r => started = r);
    const pause = new Promise(r => resume = r);
    const f = fixture({ generate: async () => { started(); await pause; } });
    const firstRun = f.run();
    await waiting;
    const others = await Promise.all(['admin-get','admin-post','cron'].map(trigger => f.run(trigger)));
    assert.ok(others.every(r => r.state === 'busy'));
    resume();
    const {report_id} = await firstRun;
    assert.equal((await f.run()).report_id, report_id);
    assert.equal(f.generations(),1);
    assert.equal(f.calls.length,1);
    const counts = await sql('select (select count(*) from intelligence_reports) reports, (select count(*) from build_queue) proposals');
    assert.deepEqual(counts.rows[0],{reports:'1',proposals:'1'});
  });

  test('two sessions racing to create a previously absent day have one winner', async () => {
    const left = await db.connect();
    const right = await db.connect();
    const claim = "select daily_intelligence_step($1,'race',gen_random_uuid(),'claim') as d";
    try {
      await left.query('begin');
      assert.equal((await left.query(claim,[day])).rows[0].d.state,'claimed');
      const pending = right.query(claim,[day]);
      // Wait for the losing session to actually block on the uncommitted insert.
      const deadline = Date.now() + 5000;
      while (true) {
        const activity = await sql("select wait_event_type from pg_stat_activity where pid=$1",[right.processID]);
        if (activity.rows[0]?.wait_event_type === 'Lock') break;
        assert.ok(Date.now() < deadline,'second claim should wait for the first transaction');
        await new Promise(resolve => setTimeout(resolve,10));
      }
      await left.query('commit');
      assert.equal((await pending).rows[0].d.state,'busy');
    } finally {
      await left.query('rollback');
      left.release();
      right.release();
    }
  });

  test('timeout after acceptance replays byte-equivalent payload and key across UTC midnight', async () => {
    const options = { timeout: true };
    const f = fixture(options);
    await assert.rejects(f.run(),/timeout/);
    options.timeout = false;
    f.setClock(tomorrow);
    assert.equal((await f.run('admin-post',day)).state,'accepted');
    assert.equal(f.calls.length,3);
    assert.equal(f.accepted.size,1);
    assert.equal(f.generations(),1);
    assert.ok(f.calls.every(call => JSON.stringify(call) === JSON.stringify(f.calls[0])));
    assert.match(f.calls[0].payload.subject,/November 10/);
    assert.equal((await f.run()).state,'accepted');
    assert.equal(f.accepted.size,2);
  });

  test('lost database acceptance write resumes with same provider identity', async () => {
    const options = {db:{rpc: async (name,args) => args.p_step === 'accepted'
      ? {error:{code:'unavailable'}} : adapter.rpc(name,args)}};
    const f = fixture(options);
    await assert.rejects(f.run(),/accepted_failed/);
    delete options.db;
    assert.equal((await f.run()).state,'accepted');
    assert.equal(f.accepted.size,1);
    assert.equal(f.generations(),1);
  });

  test('confirmed rejection can recover after correction, unknown acceptance expires into review', async () => {
    const options = {reject:true};
    const f = fixture(options);
    await assert.rejects(f.run(),/invalid_api_key/);
    assert.equal((await ledger()).first_attempt_at,null);
    options.reject = false;
    options.timeout = true;
    await assert.rejects(f.run(),/timeout/);
    options.reject = true;
    await assert.rejects(f.run(),/invalid_api_key/);
    assert.ok((await ledger()).first_attempt_at);
    await sql("update daily_intelligence_deliveries set first_attempt_at=now()-interval '24 hours'");
    const attempts = f.calls.length;
    await assert.rejects(f.run(),/reconciliation/);
    assert.equal(f.calls.length,attempts);
  });

  test('expired worker cannot write after lease takeover', async () => {
    const token = '00000000-0000-4000-8000-000000000001';
    const step = (id,op) => adapter.rpc('',{p_day:day,p_recipient:'test',p_token:id,p_step:op,p_args:{}});
    await step(token,'claim');
    await sql("update daily_intelligence_deliveries set lease_until=now()-interval '1 second'");
    assert.equal((await step(token.replace(/1$/,'2'),'claim')).data.state,'claimed');
    await assert.rejects(step(token,'release'),/lease_lost/);
  });

  test('queue failure rolls back report and permits another attempt', async () => {
    const f = fixture();
    await sql("alter table build_queue add constraint inject_failure check (title <> 'Improve setup')");
    try { await assert.rejects(f.run(),/inject_failure/); }
    finally { await sql('alter table build_queue drop constraint inject_failure'); }
    assert.equal((await ledger()).report_id,null);
    assert.equal((await sql('select count(*) from intelligence_reports')).rows[0].count,'0');
    assert.equal(f.calls.length,0);
    assert.equal((await f.run()).state,'accepted');
  });

  test('preview and second project skip even manual sends; old untracked day cannot be created', async () => {
    const f = fixture();
    f.env.VERCEL_ENV = 'preview';
    assert.equal((await f.run()).state,'disabled');
    f.env.VERCEL_ENV = 'production';
    f.env.VERCEL_PROJECT_ID = 'secondary';
    assert.equal((await f.run('admin-post')).state,'disabled');
    f.env.VERCEL_PROJECT_ID = 'owner';
    await assert.rejects(f.run('admin-post','2026-11-09'));
    assert.equal(await ledger(),undefined);
    assert.equal(f.calls.length,0);
  });
}
