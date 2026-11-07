import Link from "next/link";
import { Logo } from "@/components/ui";
import { PLANS } from "@/lib/plans";

const MODULES = [
  { id: "twin", title: "Digital Twin Modeling", body: "Model your organization as a structured hierarchy — factory, production area, line, equipment — with relationships between machines and the production events, maintenance and quality records attached to them." },
  { id: "maintenance", title: "Predictive Maintenance", body: "Surface repeated downtime, overdue tasks and drift in uploaded readings. Findings are clearly labelled as observed, historical pattern or AI assessment — never a guaranteed failure date." },
  { id: "planning", title: "Production Planning", body: "Compare open orders against line capacity and observed availability to see delivery risk and bottlenecks, then test alternative assumptions." },
  { id: "quality", title: "Quality & Waste Intelligence", body: "Track defect rates, scrap and batch differences. Process correlations are offered as hypotheses to investigate, not as confirmed causes." },
  { id: "energy", title: "Factory Energy Intelligence", body: "Analyse recorded energy by line and shift, and energy per unit produced where your data supports it. Units are normalised and originals preserved." },
  { id: "simulation", title: "Scenario Simulation", body: "Ask what happens if demand rises, a line is unavailable or a maintenance window moves. Results come from a transparent capacity model — AI explains them, it does not invent them." },
  { id: "multiplant", title: "Multi-Plant Intelligence", body: "Compare facilities on identical definitions with strict organization-level data isolation and role-based access." },
];
const STEPS = [
  ["Model your factory", "Create factories, areas, lines and equipment — or import your equipment register."],
  ["Bring in your data", "Upload CSV or Excel exports. Map columns, review validation issues and duplicates before anything is saved."],
  ["Understand performance", "Deterministic KPIs with published definitions: OEE, downtime, scrap, energy intensity and more."],
  ["Simulate and decide", "Test scenarios, review AI recommendations with their evidence, and approve, reject and track outcomes."],
];
const INDUSTRIES = ["Automotive", "Food & Beverage", "Pharmaceutical", "Electronics", "Metals & Machining", "Plastics & Packaging", "Chemicals", "Aerospace"];
const FAQ = [
  ["What is a digital twin in FactoryTwin?", "A structured, persistent model of your factories, lines, equipment and their operational records, built from the data you provide. It is updated as you upload or connect new data."],
  ["Is my data shown live?", "Only records you upload are shown, with their source and timestamp. Live status requires a connected data source; none are connected by default and FactoryTwin never displays fabricated readings."],
  ["Does FactoryTwin control machinery?", "No. It has no control interface. AI output is advisory and any physical intervention stays under qualified human supervision."],
  ["Which integrations are supported?", "Today: CSV and XLSX uploads. ERP, MES, SCADA/OPC UA, IoT platforms and Power BI adapters are planned and marked Coming Soon in the product."],
  ["How is multi-tenant data protected?", "Every record belongs to an organization and is protected by database Row Level Security, role-based permissions and an audit log."],
  ["How does billing work?", "Plans are billed monthly through an external payment link. A plan is activated only after payment is verified."],
];

