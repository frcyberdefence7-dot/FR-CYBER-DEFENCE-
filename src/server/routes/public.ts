import { Router } from 'express';
import { and, asc, desc, eq, ne } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  appointments,
  bills,
  departments,
  doctors,
  doctorSchedules,
  hospitalSettings,
  labTests,
  medicines,
  notifications,
  patients,
  pharmacyStock,
  users,
} from '../../db/schema.ts';
import { ensureDatabaseSeeded } from '../../db/seed.ts';
import { recordAuditLog } from '../../middleware/auth.ts';

const router = Router();

function generateTimeSlots(start: string, end: string, durationMinutes: number): string[] {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startTotal = sh * 60 + sm;
  const endTotal = eh * 60 + em;
  const slots: string[] = [];
  for (let t = startTotal; t + durationMinutes <= endTotal; t += durationMinutes) {
    const hh = String(Math.floor(t / 60)).padStart(2, '0');
    const mm = String(t % 60).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}

// Public Hospital Overview (Settings, Departments, Doctors)
router.get('/overview', async (_req, res) => {
  try {
    await ensureDatabaseSeeded();
    const [settings] = await db.select().from(hospitalSettings).limit(1);
    const deptList = await db
      .select()
      .from(departments)
      .where(eq(departments.isActive, true))
      .orderBy(asc(departments.id));
    const docList = await db
      .select()
      .from(doctors)
      .orderBy(asc(doctors.id));

    return res.json({
      settings: settings ?? null,
      departments: deptList,
      doctors: docList,
    });
  } catch (error) {
    console.error('Overview fetch error:', error);
    return res.status(500).json({ error: 'Unable to load hospital overview.' });
  }
});

// Departments
router.get('/departments', async (_req, res) => {
  try {
    await ensureDatabaseSeeded();
    const list = await db
      .select()
      .from(departments)
      .where(eq(departments.isActive, true))
      .orderBy(asc(departments.name));
    return res.json(list);
  } catch (error) {
    console.error('Departments fetch error:', error);
    return res.status(500).json({ error: 'Failed to load medical departments.' });
  }
});

// Doctors Directory with filters
router.get('/doctors', async (req, res) => {
  try {
    await ensureDatabaseSeeded();
    const departmentId = req.query.departmentId ? Number(req.query.departmentId) : null;
    const search = String(req.query.search || '').trim().toLowerCase();
    const availableOnly = req.query.available === 'true';

    const allDoctors = await db.select().from(doctors).orderBy(asc(doctors.id));
    const allDepts = await db.select().from(departments);
    const deptMap = new Map(allDepts.map((d) => [d.id, d]));

    const filtered = allDoctors
      .map((doc) => ({
        ...doc,
        departmentName: deptMap.get(doc.departmentId)?.name || 'General Medicine',
        departmentSlug: deptMap.get(doc.departmentId)?.slug || 'general',
      }))
      .filter((doc) => {
        if (departmentId && doc.departmentId !== departmentId) return false;
        if (availableOnly && !doc.isAvailable) return false;
        if (search) {
          const hay = `${doc.fullName} ${doc.specialization} ${doc.departmentName} ${doc.qualification}`.toLowerCase();
          if (!hay.includes(search)) return false;
        }
        return true;
      });

    return res.json(filtered);
  } catch (error) {
    console.error('Doctors fetch error:', error);
    return res.status(500).json({ error: 'Failed to load doctors directory.' });
  }
});

// Single Doctor Profile + Weekly Schedule
router.get('/doctors/:id', async (req, res) => {
  try {
    await ensureDatabaseSeeded();
    const doctorId = Number(req.params.id);
    if (!doctorId) return res.status(400).json({ error: 'Invalid doctor ID.' });

    const [doc] = await db.select().from(doctors).where(eq(doctors.id, doctorId)).limit(1);
    if (!doc) return res.status(404).json({ error: 'Doctor not found.' });

    const [dept] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, doc.departmentId))
      .limit(1);
    const schedules = await db
      .select()
      .from(doctorSchedules)
      .where(eq(doctorSchedules.doctorId, doc.id))
      .orderBy(asc(doctorSchedules.dayOfWeek));

    return res.json({
      ...doc,
      departmentName: dept?.name || 'General Medicine',
      floorLocation: dept?.floorLocation || 'Main Block',
      schedules,
    });
  } catch (error) {
    console.error('Doctor profile fetch error:', error);
    return res.status(500).json({ error: 'Failed to load doctor profile.' });
  }
});

