// app/admin/agents/product-proposals/page.tsx
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import * as fs from "fs";
import * as path from "path";
import ProposalActions from "./ProposalActions";
import BacklogActions from "./BacklogActions";
import ImplementationPanel, { type Implementation } from "./ImplementationPanel";

export const dynamic = "force-dynamic";

// Walk app/ to find which routes are real. Proposals whose affected_route is
// not in this set get rendered as "Feature backlog" — no implement button,
// since the Dev agent can't ship a fix for a feature that doesn't exist.
const PAGE_FILES = ["page.tsx", "page.ts", "page.jsx", "page.js"];

function listRealRoutes(): Set<string> {
  const APP_DIR = path.join(process.cwd(), "app");
  const out = new Set<string>();
  function recurse(absDir: string, segs: string[]) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    if (
      PAGE_FILES.some((f) =>
        entries.some((e) => e.isFile() && e.name === f)
      )
    ) {
      const r = "/" + segs.filter(Boolean).join("/");
      out.add(r === "/" ? "/" : r.replace(/\/$/, ""));
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const n = e.name;
      if (n.startsWith("_") || n.startsWith("@") || n === "api" || n === "node_modules") continue;
      const isGroup = /^\(.+\)$/.test(n);
      recurse(path.join(absDir, n), isGroup ? segs : [...segs, n]);
    }
  }
  recurse(APP_DIR, []);
  return out;
}

type Proposal = {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  affected_route: string | null;
  status: "proposed" | "approved" | "in_progress" | "shipped" | "rejected";
  proposed_by_agent: string;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
  decision_note: string | null;
};

async function getData(): Promise<{
  proposals: Proposal[];
  implementationsByProposal: Record<string, Implementation>;
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const [{ data: proposals }, { data: implementations }] = await Promise.all([
    supabase
      .from("product_proposals")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("proposal_implementations")
      .select("*")
      .order("started_at", { ascending: false }),
  ]);

  // Map most-recent implementation per proposal
  const byProposal: Record<string, Implementation> = {};
  for (const impl of (implementations as Implementation[] | null) ?? []) {
    if (!byProposal[impl.proposal_id]) byProposal[impl.proposal_id] = impl;
  }

  return {
    proposals: (proposals as Proposal[] | null) ?? [],
    implementationsByProposal: byProposal,
  };
}

const severityColors: Record<Proposal["severity"], string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-gray-100 text-gray-700 border-gray-200",
};

const statusColors: Record<Proposal["status"], string> = {
  proposed: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  in_progress: "bg-purple-100 text-purple-800",
  shipped: "bg-emerald-100 text-emerald-800",
  rejected: "bg-gray-100 text-gray-600",
};

function severityRank(s: Proposal["severity"]): number {
  return { critical: 0, high: 1, medium: 2, low: 3 }[s];
}

function ProposalCard({
  proposal,
  implementation,
  isBacklog = false,
}: {
  proposal: Proposal;
  implementation?: Implementation;
  isBacklog?: boolean;
}) {
  const preview = (proposal.description || "").slice(0, 280).trim();

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                severityColors[proposal.severity]
              }`}
            >
              {proposal.severity}
            </span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded ${
                statusColors[proposal.status]
              }`}
            >
              {proposal.status.replace("_", " ")}
            </span>
            <span className="text-xs text-gray-500">
              by {proposal.proposed_by_agent}
            </span>
            {proposal.affected_route && (
              <Link
                href={proposal.affected_route.replace(/\[[^\]]+\]/g, "")}
                className="text-xs text-blue-600 hover:underline font-mono"
              >
                {proposal.affected_route} →
              </Link>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 mt-2">{proposal.title}</h3>
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {new Date(proposal.created_at).toLocaleDateString()}
        </span>
      </div>

      <details className="mt-3">
        <summary className="text-xs text-gray-500 cursor-pointer">
          Read full proposal
        </summary>
        <pre className="mt-2 text-sm whitespace-pre-wrap bg-gray-50 border rounded p-3 max-h-96 overflow-auto font-sans">
          {proposal.description}
        </pre>
      </details>

      {!proposal.description.startsWith(preview) ? null : (
        <p className="text-sm text-gray-600 mt-2 line-clamp-3">{preview}</p>
      )}

      {proposal.decision_note && !isBacklog && (
        <p className="text-xs text-gray-500 mt-2 italic">
          Decision: {proposal.decision_note}
          {proposal.decided_at &&
            ` · ${new Date(proposal.decided_at).toLocaleDateString()}`}
        </p>
      )}

      {isBacklog ? (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
          <strong>Backlog idea — feature not built yet.</strong> The route{" "}
          <code className="font-mono">{proposal.affected_route}</code> doesn&apos;t
          exist in <code>app/</code>. Two options:{" "}
          <strong>Scaffold this route</strong> fires the Dev agent in stub-mode
          (creates a placeholder page so the CPO can iterate), or{" "}
          <strong>Dismiss</strong> if you don&apos;t want to build it.
          <BacklogActions proposalId={proposal.id} />
        </div>
      ) : (
        <ProposalActions
          proposal={{ id: proposal.id, status: proposal.status }}
        />
      )}

      {/* Show implementation panel only on Active proposals or when a Scaffold
          attempt is in flight (status indicates it's actively doing something).
          On backlog items, old failed implementations are noise — those failed
          because the route didn't exist, which is the whole reason it's in backlog. */}
      {implementation &&
        (!isBacklog ||
          [
            "agent_running",
            "pr_open",
            "preview_ready",
            "auto_merging",
            "merged",
            "shipped",
          ].includes(implementation.status)) && (
          <ImplementationPanel implementation={implementation} />
        )}
    </div>
  );
}


