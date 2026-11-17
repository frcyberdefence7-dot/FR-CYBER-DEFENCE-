import React, { useState } from 'react';
import {
  Ambulance,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { apiFetch } from '../utils/api.ts';
import type { Department, Doctor, HospitalSettings, PublicPage } from '../types/hms.ts';

interface HomePageProps {
  settings: HospitalSettings | null;
  departments: Department[];
  doctors: Doctor[];
  onNavigate: (page: PublicPage) => void;
  onSelectDoctor: (id: number) => void;
  onBookWithDoctor: (doctorId: number, departmentId: number) => void;
  onOpenSearch: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  settings,
  departments,
  doctors,
  onNavigate,
  onSelectDoctor,
  onBookWithDoctor,
  onOpenSearch,
}) => {
  return (
    <div>
      {/* Hero Split */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-medium text-teal-800 tracking-wide mb-3">
                {settings?.cmsBannerHeadline || 'NABH-Aligned Tertiary Care & 24/7 Level-1 Trauma Support'}
              </p>
              <h1
                className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight leading-tight"
                style={{ textWrap: 'balance' }}
              >
                Precision clinical care backed by unified digital health records
              </h1>
              <p className="mt-5 text-base text-slate-600 leading-relaxed max-w-xl">
                {settings?.hospitalName || 'Citystone Medical Center'} connects specialist consultations,
                3-Tesla diagnostic imaging, automated clinical pathology, and pharmacy dispensing in one
                transparent hospital system.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('book-appointment')}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Book Online Appointment
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onOpenSearch}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  Search Specialists & Tests
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center gap-6 text-xs text-slate-600">
                <span>
                  Emergency Desk:{' '}
                  <strong className="font-mono text-rose-700">
                    {settings?.emergencyPhone || '+91 80 4120 8911'}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>OPD Hours: Mon – Sat, 09:00 – 17:00</span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-72 sm:h-96 lg:h-full min-h-[340px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                <img
                  src="/src/assets/images/hospital_hero_campus_1794927651101.jpg"
                  alt="Citystone Medical Center sunlit glass atrium and main campus entrance"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* 4-column institutional strip below hero */}
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 pt-8 border-t border-slate-200">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="font-mono text-xl font-bold text-slate-900 tabular-nums">24 / 7</div>
              <div className="mt-1 text-xs font-medium text-slate-600">
                Emergency Trauma & Cardiac ICU
              </div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="font-mono text-xl font-bold text-slate-900 tabular-nums">
                {departments.length || 6} Centers
              </div>
              <div className="mt-1 text-xs font-medium text-slate-600">
                Integrated Specialty Departments
              </div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="font-mono text-xl font-bold text-slate-900 tabular-nums">3-Tesla</div>
              <div className="mt-1 text-xs font-medium text-slate-600">
                MRI & NABL Pathology Diagnostics
              </div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="font-mono text-xl font-bold text-slate-900 tabular-nums">100%</div>
              <div className="mt-1 text-xs font-medium text-slate-600">
                Digital Prescriptions & Lab PDFs
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Medical Departments */}
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                Medical Departments
              </h2>
              <p className="mt-2 text-sm text-slate-600 max-w-2xl">
                Multidisciplinary clinical wings coordinated under unified outpatient and inpatient records.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('departments')}
              className="text-sm font-semibold text-teal-800 hover:text-teal-900 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              View All Departments <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.slice(0, 6).map((dept) => (
              <div
                key={dept.id}
                className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span className="font-mono">{dept.code}</span>
                    <span>{dept.floorLocation}</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-slate-900">{dept.name}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{dept.description}</p>
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Head: <strong className="text-slate-700">{dept.headDoctorName}</strong>
                  </span>
                  <span className="font-mono font-semibold text-teal-800">
                    ₹{dept.consultationBaseFee}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Available Specialist Doctors */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                Available Specialist Physicians
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Consult directly with board-certified senior physicians and surgeons.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('doctors')}
              className="text-sm font-semibold text-teal-800 hover:text-teal-900 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              Full Doctors Directory <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.slice(0, 3).map((doc) => (
              <div
                key={doc.id}
                className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex flex-col justify-between"
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {doc.avatarUrl ? (
                      <img
                        src={doc.avatarUrl}
                        alt={doc.fullName}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-teal-800 text-white font-display font-bold text-lg flex items-center justify-center shrink-0">
                        {doc.fullName
                          .split(' ')
                          .slice(0, 2)
                          .map((p) => p[0])
                          .join('')}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-bold text-slate-900 truncate">
                        {doc.fullName}
                      </h3>
                      <p className="text-xs text-teal-800 font-medium mt-0.5">{doc.specialization}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {doc.experienceYears} yrs exp · ₹{doc.consultationFee} fee
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-slate-600 leading-relaxed line-clamp-3">{doc.bio}</p>
                </div>

                <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectDoctor(doc.id)}
                    className="text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
                  >
                    View Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => onBookWithDoctor(doc.id, doc.departmentId)}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
                  >
                    Book Slot
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Clinical Facilities */}
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
              Hospital Facilities & Clinical Infrastructure
            </h2>
            <p className="mt-2 text-sm text-slate-600 max-w-2xl">
              Designed for infection control, rapid diagnostic turnaround, and calm patient recovery.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="aspect-[4/3] bg-slate-100">
                <img
                  src="/src/assets/images/hospital_gallery_diagnostics_1794927652204.jpg"
                  alt="3-Tesla MRI and diagnostic imaging suite"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  01. Diagnostic Imaging & Automated Pathology
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Same-day digital radiology, 3T MRI screening, and NABL-aligned hematology and
                  biochemistry panels published directly to your patient dashboard.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('lab-tests')}
                  className="mt-4 text-sm font-semibold text-teal-800 hover:text-teal-900 inline-flex items-center gap-1 cursor-pointer"
                >
                  Explore Lab Tests <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="aspect-[4/3] bg-slate-100">
                <img
                  src="/src/assets/images/hospital_gallery_icu_1794927651870.jpg"
                  alt="Surgical recovery and intensive care suite"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  02. Critical Care, Surgical Suites & Pharmacy
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  1:1 critical-care nursing ratios, continuous multi-parameter bedside telemetry, and an
                  in-house 24-hour clinical pharmacy linked to physician e-prescriptions.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('services')}
                  className="mt-4 text-sm font-semibold text-teal-800 hover:text-teal-900 inline-flex items-center gap-1 cursor-pointer"
                >
                  View All Services <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Patient Testimonials */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mb-8">
            Patient Care Experiences
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Raghavendra Rao',
                context: 'Cardiology OPD & Lipid Diagnostics · Bengaluru',
                quote:
                  'Booking my morning slot took two minutes, my token #2 consultation started on time, and my verified Lipid Profile PDF appeared in my portal the same afternoon.',
              },
              {
                name: 'Shruti Kulkarni',
                context: 'Neurology & 3T MRI Suite · Koramangala',
                quote:
                  'Having Dr. Evelyn Reed’s digital prescription, MRI appointment, and itemized GST invoice in a single portal removed every administrative delay.',
              },
              {
                name: 'Deepak Hegde',
                context: 'Orthopedic Day Care · Indiranagar',
                quote:
                  'From reception check-in to pharmacy medication pickup, every department already had my chart updated without asking me to repeat paperwork.',
              },
            ].map((t) => (
              <div key={t.name} className="p-6 rounded-xl border border-slate-200 bg-slate-50">
                <p className="text-sm text-slate-700 leading-relaxed">"{t.quote}"</p>
                <div className="mt-5 pt-4 border-t border-slate-200">
                  <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{t.context}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Emergency Contact Strip */}
      <section className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <h2 className="font-display text-2xl font-bold">
              24/7 Emergency, Trauma & Ambulance Dispatch
            </h2>
            <p className="mt-2 text-sm text-slate-300 max-w-2xl">
              Direct cardiac ambulance bay and round-the-clock emergency physicians at Residency Road.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="px-4 py-2.5 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-200 font-mono text-base font-semibold">
              {settings?.emergencyPhone || '+91 80 4120 8911'}
            </div>
            <button
              type="button"
              onClick={() => onNavigate('emergency')}
              className="px-5 py-2.5 bg-white text-slate-900 hover:bg-slate-100 text-sm font-semibold rounded-lg cursor-pointer"
            >
              Emergency Directory
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export const AboutPage: React.FC<{ settings: HospitalSettings | null; onNavigate: (p: PublicPage) => void }> = ({
  settings,
  onNavigate,
}) => (
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
    <div>
      <h1 className="font-display text-3xl font-bold text-slate-900">
        About {settings?.hospitalName || 'Citystone Medical Center'}
      </h1>
      <p className="mt-4 text-base text-slate-600 leading-relaxed">
        Founded as a multidisciplinary tertiary care institution in Bengaluru, Citystone Medical Center
        combines evidence-based clinical protocols with a fully integrated Hospital Management System.
        Every patient visit, diagnostic sample, pharmacy batch, and billing statement is tracked cleanly
        for clinical accuracy and transparency.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[
        {
          icon: Stethoscope,
          title: 'Clinical Governance',
          desc: 'Peer-reviewed specialty boards across Cardiology, Neurology, Orthopedics, Pediatrics, and Internal Medicine.',
        },
        {
          icon: ShieldCheck,
          title: 'DPDP Healthcare Privacy',
          desc: 'Strict Role-Based Access Control (RBAC), encrypted credentials, and audited clinical record access.',
        },
        {
          icon: Building2,
          title: '180-Bed Tertiary Campus',
          desc: 'Modular laminar-flow operating theatres, 32-bed critical care wing, and 24-hour diagnostic laboratory.',
        },
      ].map((card) => (
        <div key={card.title} className="bg-white border border-slate-200 rounded-xl p-6">
          <card.icon className="w-6 h-6 text-teal-700 mb-3" />
          <h3 className="font-display text-base font-semibold text-slate-900">{card.title}</h3>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">{card.desc}</p>
        </div>
      ))}
    </div>

    <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-slate-900">Need an OPD Consultation?</h2>
        <p className="text-sm text-slate-600 mt-1">
          Check live doctor schedules and reserve a conflict-free time slot online.
        </p>
      </div>
      <button
        type="button"
        onClick={() => onNavigate('book-appointment')}
        className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-lg cursor-pointer shrink-0"
      >
        Book Appointment
      </button>
    </div>
  </div>
);

