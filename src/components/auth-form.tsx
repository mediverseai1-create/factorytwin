"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup" | "reset";
const copy = {
  login: { title: "Sign in to FactoryTwin", cta: "Sign in" },
  signup: { title: "Create your FactoryTwin account", cta: "Create account" },
  reset: { title: "Reset your password", cta: "Send reset link" },
};

export function AuthForm({ mode, configured }: { mode: Mode; configured: boolean }) {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/app";
  const [msg, setMsg] = useState<{ type: "error" | "ok"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email")), password = String(fd.get("password") ?? "");
    setBusy(true); setMsg(null);
    const supabase = createClient();
    const origin = window.location.origin;
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg({ type: "error", text: error.message }); else { router.push(next); router.refresh(); }
    } else if (mode === "signup") {
      if (password.length < 8) { setMsg({ type: "error", text: "Password must be at least 8 characters." }); setBusy(false); return; }
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: String(fd.get("name") ?? "") }, emailRedirectTo: `${origin}/auth/callback?next=/onboarding` } });
      if (error) setMsg({ type: "error", text: error.message });
      else if (data.session) { router.push("/onboarding"); router.refresh(); }
      else setMsg({ type: "ok", text: "Check your email to verify your address, then sign in." });
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/update-password` });
      setMsg(error ? { type: "error", text: error.message } : { type: "ok", text: "If an account exists for that email, a reset link is on its way." });
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-md space-y-4 p-7">
      <h1 className="text-xl font-bold">{copy[mode].title}</h1>
      {!configured && <p className="rounded-lg bg-amber/15 p-3 text-sm text-amber-dark">Supabase is not configured yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).</p>}
      {mode === "signup" && <div><label className="label" htmlFor="name">Full name</label><input id="name" name="name" className="input" required /></div>}
      <div><label className="label" htmlFor="email">Work email</label><input id="email" name="email" type="email" className="input" required autoComplete="email" /></div>
      {mode !== "reset" && <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" className="input" required autoComplete={mode === "login" ? "current-password" : "new-password"} /></div>}
      {msg && <p role="status" className={`text-sm ${msg.type === "error" ? "text-danger" : "text-ok"}`}>{msg.text}</p>}
      <button className="btn-primary w-full" disabled={busy || !configured}>{busy ? "Please wait…" : copy[mode].cta}</button>
      <div className="flex justify-between text-sm text-steel">
        {mode === "login" ? <><Link href="/signup" className="underline">Create account</Link><Link href="/reset" className="underline">Forgot password?</Link></> : <Link href="/login" className="underline">Back to sign in</Link>}
      </div>
    </form>
  );
}
