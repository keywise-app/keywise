// app/admin/agents/page.tsx
import { createClient } from "@supabase/supabase-js";
import { roles } from "@/agents-framework/registry";
import Link from "next/link";
import RunButton from "./RunButton";
import ApprovalCard from "./ApprovalCard";

export const dynamic = "force-dynamic";

async function getData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [{ data: runs }, { data: approvals }, { data: actions }] =
    await Promise.all([
      supabase
        .from("agent_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20),
      supabase
        .from("agent_approvals")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("agent_actions")
        .select("*")
        .eq("status", "executed")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  return {
    runs: runs ?? [],
    approvals: approvals ?? [],
    actions: actions ?? [],
  };
}

export default async function AgentsPage() {
  const { runs, approvals, actions } = await getData();

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-10">
      <header>
        <h1 className="text-2xl font-semibold">Your virtual team</h1>
        <p className="text-sm text-gray-600 mt-1">
          Agents working on Keywise. Approvals come here; everything else
          they handle on their own.
        </p>
        <nav className="mt-4 flex gap-3 text-sm">
          <Link
            href="/admin/agents/forum-drafts"
            className="px-3 py-1.5 border rounded hover:bg-gray-50"
          >
            Forum drafts →
          </Link>
          <Link
            href="/admin/agents/ranks"
            className="px-3 py-1.5 border rounded hover:bg-gray-50"
          >
            Search ranks →
          </Link>
        </nav>
      </header>

      {/* Pending approvals — most important */}
      {approvals.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Awaiting your approval ({approvals.length})
          </h2>
          <div className="space-y-3">
            {approvals.map((a) => (
              <ApprovalCard key={a.id} approval={a} />
            ))}
          </div>
        </section>
      )}

      {/* Roster */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Team roster</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.values(roles).map((role) => {
            const lastRun = runs.find((r) => r.role === role.id);
            return (
              <div
                key={role.id}
                className="border rounded-lg p-4 bg-white"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{role.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{role.id}</p>
                  </div>
                  <Link
                    href={`/admin/agents/${role.id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Details →
                  </Link>
                </div>
                <div className="mt-3 text-sm text-gray-700">
                  {Object.keys(role.tasks).length} task(s) ·{" "}
                  {role.tools.length} tools
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Last run:{" "}
                  {lastRun
                    ? new Date(lastRun.started_at).toLocaleString()
                    : "never"}
                </div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  {Object.keys(role.tasks).map((t) => (
                    <RunButton key={t} role={role.id} task={t} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent runs */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Recent runs</h2>
        <div className="border rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Task</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 text-gray-600">
                    {new Date(r.started_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">{r.role}</td>
                  <td className="px-3 py-2">{r.task}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        r.status === "success"
                          ? "bg-green-100 text-green-800"
                          : r.status === "awaiting_approval"
                          ? "bg-amber-100 text-amber-800"
                          : r.status === "failed"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    ${Number(r.cost_usd ?? 0).toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent auto-actions */}
      <section>
        <h2 className="text-lg font-semibold mb-3">
          Recent auto-actions
        </h2>
        <div className="space-y-2">
          {actions.map((a) => (
            <div
              key={a.id}
              className="border rounded p-3 bg-white text-sm"
            >
              <div className="flex justify-between">
                <span className="font-medium">
                  {a.role} · {a.tool}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </div>
              {a.reasoning && (
                <p className="text-gray-700 mt-1">{a.reasoning}</p>
              )}
              {a.estimated_impact && (
                <p className="text-xs text-gray-500 mt-1">
                  Impact: {a.estimated_impact}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
