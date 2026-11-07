"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/ui";

export const NAV: { href: string; label: string }[] = [
  { href: "/app", label: "Overview" },
  { href: "/app/digital-twin", label: "Digital Twin" },
  { href: "/app/factories", label: "Factories" },
  { href: "/app/production-lines", label: "Production Lines" },
  { href: "/app/equipment", label: "Equipment" },
  { href: "/app/production", label: "Production Intelligence" },
  { href: "/app/planning", label: "Production Planning" },
  { href: "/app/maintenance", label: "Predictive Maintenance" },
  { href: "/app/downtime", label: "Downtime Intelligence" },
  { href: "/app/quality", label: "Quality & Waste" },
  { href: "/app/energy", label: "Energy Intelligence" },
  { href: "/app/simulator", label: "Scenario Simulator" },
  { href: "/app/operational-insights", label: "Operational Insights" },
  { href: "/app/agents", label: "AI Agents" },
  { href: "/app/copilot", label: "Copilot" },
  { href: "/app/multi-plant", label: "Multi-Plant" },
  { href: "/app/reports", label: "Reports" },
  { href: "/app/data", label: "Data & Integrations" },
  { href: "/app/team", label: "Team & Permissions" },
  { href: "/app/billing", label: "Usage & Billing" },
  { href: "/app/settings", label: "Settings" },
];

export function Sidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const links = (
    <nav className="space-y-0.5 px-3 pb-6" aria-label="Main">
      {NAV.map((n) => {
        const active = n.href === "/app" ? path === "/app" : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
            className={`block rounded-md px-3 py-1.5 text-sm ${active ? "bg-amber text-navy font-semibold" : "text-ivory/80 hover:bg-white/10"}`}>
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
  return (
    <>
      <button className="btn-dark fixed bottom-4 right-4 z-40 lg:hidden" onClick={() => setOpen(!open)} aria-expanded={open}>Menu</button>
      <aside className={`${open ? "block" : "hidden"} fixed inset-y-0 left-0 z-30 w-64 overflow-y-auto bg-navy lg:static lg:block lg:shrink-0`}>
        <div className="p-5"><Link href="/app"><Logo light /></Link></div>
        {links}
      </aside>
    </>
  );
}
