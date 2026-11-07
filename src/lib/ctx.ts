import { redirect } from "next/navigation";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { PLANS, type PlanKey, type UsageKind } from "@/lib/plans";
import type { Role } from "@/lib/permissions";

export type Ctx = Awaited<ReturnType<typeof requireCtx>>;

/** Authenticated user + active organization + role. Redirects to login / onboarding as needed. */
export async function requireCtx() {
  if (!supabaseConfigured()) redirect("/login");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: m } = await supabase.from("organization_members").select("role, organizations(id, name, industry, size, timezone)")
    .eq("user_id", user.id).order("created_at").limit(1).maybeSingle();
  const org = m?.organizations as unknown as { id: string; name: string; industry: string; size: string; timezone: string } | null;
  if (!m || !org) redirect("/onboarding");
  return { supabase, user, org, role: m.role as Role };
}

export async function audit(ctx: Pick<Ctx, "supabase" | "user" | "org">, action: string, entity?: string, entityId?: string, details?: unknown) {
  await ctx.supabase.from("audit_logs").insert({ organization_id: ctx.org.id, user_id: ctx.user.id, action, entity, entity_id: entityId, details: details ?? null });
}

/** Server-side entitlement check. Only limits explicitly configured in plans.ts are enforced. */
export async function consumeUsage(ctx: Pick<Ctx, "supabase" | "user" | "org">, kind: UsageKind, meta?: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: sub } = await ctx.supabase.from("subscriptions").select("plan").eq("organization_id", ctx.org.id).maybeSingle();
  const plan = (sub?.plan && sub.plan in PLANS ? sub.plan : null) as PlanKey | null;
  const limit = plan ? PLANS[plan].limits[kind] : null;
  if (limit !== null) {
    const since = new Date(); since.setUTCDate(1); since.setUTCHours(0, 0, 0, 0);
    const { count } = await ctx.supabase.from("usage_records").select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.org.id).eq("kind", kind).gte("created_at", since.toISOString());
    if ((count ?? 0) >= limit) return { ok: false, error: `Monthly limit reached for this operation (${limit}). Upgrade your plan to continue.` };
  }
  await ctx.supabase.from("usage_records").insert({ organization_id: ctx.org.id, user_id: ctx.user.id, kind, units: 1, meta: meta ?? null });
  return { ok: true };
}
