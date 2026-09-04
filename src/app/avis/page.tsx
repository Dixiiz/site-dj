import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { FadeIn } from "@/components/fade-in";
import { fetchGoogleReviews, Stars } from "@/components/google-reviews";

export const metadata: Metadata = {
  title: "Avis clients — Propul'Sound DJ",
  description:
    "Ce que les mariés et organisateurs disent de Propul'Sound DJ : avis Google, Mariages.net et retours de prestations en Loir-et-Cher.",
};

const MARIAGES_URL =
  "https://www.mariages.net/musique-mariage/propulsound-dj--e366139";

export default async function AvisPage() {
  const data = await fetchGoogleReviews();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-24">
        <FadeIn>
          <p className="text-center text-sm tracking-[0.2em] text-accent uppercase">
            Avis clients
          </p>
          <h1 className="mt-2 text-center text-3xl font-medium tracking-tight sm:text-4xl">
            Ils ont vécu la soirée
          </h1>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {data?.rating != null && (
              <span className="text-3xl font-medium">{data.rating.toFixed(1)}</span>
            )}
            {data?.rating != null && <Stars rating={data.rating} />}
            {data?.count != null && (
              <span className="text-sm text-muted-foreground">
                ({data.count} avis Google)
              </span>
            )}
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <a
              href="https://g.page/r/CYgCQMSAgDcWEAE/review"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-accent/50 bg-accent/10 px-4 py-3 text-center text-sm font-medium text-accent transition-colors hover:bg-accent/20"
            >
              Laisser un avis Google
            </a>
            <a
              href={MARIAGES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-border px-4 py-3 text-center text-sm font-medium transition-colors hover:border-accent/50 hover:text-accent"
            >
              Voir mon profil Mariages.net
            </a>
          </div>
        </FadeIn>

        {/* Tous les avis Google */}
        <div className="mt-12 space-y-4">
          {data && data.reviews.length > 0 ? (
            data.reviews.map((review, index) => {
              const name =
                review.authorAttribution?.displayName ?? "Client Google";
              const text =
                review.text?.text ?? review.originalText?.text ?? "";
              return (
                <FadeIn key={`${name}-${index}`} delay={Math.min(index, 8) * 0.04}>
                  <figure className="rounded-xl border border-border bg-card/60 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{name}</span>
                      <div className="flex items-center gap-3">
                        {review.rating != null && (
                          <Stars rating={review.rating} />
                        )}
                        {review.relativePublishTimeDescription && (
                          <span className="text-xs text-muted-foreground">
                            {review.relativePublishTimeDescription}
                          </span>
                        )}
                      </div>
                    </div>
                    {text ? (
                      <blockquote className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        {text}
                      </blockquote>
                    ) : null}
                  </figure>
                </FadeIn>
              );
            })
          ) : (
            <FadeIn>
              <p className="rounded-xl border border-border bg-muted/50 p-5 text-center text-sm text-muted-foreground">
                Les avis Google s&apos;afficheront ici dès que la connexion à la
                fiche Google sera active. En attendant, retrouvez-les
                directement sur{" "}
                <a
                  href="https://g.page/r/CYgCQMSAgDcWEAE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline-offset-2 hover:underline"
                >
                  notre fiche Google
                </a>
                .
              </p>
            </FadeIn>
          )}
        </div>

        <FadeIn delay={0.15} className="mt-10">
          <div className="rounded-xl border border-border bg-muted/50 p-5 text-center text-sm text-muted-foreground">
            Vous avez vécu une soirée avec nous ?{" "}
            <Link
              href="/contact"
              className="text-accent underline-offset-2 hover:underline"
            >
              Parlons-en
            </Link>{" "}
            — et merci d&apos;avance pour votre avis, il compte énormément.
          </div>
        </FadeIn>
      </main>
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Propul&apos;Sound DJ — Huisseau-sur-Cosson (41350)
        <div className="mt-2 space-x-4">
          <Link href="/" className="transition-colors hover:text-accent">
            Accueil
          </Link>
          <Link href="/contact" className="transition-colors hover:text-accent">
            Contact
          </Link>
        </div>
      </footer>
    </>
  );
}
