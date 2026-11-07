"use client";
import Papa from "papaparse";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { importRows, type ImportSummary } from "@/app/actions";
import { ENTITIES, IMPORT_CATEGORIES } from "@/lib/entities";
import { createClient } from "@/lib/supabase/client";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function Importer({ orgId }: { orgId: string }) {
  const [cat, setCat] = useState(IMPORT_CATEGORIES[0].key);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [map, setMap] = useState<Record<string, string>>({}); // field name -> file column
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const entity = ENTITIES[IMPORT_CATEGORIES.find((c) => c.key === cat)!.entity];
  const targets = useMemo(() => [...entity.fields, ...(entity.extraImport ?? [])], [entity]);

  function autoMap(h: string[]) {
    const m: Record<string, string> = {};
    for (const t of targets) {
      const names = [norm(t.name), norm(t.label), norm(t.name.replace(/_id$/, ""))];
      const hit = h.find((c) => names.includes(norm(c)));
      if (hit) m[t.name] = hit;
    }
    setMap(m);
  }

  async function onFile(f: File | null) {
    setFile(f); setSummary(null); setErr(null); setRows([]); setHeaders([]);
    if (!f) return;
    try {
      let data: Record<string, string>[] = [];
      if (/\.pdf$/i.test(f.name)) throw new Error("PDF extraction is Coming Soon. Please upload CSV or XLSX.");
      if (/\.(xlsx|xls)$/i.test(f.name)) {
        const wb = XLSX.read(await f.arrayBuffer(), { cellDates: true });
        data = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[wb.SheetNames[0]], { raw: false, defval: "" });
      } else if (/\.(csv|txt)$/i.test(f.name)) {
        const res = Papa.parse<Record<string, string>>(await f.text(), { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
        data = res.data;
      } else throw new Error("Unsupported file type. Upload CSV or XLSX.");
      if (!data.length) throw new Error("No data rows found in the file.");
      const h = Object.keys(data[0]);
      setRows(data); setHeaders(h); autoMap(h);
    } catch (e) { setErr((e as Error).message); }
  }

  const missingRequired = targets.filter((t) => t.required && !map[t.name]);
  const mapped = useMemo(() => rows.map((r) => Object.fromEntries(targets.filter((t) => map[t.name]).map((t) => [t.name, r[map[t.name]]]))), [rows, map, targets]);
  const blankRequired = useMemo(() => mapped.filter((r) => targets.some((t) => t.required && (r[t.name] === "" || r[t.name] == null))).length, [mapped, targets]);

  async function confirm() {
    if (!file) return;
    setBusy(true); setErr(null);
    try {
      if (file.size < 10_000_000) {
        await createClient().storage.from("imports").upload(`${orgId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`, file); // best-effort original-file retention
      }
      setSummary(await importRows(entity.table, mapped, file.name));
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }

  return (
    <div className="card space-y-5 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">1 · Data category</label>
          <select className="input" value={cat} onChange={(e) => { setCat(e.target.value); onFile(null); }}>{IMPORT_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></div>
        <div><label className="label">2 · File (CSV or XLSX)</label>
          <input type="file" className="input" accept=".csv,.xlsx,.xls,.txt,.pdf" onChange={(e) => onFile(e.target.files?.[0] ?? null)} /></div>
      </div>
      <p className="text-xs text-steel">References (factory, line, equipment) are matched by name or code and must already exist. Energy and downtime files may include a <code>unit</code> column; values are converted and the original is preserved.</p>
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}

      {rows.length > 0 && !summary && (<>
        <div>
          <h3 className="mb-2 font-semibold">3 · Map columns <span className="text-xs font-normal text-slate">({rows.length.toLocaleString()} rows detected)</span></h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {targets.map((t) => (
              <div key={t.name}><label className="label">{t.label}{t.required && " *"}</label>
                <select className="input" value={map[t.name] ?? ""} onChange={(e) => setMap({ ...map, [t.name]: e.target.value })}><option value="">— not mapped —</option>{headers.map((h) => <option key={h}>{h}</option>)}</select></div>))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 font-semibold">4 · Preview & checks</h3>
          {missingRequired.length > 0 && <p className="mb-2 text-sm text-danger">Required fields not mapped: {missingRequired.map((m) => m.label).join(", ")}</p>}
          {blankRequired > 0 && <p className="mb-2 text-sm text-amber-dark">{blankRequired} row(s) have a blank required value and will be rejected (listed after import).</p>}
          <div className="overflow-x-auto rounded-lg border border-navy/10"><table className="w-full text-xs"><thead className="bg-ivory"><tr>{targets.filter((t) => map[t.name]).map((t) => <th key={t.name} className="th">{t.label}</th>)}</tr></thead>
            <tbody>{mapped.slice(0, 5).map((r, i) => <tr key={i} className="border-t border-navy/5">{targets.filter((t) => map[t.name]).map((t) => <td key={t.name} className="td">{String(r[t.name] ?? "")}</td>)}</tr>)}</tbody></table></div>
        </div>
        <button className="btn-primary" disabled={busy || missingRequired.length > 0} onClick={confirm}>{busy ? "Importing…" : `5 · Confirm import of ${rows.length.toLocaleString()} rows`}</button>
      </>)}

      {summary && (
        <div role="status" className="space-y-3">
          <h3 className="font-semibold">Import summary</h3>
          {summary.error && <p className="text-sm text-danger">{summary.error}</p>}
          <div className="grid gap-3 sm:grid-cols-5">
            {([["Total", summary.total], ["Imported", summary.imported], ["Rejected", summary.rejected], ["Duplicates", summary.duplicates], ["Need review", summary.needsReview]] as const).map(([l, v]) => (
              <div key={l} className="rounded-lg bg-ivory p-3"><div className="text-xs text-steel">{l}</div><div className="font-display text-xl font-bold">{v.toLocaleString()}</div></div>))}
          </div>
          {summary.issues.length > 0 && (
            <div className="max-h-64 overflow-auto rounded-lg border border-navy/10"><table className="w-full text-xs"><thead className="bg-ivory"><tr><th className="th">Row</th><th className="th">Type</th><th className="th">Detail</th></tr></thead>
              <tbody>{summary.issues.map((i, k) => <tr key={k} className="border-t border-navy/5"><td className="td">{i.row}</td><td className="td">{i.kind}</td><td className="td">{i.message}</td></tr>)}</tbody></table></div>)}
          <button className="btn-line" onClick={() => onFile(null)}>Import another file</button>
        </div>
      )}
    </div>
  );
}
