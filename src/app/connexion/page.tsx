import { redirect } from "next/navigation";
import { getClientUser } from "@/app/client-actions";
import { ConnexionForm } from "@/components/connexion-form";

export const metadata = {
  title: "Mon espace — Propul'Sound DJ",
  description: "Accédez à vos devis, échangez et préparez vos playlists.",
};

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getClientUser();
  const { next } = await searchParams;
  if (user) redirect(next?.startsWith("/mon-espace") ? next : "/mon-espace");

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16">
      <ConnexionForm next={next} />
    </main>
  );
}
