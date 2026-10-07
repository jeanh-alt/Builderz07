import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

const inter = Inter({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

// ============================================
// METADATA
// ============================================

export const metadata: Metadata = {
  title: 'Builderz07 - Carte des Réseaux de Chaleur Engie',
  description: 'Visualisation interactive des réseaux de chaleur en France pour identifier les opportunités commerciales Engie',
  keywords: ['Engie', 'réseaux de chaleur', 'carte interactive', 'opportunités commerciales', 'score', 'échéance'],
  authors: [{ name: 'Builderz07 Team' }],
  openGraph: {
    title: 'Builderz07 - Carte des Réseaux de Chaleur',
    description: 'Visualisation interactive des opportunités commerciales',
    type: 'website',
    locale: 'fr_FR',
  },
};

// ============================================
// ROOT LAYOUT
// ============================================

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={inter.className} suppressHydrationWarning>
      <head>
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        
        {/* Meta Tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#00A86B" />
        
        {/* Leaflet CSS */}
        <link 
          rel="stylesheet" 
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY+3w="
          crossOrigin=""
        />
        
        {/* Accessibility: Skip to main content */}
        <a href="#main-content" className="skip-link">
          Aller au contenu principal
        </a>
      </head>
      
      <body className="min-h-screen flex flex-col bg-engie-bg">
        {/* Skip Link Styles */}
        <style jsx global>{`
          .skip-link {
            position: absolute;
            top: -40px;
            left: 0;
            background: #00A86B;
            color: white;
            padding: 8px 16px;
            z-index: 100;
            text-decoration: none;
            font-weight: bold;
            border-radius: 0 0 4px 0;
          }
          .skip-link:focus {
            top: 0;
          }
        `}</style>
        
        {/* Header */}
        <Header />
        
        {/* Main Content */}
        <main id="main-content" className="flex-1">
          {children}
        </main>
        
        {/* Footer */}
        <Footer />
      </body>
    </html>
  );
}
