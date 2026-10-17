# Competitive intelligence repair (October 17, 2026)

## Confirmed mechanism

The old code ignored HTTP errors and defaulted a missing final text block to `{}`. That parsed successfully, supplied an undefined summary to Supabase, and rendered “No summary available.” Parse exceptions also became synthetic successful reports. Database insert and Resend errors were ignored. The cron runs at 11:00 UTC daily; this patch does not change the schedule, credentials, recipient, model, Supabase schema, or build-queue integration.

## Upstream cause remains unconfirmed

Vercel runtime logs for project `prj_vs4iLPVjzoSxPwBrPYAZ2CMZBBNT`, team `team_m3V2axYiW9aL4eW8dLJcAftD`, October 15–17 returned HTTP 403. There is no installed Vercel CLI fallback. This is denied access, not evidence of missing logs. Authentication/billing/rate-limit errors, search failures, pause_turn, and truncation are hypotheses, not findings about those runs.

Anthropic documents `pause_turn` continuation and search errors inside HTTP 200 responses: https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool . The patch preserves paused assistant content, rejects incomplete stops and tool failures, and increases output allowance from 1500 to 4096 tokens. Retries are limited to three requests, 30 seconds per request, within an 85-second generation budget. Retry-After is honored; if it exceeds the budget, the run fails rather than retrying early. Permanent HTTP failures fail immediately. No retries wrap persistence/queue/delivery.

## Validation (no credentials or external calls)

```sh
npm ci --ignore-scripts --no-audit --no-fund
node --test test/intelligence/pipeline.test.cjs
npx tsc --noEmit --pretty false
```

Mocks cover invalid/missing summaries, empty findings, malformed arrays/items, missing text/content, 401, 429, non-JSON 503, network failure, paused continuation, token truncation, search errors, Retry-After, no downstream effects on generation failure, no email after DB failure, delivery failures, normal pipeline integration, and HTML escaping. The test harness transpiles real TypeScript with the repository's TypeScript dependency and replaces external integrations. It does not exercise live providers.

## Deployment and follow-up

This review branch disables Vercel automatic deployment for its exact branch name via `git.deploymentEnabled`. Other branches keep their existing behavior. No production endpoint was invoked. Do not merge or deploy without approval.

After approval, use a nonproduction environment with isolated Supabase data, a sandbox recipient and provider keys to verify a live researched report. Then review the next scheduled production run: provider HTTP status, request ID, stop_reason, valid persisted report ID, Resend acceptance, and actual email content. Retrieve the original October 15–17 logs if retained; inspect provider status/error type, stop reason and search blocks to establish the original cause. Do not replay the production cron just to diagnose it.

Failures return non-success and emit diagnostic metadata rather than emailing an empty report. A valid report can remain stored if later delivery fails. Resend idempotency is scoped to that report ID; separate manual/cron invocations are not deduplicated across reports. This patch does not introduce a persistent delivery-outbox or automatically resend old reports. Existing bad rows are left untouched. Ensure runtime-error alerts cover this cron so failed runs receive attention.