export default function Home() {
  return (
    <div className="bg-navy text-ivory">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-navy/95 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5" aria-label="Primary">
          <Link href="/"><Logo light /></Link>
          <div className="hidden gap-6 text-sm text-ivory/80 md:flex">
            <a href="#platform" className="hover:text-ivory">Platform</a><a href="#how" className="hover:text-ivory">How it works</a><a href="#industries" className="hover:text-ivory">Industries</a><a href="#pricing" className="hover:text-ivory">Pricing</a><a href="#faq" className="hover:text-ivory">FAQ</a>
          </div>
          <div className="flex gap-2"><Link href="/login" className="btn text-ivory hover:bg-white/10">Sign in</Link><Link href="/signup" className="btn-primary">Get Started</Link></div>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-amber">AI Manufacturing &amp; Digital Twin Intelligence</p>
          <h1 className="font-display text-4xl font-bold leading-tight text-ivory sm:text-5xl">Your Factory, Understood Before the Next Problem Happens.</h1>
          <p className="mt-5 max-w-xl text-lg text-ivory/75">FactoryTwin transforms factory, equipment and production data into intelligent digital representations that help manufacturing teams anticipate problems, simulate operational changes and improve production decisions.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/signup" className="btn-primary px-6 py-3">Get Started</Link><a href="#platform" className="btn border border-white/25 px-6 py-3 text-ivory hover:bg-white/10">Explore the Platform</a></div>
          <p className="mt-4 text-sm text-ivory/60">Understand your factory. Predict what comes next. Test improvements before making them.</p>
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

      <section id="platform" className="bg-ivory py-20 text-charcoal">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-dark">Factory Operations Intelligence</p>
          <h2 className="mt-2 max-w-3xl text-3xl font-bold">One integrated platform, from factory data to approved decisions.</h2>
          <p className="mt-3 max-w-3xl text-steel">Factory data → digital twin model → operational understanding → AI analysis → scenario simulation → recommended decisions → human approval → outcome tracking. Important metrics are calculated deterministically; Gemini interprets and explains them.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (<article key={m.id} id={m.id} className="card p-5"><h3 className="text-lg font-semibold">{m.title}</h3><p className="mt-2 text-sm text-steel">{m.body}</p></article>))}
            <article className="card border-amber/50 bg-amber/10 p-5"><h3 className="text-lg font-semibold">AI Agents &amp; Copilot</h3><p className="mt-2 text-sm text-steel">Ten specialised agents and a conversational Copilot reason over the same factory context, cite the records they use and flag missing data.</p></article>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-3xl font-bold text-ivory">How it works</h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-4">{STEPS.map(([t, b], i) => (<li key={t} className="rounded-xl border border-white/10 bg-charcoal/50 p-5"><div className="font-display text-2xl text-amber">0{i + 1}</div><h3 className="mt-2 font-semibold text-ivory">{t}</h3><p className="mt-1 text-sm text-ivory/70">{b}</p></li>))}</ol>
      </section>

      <section id="industries" className="bg-charcoal py-16">
        <div className="mx-auto max-w-6xl px-5"><h2 className="text-3xl font-bold text-ivory">Industries supported</h2>
          <div className="mt-6 flex flex-wrap gap-2">{INDUSTRIES.map((i) => <span key={i} className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-ivory/85">{i}</span>)}</div></div>
      </section>

      <section id="pricing" className="bg-ivory py-20 text-charcoal">
        <div className="mx-auto max-w-4xl px-5"><h2 className="text-center text-3xl font-bold">Pricing</h2><p className="mt-2 text-center text-steel">Simple monthly plans. Create an account and upgrade from Usage &amp; Billing when you are ready.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-2">{(["professional", "enterprise"] as const).map((k) => { const p = PLANS[k]; return (
            <div key={k} className={`card p-6 ${k === "enterprise" ? "ring-2 ring-amber" : ""}`}><h3 className="text-xl font-semibold">{p.name}</h3><p className="mt-1 font-display text-4xl font-bold">${p.priceUsd}<span className="text-base font-normal text-steel">/month</span></p><p className="mt-1 text-sm text-steel">{p.blurb}</p>
              <ul className="my-4 list-disc space-y-1 pl-5 text-sm">{p.features.map((f) => <li key={f}>{f}</li>)}</ul><Link href="/signup" className="btn-primary w-full">Get Started</Link></div>); })}</div></div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-5 py-20"><h2 className="text-3xl font-bold text-ivory">Frequently asked questions</h2>
        <div className="mt-6 divide-y divide-white/10">{FAQ.map(([q, a]) => (<details key={q} className="group py-4"><summary className="cursor-pointer font-semibold text-ivory">{q}</summary><p className="mt-2 text-sm text-ivory/70">{a}</p></details>))}</div></section>

      <section className="bg-amber py-16 text-center text-navy"><div className="mx-auto max-w-2xl px-5"><h2 className="text-3xl font-bold text-navy">A smarter digital view of every factory.</h2><p className="mt-2">Build your factory model in minutes and start from your own data.</p><Link href="/signup" className="btn-dark mt-6 px-6 py-3">Get Started</Link></div></section>

      <footer className="border-t border-white/10 py-10 text-sm text-ivory/60"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5"><Logo light /><span>© {new Date().getFullYear()} FactoryTwin AI · <a className="underline" href="mailto:cto@factorytwin.online">cto@factorytwin.online</a></span><span>FactoryTwin — A smarter digital view of every factory.</span></div></footer>
    </div>
  );
}
