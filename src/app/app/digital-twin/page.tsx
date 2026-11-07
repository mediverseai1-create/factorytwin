import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Badge, Empty, Kpi, PageHeader, Section } from "@/components/ui";
import { audit, requireCtx } from "@/lib/ctx";
import { loadData, perLine } from "@/lib/data";
import { availability, fmt, pct, type ProdRec } from "@/lib/metrics";
import { can } from "@/lib/permissions";

export const metadata = { title: "Digital Twin" };
type Row = Record<string, any>;

export default async function DigitalTwin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const d = await loadData(ctx, { factory: sp.factory });
  const { data: areasRaw } = await ctx.supabase.from("factory_areas").select("*").eq("organization_id", ctx.org.id);
  const { data: relsRaw } = await ctx.supabase.from("equipment_relationships").select("*").eq("organization_id", ctx.org.id);
  const areas = (areasRaw ?? []) as Row[], rels = (relsRaw ?? []) as Row[];
  const pl = perLine(d);
  const eqById = new Map(d.equipment.map((e) => [e.id, e]));
  const sel = sp.equipment ? eqById.get(sp.equipment) : undefined;

  async function addRelation(fd: FormData) {
    "use server";
    const c = await requireCtx();
    if (!can.write(c.role)) return;
    const up = String(fd.get("upstream")), down = String(fd.get("downstream"));
    if (!up || !down || up === down) return;
    await c.supabase.from("equipment_relationships").insert({ organization_id: c.org.id, upstream_id: up, downstream_id: down, relation: String(fd.get("relation") || "feeds") });
    await audit(c, "twin.relationship.add", "equipment_relationships", undefined, { up, down });
    revalidatePath("/app/digital-twin");
  }
  async function removeRelation(fd: FormData) {
    "use server";
    const c = await requireCtx();
    if (!can.write(c.role)) return;
    await c.supabase.from("equipment_relationships").delete().eq("id", String(fd.get("id"))).eq("organization_id", c.org.id);
    await audit(c, "twin.relationship.remove", "equipment_relationships", String(fd.get("id")));
    revalidatePath("/app/digital-twin");
  }

  if (!d.factories.length) {
    return <><PageHeader title="Digital Twin" /><Empty title="No factory modelled yet" body="Create a factory, add production lines and register equipment to build your digital twin." href="/app/factories" cta="Create a factory" /></>;
  }

  // Data completeness: share of the model's elements with the data needed to analyse them.
  const checks = [
    { label: "Lines with nominal capacity", ok: d.lines.filter((l) => l.capacity_per_hour).length, total: d.lines.length },
    { label: "Equipment assigned to a line", ok: d.equipment.filter((e) => e.line_id).length, total: d.equipment.length },
    { label: "Lines with production records", ok: pl.filter((l) => l.records > 0).length, total: pl.length },
    { label: "Equipment with relationships", ok: new Set(rels.flatMap((r) => [r.upstream_id, r.downstream_id])).size, total: d.equipment.length },
  ];

  const selDown = sel ? d.downtime.filter((x) => x.equipment_id === sel.id) : [];
  const selMaint = sel ? d.maintenanceRecords.filter((x) => x.equipment_id === sel.id) : [];
  const selRels = sel ? rels.filter((r) => r.upstream_id === sel.id || r.downstream_id === sel.id) : [];

  return (
    <>
      <PageHeader title="Digital Twin" subtitle="Structured model of your organization → factory → area → line → equipment, built from your records. Statuses are the last recorded values, not live telemetry. No 3D model is shown because none has been provided.">
        <form><select name="factory" defaultValue={sp.factory ?? ""} className="input" aria-label="Factory"><option value="">All factories</option>{d.factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
          <button className="btn-dark ml-2">Go</button></form>
      </PageHeader>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {checks.map((c) => <Kpi key={c.label} label={c.label} value={`${c.ok} / ${c.total}`} hint={c.total ? pct(c.ok / c.total, 0) + " complete" : "n/a"} />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          {d.factories.map((f) => (
            <Section key={f.id} title={f.name} note={f.location ?? undefined}>
              {areas.filter((a) => a.factory_id === f.id).concat([{ id: "none", name: "Unassigned area", factory_id: f.id }]).map((a) => {
                const ls = d.lines.filter((l) => l.factory_id === f.id && (a.id === "none" ? !l.area_id || !areas.some((x) => x.id === l.area_id) : l.area_id === a.id));
                if (!ls.length && a.id === "none") return null;
                return (
                  <div key={a.id} className="mb-4 rounded-lg border border-navy/10 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-steel">Area · {a.name}</div>
                    {!ls.length && <p className="text-sm text-slate">No production lines in this area.</p>}
                    <div className="space-y-3">
                      {ls.map((l) => {
                        const m = pl.find((x) => x.id === l.id)!;
                        const eq = d.equipment.filter((e) => e.line_id === l.id);
                        return (
                          <div key={l.id} className="rounded-lg bg-ivory/70 p-3">
                            <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                              <span className="font-display font-semibold text-navy">{l.name}</span><Badge>{l.status}</Badge>
                              <span className="text-xs text-steel">Capacity {l.capacity_per_hour ? `${l.capacity_per_hour}/h` : "not set"} · Availability {pct(m.availability)} · Output {fmt(m.output)}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {eq.length ? eq.map((e) => (
                                <Link key={e.id} href={`?${new URLSearchParams({ ...(sp.factory && { factory: sp.factory }), equipment: e.id })}`}
                                  className={`rounded-md border px-2.5 py-1.5 text-xs ${sel?.id === e.id ? "border-amber bg-amber/20" : "border-navy/15 bg-white hover:border-steel"}`}>
                                  <span className="font-semibold">{e.name}</span> <span className="text-slate">{e.code}</span><br /><Badge>{e.status}</Badge>
                                </Link>
                              )) : <span className="text-xs text-slate">No equipment registered on this line.</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </Section>
          ))}
        </div>

        <aside>
          <Section title={sel ? sel.name : "Equipment details"} note={sel?.code}>
            {!sel ? <p className="text-sm text-steel">Select an equipment item to see its attributes, relationships, downtime and maintenance history.</p> : (
              <div className="space-y-4 text-sm">
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {([["Category", sel.category], ["Manufacturer", sel.manufacturer], ["Model", sel.model], ["Installed", sel.installed_on], ["Operating hours", sel.operating_hours], ["Rated power (kW)", sel.rated_power_kw], ["Recorded status", sel.status]] as const).map(([k, v]) => (
                    <div key={k} className="contents"><dt className="text-steel">{k}</dt><dd>{v ?? "—"}</dd></div>
                  ))}
                  <dt className="text-steel">Utilization</dt><dd>{pct(availability(d.production.filter((r) => r.equipment_id === sel.id) as unknown as ProdRec[]))}</dd>
                </dl>
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase text-steel">Relationships</h3>
                  {selRels.length ? <ul className="space-y-1">{selRels.map((r) => (
                    <li key={r.id} className="flex items-center justify-between">
                      <span>{eqById.get(r.upstream_id)?.name} <span className="text-slate">{r.relation} →</span> {eqById.get(r.downstream_id)?.name}</span>
                      {can.write(ctx.role) && <form action={removeRelation}><input type="hidden" name="id" value={r.id} /><button className="text-xs text-danger">Remove</button></form>}
                    </li>))}</ul> : <p className="text-slate">None recorded.</p>}
                  {can.write(ctx.role) && (
                    <form action={addRelation} className="mt-2 flex flex-wrap gap-2">
                      <input type="hidden" name="upstream" value={sel.id} />
                      <select name="downstream" className="input flex-1" required><option value="">Feeds equipment…</option>{d.equipment.filter((e) => e.id !== sel.id).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
                      <button className="btn-dark">Link</button>
                    </form>
                  )}
                </div>
                <div><h3 className="mb-1 text-xs font-semibold uppercase text-steel">Recorded downtime ({selDown.length})</h3>
                  {selDown.slice(-5).reverse().map((x) => <p key={x.id}>{new Date(x.started_at).toLocaleDateString()} · {x.duration_minutes} min · {x.reason ?? "no reason recorded"}</p>)}
                  {!selDown.length && <p className="text-slate">None recorded.</p>}</div>
                <div><h3 className="mb-1 text-xs font-semibold uppercase text-steel">Maintenance history ({selMaint.length})</h3>
                  {selMaint.slice(0, 5).map((x) => <p key={x.id}>{new Date(x.performed_at).toLocaleDateString()} · {x.type ?? "—"} · {x.description ?? ""}</p>)}
                  {!selMaint.length && <p className="text-slate">None recorded.</p>}</div>
              </div>
            )}
          </Section>
        </aside>
      </div>
    </>
  );
}
