import { Router } from 'express';
import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  appointments,
  departments,
  doctors,
  doctorSchedules,
  labReports,
  labTests,
  medicalRecords,
  medicines,
  notifications,
  patientDocuments,
  patients,
  prescriptions,
} from '../../db/schema.ts';
import {
  recordAuditLog,
  requireAuth,
  requireRole,
  type AuthRequest,
} from '../../middleware/auth.ts';

const router = Router();
router.use(requireAuth, requireRole('doctor', 'admin'));

async function resolveDoctor(req: AuthRequest) {
  if (!req.user) return null;
  if (req.query.doctorId && req.user.role === 'admin') {
    const [d] = await db
      .select()
      .from(doctors)
      .where(eq(doctors.id, Number(req.query.doctorId)))
      .limit(1);
    if (d) return d;
  }
  const byUser = await db
    .select()
    .from(doctors)
    .where(eq(doctors.userId, req.user.id))
    .limit(1);
  if (byUser.length > 0) return byUser[0];

  // Fallback for admin previewing Doctor Portal
  if (req.user.role === 'admin') {
    const [firstDoc] = await db.select().from(doctors).orderBy(asc(doctors.id)).limit(1);
    return firstDoc ?? null;
  }
  return null;
}

// Doctor Dashboard Overview
router.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    const doctor = await resolveDoctor(req);
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found.' });

    const [
      deptRows,
      apptRows,
      scheduleRows,
      patientRows,
      rxRows,
      labTestRows,
      medicineRows,
      notifRows,
    ] = await Promise.all([
      db.select().from(departments).where(eq(departments.id, doctor.departmentId)).limit(1),
      db
        .select()
        .from(appointments)
        .where(eq(appointments.doctorId, doctor.id))
        .orderBy(desc(appointments.appointmentDate), asc(appointments.timeSlot)),
      db
        .select()
        .from(doctorSchedules)
        .where(eq(doctorSchedules.doctorId, doctor.id))
        .orderBy(asc(doctorSchedules.dayOfWeek)),
      db.select().from(patients),
      db
        .select()
        .from(prescriptions)
        .where(eq(prescriptions.doctorId, doctor.id))
        .orderBy(desc(prescriptions.createdAt)),
      db.select().from(labTests).where(eq(labTests.isActive, true)),
      db.select().from(medicines).where(eq(medicines.isActive, true)),
      db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, req.user!.id))
        .orderBy(desc(notifications.createdAt)),
    ]);

    const patientMap = new Map(patientRows.map((p) => [p.id, p]));
    const assignedPatientIds = new Set(apptRows.map((a) => a.patientId));
    const myPatients = patientRows.filter((p) => assignedPatientIds.has(p.id));

    return res.json({
      doctor: { ...doctor, departmentName: deptRows[0]?.name || 'General' },
      appointments: apptRows.map((a) => ({
        ...a,
        patientName: patientMap.get(a.patientId)?.fullName || 'Patient',
        patientCode: patientMap.get(a.patientId)?.patientCode || '',
        patientPhone: patientMap.get(a.patientId)?.phone || '',
        patientGender: patientMap.get(a.patientId)?.gender || '',
        patientBloodGroup: patientMap.get(a.patientId)?.bloodGroup || '',
      })),
      patients: myPatients,
      schedules: scheduleRows,
      prescriptions: rxRows.map((rx) => ({
        ...rx,
        patientName: patientMap.get(rx.patientId)?.fullName || 'Patient',
        patientCode: patientMap.get(rx.patientId)?.patientCode || '',
      })),
      labTestsCatalog: labTestRows,
      medicinesCatalog: medicineRows,
      notifications: notifRows,
    });
  } catch (error) {
    console.error('Doctor dashboard error:', error);
    return res.status(500).json({ error: 'Failed to load doctor dashboard.' });
  }
});

