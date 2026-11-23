# Keywise landlord workflow implementation

## Implemented source scope

The branch combines independent-landlord branding, connected property records, an attention queue and dated tasks with the following workflow changes:

- Authenticated tenant and owner APIs derive payment/customer/destination and message-recipient identity from stored records. Checkout, subscription and Connect setup use the authenticated account. Browser return flags cannot settle rent, link a destination account or grant a paid plan. Profile write guards protect provider identity and entitlement fields.
- Persistent payment attempts reserve exact amounts and destinations under a database lock. Provider events reconcile exact attempt/payment/owner/currency/amount identity, tolerate replay and stale ordering, and fail for retry on durable write errors. Partial refunds preserve net confirmed funds; disputes remain blocked for reconciliation. Legacy name/date settlement fallbacks are removed.
- Offline receipts use integer-cent allocations and append-only reversal records. Pending attempts do not count as received funds. Deposits and other non-rent charges stay out of the rent summary. Direct edits cannot fabricate confirmation or remove settled payment history.
- Occupied-rental setup uses private source files, server drafts, optimistic revisions, typed extraction suggestions, explicit tenancy state, a bounded schedule/defer decision, and a final exact-record preview. Unit, tenancy and charges commit atomically. Repeating an approval returns the same tenancy. No invitation or notice is sent automatically.
- Lease extraction accepts owner-scoped storage objects rather than arbitrary URLs. Sources have a private bucket, size/type limits, PDF page limits, content checks and durable rate limits. Unknown/conflicting facts remain reviewable; model excerpts and page suggestions are not labeled verified evidence.
- Tenancy dates do not implicitly terminate continued month-to-month occupancy. Membership controls permit explicit linked occupants and revocation. Co-signers are denied pending separately scoped document grants. Former-member sharing needs the release review below.
- Tenant repairs support retry identities, shared updates/photos and private owner receipts. Contractor/access snapshots and approved estimates stay private. Completion records actual invoice cost with one expense identity; reopening retains cost and cumulative history.
- Renewal offers persist as proposals and do not change rent when emailed. Applying terms requires a separate executed-source approval, checks the base revision and existing future activity, creates/replaces only reviewed future charges, and applies current rent on the property's effective civil date through a guarded cron.
- Email approvals persist content digests and provider-acceptance state. Recipient identity is derived on the server, duplicate submissions share a provider idempotency key, and uncertain delivery is not labeled delivered.
- Selected history exports produce authenticated JSON manifests with expiring original-file links and tenant filtering. They are not bundled archives. Fixed-schema server outcomes measure import, payment and renewal milestones without message/document content or financial amounts.

Existing commercial plan definitions remain unchanged. The PRD's P2 intake integrations and pricing experiments are not enabled.

## Repeatable validation

Run `npm ci`, then `npm run test:workspace`. PGlite is a committed development dependency; no temporary external install is required. The command runs:

1. Domain tests for tenancy lifecycle, confirmed/partial rent arithmetic, unit identity, calendar schedules, extraction unknowns, approval digests and membership isolation.
2. Real route-handler boundary tests with network access prohibited for anonymous requests.
3. Disposable PostgreSQL-compatible integration tests covering all new migrations, injected atomic rollback, stale/repeated approvals, unit limits, fractional-dollar storage, foreign IDs, partial receipts/refunds, reversals, provider replay/order, repair expense identity, renewal conflicts and effective civil dates, financial/profile write guards and RLS.

Build using the normal deployment environment and `npm run build`. Local builds used nonfunctional placeholders for required provider variables and a 6 GB Node heap; passing does not establish provider connectivity or live-schema compatibility.

## Required release gates

This remains a draft implementation, not a production release. Do not merge or promote it solely because local checks pass.

1. Inventory and back up the actual schema and reconcile legacy money units, manually marked paid rows, active payment links and in-flight attempts. The registered legacy `payments.amount` column is dollars; the migration widens it to `numeric(12,2)` without changing units. No automatic ambiguous historical backfill is authorized.
2. Apply the ordered `20261117*` migrations to an isolated copy of the real schema and validate data reconciliation. The disposable fixture cannot establish compatibility with untracked production schema changes. Deploy schema and application as a coordinated release; financial guards intentionally reject legacy direct-paid mutations.
3. Complete operational reconciliation for failed/expired attempts, dispute resolution and old payment links. A 23-hour retry limit fails closed before provider idempotency retention expires. No automatic fresh charge is created after that limit.
4. Complete scoped co-signer sharing and review former-occupant history boundaries, revocable invitations and all older RLS/service-role routes. Verify member revocation with real signed-in accounts and expired sessions.
5. Verify executed renewal source integrity, correction authors/version evidence, approval replay and conflicting concurrent edits against real provider sandboxes. Statutory notices remain a separately reviewed process. Sending a proposal is not tenant acceptance.
6. Exercise all legacy rent/schedule/expense screens against the new guards; verify partial-balance presentation throughout, online/manual retry recovery and document export expiry/missing originals.
7. Run signed-in browser E2E and human keyboard/screen-reader checks at 320/390/768/1280 px and 200% zoom. Verify dialog focus restoration, draft resumption, back/reload context, tenant privacy and all error/empty states.
8. Expand outcome instrumentation for repairs, failures/reversals and second-rent-cycle retention. Run the pre-specified RentSpree and TurboTenant task study before making any 30% faster claim.

## Deployment access

The connected Vercel account still returned HTTP 403 for the `keywise-apps-projects` team during this work. Team authorization is required before preview/deployment inspection. No production migration, real-money charge, tenant message or statutory notice was executed by this development session.

Preserve all user records on rollback. Keeping the new financial guards while reverting to a legacy application can intentionally block old direct-paid flows; reconcile deployment compatibility rather than dropping history or disabling safety checks casually.

## Batch lease onboarding (November 23)

The lease tracker, tenant onboarding and portfolio onboarding now share the same
occupied-rental import flow. Landlords can drop up to ten documents, extract two
concurrently, review all rentals together, apply one shared building address and
approve the batch. Manual entry uses the same path. Per-document errors retain
uploaded sources for retries; unsupported formats and missing browser MIME types
receive explicit handling. Optional contact and schedule fields are expandable.
Current terms and occupancy still require owner review; dates do not establish
continued occupancy. Existing unit/plan limits remain enforced.

Apply `20261123000000_batch_lease_onboarding.sql` after the existing migrations
before deploying this source. It adds service-role-only batch save/commit RPCs
and updates occupied-import creation to reuse an owner-scoped building. Commits
are atomic across the batch and replay the same approved draft identities.
A failed unit rolls back the entire batch, including newly created buildings.
The migration does not rewrite historical properties or merge existing buildings.

Validation includes regression coverage for missing file metadata, actionable
storage failures, private source ownership, duplicate rental identities, batch
rollback, unit caps, replay and stale drafts. `npm run test:workspace` includes
these checks. A production build with placeholder provider variables verifies
compilation only. Live upload/extraction and signed-in browser acceptance still
require verification. Under-five-minute duplex onboarding remains a target,
not a measured performance claim.
