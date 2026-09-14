import type { MetadataRoute } from "next";

// Manifeste PWA : permet « Ajouter à l'écran d'accueil » (mobile) ou
// « Installer l'application » (Chrome/Edge sur PC) avec une vraie icône
// Propul'Sound, un rendu plein écran (standalone) et des raccourcis vers
// les pages d'administration les plus utilisées.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Propul'Sound DJ — DJ & animations événementielles",
    short_name: "Propul'Sound",
    description:
 "DJ professionnel basé à Huisseau-sur-Cosson : mariages, anniversaires, soirées privées et événements d'entreprise en Loir-et-Cher et alentours.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7fa",
    theme_color: "#101a2c",
    icons: [
      {
        src: "/favicon.png",
        sizes: "32x32",
        type: "image/png",
      },
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
      {
        name: "Administration",
        short_name: "Admin",
        url: "/admin",
      },
      {
        name: "Planning",
        short_name: "Planning",
        url: "/admin/planning",
      },
      {
        name: "Messages",
        short_name: "Messages",
        url: "/admin/messages",
      },
      {
        name: "Devis",
        short_name: "Devis",
        url: "/admin/devis",
      },
    ],
  };
}