import React, { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { apiFetch } from './utils/api.ts';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { GlobalSearchModal } from './components/GlobalSearchModal.tsx';
import {
  AboutPage,
  ContactPage,
  EmergencyPage,
  GalleryPage,
  HomePage,
  PrivacyPage,
  ServicesPage,
  TermsPage,
} from './pages/PublicPages.tsx';
import {
  DepartmentsPage,
  DoctorProfilePage,
  DoctorsDirectoryPage,
  LabTestsPage,
  PharmacyPage,
} from './pages/ClinicalCatalogPages.tsx';
import { AppointmentBookingPage } from './pages/AppointmentBookingPage.tsx';
import { AuthPage } from './pages/AuthPage.tsx';
import { PatientDashboard } from './pages/dashboards/PatientDashboard.tsx';
import { DoctorDashboard } from './pages/dashboards/DoctorDashboard.tsx';
import { ReceptionistDashboard } from './pages/dashboards/ReceptionistDashboard.tsx';
import { AdminDashboard } from './pages/dashboards/AdminDashboard.tsx';
import type { Department, Doctor, HospitalSettings, PublicPage } from './types/hms.ts';

function HospitalShell() {
  const { user, loading: authLoading } = useAuth();
  const [page, setPage] = useState<PublicPage>('home');
  const [selectedDoctorId, setSelectedDoctorId] = useState<number>(1);
  const [bookingDeptId, setBookingDeptId] = useState<number | null>(null);
  const [bookingDocId, setBookingDocId] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const [settings, setSettings] = useState<HospitalSettings | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const loadOverview = useCallback(() => {
    apiFetch<{
      settings: HospitalSettings | null;
      departments: Department[];
      doctors: Doctor[];
    }>('/api/public/overview')
      .then((res) => {
        setSettings(res.settings);
        setDepartments(res.departments);
        setDoctors(res.doctors);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleSelectDoctor = (docId: number) => {
    setSelectedDoctorId(docId);
    setPage('doctor-profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookWithDoctor = (docId: number, deptId: number) => {
    setBookingDocId(docId);
    setBookingDeptId(deptId);
    setPage('book-appointment');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookDepartment = (deptId: number) => {
    setBookingDeptId(deptId);
    setBookingDocId(null);
    setPage('book-appointment');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPage = () => {
    if (page === 'portal') {
      if (authLoading) {
        return <div className="max-w-7xl mx-auto px-4 py-14 text-sm text-slate-500">Verifying session...</div>;
      }
      if (!user) {
        return <AuthPage onSuccess={() => setPage('portal')} onNavigate={setPage} />;
      }
      if (user.role === 'admin') return <AdminDashboard onSettingsUpdated={loadOverview} />;
      if (user.role === 'doctor') return <DoctorDashboard />;
      if (user.role === 'receptionist') return <ReceptionistDashboard />;
      return <PatientDashboard onNavigate={setPage} />;
    }

    switch (page) {
      case 'home':
        return (
          <HomePage
            settings={settings}
            departments={departments}
            doctors={doctors}
            onNavigate={setPage}
            onSelectDoctor={handleSelectDoctor}
            onBookWithDoctor={handleBookWithDoctor}
            onOpenSearch={() => setSearchOpen(true)}
          />
        );
      case 'about':
        return <AboutPage settings={settings} onNavigate={setPage} />;
      case 'departments':
        return (
          <DepartmentsPage
            departments={departments}
            doctors={doctors}
            onBookDepartment={handleBookDepartment}
            onSelectDoctor={handleSelectDoctor}
          />
        );
      case 'doctors':
        return (
          <DoctorsDirectoryPage
            departments={departments}
            onSelectDoctor={handleSelectDoctor}
            onBookWithDoctor={handleBookWithDoctor}
          />
        );
      case 'doctor-profile':
        return (
          <DoctorProfilePage
            doctorId={selectedDoctorId}
            onBack={() => setPage('doctors')}
            onBookWithDoctor={handleBookWithDoctor}
          />
        );
      case 'services':
        return <ServicesPage onNavigate={setPage} />;
      case 'book-appointment':
        return (
          <AppointmentBookingPage
            departments={departments}
            doctors={doctors}
            initialDepartmentId={bookingDeptId}
            initialDoctorId={bookingDocId}
            onNavigate={setPage}
          />
        );
      case 'emergency':
        return <EmergencyPage settings={settings} />;
      case 'lab-tests':
        return <LabTestsPage onNavigate={setPage} />;
      case 'pharmacy':
        return <PharmacyPage />;
      case 'gallery':
        return <GalleryPage />;
      case 'contact':
        return <ContactPage settings={settings} />;
      case 'login':
        return <AuthPage onSuccess={() => setPage('portal')} onNavigate={setPage} />;
      case 'privacy':
        return <PrivacyPage />;
      case 'terms':
        return <TermsPage />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar currentPage={page} onNavigate={setPage} />
      <div className="flex-1">{renderPage()}</div>
      <Footer settings={settings} onNavigate={setPage} />
      <GlobalSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={setPage}
        onSelectDoctor={handleSelectDoctor}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HospitalShell />
    </AuthProvider>
  );
}
