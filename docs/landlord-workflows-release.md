# Landlord workflow release

## Audit and scope

Repository inspected from main at 876d7fb. This is a source audit, not a claim that existing production workflows passed an authenticated browser test.

| Area | Existing implementation | Change in this release |
| --- | --- | --- |
| Dashboard | Rent cards, inferred smart actions, charts, renewal notices | Recorded-charge ledger, deterministic attention queue with record destinations, dated tasks |
| Property records | Buildings and units, address-based lease matching | Stable lease/unit and maintenance/unit links, exact legacy fallback, connected-record view |
| Maintenance | Landlord CRUD, priority, vendor, cost and resolution date | Tenant requests, tenant-visible updates, automatic status history, private photo/receipt attachments, error handling |
| Tenant portal | Lease, payment history, documents, Stripe payment UI | Maintenance submission/tracking, reconciled rent summary, authenticated lease/document/payment reads, verified document uploads |
| Rent tracking | Charges, schedules, manual paid recording, Stripe processing | Shared scheduled/paid/outstanding/overdue/processing totals, direct access from dashboard and navigation |
| Tasks | No persistent dated landlord task list found | Owner-scoped tasks with due dates, property links, completion and reopening |

Record IDs win over addresses. The legacy fallback requires exact normalized addresses; it never matches on a building prefix or a unit letter alone. Ambiguous historical rows are left unlinked. Existing expenses and maintenance cost estimates are displayed separately to avoid counting the same repair twice.

Tenant read APIs authenticate bearer sessions and verify the lease owner or linked tenant. Invitation linking uses the authenticated account's verified email, not an email or user ID supplied by a caller. Name-only payment lookup has been removed because names are not a reliable ownership boundary. Historical charges without lease IDs must be reviewed and linked by an operator rather than automatically exposed to tenants.

Photos are shared with the linked tenant. Receipts and landlord notes/vendor costs remain in the landlord workspace. An explicit tenant-visible update is separate from landlord notes. Archived/ended leases cannot submit new requests or documents through these endpoints. The final lease calendar day remains editable.

## Rollout order

1. Back up the target database and apply `supabase/migrations/20261117000000_landlord_workflows.sql` through the project's established Supabase migration process. The migration is transactional and additive. It assumes the existing application tables and Supabase auth/storage schemas already exist.
2. Confirm server environment contains `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, and the client build contains the existing public URL/anon key. No credentials are committed.
3. Deploy this branch to a preview using the existing Vercel project. Keep its current audience and environment configuration.
4. With synthetic landlord and tenant accounts: create a unit and tenant; confirm the property link; add a task and complete/reopen it; record a charge and manual payment; submit a maintenance request with a photo as tenant; post an update, attach a receipt, and resolve as landlord. Confirm the tenant sees the update/photo but not the receipt. Confirm a second tenant/landlord cannot read those records. Revisit through dashboard actions, URL reload, Back and Forward on desktop/mobile.
5. Promote the verified deployment using the existing release process. Keep the additive schema if rolling the application back. Do not undo migration columns or drop tables containing user records.

Existing Stripe charge, checkout, subscription, Connect and webhook flows are preserved. This release does not introduce a payment provider or enable a new payment method. Provider/fund-flow review remains necessary before expanding actual collection behavior.

## Validation

- `bash scripts/test-workspace.sh`: rent arithmetic, status classification, date boundaries, address isolation, lease authorization and unauthenticated API rejection.
- `PGLITE_MODULE=/path/to/@electric-sql/pglite node test/workspace-migration.cjs`: run the migration against a disposable Postgres-compatible database with synthetic prerequisite tables. Checks backfills, event triggers, invalid cross-owner links and RLS. This does not establish compatibility with every untracked production schema change.
- `npx tsc --noEmit`: application type checking.
- `npm run build`: compile and prerender using environment placeholders in this workspace. This does not validate external service connectivity or signed-in browser flows.

Production rollout is blocked until the migration and authenticated acceptance checks are complete. No production database migration has been executed from this workspace.
