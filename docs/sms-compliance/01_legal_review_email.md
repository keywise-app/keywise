# Email to legal counsel — A2P SMS opt-in flow

**To:** [counsel email]
**From:** Chris Colwell <cccolwell@gmail.com>
**Subject:** Quick legal review — Keywise A2P SMS opt-in compliance

---

Hi [name],

We're rolling out an SMS opt-in flow on Keywise to comply with Twilio's A2P 10DLC requirements. The engineering work is done; what I need from you is a review of two pieces of customer-facing language before we ship and resubmit our Twilio campaign.

**What changed in the product**

- Landlords now check a consent box in the "Add Tenant" wizard before any SMS option is enabled. The exact disclosure text we show them is captured below.
- Outbound SMS to tenants is now blocked at the API layer unless that consent is on file for the lease.
- We honor STOP / UNSUBSCRIBE / CANCEL / QUIT / END / OPTOUT inbound, mirror it into our database, and refuse future sends. We honor START / UNSTOP for re-opt-in.
- We log a verbatim audit row for every opt-in and opt-out event with timestamp, source, IP, user agent, and the exact disclosure text shown.

**What I need you to bless**

1. **Disclosure text shown to landlords at point of consent capture (in the wizard):**

   > I confirm that [tenant name] has given consent to receive SMS messages from [landlord name] via Keywise — including rent reminders, lease updates, and other transactional notices. They can reply STOP at any time to opt out. Msg & data rates may apply.

2. **A new section to add to our privacy policy** covering: what SMS we send, how consent is captured, STOP/HELP keyword behavior, message frequency, and that phone numbers are not sold or shared with third parties for marketing. Draft is attached as `03_privacy_sms_section_draft.md`.

3. **A small terms of service addition** acknowledging that landlords are responsible for collecting and maintaining valid SMS consent from their tenants. Two-sentence draft below — flag if you want it longer.

   > Landlords are responsible for obtaining and maintaining valid consent from their tenants before sending SMS messages through the Keywise platform. Landlords agree to comply with applicable telecommunications regulations including the TCPA and CTIA messaging guidelines.

**Timing**

Twilio is throttling our campaign until this is in place, so we'd like to ship early next week. Happy to walk through any of this on a call if easier.

Thanks,
Chris

---

**Attachments / context for review**

- `02_tenant_sms_notice_draft.md` — customer-facing email we'll send to existing tenants explaining the change
- `03_privacy_sms_section_draft.md` — proposed new section for keywise.app/privacy
- Pull request: [link to PR once opened]
