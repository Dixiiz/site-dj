import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Autorise l'accès au serveur de dev depuis le réseau local (téléphone, tablette…)
  allowedDevOrigins: ["192.168.1.75"],
};

export default nextConfig;
