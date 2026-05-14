"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { agentFetch } from "../lib/agentFetch";

type Status =
  | "queued"
  | "agent_running"
  | "agent_failed"
  | "pr_open"
  | "preview_ready"
  | "auto_merging"
  | "merged"
  | "shipped"
  | "reverted"
  | "failed";

type Action =
  | "merge"
  | "retry"
  | "revert"
  | "screenshot"
  | "mark_shipped"
  | "sync";

export default function ImplementationActions({
  implementation,
}: {
  implementation: {
    id: string;
    status: Status;
    pr_url: string | null;
    proposal_id: string;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: Action) {
    if (action === "revert") {
      const ok = window.confirm(
        "Open a revert PR for this shipped change? It will auto-merge."
      );
      if (!ok) return;
    }
    setBusy(true);
    try {
      const res = await agentFetch(
        `/api/agents/implementations/${implementation.id}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (err) {
      alert(`Failed: ${err}`);
    } finally {
      setBusy(false);
    }
  }

  const btn =
    "px-4 py-2.5 rounded text-sm font-semibold disabled:opacity-50 min-h-[44px] flex-grow sm:flex-grow-0";

  // Only render action buttons when the implementation is at a decision point
  if (implementation.status === "preview_ready") {
    return (
      <div className="flex gap-2 mt-3 flex-wrap">
        <button
          onClick={() => act("merge")}
          disabled={busy}
          className={`${btn} bg-emerald-600 text-white`}
        >
          {busy ? "Merging…" : "Merge to main →"}
        </button>
        <button
          onClick={() => act("screenshot")}
          disabled={busy}
          className={`${btn} bg-white border text-gray-700`}
          title="Recapture the preview screenshot"
        >
          Re-screenshot
        </button>
      </div>
    );
  }

  if (implementation.status === "pr_open" || implementation.status === "auto_merging" || implementation.status === "merged") {
    return (
      <div className="flex gap-2 mt-3 flex-wrap">
        <button
          onClick={() => act("sync")}
          disabled={busy}
          className={`${btn} bg-indigo-600 text-white`}
          title="Poll GitHub for current PR status — updates the row if it's already merged on GitHub but the dashboard didn't catch up"
        >
          {busy ? "Syncing…" : "Sync from GitHub"}
        </button>
        {implementation.status === "pr_open" && (
          <button
            onClick={() => act("screenshot")}
            disabled={busy}
            className={`${btn} bg-white border text-gray-700`}
          >
            Capture preview screenshot
          </button>
        )}
        <button
          onClick={() => act("mark_shipped")}
          disabled={busy}
          className={`${btn} bg-white border border-emerald-300 text-emerald-700`}
          title="If the PR has already been merged and deployed but the dashboard is stuck, mark this shipped manually"
        >
          Mark shipped manually
        </button>
      </div>
    );
  }

  if (implementation.status === "agent_failed" || implementation.status === "failed") {
    return (
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => act("retry")}
          disabled={busy}
          className={`${btn} bg-white border text-gray-700`}
        >
          Retry
        </button>
      </div>
    );
  }

  if (implementation.status === "shipped") {
    return (
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => act("revert")}
          disabled={busy}
          className={`${btn} bg-white border border-red-200 text-red-700`}
        >
          {busy ? "Reverting…" : "Revert"}
        </button>
      </div>
    );
  }

  return null;
}
