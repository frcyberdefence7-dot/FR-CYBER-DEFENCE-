import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// 1. Users
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash'),
    name: text('name').notNull(),
    phone: text('phone'),
    role: text('role').notNull().default('patient'), // patient | doctor | receptionist | admin
    twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
    twoFactorCode: text('two_factor_code'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [index('idx_users_email').on(t.email), index('idx_users_role').on(t.role)]
);

// 2. Departments
export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  headDoctorName: text('head_doctor_name'),
  floorLocation: text('floor_location').notNull(),
  contactExt: text('contact_ext'),
  consultationBaseFee: integer('consultation_base_fee').notNull().default(600),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. Patients
export const patients = pgTable(
  'patients',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    patientCode: text('patient_code').notNull().unique(),
    fullName: text('full_name').notNull(),
    email: text('email'),
    phone: text('phone').notNull(),
    gender: text('gender').notNull().default('Prefer not to say'),
    dateOfBirth: text('date_of_birth'),
    bloodGroup: text('blood_group'),
    address: text('address'),
    emergencyContactName: text('emergency_contact_name'),
    emergencyContactPhone: text('emergency_contact_phone'),
    allergies: text('allergies'),
    chronicConditions: text('chronic_conditions'),
    dpdpConsentAccepted: boolean('dpdp_consent_accepted').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('idx_patients_user_id').on(t.userId), index('idx_patients_phone').on(t.phone)]
);

// 4. Doctors
export const doctors = pgTable(
  'doctors',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    departmentId: integer('department_id')
      .references(() => departments.id, { onDelete: 'cascade' })
      .notNull(),
    doctorCode: text('doctor_code').notNull().unique(),
    fullName: text('full_name').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    specialization: text('specialization').notNull(),
    qualification: text('qualification').notNull(),
    experienceYears: integer('experience_years').notNull().default(5),
    consultationFee: integer('consultation_fee').notNull().default(800),
    bio: text('bio').notNull(),
    avatarUrl: text('avatar_url'),
    languages: text('languages').default('English, Hindi'),
    isAvailable: boolean('is_available').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('idx_doctors_dept').on(t.departmentId)]
);

