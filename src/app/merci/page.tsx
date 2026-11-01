import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MerciContent } from "@/components/merci-content";

// Page de confirmation après devis : inutile dans Google (pas de valeur
// de recherche) et source de "doublons" dans Search Console → noindex.
export const metadata: Metadata = {
  title: { absolute: "Merci pour votre demande — Propul'Sound DJ" },
  robots: { index: false, follow: false },
};

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
      <SiteFooter />
    </>
  );
}
