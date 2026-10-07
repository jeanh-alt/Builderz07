import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Head from 'next/head';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Carte des Réseaux de Chaleur - Engie",
  description: "Visualisation interactive des réseaux de chaleur en France avec scoring et recommandations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <Head>
        {/* Leaflet CSS - loaded from CDN to avoid Turbopack issues */}
        <link 
          rel="stylesheet" 
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMYDA="
          crossOrigin=""
        />
        {/* Leaflet Default Icon Compatibility */}
        <link 
          rel="stylesheet" 
          href="https://unpkg.com/leaflet-defaulticon-compatibility@1.0.0/dist/leaflet-defaulticon-compatibility.css"
        />
      </Head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
