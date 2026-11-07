import { EntityPage } from "@/components/entity-page";

export const metadata = { title: "Equipment" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  return <EntityPage entityKey="equipment" searchParams={await searchParams} subtitle="Equipment register. Status shown is the last recorded status, not a live feed." />;
}
