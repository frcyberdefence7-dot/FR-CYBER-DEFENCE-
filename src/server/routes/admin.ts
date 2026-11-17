import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { asc, desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  appointments,
  auditLogs,
  bills,
  departments,
  doctors,
  doctorSchedules,
  hospitalSettings,
  labReports,
  labTests,
  medicines,
  notifications,
  patients,
  payments,
  pharmacyStock,
  staff,
  users,
} from '../../db/schema.ts';
import {
  recordAuditLog,
  requireAuth,
  requireRole,
  type AuthRequest,
} from '../../middleware/auth.ts';

const router = Router();
router.use(requireAuth);

// User Notification Read Endpoint (all authenticated users)
router.post('/notifications/:id/read', async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const id = Number(req.params.id);
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return res.json(updated ?? { ok: true });
  } catch (error) {
    console.error('Notification read error:', error);
    return res.status(500).json({ error: 'Failed to update notification.' });
  }
});

// Admin-only routes below
router.use(requireRole('admin'));

// Complete Admin Analytics & Management Payload
router.get('/analytics', async (_req, res) => {
  try {
    const [
      userRows,
      patientRows,
      doctorRows,
      staffRows,
      deptRows,
      apptRows,
      billRows,
      paymentRows,
      labTestRows,
      labReportRows,
      medRows,
      stockRows,
      settingsRows,
      auditRows,
    ] = await Promise.all([
      db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          phone: users.phone,
          role: users.role,
          isActive: users.isActive,
          twoFactorEnabled: users.twoFactorEnabled,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(asc(users.id)),
      db.select().from(patients).orderBy(desc(patients.createdAt)),
      db.select().from(doctors).orderBy(asc(doctors.id)),
      db.select().from(staff).orderBy(asc(staff.id)),
      db.select().from(departments).orderBy(asc(departments.id)),
      db.select().from(appointments).orderBy(desc(appointments.appointmentDate)),
      db.select().from(bills).orderBy(desc(bills.createdAt)),
      db.select().from(payments).orderBy(desc(payments.paidAt)),
      db.select().from(labTests).orderBy(asc(labTests.name)),
      db.select().from(labReports).orderBy(desc(labReports.orderedAt)),
      db.select().from(medicines).orderBy(asc(medicines.name)),
      db.select().from(pharmacyStock),
      db.select().from(hospitalSettings).limit(1),
      db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(60),
    ]);

    const totalRevenue = paymentRows.reduce((acc, p) => acc + p.amount, 0);
    const pendingReceivables = billRows.reduce(
      (acc, b) => acc + Math.max(0, b.totalAmount - b.paidAmount),
      0
    );

    const consultationRevenue = billRows.reduce((acc, b) => acc + b.consultationFee, 0);
    const labRevenue = billRows.reduce((acc, b) => acc + b.labCharges, 0);
    const pharmacyRevenue = billRows.reduce((acc, b) => acc + b.medicineCharges, 0);

    const deptMap = new Map(deptRows.map((d) => [d.id, d.name]));
    const apptsByDepartment = deptRows.map((d) => ({
      department: d.name,
      count: apptRows.filter((a) => a.departmentId === d.id).length,
    }));

    const lowStockCount = stockRows.filter((s) => s.quantityAvailable <= s.reorderLevel).length;

    return res.json({
      kpis: {
        totalPatients: patientRows.length,
        totalDoctors: doctorRows.length,
        totalStaff: staffRows.length,
        totalAppointments: apptRows.length,
        totalRevenue,
        pendingReceivables,
        lowStockCount,
        pendingLabReports: labReportRows.filter((r) => r.processingStatus !== 'verified').length,
      },
      revenueBreakdown: [
        { label: 'Consultations', amount: consultationRevenue },
        { label: 'Laboratory & Diagnostics', amount: labRevenue },
        { label: 'Pharmacy Sales', amount: pharmacyRevenue },
      ],
      apptsByDepartment,
      users: userRows,
      patients: patientRows,
      doctors: doctorRows.map((d) => ({
        ...d,
        departmentName: deptMap.get(d.departmentId) || '',
      })),
      staff: staffRows.map((s) => ({
        ...s,
        departmentName: s.departmentId ? deptMap.get(s.departmentId) || '' : 'General',
      })),
      departments: deptRows,
      appointments: apptRows,
      bills: billRows,
      payments: paymentRows,
      labTests: labTestRows,
      medicines: medRows,
      settings: settingsRows[0] ?? null,
      auditLogs: auditRows,
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return res.status(500).json({ error: 'Failed to load admin analytics.' });
  }
});

// Create Department
router.post('/departments', async (req: AuthRequest, res) => {
  try {
    const { name, code, description, headDoctorName, floorLocation, consultationBaseFee } =
      req.body ?? {};
    if (!name || !description || !floorLocation) {
      return res.status(400).json({ error: 'Department name, description, and floor are required.' });
    }
    const slug = String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const deptCode = code || `DEPT-${slug.slice(0, 4).toUpperCase()}`;

    const [created] = await db
      .insert(departments)
      .values({
        code: deptCode,
        name: String(name).trim(),
        slug,
        description: String(description).trim(),
        headDoctorName: headDoctorName || null,
        floorLocation: String(floorLocation).trim(),
        consultationBaseFee: Number(consultationBaseFee || 800),
      })
      .returning();

    await recordAuditLog({
      user: req.user,
      action: 'DEPARTMENT_CREATED',
      entityType: 'departments',
      entityId: created.id,
      details: `Added department ${created.name}`,
      ipAddress: req.ip,
    });

    return res.status(201).json(created);
  } catch (error) {
    console.error('Create department error:', error);
    return res.status(500).json({ error: 'Failed to create department.' });
  }
});

// Create Doctor + User + Default Weekly Schedule
router.post('/doctors', async (req: AuthRequest, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      departmentId,
      specialization,
      qualification,
      experienceYears,
      consultationFee,
      bio,
    } = req.body ?? {};

    if (!fullName || !email || !departmentId || !specialization || !qualification) {
      return res.status(400).json({ error: 'All mandatory doctor profile fields are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const passwordHash = await bcrypt.hash('Hospital@2026', 10);
    const [createdUser] = await db
      .insert(users)
      .values({
        uid: `local-doc-${Date.now()}`,
        email: normalizedEmail,
        passwordHash,
        name: String(fullName).trim(),
        phone: String(phone || '+91 98450 00000'),
        role: 'doctor',
      })
      .onConflictDoUpdate({
        target: users.email,
        set: { role: 'doctor', name: String(fullName).trim() },
      })
      .returning();

    const doctorCode = `DOC-${String(Math.floor(200 + Math.random() * 800))}`;
    const [createdDoc] = await db
      .insert(doctors)
      .values({
        userId: createdUser.id,
        departmentId: Number(departmentId),
        doctorCode,
        fullName: String(fullName).trim(),
        email: normalizedEmail,
        phone: String(phone || '+91 98450 00000'),
        specialization: String(specialization).trim(),
        qualification: String(qualification).trim(),
        experienceYears: Number(experienceYears || 5),
        consultationFee: Number(consultationFee || 800),
        bio: String(bio || 'Specialist consultant at Citystone Medical Center.'),
        isAvailable: true,
      })
      .returning();

    const schedules = [];
    for (let day = 1; day <= 6; day++) {
      schedules.push({
        doctorId: createdDoc.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
        slotDurationMinutes: 30,
        isLeave: false,
      });
    }
    await db.insert(doctorSchedules).values(schedules);

    await recordAuditLog({
      user: req.user,
      action: 'DOCTOR_CREATED',
      entityType: 'doctors',
      entityId: createdDoc.id,
      details: `Onboarded ${createdDoc.fullName} (${doctorCode})`,
      ipAddress: req.ip,
    });

    return res.status(201).json(createdDoc);
  } catch (error) {
    console.error('Create doctor error:', error);
    return res.status(500).json({ error: 'Failed to create doctor profile.' });
  }
});

// Create Staff Member
router.post('/staff', async (req: AuthRequest, res) => {
  try {
    const { fullName, roleTitle, departmentId, phone, email, shiftTiming } = req.body ?? {};
    if (!fullName || !roleTitle || !phone || !email) {
      return res.status(400).json({ error: 'Staff name, role title, phone, and email are required.' });
    }

    const employeeCode = `STF-${String(Math.floor(300 + Math.random() * 700))}`;
    const [created] = await db
      .insert(staff)
      .values({
        employeeCode,
        fullName: String(fullName).trim(),
        roleTitle: String(roleTitle).trim(),
        departmentId: departmentId ? Number(departmentId) : null,
        phone: String(phone).trim(),
        email: String(email).trim().toLowerCase(),
        shiftTiming: shiftTiming || 'Morning (08:00 - 16:00)',
        status: 'active',
      })
      .returning();

    await recordAuditLog({
      user: req.user,
      action: 'STAFF_ADDED',
      entityType: 'staff',
      entityId: created.id,
      details: `Added ${created.fullName} (${created.roleTitle})`,
      ipAddress: req.ip,
    });

    return res.status(201).json(created);
  } catch (error) {
    console.error('Create staff error:', error);
    return res.status(500).json({ error: 'Failed to add staff member.' });
  }
});

// Role & Permission Management (RBAC)
router.patch('/users/:id/role', async (req: AuthRequest, res) => {
  try {
    const userId = Number(req.params.id);
    const { role, isActive } = req.body ?? {};
    const validRoles = ['patient', 'doctor', 'receptionist', 'admin'];

    const [existing] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!existing) return res.status(404).json({ error: 'User not found.' });

    const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
    if (role && validRoles.includes(role)) updates.role = role;
    if (typeof isActive === 'boolean') updates.isActive = isActive;

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    await recordAuditLog({
      user: req.user,
      action: 'USER_RBAC_UPDATED',
      entityType: 'users',
      entityId: userId,
      details: `Role=${updated.role}, Active=${updated.isActive}`,
      ipAddress: req.ip,
    });

    return res.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      isActive: updated.isActive,
    });
  } catch (error) {
    console.error('RBAC update error:', error);
    return res.status(500).json({ error: 'Failed to update user permissions.' });
  }
});

