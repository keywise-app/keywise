# Competitive intelligence repair (updated November 10, 2026)

## Confirmed mechanism

The old code ignored HTTP errors and defaulted a missing final text block to `{}`. That parsed successfully, supplied an undefined summary to Supabase, and rendered “No summary available.” Parse exceptions also became synthetic successful reports. Database insert and Resend errors were ignored. The cron runs at 11:00 UTC daily; the October work retained the schedule, recipient, and model.

## Upstream cause remains unconfirmed

Vercel runtime logs for project `prj_vs4iLPVjzoSxPwBrPYAZ2CMZBBNT`, team `team_m3V2axYiW9aL4eW8dLJcAftD`, October 15–17 returned HTTP 403. There is no installed Vercel CLI fallback. This is denied access, not evidence of missing logs. Authentication/billing/rate-limit errors, search failures, pause_turn, and truncation are hypotheses, not findings about those runs.

Anthropic documents `pause_turn` continuation and search errors inside HTTP 200 responses: https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool . The patch preserves paused assistant content, rejects incomplete stops and tool failures, and increases output allowance from 1500 to 4096 tokens. Retries are limited to three requests, 30 seconds per request, within an 85-second generation budget. Retry-After is honored; if it exceeds the budget, the run fails rather than retrying early. Permanent HTTP failures fail immediately. Generation retries finish before the report and outbound payload are persisted.

## Validation (no credentials or external calls)

```sh
npm ci --ignore-scripts --no-audit --no-fund
node --test test/intelligence/pipeline.test.cjs
npx tsc --noEmit --pretty false
```

Mocks cover invalid/missing summaries, empty findings, malformed arrays/items, missing text/content, 401, 429, non-JSON 503, network failure, paused continuation, token truncation, search errors, Retry-After, no downstream effects on generation failure, no email after DB failure, delivery failures, normal pipeline integration, and HTML escaping. The test harness transpiles real TypeScript with the repository's TypeScript dependency and replaces external integrations. It does not exercise live providers.

## November daily delivery repair

The cron GET, authenticated admin GET and admin POST share one sender. Only the production deployment whose Vercel project ID matches `INTELLIGENCE_OWNER_PROJECT_ID` can send. Use the service-role client. The dispatch table is keyed by UTC date and recipient. A three-minute lease exceeds the two-minute function limit, and all writes verify current ownership. The prepare transaction persists the validated report, frozen Resend request, and its queue proposals together. That transaction gives all items in a report a single commit boundary, including priority upgrades against active proposals. A send retry skips that entire transaction.

Each attempt records its start before contacting Resend. One short backoff permits an immediate replay of ambiguous errors with the same payload and daily key. A definite first rejection can clear its attempt marker. Any previous uncertainty survives subsequent rejection. An accepted provider ID closes the row permanently. After 23 hours of uncertainty, the sender requires reconciliation, leaving margin inside Resend's 24-hour window. See https://resend.com/docs/dashboard/emails/idempotency-keys . Acceptance records provider submission. Delivery and bounces belong to the provider.

### Local verification

Use a disposable loopback PostgreSQL cluster and the Node `pg` client (install in a temporary directory and add its node_modules to NODE_PATH). The integration test creates and drops a fresh database and creates three Supabase role names in that cluster. Run from repository root:

```sh
PGUSER=postgres INTELLIGENCE_TEST_PGPORT=55439 node --test test/intelligence/postgres.test.cjs
```

The suite exercises overlapping SQL transactions, concurrent entry-point claims, recovery, UTC rollover, stale leases, ambiguous delivery, atomic queue rollback, and owner selection. Generation and Resend are mocked.

### Production rollout requires separate approval

1. Inspect both Keywise and Propos deployment and request logs around 11:00–12:00 UTC on November 9–10. Match the caller, project, deployed revision and request IDs to Resend events. Two projects reported successful deployments for the same main commit. The source of the second send remains unconfirmed.
2. Confirm the designated owner project and that its Vercel system environment variables are exposed. Apply the migration to the owner's Supabase database. Stage the owner setting only on the verified project's production environment. Ensure all production senders use the new guard or have their schedule disabled before enabling the owner. An older deployment can bypass the ledger.
3. Activate on the first UTC day whose digest has not yet been sent. If cutting over on an already-mailed day, first reconcile it to a verified provider ID and seed its accepted delivery row, with the first-attempt time and the existing report linkage/payload if known. Historical report rows alone do not establish submission.
4. Inspect the next scheduled run for its claim, report ID, provider ID and actual delivered summary. On a retryable failure, rerun the same day using the authenticated admin POST. Its optional `reportDay` accepts an ISO UTC date. Past dates require an existing ledger row. A busy result means an active lease holds the work. The next daily cron processes the next day; it does not replay old mail.
5. For a reconciliation hold, match provider logs to the recipient, exact subject/date, request time and key. If accepted, persist the verified provider ID. Only after confirming no submission, clear the attempt marker and retry the frozen request. If the outcome remains uncertain, keep it on hold.

The review branch retains its existing Vercel automatic-deployment block.
