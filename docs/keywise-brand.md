# Keywise brand and adoption direction

## Positioning

- Name: **Keywise**. Keep the existing domain, key mark, navy and teal identity.
- Category: **Property management for independent landlords**.
- Promise: **Your rentals, under control.**
- Explanation: Keep rent, repairs, leases and tenant records together. See what needs attention and take the next step in one place.
- First action: **Start with one property**.

The intended customer owns and manages their own rentals. Lead with the daily work and a manageable first step. California calculators and notice tools remain a distinct supporting capability, rather than defining every visitor's problem as an eviction.

## Message order

1. Identify the audience and show the practical outcome.
2. Make the product tangible with a clearly labeled sample dashboard.
3. Show rent, repairs and connected records through specific examples.
4. Explain the first three steps; tenants and existing payment habits can move later.
5. Offer the founder's real landlord experience and clearly scoped California resources.
6. Explain free versus Pro, then answer migration and setup concerns.

## Voice and claims

Use calm, concrete language: recorded rent, request status, review lease details, invite your tenant. Avoid fear-driven legal guarantees, invented customer proof, competitor comparisons without current evidence, universal automation claims and arbitrary setup-time promises. AI supports reviewable tasks; it is not the product's primary promise.

The examples are illustrative and contain no real tenant records. The founder's Southern California landlord context is established project context, not an invented testimonial.

## Commercial clarity

The enforced free limit in `app/lib/planLimits.ts` is **one unit**. Marketing copy derives that limit from `app/lib/brand.ts`; no entitlements or prices are changed by this branding work. The no-card free account and card-required 14-day Pro trial are distinct. Show founding-member availability only when the offer endpoint returns a valid count; a failed request must not fabricate 100 available spots.

## Consistency

`app/lib/brand.ts` owns shared positioning, workflows, setup steps and FAQs. The human homepage and crawler view draw from it. Root metadata and the generated Open Graph image use the same brand, and auth/onboarding repeat the promise. Keep legal pages, feature-specific guides and existing domain names intact.

## Measurement hypothesis

This positioning is intended to make the audience, value and first action easier to understand. It has not been proven to increase adoption.

The landing page emits `signup_cta_clicked`, `demo_viewed`, `signup_link_requested`, `signup_link_sent` and `pricing_viewed` events through the existing gtag integration, tagged `brand_version=rentals-under-control-v1`. Never include email, tenant records or lease contents in these events. A sent sign-in email is not a completed account or activated landlord.

After release, verify these events reach the intended analytics destination. Compare landing visitors → link sent → verified account → first unit saved → first useful task completed. Report activation and returning use alongside signup conversion. Do not infer causal uplift without a suitable comparison or controlled test.

## Release state

Branding is part of the connected-landlord-workflow release in PR #33. Publishing still requires the release's database migration and authenticated acceptance checks; Vercel team access was blocked in the current connection. Do not present this source change as live until deployment is verified.
