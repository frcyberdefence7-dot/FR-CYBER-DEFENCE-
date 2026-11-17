import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { apiFetch, setAuthToken } from '../utils/api.ts';
import type { SessionUser } from '../types/hms.ts';

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  loginWithEmail: (
    email: string,
    password: string,
    otpCode?: string
  ) => Promise<{ requires2FA?: boolean; sandboxOtp?: string }>;
  registerPatient: (payload: {
    name: string;
    email: string;
    password: string;
    phone: string;
    gender: string;
    dateOfBirth?: string;
    bloodGroup?: string;
    address?: string;
    dpdpConsentAccepted: boolean;
  }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiFetch<{ user: SessionUser }>('/api/auth/me');
      setUser(res.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const savedJwt = sessionStorage.getItem('citystone_jwt');
    if (savedJwt) {
      setAuthToken(savedJwt);
      apiFetch<{ user: SessionUser }>('/api/auth/me')
        .then((res) => setUser(res.user))
        .catch(() => {
          sessionStorage.removeItem('citystone_jwt');
          setAuthToken(null);
        })
        .finally(() => setLoading(false));
      return;
    }

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          setAuthToken(idToken);
          const res = await apiFetch<{ user: SessionUser }>('/api/auth/google-sync', {
            method: 'POST',
          });
          setUser(res.user);
        } catch {
          setUser(null);
          setAuthToken(null);
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const loginWithEmail = async (email: string, password: string, otpCode?: string) => {
    const res = await apiFetch<{
      token?: string;
      user?: SessionUser;
      requires2FA?: boolean;
      sandboxOtp?: string;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, otpCode }),
    });

    if (res.requires2FA) {
      return { requires2FA: true, sandboxOtp: res.sandboxOtp };
    }

    if (res.token && res.user) {
      sessionStorage.setItem('citystone_jwt', res.token);
      setAuthToken(res.token);
      setUser(res.user);
    }
    return {};
  };

  const registerPatient = async (payload: {
    name: string;
    email: string;
    password: string;
    phone: string;
    gender: string;
    dateOfBirth?: string;
    bloodGroup?: string;
    address?: string;
    dpdpConsentAccepted: boolean;
  }) => {
    const res = await apiFetch<{ token: string; user: SessionUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    sessionStorage.setItem('citystone_jwt', res.token);
    setAuthToken(res.token);
    setUser(res.user);
  };

  const loginWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleAuthProvider);
    const idToken = await cred.user.getIdToken();
    sessionStorage.removeItem('citystone_jwt');
    setAuthToken(idToken);
    const res = await apiFetch<{ user: SessionUser }>('/api/auth/google-sync', {
      method: 'POST',
    });
    setUser(res.user);
  };

  const logout = async () => {
    sessionStorage.removeItem('citystone_jwt');
    setAuthToken(null);
    setUser(null);
    try {
      await signOut(auth);
    } catch {
      // ignore if signed in via JWT
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithEmail,
        registerPatient,
        loginWithGoogle,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
