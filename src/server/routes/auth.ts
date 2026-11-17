import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { doctors, notifications, patients, users } from '../../db/schema.ts';
import {
  recordAuditLog,
  requireAuth,
  signSessionJwt,
  type AuthRequest,
} from '../../middleware/auth.ts';
import { ensureDatabaseSeeded } from '../../db/seed.ts';

const router = Router();

// Register new Patient account
router.post('/register', async (req, res) => {
  try {
    await ensureDatabaseSeeded();
    const { name, email, password, phone, gender, dateOfBirth, bloodGroup, address, dpdpConsentAccepted } =
      req.body ?? {};

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ error: 'Name, email, phone, and password are required.' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }
    if (!dpdpConsentAccepted) {
      return res
        .status(400)
        .json({ error: 'Consent to healthcare data processing (DPDP Act) is required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const uid = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const [createdUser] = await db
      .insert(users)
      .values({
        uid,
        email: normalizedEmail,
        passwordHash,
        name: String(name).trim(),
        phone: String(phone).trim(),
        role: 'patient',
        twoFactorEnabled: false,
      })
      .returning();

    const patientCode = `PAT-2026-${String(createdUser.id + 1000).padStart(4, '0')}`;
    const [createdPatient] = await db
      .insert(patients)
      .values({
        userId: createdUser.id,
        patientCode,
        fullName: createdUser.name,
        email: createdUser.email,
        phone: String(phone).trim(),
        gender: gender || 'Prefer not to say',
        dateOfBirth: dateOfBirth || null,
        bloodGroup: bloodGroup || null,
        address: address || null,
        dpdpConsentAccepted: true,
      })
      .returning();

    const sessionUser = {
      id: createdUser.id,
      uid: createdUser.uid,
      email: createdUser.email,
      name: createdUser.name,
      role: 'patient' as const,
      twoFactorEnabled: false,
    };

    const token = signSessionJwt(sessionUser);

    await db.insert(notifications).values({
      userId: createdUser.id,
      title: 'Welcome to Citystone Medical Center',
      message: `Your Patient ID ${patientCode} has been generated. You can now book appointments and access reports online.`,
      channel: 'in_app',
      category: 'system',
    });

    await recordAuditLog({
      user: sessionUser,
      action: 'PATIENT_REGISTERED',
      entityType: 'patients',
      entityId: createdPatient.id,
      details: `Registered patient ${patientCode}`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      token,
      user: sessionUser,
      patient: createdPatient,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Email/Password Login with optional 2FA verification
router.post('/login', async (req, res) => {
  try {
    await ensureDatabaseSeeded();
    const { email, password, otpCode } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const found = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

    if (found.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const userRow = found[0];
    if (!userRow.isActive) {
      return res.status(403).json({ error: 'Account is disabled. Contact Hospital Administration.' });
    }

    if (!userRow.passwordHash) {
      return res
        .status(401)
        .json({ error: 'This account uses Google Sign-In. Please continue with Google.' });
    }

    const valid = await bcrypt.compare(String(password), userRow.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (userRow.twoFactorEnabled) {
      if (!otpCode) {
        const generatedOtp = String(Math.floor(100000 + Math.random() * 900000));
        await db
          .update(users)
          .set({ twoFactorCode: generatedOtp })
          .where(eq(users.id, userRow.id));

        return res.status(200).json({
          requires2FA: true,
          message: 'Two-factor verification code generated.',
          sandboxOtp: generatedOtp,
        });
      }

      if (String(otpCode).trim() !== userRow.twoFactorCode) {
        return res.status(401).json({ error: 'Invalid two-factor verification code.' });
      }
      await db.update(users).set({ twoFactorCode: null }).where(eq(users.id, userRow.id));
    }

    const sessionUser = {
      id: userRow.id,
      uid: userRow.uid,
      email: userRow.email,
      name: userRow.name,
      role: userRow.role as 'patient' | 'doctor' | 'receptionist' | 'admin',
      twoFactorEnabled: userRow.twoFactorEnabled,
    };

    const token = signSessionJwt(sessionUser);

    await recordAuditLog({
      user: sessionUser,
      action: 'USER_LOGIN',
      entityType: 'users',
      entityId: userRow.id,
      details: `Authenticated as ${userRow.role}`,
      ipAddress: req.ip,
    });

    return res.json({ token, user: sessionUser });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Authentication failed. Please try again.' });
  }
});

// Sync Firebase Google Sign-In user & return role + profile
router.post('/google-sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureDatabaseSeeded();
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await recordAuditLog({
      user: req.user,
      action: 'GOOGLE_SSO_LOGIN',
      entityType: 'users',
      entityId: req.user.id,
      details: 'Authenticated via Google Sign-In',
      ipAddress: req.ip,
    });
    return res.json({ user: req.user });
  } catch (error) {
    console.error('Google sync error:', error);
    return res.status(500).json({ error: 'Failed to synchronize account.' });
  }
});

// Current authenticated user + linked clinical profile
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let patientProfile = null;
    let doctorProfile = null;

    if (req.user.role === 'patient') {
      const rows = await db
        .select()
        .from(patients)
        .where(eq(patients.userId, req.user.id))
        .limit(1);
      patientProfile = rows[0] ?? null;
    } else if (req.user.role === 'doctor') {
      const rows = await db
        .select()
        .from(doctors)
        .where(eq(doctors.userId, req.user.id))
        .limit(1);
      doctorProfile = rows[0] ?? null;
    }

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.user.id));

    return res.json({
      user: req.user,
      patientProfile,
      doctorProfile,
      unreadNotifications: userNotifications.filter((n) => !n.isRead).length,
    });
  } catch (error) {
    console.error('Me endpoint error:', error);
    return res.status(500).json({ error: 'Failed to load user profile.' });
  }
});

// Security Settings (2FA toggle & password update)
router.patch('/security', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { twoFactorEnabled, currentPassword, newPassword } = req.body ?? {};

    const [userRow] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!userRow) return res.status(404).json({ error: 'User not found' });

    const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };

    if (typeof twoFactorEnabled === 'boolean') {
      updates.twoFactorEnabled = twoFactorEnabled;
    }

    if (newPassword) {
      if (String(newPassword).length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters.' });
      }
      if (userRow.passwordHash) {
        const match = await bcrypt.compare(String(currentPassword || ''), userRow.passwordHash);
        if (!match) {
          return res.status(400).json({ error: 'Current password is incorrect.' });
        }
      }
      updates.passwordHash = await bcrypt.hash(String(newPassword), 10);
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, req.user.id))
      .returning();

    await recordAuditLog({
      user: req.user,
      action: 'SECURITY_SETTINGS_UPDATED',
      entityType: 'users',
      entityId: req.user.id,
      details: `2FA=${updated.twoFactorEnabled}${newPassword ? ', password changed' : ''}`,
      ipAddress: req.ip,
    });

    return res.json({
      user: {
        id: updated.id,
        uid: updated.uid,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        twoFactorEnabled: updated.twoFactorEnabled,
      },
    });
  } catch (error) {
    console.error('Security update error:', error);
    return res.status(500).json({ error: 'Failed to update security settings.' });
  }
});

// Password reset request (sandbox notification)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body ?? {};
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const normalizedEmail = String(email).trim().toLowerCase();
    const found = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (found.length === 0) {
      return res.json({
        message: 'If an account matches that email, reset instructions have been issued.',
      });
    }

    if (newPassword && String(newPassword).length >= 8) {
      const hash = await bcrypt.hash(String(newPassword), 10);
      await db
        .update(users)
        .set({ passwordHash: hash, updatedAt: new Date() })
        .where(eq(users.id, found[0].id));

      await recordAuditLog({
        action: 'PASSWORD_RESET_COMPLETED',
        entityType: 'users',
        entityId: found[0].id,
        details: `Password reset for ${normalizedEmail}`,
        ipAddress: req.ip,
      });

      return res.json({ message: 'Password has been reset successfully. You may now sign in.' });
    }

    return res.json({
      resetReady: true,
      message: 'Account verified. Enter your new password below to complete reset.',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ error: 'Unable to process password reset.' });
  }
});

export default router;
