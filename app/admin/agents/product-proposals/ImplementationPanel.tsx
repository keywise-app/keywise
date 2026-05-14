// app/admin/agents/product-proposals/ImplementationPanel.tsx
// Renders the Dev agent's progress for a proposal: status, PR link, screenshots.

import ImplementationActions from "./ImplementationActions";

export type Implementation = {
  id: string;
  proposal_id: string;
  status:
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
  agent_run_id: string | null;
  branch: string | null;
  pr_number: number | null;
  pr_url: string | null;
  preview_url: string | null;
  preview_screenshot_url: string | null;
  prod_screenshot_url: string | null;
  files_changed: string[] | null;
  diff_summary: string | null;
  agent_reasoning: string | null;
  cost_usd: number | null;
  error: string | null;
  started_at: string;
  pr_opened_at: string | null;
  preview_ready_at: string | null;
  merged_at: string | null;
  shipped_at: string | null;
};

const statusColors: Record<Implementation["status"], string> = {
  queued: "bg-gray-100 text-gray-700",
  agent_running: "bg-blue-100 text-blue-800",
  agent_failed: "bg-red-100 text-red-800",
  pr_open: "bg-purple-100 text-purple-800",
  preview_ready: "bg-indigo-100 text-indigo-800",
  auto_merging: "bg-amber-100 text-amber-800",
  merged: "bg-emerald-100 text-emerald-800",
  shipped: "bg-green-100 text-green-800",
  reverted: "bg-gray-100 text-gray-600",
  failed: "bg-red-100 text-red-800",
};

const statusLabels: Record<Implementation["status"], string> = {
  queued: "Queued",
  agent_running: "Agent writing code…",
  agent_failed: "Agent stopped",
  pr_open: "PR open, building preview…",
  preview_ready: "Preview ready",
  auto_merging: "Auto-merging…",
  merged: "Merged, deploying to prod…",
  shipped: "Shipped to production",
  reverted: "Reverted",
  failed: "Failed",
};

function StatusBadge({ status }: { status: Implementation["status"] }) {
  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded ${statusColors[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

export default function ImplementationPanel({
  implementation: i,
}: {
  implementation: Implementation;
}) {
  const isInFlight = ["queued", "agent_running", "pr_open", "auto_merging", "merged"].includes(i.status);
  const elapsedMin = Math.round(
    (Date.now() - new Date(i.started_at).getTime()) / 60000
  );

  return (
    <div className="mt-4 border-l-2 border-indigo-200 pl-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Implementation
        </span>
        <StatusBadge status={i.status} />
        {isInFlight && (
          <span className="text-xs text-gray-500">
            • started {elapsedMin}m ago
          </span>
        )}
        {i.cost_usd != null && (
          <span className="text-xs text-gray-500">
            • ${Number(i.cost_usd).toFixed(3)}
          </span>
        )}
      </div>

      {i.error && (
        <p className="text-sm text-red-700 mt-2 bg-red-50 p-2 rounded">
          <strong>Error:</strong> {i.error}
        </p>
      )}

      {i.agent_reasoning && (
        <details className="mt-2">
          <summary className="text-xs text-gray-500 cursor-pointer">
            Agent reasoning
          </summary>
          <pre className="mt-1 text-xs whitespace-pre-wrap bg-gray-50 border rounded p-2 max-h-40 overflow-auto font-sans">
            {i.agent_reasoning}
          </pre>
        </details>
      )}

      {i.files_changed && i.files_changed.length > 0 && (
        <div className="mt-2 text-xs text-gray-600">
          <span className="font-semibold">Files changed</span>
          {i.diff_summary && <span> · {i.diff_summary}</span>}
          <ul className="mt-1 ml-4 list-disc">
            {i.files_changed.map((f) => (
              <li key={f} className="font-mono">
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {i.pr_url && (
        <p className="text-xs mt-2">
          <a
            href={i.pr_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            PR #{i.pr_number} →
          </a>
          {i.preview_url && (
            <>
              {" · "}
              <a
                href={i.preview_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Preview deploy →
              </a>
            </>
          )}
        </p>
      )}

      {(i.preview_screenshot_url || i.prod_screenshot_url) && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {i.preview_screenshot_url && (
            <figure>
              <img
                src={i.preview_screenshot_url}
                alt="Preview screenshot"
                className="w-full border rounded"
                loading="lazy"
              />
              <figcaption className="text-xs text-gray-500 mt-1 text-center">
                Preview deploy
              </figcaption>
            </figure>
          )}
          {i.prod_screenshot_url && (
            <figure>
              <img
                src={i.prod_screenshot_url}
                alt="Production screenshot"
                className="w-full border rounded"
                loading="lazy"
              />
              <figcaption className="text-xs text-gray-500 mt-1 text-center">
                Production · shipped{" "}
                {i.shipped_at &&
                  new Date(i.shipped_at).toLocaleString()}
              </figcaption>
            </figure>
          )}
        </div>
      )}

      <ImplementationActions
        implementation={{
          id: i.id,
          status: i.status,
          pr_url: i.pr_url,
          proposal_id: i.proposal_id,
        }}
      />
    </div>
  );
}