// Available Slots for Doctor on a given Date (YYYY-MM-DD)
router.get('/doctors/:id/slots', async (req, res) => {
  try {
    const doctorId = Number(req.params.id);
    const dateStr = String(req.query.date || '');
    if (!doctorId || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ error: 'Valid doctor ID and YYYY-MM-DD date are required.' });
    }

    const parsedDate = new Date(`${dateStr}T00:00:00`);
    const dayOfWeek = parsedDate.getDay();

    const schedules = await db
      .select()
      .from(doctorSchedules)
      .where(eq(doctorSchedules.doctorId, doctorId));

    // Check explicit leave on this date
    const leaveRecord = schedules.find((s) => s.isLeave && s.leaveDate === dateStr);
    if (leaveRecord) {
      return res.json({
        date: dateStr,
        available: false,
        reason: leaveRecord.leaveReason || 'Doctor is on scheduled leave on this date.',
        slots: [],
      });
    }

    const daySchedule = schedules.find((s) => !s.isLeave && s.dayOfWeek === dayOfWeek);
    if (!daySchedule) {
      return res.json({
        date: dateStr,
        available: false,
        reason: 'Doctor does not hold OPD hours on this day of the week.',
        slots: [],
      });
    }

    const allSlots = generateTimeSlots(
      daySchedule.startTime,
      daySchedule.endTime,
      daySchedule.slotDurationMinutes
    );

    const existingBookings = await db
      .select({ timeSlot: appointments.timeSlot })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          eq(appointments.appointmentDate, dateStr),
          ne(appointments.status, 'cancelled')
        )
      );

    const bookedSet = new Set(existingBookings.map((b) => b.timeSlot));

    return res.json({
      date: dateStr,
      available: true,
      slots: allSlots.map((time) => ({
        time,
        isBooked: bookedSet.has(time),
      })),
    });
  } catch (error) {
    console.error('Slot availability error:', error);
    return res.status(500).json({ error: 'Unable to calculate appointment slots.' });
  }
});

