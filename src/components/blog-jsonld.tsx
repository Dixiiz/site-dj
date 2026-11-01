import { SITE_URL, SITE_NAME } from "@/lib/site-url";

// Données structurées BlogPosting : meilleur affichage des articles dans
// Google (auteur, date, image dans les extraits enrichis).
export function BlogJsonLd({
  title,
  description,
  slug,
  datePublished,
  dateModified,
}: {
  title: string;
  description: string;
  slug: string;
  datePublished: string;
  dateModified?: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    url: `${SITE_URL}${slug}`,
    mainEntityOfPage: `${SITE_URL}${slug}`,
    inLanguage: "fr-FR",
    datePublished,
    dateModified: dateModified ?? datePublished,
    image: `${SITE_URL}/opengraph-image`,
    author: {
      "@type": "Person",
      name: "Maxime Soulaine",
      jobTitle: "DJ",
      worksFor: { "@type": "Organization", name: SITE_NAME },
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/opengraph-image` },
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
