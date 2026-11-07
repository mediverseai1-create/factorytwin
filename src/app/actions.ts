"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ENTITIES, CONVERT, schemaFor, type Entity } from "@/lib/entities";
import { audit, requireCtx } from "@/lib/ctx";
import { can, ROLES } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

export type Issue = { row: number; kind: "rejected" | "duplicate" | "review"; message: string };
export type ImportSummary = { total: number; imported: number; rejected: number; duplicates: number; needsReview: number; issues: Issue[]; error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REF_KEYS: Record<string, string[]> = {
  factories: ["name"], production_lines: ["name", "code"], equipment: ["code", "name"], production_orders: ["order_no"], factory_areas: ["name"],
};

type Ctx = Awaited<ReturnType<typeof requireCtx>>;

async function lookups(ctx: Ctx, entity: Entity) {
  const maps: Record<string, Map<string, string>> = {};
  for (const fl of entity.fields.filter((x) => x.type === "ref")) {
    const tbl = fl.ref!;
    if (maps[tbl]) continue;
    const { data } = await ctx.supabase.from(tbl).select("*").eq("organization_id", ctx.org.id).limit(20000);
    const m = new Map<string, string>();
    for (const r of (data ?? []) as Record<string, string>[]) {
      m.set(r.id, r.id);
      for (const k of REF_KEYS[tbl]) if (r[k]) m.set(String(r[k]).trim().toLowerCase(), r.id);
    }
    maps[tbl] = m;
  }
  return maps;
}

const normKey = (v: unknown) => (v == null ? "" : typeof v === "string" && !isNaN(Date.parse(v)) && /\d{4}-\d{2}/.test(v) ? new Date(v).toISOString() : String(v).trim().toLowerCase());

/** Shared validation/normalisation/duplicate pipeline used by both manual entry and file import. */
async function process(ctx: Ctx, entity: Entity, rows: Record<string, unknown>[]) {
  const schema = schemaFor(entity);
  const maps = await lookups(ctx, entity);
  const issues: Issue[] = [];
  const good: Record<string, unknown>[] = [];
  const goodRowNo: number[] = [];
  const nk = entity.naturalKey;
  const seen = new Set<string>();
  if (nk) {
    const { data } = await ctx.supabase.from(entity.table).select(nk.join(",")).eq("organization_id", ctx.org.id).limit(100000);
    for (const r of (data ?? []) as unknown as Record<string, unknown>[]) seen.add(nk.map((k) => normKey(r[k])).join("|"));
  }
  let rejected = 0, duplicates = 0, needsReview = 0;
  rows.forEach((raw, i) => {
    const rowNo = i + 1;
    const row: Record<string, unknown> = { ...raw };
    const warnings: string[] = [];
    // Unit conversion: keep original value, record the conversion applied.
    for (const fl of entity.fields.filter((x) => x.unitConvert)) {
      const unit = String(row.unit ?? "").trim();
      const v = Number(row[fl.name]);
      if (unit && isFinite(v)) {
        const conv = CONVERT[fl.unitConvert!](v, unit);
        if (conv === null) { issues.push({ row: rowNo, kind: "rejected", message: `Unrecognised unit "${unit}" for ${fl.label}` }); rejected++; return; }
        if (entity.table === "energy_records") { row.original_value = v; row.original_unit = unit; }
        if (unit.toLowerCase() !== (fl.unitConvert === "energy" ? "kwh" : "min")) warnings.push(`${v} ${unit} converted to ${conv.toFixed(3)} ${fl.unitConvert === "energy" ? "kWh" : "min"}`);
        row[fl.name] = conv;
      }
    }
    delete row.unit;
    if (entity.table === "material_records" || entity.table === "equipment_readings") row.unit = raw.unit;
    // Resolve references by id / name / code.
    for (const fl of entity.fields.filter((x) => x.type === "ref")) {
      const v = row[fl.name];
      if (v === "" || v == null) { row[fl.name] = null; continue; }
      const s = String(v).trim();
      const id = UUID.test(s) ? maps[fl.ref!].get(s) : maps[fl.ref!].get(s.toLowerCase());
      if (!id) {
        if (fl.required) { issues.push({ row: rowNo, kind: "rejected", message: `${fl.label} "${s}" was not found` }); rejected++; return; }
        warnings.push(`${fl.label} "${s}" not found — saved without link`); row[fl.name] = null;
      } else row[fl.name] = id;
    }
    // Infer factory from line if only the line was given.
    const parsed = schema.safeParse(row);
    if (!parsed.success) {
      issues.push({ row: rowNo, kind: "rejected", message: parsed.error.issues.map((x) => x.message).join("; ") });
      rejected++; return;
    }
    const data = parsed.data as Record<string, unknown>;
    if (entity.table === "energy_records") { data.original_value = row.original_value ?? null; data.original_unit = row.original_unit ?? null; }
    if (entity.table === "downtime_events" && !data.planned) data.planned = false;
    if (entity.table === "downtime_events" && data.started_at && data.duration_minutes != null) {
      data.ended_at = new Date(new Date(String(data.started_at)).getTime() + Number(data.duration_minutes) * 60000).toISOString();
    }
    if (nk) {
      const key = nk.map((k) => normKey(data[k])).join("|");
      if (seen.has(key)) { issues.push({ row: rowNo, kind: "duplicate", message: "Duplicate of an existing or earlier record — skipped" }); duplicates++; return; }
      seen.add(key);
    }
    if (warnings.length) { needsReview++; warnings.forEach((m) => issues.push({ row: rowNo, kind: "review", message: m })); }
    good.push(data); goodRowNo.push(rowNo);
  });
  return { good, issues, rejected, duplicates, needsReview };
}

async function insertChunks(ctx: Ctx, entity: Entity, good: Record<string, unknown>[]) {
  let imported = 0; let error: string | undefined;
  for (let i = 0; i < good.length; i += 500) {
    const chunk = good.slice(i, i + 500).map((r) => ({ ...r, organization_id: ctx.org.id }));
    const { error: e } = await ctx.supabase.from(entity.table).insert(chunk);
    if (e) { error = e.message; break; }
    imported += chunk.length;
  }
  return { imported, error };
}

export async function importRows(entityKey: string, rows: Record<string, unknown>[], fileName: string): Promise<ImportSummary> {
  const ctx = await requireCtx();
  const entity = ENTITIES[entityKey];
  const empty = { total: rows.length, imported: 0, rejected: 0, duplicates: 0, needsReview: 0, issues: [] as Issue[] };
  if (!entity) return { ...empty, error: "Unknown data category" };
  if (!can.write(ctx.role)) return { ...empty, error: "Your role cannot import data" };
  if (rows.length > 50000) return { ...empty, error: "Files are limited to 50,000 rows per import" };
  const p = await process(ctx, entity, rows);
  const ins = await insertChunks(ctx, entity, p.good);
  const summary: ImportSummary = { total: rows.length, imported: ins.imported, rejected: p.rejected + (ins.error ? p.good.length - ins.imported : 0), duplicates: p.duplicates, needsReview: p.needsReview, issues: p.issues.slice(0, 500), error: ins.error };
  await ctx.supabase.from("data_imports").insert({
    organization_id: ctx.org.id, category: entity.table, file_name: fileName, total: summary.total, imported: summary.imported, rejected: summary.rejected,
    duplicates: summary.duplicates, needs_review: summary.needsReview, status: ins.error ? "failed" : "completed", issues: summary.issues, created_by: ctx.user.id,
  });
  await audit(ctx, "data.import", entity.table, undefined, { fileName, ...summary, issues: undefined });
  revalidatePath("/app", "layout");
  return summary;
}

export async function createRecord(entityKey: string, _prev: unknown, fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const ctx = await requireCtx();
  const entity = ENTITIES[entityKey];
  if (!entity) return { error: "Unknown record type" };
  if (!can.write(ctx.role)) return { error: "Your role has read-only access" };
  const row: Record<string, unknown> = {};
  for (const fl of entity.fields) row[fl.name] = fl.type === "bool" ? fd.get(fl.name) === "on" : fd.get(fl.name);
  const p = await process(ctx, entity, [row]);
  if (p.rejected) return { error: p.issues.find((i) => i.kind === "rejected")?.message };
  if (p.duplicates) return { error: "A matching record already exists" };
  const ins = await insertChunks(ctx, entity, p.good);
  if (ins.error) return { error: ins.error };
  await audit(ctx, "record.create", entity.table);
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function deleteRecord(entityKey: string, id: string) {
  const ctx = await requireCtx();
  const entity = ENTITIES[entityKey];
  if (!entity || !can.delete(ctx.role)) return { error: "Not permitted" };
  const { error } = await ctx.supabase.from(entity.table).delete().eq("id", id).eq("organization_id", ctx.org.id);
  if (error) return { error: error.message };
  await audit(ctx, "record.delete", entity.table, id);
  revalidatePath("/app", "layout");
  return {};
}

// ───── Onboarding ─────
export async function createOrganization(_p: unknown, fd: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const name = String(fd.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Enter your company name" };
  const { data: orgId, error } = await supabase.rpc("create_organization", {
    p_name: name, p_industry: String(fd.get("industry") ?? ""), p_size: String(fd.get("size") ?? ""), p_timezone: String(fd.get("timezone") ?? "UTC"),
  });
  if (error) return { error: error.message };
  const factory = String(fd.get("factory") ?? "").trim();
  if (factory) {
    const { data: f } = await supabase.from("factories").insert({ organization_id: orgId, name: factory, location: String(fd.get("location") ?? "") || null, timezone: String(fd.get("timezone") ?? "") || null }).select("id").single();
    const areas = String(fd.get("areas") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (f && areas.length) await supabase.from("factory_areas").insert(areas.map((a) => ({ organization_id: orgId, factory_id: f.id, name: a })));
  }
  redirect("/app");
}

// ───── Action workspace ─────
export async function createAction(_p: unknown, fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const ctx = await requireCtx();
  if (!can.write(ctx.role)) return { error: "Read-only role" };
  const title = String(fd.get("title") ?? "").trim();
  if (!title) return { error: "Title is required" };
  const { data, error } = await ctx.supabase.from("recommended_actions").insert({
    organization_id: ctx.org.id, title, description: String(fd.get("description") ?? "") || null, priority: String(fd.get("priority") ?? "medium"),
    impact: String(fd.get("impact") ?? "") || null, factory_id: String(fd.get("factory_id") ?? "") || null, source: "manual", created_by: ctx.user.id,
  }).select("id").single();
  if (error) return { error: error.message };
  await audit(ctx, "action.create", "recommended_actions", data.id);
  revalidatePath("/app/operational-insights");
  return { ok: true };
}

export async function decideAction(id: string, decision: "approved" | "rejected", note: string) {
  const ctx = await requireCtx();
  if (!can.approveActions(ctx.role)) return { error: "Only owners, administrators, plant managers and operations directors can approve or reject recommendations" };
  const { error } = await ctx.supabase.from("recommended_actions").update({ approval_status: decision }).eq("id", id).eq("organization_id", ctx.org.id);
  if (error) return { error: error.message };
  await ctx.supabase.from("action_approvals").insert({ organization_id: ctx.org.id, action_id: id, decided_by: ctx.user.id, decision, note: note || null });
  await audit(ctx, `action.${decision}`, "recommended_actions", id, { note });
  revalidatePath("/app/operational-insights");
  return {};
}

export async function updateAction(id: string, patch: { implementation_status?: string; outcome?: string; notes?: string; assigned_to?: string | null }) {
  const ctx = await requireCtx();
  if (!can.write(ctx.role)) return { error: "Read-only role" };
  const upd: Record<string, unknown> = { ...patch };
  if (patch.implementation_status === "completed") upd.completed_on = new Date().toISOString().slice(0, 10);
  const { error } = await ctx.supabase.from("recommended_actions").update(upd).eq("id", id).eq("organization_id", ctx.org.id);
  if (error) return { error: error.message };
  await audit(ctx, "action.update", "recommended_actions", id, patch);
  revalidatePath("/app/operational-insights");
  return {};
}

// ───── Team ─────
export async function addMember(_p: unknown, fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const ctx = await requireCtx();
  if (!can.manageTeam(ctx.role)) return { error: "Only owners and administrators can manage the team" };
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const role = String(fd.get("role") ?? "viewer");
  if (!(ROLES as readonly string[]).includes(role) || role === "owner") return { error: "Invalid role" };
  // Looking up another user's profile by email needs the service role; the person must have signed up first.
  let userId: string | undefined;
  try {
    const { data } = await createServiceClient().from("profiles").select("id").eq("email", email).maybeSingle();
    userId = data?.id;
  } catch { return { error: "Adding members requires SUPABASE_SERVICE_ROLE_KEY to be configured on the server" }; }
  if (!userId) return { error: "No FactoryTwin account exists for that email yet. Ask them to sign up first." };
  const { error } = await ctx.supabase.from("organization_members").insert({ organization_id: ctx.org.id, user_id: userId, role });
  if (error) return { error: error.message.includes("duplicate") ? "Already a member" : error.message };
  await audit(ctx, "member.add", "organization_members", userId, { role });
  revalidatePath("/app/team");
  return { ok: true };
}

export async function setMemberRole(memberId: string, role: string) {
  const ctx = await requireCtx();
  if (!can.manageTeam(ctx.role) || !(ROLES as readonly string[]).includes(role)) return { error: "Not permitted" };
  const { error } = await ctx.supabase.from("organization_members").update({ role }).eq("id", memberId).eq("organization_id", ctx.org.id).neq("role", "owner");
  if (error) return { error: error.message };
  await audit(ctx, "member.role", "organization_members", memberId, { role });
  revalidatePath("/app/team");
  return {};
}

// ───── Scenarios ─────
export async function saveScenario(name: string, type: string, factory_id: string | null, assumptions: unknown, result: unknown) {
  const ctx = await requireCtx();
  if (!can.write(ctx.role)) return { error: "Read-only role" };
  const { data: def, error } = await ctx.supabase.from("scenario_definitions").insert({ organization_id: ctx.org.id, name, type, factory_id, assumptions, created_by: ctx.user.id }).select("id").single();
  if (error) return { error: error.message };
  const { data: run } = await ctx.supabase.from("scenario_runs").insert({ organization_id: ctx.org.id, definition_id: def.id, run_by: ctx.user.id, baseline: (result as { baseline?: unknown }).baseline }).select("id").single();
  if (run) await ctx.supabase.from("scenario_results").insert({ organization_id: ctx.org.id, run_id: run.id, result });
  await audit(ctx, "scenario.save", "scenario_definitions", def.id);
  revalidatePath("/app/simulator");
  return {};
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