// Update Hospital Settings & Website CMS
router.patch('/settings', async (req: AuthRequest, res) => {
  try {
    const [existing] = await db.select().from(hospitalSettings).limit(1);
    if (!existing) return res.status(404).json({ error: 'Settings row missing.' });

    const {
      hospitalName,
      tagline,
      phone,
      emergencyPhone,
      email,
      address,
      gstNumber,
      taxRatePercent,
      appointmentSlotMinutes,
      smsGatewayEnabled,
      whatsappGatewayEnabled,
      cmsBannerHeadline,
      cmsAnnouncement,
    } = req.body ?? {};

    const [updated] = await db
      .update(hospitalSettings)
      .set({
        hospitalName: hospitalName ?? existing.hospitalName,
        tagline: tagline ?? existing.tagline,
        phone: phone ?? existing.phone,
        emergencyPhone: emergencyPhone ?? existing.emergencyPhone,
        email: email ?? existing.email,
        address: address ?? existing.address,
        gstNumber: gstNumber ?? existing.gstNumber,
        taxRatePercent: taxRatePercent !== undefined ? Number(taxRatePercent) : existing.taxRatePercent,
        appointmentSlotMinutes:
          appointmentSlotMinutes !== undefined
            ? Number(appointmentSlotMinutes)
            : existing.appointmentSlotMinutes,
        smsGatewayEnabled:
          typeof smsGatewayEnabled === 'boolean' ? smsGatewayEnabled : existing.smsGatewayEnabled,
        whatsappGatewayEnabled:
          typeof whatsappGatewayEnabled === 'boolean'
            ? whatsappGatewayEnabled
            : existing.whatsappGatewayEnabled,
        cmsBannerHeadline: cmsBannerHeadline ?? existing.cmsBannerHeadline,
        cmsAnnouncement: cmsAnnouncement ?? existing.cmsAnnouncement,
        updatedAt: new Date(),
      })
      .where(eq(hospitalSettings.id, existing.id))
      .returning();

    await recordAuditLog({
      user: req.user,
      action: 'HOSPITAL_SETTINGS_UPDATED',
      entityType: 'hospital_settings',
      entityId: existing.id,
      details: 'Updated hospital configuration & CMS content',
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (error) {
    console.error('Settings update error:', error);
    return res.status(500).json({ error: 'Failed to update hospital settings.' });
  }
});

// Broadcast Notification
router.post('/notifications/broadcast', async (req: AuthRequest, res) => {
  try {
    const { title, message, channel, targetRole } = req.body ?? {};
    if (!title || !message) {
      return res.status(400).json({ error: 'Notification title and message are required.' });
    }

    const allUsers = await db.select().from(users);
    const recipients = targetRole && targetRole !== 'all'
      ? allUsers.filter((u) => u.role === targetRole)
      : allUsers;

    if (recipients.length > 0) {
      await db.insert(notifications).values(
        recipients.map((u) => ({
          userId: u.id,
          title: String(title).trim(),
          message: String(message).trim(),
          channel: channel || 'in_app',
          category: 'system',
        }))
      );
    }

    await recordAuditLog({
      user: req.user,
      action: 'NOTIFICATION_BROADCAST',
      entityType: 'notifications',
      details: `Sent to ${recipients.length} users via ${channel || 'in_app'}`,
      ipAddress: req.ip,
    });

    return res.status(201).json({ sentCount: recipients.length });
  } catch (error) {
    console.error('Broadcast notification error:', error);
    return res.status(500).json({ error: 'Failed to dispatch notifications.' });
  }
});

// Database Backup Export (JSON snapshot without password hashes)
router.get('/backup', async (req: AuthRequest, res) => {
  try {
    const [depts, docs, pats, appts, bList, pList, lTests, meds, stock, settings] = await Promise.all([
      db.select().from(departments),
      db.select().from(doctors),
      db.select().from(patients),
      db.select().from(appointments),
      db.select().from(bills),
      db.select().from(payments),
      db.select().from(labTests),
      db.select().from(medicines),
      db.select().from(pharmacyStock),
      db.select().from(hospitalSettings),
    ]);

    await recordAuditLog({
      user: req.user,
      action: 'DATABASE_BACKUP_EXPORTED',
      entityType: 'system',
      details: 'Exported encrypted-safe hospital snapshot',
      ipAddress: req.ip,
    });

    return res.json({
      exportedAt: new Date().toISOString(),
      hospital: settings[0]?.hospitalName || 'Citystone Medical Center',
      tables: {
        departments: depts,
        doctors: docs,
        patients: pats,
        appointments: appts,
        bills: bList,
        payments: pList,
        labTests: lTests,
        medicines: meds,
        pharmacyStock: stock,
      },
    });
  } catch (error) {
    console.error('Backup export error:', error);
    return res.status(500).json({ error: 'Failed to generate database backup.' });
  }
});

export default router;
