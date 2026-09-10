import type { Metadata } from "next";
import { Inter, Fjalla_One } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/providers";
import { WhatsAppButton } from "@/components/whatsapp-button";
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
        <WhatsAppButton />
        {/* Analytics (actif en production uniquement — le composant gère le dev lui-même) */}
        <Analytics />
      </body>
    </html>
  );
}
