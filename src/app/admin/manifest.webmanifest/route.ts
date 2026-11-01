import type { MetadataRoute } from "next";

// La convention `manifest.ts` de Next.js ne fonctionne qu'à la racine de
// `app/`. Pour un manifeste dédié à l'admin, on sert donc ce JSON via un
// route handler. L'admin layout référence cette URL dans ses métadonnées :
// quand l'app est installée depuis une page /admin (mobile ou PC), elle
// s'ouvre directement sur le tableau de bord admin avec ses propres
// raccourcis. Le manifeste racine (src/app/manifest.ts) reste utilisé pour
// le site public.
const manifest: MetadataRoute.Manifest = {
  name: "Admin — Propul'Sound DJ",
  short_name: "Admin",
  description:
    "Administration du site Propul'Sound DJ : devis, factures, planning, médias et comptes.",
  id: "/admin/",
  start_url: "/admin/",
  scope: "/admin/",
  display: "standalone",
  background_color: "#f5f7fa",
  theme_color: "#101a2c",
  icons: [
    {
      src: "/pwa-icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/pwa-icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/pwa-icon-maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
  shortcuts: [
    { name: "Planning", short_name: "Planning", url: "/admin/planning" },
    { name: "Devis", short_name: "Devis", url: "/admin/devis" },
    { name: "Messages", short_name: "Messages", url: "/admin/messages" },
  ],
};

export function GET() {
  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
