import { SiteHeader } from "@/components/site-header";
import { MerciContent } from "@/components/merci-content";

export default async function MerciPage({
  searchParams,
}: {
  searchParams: Promise<{ nom?: string }>;
}) {
  const { nom } = await searchParams;

  return (
    <>
      <SiteHeader />
      <MerciContent nom={nom} />
    </>
  );
}
