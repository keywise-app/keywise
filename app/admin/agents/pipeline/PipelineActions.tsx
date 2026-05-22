"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status =
  | "proposed"
  | "approved"
  | "queued"
  | "in_progress"
  | "shipped"
  | "rejected"
  | "failed";

type Action = "approve" | "reject" | "ship" | "requeue";

export default function PipelineActions({
  item,
}: {
  item: { id: string; status: Status; hasPR: boolean };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: Action) {
    let note: string | undefined;
    if (action === "reject") {
      const input = window.prompt(
        "Why are you rejecting this? (Teaches the proposing agent what not to suggest.)",
      );
      if (input === null) return;
      note = input.trim() || "rejected";
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/agents/pipeline/${item.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (err) {
      alert(`Failed: ${err}`);
    } finally {
      setBusy(false);
    }
  }

  // 44px tap targets, mobile-friendly.
  const btn =
    "px-4 py-2.5 rounded text-sm font-semibold disabled:opacity-50 min-h-[44px] flex-grow sm:flex-grow-0";

  if (item.status === "proposed") {
    return (
      <div className="flex gap-2 mt-3 flex-wrap">
        <button
          onClick={() => act("approve")}
          disabled={busy}
          className={`${btn} bg-emerald-600 text-white`}
          title="Move to queued — the dev agent will pick it up on its next pass."
        >
          {busy ? "Working…" : "Approve →"}
        </button>
        <button
          onClick={() => act("reject")}
          disabled={busy}
          className={`${btn} bg-white border text-gray-700`}
        >
          Reject
        </button>
      </div>
    );
  }

  if (item.status === "in_progress" && item.hasPR) {
    return (
      <div className="flex gap-2 mt-3 flex-wrap">
        <button
          onClick={() => act("ship")}
          disabled={busy}
          className={`${btn} bg-emerald-600 text-white`}
          title="Use this after you've merged the PR."
        >
          Mark shipped →
        </button>
      </div>
    );
  }

  if (item.status === "in_progress" && !item.hasPR) {
    return (
      <div className="flex gap-2 mt-3 flex-wrap">
        <button
          onClick={() => act("ship")}
          disabled={busy}
          className={`${btn} bg-emerald-600 text-white`}
        >
          Mark shipped →
        </button>
        <span className="text-xs text-gray-500 self-center">
          (no PR — marketing draft or content publish)
        </span>
      </div>
    );
  }

  if (item.status === "failed") {
    return (
      <div className="flex gap-2 mt-3 flex-wrap">
        <button
          onClick={() => act("requeue")}
          disabled={busy}
          className={`${btn} bg-white border text-gray-700`}
        >
          Requeue
        </button>
        <button
          onClick={() => act("reject")}
          disabled={busy}
          className={`${btn} bg-white border text-gray-700`}
        >
          Reject
        </button>
      </div>
    );
  }

  return null;
}
