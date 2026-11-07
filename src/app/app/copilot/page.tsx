import { CopilotClient } from "@/components/copilot-client";
import { PageHeader } from "@/components/ui";
import { requireCtx } from "@/lib/ctx";
import { geminiConfigured } from "@/lib/gemini";

export const metadata = { title: "FactoryTwin Copilot" };

export default async function Copilot() {
  const ctx = await requireCtx();
  const { data: factories } = await ctx.supabase.from("factories").select("id,name").eq("organization_id", ctx.org.id).order("name");
  return (
    <>
      <PageHeader title="FactoryTwin Copilot" subtitle="Conversational access to your factory model. Grounded in your records; observed facts are separated from hypotheses." />
      <CopilotClient enabled={geminiConfigured()} factories={factories ?? []} />
    </>
  );
}
