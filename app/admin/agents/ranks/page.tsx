// app/admin/agents/ranks/page.tsx
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Latest snapshot per keyword
  const { data: latest } = await supabase.rpc("latest_ranks");
  // Fall back to manual query if RPC doesn't exist
  const ranks = latest ?? [];

  const { data: targets } = await supabase
    .from("keyword_targets")
    .select("*")
    .order("priority", { ascending: false });

  return { ranks, targets: targets ?? [] };
}

export default async function RanksPage() {
  const { ranks, targets } = await getData();

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link
        href="/admin/agents"
        className="text-sm text-blue-600 hover:underline"
      >
        ← Back to agents
      </Link>
      <h1 className="text-2xl font-semibold mt-2">Search rank tracker</h1>
      <p className="text-sm text-gray-600 mt-1 mb-6">
        {targets.length} keywords tracked. Daily snapshot via Search Console.
      </p>

      <table className="w-full text-sm bg-white border rounded-lg overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left">Keyword</th>
            <th className="px-3 py-2 text-left">Priority</th>
            <th className="px-3 py-2 text-right">Position</th>
            <th className="px-3 py-2 text-right">Target</th>
            <th className="px-3 py-2 text-left">URL</th>
          </tr>
        </thead>
        <tbody>
          {targets.map((t: any) => {
            const r = ranks.find((x: any) => x.keyword === t.keyword);
            const pos = r?.position;
            const onTrack = pos != null && pos <= (t.target_position ?? 5);
            return (
              <tr key={t.id} className="border-t">
                <td className="px-3 py-2">{t.keyword}</td>
                <td className="px-3 py-2">{t.priority}</td>
                <td className="px-3 py-2 text-right">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      pos == null
                        ? "bg-gray-100 text-gray-600"
                        : onTrack
                        ? "bg-green-100 text-green-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {pos == null ? "not in top 100" : `#${Number(pos).toFixed(1)}`}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-gray-600">
                  ≤{t.target_position ?? 5}
                </td>
                <td className="px-3 py-2 text-gray-600 truncate max-w-[200px]">
                  {r?.url ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {targets.length === 0 && (
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
