/**
 * Central plan + usage configuration.
 * Prices are fixed by the product brief. Entitlements/limits are NOT invented here:
 * set a number in `limits` (per calendar month) to enforce it server-side; `null` means "not configured → unlimited".
 */
export type PlanKey = "professional" | "enterprise";
export type UsageKind =
  | "ai_analysis" | "ai_agent_run" | "copilot_message" | "twin_analysis"
  | "scenario_simulation" | "report_generation" | "document_extraction";

export const PLANS: Record<PlanKey, {
  name: string; priceUsd: number; blurb: string; features: string[];
  limits: Record<UsageKind, number | null>;
}> = {
  professional: {
    name: "Professional", priceUsd: 57, blurb: "For single-site manufacturing teams.",
    features: ["Digital twin workspace", "CSV & XLSX data import", "Production, downtime, quality & energy intelligence", "Scenario simulator", "FactoryTwin Copilot & AI agents", "Reports with CSV export"],
    limits: { ai_analysis: null, ai_agent_run: null, copilot_message: null, twin_analysis: null, scenario_simulation: null, report_generation: null, document_extraction: null },
  },
  enterprise: {
    name: "Enterprise", priceUsd: 97, blurb: "For multi-plant organizations.",
    features: ["Everything in Professional", "Multi-plant performance comparison", "Role-based team permissions", "Audit log access", "Action workspace & improvement tracking", "Integration settings"],
    limits: { ai_analysis: null, ai_agent_run: null, copilot_message: null, twin_analysis: null, scenario_simulation: null, report_generation: null, document_extraction: null },
  },
};

export const USAGE_LABELS: Record<UsageKind, string> = {
  ai_analysis: "AI analyses", ai_agent_run: "AI agent runs", copilot_message: "Copilot messages",
  twin_analysis: "Digital twin analyses", scenario_simulation: "Scenario simulations",
  report_generation: "Reports generated", document_extraction: "Document extractions",
};

export function paymentLink(plan: PlanKey): string | null {
  const v = plan === "professional" ? process.env.PROFESSIONAL_PAYMENT_LINK : process.env.ENTERPRISE_PAYMENT_LINK;
  return v && v.startsWith("http") ? v : null;
}
