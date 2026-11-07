import { PageHeader, Section } from "@/components/ui";
import { SimulatorClient } from "@/components/simulator-client";
import { requireCtx } from "@/lib/ctx";
import { loadData, simInputs } from "@/lib/data";
import { geminiConfigured } from "@/lib/gemini";
import { can } from "@/lib/permissions";

export const metadata = { title: "Scenario Simulator" };

export default async function Simulator({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const d = await loadData(ctx, { factory: sp.factory });
  const { lines, orders, missing } = simInputs(d);
  const { data: saved } = await ctx.supabase.from("scenario_definitions").select("id,name,type,created_at").eq("organization_id", ctx.org.id).order("created_at", { ascending: false }).limit(10);
  return (
    <>
      <PageHeader title="Scenario Simulator" subtitle="Test operational assumptions before acting. Results come from a deterministic capacity model using your data; AI can explain them but never produces them. Simulations are not connected to live schedules or machinery.">
        <form><select name="factory" defaultValue={sp.factory ?? ""} className="input" aria-label="Factory"><option value="">All factories</option>{d.factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select><button className="btn-dark ml-2">Apply</button></form>
      </PageHeader>
      <SimulatorClient lines={lines} orders={orders} factoryId={sp.factory ?? null} gaps={missing} canSave={can.write(ctx.role)} aiEnabled={geminiConfigured()} />
      <div className="mt-6" />
      <Section title="Saved scenarios">
        {saved?.length ? <ul className="divide-y divide-navy/10 text-sm">{saved.map((s) => <li key={s.id} className="flex justify-between py-1.5"><span>{s.name}</span><span className="text-slate">{String(s.type).replace(/_/g, " ")} · {new Date(s.created_at).toLocaleDateString()}</span></li>)}</ul> : <p className="text-sm text-slate">No saved scenarios yet.</p>}
      </Section>
    </>
  );
}
