import { revalidatePath } from "next/cache";
import { PageHeader, Section } from "@/components/ui";
import { audit, requireCtx } from "@/lib/ctx";
import { geminiConfigured } from "@/lib/gemini";
import { can } from "@/lib/permissions";

export const metadata = { title: "Settings" };

export default async function Settings() {
  const ctx = await requireCtx();
  const editable = can.manageTeam(ctx.role);

  async function save(fd: FormData) {
    "use server";
    const c = await requireCtx();
    if (!can.manageTeam(c.role)) return;
    const name = String(fd.get("name") ?? "").trim();
    if (name.length < 2) return;
    await c.supabase.from("organizations").update({ name, industry: String(fd.get("industry") ?? ""), size: String(fd.get("size") ?? ""), timezone: String(fd.get("timezone") ?? "UTC") }).eq("id", c.org.id);
    await audit(c, "organization.update", "organizations", c.org.id);
    revalidatePath("/app", "layout");
  }

  return (
    <>
      <PageHeader title="Settings" />
      <Section title="Organization">
        <form action={save} className="grid max-w-2xl gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label">Name</label><input name="name" className="input" defaultValue={ctx.org.name} disabled={!editable} /></div>
          <div><label className="label">Industry</label><input name="industry" className="input" defaultValue={ctx.org.industry ?? ""} disabled={!editable} /></div>
          <div><label className="label">Size</label><input name="size" className="input" defaultValue={ctx.org.size ?? ""} disabled={!editable} /></div>
          <div><label className="label">Timezone</label><input name="timezone" className="input" defaultValue={ctx.org.timezone ?? ""} disabled={!editable} /></div>
          {editable && <div className="sm:col-span-2"><button className="btn-dark">Save changes</button></div>}
        </form>
      </Section>
      <Section title="System status">
        <ul className="text-sm"><li>AI (Gemini): <b>{geminiConfigured() ? "configured" : "not configured — AI features disabled, everything else works"}</b></li>
          <li>Live machine data sources: <b>none connected</b></li></ul>
      </Section>
      <Section title="Safety principles">
        <ul className="list-disc pl-5 text-sm text-steel"><li>FactoryTwin never sends commands to machinery and has no control interface.</li><li>AI output is advisory; physical interventions need qualified people following the manufacturer's procedures.</li><li>Simulation results are estimates under stated assumptions, not operating conditions.</li><li>Important changes are recorded in the audit log.</li></ul>
      </Section>
    </>
  );
}
