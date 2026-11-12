import Link from "next/link";
import { RoiCalculator } from "@/components/roi-calculator";
import { Logo } from "@/components/ui";
import { PLANS } from "@/lib/plans";

const PAINS = [
  ["Data lives in ten places", "Machine logs, maintenance sheets, ERP exports and shift reports sit in separate files. Nobody has one trusted picture of the plant, so every review starts with reconciling spreadsheets."],
  ["You find out about problems late", "Repeated stoppages, slow drift on a machine and rising scrap are usually spotted after the shift, the week or the missed delivery — not while a decision is still cheap."],
  ["Planning runs on gut feel", "When a rush order lands or a line goes down, planners guess what slips. Nobody can test the options before committing to one."],
  ["Dashboards show, they don't explain", "Monitoring tools tell you a number moved. They rarely tell you why, what it affects, or what to look at first."],
  ["Improvements are never proven", "Fixes get made, but there is no record of what was recommended, who approved it, and whether performance actually changed afterwards."],
  ["AI you can't trust on the shop floor", "Generic chatbots invent figures. Operations teams need answers tied to their own records, with the uncertainty stated."],
];

const COMPARE = [
  ["Single structured model of factory → line → equipment", "No", "No", "Partly", "Yes"],
  ["Import and validate CSV / Excel exports", "Manual", "Manual", "Partly", "Yes — mapping, duplicates, unit conversion"],
  ["Published, deterministic KPI definitions", "Varies", "Varies", "Yes", "Yes — hover any KPI"],
  ["What-if scenario simulation", "No", "No", "Rare", "Yes"],
  ["AI explanations grounded in your records", "No", "No", "Rare", "Yes — with data gaps stated"],
  ["Approval workflow and outcome tracking", "No", "No", "No", "Yes, audited"],
  ["Multi-plant comparison with access control", "Manual", "Manual", "Partly", "Yes"],
];

const MODULES = [
  { id: "twin", tag: "Digital Twin Modeling", title: "A real model of your plant — not a picture of one.", body: "Build the hierarchy organization → factory → production area → line → equipment, then link machines to each other and attach every production event, maintenance activity, quality result and energy record to the asset it belongs to. The model persists, so every report, simulation and AI answer works from the same facts.",
    points: ["Interactive hierarchy with per-asset history", "Equipment relationships and dependencies", "Data-completeness checks that show what the model is missing", "Architecture ready to add 3D visualization later"] },
  { id: "maintenance", tag: "Predictive Maintenance", title: "Know which assets deserve attention first.", body: "FactoryTwin ranks equipment by recorded evidence: repeated unplanned downtime, overdue tasks, drift in uploaded readings and the gap since the last maintenance. Every finding is labelled observed, historical pattern or AI assessment. It never claims a machine will fail on a given date.",
    points: ["Equipment attention list with transparent scoring", "MTBF / MTTR from recorded events", "Typical recorded maintenance intervals", "Qualified-human review on every intervention"] },
  { id: "planning", tag: "Production Planning", title: "See delivery risk before the customer does.", body: "Compare open orders with each line's nominal capacity and observed availability. See which orders are at risk, which lines are overloaded, and what data is missing to plan properly.",
    points: ["Order delivery outlook by priority and due date", "Capacity and load per line", "Explicit data-gap warnings", "Never touches live schedules"] },
  { id: "quality", tag: "Quality & Waste", title: "Turn scrap and defects into investigations.", body: "Track inspection results, defect rates, batch differences and scrap reasons. Patterns are surfaced as hypotheses to investigate — never presented as confirmed root causes.",
    points: ["Defect and scrap trends", "Batch comparison", "Corrective-action tracking in the action workspace", "Quality reports"] },
  { id: "energy", tag: "Energy Intelligence", title: "Energy per unit, by line and by shift.", body: "Import energy records in Wh, kWh, MWh or GJ; values are normalised to kWh and the original is kept. See consumption trends and energy intensity where units-produced data exists.",
    points: ["Line and shift comparisons", "Energy intensity (kWh per unit)", "Audit-friendly unit conversion", "No invented real-time readings"] },
  { id: "simulation", tag: "Scenario Simulator", title: "Test the decision before you make it.", body: "Raise demand, take a line offline, move a maintenance window or change capacity and watch deliveries shift. The numbers come from a transparent capacity model with stated assumptions; AI can explain the outcome but never produces it.",
    points: ["Six scenario types, side-by-side with baseline", "Assumptions and limitations shown with every result", "Save and compare scenarios", "Completely separate from machine control"] },
  { id: "multiplant", tag: "Multi-Plant Intelligence", title: "Compare sites on identical definitions.", body: "Executives see output, OEE, downtime, scrap and energy intensity for every facility side by side, with organization-level data isolation and role-based access.",
    points: ["Consolidated factory comparison", "Same KPI definitions at every site", "Role-based permissions", "Audit log of important changes"] },
];

