export type UserRole = 'patient' | 'doctor' | 'receptionist' | 'admin';

export interface SessionUser {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  twoFactorEnabled: boolean;
}

export interface HospitalSettings {
  id: number;
  hospitalName: string;
  tagline: string;
  phone: string;
  emergencyPhone: string;
  email: string;
  address: string;
  gstNumber: string | null;
  taxRatePercent: number;
  appointmentSlotMinutes: number;
  smsGatewayEnabled: boolean;
  whatsappGatewayEnabled: boolean;
  cmsBannerHeadline: string | null;
  cmsAnnouncement: string | null;
}

export interface Department {
  id: number;
  code: string;
  name: string;
  slug: string;
  description: string;
  headDoctorName: string | null;
  floorLocation: string;
  contactExt: string | null;
  consultationBaseFee: number;
  isActive: boolean;
}

export interface Doctor {
  id: number;
  userId: number | null;
  departmentId: number;
  departmentName?: string;
  doctorCode: string;
  fullName: string;
  email: string;
  phone: string;
  specialization: string;
  qualification: string;
  experienceYears: number;
  consultationFee: number;
  bio: string;
  avatarUrl: string | null;
  languages: string | null;
  isAvailable: boolean;
  floorLocation?: string;
  schedules?: DoctorSchedule[];
}

export interface DoctorSchedule {
  id: number;
  doctorId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  isLeave: boolean;
  leaveDate: string | null;
  leaveReason: string | null;
}

export interface Patient {
  id: number;
  userId: number | null;
  patientCode: string;
  fullName: string;
  email: string | null;
  phone: string;
  gender: string;
  dateOfBirth: string | null;
  bloodGroup: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  allergies: string | null;
  chronicConditions: string | null;
  dpdpConsentAccepted: boolean;
}

export interface Appointment {
  id: number;
  bookingId: string;
  patientId: number;
  doctorId: number;
  departmentId: number;
  appointmentDate: string;
  timeSlot: string;
  tokenNumber: number;
  status: string;
  reason: string | null;
  notes: string | null;
  followUpDate: string | null;
  doctorName?: string;
  doctorSpecialization?: string;
  departmentName?: string;
  patientName?: string;
  patientCode?: string;
  patientPhone?: string;
}

export interface PrescriptionItem {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface Prescription {
  id: number;
  prescriptionCode: string;
  appointmentId: number | null;
  patientId: number;
  doctorId: number;
  diagnosis: string;
  itemsJson: string;
  recommendedLabTestsJson: string | null;
  generalAdvice: string | null;
  followUpDate: string | null;
  createdAt: string;
  doctorName?: string;
  doctorQualification?: string;
  patientName?: string;
  patientCode?: string;
}

export interface LabTest {
  id: number;
  testCode: string;
  category: string;
  name: string;
  description: string;
  sampleType: string;
  price: number;
  turnaroundHours: number;
  normalRange: string | null;
}

export interface LabReport {
  id: number;
  reportCode: string;
  patientId: number;
  doctorId: number | null;
  testId: number;
  sampleStatus: string;
  processingStatus: string;
  resultSummary: string | null;
  resultValuesJson: string | null;
  verifiedBy: string | null;
  notes: string | null;
  orderedAt: string;
  verifiedAt: string | null;
  testName?: string;
  testCode?: string;
  category?: string;
  price?: number;
  patientName?: string;
  patientCode?: string;
  doctorName?: string;
}

export interface Medicine {
  id: number;
  medicineCode: string;
  name: string;
  genericName: string;
  category: string;
  manufacturer: string;
  unitPrice: number;
  unitType: string;
  requiresPrescription: boolean;
  description: string | null;
  inStock?: boolean;
}

export interface PharmacyBatch {
  id: number;
  medicineId: number;
  batchNumber: string;
  expiryDate: string;
  quantityAvailable: number;
  reorderLevel: number;
  purchasePrice: number;
  supplierName: string;
  receivedDate: string;
  medicineName?: string;
  medicineCode?: string;
  unitPrice?: number;
  isLowStock?: boolean;
}

export interface Bill {
  id: number;
  invoiceNumber: string;
  patientId: number;
  appointmentId: number | null;
  consultationFee: number;
  labCharges: number;
  medicineCharges: number;
  serviceCharges: number;
  subtotal: number;
  discountAmount: number;
  taxRatePercent: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  lineItemsJson: string;
  createdAt: string;
  patientName?: string;
  patientCode?: string;
}

export interface PaymentRecord {
  id: number;
  receiptNumber: string;
  billId: number;
  patientId: number;
  amount: number;
  paymentMethod: string;
  transactionRef: string;
  gatewayStatus: string;
  notes: string | null;
  paidAt: string;
}

export interface AppNotification {
  id: number;
  userId: number;
  title: string;
  message: string;
  channel: string;
  category: string;
  isRead: boolean;
  createdAt: string;
}

export type PublicPage =
  | 'home'
  | 'about'
  | 'doctors'
  | 'doctor-profile'
  | 'departments'
  | 'services'
  | 'book-appointment'
  | 'emergency'
  | 'lab-tests'
  | 'pharmacy'
  | 'gallery'
  | 'contact'
  | 'login'
  | 'privacy'
  | 'terms'
  | 'portal';