export default async function ProductProposalsPage() {
  const { proposals, implementationsByProposal } = await getData();
  const realRoutes = listRealRoutes();
  const isRealRoute = (route: string | null) =>
    route != null && realRoutes.has(route);

  // Split open proposals into "active" (real route — can implement) and
  // "backlog" (fake route — needs feature build first, no implement button).
  const allOpen = proposals
    .filter((p) => ["proposed", "approved", "in_progress"].includes(p.status))
    .sort((a, b) => {
      const r = severityRank(a.severity) - severityRank(b.severity);
      if (r !== 0) return r;
      return b.created_at.localeCompare(a.created_at);
    });
  const active = allOpen.filter((p) => isRealRoute(p.affected_route));
  const backlog = allOpen.filter((p) => !isRealRoute(p.affected_route));
  const shipped = proposals.filter((p) => p.status === "shipped");
  const rejected = proposals.filter((p) => p.status === "rejected");

  const bySeverity: Record<Proposal["severity"], Proposal[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };
  for (const p of active) bySeverity[p.severity].push(p);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <header>
        <Link
          href="/admin/agents"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to agents
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Product proposals</h1>
        <p className="text-sm text-gray-600 mt-1">
          The CPO files UX improvement proposals here. Each is judged against
          the 5 UX principles in <code>lib/agents/cpo/context.md</code>. Approve
          to move to the build queue, reject with a note to teach the CPO what
          you don&apos;t want.
        </p>
        <div className="mt-3 text-xs text-gray-500">
          {active.length} active · {backlog.length} backlog ·{" "}
          {shipped.length} shipped · {rejected.length} rejected
        </div>
      </header>

      {/* Active proposals — routes exist, Approve & implement works */}
      {active.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">
            Active proposals
          </h2>
          {(["critical", "high", "medium", "low"] as const).map((sev) => {
            const items = bySeverity[sev];
            if (items.length === 0) return null;
            return (
              <section key={sev} className="mb-6">
                <h3 className="text-sm font-semibold text-gray-600 mb-2 capitalize">
                  {sev} ({items.length})
                </h3>
                <div className="space-y-3">
                  {items.map((p) => (
                    <ProposalCard
                      key={p.id}
                      proposal={p}
                      implementation={implementationsByProposal[p.id]}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Feature backlog — routes don't exist, ideas only */}
      {backlog.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-3 text-amber-900">
            Feature backlog ({backlog.length})
          </h2>
          <p className="text-sm text-gray-600 mb-3">
            Ideas the CPO filed against routes that don&apos;t exist in{" "}
            <code>app/</code> yet. Read them as a wishlist for what to build
            next; the Dev agent can&apos;t implement them until the underlying
            feature exists. Dismiss any you&apos;ve internalized or don&apos;t
            care about.
          </p>
          <div className="space-y-3">
            {backlog.map((p) => (
              <ProposalCard
                key={p.id}
                proposal={p}
                implementation={implementationsByProposal[p.id]}
                isBacklog
              />
            ))}
          </div>
        </div>
      )}

      {active.length === 0 && backlog.length === 0 && (
        <p className="text-sm text-gray-500">
          No open proposals. Run the CPO from{" "}
          <Link
            href="/admin/agents"
            className="text-blue-600 hover:underline"
          >
            /admin/agents
          </Link>{" "}
          to generate some.
        </p>
      )}

      {shipped.length > 0 && (
        <details>
          <summary className="text-sm font-medium text-gray-500 cursor-pointer">
            Shipped ({shipped.length})
          </summary>
          <div className="space-y-3 mt-3">
            {shipped.map((p) => (
              <ProposalCard key={p.id} proposal={p} />
            ))}
          </div>
        </details>
      )}

      {rejected.length > 0 && (
        <details>
          <summary className="text-sm font-medium text-gray-500 cursor-pointer">
            Rejected ({rejected.length})
          </summary>
          <div className="space-y-3 mt-3">
            {rejected.map((p) => (
              <ProposalCard key={p.id} proposal={p} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