const ROLES = [
  ["Plant managers", "A single morning view of output, downtime, open orders and what needs a decision."],
  ["Maintenance managers", "A ranked attention list with the downtime and maintenance evidence behind each asset."],
  ["Production planners", "Delivery risk by order and a simulator to test rush orders and outages."],
  ["Quality managers", "Defect and scrap trends with hypotheses to investigate and corrective actions to track."],
  ["Energy managers", "Energy per unit by line and shift, with conversions documented."],
  ["Executives", "Multi-plant comparison and an executive summary built from the same governed numbers."],
];

const STEPS = [
  ["Model your factory", "Create factories, areas, lines and equipment — or import your equipment register."],
  ["Bring in your data", "Upload CSV or Excel exports. Map columns, fix validation issues and skip duplicates before anything is saved."],
  ["Understand performance", "Deterministic KPIs with published definitions: OEE, downtime, scrap, energy intensity."],
  ["Simulate and decide", "Test scenarios, review AI recommendations with evidence, then approve or reject."],
  ["Prove the outcome", "Track implementation and record observed results — no attribution without evidence."],
];

const TRUST = [
  ["Grounded AI", "Gemini only sees your organization's summarised records. It must name supporting records, label facts versus hypotheses and say when data is missing."],
  ["Deterministic numbers", "KPIs and simulations are computed by the application, not by the language model, and covered by automated tests."],
  ["Human in the loop", "Recommendations start as pending. Approval, rejection and outcomes are recorded with who and when."],
  ["No machine control", "FactoryTwin has no control interface and never sends commands to equipment."],
];

const SECURITY = [
  "Organization-level isolation enforced by database Row Level Security on every record",
  "Eleven roles — owner, administrator, plant manager, operations director, planner, maintenance, quality, energy, engineer, viewer",
  "Audit log of imports, approvals, role changes and other important actions",
  "Private file storage scoped to your organization",
  "API keys held server-side only; never sent to the browser",
  "Rate limiting and server-side usage limits on AI operations",
];

const INTEGRATIONS: [string, string][] = [
  ["CSV / XLSX upload", "Available"], ["REST API ingestion", "Coming soon"], ["ERP exports", "Coming soon"], ["MES platforms", "Coming soon"],
  ["SCADA / OPC UA", "Coming soon"], ["Azure IoT Hub / Digital Twins", "Coming soon"], ["Power BI", "Coming soon"], ["PDF report extraction", "Coming soon"],
];

const INDUSTRIES = ["Automotive", "Food & Beverage", "Pharmaceutical", "Electronics", "Metals & Machining", "Plastics & Packaging", "Chemicals", "Textiles", "Aerospace", "General Manufacturing"];

const PRICING_ROWS: [string, boolean, boolean][] = [
  ["Digital twin workspace", true, true], ["CSV & XLSX import with validation", true, true], ["Production, downtime, quality & energy intelligence", true, true],
  ["Scenario simulator", true, true], ["FactoryTwin Copilot & 10 AI agents", true, true], ["Reports with CSV / print-to-PDF", true, true],
  ["Multi-plant performance comparison", false, true], ["Role-based team permissions & audit log", false, true], ["Action workspace & improvement tracking", false, true],
];

