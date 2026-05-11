import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import BlogDraftActions from "./BlogDraftActions";

export const dynamic = "force-dynamic";

async function getData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabase
    .from("blog_drafts")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

function DraftCard({ draft }: { draft: any }) {
  const preview = (draft.markdown || "").slice(0, 200).trim();
  const statusColors: Record<string, string> = {
    draft: "bg-amber-100 text-amber-800",
    published: "bg-green-100 text-green-800",
    archived: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded ${
                statusColors[draft.status] || statusColors.draft
              }`}
            >
              {draft.status}
            </span>
            {draft.target_keyword && (
              <span className="text-xs text-gray-500">
                keyword: {draft.target_keyword}
              </span>
            )}
            {draft.word_count && (
              <span className="text-xs text-gray-500">
                {draft.word_count} words
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 mt-2">{draft.title}</h3>
          {draft.meta_description && (
            <p className="text-sm text-gray-600 mt-1">
              {draft.meta_description}
            </p>
          )}
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {new Date(draft.created_at).toLocaleDateString()}
        </span>
      </div>

      {draft.rationale && (
        <p className="text-xs text-gray-500 mt-2 italic">
          Why: {draft.rationale}
        </p>
      )}

      <details className="mt-3">
        <summary className="text-xs text-gray-500 cursor-pointer">
          Preview content
        </summary>
        <pre className="mt-2 text-sm whitespace-pre-wrap bg-gray-50 border rounded p-3 max-h-48 overflow-auto">
          {preview}
          {draft.markdown?.length > 200 ? "…" : ""}
        </pre>
      </details>

      {draft.status === "published" && draft.published_at && (
        <p className="text-xs text-green-700 mt-2">
          Published{" "}
          {new Date(draft.published_at).toLocaleDateString()} at{" "}
          <a
            href={`https://keywise.app/blog/${draft.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            /blog/{draft.slug}
          </a>
        </p>
      )}

      <BlogDraftActions
        draft={{ id: draft.id, slug: draft.slug, status: draft.status }}
      />
    </div>
  );
}

export default async function BlogDraftsPage() {
  const drafts = await getData();

  const pending = drafts.filter((d: any) => d.status === "draft");
  const published = drafts.filter((d: any) => d.status === "published");
  const archived = drafts.filter((d: any) => d.status === "archived");

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
      <header>
        <Link
          href="/admin/agents"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to agents
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Blog drafts</h1>
        <p className="text-sm text-gray-600 mt-1">
          The CMO drafts SEO blog posts here. Review, edit in Supabase if
          needed, then publish to make them live at /blog/slug.
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold mb-3">
          Pending review ({pending.length})
        </h2>
        <div className="space-y-3">
          {pending.map((d: any) => (
            <DraftCard key={d.id} draft={d} />
          ))}
          {pending.length === 0 && (
            <p className="text-sm text-gray-500">
              No drafts waiting for review. The CMO creates drafts during its
              weekly_content task.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">
          Live posts ({published.length})
        </h2>
        <div className="space-y-3">
          {published.map((d: any) => (
            <DraftCard key={d.id} draft={d} />
          ))}
          {published.length === 0 && (
            <p className="text-sm text-gray-500">
              No agent-published posts yet. Publish a draft above to see it
              here.
            </p>
          )}
        </div>
      </section>

      {archived.length > 0 && (
        <details>
          <summary className="text-sm font-medium text-gray-500 cursor-pointer">
            Archived ({archived.length})
          </summary>
          <div className="space-y-3 mt-3">
            {archived.map((d: any) => (
              <DraftCard key={d.id} draft={d} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
