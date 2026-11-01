import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Autorise l'accès au serveur de dev depuis le réseau local (téléphone, tablette…)
  allowedDevOrigins: ["192.168.1.75"],
  // Optimisation par next/image des photos servies depuis Supabase Storage.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "rzhqxygjwvwrfobzxvpq.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Uploads de fichiers clients (MP3, MP4, documents…) via les server actions.
  experimental: {
    serverActions: {
      bodySizeLimit: "60mb",
    },
  },
};

export default nextConfig;
