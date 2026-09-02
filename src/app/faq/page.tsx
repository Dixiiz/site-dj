import { FadeIn } from "@/components/fade-in";
import { SiteHeader } from "@/components/site-header";
import Link from "next/link";

export const metadata = {
  title: "FAQ — Propul'Sound DJ",
  description:
    "Questions fréquentes : déplacements, horaires, matériel, annulation. Tout ce qu'il faut savoir avant de réserver Propul'Sound DJ.",
};

const faqs = [
  {
    q: "Jusqu'où vous déplacez-vous ?",
    a: "Nous sommes basés à Huisseau-sur-Cosson, à proximité de Blois (Loir-et-Cher). 30 km aller-retour sont offerts ; au-delà, les frais sont de 0,80 €/km (aller-retour), calculés automatiquement dans le devis. Les péages éventuels sont facturés au réel.",
  },
  {
    q: "Quels sont les horaires possibles ?",
    a: "Vous choisissez librement vos horaires : début entre 14 h et 20 h pour les mariages, 18 h et 20 h pour les autres événements, 7 jours sur 7. Chaque pack inclut un minimum d'heures (6 h ou 8 h selon la formule) ; au-delà, chaque demi-heure entamée est facturée au tarif horaire du pack.",
  },
  {
    q: "Comment réserver une date ?",
    a: "Choisissez votre pack dans la section Formules & Tarifs, remplissez le formulaire de devis (lieu, horaires, date, coordonnées) et envoyez. Nous vous confirmons la disponibilité et les modalités (acompte, contrat) le plus vite possible.",
  },
  {
    q: "Que se passe-t-il en cas d'annulation ?",
    a: "Les conditions d'annulation sont précisées lors de la confirmation de votre réservation. En règle générale, l'acompte reste dû en cas d'annulation à moins de 30 jours de l'événement ; au-delà, il est remboursable.",
  },
  {
    q: "De quoi avez-vous besoin sur place ?",
    a: "Une prise électrique standard (230 V) à proximité de l'emplacement et un espace d'environ 3 × 2 m pour l'installation. Nous arrivons en avance pour tout installer et faire une balance du son avant l'arrivée des invités.",
  },
  {
    q: "Pouvez-vous sonoriser la cérémonie ou le cocktail ?",
    a: "Oui ! Pour les mariages, si vous démarrez avant 18 h, des options de sonorisation de la cérémonie laïque et/ou du cocktail (vin d'honneur) vous sont proposées directement dans le devis. Pour les anniversaires démarrant à 18 h, la sonorisation de l'apéritif est proposée.",
  },
  {
    q: "Avez-vous une assurance ?",
    a: "Oui, une assurance responsabilité civile professionnelle couvre nos prestations.",
  },
  {
    q: "Le matériel est-il adapté à ma salle ?",
    a: "Notre sono Audiophony Modjo2000 couvre jusqu'à 250 personnes. Pour les très grands espaces ou les configurations inhabituelles, contactez-nous : nous adaptons le matériel à votre événement.",
  },
];

export default function FaqPage() {
  return (
    <>
      <SiteHeader />
      <main className="relative mx-auto w-full max-w-3xl px-4 py-10">
        <FadeIn>
          <h1 className="text-3xl font-medium tracking-tight">
            Questions fréquentes
          </h1>
          <p className="mt-3 text-muted-foreground">
            Tout ce qu&apos;il faut savoir avant de réserver. Une autre
            question ?{" "}
            <Link
              href="/contact"
              className="text-accent underline underline-offset-4"
            >
              Contactez-nous
            </Link>
            .
          </p>
        </FadeIn>

        <div className="mt-10 space-y-3">
          {faqs.map((item, i) => (
            <FadeIn key={i} delay={0.05 * i}>
              <details className="group rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-accent/40 open:border-accent/40">
                <summary className="cursor-pointer list-none font-medium marker:hidden [&::-webkit-details-marker]:hidden">
                  <span className="mr-2 text-accent transition-transform group-open:rotate-90 inline-block">
                    ▸
                  </span>
                  {item.q}
                </summary>
                <p className="mt-3 pl-6 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </details>
            </FadeIn>
          ))}
        </div>
      </main>
    </>
  );
}