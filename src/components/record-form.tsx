"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { createRecord, deleteRecord } from "@/app/actions";
import type { Entity } from "@/lib/entities";

export type RefOptions = Record<string, { id: string; label: string }[]>;

export function RecordForm({ entity, entityKey, refs }: { entity: Entity; entityKey: string; refs: RefOptions }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createRecord.bind(null, entityKey), {} as { ok?: boolean; error?: string });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) { ref.current?.reset(); setOpen(false); } }, [state]);
  if (!open) return <button className="btn-primary" onClick={() => setOpen(true)}>Add {entity.singular}</button>;
  return (
    <form ref={ref} action={action} className="card mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {entity.fields.map((f) => (
        <div key={f.name} className={f.type === "textarea" ? "sm:col-span-2 lg:col-span-3" : ""}>
          <label className="label" htmlFor={f.name}>{f.label}{f.required && " *"}</label>
          {f.type === "ref" ? (
            <select id={f.name} name={f.name} className="input" required={f.required} defaultValue="">
              <option value="">{f.required ? "Select…" : "None"}</option>
              {(refs[f.ref!] ?? []).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          ) : f.type === "select" ? (
            <select id={f.name} name={f.name} className="input" defaultValue={f.options![0]}>{f.options!.map((o) => <option key={o}>{o}</option>)}</select>
          ) : f.type === "textarea" ? (
            <textarea id={f.name} name={f.name} className="input" rows={2} />
          ) : f.type === "bool" ? (
            <input id={f.name} name={f.name} type="checkbox" className="h-5 w-5" />
          ) : (
            <input id={f.name} name={f.name} className="input" required={f.required}
              type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "datetime" ? "datetime-local" : "text"} step={f.type === "number" ? "any" : undefined} />
          )}
        </div>
      ))}
      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        <button type="button" className="btn-line" onClick={() => setOpen(false)}>Cancel</button>
        {state.error && <span role="alert" className="text-sm text-danger">{state.error}</span>}
      </div>
    </form>
  );
}

export function DeleteButton({ entityKey, id, label }: { entityKey: string; id: string; label: string }) {
  const [err, setErr] = useState<string | null>(null);
  return (
    <button className="text-xs font-semibold text-danger hover:underline" title={err ?? undefined}
      onClick={async () => {
        if (!confirm(`Delete this ${label}? This cannot be undone.`)) return;
        const r = await deleteRecord(entityKey, id);
        if (r.error) { setErr(r.error); alert(r.error); }
      }}>Delete</button>
  );
}
