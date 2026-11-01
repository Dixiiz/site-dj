// Section FAQ réutilisable : rendu visible + données structurées FAQPage
// (JSON-LD) pour les résultats enrichis Google. Contenu 100 % serveur.
type FaqItem = { q: string; a: string };

export function FaqSection({ title, items }: { title: string; items: FaqItem[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h2 className="text-center text-2xl font-medium tracking-tight sm:text-3xl">{title}</h2>
      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <details
            key={item.q}
            className="group rounded-xl border border-border bg-card/60 px-4 py-3 open:border-accent/50"
          >
            <summary className="cursor-pointer list-none font-medium [&::-webkit-details-marker]:hidden">
              <span className="mr-2 text-accent transition-transform group-open:rotate-90 inline-block">›</span>
              {item.q}
            </summary>
            <p className="mt-2 pl-5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
