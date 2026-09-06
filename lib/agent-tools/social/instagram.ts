// lib/agent-tools/social/instagram.ts
// Real Instagram publishing via the Meta Graph API (Content Publishing API).
// Reads credentials from env vars. No SDK — plain fetch against graph.facebook.com.
//
// Required env:
//   IG_USER_ID       - the Instagram *Business/Creator* account id (numeric),
//                      linked to a Facebook Page. NOT your @handle.
//   IG_ACCESS_TOKEN  - a long-lived access token with instagram_content_publish
//                      (and pages_read_engagement) permissions.
// Optional env:
//   IG_GRAPH_VERSION - Graph API version, defaults to v21.0.
//
// Docs: https://developers.facebook.com/docs/instagram-platform/content-publishing

type IgEnv = { userId: string; token: string; version: string };

function igEnv(): IgEnv {
  const userId = process.env.IG_USER_ID;
  const token = process.env.IG_ACCESS_TOKEN;
  const version = process.env.IG_GRAPH_VERSION || "v21.0";
  if (!userId || !token) {
    throw new Error(
      "Missing Instagram env vars: IG_USER_ID and IG_ACCESS_TOKEN are required " +
        "(Instagram Business account id + long-lived token with instagram_content_publish)."
    );
  }
  return { userId, token, version };
}

const GRAPH = "https://graph.facebook.com";

async function graph(
  version: string,
  path: string,
  params: Record<string, string>,
  method: "GET" | "POST" = "GET"
): Promise<any> {
  const url = `${GRAPH}/${version}/${path}`;
  let res: Response;
  if (method === "GET") {
    const qs = new URLSearchParams(params).toString();
    res = await fetch(`${url}?${qs}`);
  } else {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
    });
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    const e = json?.error;
    const msg = e ? `${e.type || "GraphError"} ${e.code ?? ""}: ${e.message}` : `HTTP ${res.status}`;
    throw new Error(`Instagram Graph API error — ${msg}`);
  }
  return json;
}

export type IgMediaType = "REELS" | "IMAGE";

/** Guess media type from a URL's extension. Video → REELS, otherwise IMAGE. */
export function detectMediaType(url: string): IgMediaType {
  return /\.(mp4|mov|m4v|webm)(\?|$)/i.test(url) ? "REELS" : "IMAGE";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Publish a single photo or Reel to Instagram.
 * `mediaUrl` MUST be a publicly reachable https URL — the Graph API fetches it
 * server-side; it cannot accept a raw file upload.
 * Returns the published media id and its permalink.
 */
export async function publishInstagram(opts: {
  caption: string;
  mediaUrl: string;
  mediaType?: IgMediaType;
}): Promise<{ id: string; url: string }> {
  const { userId, token, version } = igEnv();
  const mediaType = opts.mediaType ?? detectMediaType(opts.mediaUrl);

  // Step 1 — create the media container.
  const createParams: Record<string, string> = {
    caption: opts.caption,
    access_token: token,
  };
  if (mediaType === "REELS") {
    createParams.media_type = "REELS";
    createParams.video_url = opts.mediaUrl;
  } else {
    createParams.image_url = opts.mediaUrl;
  }
  const container = await graph(version, `${userId}/media`, createParams, "POST");
  const creationId: string = container.id;

  // Step 2 — Reels are processed async; wait for the container to be ready.
  if (mediaType === "REELS") {
    const maxAttempts = 30; // ~2.5 min at 5s
    for (let i = 0; i < maxAttempts; i++) {
      const status = await graph(version, creationId, {
        fields: "status_code",
        access_token: token,
      });
      const code = status.status_code;
      if (code === "FINISHED") break;
      if (code === "ERROR" || code === "EXPIRED") {
        throw new Error(`Instagram media processing ${code} for container ${creationId}`);
      }
      if (i === maxAttempts - 1) {
        throw new Error(`Instagram media still processing after timeout (container ${creationId})`);
      }
      await sleep(5000);
    }
  }

  // Step 3 — publish the container.
  const published = await graph(
    version,
    `${userId}/media_publish`,
    { creation_id: creationId, access_token: token },
    "POST"
  );
  const mediaId: string = published.id;

  // Step 4 — resolve the permalink (best-effort).
  let permalink = `https://www.instagram.com/`;
  try {
    const info = await graph(version, mediaId, { fields: "permalink", access_token: token });
    if (info.permalink) permalink = info.permalink;
  } catch {
    // permalink is a nice-to-have; the post is already live.
  }

  return { id: mediaId, url: permalink };
}

/** True when the operator has explicitly opted into auto-publishing (no human gate). */
export function autoPublishEnabled(): boolean {
  return process.env.IG_AUTOPUBLISH === "true";
}
