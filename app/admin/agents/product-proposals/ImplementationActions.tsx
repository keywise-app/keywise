"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

type Action = "merge" | "retry" | "revert" | "screenshot";

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
      const res = await fetch(
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

  const btn = "px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50";

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

  if (implementation.status === "pr_open") {
    return (
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => act("screenshot")}
          disabled={busy}
          className={`${btn} bg-indigo-600 text-white`}
        >
          {busy ? "Capturing…" : "Capture preview screenshot"}
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
