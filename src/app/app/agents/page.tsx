import { AgentRunner } from "@/components/agent-client";
import { PageHeader } from "@/components/ui";
import { AGENTS } from "@/lib/agents";
import { requireCtx } from "@/lib/ctx";
import { geminiConfigured } from "@/lib/gemini";
import { can } from "@/lib/permissions";

export const metadata = { title: "AI Agents" };

export default async function Agents() {
  const ctx = await requireCtx();
  const { data: runs } = await ctx.supabase.from("ai_agent_runs").select("agent_key,status,created_at").eq("organization_id", ctx.org.id).order("created_at", { ascending: false }).limit(500);
  const by = new Map<string, { n: number; last?: string; failed: number }>();
  for (const r of runs ?? []) {
    const e = by.get(r.agent_key) ?? { n: 0, failed: 0 };
    e.n++; if (r.status === "failed") e.failed++; e.last ||= r.created_at; by.set(r.agent_key, e);
  }
  const enabled = geminiConfigured() && can.write(ctx.role);
  return (
    <>
      <PageHeader title="AI Agents" subtitle="Specialised agents reasoning over the same factory context. Calculations are deterministic; Gemini interprets them. Findings are labelled observed / historical pattern / AI assessment / hypothesis and always need human review." />
      {!geminiConfigured() && <p className="mb-4 rounded-lg bg-amber/15 p-3 text-sm text-amber-dark">GEMINI_API_KEY is not set on the server. Agents are disabled; all other features keep working.</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {AGENTS.map((a) => {
          const s = by.get(a.key);
          return (
            <article key={a.key} className="card p-4">
              <h2 className="text-base font-semibold">{a.name}</h2>
              <p className="text-xs font-medium uppercase tracking-wide text-amber-dark">{a.purpose}</p>
              <p className="mt-2 text-sm text-steel">{a.description}</p>
              <p className="mt-2 text-xs text-slate"><b>Data scope:</b> {a.scope.join(", ")} · <b>Capabilities:</b> {a.capabilities.join("; ")}</p>
              <p className="mt-1 text-xs text-slate">{s ? `${s.n} run${s.n === 1 ? "" : "s"} · last ${new Date(s.last!).toLocaleString()}${s.failed ? ` · ${s.failed} failed` : ""}` : "No runs yet"}</p>
              <AgentRunner agentKey={a.key} enabled={enabled} />
            </article>);
        })}
      </div>
    </>
  );
}
