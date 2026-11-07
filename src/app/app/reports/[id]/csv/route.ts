import { NextResponse } from "next/server";
import { requireCtx } from "@/lib/ctx";
import { toCsv, type ReportContent } from "@/lib/reports";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireCtx();
  const { id } = await params;
  const { data: r } = await ctx.supabase.from("reports").select("title,content").eq("id", id).eq("organization_id", ctx.org.id).maybeSingle();
  if (!r) return new NextResponse("Not found", { status: 404 });
  const name = r.title.replace(/[^\w\- ]+/g, "").replace(/\s+/g, "_");
  return new NextResponse(toCsv(r.content as ReportContent), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}.csv"` } });
}
