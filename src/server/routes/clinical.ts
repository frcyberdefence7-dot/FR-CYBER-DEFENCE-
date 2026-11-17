import { Router } from 'express';
import { asc, desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  appointments,
  bills,
  departments,
  doctors,
  hospitalSettings,
  labReports,
  labTests,
  medicines,
  medicineSales,
  notifications,
  patients,
  payments,
  pharmacyStock,
} from '../../db/schema.ts';
import {
  recordAuditLog,
  requireAuth,
  requireRole,
  type AuthRequest,
} from '../../middleware/auth.ts';

const router = Router();
router.use(requireAuth);

// ---------------- RECEPTIONIST ROUTES ----------------

router.get('/reception/overview', requireRole('receptionist', 'admin'), async (_req, res) => {
  try {
    const [apptRows, patientRows, docRows, deptRows, billRows] = await Promise.all([
      db.select().from(appointments).orderBy(desc(appointments.appointmentDate), asc(appointments.tokenNumber)),
      db.select().from(patients).orderBy(desc(patients.createdAt)),
      db.select().from(doctors).orderBy(asc(doctors.fullName)),
      db.select().from(departments),
      db.select().from(bills).orderBy(desc(bills.createdAt)),
    ]);

    const patientMap = new Map(patientRows.map((p) => [p.id, p]));
    const docMap = new Map(docRows.map((d) => [d.id, d]));
    const deptMap = new Map(deptRows.map((d) => [d.id, d]));

    return res.json({
      appointments: apptRows.map((a) => ({
        ...a,
        patientName: patientMap.get(a.patientId)?.fullName || 'Patient',
        patientCode: patientMap.get(a.patientId)?.patientCode || '',
        patientPhone: patientMap.get(a.patientId)?.phone || '',
        doctorName: docMap.get(a.doctorId)?.fullName || 'Doctor',
        departmentName: deptMap.get(a.departmentId)?.name || '',
      })),
      patients: patientRows,
      doctors: docRows,
      departments: deptRows,
      bills: billRows.map((b) => ({
        ...b,
        patientName: patientMap.get(b.patientId)?.fullName || 'Patient',
        patientCode: patientMap.get(b.patientId)?.patientCode || '',
      })),
    });
  } catch (error) {
    console.error('Reception overview error:', error);
    return res.status(500).json({ error: 'Failed to load reception overview.' });
  }
});

router.get('/reception/patients', requireRole('receptionist', 'doctor', 'admin'), async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const list = await db.select().from(patients).orderBy(desc(patients.createdAt));
    const filtered = q
      ? list.filter((p) =>
          `${p.fullName} ${p.patientCode} ${p.phone} ${p.email || ''}`.toLowerCase().includes(q)
        )
      : list;
    return res.json(filtered);
  } catch (error) {
    console.error('Patient search error:', error);
    return res.status(500).json({ error: 'Failed to search patients.' });
  }
});

