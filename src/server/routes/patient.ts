import { Router } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  appointments,
  bills,
  departments,
  doctors,
  labReports,
  labTests,
  medicalRecords,
  notifications,
  patientDocuments,
  patients,
  payments,
  prescriptions,
} from '../../db/schema.ts';
import { recordAuditLog, requireAuth, type AuthRequest } from '../../middleware/auth.ts';

const router = Router();
router.use(requireAuth);

async function resolvePatientForUser(userId: number) {
  const rows = await db.select().from(patients).where(eq(patients.userId, userId)).limit(1);
  return rows[0] ?? null;
}

// Complete Patient Dashboard Payload
router.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const patient = await resolvePatientForUser(req.user.id);
    const notifRows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.user.id))
      .orderBy(desc(notifications.createdAt));

    if (!patient) {
      return res.json({
        patient: null,
        appointments: [],
        prescriptions: [],
        medicalRecords: [],
        labReports: [],
        bills: [],
        payments: [],
        documents: [],
        notifications: notifRows,
      });
    }

    const [
      apptRows,
      rxRows,
      recordRows,
      reportRows,
      billRows,
      paymentRows,
      docRows,
      allDoctors,
      allDepts,
      allLabTests,
    ] = await Promise.all([
      db
        .select()
        .from(appointments)
        .where(eq(appointments.patientId, patient.id))
        .orderBy(desc(appointments.appointmentDate)),
      db
        .select()
        .from(prescriptions)
        .where(eq(prescriptions.patientId, patient.id))
        .orderBy(desc(prescriptions.createdAt)),
      db
        .select()
        .from(medicalRecords)
        .where(eq(medicalRecords.patientId, patient.id))
        .orderBy(desc(medicalRecords.createdAt)),
      db
        .select()
        .from(labReports)
        .where(eq(labReports.patientId, patient.id))
        .orderBy(desc(labReports.orderedAt)),
      db
        .select()
        .from(bills)
        .where(eq(bills.patientId, patient.id))
        .orderBy(desc(bills.createdAt)),
      db
        .select()
        .from(payments)
        .where(eq(payments.patientId, patient.id))
        .orderBy(desc(payments.paidAt)),
      db
        .select({
          id: patientDocuments.id,
          title: patientDocuments.title,
          documentType: patientDocuments.documentType,
          fileName: patientDocuments.fileName,
          mimeType: patientDocuments.mimeType,
          fileSizeBytes: patientDocuments.fileSizeBytes,
          notes: patientDocuments.notes,
          uploadedAt: patientDocuments.uploadedAt,
        })
        .from(patientDocuments)
        .where(eq(patientDocuments.patientId, patient.id))
        .orderBy(desc(patientDocuments.uploadedAt)),
      db.select().from(doctors),
      db.select().from(departments),
      db.select().from(labTests),
    ]);

    const docMap = new Map(allDoctors.map((d) => [d.id, d]));
    const deptMap = new Map(allDepts.map((d) => [d.id, d]));
    const testMap = new Map(allLabTests.map((t) => [t.id, t]));

    return res.json({
      patient,
      appointments: apptRows.map((a) => ({
        ...a,
        doctorName: docMap.get(a.doctorId)?.fullName || 'Assigned Specialist',
        doctorSpecialization: docMap.get(a.doctorId)?.specialization || '',
        departmentName: deptMap.get(a.departmentId)?.name || '',
      })),
      prescriptions: rxRows.map((rx) => ({
        ...rx,
        doctorName: docMap.get(rx.doctorId)?.fullName || 'Doctor',
        doctorQualification: docMap.get(rx.doctorId)?.qualification || '',
      })),
      medicalRecords: recordRows.map((mr) => ({
        ...mr,
        doctorName: mr.doctorId ? docMap.get(mr.doctorId)?.fullName || 'Clinician' : 'Clinician',
      })),
      labReports: reportRows.map((r) => ({
        ...r,
        testName: testMap.get(r.testId)?.name || 'Diagnostic Test',
        testCode: testMap.get(r.testId)?.testCode || '',
        category: testMap.get(r.testId)?.category || '',
        doctorName: r.doctorId ? docMap.get(r.doctorId)?.fullName || '' : '',
      })),
      bills: billRows,
      payments: paymentRows,
      documents: docRows,
      notifications: notifRows,
    });
  } catch (error) {
    console.error('Patient dashboard error:', error);
    return res.status(500).json({ error: 'Failed to load patient dashboard.' });
  }
});

