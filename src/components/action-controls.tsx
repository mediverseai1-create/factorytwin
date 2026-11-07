"use client";
import { useActionState, useState } from "react";
import { createAction, decideAction, updateAction } from "@/app/actions";

export function ActionControls({ id, approval, impl, outcome, canApprove, canWrite }: { id: string; approval: string; impl: string; outcome: string | null; canApprove: boolean; canWrite: boolean }) {
  const [note, setNote] = useState("");
  const [out, setOut] = useState(outcome ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const run = async (p: Promise<{ error?: string }>) => { const r = await p; setMsg(r.error ?? "Saved"); };
  return (
    <div className="mt-3 space-y-2 border-t border-navy/10 pt-3 text-sm">
      {approval === "pending" && canApprove && (
        <div className="flex flex-wrap gap-2">
          <input className="input max-w-xs" placeholder="Decision note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn-dark" onClick={() => run(decideAction(id, "approved", note))}>Approve</button>
          <button className="btn-danger" onClick={() => confirm("Reject this recommendation?") && run(decideAction(id, "rejected", note))}>Reject</button>
        </div>
      )}
      {approval === "pending" && !canApprove && <p className="text-xs text-slate">Awaiting approval by an owner, administrator, plant manager or operations director.</p>}
      {canWrite && approval === "approved" && (
        <div className="flex flex-wrap items-center gap-2">
          <select className="input w-auto" defaultValue={impl} onChange={(e) => run(updateAction(id, { implementation_status: e.target.value }))}>
            {["not_started", "in_progress", "completed", "cancelled"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</select>
          <input className="input max-w-sm" placeholder="Observed outcome (recorded evidence only)" value={out} onChange={(e) => setOut(e.target.value)} />
          <button className="btn-line" onClick={() => run(updateAction(id, { outcome: out }))}>Save outcome</button>
        </div>
      )}
      {msg && <span role="status" className="text-xs text-steel">{msg}</span>}
    </div>
  );
}

export function NewActionForm({ factories }: { factories: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (p: unknown, fd: FormData) => { const r = await createAction(p, fd); if (r.ok) setOpen(false); return r; }, {} as { ok?: boolean; error?: string });
  if (!open) return <button className="btn-primary" onClick={() => setOpen(true)}>New action</button>;
  return (
    <form action={action} className="card mb-4 grid gap-3 p-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><label className="label">Title *</label><input name="title" className="input" required /></div>
      <div className="sm:col-span-2"><label className="label">Description</label><textarea name="description" className="input" rows={2} /></div>
      <div><label className="label">Priority</label><select name="priority" className="input" defaultValue="medium"><option>low</option><option>medium</option><option>high</option></select></div>
      <div><label className="label">Factory</label><select name="factory_id" className="input"><option value="">—</option>{factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
      <div className="sm:col-span-2"><label className="label">Potential impact</label><input name="impact" className="input" /></div>
      <div className="flex items-center gap-3 sm:col-span-2"><button className="btn-primary" disabled={pending}>Create</button><button type="button" className="btn-line" onClick={() => setOpen(false)}>Cancel</button>{state.error && <span className="text-sm text-danger">{state.error}</span>}</div>
    </form>
  );
}
