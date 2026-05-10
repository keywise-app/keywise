// app/admin/agents/forum-drafts/page.tsx
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: drafts } = await supabase
    .from("forum_response_drafts")
    .select("*, forum_threads(title, url, platform, subreddit, score)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  const { data: threads } = await supabase
    .from("forum_threads")
    .select("*")
    .eq("status", "new")
    .order("relevance_score", { ascending: false })
    .limit(20);
  return { drafts: drafts ?? [], threads: threads ?? [] };
}

export default async function ForumDraftsPage() {
  const { drafts, threads } = await getData();

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
      <header>
        <Link
          href="/admin/agents"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to agents
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Forum drafts</h1>
        <p className="text-sm text-gray-600 mt-1">
          The CMO scanned forums and drafted responses. Copy, edit if needed,
          post from your own account, then mark as posted.
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold mb-3">
          Drafts ready to post ({drafts.length})
        </h2>
        <div className="space-y-3">
          {drafts.map((d: any) => (
            <div
              key={d.id}
              className={`border rounded-lg p-4 ${
                d.is_promotional ? "bg-amber-50 border-amber-200" : "bg-white"
              }`}
            >
              <div className="flex justify-between text-sm">
                <span className="font-medium">
                  {d.forum_threads?.subreddit ?? d.forum_threads?.platform}
                </span>
                {d.is_promotional && (
                  <span className="text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                    promotional · ratio {d.promo_ratio_at_draft?.toFixed(1) ?? "n/a"}
                  </span>
                )}
              </div>
              <a
                href={d.forum_threads?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm mt-1 inline-block"
              >
                {d.forum_threads?.title}
              </a>
              {d.reasoning && (
                <p className="text-xs text-gray-600 mt-2 italic">
                  Why: {d.reasoning}
                </p>
              )}
              <pre className="mt-3 text-sm whitespace-pre-wrap bg-gray-50 border rounded p-3">
                {d.draft_text}
              </pre>
              <div className="mt-3 flex gap-2">
                <CopyButton text={d.draft_text} />
                <Link
                  href={d.forum_threads?.url ?? "#"}
                  target="_blank"
                  className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded"
                >
                  Open thread →
                </Link>
              </div>
            </div>
          ))}
          {drafts.length === 0 && (
            <p className="text-sm text-gray-500">No pending drafts.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">
          Recent scanned threads (no draft yet)
        </h2>
        <div className="space-y-2 text-sm">
          {threads.map((t: any) => (
            <div key={t.id} className="border rounded p-3 bg-white">
              <div className="flex justify-between">
                <span className="font-medium">
                  {t.subreddit ?? t.platform}
                </span>
                <span className="text-xs text-gray-500">
                  relevance {Number(t.relevance_score ?? 0).toFixed(2)}
                </span>
              </div>
              <a
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {t.title}
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  // Has to be a client component in real Next.js. For brevity using a noscript-friendly form.
  return (
    <a
      href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`}
      download="reddit-draft.txt"
      className="text-xs px-3 py-1.5 bg-white border rounded"
    >
      Download text
    </a>
  );
}
