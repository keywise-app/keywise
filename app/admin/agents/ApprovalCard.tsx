// app/admin/agents/ApprovalCard.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { agentFetch } from "./lib/agentFetch";

export default function ApprovalCard({ approval }: { approval: any }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

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
              {approval.role}
            </span>
            <span className="text-xs text-gray-500">·</span>
            <span className="text-xs text-gray-700">{approval.tool}</span>
            {approval.created_at && (
              <>
                <span className="text-xs text-gray-500">·</span>
                <span className="text-xs text-gray-400">
                  {new Date(approval.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
              </>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-900">{approval.reasoning}</p>
          {approval.estimated_impact && (
            <p className="text-xs text-amber-900 mt-1">
              Estimated impact: {approval.estimated_impact}
            </p>
          )}
          <details className="mt-2">
            <summary className="text-xs text-gray-600 cursor-pointer">
              View proposed action
            </summary>
            <pre className="mt-2 text-xs bg-white border rounded p-2 overflow-auto">
              {JSON.stringify(approval.proposed_input, null, 2)}
            </pre>
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