const FAQ = [
  ["What is a digital twin in FactoryTwin?", "A structured, persistent model of your factories, lines, equipment and their operational records, built from the data you provide and updated as you upload more."],
  ["How long until I see value?", "Once your factory, lines and equipment exist and you've imported production and downtime records, KPIs and the attention list populate immediately. The depth of insight depends on the data you bring."],
  ["Is my data shown live?", "Only uploaded records are shown, with source and timestamp. Live status requires a connected data source; none are connected by default and FactoryTwin never displays fabricated readings."],
  ["What data format do I need?", "CSV or Excel exports from your ERP, MES, maintenance system or spreadsheets. You map your columns to FactoryTwin fields and review issues before import."],
  ["Does FactoryTwin control machinery?", "No. There is no control interface. AI output is advisory and physical interventions stay under qualified human supervision."],
  ["Can AI be wrong?", "Yes. That is why every AI statement is labelled as observed, historical pattern, assessment or hypothesis, cites its records, and needs human approval before becoming an action."],
  ["Which integrations are supported?", "Today: CSV and XLSX. ERP, MES, SCADA/OPC UA, IoT platforms, Power BI and a REST ingestion API are planned and labelled Coming Soon."],
  ["How is multi-tenant data protected?", "Every record belongs to an organization and is protected by database Row Level Security, role-based permissions and an audit log."],
  ["Can I use it across several plants?", "Yes. Add multiple factories and compare them on the same definitions; Enterprise adds multi-plant comparison and team permissions."],
  ["How does billing work?", "Plans are billed monthly through a secure external payment link. A plan is activated only after payment is verified."],
  ["Can I cancel?", "Plans are monthly. Contact cto@factorytwin.online for any billing question."],
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber">{children}</p>;
}

