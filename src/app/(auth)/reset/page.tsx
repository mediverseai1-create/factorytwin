import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { supabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Reset password" };
export default function Page() {
  return <Suspense><AuthForm mode="reset" configured={supabaseConfigured()} /></Suspense>;
}
