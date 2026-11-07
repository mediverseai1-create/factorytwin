import { ActionControls, NewActionForm } from "@/components/action-controls";
import { Badge, Empty, PageHeader, Section } from "@/components/ui";
import { requireCtx } from "@/lib/ctx";
import { can, roleLabel } from "@/lib/permissions";

export const metadata = { title: "Operational Insights" };

export default async function Insights({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const status = sp.status ?? "all";
  let q = ctx.supabase.from("recommended_actions").select("*").eq("organization_id", ctx.org.id).order("created_at", { ascending: false }).limit(100);
  if (status !== "all") q = q.eq("approval_status", status);
  const [{ data: actions }, { data: insights }, { data: factories }, { data: audit }] = await Promise.all([
    q,
    ctx.supabase.from("ai_insights").select("*").eq("organization_id", ctx.org.id).order("created_at", { ascending: false }).limit(20),
    ctx.supabase.from("factories").select("id,name").eq("organization_id", ctx.org.id),
    can.viewAudit(ctx.role) ? ctx.supabase.from("audit_logs").select("*").eq("organization_id", ctx.org.id).order("created_at", { ascending: false }).limit(15) : Promise.resolve({ data: null }),
  ]);
  return (
    <>
      <PageHeader title="Operational Insights & Actions" subtitle="Recommendations from AI agents and your team. Each one needs human review before anything changes. AI never controls equipment or authorizes maintenance.">
        {can.write(ctx.role) && <NewActionForm factories={factories ?? []} />}
      </PageHeader>
      <div className="mb-4 flex gap-2 text-sm">{["all", "pending", "approved", "rejected"].map((s) => <a key={s} href={`?status=${s}`} className={status === s ? "btn-dark" : "btn-line"}>{s}</a>)}</div>
      {!actions?.length ? <Empty title="No actions yet" body="Run an AI agent to generate evidence-backed recommendations, or create an action manually." href="/app/agents" cta="Open AI Agents" /> : (
        <div className="space-y-3">{actions.map((a) => (
          <article key={a.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-semibold">{a.title}</h3>
              <div className="flex gap-1.5"><Badge>{a.priority}</Badge><Badge>{a.approval_status}</Badge><Badge>{a.implementation_status}</Badge></div>
            </div>
            {a.description && <p className="mt-1 whitespace-pre-wrap text-sm text-steel">{a.description}</p>}
            {Array.isArray(a.evidence) && a.evidence.length > 0 && <p className="mt-2 text-xs text-slate"><b>Evidence:</b> {a.evidence.join(" · ")}</p>}
            <p className="mt-1 text-xs text-slate">Source: {a.source === "manual" ? "manual" : `AI (${String(a.source).replace("ai:", "").replace(/_/g, " ")}) · ${a.confidence ?? "unrated"} confidence`}{a.impact ? ` · Potential impact: ${a.impact}` : ""}{a.completed_on ? ` · Completed ${a.completed_on}` : ""}</p>
            {a.outcome && <p className="mt-1 text-sm"><b>Outcome:</b> {a.outcome}</p>}
            <ActionControls id={a.id} approval={a.approval_status} impl={a.implementation_status} outcome={a.outcome} canApprove={can.approveActions(ctx.role)} canWrite={can.write(ctx.role)} />
          </article>))}</div>
      )}
      <div className="mt-6" />
      <Section title="AI findings" note="Each is labelled by evidence type">
        {insights?.length ? <ul className="divide-y divide-navy/10 text-sm">{insights.map((i) => (
          <li key={i.id} className="py-2"><b>{i.title}</b> <span className="text-xs text-slate">· {String(i.kind).replace(/_/g, " ")} · {i.confidence} · {String(i.agent_key).replace(/_/g, " ")}</span><p className="text-steel">{i.body}</p></li>))}</ul> : <p className="text-sm text-slate">None yet.</p>}
      </Section>
      {audit && <Section title="Audit trail" note={`Visible to ${roleLabel("owner")}s, administrators, plant managers and operations directors`}>
        <ul className="divide-y divide-navy/10 text-xs">{audit.map((l) => <li key={l.id} className="flex justify-between py-1.5"><span>{l.action} {l.entity ? `· ${l.entity}` : ""}</span><span className="text-slate">{new Date(l.created_at).toLocaleString()}</span></li>)}</ul></Section>}
    </>
  );
}
