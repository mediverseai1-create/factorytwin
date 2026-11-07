import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { supabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Sign in" };
export default function Page() {
  return <Suspense><AuthForm mode="login" configured={supabaseConfigured()} /></Suspense>;
}
