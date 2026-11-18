import { PLAN_LIMITS } from './planLimits';

// Public positioning shared by the homepage, crawler view, metadata and onboarding.
export const brand = {
 name: 'Keywise',
 category: 'Property management for independent landlords',
 promise: 'Your rentals, under control.',
 description: 'Already have tenants? Bring your existing lease, rent records and repairs together. Start with one occupied rental and see what needs attention—before moving payments or inviting tenants.',
 title: 'Keywise | Property Management for Independent Landlords',
 freeUnits: PLAN_LIMITS.free.maxUnits,
 freeLabel: `Free for ${PLAN_LIMITS.free.maxUnits} unit`,
 primaryAction: 'Set up my rental',
 secondaryAction: 'See how it works',
};
export const brandWorkflows = [
 { number: '01', title: 'Know where rent stands', detail: 'See recorded payments, upcoming charges and overdue balances without piecing together a spreadsheet.', label: 'Rent, at a glance' },
 { number: '02', title: 'Keep repairs moving', detail: 'Give tenants a place to report problems. Keep photos, updates, costs and resolution history with the request.', label: 'One repair. One history.' },
 { number: '03', title: 'Find the record you need', detail: 'Keep tenants, leases and documents connected to the right property, with tasks to track what comes next.', label: 'Everything in its place' },
];
export const brandSteps = [
 { title: 'Bring your existing lease', detail: 'Start with one occupied unit. Upload a lease PDF or enter the details you already have.' },
 { title: 'Review your details', detail: 'Check extracted lease terms, connect the tenant and set up your records.' },
 { title: 'See your next step', detail: 'Track rent, follow up on a repair or find a document from your workspace. Invite your tenant when you’re ready.' },
];
export const brandFaqs = [
 { q: 'Who is Keywise for?', a: 'Independent landlords who manage their own rentals and want rent, repairs, leases and tenant records in one place.' },
 { q: 'Can I start without a credit card?', a: `Yes. The free account includes ${brand.freeUnits} unit and does not require a credit card. A Pro trial is a separate option and requires a card. Review current plan details on the pricing page.` },
 { q: 'Do I have to move my rent payments right away?', a: 'No. Start by organizing your property and recording payments you receive elsewhere. Online rent collection is available on eligible paid plans when your account is set up.' },
 { q: 'Do my tenants need to sign up first?', a: 'No. Set up your property and records first, then invite tenants to their portal when you’re ready.' },
 { q: 'Does Keywise work outside California?', a: 'The property management workspace can organize rentals outside California. The dedicated rent calculator and notice tools address California rules; they do not provide state-specific coverage elsewhere.' },
 { q: 'Does AI make decisions for me?', a: 'AI can help extract lease details and draft messages. Review the details and wording before relying on them or sending anything. California tools provide guidance and do not replace legal advice.' },
];
