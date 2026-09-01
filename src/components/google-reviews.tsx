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

async function fetchGoogleReviews(): Promise<{
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

function Stars({ rating }: { rating: number }) {
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
        {data.reviews.slice(0, 6).map((review, index) => {
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
      </div>
    </section>
  );
}
