import { z } from "zod";

/** Reusable Gemini service layer. Server-only: the key never reaches the browser. */
export const geminiConfigured = () => Boolean(process.env.GEMINI_API_KEY);

export const SAFETY_PREAMBLE = `You are FactoryTwin's analysis assistant for manufacturing operations.
Rules you must follow:
- Use ONLY the factory data supplied in the CONTEXT JSON. Never invent measurements, equipment states, failure dates or figures. If data is missing or a value is null, say so and name what data would be needed.
- All KPI numbers in CONTEXT are deterministic application calculations; quote them, do not recompute or alter them.
- Clearly label each statement as one of: OBSERVED (directly in the data), HISTORICAL PATTERN, AI ASSESSMENT, or HYPOTHESIS. Never present a correlation as a confirmed cause. Never say a machine WILL fail on a date.
- Recommendations are suggestions for qualified human review, not approved engineering procedures. Never advise bypassing safeguards, interlocks or protective systems, and never instruct on operating or repairing machinery unsafely. Physical interventions require qualified personnel following the manufacturer's procedures.
- Reference supporting records by name (line, equipment, order number).
- Be concise and structured.`;

export class GeminiError extends Error {
  constructor(message: string, public status = 500) { super(message); }
}

type Opts = { system?: string; prompt: string; json?: boolean; temperature?: number };

export async function geminiGenerate({ system, prompt, json, temperature = 0.2 }: Opts): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("Gemini is not configured on this server (GEMINI_API_KEY missing).", 503);
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 55000);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", signal: ctrl.signal,
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature, ...(json ? { responseMimeType: "application/json" } : {}) },
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new GeminiError("The AI service is rate limited right now. Try again shortly.", 429);
      throw new GeminiError("The AI service returned an error. Core features remain available.", 502);
    }
    const j = await res.json();
    const text = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
    if (!text) throw new GeminiError("The AI service returned an empty response.", 502);
    return text;
  } catch (e) {
    if (e instanceof GeminiError) throw e;
    throw new GeminiError("Could not reach the AI service.", 504);
  } finally { clearTimeout(t); }
}

/** Structured output validated with Zod; one repair-free retry. */
export async function geminiStructured<T extends z.ZodTypeAny>(schema: T, opts: Omit<Opts, "json">): Promise<z.infer<T>> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await geminiGenerate({ ...opts, json: true });
    try {
      return schema.parse(JSON.parse(text.replace(/^```json\s*|```$/g, "")));
    } catch { /* retry */ }
  }
  throw new GeminiError("The AI response could not be validated. Please try again.", 502);
}

// In-memory per-user limiter (per server instance). Persistent monthly limits live in plans.ts.
const hits = new Map<string, number[]>();
export function rateLimit(userId: string, max = 12, windowMs = 60000) {
  const now = Date.now();
  const arr = (hits.get(userId) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(userId, arr); return false; }
  arr.push(now); hits.set(userId, arr); return true;
}

export const findingsSchema = z.object({
  summary: z.string(),
  findings: z.array(z.object({
    title: z.string(),
    detail: z.string(),
    classification: z.enum(["observed", "historical_pattern", "ai_assessment", "hypothesis"]),
    confidence: z.enum(["low", "medium", "high"]),
    evidence: z.array(z.string()),
    impact: z.string().optional().default(""),
    recommended_step: z.string(),
    priority: z.enum(["low", "medium", "high"]),
    limitations: z.string().optional().default(""),
  })).max(8),
  data_gaps: z.array(z.string()),
});
