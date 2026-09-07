import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/formules", "/comment-ca-se-passe", "/disponibilites", "/faq", "/contact", "/sur-mesure", "/avis", "/blog", "/blog/choisir-dj-mariage-blois", "/blog/playlist-mariage-2026"];
  const lastModified = new Date();
  return pages.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