export const ServicesPage: React.FC<{ onNavigate: (p: PublicPage) => void }> = ({ onNavigate }) => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
    <h1 className="font-display text-3xl font-bold text-slate-900">Hospital Services</h1>
    <p className="mt-2 text-sm text-slate-600 max-w-2xl">
      Round-the-clock inpatient, outpatient, diagnostic, and pharmacy services.
    </p>
    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[
        {
          title: '01. 24/7 Emergency & Trauma Care',
          desc: 'Dedicated resuscitation bays, stroke-ready CT triage, and cardiac ACLS ambulances.',
          action: 'Emergency Contacts',
          page: 'emergency' as PublicPage,
        },
        {
          title: '02. Outpatient Specialist Clinics',
          desc: 'Scheduled 30-minute consultations with automated token queuing and digital e-prescriptions.',
          action: 'Book Consultation',
          page: 'book-appointment' as PublicPage,
        },
        {
          title: '03. Clinical Pathology & 3T Radiology',
          desc: 'Hematology, endocrinology, biochemistry, digital X-ray, and 3-Tesla MRI with online PDFs.',
          action: 'Browse Lab Catalog',
          page: 'lab-tests' as PublicPage,
        },
        {
          title: '04. 24-Hour Hospital Pharmacy',
          desc: 'Batch-verified generic and branded formulations with real-time stock checks and e-Rx dispensing.',
          action: 'Pharmacy Formulary',
          page: 'pharmacy' as PublicPage,
        },
        {
          title: '05. Intensive Care & Surgical Recovery',
          desc: 'Negative-pressure isolation rooms, cardiac step-down beds, and 24/7 intensivist cover.',
          action: 'View Facilities',
          page: 'gallery' as PublicPage,
        },
        {
          title: '06. Preventive Health Checkups',
          desc: 'Annual executive cardiac, diabetic, and thyroid screening packages with same-day physician review.',
          action: 'Contact Desk',
          page: 'contact' as PublicPage,
        },
      ].map((svc) => (
        <div key={svc.title} className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold text-slate-900">{svc.title}</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{svc.desc}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate(svc.page)}
            className="mt-5 text-sm font-semibold text-teal-800 hover:text-teal-900 inline-flex items-center gap-1 cursor-pointer"
          >
            {svc.action} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  </div>
);

export const EmergencyPage: React.FC<{ settings: HospitalSettings | null }> = ({ settings }) => (
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">
    <div className="bg-rose-50 border border-rose-200 rounded-xl p-8">
      <div className="flex items-center gap-3 text-rose-800">
        <Ambulance className="w-7 h-7" />
        <h1 className="font-display text-3xl font-bold">24/7 Emergency & Trauma Desk</h1>
      </div>
      <p className="mt-3 text-sm text-rose-900 max-w-2xl">
        For cardiac arrest, acute stroke, road trauma, respiratory distress, or pediatric emergencies,
        call our direct emergency dispatch line immediately.
      </p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-rose-200 rounded-lg p-5">
          <div className="text-xs font-semibold text-rose-700">Direct Ambulance & Trauma Hotline</div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900">
            {settings?.emergencyPhone || '+91 80 4120 8911'}
          </div>
        </div>
        <div className="bg-white border border-rose-200 rounded-lg p-5">
          <div className="text-xs font-semibold text-slate-600">Emergency Bay Entrance</div>
          <div className="mt-1 text-sm font-medium text-slate-900">
            Gate 2 (North Ground Floor), {settings?.address || '42 Residency Road, Bengaluru'}
          </div>
        </div>
      </div>
    </div>

    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 font-display font-semibold text-slate-900">
        Critical Extension Directory
      </div>
      <div className="divide-y divide-slate-200 text-sm">
        {[
          { unit: 'Casualty & Trauma Triage', ext: 'Ext. 911 / +91 80 4120 8911', floor: 'Ground Floor, Gate 2' },
          { unit: 'Cardiac Cath Lab & CCU', ext: 'Ext. 301', floor: 'Wing A, 3rd Floor' },
          { unit: 'Acute Stroke & Neuro ICU', ext: 'Ext. 402', floor: 'Wing B, 4th Floor' },
          { unit: 'Blood Bank & Cross-Match', ext: 'Ext. 115', floor: 'Lower Ground Floor' },
          { unit: '24-Hour Emergency Pharmacy', ext: 'Ext. 108', floor: 'Main Atrium, Ground Floor' },
        ].map((row) => (
          <div key={row.unit} className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="font-medium text-slate-900">{row.unit}</span>
            <div className="flex items-center gap-6 text-slate-600">
              <span>{row.floor}</span>
              <span className="font-mono font-semibold text-slate-900">{row.ext}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const GalleryPage: React.FC = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
    <h1 className="font-display text-3xl font-bold text-slate-900">Hospital Campus & Facility Gallery</h1>
    <p className="mt-2 text-sm text-slate-600">
      Inside Citystone Medical Center’s clinical wings, diagnostic suites, and recovery wards.
    </p>

    <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="aspect-[16/9] bg-slate-100">
          <img
            src="/src/assets/images/hospital_hero_campus_1794927651101.jpg"
            alt="Citystone Medical Center Campus Atrium"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-6">
          <h3 className="font-display text-lg font-semibold text-slate-900">Main Atrium & Outpatient Entrance</h3>
          <p className="mt-1 text-sm text-slate-600">
            Daylit glass atrium connecting Wing A (Cardiac & Ortho), Wing B (Neurosciences), and direct Emergency access.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="aspect-[4/3] bg-slate-100">
          <img
            src="/src/assets/images/hospital_gallery_diagnostics_1794927652204.jpg"
            alt="3T MRI Suite"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-6">
          <h3 className="font-display text-lg font-semibold text-slate-900">3-Tesla MRI & Radiology Console</h3>
          <p className="mt-1 text-sm text-slate-600">
            Wide-bore silent MRI imaging room with adjacent radiologist reporting workstation.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="aspect-[4/3] bg-slate-100">
          <img
            src="/src/assets/images/hospital_gallery_icu_1794927651870.jpg"
            alt="Private ICU and Recovery Suite"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-6">
          <h3 className="font-display text-lg font-semibold text-slate-900">Intensive Care & Post-Surgical Suite</h3>
          <p className="mt-1 text-sm text-slate-600">
            Private natural-light critical care room equipped with continuous vital signs telemetry.
          </p>
        </div>
      </div>
    </div>
  </div>
);

export const ContactPage: React.FC<{ settings: HospitalSettings | null }> = ({ settings }) => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await apiFetch<{ message: string }>('/api/public/contact', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setStatus({ type: 'success', text: res.message });
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message || 'Failed to submit inquiry.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 lg:grid-cols-12 gap-10">
      <div className="lg:col-span-5 space-y-6">
        <h1 className="font-display text-3xl font-bold text-slate-900">Contact Us</h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Reach our patient relations desk for specialist referrals, medical record transfers, or corporate
          wellness partnerships.
        </p>

        <div className="space-y-4 bg-white border border-slate-200 rounded-xl p-6 text-sm">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-900">Campus Address</div>
              <div className="text-slate-600 mt-0.5">
                {settings?.address || '42 Residency Road, Ashok Nagar, Bengaluru 560025'}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-900">OPD & Appointments</div>
              <div className="font-mono text-slate-700 mt-0.5">
                {settings?.phone || '+91 80 4120 8800'}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-900">Visiting & OPD Hours</div>
              <div className="text-slate-600 mt-0.5">
                OPD: Mon – Sat, 09:00 AM – 05:00 PM · Emergency: Open 24/7
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-8">
        <h2 className="font-display text-xl font-semibold text-slate-900 mb-5">Send an Inquiry</h2>
        {status && (
          <div
            className={`mb-5 p-4 rounded-lg text-sm flex items-center gap-2 ${
              status.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{status.text}</span>
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name *</label>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address *</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subject</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Message *</label>
            <textarea
              required
              rows={4}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg cursor-pointer"
          >
            {submitting ? 'Submitting...' : 'Submit Inquiry'}
          </button>
        </form>
      </div>
    </div>
  );
};

export const PrivacyPage: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
    <h1 className="font-display text-3xl font-bold text-slate-900">
      Privacy Policy & DPDP Healthcare Data Protection
    </h1>
    <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-5 text-sm text-slate-700 leading-relaxed">
      <p>
        Citystone Medical Center processes personal and clinical health records in strict alignment with
        India’s Digital Personal Data Protection (DPDP) Act and medical confidentiality standards.
      </p>
      <h2 className="font-display text-lg font-semibold text-slate-900">1. Purpose Limitation & Consent</h2>
      <p>
        Patient demographic data, diagnostic reports, prescriptions, and uploaded documents are collected
        solely for clinical treatment, diagnostic verification, hospital billing, and statutory record
        retention with explicit patient consent.
      </p>
      <h2 className="font-display text-lg font-semibold text-slate-900">2. Role-Based Access & Audit Trail</h2>
      <p>
        Access to patient clinical histories is restricted to authorized treating physicians, reception
        staff (for scheduling and billing), and system administrators. Every record view, update, and
        document upload is logged in our immutable audit log.
      </p>
      <h2 className="font-display text-lg font-semibold text-slate-900">3. Payment Data Isolation</h2>
      <p>
        Citystone Medical Center never stores credit/debit card numbers, CVV codes, or UPI PINs in any
        database table. Only transaction reference IDs and payment statuses are recorded.
      </p>
    </div>
  </div>
);

export const TermsPage: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
    <h1 className="font-display text-3xl font-bold text-slate-900">Terms & Conditions</h1>
    <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-5 text-sm text-slate-700 leading-relaxed">
      <h2 className="font-display text-lg font-semibold text-slate-900">1. Online Appointment Scheduling</h2>
      <p>
        Online appointments generate a unique Booking ID and sequential OPD token number. Patients are
        requested to arrive 15 minutes prior to their scheduled slot. Cancellations can be performed from
        the Patient Dashboard prior to consultation start.
      </p>
      <h2 className="font-display text-lg font-semibold text-slate-900">2. Diagnostic & Pharmacy Orders</h2>
      <p>
        Laboratory test bookings and prescription-restricted medications require physician authorization
        and verified patient identification at the diagnostics or pharmacy counter.
      </p>
      <h2 className="font-display text-lg font-semibold text-slate-900">3. Medical Emergency Disclaimer</h2>
      <p>
        Do not rely on online appointment forms for acute life-threatening emergencies. Call our 24/7
        emergency line (+91 80 4120 8911) or visit Emergency Gate 2 immediately.
      </p>
    </div>
  </div>
);
