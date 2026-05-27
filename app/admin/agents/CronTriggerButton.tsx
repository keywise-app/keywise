// app/admin/agents/CronTriggerButton.tsx
"use client";

import { useState } from "react";
import { agentFetch } from "./lib/agentFetch";

export default function CronTriggerButton({
  label,
  endpoint,
}: {
  label: string;
  endpoint: string;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const res = await agentFetch(endpoint);
      if (!res.ok) throw new Error(await res.text());
      setResult("Done");
    } catch (err) {
      setResult(`Failed: ${err}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={run}
        disabled={busy}
        className="text-xs px-3 py-2 border rounded hover:bg-gray-50 disabled:opacity-50 min-h-[40px]"
      >
        {busy ? "Running..." : label}
      </button>
      {result && (
        <span className={`text-xs ${result.startsWith("Failed") ? "text-red-500" : "text-green-600"}`}>
          {result}
        </span>
      )}
    </div>
  );
}
