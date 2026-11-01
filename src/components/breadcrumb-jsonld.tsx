import { SITE_URL } from "@/lib/site-url";

// Fil d'Ariane structuré (BreadcrumbList) : aide Google et les moteurs IA à
// comprendre la hiérarchie des pages (rich snippet "Accueil > Page").
// Rendu 100 % côté serveur.
export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; href: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.href}`,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
