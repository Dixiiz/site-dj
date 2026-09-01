import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export default async function MerciPage({
  searchParams,
}: {
  searchParams: Promise<{ nom?: string }>;
}) {
  const { nom } = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-3xl font-medium">C’est enregistré{nom ? `, ${nom}` : ""}.</h1>
        <p className="mt-4 text-muted-foreground">
          Ton devis est bien arrivé. Tu recevras une confirmation
          une fois le rendez-vous validé.
        </p>
        <Button className="mt-8" render={<Link href="/" />}>
          Retour à l’accueil
        </Button>
      </main>
    </>
  );
}
