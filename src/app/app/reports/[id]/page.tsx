import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { requireCtx } from "@/lib/ctx";
import type { ReportContent } from "@/lib/reports";

export default async function ReportView({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireCtx();
  const { id } = await params;
  const { data: r } = await ctx.supabase.from("reports").select("*").eq("id", id).eq("organization_id", ctx.org.id).maybeSingle();
  if (!r) notFound();
  const c = r.content as ReportContent;
  return (
    <article className="mx-auto max-w-4xl">
      <div className="mb-4 flex gap-2 print:hidden">
        <Link href="/app/reports" className="btn-line">← Reports</Link>
        <PrintButton />
        <a className="btn-dark" href={`/app/reports/${id}/csv`}>Download CSV</a>
      </div>
      <h1 className="text-2xl font-bold">{r.title}</h1>
      <p className="mb-6 text-sm text-steel">{c.organization} · generated {new Date(c.generatedAt).toLocaleString()}</p>
      {c.sections.map((s) => (
        <section key={s.title} className="mb-6 break-inside-avoid">
          <h2 className="mb-2 text-lg font-semibold">{s.title}</h2>
          {s.rows.length ? (
            <table className="w-full border border-navy/10 text-sm"><thead className="bg-ivory"><tr>{s.columns.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-navy/5">{s.rows.map((row, i) => <tr key={i}>{row.map((v, j) => <td key={j} className="td">{v}</td>)}</tr>)}</tbody></table>
          ) : <p className="text-sm text-slate">No data available for this section.</p>}
        </section>))}
      <p className="mt-8 border-t border-navy/10 pt-3 text-xs text-slate">{c.notes.join(" ")}</p>
    </article>
  );
}