// Patient Clinical History for Doctor
router.get('/patients/:patientId/history', async (req: AuthRequest, res) => {
  try {
    const patientId = Number(req.params.patientId);
    const [patient] = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });

    const [records, rxList, reports, docs, allLabTests] = await Promise.all([
      db
        .select()
        .from(medicalRecords)
        .where(eq(medicalRecords.patientId, patientId))
        .orderBy(desc(medicalRecords.createdAt)),
      db
        .select()
        .from(prescriptions)
        .where(eq(prescriptions.patientId, patientId))
        .orderBy(desc(prescriptions.createdAt)),
      db
        .select()
        .from(labReports)
        .where(eq(labReports.patientId, patientId))
        .orderBy(desc(labReports.orderedAt)),
      db
        .select({
          id: patientDocuments.id,
          title: patientDocuments.title,
          documentType: patientDocuments.documentType,
          fileName: patientDocuments.fileName,
          uploadedAt: patientDocuments.uploadedAt,
        })
        .from(patientDocuments)
        .where(eq(patientDocuments.patientId, patientId)),
      db.select().from(labTests),
    ]);

    const testMap = new Map(allLabTests.map((t) => [t.id, t]));

    await recordAuditLog({
      user: req.user,
      action: 'PATIENT_HISTORY_VIEWED',
      entityType: 'patients',
      entityId: patientId,
      details: `Accessed medical records for ${patient.patientCode}`,
      ipAddress: req.ip,
    });

    return res.json({
      patient,
      medicalRecords: records,
      prescriptions: rxList,
      labReports: reports.map((r) => ({
        ...r,
        testName: testMap.get(r.testId)?.name || 'Diagnostic Test',
      })),
      documents: docs,
    });
  } catch (error) {
    console.error('Patient clinical history error:', error);
    return res.status(500).json({ error: 'Failed to load patient medical history.' });
  }
});

// Update Appointment Status & Follow-Up Date
router.patch('/appointments/:id/status', async (req: AuthRequest, res) => {
  try {
    const apptId = Number(req.params.id);
    const { status, followUpDate, notes } = req.body ?? {};
    const validStatuses = ['confirmed', 'checked_in', 'in_consultation', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid appointment status.' });
    }

    const [existing] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, apptId))
      .limit(1);
    if (!existing) return res.status(404).json({ error: 'Appointment not found.' });

    const [updated] = await db
      .update(appointments)
      .set({
        status,
        followUpDate: followUpDate !== undefined ? followUpDate : existing.followUpDate,
        notes: notes !== undefined ? notes : existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, apptId))
      .returning();

    await recordAuditLog({
      user: req.user,
      action: 'APPOINTMENT_STATUS_UPDATED',
      entityType: 'appointments',
      entityId: apptId,
      details: `Status set to ${status}`,
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (error) {
    console.error('Doctor appointment status error:', error);
    return res.status(500).json({ error: 'Failed to update appointment status.' });
  }
});

// Create Medical Record (Vitals + Diagnosis + Clinical Notes)
router.post('/medical-records', async (req: AuthRequest, res) => {
  try {
    const doctor = await resolveDoctor(req);
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found.' });

    const {
      patientId,
      appointmentId,
      visitDate,
      chiefComplaint,
      vitalsBp,
      vitalsPulse,
      vitalsTemp,
      vitalsSpo2,
      diagnosis,
      clinicalNotes,
      treatmentPlan,
    } = req.body ?? {};

    if (!patientId || !chiefComplaint || !diagnosis) {
      return res.status(400).json({ error: 'Patient, chief complaint, and diagnosis are required.' });
    }

    const [record] = await db
      .insert(medicalRecords)
      .values({
        patientId: Number(patientId),
        doctorId: doctor.id,
        appointmentId: appointmentId ? Number(appointmentId) : null,
        visitDate: visitDate || new Date().toISOString().slice(0, 10),
        chiefComplaint: String(chiefComplaint).trim(),
        vitalsBp: vitalsBp || null,
        vitalsPulse: vitalsPulse || null,
        vitalsTemp: vitalsTemp || null,
        vitalsSpo2: vitalsSpo2 || null,
        diagnosis: String(diagnosis).trim(),
        clinicalNotes: clinicalNotes || null,
        treatmentPlan: treatmentPlan || null,
      })
      .returning();

    await recordAuditLog({
      user: req.user,
      action: 'MEDICAL_RECORD_CREATED',
      entityType: 'medical_records',
      entityId: record.id,
      details: `Diagnosis logged for patient #${patientId}`,
      ipAddress: req.ip,
    });

    return res.status(201).json(record);
  } catch (error) {
    console.error('Medical record creation error:', error);
    return res.status(500).json({ error: 'Failed to save medical record.' });
  }
});

// Create Digital Prescription + Optional Recommended Lab Test Orders
router.post('/prescriptions', async (req: AuthRequest, res) => {
  try {
    const doctor = await resolveDoctor(req);
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found.' });

    const {
      patientId,
      appointmentId,
      diagnosis,
      items,
      recommendedLabTestIds,
      generalAdvice,
      followUpDate,
    } = req.body ?? {};

    if (!patientId || !diagnosis || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ error: 'Patient, diagnosis, and at least one medicine item are required.' });
    }

    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, Number(patientId)))
      .limit(1);
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });

    let recommendedNames: string[] = [];
    if (Array.isArray(recommendedLabTestIds) && recommendedLabTestIds.length > 0) {
      const allTests = await db.select().from(labTests);
      const testMap = new Map(allTests.map((t) => [t.id, t]));
      for (const tid of recommendedLabTestIds) {
        const t = testMap.get(Number(tid));
        if (t) {
          recommendedNames.push(t.name);
          const reportCode = `RPT-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
          await db.insert(labReports).values({
            reportCode,
            patientId: patient.id,
            doctorId: doctor.id,
            appointmentId: appointmentId ? Number(appointmentId) : null,
            testId: t.id,
            sampleStatus: 'pending',
            processingStatus: 'queued',
            notes: `Ordered via prescription by ${doctor.fullName}`,
          });
        }
      }
    }

    const prescriptionCode = `RX-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const [rx] = await db
      .insert(prescriptions)
      .values({
        prescriptionCode,
        appointmentId: appointmentId ? Number(appointmentId) : null,
        patientId: patient.id,
        doctorId: doctor.id,
        diagnosis: String(diagnosis).trim(),
        itemsJson: JSON.stringify(items),
        recommendedLabTestsJson: JSON.stringify(recommendedNames),
        generalAdvice: generalAdvice || null,
        followUpDate: followUpDate || null,
      })
      .returning();

    if (appointmentId) {
      await db
        .update(appointments)
        .set({
          status: 'completed',
          followUpDate: followUpDate || null,
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, Number(appointmentId)));
    }

    if (patient.userId) {
      await db.insert(notifications).values({
        userId: patient.userId,
        title: `New Digital Prescription — ${prescriptionCode}`,
        message: `${doctor.fullName} issued your prescription for ${diagnosis}. You can download the PDF from your dashboard.`,
        channel: 'whatsapp',
        category: 'prescription',
      });
    }

    await recordAuditLog({
      user: req.user,
      action: 'PRESCRIPTION_ISSUED',
      entityType: 'prescriptions',
      entityId: rx.id,
      details: `${prescriptionCode} issued to ${patient.patientCode}`,
      ipAddress: req.ip,
    });

    return res.status(201).json(rx);
  } catch (error) {
    console.error('Prescription creation error:', error);
    return res.status(500).json({ error: 'Failed to create prescription.' });
  }
});

