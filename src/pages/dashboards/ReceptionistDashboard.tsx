import React, { useEffect, useState } from 'react';
import {
  Calendar,
  FlaskConical,
  LogOut,
  Pill,
  Receipt,
  Search,
  UserPlus,
  Users,
} from 'lucide-react';
import { apiFetch } from '../../utils/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  BillingManagerPanel,
  LaboratoryManagerPanel,
  PharmacyManagerPanel,
} from './SharedClinicalTabs.tsx';
import type { Appointment, Department, Doctor, Patient } from '../../types/hms.ts';

interface ReceptionOverview {
  appointments: Appointment[];
  patients: Patient[];
  doctors: Doctor[];
  departments: Department[];
}

export const ReceptionistDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<
    'queue' | 'register' | 'book' | 'patients' | 'billing' | 'lab' | 'pharmacy'
  >('queue');
  const [data, setData] = useState<ReceptionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [doctorFilter, setDoctorFilter] = useState('');
  const [patientSearch, setPatientSearch] = useState('');

  // Walk-in registration
  const [regForm, setRegForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    gender: 'Male',
    bloodGroup: 'O+',
    address: '',
  });

  // Counter booking
  const [bookForm, setBookForm] = useState({
    patientId: '',
    departmentId: '',
    doctorId: '',
    appointmentDate: new Date().toISOString().slice(0, 10),
    timeSlot: '10:30',
    reason: '',
  });

  const loadReception = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<ReceptionOverview>('/api/clinical/reception/overview');
      setData(res);
      if (!bookForm.departmentId && res.departments[0]) {
        setBookForm((b) => ({
          ...b,
          departmentId: String(res.departments[0].id),
          doctorId: String(res.doctors[0]?.id || ''),
          patientId: String(res.patients[0]?.id || ''),
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReception();
  }, []);

  const updateApptStatus = async (id: number, status: string) => {
    await apiFetch(`/api/clinical/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setFeedback(`Appointment status updated to ${status}.`);
    loadReception();
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await apiFetch<Patient>('/api/clinical/reception/patients', {
      method: 'POST',
      body: JSON.stringify(regForm),
    });
    setFeedback(`Registered ${created.fullName} with Patient ID ${created.patientCode}.`);
    setRegForm({ fullName: '', phone: '', email: '', gender: 'Male', bloodGroup: 'O+', address: '' });
    loadReception();
  };

  const handleCounterBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const patient = data?.patients.find((p) => p.id === Number(bookForm.patientId));
    if (!patient) return;
    const res = await apiFetch<{ appointment: Appointment }>('/api/public/appointments', {
      method: 'POST',
      body: JSON.stringify({
        departmentId: Number(bookForm.departmentId),
        doctorId: Number(bookForm.doctorId),
        appointmentDate: bookForm.appointmentDate,
        timeSlot: bookForm.timeSlot,
        fullName: patient.fullName,
        phone: patient.phone,
        email: patient.email,
        gender: patient.gender,
        reason: bookForm.reason || 'Walk-in OPD Visit',
      }),
    });
    setFeedback(
      `Booked ${res.appointment.bookingId} · Token #${res.appointment.tokenNumber} for ${patient.fullName}.`
    );
    loadReception();
  };

  if (loading || !data) {
    return <div className="max-w-7xl mx-auto px-4 py-14 text-sm text-slate-500">Loading front desk...</div>;
  }

  const filteredAppts = data.appointments.filter(
    (a) => !doctorFilter || a.doctorId === Number(doctorFilter)
  );
  const filteredPatients = data.patients.filter((p) =>
    `${p.fullName} ${p.patientCode} ${p.phone}`.toLowerCase().includes(patientSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
      <aside className="lg:col-span-3 space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-mono text-teal-800 font-semibold">RECEPTION DESK</div>
          <div className="font-display text-lg font-bold text-slate-900 mt-0.5">{user?.name}</div>
          <div className="text-xs text-slate-500 mt-0.5">{user?.email}</div>
        </div>

        <nav className="bg-white border border-slate-200 rounded-xl p-2 space-y-1">
          {[
            { id: 'queue', label: 'OPD Queue & Check-In', icon: Calendar },
            { id: 'register', label: 'New Patient Registration', icon: UserPlus },
            { id: 'book', label: 'Book Appointment', icon: Calendar },
            { id: 'patients', label: 'Patient Directory', icon: Users },
            { id: 'billing', label: 'Billing & Counter Pay', icon: Receipt },
            { id: 'lab', label: 'Laboratory Bookings', icon: FlaskConical },
            { id: 'pharmacy', label: 'Pharmacy Counter', icon: Pill },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as any)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-xs font-semibold cursor-pointer ${
                tab === item.id ? 'bg-teal-50 text-teal-800' : 'text-slate-700 hover:bg-slate-50'
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

      <main className="lg:col-span-9 space-y-6">
        {feedback && (
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            {feedback}
          </div>
        )}

        {tab === 'queue' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="font-display text-base font-bold text-slate-900">
                Doctor-Wise Appointment & Token Queue
              </h2>
              <select
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
              >
                <option value="">All Doctors</option>
                {data.doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Booking / Token</th>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Doctor</th>
                    <th className="px-4 py-3">Schedule</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredAppts.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono">
                        <div className="font-semibold text-slate-900">{a.bookingId}</div>
                        <div className="text-teal-800 font-bold">Token #{a.tokenNumber}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{a.patientName}</div>
                        <div className="font-mono text-slate-500">{a.patientCode}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{a.doctorName}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">
                        {a.appointmentDate} · {a.timeSlot}
                      </td>
                      <td className="px-4 py-3 capitalize font-semibold text-slate-800">{a.status}</td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        {a.status === 'confirmed' && (
                          <button
                            type="button"
                            onClick={() => updateApptStatus(a.id, 'checked_in')}
                            className="px-2.5 py-1 bg-teal-700 text-white rounded font-semibold cursor-pointer"
                          >
                            Check In
                          </button>
                        )}
                        {a.status !== 'cancelled' && a.status !== 'completed' && (
                          <button
                            type="button"
                            onClick={() => updateApptStatus(a.id, 'cancelled')}
                            className="px-2.5 py-1 border border-rose-200 text-rose-700 rounded font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegisterPatient} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-base font-bold text-slate-900">
              Walk-In Patient Registration (Generates Unique Patient ID)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  required
                  type="text"
                  value={regForm.fullName}
                  onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone *</label>
                <input
                  required
                  type="tel"
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gender / Blood</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={regForm.gender}
                    onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                    className="px-2 py-2 border border-slate-300 rounded-lg"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                  <select
                    value={regForm.bloodGroup}
                    onChange={(e) => setRegForm({ ...regForm, bloodGroup: e.target.value })}
                    className="px-2 py-2 border border-slate-300 rounded-lg"
                  >
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              Register & Generate Patient ID
            </button>
          </form>
        )}

        {tab === 'book' && (
          <form onSubmit={handleCounterBook} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-base font-bold text-slate-900">
              Reception Counter Appointment Booking
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Patient *</label>
                <select
                  required
                  value={bookForm.patientId}
                  onChange={(e) => setBookForm({ ...bookForm, patientId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {data.patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.patientCode})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <select
                  value={bookForm.departmentId}
                  onChange={(e) => setBookForm({ ...bookForm, departmentId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {data.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Doctor *</label>
                <select
                  required
                  value={bookForm.doctorId}
                  onChange={(e) => setBookForm({ ...bookForm, doctorId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {data.doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} (₹{d.consultationFee})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={bookForm.appointmentDate}
                    onChange={(e) => setBookForm({ ...bookForm, appointmentDate: e.target.value })}
                    className="w-full px-2 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time Slot</label>
                  <input
                    type="time"
                    required
                    value={bookForm.timeSlot}
                    onChange={(e) => setBookForm({ ...bookForm, timeSlot: e.target.value })}
                    className="w-full px-2 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              Confirm Booking & Assign Token
            </button>
          </form>
        )}

        {tab === 'patients' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="font-display text-base font-bold text-slate-900">
                Patient Search ({filteredPatients.length})
              </h2>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Name, PAT code, or phone..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="divide-y divide-slate-200 text-xs">
              {filteredPatients.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">{p.fullName}</div>
                    <div className="font-mono text-slate-500">
                      {p.patientCode} · {p.phone} · {p.gender} · {p.bloodGroup || '-'}
                    </div>
                  </div>
                  <span className="text-slate-500">{p.email || 'Walk-in'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'billing' && <BillingManagerPanel patients={data.patients} />}
        {tab === 'lab' && <LaboratoryManagerPanel patients={data.patients} />}
        {tab === 'pharmacy' && <PharmacyManagerPanel patients={data.patients} />}
      </main>
    </div>
  );
};
