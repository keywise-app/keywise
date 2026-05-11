"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BlogDraftActions({
  draft,
}: {
  draft: { id: string; slug: string; status: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "publish" | "unpublish" | "archive") {
    setBusy(true);
    try {
      const res = await fetch(`/api/agents/blog-drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (err) {
      alert(`Failed: ${err}`);
    } finally {
      setBusy(false);
    }
  }

  if (draft.status === "draft") {
    return (
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => act("publish")}
          disabled={busy}
          className="px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium disabled:opacity-50"
        >
          Publish →
        </button>
        <button
          onClick={() => act("archive")}
          disabled={busy}
          className="px-3 py-1.5 bg-white border text-gray-700 rounded text-sm disabled:opacity-50"
        >
          Archive
        </button>
      </div>
    );
  }

  if (draft.status === "published") {
    return (
      <div className="flex gap-2 mt-3">
        <a
          href={`https://keywise.app/blog/${draft.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium"
        >
          View live →
        </a>
        <button
          onClick={() => act("unpublish")}
          disabled={busy}
          className="px-3 py-1.5 bg-white border text-gray-700 rounded text-sm disabled:opacity-50"
        >
          Unpublish
        </button>
      </div>
    );
  }

  return null;
}
