import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { supabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Create account" };
export default function Page() {
  return <Suspense><AuthForm mode="signup" configured={supabaseConfigured()} /></Suspense>;
}
