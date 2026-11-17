import React, { useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  Database,
  FlaskConical,
  LogOut,
  Pill,
  Receipt,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { apiFetch } from '../../utils/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { exportToCsv } from '../../utils/pdfExport.ts';
import {
  BillingManagerPanel,
  LaboratoryManagerPanel,
  PharmacyManagerPanel,
} from './SharedClinicalTabs.tsx';
import type { Department, Doctor, HospitalSettings, Patient } from '../../types/hms.ts';

interface AdminAnalytics {
  kpis: {
    totalPatients: number;
    totalDoctors: number;
    totalStaff: number;
    totalAppointments: number;
    totalRevenue: number;
    pendingReceivables: number;
    lowStockCount: number;
    pendingLabReports: number;
  };
  revenueBreakdown: Array<{ label: string; amount: number }>;
  apptsByDepartment: Array<{ department: string; count: number }>;
  users: Array<{ id: number; email: string; name: string; role: string; isActive: boolean }>;
  patients: Patient[];
  doctors: Doctor[];
  staff: Array<{ id: number; employeeCode: string; fullName: string; roleTitle: string; departmentName: string; shiftTiming: string }>;
  departments: Department[];
  settings: HospitalSettings | null;
  auditLogs: Array<{ id: number; userEmail: string; userRole: string; action: string; entityType: string; details: string; createdAt: string }>;
}

export const AdminDashboard: React.FC<{ onSettingsUpdated: () => void }> = ({
  onSettingsUpdated,
}) => {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<
    | 'analytics'
    | 'doctors'
    | 'lab'
    | 'pharmacy'
    | 'billing'
    | 'settings'
    | 'rbac'
    | 'audit'
  >('analytics');
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Forms
  const [newDoc, setNewDoc] = useState({
    fullName: '',
    email: '',
    phone: '',
    departmentId: '',
    specialization: '',
    qualification: '',
    experienceYears: '8',
    consultationFee: '900',
  });
  const [newDept, setNewDept] = useState({
    name: '',
    description: '',
    floorLocation: '',
    headDoctorName: '',
    consultationBaseFee: '800',
  });
  const [newStaff, setNewStaff] = useState({
    fullName: '',
    roleTitle: '',
    phone: '',
    email: '',
    shiftTiming: 'Morning (08:00 - 16:00)',
  });
  const [settingsForm, setSettingsForm] = useState<Partial<HospitalSettings>>({});
  const [broadcast, setBroadcast] = useState({
    title: '',
    message: '',
    channel: 'in_app',
    targetRole: 'all',
  });

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<AdminAnalytics>('/api/admin/analytics');
      setData(res);
      if (res.settings) setSettingsForm(res.settings);
      if (!newDoc.departmentId && res.departments[0]) {
        setNewDoc((d) => ({ ...d, departmentId: String(res.departments[0].id) }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/doctors', {
      method: 'POST',
      body: JSON.stringify(newDoc),
    });
    setFeedback('Doctor profile & user account created.');
    setNewDoc({
      fullName: '',
      email: '',
      phone: '',
      departmentId: String(data?.departments[0]?.id || ''),
      specialization: '',
      qualification: '',
      experienceYears: '8',
      consultationFee: '900',
    });
    loadAnalytics();
  };

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/departments', {
      method: 'POST',
      body: JSON.stringify(newDept),
    });
    setFeedback('New medical department published.');
    setNewDept({
      name: '',
      description: '',
      floorLocation: '',
      headDoctorName: '',
      consultationBaseFee: '800',
    });
    loadAnalytics();
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/staff', {
      method: 'POST',
      body: JSON.stringify(newStaff),
    });
    setFeedback('Staff member added to hospital roster.');
    setNewStaff({
      fullName: '',
      roleTitle: '',
      phone: '',
      email: '',
      shiftTiming: 'Morning (08:00 - 16:00)',
    });
    loadAnalytics();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(settingsForm),
    });
    setFeedback('Hospital settings & website CMS updated.');
    onSettingsUpdated();
    loadAnalytics();
  };

  const handleRoleChange = async (userId: number, role: string, isActive: boolean) => {
    await apiFetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role, isActive }),
    });
    setFeedback('User RBAC permission updated.');
    loadAnalytics();
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch<{ sentCount: number }>('/api/admin/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify(broadcast),
    });
    setFeedback(`Dispatched notification to ${res.sentCount} users.`);
    setBroadcast({ title: '', message: '', channel: 'in_app', targetRole: 'all' });
  };

  const handleDownloadBackup = async () => {
    const snapshot = await apiFetch<unknown>('/api/admin/backup');
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `citystone_hms_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFeedback('Full PostgreSQL backup snapshot downloaded.');
  };

  if (loading || !data) {
    return <div className="max-w-7xl mx-auto px-4 py-14 text-sm text-slate-500">Loading admin console...</div>;
  }

  const maxRev = Math.max(1, ...data.revenueBreakdown.map((r) => r.amount));
  const maxDeptAppt = Math.max(1, ...data.apptsByDepartment.map((d) => d.count));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
      <aside className="lg:col-span-3 space-y-4">
        <div className="bg-slate-900 text-white rounded-xl p-5">
          <div className="text-xs font-mono text-teal-300 font-semibold">ADMIN CONSOLE</div>
          <div className="font-display text-lg font-bold mt-0.5">{user?.name}</div>
          <div className="text-xs text-slate-400 mt-0.5">{user?.email}</div>
        </div>

        <nav className="bg-white border border-slate-200 rounded-xl p-2 space-y-1">
          {[
            { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3 },
            { id: 'doctors', label: 'Doctors, Staff & Depts', icon: Building2 },
            { id: 'lab', label: 'Laboratory Management', icon: FlaskConical },
            { id: 'pharmacy', label: 'Pharmacy Management', icon: Pill },
            { id: 'billing', label: 'Billing & Payments', icon: Receipt },
            { id: 'settings', label: 'Hospital CMS & Settings', icon: Settings },
            { id: 'rbac', label: 'RBAC & Notifications', icon: ShieldCheck },
            { id: 'audit', label: 'Security Audit & Backup', icon: Activity },
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

        {tab === 'analytics' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500">Total Patients</div>
                <div className="font-mono text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                  {data.kpis.totalPatients}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500">Specialists & Staff</div>
                <div className="font-mono text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                  {data.kpis.totalDoctors} / {data.kpis.totalStaff}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500">Collected Revenue</div>
                <div className="font-mono text-2xl font-bold text-emerald-700 mt-1 tabular-nums">
                  ₹{data.kpis.totalRevenue.toLocaleString()}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500">Pending Receivables</div>
                <div className="font-mono text-2xl font-bold text-amber-700 mt-1 tabular-nums">
                  ₹{data.kpis.pendingReceivables.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-slate-900">
                    Revenue Breakdown by Clinical Stream
                  </h3>
                  <button
                    type="button"
                    onClick={() => exportToCsv('revenue_report', data.revenueBreakdown)}
                    className="text-xs font-semibold text-teal-800 hover:underline cursor-pointer"
                  >
                    Export CSV
                  </button>
                </div>
                <div className="space-y-3">
                  {data.revenueBreakdown.map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-700 font-medium">{item.label}</span>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          ₹{item.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-700 rounded-full"
                          style={{ width: `${Math.round((item.amount / maxRev) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Appointments by Department
                </h3>
                <div className="space-y-3">
                  {data.apptsByDepartment.map((item) => (
                    <div key={item.department} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-700 font-medium">{item.department}</span>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {item.count}
                        </span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-800 rounded-full"
                          style={{ width: `${Math.round((item.count / maxDeptAppt) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'doctors' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <form onSubmit={handleAddDoctor} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <h3 className="font-display text-sm font-bold text-slate-900">Onboard Specialist Doctor</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <input
                    required
                    placeholder="Dr. Full Name"
                    value={newDoc.fullName}
                    onChange={(e) => setNewDoc({ ...newDoc, fullName: e.target.value })}
                    className="px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <input
                    required
                    type="email"
                    placeholder="Doctor Email"
                    value={newDoc.email}
                    onChange={(e) => setNewDoc({ ...newDoc, email: e.target.value })}
                    className="px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <select
                    value={newDoc.departmentId}
                    onChange={(e) => setNewDoc({ ...newDoc, departmentId: e.target.value })}
                    className="px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {data.departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <input
                    required
                    placeholder="Specialization"
                    value={newDoc.specialization}
                    onChange={(e) => setNewDoc({ ...newDoc, specialization: e.target.value })}
                    className="px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <input
                    required
                    placeholder="Qualification (e.g. MD, DM)"
                    value={newDoc.qualification}
                    onChange={(e) => setNewDoc({ ...newDoc, qualification: e.target.value })}
                    className="px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <input
                    required
                    type="number"
                    placeholder="Fee (₹)"
                    value={newDoc.consultationFee}
                    onChange={(e) => setNewDoc({ ...newDoc, consultationFee: e.target.value })}
                    className="px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Create Doctor Profile
                </button>
              </form>

              <form onSubmit={handleAddDept} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <h3 className="font-display text-sm font-bold text-slate-900">Add Medical Department</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <input
                    required
                    placeholder="Department Name"
                    value={newDept.name}
                    onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                    className="px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <input
                    required
                    placeholder="Floor / Wing Location"
                    value={newDept.floorLocation}
                    onChange={(e) => setNewDept({ ...newDept, floorLocation: e.target.value })}
                    className="px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <input
                    placeholder="Head Doctor Name"
                    value={newDept.headDoctorName}
                    onChange={(e) => setNewDept({ ...newDept, headDoctorName: e.target.value })}
                    className="px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <input
                    type="number"
                    placeholder="Base Fee (₹)"
                    value={newDept.consultationBaseFee}
                    onChange={(e) => setNewDept({ ...newDept, consultationBaseFee: e.target.value })}
                    className="px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <textarea
                  required
                  rows={2}
                  placeholder="Clinical overview..."
                  value={newDept.description}
                  onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Publish Department
                </button>
              </form>
            </div>

            <form onSubmit={handleAddStaff} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h3 className="font-display text-sm font-bold text-slate-900">Add Hospital Staff</h3>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
                <input
                  required
                  placeholder="Staff Full Name"
                  value={newStaff.fullName}
                  onChange={(e) => setNewStaff({ ...newStaff, fullName: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                />
                <input
                  required
                  placeholder="Role Title (e.g. ICU Nurse)"
                  value={newStaff.roleTitle}
                  onChange={(e) => setNewStaff({ ...newStaff, roleTitle: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                />
                <input
                  required
                  placeholder="Phone"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                />
                <input
                  required
                  type="email"
                  placeholder="Email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 text-white font-semibold rounded-lg cursor-pointer"
                >
                  Add Staff
                </button>
              </div>
              <div className="pt-3 border-t border-slate-100 divide-y divide-slate-100 text-xs">
                {data.staff.map((s) => (
                  <div key={s.id} className="py-2 flex items-center justify-between">
                    <span>
                      <strong className="font-mono">{s.employeeCode}</strong> · {s.fullName} ({s.roleTitle})
                    </span>
                    <span className="text-slate-500">{s.shiftTiming}</span>
                  </div>
                ))}
              </div>
            </form>
          </div>
        )}

        {tab === 'lab' && <LaboratoryManagerPanel patients={data.patients} />}
        {tab === 'pharmacy' && <PharmacyManagerPanel patients={data.patients} />}
        {tab === 'billing' && <BillingManagerPanel patients={data.patients} />}

        {tab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-base font-bold text-slate-900">
              Hospital Settings & Website Content Management (CMS)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hospital Name</label>
                <input
                  type="text"
                  value={settingsForm.hospitalName || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, hospitalName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Emergency Hotline</label>
                <input
                  type="text"
                  value={settingsForm.emergencyPhone || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, emergencyPhone: e.target.value })}
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hero CMS Headline</label>
                <input
                  type="text"
                  value={settingsForm.cmsBannerHeadline || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, cmsBannerHeadline: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">GST Tax Rate (%)</label>
                <input
                  type="number"
                  value={settingsForm.taxRatePercent ?? 5}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, taxRatePercent: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-6 text-xs text-slate-700 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settingsForm.smsGatewayEnabled)}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, smsGatewayEnabled: e.target.checked })
                  }
                  className="accent-teal-700"
                />
                SMS Gateway Enabled
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settingsForm.whatsappGatewayEnabled)}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, whatsappGatewayEnabled: e.target.checked })
                  }
                  className="accent-teal-700"
                />
                WhatsApp Clinical Alerts Enabled
              </label>
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              Save Hospital Configuration
            </button>
          </form>
        )}

        {tab === 'rbac' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 font-display text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-700" />
                Role & Permission Management (RBAC)
              </div>
              <div className="divide-y divide-slate-200 text-xs">
                {data.users.map((u) => (
                  <div key={u.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-900">{u.name}</div>
                      <div className="font-mono text-slate-500">{u.email}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value, u.isActive)}
                        className="px-2.5 py-1.5 border border-slate-300 rounded-lg"
                      >
                        <option value="patient">Patient</option>
                        <option value="doctor">Doctor</option>
                        <option value="receptionist">Receptionist</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRoleChange(u.id, u.role, !u.isActive)}
                        className={`px-2.5 py-1.5 rounded-lg font-semibold cursor-pointer ${
                          u.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleBroadcast} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-teal-700" />
                Dispatch Hospital Notification (In-App / SMS / WhatsApp)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <input
                  required
                  placeholder="Notification Title"
                  value={broadcast.title}
                  onChange={(e) => setBroadcast({ ...broadcast, title: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                />
                <select
                  value={broadcast.channel}
                  onChange={(e) => setBroadcast({ ...broadcast, channel: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="in_app">In-App Portal</option>
                  <option value="sms">SMS Gateway</option>
                  <option value="whatsapp">WhatsApp API</option>
                  <option value="email">Email Dispatch</option>
                </select>
                <select
                  value={broadcast.targetRole}
                  onChange={(e) => setBroadcast({ ...broadcast, targetRole: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="all">All Users</option>
                  <option value="patient">Patients Only</option>
                  <option value="doctor">Doctors Only</option>
                  <option value="receptionist">Receptionists Only</option>
                </select>
              </div>
              <textarea
                required
                rows={2}
                placeholder="Announcement or appointment reminder text..."
                value={broadcast.message}
                onChange={(e) => setBroadcast({ ...broadcast, message: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-teal-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Send Notifications
              </button>
            </form>
          </div>
        )}

        {tab === 'audit' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-teal-700" />
                  Database Backup & Disaster Recovery
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Export a full sanitized JSON snapshot of hospital departments, appointments, billing, and stock.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer shrink-0"
              >
                Download PostgreSQL Snapshot
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 font-display text-sm font-bold text-slate-900">
                Security & Clinical Access Audit Trail
              </div>
              <div className="divide-y divide-slate-200 text-xs max-h-[420px] overflow-y-auto">
                {data.auditLogs.map((log) => (
                  <div key={log.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-slate-900">{log.action}</span>{' '}
                      <span className="text-slate-500">({log.entityType})</span>
                      {log.details && <div className="text-slate-600 mt-0.5">{log.details}</div>}
                    </div>
                    <div className="text-right font-mono text-slate-500 shrink-0">
                      <div>{log.userEmail}</div>
                      <div>{new Date(log.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
