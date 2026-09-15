import Link from "next/link";
import { FadeIn } from "@/components/fade-in";

export type GoogleReview = {
  authorAttribution?: { displayName?: string; photoUri?: string };
  rating?: number;
  relativePublishTimeDescription?: string;
  text?: { text?: string };
  originalText?: { text?: string };
};

type PlacesResponse = {
  rating?: number;
  userRatingCount?: number;
  reviews?: GoogleReview[];
};

export async function fetchGoogleReviews(): Promise<{
  rating?: number;
  count?: number;
  reviews: GoogleReview[];
} | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!apiKey || !placeId) return null;

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?languageCode=fr`,
      {
        headers: {
 "X-Goog-Api-Key": apiKey,
 "X-Goog-FieldMask": "rating,userRatingCount,reviews",
        },
        next: { revalidate: 3600 }, // cache 1 h
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as PlacesResponse;
    return {
      rating: data.rating,
      count: data.userRatingCount,
      reviews: data.reviews ?? [],
    };
  } catch {
    return null;
  }
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-sm text-yellow-400" aria-label={`${rating} sur 5`}>
      {"★".repeat(Math.round(rating))}
      <span className="text-muted-foreground/40">
        {"★".repeat(5 - Math.round(rating))}
      </span>
    </span>
  );
}

export async function GoogleReviews() {
  const data = await fetchGoogleReviews();

  if (!data || data.reviews.length === 0) {
    // Repli élégant : lien vers la fiche Google en attendant la configuration.
    return (
      <section className="mx-auto w-full max-w-5xl px-4 pb-20 text-center">
        <FadeIn>
          <p className="text-sm tracking-[0.2em] text-accent uppercase">Avis clients</p>
          <h2 className="mt-2 text-3xl font-medium tracking-tight">Ils nous font confiance</h2>
          <p className="mt-4 text-muted-foreground">
            Retrouvez tous les avis de nos clients sur notre fiche Google.
          </p>
        </FadeIn>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-20">
      <FadeIn>
        <p className="text-center text-sm tracking-[0.2em] text-accent uppercase">
          Avis clients
        </p>
        <h2 className="mt-2 text-center text-3xl font-medium tracking-tight">
          Ce que disent nos clients
        </h2>
        <div className="mt-4 flex items-center justify-center gap-3">
          <span className="text-3xl font-medium">{data.rating?.toFixed(1) ?? "—"}</span>
          {data.rating != null && <Stars rating={data.rating} />}
          {data.count != null && (
            <span className="text-sm text-muted-foreground">
              ({data.count} avis Google)
            </span>
          )}
        </div>
      </FadeIn>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {data.reviews.slice(0, 5).map((review, index) => {
          const name = review.authorAttribution?.displayName ?? "Client Google";
          const text = review.text?.text ?? review.originalText?.text ?? "";
          return (
            <FadeIn key={`${name}-${index}`} delay={index * 0.05}>
              <figure className="flex h-full flex-col rounded-xl border border-border bg-card/60 p-5">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{name}</span>
                  {review.rating != null && <Stars rating={review.rating} />}
                </div>
                {review.relativePublishTimeDescription && (
                  <span className="mt-1 text-xs text-muted-foreground">
                    {review.relativePublishTimeDescription}
                  </span>
                )}
                <blockquote className="mt-3 text-sm text-muted-foreground">
                  {text.length > 260 ? `${text.slice(0, 260)}…` : text}
                </blockquote>
              </figure>
            </FadeIn>
          );
        })}
        <FadeIn delay={5 * 0.05}>
          <a
            href={`https://www.google.com/maps/place/?q=place_id:${process.env.GOOGLE_PLACE_ID ?? ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/40 p-5 text-center transition-colors hover:border-accent/60 hover:bg-card/70"
          >
            <span className="text-3xl font-semibold text-accent">
              {data.rating?.toFixed(1) ?? "★"}
            </span>
            <span className="text-sm font-medium">
              {data.count != null ? `${data.count} avis sur Google` : "Tous les avis sur Google"}
            </span>
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              Lire tous les avis
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M7 17 17 7" />
                <path d="M7 7h10v10" />
              </svg>
            </span>
          </a>
        </FadeIn>
      </div>
      <FadeIn delay={0.3} className="mt-6 text-center">
        <Link
          href="/avis"
          className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-accent hover:underline"
        >
          Voir la page des avis clients
        </Link>
      </FadeIn>
    </section>
  );
}
