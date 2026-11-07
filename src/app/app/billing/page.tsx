import { revalidatePath } from "next/cache";
import { Badge, PageHeader, Section } from "@/components/ui";
import { audit, requireCtx } from "@/lib/ctx";
import { PLANS, USAGE_LABELS, paymentLink, type PlanKey, type UsageKind } from "@/lib/plans";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata = { title: "Usage & Billing" };

const adminEmails = () => (process.env.PLATFORM_ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

export default async function Billing() {
  const ctx = await requireCtx();
  const { data: sub } = await ctx.supabase.from("subscriptions").select("*").eq("organization_id", ctx.org.id).maybeSingle();
  const since = new Date(); since.setUTCDate(1); since.setUTCHours(0, 0, 0, 0);
  const { data: usage } = await ctx.supabase.from("usage_records").select("kind,units").eq("organization_id", ctx.org.id).gte("created_at", since.toISOString());
  const used: Record<string, number> = {};
  for (const u of usage ?? []) used[u.kind] = (used[u.kind] ?? 0) + (u.units ?? 1);
  const current = (sub?.plan in PLANS ? sub?.plan : null) as PlanKey | null;
  const isAdmin = adminEmails().includes((ctx.user.email ?? "").toLowerCase());

  // Verified administrative subscription update (platform admins only; service role bypasses RLS on purpose).
  async function setPlan(fd: FormData) {
    "use server";
    const c = await requireCtx();
    if (!adminEmails().includes((c.user.email ?? "").toLowerCase())) return;
    const plan = String(fd.get("plan")), status = String(fd.get("status"));
    if (!["none", "professional", "enterprise"].includes(plan) || !["inactive", "active", "past_due", "canceled"].includes(status)) return;
    await createServiceClient().from("subscriptions").upsert({ organization_id: String(fd.get("org")) || c.org.id, plan, status, updated_by: c.user.email, updated_at: new Date().toISOString() }, { onConflict: "organization_id" });
    await audit(c, "subscription.admin_update", "subscriptions", undefined, { plan, status });
    revalidatePath("/app/billing");
  }

  return (
    <>
      <PageHeader title="Usage & Billing" subtitle="Plans are paid through an external payment link. A plan is activated only after payment is confirmed by FactoryTwin — returning from the payment page does not activate anything." />
      <Section title="Current subscription">
        <p className="text-sm">Plan: <b>{current ? PLANS[current].name : "No paid plan"}</b> · Status: <Badge>{sub?.status ?? "inactive"}</Badge></p>
      </Section>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {(Object.keys(PLANS) as PlanKey[]).map((k) => {
          const p = PLANS[k], link = paymentLink(k);
          return (
            <div key={k} className={`card p-5 ${current === k ? "ring-2 ring-amber" : ""}`}>
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="font-display text-3xl font-bold">${p.priceUsd}<span className="text-base font-normal text-steel">/month</span></p>
              <p className="mt-1 text-sm text-steel">{p.blurb}</p>
              <ul className="my-3 list-disc pl-5 text-sm">{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
              {link ? <a href={link} target="_blank" rel="noopener noreferrer" className="btn-primary">{current === k ? "Manage / renew" : `Upgrade to ${p.name}`}</a>
                : <button className="btn-line" disabled>Payment link not configured yet</button>}
            </div>);
        })}
      </div>
      <Section title="Usage this month" note="Limits are configured centrally and enforced server-side">
        <table className="w-full"><thead><tr><th className="th">Operation</th><th className="th">Used</th><th className="th">Limit</th></tr></thead>
          <tbody className="divide-y divide-navy/5">{(Object.keys(USAGE_LABELS) as UsageKind[]).map((u) => (
            <tr key={u}><td className="td">{USAGE_LABELS[u]}</td><td className="td">{used[u] ?? 0}</td><td className="td text-slate">{current && PLANS[current].limits[u] !== null ? PLANS[current].limits[u] : "not configured"}</td></tr>))}</tbody></table>
      </Section>
      <Section title="Billing history"><p className="text-sm text-slate">Payments are processed outside FactoryTwin, so invoices and receipts come from your payment provider. No billing history is stored here.</p></Section>
      {isAdmin && (
        <Section title="Platform admin: verified subscription update" note="Visible only to PLATFORM_ADMIN_EMAILS">
          <form action={setPlan} className="flex flex-wrap items-end gap-3">
            <div><label className="label">Organization ID</label><input name="org" className="input w-80" defaultValue={ctx.org.id} /></div>
            <div><label className="label">Plan</label><select name="plan" className="input" defaultValue={sub?.plan ?? "none"}><option>none</option><option>professional</option><option>enterprise</option></select></div>
            <div><label className="label">Status</label><select name="status" className="input" defaultValue={sub?.status ?? "inactive"}><option>inactive</option><option>active</option><option>past_due</option><option>canceled</option></select></div>
            <button className="btn-dark">Apply</button>
          </form>
        </Section>
      )}
    </>
  );
}
