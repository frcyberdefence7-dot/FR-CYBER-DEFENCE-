import React, { useEffect, useState } from 'react';
import {
  Bell,
  Calendar,
  Download,
  FileText,
  FlaskConical,
  LogOut,
  Receipt,
  Shield,
  Upload,
  User,
} from 'lucide-react';
import { apiFetch } from '../../utils/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  downloadInvoicePdf,
  downloadLabReportPdf,
  downloadPrescriptionPdf,
} from '../../utils/pdfExport.ts';
import { SandboxPaymentModal } from './SharedClinicalTabs.tsx';
import type {
  AppNotification,
  Appointment,
  Bill,
  LabReport,
  Patient,
  PaymentRecord,
  Prescription,
  PublicPage,
} from '../../types/hms.ts';

interface PatientDashboardPayload {
  patient: Patient | null;
  appointments: Appointment[];
  prescriptions: Prescription[];
  medicalRecords: Array<{
    id: number;
    visitDate: string;
    chiefComplaint: string;
    vitalsBp: string | null;
    vitalsPulse: string | null;
    vitalsTemp: string | null;
    vitalsSpo2: string | null;
    diagnosis: string;
    clinicalNotes: string | null;
    treatmentPlan: string | null;
    doctorName: string;
  }>;
  labReports: LabReport[];
  bills: Bill[];
  payments: PaymentRecord[];
  documents: Array<{
    id: number;
    title: string;
    documentType: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    notes: string | null;
    uploadedAt: string;
  }>;
  notifications: AppNotification[];
}

