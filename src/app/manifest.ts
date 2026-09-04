import type { MetadataRoute } from "next";

// Manifeste PWA : permet « Ajouter à l'écran d'accueil » avec une vraie icône
// Propul'Sound sur iOS/Android, et un léger bonus SEO mobile.
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
        src: "/logo-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}