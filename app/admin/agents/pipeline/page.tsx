// app/admin/agents/pipeline/page.tsx
// Unified build pipeline — every agent's proposals land here in one queue.
//
// Mobile-first. Triage from your phone.

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import PipelineActions from "./PipelineActions";

export const dynamic = "force-dynamic";

type Priority = "critical" | "high" | "medium" | "low";
type Status =
  | "proposed"
  | "approved"
  | "queued"
  | "in_progress"
  | "shipped"
  | "rejected"
  | "failed";
type Category = "feature" | "bug" | "content" | "marketing" | "infra";

type Item = {
  id: string;
  title: string;
  description: string;
  source_agent: string;
  category: Category;
  priority: Priority;
  status: Status;
  affected_files: string[] | null;
  depends_on: string[] | null;
  pr_url: string | null;
  preview_url: string | null;
  rationale: string | null;
  created_at: string;
  approved_at: string | null;
  shipped_at: string | null;
  decided_by: string | null;
  decision_note: string | null;
};

async function getData(searchParams: {
  category?: string;
  source?: string;
  showShipped?: string;
}): Promise<Item[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  let query = supabase
    .from("build_queue")
    .select("*")
    .order("created_at", { ascending: false });
  if (searchParams.category) query = query.eq("category", searchParams.category);
  if (searchParams.source) query = query.eq("source_agent", searchParams.source);
  if (searchParams.showShipped !== "1") {
    query = query.not("status", "in", '("shipped","rejected")');
  }
  const { data } = await query;
  return ((data as Item[] | null) ?? []);
}

const priorityColors: Record<Priority, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-gray-100 text-gray-700 border-gray-200",
};

const statusColors: Record<Status, string> = {
  proposed: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  queued: "bg-cyan-100 text-cyan-800",
  in_progress: "bg-purple-100 text-purple-800",
  shipped: "bg-emerald-100 text-emerald-800",
  rejected: "bg-gray-100 text-gray-600",
  failed: "bg-red-100 text-red-700",
};

const categoryColors: Record<Category, string> = {
  feature: "bg-indigo-50 text-indigo-700 border-indigo-200",
  bug: "bg-rose-50 text-rose-700 border-rose-200",
  content: "bg-teal-50 text-teal-700 border-teal-200",
  marketing: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  infra: "bg-slate-50 text-slate-700 border-slate-200",
};

const SOURCES = ["cpo", "cmo", "competitive_intel", "manual"];
const CATEGORIES: Category[] = ["feature", "bug", "content", "marketing", "infra"];

