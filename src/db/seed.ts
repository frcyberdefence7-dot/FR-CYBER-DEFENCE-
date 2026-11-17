import bcrypt from 'bcryptjs';
import { count } from 'drizzle-orm';
import { db } from './index.ts';
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
  medicalRecords,
  medicines,
  medicineSales,
  notifications,
  patients,
  payments,
  pharmacyStock,
  prescriptions,
  staff,
  users,
} from './schema.ts';

let seedPromise: Promise<void> | null = null;

export async function ensureDatabaseSeeded(): Promise<void> {
  if (seedPromise) {
    return seedPromise;
  }

  seedPromise = (async () => {
    try {
      const existingDepts = await db.select({ value: count() }).from(departments);
      if (Number(existingDepts[0]?.value ?? 0) > 0) {
        return;
      }

      const passwordHash = await bcrypt.hash('Hospital@2026', 10);

      // 1. Hospital Settings
      await db.insert(hospitalSettings).values({
        hospitalName: 'Citystone Medical Center',
        tagline: 'Precision Multi-Specialty Care & Integrated Diagnostics',
        phone: '+91 80 4120 8800',
        emergencyPhone: '+91 80 4120 8911',
        email: 'care@citystonemedical.org',
        address: '42 Residency Road, Ashok Nagar, Bengaluru, Karnataka 560025',
        gstNumber: '29AABCC1234M1Z5',
        taxRatePercent: 5,
        appointmentSlotMinutes: 30,
        smsGatewayEnabled: true,
        whatsappGatewayEnabled: true,
        cmsBannerHeadline: 'NABH-Aligned Tertiary Care & 24/7 Level-1 Trauma Support',
        cmsAnnouncement:
          'Preventive Cardiac & Executive Health Screening Packages available Monday through Saturday.',
      });

      // 2. Demo Users
      const insertedUsers = await db
        .insert(users)
        .values([
          {
            uid: 'local-admin-001',
            email: 'admin@citystonemedical.org',
            passwordHash,
            name: 'Dr. Kavita Rao (Medical Director)',
            phone: '+91 98450 11001',
            role: 'admin',
            twoFactorEnabled: false,
          },
          {
            uid: 'local-reception-001',
            email: 'reception@citystonemedical.org',
            passwordHash,
            name: 'Ananya Sharma (Front Desk Lead)',
            phone: '+91 98450 11002',
            role: 'receptionist',
            twoFactorEnabled: false,
          },
          {
            uid: 'local-doctor-001',
            email: 'dr.arjun.sen@citystonemedical.org',
            passwordHash,
            name: 'Dr. Arjun Sen',
            phone: '+91 98450 11003',
            role: 'doctor',
            twoFactorEnabled: false,
          },
          {
            uid: 'local-doctor-002',
            email: 'dr.evelyn.reed@citystonemedical.org',
            passwordHash,
            name: 'Dr. Evelyn Reed',
            phone: '+91 98450 11004',
            role: 'doctor',
            twoFactorEnabled: false,
          },
          {
            uid: 'local-patient-001',
            email: 'patient.demo@citystonemedical.org',
            passwordHash,
            name: 'Aarav Mehta',
            phone: '+91 98450 22001',
            role: 'patient',
            twoFactorEnabled: false,
          },
        ])
        .returning();

      const adminUser = insertedUsers[0];
      const receptionUser = insertedUsers[1];
      const docUser1 = insertedUsers[2];
      const docUser2 = insertedUsers[3];
      const patientUser1 = insertedUsers[4];

      // 3. Departments
      const insertedDepts = await db
        .insert(departments)
        .values([
          {
            code: 'DEPT-CARD',
            name: 'Cardiology & Heart Care',
            slug: 'cardiology',
            description:
              'Comprehensive interventional cardiology, echocardiography, electrophysiology, and preventive cardiac rehabilitation.',
            headDoctorName: 'Dr. Arjun Sen',
            floorLocation: 'Wing A, 3rd Floor',
            contactExt: '301',
            consultationBaseFee: 1000,
          },
          {
            code: 'DEPT-NEUR',
            name: 'Neurology & Stroke Unit',
            slug: 'neurology',
            description:
              'Specialized neurocritical care, epilepsy monitoring, movement disorder clinics, and acute stroke intervention.',
            headDoctorName: 'Dr. Evelyn Reed',
            floorLocation: 'Wing B, 4th Floor',
            contactExt: '402',
            consultationBaseFee: 1100,
          },
          {
            code: 'DEPT-ORTH',
            name: 'Orthopedics & Joint Replacement',
            slug: 'orthopedics',
            description:
              'Robotic-assisted knee and hip arthroplasty, sports injury arthroscopy, spine surgery, and physiotherapy.',
            headDoctorName: 'Dr. Rohan Kulkarni',
            floorLocation: 'Wing A, 2nd Floor',
            contactExt: '205',
            consultationBaseFee: 900,
          },
          {
            code: 'DEPT-PEDI',
            name: 'Pediatrics & Neonatology',
            slug: 'pediatrics',
            description:
              'Level-III NICU, pediatric immunization clinic, developmental screening, and adolescent wellness.',
            headDoctorName: 'Dr. Meera Iyer',
            floorLocation: 'Wing C, 2nd Floor',
            contactExt: '218',
            consultationBaseFee: 750,
          },
          {
            code: 'DEPT-GENM',
            name: 'Internal Medicine',
            slug: 'internal-medicine',
            description:
              'Primary adult medicine, diabetes and hypertension management, infectious disease care, and preventive health.',
            headDoctorName: 'Dr. Siddharth Verma',
            floorLocation: 'Main Block, 1st Floor',
            contactExt: '104',
            consultationBaseFee: 650,
          },
          {
            code: 'DEPT-DIAG',
            name: 'Radiology & Clinical Pathology',
            slug: 'diagnostics',
            description:
              '3-Tesla MRI, 128-slice CT angiography, automated biochemistry, hematology, and molecular pathology.',
            headDoctorName: 'Dr. Nandini Bose',
            floorLocation: 'Lower Ground & 1st Floor',
            contactExt: '112',
            consultationBaseFee: 700,
          },
        ])
        .returning();

      // 4. Doctors
      const insertedDoctors = await db
        .insert(doctors)
        .values([
          {
            userId: docUser1.id,
            departmentId: insertedDepts[0].id,
            doctorCode: 'DOC-101',
            fullName: 'Dr. Arjun Sen',
            email: 'dr.arjun.sen@citystonemedical.org',
            phone: '+91 98450 11003',
            specialization: 'Senior Interventional Cardiologist',
            qualification: 'MD (Internal Medicine), DM (Cardiology), FACC',
            experienceYears: 18,
            consultationFee: 1000,
            bio: 'Over 18 years of clinical excellence in complex coronary angioplasty, structural heart procedures, and preventive lipidology.',
            avatarUrl: '/src/assets/images/doctor_portrait_cardiology_1794927652685.jpg',
            languages: 'English, Hindi, Bengali',
            isAvailable: true,
          },
          {
            userId: docUser2.id,
            departmentId: insertedDepts[1].id,
            doctorCode: 'DOC-102',
            fullName: 'Dr. Evelyn Reed',
            email: 'dr.evelyn.reed@citystonemedical.org',
            phone: '+91 98450 11004',
            specialization: 'Lead Neurologist & Stroke Specialist',
            qualification: 'MD, DM (Neurology), Fellowship in Neurovascular Care',
            experienceYears: 15,
            consultationFee: 1100,
            bio: 'Directs the acute stroke response unit and outpatient clinics for migraine, peripheral neuropathy, and movement disorders.',
            avatarUrl: '/src/assets/images/doctor_portrait_neurology_1794927653992.jpg',
            languages: 'English, Hindi',
            isAvailable: true,
          },
          {
            departmentId: insertedDepts[2].id,
            doctorCode: 'DOC-103',
            fullName: 'Dr. Rohan Kulkarni',
            email: 'dr.rohan.kulkarni@citystonemedical.org',
            phone: '+91 98450 11005',
            specialization: 'Orthopedic & Joint Replacement Surgeon',
            qualification: 'MS (Orthopedics), MCh (Trauma & Ortho)',
            experienceYears: 14,
            consultationFee: 900,
            bio: 'Focuses on minimally invasive joint replacement, ACL reconstruction, and post-traumatic limb rehabilitation.',
            languages: 'English, Hindi, Marathi, Kannada',
            isAvailable: true,
          },
          {
            departmentId: insertedDepts[3].id,
            doctorCode: 'DOC-104',
            fullName: 'Dr. Meera Iyer',
            email: 'dr.meera.iyer@citystonemedical.org',
            phone: '+91 98450 11006',
            specialization: 'Consultant Pediatrician & Neonatologist',
            qualification: 'MD (Pediatrics), Fellowship in Neonatology',
            experienceYears: 11,
            consultationFee: 750,
            bio: 'Dedicated to newborn intensive care, pediatric respiratory medicine, and childhood preventive immunization.',
            languages: 'English, Tamil, Hindi, Kannada',
            isAvailable: true,
          },
          {
            departmentId: insertedDepts[4].id,
            doctorCode: 'DOC-105',
            fullName: 'Dr. Siddharth Verma',
            email: 'dr.siddharth.verma@citystonemedical.org',
            phone: '+91 98450 11007',
            specialization: 'Senior Consultant — Internal Medicine',
            qualification: 'MD (General Medicine), FACP',
            experienceYears: 12,
            consultationFee: 650,
            bio: 'Manages complex multi-system chronic illnesses including Type 2 diabetes, resistant hypertension, and febrile illnesses.',
            languages: 'English, Hindi',
            isAvailable: true,
          },
          {
            departmentId: insertedDepts[5].id,
            doctorCode: 'DOC-106',
            fullName: 'Dr. Nandini Bose',
            email: 'dr.nandini.bose@citystonemedical.org',
            phone: '+91 98450 11008',
            specialization: 'Chief of Clinical Pathology & Diagnostics',
            qualification: 'MD (Pathology), DNB',
            experienceYears: 16,
            consultationFee: 700,
            bio: 'Leads NABL-aligned automated pathology workflows, hematology verification, and molecular diagnostic interpretation.',
            languages: 'English, Bengali, Hindi',
            isAvailable: true,
          },
        ])
        .returning();

      // 5. Weekly Doctor Schedules (Mon=1 .. Sat=6)
      const scheduleValues = [];
      for (const doc of insertedDoctors) {
        for (let day = 1; day <= 6; day++) {
          scheduleValues.push({
            doctorId: doc.id,
            dayOfWeek: day,
            startTime: '09:00',
            endTime: day === 6 ? '13:30' : '17:00',
            slotDurationMinutes: 30,
            isLeave: false,
          });
        }
      }
      await db.insert(doctorSchedules).values(scheduleValues);

      // 6. Staff
      await db.insert(staff).values([
        {
          userId: receptionUser.id,
          departmentId: insertedDepts[4].id,
          employeeCode: 'STF-201',
          fullName: 'Ananya Sharma',
          roleTitle: 'Front Desk & Reception Lead',
          phone: '+91 98450 11002',
          email: 'reception@citystonemedical.org',
          shiftTiming: 'Morning (08:00 - 16:00)',
          status: 'active',
        },
        {
          departmentId: insertedDepts[0].id,
          employeeCode: 'STF-202',
          fullName: 'Lakshmi Menon',
          roleTitle: 'Senior Cardiac ICU Nurse',
          phone: '+91 98450 11022',
          email: 'lakshmi.menon@citystonemedical.org',
          shiftTiming: 'Morning (07:00 - 15:00)',
          status: 'active',
        },
        {
          departmentId: insertedDepts[5].id,
          employeeCode: 'STF-203',
          fullName: 'Karthik Gowda',
          roleTitle: 'Senior Lab Technologist',
          phone: '+91 98450 11023',
          email: 'karthik.gowda@citystonemedical.org',
          shiftTiming: 'Day (09:00 - 17:30)',
          status: 'active',
        },
        {
          departmentId: insertedDepts[4].id,
          employeeCode: 'STF-204',
          fullName: 'Ramesh Deshpande',
          roleTitle: 'Chief Clinical Pharmacist',
          phone: '+91 98450 11024',
          email: 'ramesh.pharmacy@citystonemedical.org',
          shiftTiming: 'Day (08:30 - 17:00)',
          status: 'active',
        },
      ]);

      // 7. Sample Patients (Strictly Synthetic Test Data)
      const insertedPatients = await db
        .insert(patients)
        .values([
          {
            userId: patientUser1.id,
            patientCode: 'PAT-2026-0001',
            fullName: 'Aarav Mehta',
            email: 'patient.demo@citystonemedical.org',
            phone: '+91 98450 22001',
            gender: 'Male',
            dateOfBirth: '1988-04-12',
            bloodGroup: 'B+',
            address: '18 Indiranagar 100ft Road, Bengaluru 560038',
            emergencyContactName: 'Sneha Mehta',
            emergencyContactPhone: '+91 98450 22002',
            allergies: 'Penicillin (mild rash)',
            chronicConditions: 'Mild Hypertension',
            dpdpConsentAccepted: true,
          },
          {
            patientCode: 'PAT-2026-0002',
            fullName: 'Priya Nair',
            email: 'priya.nair@example.test',
            phone: '+91 98450 22003',
            gender: 'Female',
            dateOfBirth: '1993-09-24',
            bloodGroup: 'O+',
            address: '72 Koramangala 4th Block, Bengaluru 560034',
            emergencyContactName: 'Rajesh Nair',
            emergencyContactPhone: '+91 98450 22004',
            allergies: 'None reported',
            chronicConditions: 'Migraine',
            dpdpConsentAccepted: true,
          },
          {
            patientCode: 'PAT-2026-0003',
            fullName: 'Vikram Deshmukh',
            email: 'vikram.d@example.test',
            phone: '+91 98450 22005',
            gender: 'Male',
            dateOfBirth: '1975-11-03',
            bloodGroup: 'A+',
            address: '9 Jayanagar 3rd Block, Bengaluru 560011',
            emergencyContactName: 'Aditi Deshmukh',
            emergencyContactPhone: '+91 98450 22006',
            allergies: 'Sulfa drugs',
            chronicConditions: 'Type 2 Diabetes',
            dpdpConsentAccepted: true,
          },
        ])
        .returning();

      const todayStr = new Date().toISOString().slice(0, 10);
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

      // 8. Sample Appointments
      const insertedAppts = await db
        .insert(appointments)
        .values([
          {
            bookingId: 'APT-2026-1001',
            patientId: insertedPatients[0].id,
            doctorId: insertedDoctors[0].id,
            departmentId: insertedDepts[0].id,
            appointmentDate: todayStr,
            timeSlot: '10:00',
            tokenNumber: 1,
            status: 'completed',
            reason: 'Routine blood pressure review & ECG follow-up',
            notes: 'Patient stable on current medication.',
            followUpDate: tomorrowStr,
            createdByUserId: patientUser1.id,
          },
          {
            bookingId: 'APT-2026-1002',
            patientId: insertedPatients[1].id,
            doctorId: insertedDoctors[1].id,
            departmentId: insertedDepts[1].id,
            appointmentDate: todayStr,
            timeSlot: '11:00',
            tokenNumber: 1,
            status: 'checked_in',
            reason: 'Recurring unilateral headache episodes',
            notes: 'Check visual aura history.',
            createdByUserId: receptionUser.id,
          },
          {
            bookingId: 'APT-2026-1003',
            patientId: insertedPatients[2].id,
            doctorId: insertedDoctors[0].id,
            departmentId: insertedDepts[0].id,
            appointmentDate: todayStr,
            timeSlot: '11:30',
            tokenNumber: 2,
            status: 'confirmed',
            reason: 'Annual cardiac lipid & stress evaluation',
            createdByUserId: receptionUser.id,
          },
          {
            bookingId: 'APT-2026-1004',
            patientId: insertedPatients[0].id,
            doctorId: insertedDoctors[4].id,
            departmentId: insertedDepts[4].id,
            appointmentDate: tomorrowStr,
            timeSlot: '09:30',
            tokenNumber: 1,
            status: 'confirmed',
            reason: 'Preventive annual wellness consultation',
            createdByUserId: patientUser1.id,
          },
        ])
        .returning();

      // 9. Medical Records
      await db.insert(medicalRecords).values([
        {
          patientId: insertedPatients[0].id,
          doctorId: insertedDoctors[0].id,
          appointmentId: insertedAppts[0].id,
          visitDate: todayStr,
          chiefComplaint: 'Occasional morning palpitations and BP check',
          vitalsBp: '128/82 mmHg',
          vitalsPulse: '74 bpm',
          vitalsTemp: '98.4 F',
          vitalsSpo2: '99%',
          diagnosis: 'Controlled Essential Hypertension',
          clinicalNotes: '12-lead ECG normal sinus rhythm. Continue low-sodium diet.',
          treatmentPlan: 'Continue Telmisartan 40mg OD; repeat Lipid Profile in 4 weeks.',
        },
        {
          patientId: insertedPatients[2].id,
          doctorId: insertedDoctors[4].id,
          visitDate: todayStr,
          chiefComplaint: 'Fasting glucose monitoring review',
          vitalsBp: '132/84 mmHg',
          vitalsPulse: '78 bpm',
          vitalsTemp: '98.6 F',
          vitalsSpo2: '98%',
          diagnosis: 'Type 2 Diabetes Mellitus — Stable',
          clinicalNotes: 'Advised 30 minutes brisk walking daily and quarterly HbA1c.',
          treatmentPlan: 'Metformin 500mg BD post meals.',
        },
      ]);

      // 10. Prescriptions
      const insertedRx = await db
        .insert(prescriptions)
        .values([
          {
            prescriptionCode: 'RX-2026-5001',
            appointmentId: insertedAppts[0].id,
            patientId: insertedPatients[0].id,
            doctorId: insertedDoctors[0].id,
            diagnosis: 'Controlled Essential Hypertension',
            itemsJson: JSON.stringify([
              {
                medicineName: 'Telmisartan 40mg Tablet',
                dosage: '1 Tablet',
                frequency: 'Once daily (Morning)',
                duration: '30 Days',
                instructions: 'Take after breakfast with water',
              },
              {
                medicineName: 'Atorvastatin 10mg Tablet',
                dosage: '1 Tablet',
                frequency: 'Once daily (Bedtime)',
                duration: '30 Days',
                instructions: 'Take at night',
              },
            ]),
            recommendedLabTestsJson: JSON.stringify(['Lipid Profile', 'HbA1c']),
            generalAdvice: 'Limit dietary sodium under 2g/day and monitor home BP twice weekly.',
            followUpDate: tomorrowStr,
          },
        ])
        .returning();

      // 11. Lab Tests
      const insertedLabTests = await db
        .insert(labTests)
        .values([
          {
            testCode: 'LAB-CBC',
            category: 'Hematology',
            name: 'Complete Blood Count (CBC)',
            description: 'Evaluates RBC, WBC, hemoglobin, hematocrit, and platelet counts.',
            sampleType: 'Whole Blood (EDTA)',
            price: 450,
            turnaroundHours: 6,
            normalRange: 'Hb: 13.0-17.0 g/dL | WBC: 4,000-11,000 /uL',
          },
          {
            testCode: 'LAB-LIPID',
            category: 'Biochemistry',
            name: 'Lipid Profile Panel',
            description: 'Measures Total Cholesterol, LDL, HDL, and Triglycerides (12h fasting).',
            sampleType: 'Serum (Fasting)',
            price: 850,
            turnaroundHours: 8,
            normalRange: 'Total Cholesterol < 200 mg/dL | LDL < 100 mg/dL',
          },
          {
            testCode: 'LAB-HBA1C',
            category: 'Biochemistry',
            name: 'HbA1c (Glycated Hemoglobin)',
            description: '3-month average blood glucose indicator for diabetes diagnosis and monitoring.',
            sampleType: 'Whole Blood (EDTA)',
            price: 600,
            turnaroundHours: 8,
            normalRange: '< 5.7% (Normal) | < 7.0% (Target)',
          },
          {
            testCode: 'LAB-TROP',
            category: 'Cardiac Markers',
            name: 'High-Sensitivity Troponin-I',
            description: 'Rapid quantitative cardiac injury biomarker assay.',
            sampleType: 'Serum / Heparin Plasma',
            price: 1400,
            turnaroundHours: 2,
            normalRange: '< 19 ng/L',
          },
          {
            testCode: 'LAB-TSH',
            category: 'Endocrinology',
            name: 'Thyroid Profile (T3, T4, TSH)',
            description: 'Comprehensive thyroid gland hormone panel.',
            sampleType: 'Serum',
            price: 750,
            turnaroundHours: 12,
            normalRange: 'TSH: 0.4 - 4.2 mIU/L',
          },
          {
            testCode: 'LAB-LFT',
            category: 'Biochemistry',
            name: 'Liver Function Test (LFT)',
            description: 'Assesses Bilirubin, SGOT, SGPT, Alkaline Phosphatase, and Albumin.',
            sampleType: 'Serum',
            price: 800,
            turnaroundHours: 10,
            normalRange: 'SGOT < 40 U/L | SGPT < 45 U/L',
          },
          {
            testCode: 'RAD-MRI-BR',
            category: 'Radiology',
            name: '3T MRI Brain Screening',
            description: 'High-resolution non-contrast neurological brain imaging.',
            sampleType: 'Imaging Study',
            price: 6500,
            turnaroundHours: 24,
            normalRange: 'No acute intracranial abnormality',
          },
          {
            testCode: 'RAD-XRAY-CH',
            category: 'Radiology',
            name: 'Digital Chest X-Ray (PA View)',
            description: 'Low-dose digital thoracic radiograph.',
            sampleType: 'Imaging Study',
            price: 550,
            turnaroundHours: 4,
            normalRange: 'Clear lung fields, normal cardiothoracic ratio',
          },
        ])
        .returning();

      // 12. Sample Lab Reports
      await db.insert(labReports).values([
        {
          reportCode: 'RPT-2026-3001',
          patientId: insertedPatients[0].id,
          doctorId: insertedDoctors[0].id,
          appointmentId: insertedAppts[0].id,
          testId: insertedLabTests[1].id,
          sampleStatus: 'received',
          processingStatus: 'verified',
          resultSummary: 'Total Cholesterol 184 mg/dL, LDL 96 mg/dL, HDL 48 mg/dL — Within target.',
          resultValuesJson: JSON.stringify([
            { parameter: 'Total Cholesterol', value: '184 mg/dL', range: '< 200 mg/dL', flag: 'Normal' },
            { parameter: 'LDL Cholesterol', value: '96 mg/dL', range: '< 100 mg/dL', flag: 'Normal' },
            { parameter: 'HDL Cholesterol', value: '48 mg/dL', range: '> 40 mg/dL', flag: 'Normal' },
            { parameter: 'Triglycerides', value: '132 mg/dL', range: '< 150 mg/dL', flag: 'Normal' },
          ]),
          verifiedBy: 'Dr. Nandini Bose (MD Pathology)',
          notes: 'Fasting sample verified.',
          verifiedAt: new Date(),
        },
        {
          reportCode: 'RPT-2026-3002',
          patientId: insertedPatients[0].id,
          doctorId: insertedDoctors[0].id,
          testId: insertedLabTests[0].id,
          sampleStatus: 'collected',
          processingStatus: 'processing',
          resultSummary: 'Sample currently on automated hematology analyzer.',
          notes: 'Expected completion in 2 hours.',
        },
        {
          reportCode: 'RPT-2026-3003',
          patientId: insertedPatients[1].id,
          doctorId: insertedDoctors[1].id,
          appointmentId: insertedAppts[1].id,
          testId: insertedLabTests[6].id,
          sampleStatus: 'pending',
          processingStatus: 'queued',
          notes: 'Scheduled for 14:30 MRI slot.',
        },
      ]);

      // 13. Medicines & Pharmacy Stock
      const insertedMeds = await db
        .insert(medicines)
        .values([
          {
            medicineCode: 'MED-001',
            name: 'Telmisartan 40mg',
            genericName: 'Telmisartan',
            category: 'Cardiovascular',
            manufacturer: 'Cipla Ltd.',
            unitPrice: 140,
            unitType: 'Strip of 15',
            requiresPrescription: true,
            description: 'Angiotensin II receptor blocker for hypertension management.',
          },
          {
            medicineCode: 'MED-002',
            name: 'Atorvastatin 10mg',
            genericName: 'Atorvastatin Calcium',
            category: 'Cardiovascular',
            manufacturer: 'Sun Pharma',
            unitPrice: 115,
            unitType: 'Strip of 15',
            requiresPrescription: true,
            description: 'Statin therapy for cholesterol and lipid reduction.',
          },
          {
            medicineCode: 'MED-003',
            name: 'Paracetamol 650mg',
            genericName: 'Acetaminophen',
            category: 'Analgesic & Antipyretic',
            manufacturer: 'GSK Healthcare',
            unitPrice: 35,
            unitType: 'Strip of 15',
            requiresPrescription: false,
            description: 'Fever and mild-to-moderate pain relief.',
          },
          {
            medicineCode: 'MED-004',
            name: 'Metformin 500mg SR',
            genericName: 'Metformin Hydrochloride',
            category: 'Endocrinology',
            manufacturer: 'USV Private Ltd.',
            unitPrice: 68,
            unitType: 'Strip of 20',
            requiresPrescription: true,
            description: 'Sustained-release first-line glycemic control agent.',
          },
          {
            medicineCode: 'MED-005',
            name: 'Amoxicillin + Clavulanate 625mg',
            genericName: 'Co-Amoxiclav',
            category: 'Antibiotic',
            manufacturer: 'Alkem Laboratories',
            unitPrice: 220,
            unitType: 'Strip of 10',
            requiresPrescription: true,
            description: 'Broad-spectrum penicillin antibiotic.',
          },
          {
            medicineCode: 'MED-006',
            name: 'Sumatriptan 50mg',
            genericName: 'Sumatriptan Succinate',
            category: 'Neurology',
            manufacturer: 'Dr. Reddys',
            unitPrice: 195,
            unitType: 'Strip of 6',
            requiresPrescription: true,
            description: 'Acute migraine relief triptan therapy.',
          },
        ])
        .returning();

      await db.insert(pharmacyStock).values([
        {
          medicineId: insertedMeds[0].id,
          batchNumber: 'BATCH-TM-2601',
          expiryDate: '2028-05-30',
          quantityAvailable: 140,
          reorderLevel: 30,
          purchasePrice: 98,
          supplierName: 'MedSupply Karnataka Distributors',
          receivedDate: '2026-09-10',
        },
        {
          medicineId: insertedMeds[1].id,
          batchNumber: 'BATCH-AT-2604',
          expiryDate: '2028-02-28',
          quantityAvailable: 95,
          reorderLevel: 25,
          purchasePrice: 78,
          supplierName: 'MedSupply Karnataka Distributors',
          receivedDate: '2026-09-12',
        },
        {
          medicineId: insertedMeds[2].id,
          batchNumber: 'BATCH-PC-2609',
          expiryDate: '2027-12-31',
          quantityAvailable: 310,
          reorderLevel: 50,
          purchasePrice: 22,
          supplierName: 'Apex Pharma Logistics',
          receivedDate: '2026-10-01',
        },
        {
          medicineId: insertedMeds[3].id,
          batchNumber: 'BATCH-MF-2602',
          expiryDate: '2027-08-15',
          quantityAvailable: 18, // Low stock trigger!
          reorderLevel: 30,
          purchasePrice: 44,
          supplierName: 'Apex Pharma Logistics',
          receivedDate: '2026-08-15',
        },
        {
          medicineId: insertedMeds[4].id,
          batchNumber: 'BATCH-AM-2605',
          expiryDate: '2027-04-30',
          quantityAvailable: 12, // Low stock trigger!
          reorderLevel: 25,
          purchasePrice: 155,
          supplierName: 'MedSupply Karnataka Distributors',
          receivedDate: '2026-07-20',
        },
        {
          medicineId: insertedMeds[5].id,
          batchNumber: 'BATCH-SM-2608',
          expiryDate: '2028-01-20',
          quantityAvailable: 54,
          reorderLevel: 20,
          purchasePrice: 138,
          supplierName: 'NeuroCare Pharma Supply',
          receivedDate: '2026-10-14',
        },
      ]);

      await db.insert(medicineSales).values([
        {
          saleCode: 'SALE-2026-7001',
          patientId: insertedPatients[0].id,
          prescriptionId: insertedRx[0].id,
          soldByUserId: adminUser.id,
          itemsJson: JSON.stringify([
            { medicineName: 'Telmisartan 40mg', qty: 2, unitPrice: 140, total: 280 },
            { medicineName: 'Atorvastatin 10mg', qty: 2, unitPrice: 115, total: 230 },
          ]),
          subtotal: 510,
          discount: 0,
          tax: 26,
          totalAmount: 536,
          paymentStatus: 'paid',
        },
      ]);

      // 14. Bills & Payments
      const insertedBills = await db
        .insert(bills)
        .values([
          {
            invoiceNumber: 'INV-2026-0001',
            patientId: insertedPatients[0].id,
            appointmentId: insertedAppts[0].id,
            consultationFee: 1000,
            labCharges: 850,
            medicineCharges: 510,
            serviceCharges: 150,
            subtotal: 2510,
            discountAmount: 100,
            taxRatePercent: 5,
            taxAmount: 121,
            totalAmount: 2531,
            paidAmount: 2531,
            status: 'paid',
            lineItemsJson: JSON.stringify([
              { label: 'Cardiology Consultation (Dr. Arjun Sen)', amount: 1000 },
              { label: 'Lipid Profile Panel', amount: 850 },
              { label: 'Pharmacy Dispensing (RX-2026-5001)', amount: 510 },
              { label: 'ECG & Nursing Registration Fee', amount: 150 },
            ]),
            createdByUserId: receptionUser.id,
          },
          {
            invoiceNumber: 'INV-2026-0002',
            patientId: insertedPatients[1].id,
            appointmentId: insertedAppts[1].id,
            consultationFee: 1100,
            labCharges: 6500,
            medicineCharges: 0,
            serviceCharges: 200,
            subtotal: 7800,
            discountAmount: 0,
            taxRatePercent: 5,
            taxAmount: 390,
            totalAmount: 8190,
            paidAmount: 1100,
            status: 'partial',
            lineItemsJson: JSON.stringify([
              { label: 'Neurology Consultation (Dr. Evelyn Reed)', amount: 1100 },
              { label: '3T MRI Brain Screening', amount: 6500 },
              { label: 'OPD Registration & Care Suite', amount: 200 },
            ]),
            createdByUserId: receptionUser.id,
          },
          {
            invoiceNumber: 'INV-2026-0003',
            patientId: insertedPatients[0].id,
            appointmentId: insertedAppts[3].id,
            consultationFee: 650,
            labCharges: 450,
            medicineCharges: 0,
            serviceCharges: 0,
            subtotal: 1100,
            discountAmount: 0,
            taxRatePercent: 5,
            taxAmount: 55,
            totalAmount: 1155,
            paidAmount: 0,
            status: 'unpaid',
            lineItemsJson: JSON.stringify([
              { label: 'Internal Medicine Consultation (Dr. Siddharth Verma)', amount: 650 },
              { label: 'Complete Blood Count (CBC)', amount: 450 },
            ]),
            createdByUserId: receptionUser.id,
          },
        ])
        .returning();

      await db.insert(payments).values([
        {
          receiptNumber: 'RCPT-2026-9001',
          billId: insertedBills[0].id,
          patientId: insertedPatients[0].id,
          amount: 2531,
          paymentMethod: 'upi_sandbox',
          transactionRef: 'UPI-SBX-88421094',
          gatewayStatus: 'success',
          notes: 'Settled via UPI Sandbox Gateway',
        },
        {
          receiptNumber: 'RCPT-2026-9002',
          billId: insertedBills[1].id,
          patientId: insertedPatients[1].id,
          amount: 1100,
          paymentMethod: 'cash',
          transactionRef: 'CASH-DESK-0042',
          gatewayStatus: 'success',
          notes: 'Consultation fee collected at reception counter',
        },
      ]);

      // 15. Notifications & Audit Logs
      await db.insert(notifications).values([
        {
          userId: patientUser1.id,
          title: 'Lab Report Verified — Lipid Profile',
          message:
            'Your Lipid Profile Panel (RPT-2026-3001) has been verified by Dr. Nandini Bose and is ready for PDF download.',
          channel: 'in_app',
          category: 'lab',
        },
        {
          userId: patientUser1.id,
          title: 'Upcoming Appointment Confirmed',
          message: `Appointment APT-2026-1004 with Dr. Siddharth Verma is confirmed for ${tomorrowStr} at 09:30.`,
          channel: 'whatsapp',
          category: 'appointment',
        },
        {
          userId: docUser1.id,
          title: 'OPD Roster Active',
          message: 'You have 2 scheduled consultations on today’s Cardiology OPD schedule.',
          channel: 'in_app',
          category: 'system',
        },
      ]);

      await db.insert(auditLogs).values([
        {
          userId: adminUser.id,
          userEmail: adminUser.email,
          userRole: 'admin',
          action: 'SYSTEM_INITIALIZED',
          entityType: 'hospital_settings',
          entityId: '1',
          details: 'Initial Citystone Medical Center database catalog and clinical schedules seeded.',
          ipAddress: '127.0.0.1',
        },
      ]);
    } catch (error) {
      seedPromise = null;
      throw error;
    }
  })();

  return seedPromise;
}
