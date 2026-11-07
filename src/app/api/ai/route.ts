import { NextResponse } from "next/server";
import { z } from "zod";
import { agentByKey } from "@/lib/agents";
import { audit, consumeUsage, requireCtx } from "@/lib/ctx";
import { aiContext, loadData } from "@/lib/data";
import { GeminiError, SAFETY_PREAMBLE, findingsSchema, geminiGenerate, geminiStructured, rateLimit } from "@/lib/gemini";
import { can } from "@/lib/permissions";

export const maxDuration = 60;

const body = z.object({
  mode: z.enum(["copilot", "agent"]),
  agent: z.string().default("factory_intelligence"),
  message: z.string().max(4000).optional(),
  factoryId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  const ctx = await requireCtx();
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { mode, agent, message, factoryId } = parsed.data;
  const def = agentByKey(agent);
  if (!def) return NextResponse.json({ error: "Unknown agent" }, { status: 400 });
  if (!rateLimit(ctx.user.id)) return NextResponse.json({ error: "Too many AI requests. Please wait a minute." }, { status: 429 });

  const use = await consumeUsage(ctx, mode === "copilot" ? "copilot_message" : "ai_agent_run", { agent });
  if (!use.ok) return NextResponse.json({ error: use.error }, { status: 402 });

  const data = await loadData(ctx, { factory: factoryId });
  const context = JSON.stringify(aiContext(data));
  const record = async (status: string, response: string, prompt: string) => {
    await ctx.supabase.from("ai_agent_runs").insert({ organization_id: ctx.org.id, agent_key: agent, user_id: ctx.user.id, prompt, response, status });
  };

  try {
    if (mode === "copilot") {
      const q = message?.trim();
      if (!q) return NextResponse.json({ error: "Enter a question" }, { status: 400 });
      const text = await geminiGenerate({ system: SAFETY_PREAMBLE, prompt: `CONTEXT (organization "${ctx.org.name}"):\n${context}\n\nUSER QUESTION:\n${q}\n\nAnswer in clear sections. End with "Data gaps" if anything needed was missing.` });
      await record("completed", text, q);
      return NextResponse.json({ text });
    }
    const prompt = `CONTEXT:\n${context}\n\nTASK: Act as the ${def.name}. Focus on ${def.focus}.\nReturn JSON: {summary, findings[{title, detail, classification(observed|historical_pattern|ai_assessment|hypothesis), confidence(low|medium|high), evidence[strings naming records], impact, recommended_step, priority(low|medium|high), limitations}], data_gaps[]}. Return no findings you cannot support from CONTEXT.`;
    const out = await geminiStructured(findingsSchema, { system: SAFETY_PREAMBLE, prompt });
    await record("completed", JSON.stringify(out), def.defaultPrompt);
    if (out.findings.length) {
      await ctx.supabase.from("ai_insights").insert(out.findings.map((f) => ({
        organization_id: ctx.org.id, factory_id: factoryId ?? null, agent_key: agent, kind: f.classification, title: f.title,
        body: `${f.detail}${f.limitations ? `\n\nLimitations: ${f.limitations}` : ""}`, evidence: f.evidence, confidence: f.confidence,
      })));
      if (can.write(ctx.role)) {
        await ctx.supabase.from("recommended_actions").insert(out.findings.filter((f) => f.priority !== "low").map((f) => ({
          organization_id: ctx.org.id, factory_id: factoryId ?? null, title: f.title, description: `${f.detail}\n\nRecommended next step: ${f.recommended_step}`,
          evidence: f.evidence, priority: f.priority, impact: f.impact || null, confidence: f.confidence, source: `ai:${agent}`, created_by: ctx.user.id,
        })));
      }
    }
    await audit(ctx, "ai.agent_run", "ai_agents", agent);
    return NextResponse.json({ result: out });
  } catch (e) {
    const err = e instanceof GeminiError ? e : new GeminiError("AI request failed");
    await record("failed", err.message, message ?? def.defaultPrompt);
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
}
