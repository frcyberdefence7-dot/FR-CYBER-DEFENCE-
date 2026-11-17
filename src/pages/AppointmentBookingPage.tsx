import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, Clock, Stethoscope, User } from 'lucide-react';
import { apiFetch } from '../utils/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import type { Appointment, Bill, Department, Doctor, Patient, PublicPage } from '../types/hms.ts';

interface AppointmentBookingPageProps {
  departments: Department[];
  doctors: Doctor[];
  initialDepartmentId?: number | null;
  initialDoctorId?: number | null;
  onNavigate: (page: PublicPage) => void;
}

export const AppointmentBookingPage: React.FC<AppointmentBookingPageProps> = ({
  departments,
  doctors,
  initialDepartmentId,
  initialDoctorId,
  onNavigate,
}) => {
  const { user } = useAuth();
  const [departmentId, setDepartmentId] = useState<number>(
    initialDepartmentId || departments[0]?.id || 0
  );
  const [doctorId, setDoctorId] = useState<number>(initialDoctorId || 0);
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [slots, setSlots] = useState<Array<{ time: string; isBooked: boolean }>>([]);
  const [slotUnavailableReason, setSlotUnavailableReason] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');

  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [gender, setGender] = useState('Prefer not to say');
  const [reason, setReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    appointment: Appointment;
    patient: Patient;
    doctor: Doctor;
    bill: Bill;
  } | null>(null);

  useEffect(() => {
    if (initialDepartmentId) setDepartmentId(initialDepartmentId);
  }, [initialDepartmentId]);

  useEffect(() => {
    if (initialDoctorId) setDoctorId(initialDoctorId);
  }, [initialDoctorId]);

  const deptDoctors = doctors.filter((d) => !departmentId || d.departmentId === departmentId);

  useEffect(() => {
    if (deptDoctors.length > 0 && !deptDoctors.some((d) => d.id === doctorId)) {
      setDoctorId(deptDoctors[0].id);
    }
  }, [departmentId, deptDoctors, doctorId]);

  useEffect(() => {
    if (user && user.role === 'patient') {
      apiFetch<{ patientProfile: Patient | null }>('/api/auth/me')
        .then((res) => {
          if (res.patientProfile) {
            setFullName(res.patientProfile.fullName);
            setPhone(res.patientProfile.phone);
            setEmail(res.patientProfile.email || user.email);
            setGender(res.patientProfile.gender);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!doctorId || !date) return;
    setLoadingSlots(true);
    setSelectedSlot('');
    setSlotUnavailableReason(null);

    apiFetch<{
      available: boolean;
      reason?: string;
      slots: Array<{ time: string; isBooked: boolean }>;
    }>(`/api/public/doctors/${doctorId}/slots?date=${encodeURIComponent(date)}`)
      .then((res) => {
        if (!res.available) {
          setSlots([]);
          setSlotUnavailableReason(res.reason || 'No OPD slots available for this date.');
        } else {
          setSlots(res.slots);
        }
      })
      .catch((err) => {
        setSlots([]);
        setSlotUnavailableReason(err.message || 'Unable to load slots.');
      })
      .finally(() => setLoadingSlots(false));
  }, [doctorId, date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedSlot) {
      setError('Please select an available time slot.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch<{
        appointment: Appointment;
        patient: Patient;
        doctor: Doctor;
        bill: Bill;
      }>('/api/public/appointments', {
        method: 'POST',
        body: JSON.stringify({
          departmentId,
          doctorId,
          appointmentDate: date,
          timeSlot: selectedSlot,
          fullName,
          phone,
          email,
          gender,
          reason,
          userId: user?.id ?? null,
        }),
      });
      setConfirmation(res);
    } catch (err: any) {
      setError(err.message || 'Booking failed. Please check details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmation) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14">
        <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-6">
          <div className="flex items-center gap-3 text-emerald-700">
            <CheckCircle2 className="w-7 h-7" />
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                Appointment Confirmed
              </h1>
              <p className="text-xs text-slate-500">
                Confirmation & invoice generated in Citystone Medical HMS
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-500">Unique Booking ID</div>
              <div className="font-mono font-bold text-slate-900 text-base">
                {confirmation.appointment.bookingId}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">OPD Token Number</div>
              <div className="font-mono font-bold text-teal-800 text-base">
                Token #{confirmation.appointment.tokenNumber}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Patient ID</div>
              <div className="font-mono text-slate-900">{confirmation.patient.patientCode}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Consulting Specialist</div>
              <div className="font-semibold text-slate-900">{confirmation.doctor.fullName}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Scheduled Date & Slot</div>
              <div className="font-mono text-slate-900">
                {confirmation.appointment.appointmentDate} · {confirmation.appointment.timeSlot}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Generated Invoice</div>
              <div className="font-mono text-slate-900">
                {confirmation.bill.invoiceNumber} (₹{confirmation.bill.totalAmount})
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {user ? (
              <button
                type="button"
                onClick={() => onNavigate('portal')}
                className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
              >
                View in Patient Dashboard
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
              >
                Sign In to Manage Visit
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setConfirmation(null);
                setSelectedSlot('');
              }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-lg cursor-pointer"
            >
              Book Another Appointment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-slate-900">Online Appointment Booking</h1>
        <p className="mt-2 text-sm text-slate-600">
          Select a medical department, specialist, date, and open consultation slot. Overlapping bookings
          are automatically blocked.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1 & 2: Department & Doctor */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-teal-700" />
              1. Department & Specialist
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Department</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Doctor</label>
                <select
                  value={doctorId}
                  onChange={(e) => setDoctorId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  {deptDoctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.fullName} (₹{doc.consultationFee})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Step 3 & 4: Date & Slots */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-700" />
              2. Preferred Date & Available Time Slot
            </h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Appointment Date
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().slice(0, 10)}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full sm:w-64 px-3 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Select Time Slot
                </span>
                <span className="text-xs text-slate-500">Gray slots are already booked</span>
              </div>

              {loadingSlots ? (
                <div className="text-sm text-slate-500 py-4">Checking live doctor schedule...</div>
              ) : slotUnavailableReason ? (
                <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  {slotUnavailableReason}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {slots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={slot.isBooked}
                      onClick={() => setSelectedSlot(slot.time)}
                      className={`py-2 px-3 rounded-lg font-mono text-xs font-semibold border transition-colors ${
                        slot.isBooked
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                          : selectedSlot === slot.time
                            ? 'bg-teal-700 text-white border-teal-700 cursor-pointer'
                            : 'bg-white text-slate-800 border-slate-300 hover:border-teal-600 cursor-pointer'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 5: Patient Details & Submit */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-teal-700" />
              3. Patient Details
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                required
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Patient full legal name"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone *</label>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98450 00000"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                  <option>Prefer not to say</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="patient@example.com"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Symptoms / Reason for Visit
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly describe symptoms or follow-up reason..."
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedSlot}
              className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg cursor-pointer transition-colors"
            >
              {submitting ? 'Confirming Booking...' : 'Confirm & Generate Booking ID'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
