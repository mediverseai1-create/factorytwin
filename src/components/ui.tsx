import Link from "next/link";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 font-display text-lg font-bold">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <rect x="1.5" y="1.5" width="19" height="19" stroke="#E5A13A" strokeWidth="2" />
        <path d="M6 15V8l5 3 5-3v7" stroke={light ? "#F2F0E8" : "#14283B"} strokeWidth="1.8" />
      </svg>
      <span className={light ? "text-ivory" : "text-navy"}>FactoryTwin<span className="text-amber"> AI</span></span>
    </span>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-steel">{subtitle}</p>}
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

export function Kpi({ label, value, hint, def }: { label: string; value: string; hint?: string; def?: string }) {
  return (
    <div className="card p-4" title={def}>
      <div className="text-xs font-semibold uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold text-navy">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate">{hint}</div>}
    </div>
  );
}

export function Empty({ title, body, href, cta }: { title: string; body: string; href?: string; cta?: string }) {
  return (
    <div className="card border-dashed p-8 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-steel">{body}</p>
      {href && <Link href={href} className="btn-primary mt-4">{cta}</Link>}
    </div>
  );
}

export function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="card mb-6 p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {note && <span className="text-xs text-slate">{note}</span>}
      </div>
      {children}
    </section>
  );
}

const tone: Record<string, string> = {
  running: "bg-ok/15 text-ok", completed: "bg-ok/15 text-ok", approved: "bg-ok/15 text-ok", pass: "bg-ok/15 text-ok", done: "bg-ok/15 text-ok",
  stopped: "bg-danger/15 text-danger", rejected: "bg-danger/15 text-danger", fail: "bg-danger/15 text-danger", high: "bg-danger/15 text-danger",
  maintenance: "bg-amber/20 text-amber-dark", pending: "bg-amber/20 text-amber-dark", medium: "bg-amber/20 text-amber-dark", conditional: "bg-amber/20 text-amber-dark",
};
export function Badge({ children }: { children: string | null | undefined }) {
  const v = (children ?? "—").toString();
  return <span className={`badge ${tone[v.toLowerCase()] ?? "bg-slate/20 text-steel"}`}>{v.replace(/_/g, " ")}</span>;
}

export function DemoNotice() {
  return null;
}
