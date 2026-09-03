import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/providers";
import { SITE_URL, SITE_NAME } from "@/lib/site-url";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — DJ mariage & soirées à Blois, Vendôme et alentours`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "DJ généraliste et techno pour mariages, anniversaires et soirées privées à Blois, Vendôme, Morée et dans un rayon de 50 km. Devis en ligne gratuit, sonorisation et lumière incluses, options FX (fumée, étincelles, CO2).",
  keywords: [
    "DJ Blois",
    "DJ mariage Blois",
    "DJ Vendôme",
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
    title: `${SITE_NAME} — DJ mariage & soirées (Blois, Vendôme, 50 km)`,
    description:
      "Animation DJ pour mariages, anniversaires et soirées privées. Devis gratuit en ligne, matériel pro, options FX (fumée, étincelles, CO2).",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${poppins.variable} ${inter.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden bg-background text-foreground">
        <Providers>{children}</Providers>
        {/* Analytics uniquement en production (warning script en dev) */}
        {process.env.NODE_ENV === "production" ? <Analytics /> : null}
      </body>
    </html>
  );
}
