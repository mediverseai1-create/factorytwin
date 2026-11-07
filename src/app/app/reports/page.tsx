import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader, Section } from "@/components/ui";
import { audit, consumeUsage, requireCtx } from "@/lib/ctx";
import { can } from "@/lib/permissions";
import { REPORT_TYPES, buildReport } from "@/lib/reports";

export const metadata = { title: "Reports" };

export default async function Reports({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const [{ data: reports }, { data: factories }] = await Promise.all([
    ctx.supabase.from("reports").select("id,title,type,created_at").eq("organization_id", ctx.org.id).order("created_at", { ascending: false }).limit(50),
    ctx.supabase.from("factories").select("id,name").eq("organization_id", ctx.org.id),
  ]);

  async function generate(fd: FormData) {
    "use server";
    const c = await requireCtx();
    const type = String(fd.get("type"));
    if (!can.write(c.role) || !REPORT_TYPES[type]) redirect("/app/reports?error=Not%20permitted");
    const u = await consumeUsage(c, "report_generation", { type });
    if (!u.ok) redirect(`/app/reports?error=${encodeURIComponent(u.error)}`);
    const factory = String(fd.get("factory") ?? "") || undefined;
    const content = await buildReport(c, type, factory);
    const { data, error } = await c.supabase.from("reports").insert({ organization_id: c.org.id, title: `${REPORT_TYPES[type]} — ${new Date().toLocaleDateString("en-US")}`, type, params: { factory }, content, created_by: c.user.id }).select("id").single();
    if (error) redirect(`/app/reports?error=${encodeURIComponent(error.message)}`);
    await audit(c, "report.generate", "reports", data.id, { type });
    redirect(`/app/reports/${data.id}`);
  }

  return (
    <>
      <PageHeader title="Reports" subtitle="Generated from deterministic calculations on your stored data. Open a report to print it as PDF or download CSV." />
      {sp.error && <p role="alert" className="mb-4 text-sm text-danger">{sp.error}</p>}
      {can.write(ctx.role) && (
        <Section title="Generate a report">
          <form action={generate} className="flex flex-wrap items-end gap-3">
            <div><label className="label">Report</label><select name="type" className="input">{Object.entries(REPORT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="label">Factory</label><select name="factory" className="input"><option value="">All factories</option>{factories?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
            <button className="btn-primary">Generate</button>
          </form>
        </Section>
      )}
      <Section title="Saved reports">
        {reports?.length ? <ul className="divide-y divide-navy/10 text-sm">{reports.map((r) => <li key={r.id} className="flex justify-between py-2"><Link className="font-medium underline" href={`/app/reports/${r.id}`}>{r.title}</Link><span className="text-slate">{new Date(r.created_at).toLocaleString()}</span></li>)}</ul> : <p className="text-sm text-slate">No reports generated yet.</p>}
      </Section>
    </>
  );
}
