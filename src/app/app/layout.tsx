import Link from "next/link";
import { signOut } from "@/app/actions";
import { Logo } from "@/components/ui";
import { Sidebar } from "@/components/sidebar";
import { requireCtx } from "@/lib/ctx";
import { roleLabel } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCtx();
  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-navy/10 bg-white px-5 py-3">
          <div className="lg:hidden"><Link href="/app"><Logo /></Link></div>
          <div className="hidden text-sm lg:block"><span className="font-semibold text-navy">{ctx.org.name}</span> <span className="text-slate">· {roleLabel(ctx.role)}</span></div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-steel sm:inline">{ctx.user.email}</span>
            <form action={signOut}><button className="btn-line py-1.5">Sign out</button></form>
          </div>
        </header>
        <main className="mx-auto max-w-[1280px] p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