// 5. Doctor Schedules
export const doctorSchedules = pgTable(
  'doctor_schedules',
  {
    id: serial('id').primaryKey(),
    doctorId: integer('doctor_id')
      .references(() => doctors.id, { onDelete: 'cascade' })
      .notNull(),
    dayOfWeek: integer('day_of_week').notNull(), // 0-6
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
    slotDurationMinutes: integer('slot_duration_minutes').notNull().default(30),
    isLeave: boolean('is_leave').notNull().default(false),
    leaveDate: text('leave_date'),
    leaveReason: text('leave_reason'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('idx_schedules_doctor').on(t.doctorId)]
);

// 6. Staff
export const staff = pgTable('staff', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  departmentId: integer('department_id').references(() => departments.id, { onDelete: 'set null' }),
  employeeCode: text('employee_code').notNull().unique(),
  fullName: text('full_name').notNull(),
  roleTitle: text('role_title').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  shiftTiming: text('shift_timing').notNull().default('Morning (08:00 - 16:00)'),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7. Appointments
export const appointments = pgTable(
  'appointments',
  {
    id: serial('id').primaryKey(),
    bookingId: text('booking_id').notNull().unique(),
    patientId: integer('patient_id')
      .references(() => patients.id, { onDelete: 'cascade' })
      .notNull(),
    doctorId: integer('doctor_id')
      .references(() => doctors.id, { onDelete: 'cascade' })
      .notNull(),
    departmentId: integer('department_id')
      .references(() => departments.id, { onDelete: 'cascade' })
      .notNull(),
    appointmentDate: text('appointment_date').notNull(),
    timeSlot: text('time_slot').notNull(),
    tokenNumber: integer('token_number').notNull(),
    status: text('status').notNull().default('confirmed'), // pending | confirmed | checked_in | in_consultation | completed | cancelled
    reason: text('reason'),
    notes: text('notes'),
    followUpDate: text('follow_up_date'),
    createdByUserId: integer('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('idx_appt_patient').on(t.patientId),
    index('idx_appt_doctor_date').on(t.doctorId, t.appointmentDate),
  ]
);

// 8. Medical Records
export const medicalRecords = pgTable(
  'medical_records',
  {
    id: serial('id').primaryKey(),
    patientId: integer('patient_id')
      .references(() => patients.id, { onDelete: 'cascade' })
      .notNull(),
    doctorId: integer('doctor_id').references(() => doctors.id, { onDelete: 'set null' }),
    appointmentId: integer('appointment_id').references(() => appointments.id, { onDelete: 'set null' }),
    visitDate: text('visit_date').notNull(),
    chiefComplaint: text('chief_complaint').notNull(),
    vitalsBp: text('vitals_bp'),
    vitalsPulse: text('vitals_pulse'),
    vitalsTemp: text('vitals_temp'),
    vitalsSpo2: text('vitals_spo2'),
    diagnosis: text('diagnosis').notNull(),
    clinicalNotes: text('clinical_notes'),
    treatmentPlan: text('treatment_plan'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('idx_med_records_patient').on(t.patientId)]
);

// 9. Prescriptions
export const prescriptions = pgTable(
  'prescriptions',
  {
    id: serial('id').primaryKey(),
    prescriptionCode: text('prescription_code').notNull().unique(),
    appointmentId: integer('appointment_id').references(() => appointments.id, { onDelete: 'set null' }),
    patientId: integer('patient_id')
      .references(() => patients.id, { onDelete: 'cascade' })
      .notNull(),
    doctorId: integer('doctor_id')
      .references(() => doctors.id, { onDelete: 'cascade' })
      .notNull(),
    diagnosis: text('diagnosis').notNull(),
    itemsJson: text('items_json').notNull(),
    recommendedLabTestsJson: text('recommended_lab_tests_json'),
    generalAdvice: text('general_advice'),
    followUpDate: text('follow_up_date'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('idx_rx_patient').on(t.patientId)]
);

// 10. Lab Tests
export const labTests = pgTable('lab_tests', {
  id: serial('id').primaryKey(),
  testCode: text('test_code').notNull().unique(),
  category: text('category').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  sampleType: text('sample_type').notNull(),
  price: integer('price').notNull(),
  turnaroundHours: integer('turnaround_hours').notNull().default(24),
  normalRange: text('normal_range'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 11. Lab Reports
export const labReports = pgTable(
  'lab_reports',
  {
    id: serial('id').primaryKey(),
    reportCode: text('report_code').notNull().unique(),
    patientId: integer('patient_id')
      .references(() => patients.id, { onDelete: 'cascade' })
      .notNull(),
    doctorId: integer('doctor_id').references(() => doctors.id, { onDelete: 'set null' }),
    appointmentId: integer('appointment_id').references(() => appointments.id, { onDelete: 'set null' }),
    testId: integer('test_id')
      .references(() => labTests.id, { onDelete: 'cascade' })
      .notNull(),
    sampleStatus: text('sample_status').notNull().default('pending'), // pending | collected | received
    processingStatus: text('processing_status').notNull().default('queued'), // queued | processing | verified
    resultSummary: text('result_summary'),
    resultValuesJson: text('result_values_json'),
    verifiedBy: text('verified_by'),
    reportFileUrl: text('report_file_url'),
    notes: text('notes'),
    orderedAt: timestamp('ordered_at').defaultNow().notNull(),
    verifiedAt: timestamp('verified_at'),
  },
  (t) => [index('idx_lab_reports_patient').on(t.patientId)]
);

// 12. Medicines
export const medicines = pgTable('medicines', {
  id: serial('id').primaryKey(),
  medicineCode: text('medicine_code').notNull().unique(),
  name: text('name').notNull(),
  genericName: text('generic_name').notNull(),
  category: text('category').notNull(),
  manufacturer: text('manufacturer').notNull(),
  unitPrice: integer('unit_price').notNull(),
  unitType: text('unit_type').notNull().default('Strip'),
  requiresPrescription: boolean('requires_prescription').notNull().default(false),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 13. Pharmacy Stock
export const pharmacyStock = pgTable(
  'pharmacy_stock',
  {
    id: serial('id').primaryKey(),
    medicineId: integer('medicine_id')
      .references(() => medicines.id, { onDelete: 'cascade' })
      .notNull(),
    batchNumber: text('batch_number').notNull(),
    expiryDate: text('expiry_date').notNull(),
    quantityAvailable: integer('quantity_available').notNull().default(0),
    reorderLevel: integer('reorder_level').notNull().default(25),
    purchasePrice: integer('purchase_price').notNull().default(0),
    supplierName: text('supplier_name').notNull(),
    receivedDate: text('received_date').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [index('idx_stock_med').on(t.medicineId)]
);

// 14. Medicine Sales
export const medicineSales = pgTable('medicine_sales', {
  id: serial('id').primaryKey(),
  saleCode: text('sale_code').notNull().unique(),
  patientId: integer('patient_id').references(() => patients.id, { onDelete: 'set null' }),
  prescriptionId: integer('prescription_id').references(() => prescriptions.id, { onDelete: 'set null' }),
  soldByUserId: integer('sold_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  itemsJson: text('items_json').notNull(),
  subtotal: integer('subtotal').notNull(),
  discount: integer('discount').notNull().default(0),
  tax: integer('tax').notNull().default(0),
  totalAmount: integer('total_amount').notNull(),
  paymentStatus: text('payment_status').notNull().default('paid'),
  soldAt: timestamp('sold_at').defaultNow().notNull(),
});

// 15. Bills
export const bills = pgTable(
  'bills',
  {
    id: serial('id').primaryKey(),
    invoiceNumber: text('invoice_number').notNull().unique(),
    patientId: integer('patient_id')
      .references(() => patients.id, { onDelete: 'cascade' })
      .notNull(),
    appointmentId: integer('appointment_id').references(() => appointments.id, { onDelete: 'set null' }),
    consultationFee: integer('consultation_fee').notNull().default(0),
    labCharges: integer('lab_charges').notNull().default(0),
    medicineCharges: integer('medicine_charges').notNull().default(0),
    serviceCharges: integer('service_charges').notNull().default(0),
    subtotal: integer('subtotal').notNull(),
    discountAmount: integer('discount_amount').notNull().default(0),
    taxRatePercent: integer('tax_rate_percent').notNull().default(5),
    taxAmount: integer('tax_amount').notNull().default(0),
    totalAmount: integer('total_amount').notNull(),
    paidAmount: integer('paid_amount').notNull().default(0),
    status: text('status').notNull().default('unpaid'), // unpaid | partial | paid | refunded
    lineItemsJson: text('line_items_json').notNull(),
    createdByUserId: integer('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('idx_bills_patient').on(t.patientId)]
);

// 16. Payments
export const payments = pgTable(
  'payments',
  {
    id: serial('id').primaryKey(),
    receiptNumber: text('receipt_number').notNull().unique(),
    billId: integer('bill_id')
      .references(() => bills.id, { onDelete: 'cascade' })
      .notNull(),
    patientId: integer('patient_id')
      .references(() => patients.id, { onDelete: 'cascade' })
      .notNull(),
    amount: integer('amount').notNull(),
    paymentMethod: text('payment_method').notNull(), // cash | upi_sandbox | card_sandbox | netbanking_sandbox
    transactionRef: text('transaction_ref').notNull(),
    gatewayStatus: text('gateway_status').notNull().default('success'),
    notes: text('notes'),
    paidAt: timestamp('paid_at').defaultNow().notNull(),
  },
  (t) => [index('idx_payments_bill').on(t.billId)]
);

// 17. Notifications
export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    channel: text('channel').notNull().default('in_app'),
    category: text('category').notNull().default('system'),
    isRead: boolean('is_read').notNull().default(false),
    deliveryStatus: text('delivery_status').notNull().default('sent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('idx_notifications_user').on(t.userId)]
);

// 18. Hospital Settings
export const hospitalSettings = pgTable('hospital_settings', {
  id: serial('id').primaryKey(),
  hospitalName: text('hospital_name').notNull(),
  tagline: text('tagline').notNull(),
  phone: text('phone').notNull(),
  emergencyPhone: text('emergency_phone').notNull(),
  email: text('email').notNull(),
  address: text('address').notNull(),
  gstNumber: text('gst_number'),
  taxRatePercent: integer('tax_rate_percent').notNull().default(5),
  appointmentSlotMinutes: integer('appointment_slot_minutes').notNull().default(30),
  smsGatewayEnabled: boolean('sms_gateway_enabled').notNull().default(true),
  whatsappGatewayEnabled: boolean('whatsapp_gateway_enabled').notNull().default(true),
  cmsBannerHeadline: text('cms_banner_headline'),
  cmsAnnouncement: text('cms_announcement'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 19. Audit Logs
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    userEmail: text('user_email'),
    userRole: text('user_role'),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    details: text('details'),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('idx_audit_created').on(t.createdAt)]
);

// 20. Patient Documents
export const patientDocuments = pgTable(
  'patient_documents',
  {
    id: serial('id').primaryKey(),
    patientId: integer('patient_id')
      .references(() => patients.id, { onDelete: 'cascade' })
      .notNull(),
    uploadedByUserId: integer('uploaded_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    documentType: text('document_type').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    fileSizeBytes: integer('file_size_bytes').notNull(),
    contentBase64: text('content_base64').notNull(),
    notes: text('notes'),
    uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  },
  (t) => [index('idx_patient_docs_patient').on(t.patientId)]
);

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  patientProfile: one(patients, { fields: [users.id], references: [patients.userId] }),
  doctorProfile: one(doctors, { fields: [users.id], references: [doctors.userId] }),
  notifications: many(notifications),
}));

export const departmentsRelations = relations(departments, ({ many }) => ({
  doctors: many(doctors),
  appointments: many(appointments),
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  department: one(departments, { fields: [doctors.departmentId], references: [departments.id] }),
  schedules: many(doctorSchedules),
  appointments: many(appointments),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, { fields: [patients.userId], references: [users.id] }),
  appointments: many(appointments),
  prescriptions: many(prescriptions),
  labReports: many(labReports),
  bills: many(bills),
  documents: many(patientDocuments),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  patient: one(patients, { fields: [appointments.patientId], references: [patients.id] }),
  doctor: one(doctors, { fields: [appointments.doctorId], references: [doctors.id] }),
  department: one(departments, { fields: [appointments.departmentId], references: [departments.id] }),
}));

export const billsRelations = relations(bills, ({ one, many }) => ({
  patient: one(patients, { fields: [bills.patientId], references: [patients.id] }),
  payments: many(payments),
}));
