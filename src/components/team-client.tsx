"use client";
import { useActionState, useState } from "react";
import { addMember, setMemberRole } from "@/app/actions";
import { ROLES, roleLabel } from "@/lib/permissions";

export function AddMemberForm() {
  const [state, action, pending] = useActionState(addMember, {} as { ok?: boolean; error?: string });
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div><label className="label">Email (must already have an account)</label><input name="email" type="email" required className="input w-72" /></div>
      <div><label className="label">Role</label><select name="role" className="input" defaultValue="viewer">{ROLES.filter((r) => r !== "owner").map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}</select></div>
      <button className="btn-dark" disabled={pending}>Add member</button>
      {state.error && <span role="alert" className="text-sm text-danger">{state.error}</span>}
      {state.ok && <span className="text-sm text-ok">Member added.</span>}
    </form>
  );
}

export function RoleSelect({ memberId, role, disabled }: { memberId: string; role: string; disabled: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="flex items-center gap-2">
      <select className="input w-auto py-1" defaultValue={role} disabled={disabled} onChange={async (e) => { const r = await setMemberRole(memberId, e.target.value); setMsg(r.error ?? "Saved"); }}>
        {ROLES.map((r) => <option key={r} value={r} disabled={r === "owner"}>{roleLabel(r)}</option>)}</select>
      {msg && <span className="text-xs text-slate">{msg}</span>}
    </span>
  );
}
