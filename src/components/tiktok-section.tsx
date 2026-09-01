import { FadeIn } from "@/components/fade-in";
import { TIKTOK_VIDEOS, TIKTOK_PROFILE_URL } from "@/config/tiktok";
import { TikTokCarousel } from "@/components/tiktok-carousel";

type OEmbedResponse = {
  html?: string;
  title?: string;
};

// TikTok oEmbed : pas de clé API nécessaire.
async function fetchEmbed(url: string): Promise<OEmbedResponse | null> {
  try {
    const res = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
      { next: { revalidate: 86400 } } // cache 24 h
    );
    if (!res.ok) return null;
    return (await res.json()) as OEmbedResponse;
  } catch {
    return null;
  }
}

export async function TikTokSection() {
  if (TIKTOK_VIDEOS.length === 0) {
    if (!TIKTOK_PROFILE_URL) return null;
    return (
      <section className="mx-auto w-full max-w-5xl px-4 py-20 text-center">
        <FadeIn>
          <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
            Retrouvez-nous sur <span className="text-accent">TikTok</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Les meilleurs moments de nos soirées, en direct de TikTok.
          </p>
          <a
            href={TIKTOK_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground shadow-lg transition hover:brightness-110"
          >
            @propulsound.dj sur TikTok
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M7 17 17 7" />
              <path d="M7 7h10v10" />
            </svg>
          </a>
        </FadeIn>
      </section>
    );
  }

  const embeds = await Promise.all(
    TIKTOK_VIDEOS.slice(0, 6).map(async (url) => ({ url, data: await fetchEmbed(url) }))
  );
  const valid = embeds.filter((e) => e.data?.html);
  if (valid.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-20 text-center">
      <FadeIn>
        <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
          Retrouvez-nous sur <span className="text-accent">TikTok</span>
        </h2>
        <p className="mt-3 text-muted-foreground">
          Les meilleurs moments de nos soirées, en direct de TikTok.
        </p>
      </FadeIn>
      <FadeIn delay={0.1}>
        <TikTokCarousel embeds={valid.map((v) => v.data!.html!)} />
      </FadeIn>
      {TIKTOK_PROFILE_URL && (
        <FadeIn delay={0.2}>
          <a
            href={TIKTOK_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 font-medium transition hover:border-accent hover:text-accent"
          >
            Suivre sur TikTok
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M7 17 17 7" />
              <path d="M7 7h10v10" />
            </svg>
          </a>
        </FadeIn>
      )}
    </section>
  );
}

