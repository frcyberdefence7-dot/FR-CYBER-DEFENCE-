import React, { useState } from 'react';
import { KeyRound, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiFetch } from '../utils/api.ts';
import type { PublicPage } from '../types/hms.ts';

interface AuthPageProps {
  onSuccess: () => void;
  onNavigate: (page: PublicPage) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess, onNavigate }) => {
  const { loginWithEmail, registerPatient, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [sandboxOtpHint, setSandboxOtpHint] = useState<string | null>(null);

  // Registration fields
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regGender, setRegGender] = useState('Male');
  const [regDob, setRegDob] = useState('');
  const [regBlood, setRegBlood] = useState('O+');
  const [dpdpConsent, setDpdpConsent] = useState(true);

  // Reset password fields
  const [resetNewPass, setResetNewPass] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await loginWithEmail(email, password, requires2FA ? otpCode : undefined);
      if (res.requires2FA) {
        setRequires2FA(true);
        setSandboxOtpHint(res.sandboxOtp || null);
        setMessage('Two-factor authentication is enabled. Enter the 6-digit code below.');
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await loginWithEmail(demoEmail, 'Hospital@2026');
      if (res.requires2FA) {
        setEmail(demoEmail);
        setPassword('Hospital@2026');
        setRequires2FA(true);
        setSandboxOtpHint(res.sandboxOtp || null);
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Demo sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await registerPatient({
        name: regName,
        email,
        password,
        phone: regPhone,
        gender: regGender,
        dateOfBirth: regDob,
        bloodGroup: regBlood,
        dpdpConsentAccepted: dpdpConsent,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Google Sign-In was cancelled or failed.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email, newPassword: resetNewPass }),
      });
      setMessage(res.message);
      if (resetNewPass) {
        setMode('login');
        setResetNewPass('');
      }
    } catch (err: any) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
      {/* Main Auth Panel */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-8">
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg mb-6 w-fit">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
              setMessage(null);
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-md cursor-pointer ${
              mode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
              setMessage(null);
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-md cursor-pointer ${
              mode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Patient Registration
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('reset');
              setError(null);
              setMessage(null);
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-md cursor-pointer ${
              mode === 'reset' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Reset Password
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 p-3.5 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-900">
            {message}
          </div>
        )}

        {mode === 'login' && (
          <>
            <h1 className="font-display text-2xl font-bold text-slate-900">
              Hospital Portal Sign In
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Unified RBAC access for Patients, Physicians, Receptionists, and Administrators.
            </p>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="mt-5 w-full py-2.5 px-4 border border-slate-300 hover:bg-slate-50 rounded-lg text-sm font-semibold text-slate-800 flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              Continue with Google (Patient SSO)
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
              <div className="flex-1 h-px bg-slate-200" />
              <span>or sign in with credentials</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              {requires2FA && (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <label className="block text-xs font-semibold text-slate-800">
                    2FA Verification Code
                  </label>
                  <input
                    required
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                  {sandboxOtpHint && (
                    <p className="text-xs text-slate-500 font-mono">
                      Sandbox 2FA Code: <strong>{sandboxOtpHint}</strong>
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg cursor-pointer"
              >
                {loading ? 'Authenticating...' : 'Sign In to Portal'}
              </button>
            </form>
          </>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <UserPlus className="w-5 h-5 text-teal-700" />
              <h1 className="font-display text-2xl font-bold">New Patient Registration</h1>
            </div>
            <p className="text-xs text-slate-500">
              Generates your Unique Patient ID (PAT-2026-XXXX) immediately.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  required
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                <input
                  required
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+91 98450 00000"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                <select
                  value={regGender}
                  onChange={(e) => setRegGender(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={regDob}
                  onChange={(e) => setRegDob(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
                <select
                  value={regBlood}
                  onChange={(e) => setRegBlood(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                >
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password (min 8 chars) *
                </label>
                <input
                  required
                  minLength={8}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={dpdpConsent}
                onChange={(e) => setDpdpConsent(e.target.checked)}
                className="mt-0.5 accent-teal-700"
              />
              <span>
                I consent to Citystone Medical Center processing my clinical records in compliance with
                the DPDP Act and{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('privacy')}
                  className="underline text-teal-800 cursor-pointer"
                >
                  Healthcare Privacy Policy
                </button>
                .
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              {loading ? 'Creating Account...' : 'Create Patient Account'}
            </button>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <KeyRound className="w-5 h-5 text-teal-700" />
              <h1 className="font-display text-2xl font-bold">Password Reset</h1>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Account Email *</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Password (min 8 chars) *
              </label>
              <input
                required
                minLength={8}
                type="password"
                value={resetNewPass}
                onChange={(e) => setResetNewPass(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              Update Account Password
            </button>
          </form>
        )}
      </div>

      {/* Role Demo Accounts Access Box */}
      <div className="lg:col-span-5 bg-slate-900 text-white rounded-xl p-7 space-y-5">
        <div>
          <h2 className="font-display text-lg font-bold">Role-Based Portal Test Accounts</h2>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Test every live PostgreSQL dashboard (synthetic demo accounts, password{' '}
            <code className="font-mono text-teal-300">Hospital@2026</code>):
          </p>
        </div>

        <div className="space-y-2.5">
          {[
            {
              role: 'Patient Dashboard',
              email: 'patient.demo@citystonemedical.org',
              desc: 'Aarav Mehta · Bookings, Rx PDFs, Labs, Bills',
            },
            {
              role: 'Doctor Dashboard',
              email: 'dr.arjun.sen@citystonemedical.org',
              desc: 'Dr. Arjun Sen · OPD Queue, e-Rx, Schedule',
            },
            {
              role: 'Receptionist Dashboard',
              email: 'reception@citystonemedical.org',
              desc: 'Ananya Sharma · Walk-ins, Check-in, Billing',
            },
            {
              role: 'Admin Dashboard',
              email: 'admin@citystonemedical.org',
              desc: 'Dr. Kavita Rao · Analytics, Pharmacy, RBAC, CMS',
            },
          ].map((acc) => (
            <button
              key={acc.email}
              type="button"
              disabled={loading}
              onClick={() => handleQuickDemoLogin(acc.email)}
              className="w-full text-left p-3.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{acc.role}</span>
                <span className="text-xs font-mono text-teal-300">Sign In →</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">{acc.desc}</div>
              <div className="text-[11px] font-mono text-slate-400 mt-1">{acc.email}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