export default function Home() {
  return (
    <div className="bg-navy text-ivory">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-navy/95 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5" aria-label="Primary">
          <Link href="/"><Logo light /></Link>
          <div className="hidden gap-6 text-sm text-ivory/80 lg:flex">
            <a href="#problem" className="hover:text-ivory">Problem</a><a href="#platform" className="hover:text-ivory">Platform</a><a href="#ai" className="hover:text-ivory">AI &amp; trust</a><a href="#roi" className="hover:text-ivory">ROI</a><a href="#security" className="hover:text-ivory">Security</a><a href="#pricing" className="hover:text-ivory">Pricing</a><a href="#faq" className="hover:text-ivory">FAQ</a>
          </div>
          <div className="flex gap-2"><Link href="/login" className="btn text-ivory hover:bg-white/10">Sign in</Link><Link href="/signup" className="btn-primary">Get Started</Link></div>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
        <div>
          <Eyebrow>AI Manufacturing &amp; Digital Twin Intelligence</Eyebrow>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-ivory sm:text-5xl">Your Factory, Understood Before the Next Problem Happens.</h1>
          <p className="mt-5 max-w-xl text-lg text-ivory/75">FactoryTwin transforms factory, equipment and production data into intelligent digital representations that help manufacturing teams anticipate problems, simulate operational changes and improve production decisions.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/signup" className="btn-primary px-6 py-3">Get Started</Link><a href="#platform" className="btn border border-white/25 px-6 py-3 text-ivory hover:bg-white/10">Explore the Platform</a></div>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ivory/60"><li>✓ Works from your CSV / Excel exports</li><li>✓ No machine control, ever</li><li>✓ Every number has a published definition</li></ul>
        </div>
        <figure aria-label="Illustration of the FactoryTwin model hierarchy">
          <svg viewBox="0 0 420 330" className="w-full rounded-xl border border-white/10 bg-charcoal/60 p-3">
            {[["Organization", 150, 14, 120], ["Factory", 150, 80, 120]].map(([t, x, y, w]) => (<g key={String(t)}><rect x={Number(x)} y={Number(y)} width={Number(w)} height="40" rx="6" fill="#486779" /><text x={Number(x) + Number(w) / 2} y={Number(y) + 25} textAnchor="middle" fill="#F2F0E8" fontSize="13">{t}</text></g>))}
            {[40, 160, 280].map((x) => (<g key={x}><rect x={x} y="150" width="100" height="40" rx="6" fill="#2d4a5c" stroke="#E5A13A" /><text x={x + 50} y="175" textAnchor="middle" fill="#F2F0E8" fontSize="12">Production line</text></g>))}
            {[20, 80, 140, 200, 260, 320].map((x) => (<rect key={x} x={x} y="250" width="48" height="34" rx="4" fill="#3D765C" opacity="0.85" />))}
            <path d="M210 54V80M210 120V135H90V150M210 135H210V150M210 135H330V150M90 190V220M210 190V220M330 190V220" stroke="#8997A0" fill="none" />
            <path d="M44 220H356M44 220V250M104 220V250M164 220V250M224 220V250M284 220V250M344 220V250" stroke="#8997A0" fill="none" />
            <text x="210" y="312" textAnchor="middle" fill="#8997A0" fontSize="11">Equipment · production events · maintenance · quality · energy</text>
          </svg>
          <figcaption className="mt-2 text-xs text-ivory/50">Schematic of the model structure — not customer data.</figcaption>
        </figure>
      </section>

      {/* Audience strip */}
      <section className="border-y border-white/10 bg-charcoal/50 py-6">
        <p className="mx-auto max-w-6xl px-5 text-center text-sm text-ivory/60">Built for plant managers · maintenance managers · production planners · quality and energy managers · industrial operations directors · multi-site manufacturing groups</p>
      </section>

      {/* Problem */}
      <section id="problem" className="mx-auto max-w-6xl px-5 py-20">
        <Eyebrow>The problem</Eyebrow>
        <h2 className="mt-2 max-w-3xl text-3xl font-bold text-ivory">Factories generate enormous data. Decisions still get made on spreadsheets and instinct.</h2>
        <p className="mt-3 max-w-3xl text-ivory/70">If any of these sound familiar, the issue isn't a lack of data — it's that the data never becomes a single, trusted, decision-ready model.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {PAINS.map(([t, b]) => (<article key={t} className="rounded-xl border border-white/10 bg-charcoal/50 p-5"><h3 className="font-semibold text-ivory">{t}</h3><p className="mt-2 text-sm text-ivory/70">{b}</p></article>))}
        </div>
      </section>

      {/* Before / after */}
      <section className="bg-ivory py-20 text-charcoal">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-3xl font-bold">From reacting to deciding</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="card p-6"><h3 className="text-lg font-semibold text-danger">Without FactoryTwin</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-steel"><li>Weekly spreadsheet merges before every review meeting</li><li>Downtime reasons discussed from memory</li><li>Rush orders accepted without knowing what slips</li><li>Maintenance scheduled by habit or after a breakdown</li><li>Fixes made with no record of the outcome</li></ul></div>
            <div className="card border-ok/40 p-6"><h3 className="text-lg font-semibold text-ok">With FactoryTwin</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-steel"><li>One structured model; imports validated once</li><li>Downtime Pareto and repeat-offender equipment on demand</li><li>Simulate the rush order and see which deliveries move</li><li>A ranked, evidence-backed attention list for maintenance</li><li>Approved actions tracked through to recorded outcomes</li></ul></div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-20">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-2 text-3xl font-bold text-ivory">From raw exports to proven improvements</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-5">{STEPS.map(([t, b], i) => (<li key={t} className="rounded-xl border border-white/10 bg-charcoal/50 p-5"><div className="font-display text-2xl text-amber">0{i + 1}</div><h3 className="mt-2 font-semibold text-ivory">{t}</h3><p className="mt-1 text-sm text-ivory/70">{b}</p></li>))}</ol>
        <p className="mt-6 text-sm text-ivory/50">Factory data → digital twin model → operational understanding → AI analysis → scenario simulation → recommended decisions → human approval → outcome tracking.</p>
      </section>

      {/* Modules */}
      <section id="platform" className="bg-ivory py-20 text-charcoal">
        <div className="mx-auto max-w-6xl space-y-16 px-5">
          <div><Eyebrow>The platform</Eyebrow><h2 className="mt-2 max-w-3xl text-3xl font-bold text-navy">One integrated platform, not seven separate tools.</h2>
            <p className="mt-3 max-w-3xl text-steel">Every module reads the same factory model, so a downtime record is also a maintenance signal, a planning constraint and an energy denominator.</p></div>
          {MODULES.map((m, i) => (
            <article key={m.id} id={m.id} className={`grid items-start gap-8 md:grid-cols-2 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-dark">{m.tag}</p><h3 className="mt-2 text-2xl font-bold">{m.title}</h3><p className="mt-3 text-steel">{m.body}</p></div>
              <ul className="card space-y-2 p-5 text-sm">{m.points.map((p) => <li key={p} className="flex gap-2"><span className="text-ok">✓</span>{p}</li>)}</ul>
            </article>))}
        </div>
      </section>

      {/* AI */}
      <section id="ai" className="mx-auto max-w-6xl px-5 py-20">
        <Eyebrow>AI agents &amp; Copilot</Eyebrow>
        <h2 className="mt-2 max-w-3xl text-3xl font-bold text-ivory">AI that shows its evidence — and its gaps.</h2>
        <p className="mt-3 max-w-3xl text-ivory/70">Ten specialised agents (factory intelligence, maintenance, planning, quality, energy, bottlenecks, simulation, executive reporting, continuous improvement and twin analysis) and a conversational Copilot work from the same factory context.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{TRUST.map(([t, b]) => (<div key={t} className="rounded-xl border border-white/10 bg-charcoal/50 p-5"><h3 className="font-semibold text-amber">{t}</h3><p className="mt-2 text-sm text-ivory/70">{b}</p></div>))}</div>
        <div className="mt-8 rounded-xl border border-white/10 bg-charcoal/60 p-5 text-sm">
          <p className="text-xs uppercase tracking-wide text-ivory/50">Example questions for the Copilot</p>
          <ul className="mt-2 grid gap-1 text-ivory/80 md:grid-cols-2"><li>“Which machines have repeated downtime?”</li><li>“Which production orders are at risk of delay?”</li><li>“What are the major bottlenecks?”</li><li>“Where is our energy consumption increasing?”</li><li>“What happens if we increase demand?”</li><li>“Prepare an executive factory performance report.”</li></ul>
        </div>
      </section>

      {/* Roles */}
      <section className="bg-charcoal py-20">
        <div className="mx-auto max-w-6xl px-5"><h2 className="text-3xl font-bold text-ivory">One platform, every role in the plant</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{ROLES.map(([t, b]) => (<div key={t} className="rounded-xl border border-white/10 p-5"><h3 className="font-semibold text-ivory">{t}</h3><p className="mt-1 text-sm text-ivory/70">{b}</p></div>))}</div></div>
      </section>

      {/* Comparison */}
      <section className="bg-ivory py-20 text-charcoal">
        <div className="mx-auto max-w-6xl px-5"><h2 className="text-3xl font-bold text-navy">How FactoryTwin compares</h2>
          <p className="mt-2 text-steel">General comparison by category; individual products vary.</p>
          <div className="card mt-6 overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="bg-ivory"><tr>{["Capability", "Spreadsheets", "Generic chatbot", "Monitoring dashboards", "FactoryTwin"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-navy/5">{COMPARE.map((r) => (<tr key={r[0]}>{r.map((c, i) => <td key={i} className={`td ${i === 4 ? "font-semibold text-ok" : i === 0 ? "font-medium" : "text-steel"}`}>{c}</td>)}</tr>))}</tbody></table></div></div>
      </section>

      {/* ROI */}
      <section id="roi" className="mx-auto max-w-6xl px-5 py-20">
        <Eyebrow>Estimate your value</Eyebrow>
        <h2 className="mt-2 mb-6 text-3xl font-bold text-ivory">What is unplanned downtime costing you?</h2>
        <RoiCalculator />
      </section>

      {/* Security */}
      <section id="security" className="bg-charcoal py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-2">
          <div><Eyebrow>Security &amp; governance</Eyebrow><h2 className="mt-2 text-3xl font-bold text-ivory">Built for operational data you can't afford to leak.</h2>
            <p className="mt-3 text-ivory/70">Industrial data is sensitive. Isolation, permissions and auditability are part of the database design, not an afterthought. We do not claim third-party certifications.</p></div>
          <ul className="space-y-3 text-sm text-ivory/80">{SECURITY.map((s) => <li key={s} className="flex gap-2"><span className="text-amber">■</span>{s}</li>)}</ul>
        </div>
      </section>

      {/* Integrations */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-3xl font-bold text-ivory">Integrations — honest status</h2>
        <p className="mt-2 max-w-2xl text-ivory/70">Start with the exports you already have. We show exactly what is connected; nothing is simulated to look live.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{INTEGRATIONS.map(([n, s]) => (<div key={n} className="flex items-center justify-between rounded-lg border border-white/10 bg-charcoal/50 px-4 py-3 text-sm"><span>{n}</span><span className={s === "Available" ? "text-ok" : "text-ivory/40"}>{s}</span></div>))}</div>
      </section>

      {/* Industries */}
      <section id="industries" className="bg-charcoal py-16">
        <div className="mx-auto max-w-6xl px-5"><h2 className="text-3xl font-bold text-ivory">Industries supported</h2>
          <div className="mt-6 flex flex-wrap gap-2">{INDUSTRIES.map((i) => <span key={i} className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-ivory/85">{i}</span>)}</div></div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-ivory py-20 text-charcoal">
        <div className="mx-auto max-w-5xl px-5"><h2 className="text-center text-3xl font-bold text-navy">Pricing</h2><p className="mt-2 text-center text-steel">Simple monthly plans. Create an account first and upgrade when you are ready.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-2">{(["professional", "enterprise"] as const).map((k) => { const p = PLANS[k]; return (
            <div key={k} className={`card p-6 ${k === "enterprise" ? "ring-2 ring-amber" : ""}`}>{k === "enterprise" && <span className="badge mb-2 bg-amber/20 text-amber-dark">Multi-plant</span>}<h3 className="text-xl font-semibold">{p.name}</h3><p className="mt-1 font-display text-4xl font-bold">${p.priceUsd}<span className="text-base font-normal text-steel">/month</span></p><p className="mt-1 text-sm text-steel">{p.blurb}</p>
              <ul className="my-4 list-disc space-y-1 pl-5 text-sm">{p.features.map((f) => <li key={f}>{f}</li>)}</ul><Link href="/signup" className="btn-primary w-full">Get Started</Link></div>); })}</div>
          <div className="card mt-8 overflow-x-auto"><table className="w-full text-sm"><thead className="bg-ivory"><tr><th className="th">Compare plans</th><th className="th">Professional</th><th className="th">Enterprise</th></tr></thead>
            <tbody className="divide-y divide-navy/5">{PRICING_ROWS.map(([f, a, b]) => (<tr key={f}><td className="td">{f}</td><td className="td">{a ? "✓" : "—"}</td><td className="td">{b ? "✓" : "—"}</td></tr>))}</tbody></table></div>
          <p className="mt-3 text-center text-xs text-steel">Billed monthly in USD through a secure external payment page.</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-5 py-20"><h2 className="text-3xl font-bold text-ivory">Frequently asked questions</h2>
        <div className="mt-6 divide-y divide-white/10">{FAQ.map(([q, a]) => (<details key={q} className="py-4"><summary className="cursor-pointer font-semibold text-ivory">{q}</summary><p className="mt-2 text-sm text-ivory/70">{a}</p></details>))}</div></section>

      {/* CTA */}
      <section className="bg-amber py-16 text-center text-navy"><div className="mx-auto max-w-2xl px-5"><h2 className="text-3xl font-bold text-navy">A smarter digital view of every factory.</h2><p className="mt-2">Model your first line in minutes and start from your own data.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/signup" className="btn-dark px-6 py-3">Get Started</Link><a href="mailto:cto@factorytwin.online" className="btn border border-navy/40 px-6 py-3 text-navy hover:bg-navy/10">Talk to us</a></div></div></section>

      <footer className="border-t border-white/10 py-12 text-sm text-ivory/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 md:grid-cols-4">
          <div><Logo light /><p className="mt-3">A smarter digital view of every factory.</p></div>
          <div><h4 className="mb-2 font-semibold text-ivory">Platform</h4><ul className="space-y-1"><li><a href="#platform">Modules</a></li><li><a href="#ai">AI &amp; Copilot</a></li><li><a href="#security">Security</a></li><li><a href="#pricing">Pricing</a></li></ul></div>
          <div><h4 className="mb-2 font-semibold text-ivory">Account</h4><ul className="space-y-1"><li><Link href="/login">Sign in</Link></li><li><Link href="/signup">Create account</Link></li><li><Link href="/reset">Reset password</Link></li></ul></div>
          <div><h4 className="mb-2 font-semibold text-ivory">Contact</h4><a className="underline" href="mailto:cto@factorytwin.online">cto@factorytwin.online</a></div>
        </div>
        <p className="mx-auto mt-8 max-w-6xl px-5 text-xs">© {new Date().getFullYear()} FactoryTwin AI. AI output is advisory and must be reviewed by qualified people; simulations are estimates, not guarantees.</p>
      </footer>
    </div>
  );
}
