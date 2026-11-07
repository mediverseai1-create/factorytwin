import Link from "next/link";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { DeleteButton, RecordForm, type RefOptions } from "@/components/record-form";
import { requireCtx } from "@/lib/ctx";
import { ENTITIES } from "@/lib/entities";
import { can } from "@/lib/permissions";

const PAGE = 25;
type SP = Record<string, string | string[] | undefined>;
const labelOf: Record<string, string[]> = { factories: ["name"], production_lines: ["name"], equipment: ["name", "code"], production_orders: ["order_no"], factory_areas: ["name"] };

export async function EntityPage({ entityKey, searchParams, subtitle, title }: { entityKey: string; searchParams: SP; subtitle?: string; title?: string }) {
  const ctx = await requireCtx();
  const e = ENTITIES[entityKey];
  const sp = searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const sort = typeof sp.sort === "string" && (e.columns.includes(sp.sort)) ? sp.sort : e.orderBy;
  const dir = sp.dir === "asc" ? true : sp.dir === "desc" ? false : e.ascending ?? false;
  const page = Math.max(1, Number(sp.page) || 1);

  let query = ctx.supabase.from(e.table).select("*", { count: "exact" }).eq("organization_id", ctx.org.id);
  if (q) query = query.or(e.searchable.map((c) => `${c}.ilike.%${q.replace(/[,()%]/g, " ")}%`).join(","));
  const { data, count, error } = await query.order(sort, { ascending: dir }).range((page - 1) * PAGE, page * PAGE - 1);

  const refTables = [...new Set(e.fields.filter((f) => f.type === "ref").map((f) => f.ref!))];
  const refs: RefOptions = {};
  const names: Record<string, Map<string, string>> = {};
  await Promise.all(refTables.map(async (t) => {
    const { data: rows } = await ctx.supabase.from(t).select("*").eq("organization_id", ctx.org.id).order("created_at").limit(2000);
    refs[t] = (rows ?? []).map((r: Record<string, string>) => ({ id: r.id, label: labelOf[t].map((k) => r[k]).join(" · ") }));
    names[t] = new Map(refs[t].map((o) => [o.id, o.label]));
  }));

  const rows = (data ?? []) as Record<string, unknown>[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const base = `?${new URLSearchParams({ ...(q && { q }), sort, dir: dir ? "asc" : "desc" }).toString()}`;
  const fieldOf = (c: string) => e.fields.find((f) => f.name === c);
  const render = (c: string, v: unknown) => {
    const fl = fieldOf(c);
    if (v === null || v === undefined || v === "") return <span className="text-slate">—</span>;
    if (fl?.type === "ref") return names[fl.ref!]?.get(String(v)) ?? "—";
    if (fl?.type === "datetime") return new Date(String(v)).toLocaleString();
    if (fl?.type === "bool") return v ? "Yes" : "No";
    if (c === "status" || c === "result") return <Badge>{String(v)}</Badge>;
    return String(v);
  };

  return (
    <>
      <PageHeader title={title ?? e.label} subtitle={subtitle}>
        {can.write(ctx.role) && <RecordForm entity={e} entityKey={entityKey} refs={refs} />}
      </PageHeader>
      <form className="mb-4 flex gap-2" role="search">
        <input name="q" defaultValue={q} placeholder={`Search ${e.label.toLowerCase()}…`} className="input max-w-sm" />
        <button className="btn-line">Search</button>
        {q && <Link href="?" className="btn-line">Clear</Link>}
      </form>
      {error && <p className="mb-3 text-sm text-danger">Could not load records: {error.message}</p>}
      {!rows.length ? (
        <Empty title={q ? "No matching records" : `No ${e.label.toLowerCase()} yet`} body={q ? "Try a different search." : `Add a ${e.singular} manually or import a CSV/XLSX file from Data & Integrations.`} href="/app/data" cta="Import data" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-navy/10 bg-ivory/60">
              <tr>
                {e.columns.map((c) => (
                  <th key={c} className="th">
                    <Link href={`?${new URLSearchParams({ ...(q && { q }), sort: c, dir: sort === c && dir ? "desc" : "asc" })}`}>{fieldOf(c)?.label ?? c}{sort === c ? (dir ? " ↑" : " ↓") : ""}</Link>
                  </th>
                ))}
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {rows.map((r) => (
                <tr key={String(r.id)} className="hover:bg-ivory/50">
                  {e.columns.map((c) => <td key={c} className="td">{render(c, r[c])}</td>)}
                  <td className="td text-right">{can.delete(ctx.role) && <DeleteButton entityKey={entityKey} id={String(r.id)} label={e.singular} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between text-sm text-steel">
        <span>{total.toLocaleString()} record{total === 1 ? "" : "s"}</span>
        <span className="flex items-center gap-3">
          {page > 1 && <Link className="underline" href={`${base}&page=${page - 1}`}>Previous</Link>}
          Page {page} of {pages}
          {page < pages && <Link className="underline" href={`${base}&page=${page + 1}`}>Next</Link>}
        </span>
      </div>
    </>
  );
}