router.post('/reception/patients', requireRole('receptionist', 'admin'), async (req: AuthRequest, res) => {
  try {
    const {
      fullName,
      phone,
      email,
      gender,
      dateOfBirth,
      bloodGroup,
      address,
      emergencyContactName,
      emergencyContactPhone,
      allergies,
    } = req.body ?? {};

    if (!fullName || !phone) {
      return res.status(400).json({ error: 'Patient full name and phone number are required.' });
    }

    const patientCode = `PAT-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const [created] = await db
      .insert(patients)
      .values({
        patientCode,
        fullName: String(fullName).trim(),
        phone: String(phone).trim(),
        email: email ? String(email).trim().toLowerCase() : null,
        gender: gender || 'Prefer not to say',
        dateOfBirth: dateOfBirth || null,
        bloodGroup: bloodGroup || null,
        address: address || null,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
        allergies: allergies || null,
        dpdpConsentAccepted: true,
      })
      .returning();

    await recordAuditLog({
      user: req.user,
      action: 'WALKIN_PATIENT_REGISTERED',
      entityType: 'patients',
      entityId: created.id,
      details: `Registered ${patientCode} at reception desk`,
      ipAddress: req.ip,
    });

    return res.status(201).json(created);
  } catch (error) {
    console.error('Walk-in patient registration error:', error);
    return res.status(500).json({ error: 'Failed to register patient.' });
  }
});

router.patch(
  '/appointments/:id/status',
  requireRole('receptionist', 'doctor', 'admin'),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const { status } = req.body ?? {};
      const valid = ['pending', 'confirmed', 'checked_in', 'in_consultation', 'completed', 'cancelled'];
      if (!valid.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value.' });
      }

      const [updated] = await db
        .update(appointments)
        .set({ status, updatedAt: new Date() })
        .where(eq(appointments.id, id))
        .returning();

      if (!updated) return res.status(404).json({ error: 'Appointment not found.' });

      await recordAuditLog({
        user: req.user,
        action: 'APPOINTMENT_STATUS_CHANGED',
        entityType: 'appointments',
        entityId: id,
        details: `Booking ${updated.bookingId} -> ${status}`,
        ipAddress: req.ip,
      });

      return res.json(updated);
    } catch (error) {
      console.error('Appointment status patch error:', error);
      return res.status(500).json({ error: 'Failed to update appointment status.' });
    }
  }
);

// ---------------- LABORATORY ROUTES ----------------

router.get('/lab/reports', requireRole('receptionist', 'doctor', 'admin'), async (_req, res) => {
  try {
    const [reports, tests, patientRows, docRows] = await Promise.all([
      db.select().from(labReports).orderBy(desc(labReports.orderedAt)),
      db.select().from(labTests).orderBy(asc(labTests.name)),
      db.select().from(patients),
      db.select().from(doctors),
    ]);

    const testMap = new Map(tests.map((t) => [t.id, t]));
    const patientMap = new Map(patientRows.map((p) => [p.id, p]));
    const docMap = new Map(docRows.map((d) => [d.id, d]));

    return res.json({
      reports: reports.map((r) => ({
        ...r,
        testName: testMap.get(r.testId)?.name || 'Lab Test',
        testCode: testMap.get(r.testId)?.testCode || '',
        category: testMap.get(r.testId)?.category || '',
        price: testMap.get(r.testId)?.price || 0,
        patientName: patientMap.get(r.patientId)?.fullName || 'Patient',
        patientCode: patientMap.get(r.patientId)?.patientCode || '',
        doctorName: r.doctorId ? docMap.get(r.doctorId)?.fullName || '' : 'Walk-in',
      })),
      testsCatalog: tests,
    });
  } catch (error) {
    console.error('Lab reports list error:', error);
    return res.status(500).json({ error: 'Failed to load laboratory records.' });
  }
});

router.post('/lab/orders', async (req: AuthRequest, res) => {
  try {
    const { patientId, testId, doctorId, appointmentId, notes } = req.body ?? {};
    let resolvedPatientId = patientId ? Number(patientId) : null;

    if (!resolvedPatientId && req.user?.role === 'patient') {
      const [pat] = await db
        .select()
        .from(patients)
        .where(eq(patients.userId, req.user.id))
        .limit(1);
      resolvedPatientId = pat?.id ?? null;
    }

    if (!resolvedPatientId || !testId) {
      return res.status(400).json({ error: 'Patient and lab test selection are required.' });
    }

    const [test] = await db.select().from(labTests).where(eq(labTests.id, Number(testId))).limit(1);
    if (!test) return res.status(404).json({ error: 'Lab test not found.' });

    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, resolvedPatientId))
      .limit(1);
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });

    const reportCode = `RPT-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const [order] = await db
      .insert(labReports)
      .values({
        reportCode,
        patientId: patient.id,
        doctorId: doctorId ? Number(doctorId) : null,
        appointmentId: appointmentId ? Number(appointmentId) : null,
        testId: test.id,
        sampleStatus: 'pending',
        processingStatus: 'queued',
        notes: notes || 'Booked via HMS Laboratory',
      })
      .returning();

    // Generate Lab Bill
    const [settings] = await db.select().from(hospitalSettings).limit(1);
    const taxRate = settings?.taxRatePercent ?? 5;
    const taxAmount = Math.round((test.price * taxRate) / 100);
    const invoiceNumber = `INV-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;

    const [bill] = await db
      .insert(bills)
      .values({
        invoiceNumber,
        patientId: patient.id,
        appointmentId: appointmentId ? Number(appointmentId) : null,
        consultationFee: 0,
        labCharges: test.price,
        medicineCharges: 0,
        serviceCharges: 0,
        subtotal: test.price,
        discountAmount: 0,
        taxRatePercent: taxRate,
        taxAmount,
        totalAmount: test.price + taxAmount,
        paidAmount: 0,
        status: 'unpaid',
        lineItemsJson: JSON.stringify([{ label: `Lab Test: ${test.name} (${reportCode})`, amount: test.price }]),
        createdByUserId: req.user?.id ?? null,
      })
      .returning();

    await recordAuditLog({
      user: req.user,
      action: 'LAB_TEST_ORDERED',
      entityType: 'lab_reports',
      entityId: order.id,
      details: `${reportCode} (${test.name}) for ${patient.patientCode}`,
      ipAddress: req.ip,
    });

    return res.status(201).json({ order, bill });
  } catch (error) {
    console.error('Lab order error:', error);
    return res.status(500).json({ error: 'Failed to create laboratory booking.' });
  }
});

router.patch('/lab/reports/:id', requireRole('receptionist', 'doctor', 'admin'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { sampleStatus, processingStatus, resultSummary, resultValuesJson, verifiedBy, notes } =
      req.body ?? {};

    const [existing] = await db.select().from(labReports).where(eq(labReports.id, id)).limit(1);
    if (!existing) return res.status(404).json({ error: 'Lab report not found.' });

    const isVerified = processingStatus === 'verified';
    const [updated] = await db
      .update(labReports)
      .set({
        sampleStatus: sampleStatus ?? existing.sampleStatus,
        processingStatus: processingStatus ?? existing.processingStatus,
        resultSummary: resultSummary !== undefined ? resultSummary : existing.resultSummary,
        resultValuesJson: resultValuesJson !== undefined ? resultValuesJson : existing.resultValuesJson,
        verifiedBy: verifiedBy ?? (isVerified ? req.user?.name : existing.verifiedBy),
        notes: notes !== undefined ? notes : existing.notes,
        verifiedAt: isVerified ? new Date() : existing.verifiedAt,
      })
      .where(eq(labReports.id, id))
      .returning();

    if (isVerified) {
      const [pat] = await db
        .select()
        .from(patients)
        .where(eq(patients.id, existing.patientId))
        .limit(1);
      if (pat?.userId) {
        await db.insert(notifications).values({
          userId: pat.userId,
          title: `Lab Report Verified — ${existing.reportCode}`,
          message: 'Your diagnostic laboratory report has been verified and is ready to download.',
          channel: 'email',
          category: 'lab',
        });
      }
    }

    await recordAuditLog({
      user: req.user,
      action: 'LAB_REPORT_UPDATED',
      entityType: 'lab_reports',
      entityId: id,
      details: `Sample=${updated.sampleStatus}, Processing=${updated.processingStatus}`,
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (error) {
    console.error('Lab report update error:', error);
    return res.status(500).json({ error: 'Failed to update lab report.' });
  }
});

// ---------------- PHARMACY ROUTES ----------------

router.get('/pharmacy/inventory', requireRole('receptionist', 'doctor', 'admin'), async (_req, res) => {
  try {
    const [meds, batches, sales, patientRows] = await Promise.all([
      db.select().from(medicines).orderBy(asc(medicines.name)),
      db.select().from(pharmacyStock).orderBy(asc(pharmacyStock.expiryDate)),
      db.select().from(medicineSales).orderBy(desc(medicineSales.soldAt)),
      db.select().from(patients),
    ]);

    const medMap = new Map(meds.map((m) => [m.id, m]));
    const patientMap = new Map(patientRows.map((p) => [p.id, p]));

    const enrichedBatches = batches.map((b) => ({
      ...b,
      medicineName: medMap.get(b.medicineId)?.name || 'Medicine',
      medicineCode: medMap.get(b.medicineId)?.medicineCode || '',
      unitPrice: medMap.get(b.medicineId)?.unitPrice || 0,
      isLowStock: b.quantityAvailable <= b.reorderLevel,
    }));

    return res.json({
      medicines: meds,
      batches: enrichedBatches,
      lowStockAlerts: enrichedBatches.filter((b) => b.isLowStock),
      sales: sales.map((s) => ({
        ...s,
        patientName: s.patientId ? patientMap.get(s.patientId)?.fullName || 'Walk-in' : 'Walk-in',
      })),
    });
  } catch (error) {
    console.error('Pharmacy inventory error:', error);
    return res.status(500).json({ error: 'Failed to load pharmacy inventory.' });
  }
});

router.post('/pharmacy/medicines', requireRole('receptionist', 'admin'), async (req: AuthRequest, res) => {
  try {
    const {
      medicineId,
      name,
      genericName,
      category,
      manufacturer,
      unitPrice,
      unitType,
      requiresPrescription,
      batchNumber,
      expiryDate,
      quantityAvailable,
      reorderLevel,
      purchasePrice,
      supplierName,
    } = req.body ?? {};

    let targetMedId = medicineId ? Number(medicineId) : null;

    if (!targetMedId) {
      if (!name || !genericName || !category || !unitPrice) {
        return res.status(400).json({ error: 'Medicine name, generic name, category, and unit price are required.' });
      }
      const medicineCode = `MED-${String(Math.floor(100 + Math.random() * 900))}`;
      const [createdMed] = await db
        .insert(medicines)
        .values({
          medicineCode,
          name: String(name).trim(),
          genericName: String(genericName).trim(),
          category: String(category).trim(),
          manufacturer: String(manufacturer || 'Standard Pharma').trim(),
          unitPrice: Number(unitPrice),
          unitType: String(unitType || 'Strip'),
          requiresPrescription: Boolean(requiresPrescription),
        })
        .returning();
      targetMedId = createdMed.id;
    }

    const [createdBatch] = await db
      .insert(pharmacyStock)
      .values({
        medicineId: targetMedId,
        batchNumber: String(batchNumber || `BCH-${Date.now().toString().slice(-5)}`),
        expiryDate: String(expiryDate || '2028-12-31'),
        quantityAvailable: Number(quantityAvailable || 50),
        reorderLevel: Number(reorderLevel || 25),
        purchasePrice: Number(purchasePrice || 0),
        supplierName: String(supplierName || 'Authorized Medical Distributor'),
        receivedDate: new Date().toISOString().slice(0, 10),
      })
      .returning();

    await recordAuditLog({
      user: req.user,
      action: 'PHARMACY_STOCK_ADDED',
      entityType: 'pharmacy_stock',
      entityId: createdBatch.id,
      details: `Added batch ${createdBatch.batchNumber} (Qty: ${createdBatch.quantityAvailable})`,
      ipAddress: req.ip,
    });

    return res.status(201).json(createdBatch);
  } catch (error) {
    console.error('Pharmacy add stock error:', error);
    return res.status(500).json({ error: 'Failed to add medicine stock.' });
  }
});

router.post('/pharmacy/sales', requireRole('receptionist', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { patientId, items, discount } = req.body ?? {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one medicine item is required for sale.' });
    }

    let subtotal = 0;
    const processedItems: Array<{ medicineName: string; qty: number; unitPrice: number; total: number }> = [];

    for (const item of items) {
      const stockId = Number(item.stockId);
      const qty = Number(item.qty);
      if (!stockId || qty <= 0) continue;

      const [batch] = await db
        .select()
        .from(pharmacyStock)
        .where(eq(pharmacyStock.id, stockId))
        .limit(1);
      if (!batch || batch.quantityAvailable < qty) {
        return res.status(400).json({ error: 'Insufficient stock in selected batch.' });
      }

      const [med] = await db
        .select()
        .from(medicines)
        .where(eq(medicines.id, batch.medicineId))
        .limit(1);
      const lineTotal = (med?.unitPrice || 0) * qty;
      subtotal += lineTotal;

      processedItems.push({
        medicineName: med?.name || 'Medicine',
        qty,
        unitPrice: med?.unitPrice || 0,
        total: lineTotal,
      });

      await db
        .update(pharmacyStock)
        .set({
          quantityAvailable: batch.quantityAvailable - qty,
          updatedAt: new Date(),
        })
        .where(eq(pharmacyStock.id, batch.id));
    }

    const discountAmt = Number(discount || 0);
    const taxable = Math.max(0, subtotal - discountAmt);
    const tax = Math.round(taxable * 0.05);
    const totalAmount = taxable + tax;
    const saleCode = `SALE-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;

    const [sale] = await db
      .insert(medicineSales)
      .values({
        saleCode,
        patientId: patientId ? Number(patientId) : null,
        soldByUserId: req.user?.id ?? null,
        itemsJson: JSON.stringify(processedItems),
        subtotal,
        discount: discountAmt,
        tax,
        totalAmount,
        paymentStatus: 'paid',
      })
      .returning();

    if (patientId) {
      const invoiceNumber = `INV-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
      await db.insert(bills).values({
        invoiceNumber,
        patientId: Number(patientId),
        consultationFee: 0,
        labCharges: 0,
        medicineCharges: subtotal,
        serviceCharges: 0,
        subtotal,
        discountAmount: discountAmt,
        taxRatePercent: 5,
        taxAmount: tax,
        totalAmount,
        paidAmount: totalAmount,
        status: 'paid',
        lineItemsJson: JSON.stringify(
          processedItems.map((i) => ({ label: `Pharmacy: ${i.medicineName} x${i.qty}`, amount: i.total }))
        ),
        createdByUserId: req.user?.id ?? null,
      });
    }

    await recordAuditLog({
      user: req.user,
      action: 'PHARMACY_SALE_COMPLETED',
      entityType: 'medicine_sales',
      entityId: sale.id,
      details: `${saleCode} Total ₹${totalAmount}`,
      ipAddress: req.ip,
    });

    return res.status(201).json(sale);
  } catch (error) {
    console.error('Pharmacy sale error:', error);
    return res.status(500).json({ error: 'Failed to process pharmacy sale.' });
  }
});

// ---------------- BILLING & SANDBOX PAYMENTS ----------------

router.get('/billing/bills', async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const [allBills, allPayments, patientRows] = await Promise.all([
      db.select().from(bills).orderBy(desc(bills.createdAt)),
      db.select().from(payments).orderBy(desc(payments.paidAt)),
      db.select().from(patients),
    ]);

    const patientMap = new Map(patientRows.map((p) => [p.id, p]));
    let filteredBills = allBills;
    let filteredPayments = allPayments;

    if (req.user.role === 'patient') {
      const myPatient = patientRows.find((p) => p.userId === req.user!.id);
      if (!myPatient) return res.json({ bills: [], payments: [] });
      filteredBills = allBills.filter((b) => b.patientId === myPatient.id);
      filteredPayments = allPayments.filter((p) => p.patientId === myPatient.id);
    }

    return res.json({
      bills: filteredBills.map((b) => ({
        ...b,
        patientName: patientMap.get(b.patientId)?.fullName || 'Patient',
        patientCode: patientMap.get(b.patientId)?.patientCode || '',
        patientPhone: patientMap.get(b.patientId)?.phone || '',
      })),
      payments: filteredPayments,
    });
  } catch (error) {
    console.error('Billing fetch error:', error);
    return res.status(500).json({ error: 'Failed to load billing records.' });
  }
});

router.post('/billing/bills', requireRole('receptionist', 'admin'), async (req: AuthRequest, res) => {
  try {
    const {
      patientId,
      appointmentId,
      consultationFee = 0,
      labCharges = 0,
      medicineCharges = 0,
      serviceCharges = 0,
      discountAmount = 0,
      notes,
    } = req.body ?? {};

    if (!patientId) {
      return res.status(400).json({ error: 'Patient selection is required.' });
    }

    const [settings] = await db.select().from(hospitalSettings).limit(1);
    const taxRate = settings?.taxRatePercent ?? 5;

    const cFee = Number(consultationFee || 0);
    const lFee = Number(labCharges || 0);
    const mFee = Number(medicineCharges || 0);
    const sFee = Number(serviceCharges || 0);
    const disc = Number(discountAmount || 0);

    const subtotal = cFee + lFee + mFee + sFee;
    const taxable = Math.max(0, subtotal - disc);
    const taxAmount = Math.round((taxable * taxRate) / 100);
    const totalAmount = taxable + taxAmount;

    const lineItems = [];
    if (cFee > 0) lineItems.push({ label: 'Doctor Consultation Fee', amount: cFee });
    if (lFee > 0) lineItems.push({ label: 'Laboratory & Diagnostics Charges', amount: lFee });
    if (mFee > 0) lineItems.push({ label: 'Pharmacy Medicine Charges', amount: mFee });
    if (sFee > 0) lineItems.push({ label: notes || 'Hospital Service Charges', amount: sFee });

    const invoiceNumber = `INV-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const [created] = await db
      .insert(bills)
      .values({
        invoiceNumber,
        patientId: Number(patientId),
        appointmentId: appointmentId ? Number(appointmentId) : null,
        consultationFee: cFee,
        labCharges: lFee,
        medicineCharges: mFee,
        serviceCharges: sFee,
        subtotal,
        discountAmount: disc,
        taxRatePercent: taxRate,
        taxAmount,
        totalAmount,
        paidAmount: 0,
        status: 'unpaid',
        lineItemsJson: JSON.stringify(lineItems),
        createdByUserId: req.user?.id ?? null,
      })
      .returning();

    await recordAuditLog({
      user: req.user,
      action: 'INVOICE_GENERATED',
      entityType: 'bills',
      entityId: created.id,
      details: `Generated ${invoiceNumber} for ₹${totalAmount}`,
      ipAddress: req.ip,
    });

    return res.status(201).json(created);
  } catch (error) {
    console.error('Create bill error:', error);
    return res.status(500).json({ error: 'Failed to generate invoice.' });
  }
});

// Sandbox Payment Settlement (NEVER stores card numbers or UPI PINs)
router.post('/billing/bills/:id/pay', async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const billId = Number(req.params.id);
    const { amount, paymentMethod, notes } = req.body ?? {};

    const [bill] = await db.select().from(bills).where(eq(bills.id, billId)).limit(1);
    if (!bill) return res.status(404).json({ error: 'Invoice not found.' });

    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, bill.patientId))
      .limit(1);

    if (req.user.role === 'patient' && patient?.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Cannot pay another patient invoice.' });
    }

    const remaining = Math.max(0, bill.totalAmount - bill.paidAmount);
    const payAmt = Number(amount || remaining);
    if (payAmt <= 0 || payAmt > remaining) {
      return res.status(400).json({ error: `Invalid payment amount. Remaining due is ₹${remaining}.` });
    }

    const validMethods = ['cash', 'upi_sandbox', 'card_sandbox', 'netbanking_sandbox'];
    const method = validMethods.includes(paymentMethod) ? paymentMethod : 'upi_sandbox';
    const receiptNumber = `RCPT-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const transactionRef = `${method.toUpperCase().replace('_SANDBOX', '-SBX')}-${Date.now().toString().slice(-6)}`;

    const [payment] = await db
      .insert(payments)
      .values({
        receiptNumber,
        billId: bill.id,
        patientId: bill.patientId,
        amount: payAmt,
        paymentMethod: method,
        transactionRef,
        gatewayStatus: 'success',
        notes: notes || 'Settled in sandbox test environment (no credentials stored)',
      })
      .returning();

    const newPaid = bill.paidAmount + payAmt;
    const newStatus = newPaid >= bill.totalAmount ? 'paid' : 'partial';

    const [updatedBill] = await db
      .update(bills)
      .set({ paidAmount: newPaid, status: newStatus })
      .where(eq(bills.id, bill.id))
      .returning();

    if (patient?.userId) {
      await db.insert(notifications).values({
        userId: patient.userId,
        title: `Payment Receipt — ${receiptNumber}`,
        message: `Received ₹${payAmt} towards invoice ${bill.invoiceNumber}. Transaction Ref: ${transactionRef}.`,
        channel: 'whatsapp',
        category: 'billing',
      });
    }

    await recordAuditLog({
      user: req.user,
      action: 'PAYMENT_RECORDED',
      entityType: 'payments',
      entityId: payment.id,
      details: `${receiptNumber} ₹${payAmt} via ${method}`,
      ipAddress: req.ip,
    });

    return res.status(201).json({ payment, bill: updatedBill });
  } catch (error) {
    console.error('Payment settlement error:', error);
    return res.status(500).json({ error: 'Payment processing failed.' });
  }
});

export default router;
