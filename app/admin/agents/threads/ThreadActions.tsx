"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { agentFetch } from "../lib/agentFetch";

export default function ThreadActions({
  thread,
}: {
  thread: { id: string; status: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "dismiss" | "reopen") {
    setBusy(true);
    try {
      const res = await agentFetch(`/api/agents/threads/${thread.id}`, {
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

  if (thread.status === "dismissed") {
    return (
      <button
        onClick={() => act("reopen")}
        disabled={busy}
        className="px-3 py-1.5 bg-white border text-gray-700 rounded text-sm disabled:opacity-50"
      >
        Bring back
      </button>
    );
  }

  return (
    <button
      onClick={() => act("dismiss")}
      disabled={busy}
      className="px-3 py-1.5 bg-white border text-gray-700 rounded text-sm disabled:opacity-50"
    >
      Not relevant
    </button>
  );
}
