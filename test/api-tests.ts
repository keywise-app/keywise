// Keywise API test suite
// Run with: node --experimental-strip-types test/api-tests.ts

const BASE = 'https://keywise.app';

const RESET  = '\x1b[0m';
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';
const CYAN   = '\x1b[36m';

interface TestResult {
  name: string;
  pass: boolean;
  ms: number;
  status: number;
  preview: string;
  reason?: string;
}

function preview(body: unknown, maxLen = 120): string {
  const s = typeof body === 'string' ? body : JSON.stringify(body);
  return s.length > maxLen ? s.slice(0, maxLen) + '…' : s;
}

async function run(
  name: string,
  url: string,
  options: RequestInit,
  check: (status: number, body: unknown) => { pass: boolean; reason?: string },
): Promise<TestResult> {
  const t0 = Date.now();
  let status = 0;
  let body: unknown = null;
  try {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(15_000) });
    status = res.status;
    const text = await res.text();
    try { body = JSON.parse(text); } catch { body = text; }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { name, pass: false, ms: Date.now() - t0, status: 0, preview: '', reason: msg };
  }
  const ms = Date.now() - t0;
  const { pass, reason } = check(status, body);
  return { name, pass, ms, status, preview: preview(body), reason };
}

function printResult(r: TestResult) {
  const icon  = r.pass ? `${GREEN}✓ PASS${RESET}` : `${RED}✗ FAIL${RESET}`;
  const time  = `${DIM}${r.ms}ms${RESET}`;
  const stat  = r.status ? `HTTP ${r.status}` : 'no response';
  console.log(`  ${icon}  ${BOLD}${r.name}${RESET}  ${time}  ${DIM}(${stat})${RESET}`);
  if (!r.pass && r.reason) console.log(`         ${RED}↳ ${r.reason}${RESET}`);
  console.log(`         ${DIM}${r.preview}${RESET}`);
}

// ── TESTS ─────────────────────────────────────────────────────────────────────

const tests: Promise<TestResult>[] = [

  run(
    'GET /api/test-email',
    `${BASE}/api/test-email`,
    { method: 'GET' },
    (status, body) => {
      const b = body as Record<string, unknown>;
      if (status !== 200) return { pass: false, reason: `Expected 200, got ${status}` };
      if (!b?.success)    return { pass: false, reason: `Expected { success: true }, got: ${JSON.stringify(b)}` };
      return { pass: true };
    },
  ),

  run(
    'GET /api/debug-env',
    `${BASE}/api/debug-env`,
    { method: 'GET' },
    (status, body) => {
      const b = body as Record<string, unknown>;
      if (status !== 200) return { pass: false, reason: `Expected 200, got ${status}` };
      const missing: string[] = [];
      if (!b?.STRIPE_SECRET_KEY_SET) missing.push('STRIPE_SECRET_KEY');
      if (!b?.STRIPE_PRO_PRICE_ID)   missing.push('STRIPE_PRO_PRICE_ID');
      if (missing.length > 0) return { pass: false, reason: `Missing env vars: ${missing.join(', ')}` };
      return { pass: true };
    },
  ),

  run(
    'GET /api/address-search?q=123+Main+St',
    `${BASE}/api/address-search?q=123+Main+St`,
    { method: 'GET' },
    (status, body) => {
      const b = body as Record<string, unknown>;
      if (status !== 200)           return { pass: false, reason: `Expected 200, got ${status}` };
      if (!Array.isArray(b?.suggestions)) return { pass: false, reason: 'Expected { suggestions: [] }' };
      return { pass: true };
    },
  ),

  run(
    'POST /api/claude { prompt: "Say hello" }',
    `${BASE}/api/claude`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Say hello in exactly three words.' }),
    },
    (status, body) => {
      const b = body as Record<string, unknown>;
      if (status !== 200)         return { pass: false, reason: `Expected 200, got ${status}` };
      if (typeof b?.result !== 'string' || b.result.length === 0)
        return { pass: false, reason: 'Expected non-empty { result: string }' };
      if ((b.result as string).startsWith('Error:') || (b.result as string).startsWith('API Error:'))
        return { pass: false, reason: `Claude returned an error: ${b.result}` };
      return { pass: true };
    },
  ),

  run(
    'POST /api/contact',
    `${BASE}/api/contact`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Runner', email: 'test@example.com', message: 'Automated API test — ignore.' }),
    },
    (status, body) => {
      const b = body as Record<string, unknown>;
      if (status !== 200) return { pass: false, reason: `Expected 200, got ${status}` };
      if (!b?.success)    return { pass: false, reason: `Expected { success: true }, got: ${JSON.stringify(b)}` };
      return { pass: true };
    },
  ),

];

// ── RUN ALL ───────────────────────────────────────────────────────────────────

console.log(`\n${BOLD}${CYAN}Keywise API Tests${RESET}  ${DIM}→ ${BASE}${RESET}\n`);

const results = await Promise.all(tests);

for (const r of results) printResult(r);

const passed = results.filter(r => r.pass).length;
const failed = results.length - passed;
const totalMs = results.reduce((s, r) => s + r.ms, 0);

console.log(`\n${BOLD}Results: ${passed === results.length ? GREEN : RED}${passed}/${results.length} passed${RESET}  ${DIM}(${totalMs}ms total)${RESET}\n`);

if (failed > 0) process.exit(1);
