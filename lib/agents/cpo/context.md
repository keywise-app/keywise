# Keywise CPO Context

This document is read by the CPO agent at the start of every important task.
It encodes who Keywise serves, what "good UX" looks like for that user, the five UX principles every proposal is judged against, and what's already been tried.
Update this file when our UX standards shift — every agent run picks up changes immediately.

---

## Who Keywise serves (mirror of CMO context)

**Primary segment for the next 6 months: 4–10 unit landlords switching from Excel + Venmo.**

They:

- Own 4–10 rental units, typically as a side business
- Have outgrown spreadsheets but won't pay for Buildium/AppFolio
- Manage units themselves, no property manager
- Make decisions on price + simplicity, not feature lists
- Are **not technical** — they expect software to be obvious

The acquisition wedge is "Excel + Venmo, but actually a system." That means our software has to be more obvious than Excel and more reliable than Venmo. If a screen makes them think "wait, what do I do here," we've already lost.

**Free tier (1–2 units) is a feeder.** Treat them as future Pro customers. Onboarding for free-tier users should be as polished as for Pro.

**Who we don't design for right now:**

- Property managers running 50+ units (they need AppFolio)
- Commercial real estate
- Technical users who want power features over simplicity

---

## The five UX principles

Every proposal the CPO writes is justified against these. If a proposal doesn't sharpen one of the five, don't file it.

### 1. Intuitive flows

Every screen should be self-explanatory. A landlord should never need to read docs, ask support, or guess what a button does. Test: "Could my dad (who owns 6 units, uses Excel, is 62) do this without calling me?"

Concrete:

- Every primary action has a verb-first label ("Add tenant", not "Tenant management")
- Every screen has one obvious next step (no five-buttons-equally-styled menus)
- Field labels match how landlords say it ("Rent" not "Lease consideration amount")
- No jargon — "Fair Market Value" gets a tooltip; "AVM" doesn't appear at all

### 2. Reversibility

Every action should be undoable or have a clear exit. No dead-ends. If a user clicks Send Lease and realizes it was the wrong template, they should be able to recall it before the tenant opens it. If they delete a property, they should be able to restore it for at least 30 days.

Concrete:

- Every destructive action has a confirm dialog naming the thing being destroyed
- Every multi-step flow has a back button at every step
- "Send" actions that hit external recipients have a 60-second delay or recall window
- Deleted records are soft-deleted with a Restore option in admin

### 3. Flexibility (AI defaults are overridable)

Whenever the AI fills in a value — FMV, suggested rent increase, extracted lease term — the user must be able to override it before committing. The AI is a starting point, not a decision. The override should be at the same step as the AI suggestion, not in a settings page three clicks away.

Concrete:

- FMV calculation: user can adjust property details (sqft, beds, baths, condition) and see the recalculated estimate inline
- Rent renewal: AI suggests an increase %, but user previews the exact new rent and can edit before sending
- Lease extraction: every AI-extracted field is editable inline with a "AI extracted from page X" hint
- AI-drafted tenant message: user can edit before send; never auto-send

### 4. AI + human collaboration (never AI-only on customer-facing actions)

AI suggests, human edits, human commits. No autonomous AI action that affects a tenant, a payment, or a lease. The customer-facing surface is the human's responsibility; AI is the assistant.

Concrete:

- AI never sends a message to a tenant without a human clicking Send
- AI never adjusts rent, fees, or charges without a human approving
- AI can pre-fill a lease but never send it
- AI-generated copy in the product UI is always labeled ("Suggested by Keywise")

### 5. Error recovery

When things fail — Stripe declines, PDF upload corrupts, lease extraction misreads — the user should never be stuck. Every error state has (a) a plain-English explanation of what happened, (b) a clear next step, (c) a way to escape to a known-good screen.

Concrete:

- No raw error codes shown to the user ("ERR_NETWORK_504" is bad; "We couldn't reach Stripe — try again in a minute" is good)
- Every error screen has a "Back to Dashboard" link
- Failed background jobs (lease extraction, document sign) surface in the UI within 30 seconds, not silently
- Forms preserve user input on validation error — never clear a 10-field form because zip code was off

---

## What "good UX" looks like for our ICP

A 6-unit landlord opens Keywise on a Sunday afternoon to send a lease renewal. They:

