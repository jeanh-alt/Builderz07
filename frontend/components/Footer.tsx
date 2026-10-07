'use client';

import Link from 'next/link';

// ============================================
// FOOTER COMPONENT
// ============================================

export function Footer() {
  return (
    <footer className="bg-engie-text-dark text-white py-8">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left - Logo and Copyright */}
          <div className="col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <svg 
                className="w-8 h-8 text-engie-primary"
                viewBox="0 0 40 40"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Logo Engie"
              >
                <path d="M20 0C8.954 0 0 8.954 0 20s8.954 20 20 20 20-8.954 20-20S31.046 0 20 0zm7.5 29.167c-1.5 0-2.75-.667-3.5-1.833l-2.5-4.167c-.333-.5-1.083-.5-1.417 0l-2.5 4.167c-.75 1.166-2 1.833-3.5 1.833-2.5 0-4.5-2.5-4.5-6.667 0-2.5 1-4.583 2.5-5.917l2.5-3.333c1-1.25 2.667-1.833 4.167-1.833 3.333 0 6 2.5 6 6.667 0 1.667-.5 3-1.5 4.167l-2.5 3.333c-.833 1-2.167 1.5-3.333 1.5-1.167 0-2.333-.5-3.167-1.5l-1.667-2.5c-.5-.833-1.333-1.333-2.333-1.333-1.5 0-2.833 1-3.5 2.5 0 .5.167 1 .5 1.333.333.833.5 1.5l2.5 4c1.667 2.5 4.583 4 7.667 4 1.667 0 3.167-.5 4.333-1.5l1.667-2.5c.833-1.333 2-2.333 3.333-2.833 1.167-.417 2.333-.5 3.5-.5s2.5.833 3.5 2c1 .833 1.833 2.167 1.833 3.5 0 2-1.333 3.667-3 4.833zM20 5.833c-4.167 0-7.5 3.333-7.5 7.5s3.333 7.5 7.5 7.5 7.5-3.333 7.5-7.5-3.333-7.5-7.5-7.5z"/>
              </svg>
              <span className="font-bold text-engie-primary">Builderz07</span>
            </div>
            <p className="text-gray-400 text-sm">
              © 2026 Engie - Hackathon Radar-DSP
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Visualisation interactive des réseaux de chaleur en France
            </p>
          </div>

          {/* Center - Quick Links */}
          <div className="col-span-1">
            <h3 className="font-bold text-white mb-4">Liens rapides</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Carte interactive
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Spécifications
                </Link>
              </li>
            </ul>
          </div>

          {/* Right - Contact and Info */}
          <div className="col-span-1">
            <h3 className="font-bold text-white mb-4">Informations</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <span className="text-engie-primary">✉️</span>
                <span className="text-gray-400">contact@builderz07.com</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-engie-primary">📍</span>
                <span className="text-gray-400">France</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-engie-primary">⏱️</span>
                <span className="text-gray-400">1h30 de développement</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm">
            Développé avec ❤️ par l'équipe Builderz07
          </p>
          <div className="flex gap-4 text-sm">
            <span className="text-gray-400">Next.js</span>
            <span className="text-gray-400">Leaflet</span>
            <span className="text-gray-400">TailwindCSS</span>
            <span className="text-gray-400">Voxtral</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
