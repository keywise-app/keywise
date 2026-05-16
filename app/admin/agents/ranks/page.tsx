// app/admin/agents/ranks/page.tsx
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Target = {
  id: string;
  keyword: string;
  intent: string | null;
  priority: number;
  target_position: number | null;
  notes: string | null;
};

type Snapshot = {
  keyword_id: string;
  recorded_on: string;
  position: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  url: string | null;
};

async function getData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: targets } = await supabase
    .from("keyword_targets")
    .select("*")
    .order("priority", { ascending: false });

  // Pull the last 35 days of snapshots in one query, then bucket per keyword
  // to find "latest" and "~7 days ago" for each.
  const cutoff = new Date(Date.now() - 35 * 86400_000)
    .toISOString()
    .slice(0, 10);
  const { data: snapshots } = await supabase
    .from("rank_snapshots")
    .select("keyword_id, recorded_on, position, impressions, clicks, ctr, url")
    .gte("recorded_on", cutoff)
    .order("recorded_on", { ascending: false });

  // Group by keyword_id
  const byKeyword: Record<string, Snapshot[]> = {};
  for (const s of (snapshots as Snapshot[] | null) ?? []) {
    if (!byKeyword[s.keyword_id]) byKeyword[s.keyword_id] = [];
    byKeyword[s.keyword_id].push(s);
  }

  // For each keyword, find latest + ~7-day-ago snapshot
  type Row = {
    target: Target;
    latest?: Snapshot;
    weekAgo?: Snapshot;
    delta?: number | null; // negative = improved (lower number = better rank)
    daysSinceLatest?: number;
  };
  const rows: Row[] = ((targets as Target[] | null) ?? []).map((t) => {
    const seq = byKeyword[t.id] ?? [];
    const latest = seq[0];
    let weekAgo: Snapshot | undefined;
    if (latest) {
      const latestDate = new Date(latest.recorded_on).getTime();
      // Find the snapshot closest to 7 days before latest
      const target7 = latestDate - 7 * 86400_000;
      let best: Snapshot | undefined;
      let bestDiff = Infinity;
      for (const s of seq.slice(1)) {
        const d = Math.abs(new Date(s.recorded_on).getTime() - target7);
        if (d < bestDiff) {
          bestDiff = d;
          best = s;
        }
      }
      weekAgo = best;
    }
    let delta: number | null | undefined;
    if (latest?.position != null && weekAgo?.position != null) {
      delta = Number(latest.position) - Number(weekAgo.position);
    } else if (latest?.position != null && weekAgo == null) {
      delta = null; // no comparison
    }
    const daysSinceLatest = latest
      ? Math.round(
          (Date.now() - new Date(latest.recorded_on).getTime()) / 86400_000
        )
      : undefined;
    return { target: t, latest, weekAgo, delta, daysSinceLatest };
  });

  return { rows, totalSnapshots: snapshots?.length ?? 0 };
}

function DeltaBadge({ delta }: { delta: number | null | undefined }) {
  if (delta == null) {
    return <span className="text-xs text-gray-400">—</span>;
  }
  if (Math.abs(delta) < 0.5) {
    return <span className="text-xs text-gray-500">flat</span>;
  }
  const improved = delta < 0; // lower position number = better rank
  return (
    <span
      className={`text-xs font-medium ${
        improved ? "text-green-700" : "text-amber-700"
      }`}
    >
      {improved ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}
    </span>
  );
}

export default async function RanksPage() {
  const { rows, totalSnapshots } = await getData();

  const hasData = rows.some((r) => r.latest != null);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8">
      <Link
        href="/admin/agents"
        className="text-sm text-blue-600 hover:underline"
      >
        ← Back to agents
      </Link>
      <h1 className="text-2xl font-semibold mt-2">Search rank tracker</h1>
      <p className="text-sm text-gray-600 mt-1">
        {rows.length} keywords tracked · {totalSnapshots} snapshots in the last
        35 days. The CMO snapshots daily via Search Console.
      </p>

      {!hasData && rows.length > 0 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm">
          No snapshots yet. The CMO records these via its{" "}
          <code>daily_audit</code> task. Trigger it manually from{" "}
          <Link href="/admin/agents" className="text-blue-600 hover:underline">
            /admin/agents
          </Link>{" "}
          or wait for the next cron run.
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm bg-white border rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Keyword</th>
                <th className="px-3 py-2 text-right">Latest</th>
                <th className="px-3 py-2 text-right hidden sm:table-cell">
                  7d Δ
                </th>
                <th className="px-3 py-2 text-right hidden sm:table-cell">
                  Target
                </th>
                <th className="px-3 py-2 text-right hidden md:table-cell">
                  Impressions
                </th>
                <th className="px-3 py-2 text-left hidden md:table-cell">
                  URL
                </th>
                <th className="px-3 py-2 text-right">As of</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ target: t, latest, delta, daysSinceLatest }) => {
                const pos = latest?.position;
                const onTrack =
                  pos != null && pos <= (t.target_position ?? 5);
                return (
                  <tr key={t.id} className="border-t">
                    <td className="px-3 py-2 font-medium">
                      {t.keyword}
                      <span className="ml-2 text-xs text-gray-400">
                        p{t.priority}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          pos == null
                            ? "bg-gray-100 text-gray-600"
                            : onTrack
                            ? "bg-green-100 text-green-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {pos == null
                          ? "not ranked"
                          : `#${Number(pos).toFixed(1)}`}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right hidden sm:table-cell">
                      <DeltaBadge delta={delta} />
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600 hidden sm:table-cell">
                      ≤{t.target_position ?? 5}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600 hidden md:table-cell">
                      {latest?.impressions ?? 0}
                    </td>
                    <td className="px-3 py-2 text-gray-600 truncate max-w-[200px] hidden md:table-cell">
                      {latest?.url ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-gray-500 whitespace-nowrap">
                      {daysSinceLatest == null
                        ? "—"
                        : daysSinceLatest === 0
                        ? "today"
                        : `${daysSinceLatest}d ago`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length === 0 && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded text-sm">
          No keyword targets yet. Add your first ones via SQL:
          <pre className="mt-2 bg-white border rounded p-2 text-xs overflow-x-auto">
{`insert into keyword_targets (keyword, intent, priority, target_position) values
  ('property management software', 'commercial', 5, 5),
  ('rent collection app', 'commercial', 5, 5),
  ('best landlord app', 'commercial', 4, 5),
  ('ai property management', 'commercial', 5, 3),
  ('how to manage rental properties', 'informational', 3, 8);`}
          </pre>
          Or call the rank_add_keyword_target tool from the agent itself.
        </div>
      )}
    </div>
  );
}
