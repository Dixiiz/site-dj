import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site-url";

export const alt = `${SITE_NAME} — DJ mariage & soirées à Blois, Vendôme et alentours`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Image de partage générée à la volée : aperçu quand le site est partagé
// sur WhatsApp, Facebook, X, iMessage…
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0d1626 0%, #12233a 55%, #16324f 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
          padding: 60,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              width: 14,
              height: 120,
              background: "#4ba3e3",
              borderRadius: 8,
            }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 76,
                fontWeight: 700,
                letterSpacing: 2,
              }}
            >
              {SITE_NAME}
            </div>
            <div style={{ fontSize: 34, color: "#4ba3e3", marginTop: 8 }}>
              DJ mariage &amp; soirées — Blois · Vendôme · Loir-et-Cher
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 56,
            fontSize: 28,
            color: "#c9d6e8",
            display: "flex",
            gap: 32,
          }}
        >
          <span>🎵 Devis en ligne</span>
          <span>✍️ Signature digitale</span>
          <span>🎉 Espace client</span>
        </div>
      </div>
    ),
    size
  );
}