export const PatientDashboard: React.FC<{ onNavigate: (p: PublicPage) => void }> = ({
  onNavigate,
}) => {
  const { user, logout, refreshUser } = useAuth();
  const [tab, setTab] = useState<
    'overview' | 'appointments' | 'prescriptions' | 'labs' | 'billing' | 'documents' | 'profile'
  >('overview');
  const [data, setData] = useState<PatientDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [payBill, setPayBill] = useState<Bill | null>(null);

  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
    bloodGroup: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    allergies: '',
    chronicConditions: '',
  });

  const [docForm, setDocForm] = useState({ title: '', documentType: 'Medical Report', notes: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<PatientDashboardPayload>('/api/patient/dashboard');
      setData(res);
      if (res.patient) {
        setProfileForm({
          fullName: res.patient.fullName || '',
          phone: res.patient.phone || '',
          bloodGroup: res.patient.bloodGroup || '',
          address: res.patient.address || '',
          emergencyContactName: res.patient.emergencyContactName || '',
          emergencyContactPhone: res.patient.emergencyContactPhone || '',
          allergies: res.patient.allergies || '',
          chronicConditions: res.patient.chronicConditions || '',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleCancelAppointment = async (id: number) => {
    await apiFetch(`/api/patient/appointments/${id}/cancel`, { method: 'POST' });
    setFeedback('Appointment cancelled and notification recorded.');
    loadDashboard();
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/patient/profile', {
      method: 'PATCH',
      body: JSON.stringify(profileForm),
    });
    setFeedback('Patient profile saved.');
    loadDashboard();
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    if (selectedFile.size > 2 * 1024 * 1024) {
      setFeedback('File must be under 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      await apiFetch('/api/patient/documents', {
        method: 'POST',
        body: JSON.stringify({
          title: docForm.title || selectedFile.name,
          documentType: docForm.documentType,
          fileName: selectedFile.name,
          mimeType: selectedFile.type,
          fileSizeBytes: selectedFile.size,
          contentBase64: String(reader.result || ''),
          notes: docForm.notes,
        }),
      });
      setFeedback('Medical document uploaded securely.');
      setDocForm({ title: '', documentType: 'Medical Report', notes: '' });
      setSelectedFile(null);
      loadDashboard();
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDownloadDocument = async (docId: number) => {
    const doc = await apiFetch<{ fileName: string; contentBase64: string }>(
      `/api/patient/documents/${docId}/download`
    );
    const link = document.createElement('a');
    link.href = doc.contentBase64;
    link.download = doc.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSecuritySave = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/auth/security', {
      method: 'PATCH',
      body: JSON.stringify({
        twoFactorEnabled,
        currentPassword: passwords.currentPassword || undefined,
        newPassword: passwords.newPassword || undefined,
      }),
    });
    setPasswords({ currentPassword: '', newPassword: '' });
    setFeedback('Security preferences updated.');
    await refreshUser();
  };

  const markNotifRead = async (id: number) => {
    await apiFetch(`/api/admin/notifications/${id}/read`, { method: 'POST' });
    loadDashboard();
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-14 text-sm text-slate-500">Loading patient portal...</div>;
  }

  const upcomingAppts = (data?.appointments || []).filter(
    (a) => a.status !== 'cancelled' && a.status !== 'completed'
  );
  const unpaidTotal = (data?.bills || []).reduce(
    (acc, b) => acc + Math.max(0, b.totalAmount - b.paidAmount),
    0
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Sidebar */}
      <aside className="lg:col-span-3 space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-mono text-teal-800 font-semibold">
            {data?.patient?.patientCode || 'PATIENT PORTAL'}
          </div>
          <div className="font-display text-lg font-bold text-slate-900 mt-0.5">
            {data?.patient?.fullName || user?.name}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{user?.email}</div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onNavigate('book-appointment')}
              className="w-full py-2 px-3 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              + Book New Appointment
            </button>
          </div>
        </div>

        <nav className="bg-white border border-slate-200 rounded-xl p-2 space-y-1 text-sm">
          {[
            { id: 'overview', label: 'Overview & Alerts', icon: Bell },
            { id: 'appointments', label: 'Appointments', icon: Calendar },
            { id: 'prescriptions', label: 'Prescriptions & History', icon: FileText },
            { id: 'labs', label: 'Lab Reports', icon: FlaskConical },
            { id: 'billing', label: 'Billing & Payments', icon: Receipt },
            { id: 'documents', label: 'Medical Documents', icon: Upload },
            { id: 'profile', label: 'Profile & 2FA Security', icon: User },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as any)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-xs font-semibold cursor-pointer transition-colors ${
                tab === item.id
                  ? 'bg-teal-50 text-teal-800'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="lg:col-span-9 space-y-6">
        {feedback && (
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            {feedback}
          </div>
        )}

        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500">Upcoming Visits</div>
                <div className="font-mono text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                  {upcomingAppts.length}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500">Prescriptions</div>
                <div className="font-mono text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                  {data?.prescriptions.length || 0}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500">Lab Reports</div>
                <div className="font-mono text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                  {data?.labReports.length || 0}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500">Balance Due</div>
                <div className="font-mono text-2xl font-bold text-rose-700 mt-1 tabular-nums">
                  ₹{unpaidTotal.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="font-display text-base font-bold text-slate-900 mb-4">
                Notifications & Care Reminders
              </h2>
              {data?.notifications.length === 0 ? (
                <p className="text-sm text-slate-500">No new notifications.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data?.notifications.map((n) => (
                    <div key={n.id} className="py-3 flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{n.title}</div>
                        <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {n.channel.toUpperCase()} · {new Date(n.createdAt).toLocaleString()}
                        </div>
                      </div>
                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={() => markNotifRead(n.id)}
                          className="text-xs font-semibold text-teal-800 hover:underline shrink-0 cursor-pointer"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'appointments' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-slate-900">
                Appointments & Follow-ups
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('book-appointment')}
                className="text-xs font-semibold text-teal-800 hover:underline cursor-pointer"
              >
                + Schedule Appointment
              </button>
            </div>
            <div className="divide-y divide-slate-200">
              {data?.appointments.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">No appointments booked yet.</p>
              ) : (
                data?.appointments.map((a) => (
                  <div key={a.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-mono text-slate-500">
                        {a.bookingId} · Token #{a.tokenNumber} · {a.departmentName}
                      </div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">{a.doctorName}</div>
                      <div className="text-xs text-slate-600 mt-1">
                        {a.appointmentDate} at <strong className="font-mono">{a.timeSlot}</strong>
                        {a.followUpDate && ` · Follow-up: ${a.followUpDate}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-semibold capitalize text-slate-700">{a.status}</span>
                      {a.status !== 'cancelled' && a.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => handleCancelAppointment(a.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'prescriptions' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="font-display text-base font-bold text-slate-900 mb-4">
                Digital Prescriptions (PDF Download)
              </h2>
              {data?.prescriptions.length === 0 ? (
                <p className="text-sm text-slate-500">No digital prescriptions issued yet.</p>
              ) : (
                <div className="space-y-4">
                  {data?.prescriptions.map((rx) => (
                    <div key={rx.id} className="p-4 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-mono text-slate-500">
                          {rx.prescriptionCode} · {new Date(rx.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">{rx.diagnosis}</div>
                        <div className="text-xs text-slate-600 mt-0.5">Issued by {rx.doctorName}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => downloadPrescriptionPdf(rx, data.patient)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg cursor-pointer shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" /> Download PDF
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="font-display text-base font-bold text-slate-900 mb-4">
                Clinical Visit & Medical History
              </h2>
              {data?.medicalRecords.length === 0 ? (
                <p className="text-sm text-slate-500">No medical records recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {data?.medicalRecords.map((mr) => (
                    <div key={mr.id} className="p-4 border border-slate-200 rounded-lg space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="font-mono">{mr.visitDate}</span>
                        <span>{mr.doctorName}</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900">{mr.diagnosis}</div>
                      <div className="text-slate-600">Chief Complaint: {mr.chiefComplaint}</div>
                      <div className="font-mono text-slate-600">
                        Vitals: BP {mr.vitalsBp || '-'} · Pulse {mr.vitalsPulse || '-'} · SpO2{' '}
                        {mr.vitalsSpo2 || '-'}
                      </div>
                      {mr.treatmentPlan && <div className="text-slate-700">Plan: {mr.treatmentPlan}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'labs' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-slate-900">Laboratory Reports</h2>
              <button
                type="button"
                onClick={() => onNavigate('lab-tests')}
                className="text-xs font-semibold text-teal-800 hover:underline cursor-pointer"
              >
                + Book Lab Test
              </button>
            </div>
            <div className="divide-y divide-slate-200">
              {data?.labReports.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">No lab orders yet.</p>
              ) : (
                data?.labReports.map((r) => (
                  <div key={r.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-mono text-slate-500">
                        {r.reportCode} · {r.category}
                      </div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">{r.testName}</div>
                      <div className="text-xs text-slate-600 mt-1">
                        Sample: {r.sampleStatus} · Processing:{' '}
                        <strong className="capitalize">{r.processingStatus}</strong>
                      </div>
                      {r.resultSummary && (
                        <div className="text-xs text-slate-700 mt-1">{r.resultSummary}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadLabReportPdf(r, data.patient)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" /> Report PDF
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'billing' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 font-display font-bold text-slate-900">
                Billing Invoices
              </div>
              <div className="divide-y divide-slate-200">
                {data?.bills.map((b) => (
                  <div key={b.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-mono text-slate-500">
                        {b.invoiceNumber} · {new Date(b.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-sm font-bold text-slate-900 font-mono mt-0.5 tabular-nums">
                        Total: ₹{b.totalAmount.toLocaleString()} · Paid: ₹{b.paidAmount.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-600 capitalize mt-0.5">Status: {b.status}</div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      {b.status !== 'paid' && (
                        <button
                          type="button"
                          onClick={() => setPayBill(b)}
                          className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          Pay Online
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => downloadInvoicePdf(b, data.patient)}
                        className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Invoice PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {data?.payments && data.payments.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-display text-sm font-bold text-slate-900 mb-3">Payment History</h3>
                <div className="divide-y divide-slate-100 text-xs">
                  {data.payments.map((p) => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between">
                      <span>
                        <strong className="font-mono">{p.receiptNumber}</strong> · {p.paymentMethod} ·{' '}
                        <span className="font-mono text-slate-500">{p.transactionRef}</span>
                      </span>
                      <span className="font-mono font-semibold text-emerald-700">
                        ₹{p.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'documents' && (
          <div className="space-y-6">
            <form onSubmit={handleUploadDocument} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="font-display text-base font-bold text-slate-900">
                Secure Medical Document Upload
              </h2>
              <p className="text-xs text-slate-500">
                Permitted formats: PDF, PNG, JPG, WEBP (max 2 MB). Stored with restricted patient & clinician access.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Document Title *</label>
                  <input
                    required
                    type="text"
                    value={docForm.title}
                    onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                    placeholder="e.g., Prior ECG / Discharge Summary"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={docForm.documentType}
                    onChange={(e) => setDocForm({ ...docForm, documentType: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    <option>Medical Report</option>
                    <option>Discharge Summary</option>
                    <option>Radiology Film</option>
                    <option>Insurance / ID Document</option>
                  </select>
                </div>
              </div>
              <div>
                <input
                  required
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="text-xs text-slate-600"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Upload Document
              </button>
            </form>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-display text-sm font-bold text-slate-900 mb-3">Uploaded Records</h3>
              {data?.documents.length === 0 ? (
                <p className="text-xs text-slate-500">No medical documents uploaded yet.</p>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {data?.documents.map((doc) => (
                    <div key={doc.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{doc.title}</div>
                        <div className="text-slate-500">
                          {doc.documentType} · {doc.fileName} ({Math.round(doc.fileSizeBytes / 1024)} KB)
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadDocument(doc.id)}
                        className="text-teal-800 font-semibold hover:underline cursor-pointer"
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'profile' && (
          <div className="space-y-6">
            <form onSubmit={handleUpdateProfile} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="font-display text-base font-bold text-slate-900">
                Patient Profile & Medical Alerts
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
                  <input
                    type="text"
                    value={profileForm.bloodGroup}
                    onChange={(e) => setProfileForm({ ...profileForm, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Known Allergies</label>
                  <input
                    type="text"
                    value={profileForm.allergies}
                    onChange={(e) => setProfileForm({ ...profileForm, allergies: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={profileForm.emergencyContactName}
                    onChange={(e) => setProfileForm({ ...profileForm, emergencyContactName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact Phone</label>
                  <input
                    type="text"
                    value={profileForm.emergencyContactPhone}
                    onChange={(e) => setProfileForm({ ...profileForm, emergencyContactPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Save Profile Changes
              </button>
            </form>

            <form onSubmit={handleSecuritySave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-teal-700" />
                Account Security & Two-Factor Authentication
              </h3>
              <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={twoFactorEnabled}
                  onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                  className="accent-teal-700"
                />
                Enable Two-Factor Authentication (2FA) on password sign-in
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Password (Optional)</label>
                  <input
                    type="password"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Update Security Settings
              </button>
            </form>
          </div>
        )}
      </main>

      {payBill && (
        <SandboxPaymentModal
          bill={payBill}
          onClose={() => setPayBill(null)}
          onPaid={() => {
            setPayBill(null);
            setFeedback('Payment completed and receipt issued.');
            loadDashboard();
          }}
        />
      )}
    </div>
  );
};
