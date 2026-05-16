"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BacklogActions({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function dismiss() {
    const note = window.prompt(
      "Dismiss this backlog idea? Add an optional note (or leave blank).",
      ""
    );
    if (note === null) return; // canceled
    setBusy(true);
    try {
      const res = await fetch(`/api/agents/product-proposals/${proposalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          note: note.trim() || "Dismissed from feature backlog",
        }),
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
    <div className="mt-2">
      <button
        onClick={dismiss}
        disabled={busy}
        className="text-xs px-2 py-1 border border-amber-300 bg-white text-amber-900 rounded hover:bg-amber-100 disabled:opacity-50"
      >
        {busy ? "Dismissing…" : "Dismiss from backlog"}
      </button>
    </div>
  );
}
