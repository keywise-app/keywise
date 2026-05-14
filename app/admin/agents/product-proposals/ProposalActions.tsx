"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status =
  | "proposed"
  | "approved"
  | "in_progress"
  | "shipped"
  | "rejected";

type Action =
  | "approve"
  | "reject"
  | "start"
  | "ship"
  | "reopen";

export default function ProposalActions({
  proposal,
}: {
  proposal: { id: string; status: Status };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: Action) {
    let note: string | undefined;
    if (action === "reject") {
      const input = window.prompt(
        "Why are you rejecting this? (Teaches the CPO what not to propose again.)"
      );
      if (input === null) return; // canceled
      note = input.trim() || "rejected";
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/agents/product-proposals/${proposal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (err) {
      alert(`Failed: ${err}`);
    } finally {
      setBusy(false);
    }
  }

  const btn =
    "px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50";

  if (proposal.status === "proposed") {
    return (
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => act("approve")}
          disabled={busy}
          className={`${btn} bg-green-600 text-white`}
        >
          Approve →
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

  if (proposal.status === "approved") {
    return (
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => act("start")}
          disabled={busy}
          className={`${btn} bg-purple-600 text-white`}
        >
          Mark in progress →
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

  if (proposal.status === "in_progress") {
    return (
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => act("ship")}
          disabled={busy}
          className={`${btn} bg-emerald-600 text-white`}
        >
          Mark shipped →
        </button>
      </div>
    );
  }

  if (proposal.status === "rejected" || proposal.status === "shipped") {
    return (
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => act("reopen")}
          disabled={busy}
          className={`${btn} bg-white border text-gray-700`}
        >
          Reopen
        </button>
      </div>
    );
  }

  return null;
}
