import { FadeIn } from "@/components/fade-in";
import { CustomRequestForm } from "@/components/custom-request-form";
import { SiteHeader } from "@/components/site-header";

export default function SurMesurePage() {
  return (
    <>
      <SiteHeader />
      <main className="relative mx-auto w-full max-w-3xl px-4 py-10">
        <FadeIn>
          <h1 className="text-3xl font-medium tracking-tight">Projet sur-mesure</h1>
          <p className="mt-3 text-muted-foreground">
            Un événement unique nécessite une approche personnalisée. Parlez-nous de votre projet.
          </p>
        </FadeIn>
        <div className="mt-10">
          <CustomRequestForm />
        </div>
      </main>
    </>
  );
}