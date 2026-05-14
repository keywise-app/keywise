// app/admin/agents/RunButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { agentFetch } from "./lib/agentFetch";

export default function RunButton({
  role,
  task,
}: {
  role: string;
  task: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await agentFetch(`/api/agents/${role}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task }),
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
    <button
      onClick={run}
      disabled={busy}
      className="text-xs px-3 py-2 border rounded hover:bg-gray-50 disabled:opacity-50 min-h-[40px] flex-grow sm:flex-grow-0"
    >
      {busy ? "Running…" : `Run: ${task}`}
    </button>
  );
}