// Public Lab Tests Directory
router.get('/lab-tests', async (req, res) => {
  try {
    await ensureDatabaseSeeded();
    const category = String(req.query.category || '').trim();
    const search = String(req.query.search || '').trim().toLowerCase();

    const tests = await db
      .select()
      .from(labTests)
      .where(eq(labTests.isActive, true))
      .orderBy(asc(labTests.category), asc(labTests.name));

    const filtered = tests.filter((t) => {
      if (category && category !== 'All' && t.category !== category) return false;
      if (search) {
        const hay = `${t.name} ${t.testCode} ${t.category} ${t.description}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    return res.json(filtered);
  } catch (error) {
    console.error('Lab tests fetch error:', error);
    return res.status(500).json({ error: 'Failed to load lab tests.' });
  }
});

// Public Pharmacy Information Catalog
router.get('/pharmacy', async (req, res) => {
  try {
    await ensureDatabaseSeeded();
    const search = String(req.query.search || '').trim().toLowerCase();
    const medList = await db
      .select()
      .from(medicines)
      .where(eq(medicines.isActive, true))
      .orderBy(asc(medicines.name));
    const stockList = await db.select().from(pharmacyStock);

    const stockByMed = new Map<number, number>();
    for (const s of stockList) {
      stockByMed.set(s.medicineId, (stockByMed.get(s.medicineId) ?? 0) + s.quantityAvailable);
    }

    const enriched = medList
      .map((m) => ({
        ...m,
        inStock: (stockByMed.get(m.id) ?? 0) > 0,
      }))
      .filter((m) => {
        if (!search) return true;
        return `${m.name} ${m.genericName} ${m.category} ${m.manufacturer}`
          .toLowerCase()
          .includes(search);
      });

    return res.json(enriched);
  } catch (error) {
    console.error('Public pharmacy error:', error);
    return res.status(500).json({ error: 'Failed to load pharmacy catalog.' });
  }
});

// Online Appointment Booking (Prevents duplicates & overlapping slots, creates Booking ID + Token + Invoice)
router.post('/appointments', async (req, res) => {
  try {
    await ensureDatabaseSeeded();
    const {
      departmentId,
      doctorId,
      appointmentDate,
      timeSlot,
      fullName,
      phone,
      email,
      gender,
      dateOfBirth,
      reason,
      userId,
    } = req.body ?? {};

    if (!departmentId || !doctorId || !appointmentDate || !timeSlot || !fullName || !phone) {
      return res
        .status(400)
        .json({ error: 'Department, doctor, date, time slot, patient name, and phone are required.' });
    }

    const [doc] = await db
      .select()
      .from(doctors)
      .where(eq(doctors.id, Number(doctorId)))
      .limit(1);
    if (!doc) {
      return res.status(404).json({ error: 'Selected doctor was not found.' });
    }

    // Check overlapping appointment for this doctor + date + slot
    const overlapping = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doc.id),
          eq(appointments.appointmentDate, String(appointmentDate)),
          eq(appointments.timeSlot, String(timeSlot)),
          ne(appointments.status, 'cancelled')
        )
      )
      .limit(1);

    if (overlapping.length > 0) {
      return res.status(409).json({
        error: 'This time slot has already been booked. Please select another available slot.',
      });
    }

    // Resolve or create patient record
    let patientRow;
    if (userId) {
      const byUser = await db
        .select()
        .from(patients)
        .where(eq(patients.userId, Number(userId)))
        .limit(1);
      patientRow = byUser[0];
    }
    if (!patientRow) {
      const byPhone = await db
        .select()
        .from(patients)
        .where(eq(patients.phone, String(phone).trim()))
        .limit(1);
      patientRow = byPhone[0];
    }

    if (!patientRow) {
      const uniqueSuffix = String(Date.now()).slice(-4);
      const patientCode = `PAT-2026-${uniqueSuffix}`;
      const [created] = await db
        .insert(patients)
        .values({
          userId: userId ? Number(userId) : null,
          patientCode,
          fullName: String(fullName).trim(),
          email: email ? String(email).trim().toLowerCase() : null,
          phone: String(phone).trim(),
          gender: gender || 'Prefer not to say',
          dateOfBirth: dateOfBirth || null,
          dpdpConsentAccepted: true,
        })
        .returning();
      patientRow = created;
    }

    // Prevent same patient duplicate booking for same doctor & date
    const duplicatePatientBooking = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.patientId, patientRow.id),
          eq(appointments.doctorId, doc.id),
          eq(appointments.appointmentDate, String(appointmentDate)),
          ne(appointments.status, 'cancelled')
        )
      )
      .limit(1);

    if (duplicatePatientBooking.length > 0) {
      return res.status(409).json({
        error: `You already have an active appointment (${duplicatePatientBooking[0].bookingId}) with ${doc.fullName} on ${appointmentDate}.`,
      });
    }

    // Sequential token number for this doctor + date
    const dayAppts = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doc.id),
          eq(appointments.appointmentDate, String(appointmentDate))
        )
      );
    const tokenNumber = dayAppts.length + 1;
    const bookingId = `APT-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;

    const [createdAppt] = await db
      .insert(appointments)
      .values({
        bookingId,
        patientId: patientRow.id,
        doctorId: doc.id,
        departmentId: Number(departmentId),
        appointmentDate: String(appointmentDate),
        timeSlot: String(timeSlot),
        tokenNumber,
        status: 'confirmed',
        reason: reason ? String(reason).trim() : 'General consultation',
        createdByUserId: userId ? Number(userId) : null,
      })
      .returning();

    // Auto-generate consultation invoice
    const [settings] = await db.select().from(hospitalSettings).limit(1);
    const taxRate = settings?.taxRatePercent ?? 5;
    const subtotal = doc.consultationFee;
    const taxAmount = Math.round((subtotal * taxRate) / 100);
    const totalAmount = subtotal + taxAmount;
    const invoiceNumber = `INV-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;

    const [createdBill] = await db
      .insert(bills)
      .values({
        invoiceNumber,
        patientId: patientRow.id,
        appointmentId: createdAppt.id,
        consultationFee: doc.consultationFee,
        labCharges: 0,
        medicineCharges: 0,
        serviceCharges: 0,
        subtotal,
        discountAmount: 0,
        taxRatePercent: taxRate,
        taxAmount,
        totalAmount,
        paidAmount: 0,
        status: 'unpaid',
        lineItemsJson: JSON.stringify([
          { label: `Consultation — ${doc.fullName}`, amount: doc.consultationFee },
        ]),
        createdByUserId: userId ? Number(userId) : null,
      })
      .returning();

    if (patientRow.userId) {
      await db.insert(notifications).values({
        userId: patientRow.userId,
        title: `Appointment Confirmed — ${bookingId}`,
        message: `Booked with ${doc.fullName} on ${appointmentDate} at ${timeSlot} (Token #${tokenNumber}).`,
        channel: 'sms',
        category: 'appointment',
      });
    }

    await recordAuditLog({
      action: 'APPOINTMENT_BOOKED',
      entityType: 'appointments',
      entityId: createdAppt.id,
      details: `Booking ${bookingId} for patient ${patientRow.patientCode} with ${doc.fullName}`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      appointment: createdAppt,
      patient: patientRow,
      doctor: doc,
      bill: createdBill,
    });
  } catch (error) {
    console.error('Appointment booking error:', error);
    return res.status(500).json({ error: 'Failed to create appointment. Please try again.' });
  }
});

// Public Contact Inquiry
router.post('/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body ?? {};
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    const adminUsers = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
    if (adminUsers.length > 0) {
      await db.insert(notifications).values({
        userId: adminUsers[0].id,
        title: `Website Inquiry: ${subject || 'General Query'}`,
        message: `From ${name} (${email}${phone ? `, ${phone}` : ''}): ${message}`,
        channel: 'email',
        category: 'system',
      });
    }

    await recordAuditLog({
      action: 'CONTACT_INQUIRY_SUBMITTED',
      entityType: 'notifications',
      details: `Contact form submitted by ${name} <${email}>`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: 'Your inquiry has been received by our patient relations desk.',
    });
  } catch (error) {
    console.error('Contact submission error:', error);
    return res.status(500).json({ error: 'Unable to submit inquiry right now.' });
  }
});

// Global Search across Doctors, Departments, Lab Tests, Medicines
router.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    if (!q) return res.json({ doctors: [], departments: [], labTests: [], medicines: [] });

    const [docRows, deptRows, testRows, medRows] = await Promise.all([
      db.select().from(doctors),
      db.select().from(departments),
      db.select().from(labTests),
      db.select().from(medicines),
    ]);

    return res.json({
      doctors: docRows.filter((d) =>
        `${d.fullName} ${d.specialization}`.toLowerCase().includes(q)
      ),
      departments: deptRows.filter((d) =>
        `${d.name} ${d.description}`.toLowerCase().includes(q)
      ),
      labTests: testRows.filter((t) =>
        `${t.name} ${t.category} ${t.testCode}`.toLowerCase().includes(q)
      ),
      medicines: medRows.filter((m) =>
        `${m.name} ${m.genericName} ${m.category}`.toLowerCase().includes(q)
      ),
    });
  } catch (error) {
    console.error('Global search error:', error);
    return res.status(500).json({ error: 'Search failed.' });
  }
});

export default router;
