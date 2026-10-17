const { test } = require('node:test');
process.env.RESEND_API_KEY = 'fake-test-key';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => imports[name] ?? require(name), console, process, fetch, AbortSignal, setTimeout, TypeError, Error });
  return exports;
}
const helper = load('lib/intelligence/generate.ts');
const valid = { summary: 'Competitor pricing and landlord feedback reveal a practical opportunity for Keywise.', urgent: [], opportunities: [{ title: 'Simplify onboarding', description: 'Reduce setup effort', source: 'https://example.com' }], trends: [], competitor_updates: [] };
const ok = (content = JSON.stringify(valid), stop_reason = 'end_turn') => new Response(JSON.stringify({ content: [{ type: 'text', text: content }], stop_reason }));
function generator(responses) {
  let calls = [];
  return { calls, run: () => helper.generateIntelligence('research', 'fake-key', { fetch: async (_, opts) => { calls.push(JSON.parse(opts.body)); const r = responses.shift(); if (r instanceof Error) throw r; return r; }, sleep: async () => {} }) };
}
for (const [name, value] of Object.entries({ empty: {}, placeholder: { ...valid, summary: 'No summary available' }, findings: { ...valid, opportunities: [] }, malformed: { ...valid, opportunities: [{}] }, array: { ...valid, trends: {} } })) {
  test(`reject ${name}`, () => assert.throws(() => helper.parseIntelligence(JSON.stringify(value))));
}
test('parse fenced valid report', () => assert.equal(helper.parseIntelligence('```json\n' + JSON.stringify(valid) + '\n```').summary, valid.summary));
test('401 fails without retry', async () => { const g = generator([new Response('{"error":{"type":"authentication_error"}}', { status: 401 })]); await assert.rejects(g.run(), /401/); assert.equal(g.calls.length, 1); });
test('429 retries then validates', async () => { const g = generator([new Response('{}', { status: 429 }), ok()]); await g.run(); assert.equal(g.calls.length, 2); });
test('invalid content exhausts three attempts', async () => { const g = generator([ok('{}'), ok('{}'), ok('{}')]); await assert.rejects(g.run(), /invalid_summary/); assert.equal(g.calls.length, 3); });
test('token truncation retries', async () => { const g = generator([ok('{}', 'max_tokens'), ok()]); await g.run(); assert.equal(g.calls.length, 2); });
test('paused search continues unchanged assistant blocks', async () => { const g = generator([ok('searching', 'pause_turn'), ok()]); await g.run(); assert.equal(g.calls[1].messages[1].role, 'assistant'); assert.equal(g.calls[1].messages[1].content[0].text, 'searching'); });
test('search errors fail closed even with valid text', async () => { const bad = () => new Response(JSON.stringify({stop_reason:'end_turn', content:[{type:'text',text:JSON.stringify(valid)},{type:'web_search_tool_result',content:{type:'web_search_tool_result_error',error_code:'unavailable'}}]})); const g = generator([bad(),bad(),bad()]); await assert.rejects(g.run(), /search_unavailable/); });
test('honors long Retry-After by failing rather than retrying too soon', async () => { const g = generator([new Response('{}', {status:429,headers:{'retry-after':'120'}})]); await assert.rejects(g.run(), /429/); assert.equal(g.calls.length,1); });
test('network error retries', async () => { const g = generator([new TypeError('network'), ok()]); await g.run(); assert.equal(g.calls.length, 2); });

function pipeline({ generationError, saveError, emailError } = {}) {
  const effects = [];
  const route = load('app/api/cron/competitive-intelligence/route.ts', {
    '@/lib/intelligence/generate': { ...helper, generateIntelligence: async () => { if (generationError) throw new Error('invalid'); return valid; } },
    'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
    '@supabase/supabase-js': { createClient: () => db },
    resend: { Resend: class { emails = { send: async () => { effects.push('email'); return { data: emailError ? null : {id:'email'}, error: emailError }; } }; } },
    '@/agent-tools/pipeline/propose': { proposeToQueue: async () => { effects.push('queue'); } },
  });
  const db = { from: () => ({ insert: () => { effects.push('save'); return {select: () => ({single: async () => ({data: saveError ? null : {id:'report'}, error:saveError})})}; } }) };
  return { effects, run: () => route.runIntelligence(db) };
}
test('invalid generation has zero database/queue/email effects', async () => { const p = pipeline({generationError:true}); await assert.rejects(p.run()); assert.equal(p.effects.length,0); });
test('database failure blocks queue and email', async () => { const p = pipeline({saveError:true}); await assert.rejects(p.run(), /save_failed/); assert.equal(p.effects.join(','),'save'); });
test('email failure is not success', async () => { const p = pipeline({emailError:true}); await assert.rejects(p.run(), /email_failed/); });
test('valid report preserves save, queue and email integrations', async () => { const p = pipeline(); const r = await p.run(); assert.equal(r.success,true); assert.equal(p.effects.join(','),'save,queue,email'); });
test('escape model text in HTML', () => assert.equal(helper.escapeHtml('<script>"&'), '&lt;script&gt;&quot;&amp;'));

test('missing content fails after bounded retries', async () => { const g = generator([new Response('{}'),new Response('{}'),new Response('{}')]); await assert.rejects(g.run(), /missing_content/); });
test('no text cannot become an empty successful report', async () => { const g = generator([ok(''),ok(''),ok('')]); await assert.rejects(g.run(), /invalid_json/); });
test('non-JSON gateway 503 retries', async () => { const g = generator([new Response('gateway unavailable', {status:503}),ok()]); await g.run(); assert.equal(g.calls.length,2); });