function PipelineCard({ item }: { item: Item }) {
  const autoShips = item.category === "content";
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${priorityColors[item.priority]}`}>
              {item.priority}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${statusColors[item.status]}`}>
              {item.status.replace("_", " ")}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${categoryColors[item.category]}`}>
              {item.category}
              {autoShips ? " · auto-ships" : ""}
            </span>
            <span className="text-xs text-gray-500">from {item.source_agent}</span>
          </div>
          <h3 className="font-semibold text-gray-900 mt-2">{item.title}</h3>
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {new Date(item.created_at).toLocaleDateString()}
        </span>
      </div>

      <details className="mt-3">
        <summary className="text-xs text-gray-500 cursor-pointer">Read full description</summary>
        <pre className="mt-2 text-sm whitespace-pre-wrap bg-gray-50 border rounded p-3 max-h-96 overflow-auto font-sans">
          {item.description}
        </pre>
        {item.rationale && (
          <p className="text-xs text-gray-500 mt-2">
            <strong>Rationale:</strong> {item.rationale}
          </p>
        )}
        {item.affected_files && item.affected_files.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            <strong>Affected files:</strong>{" "}
            <code className="font-mono">{item.affected_files.join(", ")}</code>
          </p>
        )}
      </details>

      {(item.pr_url || item.preview_url) && (
        <div className="flex gap-3 mt-3 flex-wrap text-sm">
          {item.pr_url && (
            <a
              href={item.pr_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              Review PR ↗
            </a>
          )}
          {item.preview_url && (
            <a
              href={item.preview_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              Preview ↗
            </a>
          )}
        </div>
      )}

      {item.decision_note && (
        <p className="text-xs text-gray-500 mt-2 italic">
          Decision: {item.decision_note}
          {item.approved_at && ` · ${new Date(item.approved_at).toLocaleDateString()}`}
        </p>
      )}

      <PipelineActions
        item={{ id: item.id, status: item.status, hasPR: !!item.pr_url }}
      />
    </div>
  );
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; source?: string; showShipped?: string }>;
}) {
  const params = await searchParams;
  const items = await getData(params);

  // Group by status
  const groups: Record<string, Item[]> = {
    proposed: [],
    approved_or_queued: [],
    in_progress: [],
    failed: [],
    shipped: [],
  };
  for (const it of items) {
    if (it.status === "proposed") groups.proposed.push(it);
    else if (it.status === "approved" || it.status === "queued")
      groups.approved_or_queued.push(it);
    else if (it.status === "in_progress") groups.in_progress.push(it);
    else if (it.status === "failed") groups.failed.push(it);
    else if (it.status === "shipped") groups.shipped.push(it);
  }

  function FilterLink({
    href,
    active,
    children,
  }: {
    href: string;
    active: boolean;
    children: React.ReactNode;
  }) {
    return (
      <Link
        href={href}
        className={`text-xs px-2.5 py-1.5 rounded border min-h-[36px] inline-flex items-center ${
          active
            ? "bg-gray-900 text-white border-gray-900"
            : "bg-white text-gray-700 border-gray-300"
        }`}
      >
        {children}
      </Link>
    );
  }

  function qs(overrides: Record<string, string | undefined>): string {
    const next = { ...params, ...overrides };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
    }
    const s = sp.toString();
    return s ? `?${s}` : "";
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Build Pipeline</h1>
        <Link href="/admin/agents" className="text-sm text-blue-600 hover:underline">
          ← Back
        </Link>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Every proposal from every agent lands here. <strong>Content</strong> auto-ships.{" "}
        <strong>Marketing</strong> drafts wait for you. <strong>Feature / bug / infra</strong>{" "}
        always require PR merge.
      </p>

      {/* Filters */}
      <div className="sticky top-0 bg-gray-50/95 backdrop-blur z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 border-y mb-4">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-500 mr-1">Category:</span>
          <FilterLink href={qs({ category: undefined })} active={!params.category}>
            All
          </FilterLink>
          {CATEGORIES.map((c) => (
            <FilterLink key={c} href={qs({ category: c })} active={params.category === c}>
              {c}
            </FilterLink>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center mt-2">
          <span className="text-xs text-gray-500 mr-1">Source:</span>
          <FilterLink href={qs({ source: undefined })} active={!params.source}>
            All
          </FilterLink>
          {SOURCES.map((s) => (
            <FilterLink key={s} href={qs({ source: s })} active={params.source === s}>
              {s}
            </FilterLink>
          ))}
          <span className="ml-auto">
            <FilterLink
              href={qs({ showShipped: params.showShipped === "1" ? undefined : "1" })}
              active={params.showShipped === "1"}
            >
              {params.showShipped === "1" ? "Hide shipped" : "Show shipped"}
            </FilterLink>
          </span>
        </div>
      </div>

      {items.length === 0 && (
        <p className="text-gray-500 text-sm py-12 text-center">
          No items match the current filters.
        </p>
      )}

      {groups.proposed.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            Proposed ({groups.proposed.length})
          </h2>
          <div className="space-y-3">
            {groups.proposed.map((it) => (
              <PipelineCard key={it.id} item={it} />
            ))}
          </div>
        </section>
      )}

      {groups.approved_or_queued.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            Approved / queued ({groups.approved_or_queued.length})
          </h2>
          <div className="space-y-3">
            {groups.approved_or_queued.map((it) => (
              <PipelineCard key={it.id} item={it} />
            ))}
          </div>
        </section>
      )}

      {groups.in_progress.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            In progress ({groups.in_progress.length})
          </h2>
          <div className="space-y-3">
            {groups.in_progress.map((it) => (
              <PipelineCard key={it.id} item={it} />
            ))}
          </div>
        </section>
      )}

      {groups.failed.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            Failed ({groups.failed.length})
          </h2>
          <div className="space-y-3">
            {groups.failed.map((it) => (
              <PipelineCard key={it.id} item={it} />
            ))}
          </div>
        </section>
      )}

      {groups.shipped.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            Shipped ({groups.shipped.length})
          </h2>
          <div className="space-y-3">
            {groups.shipped.map((it) => (
              <PipelineCard key={it.id} item={it} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
