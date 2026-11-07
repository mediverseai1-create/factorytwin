import type { Filters } from "@/lib/data";

type Opt = { id: string; name: string };
export function FilterBar({ filters, factories, lines, shifts = true }: { filters: Filters; factories: Opt[]; lines: Opt[]; shifts?: boolean }) {
  return (
    <form className="card mb-6 flex flex-wrap items-end gap-3 p-3" aria-label="Filters">
      <div><label className="label">Factory</label>
        <select name="factory" defaultValue={filters.factory ?? ""} className="input"><option value="">All</option>{factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
      <div><label className="label">Line</label>
        <select name="line" defaultValue={filters.line ?? ""} className="input"><option value="">All</option>{lines.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
      <div><label className="label">From</label><input type="date" name="from" defaultValue={filters.from} className="input" /></div>
      <div><label className="label">To</label><input type="date" name="to" defaultValue={filters.to} className="input" /></div>
      {shifts && <div><label className="label">Shift</label><input name="shift" defaultValue={filters.shift} placeholder="e.g. Day" className="input w-28" /></div>}
      <button className="btn-dark">Apply</button>
      <a href="?" className="btn-line">Reset</a>
    </form>
  );
}
