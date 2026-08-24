// app/api/cron/reddit-thread-scan/route.ts
//
// Daily, deterministic (no LLM involved — nothing here needs judgment, just
// search + filter + store) scan of Reddit for threads relevant to Keywise's
// California compliance wedge. Never posts or drafts anything — it only
// surfaces threads at /admin/agents/threads for Chris to read and answer
// himself, in his own voice, the same way the two real answers on r/Landlord
// got posted.
//
// Uses Reddit's OAuth "read-only application-only" grant (client_credentials),
// not the unauthenticated www.reddit.com/*.json endpoints — those returned a
// flat 403 from this environment during testing (Reddit blocks anonymous
// datacenter-IP traffic on the public JSON endpoints; Vercel's egress IPs
// would very likely hit the same wall). This needs REDDIT_CLIENT_ID and
// REDDIT_CLIENT_SECRET from a "script" app at reddit.com/prefs/apps — no
// Reddit login/password required, read-only, can't post anything.
//
// Deliberately NOT the old lib/agent-tools/forums/tools.ts (deleted in the
// agents rebuild) — that one returned the same hardcoded fake post on every
// run. This hits Reddit for real, or fails loudly if it can't.
//
// DORMANT as of 2026-08-24 -- removed from vercel.json's cron schedule.
// Reddit's Responsible Builder Policy requires separate written commercial-use
// approval for this kind of automated read access (self-serve OAuth app
// creation isn't enough for a for-profit company), and the account it'd run
// under can't be a personal account per their "no mixed-use accounts" rule.
// Route and admin UI (/admin/agents/threads) left in place in case Chris
// wants to pursue formal approval later; dropped as a goal for now in favor
// of manually checking the same subreddits by hand.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminApi } from "@/lib/admin-auth";

export const maxDuration = 60;

const SUBREDDITS = ["Landlord", "AskLandlords", "realestateinvesting", "PropertyManagement"];

const QUERIES = [
  "AB 1482",
  "just cause eviction california",
  "california rent increase",
  "california eviction notice",
  "california security deposit",
  "AB 2801",
  "california landlord tenant law",
];

const USER_AGENT = "keywise-thread-finder/1.0 (by /u/blueskies818; read-only research tool, no posting)";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET not set. Create a 'script' app at " +
      "reddit.com/prefs/apps and add its client id + secret as env vars."
    );
  }
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    throw new Error(`Reddit token request failed: HTTP ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  if (!json.access_token) throw new Error("Reddit token response had no access_token");
  return json.access_token as string;
}

type RedditChild = {
  data: {
    id: string;
    subreddit: string;
    permalink: string;
    title: string;
    selftext: string;
    author: string;
    created_utc: number;
    score: number;
    num_comments: number;
  };
};

async function searchSubreddit(token: string, subreddit: string, query: string): Promise<RedditChild[]> {
  const url = `https://oauth.reddit.com/r/${subreddit}/search?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new&t=day&limit=10`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT },
    });
    if (!res.ok) {
      console.error(`[reddit-thread-scan] ${subreddit} "${query}" -> HTTP ${res.status}`);
      return [];
    }
    const json = await res.json();
    return json?.data?.children || [];
  } catch (err: any) {
    console.error(`[reddit-thread-scan] ${subreddit} "${query}" fetch failed:`, err.message);
    return [];
  }
}

function relevanceScore(matchedQueries: string[], child: RedditChild): number {
  let score = 0.4 + Math.min(matchedQueries.length - 1, 2) * 0.1;
  if (child.data.num_comments >= 5) score += 0.1;
  if (child.data.num_comments >= 15) score += 0.1;
  if (child.data.score >= 5) score += 0.1;
  return Math.min(score, 1.0);
}

export async function GET(req: NextRequest) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;

  let token: string;
  try {
    token = await getAccessToken();
  } catch (err: any) {
    console.error("[reddit-thread-scan] auth failed:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // subreddit+postId -> { child, matchedQueries }
  const found = new Map<string, { child: RedditChild; matchedQueries: string[] }>();

  for (const subreddit of SUBREDDITS) {
    for (const query of QUERIES) {
      const children = await searchSubreddit(token, subreddit, query);
      for (const child of children) {
        const key = `${subreddit}/${child.data.id}`;
        const existing = found.get(key);
        if (existing) existing.matchedQueries.push(query);
        else found.set(key, { child, matchedQueries: [query] });
      }
    }
  }

  let inserted = 0;
  let failed = 0;

  for (const { child, matchedQueries } of found.values()) {
    const d = child.data;
    const { error } = await supabase
      .from("forum_threads")
      .upsert(
        {
          platform: "reddit",
          external_id: d.id,
          subreddit: d.subreddit,
          url: `https://www.reddit.com${d.permalink}`,
          title: d.title,
          body: (d.selftext || "").slice(0, 2000),
          author: d.author,
          posted_at: new Date(d.created_utc * 1000).toISOString(),
          score: d.score,
          num_comments: d.num_comments,
          matched_keywords: matchedQueries,
          relevance_score: relevanceScore(matchedQueries, child),
          status: "new",
        },
        { onConflict: "platform,external_id", ignoreDuplicates: true }
      );
    if (error) {
      console.error("[reddit-thread-scan] upsert failed:", error.message);
      failed++;
    } else {
      inserted++;
    }
  }

  return NextResponse.json({ scanned: found.size, inserted, failed });
}
