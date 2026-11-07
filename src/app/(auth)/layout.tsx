import Link from "next/link";
import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-navy px-4 py-10">
      <Link href="/"><Logo light /></Link>
      {children}
    </main>
  );
}
