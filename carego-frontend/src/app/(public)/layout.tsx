import React from 'react';
import Link from 'next/link';
import { MapPin, ChevronDown } from 'lucide-react'; // Icons

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Navbar */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* 1. Logo */}
          <Link href="/" className="text-2xl font-bold text-blue-600 flex items-center gap-2">
            Carego
          </Link>

          {/* 2. Desktop Navigation */}
          <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-700 items-center">
            
            {/* 3. THE LOCATION PILL (New Addition) */}
            <button className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-full transition-colors text-gray-700">
              <MapPin className="w-4 h-4 text-emerald-500" />
              <span>Jaipur</span> {/* This will be dynamic later */}
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            <div className="h-6 w-px bg-gray-200 mx-2"></div> {/* Separator */}

            <Link href="/" className="hover:text-blue-600">Home</Link>
            <Link href="/services" className="hover:text-blue-600">Services</Link>
            <Link href="/about" className="hover:text-blue-600">About Us</Link>
          </nav>

          {/* 4. CTA Button */}
          <Link 
            href="/#contact-form"
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition shadow-sm"
          >
            Get Care Now
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow bg-gray-50">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400">© 2026 Carego Operations. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}