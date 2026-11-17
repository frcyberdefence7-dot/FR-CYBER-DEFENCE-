import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import type { PublicPage } from '../types/hms.ts';

interface NavbarProps {
  currentPage: PublicPage;
  onNavigate: (page: PublicPage) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const go = (page: PublicPage) => {
    onNavigate(page);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navLinks: Array<{ label: string; page: PublicPage }> = [
    { label: 'Departments', page: 'departments' },
    { label: 'Doctors', page: 'doctors' },
    { label: 'Diagnostics', page: 'lab-tests' },
    { label: 'Contact', page: 'contact' },
    { label: user ? 'Portal' : 'Sign In', page: user ? 'portal' : 'login' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => go('home')}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 rounded"
        >
          Citystone Medical
        </button>

        {/* Zone 2: 5 concise single-line text nav links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          {navLinks.map((item) => {
            const active = currentPage === item.page;
            return (
              <button
                key={item.page}
                type="button"
                onClick={() => go(item.page)}
                className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer border-b-2 ${
                  active
                    ? 'text-teal-800 border-teal-700 font-semibold'
                    : 'border-transparent hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => go('book-appointment')}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Book Appointment
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-1">
          {[
            { label: 'Home', page: 'home' as PublicPage },
            { label: 'About Hospital', page: 'about' as PublicPage },
            { label: 'Departments', page: 'departments' as PublicPage },
            { label: 'Doctors Directory', page: 'doctors' as PublicPage },
            { label: 'Hospital Services', page: 'services' as PublicPage },
            { label: 'Laboratory Tests', page: 'lab-tests' as PublicPage },
            { label: 'Pharmacy Info', page: 'pharmacy' as PublicPage },
            { label: 'Hospital Gallery', page: 'gallery' as PublicPage },
            { label: 'Emergency 24/7', page: 'emergency' as PublicPage },
            { label: 'Contact Us', page: 'contact' as PublicPage },
            { label: user ? 'Open Dashboard' : 'Login & Register', page: (user ? 'portal' : 'login') as PublicPage },
          ].map((link) => (
            <button
              key={link.page}
              type="button"
              onClick={() => go(link.page)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                currentPage === link.page
                  ? 'bg-teal-50 text-teal-800 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {link.label}
            </button>
          ))}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => go('book-appointment')}
              className="w-full py-2.5 px-4 bg-teal-700 text-white text-sm font-semibold rounded-lg"
            >
              Book Appointment
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
