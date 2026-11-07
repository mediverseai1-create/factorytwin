"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePassword() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password"));
    if (password.length < 8) return setErr("Password must be at least 8 characters.");
    const { error } = await createClient().auth.updateUser({ password });
    if (error) setErr(error.message); else router.push("/app");
  }
  return (
    <form onSubmit={submit} className="card w-full max-w-md space-y-4 p-7">
      <h1 className="text-xl font-bold">Choose a new password</h1>
      <input name="password" type="password" className="input" placeholder="New password" required autoComplete="new-password" />
      {err && <p className="text-sm text-danger">{err}</p>}
      <button className="btn-primary w-full">Update password</button>
    </form>
  );
}