// Update Weekly Schedule or Add/Remove Leave
router.put('/schedule', async (req: AuthRequest, res) => {
  try {
    const doctor = await resolveDoctor(req);
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found.' });

    const { action, dayOfWeek, startTime, endTime, slotDurationMinutes, leaveDate, leaveReason, scheduleId, isAvailable } =
      req.body ?? {};

    if (typeof isAvailable === 'boolean') {
      await db.update(doctors).set({ isAvailable }).where(eq(doctors.id, doctor.id));
    }

    if (action === 'add_leave' && leaveDate) {
      const [created] = await db
        .insert(doctorSchedules)
        .values({
          doctorId: doctor.id,
          dayOfWeek: new Date(`${leaveDate}T00:00:00`).getDay(),
          startTime: '00:00',
          endTime: '00:00',
          slotDurationMinutes: 30,
          isLeave: true,
          leaveDate: String(leaveDate),
          leaveReason: leaveReason || 'Scheduled Leave',
        })
        .returning();
      return res.json(created);
    }

    if (action === 'remove_leave' && scheduleId) {
      await db
        .delete(doctorSchedules)
        .where(and(eq(doctorSchedules.id, Number(scheduleId)), eq(doctorSchedules.doctorId, doctor.id)));
      return res.json({ deleted: true });
    }

    if (dayOfWeek !== undefined && startTime && endTime) {
      const existing = await db
        .select()
        .from(doctorSchedules)
        .where(
          and(
            eq(doctorSchedules.doctorId, doctor.id),
            eq(doctorSchedules.dayOfWeek, Number(dayOfWeek)),
            eq(doctorSchedules.isLeave, false)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        const [updated] = await db
          .update(doctorSchedules)
          .set({
            startTime,
            endTime,
            slotDurationMinutes: Number(slotDurationMinutes || 30),
          })
          .where(eq(doctorSchedules.id, existing[0].id))
          .returning();
        return res.json(updated);
      } else {
        const [inserted] = await db
          .insert(doctorSchedules)
          .values({
            doctorId: doctor.id,
            dayOfWeek: Number(dayOfWeek),
            startTime,
            endTime,
            slotDurationMinutes: Number(slotDurationMinutes || 30),
            isLeave: false,
          })
          .returning();
        return res.json(inserted);
      }
    }

    const updatedSchedules = await db
      .select()
      .from(doctorSchedules)
      .where(eq(doctorSchedules.doctorId, doctor.id))
      .orderBy(asc(doctorSchedules.dayOfWeek));

    return res.json(updatedSchedules);
  } catch (error) {
    console.error('Schedule update error:', error);
    return res.status(500).json({ error: 'Failed to update doctor schedule.' });
  }
});

export default router;
