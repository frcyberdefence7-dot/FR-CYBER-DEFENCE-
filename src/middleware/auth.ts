import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { auditLogs, patients, users } from '../db/schema.ts';

const JWT_SECRET =
  process.env.JWT_SECRET || 'citystone-hms-dev-signing-key-2026-secure';

export interface SessionUser {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: 'patient' | 'doctor' | 'receptionist' | 'admin';
  twoFactorEnabled: boolean;
}

export interface AuthRequest extends Request {
  user?: SessionUser;
}

export function signSessionJwt(user: SessionUser): string {
  return jwt.sign(
    {
      id: user.id,
      uid: user.uid,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

export async function getOrCreateFirebaseUser(
  uid: string,
  email: string,
  displayName?: string
): Promise<SessionUser> {
  const safeName = displayName?.trim() || email.split('@')[0] || 'Patient User';
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existing.length > 0) {
    const u = existing[0];
    if (u.uid !== uid) {
      const updated = await db
        .update(users)
        .set({ uid, updatedAt: new Date() })
        .where(eq(users.id, u.id))
        .returning();
      return {
        id: updated[0].id,
        uid: updated[0].uid,
        email: updated[0].email,
        name: updated[0].name,
        role: updated[0].role as SessionUser['role'],
        twoFactorEnabled: updated[0].twoFactorEnabled,
      };
    }
    return {
      id: u.id,
      uid: u.uid,
      email: u.email,
      name: u.name,
      role: u.role as SessionUser['role'],
      twoFactorEnabled: u.twoFactorEnabled,
    };
  }

  const inserted = await db
    .insert(users)
    .values({
      uid,
      email,
      name: safeName,
      role: 'patient',
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: { email, name: safeName, updatedAt: new Date() },
    })
    .returning();

  const createdUser = inserted[0];
  // Ensure patient profile exists
  const existingPatient = await db
    .select()
    .from(patients)
    .where(eq(patients.userId, createdUser.id))
    .limit(1);

  if (existingPatient.length === 0) {
    const patientCode = `PAT-2026-${String(createdUser.id).padStart(4, '0')}`;
    await db.insert(patients).values({
      userId: createdUser.id,
      patientCode,
      fullName: createdUser.name,
      email: createdUser.email,
      phone: createdUser.phone || '+91 98000 00000',
      gender: 'Prefer not to say',
      dpdpConsentAccepted: true,
    });
  }

  return {
    id: createdUser.id,
    uid: createdUser.uid,
    email: createdUser.email,
    name: createdUser.name,
    role: createdUser.role as SessionUser['role'],
    twoFactorEnabled: createdUser.twoFactorEnabled,
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Empty token' });
  }

  // 1. Try local signed JWT first (for role accounts & email/password users)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      uid: string;
      email: string;
      name: string;
      role: string;
    };
    const rows = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
    if (rows.length === 0 || !rows[0].isActive) {
      return res.status(401).json({ error: 'Unauthorized: Account inactive or not found' });
    }
    req.user = {
      id: rows[0].id,
      uid: rows[0].uid,
      email: rows[0].email,
      name: rows[0].name,
      role: rows[0].role as SessionUser['role'],
      twoFactorEnabled: rows[0].twoFactorEnabled,
    };
    return next();
  } catch {
    // Fall through to Firebase ID Token verification
  }

  // 2. Verify Firebase ID Token (Google Sign-In)
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    if (!decodedToken.email) {
      return res.status(401).json({ error: 'Unauthorized: Email claim missing in token' });
    }
    const dbUser = await getOrCreateFirebaseUser(
      decodedToken.uid,
      decodedToken.email,
      decodedToken.name
    );
    req.user = dbUser;
    return next();
  } catch (err) {
    console.error('Authentication token verification failed:', err);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

export const requireRole = (...allowedRoles: Array<SessionUser['role']>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: Requires ${allowedRoles.join(' or ')} privileges`,
      });
    }
    return next();
  };
};

export async function recordAuditLog(params: {
  user?: SessionUser;
  action: string;
  entityType: string;
  entityId?: string | number;
  details?: string;
  ipAddress?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      userId: params.user?.id ?? null,
      userEmail: params.user?.email ?? 'system',
      userRole: params.user?.role ?? 'system',
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId !== undefined ? String(params.entityId) : null,
      details: params.details ?? null,
      ipAddress: params.ipAddress ?? null,
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
