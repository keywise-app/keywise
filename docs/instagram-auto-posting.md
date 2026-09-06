# Instagram Auto-Posting (Meta Graph API)

Real Instagram publishing for the Rent-Roll account. Rebuilt as a genuine
integration (the earlier mock stub was cut in commit `b364592`). Code lives in
`lib/agent-tools/social/` — `instagram.ts` (Graph API client) + `tools.ts`
(agent tools). Posts are stored in the existing `social_posts` table.

## What it does
- **`social_draft_post`** — saves an Instagram post (photo or Reel) as a `draft`.
- **`social_publish_post`** — publishes a draft live via the Graph API.
- **`social_recent_performance`** — lists recently-posted items.

Publishing is **human-approved by default** (matches this codebase's "no
auto-publish path" design). Unattended posting is opt-in — see `IG_AUTOPUBLISH`.

## Required setup (yours to do — credentials never live in the repo)
1. **Instagram Business/Creator account** linked to a **Facebook Page**.
2. A **Meta Developer app** with the Instagram Graph API product added, and the
   `instagram_content_publish` + `pages_read_engagement` permissions.
3. A **long-lived access token** for that app/account.
4. Find your **Instagram Business account id** (numeric — not your @handle).

## Environment variables
| Var | Required | Purpose |
|-----|----------|---------|
| `IG_USER_ID` | yes | Instagram Business account id (numeric) |
| `IG_ACCESS_TOKEN` | yes | Long-lived token with `instagram_content_publish` |
| `IG_GRAPH_VERSION` | no | Graph API version, defaults to `v21.0` |
| `IG_AUTOPUBLISH` | no | Set to `true` to let `social_publish_post` post **without** human approval. Leave unset to keep the approval gate. |

Set these in Vercel project env (not committed).

## Important: media must be hosted at a public URL
The Graph API **fetches media server-side** — it cannot take a raw file upload.
Every draft's `mediaUrls` must be publicly reachable `https` URLs:
- **Reel:** an `.mp4`/`.mov` video URL → published as a `REELS`.
- **Photo:** a `.jpg`/`.png` URL → published as an image.
Host the rendered video/image somewhere public (e.g. Supabase Storage public
bucket, Vercel Blob, or a CDN) and pass that URL.

## Flow
1. `social_draft_post({ caption, mediaUrls, campaignTag, reasoning })` → returns `draftId`.
2. `social_publish_post({ draftId, reason })`:
   - default → **queued for approval**; a human approves, then it posts.
   - with `IG_AUTOPUBLISH=true` → posts immediately.
3. On success the row flips to `posted` with `external_id` + `external_url` (permalink); on failure it flips to `failed`.

## Wiring into an agent (optional)
The tools are exported but not attached to the autonomous CMO agent (that agent
is deliberately publish-free). To let an agent use them:
```ts
import { allSocialTools } from "@/agent-tools/social/tools";
// add ...allSocialTools to that role's `tools` array
```
Only do this once credentials are set and you've decided on the authority model.

## Safety
- Keep the **approval gate on** until the account has traction — automated posting
  on a young account risks Instagram's spam/automation detection (shadowban).
- Start with 1 post/day; let a human eyeball the first weeks.
- This module publishes only what you draft — it does not generate media.
