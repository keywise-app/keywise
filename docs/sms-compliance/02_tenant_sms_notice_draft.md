# Tenant notice — SMS preferences update

Two channels: email (full) and SMS (short). Send the email to all current tenants. Optionally send the SMS the day before to anyone whose lease has `invite_sent=true` and a phone on file, so they're primed for the email.

> **Important:** if you choose NOT to backfill consent (recommended), this notice is the *only* way existing tenants can keep getting texts — they have to opt in via the link. If you backfill, this becomes a courtesy notice instead.

---

## Email — full version

**From:** Keywise <noreply@keywise.app>
**Subject:** A small change to your text message preferences
**Preview text:** Reply START or click below to keep getting rent reminders by text.

---

Hi {{ tenant_first_name }},

We're updating how Keywise handles text messages. Going forward, we'll only send you SMS — rent reminders, payment receipts, lease updates — if you've explicitly opted in.

If you've been getting helpful text reminders from {{ landlord_name }} through Keywise and you'd like to keep getting them, **just tap the button below**.

[ Keep getting text reminders ] → {{ opt_in_link }}

If you'd rather not get texts, you don't need to do anything — we'll only send you email from now on.

You can change your mind at any time. Reply **STOP** to any text from us to opt out, or **START** to opt back in.

Questions? Reply to this email and we'll help.

— The Keywise team

*Msg & data rates may apply. Message frequency varies (typically 1–4 per month).*

---

## SMS — short reminder version (optional, send day before)

> Hi {{ first_name }} — Keywise is updating SMS preferences. To keep getting rent reminders by text, watch for an email from us tomorrow and tap the opt-in link. Reply STOP to stop these messages.

*148 chars. One segment.*

---

## Notes for sending

- `{{ opt_in_link }}` resolves to `https://keywise.app/?tenant=true&action=sms_opt_in` (the tenant portal magic-link with the auto-opt-in deep-link param). When the tenant arrives there from a logged-in session, the portal flips `sms_consent=true` automatically and writes a `sms_consent_events` row with `source='tenant_portal_email'`. The opt-in is also exposed as a manual banner in the tenant dashboard for tenants who don't click the email link.
- For tenants who aren't yet logged in, generate a magic link via the existing `supabase.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo: 'https://keywise.app/?tenant=true&action=sms_opt_in' } })` pattern (same one used by `/api/invite-tenant`).
- Suggest sending in batches of ~500 to avoid Resend rate limits and to spread out the inbound STOP traffic if it comes.
- If you go with the backfill approach instead, change the email body to past tense: "We've updated how Keywise handles text messages..." and drop the opt-in CTA in favor of a "Manage SMS preferences" link to the portal.
