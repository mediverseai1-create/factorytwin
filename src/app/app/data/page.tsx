import { Importer } from "@/components/importer";
import { Badge, PageHeader, Section } from "@/components/ui";
import { requireCtx } from "@/lib/ctx";

export const metadata = { title: "Data & Integrations" };

const INTEGRATIONS = [
  ["CSV / XLSX upload", "available", "Structured file imports with column mapping, validation and duplicate detection."],
  ["PDF operational reports", "coming_soon", "Extraction from PDF reports is not yet implemented."],
  ["REST API ingestion", "coming_soon", "Authenticated ingestion endpoint for ERP/MES exports."],
  ["ERP / MES", "coming_soon", "Adapters planned. No ERP or MES is connected."],
  ["SCADA / OPC UA", "coming_soon", "Adapters planned. No live machine data is connected."],
  ["Azure IoT Hub / Digital Twins", "coming_soon", "Planned."],
  ["Power BI", "coming_soon", "Planned."],
];

export default async function DataPage() {
  const ctx = await requireCtx();
  const { data: imports } = await ctx.supabase.from("data_imports").select("*").eq("organization_id", ctx.org.id).order("created_at", { ascending: false }).limit(20);
  return (
    <>
      <PageHeader title="Data & Integrations" subtitle="Import factory data, review data quality, and see which integrations are connected. Live status is only shown for connected sources — none are connected today." />
      <Importer orgId={ctx.org.id} />
      <div className="mt-6" />
      <Section title="Import history">
        {imports?.length ? (
          <div className="overflow-x-auto"><table className="w-full min-w-[640px]"><thead><tr>{["When", "Category", "File", "Total", "Imported", "Rejected", "Duplicates", "Review", "Status"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-navy/5">{imports.map((i) => <tr key={i.id}><td className="td">{new Date(i.created_at).toLocaleString()}</td><td className="td">{String(i.category).replace(/_/g, " ")}</td><td className="td">{i.file_name}</td><td className="td">{i.total}</td><td className="td">{i.imported}</td><td className="td">{i.rejected}</td><td className="td">{i.duplicates}</td><td className="td">{i.needs_review}</td><td className="td"><Badge>{i.status}</Badge></td></tr>)}</tbody></table></div>
        ) : <p className="text-sm text-slate">No imports yet.</p>}
      </Section>
      <Section title="Integrations">
        <ul className="divide-y divide-navy/10">{INTEGRATIONS.map(([n, s, d]) => (
          <li key={n} className="flex items-center justify-between gap-4 py-2 text-sm"><div><div className="font-medium">{n}</div><div className="text-xs text-steel">{d}</div></div>
            <span className={`badge ${s === "available" ? "bg-ok/15 text-ok" : "bg-slate/20 text-steel"}`}>{s === "available" ? "Available" : "Coming soon"}</span></li>))}</ul>
      </Section>
    </>
  );
}