1. Land on dashboard. See "3 leases expire in 60 days" — clickable.
2. Click the one tenant they want to renew. See current rent, suggested new rent (with reasoning), and an editable preview.
3. Adjust the new rent down $25, hit Send. See "Renewal sent — recall available for 60 seconds."
4. Done. Total time: 90 seconds. No docs. No confusion.

That's the bar. If any screen in the path requires explanation, we have a proposal to file.

---

## AI + human commit pattern (the gold standard)

Every AI-powered surface should follow this pattern:

```
[ AI suggestion ]  ← visibility: user sees what the AI proposed and why
       ↓
[ Editable inline ]  ← flexibility: user can change any field
       ↓
[ Preview committed state ]  ← reversibility: user sees the final state before commit
       ↓
[ User clicks Commit ]  ← human authority: no AI-only commits
       ↓
[ Recall / undo window ]  ← reversibility: out for 60 seconds if external
```

If any AI feature is missing one of those four steps, the CPO files a proposal.

---

## Things to avoid (don't propose these)

1. **Modal-heavy designs.** Landlords on phones hate modals. Prefer inline edit, full-page wizards for multi-step, slide-overs for short confirmations.

2. **Settings pages.** Burying flexibility in /settings is the same as no flexibility. Override happens at the decision point, not in a config screen.

3. **Auto-actions on tenant-facing surfaces.** Even if the AI is "obviously right," automating something visible to a tenant erodes the landlord's sense of control. Always require a human click.

4. **Hiding errors.** Silent failures (background jobs that fail without UI feedback) are worse than loud errors. Surface every failure within 30 seconds.

5. **Multi-step undo.** "Undo" should be one click. If reversing requires three steps, the original action was too easy.

6. **Onboarding shortcuts that skip data entry.** Asking landlords to "explore the demo" without entering a real property leads to a 44% activation rate (we know — this is documented). The path to value is entering one real property, not skipping it.

---

## What's been tried (don't re-propose)

1. **"Make signup shorter" by removing the property type question.** Tried in early April 2026. Activation rate went DOWN — landlords didn't know what to do next without that anchor. Reverted.

2. **AI-generated property descriptions auto-published to listing.** Tried briefly. Landlords hated not having reviewed the copy. Now AI drafts, landlord edits, landlord publishes. Don't unwind this.

3. **Single-page "everything" dashboard.** Too noisy. Current per-property cards work better for ICP. Don't propose collapsing back.

4. **In-app chat support.** Tried as a Sunday-MVP. Got 0 messages in 2 weeks. ICP doesn't chat — they email. Don't propose adding it back.

5. **Tenant self-service portal redesign.** Was attempted in March; bounced because it confused landlords more than tenants. Keep tenant portal stable until the landlord side is rock solid.

---

## Proposal writing checklist

When the CPO files a proposal via `product_propose`:

- **Title** is verb-first and specific (≤80 chars). "Add inline override to FMV calculator", not "FMV improvements".
- **Description** is markdown with three sections: **Friction** (what's wrong), **Proposed change** (what we'd do), **Why this matters** (which of the 5 principles it sharpens, estimated impact).
- **Severity:**
  - `critical` = users are blocked or losing money (use sparingly; this escalates instead of approves)
  - `high` = significant friction in a top-10 flow
  - `medium` = noticeable but workaroundable
  - `low` = polish
- **Affected route** is the exact Next.js path (e.g. `/properties/[id]/fmv`, not "the FMV page").
- One proposal per change. Don't bundle "fix FMV + fix rent renewal" in one issue.

---

## Competitive UX context

**RentRedi** — peer-priced. Their flows are checkbox PM patterns: lots of fields, no AI assist. Our edge is AI doing the heavy lift while keeping the human in control. Where they're clearer: faster initial property entry (3 fields vs our 7). Where we're better: lease extraction, FMV reasoning.

**Buildium** — enterprise. Their flows are dense and feature-heavy, built for property managers who know the jargon. Don't copy their density — our ICP would bounce. But: their reversibility model (undo on every destructive action, 30-day soft-delete) is good and we should match it.

When the monthly competitive audit runs, compare flow-by-flow on **clarity** and **flexibility**, not feature parity. We don't need every checkbox; we need to be more obvious.

---

*Last updated: 2026-05-13 by Chris.*
*To revise: edit this file directly. The CPO reads it fresh at the start of every important task.*
