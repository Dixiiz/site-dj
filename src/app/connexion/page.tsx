import { redirect } from "next/navigation";
import { getClientUser } from "@/app/client-actions";
import { ConnexionForm } from "@/components/connexion-form";

export const metadata = {
  title: "Mon espace — Propul'Sound DJ",
  description: "Accédez à vos devis, échangez et préparez vos playlists.",
};

export default async function ConnexionPage() {
  const user = await getClientUser();
  if (user) redirect("/mon-espace");

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16">
      <ConnexionForm />
    </main>
  );
}
