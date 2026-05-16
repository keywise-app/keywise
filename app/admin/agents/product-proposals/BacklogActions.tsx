"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BacklogActions({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function scaffold() {
    const ok = window.confirm(
      "Fire the Dev agent in SCAFFOLD mode? It'll create a stub page at this route so the CPO can iterate on it. " +
        "This is NOT a full feature build — just a placeholder UI to make the route exist. " +
        "Cost: ~$0.50–$2 in Anthropic. Proceed?"
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/agents/product-proposals/${proposalId}/implement`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "scaffold" }),
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
    <div className="mt-3 flex gap-2 flex-wrap">
      <button
        onClick={scaffold}
        disabled={busy}
        className="text-xs px-3 py-2 bg-indigo-600 text-white rounded font-semibold hover:bg-indigo-700 disabled:opacity-50 min-h-[40px]"
        title="Create a stub page at this route so the CPO can audit and iterate on it"
      >
        {busy ? "Working…" : "Scaffold this route →"}
      </button>
      <button
        onClick={dismiss}
        disabled={busy}
        className="text-xs px-3 py-2 border border-amber-300 bg-white text-amber-900 rounded hover:bg-amber-100 disabled:opacity-50 min-h-[40px]"
      >
        Dismiss from backlog
      </button>
    </div>
  );
}
