import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import ThreadActions from "./ThreadActions";

export const dynamic = "force-dynamic";

async function getData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabase
    .from("forum_threads")
    .select("*")
    .order("relevance_score", { ascending: false })
    .order("discovered_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

function timeAgo(iso: string) {
  const hours = Math.round((Date.now() - new Date(iso).getTime()) / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function ThreadCard({ thread }: { thread: any }) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
            <span className="font-semibold text-gray-700">r/{thread.subreddit}</span>
            <span>·</span>
            <span>{thread.posted_at ? timeAgo(thread.posted_at) : timeAgo(thread.discovered_at)}</span>
            {thread.score != null && (
              <>
                <span>·</span>
                <span>{thread.score} upvotes, {thread.num_comments ?? 0} comments</span>
              </>
            )}
          </div>
          <a
            href={thread.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-gray-900 mt-1 block hover:underline"
          >
            {thread.title}
          </a>
          {thread.body && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-3">
              {thread.body.slice(0, 280)}{thread.body.length > 280 ? "…" : ""}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex gap-2 items-center">
        <a
          href={thread.url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium"
        >
          Open on Reddit →
        </a>
        <ThreadActions thread={{ id: thread.id, status: thread.status }} />
      </div>
    </div>
  );
}

export default async function ThreadsPage() {
  const threads = await getData();

  const active = threads.filter((t: any) => t.status === "new");
  const dismissed = threads.filter((t: any) => t.status === "dismissed");

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-8">
      <header>
        <Link href="/admin/agents" className="text-sm text-blue-600 hover:underline">
          ← Back to agents
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Threads worth answering</h1>
        <p className="text-sm text-gray-600 mt-1">
          A daily scan of real Reddit threads about California landlord compliance —
          no drafting, no posting. Read one, answer it yourself in your own words,
          the same way the AB 1482 answers went up. Mark it "Not relevant" to clear
          it from the list.
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold mb-3">Worth a look ({active.length})</h2>
        <div className="space-y-3">
          {active.map((t: any) => (
            <ThreadCard key={t.id} thread={t} />
          ))}
          {active.length === 0 && (
            <p className="text-sm text-gray-500">
              Nothing new right now. The daily scan runs every morning.
            </p>
          )}
        </div>
      </section>

      {dismissed.length > 0 && (
        <details>
          <summary className="text-sm font-medium text-gray-500 cursor-pointer">
            Dismissed ({dismissed.length})
          </summary>
          <div className="space-y-3 mt-3">
            {dismissed.map((t: any) => (
              <ThreadCard key={t.id} thread={t} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
