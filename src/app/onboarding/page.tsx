"use client";
import { useActionState } from "react";
import { createOrganization } from "@/app/actions";
import { Logo } from "@/components/ui";

const INDUSTRIES = ["Automotive", "Food & Beverage", "Pharmaceutical", "Electronics", "Metals & Machining", "Plastics & Packaging", "Chemicals", "Textiles", "Aerospace", "General Manufacturing"];
const SIZES = ["1–50 employees", "51–200", "201–1,000", "1,000+"];

export default function Onboarding() {
  const [state, action, pending] = useActionState(createOrganization, {} as { error?: string });
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  return (
    <main className="min-h-screen bg-navy px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Logo light />
        <form action={action} className="card mt-8 space-y-5 p-7">
          <div>
            <h1 className="text-2xl font-bold">Set up your organization</h1>
            <p className="mt-1 text-sm text-steel">Create your organization and first factory. Next you will register equipment and upload operational data — no sample data is added to your account.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="label">Company name</label><input name="name" className="input" required /></div>
            <div><label className="label">Industry</label><select name="industry" className="input">{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}</select></div>
            <div><label className="label">Organization size</label><select name="size" className="input">{SIZES.map((i) => <option key={i}>{i}</option>)}</select></div>
            <div className="sm:col-span-2"><label className="label">Primary timezone</label><input name="timezone" className="input" defaultValue={tz} /></div>
          </div>
          <hr className="border-navy/10" />
          <h2 className="text-lg font-semibold">First factory</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Factory name</label><input name="factory" className="input" /></div>
            <div><label className="label">Location</label><input name="location" className="input" /></div>
            <div className="sm:col-span-2"><label className="label">Production areas (comma separated)</label><input name="areas" className="input" placeholder="Assembly, Packaging, Machining" /></div>
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <button className="btn-primary w-full" disabled={pending}>{pending ? "Creating…" : "Create organization"}</button>
        </form>
      </div>
    </main>
  );
}
