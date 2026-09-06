# @therentroll — Handoff Brief

A self-contained briefing to paste into another coding session picking up the
Rent-Roll Instagram work. It stands alone (assumes no prior context) and points to
the committed files for full detail. Fill in the `[YOUR TASK]` line at the bottom.

---

```text
CONTEXT: @therentroll Instagram — design system, assets, and production kit

You're picking up the Rent-Roll faceless Instagram account for Keywise (California
landlord-compliance SaaS; ICP: 4–10 unit landlords moving off Excel + Venmo). A full
content + design kit already exists in the keywise-app/keywise repo. Pull it before doing
anything:

  git fetch origin
  # merged to main (PR #29):
  #   docs/instagram-content-queue.md
  #   docs/instagram-reels-scripts.md              (20 Reel scripts)
  #   docs/instagram-reels-shot-list.md            (per-beat search terms + hero-shot bank)
  #   docs/instagram-reels-asset-templates.md      (brand card / counter / bar chart specs)
  #   docs/instagram-reels-record-day-checklist.md
  #   docs/instagram-reels-image-sources.md        (royalty-free sources)
  #   docs/instagram-reels-placement-guide.html    (open in a browser — interactive build spec)
  # on branch claude/rent-roll-instagram-strategy-6bxUz (PR #31):
  #   lib/agent-tools/social/instagram.ts + tools.ts   (real Meta Graph API auto-poster)
  #   docs/instagram-auto-posting.md
  #   docs/instagram-monetization-strategy.md

STRATEGIC DIRECTION
- Reels are the discovery format (reach ~2–3× static). Carousels = save/convert layer.
- One idea per post; big punchy type; detail lives in the caption, not the graphic.
- Open every Reel on an ASPIRATIONAL HERO shot (money/homes/keys), then cut to substance.

VISUAL SYSTEM (brand)
- Palette: Ink #17140F, Bone #ECE7DA, Cobalt #2540FF (signature), Coral #FF5A3C,
  Green #23C67A, Amber #FFC93C.
- Type: Anton (heavy condensed display, for hooks/numbers) + Inter (captions/labels).
- Wordmark: outlined rounded-square "RR" monogram + "THE RENT ROLL".

REEL FORMAT
- 1080×1920 (9:16). Safe zones: keep text/focal points out of top ~250px, bottom ~400px
  (caption/buttons), right ~110px (action rail).
- Structure: Hero opener → 2–3 substance beats (one idea each) → brand card outro.
- Text-on-screen synced to a trending audio; 9–18s; end on a save/comment CTA.

REUSABLE ASSET TEMPLATES (build once, reuse) — full specs in asset-templates doc
- Brand card (outro): cobalt bg, outlined "RR" monogram, "THE RENT ROLL", CTA, @handle.
- Number counter: Anton ~300px amber on ink, digits ease-out count up, tabular-nums.
- Bar chart: cobalt "up" bars / coral "down" bars on ink, staggered grow.

IMAGES
- Use royalty-free only: Pexels / Unsplash / Pixabay (free, commercial, no attribution).
  DO NOT use iStock/Getty watermarked comps (Google Images results are usually these).
- Hero themes: luxury home at dusk, city skyline, coffee + city-view window, cash/money,
  apartment building, modern kitchen, home office, empty bright apartment, house keys.
- Owner already has: clean luxury-home-at-dusk photos + a coffee-window shot (no watermarks).

AUTO-POSTING (real, already built on PR #31)
- Meta Graph API publishing (draft → publish). Requires operator env, never committed:
  IG_USER_ID, IG_ACCESS_TOKEN, optional IG_GRAPH_VERSION (default v21.0),
  IG_AUTOPUBLISH=true to post without the human-approval gate (off by default).
- Media must be hosted at a public https URL (the API fetches server-side).

MONETIZATION (docs/instagram-monetization-strategy.md)
- Funnel: Reel → bio link → free lead magnet → email → Keywise trial + affiliates.
- Streams sequenced by audience size; FTC/compliance guardrails; 90-day plan.

INTERACTIVE REFERENCES (owner's Claude account)
- Visual Direction:  https://claude.ai/code/artifact/a84aca44-430b-4936-ad9a-bf082145ac72
- Placement Guide:   https://claude.ai/code/artifact/0aa5a476-d05e-42cf-89a3-0260f73edd3f
  (also committed as docs/instagram-reels-placement-guide.html — open locally if the URL won't load)

GUARDRAILS
- Topical/educational only; never post real tenant/rent-roll data.
- Keep legal/tax disclaimers ("not legal/tax advice — check your state / your CPA").
- Young account: keep the approval gate ON; automated posting risks shadowban.

[YOUR TASK: <describe what you want this session to do>]
```
