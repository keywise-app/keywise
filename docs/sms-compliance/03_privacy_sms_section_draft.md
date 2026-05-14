# Privacy policy — proposed SMS section (DRAFT for legal review)

**Status:** Draft. Not deployed. Do not modify `app/privacy/page.tsx` until counsel signs off.

This is intended to slot in as a new section in the existing privacy policy at `keywise.app/privacy`. The existing structure has eight numbered sections; this becomes a new section 5 (SMS Communications) and shifts the rest down by one. Or, if counsel prefers, it can be folded into the existing "How We Use Your Information" and "Third-Party Services" sections — flag the preference.

The voice matches the existing policy: matter-of-fact, plain English, second person, no marketing language.

---

## 5. SMS Communications

When a landlord adds you as a tenant on Keywise, they have the option to enable SMS notifications to your phone number. We send SMS only when both of the following are true:

- The landlord has confirmed in writing that you consented to receive text messages from them through Keywise, **or** you have opted in directly through the tenant portal; and
- You have not subsequently opted out by replying STOP.

**Types of messages we send.** Transactional only — rent reminders, payment receipts, lease invitations, maintenance updates, and direct messages from your landlord. We do not send marketing messages by SMS.

**Frequency.** Message frequency varies and depends on your lease activity. Typical volume is one to four messages per month.

**Cost.** Standard message and data rates from your carrier may apply. Keywise does not charge for SMS.

**Stopping messages.** You can stop receiving SMS at any time by replying **STOP**, **UNSUBSCRIBE**, **CANCEL**, **QUIT**, or **END** to any message. We will mark your number as opted out within seconds and will not send further SMS to that number unless you opt back in. Reply **START** or **UNSTOP** to resume.

**Help.** Reply **HELP** to any message for support contact information, or email us at privacy@keywise.app.

**Data sharing.** We share your phone number with Twilio for the sole purpose of delivering the SMS you've consented to receive. Twilio's privacy policy is at twilio.com/legal/privacy. We do not sell your phone number, and we do not share it with third parties for their own marketing purposes.

**Audit log.** We keep a record of when consent was captured, the channel through which it was captured (landlord-confirmed, tenant portal, or inbound text), and any opt-out events. You may request a copy of your own consent record at privacy@keywise.app.

---

## Suggested edits to existing sections

**Section 1 ("Information We Collect")** — add to the bullet list:

> SMS consent records, including the timestamp, source, and IP address of every opt-in or opt-out event tied to your phone number.

**Section 2 ("How We Use Your Information")** — add a bullet:

> Send SMS notifications you've consented to receive (rent reminders, lease updates, transactional notices)

**Section 3 ("Third-Party Services")** — the existing Twilio entry can stay; consider expanding the description from "SMS notifications sent to tenants and landlords" to "SMS delivery for transactional notifications, with consent tracked by Keywise per applicable A2P 10DLC requirements."

---

## Open questions for counsel

1. Do we need a separate SMS terms of service (some carriers want a dedicated `/sms-terms` URL linked from the consent screen), or is the privacy policy section enough?
2. For tenants in California — do CCPA disclosures around the consent audit log need additional language?
3. Should the audit retention period be specified (we currently keep records indefinitely)?
4. Any concerns with the landlord-confirmed consent path? The CTIA guidance leans toward direct opt-in from the recipient, and we plan to add a tenant-portal opt-in flow as a follow-up — but the wizard's landlord-confirmed flow is what ships first.
