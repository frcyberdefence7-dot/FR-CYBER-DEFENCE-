import React, { useEffect, useState } from 'react';
import {
  Calendar,
  ClipboardList,
  Clock,
  Download,
  FilePlus2,
  LogOut,
  Users,
} from 'lucide-react';
import { apiFetch } from '../../utils/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { downloadPrescriptionPdf } from '../../utils/pdfExport.ts';
import { WeeklyScheduleView } from './WeeklyScheduleView.tsx';
import type {
  Appointment,
  Doctor,
  DoctorSchedule,
  LabTest,
  Medicine,
  Patient,
  Prescription,
  PrescriptionItem,
} from '../../types/hms.ts';

interface DoctorDashboardPayload {
  doctor: Doctor;
  appointments: Appointment[];
  patients: Patient[];
  schedules: DoctorSchedule[];
  prescriptions: Prescription[];
  labTestsCatalog: LabTest[];
  medicinesCatalog: Medicine[];
}

export const DoctorDashboard: React.FC = () => {
  const { logout } = useAuth();
  const [tab, setTab] = useState<'queue' | 'patients' | 'prescribe' | 'schedule'>('queue');
  const [data, setData] = useState<DoctorDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [patientHistory, setPatientHistory] = useState<{
    patient: Patient;
    medicalRecords: any[];
    prescriptions: Prescription[];
    labReports: any[];
  } | null>(null);

  // Consultation / Diagnosis / Prescription State
  const [rxPatientId, setRxPatientId] = useState('');
  const [rxAppointmentId, setRxAppointmentId] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [vitalsBp, setVitalsBp] = useState('120/80 mmHg');
  const [vitalsPulse, setVitalsPulse] = useState('72 bpm');
  const [diagnosis, setDiagnosis] = useState('');
  const [generalAdvice, setGeneralAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [rxItems, setRxItems] = useState<PrescriptionItem[]>([
    {
      medicineName: 'Paracetamol 650mg',
      dosage: '1 Tablet',
      frequency: 'Twice daily (SOS)',
      duration: '5 Days',
      instructions: 'After meals',
    },
  ]);
  const [selectedLabIds, setSelectedLabIds] = useState<number[]>([]);

  // Leave state
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  const loadDoctor = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<DoctorDashboardPayload>('/api/doctor/dashboard');
      setData(res);
      if (!rxPatientId && res.patients[0]) {
        setRxPatientId(String(res.patients[0].id));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctor();
  }, []);

  const loadPatientHistory = async (patientId: number) => {
    setSelectedPatientId(patientId);
    const res = await apiFetch<any>(`/api/doctor/patients/${patientId}/history`);
    setPatientHistory(res);
  };

  const updateApptStatus = async (apptId: number, status: string) => {
    await apiFetch(`/api/doctor/appointments/${apptId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setFeedback(`Appointment marked as ${status}.`);
    loadDoctor();
  };

  const handleSaveConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rxPatientId || !diagnosis) return;
    if (chiefComplaint) {
      await apiFetch('/api/doctor/medical-records', {
        method: 'POST',
        body: JSON.stringify({
          patientId: Number(rxPatientId),
          appointmentId: rxAppointmentId ? Number(rxAppointmentId) : null,
          chiefComplaint,
          vitalsBp,
          vitalsPulse,
          diagnosis,
          treatmentPlan: generalAdvice,
        }),
      });
    }

    await apiFetch('/api/doctor/prescriptions', {
      method: 'POST',
      body: JSON.stringify({
        patientId: Number(rxPatientId),
        appointmentId: rxAppointmentId ? Number(rxAppointmentId) : null,
        diagnosis,
        items: rxItems,
        recommendedLabTestIds: selectedLabIds,
        generalAdvice,
        followUpDate: followUpDate || null,
      }),
    });

    setFeedback('Digital prescription, diagnosis & recommended lab tests saved.');
    setDiagnosis('');
    setChiefComplaint('');
    setSelectedLabIds([]);
    loadDoctor();
  };

  const toggleAvailability = async () => {
    if (!data) return;
    await apiFetch('/api/doctor/schedule', {
      method: 'PUT',
      body: JSON.stringify({ isAvailable: !data.doctor.isAvailable }),
    });
    loadDoctor();
  };

  const addLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/doctor/schedule', {
      method: 'PUT',
      body: JSON.stringify({ action: 'add_leave', leaveDate, leaveReason }),
    });
    setLeaveDate('');
    setLeaveReason('');
    setFeedback('Leave date registered.');
    loadDoctor();
  };

  const removeLeave = async (scheduleId: number) => {
    await apiFetch('/api/doctor/schedule', {
      method: 'PUT',
      body: JSON.stringify({ action: 'remove_leave', scheduleId }),
    });
    loadDoctor();
  };

  const updateShift = async (dayOfWeek: number, startTime: string, endTime: string) => {
    await apiFetch('/api/doctor/schedule', {
      method: 'PUT',
      body: JSON.stringify({ dayOfWeek, startTime, endTime, slotDurationMinutes: 30 }),
    });
    setFeedback('OPD shift hours updated.');
    await loadDoctor();
  };

  if (loading || !data) {
    return <div className="max-w-7xl mx-auto px-4 py-14 text-sm text-slate-500">Loading clinician workspace...</div>;
  }

  const leaveDates = data.schedules.filter((s) => s.isLeave);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
      <aside className="lg:col-span-3 space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-mono text-teal-800 font-semibold">{data.doctor.doctorCode}</div>
          <div className="font-display text-lg font-bold text-slate-900 mt-0.5">{data.doctor.fullName}</div>
          <div className="text-xs text-slate-600">{data.doctor.specialization}</div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className={data.doctor.isAvailable ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
              {data.doctor.isAvailable ? 'OPD Available' : 'On Leave'}
            </span>
            <button
              type="button"
              onClick={toggleAvailability}
              className="text-teal-800 font-semibold hover:underline cursor-pointer"
            >
              Toggle Status
            </button>
          </div>
        </div>

        <nav className="bg-white border border-slate-200 rounded-xl p-2 space-y-1">
          {[
            { id: 'queue', label: "Appointments & Queue", icon: Calendar },
            { id: 'patients', label: 'Patients & History', icon: Users },
            { id: 'prescribe', label: 'Diagnosis & e-Prescription', icon: FilePlus2 },
            { id: 'schedule', label: 'Weekly Schedule & Leave', icon: Clock },
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
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-slate-900">
                Scheduled Appointments ({data.appointments.length})
              </h2>
            </div>
            <div className="divide-y divide-slate-200">
              {data.appointments.map((a) => (
                <div key={a.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-mono text-slate-500">
                      {a.bookingId} · Token #{a.tokenNumber} · {a.appointmentDate} at {a.timeSlot}
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {a.patientName} <span className="font-mono text-xs text-slate-500">({a.patientCode})</span>
                    </div>
                    {a.reason && <div className="text-xs text-slate-600 mt-1">{a.reason}</div>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold capitalize text-slate-700 mr-2">
                      {a.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setRxPatientId(String(a.patientId));
                        setRxAppointmentId(String(a.id));
                        updateApptStatus(a.id, 'in_consultation');
                        setTab('prescribe');
                      }}
                      className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Consult & Prescribe
                    </button>
                    {a.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => updateApptStatus(a.id, 'completed')}
                        className="px-3 py-1.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'patients' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 font-display text-sm font-bold text-slate-900">
                Assigned Patients ({data.patients.length})
              </div>
              <div className="divide-y divide-slate-200">
                {data.patients.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => loadPatientHistory(p.id)}
                    className={`w-full text-left px-5 py-3.5 hover:bg-slate-50 cursor-pointer ${
                      selectedPatientId === p.id ? 'bg-teal-50' : ''
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-900">{p.fullName}</div>
                    <div className="text-xs font-mono text-slate-500">
                      {p.patientCode} · {p.gender} · {p.bloodGroup || '-'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
              {!patientHistory ? (
                <p className="text-sm text-slate-500">Select a patient to view clinical history & lab results.</p>
              ) : (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-display text-lg font-bold text-slate-900">
                      {patientHistory.patient.fullName} ({patientHistory.patient.patientCode})
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Allergies: <strong>{patientHistory.patient.allergies || 'None'}</strong> · Chronic:{' '}
                      <strong>{patientHistory.patient.chronicConditions || 'None'}</strong>
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2">Clinical Visits</h4>
                    <div className="space-y-2">
                      {patientHistory.medicalRecords.map((mr) => (
                        <div key={mr.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                          <div className="font-semibold text-slate-900">
                            {mr.visitDate}: {mr.diagnosis}
                          </div>
                          <div className="text-slate-600 mt-0.5">
                            BP {mr.vitalsBp} · {mr.treatmentPlan}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2">Lab Reports</h4>
                    <div className="space-y-2">
                      {patientHistory.labReports.map((lr) => (
                        <div key={lr.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                          <div className="font-semibold text-slate-900">
                            {lr.reportCode} · {lr.testName} ({lr.processingStatus})
                          </div>
                          {lr.resultSummary && <div className="text-slate-600 mt-0.5">{lr.resultSummary}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'prescribe' && (
          <div className="space-y-6">
            <form onSubmit={handleSaveConsultation} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-teal-700" />
                Clinical Diagnosis & Digital Prescription
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Patient *</label>
                  <select
                    required
                    value={rxPatientId}
                    onChange={(e) => setRxPatientId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    {data.patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.patientCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Follow-Up Date</label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Chief Complaint</label>
                  <input
                    type="text"
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    placeholder="Presenting symptoms"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vitals (BP)</label>
                  <input
                    type="text"
                    value={vitalsBp}
                    onChange={(e) => setVitalsBp(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vitals (Pulse)</label>
                  <input
                    type="text"
                    value={vitalsPulse}
                    onChange={(e) => setVitalsPulse(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Diagnosis *</label>
                <input
                  required
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Primary clinical diagnosis"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700">Prescribed Medicines</label>
                  <button
                    type="button"
                    onClick={() =>
                      setRxItems([
                        ...rxItems,
                        {
                          medicineName: data.medicinesCatalog[0]?.name || 'Atorvastatin 10mg',
                          dosage: '1 Tablet',
                          frequency: 'Once daily',
                          duration: '14 Days',
                          instructions: 'After dinner',
                        },
                      ])
                    }
                    className="text-xs font-semibold text-teal-800 hover:underline cursor-pointer"
                  >
                    + Add Medicine Row
                  </button>
                </div>

                <div className="space-y-2">
                  {rxItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                      <select
                        value={item.medicineName}
                        onChange={(e) => {
                          const next = [...rxItems];
                          next[idx].medicineName = e.target.value;
                          setRxItems(next);
                        }}
                        className="sm:col-span-2 px-2.5 py-2 text-xs border border-slate-300 rounded-lg"
                      >
                        {data.medicinesCatalog.map((m) => (
                          <option key={m.id} value={m.name}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={item.dosage}
                        onChange={(e) => {
                          const next = [...rxItems];
                          next[idx].dosage = e.target.value;
                          setRxItems(next);
                        }}
                        placeholder="Dosage"
                        className="px-2.5 py-2 text-xs border border-slate-300 rounded-lg"
                      />
                      <input
                        type="text"
                        value={item.frequency}
                        onChange={(e) => {
                          const next = [...rxItems];
                          next[idx].frequency = e.target.value;
                          setRxItems(next);
                        }}
                        placeholder="Frequency"
                        className="px-2.5 py-2 text-xs border border-slate-300 rounded-lg"
                      />
                      <input
                        type="text"
                        value={item.duration}
                        onChange={(e) => {
                          const next = [...rxItems];
                          next[idx].duration = e.target.value;
                          setRxItems(next);
                        }}
                        placeholder="Duration"
                        className="px-2.5 py-2 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Recommend Lab Tests (Auto-creates Lab Orders)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {data.labTestsCatalog.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedLabIds.includes(t.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedLabIds([...selectedLabIds, t.id]);
                          else setSelectedLabIds(selectedLabIds.filter((id) => id !== t.id));
                        }}
                        className="accent-teal-700"
                      />
                      <span>{t.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">General Advice</label>
                <textarea
                  rows={2}
                  value={generalAdvice}
                  onChange={(e) => setGeneralAdvice(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Issue Digital Prescription & Save Record
              </button>
            </form>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-display text-sm font-bold text-slate-900 mb-3">
                Issued Prescriptions
              </h3>
              <div className="divide-y divide-slate-200 text-xs">
                {data.prescriptions.map((rx) => (
                  <div key={rx.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-semibold text-slate-900">{rx.prescriptionCode}</span> ·{' '}
                      {rx.patientName} — {rx.diagnosis}
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadPrescriptionPdf(rx)}
                      className="text-teal-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'schedule' && (
          <div className="space-y-6">
            <WeeklyScheduleView
              schedules={data.schedules}
              appointments={data.appointments}
              onStartConsultation={(appt) => {
                setRxPatientId(String(appt.patientId));
                setRxAppointmentId(String(appt.id));
                updateApptStatus(appt.id, 'in_consultation');
                setTab('prescribe');
              }}
              onRemoveLeave={removeLeave}
              onQuickBlockLeave={(dateStr) => {
                setLeaveDate(dateStr);
                setFeedback(`Selected ${dateStr} below to register leave.`);
              }}
              onUpdateShift={updateShift}
            />

            <form onSubmit={addLeave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h3 className="font-display text-base font-bold text-slate-900">Leave Management</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Leave Date</label>
                  <input
                    required
                    type="date"
                    value={leaveDate}
                    onChange={(e) => setLeaveDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reason</label>
                  <input
                    type="text"
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    placeholder="Medical Conference / Personal"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  className="py-2 px-4 bg-slate-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Block Date
                </button>
              </div>
              {leaveDates.length > 0 && (
                <div className="pt-3 border-t border-slate-100 divide-y divide-slate-100 text-xs">
                  {leaveDates.map((lv) => (
                    <div key={lv.id} className="py-2 flex items-center justify-between">
                      <span>
                        <strong className="font-mono">{lv.leaveDate}</strong> — {lv.leaveReason}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLeave(lv.id)}
                        className="text-rose-700 font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </form>
          </div>
        )}
      </main>
    </div>
  );
};
