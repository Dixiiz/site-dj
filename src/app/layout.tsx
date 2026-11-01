import type { Metadata, Viewport } from "next";
import { Inter, Fjalla_One } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/providers";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { RecoveryHashHandler } from "@/components/recovery-hash-handler";
import { CookieInfoBanner } from "@/components/cookie-info-banner";
import { SITE_URL, SITE_NAME } from "@/lib/site-url";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fjallaOne = Fjalla_One({
  variable: "--font-fjalla",
  subsets: ["latin"],
  weight: "400",
});

export const viewport: Viewport = {
  // Couleur de la barre d'état / du cadre de la fenêtre quand le site est
  // installé comme application (PWA) sur mobile ou PC.
  themeColor: "#101a2c",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — DJ mariage & soirées à Blois, Vendôme et alentours`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
 "DJ généraliste et techno pour mariages, anniversaires et soirées privées à Blois, Vendôme, Romorantin, Amboise, Morée et dans un rayon de 50 km. Devis en ligne gratuit, sonorisation et lumière incluses, options FX (fumée, étincelles, CO2).",
  keywords: [
 "DJ Blois",
 "DJ mariage Blois",
 "DJ Vendôme",
 "DJ Romorantin",
 "DJ Amboise",
 "DJ Chambord",
 "DJ Loir-et-Cher",
 "DJ anniversaire",
 "DJ soirée privée",
 "sonorisation mariage",
 "DJ 41",
 "Propul'Sound DJ",
  ],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME} — DJ mariage & soirées (Blois, Vendôme, Amboise, 50 km)`,
    description:
 "Animation DJ pour mariages, anniversaires et soirées privées. Devis gratuit en ligne, matériel pro, options FX (fumée, étincelles, CO2).",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — DJ mariage & soirées à Blois et alentours`,
    description:
 "Animation DJ pour mariages, anniversaires et soirées privées. Devis gratuit en ligne.",
  },
  // Code de vérification Google Search Console : définir
  // NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION dans les variables d'environnement Vercel.
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && {
    verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION },
  }),
  // Balises géographiques : renforcent le référencement local (Huisseau-sur-Cosson / Blois).
  other: {
    "geo.region": "FR-41",
    "geo.placename": "Huisseau-sur-Cosson, Blois, Loir-et-Cher",
    ICBM: "47.5667, 1.4667",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${inter.variable} ${fjallaOne.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden bg-background text-foreground">
        <Providers>{children}</Providers>
        {/* Établit la session quand un lien d'activation / de récupération
            revient avec des tokens dans le fragment d'URL (#) */}
        <RecoveryHashHandler />
        <CookieInfoBanner />
        <WhatsAppButton />
        {/* Analytics (actif en production uniquement — le composant gère le dev lui-même) */}
        <Analytics />
      </body>
    </html>
  );
}
