import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FadeIn } from "@/components/fade-in";
import { fetchGoogleReviews, Stars } from "@/components/google-reviews";
import { avisMariages, mariagesStats } from "@/data/avis-mariages";

export const metadata: Metadata = {
  alternates: { canonical: "/avis" },
  title: { absolute: "Avis clients — Propul'Sound DJ" },
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
        {/* Tous les avis Google.
            Limite connue : l'API Google Places n'expose que 5 avis maximum,
            triés par pertinence (ni les plus récents, ni les 23 complets). */}
        <FadeIn delay={0.12}>
          <p className="text-center text-xs text-muted-foreground">
            Google n&apos;expose que ses 5 avis « les plus pertinents » via son
            API — pour lire les{" "}
            {data?.count != null ? `${data.count} avis` : "tous les avis"},{" "}
            <a
              href={`https://www.google.com/maps/place/?q=place_id:${process.env.GOOGLE_PLACE_ID ?? ""}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline-offset-2 hover:underline"
            >
              rends-toi sur notre fiche Google
            </a>
            .
          </p>
        </FadeIn>

        <div className="mt-6 space-y-4">
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

        {/* Avis Mariages.net */}
        <FadeIn delay={0.14} className="mt-12">
          <div className="rounded-xl border border-border bg-card/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-medium tracking-tight">Avis Mariages.net</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {mariagesStats.rating.toFixed(1)} sur 5 — {mariagesStats.count} avis ·{" "}
                  {mariagesStats.recommendedPercent} % des couples recommandent nos services
                </p>
              </div>
              <a
                href={mariagesStats.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/10"
              >
                Voir le profil
              </a>
            </div>

            {/* Décomposition des notes */}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {mariagesStats.breakdown.map((b) => (
                <div key={b.label} className="flex items-center gap-2 text-xs">
                  <span className="w-36 shrink-0 text-muted-foreground">{b.label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${(b.rating / 5) * 100}%` }}
                    />
                  </div>
                  <span className="w-7 text-right font-medium">{b.rating.toFixed(1)}</span>
                </div>
              ))}
            </div>

            {/* Avis détaillés collés depuis le profil */}
            {avisMariages.length > 0 ? (
              <div className="mt-5 space-y-4">
                {avisMariages.map((a, i) => (
                  <FadeIn key={`${a.author}-${i}`} delay={Math.min(i, 6) * 0.04}>
                    <figure className="rounded-lg border border-border bg-background/60 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{a.author}</span>
                        <div className="flex items-center gap-3">
                          <Stars rating={a.rating} />
                          <span className="text-xs text-muted-foreground">{a.date}</span>
                        </div>
                      </div>
                      <blockquote className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {a.text}
                      </blockquote>
                    </figure>
                  </FadeIn>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
                Les avis détaillés de Mariages.net seront ajoutés ici — en
                attendant, lis-les directement sur{" "}
                <a
                  href={mariagesStats.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline-offset-2 hover:underline"
                >
                  notre profil Mariages.net
                </a>
                .
              </p>
            )}
          </div>
        </FadeIn>

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
      <SiteFooter />
    </>
  );
}
