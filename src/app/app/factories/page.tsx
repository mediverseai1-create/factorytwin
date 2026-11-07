import { EntityPage } from "@/components/entity-page";

export const metadata = { title: "Factories" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  return <EntityPage entityKey="factories" searchParams={await searchParams} subtitle="Create and manage factories and their production areas." />;
}
