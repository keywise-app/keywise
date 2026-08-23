// app/admin/agents/ApprovalCard.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { agentFetch } from "./lib/agentFetch";

// Plain-language label for a tool name, used only as a last-resort summary
// when neither proposed_input.title nor reasoning has anything usable.
const ROLE_LABELS: Record<string, string> = {
  cmo: "Marketing",
  dev: "Engineering",
};

const TOOL_LABELS: Record<string, string> = {
  content_publish_blog_post: "Publish a blog post",
  content_draft_blog_post: "Draft a new blog post",
  content_update_blog_post: "Update a published blog post",
  pseo_create_template: "Create a new page template",
  pseo_publish_pages: "Publish generated pages",
  pseo_generate_page: "Generate a new page",
};

function summarize(approval: any): string {
  const title = approval.proposed_input?.title;
  if (title) return title;
  if (approval.reasoning?.trim()) {
    const firstLine = approval.reasoning.trim().split("\n")[0];
    return firstLine.length > 140 ? firstLine.slice(0, 140) + "…" : firstLine;
  }
  return TOOL_LABELS[approval.tool] || `Run ${approval.tool}`;
}

export default function ApprovalCard({ approval }: { approval: any }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const summary = summarize(approval);

  async function decide(decision: "approved" | "rejected") {
    setBusy(true);
    try {
      const res = await agentFetch(`/api/agents/approvals/${approval.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note: note || undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (err) {
      alert(`Failed: ${err}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border rounded-lg p-4 bg-amber-50 border-amber-200">
      <div className="flex justify-between items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs uppercase tracking-wide text-amber-800 font-semibold">
              {ROLE_LABELS[approval.role] || approval.role}
            </span>
            {approval.created_at && (
              <>
                <span className="text-xs text-gray-500">·</span>
                <span className="text-xs text-gray-400">
                  {new Date(approval.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
              </>
            )}
          </div>
          <p className="mt-2 text-sm font-medium text-gray-900">{summary}</p>
          {approval.estimated_impact && (
            <p className="text-xs text-amber-900 mt-1">
              Estimated impact: {approval.estimated_impact}
            </p>
          )}
          <details className="mt-2">
            <summary className="text-xs text-gray-600 cursor-pointer">
              More detail
            </summary>
            <div className="mt-2 space-y-2">
              {approval.proposed_input?.description && (
                <p className="text-xs text-gray-700 whitespace-pre-wrap">{approval.proposed_input.description}</p>
              )}
              {approval.reasoning?.trim() && approval.reasoning.trim() !== summary && (
                <p className="text-xs text-gray-700 whitespace-pre-wrap">{approval.reasoning}</p>
              )}
              <pre className="text-xs bg-white border rounded p-2 overflow-auto">
                {JSON.stringify(approval.proposed_input, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      </div>

      <input
        type="text"
        placeholder="Optional note…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="mt-3 w-full border rounded px-2 py-1 text-sm"
      />

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => decide("approved")}
          disabled={busy}
          className="px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium disabled:opacity-50"
        >
          Approve & execute
        </button>
        <button
          onClick={() => decide("rejected")}
          disabled={busy}
          className="px-3 py-1.5 bg-white border text-gray-700 rounded text-sm disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
