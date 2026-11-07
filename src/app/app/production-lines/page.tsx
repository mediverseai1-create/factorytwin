import { EntityPage } from "@/components/entity-page";

export const metadata = { title: "Production Lines" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  return <EntityPage entityKey="production_lines" searchParams={await searchParams} subtitle="Lines belong to a factory and carry the nominal capacity used by planning and simulation." />;
}
