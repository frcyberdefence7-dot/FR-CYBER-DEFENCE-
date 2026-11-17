import React from 'react';
import type { HospitalSettings, PublicPage } from '../types/hms.ts';

interface FooterProps {
  settings: HospitalSettings | null;
  onNavigate: (page: PublicPage) => void;
}

export const Footer: React.FC<FooterProps> = ({ settings, onNavigate }) => {
  const go = (page: PublicPage) => {
    onNavigate(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <h3 className="font-display text-lg font-bold text-white tracking-tight">
            {settings?.hospitalName || 'Citystone Medical Center'}
          </h3>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed">
            {settings?.address || '42 Residency Road, Ashok Nagar, Bengaluru, Karnataka 560025'}
          </p>
          <div className="mt-4 space-y-1 text-sm">
            <p className="text-slate-300">
              OPD Desk: <span className="font-mono text-white">{settings?.phone || '+91 80 4120 8800'}</span>
            </p>
            <p className="text-rose-300 font-medium">
              24/7 Emergency: <span className="font-mono">{settings?.emergencyPhone || '+91 80 4120 8911'}</span>
            </p>
            <p className="text-slate-400">{settings?.email || 'care@citystonemedical.org'}</p>
          </div>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-white mb-4">Clinical Care</h4>
          <ul className="space-y-2.5 text-sm">
            <li>
              <button type="button" onClick={() => go('about')} className="hover:text-white cursor-pointer">
                About Hospital
              </button>
            </li>
            <li>
              <button type="button" onClick={() => go('departments')} className="hover:text-white cursor-pointer">
                Medical Departments
              </button>
            </li>
            <li>
              <button type="button" onClick={() => go('doctors')} className="hover:text-white cursor-pointer">
                Doctors Directory
              </button>
            </li>
            <li>
              <button type="button" onClick={() => go('services')} className="hover:text-white cursor-pointer">
                Hospital Services
              </button>
            </li>
            <li>
              <button type="button" onClick={() => go('gallery')} className="hover:text-white cursor-pointer">
                Facility Gallery
              </button>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-white mb-4">Patient Services</h4>
          <ul className="space-y-2.5 text-sm">
            <li>
              <button type="button" onClick={() => go('book-appointment')} className="hover:text-white cursor-pointer">
                Online Appointment Booking
              </button>
            </li>
            <li>
              <button type="button" onClick={() => go('lab-tests')} className="hover:text-white cursor-pointer">
                Laboratory Tests
              </button>
            </li>
            <li>
              <button type="button" onClick={() => go('pharmacy')} className="hover:text-white cursor-pointer">
                Pharmacy Information
              </button>
            </li>
            <li>
              <button type="button" onClick={() => go('emergency')} className="hover:text-white cursor-pointer">
                Emergency & Trauma Contact
              </button>
            </li>
            <li>
              <button type="button" onClick={() => go('contact')} className="hover:text-white cursor-pointer">
                Contact Us
              </button>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-white mb-4">Portals & Legal</h4>
          <ul className="space-y-2.5 text-sm">
            <li>
              <button type="button" onClick={() => go('login')} className="hover:text-white cursor-pointer">
                Patient & Staff Login
              </button>
            </li>
            <li>
              <button type="button" onClick={() => go('privacy')} className="hover:text-white cursor-pointer">
                Privacy Policy (DPDP Act)
              </button>
            </li>
            <li>
              <button type="button" onClick={() => go('terms')} className="hover:text-white cursor-pointer">
                Terms & Conditions
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800 py-5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Citystone Medical Center. All rights reserved.</p>
          <p>GSTIN {settings?.gstNumber || '29AABCC1234M1Z5'} · Healthcare Privacy & DPDP Compliant</p>
        </div>
      </div>
    </footer>
  );
};
