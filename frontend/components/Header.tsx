'use client';

import { useState } from 'react';
import Link from 'next/link';

// ============================================
// HEADER COMPONENT
// ============================================

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      {/* Main Header */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left Side - Logo and Title */}
          <div className="flex items-center gap-3">
            {/* Logo Engie */}
            <div className="flex items-center justify-center">
              <svg 
                className="w-10 h-10 text-engie-primary"
                viewBox="0 0 40 40"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Logo Engie"
              >
                <path d="M20 0C8.954 0 0 8.954 0 20s8.954 20 20 20 20-8.954 20-20S31.046 0 20 0zm7.5 29.167c-1.5 0-2.75-.667-3.5-1.833l-2.5-4.167c-.333-.5-1.083-.5-1.417 0l-2.5 4.167c-.75 1.166-2 1.833-3.5 1.833-2.5 0-4.5-2.5-4.5-6.667 0-2.5 1-4.583 2.5-5.917l2.5-3.333c1-1.25 2.667-1.833 4.167-1.833 3.333 0 6 2.5 6 6.667 0 1.667-.5 3-1.5 4.167l-2.5 3.333c-.833 1-2.167 1.5-3.333 1.5-1.167 0-2.333-.5-3.167-1.5l-1.667-2.5c-.5-.833-1.333-1.333-2.333-1.333-1.5 0-2.833 1-3.5 2.5 0 .5.167 1 .5 1.333.333.833.5 1.5l2.5 4c1.667 2.5 4.583 4 7.667 4 1.667 0 3.167-.5 4.333-1.5l1.667-2.5c.833-1.333 2-2.333 3.333-2.833 1.167-.417 2.333-.5 3.5-.5s2.5.833 3.5 2c1 .833 1.833 2.167 1.833 3.5 0 2-1.333 3.667-3 4.833zM20 5.833c-4.167 0-7.5 3.333-7.5 7.5s3.333 7.5 7.5 7.5 7.5-3.333 7.5-7.5-3.333-7.5-7.5-7.5z"/>
              </svg>
            </div>
            
            {/* Title */}
            <div>
              <h1 className="text-xl font-bold text-engie-text-dark">
                Builderz07
              </h1>
              <p className="text-sm text-engie-text-medium hidden sm:block">
                Hackathon Radar-DSP
              </p>
            </div>
          </div>

          {/* Right Side - Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-engie-text-dark hover:text-engie-primary transition-colors font-medium"
            >
              Carte
            </Link>
            <Link
              href="#"
              className="text-engie-text-dark hover:text-engie-primary transition-colors font-medium"
            >
              Données
            </Link>
            <Link
              href="#"
              className="text-engie-text-dark hover:text-engie-primary transition-colors font-medium"
            >
              Aide
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Ouvrir le menu"
            aria-expanded={isMobileMenuOpen}
            tabIndex={0}
          >
            <svg className="w-6 h-6 text-engie-text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <nav className="px-4 py-3 space-y-2">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-engie-text-dark hover:text-engie-primary transition-colors font-medium"
            >
              Carte
            </Link>
            <Link
              href="#"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-engie-text-dark hover:text-engie-primary transition-colors font-medium"
            >
              Données
            </Link>
            <Link
              href="#"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-engie-text-dark hover:text-engie-primary transition-colors font-medium"
            >
              Aide
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

export default Header;
