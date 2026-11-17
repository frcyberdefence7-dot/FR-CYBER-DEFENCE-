import React, { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, CheckCircle2, Clock, FlaskConical, Pill, Search } from 'lucide-react';
import { apiFetch } from '../utils/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import type { Department, Doctor, LabTest, Medicine, PublicPage } from '../types/hms.ts';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const DepartmentsPage: React.FC<{
  departments: Department[];
  doctors: Doctor[];
  onBookDepartment: (deptId: number) => void;
  onSelectDoctor: (docId: number) => void;
}> = ({ departments, doctors, onBookDepartment, onSelectDoctor }) => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
    <h1 className="font-display text-3xl font-bold text-slate-900">Medical Departments</h1>
    <p className="mt-2 text-sm text-slate-600 max-w-2xl">
      Select a clinical department to explore specialists and outpatient consultation schedules.
    </p>
    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
      {departments.map((dept) => {
        const deptDoctors = doctors.filter((d) => d.departmentId === dept.id);
        return (
          <div key={dept.id} className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-mono">{dept.code}</span>
                <span>{dept.floorLocation} · Ext {dept.contactExt}</span>
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900 mt-2">{dept.name}</h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{dept.description}</p>

              {deptDoctors.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-500 mb-2">Department Specialists</div>
                  <div className="flex flex-wrap gap-2">
                    {deptDoctors.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => onSelectDoctor(doc.id)}
                        className="text-xs font-medium text-teal-800 hover:underline cursor-pointer"
                      >
                        {doc.fullName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-600">
                Consultation from <strong className="font-mono text-slate-900">₹{dept.consultationBaseFee}</strong>
              </span>
              <button
                type="button"
                onClick={() => onBookDepartment(dept.id)}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Book in Department
              </button>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export const DoctorsDirectoryPage: React.FC<{
  departments: Department[];
  onSelectDoctor: (id: number) => void;
  onBookWithDoctor: (docId: number, deptId: number) => void;
}> = ({ departments, onSelectDoctor, onBookWithDoctor }) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (deptFilter) params.set('departmentId', deptFilter);
    if (search.trim()) params.set('search', search.trim());
    if (availableOnly) params.set('available', 'true');

    apiFetch<Doctor[]>(`/api/public/doctors?${params.toString()}`)
      .then(setDoctors)
      .catch(() => setDoctors([]))
      .finally(() => setLoading(false));
  }, [deptFilter, search, availableOnly]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900">Doctors Directory</h1>
          <p className="mt-2 text-sm text-slate-600">
            Filter by medical specialty, availability, or physician name.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-8 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search doctor name, qualification, or specialty..."
            className="w-full pl-10 pr-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
          />
        </div>
        <div className="md:col-span-4">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
          >
            <option value="">All Medical Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3 flex items-center gap-2">
          <input
            id="availOnly"
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
            className="w-4 h-4 accent-teal-700 rounded cursor-pointer"
          />
          <label htmlFor="availOnly" className="text-sm text-slate-700 cursor-pointer">
            Available for OPD today
          </label>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-56 bg-slate-200/70 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-600">
          No doctors match your current filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doc) => (
            <div key={doc.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between">
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
                    <div className="text-xs text-slate-500">{doc.departmentName}</div>
                    <h3 className="font-display text-lg font-bold text-slate-900">{doc.fullName}</h3>
                    <p className="text-xs text-teal-800 font-medium">{doc.specialization}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-600">{doc.qualification}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 font-mono tabular-nums">
                  <span>{doc.experienceYears} yrs exp</span>
                  <span>·</span>
                  <span>Fee: ₹{doc.consultationFee}</span>
                  <span>·</span>
                  <span className={doc.isAvailable ? 'text-emerald-700 font-semibold' : 'text-amber-700'}>
                    {doc.isAvailable ? 'Available' : 'On Leave'}
                  </span>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onSelectDoctor(doc.id)}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
                >
                  Full Profile & Schedule
                </button>
                <button
                  type="button"
                  onClick={() => onBookWithDoctor(doc.id, doc.departmentId)}
                  className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Book Appointment
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const DoctorProfilePage: React.FC<{
  doctorId: number;
  onBack: () => void;
  onBookWithDoctor: (docId: number, deptId: number) => void;
}> = ({ doctorId, onBack, onBookWithDoctor }) => {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<Doctor>(`/api/public/doctors/${doctorId}`)
      .then(setDoctor)
      .catch(() => setDoctor(null))
      .finally(() => setLoading(false));
  }, [doctorId]);

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-14 text-sm text-slate-500">Loading doctor profile...</div>;
  }
  if (!doctor) {
    return <div className="max-w-4xl mx-auto px-4 py-14 text-sm text-rose-600">Doctor profile not found.</div>;
  }

  const weeklyRows = (doctor.schedules || []).filter((s) => !s.isLeave);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Doctors Directory
      </button>

      <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col md:flex-row gap-8 items-start">
        {doctor.avatarUrl ? (
          <img
            src={doctor.avatarUrl}
            alt={doctor.fullName}
            referrerPolicy="no-referrer"
            className="w-32 h-32 rounded-xl object-cover border border-slate-200 shrink-0"
          />
        ) : (
          <div className="w-32 h-32 rounded-xl bg-teal-800 text-white font-display font-bold text-3xl flex items-center justify-center shrink-0">
            {doctor.fullName
              .split(' ')
              .slice(0, 2)
              .map((p) => p[0])
              .join('')}
          </div>
        )}

        <div className="flex-1">
          <div className="text-xs font-medium text-teal-800">
            {doctor.departmentName} · {doctor.floorLocation} · {doctor.doctorCode}
          </div>
          <h1 className="font-display text-3xl font-bold text-slate-900 mt-1">{doctor.fullName}</h1>
          <p className="text-base text-slate-700 font-medium mt-1">{doctor.specialization}</p>
          <p className="text-sm text-slate-500 mt-1">{doctor.qualification}</p>
          <p className="mt-4 text-sm text-slate-600 leading-relaxed">{doctor.bio}</p>

          <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-slate-700">
            <span>
              Experience: <strong className="font-mono">{doctor.experienceYears} years</strong>
            </span>
            <span>
              Languages: <strong>{doctor.languages}</strong>
            </span>
            <span>
              Consultation Fee: <strong className="font-mono text-teal-800">₹{doctor.consultationFee}</strong>
            </span>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => onBookWithDoctor(doctor.id, doctor.departmentId)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              Book Appointment with {doctor.fullName}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2 font-display font-semibold text-slate-900">
          <Clock className="w-4 h-4 text-teal-700" />
          Weekly OPD Consultation Schedule
        </div>
        <div className="divide-y divide-slate-200 text-sm">
          {weeklyRows.length === 0 ? (
            <div className="p-6 text-slate-500">Schedule updated by department desk.</div>
          ) : (
            weeklyRows.map((sch) => (
              <div key={sch.id} className="px-6 py-3 flex items-center justify-between">
                <span className="font-medium text-slate-900">{DAY_NAMES[sch.dayOfWeek]}</span>
                <span className="font-mono text-slate-700 tabular-nums">
                  {sch.startTime} – {sch.endTime} ({sch.slotDurationMinutes} min slots)
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export const LabTestsPage: React.FC<{ onNavigate: (p: PublicPage) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [tests, setTests] = useState<LabTest[]>([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [bookingFeedback, setBookingFeedback] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category !== 'All') params.set('category', category);
    if (search.trim()) params.set('search', search.trim());
    apiFetch<LabTest[]>(`/api/public/lab-tests?${params.toString()}`)
      .then(setTests)
      .catch(() => setTests([]));
  }, [category, search]);

  const categories = ['All', 'Hematology', 'Biochemistry', 'Cardiac Markers', 'Endocrinology', 'Radiology'];

  const handleBookTest = async (test: LabTest) => {
    if (!user) {
      onNavigate('login');
      return;
    }
    try {
      const res = await apiFetch<{ order: { reportCode: string }; bill: { invoiceNumber: string } }>(
        '/api/clinical/lab/orders',
        {
          method: 'POST',
          body: JSON.stringify({ testId: test.id }),
        }
      );
      setBookingFeedback(
        `Booked ${test.name} (${res.order.reportCode}). Invoice ${res.bill.invoiceNumber} added to your Billing portal.`
      );
    } catch (err: any) {
      setBookingFeedback(err.message || 'Could not book lab test.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900">
            Diagnostic Laboratory & Radiology Tests
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Transparent diagnostic pricing with verified PDF reports delivered directly to your portal.
          </p>
        </div>
      </div>

      {bookingFeedback && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{bookingFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('portal')}
            className="text-xs font-semibold underline cursor-pointer"
          >
            Open Portal
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-1.5 bg-slate-200/70 p-1 rounded-lg">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors ${
                category === cat ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lab test or code..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tests.map((t) => (
          <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-mono">{t.testCode}</span>
                <span>{t.category}</span>
              </div>
              <div className="mt-2 flex items-start gap-2.5">
                <FlaskConical className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                <h3 className="font-display text-base font-semibold text-slate-900">{t.name}</h3>
              </div>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{t.description}</p>
              <div className="mt-4 text-xs text-slate-500 space-y-1">
                <div>Sample: {t.sampleType}</div>
                <div>Turnaround: {t.turnaroundHours} hours</div>
                {t.normalRange && <div>Ref Range: {t.normalRange}</div>}
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="font-mono text-base font-bold text-slate-900">₹{t.price}</span>
              <button
                type="button"
                onClick={() => handleBookTest(t)}
                className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                {user ? 'Book Lab Test' : 'Sign In to Book'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PharmacyPage: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    apiFetch<Medicine[]>(`/api/public/pharmacy${q}`)
      .then(setMedicines)
      .catch(() => setMedicines([]));
  }, [search]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900">24-Hour Hospital Pharmacy</h1>
          <p className="mt-2 text-sm text-slate-600">
            Verified clinical formulary integrated with Citystone outpatient e-prescriptions.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brand, generic, or category..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-5 py-3.5">Code</th>
                <th className="px-5 py-3.5">Medicine / Generic</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Manufacturer</th>
                <th className="px-5 py-3.5">Dispensing</th>
                <th className="px-5 py-3.5 text-right">MRP (INR)</th>
                <th className="px-5 py-3.5 text-right">Availability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {medicines.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{m.medicineCode}</td>
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                      <Pill className="w-4 h-4 text-teal-700 shrink-0" />
                      {m.name}
                    </div>
                    <div className="text-xs text-slate-500 ml-6">{m.genericName}</div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{m.category}</td>
                  <td className="px-5 py-3.5 text-slate-600">{m.manufacturer}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">
                    {m.requiresPrescription ? 'Rx Required' : 'OTC Available'} · {m.unitType}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                    ₹{m.unitPrice}
                  </td>
                  <td className="px-5 py-3.5 text-right text-xs font-semibold">
                    <span className={m.inStock ? 'text-emerald-700' : 'text-rose-700'}>
                      {m.inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