// Update Patient Profile
router.patch('/profile', async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const patient = await resolvePatientForUser(req.user.id);
    if (!patient) return res.status(404).json({ error: 'Patient profile not found.' });

    const {
      fullName,
      phone,
      gender,
      dateOfBirth,
      bloodGroup,
      address,
      emergencyContactName,
      emergencyContactPhone,
      allergies,
      chronicConditions,
    } = req.body ?? {};

    const [updated] = await db
      .update(patients)
      .set({
        fullName: fullName ? String(fullName).trim() : patient.fullName,
        phone: phone ? String(phone).trim() : patient.phone,
        gender: gender ?? patient.gender,
        dateOfBirth: dateOfBirth ?? patient.dateOfBirth,
        bloodGroup: bloodGroup ?? patient.bloodGroup,
        address: address ?? patient.address,
        emergencyContactName: emergencyContactName ?? patient.emergencyContactName,
        emergencyContactPhone: emergencyContactPhone ?? patient.emergencyContactPhone,
        allergies: allergies ?? patient.allergies,
        chronicConditions: chronicConditions ?? patient.chronicConditions,
      })
      .where(eq(patients.id, patient.id))
      .returning();

    await recordAuditLog({
      user: req.user,
      action: 'PATIENT_PROFILE_UPDATED',
      entityType: 'patients',
      entityId: patient.id,
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (error) {
    console.error('Patient profile update error:', error);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// Cancel Own Appointment
router.post('/appointments/:id/cancel', async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const appointmentId = Number(req.params.id);
    const patient = await resolvePatientForUser(req.user.id);
    if (!patient) return res.status(404).json({ error: 'Patient profile not found.' });

    const [appt] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, appointmentId), eq(appointments.patientId, patient.id)))
      .limit(1);

    if (!appt) return res.status(404).json({ error: 'Appointment not found.' });
    if (appt.status === 'completed' || appt.status === 'cancelled') {
      return res.status(400).json({ error: `Cannot cancel an appointment that is ${appt.status}.` });
    }

    const [updated] = await db
      .update(appointments)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(appointments.id, appt.id))
      .returning();

    await db.insert(notifications).values({
      userId: req.user.id,
      title: `Appointment Cancelled — ${appt.bookingId}`,
      message: `Your appointment on ${appt.appointmentDate} at ${appt.timeSlot} has been cancelled.`,
      channel: 'sms',
      category: 'appointment',
    });

    await recordAuditLog({
      user: req.user,
      action: 'APPOINTMENT_CANCELLED_BY_PATIENT',
      entityType: 'appointments',
      entityId: appt.id,
      details: `Booking ${appt.bookingId} cancelled`,
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (error) {
    console.error('Appointment cancel error:', error);
    return res.status(500).json({ error: 'Failed to cancel appointment.' });
  }
});

// Secure Medical Document Upload
router.post('/documents', async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const patient = await resolvePatientForUser(req.user.id);
    if (!patient) return res.status(404).json({ error: 'Patient profile not found.' });

    const { title, documentType, fileName, mimeType, fileSizeBytes, contentBase64, notes } =
      req.body ?? {};

    if (!title || !fileName || !mimeType || !contentBase64) {
      return res.status(400).json({ error: 'Document title and valid file payload are required.' });
    }

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(String(mimeType))) {
      return res.status(400).json({ error: 'Only PDF, PNG, JPG, and WEBP files are permitted.' });
    }
    if (Number(fileSizeBytes) > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds 2MB security limit.' });
    }

    const [doc] = await db
      .insert(patientDocuments)
      .values({
        patientId: patient.id,
        uploadedByUserId: req.user.id,
        title: String(title).trim(),
        documentType: String(documentType || 'Medical Report'),
        fileName: String(fileName).trim(),
        mimeType: String(mimeType),
        fileSizeBytes: Number(fileSizeBytes || 0),
        contentBase64: String(contentBase64),
        notes: notes ? String(notes).trim() : null,
      })
      .returning({
        id: patientDocuments.id,
        title: patientDocuments.title,
        documentType: patientDocuments.documentType,
        fileName: patientDocuments.fileName,
        mimeType: patientDocuments.mimeType,
        fileSizeBytes: patientDocuments.fileSizeBytes,
        notes: patientDocuments.notes,
        uploadedAt: patientDocuments.uploadedAt,
      });

    await recordAuditLog({
      user: req.user,
      action: 'PATIENT_DOCUMENT_UPLOADED',
      entityType: 'patient_documents',
      entityId: doc.id,
      details: `Uploaded ${doc.fileName}`,
      ipAddress: req.ip,
    });

    return res.status(201).json(doc);
  } catch (error) {
    console.error('Document upload error:', error);
    return res.status(500).json({ error: 'Failed to upload document.' });
  }
});

// Secure Document Download
router.get('/documents/:id/download', async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const docId = Number(req.params.id);

    const [doc] = await db
      .select()
      .from(patientDocuments)
      .where(eq(patientDocuments.id, docId))
      .limit(1);

    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    if (req.user.role === 'patient') {
      const patient = await resolvePatientForUser(req.user.id);
      if (!patient || doc.patientId !== patient.id) {
        return res.status(403).json({ error: 'Forbidden: Access restricted to document owner.' });
      }
    }

    return res.json(doc);
  } catch (error) {
    console.error('Document download error:', error);
    return res.status(500).json({ error: 'Failed to retrieve document.' });
  }
});

export default router;
