import { AddMemberForm, RoleSelect } from "@/components/team-client";
import { PageHeader, Section } from "@/components/ui";
import { requireCtx } from "@/lib/ctx";
import { can } from "@/lib/permissions";

export const metadata = { title: "Team & Permissions" };

const MATRIX: [string, string][] = [
  ["Owner / Administrator", "Everything, including team management and deletions"],
  ["Plant Manager / Operations Director", "Read/write all data, approve or reject recommendations, delete records, view audit log"],
  ["Production Planner, Maintenance Manager & Technician, Quality Manager, Energy Manager, Factory Engineer", "Read/write operational data and import files; cannot delete records or approve recommendations"],
  ["Viewer", "Read-only"],
];

export default async function Team() {
  const ctx = await requireCtx();
  const { data: members } = await ctx.supabase.from("organization_members").select("id,role,user_id,created_at").eq("organization_id", ctx.org.id).order("created_at");
  const { data: profiles } = await ctx.supabase.from("profiles").select("id,email,full_name").in("id", (members ?? []).map((m) => m.user_id));
  const pm = new Map((profiles ?? []).map((p) => [p.id, p]));
  const manage = can.manageTeam(ctx.role);
  return (
    <>
      <PageHeader title="Team & Permissions" subtitle="Roles are enforced in the database with Row Level Security — hiding a button in the UI is never the only control." />
      <Section title="Members">
        <table className="w-full"><thead><tr><th className="th">Name</th><th className="th">Email</th><th className="th">Role</th></tr></thead>
          <tbody className="divide-y divide-navy/5">{members?.map((m) => <tr key={m.id}><td className="td">{pm.get(m.user_id)?.full_name || "—"}</td><td className="td">{pm.get(m.user_id)?.email}</td>
            <td className="td"><RoleSelect memberId={m.id} role={m.role} disabled={!manage || m.role === "owner"} /></td></tr>)}</tbody></table>
      </Section>
      {manage && <Section title="Add a team member"><AddMemberForm /><p className="mt-2 text-xs text-slate">Email invitations are not implemented yet; ask the person to sign up first, then add them here. Requires SUPABASE_SERVICE_ROLE_KEY on the server.</p></Section>}
      <Section title="What each role can do"><dl className="space-y-2 text-sm">{MATRIX.map(([r, d]) => <div key={r}><dt className="font-semibold">{r}</dt><dd className="text-steel">{d}</dd></div>)}</dl></Section>
    </>
  );
}
